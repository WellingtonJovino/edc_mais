'use client';

import { useState, useEffect } from 'react';
import { Image, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

interface GeminiNanoStatus {
  available: boolean;
  loading: boolean;
  error?: string;
}

interface GeminiNanoImageGeneratorProps {
  onImageGenerated?: (imageUrl: string, prompt: string) => void;
  initialPrompt?: string;
  className?: string;
}

export default function GeminiNanoImageGenerator({
  onImageGenerated,
  initialPrompt = '',
  className = ''
}: GeminiNanoImageGeneratorProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [isGenerating, setIsGenerating] = useState(false);
  const [geminiStatus, setGeminiStatus] = useState<GeminiNanoStatus>({
    available: false,
    loading: true
  });
  const [lastGeneratedImage, setLastGeneratedImage] = useState<{
    url: string;
    originalPrompt: string;
    optimizedPrompt: string;
  } | null>(null);

  useEffect(() => {
    checkGeminiNanoAvailability();
  }, []);

  const checkGeminiNanoAvailability = async () => {
    try {
      // Verificar se a Chrome AI API está disponível
      if (typeof window !== 'undefined' && 'ai' in window) {
        const aiStatus = await (window as any).ai?.canCreateTextSession?.();

        if (aiStatus === 'readily') {
          setGeminiStatus({ available: true, loading: false });
          console.log('🍌 Gemini Nano disponível e pronto!');
        } else if (aiStatus === 'after-download') {
          setGeminiStatus({
            available: false,
            loading: false,
            error: 'Gemini Nano precisa ser baixado. Recarregue a página em alguns minutos.'
          });
        } else {
          setGeminiStatus({
            available: false,
            loading: false,
            error: 'Gemini Nano não está disponível neste navegador.'
          });
        }
      } else {
        setGeminiStatus({
          available: false,
          loading: false,
          error: 'Chrome AI API não encontrada. Use Chrome com flags experimentais.'
        });
      }
    } catch (error) {
      console.error('Erro ao verificar Gemini Nano:', error);
      setGeminiStatus({
        available: false,
        loading: false,
        error: 'Erro ao conectar com Gemini Nano'
      });
    }
  };

  const optimizePromptWithGemini = async (originalPrompt: string): Promise<string> => {
    if (!geminiStatus.available) {
      return `Educational illustration: ${originalPrompt}`;
    }

    try {
      console.log('🎨 Otimizando prompt com Gemini Nano...');
      const session = await (window as any).ai.createTextSession();

      const optimizedPrompt = await session.prompt(`
        Create a detailed English prompt for generating an educational image about: "${originalPrompt}"

        Requirements:
        - Educational diagram style
        - White background
        - High quality and professional
        - Clear and informative
        - Suitable for academic materials

        Return only the optimized English prompt, no explanations:
      `);

      console.log('✅ Prompt otimizado:', optimizedPrompt);
      return optimizedPrompt.trim();
    } catch (error) {
      console.error('Erro na otimização do prompt:', error);
      return `Educational illustration: ${originalPrompt}`;
    }
  };

  const generateImage = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);

    try {
      // 1. Otimizar prompt com Gemini Nano (se disponível)
      const optimizedPrompt = await optimizePromptWithGemini(prompt);

      // 2. Gerar imagem com API
      const response = await fetch('/api/generate-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'single',
          prompt: optimizedPrompt,
          imageType: 'diagrama',
          size: 'medio'
        }),
      });

      const data = await response.json();

      if (data.success && data.imageUrl) {
        const result = {
          url: data.imageUrl,
          originalPrompt: prompt,
          optimizedPrompt: optimizedPrompt
        };

        setLastGeneratedImage(result);
        onImageGenerated?.(data.imageUrl, optimizedPrompt);
        console.log('🎉 Imagem gerada com sucesso!');
      } else {
        throw new Error(data.error || 'Erro na geração da imagem');
      }
    } catch (error) {
      console.error('Erro na geração:', error);
      alert('Erro ao gerar imagem. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center space-x-2 mb-4">
        <Image className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Gerador de Imagens Educacionais
        </h3>
        {geminiStatus.loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        ) : geminiStatus.available ? (
          <div className="flex items-center space-x-1">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-xs text-green-600">🍌 Gemini Nano ativo</span>
          </div>
        ) : (
          <div className="flex items-center space-x-1">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            <span className="text-xs text-orange-600">DALL-E apenas</span>
          </div>
        )}
      </div>

      {/* Status do Gemini Nano */}
      {geminiStatus.error && (
        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-sm text-orange-700">
            <strong>Gemini Nano:</strong> {geminiStatus.error}
          </p>
          <p className="text-xs text-orange-600 mt-1">
            Usando DALL-E diretamente como fallback.
          </p>
        </div>
      )}

      {/* Input para prompt */}
      <div className="space-y-4">
        <div>
          <label htmlFor="image-prompt" className="block text-sm font-medium text-gray-700 mb-2">
            Descreva a imagem educacional que você quer gerar:
          </label>
          <textarea
            id="image-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ex: Diagrama mostrando as partes de uma célula animal com legendas"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
          />
        </div>

        <button
          onClick={generateImage}
          disabled={!prompt.trim() || isGenerating}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Gerando imagem...</span>
            </>
          ) : (
            <>
              <Image className="w-4 h-4" />
              <span>Gerar Imagem Educacional</span>
            </>
          )}
        </button>
      </div>

      {/* Imagem gerada */}
      {lastGeneratedImage && (
        <div className="mt-6 space-y-3">
          <h4 className="font-medium text-gray-900">Imagem Gerada:</h4>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <img
              src={lastGeneratedImage.url}
              alt={lastGeneratedImage.originalPrompt}
              className="w-full h-64 object-contain bg-gray-50"
            />
          </div>

          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium text-gray-700">Prompt original:</span>
              <p className="text-gray-600">{lastGeneratedImage.originalPrompt}</p>
            </div>

            {geminiStatus.available && (
              <div>
                <span className="font-medium text-gray-700">Prompt otimizado (Gemini Nano):</span>
                <p className="text-gray-600">{lastGeneratedImage.optimizedPrompt}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Instruções para ativar Gemini Nano */}
      {!geminiStatus.available && !geminiStatus.loading && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <h5 className="text-sm font-medium text-blue-900 mb-2">
            Como ativar o Gemini Nano 🍌:
          </h5>
          <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
            <li>Use o Chrome Canary ou Chrome Dev</li>
            <li>Acesse: chrome://flags/#optimization-guide-on-device-model</li>
            <li>Ative: "Enabled BypassPerfRequirement"</li>
            <li>Acesse: chrome://flags/#prompt-api-for-gemini-nano</li>
            <li>Ative: "Enabled"</li>
            <li>Reinicie o Chrome e recarregue esta página</li>
          </ol>
        </div>
      )}
    </div>
  );
}