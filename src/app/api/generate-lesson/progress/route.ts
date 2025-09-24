import { NextRequest } from 'next/server';
import { generateLessonText, LessonTextInput } from '@/lib/lesson-text-generator';

// Armazenar progresso das gerações em andamento
const progressMap = new Map<string, {
  phase: string;
  progress: number;
  status: 'processing' | 'completed' | 'error';
  result?: any;
  error?: string;
}>();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return new Response('sessionId é obrigatório', { status: 400 });
  }

  // Configurar SSE
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Enviar evento inicial
      const data = `data: ${JSON.stringify({
        type: 'connected',
        sessionId,
        timestamp: Date.now()
      })}\n\n`;

      controller.enqueue(encoder.encode(data));

      // Verificar progresso a cada 500ms
      const interval = setInterval(() => {
        const progress = progressMap.get(sessionId);

        if (!progress) {
          // Sessão não encontrada, encerrar
          controller.close();
          clearInterval(interval);
          return;
        }

        // Enviar update de progresso
        const progressData = `data: ${JSON.stringify({
          type: 'progress',
          sessionId,
          phase: progress.phase,
          progress: progress.progress,
          status: progress.status,
          timestamp: Date.now()
        })}\n\n`;

        controller.enqueue(encoder.encode(progressData));

        // Se completou ou deu erro, enviar resultado final
        if (progress.status === 'completed') {
          const resultData = `data: ${JSON.stringify({
            type: 'completed',
            sessionId,
            result: progress.result,
            timestamp: Date.now()
          })}\n\n`;

          controller.enqueue(encoder.encode(resultData));

          // Limpar e encerrar
          progressMap.delete(sessionId);
          controller.close();
          clearInterval(interval);
        } else if (progress.status === 'error') {
          const errorData = `data: ${JSON.stringify({
            type: 'error',
            sessionId,
            error: progress.error,
            timestamp: Date.now()
          })}\n\n`;

          controller.enqueue(encoder.encode(errorData));

          // Limpar e encerrar
          progressMap.delete(sessionId);
          controller.close();
          clearInterval(interval);
        }
      }, 500);

      // Timeout de 5 minutos
      setTimeout(() => {
        progressMap.delete(sessionId);
        controller.close();
        clearInterval(interval);
      }, 5 * 60 * 1000);
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sessionId,
      subtopicTitle,
      subtopicDescription,
      moduleTitle,
      courseTitle,
      userLevel,
      discipline,
      estimatedDuration,
      context
    } = body;

    if (!sessionId || !subtopicTitle || !discipline) {
      return new Response(
        JSON.stringify({ error: 'sessionId, subtopicTitle e discipline são obrigatórios' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Inicializar progresso
    progressMap.set(sessionId, {
      phase: 'Iniciando...',
      progress: 0,
      status: 'processing'
    });

    // Preparar input
    const input: LessonTextInput = {
      subtopicTitle,
      subtopicDescription: subtopicDescription || `Estudo detalhado sobre ${subtopicTitle}`,
      moduleTitle: moduleTitle || 'Módulo de Estudo',
      courseTitle: courseTitle || `Curso de ${discipline}`,
      userLevel: userLevel || 'intermediate',
      discipline,
      estimatedDuration: estimatedDuration || '45 min',
      context
    };

    console.log(`🎓 Iniciando geração com progresso SSE: ${subtopicTitle} (${sessionId})`);

    // Iniciar geração assíncrona
    generateLessonText(input, (phase: string, progress: number) => {
      // Atualizar progresso
      const currentProgress = progressMap.get(sessionId);
      if (currentProgress && currentProgress.status === 'processing') {
        progressMap.set(sessionId, {
          ...currentProgress,
          phase,
          progress
        });
      }
    })
    .then(result => {
      // Marcar como completado
      progressMap.set(sessionId, {
        phase: 'Concluído!',
        progress: 100,
        status: 'completed',
        result: {
          content: result.content,
          structure: result.structure,
          metadata: result.metadata,
          generationInfo: result.generationInfo
        }
      });

      console.log(`✅ Geração completada via SSE: ${subtopicTitle} (${sessionId})`);
    })
    .catch(error => {
      console.error(`❌ Erro na geração SSE: ${error.message} (${sessionId})`);

      // Marcar como erro
      progressMap.set(sessionId, {
        phase: 'Erro',
        progress: 0,
        status: 'error',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    });

    return new Response(
      JSON.stringify({
        success: true,
        sessionId,
        message: 'Geração iniciada. Acompanhe o progresso via SSE.'
      }),
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Erro ao iniciar geração SSE:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno do servidor'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}