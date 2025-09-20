'use client';

import { Fragment } from 'react';
import LatexRenderer from './LatexRenderer';

interface TextWithLatexProps {
  text: string;
  className?: string;
}

export default function TextWithLatex({ text, className = '' }: TextWithLatexProps) {
  if (!text) {
    return null;
  }

  // Função para processar texto e extrair LaTeX
  const processText = (inputText: string) => {
    const parts = [];
    let currentIndex = 0;
    let partIndex = 0;

    // Regex para LaTeX em bloco ($$...$$) e inline ($...$)
    const latexRegex = /(\$\$([^$]+)\$\$|\$([^$\n]+)\$)/g;
    let match;

    while ((match = latexRegex.exec(inputText)) !== null) {
      // Adicionar texto antes do LaTeX
      if (match.index > currentIndex) {
        const textBefore = inputText.slice(currentIndex, match.index);
        parts.push(
          <span key={`text-${partIndex++}`}>
            {textBefore}
          </span>
        );
      }

      // Determinar se é bloco ($$) ou inline ($)
      const isBlock = match[1].startsWith('$$');
      const latexContent = isBlock ? match[2] : match[3];

      // Adicionar renderizador LaTeX
      parts.push(
        <LatexRenderer
          key={`latex-${partIndex++}`}
          latex={latexContent}
          displayMode={isBlock}
          className={isBlock ? 'block-latex' : 'inline-latex'}
        />
      );

      currentIndex = match.index + match[1].length;
    }

    // Adicionar texto restante
    if (currentIndex < inputText.length) {
      parts.push(
        <span key={`text-${partIndex++}`}>
          {inputText.slice(currentIndex)}
        </span>
      );
    }

    return parts;
  };

  const processedContent = processText(text);

  return (
    <div className={className}>
      {processedContent.map((part, index) => (
        <Fragment key={index}>{part}</Fragment>
      ))}
    </div>
  );
}

// Hook para usar com texto que pode conter LaTeX
export function useLatexText(text: string) {
  return <TextWithLatex text={text} />;
}