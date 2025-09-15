'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, Calendar, Clock, FileText, MessageCircle, CheckCircle, Play, Video, Lock, Download, Loader2 } from 'lucide-react';
import { getCourse, updateCourseProgress, type Course, type CourseTopic } from '@/lib/supabase';
import Link from 'next/link';
import VideoPlayer from '@/components/VideoPlayer';
import AcademicContent from '@/components/AcademicContent';
import CourseChat from '@/components/CourseChat';
import HierarchicalCourseView from '@/components/HierarchicalCourseView';
import PrerequisitesSection from '@/components/PrerequisitesSection';

export default function CoursePage() {
  const params = useParams();
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [contentType, setContentType] = useState<'videos' | 'academic'>('videos');
  const [loadingContent, setLoadingContent] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      loadCourse(params.id as string);
    }
  }, [params.id]);

  const loadCourse = async (id: string) => {
    try {
      setLoading(true);
      const courseData = await getCourse(id);
      if (!courseData) {
        router.push('/courses');
        return;
      }
      setCourse(courseData);
    } catch (error) {
      console.error('Erro ao carregar curso:', error);
      router.push('/courses');
    } finally {
      setLoading(false);
    }
  };

  const handleTopicComplete = async (topicId: string, completed: boolean) => {
    if (!course) return;
    
    try {
      setUpdating(topicId);
      await updateCourseProgress(course.id, topicId, completed);
      
      // Atualizar estado local
      setCourse(prev => {
        if (!prev) return prev;
        
        const updatedTopics = prev.topics?.map(topic =>
          topic.id === topicId ? { ...topic, completed } : topic
        ) || [];
        
        const completedCount = updatedTopics.filter(t => t.completed).length;
        const progress = Math.round((completedCount / updatedTopics.length) * 100);
        
        return {
          ...prev,
          topics: updatedTopics,
          progress
        };
      });
    } catch (error) {
      console.error('Erro ao atualizar progresso:', error);
    } finally {
      setUpdating(null);
    }
  };

  const loadTopicContent = async (topicId: string, topicTitle: string) => {
    if (!course) return;
    
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
          courseId: course.id
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update course data with loaded content
        setCourse(prev => {
          if (!prev) return prev;
          
          const updatedTopics = prev.topics?.map(topic => 
            topic.id === topicId 
              ? { 
                  ...topic, 
                  videos: data.data.videos || [], 
                  academic_content: data.data.academicContent 
                }
              : topic
          ) || [];
          
          return {
            ...prev,
            topics: updatedTopics
          };
        });
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

  const toggleTopic = (topicId: string) => {
    setExpandedTopic(expandedTopic === topicId ? null : topicId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLevelLabel = (level: string) => {
    switch (level.toLowerCase()) {
      case 'beginner': return 'Iniciante';
      case 'intermediate': return 'Intermediário';
      case 'advanced': return 'Avançado';
      default: return level;
    }
  };

  // Access control logic
  const first5Topics = course?.topics?.slice(0, 5) || [];
  const completedFirst5 = first5Topics.filter(t => t.completed).length;
  const canAccessRestrictedTopics = completedFirst5 >= 5;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando curso...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Curso não encontrado</h3>
          <Link href="/courses" className="text-blue-600 hover:text-blue-700">
            ← Voltar aos cursos
          </Link>
        </div>
      </div>
    );
  }

  // Verificar se o curso tem estrutura hierárquica (módulos)
  const hasHierarchicalStructure = course?.modules && course.modules.length > 0;

  const handleDoubtClick = (topicId: string, topicTitle: string) => {
    // Implementar abertura do chat com contexto do tópico
    console.log('Abrir chat para tópico:', topicTitle);
  };

  if (hasHierarchicalStructure) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header Simples para Vista Hierárquica */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center px-6">
          <div className="flex items-center space-x-4">
            <Link href="/courses" className="text-blue-600 hover:text-blue-700">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{course.title}</h1>
              <div className="flex items-center space-x-3 text-sm text-gray-500">
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getLevelColor(course.level)}`}>
                  {getLevelLabel(course.level)}
                </span>
                <span>{course.progress}% concluído</span>
              </div>
            </div>
          </div>
        </header>

        {/* Vista Hierárquica */}
        <div className="h-[calc(100vh-4rem)]">
          <HierarchicalCourseView
            modules={course.modules}
            courseId={course.id}
            courseTitle={course.title}
            onTopicComplete={handleTopicComplete}
            onDoubtClick={handleDoubtClick}
          />
        </div>

        {/* Chat Interativo */}
        <CourseChat
          courseId={course.id}
          courseTitle={course.title}
          currentTopic={undefined}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/courses" className="text-blue-600 hover:text-blue-700">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 line-clamp-1">{course.title}</h1>
                <div className="flex items-center space-x-3 text-sm text-gray-500">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getLevelColor(course.level)}`}>
                    {getLevelLabel(course.level)}
                  </span>
                  <span>{course.progress}% concluído</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Course Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Prerequisites Section */}
            {course.prerequisites && course.prerequisites.length > 0 && (
              <PrerequisitesSection prerequisites={course.prerequisites} />
            )}

            {/* Progress Overview */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Progresso do Curso</h2>
                <span className="text-2xl font-bold text-blue-600">{course.progress}%</span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                <div 
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${course.progress}%` }}
                ></div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{course.total_topics}</div>
                  <div className="text-sm text-gray-500">Total</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {course.topics?.filter(t => t.completed).length || 0}
                  </div>
                  <div className="text-sm text-gray-500">Concluídos</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">
                    {(course.topics?.filter(t => !t.completed).length || 0)}
                  </div>
                  <div className="text-sm text-gray-500">Restantes</div>
                </div>
              </div>
            </div>

            {/* Topics with Full Learning Experience */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Conteúdo do Curso</h2>
              
              <div className="space-y-4">
                {course.topics?.map((topic, index) => (
                  <TopicCard
                    key={topic.id}
                    topic={topic}
                    index={index}
                    isExpanded={expandedTopic === topic.id}
                    onToggle={() => toggleTopic(topic.id)}
                    onComplete={(completed) => handleTopicComplete(topic.id, completed)}
                    onLoadContent={() => loadTopicContent(topic.id, topic.title)}
                    updating={updating === topic.id}
                    loadingContent={loadingContent === topic.id}
                    canAccess={topic.order_index <= 4 || canAccessRestrictedTopics}
                    isLocked={topic.order_index > 4 && !canAccessRestrictedTopics}
                    contentType={contentType}
                    setContentType={setContentType}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Course Info */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Informações do Curso</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Criado em:</span>
                  <span className="text-gray-900">{formatDate(course.created_at)}</span>
                </div>
                
                {course.updated_at !== course.created_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Atualizado:</span>
                    <span className="text-gray-900">{formatDate(course.updated_at)}</span>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Nível:</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getLevelColor(course.level)}`}>
                    {getLevelLabel(course.level)}
                  </span>
                </div>
              </div>
            </div>

            {/* Access Control Info */}
            {!canAccessRestrictedTopics && course.topics && course.topics.length > 5 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Lock className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-900">Conteúdo Bloqueado</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      Complete os primeiros 5 tópicos para desbloquear o restante do curso.
                    </p>
                    <div className="text-sm text-yellow-600 mt-2">
                      Progresso: {completedFirst5}/5 tópicos concluídos
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Files */}
            {course.files && course.files.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Arquivos Enviados</h3>
                
                <div className="space-y-2">
                  {course.files.map((file) => (
                    <div key={file.id} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{file.name}</div>
                        <div className="text-xs text-gray-500">
                          {file.size ? Math.round(file.size / 1024) + ' KB' : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Messages Count */}
            {course.messages && course.messages.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center space-x-3">
                  <MessageCircle className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="font-semibold text-gray-900">Conversa Salva</div>
                    <div className="text-sm text-gray-500">
                      {course.messages.length} mensagem(s) na conversa original
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Chat Interativo */}
      <CourseChat
        courseId={course.id}
        courseTitle={course.title}
        currentTopic={
          expandedTopic
            ? course.topics?.find(t => t.id === expandedTopic)
              ? { id: expandedTopic, title: course.topics.find(t => t.id === expandedTopic)!.title }
              : undefined
            : undefined
        }
      />
    </div>
  );
}

// Topic Card Component with Full Learning Experience
interface TopicCardProps {
  topic: CourseTopic;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onComplete: (completed: boolean) => void;
  onLoadContent: () => void;
  updating: boolean;
  loadingContent: boolean;
  canAccess: boolean;
  isLocked: boolean;
  contentType: 'videos' | 'academic';
  setContentType: (type: 'videos' | 'academic') => void;
}

function TopicCard({ 
  topic, 
  index, 
  isExpanded, 
  onToggle, 
  onComplete, 
  onLoadContent,
  updating,
  loadingContent,
  canAccess,
  isLocked,
  contentType,
  setContentType
}: TopicCardProps) {
  const hasVideos = topic.videos && topic.videos.length > 0;
  const hasAcademicContent = topic.academic_content;
  const hasContent = hasVideos || hasAcademicContent;

  if (isLocked) {
    return (
      <div className="border border-gray-300 rounded-lg overflow-hidden opacity-60 bg-gray-50">
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
    <div className={`border rounded-lg overflow-hidden transition-colors ${
      topic.completed ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
    }`}>
      {/* Topic Header */}
      <div 
        className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
              {index + 1}
            </span>
            <div>
              <h3 className={`font-semibold ${topic.completed ? 'text-green-900 line-through' : 'text-gray-900'}`}>
                {topic.title}
              </h3>
              {topic.description && (
                <p className="text-sm text-gray-600">{topic.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {hasContent ? (
              <span className="text-sm text-gray-500">
                {hasVideos ? `${topic.videos.length} vídeos` : ''}
                {hasVideos && hasAcademicContent ? ' • ' : ''}
                {hasAcademicContent ? 'Conteúdo acadêmico' : ''}
              </span>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onLoadContent();
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
            <button
              onClick={(e) => {
                e.stopPropagation();
                onComplete(!topic.completed);
              }}
              disabled={updating}
              className={`flex-shrink-0 p-2 rounded-full transition-colors ${
                topic.completed 
                  ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              } disabled:opacity-50`}
            >
              {updating ? (
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
            </button>
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
                  {hasVideos && (
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
                  )}
                  {hasAcademicContent && (
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
                {contentType === 'videos' && hasVideos ? (
                  <div className="space-y-4">
                    {topic.videos.map((video: any) => (
                      <VideoPlayerCard key={video.id || video.videoId} video={video} />
                    ))}
                  </div>
                ) : contentType === 'academic' && hasAcademicContent ? (
                  <AcademicContent content={topic.academic_content} />
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    {contentType === 'videos' ? 'Nenhum vídeo disponível.' : 'Conteúdo acadêmico não disponível.'}
                  </p>
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
                  onClick={onLoadContent}
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

// Video Player Card Component
interface VideoPlayerCardProps {
  video: any;
}

function VideoPlayerCard({ video }: VideoPlayerCardProps) {
  const [showPlayer, setShowPlayer] = useState(false);

  if (showPlayer) {
    const videoPlayerData = {
      id: video.id || video.videoId,
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
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-full h-full object-cover rounded-t-lg"
        />
        <div className="absolute inset-0 bg-black bg-opacity-30 group-hover:bg-opacity-40 transition-all flex items-center justify-center rounded-t-lg">
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
          <span>{video.channelTitle}</span>
        </div>
        <p className="text-sm text-gray-500 line-clamp-2 mb-3">
          {video.description}
        </p>
        <div className="flex items-center justify-between">
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