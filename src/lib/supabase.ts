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
  cacheHash?: string;
  isCached?: boolean;
  originalGenerationDate?: string;
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

// Função para sanitizar dados antes de salvar no banco
function sanitizeDataForDB(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    return data
      .replace(/\u0000/g, '') // Remove caracteres null
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove caracteres de controle
      .replace(/\\u0000/g, '') // Remove escape sequences Unicode problemáticos
      .replace(/\\x00/g, '') // Remove caracteres null em hex
      .replace(/\uFEFF/g, '') // Remove BOM (Byte Order Mark)
      .replace(/\r\n/g, '\n') // Normaliza quebras de linha
      .replace(/\r/g, '\n') // Normaliza quebras de linha
      .trim();
  }

  if (Array.isArray(data)) {
    return data
      .map(item => sanitizeDataForDB(item))
      .filter(item => item !== null && item !== undefined && item !== ''); // Remove itens vazios
  }

  if (data && typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      const sanitizedValue = sanitizeDataForDB(value);
      if (sanitizedValue !== null && sanitizedValue !== undefined && sanitizedValue !== '') {
        sanitized[key] = sanitizedValue;
      }
    }
    return sanitized;
  }

  return data;
}

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

    // Gerar hash para cache se disponível
    const cacheHash = learningPlan.goal.cacheHash || generateCourseHash(
      learningPlan.goal.title,
      learningPlan.goal.level,
      learningPlan.goal.description
    );

    // Criar o curso principal - evitar usar palavras-chave que podem ser ambíguas
    const courseData = {
      title: sanitizeDataForDB(learningPlan.goal.title),
      description: sanitizeDataForDB(learningPlan.goal.description),
      level: learningPlan.goal.level,
      subject: sanitizeDataForDB(learningPlan.goal.title),
      progress: learningPlan.progress || 0,
      total_topics: totalTopics,
      cache_hash: cacheHash,
      is_cached: learningPlan.goal.isCached || false,
      original_generation_date: learningPlan.goal.originalGenerationDate || new Date().toISOString(),
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

    if (learningPlan.goal.modules && learningPlan.goal.modules.length > 0) {
      console.log(`📦 Salvando ${learningPlan.goal.modules.length} módulos...`);

      for (const [index, module] of learningPlan.goal.modules.entries()) {
        try {
          // Normalizar o nível do módulo para garantir compatibilidade com constraint
          const originalLevel = module.level || learningPlan.goal.level || 'beginner';
          const normalizedLevel = normalizeModuleLevel(originalLevel);

          if (originalLevel !== normalizedLevel) {
            console.log(`📝 Nível normalizado para "${module.title}": "${originalLevel}" → "${normalizedLevel}"`);
          }

          const moduleData = {
            course_id: course.id,
            title: sanitizeDataForDB(module.title),
            description: sanitizeDataForDB(module.description),
            module_order: index,
            estimated_hours: module.estimatedHours || 8,
            level: normalizedLevel,
          };

          const { data: savedModule, error: moduleError } = await supabase
            .from('course_modules')
            .insert(moduleData)
            .select('*')
            .single();

          if (moduleError) {
            console.error(`❌ Erro ao salvar módulo "${module.title}":`, moduleError);
            // Continuar mesmo com erro - usar apenas tópicos com module_title
          } else {
            moduleIdMap[module.title] = savedModule.id;
            console.log(`✅ Módulo "${module.title}" salvo com ID: ${savedModule.id}`);
          }
        } catch (error) {
          console.error(`❌ Erro inesperado ao salvar módulo "${module.title}":`, error);
          // Continuar sem interromper o processo
        }
      }

      console.log(`📦 ${Object.keys(moduleIdMap).length}/${learningPlan.goal.modules.length} módulos salvos com sucesso`);
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

      // Sanitizar dados antes de inserir
      const sanitizedTopicsData = topicsData.map((topicData, index) => {
        try {
          const sanitized = sanitizeDataForDB(topicData);
          return sanitized;
        } catch (error) {
          console.error(`❌ Erro ao sanitizar tópico ${index}:`, error);
          console.error(`📊 Dados problemáticos:`, JSON.stringify(topicData).substring(0, 200));
          // Retornar versão básica sem campos problemáticos
          return {
            course_id: topicData.course_id,
            title: String(topicData.title || '').replace(/[\u0000-\u001F\u007F-\u009F]/g, ''),
            description: String(topicData.description || '').replace(/[\u0000-\u001F\u007F-\u009F]/g, ''),
            order_index: topicData.order_index || 0,
            completed: false
          };
        }
      });

      console.log(`🧹 ${sanitizedTopicsData.length} tópicos sanitizados com sucesso`);

      const { error: topicsError } = await supabase
        .from('course_topics')
        .insert(sanitizedTopicsData);

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
        content: sanitizeDataForDB(message.content),
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
        name: sanitizeDataForDB(file.name),
        type: file.type,
        size: file.size,
        content: sanitizeDataForDB(file.content),
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

    const totalTopicsCount = topics?.length || 0;
    const completedTopicsCount = topics?.filter(t => t.completed).length || 0;
    const progressPercentage = totalTopicsCount > 0 ? Math.round((completedTopicsCount / totalTopicsCount) * 100) : 0;

    const { error: progressError } = await supabase
      .from('courses')
      .update({
        progress: progressPercentage,
        total_topics: totalTopicsCount,
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

// ===== SISTEMA DE CACHE DE CURSOS =====

// Função para normalizar níveis de módulos (converte níveis compostos)
function normalizeModuleLevel(level: string): string {
  if (!level) return 'beginner';

  const levelStr = level.toLowerCase().trim();

  // Se contém 'advanced', usar advanced
  if (levelStr.includes('advanced')) return 'advanced';

  // Se contém 'intermediate', usar intermediate
  if (levelStr.includes('intermediate')) return 'intermediate';

  // Se contém 'beginner', usar beginner
  if (levelStr.includes('beginner')) return 'beginner';

  // Se é um nível válido diretamente
  if (['beginner', 'intermediate', 'advanced'].includes(levelStr)) {
    return levelStr;
  }

  // Fallback para beginner
  console.warn(`⚠️ Nível desconhecido "${level}", usando 'beginner' como fallback`);
  return 'beginner';
}

// Função para normalizar títulos de cursos
function normalizeCourseTitle(title: string): string {
  return title.toLowerCase().trim()
    // Normalizar acentos primeiro
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^\w\s]/g, '') // Remove pontuação
    .replace(/\s+/g, ' ') // Normaliza espaços
    .replace(/\bcalculo\s*(i|1)\b/g, 'calculo 1') // Cálculo I → cálculo 1
    .replace(/\bcalculo\s*(ii|2)\b/g, 'calculo 2') // Cálculo II → cálculo 2
    .replace(/\bcalculo\s*(iii|3)\b/g, 'calculo 3') // Cálculo III → cálculo 3
    .replace(/\bfisica\s*(i|1)\b/g, 'fisica 1') // Física I → física 1
    .replace(/\bfisica\s*(ii|2)\b/g, 'fisica 2') // Física II → física 2
    .replace(/\balgebra\s*linear\b/g, 'algebra linear') // Normalize álgebra linear
    .replace(/\bgeometria\s*analitica\b/g, 'geometria analitica') // Normalize geometria analítica
    .replace(/\bcurso\s*completo\s*de\s*/g, '') // Remove "Curso Completo de"
    .replace(/\bcurso\s*de\s*/g, '') // Remove "Curso de"
    .replace(/\bcurso\s*/g, '') // Remove "Curso"
    .replace(/\bintroducao\s*a\s*/g, '') // Remove "Introdução a"
    .replace(/\bintroducao\s*/g, '') // Remove "Introdução"
    .trim();
}

// Função para gerar hash do conteúdo do curso para identificação rápida
function generateCourseHash(subject: string, level: string, context?: string): string {
  const normalizedSubject = normalizeCourseTitle(subject);
  const normalizedLevel = level.toLowerCase().trim();
  const normalizedContext = context ? context.toLowerCase().trim() : '';

  const content = `${normalizedSubject}-${normalizedLevel}-${normalizedContext}`;
  return Buffer.from(content).toString('base64').replace(/[/+=]/g, '').substring(0, 16);
}

// Função para calcular similaridade entre strings
function calculateSimilarity(str1: string, str2: string): number {
  const normalize = (s: string) => s.toLowerCase().trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');

  const s1 = normalize(str1);
  const s2 = normalize(str2);

  if (s1 === s2) return 1.0;

  // Similaridade por palavras em comum
  const words1 = s1.split(' ');
  const words2 = s2.split(' ');

  const commonWords = words1.filter(word => words2.includes(word));
  const totalWords = Math.max(words1.length, words2.length);

  return commonWords.length / totalWords;
}

// Buscar cursos similares no cache
export async function findSimilarCourse(
  subject: string,
  level: string,
  context?: string,
  similarityThreshold: number = 0.8
): Promise<Course | null> {
  try {
    console.log('🔍 Buscando curso similar no cache...');
    console.log('📊 Parâmetros de busca:', { subject, level, context, similarityThreshold });

    // Buscar cursos com subject similar primeiro (busca básica)
    const { data: courses, error } = await supabase
      .from('courses')
      .select(`
        *,
        modules:course_modules(
          id,
          title,
          description,
          module_order,
          level,
          estimated_hours,
          estimated_duration,
          learning_objectives,
          created_at,
          updated_at
        ),
        topics:course_topics(
          id,
          title,
          description,
          detailed_description,
          module_title,
          module_description,
          module_order,
          order_index,
          completed,
          learning_objectives,
          key_terms,
          search_keywords,
          difficulty,
          estimated_duration,
          academic_content,
          videos,
          aula_texto,
          has_doubt_button,
          content_type,
          created_at,
          updated_at
        )
      `)
      .eq('level', level)
      .order('created_at', { ascending: false })
      .limit(50); // Limitar para performance

    if (error) {
      console.warn('⚠️ Erro na busca de cursos similares:', error);
      return null;
    }

    if (!courses || courses.length === 0) {
      console.log('📝 Nenhum curso encontrado no cache');
      return null;
    }

    console.log(`📊 Encontrados ${courses.length} cursos para análise de similaridade`);

    // Calcular similaridade para cada curso
    const coursesWithSimilarity = courses.map(course => {
      const subjectSimilarity = calculateSimilarity(subject, course.subject || course.title);

      // Se há contexto, considerar na similaridade
      let contextSimilarity = 1.0;
      if (context && course.description) {
        contextSimilarity = calculateSimilarity(context, course.description);
      }

      // Média ponderada: subject tem mais peso
      const finalSimilarity = (subjectSimilarity * 0.8) + (contextSimilarity * 0.2);

      return {
        ...course,
        similarity: finalSimilarity
      };
    });

    // Ordenar por similaridade (maior primeiro)
    coursesWithSimilarity.sort((a, b) => b.similarity - a.similarity);

    const bestMatch = coursesWithSimilarity[0];

    console.log('🎯 Melhor match encontrado:');
    console.log(`   📚 Curso: ${bestMatch.title}`);
    console.log(`   📊 Similaridade: ${(bestMatch.similarity * 100).toFixed(1)}%`);
    console.log(`   🎓 Level: ${bestMatch.level}`);
    console.log(`   📅 Criado: ${new Date(bestMatch.created_at).toLocaleDateString()}`);

    // Verificar se atende ao threshold
    if (bestMatch.similarity >= similarityThreshold) {
      console.log('✅ Curso similar encontrado! Usando do cache.');

      // Ordenar tópicos por order_index
      if (bestMatch.topics) {
        bestMatch.topics.sort((a: any, b: any) => a.order_index - b.order_index);
      }

      return bestMatch;
    } else {
      console.log(`❌ Similaridade insuficiente (${(bestMatch.similarity * 100).toFixed(1)}% < ${(similarityThreshold * 100)}%)`);
      console.log('🔄 Será necessário gerar novo curso');
      return null;
    }

  } catch (error) {
    console.error('❌ Erro ao buscar curso similar:', error);
    return null;
  }
}

// Salvar curso no cache com hash para busca rápida
export async function saveCourseToCache(learningPlan: LearningPlan): Promise<Course> {
  try {
    console.log('💾 Salvando curso no cache...');

    // Gerar hash para busca rápida futura
    const courseHash = generateCourseHash(
      learningPlan.goal.title,
      learningPlan.goal.level,
      learningPlan.goal.description
    );

    // Salvar com metadados adicionais para cache
    const courseWithCacheData = {
      ...learningPlan,
      goal: {
        ...learningPlan.goal,
        cacheHash: courseHash,
        isCached: true,
        originalGenerationDate: new Date().toISOString()
      }
    };

    const savedCourse = await saveCourse(courseWithCacheData);

    console.log('✅ Curso salvo no cache com hash:', courseHash);
    return savedCourse;

  } catch (error) {
    console.error('❌ Erro ao salvar curso no cache:', error);
    throw error;
  }
}

// Verificar se existe curso exato no cache (por hash)
export async function findExactCourseInCache(
  subject: string,
  level: string,
  context?: string
): Promise<Course | null> {
  try {
    const hash = generateCourseHash(subject, level, context);
    const normalizedSubject = normalizeCourseTitle(subject);

    console.log('🔍 Buscando curso no cache:', {
      originalSubject: subject,
      normalizedSubject,
      level,
      hash
    });

    // ETAPA 1: Busca por hash exato (mais rápida)
    console.log('🎯 Buscando por hash exato:', hash);
    const { data: hashCourses, error: hashError } = await supabase
      .from('courses')
      .select(`
        *,
        modules:course_modules(
          id,
          title,
          description,
          module_order,
          level,
          estimated_hours,
          estimated_duration,
          learning_objectives,
          created_at,
          updated_at
        ),
        topics:course_topics(
          id,
          title,
          description,
          detailed_description,
          module_title,
          module_description,
          module_order,
          order_index,
          completed,
          learning_objectives,
          key_terms,
          search_keywords,
          difficulty,
          estimated_duration,
          academic_content,
          videos,
          aula_texto,
          has_doubt_button,
          content_type,
          created_at,
          updated_at
        )
      `)
      .eq('cache_hash', hash)
      .limit(1);

    if (!hashError && hashCourses && hashCourses.length > 0) {
      const exactMatch = hashCourses[0];
      console.log('✅ Curso encontrado por hash exato:', exactMatch.title);

      // Ordenar tópicos
      if (exactMatch.topics) {
        exactMatch.topics.sort((a: any, b: any) => a.order_index - b.order_index);
      }

      return exactMatch;
    }

    // ETAPA 2: Busca por título normalizado e level
    console.log('🔍 Buscando por título normalizado e level...');
    const { data: courses, error } = await supabase
      .from('courses')
      .select(`
        *,
        modules:course_modules(
          id,
          title,
          description,
          module_order,
          level,
          estimated_hours,
          estimated_duration,
          learning_objectives,
          created_at,
          updated_at
        ),
        topics:course_topics(
          id,
          title,
          description,
          detailed_description,
          module_title,
          module_description,
          module_order,
          order_index,
          completed,
          learning_objectives,
          key_terms,
          search_keywords,
          difficulty,
          estimated_duration,
          academic_content,
          videos,
          aula_texto,
          has_doubt_button,
          content_type,
          created_at,
          updated_at
        )
      `)
      .eq('level', level)
      .limit(100);

    if (error || !courses || courses.length === 0) {
      console.log('❌ Nenhum curso encontrado no nível:', level);
      return null;
    }

    console.log(`📊 Encontrados ${courses.length} cursos no nível ${level}, verificando similaridade...`);

    // ETAPA 3: Buscar por similaridade de título
    let bestMatch: any = null;
    let bestScore = 0;

    for (const course of courses) {
      const courseNormalizedTitle = normalizeCourseTitle(course.title);
      const similarity = calculateSimilarity(normalizedSubject, courseNormalizedTitle);

      console.log(`📝 "${course.title}" → "${courseNormalizedTitle}" → similaridade: ${(similarity * 100).toFixed(1)}%`);

      // Considerar match se similaridade > 80%
      if (similarity > 0.8 && similarity > bestScore) {
        bestMatch = course;
        bestScore = similarity;
      }
    }

    if (bestMatch) {
      console.log(`🎯 Melhor match encontrado: "${bestMatch.title}" (${bestScore}% similaridade)`);

      // Ordenar tópicos
      if (bestMatch.topics) {
        bestMatch.topics.sort((a: any, b: any) => a.order_index - b.order_index);
      }

      return bestMatch;
    }

    // ETAPA 4: Fallback - buscar sem filtro de level (apenas por similaridade)
    console.log('🔄 Tentando busca sem filtro de level...');

    const { data: allCourses, error: allCoursesError } = await supabase
      .from('courses')
      .select(`
        *,
        topics:course_topics(
          id,
          title,
          description,
          module_title,
          order_index,
          completed,
          academic_content,
          videos,
          created_at,
          updated_at
        )
      `)
      .limit(100)
      .order('created_at', { ascending: false });

    if (!allCoursesError && allCourses && allCourses.length > 0) {
      console.log(`📊 Buscando em ${allCourses.length} cursos sem filtro de level...`);

      let fallbackMatch: any = null;
      let fallbackScore = 0;

      for (const course of allCourses) {
        const courseNormalizedTitle = normalizeCourseTitle(course.title);
        const similarity = calculateSimilarity(normalizedSubject, courseNormalizedTitle);

        if (similarity > 0.9 && similarity > fallbackScore) { // Critério mais rigoroso sem level
          fallbackMatch = course;
          fallbackScore = similarity;
        }
      }

      if (fallbackMatch) {
        console.log(`🎯 Curso encontrado via fallback: "${fallbackMatch.title}" (${(fallbackScore * 100).toFixed(1)}% similaridade)`);
        console.log(`⚠️ Curso tem level "${fallbackMatch.level}" diferente de "${level}"`);

        // Ordenar tópicos
        if (fallbackMatch.topics) {
          fallbackMatch.topics.sort((a: any, b: any) => a.order_index - b.order_index);
        }

        return fallbackMatch;
      }
    }

    console.log('❌ Nenhum curso similar encontrado no cache (incluindo fallbacks)');
    return null;

  } catch (error) {
    console.error('❌ Erro na busca exata no cache:', error);
    return null;
  }
}