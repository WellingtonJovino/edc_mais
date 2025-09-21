'use client';

import { useState } from 'react';
import { BookOpen, ExternalLink, Users, Calendar, FileText, GraduationCap, HelpCircle, BookOpenCheck } from 'lucide-react';
import { AcademicContent as AcademicContentType } from '@/types';

interface AcademicContentProps {
  content: AcademicContentType;
}

export default function AcademicContent({ content }: AcademicContentProps) {
  const [activeSection, setActiveSection] = useState<string>('introduction');

  const sections = [
    { id: 'introduction', label: 'Introdução', icon: BookOpen },
    { id: 'lecture', label: 'Aula Teórica', icon: GraduationCap },
    { id: 'concepts', label: 'Conceitos Fundamentais', icon: FileText },
    { id: 'examples', label: 'Exemplos Resolvidos', icon: Users },
    { id: 'mistakes', label: 'Erros Frequentes', icon: Calendar },
    { id: 'exercises', label: 'Exercícios', icon: HelpCircle },
    { id: 'glossary', label: 'Glossário Técnico', icon: BookOpenCheck },
    { id: 'references', label: 'Bibliografia', icon: ExternalLink },
  ];

  const renderSection = () => {
    switch (activeSection) {
      case 'introduction':
        return (
          <div className="prose max-w-none">
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">Introdução</h3>
              <div className="text-blue-700 leading-relaxed">
                {content.introduction.split('\n').map((paragraph, index) => (
                  <p key={index} className="mb-3">{paragraph}</p>
                ))}
              </div>
            </div>
            
            <div className="bg-gray-50 border-l-4 border-gray-400 p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Resumo</h3>
              <div className="text-gray-700 leading-relaxed">
                {content.summary.split('\n').map((paragraph, index) => (
                  <p key={index} className="mb-3">{paragraph}</p>
                ))}
              </div>
            </div>
          </div>
        );

      case 'concepts':
        return (
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Conceitos Fundamentais</h3>
            <div className="grid gap-4">
              {content.keyConcepts.map((concept, index) => (
                <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold">
                      {index + 1}
                    </div>
                    <p className="text-green-800 leading-relaxed">{concept}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'examples':
        return (
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Exemplos Resolvidos</h3>
            <div className="space-y-6">
              {/* Exemplos resolvidos detalhados */}
              {content.workedExamples?.map((example, index) => (
                <div key={`worked-${index}`} className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-5">
                  <div className="mb-4">
                    <h4 className="text-lg font-bold text-green-800 mb-2">
                      {example.title || `Exemplo Resolvido ${index + 1}`}
                    </h4>
                    <div className="bg-white p-4 rounded border-l-4 border-green-400">
                      <h5 className="font-semibold text-gray-700 mb-2">Enunciado:</h5>
                      <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                        {example.statement}
                      </p>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded border-l-4 border-blue-400">
                    <h5 className="font-semibold text-gray-700 mb-2">Solução:</h5>
                    <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                      {example.solution}
                    </div>
                  </div>
                </div>
              )) || []}
              
              {/* Exemplos práticos simples */}
              {content.practicalExamples?.map((example, index) => (
                <div key={`practical-${index}`} className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Users className="w-5 h-5 text-purple-600 mt-1" />
                    <div>
                      <h4 className="font-semibold text-purple-800 mb-2">Exemplo Prático {index + 1}</h4>
                      <p className="text-purple-700 leading-relaxed">{example}</p>
                    </div>
                  </div>
                </div>
              )) || []}
              
              {(!content.workedExamples || content.workedExamples.length === 0) && 
               (!content.practicalExamples || content.practicalExamples.length === 0) && (
                <p className="text-gray-500 italic">Nenhum exemplo disponível para este tópico.</p>
              )}
            </div>
          </div>
        );

      case 'mistakes':
        return (
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Erros Frequentes e Conceitos Equivocados</h3>
            <div className="space-y-4">
              {content.commonMisunderstandings.map((mistake, index) => (
                <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">
                      !
                    </div>
                    <div>
                      <h4 className="font-semibold text-red-800 mb-2">Atenção</h4>
                      <p className="text-red-700 leading-relaxed">{mistake}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'lecture':
        return (
          <div className="prose max-w-none">
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-l-4 border-purple-400 p-6 mb-6">
              <div className="flex items-center space-x-3 mb-4">
                <GraduationCap className="w-6 h-6 text-purple-600" />
                <h3 className="text-xl font-bold text-purple-800">Aula Teórica</h3>
              </div>
              <div className="text-purple-700 leading-relaxed whitespace-pre-line">
                {content.lecture}
              </div>
            </div>
          </div>
        );

      case 'exercises':
        return (
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Exercícios</h3>
            <div className="space-y-4">
              {content.exercises?.map((exercise, index) => (
                <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="mb-3">
                    <h4 className="font-semibold text-yellow-800 mb-2">
                      Exercício {index + 1}
                    </h4>
                    <p className="text-yellow-700 leading-relaxed">{exercise.statement}</p>
                  </div>
                  <details className="mt-3">
                    <summary className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium">
                      🔄 Ver resposta
                    </summary>
                    <div className="mt-2 p-3 bg-white border border-yellow-300 rounded">
                      <p className="text-gray-700">{exercise.answer}</p>
                    </div>
                  </details>
                </div>
              )) || (
                <p className="text-gray-500 italic">Nenhum exercício disponível para este tópico.</p>
              )}
            </div>
          </div>
        );

      case 'glossary':
        return (
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Glossário</h3>
            <div className="space-y-3">
              {content.glossary?.map((item, index) => (
                <div key={index} className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <div className="flex flex-col space-y-2">
                    <dt className="font-semibold text-indigo-800 text-lg">
                      {item.term}
                    </dt>
                    <dd className="text-indigo-700 leading-relaxed">
                      {item.definition}
                    </dd>
                  </div>
                </div>
              )) || (
                <p className="text-gray-500 italic">Nenhum termo no glossário para este tópico.</p>
              )}
            </div>
          </div>
        );

      case 'references':
        return (
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Bibliografia e Referências</h3>
            <div className="space-y-4">
              {content.references.map((reference, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-2">{reference.title}</h4>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center space-x-1">
                          <Users className="w-4 h-4" />
                          <span>Autores: {reference.authors.join(', ')}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>Ano: {reference.year}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <FileText className="w-4 h-4" />
                          <span className="capitalize">Tipo: {getReferenceTypeLabel(reference.type)}</span>
                        </div>
                      </div>
                    </div>
                    {reference.url && (
                      <a
                        href={reference.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-4 flex items-center space-x-1 text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span className="text-sm">Ver fonte</span>
                      </a>
                    )}
                  </div>
                  {reference.doi && (
                    <div className="mt-2 text-xs text-gray-500">
                      DOI: {reference.doi}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getReferenceTypeLabel = (type: string) => {
    const labels = {
      article: 'Artigo',
      paper: 'Paper',
      book: 'Livro',
      website: 'Website'
    };
    return labels[type as keyof typeof labels] || type;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <GraduationCap className="w-6 h-6" />
          <span>Conteúdo Acadêmico Científico</span>
        </h2>
      </div>

      {/* Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-1 px-6">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeSection === section.id
                    ? 'border-blue-500 text-blue-600'
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
    </div>
  );
}

