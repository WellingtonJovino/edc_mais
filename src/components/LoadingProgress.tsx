'use client';

import React, { useEffect, useState } from 'react';
import { Brain, Search, BookOpen, Sparkles, CheckCircle, FileText, Wand2, PenTool } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export interface LoadingStep {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

export interface LoadingProgressProps {
  currentStep: number;
  totalSteps: number;
  stepName?: string;
  progress: number; // 0-100
  steps?: LoadingStep[];
  isComplete?: boolean;
  onProgressUpdate?: (progress: number) => void;
  hasUploadedFiles?: boolean; // Nova prop para determinar se há arquivos
  // Novas props para geração de aulas
  generateLessons?: boolean;
  currentPhase?: string;
  currentSubtopic?: string;
  completedLessons?: number;
  totalLessons?: number;
  lessonsGenerated?: number;
  lessonsExisting?: number;
}

// Função para gerar steps baseado na presença de arquivos e geração de aulas
export const getStepsForSession = (hasUploadedFiles: boolean, generateLessons: boolean = false): LoadingStep[] => {
  const baseSteps: LoadingStep[] = [
    {
      id: 'analyzing',
      label: 'Analisando objetivo',
      icon: Brain,
      description: 'Processando sua solicitação e identificando o domínio de conhecimento'
    },
    {
      id: 'researching',
      label: hasUploadedFiles ? 'Pesquisando conteúdo' : 'Pesquisando conteúdo',
      icon: Search,
      description: hasUploadedFiles
        ? 'Buscando referências acadêmicas e processando documentos enviados'
        : 'Buscando referências acadêmicas e tópicos especializados'
    }
  ];

  // Adicionar etapa de extração apenas se há arquivos
  if (hasUploadedFiles) {
    baseSteps.push({
      id: 'extracting',
      label: 'Extraindo documentos',
      icon: FileText,
      description: 'Processando arquivos enviados e extraindo conteúdo relevante'
    });
  }

  // Adicionar etapas finais
  baseSteps.push(
    {
      id: 'structuring',
      label: 'Estruturando curso',
      icon: BookOpen,
      description: 'Organizando módulos e criando sequência pedagógica'
    },
    {
      id: 'validating',
      label: 'Validando qualidade',
      icon: Sparkles,
      description: 'Aplicando critérios acadêmicos e validação científica'
    }
  );

  // Adicionar etapas de geração de aulas se necessário
  if (generateLessons) {
    baseSteps.push(
      {
        id: 'checking_existing',
        label: 'Verificando aulas',
        icon: Search,
        description: 'Verificando aulas existentes no banco de dados'
      },
      {
        id: 'generating_lessons',
        label: 'Gerando aulas-texto',
        icon: Wand2,
        description: 'Criando aulas-texto profissionais com IA para cada subtópico'
      },
      {
        id: 'finalizing_course',
        label: 'Finalizando curso',
        icon: CheckCircle,
        description: 'Integrando aulas e preparando curso completo'
      }
    );
  }

  return baseSteps;
};

const defaultSteps: LoadingStep[] = [
  {
    id: 'analyzing',
    label: 'Analisando objetivo',
    icon: Brain,
    description: 'Processando sua solicitação e identificando o domínio de conhecimento'
  },
  {
    id: 'researching',
    label: 'Pesquisando conteúdo',
    icon: Search,
    description: 'Buscando referências acadêmicas e tópicos especializados'
  },
  {
    id: 'structuring',
    label: 'Estruturando curso',
    icon: BookOpen,
    description: 'Organizando módulos e criando sequência pedagógica'
  },
  {
    id: 'validating',
    label: 'Validando qualidade',
    icon: Sparkles,
    description: 'Aplicando critérios acadêmicos e validação científica'
  }
];

export default function LoadingProgress({
  currentStep,
  totalSteps,
  stepName,
  progress,
  steps,
  isComplete = false,
  onProgressUpdate,
  hasUploadedFiles = false,
  generateLessons = false,
  currentPhase,
  currentSubtopic,
  completedLessons,
  totalLessons,
  lessonsGenerated,
  lessonsExisting
}: LoadingProgressProps) {
  const { isDarkMode } = useTheme();
  // Usar steps condicionais se não foram fornecidos steps customizados
  const effectiveSteps = steps || getStepsForSession(hasUploadedFiles, generateLessons);
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [targetProgress, setTargetProgress] = useState(0);
  const [isStuck, setIsStuck] = useState(false);

  // Sincronizar progresso com o sistema em tempo real
  useEffect(() => {
    setTargetProgress(progress);
    setIsStuck(false); // Reset stuck state quando progresso muda
  }, [progress]);

  // Detectar quando progresso está parado por muito tempo
  useEffect(() => {
    if (!isComplete && animatedProgress > 0 && animatedProgress < 100) {
      const stuckTimer = setTimeout(() => {
        setIsStuck(true);
      }, 3000); // Considera "preso" após 3 segundos sem mudança

      return () => clearTimeout(stuckTimer);
    }
  }, [animatedProgress, isComplete]);

  // Animação incremental da barra de progresso
  useEffect(() => {
    if (animatedProgress < targetProgress) {
      const timer = setTimeout(() => {
        setAnimatedProgress(prev => {
          const next = Math.min(prev + 1, targetProgress);
          if (onProgressUpdate) {
            onProgressUpdate(next);
          }
          return next;
        });
      }, 50); // Incrementa de 1% a cada 50ms
      return () => clearTimeout(timer);
    }
  }, [animatedProgress, targetProgress, onProgressUpdate]);

  return (
    <div className={`w-full max-w-2xl mx-auto rounded-xl shadow-sm p-6 relative overflow-hidden animate-in fade-in-50 slide-in-from-bottom-3 duration-500 ${
      isDarkMode
        ? 'bg-gray-800/95 border border-gray-700'
        : 'bg-white border border-gray-200'
    }`}>
      {/* Gradiente sutil de fundo */}
      <div className={`absolute inset-0 pointer-events-none ${
        isDarkMode
          ? 'bg-gradient-to-br from-blue-900/20 to-indigo-900/20'
          : 'bg-gradient-to-br from-blue-50/30 to-indigo-50/30'
      }`}></div>

      <div className="relative z-10">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <span className={`text-lg font-semibold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {isComplete
                ? (generateLessons ? 'Curso Completo Gerado com Sucesso!' : 'Curso Gerado com Sucesso!')
                : (generateLessons && currentPhase
                    ? getPhaseDisplayName(currentPhase)
                    : 'Gerando Estrutura do Curso'
                  )
              }
            </span>
            <span className="text-lg font-bold text-blue-600">{Math.round(animatedProgress)}%</span>
          </div>

          <div className={`w-full rounded-full h-4 overflow-hidden mb-4 relative shadow-inner ${
            isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
          }`}>
            <div
              className="bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 h-full rounded-full transition-all duration-300 ease-out relative overflow-hidden shadow-sm"
              style={{ width: `${animatedProgress}%` }}
            >
              {/* Animação de brilho sempre ativa */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />

              {/* Animação de ondulação quando parado */}
              {isStuck && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-pulse" style={{animationDuration: '1s'}} />
              )}

              {/* Shimmer effect quando em movimento */}
              {!isStuck && animatedProgress > 0 && animatedProgress < 100 && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" style={{animationDuration: '2s'}} />
              )}
            </div>

            {/* Indicador de atividade quando parado */}
            {isStuck && !isComplete && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-white/80 rounded-full animate-bounce shadow-sm" style={{animationDelay: '0ms'}}></div>
                  <div className="w-1.5 h-1.5 bg-white/80 rounded-full animate-bounce shadow-sm" style={{animationDelay: '150ms'}}></div>
                  <div className="w-1.5 h-1.5 bg-white/80 rounded-full animate-bounce shadow-sm" style={{animationDelay: '300ms'}}></div>
                </div>
              </div>
            )}
          </div>

          {/* Seção especial para progresso de aulas */}
          {generateLessons && (totalLessons && totalLessons > 0 || currentPhase === 'generating_lessons') && (
            <div className={`mb-4 p-4 rounded-lg shadow-inner ${
              isDarkMode
                ? 'bg-gradient-to-br from-blue-900/30 to-indigo-900/30 border border-blue-700/50'
                : 'bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Wand2 className="w-5 h-5 text-blue-600" />
                    {currentPhase === 'generating_lessons' && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    )}
                  </div>
                  <span className={`text-sm font-semibold ${
                    isDarkMode ? 'text-blue-300' : 'text-blue-900'
                  }`}>
                    {currentPhase === 'checking_existing' ? 'Verificando Aulas Existentes' : 'Geração de Aulas-Texto com IA'}
                  </span>
                </div>
                {totalLessons > 0 && (
                  <span className={`text-sm font-bold px-2 py-1 rounded-full shadow-sm ${
                    isDarkMode
                      ? 'text-blue-300 bg-gray-700'
                      : 'text-blue-700 bg-white'
                  }`}>
                    {completedLessons || 0} / {totalLessons}
                  </span>
                )}
              </div>

              {/* Status das aulas com melhor visualização */}
              {(lessonsExisting > 0 || lessonsGenerated > 0) && (
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {lessonsExisting > 0 && (
                    <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <div>
                        <span className="text-xs text-green-800 font-medium">{lessonsExisting} aulas prontas</span>
                        <div className="text-xs text-green-600">Já existentes</div>
                      </div>
                    </div>
                  )}
                  {lessonsGenerated > 0 && (
                    <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      <div>
                        <span className="text-xs text-blue-800 font-medium">{lessonsGenerated} novas aulas</span>
                        <div className="text-xs text-blue-600">Geradas agora</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {currentSubtopic && currentPhase === 'generating_lessons' && (
                <div className="bg-white/70 backdrop-blur-sm rounded-lg p-2 mb-3 border border-blue-100">
                  <div className="flex items-center gap-2 text-xs text-blue-800">
                    <PenTool className="w-3 h-3 animate-pulse" />
                    <span className="font-medium">Gerando aula:</span>
                    <span className="truncate flex-1 text-blue-600">{currentSubtopic}</span>
                  </div>
                </div>
              )}

              {totalLessons > 0 && (
                <div className="relative">
                  <div className="w-full bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full h-3 overflow-hidden shadow-inner">
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden"
                      style={{
                        width: `${((completedLessons || 0) / totalLessons) * 100}%`,
                        background: 'linear-gradient(90deg, #3B82F6, #6366F1)'
                      }}
                    >
                      {/* Efeito de brilho animado */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse"></div>
                    </div>
                  </div>
                  {/* Percentual sobre a barra */}
                  {totalLessons > 0 && (
                    <div className="absolute -top-5 left-1/2 transform -translate-x-1/2">
                      <span className="text-xs font-bold text-blue-700">
                        {Math.round(((completedLessons || 0) / totalLessons) * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Mensagem motivacional */}
              {currentPhase === 'generating_lessons' && totalLessons > 0 && (
                <div className="mt-3 text-center">
                  <p className="text-xs text-blue-600 font-medium">
                    {completedLessons < totalLessons / 2
                      ? '🚀 Criando conteúdo educacional de alta qualidade...'
                      : completedLessons < totalLessons
                      ? '⚡ Quase lá! Finalizando as últimas aulas...'
                      : '✨ Todas as aulas foram geradas com sucesso!'
                    }
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Steps minimalistas */}
          <div className="flex justify-between items-center">
            {effectiveSteps.map((step, index) => {
              const stepNumber = index + 1;
              const isActive = stepNumber === currentStep;
              const isCompleted = stepNumber < currentStep || isComplete;
              const IconComponent = step.icon;

              return (
                <div key={step.id} className="flex flex-col items-center space-y-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 relative ${
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : isActive
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-300 text-gray-500'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <IconComponent className={`w-4 h-4 ${isActive && isStuck ? 'animate-pulse' : ''}`} />
                    )}

                    {/* Anel de loading para etapa ativa quando parada */}
                    {isActive && isStuck && !isCompleted && (
                      <div className="absolute inset-0 rounded-full border-2 border-blue-300/60 border-t-blue-200 animate-spin" style={{animationDuration: '1.5s'}}></div>
                    )}
                  </div>
                  <span className={`text-xs font-medium ${
                    isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// Função auxiliar para nomes de fases mais amigáveis
function getPhaseDisplayName(phase: string): string {
  const phaseNames: Record<string, string> = {
    'checking_existing': 'Verificando Aulas Existentes',
    'generating_lessons': 'Gerando Aulas-Texto',
    'completed': 'Geração Concluída',
    'structuring': 'Estruturando Curso',
    'validating': 'Validando Qualidade'
  };

  return phaseNames[phase] || phase;
}

// Hook para usar o LoadingProgress com estado automático e sincronização em tempo real
export function useLoadingProgress(steps = defaultSteps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(prev => prev + 1);
      // Progresso baseado na etapa atual
      const newProgress = Math.round((currentStep / steps.length) * 100);
      setProgress(newProgress);
    }
  };

  const updateProgress = (newProgress: number) => {
    setProgress(Math.min(100, Math.max(0, newProgress)));

    // Atualizar etapa baseada no progresso
    const stepProgress = (newProgress / 100) * steps.length;
    const currentStepFromProgress = Math.min(steps.length, Math.max(1, Math.ceil(stepProgress)));
    setCurrentStep(currentStepFromProgress);
  };

  const complete = () => {
    setCurrentStep(steps.length);
    setProgress(100);
    setIsComplete(true);
  };

  const reset = () => {
    setCurrentStep(1);
    setProgress(0);
    setIsComplete(false);
  };

  return {
    currentStep,
    progress,
    isComplete,
    nextStep,
    updateProgress,
    complete,
    reset,
    totalSteps: steps.length
  };
}