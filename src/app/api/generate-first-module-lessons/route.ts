import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Cache global para SSE
const progressCache = new Map<string, any>();

export async function POST(req: NextRequest) {
  try {
    const { syllabus, sessionId } = await req.json();

    if (!syllabus || !sessionId) {
      return NextResponse.json(
        { error: 'Syllabus and sessionId are required' },
        { status: 400 }
      );
    }

    // Extrair primeiro módulo e seus subtópicos
    const firstModule = syllabus.modules?.[0];
    if (!firstModule) {
      return NextResponse.json(
        { error: 'No modules found in syllabus' },
        { status: 400 }
      );
    }

    // Coletar todos os subtópicos do primeiro módulo
    const subtopics: any[] = [];
    firstModule.topics?.forEach((topic: any) => {
      if (topic.subtopics && Array.isArray(topic.subtopics)) {
        topic.subtopics.forEach((subtopic: any) => {
          subtopics.push({
            topicTitle: topic.title,
            subtopic: typeof subtopic === 'string' ? subtopic : subtopic.title || subtopic.name,
            id: subtopic.id || `sub_${topic.id}_${subtopics.length}`
          });
        });
      }
    });

    // Inicializar progresso
    progressCache.set(sessionId, {
      total: subtopics.length,
      current: 0,
      status: 'generating',
      message: 'Iniciando geração das aulas...',
      lessons: {}
    });

    // Gerar aulas em paralelo (mas com limite de concorrência)
    const BATCH_SIZE = 3; // Processar 3 aulas por vez
    const generatedLessons: Record<string, string> = {};

    for (let i = 0; i < subtopics.length; i += BATCH_SIZE) {
      const batch = subtopics.slice(i, Math.min(i + BATCH_SIZE, subtopics.length));

      // Atualizar progresso
      progressCache.set(sessionId, {
        total: subtopics.length,
        current: i,
        status: 'generating',
        message: `Gerando aula ${i + 1} de ${subtopics.length}...`,
        lessons: generatedLessons
      });

      // Gerar batch em paralelo
      const batchPromises = batch.map(async (item) => {
        try {
          const lessonContent = await generateLesson(
            item.topicTitle,
            item.subtopic,
            'intermediate'
          );
          return { id: item.id, content: lessonContent };
        } catch (error) {
          console.error(`Error generating lesson for ${item.subtopic}:`, error);
          return { id: item.id, content: null };
        }
      });

      const batchResults = await Promise.all(batchPromises);

      // Adicionar resultados ao objeto de lições
      batchResults.forEach(result => {
        if (result.content) {
          generatedLessons[result.id] = result.content;
        }
      });
    }

    // Marcar como completo
    progressCache.set(sessionId, {
      total: subtopics.length,
      current: subtopics.length,
      status: 'completed',
      message: 'Todas as aulas foram geradas!',
      lessons: generatedLessons
    });

    return NextResponse.json({
      success: true,
      sessionId,
      lessonsGenerated: Object.keys(generatedLessons).length,
      totalSubtopics: subtopics.length
    });

  } catch (error) {
    console.error('Error generating first module lessons:', error);
    return NextResponse.json(
      { error: 'Failed to generate lessons' },
      { status: 500 }
    );
  }
}

// SSE endpoint para progresso
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json(
      { error: 'SessionId is required' },
      { status: 400 }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendProgress = () => {
        const progress = progressCache.get(sessionId);

        if (!progress) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            error: 'Session not found'
          })}\n\n`));
          controller.close();
          return;
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify(progress)}\n\n`));

        if (progress.status === 'completed' || progress.status === 'error') {
          // Limpar cache após enviar resultado final
          setTimeout(() => progressCache.delete(sessionId), 5000);
          controller.close();
        } else {
          // Verificar progresso novamente em 1 segundo
          setTimeout(sendProgress, 1000);
        }
      };

      sendProgress();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

async function generateLesson(topic: string, subtopic: string, level: string): Promise<string> {
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
  return processImageMarkers(lessonContent).content;
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

  const imageRegex = /\[IMAGEM:\s*([^\]]+)\]/g;

  const processedContent = content.replace(imageRegex, (match, description) => {
    imageCounter++;
    const imageId = `image-${imageCounter}`;

    images.push({
      id: imageId,
      description: description.trim(),
      position: imageCounter,
    });

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