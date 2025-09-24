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
  Loader2
} from 'lucide-react';
import LessonTextViewer from '@/components/LessonTextViewer';

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
  const [generatingLesson, setGeneratingLesson] = useState(false);
  const [lessonContent, setLessonContent] = useState<string | null>(null);
  const [lessonMetadata, setLessonMetadata] = useState<any>(null);
  const [generatingTopicLessons, setGeneratingTopicLessons] = useState<string | null>(null);

  // Carregar dados reais do curso
  useEffect(() => {
    const loadCourse = async () => {
      try {
        // Tentar carregar do localStorage primeiro (dados do curso gerado)
        const storedCourse = localStorage.getItem(`course_${courseId}`);

        if (storedCourse) {
          const courseData = JSON.parse(storedCourse);
          console.log('📚 Carregando curso do localStorage:', courseData.title);

          // Converter dados do syllabus para estrutura da página
          const convertedCourse = convertSyllabusToPageStructure(courseData);
          setCourse(convertedCourse);
          setLoading(false);
          return;
        }

        // Fallback: simular dados de curso para desenvolvimento
        console.log('📚 Usando dados simulados para desenvolvimento');
        await new Promise(resolve => setTimeout(resolve, 1000));

        const mockCourse: Course = {
          id: courseId,
          title: "Cálculo A - Curso Completo",
          description: "Curso estruturado de Cálculo A para Engenharia",
          modules: [
            {
              id: "mod1",
              title: "1. Funções e Limites",
              description: "Introdução às funções e conceito de limite",
              order: 1,
              topics: [
                {
                  id: "topic1",
                  title: "Introdução",
                  description: "Conceitos fundamentais",
                  order: 1,
                  subtopics: [
                    {
                      id: "sub1",
                      title: "O que são funções?",
                      description: "Definição e conceitos básicos de funções",
                      order: 1,
                      estimatedDuration: "30 min",
                      theory: "Conteúdo da aula-texto aqui...",
                      videos: ["video1", "video2"],
                      exercises: []
                    },
                    {
                      id: "sub2",
                      title: "Tipos de funções",
                      description: "Classificação das funções matemáticas",
                      order: 2,
                      estimatedDuration: "45 min",
                      theory: "Conteúdo sobre tipos de funções...",
                      videos: ["video3"],
                      exercises: []
                    }
                  ]
                }
              ]
            },
            {
              id: "mod2",
              title: "4. Limites Fundamentais",
              description: "Estudo dos limites e suas propriedades",
              order: 2,
              topics: [
                {
                  id: "topic2",
                  title: "Definição de Limite",
                  description: "Conceito formal de limite",
                  order: 1,
                  subtopics: [
                    {
                      id: "sub3",
                      title: "Limite de uma função",
                      description: "Definição matemática de limite",
                      order: 1,
                      estimatedDuration: "40 min",
                      theory: "Conteúdo sobre limites...",
                      videos: ["video4"],
                      exercises: []
                    }
                  ]
                }
              ]
            }
          ]
        };

        setCourse(mockCourse);
        // Selecionar primeiro subtópico por padrão
        if (mockCourse.modules[0]?.topics[0]?.subtopics[0]) {
          setSelectedSubtopic(mockCourse.modules[0].topics[0].subtopics[0]);
          setExpandedModules(new Set([mockCourse.modules[0].id]));
          setExpandedTopics(new Set([mockCourse.modules[0].topics[0].id]));
        }
      } catch (error) {
        console.error('Erro ao carregar curso:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCourse();
  }, [courseId]);

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

  const selectSubtopic = (subtopic: Subtopic) => {
    setSelectedSubtopic(subtopic);
    setActiveTab('theory'); // Sempre abrir na aba teoria
    setLessonContent(null);
    setLessonMetadata(null);
  };

  const generateLessonText = async () => {
    if (!selectedSubtopic || generatingLesson) return;

    setGeneratingLesson(true);
    try {
      const response = await fetch('/api/generate-lesson', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subtopicId: selectedSubtopic.id,
          subtopicTitle: selectedSubtopic.title,
          subtopicDescription: selectedSubtopic.description,
          moduleTitle: findModuleForSubtopic(selectedSubtopic.id)?.title,
          courseTitle: course?.title,
          userLevel: 'intermediate',
          discipline: 'Matemática', // Pode ser dinâmico
          estimatedDuration: selectedSubtopic.estimatedDuration
        })
      });

      const data = await response.json();

      if (data.success) {
        setLessonContent(data.content);
        setLessonMetadata(data.metadata);
      } else {
        throw new Error(data.error || 'Erro ao gerar aula');
      }
    } catch (error) {
      console.error('Erro ao gerar aula-texto:', error);
      alert('Erro ao gerar aula-texto. Tente novamente.');
    } finally {
      setGeneratingLesson(false);
    }
  };

  const findModuleForSubtopic = (subtopicId: string) => {
    return course?.modules.find(module =>
      module.topics.some(topic =>
        topic.subtopics.some(subtopic => subtopic.id === subtopicId)
      )
    );
  };

  // Verificar se um tópico tem aulas geradas (pelo menos um subtópico tem teoria)
  const topicHasLessons = (topic: Topic): boolean => {
    return topic.subtopics.some(subtopic => subtopic.theory && subtopic.theory.trim().length > 0);
  };

  // Gerar aulas para um tópico específico
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

                        {/* Botão Gerar Aulas - só aparece se o tópico não tem aulas */}
                        {!topicHasLessons(topic) && (
                          <button
                            onClick={() => generateTopicLessons(course.modules.indexOf(module), topicIndex, topic)}
                            disabled={generatingTopicLessons === `${course.modules.indexOf(module)}-${topicIndex}`}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            title="Gerar aulas para este tópico"
                          >
                            {generatingTopicLessons === `${course.modules.indexOf(module)}-${topicIndex}` ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Wand2 className="w-3 h-3" />
                            )}
                            <span className="hidden sm:inline">Gerar</span>
                          </button>
                        )}
                      </div>

                      {/* Subtópicos */}
                      {expandedTopics.has(topic.id) && (
                        <div className="ml-6 mt-1 space-y-1">
                          {topic.subtopics.map((subtopic) => (
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
                                  ) : (
                                    <Circle className="w-3 h-3 text-gray-400" />
                                  )}
                                </div>
                                <span className="text-xs">{subtopic.title}</span>
                              </div>
                              <div className="flex items-center space-x-1 text-xs text-gray-500">
                                <Clock className="w-3 h-3" />
                                <span>{subtopic.estimatedDuration}</span>
                              </div>
                            </button>
                          ))}
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
                  {lessonContent ? (
                    <LessonTextViewer
                      content={lessonContent}
                      metadata={lessonMetadata}
                      onRegenerate={generateLessonText}
                      isRegenerating={generatingLesson}
                    />
                  ) : selectedSubtopic.theory ? (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-gray-900">Aula-Texto</h3>
                        <button
                          onClick={generateLessonText}
                          disabled={generatingLesson}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {generatingLesson ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Wand2 className="w-4 h-4" />
                          )}
                          {generatingLesson ? 'Gerando...' : 'Gerar Aula IA'}
                        </button>
                      </div>
                      <div className="prose prose-lg max-w-none">
                        <p>{selectedSubtopic.theory}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                      <div className="text-center py-12">
                        <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Aula-Texto não gerada</h3>
                        <p className="text-gray-600 mb-6 max-w-md mx-auto">
                          Esta aula ainda não foi gerada. Clique no botão abaixo para criar automaticamente uma aula-texto profissional usando IA.
                        </p>
                        <button
                          onClick={generateLessonText}
                          disabled={generatingLesson}
                          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mx-auto"
                        >
                          {generatingLesson ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Wand2 className="w-5 h-5" />
                          )}
                          {generatingLesson ? 'Gerando Aula...' : 'Gerar Aula com IA'}
                        </button>
                        {generatingLesson && (
                          <div className="mt-6">
                            <div className="bg-blue-50 rounded-lg p-4 max-w-md mx-auto">
                              <div className="flex items-center gap-3 text-blue-700">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <div className="text-left">
                                  <p className="font-medium">Gerando aula-texto...</p>
                                  <p className="text-sm text-blue-600">Isso pode levar 1-2 minutos</p>
                                </div>
                              </div>
                            </div>
                          </div>
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
        subtopics: (topic.subtopics || []).map((subtopic: any, subtopicIndex: number) => ({
          id: subtopic.id || `sub_${subtopicIndex}`,
          title: subtopic.title,
          description: subtopic.description || '',
          order: subtopic.order || subtopicIndex + 1,
          estimatedDuration: subtopic.estimatedDuration || subtopic.duration || '45 min',
          completed: false,
          theory: subtopic.theory || null, // Aula-texto gerada
          videos: subtopic.videos || [],
          exercises: subtopic.exercises || []
        }))
      }))
    }))
  };
}