import { NextRequest, NextResponse } from 'next/server';
import { analyzeLearningGoal, generateTopicDescription, generatePrerequisites } from '@/lib/openai';
import { searchVideosByTopics, searchAndRankYouTube } from '@/lib/youtube';
import { searchAcademicContent, generateAcademicSummary, validateTopicsWithPerplexity, analyzeUploadedFiles, enhanceAcademicContentWithFiles } from '@/lib/perplexity';
import { askAssistantWithFiles } from '@/lib/openai-files';
import { saveLearningPlan, saveCourse } from '@/lib/supabase';
import { LearningGoal, Topic, ChatMessage, TopicValidationResult, FileAnalysisResult } from '@/types';

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
    const { message, uploadedFiles } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Mensagem é obrigatória' },
        { status: 400 }
      );
    }

    console.log('🔍 Iniciando análise do objetivo de aprendizado...');
    const analysis = await analyzeLearningGoal(message);
    console.log('📚 Tópicos iniciais identificados:', analysis.topics.map(t => t.title));
    
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
    const currentTopics = analysis.topics.map(t => t.title);
    const topicValidation = await validateTopicsWithPerplexity(
      analysis.subject,
      currentTopics,
      analysis.level,
      assistantId // Passar o assistantId se disponível
    );
    console.log('✅ Validação de tópicos concluída:', topicValidation.validationSummary);
    
    // Combinar tópicos originais com sugestões do Perplexity
    const enhancedTopics: EnhancedTopic[] = [...analysis.topics];
    
    // Adicionar tópicos faltantes importantes
    topicValidation.missingTopics.forEach((missingTopic, index) => {
      enhancedTopics.push({
        title: missingTopic,
        description: `Tópico essencial identificado pelo Perplexity para completar o aprendizado de ${analysis.subject}`,
        keywords: [missingTopic.toLowerCase().split(' ').slice(0, 3).join(' ')],
        order: enhancedTopics.length + 1,
        learningObjectives: [],
        keyTerms: [],
        searchKeywords: []
      });
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
            `Analise os documentos enviados no contexto de um curso sobre "${analysis.subject}". 
             Quais são os principais tópicos cobertos nos documentos?`,
            
            `Com base nos documentos, que tópicos essenciais estão faltando para formar 
             um curso completo sobre "${analysis.subject}" no nível ${analysis.level}?`,
            
            `Sugira tópicos adicionais que complementariam o aprendizado de "${analysis.subject}" 
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
              .slice(0, 10); // Limite para evitar spam
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

          // Adicionar tópicos extras encontrados nos arquivos se forem relevantes
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
            console.log('➕ Tópicos inteligentes dos arquivos incluídos:', additionalTopicsList);
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
            analysis.subject
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
          analysis.subject
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
                description: `Tópico encontrado nos arquivos enviados que pode complementar o aprendizado de ${analysis.subject}`,
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
    
    // Buscar vídeos educacionais para os primeiros 5 tópicos
    console.log('📚 Buscando vídeos educacionais...');
    const initialTopics = enhancedTopics.slice(0, Math.min(5, enhancedTopics.length));
    const videosResults: { [topicTitle: string]: any[] } = {};
    
    // Processar cada tópico individualmente para buscar vídeos educacionais
    for (let i = 0; i < initialTopics.length; i++) {
      const topic = initialTopics[i];
      console.log(`🎯 Processando tópico ${i + 1}/5: "${topic.title}"`);
      
      try {
        // Buscar vídeos educacionais usando apenas o título do tópico
        const educationalVideos = await searchAndRankYouTube(
          topic.title,
          '', // Não usar contexto desnecessário
          3 // 3 vídeos por tópico
        );
        
        videosResults[topic.title] = educationalVideos;
        console.log(`✅ Tópico "${topic.title}": ${educationalVideos.length} vídeos educacionais encontrados`);
        
      } catch (error) {
        console.error(`❌ Erro ao processar tópico "${topic.title}":`, error);
        // Fallback para busca tradicional
        try {
          const fallbackVideos = await searchVideosByTopics([topic]);
          videosResults[topic.title] = fallbackVideos[topic.title] || [];
        } catch (fallbackError) {
          videosResults[topic.title] = [];
        }
      }
    }
    
    console.log('✅ Busca de vídeos educacionais concluída');

    // Busca conteúdo acadêmico apenas para os primeiros 5 tópicos
    console.log('🎓 Iniciando busca de conteúdo acadêmico para os primeiros 5 tópicos...');
    const academicResults = [];
    const initialTopicsCount = Math.min(5, enhancedTopics.length);
    
    for (let i = 0; i < initialTopicsCount; i++) {
      const topic = enhancedTopics[i];
      console.log(`🔬 Buscando conteúdo acadêmico para: "${topic.title}"`);
      
      try {
        const perplexityResponse = await searchAcademicContent({
          query: topic.title,
          language: 'pt'
        });
        console.log(`✅ Resposta do Perplexity obtida para: "${topic.title}"`);
        
        let academicContent = await generateAcademicSummary(
          topic.title,
          perplexityResponse
        );
        console.log(`📖 Resumo acadêmico gerado para: "${topic.title}"`);
        
        // Melhorar conteúdo acadêmico com documentos se disponível
        if (assistantId) {
          try {
            console.log(`🔬 Melhorando conteúdo acadêmico com documentos para: "${topic.title}"`);
            const enhancement = await enhanceAcademicContentWithFiles(
              assistantId,
              topic.title,
              academicContent,
              analysis.subject
            );
            
            academicContent = enhancement.enhancedContent;
            
            if (enhancement.missingElements.length > 0) {
              console.log(`📈 Elementos adicionais encontrados nos documentos:`, enhancement.missingElements);
            }
            if (enhancement.additionalFormulas.length > 0) {
              console.log(`🔢 Fórmulas identificadas nos documentos:`, enhancement.additionalFormulas);
            }
            
          } catch (enhanceError) {
            console.error(`⚠️ Erro ao melhorar conteúdo com documentos para "${topic.title}":`, enhanceError);
            // Continua com o conteúdo original se falhar
          }
        }
        
        academicResults.push({ topicTitle: topic.title, content: academicContent });
      } catch (error) {
        console.error(`❌ Erro ao buscar conteúdo acadêmico para "${topic.title}":`, error);
        academicResults.push({ topicTitle: topic.title, content: null });
      }
    }

    console.log('📊 Resultados da busca acadêmica:', academicResults.map(r => ({ 
      topic: r.topicTitle, 
      hasContent: !!r.content 
    })));

    // Organiza resultados acadêmicos por tópico
    const academicByTopic = academicResults.reduce((acc, result) => {
      if (result.content) {
        acc[result.topicTitle] = result.content;
      }
      return acc;
    }, {} as { [key: string]: any });

    // Converter módulos hierárquicos para estrutura Topic (compatibilidade)
    const convertModulesToTopics = (modules: any[]): Topic[] => {
      const topicsFromModules: Topic[] = [];
      let globalOrder = 1;

      modules.forEach(module => {
        module.sections.forEach((section: any) => {
          section.topics.forEach((moduleTopic: any) => {
            topicsFromModules.push({
              id: `topic-${Date.now()}-${globalOrder}`,
              title: moduleTopic.title,
              description: moduleTopic.description,
              order: globalOrder++,
              videos: videosResults[moduleTopic.title] || [],
              academicContent: academicByTopic[moduleTopic.title] || null,
              completed: false,
              estimatedDuration: moduleTopic.estimatedDuration,
              contentType: moduleTopic.contentType,
              hasDoubtButton: true,
              detailedDescription: moduleTopic.description,
              learningObjectives: [],
              keyTerms: moduleTopic.keywords || [],
              searchKeywords: moduleTopic.keywords || [moduleTopic.title]
            });
          });
        });
      });

      return topicsFromModules;
    };

    // Usar tópicos dos módulos se disponível, senão usar enhancedTopics
    const topicsFromModules = analysis.modules ? convertModulesToTopics(analysis.modules) : [];
    const finalTopics = topicsFromModules.length > 0 ? topicsFromModules : enhancedTopics;

    const topics: Topic[] = finalTopics.map((topic, index) => ({
      id: topic.id || `topic-${Date.now()}-${index}`,
      title: topic.title,
      description: topic.description,
      order: topic.order || index + 1,
      videos: topic.videos || videosResults[topic.title] || [],
      academicContent: topic.academicContent || academicByTopic[topic.title] || null,
      completed: false,
      estimatedDuration: topic.estimatedDuration,
      contentType: topic.contentType,
      hasDoubtButton: topic.hasDoubtButton,
      // Novos campos para aprendizado aprimorado
      detailedDescription: topic.detailedDescription || topic.description,
      learningObjectives: topic.learningObjectives || [],
      keyTerms: topic.keyTerms || [],
      searchKeywords: topic.searchKeywords || []
    }));

    // Converter módulos da análise para a estrutura Module completa
    const convertToModuleStructure = (analysisModules: any[]): any[] => {
      return analysisModules.map((module, moduleIndex) => ({
        id: `module-${Date.now()}-${moduleIndex}`,
        title: module.title,
        description: module.description,
        order: module.order,
        estimatedDuration: module.estimatedDuration,
        completed: false,
        color: `hsl(${moduleIndex * 60}, 70%, 50%)`, // Cores diferentes para cada módulo
        sections: module.sections.map((section: any, sectionIndex: number) => ({
          id: `section-${Date.now()}-${moduleIndex}-${sectionIndex}`,
          title: section.title,
          description: section.description,
          order: section.order,
          estimatedDuration: '1 semana',
          completed: false,
          learningObjectives: section.learningObjectives || [],
          topics: section.topics.map((topic: any, topicIndex: number) => {
            // Encontrar o topic correspondente na lista completa
            const fullTopic = topics.find(t => t.title === topic.title);
            return fullTopic || {
              id: `topic-${Date.now()}-${moduleIndex}-${sectionIndex}-${topicIndex}`,
              title: topic.title,
              description: topic.description,
              order: topic.order,
              videos: [],
              academicContent: null,
              completed: false,
              estimatedDuration: topic.estimatedDuration,
              contentType: topic.contentType,
              hasDoubtButton: true,
              detailedDescription: topic.description,
              learningObjectives: [],
              keyTerms: topic.keywords || [],
              searchKeywords: topic.keywords || [topic.title]
            };
          })
        }))
      }));
    };

    const goal: LearningGoal = {
      id: `goal-${Date.now()}`,
      title: analysis.subject,
      description: `Plano de estudos para ${analysis.subject} (nível ${analysis.level})`,
      level: analysis.level,
      modules: analysis.modules ? convertToModuleStructure(analysis.modules) : [], // Nova estrutura hierárquica
      topics, // Mantém compatibilidade
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
      content: `Criei um plano de estudos para ${analysis.subject} com ${topics.length} tópicos organizados para o nível ${analysis.level}. Você pode explorar cada tópico e assistir aos vídeos recomendados.`,
      timestamp: new Date().toISOString(),
    };

    // Gerar pré-requisitos para o curso
    console.log('🎯 Gerando pré-requisitos do curso...');
    let prerequisites = [];
    try {
      prerequisites = await generatePrerequisites(
        goal.title,
        goal.description,
        goal.level,
        goal.topics.map(t => t.title)
      );
      console.log(`✅ ${prerequisites.length} pré-requisitos identificados`);
    } catch (error) {
      console.error('⚠️ Erro ao gerar pré-requisitos:', error);
    }

    const learningPlan = await saveLearningPlan({
      goal: {
        ...goal,
        prerequisites
      },
      messages: [userMessage, assistantMessage],
      progress: 0,
      topicValidation,
      uploadedFiles: uploadedFiles || [],
      fileAnalysis,
    });

    // Salvar também no novo sistema de cursos
    try {
      console.log('💾 Salvando curso no novo sistema...');
      const savedCourse = await saveCourse(learningPlan);
      console.log('✅ Curso salvo com sucesso:', savedCourse.id);
      
      // Adicionar ID do curso salvo ao retorno
      learningPlan.courseId = savedCourse.id;
    } catch (courseError) {
      console.error('⚠️ Erro ao salvar curso (continuando mesmo assim):', courseError);
      // Não interromper o fluxo se falhar ao salvar no novo sistema
    }

    return NextResponse.json({
      success: true,
      plan: learningPlan,
    });

  } catch (error) {
    console.error('Erro na API /analyze:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}