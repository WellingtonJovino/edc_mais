'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, Eye, EyeOff, Lightbulb, Clock } from 'lucide-react';
import TextWithLatex from '../TextWithLatex';

interface Exercise {
  id: string;
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
  hint?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeEstimate?: string;
}

interface RespondeAiExercisesProps {
  exercises: Exercise[];
  type: 'fixation' | 'exam';
  topicTitle: string;
}

export default function RespondeAiExercises({
  exercises,
  type,
  topicTitle
}: RespondeAiExercisesProps) {
  const [currentExercise, setCurrentExercise] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [answers, setAnswers] = useState<Map<number, { selected: string; correct: boolean }>>(new Map());

  const exercise = exercises[currentExercise];
  const hasAnswered = answers.has(currentExercise);
  const userAnswer = answers.get(currentExercise);

  const getTypeInfo = () => {
    if (type === 'fixation') {
      return {
        title: 'Exercícios de Fixação',
        description: 'Exercícios básicos para fixar o conteúdo aprendido',
        color: 'blue',
        icon: '📝'
      };
    }
    return {
      title: 'Tempo Sobrando? Exercícios de Prova',
      description: 'Exercícios mais desafiadores de nível de concurso e vestibular',
      color: 'purple',
      icon: '🎯'
    };
  };

  const typeInfo = getTypeInfo();

  const getDifficultyColor = (difficulty: string) => {
    const colors = {
      easy: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      hard: 'bg-red-100 text-red-800'
    };
    return colors[difficulty as keyof typeof colors] || colors.medium;
  };

  const getDifficultyLabel = (difficulty: string) => {
    const labels = {
      easy: 'Fácil',
      medium: 'Médio',
      hard: 'Difícil'
    };
    return labels[difficulty as keyof typeof labels] || 'Médio';
  };

  const handleAnswerSelect = (answer: string) => {
    if (hasAnswered) return;
    setSelectedAnswer(answer);
  };

  const submitAnswer = () => {
    if (!selectedAnswer || hasAnswered) return;

    const isCorrect = selectedAnswer === exercise.correctAnswer;
    const newAnswers = new Map(answers);
    newAnswers.set(currentExercise, { selected: selectedAnswer, correct: isCorrect });
    setAnswers(newAnswers);
    setShowAnswer(true);
  };

  const nextExercise = () => {
    if (currentExercise < exercises.length - 1) {
      setCurrentExercise(currentExercise + 1);
      setSelectedAnswer(null);
      setShowAnswer(false);
      setShowHint(false);
    }
  };

  const previousExercise = () => {
    if (currentExercise > 0) {
      setCurrentExercise(currentExercise - 1);
      setSelectedAnswer(null);
      setShowAnswer(false);
      setShowHint(false);
    }
  };

  const getScore = () => {
    const correctCount = Array.from(answers.values()).filter(a => a.correct).length;
    return {
      correct: correctCount,
      total: answers.size,
      percentage: answers.size > 0 ? Math.round((correctCount / answers.size) * 100) : 0
    };
  };

  if (!exercises || exercises.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-white">
        <div className="text-center">
          <div className="text-6xl mb-4">{typeInfo.icon}</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {typeInfo.title}
          </h3>
          <p className="text-gray-600 mb-4">
            Os exercícios para este tópico estão sendo preparados.
          </p>
          <div className="text-sm text-gray-500">
            Em breve você terá acesso a exercícios de {type === 'fixation' ? 'fixação' : 'nível de prova'}.
          </div>
        </div>
      </div>
    );
  }

  const score = getScore();

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white min-h-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <span className="text-3xl mr-2">{typeInfo.icon}</span>
              {typeInfo.title}
            </h1>
            <p className="text-gray-600 mt-1">{typeInfo.description}</p>
            <div className="text-sm text-gray-500 mt-2">
              Tópico: <span className="font-medium">{topicTitle}</span>
            </div>
          </div>

          {/* Progress */}
          <div className="text-right">
            <div className="text-lg font-bold text-gray-900">
              {currentExercise + 1} de {exercises.length}
            </div>
            {score.total > 0 && (
              <div className="text-sm text-gray-500">
                Acertos: {score.correct}/{score.total} ({score.percentage}%)
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              typeInfo.color === 'blue' ? 'bg-blue-500' : 'bg-purple-500'
            }`}
            style={{ width: `${((currentExercise + 1) / exercises.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Exercise Card */}
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        {/* Exercise Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <span className={`
              px-3 py-1 rounded-full text-sm font-medium
              ${getDifficultyColor(exercise.difficulty)}
            `}>
              {getDifficultyLabel(exercise.difficulty)}
            </span>
            {exercise.timeEstimate && (
              <span className="flex items-center text-sm text-gray-600">
                <Clock className="w-4 h-4 mr-1" />
                ~{exercise.timeEstimate}
              </span>
            )}
          </div>

          {/* Hint Button */}
          {exercise.hint && (
            <button
              onClick={() => setShowHint(!showHint)}
              className="flex items-center px-3 py-1 bg-yellow-100 text-yellow-800 rounded-lg text-sm hover:bg-yellow-200 transition-colors"
            >
              <Lightbulb className="w-4 h-4 mr-1" />
              {showHint ? 'Ocultar Dica' : 'Ver Dica'}
            </button>
          )}
        </div>

        {/* Hint */}
        {showHint && exercise.hint && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div className="flex items-start">
              <Lightbulb className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
              <div>
                <div className="font-medium text-yellow-800 mb-1">Dica:</div>
                <TextWithLatex text={exercise.hint} className="text-yellow-700" />
              </div>
            </div>
          </div>
        )}

        {/* Question */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Questão {currentExercise + 1}:
          </h3>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <TextWithLatex text={exercise.question} className="text-gray-800 leading-relaxed" />
          </div>
        </div>

        {/* Options */}
        {exercise.options && (
          <div className="space-y-3 mb-6">
            {exercise.options.map((option, index) => {
              const optionLetter = String.fromCharCode(65 + index); // A, B, C, D
              const isSelected = selectedAnswer === option;
              const isCorrect = option === exercise.correctAnswer;
              const isWrong = hasAnswered && isSelected && !isCorrect;
              const shouldHighlight = hasAnswered && isCorrect;

              return (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(option)}
                  disabled={hasAnswered}
                  className={`
                    w-full text-left p-4 rounded-lg border-2 transition-all duration-200
                    ${isSelected && !hasAnswered
                      ? 'border-blue-500 bg-blue-50'
                      : shouldHighlight
                      ? 'border-green-500 bg-green-50'
                      : isWrong
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                    }
                    ${hasAnswered ? 'cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                      ${isSelected && !hasAnswered
                        ? 'bg-blue-500 text-white'
                        : shouldHighlight
                        ? 'bg-green-500 text-white'
                        : isWrong
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-200 text-gray-700'
                      }
                    `}>
                      {optionLetter}
                    </div>
                    <div className="flex-1">
                      <TextWithLatex text={option} />
                    </div>
                    {hasAnswered && isCorrect && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                    {isWrong && (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Answer Explanation */}
        {showAnswer && exercise.explanation && (
          <div className={`
            p-4 rounded-lg mb-6
            ${userAnswer?.correct ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}
          `}>
            <div className="flex items-start">
              {userAnswer?.correct ? (
                <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
              )}
              <div>
                <div className={`font-medium mb-2 ${
                  userAnswer?.correct ? 'text-green-800' : 'text-red-800'
                }`}>
                  {userAnswer?.correct ? 'Correto! 🎉' : 'Não foi dessa vez... 😔'}
                </div>
                <div className="text-gray-700">
                  <strong>Explicação:</strong>
                  <div className="mt-1">
                    <TextWithLatex text={exercise.explanation} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={previousExercise}
            disabled={currentExercise === 0}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors"
          >
            ← Anterior
          </button>

          <div className="flex items-center space-x-3">
            {!hasAnswered && selectedAnswer && (
              <button
                onClick={submitAnswer}
                className={`
                  px-6 py-2 text-white rounded-lg font-medium transition-colors
                  ${typeInfo.color === 'blue' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-purple-500 hover:bg-purple-600'}
                `}
              >
                Responder
              </button>
            )}

            {hasAnswered && currentExercise < exercises.length - 1 && (
              <button
                onClick={nextExercise}
                className={`
                  px-6 py-2 text-white rounded-lg font-medium transition-colors
                  ${typeInfo.color === 'blue' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-purple-500 hover:bg-purple-600'}
                `}
              >
                Próxima →
              </button>
            )}

            {hasAnswered && currentExercise === exercises.length - 1 && (
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900 mb-1">
                  Exercícios Concluídos! 🎉
                </div>
                <div className="text-sm text-gray-600">
                  Pontuação final: {score.correct}/{score.total} ({score.percentage}%)
                </div>
              </div>
            )}
          </div>

          <button
            onClick={nextExercise}
            disabled={currentExercise === exercises.length - 1}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors"
          >
            Próximo →
          </button>
        </div>
      </div>
    </div>
  );
}