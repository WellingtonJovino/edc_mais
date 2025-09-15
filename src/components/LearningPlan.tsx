'use client';

import { useState } from 'react';
import { CheckCircle2, Circle, Play, Clock, User, BookOpen, Video, FileText, AlertCircle, CheckCircle, Upload, Search, Loader2, Lock, Download } from 'lucide-react';
import { LearningGoal, Topic, YouTubeVideo, LearningPlan as LearningPlanType } from '@/types';
import Image from 'next/image';
import AcademicContent from './AcademicContent';
import VideoPlayer from './VideoPlayer';
import PrerequisitesSection from './PrerequisitesSection';

interface LearningPlanProps {
  plan: LearningPlanType;
  onTopicComplete: (topicId: string, completed: boolean) => void;
  progress: number;
}

export default function LearningPlan({ plan, onTopicComplete, progress }: LearningPlanProps) {
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [expandedValidation, setExpandedValidation] = useState(false);
  const [loadingContent, setLoadingContent] = useState<string | null>(null);
  const [topicContent, setTopicContent] = useState<{[key: string]: {videos: any[], academicContent: any}}>({});
  const { goal } = plan;
  
  // Verificar quantos dos primeiros 5 tópicos foram completados
  const first5Topics = goal.topics.slice(0, 5);
  const completedFirst5 = first5Topics.filter(t => t.completed).length;
  const canAccessRestrictedTopics = completedFirst5 >= 5;

  const toggleTopic = (topicId: string) => {
    setExpandedTopic(expandedTopic === topicId ? null : topicId);
  };

  const handleTopicToggle = (topicId: string, completed: boolean) => {
    onTopicComplete(topicId, completed);
  };
  
  const loadTopicContent = async (topicId: string, topicTitle: string) => {
    setLoadingContent(topicId);
    
    try {
      const response = await fetch('/api/load-topic-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topicTitle,
          topicId,
          courseId: plan.courseId // Se houver ID do curso
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setTopicContent(prev => ({
          ...prev,
          [topicId]: {
            videos: data.data.videos,
            academicContent: data.data.academicContent
          }
        }));
      } else {
        console.error('Erro ao carregar conteúdo:', data.error);
        alert('Erro ao carregar conteúdo do tópico');
      }
    } catch (error) {
      console.error('Erro na requisição:', error);
      alert('Erro ao carregar conteúdo do tópico');
    } finally {
      setLoadingContent(null);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-2xl font-bold text-gray-900">{goal.title}</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            goal.level === 'beginner' ? 'bg-green-100 text-green-800' :
            goal.level === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {goal.level === 'beginner' ? 'Iniciante' :
             goal.level === 'intermediate' ? 'Intermediário' : 'Avançado'}
          </span>
        </div>
        
        <p className="text-gray-600 mb-4">{goal.description}</p>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-primary-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm text-gray-600 mt-2">{Math.round(progress)}% concluído</p>
      </div>

      {/* Prerequisites Section */}
      {plan.goal.prerequisites && plan.goal.prerequisites.length > 0 && (
        <PrerequisitesSection prerequisites={plan.goal.prerequisites} />
      )}

      {/* Validation and Analysis Section */}
      {(plan.topicValidation || plan.fileAnalysis || (plan.uploadedFiles && plan.uploadedFiles.length > 0)) && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg">
          <button
            onClick={() => setExpandedValidation(!expandedValidation)}
            className="w-full p-4 text-left flex items-center justify-between hover:bg-blue-100 transition-colors rounded-lg"
          >
            <div className="flex items-center space-x-3">
              <Search className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-blue-900">Personalização e Materiais</h3>
            </div>
            <div className={`transform transition-transform ${expandedValidation ? 'rotate-180' : ''}`}>
              ↓
            </div>
          </button>
          
          {expandedValidation && (
            <div className="px-4 pb-4 space-y-4">
              
              {/* Topic Validation */}
              {plan.topicValidation && (
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center space-x-2 mb-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <h4 className="font-medium text-gray-900">Pesquisa Acadêmica</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{plan.topicValidation.validationSummary}</p>
                  
                  {plan.topicValidation.missingTopics.length > 0 && (
                    <div className="mb-3">
                      <h5 className="font-medium text-orange-800 mb-2 flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4" />
                        <span>Tópicos identificados pela pesquisa:</span>
                      </h5>
                      <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                        {plan.topicValidation.missingTopics.map((topic, idx) => (
                          <li key={idx}>{topic}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {plan.topicValidation.additionalTopics.length > 0 && (
                    <div>
                      <h5 className="font-medium text-blue-800 mb-2">Sugestões complementares:</h5>
                      <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                        {plan.topicValidation.additionalTopics.map((topic, idx) => (
                          <li key={idx}>{topic}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* File Analysis */}
              {plan.uploadedFiles && plan.uploadedFiles.length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center space-x-2 mb-3">
                    <Upload className="w-5 h-5 text-blue-600" />
                    <h4 className="font-medium text-gray-900">Materiais de Estudo ({plan.uploadedFiles.length})</h4>
                  </div>
                  <div className="space-y-2 mb-3">
                    {plan.uploadedFiles.map((file) => (
                      <div key={file.id} className="flex items-center space-x-2 text-sm text-gray-600">
                        <FileText className="w-4 h-4" />
                        <span>{file.name}</span>
                        <span className="text-gray-400">({Math.round(file.size / 1024)} KB)</span>
                      </div>
                    ))}
                  </div>
                  
                  {plan.fileAnalysis && (
                    <div>
                      <h5 className="font-medium text-blue-800 mb-2">Análise dos Materiais:</h5>
                      <p className="text-sm text-gray-600 mb-2">{plan.fileAnalysis.coverageAnalysis}</p>
                      
                      {plan.fileAnalysis.extraInFiles.length > 0 && (
                        <div className="mb-2">
                          <span className="font-medium text-green-800 text-sm">Tópicos extras identificados:</span>
                          <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
                            {plan.fileAnalysis.extraInFiles.map((topic, idx) => (
                              <li key={idx}>{topic}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {plan.fileAnalysis.recommendations.length > 0 && (
                        <div>
                          <span className="font-medium text-purple-800 text-sm">Recomendações:</span>
                          <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
                            {plan.fileAnalysis.recommendations.map((rec, idx) => (
                              <li key={idx}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              
            </div>
          )}
        </div>
      )}

      {/* Topics */}
      <div className="space-y-4">
        {goal.topics
          .sort((a, b) => a.order - b.order)
          .map((topic) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              isExpanded={expandedTopic === topic.id}
              onToggle={() => toggleTopic(topic.id)}
              onComplete={(completed) => handleTopicToggle(topic.id, completed)}
              canAccess={topic.order <= 5 || canAccessRestrictedTopics}
              isLocked={topic.order > 5 && !canAccessRestrictedTopics}
            />
          ))}
      </div>
    </div>
  );
}

interface TopicCardProps {
  topic: Topic;
  isExpanded: boolean;
  onToggle: () => void;
  onComplete: (completed: boolean) => void;
  canAccess: boolean;
  isLocked: boolean;
}

function TopicCard({ topic, isExpanded, onToggle, onComplete, canAccess, isLocked }: TopicCardProps) {
  const [contentType, setContentType] = useState<'videos' | 'academic'>('videos');
  const [loadingContent, setLoadingContent] = useState(false);
  const [hasLoadedContent, setHasLoadedContent] = useState(topic.videos.length > 0 || !!topic.academicContent);

  const loadTopicContent = async () => {
    setLoadingContent(true);
    
    try {
      const response = await fetch('/api/load-topic-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topicTitle: topic.title,
          topicId: topic.id,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update topic data directly
        topic.videos = data.data.videos || [];
        topic.academicContent = data.data.academicContent || null;
        setHasLoadedContent(true);
      } else {
        console.error('Erro ao carregar conteúdo:', data.error);
        alert('Erro ao carregar conteúdo do tópico');
      }
    } catch (error) {
      console.error('Erro na requisição:', error);
      alert('Erro ao carregar conteúdo do tópico');
    } finally {
      setLoadingContent(false);
    }
  };

  const hasContent = hasLoadedContent && (topic.videos.length > 0 || topic.academicContent);
  
  if (isLocked) {
    return (
      <div className="border border-gray-300 rounded-lg overflow-hidden opacity-60 bg-gray-50">
        {/* Locked Topic Header */}
        <div className="p-4 bg-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-gray-400">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-500">
                  {topic.title}
                </h3>
                <p className="text-sm text-gray-400">{topic.description}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-400 bg-gray-200 px-3 py-1 rounded-full">
                Complete os 5 primeiros tópicos
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Topic Header */}
      <div 
        className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onComplete(!topic.completed);
              }}
              className="text-primary-600 hover:text-primary-700"
            >
              {topic.completed ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : (
                <Circle className="w-6 h-6" />
              )}
            </button>
            <div>
              <h3 className={`font-semibold ${topic.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                {topic.title}
              </h3>
              <p className="text-sm text-gray-600">{topic.description}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {hasContent ? (
              <span className="text-sm text-gray-500">
                {topic.videos.length} vídeos
                {topic.academicContent && ' • Conteúdo acadêmico'}
              </span>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  loadTopicContent();
                }}
                disabled={loadingContent}
                className="flex items-center space-x-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium hover:bg-blue-200 transition-colors disabled:opacity-50"
              >
                {loadingContent ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Carregando...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Carregar Conteúdo</span>
                  </>
                )}
              </button>
            )}
            <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
              ↓
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {isExpanded && (
        <div>
          {hasContent ? (
            <>
              {/* Content Type Selector */}
              <div className="border-b border-gray-200 px-4 py-2">
                <div className="flex space-x-1">
                  <button
                    onClick={() => setContentType('videos')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      contentType === 'videos'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Video className="w-4 h-4" />
                    <span>Vídeos ({topic.videos.length})</span>
                  </button>
                  {topic.academicContent && (
                    <button
                      onClick={() => setContentType('academic')}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        contentType === 'academic'
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>Conteúdo Acadêmico</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Content Display */}
              <div className="p-4">
                {contentType === 'videos' ? (
                  <div className="space-y-3">
                    {topic.videos.length > 0 ? (
                      topic.videos.map((video) => (
                        <VideoPlayerCard key={video.id} video={video} />
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-4">
                        Nenhum vídeo encontrado para este tópico.
                      </p>
                    )}
                  </div>
                ) : (
                  topic.academicContent ? (
                    <AcademicContent content={topic.academicContent} />
                  ) : (
                    <p className="text-gray-500 text-center py-4">
                      Conteúdo acadêmico não disponível para este tópico.
                    </p>
                  )
                )}
              </div>
            </>
          ) : (
            <div className="p-8 text-center bg-gray-50">
              <div className="flex flex-col items-center space-y-3">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                  <BookOpen className="w-8 h-8 text-gray-400" />
                </div>
                <h4 className="font-medium text-gray-900">Conteúdo não carregado</h4>
                <p className="text-sm text-gray-600 max-w-md">
                  Clique no botão "Carregar Conteúdo" acima para buscar vídeos e material acadêmico para este tópico.
                </p>
                <button
                  onClick={loadTopicContent}
                  disabled={loadingContent}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingContent ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Carregando...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Carregar Agora</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface VideoPlayerCardProps {
  video: YouTubeVideo;
}

function VideoPlayerCard({ video }: VideoPlayerCardProps) {
  const [showPlayer, setShowPlayer] = useState(false);

  if (showPlayer) {
    const videoPlayerData = {
      id: video.id,
      title: video.title,
      description: video.description,
      thumbnail: video.thumbnail,
      url: `https://www.youtube.com/watch?v=${video.videoId}`,
      duration: video.duration,
      channelTitle: video.channelTitle,
    };

    return (
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <VideoPlayer video={videoPlayerData} />
        <div className="p-3 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <User className="w-4 h-4" />
                <span>{video.channelTitle}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>{video.duration}</span>
              </div>
            </div>
            <button
              onClick={() => setShowPlayer(false)}
              className="text-gray-400 hover:text-gray-600 text-sm font-medium"
            >
              Fechar Player
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
      {/* Thumbnail */}
      <div 
        className="relative w-full h-48 cursor-pointer group"
        onClick={() => setShowPlayer(true)}
      >
        <Image
          src={video.thumbnail}
          alt={video.title}
          fill
          className="rounded-t object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-black bg-opacity-30 group-hover:bg-opacity-40 transition-all flex items-center justify-center rounded-t">
          <div className="bg-red-600 rounded-full p-3 group-hover:scale-110 transition-transform">
            <Play className="w-6 h-6 text-white ml-0.5" />
          </div>
        </div>
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
          {video.duration}
        </div>
      </div>

      {/* Video Info */}
      <div className="p-3">
        <h4 className="font-medium text-gray-900 line-clamp-2 mb-2">
          {video.title}
        </h4>
        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
          <div className="flex items-center space-x-1">
            <User className="w-4 h-4" />
            <span>{video.channelTitle}</span>
          </div>
        </div>
        <p className="text-sm text-gray-500 line-clamp-2">
          {video.description}
        </p>
        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={() => setShowPlayer(true)}
            className="flex items-center space-x-2 px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
          >
            <Play className="w-4 h-4" />
            <span>Assistir</span>
          </button>
          <a
            href={`https://www.youtube.com/watch?v=${video.videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-gray-600 text-sm"
          >
            Abrir no YouTube
          </a>
        </div>
      </div>
    </div>
  );
}