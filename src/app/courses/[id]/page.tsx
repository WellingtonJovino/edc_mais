'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronDown,
  ChevronRight,
  BookOpen,
  Play,
  PenTool,
  ArrowLeft,
  Clock,
  CheckCircle,
  Circle,
  Wand2,
  Loader2,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import LessonContent from '@/components/LessonContent';

// Estrutura de dados temporária - depois virá do banco
interface Course {
  id: string;
  title: string;
  description: string;
  modules: Module[];
}

interface Module {
  id: string;
  title: string;
  description: string;
  order: number;
  topics: Topic[];
  completed?: boolean;
}

interface Topic {
  id: string;
  title: string;
  description: string;
  order: number;
  subtopics: Subtopic[];
  completed?: boolean;
}

interface Subtopic {
  id: string;
  title: string;
  description: string;
  order: number;
  estimatedDuration: string;
  completed?: boolean;
  theory?: string; // Aula-texto
  videos?: string[]; // URLs dos vídeos
  exercises?: any[]; // Exercícios
  moduleIndex?: number;
  topicIndex?: number;
  subtopicIndex?: number;
  lessonId?: string; // ID da aula no banco
  hasLesson?: boolean; // Indica se já tem aula gerada
}

export default function CoursePage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSubtopic, setSelectedSubtopic] = useState<Subtopic | null>(null);
  const [activeTab, setActiveTab] = useState<'theory' | 'videos' | 'exercises'>('theory');
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [generatingLesson, setGeneratingLesson] = useState<string | null>(null);
  const [lessonCache, setLessonCache] = useState<Map<string, any>>(new Map());
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [courseStructureId, setCourseStructureId] = useState<string | null>(null);

  // Carregar dados reais do curso
  useEffect(() => {
    const loadCourse = async () => {
      try {
        // Tentar carregar do localStorage primeiro (dados do curso gerado)
        console.log('🔍 Tentando carregar curso com ID:', courseId);
        console.log('🗝️ Procurando chave no localStorage:', `course_${courseId}`);

        // Debug: listar todas as chaves no localStorage
        const allKeys = Object.keys(localStorage);
        console.log('📋 Todas as chaves no localStorage:', allKeys);

        const storedCourse = localStorage.getItem(`course_${courseId}`);
        console.log('📦 Dados encontrados no localStorage:', !!storedCourse);

        if (storedCourse) {
          const courseData = JSON.parse(storedCourse);
          console.log('📚 Carregando curso do localStorage:', courseData.title);

          // Debug: verificar dados brutos antes da conversão
          console.log('🔍 Dados brutos do curso:', {
            syllabusData: courseData.syllabus_data,
            firstModule: courseData.syllabus_data?.modules?.[0],
            firstTopic: courseData.syllabus_data?.modules?.[0]?.topics?.[0],
            subtopicsRaw: courseData.syllabus_data?.modules?.[0]?.topics?.[0]?.subtopics
          });

          // Converter dados do syllabus para estrutura da página
          const convertedCourse = convertSyllabusToPageStructure(courseData);

          // Extrair ID da estrutura do curso para buscar aulas
          const structureId = courseData.courseStructureId || courseData.structure_id || null;
          setCourseStructureId(structureId);
          console.log('🎯 Course Structure ID encontrado:', structureId);

          // Debug: verificar estrutura dos subtópicos
          console.log('📊 Estrutura do curso convertida:', {
            title: convertedCourse.title,
            modulesCount: convertedCourse.modules.length,
            firstModule: convertedCourse.modules[0]?.title,
            firstTopic: convertedCourse.modules[0]?.topics[0]?.title,
            firstTopicSubtopicsCount: convertedCourse.modules[0]?.topics[0]?.subtopics?.length,
            firstSubtopic: convertedCourse.modules[0]?.topics[0]?.subtopics?.[0],
            hasLessons: !!courseData.lessons
          });

          // Se houver aulas geradas, integrá-las ao curso
          if (courseData.lessons) {
            console.log('🎓 Aulas encontradas no localStorage:', Object.keys(courseData.lessons).length);
            console.log('📋 IDs das aulas:', Object.keys(courseData.lessons));
            console.log('📄 Primeira aula (preview):', Object.values(courseData.lessons)[0]?.substring(0, 100) + '...');
          } else {
            console.log('❌ NENHUMA aula encontrada no courseData.lessons');
            console.log('🔍 Estrutura do courseData:', Object.keys(courseData));
          }

          setCourse(convertedCourse);

          // Carregar aulas do banco de dados automaticamente se houver estrutura
          if (structureId) {
            console.log('🚀 Carregando aulas automaticamente...');
            console.log('📊 Course Structure ID:', structureId);
            await loadLessonsFromDatabaseAutomatically(structureId, convertedCourse);
          } else {
            console.log('⚠️ Nenhum courseStructureId encontrado - sem carregamento automático');
            console.log('🔍 Keys disponíveis no courseData:', Object.keys(courseData));
          }

          // Selecionar primeiro subtópico e expandir primeiro módulo
          if (convertedCourse.modules[0]) {
            setExpandedModules(new Set([convertedCourse.modules[0].id]));
            if (convertedCourse.modules[0].topics[0]) {
              setExpandedTopics(new Set([convertedCourse.modules[0].topics[0].id]));
              if (convertedCourse.modules[0].topics[0].subtopics[0]) {
                setSelectedSubtopic(convertedCourse.modules[0].topics[0].subtopics[0]);
              }
            }
          }
          setLoading(false);
          return;
        }

        // Nenhum curso encontrado no localStorage - tentar carregar do banco
        console.log('❌ Nenhum curso encontrado no localStorage para ID:', courseId);
        console.log('🔍 Tentando fallback: buscar curso no banco de dados...');

        // Fallback: tentar encontrar curso no banco de dados
        try {
          const fallbackCourse = await loadCourseFromDatabase(courseId);
          if (fallbackCourse) {
            console.log('✅ Curso recuperado do banco de dados:', fallbackCourse.title);
            setCourse(fallbackCourse);

            // Selecionar primeiro subtópico e expandir primeiro módulo
            if (fallbackCourse.modules[0]) {
              setExpandedModules(new Set([fallbackCourse.modules[0].id]));
              if (fallbackCourse.modules[0].topics[0]) {
                setExpandedTopics(new Set([fallbackCourse.modules[0].topics[0].id]));
                if (fallbackCourse.modules[0].topics[0].subtopics[0]) {
                  setSelectedSubtopic(fallbackCourse.modules[0].topics[0].subtopics[0]);
                }
              }
            }
            setLoading(false);
            return;
          }
        } catch (dbError) {
          console.error('❌ Erro ao carregar do banco:', dbError);
        }

        console.log('❌ Curso não encontrado nem no localStorage nem no banco de dados');
      } catch (error) {
        console.error('Erro ao carregar curso:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCourse();
  }, [courseId]);

  // Recarregar aulas periodicamente caso estejam sendo geradas em background
  // REMOVIDO: Não fazer polling automático de aulas
  // As aulas do primeiro tópico já foram geradas antes do redirecionamento
  // Outros tópicos serão gerados sob demanda quando o usuário clicar

  // Função para carregar aulas do banco de dados automaticamente
  const loadLessonsFromDatabaseAutomatically = async (structureId: string, courseData: Course) => {
    try {
      console.log('🔍 Carregando aulas do banco de dados...', structureId);
      const url = `/api/save-subtopic-lesson?courseStructureId=${structureId}`;
      console.log('📡 URL da requisição:', url);

      const response = await fetch(url);
      const result = await response.json();

      console.log('📊 Resposta da API:', result);

      if (result.success && result.lessons && result.lessons.length > 0) {
        console.log(`✅ ${result.lessons.length} aulas encontradas no banco`);

        // Criar mapa de aulas por posição
        const lessonsMap = new Map();
        result.lessons.forEach((lesson: any) => {
          const key = `${lesson.module_index}_${lesson.topic_index}_${lesson.subtopic_index}`;
          lessonsMap.set(key, lesson.lesson_content);
        });

        // Atualizar curso com aulas carregadas
        setCourse(prevCourse => {
          if (!prevCourse) return prevCourse;

          const updatedCourse = { ...prevCourse };
          let lessonsLoaded = 0;

          updatedCourse.modules.forEach((module, moduleIndex) => {
            module.topics.forEach((topic, topicIndex) => {
              topic.subtopics.forEach((subtopic, subtopicIndex) => {
                const key = `${moduleIndex}_${topicIndex}_${subtopicIndex}`;
                if (lessonsMap.has(key)) {
                  subtopic.theory = lessonsMap.get(key);
                  subtopic.hasLesson = true;
                  lessonsLoaded++;
                }
              });
            });
          });

          console.log(`✅ ${lessonsLoaded} aulas carregadas do banco de dados`);
          return updatedCourse;
        });

        // Agora que carregamos aulas existentes, não vamos gerar automaticamente
        // As aulas já devem ter sido geradas durante o loading inicial
        console.log('📚 Aulas carregadas - exibindo diretamente');
      } else {
        console.log('📝 Nenhuma aula encontrada no banco - podem estar sendo geradas');
        // Não iniciar geração aqui, pois deve ter sido feita durante o loading
      }
    } catch (error) {
      console.error('❌ Erro ao carregar aulas do banco:', error);
      // Continuar sem aulas do banco - elas podem ainda estar sendo geradas
    }
  };

  // REMOVIDO: Função de reload periódico não é mais necessária
  // As aulas são carregadas uma vez quando a página abre
  // Novas aulas são geradas sob demanda pelo usuário

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }
      return newSet;
    });
  };

  const toggleTopic = (topicId: string) => {
    setExpandedTopics(prev => {
      const newSet = new Set(prev);
      if (newSet.has(topicId)) {
        newSet.delete(topicId);
      } else {
        newSet.add(topicId);
      }
      return newSet;
    });
  };

  const selectSubtopic = async (subtopic: Subtopic) => {
    setSelectedSubtopic(subtopic);
    setActiveTab('theory'); // Sempre abrir na aba teoria

    // REMOVIDO: Não buscar do banco a cada mudança de subtópico
    // As aulas já foram carregadas quando a página abriu
    // Novas aulas serão geradas sob demanda com o botão "Gerar Aula-Texto"
  };

  // Função para carregar curso do banco de dados como fallback
  const loadCourseFromDatabase = async (courseId: string): Promise<Course | null> => {
    try {
      console.log('🔍 Buscando curso no banco de dados com ID:', courseId);

      // Extrair timestamp do courseId para buscar estruturas próximas
      const timestampMatch = courseId.match(/course_(\d+)_/);
      if (!timestampMatch) {
        console.log('❌ Formato de courseId inválido:', courseId);
        return null;
      }

      const timestamp = parseInt(timestampMatch[1]);
      const targetDate = new Date(timestamp);
      const searchRangeMs = 300000; // 5 minutos
      const startTime = new Date(timestamp - searchRangeMs);
      const endTime = new Date(timestamp + searchRangeMs);

      console.log('📅 Buscando estruturas criadas entre:', {
        start: startTime.toISOString(),
        target: targetDate.toISOString(),
        end: endTime.toISOString()
      });

      // Buscar estruturas de curso no banco via API endpoint dedicado
      const response = await fetch(`/api/course-structures?startTime=${startTime.toISOString()}&endTime=${endTime.toISOString()}`);

      if (!response.ok) {
        // Fallback: tentar buscar a mais recente se endpoint não existir
        console.log('⚠️ Endpoint específico não encontrado, tentando fallback...');
        return await loadCourseFromLessonsOnly(courseId);
      }

      const result = await response.json();

      if (!result.success || !result.structures?.length) {
        console.log('📝 Nenhuma estrutura encontrada no período, tentando fallback...');
        return await loadCourseFromLessonsOnly(courseId);
      }

      // Pegar a estrutura mais próxima do timestamp
      const closestStructure = result.structures
        .map((struct: any) => ({
          ...struct,
          timeDiff: Math.abs(new Date(struct.created_at).getTime() - timestamp)
        }))
        .sort((a: any, b: any) => a.timeDiff - b.timeDiff)[0];

      console.log('✅ Estrutura encontrada:', {
        id: closestStructure.id,
        title: closestStructure.title,
        timeDiff: closestStructure.timeDiff + 'ms'
      });

      // Converter estrutura para formato do curso
      const courseData = {
        id: courseId,
        title: closestStructure.title || 'Curso Recuperado',
        description: closestStructure.description || 'Curso recuperado do banco de dados',
        syllabus_data: closestStructure.structure_data,
        courseStructureId: closestStructure.id
      };

      const convertedCourse = convertSyllabusToPageStructure(courseData);
      setCourseStructureId(closestStructure.id);

      // Carregar aulas existentes
      await loadLessonsFromDatabaseAutomatically(closestStructure.id, convertedCourse);

      return convertedCourse;

    } catch (error) {
      console.error('❌ Erro ao buscar curso no banco:', error);
      return await loadCourseFromLessonsOnly(courseId);
    }
  };

  // Fallback: criar curso básico apenas com aulas existentes
  const loadCourseFromLessonsOnly = async (courseId: string): Promise<Course | null> => {
    try {
      console.log('🔄 Tentando reconstruir curso apenas com aulas...');

      // Buscar todas as aulas recentes
      const response = await fetch('/api/save-subtopic-lesson');
      const result = await response.json();

      if (!result.success || !result.lessons?.length) {
        console.log('❌ Nenhuma aula encontrada para reconstrução');
        return null;
      }

      // Agrupar aulas por estrutura
      const lessonsByStructure = result.lessons.reduce((acc: any, lesson: any) => {
        const structId = lesson.course_structure_id;
        if (!acc[structId]) acc[structId] = [];
        acc[structId].push(lesson);
        return acc;
      }, {});

      // Pegar a estrutura com mais aulas (provavelmente a mais recente)
      const [bestStructureId, bestLessons] = Object.entries(lessonsByStructure)
        .sort(([,a]: any, [,b]: any) => b.length - a.length)[0] || [null, []];

      if (!bestStructureId || !Array.isArray(bestLessons) || bestLessons.length === 0) {
        console.log('❌ Nenhuma estrutura válida encontrada');
        return null;
      }

      console.log(`✅ Reconstruindo curso com ${bestLessons.length} aulas da estrutura ${bestStructureId}`);

      // Criar estrutura básica do curso
      const basicCourse: Course = {
        id: courseId,
        title: 'Curso Recuperado',
        description: 'Curso recuperado automaticamente do banco de dados',
        modules: []
      };

      // Reconstruir módulos/tópicos/subtópicos baseado nas aulas
      const moduleMap = new Map();

      bestLessons.forEach((lesson: any) => {
        const modKey = lesson.module_index;
        const topKey = `${lesson.module_index}_${lesson.topic_index}`;

        if (!moduleMap.has(modKey)) {
          moduleMap.set(modKey, {
            id: `mod_${modKey}`,
            title: lesson.lesson_metadata?.moduleTitle || `Módulo ${modKey + 1}`,
            description: '',
            order: modKey + 1,
            topics: new Map()
          });
        }

        if (!moduleMap.get(modKey).topics.has(topKey)) {
          moduleMap.get(modKey).topics.set(topKey, {
            id: `topic_${lesson.topic_index}`,
            title: lesson.lesson_metadata?.topicTitle || `Tópico ${lesson.topic_index + 1}`,
            description: '',
            order: lesson.topic_index + 1,
            subtopics: []
          });
        }

        moduleMap.get(modKey).topics.get(topKey).subtopics.push({
          id: `sub_${lesson.module_index}_${lesson.topic_index}_${lesson.subtopic_index}`,
          title: lesson.subtopic_title,
          description: '',
          order: lesson.subtopic_index + 1,
          estimatedDuration: lesson.estimated_reading_time || '5 min',
          completed: false,
          theory: lesson.lesson_content,
          videos: [],
          exercises: [],
          moduleIndex: lesson.module_index,
          topicIndex: lesson.topic_index,
          subtopicIndex: lesson.subtopic_index,
          hasLesson: true
        });
      });

      // Converter Maps para arrays
      basicCourse.modules = Array.from(moduleMap.values()).map(module => ({
        ...module,
        topics: Array.from(module.topics.values()).map((topic: any) => ({
          ...topic,
          subtopics: topic.subtopics.sort((a: any, b: any) => a.order - b.order)
        }))
          .sort((a: any, b: any) => a.order - b.order)
      }))
        .sort((a, b) => a.order - b.order);

      setCourseStructureId(bestStructureId);
      console.log('✅ Curso reconstruído com sucesso:', basicCourse.title);

      return basicCourse;

    } catch (error) {
      console.error('❌ Erro ao reconstruir curso das aulas:', error);
      return null;
    }
  };

  // Função para carregar aula específica do banco
  // REMOVIDO: Função de carregar aula individual do banco não é mais necessária
  // As aulas são carregadas uma vez quando a página abre
  // Não precisamos buscar novamente a cada mudança de subtópico

  const generateLesson = async (subtopic: Subtopic, topic: Topic) => {
    const lessonKey = subtopic.id;

    // Verificar cache
    if (lessonCache.has(lessonKey)) {
      const cachedLesson = lessonCache.get(lessonKey);
      setSelectedSubtopic({
        ...subtopic,
        theory: cachedLesson.content
      });
      return;
    }

    setGeneratingLesson(lessonKey);

    try {
      // Encontrar o módulo atual
      const currentModule = course?.modules.find(m =>
        m.topics.some(t => t.subtopics.some(s => s.id === subtopic.id))
      );

      // Extrair subject do título do curso (simplificado)
      const subject = course?.title?.toLowerCase()
        .replace('curso completo de ', '')
        .replace('curso de ', '') || '';

      const response = await fetch('/api/generate-single-lesson', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          courseStructureId: courseStructureId || null,
          moduleIndex: subtopic.moduleIndex,
          topicIndex: subtopic.topicIndex,
          subtopicIndex: subtopic.subtopicIndex,
          moduleTitle: currentModule?.title || '',
          topicTitle: topic.title,
          subtopicTitle: subtopic.title,
          subject: subject,
          educationLevel: 'undergraduate'
        })
      });

      if (!response.ok) {
        throw new Error('Falha ao gerar aula');
      }

      const data = await response.json();

      if (data.success) {
        // Salvar no cache
        setLessonCache(prev => new Map(prev).set(lessonKey, data));

        // Atualizar o subtópico selecionado
        setSelectedSubtopic({
          ...subtopic,
          theory: data.content
        });

        // Atualizar o curso na memória
        setCourse(prevCourse => {
          if (!prevCourse) return prevCourse;

          const updatedCourse = { ...prevCourse };
          updatedCourse.modules.forEach(module => {
            module.topics.forEach(t => {
              t.subtopics.forEach(s => {
                if (s.id === subtopic.id) {
                  s.theory = data.content;
                }
              });
            });
          });

          // Salvar no localStorage
          const courseDataToSave = {
            id: courseId,
            title: updatedCourse.title,
            description: updatedCourse.description,
            syllabus_data: updatedCourse
          };
          localStorage.setItem(`course_${courseId}`, JSON.stringify(courseDataToSave));

          return updatedCourse;
        });
      }
    } catch (error) {
      console.error('Erro ao gerar aula:', error);
      alert('Erro ao gerar aula-texto. Tente novamente.');
    } finally {
      setGeneratingLesson(null);
    }
  };


  const findModuleForSubtopic = (subtopicId: string) => {
    return course?.modules.find(module =>
      module.topics.some(topic =>
        topic.subtopics.some(subtopic => subtopic.id === subtopicId)
      )
    );
  };


  // Função removida - geração de aulas não disponível na V3
  /*
  const generateTopicLessons = async (moduleIndex: number, topicIndex: number, topic: Topic) => {
    if (generatingTopicLessons) return;

    const topicKey = `${moduleIndex}-${topicIndex}`;
    setGeneratingTopicLessons(topicKey);

    try {
      // Gerar sessionId único
      const sessionId = `topic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const response = await fetch('/api/generate-topic-lessons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId,
          courseId,
          moduleIndex,
          topicIndex,
          syllabus: course // Enviar todo o curso como syllabus
        })
      });

      const data = await response.json();

      if (data.success) {
        // Acompanhar progresso via SSE
        const eventSource = new EventSource(`/api/generate-topic-lessons?sessionId=${sessionId}`);

        eventSource.onmessage = (event) => {
          try {
            const progressData = JSON.parse(event.data);

            if (progressData.type === 'completed') {
              eventSource.close();

              // Atualizar o curso com as aulas geradas
              setCourse(prevCourse => {
                if (!prevCourse) return prevCourse;

                const updatedCourse = { ...prevCourse };
                const result = progressData.result;

                if (result && result.lessonContents) {
                  // Atualizar subtópicos com as aulas geradas
                  updatedCourse.modules[moduleIndex].topics[topicIndex].subtopics.forEach(subtopic => {
                    if (result.lessonContents[subtopic.id]) {
                      subtopic.theory = result.lessonContents[subtopic.id];
                    }
                  });

                  // Salvar no localStorage
                  localStorage.setItem(`course_${courseId}`, JSON.stringify(updatedCourse));
                }

                return updatedCourse;
              });

              setGeneratingTopicLessons(null);
              alert(`Aulas do tópico "${topic.title}" geradas com sucesso!`);
            }
            else if (progressData.type === 'error') {
              eventSource.close();
              setGeneratingTopicLessons(null);
              alert(`Erro ao gerar aulas: ${progressData.error}`);
            }
          } catch (parseError) {
            console.error('Erro ao processar progresso:', parseError);
          }
        };

        eventSource.onerror = (error) => {
          console.error('Erro no EventSource:', error);
          eventSource.close();
          setGeneratingTopicLessons(null);
          alert('Erro na conexão durante geração das aulas');
        };

      } else {
        throw new Error(data.error || 'Erro ao iniciar geração das aulas');
      }
    } catch (error) {
      console.error('Erro ao gerar aulas do tópico:', error);
      setGeneratingTopicLessons(null);
      alert('Erro ao gerar aulas do tópico. Tente novamente.');
    }
  };
  */

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando curso...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <p className="text-gray-600">Curso não encontrado</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Voltar ao início
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Menu Lateral */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col shadow-lg">
        {/* Header do menu */}
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={() => router.push('/')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Voltar</span>
          </button>
          <h1 className="text-lg font-bold text-gray-900 leading-tight">{course.title}</h1>
          <p className="text-sm text-gray-600 mt-1">{course.description}</p>

          {/* Banner de geração automática */}
          {autoGenerating && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                <span className="text-sm text-blue-800 font-medium">Gerando aulas automaticamente...</span>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                As aulas aparecerão conforme são geradas
              </p>
            </div>
          )}
        </div>

        {/* Lista de módulos */}
        <div className="flex-1 overflow-y-auto p-4">
          {course.modules.map((module) => (
            <div key={module.id} className="mb-4">
              {/* Módulo */}
              <button
                onClick={() => toggleModule(module.id)}
                className="w-full flex items-center justify-between p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
                    {expandedModules.has(module.id) ? (
                      <ChevronDown className="w-4 h-4 text-blue-600" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  <span className="font-medium text-gray-900">{module.title}</span>
                </div>
              </button>

              {/* Tópicos do módulo */}
              {expandedModules.has(module.id) && (
                <div className="ml-4 mt-2 space-y-2">
                  {module.topics.map((topic, topicIndex) => (
                    <div key={topic.id}>
                      {/* Tópico */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleTopic(topic.id)}
                          className="flex-1 flex items-center justify-between p-2 text-left hover:bg-gray-50 rounded-md transition-colors"
                        >
                          <div className="flex items-center space-x-2">
                            <div className="w-5 h-5 flex items-center justify-center">
                              {expandedTopics.has(topic.id) ? (
                                <ChevronDown className="w-3 h-3 text-gray-500" />
                              ) : (
                                <ChevronRight className="w-3 h-3 text-gray-500" />
                              )}
                            </div>
                            <span className="text-sm font-medium text-gray-800">{topic.title}</span>
                          </div>
                        </button>

                      </div>

                      {/* Subtópicos */}
                      {expandedTopics.has(topic.id) && (
                        <div className="ml-6 mt-1 space-y-1">
                          {topic.subtopics && topic.subtopics.length > 0 ? (
                            topic.subtopics.map((subtopic) => (
                            <button
                              key={subtopic.id}
                              onClick={() => selectSubtopic(subtopic)}
                              className={`w-full flex items-center justify-between p-2 text-left rounded-md transition-colors ${
                                selectedSubtopic?.id === subtopic.id
                                  ? 'bg-blue-100 text-blue-900'
                                  : 'hover:bg-gray-50 text-gray-700'
                              }`}
                            >
                              <div className="flex items-center space-x-2">
                                <div className="w-4 h-4 flex items-center justify-center">
                                  {subtopic.completed ? (
                                    <CheckCircle className="w-3 h-3 text-green-500" />
                                  ) : subtopic.hasLesson || subtopic.theory ? (
                                    <BookOpen className="w-3 h-3 text-blue-500" />
                                  ) : (
                                    <Circle className="w-3 h-3 text-gray-400" />
                                  )}
                                </div>
                                <span className="text-xs">{subtopic.title}</span>
                                {(subtopic.hasLesson || subtopic.theory) && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                )}
                              </div>
                              <div className="flex items-center space-x-1 text-xs text-gray-500">
                                <Clock className="w-3 h-3" />
                                <span>{subtopic.estimatedDuration}</span>
                              </div>
                            </button>
                          ))
                          ) : (
                            <div className="ml-4 text-xs text-gray-400">Nenhum subtópico encontrado</div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col">
        {selectedSubtopic ? (
          <>
            {/* Header do conteúdo */}
            <div className="bg-white border-b border-gray-200 p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedSubtopic.title}</h2>
              <p className="text-gray-600 mb-4">{selectedSubtopic.description}</p>

              {/* Tabs */}
              <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('theory')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                    activeTab === 'theory'
                      ? 'bg-white shadow-sm text-blue-600 font-medium'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Teoria</span>
                </button>
                <button
                  onClick={() => setActiveTab('videos')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                    activeTab === 'videos'
                      ? 'bg-white shadow-sm text-blue-600 font-medium'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <Play className="w-4 h-4" />
                  <span>Vídeos</span>
                </button>
                <button
                  onClick={() => setActiveTab('exercises')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                    activeTab === 'exercises'
                      ? 'bg-white shadow-sm text-blue-600 font-medium'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <PenTool className="w-4 h-4" />
                  <span>Exercícios</span>
                </button>
              </div>
            </div>

            {/* Conteúdo das tabs */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'theory' && (
                <div className="max-w-4xl mx-auto">
                  {selectedSubtopic.theory ? (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-gray-900">Aula-Texto</h3>
                        <button
                          onClick={() => {
                            const currentTopic = course?.modules
                              .flatMap(m => m.topics)
                              .find(t => t.subtopics.some(s => s.id === selectedSubtopic.id));
                            if (currentTopic) {
                              // Limpar cache e regenerar
                              setLessonCache(prev => {
                                const newCache = new Map(prev);
                                newCache.delete(selectedSubtopic.id);
                                return newCache;
                              });
                              generateLesson(selectedSubtopic, currentTopic);
                            }
                          }}
                          disabled={generatingLesson === selectedSubtopic.id}
                          className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <RefreshCw className={`w-4 h-4 ${generatingLesson === selectedSubtopic.id ? 'animate-spin' : ''}`} />
                          <span>Regenerar</span>
                        </button>
                      </div>
                      <LessonContent
                        content={selectedSubtopic.theory}
                        isLoading={generatingLesson === selectedSubtopic.id}
                      />
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                      <div className="text-center py-12">
                        {generatingLesson === selectedSubtopic.id ? (
                          <>
                            <div className="animate-pulse">
                              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Sparkles className="w-8 h-8 text-blue-600 animate-spin" />
                              </div>
                              <h3 className="text-xl font-bold text-gray-900 mb-2">Gerando Aula-Texto</h3>
                              <p className="text-gray-600 mb-2">Criando conteúdo educacional personalizado...</p>
                              <div className="flex items-center justify-center space-x-1">
                                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                              Aula-Texto não disponível
                            </h3>
                            <p className="text-gray-600 mb-6 max-w-md mx-auto">
                              Clique no botão abaixo para gerar o conteúdo teórico desta aula com inteligência artificial.
                            </p>
                            <button
                              onClick={() => {
                                const currentTopic = course?.modules
                                  .flatMap(m => m.topics)
                                  .find(t => t.subtopics.some(s => s.id === selectedSubtopic.id));
                                if (currentTopic) {
                                  generateLesson(selectedSubtopic, currentTopic);
                                }
                              }}
                              className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-colors shadow-lg hover:shadow-xl"
                            >
                              <Sparkles className="w-5 h-5" />
                              <span className="font-medium">Gerar Aula-Texto</span>
                            </button>
                            <p className="text-xs text-gray-500 mt-4">
                              Tempo estimado: 15-30 segundos
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'videos' && (
                <div className="max-w-4xl mx-auto">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-6">Vídeos Educacionais</h3>
                    <p className="text-gray-600">Vídeos selecionados do YouTube serão exibidos aqui...</p>
                  </div>
                </div>
              )}

              {activeTab === 'exercises' && (
                <div className="max-w-4xl mx-auto">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-6">Exercícios de Fixação</h3>
                    <p className="text-gray-600">Exercícios personalizados serão gerados aqui...</p>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Selecione um subtópico</h3>
              <p className="text-gray-600">Escolha um subtópico no menu lateral para começar a estudar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Função para converter dados do syllabus para estrutura da página
function convertSyllabusToPageStructure(courseData: any): Course {
  const syllabusData = courseData.syllabus_data || courseData;

  return {
    id: courseData.id || courseData.courseId,
    title: syllabusData.title || courseData.title,
    description: syllabusData.description || courseData.description,
    modules: (syllabusData.modules || []).map((module: any, moduleIndex: number) => ({
      id: module.id || `mod_${moduleIndex}`,
      title: module.title,
      description: module.description || '',
      order: module.order || moduleIndex + 1,
      topics: (module.topics || []).map((topic: any, topicIndex: number) => ({
        id: topic.id || `topic_${topicIndex}`,
        title: topic.title,
        description: topic.description || '',
        order: topic.order || topicIndex + 1,
        subtopics: (topic.subtopics || []).map((subtopic: any, subtopicIndex: number) => {
          // Verificar se é string e converter para objeto
          if (typeof subtopic === 'string') {
            return {
              id: `sub_${moduleIndex}_${topicIndex}_${subtopicIndex}`,
              title: subtopic,
              description: '',
              order: subtopicIndex + 1,
              estimatedDuration: '45 min',
              completed: false,
              theory: null,
              videos: [],
              exercises: [],
              moduleIndex,
              topicIndex,
              subtopicIndex,
              hasLesson: false
            };
          }
          // Se já é objeto, garantir todas as propriedades
          const result = {
            id: subtopic.id || `sub_${moduleIndex}_${topicIndex}_${subtopicIndex}`,
            title: subtopic.title || subtopic.name || subtopic.titulo || 'Subtópico sem título',
            description: subtopic.description || subtopic.descricao || '',
            order: subtopic.order || subtopic.ordem || subtopicIndex + 1,
            estimatedDuration: subtopic.estimatedDuration || subtopic.duration || subtopic.duracaoEstimada || '45 min',
            completed: false,
            theory: subtopic.theory || subtopic.teoria || null,
            videos: subtopic.videos || [],
            exercises: subtopic.exercises || subtopic.exercicios || [],
            moduleIndex,
            topicIndex,
            subtopicIndex,
            hasLesson: !!(subtopic.theory || subtopic.teoria)
          };

          // Debug: logar se o subtópico tem teoria
          if (result.theory) {
            console.log(`✅ Subtópico "${result.title}" tem aula-texto pronta`);
          } else {
            console.log(`❌ Subtópico "${result.title}" SEM aula-texto`);
          }

          return result;
        })
      }))
    }))
  };
}