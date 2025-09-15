'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Brain, Youtube, Upload, FileText } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ChatInterface from '@/components/ChatInterface';
import LearningPlan from '@/components/LearningPlan';
import FileUpload from '@/components/FileUpload';
import UserQuestionnaire from '@/components/UserQuestionnaire';
import { LearningPlan as LearningPlanType, ChatMessage, UploadedFile } from '@/types';

interface UserProfile {
  level: 'beginner' | 'intermediate' | 'advanced';
  purpose: string;
  timeAvailable: string;
  background: string;
  specificGoals: string;
  learningStyle: string;
}

export default function HomePage() {
  const router = useRouter();
  const [currentPlan, setCurrentPlan] = useState<LearningPlanType | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string>('');

  const handleSendMessage = async (message: string, files?: UploadedFile[]) => {
    // Se não há plano atual, mostrar questionário primeiro
    if (!currentPlan) {
      setPendingMessage(message);
      setShowQuestionnaire(true);
      return;
    }
    
    // Use os arquivos passados como parâmetro ou os arquivos já enviados
    const filesToSend = files || uploadedFiles;
    const userMessage: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, uploadedFiles: filesToSend }),
      });

      if (!response.ok) {
        throw new Error('Falha na resposta do servidor');
      }

      const data = await response.json();
      
      if (data.success) {
        setCurrentPlan(data.plan);
        setMessages(data.plan.messages);
        // Limpar arquivos após envio bem-sucedido
        if (filesToSend.length > 0) {
          setUploadedFiles([]);
        }

        // Adicionar mensagem de redirecionamento
        const redirectMessage: ChatMessage = {
          id: `msg-redirect-${Date.now()}`,
          role: 'assistant',
          content: '🎉 Curso criado com sucesso! Redirecionando para a página do curso em alguns segundos...',
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, redirectMessage]);

        // Redirecionar automaticamente para a página do curso após 3 segundos
        setTimeout(() => {
          if (data.plan.courseId) {
            router.push(`/courses/${data.plan.courseId}`);
          }
        }, 3000);
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
      
      const errorMessage: ChatMessage = {
        id: `msg-error-${Date.now()}`,
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar sua solicitação. Tente novamente.',
        timestamp: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilesUploaded = (files: UploadedFile[]) => {
    setUploadedFiles(prev => [...prev, ...files]);
    setShowFileUpload(false);
  };

  const removeUploadedFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleQuestionnaireComplete = async (profile: UserProfile, originalMessage: string) => {
    setShowQuestionnaire(false);
    
    // Criar mensagem enriquecida com informações do perfil
    const enrichedMessage = `${originalMessage}

Perfil do usuário:
- Nível: ${profile.level}
- Objetivo: ${profile.purpose}
- Tempo disponível: ${profile.timeAvailable}
- Experiência prévia: ${profile.background || 'Nenhuma experiência informada'}
- Objetivos específicos: ${profile.specificGoals || 'Não especificados'}`;

    const userMessage: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      content: originalMessage,
      timestamp: new Date().toISOString(),
    };

    setMessages([userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: enrichedMessage, 
          uploadedFiles: uploadedFiles,
          userProfile: profile 
        }),
      });

      if (!response.ok) {
        throw new Error('Falha na resposta do servidor');
      }

      const data = await response.json();
      
      if (data.success) {
        setCurrentPlan(data.plan);
        setMessages(data.plan.messages);
        // Limpar arquivos após envio bem-sucedido
        if (uploadedFiles.length > 0) {
          setUploadedFiles([]);
        }

        // Adicionar mensagem de redirecionamento
        const redirectMessage: ChatMessage = {
          id: `msg-redirect-quest-${Date.now()}`,
          role: 'assistant',
          content: '🎉 Curso personalizado criado! Redirecionando para a página do curso em alguns segundos...',
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, redirectMessage]);

        // Redirecionar automaticamente para a página do curso após 3 segundos
        setTimeout(() => {
          if (data.plan.courseId) {
            router.push(`/courses/${data.plan.courseId}`);
          }
        }, 3000);
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
      
      const errorMessage: ChatMessage = {
        id: `msg-error-${Date.now()}`,
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar sua solicitação. Tente novamente.',
        timestamp: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setPendingMessage('');
    }
  };

  const handleQuestionnaireBack = () => {
    setShowQuestionnaire(false);
    setPendingMessage('');
  };

  const handleTopicComplete = async (topicId: string, completed: boolean) => {
    if (!currentPlan) return;

    try {
      const response = await fetch(`/api/plans/${currentPlan.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update_topic_progress',
          data: { topicId, completed },
        }),
      });

      if (response.ok) {
        const updatedPlan = await response.json();
        setCurrentPlan(updatedPlan);
      }
    } catch (error) {
      console.error('Erro ao atualizar progresso:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">EDC+ Plataforma Educacional</h1>
                <p className="text-sm text-gray-600">Ensino superior personalizado com IA científica</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              <Link 
                href="/courses"
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                <span>Meus Cursos</span>
              </Link>
              
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <Brain className="w-4 h-4 text-blue-600" />
                  <span>OpenAI</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Youtube className="w-4 h-4 text-red-500" />
                  <span>YouTube</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Brain className="w-4 h-4 text-green-600" />
                  <span>Perplexity</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-200px)]">
          {/* Chat Panel */}
          <div className="bg-white rounded-lg border border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-gray-900">Assistente Educacional</h2>
                <button
                  onClick={() => setShowFileUpload(true)}
                  className="flex items-center space-x-2 px-3 py-2 text-sm bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-sm"
                >
                  <Upload className="w-4 h-4" />
                  <span>Enviar PDFs</span>
                </button>
              </div>
              <p className="text-sm text-gray-600">
                Conte o que deseja estudar e receba um curso científico personalizado
              </p>
            </div>
            <div className="flex-1 min-h-0">
              <ChatInterface
                messages={messages}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                placeholder="Ex: Quero estudar Mecânica Vetorial para Engenharia..."
                uploadedFiles={uploadedFiles}
                onRemoveFile={removeUploadedFile}
              />
            </div>
          </div>

          {/* Learning Plan Panel */}
          <div className="bg-gray-50 rounded-lg p-4 overflow-y-auto">
            {currentPlan ? (
              <LearningPlan
                plan={currentPlan}
                onTopicComplete={handleTopicComplete}
                progress={currentPlan.progress}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-center">
                <div className="max-w-md">
                  <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Pronto para começar?
                  </h3>
                  <p className="text-gray-600">
                    Descreva sua área de estudo e receba um curso estruturado com aulas
                    científicas, vídeos especializados e exercícios práticos.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* File Upload Modal */}
      {showFileUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Materiais de Estudo</h3>
              </div>
              <button
                onClick={() => setShowFileUpload(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Envie seus PDFs acadêmicos, apostilas, livros ou notas de aula.
              O sistema analisará o conteúdo para personalizar ainda mais seu curso.
            </p>
            <FileUpload
              onFilesUploaded={handleFilesUploaded}
              maxFiles={5}
              maxSizeBytes={10 * 1024 * 1024}
              acceptedTypes={['.pdf', '.txt', '.md', '.docx']}
            />
          </div>
        </div>
      )}

      {/* User Questionnaire Modal */}
      {showQuestionnaire && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <UserQuestionnaire
              originalMessage={pendingMessage}
              onComplete={handleQuestionnaireComplete}
              onBack={handleQuestionnaireBack}
            />
          </div>
        </div>
      )}
    </div>
  );
}