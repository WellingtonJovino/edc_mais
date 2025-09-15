import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ImageGenerationRequest {
  prompt: string;
  style?: 'realistic' | 'cartoonish' | 'diagram' | 'technical' | 'educational';
  size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd';
  model?: 'dall-e-2' | 'dall-e-3';
}

export interface ImageGenerationResult {
  success: boolean;
  imageUrl?: string;
  revisedPrompt?: string;
  error?: string;
}

/**
 * Gera imagem usando OpenAI DALL-E
 */
export async function generateImageWithDallE(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
  try {
    // Otimizar prompt baseado no estilo
    const optimizedPrompt = optimizePromptForStyle(request.prompt, request.style);

    const response = await openai.images.generate({
      model: request.model || 'dall-e-3',
      prompt: optimizedPrompt,
      size: request.size || '1024x1024',
      quality: request.quality || 'standard',
      n: 1,
    });

    const imageData = response.data[0];

    return {
      success: true,
      imageUrl: imageData.url,
      revisedPrompt: imageData.revised_prompt || optimizedPrompt,
    };
  } catch (error) {
    console.error('Erro ao gerar imagem com DALL-E:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

/**
 * Integração com Gemini Nano local (Chrome AI API)
 * Usando o modelo que roda localmente no navegador
 */
export async function generateImageWithGemini(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
  try {
    console.log('🍌 Gemini Nano local image generation solicitada:', request.prompt);

    // Verificar se o Gemini Nano está disponível no navegador
    if (typeof window !== 'undefined' && 'ai' in window) {
      // Usar Chrome AI API para Gemini Nano
      const session = await (window as any).ai.createTextSession();

      // Gerar prompt otimizado para geração de imagem
      const optimizedPrompt = await session.prompt(`
        Crie um prompt detalhado em inglês para gerar uma imagem educacional sobre: "${request.prompt}"

        Tipo: ${request.style || 'educational'}
        Características: diagrama educacional, fundo branco, alta qualidade, estilo profissional

        Retorne apenas o prompt em inglês, sem explicações:
      `);

      console.log('🎨 Prompt otimizado pelo Gemini Nano:', optimizedPrompt);

      // Usar o prompt otimizado com DALL-E
      return generateImageWithDallE({
        ...request,
        prompt: optimizedPrompt.trim(),
      });
    }

    // Fallback para DALL-E se Gemini Nano não estiver disponível
    console.log('⚠️ Gemini Nano não disponível, usando DALL-E');
    return generateImageWithDallE({
      ...request,
      prompt: `Educational illustration: ${request.prompt}`,
    });

  } catch (error) {
    console.error('❌ Erro no Gemini Nano, usando DALL-E como fallback:', error);
    return generateImageWithDallE({
      ...request,
      prompt: `Educational illustration: ${request.prompt}`,
    });
  }
}

/**
 * Função principal para geração de imagens educacionais
 */
export async function generateEducationalImage(
  prompt: string,
  tipo: 'diagrama' | 'grafico' | 'ilustracao' | 'esquema' | 'foto' = 'diagrama',
  tamanho: 'pequeno' | 'medio' | 'grande' = 'medio'
): Promise<ImageGenerationResult> {

  // Mapear tamanhos para dimensões DALL-E
  const sizeMap = {
    pequeno: '512x512' as const,
    medio: '1024x1024' as const,
    grande: '1792x1024' as const,
  };

  // Mapear tipos para estilos
  const styleMap = {
    diagrama: 'technical' as const,
    grafico: 'technical' as const,
    ilustracao: 'educational' as const,
    esquema: 'diagram' as const,
    foto: 'realistic' as const,
  };

  const request: ImageGenerationRequest = {
    prompt: enhanceEducationalPrompt(prompt, tipo),
    style: styleMap[tipo],
    size: sizeMap[tamanho],
    quality: 'hd',
    model: 'dall-e-3',
  };

  // Usar Gemini se disponível, senão DALL-E
  return await generateImageWithGemini(request);
}

/**
 * Otimiza prompt baseado no estilo solicitado
 */
function optimizePromptForStyle(prompt: string, style?: string): string {
  const stylePrompts = {
    realistic: 'Photorealistic, high quality, detailed',
    cartoonish: 'Cartoon style, colorful, friendly, educational',
    diagram: 'Clean diagram, technical illustration, clear labels, professional',
    technical: 'Technical diagram, precise, clean lines, educational purpose',
    educational: 'Educational illustration, clear, informative, academic style',
  };

  const basePrompt = prompt;
  const styleModifier = style && stylePrompts[style as keyof typeof stylePrompts]
    ? stylePrompts[style as keyof typeof stylePrompts]
    : stylePrompts.educational;

  return `${basePrompt}. ${styleModifier}. White background, high contrast, suitable for educational materials.`;
}

/**
 * Melhora prompts para conteúdo educacional
 */
function enhanceEducationalPrompt(prompt: string, tipo: string): string {
  const typeEnhancements = {
    diagrama: 'Clear diagram showing',
    grafico: 'Educational chart or graph displaying',
    ilustracao: 'Educational illustration of',
    esquema: 'Schematic diagram demonstrating',
    foto: 'Clear photograph showing',
  };

  const enhancement = typeEnhancements[tipo as keyof typeof typeEnhancements] || 'Educational image of';

  return `${enhancement} ${prompt}. Clean, professional, educational style. Clear labels and annotations. Suitable for academic materials. High contrast, easy to read.`;
}

/**
 * Gera múltiplas imagens para um conceito
 */
export async function generateImageSet(
  concept: string,
  imagePrompts: Array<{
    prompt: string;
    tipo: 'diagrama' | 'grafico' | 'ilustracao' | 'esquema' | 'foto';
    tamanho: 'pequeno' | 'medio' | 'grande';
  }>
): Promise<Array<ImageGenerationResult & { originalPrompt: string; tipo: string }>> {

  console.log(`🎨 Gerando ${imagePrompts.length} imagens para o conceito: ${concept}`);

  const results = await Promise.all(
    imagePrompts.map(async (imageReq) => {
      const result = await generateEducationalImage(
        imageReq.prompt,
        imageReq.tipo,
        imageReq.tamanho
      );

      return {
        ...result,
        originalPrompt: imageReq.prompt,
        tipo: imageReq.tipo,
      };
    })
  );

  console.log(`✅ Geração concluída: ${results.filter(r => r.success).length}/${results.length} imagens`);

  return results;
}

/**
 * Processa uma aula-texto e gera todas as imagens necessárias
 */
export async function generateImagesForAulaTexto(aulaTexto: any): Promise<any> {
  console.log('🚀 Iniciando geração de imagens para aula-texto:', aulaTexto.topic);

  const updatedConceitos = await Promise.all(
    aulaTexto.desenvolvimento.conceitos.map(async (conceito: any) => {

      // Gerar imagens para figuras
      if (conceito.figuras && conceito.figuras.length > 0) {
        const figurasComImagens = await Promise.all(
          conceito.figuras.map(async (figura: any) => {
            const result = await generateEducationalImage(
              figura.imagePrompt,
              figura.tipo,
              figura.tamanho
            );

            return {
              ...figura,
              imageUrl: result.success ? result.imageUrl : undefined,
              generationError: result.success ? undefined : result.error,
            };
          })
        );

        conceito.figuras = figurasComImagens;
      }

      // Gerar imagens para gráficos
      if (conceito.graficos && conceito.graficos.length > 0) {
        const graficosComImagens = await Promise.all(
          conceito.graficos.map(async (grafico: any) => {
            const result = await generateEducationalImage(
              grafico.imagePrompt,
              'grafico',
              'medio'
            );

            return {
              ...grafico,
              imageUrl: result.success ? result.imageUrl : undefined,
              generationError: result.success ? undefined : result.error,
            };
          })
        );

        conceito.graficos = graficosComImagens;
      }

      return conceito;
    })
  );

  const updatedAulaTexto = {
    ...aulaTexto,
    desenvolvimento: {
      ...aulaTexto.desenvolvimento,
      conceitos: updatedConceitos,
    },
    metadata: {
      ...aulaTexto.metadata,
      imagesGenerated: true,
      imageGenerationDate: new Date().toISOString(),
    }
  };

  console.log('✅ Geração de imagens concluída para aula-texto');
  return updatedAulaTexto;
}