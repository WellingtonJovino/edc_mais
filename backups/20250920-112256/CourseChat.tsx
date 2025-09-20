'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, X, Brain, Loader2, AlertTriangle, BookOpen, Clock } from 'lucide-react';
import { SupportCourse } from '@/types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  topicContext?: string;
}

interface CourseChatProps {
  courseId: string;
  courseTitle: string;
  currentTopic?: {
    id: string;
    title: string;
  };
}

export default function CourseChat({ courseId, courseTitle, currentTopic }: CourseChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedCourses, setSuggestedCourses] = useState<SupportCourse[]>([]);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Carregar mensagens salvas quando abrir o chat
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      loadChatHistory();
    }
  }, [isOpen]);

  const loadChatHistory = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}/chat`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.messages) {
          setMessages(data.messages);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar histórico do chat:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    const userMessage: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
      topicContext: currentTopic?.title
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`/api/courses/${courseId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          courseTitle,
          currentTopic,
          chatHistory: messages.slice(-5) // Últimas 5 mensagens para contexto
        }),
      });

      if (!response.ok) {
        throw new Error('Falha na resposta do servidor');
      }

      const data = await response.json();

      if (data.success) {
        const assistantMessage: ChatMessage = {
          id: `msg-assistant-${Date.now()}`,
          role: 'assistant',
          content: data.response,
          timestamp: new Date().toISOString(),
          topicContext: currentTopic?.title
        };

        setMessages(prev => [...prev, assistantMessage]);

        // Verificar se há sugestões de cursos de apoio
        if (data.metadata?.difficultyAnalysis?.hasProblems) {
          setSuggestedCourses(data.metadata.difficultyAnalysis.suggestedSupportCourses || []);
          setShowSuggestion(true);
        }
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);

      const errorMessage: ChatMessage = {
        id: `msg-error-${Date.now()}`,
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro. Tente reformular sua pergunta.',
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const createSupportCourse = async (course: SupportCourse) => {
    try {
      setIsLoading(true);

      const response = await fetch('/api/courses/support/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          supportCourse: course,
          parentCourseId: courseId,
          userLevel: 'beginner'
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Adicionar mensagem informando sobre o curso criado
        const successMessage: ChatMessage = {
          id: `msg-support-${Date.now()}`,
          role: 'assistant',
          content: `🎉 Curso de apoio "${course.title}" criado com sucesso! \n\nEste curso foi especialmente projetado para fortalecer sua base. Você pode acessá-lo na lista de cursos.\n\n💡 Recomendo completar este curso antes de continuar com o tópico atual.`,
          timestamp: new Date().toISOString(),
        };

        setMessages(prev => [...prev, successMessage]);
        setShowSuggestion(false);

        // Opcionalmente, redirecionar para o novo curso
        setTimeout(() => {
          if (confirm('Gostaria de ir para o curso de apoio agora?')) {
            window.open(`/courses/${data.course.id}`, '_blank');
          }
        }, 1000);

      } else {
        throw new Error(data.error || 'Erro ao criar curso de apoio');
      }
    } catch (error) {
      console.error('Erro ao criar curso de apoio:', error);

      const errorMessage: ChatMessage = {
        id: `msg-error-support-${Date.now()}`,
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao criar o curso de apoio. Tente novamente.',
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all duration-200 hover:scale-105"
          title="Tirar dúvidas com a IA"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 h-[500px] bg-white border border-gray-200 rounded-lg shadow-xl flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain className="w-5 h-5" />
            <div>
              <h3 className="font-semibold text-sm">Assistente do Curso</h3>
              <p className="text-xs opacity-90">Tire suas dúvidas em tempo real</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {currentTopic && (
          <div className="mt-2 text-xs bg-white/20 rounded px-2 py-1">
            📖 Contexto: {currentTopic.title}
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[500px]"
      >
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <Brain className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium mb-1">👋 Como posso ajudar?</p>
            <div className="text-xs space-y-1">
              <p>💡 "Não entendi a parte sobre limites"</p>
              <p>🔍 "Pode explicar com outro exemplo?"</p>
              <p>❓ "Qual a diferença entre X e Y?"</p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>

                {message.topicContext && (
                  <div className={`text-xs mt-1 opacity-70 ${
                    message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    📖 {message.topicContext}
                  </div>
                )}

                <div className={`text-xs mt-1 opacity-70 ${
                  message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {new Date(message.timestamp).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-3 py-2 text-sm">
              <div className="flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span className="text-gray-600">Pensando...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Support Course Suggestion */}
      {showSuggestion && suggestedCourses.length > 0 && (
        <div className="border-t border-gray-200 p-3 bg-yellow-50">
          <div className="flex items-start space-x-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-yellow-900">
                💡 Detectamos que você pode estar com dificuldades
              </h4>
              <p className="text-xs text-yellow-700 mt-1">
                Seria útil revisar alguns conceitos básicos primeiro?
              </p>
            </div>
            <button
              onClick={() => setShowSuggestion(false)}
              className="text-yellow-600 hover:text-yellow-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            {suggestedCourses.slice(0, 2).map((course, index) => (
              <div key={course.id} className="bg-white border border-yellow-200 rounded p-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h5 className="text-sm font-medium text-gray-900 flex items-center space-x-1">
                      <BookOpen className="w-3 h-3 text-blue-600" />
                      <span>{course.title}</span>
                    </h5>
                    <p className="text-xs text-gray-600 mt-1">{course.description}</p>
                    <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{course.estimatedDuration}</span>
                      </div>
                      <span className="capitalize">{course.difficulty}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex space-x-2">
                  <button
                    onClick={() => createSupportCourse(course)}
                    className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors"
                  >
                    Criar Curso
                  </button>
                  <button
                    onClick={() => setShowSuggestion(false)}
                    className="text-xs text-gray-600 hover:text-gray-700"
                  >
                    Talvez depois
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-gray-200 p-3">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite sua dúvida..."
            disabled={isLoading}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="bg-blue-600 text-white rounded-lg px-3 py-2 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="w-full mt-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            Limpar conversa
          </button>
        )}
      </div>
    </div>
  );
}