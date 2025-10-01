import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/lib/openai';

// Cache global para SSE de progresso
const progressCache = new Map<string, any>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      courseStructureId,
      syllabus,
      sessionId
    } = body;

    // Validar parâmetros obrigatórios
    if (!courseStructureId || !syllabus || !sessionId) {
      return NextResponse.json({
        success: false,
        error: 'Parâmetros obrigatórios faltando'
      }, { status: 400 });
    }

    console.log('🚀 Iniciando geração de aulas iniciais...', {
      courseStructureId,
      courseTitle: syllabus.title,
      sessionId
    });

    // Iniciar geração em background
    startInitialLessonGeneration(courseStructureId, syllabus, sessionId)
      .catch(error => {
        console.error('❌ Erro na geração de aulas:', error);
        progressCache.set(sessionId, {
          status: 'error',
          error: error.message,
          courseStructureId
        });
      });

    return NextResponse.json({
      success: true,
      sessionId,
      message: 'Geração de aulas iniciais iniciada',
      courseStructureId
    });

  } catch (error) {
    console.error('❌ Erro no endpoint generate-initial-lessons:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}

// Função principal para gerar aulas iniciais
async function startInitialLessonGeneration(courseStructureId: string, syllabus: any, sessionId: string) {
  try {
    console.log('🎯 Coletando primeiros subtópicos para geração inicial...');

    // Coletar primeiros 3 subtópicos dos primeiros 3 módulos (máximo 9 aulas)
    const subtopicsToGenerate: any[] = [];
    const maxModules = Math.min(3, syllabus.modules?.length || 0);

    for (let moduleIndex = 0; moduleIndex < maxModules; moduleIndex++) {
      const module = syllabus.modules[moduleIndex];
      const maxTopics = Math.min(3, module.topics?.length || 0);

      for (let topicIndex = 0; topicIndex < maxTopics; topicIndex++) {
        const topic = module.topics[topicIndex];
        const maxSubtopics = Math.min(3, topic.subtopics?.length || 0);

        for (let subtopicIndex = 0; subtopicIndex < maxSubtopics; subtopicIndex++) {
          const subtopic = topic.subtopics[subtopicIndex];

          subtopicsToGenerate.push({
            moduleIndex,
            topicIndex,
            subtopicIndex,
            moduleTitle: module.title,
            topicTitle: topic.title,
            subtopicTitle: typeof subtopic === 'string' ? subtopic : subtopic.title || subtopic.name,
            subtopicDescription: typeof subtopic === 'object' ? subtopic.description : '',
            id: `sub_${moduleIndex}_${topicIndex}_${subtopicIndex}`
          });
        }
      }
    }

    console.log(`📚 Total de subtópicos para gerar: ${subtopicsToGenerate.length}`);

    // Inicializar progresso
    progressCache.set(sessionId, {
      total: subtopicsToGenerate.length,
      current: 0,
      status: 'checking',
      message: 'Verificando aulas existentes...',
      phase: 'checking_existing',
      lessons: {},
      courseStructureId
    });

    // Verificar quais aulas já existem no banco
    console.log('🔍 Verificando aulas existentes no banco...');
    const existingLessonsResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/save-subtopic-lesson?courseStructureId=${courseStructureId}`);
    const existingLessonsResult = await existingLessonsResponse.json();

    const existingLessonsMap = new Map();
    if (existingLessonsResult.success && existingLessonsResult.lessons) {
      existingLessonsResult.lessons.forEach((lesson: any) => {
        const key = `${lesson.module_index}_${lesson.topic_index}_${lesson.subtopic_index}`;
        existingLessonsMap.set(key, lesson);
      });
      console.log(`✅ ${existingLessonsResult.lessons.length} aulas existentes encontradas`);
    }

    // Filtrar apenas subtópicos que precisam de aulas
    const subtopicsNeedingLessons = subtopicsToGenerate.filter(subtopic => {
      const key = `${subtopic.moduleIndex}_${subtopic.topicIndex}_${subtopic.subtopicIndex}`;
      return !existingLessonsMap.has(key);
    });

    console.log(`📝 ${subtopicsNeedingLessons.length} aulas novas precisam ser geradas`);

    if (subtopicsNeedingLessons.length === 0) {
      progressCache.set(sessionId, {
        total: subtopicsToGenerate.length,
        current: subtopicsToGenerate.length,
        status: 'completed',
        message: 'Todas as aulas já existem!',
        phase: 'completed',
        lessons: {},
        courseStructureId,
        lessonsGenerated: 0,
        lessonsExisting: subtopicsToGenerate.length
      });
      return;
    }

    // Atualizar progresso para geração
    progressCache.set(sessionId, {
      total: subtopicsToGenerate.length,
      current: subtopicsToGenerate.length - subtopicsNeedingLessons.length,
      status: 'generating',
      message: 'Iniciando geração de aulas...',
      phase: 'generating_lessons',
      lessons: {},
      courseStructureId
    });

    // Gerar aulas em lotes otimizados (4 por vez para melhor performance)
    const BATCH_SIZE = 4;
    const generatedLessons: Record<string, string> = {};
    let processedCount = subtopicsToGenerate.length - subtopicsNeedingLessons.length; // Contar aulas já existentes

    for (let i = 0; i < subtopicsNeedingLessons.length; i += BATCH_SIZE) {
      const batch = subtopicsNeedingLessons.slice(i, Math.min(i + BATCH_SIZE, subtopicsNeedingLessons.length));

      // Atualizar progresso antes do lote
      progressCache.set(sessionId, {
        total: subtopicsToGenerate.length,
        current: processedCount,
        status: 'generating',
        message: `Gerando aula ${processedCount + 1} de ${subtopicsToGenerate.length}...`,
        phase: 'generating_lessons',
        currentSubtopic: batch[0]?.subtopicTitle,
        lessons: generatedLessons,
        courseStructureId
      });

      // Gerar lote em paralelo
      const batchPromises = batch.map(async (item) => {
        try {
          console.log(`🎓 Gerando aula: ${item.subtopicTitle}`);

          const lessonContent = await generateLessonContent({
            courseTitle: syllabus.title,
            courseLevel: 'intermediate',
            moduleTitle: item.moduleTitle,
            topicTitle: item.topicTitle,
            subtopicTitle: item.subtopicTitle,
            subtopicDescription: item.subtopicDescription
          });

          // Salvar no banco imediatamente
          const saveResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/save-subtopic-lesson`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              courseStructureId,
              moduleIndex: item.moduleIndex,
              topicIndex: item.topicIndex,
              subtopicIndex: item.subtopicIndex,
              subtopicTitle: item.subtopicTitle,
              lessonContent,
              metadata: {
                model: 'gpt-4o',
                difficulty: 'intermediate',
                generatedAt: new Date().toISOString(),
                moduleTitle: item.moduleTitle,
                topicTitle: item.topicTitle
              }
            })
          });

          const saveResult = await saveResponse.json();
          if (saveResult.success) {
            console.log(`✅ Aula salva: ${item.subtopicTitle}`);
          } else {
            console.error(`❌ Erro ao salvar aula: ${saveResult.error}`);
          }

          return {
            id: item.id,
            content: lessonContent,
            saved: saveResult.success,
            title: item.subtopicTitle
          };
        } catch (error) {
          console.error(`Error generating lesson for ${item.subtopicTitle}:`, error);
          return {
            id: item.id,
            content: null,
            saved: false,
            title: item.subtopicTitle,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);

      // Adicionar resultados
      batchResults.forEach(result => {
        if (result.content && result.saved) {
          generatedLessons[result.id] = result.content;
        }
      });

      processedCount += batch.length;

      // Pausa otimizada entre lotes para evitar rate limiting
      if (i + BATCH_SIZE < subtopicsNeedingLessons.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Marcar como completo
    progressCache.set(sessionId, {
      total: subtopicsToGenerate.length,
      current: subtopicsToGenerate.length,
      status: 'completed',
      message: 'Aulas iniciais geradas com sucesso!',
      phase: 'completed',
      lessons: generatedLessons,
      courseStructureId,
      lessonsGenerated: Object.keys(generatedLessons).length,
      lessonsExisting: subtopicsToGenerate.length - subtopicsNeedingLessons.length
    });

    console.log('🎉 Geração de aulas iniciais concluída!', {
      generated: Object.keys(generatedLessons).length,
      existing: subtopicsToGenerate.length - subtopicsNeedingLessons.length,
      total: subtopicsToGenerate.length
    });

  } catch (error) {
    console.error('❌ Erro na geração de aulas iniciais:', error);
    progressCache.set(sessionId, {
      status: 'error',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      courseStructureId
    });
    throw error;
  }
}

// Função para gerar conteúdo da aula usando OpenAI
async function generateLessonContent(params: {
  courseTitle: string;
  courseLevel: string;
  moduleTitle: string;
  topicTitle: string;
  subtopicTitle: string;
  subtopicDescription?: string;
}): Promise<string> {
  const {
    courseTitle,
    courseLevel,
    moduleTitle,
    topicTitle,
    subtopicTitle,
    subtopicDescription
  } = params;

  // Ajustar a complexidade do prompt baseado no nível
  const levelInstructions = {
    beginner: 'Use linguagem simples e didática. Inclua exemplos básicos e analogias. Evite termos muito técnicos.',
    intermediate: 'Use linguagem técnica moderada. Inclua exemplos práticos e algumas aplicações.',
    advanced: 'Use linguagem técnica precisa. Inclua exemplos complexos, aplicações avançadas e referências teóricas.'
  };

  const instruction = levelInstructions[courseLevel as keyof typeof levelInstructions] || levelInstructions.intermediate;

  const prompt = `Você é um professor especialista criando uma aula-texto sobre "${subtopicTitle}" para o curso "${courseTitle}".

**Contexto do Curso:**
- Curso: ${courseTitle}
- Módulo: ${moduleTitle}
- Tópico: ${topicTitle}
- Subtópico: ${subtopicTitle}
- Nível: ${courseLevel}
${subtopicDescription ? `- Descrição: ${subtopicDescription}` : ''}

**Instruções:**
${instruction}

**Estrutura da Aula:**
1. **Introdução** (1-2 parágrafos)
   - Contextualize o subtópico dentro do tópico maior
   - Explique a importância e aplicações

2. **Desenvolvimento** (3-5 seções)
   - Conceitos fundamentais
   - Explicações detalhadas
   - Exemplos práticos
   - Fórmulas ou procedimentos (se aplicável)

3. **Exemplos Práticos** (1-2 exemplos)
   - Problemas resolvidos passo a passo
   - Aplicações reais

4. **Pontos-Chave**
   - Lista dos conceitos mais importantes
   - Dicas para memorização

5. **Conclusão**
   - Resumo dos principais aprendizados
   - Conexão com próximos tópicos

**Formato:**
- Use HTML simples (h3, h4, p, ul, li, strong, em)
- Inclua exemplos em blocos destacados
- Use listas para organizar informações
- Mantenha entre 800-1500 palavras
- Seja didático e envolvente

Crie uma aula-texto completa e educativa sobre "${subtopicTitle}":`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Você é um professor universitário especialista em criar conteúdo educacional de alta qualidade. Sempre forneça explicações claras, didáticas e bem estruturadas.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 3000,
      temperature: 0.7
    });

    const content = completion.choices[0]?.message?.content?.trim();

    if (!content) {
      throw new Error('Conteúdo vazio retornado pela OpenAI');
    }

    return content;

  } catch (error) {
    console.error('❌ Erro ao gerar aula com OpenAI:', error);
    throw new Error(`Falha na geração de conteúdo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

// Endpoint para SSE do progresso das aulas
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json(
      { error: 'SessionId is required' },
      { status: 400 }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendProgress = () => {
        const progress = progressCache.get(sessionId);

        if (!progress) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            error: 'Session not found'
          })}\n\n`));
          controller.close();
          return;
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify(progress)}\n\n`));

        if (progress.status === 'completed' || progress.status === 'error') {
          // Limpar cache após enviar resultado final
          setTimeout(() => progressCache.delete(sessionId), 10000);
          controller.close();
        } else {
          // Verificar progresso novamente em 1 segundo
          setTimeout(sendProgress, 1000);
        }
      };

      sendProgress();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}