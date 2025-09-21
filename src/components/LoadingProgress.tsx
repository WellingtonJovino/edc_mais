'use client';

import React, { useEffect, useState } from 'react';
import { Brain, Search, BookOpen, Sparkles, CheckCircle, Clock } from 'lucide-react';

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
  estimatedTimeMs?: number;
  currentActivity?: string;
}

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
  steps = defaultSteps,
  isComplete = false,
  estimatedTimeMs,
  currentActivity
}: LoadingProgressProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [animatedProgress, setAnimatedProgress] = useState(0);

  // Atualizar progresso com animação suave
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(progress);
    }, 100);
    return () => clearTimeout(timer);
  }, [progress]);

  // Timer de tempo decorrido
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1000);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${remainingSeconds}s`;
  };

  const getEstimatedRemaining = () => {
    if (!estimatedTimeMs || progress === 0) return null;
    const totalEstimated = estimatedTimeMs;
    const progressRatio = progress / 100;
    const estimatedElapsed = totalEstimated * progressRatio;
    const remaining = totalEstimated - estimatedElapsed;
    return Math.max(0, remaining);
  };

  const remainingTime = getEstimatedRemaining();

  return (
    <div className="w-full max-w-2xl mx-auto bg-white border border-gray-200 rounded-xl shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            {!isComplete && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-ping" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {isComplete ? 'Curso Gerado com Sucesso!' : 'Gerando Estrutura do Curso'}
            </h3>
            <p className="text-sm text-gray-600">
              {isComplete ? 'Processamento concluído' : `Etapa ${currentStep} de ${totalSteps}`}
            </p>
          </div>
        </div>

        {/* Timer */}
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <div className="flex items-center space-x-1">
            <Clock className="w-4 h-4" />
            <span>{formatTime(elapsedTime)}</span>
          </div>
          {remainingTime && !isComplete && (
            <div className="text-xs bg-gray-100 px-2 py-1 rounded">
              ~{formatTime(remainingTime)} restante
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            {stepName || steps[currentStep - 1]?.label || 'Processando...'}
          </span>
          <span className="text-sm text-gray-500">{Math.round(animatedProgress)}%</span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden"
            style={{ width: `${animatedProgress}%` }}
          >
            {/* Animação de brilho */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep || isComplete;
          const isPending = stepNumber > currentStep && !isComplete;

          const IconComponent = step.icon;

          return (
            <div
              key={step.id}
              className={`flex items-start space-x-3 p-3 rounded-lg transition-all duration-300 ${
                isActive
                  ? 'bg-blue-50 border border-blue-200'
                  : isCompleted
                  ? 'bg-green-50'
                  : 'bg-gray-50'
              }`}
            >
              {/* Icon */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                isCompleted
                  ? 'bg-green-500 text-white'
                  : isActive
                  ? 'bg-blue-500 text-white animate-pulse'
                  : 'bg-gray-300 text-gray-500'
              }`}>
                {isCompleted ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <IconComponent className="w-4 h-4" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className={`text-sm font-medium ${
                    isActive ? 'text-blue-900' : isCompleted ? 'text-green-800' : 'text-gray-600'
                  }`}>
                    {step.label}
                  </h4>

                  {/* Status badge */}
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    isCompleted
                      ? 'bg-green-100 text-green-700'
                      : isActive
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {isCompleted ? 'Concluído' : isActive ? 'Em andamento' : 'Pendente'}
                  </span>
                </div>

                {step.description && (
                  <p className={`text-xs mt-1 ${
                    isActive ? 'text-blue-700' : isCompleted ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {step.description}
                  </p>
                )}

                {/* Current activity */}
                {isActive && currentActivity && (
                  <div className="mt-2 flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    <span className="text-xs text-blue-600 font-medium">{currentActivity}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      {!isComplete && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
            <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            <span className="ml-2">Processando com IA avançada...</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Hook para usar o LoadingProgress com estado automático
export function useLoadingProgress(steps = defaultSteps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [progress, setProgress] = useState(0);
  const [currentActivity, setCurrentActivity] = useState<string>('');
  const [isComplete, setIsComplete] = useState(false);

  const nextStep = (activity?: string) => {
    if (currentStep < steps.length) {
      setCurrentStep(prev => prev + 1);
      setProgress(Math.round((currentStep / steps.length) * 100));
      if (activity) setCurrentActivity(activity);
    }
  };

  const updateProgress = (newProgress: number, activity?: string) => {
    setProgress(Math.min(100, Math.max(0, newProgress)));
    if (activity) setCurrentActivity(activity);
  };

  const complete = () => {
    setCurrentStep(steps.length);
    setProgress(100);
    setIsComplete(true);
    setCurrentActivity('');
  };

  const reset = () => {
    setCurrentStep(1);
    setProgress(0);
    setCurrentActivity('');
    setIsComplete(false);
  };

  return {
    currentStep,
    progress,
    currentActivity,
    isComplete,
    nextStep,
    updateProgress,
    complete,
    reset,
    totalSteps: steps.length
  };
}