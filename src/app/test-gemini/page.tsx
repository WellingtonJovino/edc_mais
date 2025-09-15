'use client';

import { useState } from 'react';
import GeminiNanoImageGenerator from '@/components/GeminiNanoImageGenerator';

export default function TestGeminiPage() {
  const [generatedImages, setGeneratedImages] = useState<Array<{
    url: string;
    prompt: string;
    timestamp: string;
  }>>([]);

  const handleImageGenerated = (imageUrl: string, prompt: string) => {
    setGeneratedImages(prev => [{
      url: imageUrl,
      prompt: prompt,
      timestamp: new Date().toLocaleString('pt-BR')
    }, ...prev]);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🍌 Teste do Gemini Nano "Banana"
          </h1>
          <p className="text-gray-600">
            Teste a geração de imagens educacionais com Gemini Nano local + DALL-E
          </p>
        </div>

        {/* Instruções */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">
            Como funciona o "Nano Banana" 🍌:
          </h2>
          <div className="space-y-3 text-blue-800">
            <div className="flex items-start space-x-3">
              <span className="bg-blue-200 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</span>
              <p><strong>Gemini Nano Local:</strong> Otimiza seu prompt em português para um prompt técnico em inglês</p>
            </div>
            <div className="flex items-start space-x-3">
              <span className="bg-blue-200 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</span>
              <p><strong>DALL-E 3:</strong> Gera a imagem usando o prompt otimizado</p>
            </div>
            <div className="flex items-start space-x-3">
              <span className="bg-blue-200 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</span>
              <p><strong>Resultado:</strong> Imagem educacional de alta qualidade com prompt melhorado pela IA local</p>
            </div>
          </div>
        </div>

        {/* Gerador */}
        <GeminiNanoImageGenerator
          onImageGenerated={handleImageGenerated}
          className="mb-8"
        />

        {/* Histórico de imagens geradas */}
        {generatedImages.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Imagens Geradas ({generatedImages.length})
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {generatedImages.map((image, index) => (
                <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                  <img
                    src={image.url}
                    alt={image.prompt}
                    className="w-full h-48 object-contain bg-gray-50"
                  />
                  <div className="p-4">
                    <p className="text-sm font-medium text-gray-900 mb-2">
                      Prompt usado:
                    </p>
                    <p className="text-sm text-gray-600 mb-3">
                      {image.prompt}
                    </p>
                    <p className="text-xs text-gray-500">
                      Gerada em: {image.timestamp}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Exemplos de prompts */}
        <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            💡 Exemplos de Prompts para Testar:
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-medium text-gray-800">Matemática:</h3>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>Gráfico da função quadrática f(x) = x²</li>
                <li>Diagrama do teorema de Pitágoras</li>
                <li>Representação visual de números complexos</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium text-gray-800">Biologia:</h3>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>Estrutura de uma célula animal com legendas</li>
                <li>Processo de mitose em etapas</li>
                <li>Sistema circulatório humano simplificado</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium text-gray-800">Física:</h3>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>Diagrama de forças em um plano inclinado</li>
                <li>Ondas sonoras e suas características</li>
                <li>Espectro eletromagnético colorido</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium text-gray-800">Química:</h3>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>Estrutura molecular da água H2O</li>
                <li>Tabela periódica destacando metais</li>
                <li>Reação de combustão do metano</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}