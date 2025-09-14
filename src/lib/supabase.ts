import { createClient } from '@supabase/supabase-js';
import { LearningGoal, LearningPlan, ChatMessage, Topic, UploadedFile } from '@/types';

export interface Course {
  id: string;
  title: string;
  description?: string;
  level: string;
  subject: string;
  user_profile?: any;
  progress: number;
  total_topics: number;
  created_at: string;
  updated_at: string;
  topics?: CourseTopic[];
  messages?: CourseMessage[];
  files?: CourseFile[];
}

export interface CourseTopic {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  order_index: number;
  completed: boolean;
  academic_content?: any;
  videos: any[];
  created_at: string;
  updated_at: string;
}

export interface CourseMessage {
  id: string;
  course_id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface CourseFile {
  id: string;
  course_id: string;
  name: string;
  type?: string;
  size?: number;
  content?: string;
  uploaded_at: string;
}

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

// ===== NOVAS FUNÇÕES PARA SISTEMA DE CURSOS =====

export async function saveCourse(learningPlan: LearningPlan): Promise<Course> {
  try {
    // Criar o curso principal
    const courseData = {
      title: learningPlan.goal.title,
      description: learningPlan.goal.description,
      level: learningPlan.goal.level,
      subject: learningPlan.goal.title,
      progress: learningPlan.progress,
      total_topics: learningPlan.goal.topics.length,
    };

    const { data: course, error: courseError } = await supabase
      .from('courses')
      .insert([courseData])
      .select()
      .single();

    if (courseError) throw courseError;

    // Salvar tópicos
    const topicsData = learningPlan.goal.topics.map((topic: Topic, index: number) => ({
      course_id: course.id,
      title: topic.title,
      description: topic.description,
      order_index: topic.order || index,
      completed: topic.completed,
      academic_content: topic.academicContent,
      videos: topic.videos || []
    }));

    const { error: topicsError } = await supabase
      .from('course_topics')
      .insert(topicsData);

    if (topicsError) throw topicsError;

    // Salvar mensagens
    const messagesData = learningPlan.messages.map((message: ChatMessage) => ({
      course_id: course.id,
      role: message.role,
      content: message.content,
      timestamp: message.timestamp
    }));

    const { error: messagesError } = await supabase
      .from('course_messages')
      .insert(messagesData);

    if (messagesError) throw messagesError;

    // Salvar arquivos se existirem
    if (learningPlan.uploadedFiles && learningPlan.uploadedFiles.length > 0) {
      const filesData = learningPlan.uploadedFiles.map((file: UploadedFile) => ({
        course_id: course.id,
        name: file.name,
        type: file.type,
        size: file.size,
        content: file.content,
        uploaded_at: file.uploadedAt
      }));

      const { error: filesError } = await supabase
        .from('course_files')
        .insert(filesData);

      if (filesError) throw filesError;
    }

    return course;
  } catch (error) {
    console.error('Erro ao salvar curso:', error);
    throw new Error('Falha ao salvar curso no banco de dados');
  }
}

export async function getCourses(): Promise<Course[]> {
  try {
    const { data, error } = await supabase
      .from('courses')
      .select(`
        *,
        topics:course_topics(
          id,
          title,
          description,
          order_index,
          completed,
          academic_content,
          videos,
          created_at,
          updated_at
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Erro ao buscar cursos:', error);
    return [];
  }
}

export async function getCourse(id: string): Promise<Course | null> {
  try {
    const { data, error } = await supabase
      .from('courses')
      .select(`
        *,
        topics:course_topics(
          id,
          title,
          description,
          order_index,
          completed,
          academic_content,
          videos,
          created_at,
          updated_at
        ),
        messages:course_messages(
          id,
          role,
          content,
          timestamp
        ),
        files:course_files(
          id,
          name,
          type,
          size,
          content,
          uploaded_at
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    // Ordenar tópicos por order_index
    if (data.topics) {
      data.topics.sort((a: any, b: any) => a.order_index - b.order_index);
    }

    // Ordenar mensagens por timestamp
    if (data.messages) {
      data.messages.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }

    return data;
  } catch (error) {
    console.error('Erro ao buscar curso:', error);
    return null;
  }
}

export async function updateCourseProgress(courseId: string, topicId: string, completed: boolean): Promise<void> {
  try {
    // Atualizar o tópico
    const { error: topicError } = await supabase
      .from('course_topics')
      .update({ completed })
      .eq('id', topicId);

    if (topicError) throw topicError;

    // Recalcular progresso do curso
    const { data: topics, error: topicsError } = await supabase
      .from('course_topics')
      .select('completed')
      .eq('course_id', courseId);

    if (topicsError) throw topicsError;

    const completedCount = topics.filter(t => t.completed).length;
    const totalTopics = topics.length;
    const progress = totalTopics > 0 ? Math.round((completedCount / totalTopics) * 100) : 0;

    const { error: courseError } = await supabase
      .from('courses')
      .update({ progress })
      .eq('id', courseId);

    if (courseError) throw courseError;
  } catch (error) {
    console.error('Erro ao atualizar progresso do curso:', error);
    throw new Error('Falha ao atualizar progresso do curso');
  }
}

export async function deleteCourse(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Erro ao deletar curso:', error);
    throw new Error('Falha ao deletar curso');
  }
}