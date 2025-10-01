'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Brain, Youtube, Upload, FileText, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ChatInterface from '@/components/ChatInterface';
import FileUpload from '@/components/FileUpload';
import UserQuestionnaire from '@/components/UserQuestionnaire';
import TinySyllabusEditor from '@/components/TinySyllabusEditor';
import ThemeToggle from '@/components/ThemeToggle';
import { ChatMessage, UploadedFile } from '@/types';
import { getProfileLabels } from '@/lib/profileLabels';
import { useTheme } from '@/contexts/ThemeContext';

interface UserProfile {
  level: 'beginner' | 'intermediate' | 'advanced';
  purpose: string;
  timeAvailable: string;
  background: string;
  specificGoals: string;
  learningStyle: string;
  educationLevel?: 'high_school' | 'undergraduate' | 'graduate' | 'professional' | 'personal_development';
  priorKnowledge?: string;
}

interface SyllabusData {
  title: string;
  description?: string;
  modules: any[];
  level: string;
}

// Função helper para salvar curso no localStorage com validação
const saveCourseToLocalStorage = (data: any) => {
  try {
    const courseKey = `course_${data.course?.id || data.courseId}`;

    if (!data.course?.id && !data.courseId) {
      console.error('❌ Nenhum courseId válido encontrado:', { data });
      return false;
    }

    if (!data.course) {
      console.error('❌ Dados do curso não encontrados:', { data });
      return false;
    }

    console.log('💾 Salvando curso no localStorage com chave:', courseKey);
    console.log('📊 Dados do curso que serão salvos:', data.course);

    localStorage.setItem(courseKey, JSON.stringify(data.course));

    console.log('✅ Curso salvo no localStorage com sucesso');
    return true;
  } catch (error) {
    console.error('❌ Erro ao salvar curso no localStorage:', error);
    return false;
  }
};

export default function ChatPage() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string>('');
  const [pageLoaded, setPageLoaded] = useState(false);

  // Adicionar animação de entrada na página
  useEffect(() => {
    // Remover classe de transição após a navegação
    document.body.classList.remove('page-transition-active');

    // Adicionar classe de animação de entrada
    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.classList.add('page-enter');
    }
  }, []);

  // Novos estados para o fluxo do syllabus
  const [currentSyllabus, setCurrentSyllabus] = useState<SyllabusData | null>(null);
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);

  // Estado do loading progress sincronizado com o sistema
  const [loadingProgress, setLoadingProgress] = useState({
    currentStep: 1,
    progress: 0,
    isComplete: false,
  });

  // Estado para loading de geração de curso
  const [isGeneratingCourse, setIsGeneratingCourse] = useState(false);
  const [courseGenerationProgress, setCourseGenerationProgress] = useState(0);

  // Estado para popup de confirmação
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Estado unificado para transição suave
  const [transitionProgress, setTransitionProgress] = useState(0);

  // Estado para geração de aulas
  const [lessonGenerationStatus, setLessonGenerationStatus] = useState<{
    current: number;
    total: number;
    currentLesson: string;
    phase: string;
  } | null>(null);

  // Estados derivados do progresso para compatibilidade
  const isTransitioning = transitionProgress > 0 && transitionProgress < 100;
  const showFloatingElements = transitionProgress > 10 && transitionProgress < 90;

  // Sistema de progresso em tempo real com SSE
  const [sessionId, setSessionId] = useState<string>('');
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  const startProgressTracking = (sessionId: string) => {
    // Fechar conexão anterior se existir
    if (eventSource) {
      eventSource.close();
    }

    // Iniciar Server-Sent Events
    const es = new EventSource(`/api/analyze/status?sessionId=${sessionId}`);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLoadingProgress({
          currentStep: data.currentStep,
          progress: data.progress,
          isComplete: data.isComplete
        });

        if (data.isComplete) {
          es.close();
          setEventSource(null);
        }
      } catch (error) {
        console.error('Erro ao parsear progresso:', error);
      }
    };

    es.onerror = (error) => {
      console.error('Erro no EventSource:', error);
      es.close();
      setEventSource(null);
    };

    setEventSource(es);
  };

  const resetProgress = () => {
    setLoadingProgress({
      currentStep: 1,
      progress: 0,
      isComplete: false,
    });
  };

  const completeProgress = () => {
    setLoadingProgress({
      currentStep: 5,
      progress: 100,
      isComplete: true,
    });
  };

  // Cleanup EventSource quando o componente for desmontado
  useEffect(() => {
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [eventSource]);

  // Animação de entrada da página
  useEffect(() => {
    // Carregamento imediato sem delays
    setPageLoaded(true);
  }, []);

  const handleSendMessage = async (message: string, files?: UploadedFile[]) => {
    // Detectar comando para gerar curso principal
    const generateCourseCommands = [
      'gerar curso',
      'criar curso',
      'gerar as aulas',
      'criar as aulas',
      'aprovar',
      'aprovar estrutura',
      'gerar o curso',
      'criar o curso'
    ];

    const isGenerateCourseCommand = generateCourseCommands.some(cmd =>
      message.toLowerCase().includes(cmd)
    );

    if (isGenerateCourseCommand && currentSyllabus) {
      await handleCreateCourseFromChat(message);
      return;
    }

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
      attachedFiles: files && files.length > 0 ? files : undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Clear uploaded files after sending
    if (files && files.length > 0) {
      setUploadedFiles([]);
    }

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
    resetProgress();

    try {
      // Criar mensagem especializada para pré-requisito
      const prerequisiteMessage = `Quero aprender ${prerequisiteName} como pré-requisito

Perfil do usuário:
- Nível: beginner
- Objetivo: academic
- Tempo disponível: moderate
- Experiência prévia: Este é um curso de pré-requisito para outra matéria
- Objetivos específicos: Adquirir base necessária para prosseguir em outros cursos`;

      // Gerar sessionId único para pré-requisito
      const currentSessionId = `prereq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(currentSessionId);

      // Iniciar rastreamento de progresso
      startProgressTracking(currentSessionId);

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
          },
          sessionId: currentSessionId
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
      setTimeout(() => {
        setIsLoading(false);
        // Fechar EventSource
        if (eventSource) {
          eventSource.close();
          setEventSource(null);
        }
      }, 1000);
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
- Nível educacional: ${profile.educationLevel || 'undergraduate'}
- Experiência prévia: ${profile.background || 'Nenhuma experiência informada'}
- Objetivos específicos: ${profile.specificGoals || 'Não especificados'}`;

    const userMessage: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      content: `${originalMessage}

Perfil de Aprendizado:
• Nível: ${profileLabels.level}
• Objetivo: ${profileLabels.purpose}
• Tempo disponível: ${profileLabels.timeAvailable}${profileLabels.educationLevel ? `\n• Nível educacional: ${profileLabels.educationLevel}` : ''}
• Experiência prévia: ${profile.background || 'Não informado'}
• Objetivos específicos: ${profile.specificGoals || 'Não informado'}`,
      timestamp: new Date().toISOString(),
      attachedFiles: uploadedFiles.length > 0 ? uploadedFiles : undefined,
    };

    setMessages([userMessage]);
    setIsLoading(true);
    resetProgress();

    // Limpar arquivos imediatamente após criar a mensagem
    if (uploadedFiles.length > 0) {
      setUploadedFiles([]);
    }

    // Gerar sessionId único para rastrear progresso
    const currentSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(currentSessionId);

    // Iniciar rastreamento de progresso
    startProgressTracking(currentSessionId);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: enrichedMessage,
          uploadedFiles: uploadedFiles,
          userProfile: profile,
          sessionId: currentSessionId
        }),
      });

      if (!response.ok) {
        throw new Error('Falha na resposta do servidor');
      }

      const data = await response.json();

      console.log('📋 Resposta da API:', {
        success: data.success,
        hasGoal: !!data.goal,
        hasStructure: !!data.structure,
        goalTitle: data.goal?.title || data.structure?.goal?.title
      });

      if (data.success && (data.structure || data.goal)) {
        // Aceitar ambos os formatos (novo: data.goal, antigo: data.structure.goal)
        const goalData = data.goal || data.structure?.goal;
        const prerequisites = goalData.prerequisites || data.prerequisites;

        if (!goalData) {
          throw new Error('Estrutura do curso não encontrada na resposta');
        }

        // Converter estrutura da API para o formato do syllabus
        const syllabusData = {
          title: goalData.title,
          description: goalData.description,
          modules: goalData.modules || [],
          level: goalData.level
        };

        setCurrentSyllabus(syllabusData);

        console.log('✅ Syllabus criado:', {
          title: syllabusData.title,
          modulesCount: syllabusData.modules.length,
          level: syllabusData.level
        });

        // Construir mensagem de resposta simplificada
        let responseContent = `✨ Estrutura do curso criada com sucesso!

Você pode editar a estrutura no painel ao lado ou me pedir para:
• Adicionar mais tópicos específicos
• Reorganizar a estrutura
• Mudar o nível de dificuldade
• Refazer tudo com novas instruções`;

        // Se há pré-requisitos, adicionar sugestão de geração
        if (prerequisites && prerequisites.length > 0) {
          responseContent += `
• Gerar curso de pré-requisito - Digite "Gerar curso de [nome]"`;
        }

        responseContent += `

Quando estiver satisfeito, é só me dizer **"gerar curso"** que eu crio todas as aulas para você! 🚀`;

        // Adicionar mensagem de sucesso
        const successMessage: ChatMessage = {
          id: `msg-syllabus-${Date.now()}`,
          role: 'assistant',
          content: responseContent,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, successMessage]);

        // Arquivos já foram limpos imediatamente após o envio
      } else {
        console.error('❌ Resposta do servidor:', data);
        console.error('📊 Debug da resposta:', {
          success: data.success,
          error: data.error,
          hasGoal: !!data.goal,
          hasStructure: !!data.structure,
          keys: Object.keys(data)
        });
        throw new Error(data.error || 'Erro desconhecido no servidor');
      }
    } catch (error) {
      console.error('❌ Erro ao processar mensagem:', error);
      console.error('📋 Detalhes do erro:', {
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        type: typeof error,
        stack: error instanceof Error ? error.stack : null
      });

      let errorContent = 'Desculpe, ocorreu um erro ao processar sua solicitação. ';

      // Personalizar mensagem baseada no tipo de erro
      if (error instanceof Error) {
        if (error.message.includes('Falha na resposta do servidor')) {
          errorContent += 'Problema de conectividade com o servidor. Tente novamente em alguns segundos.';
        } else if (error.message.includes('Estrutura do curso não encontrada')) {
          errorContent += 'A estrutura do curso não foi retornada corretamente. Por favor, tente novamente.';
        } else if (error.message.length > 0 && error.message.length < 100) {
          errorContent += `Erro: ${error.message}`;
        } else {
          errorContent += 'Tente novamente ou reformule sua solicitação.';
        }
      } else {
        errorContent += 'Tente novamente.';
      }

      const errorMessage: ChatMessage = {
        id: `msg-error-${Date.now()}`,
        role: 'assistant',
        content: errorContent,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setTimeout(() => {
        setIsLoading(false);
        setPendingMessage('');
        // Fechar EventSource
        if (eventSource) {
          eventSource.close();
          setEventSource(null);
        }
      }, 1000);
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
    // Iniciar loading de geração
    setIsGeneratingCourse(true);
    setCourseGenerationProgress(5);

    // Gerar sessionId único para rastreamento de aulas
    const courseSessionId = `course_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Iniciar criação de curso com sessionId para geração de aulas
      const response = await fetch('/api/create-course', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          syllabus: finalSyllabus,
          uploadedFiles: uploadedFiles,
          sessionId: courseSessionId
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao iniciar criação do curso');
      }

      const data = await response.json();

      if (data.success && data.courseId) {
        setCourseGenerationProgress(10);

        // Se as aulas já estão TODAS prontas, ir direto para 100%
        if (data.lessonsReady && data.lessonStats && data.lessonStats.missing === 0) {
          console.log('✅ Todas as aulas já estão prontas! Redirecionando...');
          console.log('📊 Estatísticas:', data.lessonStats);

          // Animação rápida até 100%
          let progress = 10;
          const progressInterval = setInterval(() => {
            progress += 15;
            setCourseGenerationProgress(Math.min(progress, 100));

            if (progress >= 100) {
              clearInterval(progressInterval);

              // Salvar no localStorage
              if (data.course) {
                saveCourseToLocalStorage(data);
              }

              // Redirecionar
              setTimeout(() => {
                window.location.href = `/courses/${data.course.id}`;
              }, 500);
            }
          }, 100);

        } else {
          // Aulas não estão prontas - conectar ao SSE para acompanhar geração
          console.log('⚠️ Aulas ainda não estão prontas, conectando ao SSE...');

          if (data.lessonStats) {
            console.log('📊 Status das aulas:', {
              prontas: data.lessonStats.ready || 0,
              necessárias: data.lessonStats.needed || 0,
              faltando: data.lessonStats.missing || 0
            });
          }

          if (data.sessionId) {
            console.log('🎓 Conectando ao SSE para acompanhar geração de aulas em tempo real...');
            console.log('📊 SessionId para SSE:', data.sessionId);
            console.log('⏳ Aguardando conclusão da geração antes de redirecionar...');
            const eventSource = new EventSource(
              `/api/create-course?sessionId=${data.sessionId}`
            );

            let sseTimeout: NodeJS.Timeout | null = null;
            let hasReceivedData = false;

          // Timeout de 60 segundos para SSE (mais tempo para gerar aulas)
          sseTimeout = setTimeout(() => {
            console.warn('SSE timeout - verificando status da geração...');
            eventSource.close();

            // IMPORTANTE: Salvar o curso mesmo quando timeout
            if (data.course) {
              console.log('💾 Salvando curso no localStorage por timeout SSE');
              saveCourseToLocalStorage(data);
            }

            // Continuar sem aulas mas com progresso normal
            setCourseGenerationProgress(100);
            setTimeout(() => {
              window.location.href = `/courses/${data.course.id}`;
            }, 500);
          }, 60000); // 60 segundos de timeout

          eventSource.onmessage = (event) => {
            try {
              hasReceivedData = true;
              if (sseTimeout) {
                clearTimeout(sseTimeout);
                sseTimeout = null;
              }

              const progressData = JSON.parse(event.data);

              if (progressData.status === 'generating') {
                // Calcular progresso baseado nas aulas geradas
                const lessonProgress = (progressData.current / progressData.total) * 80; // 80% para aulas
                const totalProgress = 10 + lessonProgress; // 10% inicial + progresso das aulas

                setCourseGenerationProgress(totalProgress);
                setLessonGenerationStatus({
                  current: progressData.current,
                  total: progressData.total,
                  currentLesson: progressData.message,
                  phase: 'Gerando aulas-texto do primeiro módulo',
                });
              } else if (progressData.status === 'completed') {
                eventSource.close();
                setCourseGenerationProgress(95);
                setLessonGenerationStatus(null);

                // Armazenar curso com aulas no localStorage
                if (data.course && progressData.lessons) {
                  // Atualizar syllabus com as aulas geradas
                  const updatedSyllabus = { ...data.course.syllabus_data };
                  if (updatedSyllabus.modules && updatedSyllabus.modules[0]) {
                    updatedSyllabus.modules[0].topics.forEach((topic: any) => {
                      if (topic.subtopics) {
                        topic.subtopics.forEach((subtopic: any) => {
                          const subtopicId = subtopic.id || `sub_${topic.id}_${topic.subtopics.indexOf(subtopic)}`;
                          if (progressData.lessons[subtopicId]) {
                            subtopic.theory = progressData.lessons[subtopicId];
                          }
                        });
                      }
                    });
                  }

                  const courseWithLessons = {
                    ...data.course,
                    syllabus_data: updatedSyllabus,
                  };
                  localStorage.setItem(`course_${data.courseId}`, JSON.stringify(courseWithLessons));
                }

                // Finalizar e redirecionar SOMENTE quando tudo estiver pronto
                console.log('✅ Todas as aulas foram geradas com sucesso!');
                setTimeout(() => {
                  setCourseGenerationProgress(100);
                  setTimeout(() => {
                    window.location.href = `/courses/${data.course.id}`;
                  }, 500);
                }, 300);
              } else if (progressData.status === 'error' || progressData.error) {
                console.error('Erro na geração de aulas:', progressData.error);
                eventSource.close();
                if (sseTimeout) clearTimeout(sseTimeout);

                // Mostrar erro mas NÃO redirecionar automaticamente
                setLessonGenerationStatus({
                  current: 0,
                  total: 0,
                  currentLesson: 'Erro ao gerar aulas',
                  phase: 'error',
                });

                // Dar opção ao usuário de continuar ou tentar novamente
                setCourseGenerationProgress(95);

                // Salvar curso mesmo com erro
                if (data.course) {
                  saveCourseToLocalStorage(data);
                }

                // Esperar mais tempo e então redirecionar
                setTimeout(() => {
                  setCourseGenerationProgress(100);
                  setTimeout(() => {
                    window.location.href = `/courses/${data.course.id}`;
                  }, 2000);
                }, 3000);
              }
            } catch (error) {
              console.error('Erro ao processar progresso:', error);
              // Em caso de erro, continuar mesmo assim
              eventSource.close();
              if (sseTimeout) clearTimeout(sseTimeout);

              // IMPORTANTE: Salvar o curso mesmo quando há erro de processamento
              if (data.course) {
                console.log('💾 Salvando curso no localStorage mesmo com erro processamento');
                saveCourseToLocalStorage(data);
              }

              setCourseGenerationProgress(100);
              setTimeout(() => {
                window.location.href = `/courses/${data.course.id}`;
              }, 500);
            }
          };

          eventSource.onerror = (error) => {
            console.error('Erro na conexão SSE:', error);
            eventSource.close();
            if (sseTimeout) clearTimeout(sseTimeout);

            // Se não recebeu nenhum dados ainda, pode ser problema de conexão
            if (!hasReceivedData) {
              console.warn('SSE falhou ao conectar - continuando sem aulas');
            }

            // IMPORTANTE: Salvar o curso mesmo quando SSE falha
            if (data.course) {
              console.log('💾 Salvando curso no localStorage mesmo com erro SSE');
              saveCourseToLocalStorage(data);
            }

            // Continuar mesmo com erro nas aulas
            setCourseGenerationProgress(100);
            setTimeout(() => {
              window.location.href = `/courses/${data.course.id}`;
            }, 500);
          };
          } else {
            // Sem sessionId - erro
            console.error('❌ Nenhum sessionId para acompanhar geração!');
            setCourseGenerationProgress(100);
            setTimeout(() => {
              window.location.href = `/courses/${data.course.id}`;
            }, 500);
          }
        }

      } else {
        throw new Error(data.error || 'Falha ao criar o curso');
      }
    } catch (error) {
      console.error('Erro ao criar curso:', error);
      setIsGeneratingCourse(false);
      setCourseGenerationProgress(0);

      const errorMessage: ChatMessage = {
        id: `msg-course-error-${Date.now()}`,
        role: 'assistant',
        content: `❌ Erro ao criar o curso: ${error instanceof Error ? error.message : 'Erro desconhecido'}. Tente novamente.`,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleSyllabusCancel = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDeleteSyllabus = () => {
    setCurrentSyllabus(null);
    setMessages([]);
    setShowDeleteConfirm(false);
  };

  const cancelDeleteSyllabus = () => {
    setShowDeleteConfirm(false);
  };

  const handleCreateCourseFromChat = async (message: string) => {
    if (!currentSyllabus) return;

    // Adicionar mensagem do usuário
    const userMessage: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);

    // Adicionar mensagem de confirmação com animação
    const confirmMessage: ChatMessage = {
      id: `msg-confirm-${Date.now()}`,
      role: 'assistant',
      content: '🚀 Perfeito! Vou gerar o curso completo agora. Preparando todas as aulas, vídeos e exercícios...',
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, confirmMessage]);

    // Iniciar transição com delay menor para fluidez
    setTimeout(() => {
      startSmoothTransition();
    }, 800);
  };

  // Função para transição suave unificada
  const startSmoothTransition = () => {
    let progress = 0;
    const duration = 2500; // Reduzido para transição mais ágil
    const startTime = performance.now();
    let courseCreationStarted = false;
    let phaseStarted = false;

    // Curva de animação personalizada para transição cinematográfica
    const easeInOutQuart = (t: number) => {
      return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
    };

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const linearProgress = Math.min(elapsed / duration, 1);
      progress = easeInOutQuart(linearProgress) * 100;

      setTransitionProgress(progress);

      // Adicionar efeitos visuais em momentos específicos
      if (progress >= 30 && !phaseStarted) {
        phaseStarted = true;
        // Adicionar classe para efeito de blur progressivo
        document.body.classList.add('transitioning');
      }

      // Iniciar criação do curso quando a transição chegar a 75%
      if (progress >= 75 && !courseCreationStarted && currentSyllabus) {
        courseCreationStarted = true;
        handleCreateCourse(currentSyllabus);
      }

      // Continuar animação até completar
      if (progress < 100) {
        requestAnimationFrame(animate);
      } else {
        // Remover classe de transição
        setTimeout(() => {
          document.body.classList.remove('transitioning');
        }, 300);
      }
    };

    requestAnimationFrame(animate);
  };


  // Mostrar tela de loading de geração se necessário
  if (isGeneratingCourse) {
    return (
      <div className="h-screen flex flex-col overflow-hidden" style={{
        background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 50%, #90caf9 100%)',
        animation: 'fadeInScale 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        opacity: 0,
        transform: 'scale(0.95) translateZ(0)'
      }}>
        {/* Header simplificado durante loading */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 shadow-md flex-shrink-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">EDC+ Plataforma Educacional</h1>
                  <p className="text-sm text-gray-600">Gerando seu curso personalizado...</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Loading Screen */}
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-2xl mx-auto px-4">
            {/* Animação principal */}
            <div className="relative mb-8">
              <div className="w-32 h-32 mx-auto relative">
                {/* Círculo exterior girando */}
                <div className="absolute inset-0 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
                {/* Círculo interior pulsando */}
                <div className="absolute inset-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-pulse flex items-center justify-center">
                  <BookOpen className="w-12 h-12 text-white animate-bounce" />
                </div>
              </div>

              {/* Partículas flutuantes */}
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-ping"></div>
              </div>
              <div className="absolute top-8 right-8">
                <div className="w-1 h-1 bg-purple-400 rounded-full animate-ping animation-delay-75"></div>
              </div>
              <div className="absolute bottom-8 left-8">
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-ping animation-delay-150"></div>
              </div>
            </div>

            {/* Texto e progresso */}
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              🚀 Criando Seu Curso Personalizado
            </h2>
            <p className="text-lg text-gray-700 mb-8">
              {lessonGenerationStatus ? (
                <>
                  Nossa IA está gerando as aulas-texto do primeiro módulo.<br/>
                  <span className="text-blue-600 font-medium">
                    Aula {lessonGenerationStatus.current} de {lessonGenerationStatus.total} em preparação...
                  </span>
                </>
              ) : (
                <>
                  Nossa IA está trabalhando para gerar todo o conteúdo educacional do seu curso.<br/>
                  <span className="text-blue-600 font-medium">Isso pode levar alguns momentos...</span>
                </>
              )}
            </p>

            {/* Barra de progresso dinâmica */}
            <div className="mb-6">
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
                <div
                  className="bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden"
                  style={{ width: `${courseGenerationProgress}%` }}
                >
                  {/* Efeito shimmer */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                </div>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mt-2">
                <span>Gerando conteúdo...</span>
                <span className="font-medium">{Math.round(courseGenerationProgress)}%</span>
              </div>
            </div>

            {/* Steps indicativos */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className={`p-3 rounded-lg transition-colors ${courseGenerationProgress >= 5 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                <div className="text-2xl mb-1">🏗️</div>
                <div className="text-sm font-medium">Criando Estrutura</div>
              </div>
              <div className={`p-3 rounded-lg transition-colors ${
                courseGenerationProgress >= 90 ? 'bg-green-100 text-green-800' :
                courseGenerationProgress >= 10 ? 'bg-blue-100 text-blue-800 animate-pulse' :
                'bg-gray-100 text-gray-600'
              }`}>
                <div className="text-2xl mb-1">✍️</div>
                <div className="text-sm font-medium">
                  {lessonGenerationStatus ?
                    `Aula ${lessonGenerationStatus.current}/${lessonGenerationStatus.total}` :
                    'Gerando Aulas-Texto'
                  }
                </div>
              </div>
              <div className={`p-3 rounded-lg transition-colors ${courseGenerationProgress >= 95 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                <div className="text-2xl mb-1">🎯</div>
                <div className="text-sm font-medium">Finalizando Curso</div>
              </div>
            </div>

            {/* Detalhamento de geração de aulas */}
            {lessonGenerationStatus && lessonGenerationStatus.total > 0 && (
              <div className="mt-6 p-4 bg-white/90 backdrop-blur-sm rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-blue-900">
                    Progresso de Geração de Aulas
                  </span>
                  <span className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded-full">
                    Primeiro Módulo
                  </span>
                </div>
                <div className="w-full bg-blue-100 rounded-full h-2 mb-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(lessonGenerationStatus.current / lessonGenerationStatus.total) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-600">
                  Tempo estimado: {Math.ceil((lessonGenerationStatus.total - lessonGenerationStatus.current) * 10)} segundos
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div
      className={`h-screen flex flex-col overflow-hidden ${
        isDarkMode ? 'bg-gray-900' : ''
      }`}
      style={{
        background: isDarkMode
          ? 'linear-gradient(135deg, #1f2937 0%, #111827 100%)'
          : 'linear-gradient(135deg, #87C9FF 0%, #93C5FD 50%, #A5B4FC 100%)'
      }}
    >
      {/* Header Elegante */}
      <header className={`backdrop-blur-md border-b ${
        isDarkMode
          ? 'border-gray-700/50 bg-gray-900/30'
          : 'border-white/50 bg-white/20'
      }`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <h1 className={`text-xl font-bold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>EDC+ Plataforma Educacional</h1>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  // Adicionar animação de fade out
                  const mainElement = document.querySelector('main');
                  if (mainElement) {
                    mainElement.style.opacity = '0';
                    mainElement.style.transition = 'opacity 300ms ease-out';
                  }

                  // Navegar após a animação
                  setTimeout(() => {
                    router.push('/');
                  }, 300);
                }}
                className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  isDarkMode
                    ? 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-white/50'
                }`}
              >
                <Brain className="w-4 h-4" />
                <span>Início</span>
              </button>
              <Link
                href="/courses"
                className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  isDarkMode
                    ? 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-white/50'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Cursos</span>
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>


      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 py-6 h-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            {/* Chat Panel */}
            <div className={`rounded-xl flex flex-col h-full overflow-hidden backdrop-blur-md shadow-xl ${
              isDarkMode
                ? 'bg-gray-800/80 border border-gray-600/30'
                : 'bg-white/90 border border-white/50'
            }`}>
              <div className={`p-5 border-b ${
                isDarkMode ? 'border-gray-600/30' : 'border-gray-200/50'
              }`}>
                <h2 className={`text-xl font-semibold mb-2 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>Assistente Educacional</h2>
                <p className={`text-sm ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  O Guia transforma cada objetivo em um caminho de aprendizado.
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
                  loadingProgress={isLoading ? loadingProgress : undefined}
                />
              </div>
            </div>

            {/* Syllabus/Learning Plan Panel */}
            <div className={`flex flex-col h-full overflow-hidden ${
              currentSyllabus
                ? isDarkMode
                  ? 'rounded-xl backdrop-blur-md shadow-xl border bg-gray-800/80 border-gray-600/30'
                  : 'rounded-xl backdrop-blur-md shadow-xl border bg-white/90 border-white/50'
                : ''
            }`}>
              {currentSyllabus ? (
                <div className="flex-1 min-h-0 overflow-hidden relative">
                  <button
                    onClick={handleSyllabusCancel}
                    className={`absolute top-4 right-4 z-10 transition-colors rounded-full p-2 ${
                      isDarkMode
                        ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <TinySyllabusEditor
                    syllabus={currentSyllabus}
                    onSyllabusUpdate={handleSyllabusUpdate}
                    onCancel={handleSyllabusCancel}
                  />
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-center p-8">
                  <div className="max-w-sm">
                    <div className="w-16 h-16 bg-gray-400 rounded-lg mx-auto mb-4 flex items-center justify-center">
                      <Brain className="w-8 h-8 text-white" />
                    </div>
                    <h3 className={`text-lg font-medium mb-3 ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      Pronto para começar?
                    </h3>
                    <p className={`text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Descreva o que quer aprender e receba um curso
                      estruturado com aulas texto, vídeos especializados e
                      exercícios práticos.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Popup de Confirmação para Excluir Estrutura */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                <X className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Excluir Estrutura do Curso</h3>
            </div>

            <p className="text-gray-600 mb-6">
              Tem certeza que deseja excluir a estrutura do curso criada? Esta ação não pode ser desfeita e você precisará gerar uma nova estrutura.
            </p>

            <div className="flex space-x-3">
              <button
                onClick={cancelDeleteSyllabus}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteSyllabus}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

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