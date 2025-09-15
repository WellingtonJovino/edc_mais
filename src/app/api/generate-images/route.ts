import { NextRequest, NextResponse } from 'next/server';
import { generateEducationalImage, generateImagesForAulaTexto, generateImageSet } from '@/lib/image-generation';

// Force Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface GenerateImageRequest {
  type: 'single' | 'aula-texto' | 'set';
  prompt?: string;
  aulaTexto?: any;
  imageSet?: Array<{
    prompt: string;
    tipo: 'diagrama' | 'grafico' | 'ilustracao' | 'esquema' | 'foto';
    tamanho: 'pequeno' | 'medio' | 'grande';
  }>;
  concept?: string;
  imageType?: 'diagrama' | 'grafico' | 'ilustracao' | 'esquema' | 'foto';
  size?: 'pequeno' | 'medio' | 'grande';
}

/**
 * POST /api/generate-images
 *
 * Gera imagens educacionais usando IA
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: GenerateImageRequest = await request.json();

    if (!body.type) {
      return NextResponse.json(
        { success: false, error: 'Tipo de geração é obrigatório' },
        { status: 400 }
      );
    }

    console.log(`🎨 Iniciando geração de imagem tipo: ${body.type}`);

    switch (body.type) {
      case 'single':
        if (!body.prompt) {
          return NextResponse.json(
            { success: false, error: 'Prompt é obrigatório para geração única' },
            { status: 400 }
          );
        }

        const singleResult = await generateEducationalImage(
          body.prompt,
          body.imageType || 'diagrama',
          body.size || 'medio'
        );

        return NextResponse.json({
          success: singleResult.success,
          imageUrl: singleResult.imageUrl,
          revisedPrompt: singleResult.revisedPrompt,
          error: singleResult.error,
        });

      case 'aula-texto':
        if (!body.aulaTexto) {
          return NextResponse.json(
            { success: false, error: 'Dados da aula-texto são obrigatórios' },
            { status: 400 }
          );
        }

        console.log('📚 Processando aula-texto para geração de imagens...');
        const updatedAulaTexto = await generateImagesForAulaTexto(body.aulaTexto);

        return NextResponse.json({
          success: true,
          aulaTexto: updatedAulaTexto,
          message: 'Imagens geradas e inseridas na aula-texto',
        });

      case 'set':
        if (!body.imageSet || !body.concept) {
          return NextResponse.json(
            { success: false, error: 'Conjunto de imagens e conceito são obrigatórios' },
            { status: 400 }
          );
        }

        console.log(`🎯 Gerando conjunto de imagens para: ${body.concept}`);
        const setResults = await generateImageSet(body.concept, body.imageSet);

        return NextResponse.json({
          success: true,
          images: setResults,
          concept: body.concept,
          totalGenerated: setResults.filter(r => r.success).length,
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Tipo de geração não suportado' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('❌ Erro na geração de imagens:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno do servidor'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/generate-images
 *
 * Retorna informações sobre o serviço de geração de imagens
 */
export async function GET(): Promise<NextResponse> {
  const info = {
    service: 'AI Image Generation for Educational Content',
    description: 'Gera imagens educacionais usando IA (DALL-E 3 + Gemini Nano Local)',
    models: ['dall-e-3', 'gemini-nano-local'],
    supportedTypes: ['diagrama', 'grafico', 'ilustracao', 'esquema', 'foto'],
    sizes: ['pequeno (512x512)', 'medio (1024x1024)', 'grande (1792x1024)'],
    endpoints: {
      single: {
        description: 'Gera uma única imagem',
        parameters: {
          type: 'single',
          prompt: 'string - Descrição da imagem',
          imageType: 'string - Tipo de imagem (opcional)',
          size: 'string - Tamanho da imagem (opcional)'
        }
      },
      aulaTexto: {
        description: 'Gera todas as imagens para uma aula-texto',
        parameters: {
          type: 'aula-texto',
          aulaTexto: 'object - Estrutura completa da aula-texto'
        }
      },
      set: {
        description: 'Gera um conjunto de imagens para um conceito',
        parameters: {
          type: 'set',
          concept: 'string - Nome do conceito',
          imageSet: 'array - Lista de imagens a gerar'
        }
      }
    },
    features: [
      'Otimização automática de prompts para educação',
      'Múltiplos estilos visuais',
      'Integração com aula-texto estruturada',
      'Geração em lote',
      'Fallback entre modelos de IA'
    ],
    geminiNanaBanana: {
      status: 'Implementado 🍌',
      description: 'Gemini Nano roda localmente no navegador (Chrome AI API)',
      functionality: 'Otimiza prompts educacionais antes da geração com DALL-E',
      requirement: 'Requer Chrome com flag --enable-features=Optimization-Guide-On-Device-Model',
      fallback: 'DALL-E 3 direto se Gemini Nano não estiver disponível'
    }
  };

  return NextResponse.json(info);
}