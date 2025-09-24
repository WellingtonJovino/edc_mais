import { NextRequest, NextResponse } from 'next/server';
import { generateLessonText } from '@/lib/lesson-text-generator';

// Interface para armazenar progresso da criação completa
interface CourseCreationProgress {
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

// Map para armazenar progresso das criações em andamento
const progressMap = new Map<string, CourseCreationProgress>();

export async function POST(request: NextRequest) {
  try {
    const { sessionId, syllabus, uploadedFiles, generateLessons = true } = await request.json();

    if (!syllabus) {
      return NextResponse.json(
        { success: false, error: 'Syllabus é obrigatório' },
        { status: 400 }
      );
    }

    // Se não for para gerar aulas, usar API original
    if (!generateLessons) {
      return createCourseOnly(syllabus, uploadedFiles);
    }

    // Validar sessionId para progresso
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'SessionId é obrigatório para geração com aulas' },
        { status: 400 }
      );
    }

    console.log('🏗️ Iniciando criação completa do curso:', {
      title: syllabus.title,
      modulesCount: syllabus.modules?.length || 0,
      sessionId,
      generateLessons
    });

    // Inicializar progresso
    const totalSubtopics = countSubtopics(syllabus);
    const firstTopicSubtopics = countFirstTopicSubtopics(syllabus);
    progressMap.set(sessionId, {
      phase: 'Criando estrutura do curso...',
      step: 'setup',
      progress: 0,
      completedLessons: 0,
      totalLessons: firstTopicSubtopics, // Apenas primeiro tópico
      status: 'processing'
    });

    // Iniciar criação assíncrona
    createCourseWithLessons(sessionId, syllabus, uploadedFiles)
      .then(result => {
        progressMap.set(sessionId, {
          phase: 'Primeiro tópico concluído!',
          step: 'completed',
          progress: 100,
          completedLessons: firstTopicSubtopics,
          totalLessons: firstTopicSubtopics,
          status: 'completed',
          result
        });
        console.log(`✅ Curso completo criado: ${syllabus.title} (${sessionId})`);
      })
      .catch(error => {
        console.error(`❌ Erro na criação completa: ${error.message} (${sessionId})`);
        progressMap.set(sessionId, {
          phase: 'Erro na criação',
          step: 'error',
          progress: 0,
          completedLessons: 0,
          totalLessons: totalSubtopics,
          status: 'error',
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      });

    return NextResponse.json({
      success: true,
      sessionId,
      message: 'Criação do curso iniciada - gerando primeiro tópico',
      totalLessons: firstTopicSubtopics,
      totalCourseSubtopics: totalSubtopics
    });

  } catch (error) {
    console.error('❌ Erro ao iniciar criação do curso:', error);
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
      let isClosed = false;
      let interval: NodeJS.Timeout | null = null;
      let timeout: NodeJS.Timeout | null = null;

      const cleanup = () => {
        if (interval) clearInterval(interval);
        if (timeout) clearTimeout(timeout);
        progressMap.delete(sessionId);
        isClosed = true;
      };

      const safeClose = () => {
        if (!isClosed) {
          try {
            controller.close();
            cleanup();
          } catch (error) {
            console.warn(`⚠️ Controller já fechado para sessão ${sessionId}`);
          }
        }
      };

      const safeEnqueue = (data: Uint8Array) => {
        if (!isClosed) {
          try {
            controller.enqueue(data);
          } catch (error) {
            console.warn(`⚠️ Erro ao enviar dados SSE para sessão ${sessionId}:`, error);
            cleanup();
          }
        }
      };

      // Enviar evento inicial
      const data = `data: ${JSON.stringify({
        type: 'connected',
        sessionId,
        timestamp: Date.now()
      })}\n\n`;
      safeEnqueue(encoder.encode(data));

      // Verificar progresso a cada 1 segundo
      interval = setInterval(() => {
        if (isClosed) return;

        const progress = progressMap.get(sessionId);

        if (!progress) {
          safeClose();
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
        })}\n\n`;

        safeEnqueue(encoder.encode(progressData));

        // Se completou ou deu erro, enviar resultado final
        if (progress.status === 'completed') {
          const resultData = `data: ${JSON.stringify({
            type: 'completed',
            sessionId,
            result: progress.result,
            timestamp: Date.now()
          })}\n\n`;

          safeEnqueue(encoder.encode(resultData));
          safeClose();
        } else if (progress.status === 'error') {
          const errorData = `data: ${JSON.stringify({
            type: 'error',
            sessionId,
            error: progress.error,
            timestamp: Date.now()
          })}\n\n`;

          safeEnqueue(encoder.encode(errorData));
          safeClose();
        }
      }, 1000);

      // Timeout de 10 minutos
      timeout = setTimeout(() => {
        console.log(`⏰ Timeout de 10 minutos atingido para sessão ${sessionId}`);
        safeClose();
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

// Função para criar curso sem aulas (compatibilidade)
async function createCourseOnly(syllabus: any, uploadedFiles: any) {
  const processingTime = 2000 + Math.random() * 3000;
  await new Promise(resolve => setTimeout(resolve, processingTime));

  const courseId = `course_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const totalTopics = countSubtopics(syllabus);

  return NextResponse.json({
    success: true,
    courseId: courseId,
    course: {
      id: courseId,
      title: syllabus.title,
      description: syllabus.description || `Curso de ${syllabus.title}`,
      total_topics: totalTopics,
      progress: 0,
      syllabus_data: syllabus
    },
    message: `Curso "${syllabus.title}" criado com ${totalTopics} tópicos`
  });
}

// Função principal para criar curso com aulas
async function createCourseWithLessons(
  sessionId: string,
  syllabus: any,
  uploadedFiles: any
) {
  // FASE 1: Criar estrutura do curso (10%)
  updateProgress(sessionId, 'Criando estrutura do curso...', 'structure', 5);

  const courseId = `course_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  await new Promise(resolve => setTimeout(resolve, 2000));

  updateProgress(sessionId, 'Estrutura criada, iniciando geração de aulas...', 'lessons_start', 10);

  // FASE 2: Gerar aulas-texto APENAS para o PRIMEIRO TÓPICO do PRIMEIRO MÓDULO (10% - 90%)
  const allSubtopics = extractAllSubtopics(syllabus);
  const firstTopicSubtopics = extractFirstTopicSubtopics(syllabus);
  const totalSubtopics = allSubtopics.length; // Para cálculo correto de progresso total
  const subtopicsToGenerate = firstTopicSubtopics; // Apenas primeiro tópico
  let completedLessons = 0;

  const lessonContents = new Map<string, string>();

  console.log(`📊 Total de subtópicos no curso: ${totalSubtopics}`);
  console.log(`🎯 Gerando apenas primeiro tópico: ${subtopicsToGenerate.length} subtópicos`);

  // Debug: verificar estrutura dos subtópicos
  console.log(`🔍 Primeiro subtópico:`, JSON.stringify(subtopicsToGenerate[0], null, 2));

  for (const subtopic of subtopicsToGenerate) {
    // Verificar se subtopic está bem estruturado
    if (!subtopic || typeof subtopic !== 'object' || !subtopic.title) {
      console.error(`❌ Subtópico inválido ou sem título:`, subtopic);
      continue;
    }
    const currentProgress = 10 + ((completedLessons / totalSubtopics) * 80);

    updateProgress(
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

      updateProgress(
        sessionId,
        `Aula concluída: ${subtopic.title}`,
        'lesson_completed',
        10 + ((completedLessons / totalSubtopics) * 80),
        undefined,
        completedLessons
      );

    } catch (error) {
      console.error(`❌ Erro ao gerar aula para ${subtopic.title}:`, error);
      // Continuar com outras aulas mesmo se uma falhar
      lessonContents.set(subtopic.id, `# ${subtopic.title}\n\nConteúdo será gerado posteriormente devido a erro técnico.`);
      completedLessons++;
    }
  }

  // FASE 3: Finalizar e preparar dados (90% - 100%)
  updateProgress(sessionId, 'Finalizando curso...', 'finalizing', 95);

  // Integrar aulas-texto na estrutura do syllabus
  const enrichedSyllabus = enrichSyllabusWithLessons(syllabus, lessonContents);

  await new Promise(resolve => setTimeout(resolve, 1000));

  // FASE 4: Concluído
  const finalCourse = {
    id: courseId,
    title: syllabus.title,
    description: syllabus.description || `Curso de ${syllabus.title}`,
    total_topics: totalSubtopics,
    total_lessons: completedLessons,
    progress: 0,
    syllabus_data: enrichedSyllabus,
    lessons_generated: true,
    created_at: new Date().toISOString()
  };

  return {
    success: true,
    courseId,
    course: finalCourse,
    lessonsGenerated: completedLessons,
    message: `Curso completo "${syllabus.title}" criado com ${completedLessons} aulas-texto`
  };
}

// Funções utilitárias
function updateProgress(
  sessionId: string,
  phase: string,
  step: string,
  progress: number,
  currentSubtopic?: string,
  completedLessons?: number
) {
  const current = progressMap.get(sessionId);
  if (current && current.status === 'processing') {
    progressMap.set(sessionId, {
      ...current,
      phase,
      step,
      progress,
      currentSubtopic,
      completedLessons: completedLessons ?? current.completedLessons
    });
  }
}

function countSubtopics(syllabus: any): number {
  let count = 0;
  if (syllabus.modules && Array.isArray(syllabus.modules)) {
    for (const module of syllabus.modules) {
      if (module.topics && Array.isArray(module.topics)) {
        for (const topic of module.topics) {
          if (topic.subtopics && Array.isArray(topic.subtopics)) {
            count += topic.subtopics.length;
          }
        }
      }
    }
  }
  return count;
}

function countFirstTopicSubtopics(syllabus: any): number {
  if (syllabus.modules && Array.isArray(syllabus.modules) && syllabus.modules.length > 0) {
    const firstModule = syllabus.modules[0];

    if (firstModule.topics && Array.isArray(firstModule.topics) && firstModule.topics.length > 0) {
      const firstTopic = firstModule.topics[0];

      if (firstTopic.subtopics && Array.isArray(firstTopic.subtopics)) {
        return firstTopic.subtopics.length;
      }
    }
  }
  return 0;
}

function extractAllSubtopics(syllabus: any) {
  const subtopics: any[] = [];

  if (syllabus.modules && Array.isArray(syllabus.modules)) {
    syllabus.modules.forEach((module: any, moduleIndex: number) => {
      if (module.topics && Array.isArray(module.topics)) {
        module.topics.forEach((topic: any, topicIndex: number) => {
          if (topic.subtopics && Array.isArray(topic.subtopics)) {
            topic.subtopics.forEach((subtopic: any, subtopicIndex: number) => {
              // Verificar se subtópico é string ou objeto
              if (typeof subtopic === 'string') {
                subtopics.push({
                  title: subtopic,
                  description: `Estudo sobre ${subtopic}`,
                  moduleTitle: module.title || `Módulo ${moduleIndex + 1}`,
                  topicTitle: topic.title || `Tópico ${topicIndex + 1}`,
                  id: `${module.id || `module-${moduleIndex}`}_${topic.id || `topic-${topicIndex}`}_${subtopicIndex}_subtopic`
                });
              } else if (subtopic && typeof subtopic === 'object') {
                const subtopicTitle = subtopic.title || subtopic.name || `Subtópico ${subtopicIndex + 1}`;
                subtopics.push({
                  title: subtopicTitle,
                  description: subtopic.description || `Estudo sobre ${subtopicTitle}`,
                  moduleTitle: module.title || `Módulo ${moduleIndex + 1}`,
                  topicTitle: topic.title || `Tópico ${topicIndex + 1}`,
                  id: subtopic.id || `${module.id || `module-${moduleIndex}`}_${topic.id || `topic-${topicIndex}`}_${subtopicIndex}_subtopic`,
                  ...subtopic  // Spread apenas se for objeto válido
                });
              } else {
                console.warn(`⚠️ Subtópico inválido no módulo ${moduleIndex}, tópico ${topicIndex}, índice ${subtopicIndex}:`, subtopic);
              }
            });
          }
        });
      }
    });
  }

  return subtopics;
}

function enrichSyllabusWithLessons(syllabus: any, lessonContents: Map<string, string>) {
  const enriched = JSON.parse(JSON.stringify(syllabus)); // Deep clone

  console.log(`💾 Enriquecendo syllabus com ${lessonContents.size} aulas-texto geradas`);

  if (enriched.modules && Array.isArray(enriched.modules)) {
    // Processar apenas primeiro módulo e primeiro tópico (onde temos conteúdo gerado)
    for (let moduleIndex = 0; moduleIndex < enriched.modules.length; moduleIndex++) {
      const module = enriched.modules[moduleIndex];

      if (module.topics && Array.isArray(module.topics)) {
        for (let topicIndex = 0; topicIndex < module.topics.length; topicIndex++) {
          const topic = module.topics[topicIndex];

          // Apenas processar primeiro tópico do primeiro módulo
          const shouldProcessTopic = moduleIndex === 0 && topicIndex === 0;

          if (topic.subtopics && Array.isArray(topic.subtopics) && shouldProcessTopic) {
            console.log(`📝 Processando subtópicos do primeiro tópico: ${topic.title}`);

            for (let i = 0; i < topic.subtopics.length; i++) {
              const subtopic = topic.subtopics[i];

              // Validar estrutura do subtópico
              if (!subtopic || typeof subtopic !== 'object') {
                console.warn(`⚠️ Subtópico inválido no módulo ${moduleIndex}, tópico ${topicIndex}, índice ${i}:`, subtopic);
                continue;
              }

              // Normalizar subtópico se necessário
              if (typeof subtopic === 'string') {
                topic.subtopics[i] = {
                  id: `${module.id || `module-${moduleIndex}`}_${topic.id || `topic-${topicIndex}`}_${i}_subtopic`,
                  title: subtopic,
                  description: `Estudo sobre ${subtopic}`,
                  theory: null
                };
                continue;
              }

              // Garantir que title existe
              const subtopicTitle = subtopic.title || `Subtópico ${i + 1}`;
              const id = subtopic.id || `${module.id || `module-${moduleIndex}`}_${topic.id || `topic-${topicIndex}`}_${i}_subtopic`;

              console.log(`🔍 Procurando conteúdo para subtópico: "${subtopicTitle}" (ID: ${id})`);

              const lessonContent = lessonContents.get(id);

              if (lessonContent) {
                subtopic.theory = lessonContent;
                subtopic.hasGeneratedLesson = true;
                console.log(`✅ Aula-texto atribuída ao subtópico: ${subtopicTitle}`);
              } else {
                console.log(`❌ Nenhum conteúdo encontrado para: ${subtopicTitle} (ID: ${id})`);
              }
            }
          } else if (shouldProcessTopic && !topic.subtopics) {
            console.warn(`⚠️ Tópico "${topic.title}" não possui subtópicos`);
          } else if (!shouldProcessTopic) {
            // Não processar outros tópicos (ainda não têm conteúdo gerado)
            console.log(`⏭️ Pulando tópico "${topic.title}" (apenas primeiro tópico tem conteúdo)`);
          }
        }
      }
    }
  }

  return enriched;
}

function extractFirstTopicSubtopics(syllabus: any) {
  const subtopics: any[] = [];

  if (syllabus.modules && Array.isArray(syllabus.modules) && syllabus.modules.length > 0) {
    const firstModule = syllabus.modules[0]; // Primeiro módulo

    if (firstModule.topics && Array.isArray(firstModule.topics) && firstModule.topics.length > 0) {
      const firstTopic = firstModule.topics[0]; // Primeiro tópico do primeiro módulo

      if (firstTopic.subtopics && Array.isArray(firstTopic.subtopics)) {
        firstTopic.subtopics.forEach((subtopic: any, index: number) => {
          // Verificar se subtópico é string ou objeto
          if (typeof subtopic === 'string') {
            subtopics.push({
              title: subtopic,
              description: `Estudo sobre ${subtopic}`,
              moduleTitle: firstModule.title || 'Módulo 1',
              topicTitle: firstTopic.title || 'Tópico 1',
              id: `${firstModule.id || 'module-0'}_${firstTopic.id || 'topic-0'}_${index}_subtopic`
            });
          } else if (subtopic && typeof subtopic === 'object') {
            const subtopicTitle = subtopic.title || subtopic.name || `Subtópico ${index + 1}`;
            subtopics.push({
              title: subtopicTitle,
              description: subtopic.description || `Estudo sobre ${subtopicTitle}`,
              moduleTitle: firstModule.title || 'Módulo 1',
              topicTitle: firstTopic.title || 'Tópico 1',
              id: subtopic.id || `${firstModule.id || 'module-0'}_${firstTopic.id || 'topic-0'}_${index}_subtopic`,
              ...subtopic  // Spread apenas se for objeto válido
            });
          } else {
            console.warn(`⚠️ Subtópico inválido no índice ${index}:`, subtopic);
          }
        });
      }
    }
  }

  return subtopics;
}

function extractDisciplineFromTitle(title: string): string {
  // Extrair disciplina do título do curso
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