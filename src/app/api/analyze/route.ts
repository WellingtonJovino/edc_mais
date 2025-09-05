import { NextRequest, NextResponse } from 'next/server';
import { analyzeLearningGoal } from '@/lib/openai';
import { searchVideosByTopics } from '@/lib/youtube';
import { saveLearningPlan } from '@/lib/supabase';
import { LearningGoal, Topic, ChatMessage } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Mensagem é obrigatória' },
        { status: 400 }
      );
    }

    const analysis = await analyzeLearningGoal(message);
    
    const videosResults = await searchVideosByTopics(analysis.topics);

    const topics: Topic[] = analysis.topics.map((topic, index) => ({
      id: `topic-${Date.now()}-${index}`,
      title: topic.title,
      description: topic.description,
      order: topic.order,
      videos: videosResults[topic.title] || [],
      completed: false,
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
    });

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