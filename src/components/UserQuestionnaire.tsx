'use client';

import { useState, useEffect } from 'react';
import { User, Target, BookOpen, Clock, ChevronRight, ArrowLeft, Sparkles, Brain, GraduationCap, X } from 'lucide-react';
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

interface UserQuestionnaireProps {
  onComplete: (profile: UserProfile, originalMessage: string) => void;
  onBack: () => void;
  originalMessage: string;
}

export default function UserQuestionnaire({
  onComplete,
  onBack,
  originalMessage
}: UserQuestionnaireProps) {
  const { isDarkMode } = useTheme();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<UserProfile>({
    level: 'beginner',
    purpose: '',
    timeAvailable: '',
    background: '',
    specificGoals: '',
    learningStyle: '',
    educationLevel: undefined,
    priorKnowledge: ''
  });
  const [customAnswers, setCustomAnswers] = useState<{[key: string]: string}>({});
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState<NodeJS.Timeout | null>(null);

  // Cleanup timer on unmount or step change
  useEffect(() => {
    return () => {
      if (autoAdvanceTimer) {
        clearTimeout(autoAdvanceTimer);
      }
    };
  }, [autoAdvanceTimer]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && isStepComplete()) {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handlePrevious();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [step, profile, customAnswers]);

  const questions = [
    {
      id: 'level',
      title: 'Qual é o seu nível de conhecimento?',
      description: 'Isso nos ajuda a adequar o conteúdo para você',
      icon: <BookOpen className="w-6 h-6" />,
      type: 'radio',
      options: [
        { value: 'beginner', label: 'Iniciante', description: 'Pouco ou nenhum conhecimento no assunto' },
        { value: 'intermediate', label: 'Intermediário', description: 'Já tenho alguma base e experiência' },
        { value: 'advanced', label: 'Avançado', description: 'Quero aprofundar conhecimentos específicos' },
        { value: 'other', label: 'Outro', description: 'Descreva seu nível específico' }
      ]
    },
    {
      id: 'priorKnowledge',
      title: 'O que você já sabe sobre este assunto?',
      description: 'Descreva em detalhes seu conhecimento atual para personalizarmos o curso',
      icon: <Brain className="w-6 h-6" />,
      type: 'textarea',
      placeholder: 'Ex: Já entendo conceitos básicos de força e momento, sei calcular centro de gravidade de formas simples, mas tenho dificuldade com estruturas complexas...',
      showCondition: (profile: UserProfile) => profile.level === 'intermediate' || profile.level === 'advanced'
    },
    {
      id: 'purpose',
      title: 'Por que você quer aprender isso?',
      description: 'Entender seu objetivo nos ajuda a personalizar o curso',
      icon: <Target className="w-6 h-6" />,
      type: 'radio',
      options: [
        { value: 'career', label: 'Desenvolvimento da carreira', description: 'Para conseguir um emprego ou promoção' },
        { value: 'personal', label: 'Interesse pessoal', description: 'Curiosidade e crescimento pessoal' },
        { value: 'project', label: 'Projeto específico', description: 'Preciso para um projeto atual' },
        { value: 'academic', label: 'Estudos acadêmicos', description: 'Para complementar estudos formais' },
        { value: 'other', label: 'Outro', description: 'Descreva seu objetivo específico' }
      ]
    },
    {
      id: 'timeAvailable',
      title: 'Quanto tempo você tem disponível?',
      description: 'Vamos ajustar o ritmo do curso para seu tempo',
      icon: <Clock className="w-6 h-6" />,
      type: 'radio',
      options: [
        { value: 'minimal', label: '30 min/dia', description: 'Pouco tempo, ritmo mais lento' },
        { value: 'moderate', label: '1-2 horas/dia', description: 'Tempo moderado, ritmo equilibrado' },
        { value: 'intensive', label: '3+ horas/dia', description: 'Muito tempo, ritmo intensivo' },
        { value: 'other', label: 'Outro', description: 'Descreva sua disponibilidade' }
      ]
    },
    {
      id: 'educationLevel',
      title: 'Esta é uma matéria de qual nível?',
      description: 'Isso nos ajuda a buscar materiais bibliográficos apropriados',
      icon: <GraduationCap className="w-6 h-6" />,
      type: 'radio',
      options: [
        { value: 'high_school', label: 'Ensino Médio', description: 'Matéria escolar (fundamental ou médio)' },
        { value: 'undergraduate', label: 'Graduação', description: 'Disciplina de faculdade/universidade' },
        { value: 'graduate', label: 'Pós-Graduação', description: 'Mestrado, doutorado ou especialização' },
        { value: 'professional', label: 'Profissional', description: 'Cursos técnicos ou profissionalizantes' },
        { value: 'personal_development', label: 'Desenvolvimento Pessoal', description: 'Habilidades pessoais, culinária, autoconhecimento, etc.' },
        { value: 'other', label: 'Outro', description: 'Descreva o nível específico' }
      ]
    },
    {
      id: 'background',
      title: 'Qual é sua experiência relacionada?',
      description: 'Conte um pouco sobre sua experiência prévia (opcional)',
      icon: <User className="w-6 h-6" />,
      type: 'textarea',
      placeholder: 'Ex: Trabalho com desenvolvimento web há 2 anos, mas nunca usei React...'
    },
    {
      id: 'specificGoals',
      title: 'Objetivos específicos',
      description: 'O que você gostaria de conseguir fazer ao final do curso?',
      icon: <Target className="w-6 h-6" />,
      type: 'textarea',
      placeholder: 'Ex: Quero criar um site responsivo, desenvolver um app mobile, automatizar tarefas...'
    }
  ];

  // Filtrar perguntas baseado em condições
  const getFilteredQuestions = () => {
    return questions.filter(question => {
      if (question.showCondition) {
        return question.showCondition(profile);
      }
      return true;
    });
  };

  const filteredQuestions = getFilteredQuestions();
  const currentQuestion = filteredQuestions[step];

  const handleAnswer = (value: string) => {
    setProfile(prev => ({
      ...prev,
      [currentQuestion.id]: value
    }));

    // Limpar resposta customizada quando seleciona opção predefinida
    if (value !== 'other' && customAnswers[currentQuestion.id]) {
      setCustomAnswers(prev => ({
        ...prev,
        [currentQuestion.id]: ''
      }));
    }

    // Auto-advance para radio questions (exceto "other")
    if (currentQuestion.type === 'radio' && value !== 'other') {
      // Limpar timer existente
      if (autoAdvanceTimer) {
        clearTimeout(autoAdvanceTimer);
      }

      // Definir novo timer para auto-advance
      const timer = setTimeout(() => {
        handleNext();
      }, 1000); // 1 segundo de delay

      setAutoAdvanceTimer(timer);
    }
  };

  const handleCustomAnswer = (value: string) => {
    setCustomAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: value
    }));
  };

  const handleNext = () => {
    // Limpar timer de auto-advance se existir
    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer);
      setAutoAdvanceTimer(null);
    }

    setIsTransitioning(true);

    setTimeout(() => {
      const filteredQuestions = getFilteredQuestions();
      if (step < filteredQuestions.length - 1) {
        setStep(step + 1);
      } else {
        // Merge custom answers into the profile
        const finalProfile = { ...profile };

        Object.keys(customAnswers).forEach(key => {
          const customValue = customAnswers[key];
          if (customValue && customValue.trim() && profile[key as keyof UserProfile] === 'other') {
            // Para campos que são 'other', usar a resposta customizada
            (finalProfile as any)[key] = customValue;
          }
        });

        onComplete(finalProfile, originalMessage);
      }
      setIsTransitioning(false);
    }, 150); // Smooth transition delay
  };

  const handlePrevious = () => {
    // Limpar timer de auto-advance se existir
    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer);
      setAutoAdvanceTimer(null);
    }

    setIsTransitioning(true);

    setTimeout(() => {
      if (step > 0) {
        setStep(step - 1);
      } else {
        onBack();
      }
      setIsTransitioning(false);
    }, 150);
  };

  const isStepComplete = () => {
    const value = profile[currentQuestion.id as keyof UserProfile];
    const customValue = customAnswers[currentQuestion.id];

    if (currentQuestion.type === 'textarea') {
      return true; // Textarea fields are optional
    }

    if (currentQuestion.type === 'radio') {
      // Para radio questions, precisa ter uma seleção
      if (!value || value.trim() === '') {
        return false;
      }
      // Se selecionou 'other', precisa ter resposta customizada
      if (value === 'other') {
        return customValue && customValue.trim() !== '';
      }
      return true;
    }

    return value && value.trim() !== '';
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
      isDarkMode ? 'bg-black/60' : 'bg-gray-900/40'
    } backdrop-blur-sm animate-fadeIn`}>
      {/* Modal Container com background decorativo */}
      <div className={`relative max-w-2xl w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
        isDarkMode ? 'bg-gray-800/95' : 'bg-white/95'
      } backdrop-blur-md`}>

        {/* Background decorativo minimalista com animação sutil */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Círculos decorativos animados */}
          <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-20 animate-blob ${
            isDarkMode ? 'bg-blue-500' : 'bg-blue-400'
          }`} />
          <div className={`absolute -bottom-20 -left-20 w-40 h-40 rounded-full blur-3xl opacity-20 animate-blob animation-delay-2000 ${
            isDarkMode ? 'bg-purple-500' : 'bg-purple-400'
          }`} />
          <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full blur-3xl opacity-10 animate-blob animation-delay-4000 ${
            isDarkMode ? 'bg-pink-500' : 'bg-pink-400'
          }`} />
        </div>

        {/* Close Button */}
        <button
          onClick={onBack}
          className={`absolute top-4 right-4 z-10 p-2 rounded-full transition-all duration-200 ${
            isDarkMode
              ? 'hover:bg-gray-700 text-gray-400 hover:text-white'
              : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
          }`}
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content Container - Scrollable Area */}
        <div className="relative z-10 p-6 flex-1 overflow-y-auto">
          {/* Compact Header */}
          <div className="text-center mb-6">
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-3 ${
              isDarkMode ? 'bg-blue-500/20' : 'bg-blue-500/10'
            }`}>
              <Sparkles className={`w-6 h-6 ${
                isDarkMode ? 'text-blue-400' : 'text-blue-600'
              }`} />
            </div>
            <h2 className={`text-2xl font-bold mb-2 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Personalizar Curso
            </h2>

            {/* Progress bar */}
            <div className="mb-4">
              <div className={`flex justify-between text-xs mb-2 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                <span>Pergunta {step + 1} de {filteredQuestions.length}</span>
                <span>{Math.round(((step + 1) / filteredQuestions.length) * 100)}%</span>
              </div>
              <div className={`w-full rounded-full h-2 overflow-hidden ${
                isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
              }`}>
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${((step + 1) / filteredQuestions.length) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Question - Main Content */}
          <div className={`rounded-xl border p-6 transition-all duration-300 ${
            isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
          } ${
            isDarkMode
              ? 'bg-gray-900/30 border-gray-700/50 backdrop-blur-sm'
              : 'bg-white/50 border-gray-200 backdrop-blur-sm'
          }`}>
        <div className="mb-4">
          <h3 className={`text-lg font-bold mb-2 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            {currentQuestion.title}
          </h3>
          <p className={`text-sm ${
            isDarkMode ? 'text-gray-300' : 'text-gray-600'
          }`}>
            {currentQuestion.description}
          </p>
        </div>

        {/* Answer options */}
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {currentQuestion.type === 'radio' && currentQuestion.options?.map((option) => (
            <label
              key={option.value}
              className={`block p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                profile[currentQuestion.id as keyof UserProfile] === option.value
                  ? isDarkMode
                    ? 'border-blue-400 bg-blue-900/50 text-white'
                    : 'border-blue-500 bg-blue-50 text-gray-900'
                  : isDarkMode
                    ? 'border-gray-600 bg-gray-700 hover:border-gray-500 text-gray-200'
                    : 'border-gray-300 bg-gray-50 hover:border-gray-400 text-gray-800'
              }`}
            >
              <input
                type="radio"
                name={currentQuestion.id}
                value={option.value}
                checked={profile[currentQuestion.id as keyof UserProfile] === option.value}
                onChange={(e) => {
                  handleAnswer(e.target.value);
                  // Limpar resposta customizada quando muda seleção
                  if (e.target.value !== 'other') {
                    setCustomAnswers(prev => ({
                      ...prev,
                      [currentQuestion.id]: ''
                    }));
                  }
                }}
                className="sr-only"
              />
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-semibold text-sm mb-1">
                    {option.label}
                  </div>
                  <div className={`text-xs ${
                    profile[currentQuestion.id as keyof UserProfile] === option.value
                      ? isDarkMode ? 'text-blue-200' : 'text-blue-700'
                      : isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {option.description}
                  </div>

                  {/* Campo customizado para "Outro" */}
                  {option.value === 'other' && profile[currentQuestion.id as keyof UserProfile] === 'other' && (
                    <input
                      type="text"
                      value={customAnswers[currentQuestion.id] || ''}
                      onChange={(e) => handleCustomAnswer(e.target.value)}
                      placeholder="Digite sua resposta..."
                      className={`w-full mt-2 p-2 rounded border text-sm focus:ring-1 focus:ring-blue-500 ${
                        isDarkMode
                          ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                      autoFocus
                    />
                  )}
                </div>
                <div className={`w-4 h-4 rounded-full border-2 ml-3 flex-shrink-0 ${
                  profile[currentQuestion.id as keyof UserProfile] === option.value
                    ? 'border-blue-500 bg-blue-500'
                    : isDarkMode
                      ? 'border-gray-500'
                      : 'border-gray-400'
                }`}>
                  {profile[currentQuestion.id as keyof UserProfile] === option.value && (
                    <div className="w-1.5 h-1.5 bg-white rounded-full mx-auto mt-0.5"></div>
                  )}
                </div>
              </div>
            </label>
          ))}

          {currentQuestion.type === 'textarea' && (
            <textarea
              value={profile[currentQuestion.id as keyof UserProfile] || ''}
              onChange={(e) => handleAnswer(e.target.value)}
              placeholder={currentQuestion.placeholder}
              rows={3}
              className={`w-full p-3 border rounded-lg resize-none text-sm focus:ring-1 focus:ring-blue-500 ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
            />
          )}
        </div>
      </div>
        </div>

        {/* Navigation - Fixed at bottom */}
        <div className={`relative z-10 p-6 pt-4 border-t ${
          isDarkMode ? 'border-gray-700/50' : 'border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevious}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isDarkMode
                  ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{step === 0 ? 'Voltar' : 'Anterior'}</span>
            </button>

            <button
              onClick={handleNext}
              disabled={!isStepComplete() && currentQuestion.type === 'radio'}
              className="flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/40 text-sm"
            >
              <span>{step === filteredQuestions.length - 1 ? 'Finalizar' : 'Próximo'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}