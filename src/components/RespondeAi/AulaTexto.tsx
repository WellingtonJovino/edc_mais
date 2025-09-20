'use client';

import { useState } from 'react';
import { MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import TextWithLatex from '../TextWithLatex';
import LatexRenderer from '../LatexRenderer';

interface AulaTextoSection {
  id: string;
  title: string;
  content: string;
  type: 'introduction' | 'concept' | 'example' | 'formula' | 'conclusion';
  expanded?: boolean;
}

interface Topic {
  id: string;
  title: string;
  aula_texto?: {
    introducao?: {
      overview?: string;
      objetivos?: string[];
      preRequisitos?: string[];
    };
    desenvolvimento?: {
      conceitos?: Array<{
        titulo: string;
        definicao: string;
        explicacao: string;
        exemplos?: any[];
        formulas?: any[];
      }>;
    };
    conclusao?: {
      resumoExecutivo?: string;
      pontosChave?: string[];
    };
  };
  sections?: AulaTextoSection[];
}

interface RespondeAiAulaTextoProps {
  topic: Topic;
  onDoubtClick?: (section: string, content: string) => void;
}

export default function RespondeAiAulaTexto({
  topic,
  onDoubtClick
}: RespondeAiAulaTextoProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['introducao']));

  // Converter aula_texto para seções se não houver sections
  const getSections = (): AulaTextoSection[] => {
    if (topic.sections && topic.sections.length > 0) {
      return topic.sections;
    }

    // Converter estrutura antiga para nova
    const sections: AulaTextoSection[] = [];

    if (topic.aula_texto?.introducao?.overview) {
      sections.push({
        id: 'introducao',
        title: 'Introdução',
        content: topic.aula_texto.introducao.overview,
        type: 'introduction'
      });
    }

    if (topic.aula_texto?.desenvolvimento?.conceitos) {
      topic.aula_texto.desenvolvimento.conceitos.forEach((conceito, index) => {
        sections.push({
          id: `conceito-${index}`,
          title: conceito.titulo,
          content: conceito.explicacao || conceito.definicao,
          type: 'concept'
        });

        // Adicionar fórmulas como seções separadas
        if (conceito.formulas && conceito.formulas.length > 0) {
          conceito.formulas.forEach((formula, fIndex) => {
            sections.push({
              id: `formula-${index}-${fIndex}`,
              title: formula.nome || 'Fórmula',
              content: formula.explicacao || '',
              type: 'formula'
            });
          });
        }
      });
    }

    if (topic.aula_texto?.conclusao?.resumoExecutivo) {
      sections.push({
        id: 'conclusao',
        title: 'Resumo',
        content: topic.aula_texto.conclusao.resumoExecutivo,
        type: 'conclusion'
      });
    }

    return sections;
  };

  const sections = getSections();

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const handleDoubtClick = (section: AulaTextoSection) => {
    if (onDoubtClick) {
      onDoubtClick(section.title, section.content);
    }
  };

  const getSectionIcon = (type: string) => {
    const colors = {
      introduction: 'bg-blue-500',
      concept: 'bg-teal-500',
      example: 'bg-yellow-500',
      formula: 'bg-purple-500',
      conclusion: 'bg-green-500'
    };
    return colors[type as keyof typeof colors] || colors.concept;
  };

  if (sections.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-white">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
            <MessageCircle className="w-8 h-8 text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Conteúdo em Preparação
          </h3>
          <p className="text-gray-600">
            O conteúdo teórico para este tópico está sendo preparado.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white min-h-full">
      {/* Título do Tópico */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{topic.title}</h1>
        <div className="h-1 w-20 bg-teal-500 rounded" />
      </div>

      {/* Seções da Aula-Texto */}
      <div className="space-y-6">
        {sections.map((section, index) => {
          const isExpanded = expandedSections.has(section.id);
          const isIntroduction = section.type === 'introduction';

          return (
            <div key={section.id} className="bg-gray-50 rounded-lg overflow-hidden">
              {/* Cabeçalho da Seção */}
              <div
                className={`
                  flex items-center justify-between p-4 cursor-pointer
                  ${isExpanded ? 'bg-teal-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}
                  transition-all duration-200
                `}
                onClick={() => toggleSection(section.id)}
              >
                <div className="flex items-center space-x-3">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold
                    ${isExpanded ? 'bg-white bg-opacity-20' : getSectionIcon(section.type)}
                  `}>
                    {index + 1}
                  </div>
                  <h3 className="text-lg font-semibold">{section.title}</h3>
                </div>

                <div className="flex items-center space-x-3">
                  {/* Botão Tirar Dúvida */}
                  {onDoubtClick && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDoubtClick(section);
                      }}
                      className={`
                        flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors
                        ${isExpanded
                          ? 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
                          : 'bg-teal-500 text-white hover:bg-teal-600'
                        }
                      `}
                    >
                      <MessageCircle className="w-4 h-4 mr-1" />
                      Tirar dúvida desta seção
                    </button>
                  )}

                  {/* Ícone de Expansão */}
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </div>
              </div>

              {/* Conteúdo da Seção */}
              {isExpanded && (
                <div className="p-6 bg-white">
                  {section.type === 'formula' ? (
                    // Renderização especial para fórmulas
                    <div className="space-y-4">
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="bg-white p-4 rounded border border-gray-300 text-center">
                          {/* Aqui você colocaria a fórmula LaTeX específica */}
                          <LatexRenderer
                            latex="f(x) = ax + b"
                            displayMode={true}
                            className="text-center"
                          />
                        </div>
                      </div>
                      <div className="prose max-w-none">
                        <TextWithLatex
                          text={section.content}
                          className="text-gray-700 leading-relaxed"
                        />
                      </div>
                    </div>
                  ) : (
                    // Renderização normal para texto
                    <div className="prose max-w-none">
                      {section.content.split('\n\n').map((paragraph, pIndex) => (
                        <TextWithLatex
                          key={pIndex}
                          text={paragraph}
                          className="text-gray-700 leading-relaxed mb-4"
                        />
                      ))}
                    </div>
                  )}

                  {/* Seção especial para introdução */}
                  {isIntroduction && section.content.includes('Funções afim') && (
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-2">Exemplos de Funções Afim:</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div className="bg-white p-3 rounded">
                          <LatexRenderer latex="f(x) = x + 2" displayMode={true} />
                        </div>
                        <div className="bg-white p-3 rounded">
                          <LatexRenderer latex="f(x) = -\frac{3}{2}x" displayMode={true} />
                        </div>
                        <div className="bg-white p-3 rounded">
                          <LatexRenderer latex="f(x) = 5" displayMode={true} />
                        </div>
                        <div className="bg-white p-3 rounded">
                          <LatexRenderer latex="f(x) = 1.4x - 0.1\pi" displayMode={true} />
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-3">
                        Ou seja, sempre serão funções que lembram muito um polinômio de grau 1 ou grau 0 (o maior valor de expoente que vai estar junto do "x" é 1 ou 0).
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Navegação Inferior */}
      <div className="mt-12 flex justify-between items-center">
        <button className="flex items-center text-teal-600 hover:text-teal-800 transition-colors">
          ← Tópico Anterior
        </button>
        <button className="flex items-center text-teal-600 hover:text-teal-800 transition-colors">
          Próximo Tópico →
        </button>
      </div>
    </div>
  );
}