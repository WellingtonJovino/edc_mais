import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { prompt, type, topic, level } = await request.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt é obrigatório' },
        { status: 400 }
      );
    }

    console.log('🎨 Iniciando geração de imagem educacional...');
    console.log('📝 Prompt:', prompt.substring(0, 100) + '...');
    console.log('🎯 Tópico:', topic, '| Nível:', level, '| Tipo:', type);

    // Validar se a API key está configurada
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key não configurada');
    }

    // Enriquecer prompt com instruções específicas para DALL-E 3
    const enhancedPrompt = enhancePromptForDallE3(prompt, type, level);

    console.log('🚀 Prompt otimizado para DALL-E 3:', enhancedPrompt.substring(0, 150) + '...');

    // Gerar imagem usando DALL-E 3
    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: enhancedPrompt,
      size: "1024x1024",
      quality: "standard", // ou "hd" para qualidade superior
      style: level === 'beginner' ? 'natural' : 'vivid',
      n: 1,
    });

    const imageUrl = imageResponse.data?.[0]?.url;

    if (!imageUrl) {
      throw new Error('URL da imagem não foi retornada pela OpenAI');
    }

    console.log('✅ Imagem gerada com sucesso!');
    console.log('🔗 URL:', imageUrl.substring(0, 50) + '...');

    // Retornar dados da imagem
    return NextResponse.json({
      url: imageUrl,
      prompt: prompt,
      enhancedPrompt: enhancedPrompt,
      type: type,
      topic: topic,
      level: level,
      generatedAt: new Date().toISOString(),
      model: 'dall-e-3',
      size: '1024x1024'
    });

  } catch (error) {
    console.error('❌ Erro ao gerar imagem:', error);

    // Tratar diferentes tipos de erro da OpenAI
    if (error instanceof Error) {
      // Erro de política de conteúdo
      if (error.message.includes('content_policy_violation')) {
        return NextResponse.json(
          { error: 'O prompt viola as políticas de conteúdo da OpenAI. Tente reformular a descrição.' },
          { status: 400 }
        );
      }

      // Erro de rate limit
      if (error.message.includes('rate_limit')) {
        return NextResponse.json(
          { error: 'Limite de geração atingido. Tente novamente em alguns minutos.' },
          { status: 429 }
        );
      }

      // Erro de API key
      if (error.message.includes('api_key') || error.message.includes('authentication')) {
        return NextResponse.json(
          { error: 'Erro de autenticação com a OpenAI. Verifique a configuração.' },
          { status: 401 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Falha ao gerar imagem. Tente novamente.' },
      { status: 500 }
    );
  }
}

/**
 * Otimiza prompt para DALL-E 3 com instruções educacionais
 */
function enhancePromptForDallE3(
  originalPrompt: string,
  type: string,
  level: string
): string {
  // Instruções base para imagens educacionais
  const baseInstructions = [
    'educational illustration',
    'clean white background',
    'professional quality',
    'clear and organized layout',
    'suitable for learning materials'
  ];

  // Instruções específicas por tipo
  const typeInstructions = {
    diagram: [
      'technical diagram',
      'labeled components in Portuguese',
      'clean lines and clear connections',
      'structured layout with clear hierarchy'
    ],
    graph: [
      'educational chart or graph',
      'clear axes and scales',
      'distinct colors for different data sets',
      'readable labels and legend'
    ],
    illustration: [
      'detailed educational illustration',
      'realistic but simplified for clarity',
      'appropriate level of detail',
      'visually appealing and informative'
    ],
    scheme: [
      'step-by-step schematic',
      'numbered sequences',
      'directional arrows and flow indicators',
      'logical progression from left to right or top to bottom'
    ],
    concept: [
      'conceptual visualization',
      'abstract ideas made concrete',
      'clear separation of different concepts',
      'visual metaphors and analogies'
    ]
  };

  // Instruções específicas por nível
  const levelInstructions = {
    beginner: [
      'simple and friendly visual style',
      'bright and engaging colors',
      'minimal text and complexity',
      'large and clear visual elements'
    ],
    intermediate: [
      'balanced detail level',
      'professional but approachable style',
      'moderate complexity',
      'clear but comprehensive information'
    ],
    advanced: [
      'detailed and precise',
      'technical accuracy',
      'comprehensive information',
      'professional technical style'
    ]
  };

  // Instruções gerais de qualidade
  const qualityInstructions = [
    'high resolution',
    'sharp details',
    'consistent style',
    'harmonious color palette',
    'excellent visual hierarchy',
    'no unnecessary decorative elements'
  ];

  // Combinar todas as instruções
  const allInstructions = [
    ...baseInstructions,
    ...(typeInstructions[type as keyof typeof typeInstructions] || typeInstructions.illustration),
    ...(levelInstructions[level as keyof typeof levelInstructions] || levelInstructions.intermediate),
    ...qualityInstructions
  ];

  // Construir prompt final
  const enhancedPrompt = `${originalPrompt}, ${allInstructions.join(', ')}`;

  // Limitar tamanho do prompt (DALL-E 3 tem limite de caracteres)
  return enhancedPrompt.length > 4000
    ? enhancedPrompt.substring(0, 3950) + '...'
    : enhancedPrompt;
}