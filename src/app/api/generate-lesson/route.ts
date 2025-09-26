import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { topic, subtopic, level = 'intermediate' } = await req.json();

    if (!topic || !subtopic) {
      return NextResponse.json(
        { error: 'Topic and subtopic are required' },
        { status: 400 }
      );
    }

    const prompt = `Crie uma aula-texto completa e profissional sobre o tema: "${subtopic}" (que faz parte do tópico maior "${topic}").

Siga EXATAMENTE esta estrutura:

## Objetivos de Aprendizagem
Liste 3-5 objetivos claros do que o aluno vai aprender nesta aula.

## Introdução
Faça uma introdução envolvente que contextualize o assunto e desperte interesse do aluno. Conecte com conhecimentos prévios e mostre a importância do tema.

## Desenvolvimento

### [Subtítulo do Primeiro Conceito]
Explique o primeiro conceito principal com clareza, usando linguagem didática.

[IMAGEM: descreva detalhadamente uma imagem que ilustre este conceito, incluindo elementos visuais específicos, cores, disposição, etc.]

Continue explicando como a imagem se relaciona com o conceito.

### [Subtítulo do Segundo Conceito]
Desenvolva o segundo conceito importante, com exemplos práticos do cotidiano.

**Exemplo prático:** [Insira um exemplo real e aplicável]

### [Subtítulo do Terceiro Conceito]
Apresente o terceiro conceito, fazendo conexões com os anteriores.

[IMAGEM: descreva uma segunda imagem explicativa que ajude a visualizar este conceito ou processo]

Explique o que a imagem demonstra e sua importância.

### Aplicações e Exercícios Mentais
Apresente 2-3 situações práticas onde o conhecimento pode ser aplicado.

## Resumo
Recapitule os pontos principais da aula em formato de bullet points.

## Dica Extra
Adicione uma curiosidade interessante ou uma dica prática relacionada ao tema.

---

**Importante:**
- Use linguagem clara e didática, apropriada para nível ${level}
- Inclua exatamente 2 marcações [IMAGEM: ...] em pontos estratégicos
- Faça analogias com situações do dia a dia
- Mantenha um tom profissional mas acessível
- Formate o texto em Markdown válido`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Você é um professor especialista criando conteúdo educacional de alta qualidade. Suas aulas devem ser claras, envolventes e pedagogicamente estruturadas.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 3000,
    });

    const lessonContent = completion.choices[0].message.content || '';

    // Processar marcações de imagem
    const processedContent = processImageMarkers(lessonContent);

    return NextResponse.json({
      success: true,
      content: processedContent.content,
      images: processedContent.images,
      metadata: {
        topic,
        subtopic,
        level,
        generatedAt: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error('Error generating lesson:', error);
    return NextResponse.json(
      { error: 'Failed to generate lesson content' },
      { status: 500 }
    );
  }
}

interface ProcessedContent {
  content: string;
  images: Array<{
    id: string;
    description: string;
    position: number;
  }>;
}

function processImageMarkers(content: string): ProcessedContent {
  const images: ProcessedContent['images'] = [];
  let imageCounter = 0;

  // Regex para encontrar marcações [IMAGEM: ...]
  const imageRegex = /\[IMAGEM:\s*([^\]]+)\]/g;

  const processedContent = content.replace(imageRegex, (match, description) => {
    imageCounter++;
    const imageId = `image-${imageCounter}`;

    images.push({
      id: imageId,
      description: description.trim(),
      position: imageCounter,
    });

    // Substituir por um placeholder que será renderizado como imagem na interface
    return `\n\n<div class="lesson-image-placeholder" data-image-id="${imageId}">
  <div class="image-loading">
    <span class="image-icon">🖼️</span>
    <p class="image-description">Imagem ${imageCounter}: ${description.trim()}</p>
    <p class="image-status">Imagem ilustrativa em preparação...</p>
  </div>
</div>\n\n`;
  });

  return {
    content: processedContent,
    images,
  };
}