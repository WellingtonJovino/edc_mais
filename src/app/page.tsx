'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Brain, Youtube, Upload, FileText } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ChatInterface from '@/components/ChatInterface';
import LearningPlan from '@/components/LearningPlan';
import FileUpload from '@/components/FileUpload';
import UserQuestionnaire from '@/components/UserQuestionnaire';
import TinySyllabusEditor from '@/components/TinySyllabusEditor';
import { LearningPlan as LearningPlanType, ChatMessage, UploadedFile } from '@/types';
import { getProfileLabels } from '@/lib/profileLabels';

interface UserProfile {
  level: 'beginner' | 'intermediate' | 'advanced';
  purpose: string;
  timeAvailable: string;
  background: string;
  specificGoals: string;
  learningStyle: string;
  priorKnowledge?: string;
}

interface SyllabusData {
  title: string;
  description?: string;
  modules: any[];
  level: string;
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

  // Novos estados para o fluxo do syllabus
  const [currentSyllabus, setCurrentSyllabus] = useState<SyllabusData | null>(null);
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);

  const handleSendMessage = async (message: string, files?: UploadedFile[]) => {
    // Detectar comando para gerar curso de pré-requisito
    const prerequisiteMatch = message.match(/gerar\s+curso\s+de\s+(.+)/i);
    if (prerequisiteMatch) {
      const prerequisiteName = prerequisiteMatch[1].trim();
      await handleGeneratePrerequisiteCourse(prerequisiteName, message);
      return;
    }

    // Se não há syllabus atual, mostrar questionário primeiro
    if (!currentSyllabus) {
      setPendingMessage(message);
      setShowQuestionnaire(true);
      return;
    }

    // Chat adicional quando já há syllabus - para modificações
    const userMessage: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Simular resposta da IA para modificações
      const aiMessage: ChatMessage = {
        id: `msg-ai-${Date.now()}`,
        role: 'assistant',
        content: `🤖 Entendi sua solicitação! Para modificar "${currentSyllabus.title}", você pode:

📝 Editar diretamente - Use o editor ao lado para fazer as alterações
🔄 Regenerar syllabus - Me dê instruções específicas e posso criar uma nova versão

Como gostaria de proceder?`,
        timestamp: new Date().toISOString(),
      };

      setTimeout(() => {
        setMessages(prev => [...prev, aiMessage]);
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Erro:', error);
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

  // Função para gerar curso de pré-requisito
  const handleGeneratePrerequisiteCourse = async (prerequisiteName: string, originalMessage: string) => {
    const userMessage: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      content: originalMessage,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Criar mensagem especializada para pré-requisito
      const prerequisiteMessage = `Quero aprender ${prerequisiteName} como pré-requisito

Perfil do usuário:
- Nível: beginner
- Objetivo: academic
- Tempo disponível: moderate
- Experiência prévia: Este é um curso de pré-requisito para outra matéria
- Objetivos específicos: Adquirir base necessária para prosseguir em outros cursos`;

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: prerequisiteMessage,
          uploadedFiles: [],
          userProfile: {
            level: 'beginner',
            purpose: 'academic',
            timeAvailable: 'moderate',
            background: 'Este é um curso de pré-requisito',
            specificGoals: 'Adquirir base necessária para outros cursos'
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Falha na resposta do servidor');
      }

      const data = await response.json();

      if (data.success && data.syllabus) {
        setCurrentSyllabus(data.syllabus);

        const successMessage: ChatMessage = {
          id: `msg-prerequisite-${Date.now()}`,
          role: 'assistant',
          content: `📚 **Curso de Pré-requisito Gerado!**

✨ "${data.syllabus.title}"

Este curso foi criado especificamente como **pré-requisito** para te dar a base necessária antes de prosseguir com outros estudos mais avançados.

🎯 **Características deste curso:**
• Focado nos conceitos fundamentais
• Estruturado para preparar você para próximos cursos
• Nível adequado para construir uma base sólida

Agora você pode:
• Editar e personalizar o conteúdo
• Ajustar a profundidade dos tópicos
• Gerar as aulas quando estiver satisfeito

Quando completar este pré-requisito, estará pronto para cursos mais avançados! 🚀`,
          timestamp: new Date().toISOString(),
        };

        setMessages(prev => [...prev, successMessage]);
      } else {
        throw new Error(data.error || 'Erro ao gerar curso de pré-requisito');
      }
    } catch (error) {
      console.error('Erro ao gerar curso de pré-requisito:', error);

      const errorMessage: ChatMessage = {
        id: `msg-error-prerequisite-${Date.now()}`,
        role: 'assistant',
        content: `❌ Desculpe, houve um erro ao gerar o curso de pré-requisito "${prerequisiteName}".

Tente novamente ou especifique o nome de forma diferente.

💡 **Dica:** Use nomes completos como:
• "Cálculo A" ou "Cálculo I"
• "Álgebra Linear"
• "Física I"
• "Programação I"`,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuestionnaireComplete = async (profile: UserProfile, originalMessage: string) => {
    setShowQuestionnaire(false);

    // Obter labels em português para exibição
    const profileLabels = getProfileLabels(profile);

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
      content: `${originalMessage}

Perfil de Aprendizado:
• Nível: ${profileLabels.level}
• Objetivo: ${profileLabels.purpose}
• Tempo disponível: ${profileLabels.timeAvailable}
• Experiência prévia: ${profile.background || 'Não informado'}
• Objetivos específicos: ${profile.specificGoals || 'Não informado'}`,
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

      if (data.success && data.structure) {
        // Converter estrutura da API para o formato do syllabus
        const syllabusData = {
          title: data.structure.goal.title,
          description: data.structure.goal.description,
          modules: data.structure.goal.modules || [],
          level: data.structure.goal.level
        };

        setCurrentSyllabus(syllabusData);

        // Construir mensagem de resposta com informações de pré-requisitos
        let responseContent = `✨ Estrutura do curso criada!

📋 "${syllabusData.title}"`;

        // Adicionar detalhes dos pré-requisitos se existirem
        if (data.structure.goal.prerequisites && data.structure.goal.prerequisites.length > 0) {
          responseContent += `\n\n⚠️ ATENÇÃO: Pré-requisitos Identificados

Para fazer este curso com sucesso, você precisa ter conhecimento prévio em:

`;

          data.structure.goal.prerequisites.forEach((prereq: any, index: number) => {
            const importanceIcon = prereq.importance === 'essential' ? '🔴' :
                                  prereq.importance === 'recommended' ? '🟡' : '🟢';

            responseContent += `${importanceIcon} ${prereq.topic}
   ${prereq.description}

`;
          });

          responseContent += `Recomendação: Certifique-se de dominar esses conceitos antes de prosseguir.`;
        }

        responseContent += `

Agora você pode:
• Editar livremente - Adicione, remova ou modifique tópicos no editor
• Reorganizar - Mude a ordem dos módulos e tópicos
• Personalizar - Ajuste o conteúdo às suas necessidades

🤖 Precisa de ajuda da IA? Você pode me pedir para:
• Adicionar mais tópicos específicos
• Reorganizar a estrutura
• Mudar o nível de dificuldade
• Refazer tudo com novas instruções`;

        // Se há pré-requisitos, adicionar sugestão de geração
        if (data.structure.goal.prerequisites && data.structure.goal.prerequisites.length > 0) {
          responseContent += `
• Gerar curso de pré-requisito - Digite "Gerar curso de [nome]"`;
        }

        responseContent += `

Quando estiver satisfeito, clique em "Gerar Curso" para criar as aulas!`;

        // Adicionar mensagem de sucesso
        const successMessage: ChatMessage = {
          id: `msg-syllabus-${Date.now()}`,
          role: 'assistant',
          content: responseContent,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, successMessage]);

        // Limpar arquivos após envio bem-sucedido
        if (uploadedFiles.length > 0) {
          setUploadedFiles([]);
        }
      } else {
        console.error('❌ Resposta do servidor:', data);
        throw new Error(data.error || 'Erro desconhecido no servidor');
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

  // Funções para o syllabus
  const handleSyllabusUpdate = (updatedSyllabus: SyllabusData) => {
    setCurrentSyllabus(updatedSyllabus);
  };

  const handleCreateCourse = async (finalSyllabus: SyllabusData) => {
    setIsCreatingCourse(true);

    try {
      const response = await fetch('/api/create-course', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          syllabus: finalSyllabus,
          uploadedFiles: uploadedFiles
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao criar curso');
      }

      const data = await response.json();

      if (data.success && data.courseId) {
        // Adicionar mensagem de sucesso
        const successMessage: ChatMessage = {
          id: `msg-course-created-${Date.now()}`,
          role: 'assistant',
          content: '🎉 Curso criado com sucesso! Redirecionando para a página do curso...',
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, successMessage]);

        // Redirecionar para o curso
        setTimeout(() => {
          router.push(`/courses/${data.courseId}`);
        }, 2000);
      } else {
        throw new Error(data.error || 'Erro ao criar curso');
      }
    } catch (error) {
      console.error('Erro ao criar curso:', error);

      const errorMessage: ChatMessage = {
        id: `msg-course-error-${Date.now()}`,
        role: 'assistant',
        content: 'Erro ao criar o curso. Tente novamente.',
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsCreatingCourse(false);
    }
  };

  const handleSyllabusCancel = () => {
    setCurrentSyllabus(null);
    setMessages([]);
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
    <div className="h-screen flex flex-col overflow-hidden" style={{
      background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 50%, #90caf9 100%)'
    }}>
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 shadow-md flex-shrink-0">
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

            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
            {/* Chat Panel */}
            <div className="bg-white rounded-lg border border-gray-200 flex flex-col h-full overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex-shrink-0">
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
              <div className="flex-1 min-h-0 overflow-hidden">
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

            {/* Syllabus/Learning Plan Panel */}
            <div className="h-full overflow-hidden">
              {currentSyllabus ? (
                <TinySyllabusEditor
                  syllabus={currentSyllabus}
                  onSyllabusUpdate={handleSyllabusUpdate}
                  onCreateCourse={handleCreateCourse}
                  onCancel={handleSyllabusCancel}
                  isCreating={isCreatingCourse}
                />
              ) : currentPlan ? (
                <div className="bg-gray-50 rounded-lg p-4 overflow-y-auto h-full">
                  <LearningPlan
                    plan={currentPlan}
                    onTopicComplete={handleTopicComplete}
                    progress={currentPlan.progress}
                  />
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-center">
                  <div className="max-w-md">
                    <Brain className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-800 mb-2">
                      Pronto para começar?
                    </h3>
                    <p className="text-gray-700">
                      Descreva sua área de estudo e receba um curso estruturado com aulas
                      científicas, vídeos especializados e exercícios práticos.
                    </p>
                  </div>
                </div>
              )}
            </div>
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