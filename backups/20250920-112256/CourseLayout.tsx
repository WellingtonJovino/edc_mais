'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import RespondeAiSidebar from './Sidebar';
import RespondeAiTopicView from './TopicView';
import { Course, CourseTopic, updateCourseProgress } from '@/lib/supabase';
import Link from 'next/link';

interface RespondeAiModule {
  id: string;
  title: string;
  description: string;
  order: number;
  topics: (CourseTopic & {
    order: number;
    module_order: number;
    module_title: string;
  })[];
}

interface RespondeAiCourseLayoutProps {
  course: Course;
  onCourseUpdate?: (updatedCourse: Course) => void;
  onDoubtClick?: (section: string, content: string) => void;
}

export default function RespondeAiCourseLayout({
  course,
  onCourseUpdate,
  onDoubtClick
}: RespondeAiCourseLayoutProps) {
  const router = useRouter();
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  // Converter tópicos em estrutura de módulos
  const getModulesFromTopics = (): RespondeAiModule[] => {
    if (!course.topics) return [];

    const moduleMap = new Map<string, RespondeAiModule>();

    course.topics.forEach((topic) => {
      const moduleKey = (topic as any).module_title || 'Módulo Principal';
      const moduleOrder = (topic as any).module_order || 0;

      if (!moduleMap.has(moduleKey)) {
        moduleMap.set(moduleKey, {
          id: `module-${moduleOrder}`,
          title: moduleKey,
          description: (topic as any).module_description || '',
          order: moduleOrder,
          topics: []
        });
      }

      moduleMap.get(moduleKey)!.topics.push({
        ...topic,
        description: topic.description || '',
        order: topic.order_index,
        module_order: moduleOrder,
        module_title: moduleKey
      });
    });

    // Ordenar módulos e tópicos
    const modules = Array.from(moduleMap.values()).sort((a, b) => a.order - b.order);
    modules.forEach(module => {
      module.topics.sort((a, b) => a.order_index - b.order_index);
    });

    return modules;
  };

  const modules = getModulesFromTopics();
  const selectedTopic = selectedTopicId ? course.topics?.find(t => t.id === selectedTopicId) : null;

  // Auto-selecionar primeiro tópico incompleto
  useEffect(() => {
    if (!selectedTopicId && modules.length > 0) {
      const firstIncomplete = modules
        .flatMap(m => m.topics)
        .find(t => !t.completed);

      if (firstIncomplete) {
        setSelectedTopicId(firstIncomplete.id);
        const module = modules.find(m => m.topics.some(t => t.id === firstIncomplete.id));
        if (module) {
          setSelectedModuleId(module.id);
        }
      }
    }
  }, [modules, selectedTopicId]);

  const handleTopicSelect = (topicId: string, moduleId: string) => {
    setSelectedTopicId(topicId);
    setSelectedModuleId(moduleId);
  };

  const handleTopicComplete = async (topicId: string, completed: boolean) => {
    if (!course) return;

    try {
      setUpdating(topicId);
      await updateCourseProgress(course.id, topicId, completed);

      // Atualizar estado local
      const updatedCourse = {
        ...course,
        topics: course.topics?.map(topic =>
          topic.id === topicId ? { ...topic, completed } : topic
        ) || []
      };

      // Recalcular progresso
      const completedCount = updatedCourse.topics.filter(t => t.completed).length;
      const totalCount = updatedCourse.topics.length;
      updatedCourse.progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      if (onCourseUpdate) {
        onCourseUpdate(updatedCourse);
      }
    } catch (error) {
      console.error('Erro ao atualizar progresso:', error);
    } finally {
      setUpdating(null);
    }
  };

  const handleBackToCourseList = () => {
    router.push('/courses');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <RespondeAiSidebar
        courseTitle={course.title}
        modules={modules as any}
        currentTopicId={selectedTopicId || undefined}
        onTopicSelect={handleTopicSelect}
        className="flex-shrink-0"
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedTopic ? (
          <RespondeAiTopicView
            topic={{
              ...selectedTopic,
              description: selectedTopic.description || '',
              exercises_fixation: (selectedTopic as any).exercises_fixation || [],
              exercises_exam: (selectedTopic as any).exercises_exam || [],
              sections: (selectedTopic as any).sections || []
            } as any}
            courseTitle={course.title}
            onBack={handleBackToCourseList}
            onTopicComplete={handleTopicComplete}
            onDoubtClick={onDoubtClick}
          />
        ) : (
          // Estado inicial - Overview do curso
          <div className="flex-1 flex items-center justify-center bg-white">
            <div className="text-center max-w-md mx-auto p-6">
              {/* Header com botão voltar */}
              <div className="absolute top-6 left-6">
                <Link
                  href="/courses"
                  className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 mr-1" />
                  VOLTAR
                </Link>
              </div>

              {/* Conteúdo central */}
              <div className="text-6xl mb-6">📚</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">
                {course.title}
              </h1>
              <p className="text-gray-600 mb-6">
                {course.description || 'Selecione um tópico na lateral para começar seus estudos.'}
              </p>

              {/* Estatísticas do curso */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-teal-600">
                    {course.total_topics || 0}
                  </div>
                  <div className="text-sm text-gray-500">Tópicos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {course.topics?.filter(t => t.completed).length || 0}
                  </div>
                  <div className="text-sm text-gray-500">Concluídos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {course.progress}%
                  </div>
                  <div className="text-sm text-gray-500">Progresso</div>
                </div>
              </div>

              {/* Barra de progresso */}
              <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
                <div
                  className="bg-gradient-to-r from-teal-500 to-blue-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${course.progress}%` }}
                />
              </div>

              {/* Call to action */}
              <p className="text-sm text-gray-500">
                👈 Use o menu lateral para navegar pelos módulos e tópicos
              </p>

              {/* Informações adicionais */}
              {modules.length > 0 && (
                <div className="mt-8 text-left bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Módulos do Curso:</h3>
                  <div className="space-y-2">
                    {modules.map((module, index) => (
                      <div key={module.id} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">
                          {index + 1}. {module.title}
                        </span>
                        <span className="text-xs text-gray-500">
                          {module.topics.filter(t => t.completed).length}/{module.topics.length}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}