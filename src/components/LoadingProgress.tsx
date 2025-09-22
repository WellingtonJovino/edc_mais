'use client';

import React, { useEffect, useState } from 'react';
import { Brain, Search, BookOpen, Sparkles, CheckCircle, FileText } from 'lucide-react';

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
}

const defaultSteps: LoadingStep[] = [
  {
    id: 'analyzing',
    label: 'Analisando objetivo',
    icon: Brain,
    description: 'Processando sua solicitação e identificando o domínio de conhecimento'
  },
  {
    id: 'extracting',
    label: 'Extraindo documentos',
    icon: FileText,
    description: 'Processando arquivos enviados e extraindo conteúdo relevante'
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
  steps = defaultSteps,
  isComplete = false,
  onProgressUpdate
}: LoadingProgressProps) {
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
    <div className="w-full max-w-2xl mx-auto bg-white border border-gray-200 rounded-xl shadow-sm p-6 relative overflow-hidden">
      {/* Gradiente sutil de fundo */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-indigo-50/30 pointer-events-none"></div>

      <div className="relative z-10">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <span className="text-lg font-semibold text-gray-900">
              {isComplete ? 'Curso Gerado com Sucesso!' : 'Gerando Estrutura do Curso'}
            </span>
            <span className="text-lg font-bold text-blue-600">{Math.round(animatedProgress)}%</span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden mb-4 relative shadow-inner">
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

          {/* Steps minimalistas */}
          <div className="flex justify-between items-center">
            {steps.map((step, index) => {
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