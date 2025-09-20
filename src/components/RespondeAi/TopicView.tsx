'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Play, Book, PenTool, Clock, CheckCircle, MessageCircle } from 'lucide-react';
import RespondeAiAulaTexto from './AulaTexto';
import RespondeAiExercises from './Exercises';

interface Topic {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  videos?: any[];
  aula_texto?: any;
  exercises_fixation?: any[];
  exercises_exam?: any[];
  sections?: any[];
}

interface RespondeAiTopicViewProps {
  topic: Topic;
  courseTitle: string;
  onBack: () => void;
  onTopicComplete: (topicId: string, completed: boolean) => void;
  onDoubtClick?: (section: string, content: string) => void;
}

type TabType = 'teoria' | 'exercicios-fixacao' | 'exercicios-prova';

export default function RespondeAiTopicView({
  topic,
  courseTitle,
  onBack,
  onTopicComplete,
  onDoubtClick
}: RespondeAiTopicViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('teoria');
  const [showVideo, setShowVideo] = useState(false);

  // Contar exercícios
  const fixationCount = topic.exercises_fixation?.length || 0;
  const examCount = topic.exercises_exam?.length || 0;

  // Tabs configuration
  const tabs = [
    {
      id: 'teoria' as TabType,
      label: 'Teoria',
      icon: Book,
      color: 'teal',
      available: true
    },
    {
      id: 'exercicios-fixacao' as TabType,
      label: 'Exercício de Fixação',
      icon: PenTool,
      color: 'blue',
      count: fixationCount,
      available: fixationCount > 0
    },
    {
      id: 'exercicios-prova' as TabType,
      label: 'Tempo Sobrando?\nExercícios de Prova',
      icon: Clock,
      color: 'purple',
      count: examCount,
      available: examCount > 0
    }
  ];

  const getTabColorClasses = (color: string, isActive: boolean) => {
    const colors = {
      teal: isActive
        ? 'bg-teal-500 text-white border-teal-500'
        : 'bg-white text-teal-600 border-gray-200 hover:border-teal-300',
      blue: isActive
        ? 'bg-blue-500 text-white border-blue-500'
        : 'bg-white text-blue-600 border-gray-200 hover:border-blue-300',
      purple: isActive
        ? 'bg-purple-500 text-white border-purple-500'
        : 'bg-white text-purple-600 border-gray-200 hover:border-purple-300'
    };
    return colors[color as keyof typeof colors] || colors.teal;
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-1" />
              VOLTAR
            </button>
            <div className="h-6 w-px bg-gray-300" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">{topic.title}</h1>
              <p className="text-sm text-gray-500">{courseTitle}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Botão de Vídeo Alternativo */}
            {topic.videos && topic.videos.length > 0 && (
              <button
                onClick={() => setShowVideo(!showVideo)}
                className="flex items-center px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
              >
                <Play className="w-4 h-4 mr-2" />
                {showVideo ? 'Ver Texto' : 'Alternar para vídeo >>'}
              </button>
            )}

            {/* Botão de Completar */}
            <button
              onClick={() => onTopicComplete(topic.id, !topic.completed)}
              className={`
                flex items-center px-4 py-2 rounded-lg transition-colors
                ${topic.completed
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }
              `}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {topic.completed ? 'Concluído' : 'Marcar como Concluído'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center space-x-1 mt-4">
          {tabs.map((tab) => {
            if (!tab.available && tab.id !== 'teoria') return null;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center px-4 py-2 rounded-t-lg border-b-2 font-medium text-sm transition-all duration-200
                  ${getTabColorClasses(tab.color, activeTab === tab.id)}
                  ${!tab.available ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                disabled={!tab.available}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                <span className="whitespace-pre-line leading-tight">{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`
                    ml-2 px-2 py-1 rounded-full text-xs font-bold
                    ${activeTab === tab.id ? 'bg-white bg-opacity-20' : 'bg-gray-100 text-gray-600'}
                  `}>
                    ({tab.count})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {showVideo && topic.videos && topic.videos.length > 0 ? (
          // Área de Vídeo
          <div className="h-full flex items-center justify-center bg-black">
            <div className="text-center text-white">
              <div className="w-16 h-16 mx-auto mb-4 bg-teal-500 rounded-full flex items-center justify-center">
                <Play className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-medium mb-2">Vídeo: {topic.title}</h3>
              <p className="text-gray-300 mb-4">12min</p>
              <button className="px-6 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors">
                Reproduzir
              </button>
            </div>
          </div>
        ) : (
          // Área de Conteúdo por Abas
          <div className="h-full overflow-auto">
            {activeTab === 'teoria' && (
              <RespondeAiAulaTexto
                topic={topic}
                onDoubtClick={onDoubtClick}
              />
            )}

            {activeTab === 'exercicios-fixacao' && (
              <RespondeAiExercises
                exercises={topic.exercises_fixation || []}
                type="fixation"
                topicTitle={topic.title}
              />
            )}

            {activeTab === 'exercicios-prova' && (
              <RespondeAiExercises
                exercises={topic.exercises_exam || []}
                type="exam"
                topicTitle={topic.title}
              />
            )}
          </div>
        )}
      </div>

      {/* Bloqueio de Conteúdo */}
      {activeTab !== 'teoria' && tabs.find(t => t.id === activeTab)?.available === false && (
        <div className="absolute inset-0 bg-white bg-opacity-95 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
              <PenTool className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Conteúdo Bloqueado
            </h3>
            <p className="text-gray-600">
              Complete os primeiros 5 tópicos para desbloquear o restante do curso.
            </p>
            <div className="mt-4 text-sm text-gray-500">
              Progresso: 0/5 tópicos concluídos
            </div>
          </div>
        </div>
      )}
    </div>
  );
}