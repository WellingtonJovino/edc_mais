'use client';

import { useState } from 'react';
import { BookOpen, Brain, CheckCircle, Image, Calculator, BarChart3, Lightbulb, MessageCircle, Eye, EyeOff, Sparkles } from 'lucide-react';
import { AulaTextoStructure } from '@/types';
import EducationalImageGenerator from './EducationalImageGenerator';
import LatexRenderer from './LatexRenderer';
import TextWithLatex from './TextWithLatex';

interface EnhancedAulaTextoProps {
  content: AulaTextoStructure;
  onDoubtClick?: (section: string, content: string) => void;
}

export default function EnhancedAulaTexto({ content, onDoubtClick }: EnhancedAulaTextoProps) {
  const [activeSection, setActiveSection] = useState<string>('introducao');
  const [showFormulas, setShowFormulas] = useState<boolean>(true);
  const [expandedConcepts, setExpandedConcepts] = useState<Set<number>>(new Set());
  const [showImageGenerator, setShowImageGenerator] = useState<boolean>(false);

  const sections = [
    { id: 'introducao', label: 'Introdução', icon: BookOpen, color: 'blue' },
    { id: 'desenvolvimento', label: 'Desenvolvimento', icon: Brain, color: 'green' },
    { id: 'conclusao', label: 'Conclusão', icon: CheckCircle, color: 'purple' },
    { id: 'verificacao', label: 'Verificação', icon: MessageCircle, color: 'orange' },
  ];

  const toggleConcept = (index: number) => {
    const newExpanded = new Set(expandedConcepts);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedConcepts(newExpanded);
  };

  const renderFormula = (formula: any, index: number) => (
    <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4 my-4">
      <div className="flex items-center justify-between mb-2">
        <h5 className="font-semibold text-gray-800">
          {typeof formula.nome === 'string' ? formula.nome : 'Fórmula'}
        </h5>
        <Calculator className="w-4 h-4 text-gray-600" />
      </div>
      {showFormulas && (
        <div className="bg-white p-4 rounded border border-gray-300">
          {typeof formula.latex === 'string' && formula.latex.trim() ? (
            <LatexRenderer
              latex={formula.latex}
              displayMode={true}
              className="text-center"
            />
          ) : (
            <div className="text-center text-gray-500 font-mono">
              Fórmula não disponível
            </div>
          )}
        </div>
      )}
      <p className="text-sm text-gray-700 mt-2">
        {typeof formula.explicacao === 'string' ? formula.explicacao : ''}
      </p>
      {formula.aplicacao && typeof formula.aplicacao === 'string' && (
        <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-800">
          <strong>Aplicação:</strong> {formula.aplicacao}
        </div>
      )}
    </div>
  );

  const renderFigure = (figura: any, index: number) => (
    <div key={index} className="my-6">
      <div className={`border-2 border-dashed border-gray-300 rounded-lg p-6 text-center ${
        figura.tamanho === 'pequeno' ? 'h-32' :
        figura.tamanho === 'medio' ? 'h-48' : 'h-64'
      }`}>
        {figura.imageUrl ? (
          <img
            src={figura.imageUrl}
            alt={figura.legenda || 'Figura educacional'}
            className="w-full h-full object-contain rounded"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Image className="w-8 h-8 mb-2" />
            <p className="text-sm font-medium">
              {typeof figura.tipo === 'string' ? figura.tipo.charAt(0).toUpperCase() + figura.tipo.slice(1) : 'Figura'}
            </p>
            <p className="text-xs mt-1 max-w-xs">
              {typeof figura.imagePrompt === 'string' ? figura.imagePrompt : 'Descrição não disponível'}
            </p>
          </div>
        )}
      </div>
      <p className="text-sm text-gray-600 mt-2 text-center font-medium">
        {typeof figura.legenda === 'string' ? figura.legenda : ''}
      </p>
      <p className="text-xs text-gray-500 text-center">
        {typeof figura.descricao === 'string' ? figura.descricao : ''}
      </p>
    </div>
  );

  const renderGraph = (grafico: any, index: number) => (
    <div key={index} className="my-6">
      <h5 className="font-semibold text-gray-800 mb-2 flex items-center">
        <BarChart3 className="w-4 h-4 mr-2" />
        {typeof grafico.titulo === 'string' ? grafico.titulo : 'Gráfico'}
      </h5>
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center h-64">
        {grafico.imageUrl ? (
          <img
            src={grafico.imageUrl}
            alt={grafico.titulo || 'Gráfico educacional'}
            className="w-full h-full object-contain rounded"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <BarChart3 className="w-12 h-12 mb-2" />
            <p className="text-sm font-medium">
              Gráfico: {typeof grafico.tipo === 'string' ? grafico.tipo : 'Não especificado'}
            </p>
            <p className="text-xs mt-1 max-w-xs">
              {typeof grafico.imagePrompt === 'string' ? grafico.imagePrompt : 'Descrição não disponível'}
            </p>
          </div>
        )}
      </div>
      <p className="text-sm text-gray-600 mt-2">
        {typeof grafico.descricao === 'string' ? grafico.descricao : ''}
      </p>
    </div>
  );

  const renderSection = () => {
    switch (activeSection) {
      case 'introducao':
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded-r-lg">
              <h3 className="text-xl font-bold text-blue-800 mb-4">Objetivos de Aprendizagem</h3>
              <ul className="space-y-2">
                {content.introducao.objetivos.map((objetivo, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span className="text-blue-800">{objetivo}</span>
                  </li>
                ))}
              </ul>
            </div>

            {content.introducao.preRequisitos.length > 0 && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-r-lg">
                <h3 className="text-lg font-semibold text-yellow-800 mb-3">Pré-requisitos</h3>
                <ul className="space-y-1">
                  {content.introducao.preRequisitos.map((prereq, index) => (
                    <li key={index} className="text-yellow-700">• {prereq}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-green-50 border-l-4 border-green-400 p-6 rounded-r-lg">
              <h3 className="text-lg font-semibold text-green-800 mb-3">Tempo Estimado</h3>
              <p className="text-green-700 font-medium">{content.introducao.tempoEstimado}</p>
            </div>

            <div className="prose max-w-none">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Visão Geral</h3>
              <div className="text-gray-700 leading-relaxed">
                {content.introducao.overview.split('\n').map((paragraph, index) => (
                  <TextWithLatex key={index} text={paragraph} className="mb-4" />
                ))}
              </div>
            </div>
          </div>
        );

      case 'desenvolvimento':
        return (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-gray-900">Conceitos Principais</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowImageGenerator(!showImageGenerator)}
                  className="flex items-center space-x-2 px-3 py-1 bg-blue-100 rounded-lg text-sm text-blue-600 hover:bg-blue-200"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>🍌 Gerar Imagens</span>
                </button>
                <button
                  onClick={() => setShowFormulas(!showFormulas)}
                  className="flex items-center space-x-2 px-3 py-1 bg-gray-100 rounded-lg text-sm text-gray-600 hover:bg-gray-200"
                >
                  {showFormulas ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span>{showFormulas ? 'Ocultar' : 'Mostrar'} Fórmulas</span>
                </button>
              </div>
            </div>

            {/* Gerador de Imagens Educacionais */}
            {showImageGenerator && (
              <div className="mb-6">
                <EducationalImageGenerator
                  topic={content.topic}
                  level={content.level as 'beginner' | 'intermediate' | 'advanced'}
                  onImageGenerated={(image) => {
                    console.log('✅ Imagem educacional gerada:', image);
                    // Aqui você poderia adicionar a imagem à aula-texto dinamicamente
                  }}
                  suggestedPrompts={[
                    `Diagrama técnico sobre ${content.topic}`,
                    `Ilustração didática dos conceitos de ${content.topic}`,
                    `Gráfico explicativo sobre ${content.topic}`,
                    `Esquema passo-a-passo de ${content.topic}`
                  ]}
                />
              </div>
            )}

            {content.desenvolvimento.conceitos.map((conceito, conceptIndex) => (
              <div key={conceptIndex} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleConcept(conceptIndex)}
                  className="w-full p-6 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xl font-semibold text-gray-800">{conceito.titulo}</h4>
                    <div className="transform transition-transform">
                      {expandedConcepts.has(conceptIndex) ? '−' : '+'}
                    </div>
                  </div>
                  <p className="text-gray-600 mt-2">{conceito.definicao}</p>
                </button>

                {expandedConcepts.has(conceptIndex) && (
                  <div className="px-6 pb-6 border-t border-gray-100">
                    {/* Figuras na posição "início" */}
                    {conceito.figuras?.filter(f => f.posicao === 'inicio').map((figura, index) =>
                      renderFigure(figura, index)
                    )}

                    <div className="prose max-w-none my-6">
                      <h5 className="text-lg font-semibold text-gray-800 mb-3">Explicação Detalhada</h5>
                      <div className="text-gray-700 leading-relaxed">
                        {typeof conceito.explicacao === 'string'
                          ? conceito.explicacao.split('\n').map((paragraph, index) => (
                              <TextWithLatex key={index} text={paragraph} className="mb-4" />
                            ))
                          : <p className="mb-4 text-gray-500">Explicação não disponível</p>
                        }
                      </div>
                    </div>

                    {/* Fórmulas */}
                    {conceito.formulas?.map((formula, index) => renderFormula(formula, index))}

                    {/* Figuras na posição "meio" */}
                    {conceito.figuras?.filter(f => f.posicao === 'meio').map((figura, index) =>
                      renderFigure(figura, index)
                    )}

                    {/* Gráficos */}
                    {conceito.graficos?.map((grafico, index) => renderGraph(grafico, index))}

                    {/* Exemplos */}
                    {conceito.exemplos.length > 0 && (
                      <div className="mt-6">
                        <h5 className="text-lg font-semibold text-gray-800 mb-4">Exemplos Práticos</h5>
                        <div className="space-y-4">
                          {conceito.exemplos.map((exemplo, index) => (
                            <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <h6 className="font-medium text-blue-800 mb-2">
                                {typeof exemplo.titulo === 'string' ? exemplo.titulo : `Exemplo ${index + 1}`}
                              </h6>
                              <p className="text-blue-700 mb-3">
                                {typeof exemplo.descricao === 'string' ? exemplo.descricao : ''}
                              </p>
                              {exemplo.solucao && typeof exemplo.solucao === 'string' && (
                                <div className="bg-white p-3 rounded border border-blue-300">
                                  <p className="text-sm font-medium text-gray-700 mb-1">Solução:</p>
                                  <p className="text-gray-600">{exemplo.solucao}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Analogias */}
                    {conceito.analogias.length > 0 && (
                      <div className="mt-6">
                        <h5 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                          <Lightbulb className="w-5 h-5 mr-2 text-yellow-500" />
                          Analogias
                        </h5>
                        <div className="space-y-3">
                          {conceito.analogias.map((analogia, index) => (
                            <div key={index} className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
                              <p className="text-yellow-800">
                                {typeof analogia === 'string' ? analogia : ''}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Figuras na posição "fim" */}
                    {conceito.figuras?.filter(f => f.posicao === 'fim').map((figura, index) =>
                      renderFigure(figura, index)
                    )}

                    {/* Botão de dúvidas */}
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => onDoubtClick?.(conceito.titulo, conceito.explicacao)}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>Tirar dúvida sobre este conceito</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        );

      case 'conclusao':
        return (
          <div className="space-y-6">
            <div className="prose max-w-none">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Resumo Executivo</h3>
              <div className="text-gray-700 leading-relaxed">
                {content.conclusao.resumoExecutivo.split('\n').map((paragraph, index) => (
                  <TextWithLatex key={index} text={paragraph} className="mb-4" />
                ))}
              </div>
            </div>

            <div className="bg-green-50 border-l-4 border-green-400 p-6 rounded-r-lg">
              <h4 className="text-lg font-semibold text-green-800 mb-4">Pontos-Chave</h4>
              <ul className="space-y-2">
                {content.conclusao.pontosChave.map((ponto, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-green-800">{ponto}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-purple-50 border-l-4 border-purple-400 p-6 rounded-r-lg">
              <h4 className="text-lg font-semibold text-purple-800 mb-4">Próximos Passos</h4>
              <ul className="space-y-2">
                {content.conclusao.conexoesFuturas.map((conexao, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-purple-600 font-bold">→</span>
                    <span className="text-purple-800">{conexao}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );

      case 'verificacao':
        return (
          <div className="space-y-8">
            {/* Perguntas de Reflexão */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Perguntas de Reflexão</h3>
              <div className="space-y-4">
                {content.verificacao.perguntasReflexao.map((pergunta, index) => (
                  <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        {index + 1}
                      </div>
                      <p className="text-blue-800">{pergunta}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Exercícios */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Exercícios de Verificação</h3>
              <div className="space-y-6">
                {content.verificacao.exercicios.map((exercicio, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-gray-800">Exercício {index + 1}</h4>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        exercicio.dificuldade === 'facil' ? 'bg-green-100 text-green-700' :
                        exercicio.dificuldade === 'medio' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {exercicio.dificuldade.charAt(0).toUpperCase() + exercicio.dificuldade.slice(1)}
                      </span>
                    </div>
                    <div className="mb-4 p-4 bg-gray-50 rounded border-l-4 border-gray-400">
                      <p className="text-gray-800">{exercicio.pergunta}</p>
                    </div>
                    <details className="cursor-pointer">
                      <summary className="font-medium text-blue-600 hover:text-blue-700">
                        Ver resposta e explicação
                      </summary>
                      <div className="mt-4 space-y-3">
                        <div className="p-3 bg-green-50 rounded border-l-4 border-green-400">
                          <p className="text-sm font-medium text-green-700 mb-1">Resposta:</p>
                          <p className="text-green-800">{exercicio.gabarito}</p>
                        </div>
                        <div className="p-3 bg-blue-50 rounded border-l-4 border-blue-400">
                          <p className="text-sm font-medium text-blue-700 mb-1">Explicação:</p>
                          <p className="text-blue-800">{exercicio.explicacao}</p>
                        </div>
                      </div>
                    </details>
                  </div>
                ))}
              </div>
            </div>

            {/* Auto-avaliação */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Auto-avaliação</h3>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                <p className="text-purple-800 mb-4">
                  Reflita sobre as seguintes afirmações e avalie seu nível de compreensão:
                </p>
                <div className="space-y-3">
                  {content.verificacao.autoavaliacao.map((item, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        className="mt-1 text-purple-600"
                        id={`auto-${index}`}
                      />
                      <label htmlFor={`auto-${index}`} className="text-purple-700 cursor-pointer">
                        {item}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{content.topic}</h1>
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <span>Nível: {content.level}</span>
          <span>•</span>
          <span>Gerado em: {new Date(content.metadata.generatedAt).toLocaleString('pt-BR')}</span>
          {content.metadata.qualityScore && (
            <>
              <span>•</span>
              <span>Qualidade: {content.metadata.qualityScore}/10</span>
            </>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="flex space-x-8">
          {sections.map((section) => {
            const IconComponent = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm ${
                  activeSection === section.id
                    ? `border-${section.color}-500 text-${section.color}-600`
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <IconComponent className="w-4 h-4" />
                <span>{section.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="min-h-96">
        {renderSection()}
      </div>

      {/* References */}
      {content.referencias.length > 0 && (
        <div className="mt-12 pt-8 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Referências</h3>
          <div className="space-y-2">
            {content.referencias.map((ref, index) => (
              <div key={index} className="text-sm text-gray-600">
                <span className="font-medium">{ref.titulo}</span>
                {ref.url && (
                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-blue-600 hover:text-blue-700"
                  >
                    [Link]
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}