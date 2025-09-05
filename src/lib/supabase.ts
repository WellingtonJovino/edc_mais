import { createClient } from '@supabase/supabase-js';
import { LearningGoal, LearningPlan, ChatMessage } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function saveLearningPlan(plan: Omit<LearningPlan, 'id' | 'created_at'>): Promise<LearningPlan> {
  const { data, error } = await supabase
    .from('learning_plans')
    .insert([{
      goal: plan.goal,
      messages: plan.messages,
      progress: plan.progress,
    }])
    .select()
    .single();

  if (error) {
    console.error('Erro ao salvar plano de aprendizado:', error);
    throw new Error('Falha ao salvar plano de aprendizado');
  }

  return data;
}

export async function updateLearningPlan(id: string, updates: Partial<LearningPlan>): Promise<LearningPlan> {
  const { data, error } = await supabase
    .from('learning_plans')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar plano de aprendizado:', error);
    throw new Error('Falha ao atualizar plano de aprendizado');
  }

  return data;
}

export async function getLearningPlans(): Promise<LearningPlan[]> {
  const { data, error } = await supabase
    .from('learning_plans')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar planos de aprendizado:', error);
    return [];
  }

  return data || [];
}

export async function getLearningPlan(id: string): Promise<LearningPlan | null> {
  const { data, error } = await supabase
    .from('learning_plans')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Erro ao buscar plano de aprendizado:', error);
    return null;
  }

  return data;
}

export async function addMessageToPlan(planId: string, message: ChatMessage): Promise<void> {
  const plan = await getLearningPlan(planId);
  if (!plan) throw new Error('Plano não encontrado');

  const updatedMessages = [...plan.messages, message];

  await updateLearningPlan(planId, {
    messages: updatedMessages,
  });
}

export async function updateTopicProgress(planId: string, topicId: string, completed: boolean): Promise<void> {
  const plan = await getLearningPlan(planId);
  if (!plan) throw new Error('Plano não encontrado');

  const updatedGoal = {
    ...plan.goal,
    topics: plan.goal.topics.map(topic =>
      topic.id === topicId ? { ...topic, completed } : topic
    ),
  };

  const completedTopics = updatedGoal.topics.filter(t => t.completed).length;
  const totalTopics = updatedGoal.topics.length;
  const progress = totalTopics > 0 ? (completedTopics / totalTopics) * 100 : 0;

  await updateLearningPlan(planId, {
    goal: updatedGoal,
    progress,
  });
}