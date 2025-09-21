import { NextRequest, NextResponse } from 'next/server';

// Estado global do progresso (em uma aplicação real, usaria Redis ou banco)
const progressState = new Map<string, {
  progress: number;
  currentStep: number;
  message: string;
  isComplete: boolean;
}>();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }

  // Configurar Server-Sent Events
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const interval = setInterval(() => {
        const progress = progressState.get(sessionId);

        if (progress) {
          const data = `data: ${JSON.stringify(progress)}\n\n`;
          controller.enqueue(encoder.encode(data));

          if (progress.isComplete) {
            clearInterval(interval);
            controller.close();
          }
        }
      }, 100); // Atualiza a cada 100ms

      // Cleanup quando a conexão for fechada
      request.signal.addEventListener('abort', () => {
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
    },
  });
}

export async function POST(request: NextRequest) {
  const { sessionId, progress, currentStep, message, isComplete } = await request.json();

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }

  // Atualizar o estado do progresso
  progressState.set(sessionId, {
    progress: Math.min(100, Math.max(0, progress)),
    currentStep: Math.min(4, Math.max(1, currentStep)),
    message: message || '',
    isComplete: isComplete || false
  });

  return NextResponse.json({ success: true });
}

// Função helper para atualizar progresso do backend
export async function updateProgress(sessionId: string, progress: number, currentStep: number, message: string = '', isComplete: boolean = false) {
  progressState.set(sessionId, {
    progress: Math.min(100, Math.max(0, progress)),
    currentStep: Math.min(4, Math.max(1, currentStep)),
    message,
    isComplete
  });
}