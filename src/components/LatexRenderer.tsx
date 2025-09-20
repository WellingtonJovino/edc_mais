'use client';

import { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface LatexRendererProps {
  latex: string;
  displayMode?: boolean;
  className?: string;
}

export default function LatexRenderer({ latex, displayMode = false, className = '' }: LatexRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && latex) {
      try {
        // Limpar conteúdo anterior
        containerRef.current.innerHTML = '';

        // Renderizar LaTeX usando KaTeX
        katex.render(latex, containerRef.current, {
          displayMode,
          throwOnError: false,
          strict: false,
          colorIsTextColor: true,
        });
      } catch (error) {
        console.warn('Erro ao renderizar LaTeX:', error);
        // Fallback: mostrar LaTeX original se falhar
        if (containerRef.current) {
          containerRef.current.innerHTML = `<code className="text-red-600">${latex}</code>`;
        }
      }
    }
  }, [latex, displayMode]);

  if (!latex) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`latex-container ${className}`}
      style={{
        fontSize: displayMode ? '1.2em' : '1em',
        textAlign: displayMode ? 'center' : 'left',
        margin: displayMode ? '1em 0' : '0'
      }}
    />
  );
}

// Componente para fórmulas inline
export function InlineLatex({ children }: { children: string }) {
  return <LatexRenderer latex={children} displayMode={false} className="inline-math" />;
}

// Componente para fórmulas em bloco
export function BlockLatex({ children }: { children: string }) {
  return <LatexRenderer latex={children} displayMode={true} className="block-math" />;
}