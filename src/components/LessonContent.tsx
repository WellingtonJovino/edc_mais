'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Loader2 } from 'lucide-react';

interface LessonContentProps {
  content: string;
  images?: Array<{
    id: string;
    description: string;
    position: number;
    url?: string;
  }>;
  isLoading?: boolean;
}

export default function LessonContent({ content, images = [], isLoading = false }: LessonContentProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Gerando aula-texto...</p>
          <p className="text-sm text-gray-500 mt-2">Isso pode levar alguns segundos</p>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📚</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Conteúdo em preparação
          </h3>
          <p className="text-gray-600 max-w-md">
            O conteúdo teórico deste subtópico será disponibilizado em breve.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="prose prose-lg max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => (
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4 pb-2 border-b border-gray-200">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">
              {children}
            </h3>
          ),
          p: ({ children }) => {
            const childrenString = String(children);

            // Verificar se é um placeholder de imagem
            if (childrenString.includes('lesson-image-placeholder')) {
              return <div dangerouslySetInnerHTML={{ __html: childrenString }} />;
            }

            return (
              <p className="text-gray-700 leading-relaxed mb-4">
                {children}
              </p>
            );
          },
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-2 mb-4 text-gray-700">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-2 mb-4 text-gray-700">
              {children}
            </ol>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-gray-900">{children}</strong>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-500 pl-4 italic my-4 text-gray-600">
              {children}
            </blockquote>
          ),
          code: ({ children, ...props }) => {
            const className = (props as any).className;
            const inline = !className?.includes('language-');

            if (inline) {
              return (
                <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono text-gray-800">
                  {children}
                </code>
              );
            }
            return (
              <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
                <code className="text-sm font-mono text-gray-800">{children}</code>
              </pre>
            );
          },
          div: ({ children, ...props }) => {
            const className = (props as any).className;
            const dataImageId = (props as any)['data-image-id'];

            // Renderizar placeholder de imagem customizado
            if (className === 'lesson-image-placeholder') {
              const image = images.find(img => img.id === dataImageId);

              return (
                <div className="my-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                  <div className="flex items-center justify-center">
                    {image?.url ? (
                      <img
                        src={image.url}
                        alt={image.description}
                        className="max-w-full rounded-lg shadow-lg"
                      />
                    ) : (
                      <div className="text-center">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                          <span className="text-4xl">🖼️</span>
                        </div>
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Imagem {dataImageId?.split('-')[1]}
                        </p>
                        <p className="text-xs text-gray-600 max-w-md mx-auto italic">
                          {image?.description || 'Imagem ilustrativa em preparação'}
                        </p>
                        <p className="text-xs text-gray-500 mt-3">
                          Esta imagem será gerada automaticamente em breve
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            return <div {...props}>{children}</div>;
          },
          hr: () => (
            <hr className="my-8 border-t border-gray-200" />
          ),
        }}
      >
        {processContent(content)}
      </ReactMarkdown>
    </div>
  );
}

function processContent(content: string): string {
  // Processar o conteúdo para garantir que placeholders de imagem sejam renderizados corretamente
  return content.replace(
    /<div class="lesson-image-placeholder"([^>]*)>([\s\S]*?)<\/div>/g,
    (match) => {
      // Manter o HTML como está para ser processado pelo componente div customizado
      return match;
    }
  );
}