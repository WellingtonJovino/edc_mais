import { NextRequest, NextResponse } from 'next/server';
import { analyzeLearningGoal, generatePrerequisites } from '@/lib/openai';
import { validateTopicsWithPerplexity, analyzeUploadedFiles, searchRequiredTopics } from '@/lib/perplexity';
import { generateFallbackAnalysis } from '@/lib/analysis-fallback';
import { askAssistantWithFiles } from '@/lib/openai-files';
// Import new GPT-based functions
import { extractLearningSubject, detectSubjectWithGPT, generatePerplexityPrompt } from '../../../../new_functions';
import { validateAndImproveFinalStructure, ensureMinimumQualityStandards } from '../../../../final_validation';
// Import new pipeline
import { runCourseGenerationPipeline } from '@/lib/course-generation-pipeline';
// Removido: saveLearningPlan e saveCourse não são mais usados na fase de estruturação
import { generateBookRecommendations, convertToLegacyFormat, generateValidationReport } from '@/lib/ai-book-recommendations';
// import { analyzePriorKnowledge, assessCourseCompatibility, personalizeCourseContent } from '@/lib/knowledge-assessment'; // ARCHIVED
import { LearningGoal, Topic, TopicValidationResult, FileAnalysisResult, BookSearchResult, ChatMessage } from '@/types';

// Interface para tópicos melhorados durante o processamento
interface EnhancedTopic {
  title: string;
  description: string;
  keywords: string[];
  order: number;
  learningObjectives?: string[];
  keyTerms?: string[];
  searchKeywords?: string[];
}

// Force Node.js runtime for OpenAI operations
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Recebendo request...');

    let requestData;
    let rawBody = '';
    try {
      rawBody = await request.text();
      console.log('📄 Raw request body (first 500 chars):', rawBody.substring(0, 500));
      requestData = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('❌ Erro ao parsear JSON do request:', parseError);
      console.error('📄 Raw body que causou erro (500 chars):', rawBody.substring(0, 500));
      return NextResponse.json(
        { error: 'JSON malformado no request', details: parseError instanceof Error ? parseError.message : 'Erro desconhecido' },
        { status: 400 }
      );
    }

    const { message, uploadedFiles, userProfile } = requestData;

    // Debug: Mostrar perfil do usuário completo
    console.log('👤 Perfil do usuário recebido:', JSON.stringify(userProfile, null, 2));
    if (userProfile?.educationLevel) {
      console.log('🎓 Nível educacional detectado:', userProfile.educationLevel);
    } else {
      console.log('⚠️ Nível educacional não informado no perfil');
    }

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Mensagem é obrigatória' },
        { status: 400 }
      );
    }

    console.log('🔍 Iniciando análise do objetivo de aprendizado...');

    // Verificar se deve usar o novo pipeline
    const useNewPipeline = process.env.USE_NEW_PIPELINE === 'true' ||
                          userProfile?.educationLevel ||
                          message.toLowerCase().includes('faculdade') ||
                          message.toLowerCase().includes('universidade') ||
                          message.toLowerCase().includes('graduação');

    if (useNewPipeline) {
      console.log('🚀 Usando NOVO pipeline de geração completo...');

      try {
        const pipelineResult = await runCourseGenerationPipeline(
          message,
          userProfile || {},
          uploadedFiles
        );

        // Converter resultado do pipeline para o formato esperado
        const analysis: LearningGoal = {
          id: `goal-${Date.now()}`,
          title: pipelineResult.title,
          description: pipelineResult.description,
          level: pipelineResult.level || 'intermediate',
          modules: pipelineResult.modules || [],
          topics: [], // Será preenchido com todos os tópicos
          prerequisites: pipelineResult.prerequisites || [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata: pipelineResult.metadata
        };

        // Extrair todos os tópicos dos módulos
        if (analysis.modules) {
          analysis.topics = analysis.modules.flatMap(m => m.topics || []);
        }

        console.log(`✅ Pipeline completo executado: ${analysis.modules?.length} módulos, ${analysis.topics?.length} tópicos`);

        // Retornar no formato esperado pelo frontend
        return NextResponse.json({
          success: true,
          structure: {
            goal: analysis,
            prerequisites: analysis.prerequisites || [],
            bookRecommendations: pipelineResult.references || [],
            videos: {}
          },
          validationReport: {
            score: pipelineResult.metadata?.validationScores || {},
            passed: true
          }
        });

      } catch (pipelineError) {
        console.error('❌ Erro no novo pipeline, continuando com fluxo legado:', pipelineError);
        // Continuar com o fluxo legado em caso de erro
      }
    }

    // FLUXO LEGADO - mantido para compatibilidade
    console.log('📚 Usando fluxo legado de geração...');

    // NOVA FUNCIONALIDADE: Extração inteligente do assunto usando GPT
    console.log('🤖 Extraindo assunto com GPT...');
    let extractedSubject: string;
    let subjectContext: string;
    let isContextUseful: boolean;

    try {
      const subjectExtraction = await extractLearningSubject(message);
      extractedSubject = subjectExtraction.subject;
      subjectContext = subjectExtraction.context;
      isContextUseful = subjectExtraction.isContextUseful;

      console.log(`✅ Assunto extraído: "${extractedSubject}"`);
      console.log(`📝 Contexto útil: ${isContextUseful} - "${subjectContext}"`);
    } catch (error) {
      console.warn('⚠️ Falha na extração GPT, usando mensagem original:', error);
      extractedSubject = message;
      subjectContext = '';
      isContextUseful = false;
    }

    // NOVA FUNCIONALIDADE: Detecção de disciplina usando GPT
    console.log('🎓 Detectando disciplina com GPT...');
    let detectedDiscipline: string;
    let disciplineConfidence: number;
    let isAcademic: boolean;

    try {
      const disciplineDetection = await detectSubjectWithGPT(message);
      detectedDiscipline = disciplineDetection.discipline;
      disciplineConfidence = disciplineDetection.confidence;
      isAcademic = disciplineDetection.isAcademic;

      console.log(`✅ Disciplina detectada: "${detectedDiscipline}" (confiança: ${disciplineConfidence})`);
      console.log(`🏛️ É disciplina acadêmica: ${isAcademic}`);
    } catch (error) {
      console.warn('⚠️ Falha na detecção GPT de disciplina:', error);
      detectedDiscipline = extractedSubject;
      disciplineConfidence = 0.5;
      isAcademic = false;
    }

    let analysis: LearningGoal;
    try {
      const learningAnalysis = await analyzeLearningGoal(message, userProfile?.level, uploadedFiles, userProfile);
      // Converter LearningAnalysis para LearningGoal
      analysis = {
        id: `goal-${Date.now()}`,
        title: learningAnalysis.courseTitle || learningAnalysis.subject,
        description: `Plano de estudos para ${learningAnalysis.subject} (nível ${learningAnalysis.level})`,
        level: learningAnalysis.level,
        modules: learningAnalysis.modules?.map((module, index) => ({
          id: `module-${Date.now()}-${index}`,
          title: module.title,
          description: module.description,
          order: module.order,
          completed: false,
          estimatedDuration: module.estimatedDuration,
          learningObjectives: module.learningObjectives || [],
          topics: module.topics?.map((topic, topicIndex) => ({
            id: `topic-${Date.now()}-${index}-${topicIndex}`,
            title: topic.title,
            description: topic.description,
            detailedDescription: topic.detailedDescription || topic.description,
            order: topic.order,
            videos: [],
            academicContent: undefined,
            aulaTexto: {} as any,
            completed: false,
            estimatedDuration: topic.estimatedDuration || '45 min',
            contentType: 'mixed' as const,
            hasDoubtButton: true,
            learningObjectives: topic.learningObjectives || [],
            keyTerms: topic.keyTerms || [],
            searchKeywords: topic.searchKeywords || [],
            difficulty: topic.difficulty || 'medium'
          })) || []
        })) || [],
        topics: [], // Será preenchido posteriormente com a estrutura correta
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      console.log('📚 Tópicos iniciais identificados:', analysis.topics?.map(t => t.title) || []);
    } catch (error) {
      console.warn('⚠️ Falha na análise principal, usando fallback:', error);
      analysis = await generateFallbackAnalysis(message, uploadedFiles);
      console.log('🔄 Análise de fallback concluída:', analysis.title);
    }

    // FUNCIONALIDADE DE PERSONALIZAÇÃO REMOVIDA PARA MVP
    // Personalização baseada em conhecimento prévio foi arquivada
    if (userProfile?.priorKnowledge && userProfile.priorKnowledge.trim()) {
      console.log('ℹ️ Conhecimento prévio informado mas personalização está desabilitada no MVP');
    }

    // Determinar se temos arquivos com Assistant para validação inteligente
    let assistantId: string | undefined = undefined;
    if (uploadedFiles && Array.isArray(uploadedFiles) && uploadedFiles.length > 0) {
      const firstFileWithAssistant = uploadedFiles.find(f => f.assistantId);
      if (firstFileWithAssistant?.assistantId) {
        assistantId = firstFileWithAssistant.assistantId;
        console.log('🤖 Assistant encontrado para validação:', assistantId);
      }
    }

    // Validar tópicos (com arquivos se disponível, senão com Perplexity)
    console.log('🔬 Iniciando validação de tópicos...');
    let topicValidation: TopicValidationResult;

    // NOVA FUNCIONALIDADE: Gerar prompt otimizado para Perplexity usando GPT
    console.log('📝 Gerando prompt otimizado para Perplexity...');
    let customPerplexityPrompt: string | undefined = undefined;

    try {
      customPerplexityPrompt = await generatePerplexityPrompt(extractedSubject);
      console.log(`✅ Prompt Perplexity gerado: "${customPerplexityPrompt.substring(0, 100)}..."`);
    } catch (error) {
      console.warn('⚠️ Falha na geração do prompt Perplexity, usando padrão:', error);
      customPerplexityPrompt = undefined;
    }

    // Buscar tópicos necessários com prompt otimizado
    console.log('🔍 Buscando tópicos necessários no Perplexity...');
    let perplexityTopics: string[] = [];

    try {
      perplexityTopics = await searchRequiredTopics(
        extractedSubject,
        analysis.level,
        customPerplexityPrompt // Usar prompt customizado se disponível
      );
      console.log(`✅ Perplexity encontrou ${perplexityTopics.length} tópicos necessários`);
    } catch (error) {
      console.warn('⚠️ Falha na busca Perplexity:', error);
      perplexityTopics = [];
    }

    try {
      const currentTopics = analysis.topics?.map(t => t.title) || analysis.modules?.flatMap(m => m.topics?.map(t => t.title) || []) || [];
      topicValidation = await validateTopicsWithPerplexity(
        analysis.title || message,
        currentTopics,
        analysis.level,
        assistantId // Passar o assistantId se disponível
      );
      console.log('✅ Validação de tópicos concluída:', topicValidation.validationSummary);
    } catch (error) {
      console.warn('⚠️ Falha na validação Perplexity, usando análise básica:', error);
      topicValidation = {
        suggestedTopics: analysis.topics?.map(t => t.title) || [],
        missingTopics: [],
        additionalTopics: [],
        validationSummary: 'Validação simplificada devido a problemas de conectividade'
      };
    }
    
    // Combinar tópicos originais com sugestões do Perplexity
    const enhancedTopics: EnhancedTopic[] = analysis.topics ? analysis.topics.map(topic => ({
      title: topic.title,
      description: topic.description,
      keywords: topic.searchKeywords || [topic.title.toLowerCase()],
      order: topic.order,
      learningObjectives: topic.learningObjectives,
      keyTerms: topic.keyTerms,
      searchKeywords: topic.searchKeywords
    })) : [];
    
    // ADICIONAR TODOS os tópicos faltantes (sem limites)
    topicValidation.missingTopics.forEach((missingTopic, index) => {
      enhancedTopics.push({
        title: missingTopic,
        description: `Tópico essencial identificado pelo Perplexity para completar o aprendizado de ${analysis.title}`,
        keywords: [missingTopic.toLowerCase().split(' ').slice(0, 3).join(' ')],
        order: enhancedTopics.length + 1,
        learningObjectives: [],
        keyTerms: [],
        searchKeywords: []
      });
    });

    // ADICIONAR TODOS os tópicos adicionais sugeridos
    topicValidation.additionalTopics.forEach((additionalTopic, index) => {
      if (!enhancedTopics.find(t => t.title.toLowerCase().includes(additionalTopic.toLowerCase()))) {
        enhancedTopics.push({
          title: additionalTopic,
          description: `Tópico complementar recomendado para aprofundamento em ${analysis.title}`,
          keywords: [additionalTopic.toLowerCase().split(' ').slice(0, 3).join(' ')],
          order: enhancedTopics.length + 1,
          learningObjectives: [],
          keyTerms: [],
          searchKeywords: []
        });
      }
    });

    // ADICIONAR TODOS os tópicos sugeridos pelo Perplexity
    topicValidation.suggestedTopics.forEach((suggestedTopic, index) => {
      if (!enhancedTopics.find(t => t.title.toLowerCase().includes(suggestedTopic.toLowerCase()))) {
        enhancedTopics.push({
          title: suggestedTopic,
          description: `Tópico fundamental identificado pelo sistema de IA para ${analysis.title}`,
          keywords: [suggestedTopic.toLowerCase().split(' ').slice(0, 3).join(' ')],
          order: enhancedTopics.length + 1,
          learningObjectives: [],
          keyTerms: [],
          searchKeywords: []
        });
      }
    });
    
    console.log('🎯 Tópicos finais após validação:', enhancedTopics.map(t => t.title));
    
    // Analisar arquivos enviados com OpenAI File Search, se houver
    let fileAnalysis: FileAnalysisResult | undefined = undefined;
    if (uploadedFiles && Array.isArray(uploadedFiles) && uploadedFiles.length > 0) {
      console.log('📁 Analisando', uploadedFiles.length, 'arquivo(s) com OpenAI File Search...');
      
      const firstFileWithAssistant = uploadedFiles.find(f => f.assistantId);
      
      if (firstFileWithAssistant?.assistantId) {
        console.log('🤖 Usando Assistant OpenAI:', firstFileWithAssistant.assistantId);
        
        try {
          // Fazer perguntas específicas ao Assistant sobre os arquivos
          const analysisQueries = [
            `Analise os documentos enviados no contexto de um curso sobre "${analysis.title}".
             Quais são os principais tópicos cobertos nos documentos?`,

            `Com base nos documentos, que tópicos essenciais estão faltando para formar
             um curso completo sobre "${analysis.title}" no nível ${analysis.level}?`,

            `Sugira tópicos adicionais que complementariam o aprendizado de "${analysis.title}"
             baseado no que você encontrou nos documentos.`
          ];

          console.log('🔍 Fazendo análise inteligente dos arquivos...');
          const analysisResults: string[] = [];
          
          // Executar queries em série para evitar conflitos de threadId
          for (let i = 0; i < analysisQueries.length; i++) {
            const query = analysisQueries[i];
            try {
              console.log(`📝 Query ${i + 1}/3: Analisando...`);
              const result = await askAssistantWithFiles(firstFileWithAssistant.assistantId!, query);
              analysisResults.push(result.content);
            } catch (error) {
              console.error(`❌ Erro na query ${i + 1}:`, error);
              analysisResults.push('');
            }
          }

          const [topicsInFiles, missingTopics, additionalTopics] = analysisResults;

          // Processar as respostas para extrair tópicos
          const extractTopicsFromText = (text: string): string[] => {
            // Extrair tópicos de texto usando regex simples
            const topicMatches = text.match(/(?:\d+\.\s*|•\s*|-\s*)([^.\n]+)/g) || [];
            return topicMatches
              .map(match => match.replace(/^\d+\.\s*|^•\s*|^-\s*/, '').trim())
              .filter(topic => topic.length > 5 && topic.length < 100)
              ; // Sem limites - queremos TODOS os tópicos
          };

          const extractedTopics = extractTopicsFromText(topicsInFiles);
          const missingTopicsList = extractTopicsFromText(missingTopics);
          const additionalTopicsList = extractTopicsFromText(additionalTopics);

          fileAnalysis = {
            extractedTopics: extractedTopics,
            coverageAnalysis: `Baseado na análise inteligente dos ${uploadedFiles.length} arquivo(s) enviado(s): ${topicsInFiles.substring(0, 300)}...`,
            recommendations: [
              'Use os documentos como material de referência principal',
              'Complemente com vídeos educacionais para melhor aprendizado',
              'Considere os tópicos adicionais sugeridos pelo análise dos arquivos'
            ],
            missingFromFiles: missingTopicsList,
            extraInFiles: additionalTopicsList,
            // Novos campos OpenAI
            vectorStoreId: firstFileWithAssistant.vectorStoreId,
            assistantId: firstFileWithAssistant.assistantId,
            fileSearchEnabled: true
          };

          console.log('🎯 Análise OpenAI File Search concluída:');
          console.log(`   - Tópicos extraídos: ${extractedTopics.length}`);
          console.log(`   - Tópicos faltantes: ${missingTopicsList.length}`);
          console.log(`   - Tópicos adicionais: ${additionalTopicsList.length}`);

          // ADICIONAR TODOS os tópicos extras encontrados nos arquivos (SEM LIMITES)
          if (additionalTopicsList.length > 0) {
            additionalTopicsList.forEach((extraTopic) => {
              // Verifica se o tópico já não existe
              if (!enhancedTopics.find(t => t.title.toLowerCase().includes(extraTopic.toLowerCase()))) {
                enhancedTopics.push({
                  title: extraTopic,
                  description: `Tópico inteligentemente identificado nos arquivos enviados via OpenAI File Search`,
                  keywords: [extraTopic.toLowerCase().split(' ').slice(0, 3).join(' ')],
                  order: enhancedTopics.length + 1,
                  learningObjectives: [],
                  keyTerms: [],
                  searchKeywords: []
                });
              }
            });
            console.log('➕ Tópicos inteligentes dos arquivos incluídos:', additionalTopicsList.length, 'tópicos');
          }

          // ADICIONAR TODOS os tópicos faltantes dos arquivos também
          if (missingTopicsList.length > 0) {
            missingTopicsList.forEach((missingTopic) => {
              if (!enhancedTopics.find(t => t.title.toLowerCase().includes(missingTopic.toLowerCase()))) {
                enhancedTopics.push({
                  title: missingTopic,
                  description: `Tópico importante identificado como faltante nos arquivos enviados`,
                  keywords: [missingTopic.toLowerCase().split(' ').slice(0, 3).join(' ')],
                  order: enhancedTopics.length + 1,
                  learningObjectives: [],
                  keyTerms: [],
                  searchKeywords: []
                });
              }
            });
            console.log('➕ Tópicos faltantes dos arquivos incluídos:', missingTopicsList.length, 'tópicos');
          }

        } catch (error) {
          console.error('❌ Erro na análise OpenAI File Search:', error);
          
          // Fallback para análise tradicional se OpenAI falhar
          console.log('🔄 Usando análise tradicional como fallback...');
          const filesToAnalyze = uploadedFiles.map(f => ({ 
            name: f.name, 
            content: f.content 
          }));
          
          fileAnalysis = await analyzeUploadedFiles(
            filesToAnalyze,
            enhancedTopics.map(t => t.title),
            analysis.title
          );
          
          // Adicionar informação de que usou fallback
          if (fileAnalysis) {
            fileAnalysis.fileSearchEnabled = false;
            fileAnalysis.coverageAnalysis += ' (Análise tradicional - OpenAI File Search falhou)';
          }
        }
      } else {
        console.log('⚠️ Nenhum Assistant encontrado, usando análise tradicional');
        
        // Fallback para análise tradicional
        const filesToAnalyze = uploadedFiles.map(f => ({ 
          name: f.name, 
          content: f.content 
        }));
        
        fileAnalysis = await analyzeUploadedFiles(
          filesToAnalyze,
          enhancedTopics.map(t => t.title),
          analysis.title
        );
        
        if (fileAnalysis) {
          fileAnalysis.fileSearchEnabled = false;
        }
        
        // Adicionar tópicos extras encontrados nos arquivos se forem relevantes
        if (fileAnalysis?.extraInFiles && fileAnalysis.extraInFiles.length > 0) {
          fileAnalysis.extraInFiles.forEach((extraTopic) => {
            if (!enhancedTopics.find(t => t.title.toLowerCase().includes(extraTopic.toLowerCase()))) {
              enhancedTopics.push({
                title: extraTopic,
                description: `Tópico encontrado nos arquivos enviados que pode complementar o aprendizado de ${analysis.title}`,
                keywords: [extraTopic.toLowerCase().split(' ').slice(0, 3).join(' ')],
                order: enhancedTopics.length + 1,
                learningObjectives: [],
                keyTerms: [],
                searchKeywords: []
              });
            }
          });
          console.log('➕ Tópicos tradicionais dos arquivos incluídos:', fileAnalysis.extraInFiles);
        }
      }
      
      console.log('✅ Análise de arquivos concluída');
    }

    // Gerar recomendações de livros usando IA
    console.log('📚 Gerando recomendações de livros com IA...');
    let recommendedBooks: BookSearchResult[] = [];

    try {
      // Extrair tópicos principais para contexto
      const mainTopics = analysis.modules?.flatMap(m => m.topics?.map(t => t.title) || []) ||
                        analysis.topics?.map(t => t.title) || [];

      // Mapear educationLevel do usuário para academicLevel
      const getAcademicLevel = (educationLevel?: string) => {
        switch (educationLevel) {
          case 'high_school': return 'high_school';
          case 'undergraduate': return 'undergraduate';
          case 'graduate': return 'graduate';
          case 'professional': return 'professional';
          default: return 'undergraduate'; // fallback padrão
        }
      };

      const academicLevel = getAcademicLevel(userProfile?.educationLevel);
      console.log(`📚 Gerando recomendações para nível acadêmico: ${academicLevel} (baseado em educationLevel: ${userProfile?.educationLevel || 'não informado'})`);

      // Gerar recomendações usando IA
      const aiRecommendations = await generateBookRecommendations({
        subject: analysis.title,
        level: analysis.level as 'beginner' | 'intermediate' | 'advanced',
        language: 'pt',
        specificTopics: mainTopics.slice(0, 5), // Primeiros 5 tópicos
        academicLevel,
        maxBooks: 5
      });

      console.log(`🤖 ${aiRecommendations.length} recomendações geradas pela IA`);

      // Converter para formato esperado pelo sistema
      recommendedBooks = aiRecommendations.map((book, index) => ({
        id: `ai-book-${index}`,
        title: book.title,
        author: book.authors.join(', '),
        isbn: '',
        year: book.year || new Date().getFullYear(),
        language: book.language,
        downloadLink: '',
        fileSize: 'N/A',
        format: 'pdf',
        publisher: 'Recomendação IA',
        description: book.description,
        rating: (10 - book.difficulty) / 2, // Converter dificuldade em rating 0-5
        pages: book.estimatedPages
      }));

      if (recommendedBooks.length > 0) {
        // Gerar relatório de validação para compatibilidade
        const validationReport = generateValidationReport(aiRecommendations);

        console.log('📊 Relatório de recomendações IA:');
        console.log(`📈 Taxa de aprovação: ${validationReport.approvalRate}%`);
        console.log('📚 Livros recomendados:');

        recommendedBooks.forEach((book, index) => {
          console.log(`   ${index + 1}. ${book.title} - ${book.author} (${book.year})`);
        });
      }

    } catch (bookError) {
      console.error('❌ Erro ao gerar recomendações de livros:', bookError);
      // Continuar sem livros se houver erro
      recommendedBooks = [];
    }

    // REMOVIDO: Busca de vídeos movida para quando o usuário acessar cada tópico
    // A busca de vídeos será feita dinamicamente no endpoint /api/load-topic-content
    console.log('📚 Estrutura do curso criada. Vídeos serão carregados dinamicamente por tópico.');
    let videosResults: { [topicTitle: string]: any[] } = {};

    // REMOVIDO: Busca de conteúdo acadêmico movida para o endpoint /api/load-topic-content
    // O conteúdo acadêmico será gerado dinamicamente quando o usuário acessar cada tópico
    console.log('🎓 Estrutura do curso concluída. Conteúdo acadêmico será gerado dinamicamente por tópico.');
    const academicByTopic = {} as { [key: string]: any };

    // Converter nova estrutura hierárquica para compatibilidade com Topic[]
    const convertModulesToTopics = (modules: any[]): Topic[] => {
      const topicsFromModules: Topic[] = [];
      let globalOrder = 1;

      modules.forEach(module => {
        // Nova estrutura: tópicos diretamente no módulo (sem seções)
        const moduleTopics = module.topics || [];

        moduleTopics.forEach((moduleTopic: any) => {
          topicsFromModules.push({
            id: `topic-${Date.now()}-${globalOrder}`,
            title: moduleTopic.title,
            description: moduleTopic.description,
            detailedDescription: moduleTopic.detailedDescription || moduleTopic.description,
            order: globalOrder++,
            videos: [], // Será preenchido pela busca contextual
            aulaTexto: {} as any, // Será gerada posteriormente
            completed: false,
            estimatedDuration: moduleTopic.estimatedDuration || '45 min',
            hasDoubtButton: true,

            // Novos campos da estrutura aprimorada
            learningObjectives: moduleTopic.learningObjectives || [],
            keyTerms: moduleTopic.keyTerms || [],
            searchKeywords: moduleTopic.searchKeywords || [moduleTopic.title],
            difficulty: moduleTopic.difficulty || 'medium',

            // DEPRECATED: Para compatibilidade
            academicContent: academicByTopic[moduleTopic.title] || null,
            contentType: 'mixed' as const
          });
        });
      });

      return topicsFromModules;
    };

    // EXPANDIR os módulos existentes com TODOS os tópicos validados
    const topicsFromModules = analysis.modules ? convertModulesToTopics(analysis.modules) : [];

    // Adicionar TODOS os tópicos validados que não estão nos módulos
    const finalTopics = [...topicsFromModules];

    // Adicionar todos os enhancedTopics que não existem nos módulos
    enhancedTopics.forEach(enhancedTopic => {
      const exists = finalTopics.find(existing =>
        existing.title.toLowerCase().includes(enhancedTopic.title.toLowerCase()) ||
        enhancedTopic.title.toLowerCase().includes(existing.title.toLowerCase())
      );

      if (!exists) {
        finalTopics.push({
          id: `topic-${Date.now()}-${finalTopics.length}`,
          title: enhancedTopic.title,
          description: enhancedTopic.description,
          detailedDescription: enhancedTopic.description,
          order: finalTopics.length + 1,
          videos: [],
          aulaTexto: {} as any,
          completed: false,
          estimatedDuration: '45 min',
          hasDoubtButton: true,
          learningObjectives: enhancedTopic.learningObjectives || [],
          keyTerms: enhancedTopic.keyTerms || [],
          searchKeywords: enhancedTopic.searchKeywords || [enhancedTopic.title],
          difficulty: 'medium',
          academicContent: undefined,
          contentType: 'mixed' as const
        });
      }
    });

    console.log(`🎯 Tópicos finais integrados: ${finalTopics.length} tópicos (${topicsFromModules.length} dos módulos + ${finalTopics.length - topicsFromModules.length} validados)`);;

    const topics: Topic[] = finalTopics.map((topic, index) => ({
      id: (topic as any).id || `topic-${Date.now()}-${index}`,
      title: topic.title,
      description: topic.description,
      order: topic.order || index + 1,
      videos: (topic as any).videos || videosResults[topic.title] || [],
      academicContent: (topic as any).academicContent || academicByTopic[topic.title] || undefined,
      aulaTexto: (topic as any).aulaTexto || {} as any,
      completed: false,
      estimatedDuration: (topic as any).estimatedDuration || '45 min',
      contentType: (topic as any).contentType || 'mixed',
      hasDoubtButton: (topic as any).hasDoubtButton !== false,
      // Novos campos para aprendizado aprimorado
      detailedDescription: (topic as any).detailedDescription || topic.description,
      learningObjectives: topic.learningObjectives || [],
      keyTerms: topic.keyTerms || [],
      searchKeywords: topic.searchKeywords || [],
      difficulty: (topic as any).difficulty || 'medium'
    }));

    // Redistribuir TODOS os tópicos finais nos módulos
    const redistributeTopicsIntoModules = (originalModules: any[], allTopics: Topic[]): any[] => {
      const totalTopics = allTopics.length;
      const moduleCount = Math.max(originalModules.length, Math.ceil(totalTopics / 8)); // Pelo menos 8 tópicos por módulo

      // Criar estrutura de módulos expandida
      const expandedModules = [];

      for (let i = 0; i < moduleCount; i++) {
        const originalModule = originalModules[i];
        const startIndex = Math.floor((i * totalTopics) / moduleCount);
        const endIndex = Math.floor(((i + 1) * totalTopics) / moduleCount);
        const moduleTopics = allTopics.slice(startIndex, endIndex);

        expandedModules.push({
          id: `module-${Date.now()}-${i}`,
          title: originalModule ? originalModule.title : `MÓDULO ${i + 1}`,
          description: originalModule ? originalModule.description : `Módulo abrangente cobrindo tópicos avançados de ${analysis.title}`,
          order: i + 1,
          estimatedDuration: `${Math.ceil(moduleTopics.length * 1.5)} semanas`,
          completed: false,
          color: `hsl(${i * 60}, 70%, 50%)`,
          learningObjectives: originalModule ? (originalModule.learningObjectives || []) : [
            `Dominar os conceitos fundamentais dos tópicos ${startIndex + 1}-${endIndex}`,
            `Aplicar conhecimentos práticos em problemas reais`,
            `Desenvolver habilidades analíticas avançadas`
          ],
          topics: moduleTopics,
          sections: []
        });
      }

      return expandedModules;
    };

    // Criar estrutura de módulos redistribuída com TODOS os tópicos
    const redistributedModules = analysis.modules ?
      redistributeTopicsIntoModules(analysis.modules, topics) :
      redistributeTopicsIntoModules([], topics);

    console.log(`🏗️ Módulos redistribuídos: ${redistributedModules.length} módulos com todos os ${topics.length} tópicos`);

    // DEBUG: Verificar estrutura final antes de enviar
    console.log(`📦 DEBUG - Estrutura final:
      - Total módulos: ${redistributedModules.length}
      - Total tópicos: ${topics.length}
      - Tópicos por módulo: ${redistributedModules.map(m => m.topics?.length || 0).join(', ')}
      - Primeiro módulo: ${redistributedModules[0]?.title || 'N/A'} (${redistributedModules[0]?.topics?.length || 0} tópicos)
      - Último módulo: ${redistributedModules[redistributedModules.length - 1]?.title || 'N/A'} (${redistributedModules[redistributedModules.length - 1]?.topics?.length || 0} tópicos)`);

    const goal: LearningGoal = {
      id: `goal-${Date.now()}`,
      title: analysis.title,
      description: `Plano de estudos para ${analysis.title} (nível ${analysis.level})`,
      level: analysis.level,
      modules: redistributedModules, // Nova estrutura hierárquica EXPANDIDA com todos os tópicos
      topics, // Mantém compatibilidade
      recommendedBooks, // Livros recomendados pela IA
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const userMessage: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
      attachedFiles: uploadedFiles || [],
    };

    const assistantMessage: ChatMessage = {
      id: `msg-assistant-${Date.now()}`,
      role: 'assistant',
      content: `Criei um plano de estudos para ${analysis.title} com ${topics.length} tópicos organizados para o nível ${analysis.level}. Você pode explorar cada tópico e assistir aos vídeos recomendados.${recommendedBooks.length > 0 ? ` Também selecionei ${recommendedBooks.length} livros acadêmicos recomendados especificamente para este curso.` : ''}`,
      timestamp: new Date().toISOString(),
    };

    // Gerar pré-requisitos para informar o usuário na fase de estruturação
    console.log('🎯 Gerando pré-requisitos do curso...');
    let prerequisites: any[] = [];
    try {
      prerequisites = await generatePrerequisites(
        goal.title,
        goal.description,
        goal.level,
        goal.topics?.map(t => t.title) || []
      );
      console.log(`✅ ${prerequisites.length} pré-requisitos identificados`);
    } catch (error) {
      console.error('⚠️ Erro ao gerar pré-requisitos:', error);
    }

    // Retornar apenas a estrutura do curso (syllabus) SEM salvar no banco
    // O salvamento será feito apenas quando o usuário clicar em "Gerar Curso"
    console.log('📋 Estrutura do curso criada com sucesso - pronta para o usuário revisar');

    let finalCourseStructure = {
      goal: {
        ...goal,
        prerequisites
      },
      messages: [userMessage, assistantMessage],
      topicValidation,
      uploadedFiles: uploadedFiles || [],
      fileAnalysis,
    };

    // NOVA FUNCIONALIDADE: Validação final da estrutura do curso usando GPT
    console.log('🔍 Validando estrutura final do curso...');
    try {
      const finalValidation = await validateAndImproveFinalStructure(
        finalCourseStructure.goal,
        extractedSubject
      );

      console.log(`📊 Score da estrutura: ${finalValidation.validationScore}/10`);
      console.log(`🔧 Melhorias aplicadas: ${finalValidation.changesApplied.length}`);

      if (finalValidation.changesApplied.length > 0) {
        console.log('✨ Estrutura do curso melhorada pela validação final');
        finalCourseStructure.goal = finalValidation.improvedStructure;

        // Atualizar metadata com informações da validação
        finalCourseStructure.goal.metadata = {
          ...finalCourseStructure.goal.metadata,
          finalValidation: {
            originalScore: finalValidation.validationScore,
            changesApplied: finalValidation.changesApplied,
            improvedByGPT: true
          }
        };
      }

      // Garantir padrões mínimos de qualidade
      finalCourseStructure.goal = await ensureMinimumQualityStandards(
        finalCourseStructure.goal,
        extractedSubject
      );

      console.log('✅ Estrutura final validada e otimizada');

      // DEBUG: Verificar estrutura após validação
      const finalModuleCount = finalCourseStructure.goal.modules?.length || 0;
      const finalTopicCount = finalCourseStructure.goal.topics?.length || 0;
      const topicsInModules = finalCourseStructure.goal.modules?.reduce((sum: number, mod: any) =>
        sum + (mod.topics?.length || 0), 0) || 0;

      console.log(`🏁 DEBUG - Estrutura FINAL após validação:
        - Módulos: ${finalModuleCount}
        - Tópicos array: ${finalTopicCount}
        - Tópicos nos módulos: ${topicsInModules}
        - Pré-requisitos: ${finalCourseStructure.goal.metadata?.prerequisites?.length || 0}`);
    } catch (error) {
      console.warn('⚠️ Erro na validação final, usando estrutura original:', error);
      // Continuar com a estrutura original se a validação falhar
    }

    return NextResponse.json({
      success: true,
      structure: finalCourseStructure,
      message: 'Estrutura do curso criada e validada. Revise e clique em "Gerar Curso" para continuar.',
      metadata: {
        subjectExtraction: {
          extracted: extractedSubject,
          context: subjectContext,
          isContextUseful
        },
        disciplineDetection: {
          discipline: detectedDiscipline,
          confidence: disciplineConfidence,
          isAcademic
        },
        enhancedPerplexity: {
          customPromptGenerated: !!customPerplexityPrompt,
          topicsFound: perplexityTopics.length
        }
      }
    });

  } catch (error) {
    console.error('Erro na API /analyze:', error);

    // Determinar tipo de erro e mensagem apropriada
    let errorMessage = 'Erro interno do servidor';
    let statusCode = 500;

    if (error instanceof Error) {
      // Erros de validação
      if (error.message.includes('Falha ao salvar curso')) {
        errorMessage = 'Erro ao salvar o curso no banco de dados. Tente novamente.';
        statusCode = 500;
      }
      // Erros de API externa
      else if (error.message.includes('quota') || error.message.includes('rate limit')) {
        errorMessage = 'Limite de API atingido. Por favor, tente novamente em alguns minutos.';
        statusCode = 429;
      }
      // Erros de conectividade
      else if (error.message.includes('network') || error.message.includes('timeout')) {
        errorMessage = 'Problema de conectividade. Verifique sua conexão e tente novamente.';
        statusCode = 503;
      }
      // Outros erros com detalhes
      else if (error.message.length > 0 && error.message.length < 200) {
        errorMessage = error.message;
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        timestamp: new Date().toISOString(),
        recoverable: statusCode !== 500 // Indica se vale a pena tentar novamente
      },
      { status: statusCode }
    );
  }
}