import { NextRequest, NextResponse } from 'next/server';
import { analyzeLearningGoal, generateTopicDescription } from '@/lib/openai';
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
    
    // Gerar descrições detalhadas e buscar vídeos educacionais para os primeiros 5 tópicos
    console.log('📚 Gerando descrições detalhadas e buscando vídeos educacionais...');
    const initialTopics = enhancedTopics.slice(0, Math.min(5, enhancedTopics.length));
    const videosResults: { [topicTitle: string]: any[] } = {};
    
    // Processar cada tópico individualmente para descrição + vídeos educacionais
    for (let i = 0; i < initialTopics.length; i++) {
      const topic = initialTopics[i];
      console.log(`🎯 Processando tópico ${i + 1}/5: "${topic.title}"`);
      
      try {
        // Gerar descrição detalhada do tópico
        const topicDetails = await generateTopicDescription(
          topic.title,
          analysis.subject,
          analysis.level
        );
        
        // Atualizar o tópico com informações detalhadas
        const topicIndex = enhancedTopics.findIndex(t => t.title === topic.title);
        if (topicIndex !== -1) {
          enhancedTopics[topicIndex] = {
            ...topic,
            description: topicDetails.description,
            learningObjectives: topicDetails.learningObjectives,
            keyTerms: topicDetails.keyTerms,
            searchKeywords: topicDetails.searchKeywords
          };
        }
        
        // Buscar vídeos educacionais usando o novo sistema inteligente
        const educationalVideos = await searchAndRankYouTube(
          topic.title,
          topicDetails.description, // Usar descrição como contexto
          3 // 3 vídeos por tópico
        );
        
        videosResults[topic.title] = educationalVideos;
        console.log(`✅ Tópico "${topic.title}": descrição + ${educationalVideos.length} vídeos educacionais`);
        
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
    
    console.log('✅ Processamento de descrições e vídeos educacionais concluído');

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

    const topics: Topic[] = enhancedTopics.map((topic, index) => ({
      id: `topic-${Date.now()}-${index}`,
      title: topic.title,
      description: topic.description,
      order: topic.order,
      videos: videosResults[topic.title] || [],
      academicContent: academicByTopic[topic.title] || null,
      completed: false,
      // Novos campos para aprendizado aprimorado
      detailedDescription: topic.description,
      learningObjectives: topic.learningObjectives || [],
      keyTerms: topic.keyTerms || [],
      searchKeywords: topic.searchKeywords || []
    }));

    const goal: LearningGoal = {
      id: `goal-${Date.now()}`,
      title: analysis.subject,
      description: `Plano de estudos para ${analysis.subject} (nível ${analysis.level})`,
      level: analysis.level,
      topics,
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

    const learningPlan = await saveLearningPlan({
      goal,
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