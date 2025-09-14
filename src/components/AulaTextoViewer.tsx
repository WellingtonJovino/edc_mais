'use client';

import { useState } from 'react';
import * as React from 'react';
import {
  BookOpen,
  Target,
  Brain,
  CheckCircle2,
  HelpCircle,
  ExternalLink,
  Clock,
  Star,
  Award,
  AlertCircle,
  ChevronRight,
  Lightbulb,
  FileText,
  Gauge
} from 'lucide-react';
import { AulaTextoStructure, AulaTextoQualityAssessment } from '@/types';

interface AulaTextoViewerProps {
  aulaTexto: AulaTextoStructure;
  assessment?: AulaTextoQualityAssessment;
  showQualityScore?: boolean;
}

export default function AulaTextoViewer({
  aulaTexto,
  assessment,
  showQualityScore = false
}: AulaTextoViewerProps) {
  const [activeSection, setActiveSection] = useState<string>('introducao');
  const [expandedExercise, setExpandedExercise] = useState<number | null>(null);
  const [expandedConceito, setExpandedConceito] = useState<number | null>(null);

  const sections = [
    { id: 'introducao', label: 'Introdução', icon: BookOpen, color: 'blue' },
    { id: 'desenvolvimento', label: 'Desenvolvimento', icon: Brain, color: 'purple' },
    { id: 'conclusao', label: 'Conclusão', icon: Target, color: 'green' },
    { id: 'verificacao', label: 'Verificação', icon: CheckCircle2, color: 'orange' },
    { id: 'referencias', label: 'Referências', icon: ExternalLink, color: 'gray' }
  ];

  const getLevelBadge = (level: string) => {
    const configs = {
      beginner: { label: 'Iniciante', color: 'bg-green-100 text-green-800', icon: '🌱' },
      intermediate: { label: 'Intermediário', color: 'bg-yellow-100 text-yellow-800', icon: '🌿' },
      advanced: { label: 'Avançado', color: 'bg-red-100 text-red-800', icon: '🌳' }
    };
    const config = configs[level as keyof typeof configs] || configs.intermediate;
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        {config.icon} {config.label}
      </span>
    );
  };

  const getQualityBadge = (score: number) => {
    if (score >= 9) return { label: 'Excelente', color: 'bg-emerald-100 text-emerald-800', icon: Star };
    if (score >= 8) return { label: 'Muito Bom', color: 'bg-blue-100 text-blue-800', icon: Award };
    if (score >= 7) return { label: 'Bom', color: 'bg-yellow-100 text-yellow-800', icon: CheckCircle2 };
    return { label: 'Precisa Melhorar', color: 'bg-red-100 text-red-800', icon: AlertCircle };
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'introducao':
        return (
          <div className="space-y-6">
            {/* Overview */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-400 p-6 rounded-lg">
              <div className="flex items-center space-x-3 mb-4">
                <BookOpen className="w-6 h-6 text-blue-600" />
                <h3 className="text-xl font-bold text-blue-800">Visão Geral</h3>
              </div>
              <p className="text-blue-700 leading-relaxed text-lg">{aulaTexto.introducao.overview}</p>
            </div>

            {/* Objetivos */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Target className="w-5 h-5 text-green-600" />
                <h4 className="text-lg font-semibold text-gray-900">Objetivos de Aprendizado</h4>
              </div>
              <ul className="space-y-3">
                {aulaTexto.introducao.objetivos.map((objetivo, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 leading-relaxed">{objetivo}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Pré-requisitos e Tempo */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <FileText className="w-5 h-5 text-yellow-600" />
                  <h4 className="font-semibold text-yellow-800">Pré-requisitos</h4>
                </div>
                <ul className="space-y-2">
                  {aulaTexto.introducao.preRequisitos.map((prereq, index) => (
                    <li key={index} className="text-yellow-700 text-sm">• {prereq}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Clock className="w-5 h-5 text-purple-600" />
                  <h4 className="font-semibold text-purple-800">Tempo Estimado</h4>
                </div>
                <p className="text-purple-700 text-lg font-medium">{aulaTexto.introducao.tempoEstimado}</p>
              </div>
            </div>
          </div>
        );

      case 'desenvolvimento':
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-3 mb-6">
              <Brain className="w-6 h-6 text-purple-600" />
              <h3 className="text-2xl font-bold text-gray-900">Desenvolvimento do Conteúdo</h3>
            </div>

            {aulaTexto.desenvolvimento.conceitos.map((conceito, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                {/* Header do Conceito */}
                <div
                  className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 cursor-pointer hover:from-purple-100 hover:to-blue-100 transition-colors"
                  onClick={() => setExpandedConceito(expandedConceito === index ? null : index)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <h4 className="text-xl font-bold text-purple-800">{conceito.titulo}</h4>
                    </div>
                    <ChevronRight
                      className={`w-5 h-5 text-purple-600 transform transition-transform ${
                        expandedConceito === index ? 'rotate-90' : ''
                      }`}
                    />
                  </div>
                </div>

                {/* Conteúdo do Conceito */}
                {expandedConceito === index && (
                  <div className="p-6 space-y-6">
                    {/* Definição */}
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
                      <h5 className="font-semibold text-blue-800 mb-2">Definição</h5>
                      <p className="text-blue-700 leading-relaxed">{conceito.definicao}</p>
                    </div>

                    {/* Explicação */}
                    <div className="bg-gray-50 border-l-4 border-gray-400 p-4 rounded">
                      <h5 className="font-semibold text-gray-800 mb-2">Explicação Detalhada</h5>
                      <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                        {conceito.explicacao}
                      </div>
                    </div>

                    {/* Analogias */}
                    {conceito.analogias.length > 0 && (
                      <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded">
                        <div className="flex items-center space-x-2 mb-3">
                          <Lightbulb className="w-5 h-5 text-green-600" />
                          <h5 className="font-semibold text-green-800">Analogias</h5>
                        </div>
                        <ul className="space-y-2">
                          {conceito.analogias.map((analogia, anaIndex) => (
                            <li key={anaIndex} className="text-green-700 leading-relaxed">
                              💡 {analogia}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Exemplos */}
                    {conceito.exemplos.length > 0 && (
                      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                        <h5 className="font-semibold text-yellow-800 mb-3">Exemplos Práticos</h5>
                        <div className="space-y-4">
                          {conceito.exemplos.map((exemplo, exIndex) => (
                            <div key={exIndex} className="bg-white p-4 rounded border">
                              <h6 className="font-medium text-gray-900 mb-2">{exemplo.titulo}</h6>
                              <p className="text-gray-700 mb-2">{exemplo.descricao}</p>
                              {exemplo.solucao && (
                                <div className="bg-gray-50 p-3 rounded mt-2">
                                  <span className="text-sm font-medium text-gray-600">Solução:</span>
                                  <p className="text-gray-700 mt-1">{exemplo.solucao}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Figuras */}
                    {conceito.figuras && conceito.figuras.length > 0 && (
                      <div className="bg-indigo-50 border-l-4 border-indigo-400 p-4 rounded">
                        <h5 className="font-semibold text-indigo-800 mb-3">Recursos Visuais</h5>
                        <div className="space-y-3">
                          {conceito.figuras.map((figura, figIndex) => (
                            <div key={figIndex} className="bg-white p-3 rounded border">
                              <p className="text-indigo-700 text-sm mb-2">{figura.descricao}</p>
                              <div className="bg-indigo-50 p-2 rounded text-xs text-indigo-600">
                                Prompt para imagem: {figura.imagePrompt}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        );

      case 'conclusao':
        return (
          <div className="space-y-6">
            {/* Resumo Executivo */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-400 p-6 rounded-lg">
              <div className="flex items-center space-x-3 mb-4">
                <Target className="w-6 h-6 text-green-600" />
                <h3 className="text-xl font-bold text-green-800">Resumo Executivo</h3>
              </div>
              <p className="text-green-700 leading-relaxed text-lg">{aulaTexto.conclusao.resumoExecutivo}</p>
            </div>

            {/* Pontos-chave */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Pontos-chave para Lembrar</h4>
              <ul className="space-y-3">
                {aulaTexto.conclusao.pontosChave.map((ponto, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <Star className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 leading-relaxed">{ponto}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Conexões Futuras */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-blue-800 mb-4">Próximos Passos</h4>
              <ul className="space-y-2">
                {aulaTexto.conclusao.conexoesFuturas.map((conexao, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <ChevronRight className="w-4 h-4 text-blue-600 mt-1 flex-shrink-0" />
                    <span className="text-blue-700">{conexao}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );

      case 'verificacao':
        return (
          <div className="space-y-6">
            {/* Perguntas de Reflexão */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center space-x-3 mb-4">
                <HelpCircle className="w-6 h-6 text-orange-600" />
                <h3 className="text-xl font-bold text-gray-900">Perguntas de Reflexão</h3>
              </div>
              <div className="space-y-3">
                {aulaTexto.verificacao.perguntasReflexao.map((pergunta, index) => (
                  <div key={index} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                        ?
                      </div>
                      <p className="text-orange-800 leading-relaxed">{pergunta}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Exercícios */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Exercícios Práticos</h3>
              <div className="space-y-4">
                {aulaTexto.verificacao.exercicios.map((exercicio, index) => (
                  <div key={index} className="bg-gray-50 border border-gray-300 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-semibold text-gray-900">Exercício {index + 1}</h4>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        exercicio.dificuldade === 'facil' ? 'bg-green-100 text-green-800' :
                        exercicio.dificuldade === 'medio' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {exercicio.dificuldade === 'facil' ? 'Fácil' :
                         exercicio.dificuldade === 'medio' ? 'Médio' : 'Difícil'}
                      </span>
                    </div>

                    <p className="text-gray-700 mb-3 leading-relaxed">{exercicio.pergunta}</p>

                    <details
                      className="mt-3"
                      open={expandedExercise === index}
                      onToggle={() => setExpandedExercise(expandedExercise === index ? null : index)}
                    >
                      <summary className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium">
                        🔄 Ver gabarito e explicação
                      </summary>
                      <div className="mt-3 p-4 bg-white border border-blue-200 rounded">
                        <div className="mb-3">
                          <span className="font-medium text-gray-700">Gabarito:</span>
                          <p className="text-green-700 mt-1">{exercicio.gabarito}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Explicação:</span>
                          <p className="text-gray-600 mt-1 leading-relaxed">{exercicio.explicacao}</p>
                        </div>
                      </div>
                    </details>
                  </div>
                ))}
              </div>
            </div>

            {/* Auto-avaliação */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-purple-800 mb-4">Auto-avaliação</h3>
              <div className="space-y-2">
                {aulaTexto.verificacao.autoavaliacao.map((item, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                    <span className="text-purple-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'referencias':
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Referências e Fontes</h3>
            {aulaTexto.referencias.length > 0 ? (
              <div className="space-y-4">
                {aulaTexto.referencias.map((referencia, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-2">{referencia.titulo}</h4>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div className="flex items-center space-x-1">
                            <FileText className="w-4 h-4" />
                            <span className="capitalize">Tipo: {referencia.tipo}</span>
                          </div>
                          {referencia.citacao && (
                            <div className="text-gray-500 italic">
                              "{referencia.citacao}"
                            </div>
                          )}
                        </div>
                      </div>
                      {referencia.url && (
                        <a
                          href={referencia.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-4 flex items-center space-x-1 text-blue-600 hover:text-blue-800"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span className="text-sm">Ver fonte</span>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">Nenhuma referência específica para esta aula.</p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">{aulaTexto.topic}</h1>
            <div className="flex items-center space-x-4">
              {getLevelBadge(aulaTexto.level)}
              {showQualityScore && assessment && (
                <div className="flex items-center space-x-2">
                  <Gauge className="w-4 h-4 text-white" />
                  <span className="text-white text-sm">
                    Qualidade: {assessment.score}/10
                  </span>
                </div>
              )}
            </div>
          </div>
          {showQualityScore && assessment && (
            <div className={`px-3 py-2 rounded-lg ${getQualityBadge(assessment.score).color}`}>
              <div className="flex items-center space-x-2">
                {React.createElement(getQualityBadge(assessment.score).icon, { className: "w-4 h-4" })}
                <span className="text-sm font-medium">{getQualityBadge(assessment.score).label}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-1 px-6 overflow-x-auto">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeSection === section.id
                    ? `border-${section.color}-500 text-${section.color}-600`
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{section.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {renderSection()}
      </div>

      {/* Metadata Footer */}
      {aulaTexto.metadata && (
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <span>Gerado em: {new Date(aulaTexto.metadata.generatedAt).toLocaleDateString('pt-BR')}</span>
              {aulaTexto.metadata.tokensUsed && (
                <span>Tokens: {aulaTexto.metadata.tokensUsed}</span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <span>Fontes:</span>
              {aulaTexto.metadata.sources.map((source, index) => (
                <span key={index} className="px-2 py-1 bg-gray-200 rounded text-xs">
                  {source}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}