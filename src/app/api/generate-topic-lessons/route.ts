import { NextRequest, NextResponse } from 'next/server';
import { generateLessonText } from '@/lib/lesson-text-generator';

// Interface para progresso da geração de tópico específico
interface TopicGenerationProgress {
  phase: string;
  step: string;
  progress: number;
  currentSubtopic?: string;
  completedLessons: number;
  totalLessons: number;
  status: 'processing' | 'completed' | 'error';
  result?: any;
  error?: string;
}

// Map para armazenar progresso das gerações em andamento
const topicProgressMap = new Map<string, TopicGenerationProgress>();

export async function POST(request: NextRequest) {
  try {
    const { sessionId, courseId, moduleIndex, topicIndex, syllabus } = await request.json();

    if (!sessionId || !courseId || moduleIndex === undefined || topicIndex === undefined || !syllabus) {
      return NextResponse.json(
        { success: false, error: 'Parâmetros obrigatórios: sessionId, courseId, moduleIndex, topicIndex, syllabus' },
        { status: 400 }
      );
    }

    console.log('🏗️ Iniciando geração de tópico específico:', {
      courseId,
      moduleIndex,
      topicIndex,
      sessionId
    });

    // Extrair subtópicos do tópico específico
    const topicSubtopics = extractTopicSubtopics(syllabus, moduleIndex, topicIndex);

    if (topicSubtopics.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nenhum subtópico encontrado para este tópico' },
        { status: 400 }
      );
    }

    // Inicializar progresso
    topicProgressMap.set(sessionId, {
      phase: 'Iniciando geração do tópico...',
      step: 'setup',
      progress: 0,
      completedLessons: 0,
      totalLessons: topicSubtopics.length,
      status: 'processing'
    });

    // Iniciar geração assíncrona
    generateTopicLessons(sessionId, courseId, topicSubtopics, syllabus)
      .then(result => {
        topicProgressMap.set(sessionId, {
          phase: 'Tópico concluído!',
          step: 'completed',
          progress: 100,
          completedLessons: topicSubtopics.length,
          totalLessons: topicSubtopics.length,
          status: 'completed',
          result
        });
        console.log(`✅ Tópico gerado com sucesso: ${courseId} (${sessionId})`);
      })
      .catch(error => {
        console.error(`❌ Erro na geração do tópico: ${error.message} (${sessionId})`);
        topicProgressMap.set(sessionId, {
          phase: 'Erro na geração',
          step: 'error',
          progress: 0,
          completedLessons: 0,
          totalLessons: topicSubtopics.length,
          status: 'error',
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      });

    return NextResponse.json({
      success: true,
      sessionId,
      message: 'Geração do tópico iniciada',
      totalLessons: topicSubtopics.length
    });

  } catch (error) {
    console.error('❌ Erro ao iniciar geração do tópico:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno do servidor'
      },
      { status: 500 }
    );
  }
}

// Endpoint GET para verificar progresso (SSE)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return new Response('sessionId é obrigatório', { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Enviar evento inicial
      const data = `data: ${JSON.stringify({
        type: 'connected',
        sessionId,
        timestamp: Date.now()
      })}\\n\\n`;
      controller.enqueue(encoder.encode(data));

      // Verificar progresso a cada 1 segundo
      const interval = setInterval(() => {
        const progress = topicProgressMap.get(sessionId);

        if (!progress) {
          controller.close();
          clearInterval(interval);
          return;
        }

        // Enviar update de progresso
        const progressData = `data: ${JSON.stringify({
          type: 'progress',
          sessionId,
          phase: progress.phase,
          step: progress.step,
          progress: progress.progress,
          currentSubtopic: progress.currentSubtopic,
          completedLessons: progress.completedLessons,
          totalLessons: progress.totalLessons,
          status: progress.status,
          timestamp: Date.now()
        })}\\n\\n`;

        controller.enqueue(encoder.encode(progressData));

        // Se completou ou deu erro, enviar resultado final
        if (progress.status === 'completed') {
          const resultData = `data: ${JSON.stringify({
            type: 'completed',
            sessionId,
            result: progress.result,
            timestamp: Date.now()
          })}\\n\\n`;

          controller.enqueue(encoder.encode(resultData));
          topicProgressMap.delete(sessionId);
          controller.close();
          clearInterval(interval);
        } else if (progress.status === 'error') {
          const errorData = `data: ${JSON.stringify({
            type: 'error',
            sessionId,
            error: progress.error,
            timestamp: Date.now()
          })}\\n\\n`;

          controller.enqueue(encoder.encode(errorData));
          topicProgressMap.delete(sessionId);
          controller.close();
          clearInterval(interval);
        }
      }, 1000);

      // Timeout de 10 minutos
      setTimeout(() => {
        topicProgressMap.delete(sessionId);
        controller.close();
        clearInterval(interval);
      }, 10 * 60 * 1000);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
}

// Função para extrair subtópicos de um tópico específico
function extractTopicSubtopics(syllabus: any, moduleIndex: number, topicIndex: number) {
  const subtopics: any[] = [];

  if (syllabus.modules && Array.isArray(syllabus.modules) &&
      syllabus.modules[moduleIndex] &&
      syllabus.modules[moduleIndex].topics &&
      Array.isArray(syllabus.modules[moduleIndex].topics) &&
      syllabus.modules[moduleIndex].topics[topicIndex]) {

    const module = syllabus.modules[moduleIndex];
    const topic = module.topics[topicIndex];

    if (topic.subtopics && Array.isArray(topic.subtopics)) {
      for (const subtopic of topic.subtopics) {
        // Garantir que title existe antes de usar replace
        const subtopicTitle = subtopic.title || 'subtopic';
        subtopics.push({
          ...subtopic,
          moduleTitle: module.title || 'Módulo',
          topicTitle: topic.title || 'Tópico',
          id: subtopic.id || `${module.id || `mod_${moduleIndex}`}_${topic.id || `top_${topicIndex}`}_${subtopicTitle.replace(/\s+/g, '_').toLowerCase()}`
        });
      }
    }
  }

  return subtopics;
}

// Função principal para gerar aulas de um tópico específico
async function generateTopicLessons(
  sessionId: string,
  courseId: string,
  subtopics: any[],
  syllabus: any
) {
  updateTopicProgress(sessionId, 'Preparando geração...', 'setup', 5);

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Gerar aulas-texto para todos os subtópicos deste tópico
  let completedLessons = 0;
  const lessonContents = new Map<string, string>();

  for (const subtopic of subtopics) {
    const currentProgress = 10 + ((completedLessons / subtopics.length) * 80);

    updateTopicProgress(
      sessionId,
      `Gerando aula: ${subtopic.title}`,
      'generating_lesson',
      currentProgress,
      subtopic.title
    );

    try {
      // Gerar aula-texto para este subtópico
      const lessonResult = await generateLessonText({
        subtopicTitle: subtopic.title,
        subtopicDescription: subtopic.description || `Estudo sobre ${subtopic.title}`,
        moduleTitle: subtopic.moduleTitle,
        courseTitle: syllabus.title,
        userLevel: 'intermediate',
        discipline: extractDisciplineFromTitle(syllabus.title),
        estimatedDuration: subtopic.estimatedDuration || '45 min'
      });

      // Armazenar conteúdo gerado
      lessonContents.set(subtopic.id, lessonResult.content);

      completedLessons++;

      updateTopicProgress(
        sessionId,
        `Aula concluída: ${subtopic.title}`,
        'lesson_completed',
        10 + ((completedLessons / subtopics.length) * 80),
        undefined,
        completedLessons
      );

    } catch (error) {
      console.error(`❌ Erro ao gerar aula para ${subtopic.title}:`, error);
      // Continuar com outras aulas mesmo se uma falhar
      lessonContents.set(subtopic.id, `# ${subtopic.title}\\n\\nConteúdo será gerado posteriormente devido a erro técnico.`);
      completedLessons++;
    }
  }

  updateTopicProgress(sessionId, 'Finalizando tópico...', 'finalizing', 95);

  await new Promise(resolve => setTimeout(resolve, 1000));

  return {
    success: true,
    courseId,
    lessonsGenerated: completedLessons,
    lessonContents: Object.fromEntries(lessonContents),
    message: `Tópico gerado com ${completedLessons} aulas-texto`
  };
}

// Função utilitária para atualizar progresso do tópico
function updateTopicProgress(
  sessionId: string,
  phase: string,
  step: string,
  progress: number,
  currentSubtopic?: string,
  completedLessons?: number
) {
  const current = topicProgressMap.get(sessionId);
  if (current && current.status === 'processing') {
    topicProgressMap.set(sessionId, {
      ...current,
      phase,
      step,
      progress,
      currentSubtopic,
      completedLessons: completedLessons ?? current.completedLessons
    });
  }
}

function extractDisciplineFromTitle(title: string): string {
  const disciplineKeywords = {
    'cálculo': 'Matemática',
    'álgebra': 'Matemática',
    'geometria': 'Matemática',
    'física': 'Física',
    'química': 'Química',
    'biologia': 'Biologia',
    'programação': 'Computação',
    'engenharia': 'Engenharia',
    'medicina': 'Medicina',
    'direito': 'Direito',
    'economia': 'Economia',
    'administração': 'Administração'
  };

  const titleLower = title.toLowerCase();

  for (const [keyword, discipline] of Object.entries(disciplineKeywords)) {
    if (titleLower.includes(keyword)) {
      return discipline;
    }
  }

  return 'Geral';
}