import { NextRequest, NextResponse } from 'next/server';

// Force Node.js runtime
export const runtime = 'nodejs';

// Storage compartilhado com a API principal
declare global {
  var enhancedProgressStates: Map<string, any>;
}

if (!global.enhancedProgressStates) {
  global.enhancedProgressStates = new Map();
}

const progressStates = global.enhancedProgressStates;

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId');

  if (!sessionId) {
    return new Response('SessionId é obrigatório', { status: 400 });
  }

  console.log(`📡 SSE Enhanced conectado para sessão: ${sessionId}`);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const interval = setInterval(() => {
        const progress = progressStates.get(sessionId);

        if (progress) {
          const data = `data: ${JSON.stringify(progress)}\n\n`;
          controller.enqueue(encoder.encode(data));

          if (progress.isComplete) {
            console.log(`✅ SSE Enhanced sessão ${sessionId} concluída`);
            clearInterval(interval);
            controller.close();
          }
        } else {
          // Enviar heartbeat se não houver progresso
          const heartbeat = `data: ${JSON.stringify({
            sessionId,
            progress: 0,
            currentStep: 1,
            message: 'Aguardando início...',
            isComplete: false,
            timestamp: Date.now()
          })}\n\n`;
          controller.enqueue(encoder.encode(heartbeat));
        }
      }, 100); // Update a cada 100ms

      // Cleanup quando stream for fechado
      request.signal?.addEventListener('abort', () => {
        console.log(`🔌 SSE Enhanced desconectado: ${sessionId}`);
        clearInterval(interval);
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId, progress, currentStep, message, isComplete } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'SessionId obrigatório' }, { status: 400 });
    }

    const progressData = {
      sessionId,
      progress: Math.round(progress),
      currentStep,
      message,
      isComplete: !!isComplete,
      timestamp: Date.now()
    };

    progressStates.set(sessionId, progressData);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ Erro ao atualizar progresso enhanced:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar progresso' },
      { status: 500 }
    );
  }
}