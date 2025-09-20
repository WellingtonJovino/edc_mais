'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle, Circle, Lock, PlayCircle } from 'lucide-react';

interface Module {
  id: string;
  title: string;
  description: string;
  order: number;
  topics: Topic[];
}

interface Topic {
  id: string;
  title: string;
  description: string;
  order: number;
  completed: boolean;
  module_order: number;
  module_title: string;
  videos?: any[];
  exercises_fixation?: any[];
  exercises_exam?: any[];
}

interface RespondeAiSidebarProps {
  courseTitle: string;
  modules: Module[];
  currentTopicId?: string;
  onTopicSelect: (topicId: string, moduleId: string) => void;
  className?: string;
}

export default function RespondeAiSidebar({
  courseTitle,
  modules,
  currentTopicId,
  onTopicSelect,
  className = ''
}: RespondeAiSidebarProps) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const toggleModule = (moduleId: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  const getTopicIcon = (topic: Topic, isLocked: boolean) => {
    if (isLocked) {
      return <Lock className="w-4 h-4 text-gray-400" />;
    }
    if (topic.completed) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    return <Circle className="w-4 h-4 text-gray-400" />;
  };

  const isTopicLocked = (topic: Topic, moduleIndex: number) => {
    // Lógica de desbloqueio progressivo
    if (moduleIndex === 0) {
      // Primeiro módulo sempre desbloqueado
      return false;
    }

    // Verificar se todos os tópicos do módulo anterior estão completos
    const previousModule = modules[moduleIndex - 1];
    if (previousModule) {
      return !previousModule.topics.every(t => t.completed);
    }

    return false;
  };

  const getModuleProgress = (module: Module) => {
    const completed = module.topics.filter(t => t.completed).length;
    const total = module.topics.length;
    return { completed, total, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  };

  return (
    <div className={`bg-gray-800 text-white h-full overflow-y-auto ${className}`} style={{ minWidth: '300px', maxWidth: '350px' }}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-bold text-white mb-1 line-clamp-2">
          {courseTitle}
        </h2>
        <div className="text-sm text-gray-300">
          {modules.reduce((total, m) => total + m.topics.filter(t => t.completed).length, 0)} de{' '}
          {modules.reduce((total, m) => total + m.topics.length, 0)} concluídos
        </div>
      </div>

      {/* Módulos */}
      <div className="p-2">
        {modules.map((module, moduleIndex) => {
          const progress = getModuleProgress(module);
          const isExpanded = expandedModules.has(module.id);

          return (
            <div key={module.id} className="mb-2">
              {/* Cabeçalho do Módulo */}
              <button
                onClick={() => toggleModule(module.id)}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex items-center text-sm font-semibold">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 mr-2" />
                    ) : (
                      <ChevronRight className="w-4 h-4 mr-2" />
                    )}
                    <span className="bg-teal-500 text-white px-2 py-1 rounded text-xs font-bold mr-2">
                      {module.order}
                    </span>
                    <span className="text-white">{module.title}</span>
                  </div>
                </div>

                <div className="text-xs text-gray-300">
                  {progress.completed}/{progress.total}
                </div>
              </button>

              {/* Barra de Progresso do Módulo */}
              <div className="px-3 pb-2">
                <div className="w-full bg-gray-600 rounded-full h-1.5 mt-2">
                  <div
                    className="bg-teal-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>
              </div>

              {/* Tópicos do Módulo */}
              {isExpanded && (
                <div className="ml-4 space-y-1">
                  {module.topics
                    .sort((a, b) => a.order - b.order)
                    .map((topic) => {
                      const isLocked = isTopicLocked(topic, moduleIndex);
                      const isActive = topic.id === currentTopicId;

                      return (
                        <button
                          key={topic.id}
                          onClick={() => !isLocked && onTopicSelect(topic.id, module.id)}
                          disabled={isLocked}
                          className={`
                            w-full flex items-center space-x-3 p-2 rounded-lg text-left transition-all duration-200
                            ${isActive
                              ? 'bg-teal-500 text-white shadow-lg'
                              : isLocked
                              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                              : 'bg-gray-700 hover:bg-gray-600 text-gray-100'
                            }
                          `}
                        >
                          {getTopicIcon(topic, isLocked)}

                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {topic.title}
                            </div>
                            {topic.description && (
                              <div className="text-xs opacity-75 truncate">
                                {topic.description.substring(0, 50)}...
                              </div>
                            )}
                          </div>

                          {/* Indicadores de conteúdo */}
                          <div className="flex items-center space-x-1">
                            {topic.videos && topic.videos.length > 0 && (
                              <PlayCircle className="w-3 h-3 text-blue-400" />
                            )}
                            {topic.exercises_fixation && topic.exercises_fixation.length > 0 && (
                              <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                            )}
                            {topic.exercises_exam && topic.exercises_exam.length > 0 && (
                              <div className="w-2 h-2 bg-red-400 rounded-full" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Rodapé com progresso geral */}
      <div className="p-4 border-t border-gray-700 mt-auto">
        <div className="text-xs text-gray-300 mb-2">Progresso Geral</div>
        <div className="w-full bg-gray-600 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-teal-500 to-blue-500 h-2 rounded-full transition-all duration-500"
            style={{
              width: `${Math.round(
                (modules.reduce((total, m) => total + m.topics.filter(t => t.completed).length, 0) /
                 modules.reduce((total, m) => total + m.topics.length, 0)) * 100
              )}%`
            }}
          />
        </div>
      </div>
    </div>
  );
}