'use client';

import { useState } from 'react';
import { User, Target, BookOpen, Clock, ChevronRight, ArrowLeft, Sparkles, Brain, GraduationCap } from 'lucide-react';

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
  };

  const handleCustomAnswer = (value: string) => {
    setCustomAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: value
    }));
  };

  const handleNext = () => {
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
  };

  const handlePrevious = () => {
    if (step > 0) {
      setStep(step - 1);
    } else {
      onBack();
    }
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
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Vamos personalizar seu aprendizado
        </h2>
        <p className="text-gray-600">
          Responda algumas perguntas para criarmos o melhor curso para você
        </p>

        {/* Progress bar */}
        <div className="mt-6">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>Pergunta {step + 1} de {filteredQuestions.length}</span>
            <span>{Math.round(((step + 1) / filteredQuestions.length) * 100)}% concluído</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${((step + 1) / filteredQuestions.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Original message reminder */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
        <p className="text-blue-800 text-sm">
          <strong>Você quer aprender:</strong> "{originalMessage}"
        </p>
      </div>

      {/* Question */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-start space-x-4 mb-6">
          <div className="p-3 bg-blue-100 rounded-lg">
            {currentQuestion.icon}
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {currentQuestion.title}
            </h3>
            <p className="text-gray-600">
              {currentQuestion.description}
            </p>
          </div>
        </div>

        {/* Answer options */}
        <div className="space-y-3">
          {currentQuestion.type === 'radio' && currentQuestion.options?.map((option) => (
            <label
              key={option.value}
              className={`block p-4 rounded-lg border cursor-pointer transition-colors ${
                profile[currentQuestion.id as keyof UserProfile] === option.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
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
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-medium text-gray-900 mb-1">
                    {option.label}
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    {option.description}
                  </div>

                  {/* Campo customizado para "Outro" */}
                  {option.value === 'other' && profile[currentQuestion.id as keyof UserProfile] === 'other' && (
                    <input
                      type="text"
                      value={customAnswers[currentQuestion.id] || ''}
                      onChange={(e) => handleCustomAnswer(e.target.value)}
                      placeholder="Digite sua resposta..."
                      className="w-full mt-2 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      autoFocus
                    />
                  )}
                </div>
                <div className={`w-4 h-4 rounded-full border-2 ml-3 mt-1 flex-shrink-0 ${
                  profile[currentQuestion.id as keyof UserProfile] === option.value
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300'
                }`}>
                  {profile[currentQuestion.id as keyof UserProfile] === option.value && (
                    <div className="w-1 h-1 bg-white rounded-full mx-auto mt-1"></div>
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
              rows={4}
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrevious}
          className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{step === 0 ? 'Cancelar' : 'Anterior'}</span>
        </button>

        <button
          onClick={handleNext}
          disabled={!isStepComplete() && currentQuestion.type === 'radio'}
          className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span>{step === filteredQuestions.length - 1 ? 'Finalizar' : 'Próximo'}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}