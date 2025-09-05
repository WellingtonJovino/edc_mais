import { NextRequest, NextResponse } from 'next/server';
import { getLearningPlan, updateLearningPlan, addMessageToPlan, updateTopicProgress } from '@/lib/supabase';
import { ChatMessage } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const plan = await getLearningPlan(params.id);
    
    if (!plan) {
      return NextResponse.json(
        { error: 'Plano não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(plan);
  } catch (error) {
    console.error('Erro ao buscar plano:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { action, data } = await request.json();

    switch (action) {
      case 'add_message':
        const message: ChatMessage = {
          id: `msg-${Date.now()}`,
          role: data.role,
          content: data.content,
          timestamp: new Date().toISOString(),
        };
        
        await addMessageToPlan(params.id, message);
        break;

      case 'update_topic_progress':
        await updateTopicProgress(params.id, data.topicId, data.completed);
        break;

      default:
        return NextResponse.json(
          { error: 'Ação não reconhecida' },
          { status: 400 }
        );
    }

    const updatedPlan = await getLearningPlan(params.id);
    return NextResponse.json(updatedPlan);

  } catch (error) {
    console.error('Erro ao atualizar plano:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}