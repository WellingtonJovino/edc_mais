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

// Função utilitária para retry de operações
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.warn(`❌ Tentativa ${attempt}/${maxRetries} falhou:`, error);

      // Não tentar novamente para alguns tipos de erro
      if (error instanceof Error) {
        if (error.message.includes('duplicate key') ||
            error.message.includes('foreign key') ||
            error.message.includes('permission')) {
          throw error; // Erros que não se resolvem com retry
        }
      }

      if (attempt < maxRetries) {
        console.log(`⏳ Aguardando ${delayMs}ms antes da próxima tentativa...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs *= 1.5; // Backoff exponencial
      }
    }
  }

  throw lastError!;
}

export async function createCourseFromSyllabus(courseData: any): Promise<Course | null> {
  try {
    const { data, error } = await supabase
      .from('courses')
      .insert([courseData])
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao criar curso:', error);
      throw error;
    }

    console.log('✅ Curso criado no Supabase:', data.id);
    return data;
  } catch (error) {
    console.error('❌ Erro na função createCourseFromSyllabus:', error);
    return null;
  }
}

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
    topics: plan.goal.topics?.map(topic =>
      topic.id === topicId ? { ...topic, completed } : topic
    ) || [],
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
    console.log('📊 Dados do curso a serem salvos:', {
      title: learningPlan.goal.title,
      level: learningPlan.goal.level,
      hasModules: !!learningPlan.goal.modules,
      modulesCount: learningPlan.goal.modules?.length || 0,
      topicsCount: learningPlan.goal.topics?.length || 0
    });

    // Calcular total de tópicos (incluindo todos os módulos)
    const totalTopics = learningPlan.goal.modules?.reduce((total, module) =>
      total + (module.topics?.length || 0), 0) || learningPlan.goal.topics?.length || 0;

    // Criar o curso principal - evitar usar palavras-chave que podem ser ambíguas
    const courseData = {
      title: learningPlan.goal.title,
      description: learningPlan.goal.description,
      level: learningPlan.goal.level,
      subject: learningPlan.goal.title,
      progress: learningPlan.progress || 0,
      total_topics: totalTopics,
    };

    console.log('💾 Inserindo curso na tabela courses...');
    const course = await retryOperation(async () => {
      const { data, error } = await supabase
        .from('courses')
        .insert(courseData)
        .select('*')
        .single();

      if (error) {
        console.error('❌ Erro ao inserir curso:', error);
        console.error('📊 Dados que falharam:', courseData);
        throw new Error(`Erro no banco: ${error.message} (código: ${error.code})`);
      }

      return data;
    });

    console.log('✅ Curso inserido com ID:', course.id);

    // Primeiro, salvar módulos se existirem
    const moduleIdMap: { [title: string]: string } = {};

    // MÓDULOS DESABILITADOS: Não salvar módulos no banco por enquanto
    // A estrutura hierárquica funcionará apenas através dos tópicos com module_title
    if (learningPlan.goal.modules && learningPlan.goal.modules.length > 0) {
      console.log(`⚠️ Módulos detectados (${learningPlan.goal.modules.length}), mas inserção está desabilitada`);
      console.log('📝 Os módulos serão representados através dos tópicos com module_title');
      console.log('🔧 Para habilitar, corrija primeiro o erro de ambiguidade na coluna total_topics');
    }

    // Agora salvar tópicos (nova estrutura hierárquica ou antiga)
    const topicsData: any[] = [];
    let globalOrder = 0;

    if (learningPlan.goal.modules && learningPlan.goal.modules.length > 0) {
      // Nova estrutura hierárquica
      learningPlan.goal.modules.forEach((module, moduleIndex) => {
        if (module.topics) {
          module.topics.forEach((topic: Topic, topicIndex) => {
            topicsData.push({
              course_id: course.id,
              module_id: moduleIdMap[module.title] || null,
              title: topic.title,
              description: topic.description,
              detailed_description: topic.detailedDescription || topic.description,
              module_title: module.title,
              module_description: module.description,
              module_order: moduleIndex,
              order_index: globalOrder++,
              completed: topic.completed || false,
              academic_content: topic.academicContent,
              videos: topic.videos || [],
              aula_texto: topic.aulaTexto || {},
              learning_objectives: topic.learningObjectives || [],
              key_terms: topic.keyTerms || [],
              search_keywords: topic.searchKeywords || [topic.title],
              difficulty: topic.difficulty || 'medium',
              estimated_duration: topic.estimatedDuration || '45 min',
              has_doubt_button: topic.hasDoubtButton !== false,
              content_type: topic.contentType || 'mixed'
            });
          });
        }
      });
    } else if (learningPlan.goal.topics && learningPlan.goal.topics.length > 0) {
      // Estrutura antiga (compatibilidade)
      topicsData.push(...learningPlan.goal.topics.map((topic: Topic, index: number) => ({
        course_id: course.id,
        module_id: null,
        title: topic.title,
        description: topic.description,
        detailed_description: topic.detailedDescription || topic.description,
        order_index: index,
        completed: topic.completed || false,
        academic_content: topic.academicContent,
        videos: topic.videos || [],
        aula_texto: topic.aulaTexto || {},
        learning_objectives: topic.learningObjectives || [],
        key_terms: topic.keyTerms || [],
        search_keywords: topic.searchKeywords || [topic.title],
        difficulty: topic.difficulty || 'medium',
        estimated_duration: topic.estimatedDuration || '45 min',
        has_doubt_button: topic.hasDoubtButton !== false,
        content_type: topic.contentType || 'mixed'
      })));
    }

    if (topicsData.length > 0) {
      console.log(`📝 Inserindo ${topicsData.length} tópicos...`);
      const { error: topicsError } = await supabase
        .from('course_topics')
        .insert(topicsData);

      if (topicsError) {
        console.error('❌ Erro ao inserir tópicos:', topicsError);
        throw new Error(`Erro ao salvar tópicos: ${topicsError.message}`);
      }
      console.log('✅ Tópicos inseridos com sucesso');
    } else {
      console.warn('⚠️ Nenhum tópico para inserir');
    }

    // Salvar mensagens
    if (learningPlan.messages && learningPlan.messages.length > 0) {
      console.log(`💬 Inserindo ${learningPlan.messages.length} mensagens...`);
      const messagesData = learningPlan.messages.map((message: ChatMessage) => ({
        course_id: course.id,
        role: message.role,
        content: message.content,
        timestamp: message.timestamp
      }));

      const { error: messagesError } = await supabase
        .from('course_messages')
        .insert(messagesData);

      if (messagesError) {
        console.error('❌ Erro ao inserir mensagens:', messagesError);
        throw new Error(`Erro ao salvar mensagens: ${messagesError.message}`);
      }
      console.log('✅ Mensagens inseridas com sucesso');
    }

    // Salvar arquivos se existirem
    if (learningPlan.uploadedFiles && learningPlan.uploadedFiles.length > 0) {
      console.log(`📁 Inserindo ${learningPlan.uploadedFiles.length} arquivos...`);
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

      if (filesError) {
        console.error('❌ Erro ao inserir arquivos:', filesError);
        throw new Error(`Erro ao salvar arquivos: ${filesError.message}`);
      }
      console.log('✅ Arquivos inseridos com sucesso');
    }

    console.log('🎉 Curso salvo completamente com ID:', course.id);
    return course;
  } catch (error) {
    console.error('Erro ao salvar curso:', error);

    // Tratar erros específicos do Supabase
    if (error instanceof Error) {
      if (error.message.includes('duplicate key')) {
        throw new Error('Já existe um curso com este nome. Escolha um nome diferente.');
      }
      if (error.message.includes('foreign key')) {
        throw new Error('Erro de referência no banco de dados. Verifique os dados enviados.');
      }
      if (error.message.includes('connection')) {
        throw new Error('Erro de conectividade com o banco de dados. Tente novamente.');
      }
    }

    throw new Error(`Falha ao salvar curso no banco de dados: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
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
    // Primeiro atualizar o tópico
    const { error: topicError } = await supabase
      .from('course_topics')
      .update({
        completed,
        updated_at: new Date().toISOString()
      })
      .eq('id', topicId)
      .eq('course_id', courseId);

    if (topicError) throw topicError;

    // Depois calcular e atualizar o progresso do curso
    const { data: topics, error: countError } = await supabase
      .from('course_topics')
      .select('completed')
      .eq('course_id', courseId);

    if (countError) throw countError;

    const totalTopics = topics?.length || 0;
    const completedTopics = topics?.filter(t => t.completed).length || 0;
    const progress = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

    const { error: progressError } = await supabase
      .from('courses')
      .update({
        progress: progress,
        total_topics: totalTopics,
        updated_at: new Date().toISOString()
      })
      .eq('id', courseId);

    if (progressError) throw progressError;
  } catch (error) {
    console.error('Erro ao atualizar progresso do curso:', error);
    throw new Error(`Falha ao atualizar progresso do curso: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

export async function deleteCourse(id: string): Promise<void> {
  try {
    console.log('🗑️ Iniciando deleção do curso:', id);

    // Primeiro buscar os tópicos para pegar os IDs
    const { data: topicIds, error: topicIdsError } = await supabase
      .from('course_topics')
      .select('id')
      .eq('course_id', id);

    if (topicIdsError) {
      console.warn('⚠️ Erro ao buscar tópicos para deleção:', topicIdsError);
    } else if (topicIds && topicIds.length > 0) {
      // Deletar pesquisas contextuais relacionadas aos tópicos
      const { error: contextualError } = await supabase
        .from('course_contextual_searches')
        .delete()
        .in('topic_id', topicIds.map(t => t.id));

      if (contextualError) {
        console.warn('⚠️ Erro ao deletar pesquisas contextuais:', contextualError);
      }
    }

    // Deletar tabelas relacionadas (ignorar erros se tabelas não existirem)
    const deletePromises = [
      // Arquivos do curso
      supabase.from('course_files').delete().eq('course_id', id),
      // Mensagens do curso
      supabase.from('course_messages').delete().eq('course_id', id),
      // Pré-requisitos
      supabase.from('course_prerequisites').delete().eq('course_id', id),
      // Cursos de apoio
      supabase.from('course_support_courses').delete().eq('course_id', id),
      // Validações
      supabase.from('course_validations').delete().eq('course_id', id),
      // Módulos (se existirem)
      supabase.from('course_modules').delete().eq('course_id', id),
    ];

    const results = await Promise.allSettled(deletePromises);
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.warn(`⚠️ Erro ao deletar tabela ${index}:`, result.reason);
      }
    });

    // Deletar tópicos
    console.log('📝 Deletando tópicos...');
    const { error: topicsError } = await supabase
      .from('course_topics')
      .delete()
      .eq('course_id', id);

    if (topicsError) {
      console.error('❌ Erro ao deletar tópicos:', topicsError);
      throw new Error(`Erro ao deletar tópicos: ${topicsError.message}`);
    }

    // Finalmente deletar o curso
    console.log('🏁 Deletando curso principal...');
    const { error: courseError } = await supabase
      .from('courses')
      .delete()
      .eq('id', id);

    if (courseError) {
      console.error('❌ Erro ao deletar curso:', courseError);
      throw new Error(`Erro ao deletar curso: ${courseError.message}`);
    }

    console.log('✅ Curso deletado com sucesso:', id);
  } catch (error) {
    console.error('❌ Erro geral ao deletar curso:', error);
    throw new Error(`Falha ao deletar curso: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}