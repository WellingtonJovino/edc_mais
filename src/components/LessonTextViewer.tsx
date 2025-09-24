'use client';

import React, { useState } from 'react';
import {
  BookOpen,
  Clock,
  Target,
  ExternalLink,
  RefreshCw,
  Download,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface LessonMetadata {
  wordCount: number;
  estimatedReadingTime: string;
  difficultyLevel: string;
  sources: Array<{
    title: string;
    url: string;
    type: 'academic' | 'web' | 'research';
  }>;
}

interface LessonTextViewerProps {
  content: string;
  metadata?: LessonMetadata;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
  showMetadata?: boolean;
}

export default function LessonTextViewer({
  content,
  metadata,
  onRegenerate,
  isRegenerating = false,
  showMetadata = true
}: LessonTextViewerProps) {
  const [showSources, setShowSources] = useState(false);

  // Processar conteúdo markdown para texto contínuo
  const processedContent = processContentForContinuousReading(content);

  const downloadAsText = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aula-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      {/* Header com metadados */}
      {showMetadata && metadata && (
        <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Informações da Aula</h3>
            </div>
            <div className="flex gap-2">
              <button
                onClick={downloadAsText}
                className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-white rounded-md transition-colors"
                title="Baixar como arquivo"
              >
                <Download className="w-4 h-4" />
                Baixar
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="text-gray-700">
                <strong>Tempo:</strong> {metadata.estimatedReadingTime}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-green-500" />
              <span className="text-gray-700">
                <strong>Nível:</strong> {metadata.difficultyLevel}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-purple-500" />
              <span className="text-gray-700">
                <strong>Palavras:</strong> {metadata.wordCount.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-orange-500" />
              <span className="text-gray-700">
                <strong>Fontes:</strong> {metadata.sources.length}
              </span>
            </div>
          </div>

          {onRegenerate && (
            <div className="mt-4 pt-4 border-t border-blue-200">
              <button
                onClick={onRegenerate}
                disabled={isRegenerating}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                {isRegenerating ? 'Regenerando...' : 'Regenerar Aula'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Conteúdo da aula em texto contínuo */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <article className="prose prose-lg prose-blue max-w-none p-8">
          <div
            dangerouslySetInnerHTML={{
              __html: processedContent
            }}
          />
        </article>
      </div>

      {/* Fontes e referências */}
      {metadata && metadata.sources.length > 0 && (
        <div className="mt-8 p-6 bg-gray-50 rounded-lg">
          <button
            onClick={() => setShowSources(!showSources)}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 mb-4"
          >
            <ExternalLink className="w-5 h-5" />
            <h3 className="font-semibold">Fontes e Referências ({metadata.sources.length})</h3>
            {showSources ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {showSources && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {metadata.sources.map((source, index) => (
                <div
                  key={index}
                  className="p-4 bg-white rounded-md border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-1 rounded ${getSourceTypeColor(source.type)}`}>
                      {getSourceTypeIcon(source.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 text-sm truncate">
                        {source.title}
                      </h4>
                      <p className="text-xs text-gray-500 capitalize">{source.type}</p>
                      {source.url !== '#' && (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-1"
                        >
                          Acessar <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Funções utilitárias

/**
 * Processa o conteúdo markdown para exibição contínua (sem seções expansíveis)
 */
function processContentForContinuousReading(content: string): string {
  if (!content) return '<p>Conteúdo não disponível.</p>';

  // Remover marcadores de seção e divisores
  let processedContent = content
    // Remover separadores de seção
    .replace(/---+/g, '')
    // Remover emojis dos títulos de seção e manter apenas os títulos
    .replace(/## 🚀 Ignição/g, '')
    .replace(/## 📚 Fundamentação/g, '## Conceitos Fundamentais')
    .replace(/## ⚡ Desenvolvimento/g, '## Aplicações Práticas')
    .replace(/## 🔗 Integração/g, '## Síntese e Integração')
    .replace(/## 💡 Consolidação/g, '## Considerações Finais')
    // Limpar quebras de linha excessivas
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Converter para HTML com formatação acadêmica
  return formatMarkdownForAcademicReading(processedContent);
}

/**
 * Converte markdown para HTML com formatação acadêmica profissional
 */
function formatMarkdownForAcademicReading(markdown: string): string {
  return markdown
    // Headers (com espaçamento acadêmico)
    .replace(/### (.*$)/gm, '<h3 class="text-lg font-semibold mt-8 mb-4 text-gray-900 border-l-4 border-blue-500 pl-4">$1</h3>')
    .replace(/## (.*$)/gm, '<h2 class="text-xl font-bold mt-10 mb-6 text-gray-900">$1</h2>')
    .replace(/# (.*$)/gm, '<h1 class="text-2xl font-bold mt-0 mb-8 text-gray-900 pb-4 border-b border-gray-200">$1</h1>')

    // Enfatização
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic text-gray-800">$1</em>')

    // Listas (formatação acadêmica)
    .replace(/^\* (.*$)/gm, '<li class="mb-2 leading-relaxed">$1</li>')
    .replace(/^- (.*$)/gm, '<li class="mb-2 leading-relaxed">$1</li>')
    .replace(/^\d+\. (.*$)/gm, '<li class="mb-2 leading-relaxed list-decimal">$1</li>')

    // Links (estilo acadêmico)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-700 hover:text-blue-900 underline font-medium" target="_blank" rel="noopener noreferrer">$1</a>')

    // Citações e blocos de código
    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-gray-800">$1</code>')

    // Parágrafos (com espaçamento acadêmico adequado)
    .replace(/\n\n/g, '</p><p class="mb-6 text-gray-700 leading-relaxed text-justify">')
    .replace(/^/, '<p class="mb-6 text-gray-700 leading-relaxed text-justify">')
    .replace(/$/, '</p>')

    // Quebras de linha simples
    .replace(/\n/g, '<br/>')

    // Limpeza final
    .replace(/<p class="[^"]*">\s*<\/p>/g, '') // Remove parágrafos vazios
    .replace(/(<li[^>]*>.*?<\/li>)/g, '<ul class="list-disc ml-6 mb-6 space-y-2">$1</ul>') // Wrappear listas
    .replace(/<\/ul>\s*<ul[^>]*>/g, ''); // Merge listas consecutivas
}

function getSourceTypeIcon(type: string) {
  const icons = {
    academic: <BookOpen className="w-3 h-3 text-blue-600" />,
    web: <ExternalLink className="w-3 h-3 text-green-600" />,
    research: <Target className="w-3 h-3 text-purple-600" />
  };
  return icons[type as keyof typeof icons] || <ExternalLink className="w-3 h-3" />;
}

function getSourceTypeColor(type: string) {
  const colors = {
    academic: 'bg-blue-100',
    web: 'bg-green-100',
    research: 'bg-purple-100'
  };
  return colors[type as keyof typeof colors] || 'bg-gray-100';
}