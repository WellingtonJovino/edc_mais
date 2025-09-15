'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Play, BookOpen, FileEdit, MessageSquare, CheckCircle2, Clock, Brain, Video, Lock } from 'lucide-react';
import { Module, Section, Topic } from '@/types';
import VideoPlayer from './VideoPlayer';
import AcademicContent from './AcademicContent';
import EnhancedAulaTexto from './EnhancedAulaTexto';

interface HierarchicalCourseViewProps {
  modules: Module[];
  courseId: string;
  courseTitle: string;
  onTopicComplete: (topicId: string, completed: boolean) => void;
  onDoubtClick?: (topicId: string, topicTitle: string) => void;
}

export default function HierarchicalCourseView({
  modules,
  courseId,
  courseTitle,
  onTopicComplete,
  onDoubtClick
}: HierarchicalCourseViewProps) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [selectedContentType, setSelectedContentType] = useState<'video' | 'aula-texto' | 'exercise'>('aula-texto');

  const toggleModule = (moduleId: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const selectTopic = (topic: Topic) => {
    setSelectedTopic(topic);
    // Definir tipo de conteúdo padrão baseado no que está disponível
    if (topic.aulaTexto) {
      setSelectedContentType('aula-texto');
    } else if (topic.videos && topic.videos.length > 0) {
      setSelectedContentType('video');
    } else {
      setSelectedContentType('aula-texto');
    }
  };

  const getContentIcon = (contentType?: string) => {
    switch (contentType) {
      case 'video': return <Video className="w-4 h-4" />;
      case 'aula-texto': return <BookOpen className="w-4 h-4" />;
      case 'exercise': return <FileEdit className="w-4 h-4" />;
      default: return <BookOpen className="w-4 h-4" />;
    }
  };

  const getContentTypeLabel = (contentType?: string) => {
    switch (contentType) {
      case 'video': return 'Vídeo';
      case 'aula-texto': return 'Aula-Texto';
      case 'exercise': return 'Exercício';
      default: return 'Conteúdo';
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Estrutura Hierárquica */}
      <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{courseTitle}</h2>
          <p className="text-sm text-gray-600">Estrutura do curso</p>
        </div>

        <div className="p-2">
          {modules.map((module) => (
            <div key={module.id} className="mb-2">
              {/* Módulo */}
              <button
                onClick={() => toggleModule(module.id)}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 text-left"
                style={{ backgroundColor: expandedModules.has(module.id) ? `${module.color}15` : undefined }}
              >
                <div className="flex items-center space-x-3">
                  {expandedModules.has(module.id) ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                  <div>
                    <h3 className="font-bold text-sm text-gray-900 uppercase tracking-wide">
                      {module.title}
                    </h3>
                    <p className="text-xs text-gray-600 mt-1">{module.estimatedDuration}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {module.completed && (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  )}
                </div>
              </button>

              {/* Seções */}
              {expandedModules.has(module.id) && (
                <div className="ml-4 mt-2 space-y-1">
                  {module.sections.map((section) => (
                    <div key={section.id}>
                      <button
                        onClick={() => toggleSection(section.id)}
                        className="w-full flex items-center justify-between p-2 rounded-md hover:bg-gray-50 text-left"
                      >
                        <div className="flex items-center space-x-2">
                          {expandedSections.has(section.id) ? (
                            <ChevronDown className="w-3 h-3 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-3 h-3 text-gray-400" />
                          )}
                          <div>
                            <h4 className="font-medium text-sm text-gray-800">
                              {section.title}
                            </h4>
                            <p className="text-xs text-gray-500">
                              {section.topics.length} tópicos
                            </p>
                          </div>
                        </div>
                        {section.completed && (
                          <CheckCircle2 className="w-3 h-3 text-green-600" />
                        )}
                      </button>

                      {/* Tópicos */}
                      {expandedSections.has(section.id) && (
                        <div className="ml-4 mt-1 space-y-1">
                          {section.topics.map((topic) => (
                            <button
                              key={topic.id}
                              onClick={() => selectTopic(topic)}
                              className={`w-full flex items-center justify-between p-2 rounded-md text-left hover:bg-blue-50 ${
                                selectedTopic?.id === topic.id ? 'bg-blue-100 border border-blue-200' : ''
                              }`}
                            >
                              <div className="flex items-center space-x-2">
                                {getContentIcon(topic.contentType)}
                                <div>
                                  <span className="text-sm font-medium text-gray-700">
                                    {topic.title}
                                  </span>
                                  <div className="flex items-center space-x-2 mt-1">
                                    <span className="text-xs text-gray-500">
                                      {getContentTypeLabel(topic.contentType)}
                                    </span>
                                    {topic.estimatedDuration && (
                                      <span className="text-xs text-gray-400">
                                        • {topic.estimatedDuration}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-1">
                                {topic.hasDoubtButton && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDoubtClick?.(topic.id, topic.title);
                                    }}
                                    className="p-1 rounded-full hover:bg-blue-200 text-blue-600"
                                    title="Tirar dúvida"
                                  >
                                    <MessageSquare className="w-3 h-3" />
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onTopicComplete(topic.id, !topic.completed);
                                  }}
                                  className={`p-1 rounded-full ${
                                    topic.completed
                                      ? 'text-green-600 hover:bg-green-200'
                                      : 'text-gray-400 hover:bg-gray-200'
                                  }`}
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                </button>
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

      {/* Área Principal - Conteúdo */}
      <div className="flex-1 flex flex-col">
        {selectedTopic ? (
          <>
            {/* Header do Tópico */}
            <div className="bg-white border-b border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {selectedTopic.title}
                  </h1>
                  {selectedTopic.description && (
                    <p className="text-gray-600 mt-1">{selectedTopic.description}</p>
                  )}
                  <div className="flex items-center space-x-4 mt-3">
                    {selectedTopic.estimatedDuration && (
                      <div className="flex items-center space-x-1 text-sm text-gray-500">
                        <Clock className="w-4 h-4" />
                        <span>{selectedTopic.estimatedDuration}</span>
                      </div>
                    )}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      selectedTopic.completed
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {selectedTopic.completed ? 'Concluído' : 'Pendente'}
                    </span>
                  </div>
                </div>
                {selectedTopic.hasDoubtButton && (
                  <button
                    onClick={() => onDoubtClick?.(selectedTopic.id, selectedTopic.title)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Tirar Dúvida</span>
                  </button>
                )}
              </div>
            </div>

            {/* Tabs de Conteúdo */}
            <div className="bg-white border-b border-gray-200">
              <div className="flex space-x-1 px-6">
                {selectedTopic.aulaTexto && (
                  <button
                    onClick={() => setSelectedContentType('aula-texto')}
                    className={`flex items-center space-x-2 px-4 py-3 border-b-2 font-medium text-sm ${
                      selectedContentType === 'aula-texto'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Aula-Texto</span>
                  </button>
                )}
                {selectedTopic.videos && selectedTopic.videos.length > 0 && (
                  <button
                    onClick={() => setSelectedContentType('video')}
                    className={`flex items-center space-x-2 px-4 py-3 border-b-2 font-medium text-sm ${
                      selectedContentType === 'video'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Video className="w-4 h-4" />
                    <span>Vídeos ({selectedTopic.videos.length})</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedContentType('exercise')}
                  className={`flex items-center space-x-2 px-4 py-3 border-b-2 font-medium text-sm ${
                    selectedContentType === 'exercise'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <FileEdit className="w-4 h-4" />
                  <span>Exercícios</span>
                </button>
              </div>
            </div>

            {/* Conteúdo */}
            <div className="flex-1 overflow-y-auto p-6">
              {selectedContentType === 'aula-texto' && selectedTopic.aulaTexto && (
                <div className="max-w-4xl mx-auto">
                  <EnhancedAulaTexto
                    content={selectedTopic.aulaTexto}
                    onDoubtClick={(section, content) => onDoubtClick?.(selectedTopic.id, `${section}: ${content}`)}
                  />
                </div>
              )}

              {selectedContentType === 'video' && selectedTopic.videos && selectedTopic.videos.length > 0 && (
                <div className="space-y-6">
                  {selectedTopic.videos.map((video) => (
                    <div key={video.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <VideoPlayer video={{
                        id: video.id,
                        title: video.title,
                        description: video.description,
                        thumbnail: video.thumbnail,
                        url: `https://www.youtube.com/watch?v=${video.videoId}`,
                        duration: video.duration,
                        channelTitle: video.channelTitle,
                      }} />
                    </div>
                  ))}
                </div>
              )}

              {selectedContentType === 'exercise' && (
                <div className="max-w-4xl mx-auto">
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="text-center py-12">
                      <FileEdit className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Exercícios em desenvolvimento
                      </h3>
                      <p className="text-gray-600">
                        Esta seção de exercícios será implementada em breve.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {selectedContentType === 'aula-texto' && !selectedTopic.aulaTexto && (
                <div className="max-w-4xl mx-auto">
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="text-center py-12">
                      <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Aula-texto não disponível
                      </h3>
                      <p className="text-gray-600">
                        O conteúdo de aula-texto para este tópico será gerado automaticamente.
                      </p>
                      <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Gerar Aula-Texto
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Estado Inicial */
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Selecione um tópico para começar
              </h3>
              <p className="text-gray-600">
                Escolha um tópico na estrutura do curso para ver o conteúdo.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}