import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      courseStructureId,
      moduleIndex,
      topicIndex,
      subtopicIndex,
      moduleTitle,
      topicTitle,
      subtopicTitle,
      subject,
      educationLevel = 'undergraduate'
    } = body;

    console.log('🎓 Gerando aula individual:', {
      subtopicTitle,
      moduleIndex,
      topicIndex,
      subtopicIndex
    });

    // Verificar parâmetros obrigatórios
    if (!subtopicTitle || !topicTitle ||
        moduleIndex === undefined || topicIndex === undefined || subtopicIndex === undefined) {
      return NextResponse.json({
        success: false,
        error: 'Parâmetros obrigatórios faltando'
      }, { status: 400 });
    }

    // Primeiro verificar se já existe no banco
    if (courseStructureId) {
      console.log('🔍 Verificando se a aula já existe no banco...');

      const checkResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/save-subtopic-lesson?` +
        `courseStructureId=${courseStructureId}&` +
        `subject=${encodeURIComponent(subject || '')}&` +
        `educationLevel=${encodeURIComponent(educationLevel)}`
      );

      const checkResult = await checkResponse.json();

      if (checkResult.success && checkResult.lessons) {
        const existingLesson = checkResult.lessons.find((lesson: any) =>
          lesson.module_index === moduleIndex &&
          lesson.topic_index === topicIndex &&
          lesson.subtopic_index === subtopicIndex
        );

        if (existingLesson) {
          console.log('✅ Aula já existe no banco, retornando...');
          return NextResponse.json({
            success: true,
            content: existingLesson.lesson_content,
            fromCache: true
          });
        }
      }
    }

    // Gerar a aula com GPT
    console.log('🤖 Gerando nova aula com GPT...');
    const prompt = `Crie uma aula-texto completa e profissional sobre o tema: "${subtopicTitle}" (que faz parte do tópico maior "${topicTitle}").

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
- Use linguagem clara e didática, apropriada para nível ${educationLevel}
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
    const processedContent = processImageMarkers(lessonContent);

    // Salvar no banco de dados se tivermos courseStructureId
    if (courseStructureId) {
      console.log('💾 Salvando aula no banco de dados...');

      const saveResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/save-subtopic-lesson`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseStructureId,
            moduleIndex,
            topicIndex,
            subtopicIndex,
            subtopicTitle,
            lessonContent: processedContent.content,
            subject,
            educationLevel,
            metadata: {
              model: 'gpt-4o-mini',
              difficulty: 'medium',
              generatedAt: new Date().toISOString(),
              moduleTitle,
              topicTitle,
              generatedOnDemand: true
            }
          })
        }
      );

      const saveResult = await saveResponse.json();
      if (saveResult.success) {
        console.log('✅ Aula salva no banco com sucesso');
      } else {
        console.error('❌ Erro ao salvar aula:', saveResult.error);
      }
    }

    return NextResponse.json({
      success: true,
      content: processedContent.content,
      images: processedContent.images
    });

  } catch (error) {
    console.error('❌ Erro ao gerar aula individual:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
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