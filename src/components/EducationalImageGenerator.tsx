'use client';

import { useState } from 'react';
import { Image, Loader2, CheckCircle, AlertCircle, Sparkles, Download, RefreshCw } from 'lucide-react';

interface ImageGenerationRequest {
  prompt: string;
  type: 'diagram' | 'graph' | 'illustration' | 'scheme' | 'concept';
  topic: string;
  educationalLevel: 'beginner' | 'intermediate' | 'advanced';
  style?: 'technical' | 'friendly' | 'academic' | 'colorful';
}

interface GeneratedImage {
  url: string;
  prompt: string;
  type: string;
  generatedAt: string;
  downloadUrl?: string;
}

interface EducationalImageGeneratorProps {
  onImageGenerated?: (image: GeneratedImage) => void;
  topic: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  className?: string;
  suggestedPrompts?: string[];
}

export default function EducationalImageGenerator({
  onImageGenerated,
  topic,
  level,
  className = '',
  suggestedPrompts = []
}: EducationalImageGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentRequest, setCurrentRequest] = useState<ImageGenerationRequest | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');

  // Prompts sugeridos baseados no tópico e nível
  const getTopicPrompts = (topic: string, level: string): string[] => {
    const prompts = suggestedPrompts.length > 0 ? suggestedPrompts : [
      `Diagrama educacional simplificado sobre ${topic}`,
      `Ilustração técnica mostrando ${topic} com rótulos em português`,
      `Gráfico explicativo dos conceitos principais de ${topic}`,
      `Esquema passo-a-passo sobre ${topic} para estudantes`
    ];

    return prompts.map(prompt =>
      level === 'beginner'
        ? `${prompt} - estilo didático e colorido para iniciantes`
        : level === 'advanced'
        ? `${prompt} - detalhado e técnico para nível avançado`
        : `${prompt} - balanceado para nível intermediário`
    );
  };

  const generateImage = async (request: ImageGenerationRequest) => {
    setIsGenerating(true);
    setCurrentRequest(request);
    setError(null);

    try {
      console.log('🎨 Gerando imagem educacional:', request);

      // Enriquecer prompt com instruções educacionais
      const educationalPrompt = enhancePromptForEducation(request);

      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: educationalPrompt,
          type: request.type,
          topic: request.topic,
          level: request.educationalLevel
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao gerar imagem');
      }

      const imageData = await response.json();

      const generatedImage: GeneratedImage = {
        url: imageData.url,
        prompt: request.prompt,
        type: request.type,
        generatedAt: new Date().toISOString(),
        downloadUrl: imageData.downloadUrl
      };

      setGeneratedImages(prev => [generatedImage, ...prev]);

      if (onImageGenerated) {
        onImageGenerated(generatedImage);
      }

      console.log('✅ Imagem educacional gerada com sucesso');
    } catch (error) {
      console.error('❌ Erro ao gerar imagem:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setIsGenerating(false);
      setCurrentRequest(null);
    }
  };

  const enhancePromptForEducation = (request: ImageGenerationRequest): string => {
    const basePrompt = request.prompt;

    const educationalEnhancements = {
      diagram: 'diagrama educacional limpo, bem organizado, com rótulos claros em português',
      graph: 'gráfico educativo com eixos bem definidos, cores distintas e legenda clara',
      illustration: 'ilustração educacional detalhada, estilo técnico mas acessível',
      scheme: 'esquema passo-a-passo numerado, com setas indicativas e cores pedagógicas',
      concept: 'visualização conceitual clara, com elementos bem separados e identificados'
    };

    const levelEnhancements = {
      beginner: 'estilo simples e colorido, visual amigável para iniciantes, evitar excesso de detalhes',
      intermediate: 'balanceado entre simplicidade e detalhes técnicos, profissional mas acessível',
      advanced: 'detalhado e técnico, com precisão profissional, pode incluir especificações'
    };

    const styleInstructions = 'fundo branco limpo, alta qualidade, estilo educacional profissional, sem texto desnecessário, cores harmoniosas, layout organizado';

    return `${basePrompt}, ${educationalEnhancements[request.type]}, ${levelEnhancements[request.educationalLevel]}, ${styleInstructions}`;
  };

  const handleQuickGenerate = (suggestedPrompt: string, type: 'diagram' | 'graph' | 'illustration' | 'scheme' | 'concept') => {
    const request: ImageGenerationRequest = {
      prompt: suggestedPrompt,
      type,
      topic,
      educationalLevel: level,
      style: level === 'beginner' ? 'friendly' : level === 'advanced' ? 'technical' : 'academic'
    };

    generateImage(request);
  };

  const handleCustomGenerate = () => {
    if (!customPrompt.trim()) return;

    const request: ImageGenerationRequest = {
      prompt: customPrompt,
      type: 'illustration',
      topic,
      educationalLevel: level,
      style: 'academic'
    };

    generateImage(request);
    setCustomPrompt('');
  };

  const downloadImage = async (imageUrl: string, filename: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}_${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erro ao baixar imagem:', error);
    }
  };

  const topicPrompts = getTopicPrompts(topic, level);

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Sparkles className="w-5 h-5 text-blue-500 mr-2" />
          Gerador de Imagens Educacionais
        </h3>
        <div className="text-sm text-gray-500">
          Tópico: {topic} | Nível: {level}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}

      {/* Prompt customizado */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Prompt Personalizado
        </label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder={`Descreva a imagem que você quer sobre ${topic}...`}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            disabled={isGenerating}
          />
          <button
            onClick={handleCustomGenerate}
            disabled={isGenerating || !customPrompt.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Gerar'}
          </button>
        </div>
      </div>

      {/* Sugestões rápidas */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Sugestões Rápidas</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {topicPrompts.map((prompt, index) => (
            <button
              key={index}
              onClick={() => handleQuickGenerate(prompt, index === 0 ? 'diagram' : index === 1 ? 'illustration' : index === 2 ? 'graph' : 'scheme')}
              disabled={isGenerating}
              className="text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-700 disabled:opacity-50 transition-colors"
            >
              {prompt.length > 80 ? `${prompt.substring(0, 80)}...` : prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Status de geração */}
      {isGenerating && currentRequest && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin mr-3" />
            <div>
              <div className="text-sm font-medium text-blue-900">
                Gerando imagem educacional...
              </div>
              <div className="text-xs text-blue-700 mt-1">
                {currentRequest.type} sobre {currentRequest.topic}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Imagens geradas */}
      {generatedImages.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
            <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
            Imagens Geradas ({generatedImages.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {generatedImages.map((image, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-3">
                <img
                  src={image.url}
                  alt={image.prompt}
                  className="w-full h-40 object-cover rounded mb-3"
                />
                <div className="text-xs text-gray-600 mb-2">
                  {image.prompt.length > 60 ? `${image.prompt.substring(0, 60)}...` : image.prompt}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">{image.type}</span>
                  <button
                    onClick={() => downloadImage(image.url, `${topic}_${image.type}`)}
                    className="flex items-center text-xs text-blue-600 hover:text-blue-800"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Baixar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}