import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { saveCourseStructure, findExistingStructure } from '@/lib/supabase';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Cache global para SSE
const progressCache = new Map<string, any>();

export async function POST(request: NextRequest) {
  try {
    const { syllabus, uploadedFiles, sessionId } = await request.json();

    if (!syllabus) {
      return NextResponse.json(
        { success: false, error: 'Syllabus é obrigatório' },
        { status: 400 }
      );
    }

    console.log('🏗️ Criando curso final:', {
      title: syllabus.title,
      modulesCount: syllabus.modules?.length || 0,
      filesCount: uploadedFiles?.length || 0,
      sessionId: sessionId
    });

    // 1. Gerar ID único simples para o curso
    const courseId = `course_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 2. Salvar estrutura do curso no banco de dados
    console.log('💾 Salvando estrutura do curso no banco...');

    // Extrair assunto e nível da estrutura
    const subject = syllabus.title.toLowerCase().replace('curso completo de ', '').replace('curso de ', '');
    const educationLevel = 'undergraduate'; // Nível padrão (pode vir do questionário futuramente)

    const courseStructureResult = await saveCourseStructure(
      syllabus.title,
      educationLevel,
      syllabus
    );

    console.log('✅ Estrutura salva:', courseStructureResult);

    // 3. Iniciar e AGUARDAR geração de aulas iniciais
    let lessonGenerationResult = null;

    // Usar sessionId enviado ou criar um padrão
    const effectiveSessionId = sessionId || `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // AGUARDAR geração de aulas iniciais se houver módulos
    if (syllabus.modules && syllabus.modules.length > 0 && courseStructureResult.id) {
      console.log('🎓 Iniciando e aguardando geração de aulas iniciais...');
      console.log('📊 SessionId usado:', effectiveSessionId);
      console.log('📚 Course Structure ID:', courseStructureResult.id);

      try {
        // AGUARDAR a conclusão da geração de aulas antes de retornar
        lessonGenerationResult = await startInitialLessonGeneration(
          courseStructureResult.id,
          syllabus,
          effectiveSessionId,
          subject,
          educationLevel
        );

        console.log('✅ Geração de aulas concluída:', {
          lessonsGenerated: lessonGenerationResult?.lessonsGenerated || 0,
          lessonsExisting: lessonGenerationResult?.lessonsExisting || 0,
          totalSubtopics: lessonGenerationResult?.totalSubtopics || 0
        });
      } catch (error) {
        console.error('❌ Erro ao gerar aulas:', error);
        // Continuar mesmo se houver erro na geração
        lessonGenerationResult = null;
      }
    } else {
      console.log('⚠️ Nenhum módulo encontrado ou erro ao salvar estrutura');
    }

    console.log('✅ Curso criado com ID:', courseId);
    console.log('📊 Structure ID:', courseStructureResult.id);

    // 3. Calcular estatísticas do curso
    let totalTopics = 0;

    if (syllabus.modules && Array.isArray(syllabus.modules)) {
      for (const courseModule of syllabus.modules) {
        if (courseModule.topics && Array.isArray(courseModule.topics)) {
          totalTopics += courseModule.topics.length;
        }
      }
    }

    console.log('✅ Curso finalizado:', {
      id: courseId,
      title: syllabus.title,
      total_topics: totalTopics
    });

    // Verificar se TODAS as aulas necessárias estão prontas
    const totalNeeded = syllabus.modules?.[0]?.topics?.[0]?.subtopics?.length || 0;
    const totalReady = lessonGenerationResult
      ? (lessonGenerationResult.lessonsExisting || 0) + (lessonGenerationResult.lessonsGenerated || 0)
      : 0;

    const allLessonsReady = totalNeeded > 0 && totalNeeded === totalReady;

    console.log('📊 Status das aulas:', {
      totalNeeded,
      totalReady,
      allLessonsReady
    });

    return NextResponse.json({
      success: true,
      courseId: courseId,
      course: {
        id: courseId,
        title: syllabus.title,
        description: syllabus.description || `Curso de ${syllabus.title}`,
        total_topics: totalTopics,
        progress: 0,
        syllabus_data: syllabus,
        courseStructureId: courseStructureResult.id
      },
      message: `Curso "${syllabus.title}" criado com ${totalTopics} tópicos`,
      sessionId: effectiveSessionId,
      lessonsReady: allLessonsReady, // Só true quando TODAS as aulas estiverem prontas
      lessonStats: lessonGenerationResult ? {
        lessonsGenerated: lessonGenerationResult.lessonsGenerated || 0,
        lessonsExisting: lessonGenerationResult.lessonsExisting || 0,
        totalSubtopics: lessonGenerationResult.totalSubtopics || 0,
        needed: totalNeeded,
        ready: totalReady,
        missing: Math.max(0, totalNeeded - totalReady)
      } : null
    });

  } catch (error) {
    console.error('❌ Erro ao criar curso:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno do servidor'
      },
      { status: 500 }
    );
  }
}

// Função para iniciar geração de aulas iniciais (primeiros subtópicos)
async function startInitialLessonGeneration(
  courseStructureId: string,
  syllabus: any,
  sessionId: string,
  subject: string,
  educationLevel: string
) {
  try {
    console.log('🎯 Coletando primeiros subtópicos para geração inicial...');
    console.log('📚 Assunto:', subject, '| Nível:', educationLevel);

    // Coletar APENAS subtópicos do PRIMEIRO tópico do PRIMEIRO módulo
    const subtopicsToGenerate: any[] = [];

    // Apenas primeiro módulo e primeiro tópico
    if (syllabus.modules?.length > 0 && syllabus.modules[0].topics?.length > 0) {
      const firstModule = syllabus.modules[0];
      const firstTopic = firstModule.topics[0];

      // Pegar TODOS os subtópicos do primeiro tópico (geralmente 3-5)
      if (firstTopic.subtopics && Array.isArray(firstTopic.subtopics)) {
        firstTopic.subtopics.forEach((subtopic: any, subtopicIndex: number) => {
          subtopicsToGenerate.push({
            moduleIndex: 0,  // Sempre primeiro módulo
            topicIndex: 0,   // Sempre primeiro tópico
            subtopicIndex,
            moduleTitle: firstModule.title,
            topicTitle: firstTopic.title,
            subtopicTitle: typeof subtopic === 'string' ? subtopic : subtopic.title || subtopic.name,
            subtopicDescription: typeof subtopic === 'object' ? subtopic.description : '',
            id: `sub_0_0_${subtopicIndex}`
          });
        });
      }
    }

    console.log(`📚 Total de subtópicos do primeiro tópico: ${subtopicsToGenerate.length}`);
    console.log('📝 Subtópicos:', subtopicsToGenerate.map(s => s.subtopicTitle));

    // Inicializar progresso
    progressCache.set(sessionId, {
      total: subtopicsToGenerate.length,
      current: 0,
      status: 'generating',
      message: 'Verificando aulas existentes...',
      phase: 'checking_existing',
      lessons: {},
      courseStructureId
    });

    // Verificar quais aulas já existem no banco
    console.log('🔍 Verificando aulas existentes no banco...');
    console.log('📊 Usando search_key com:', { subject, educationLevel });

    // Buscar usando subject e educationLevel (mais confiável)
    const existingLessonsResponse = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/save-subtopic-lesson?` +
      `subject=${encodeURIComponent(subject)}&educationLevel=${encodeURIComponent(educationLevel)}&` +
      `courseStructureId=${courseStructureId}`
    );
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
        courseStructureId
      });
      return {
        success: true,
        sessionId,
        lessonsGenerated: 0,
        lessonsExisting: subtopicsToGenerate.length,
        totalSubtopics: subtopicsToGenerate.length
      };
    }

    // Gerar aulas em lotes otimizados (4 por vez para melhor performance)
    const BATCH_SIZE = 4; // Processar 4 aulas por vez otimizando performance
    const generatedLessons: Record<string, string> = {};
    let processedCount = subtopicsToGenerate.length - subtopicsNeedingLessons.length; // Contar aulas já existentes

    for (let i = 0; i < subtopicsNeedingLessons.length; i += BATCH_SIZE) {
      const batch = subtopicsNeedingLessons.slice(i, Math.min(i + BATCH_SIZE, subtopicsNeedingLessons.length));

      // Atualizar progresso
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

      // Gerar batch em paralelo
      const batchPromises = batch.map(async (item) => {
        try {
          console.log(`🎓 Gerando aula: ${item.subtopicTitle}`);
          const lessonContent = await generateLesson(
            item.topicTitle,
            item.subtopicTitle,
            'medium'  // Corrigido: usar 'medium' ao invés de 'intermediate'
          );

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
              subject,          // Adicionar subject
              educationLevel,   // Adicionar educationLevel
              metadata: {
                model: 'gpt-4o-mini',
                difficulty: 'medium',  // Corrigido: usar 'medium' ao invés de 'intermediate'
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

          return { id: item.id, content: lessonContent, saved: saveResult.success };
        } catch (error) {
          console.error(`Error generating lesson for ${item.subtopicTitle}:`, error);
          return { id: item.id, content: null, saved: false };
        }
      });

      const batchResults = await Promise.all(batchPromises);

      // Adicionar resultados ao objeto de lições
      batchResults.forEach(result => {
        if (result.content) {
          generatedLessons[result.id] = result.content;
        }
      });

      processedCount += batch.length;
    }

    // Marcar como completo
    progressCache.set(sessionId, {
      total: subtopicsToGenerate.length,
      current: subtopicsToGenerate.length,
      status: 'completed',
      message: 'Aulas iniciais geradas com sucesso!',
      phase: 'completed',
      lessons: generatedLessons,
      courseStructureId
    });

    return {
      success: true,
      sessionId,
      lessonsGenerated: Object.keys(generatedLessons).length,
      lessonsExisting: subtopicsToGenerate.length - subtopicsNeedingLessons.length,
      totalSubtopics: subtopicsToGenerate.length,
      courseStructureId
    };

  } catch (error) {
    console.error('Error generating first module lessons:', error);
    progressCache.set(sessionId, {
      status: 'error',
      error: 'Failed to generate lessons'
    });
    throw error;
  }
}

async function generateLesson(topic: string, subtopic: string, level: string): Promise<string> {
  const prompt = `Crie uma aula-texto completa e profissional sobre o tema: "${subtopic}" (que faz parte do tópico maior "${topic}").

Siga EXATAMENTE esta estrutura:

## Objetivos de Aprendizagem
Liste 3-5 objetivos claros do que o aluno vai aprender nesta aula.

## Introdução
Faça uma introdução envolvente que contextualize o assunto e desperte interesse do aluno. Conecte com conhecimentos prévios e mostre a importância do tema.

## Desenvolvimento

### [Subtítulo do Primeiro Conceito]
Explique o primeiro conceito principal com clareza, usando linguagem didática.

[IMAGEM: descreva detalhadamente uma imagem que ilustre este conceito, incluindo elementos visuais específicos, cores, disposição, etc.]

Continue explicando como a imagem se relaciona com o conceito.

### [Subtítulo do Segundo Conceito]
Desenvolva o segundo conceito importante, com exemplos práticos do cotidiano.

**Exemplo prático:** [Insira um exemplo real e aplicável]

### [Subtítulo do Terceiro Conceito]
Apresente o terceiro conceito, fazendo conexões com os anteriores.

[IMAGEM: descreva uma segunda imagem explicativa que ajude a visualizar este conceito ou processo]

Explique o que a imagem demonstra e sua importância.

### Aplicações e Exercícios Mentais
Apresente 2-3 situações práticas onde o conhecimento pode ser aplicado.

## Resumo
Recapitule os pontos principais da aula em formato de bullet points.

## Dica Extra
Adicione uma curiosidade interessante ou uma dica prática relacionada ao tema.

---

**Importante:**
- Use linguagem clara e didática, apropriada para nível médio
- Inclua exatamente 2 marcações [IMAGEM: ...] em pontos estratégicos
- Faça analogias com situações do dia a dia
- Mantenha um tom profissional mas acessível
- Formate o texto em Markdown válido`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'Você é um professor especialista criando conteúdo educacional de alta qualidade. Suas aulas devem ser claras, envolventes e pedagogicamente estruturadas.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 3000,
  });

  const lessonContent = completion.choices[0].message.content || '';
  return processImageMarkers(lessonContent).content;
}

interface ProcessedContent {
  content: string;
  images: Array<{
    id: string;
    description: string;
    position: number;
  }>;
}

function processImageMarkers(content: string): ProcessedContent {
  const images: ProcessedContent['images'] = [];
  let imageCounter = 0;

  const imageRegex = /\[IMAGEM:\s*([^\]]+)\]/g;

  const processedContent = content.replace(imageRegex, (match, description) => {
    imageCounter++;
    const imageId = `image-${imageCounter}`;

    images.push({
      id: imageId,
      description: description.trim(),
      position: imageCounter,
    });

    return `\n\n<div class="lesson-image-placeholder" data-image-id="${imageId}">
  <div class="image-loading">
    <span class="image-icon">🖼️</span>
    <p class="image-description">Imagem ${imageCounter}: ${description.trim()}</p>
    <p class="image-status">Imagem ilustrativa em preparação...</p>
  </div>
</div>\n\n`;
  });

  return {
    content: processedContent,
    images,
  };
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
          setTimeout(() => progressCache.delete(sessionId), 5000);
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