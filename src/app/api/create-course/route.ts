import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Cache global para SSE
const progressCache = new Map<string, any>();

export async function POST(request: NextRequest) {
  try {
    const { syllabus, uploadedFiles, sessionId } = await request.json();

    if (!syllabus) {
      return NextResponse.json(
        { success: false, error: 'Syllabus é obrigatório' },
        { status: 400 }
      );
    }

    console.log('🏗️ Criando curso final:', {
      title: syllabus.title,
      modulesCount: syllabus.modules?.length || 0,
      filesCount: uploadedFiles?.length || 0,
      sessionId: sessionId
    });

    // 1. Gerar ID único simples para o curso
    const courseId = `course_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 2. Iniciar geração de aulas do primeiro módulo em paralelo
    let lessonGenerationPromise = null;

    // Usar sessionId enviado ou criar um padrão
    const effectiveSessionId = sessionId || `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // FORÇAR geração de aulas sempre se houver módulos
    if (syllabus.modules && syllabus.modules.length > 0) {
      console.log('🎓 SEMPRE iniciando geração de aulas do primeiro módulo...');
      console.log('📊 SessionId usado:', effectiveSessionId);
      console.log('📚 Primeiro módulo:', syllabus.modules[0]?.title);

      // Importar e executar diretamente a função de geração
      lessonGenerationPromise = startLessonGeneration(syllabus, effectiveSessionId).catch(error => {
        console.error('Erro ao iniciar geração de aulas:', error);
        return null;
      });
    } else {
      console.log('⚠️ Nenhum módulo encontrado para gerar aulas');
    }

    console.log('✅ Curso criado com ID:', courseId);

    // 3. Calcular estatísticas do curso
    let totalTopics = 0;

    if (syllabus.modules && Array.isArray(syllabus.modules)) {
      for (const courseModule of syllabus.modules) {
        if (courseModule.topics && Array.isArray(courseModule.topics)) {
          totalTopics += courseModule.topics.length;
        }
      }
    }

    console.log('✅ Curso finalizado:', {
      id: courseId,
      title: syllabus.title,
      total_topics: totalTopics
    });

    return NextResponse.json({
      success: true,
      courseId: courseId,
      course: {
        id: courseId,
        title: syllabus.title,
        description: syllabus.description || `Curso de ${syllabus.title}`,
        total_topics: totalTopics,
        progress: 0,
        syllabus_data: syllabus
      },
      message: `Curso "${syllabus.title}" criado com ${totalTopics} tópicos`,
      sessionId: sessionId || effectiveSessionId, // Sempre retornar um sessionId
      generatingLessons: lessonGenerationPromise !== null
    });

  } catch (error) {
    console.error('❌ Erro ao criar curso:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno do servidor'
      },
      { status: 500 }
    );
  }
}

// Função para iniciar geração de aulas sem fetch
async function startLessonGeneration(syllabus: any, sessionId: string) {
  try {
    // Extrair primeiro módulo e seus subtópicos
    const firstModule = syllabus.modules?.[0];
    if (!firstModule) {
      throw new Error('No modules found in syllabus');
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

    return {
      success: true,
      sessionId,
      lessonsGenerated: Object.keys(generatedLessons).length,
      totalSubtopics: subtopics.length
    };

  } catch (error) {
    console.error('Error generating first module lessons:', error);
    progressCache.set(sessionId, {
      status: 'error',
      error: 'Failed to generate lessons'
    });
    throw error;
  }
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

// Endpoint para SSE do progresso das aulas
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId');

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