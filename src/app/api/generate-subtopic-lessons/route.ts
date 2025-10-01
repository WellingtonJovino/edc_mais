import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      courseStructureId,
      courseTitle,
      moduleTitle,
      topicTitle,
      subtopics,
      courseLevel = 'intermediate'
    } = body;

    // Validar parâmetros obrigatórios
    if (!courseStructureId || !courseTitle || !moduleTitle || !topicTitle || !subtopics || !Array.isArray(subtopics)) {
      return NextResponse.json({
        success: false,
        error: 'Parâmetros obrigatórios faltando'
      }, { status: 400 });
    }

    console.log('🎓 Gerando aulas-texto automáticas...', {
      courseStructureId,
      courseTitle,
      moduleTitle,
      topicTitle,
      subtopicsCount: subtopics.length,
      courseLevel
    });

    const generatedLessons: any[] = [];
    const errors: any[] = [];

    // Gerar aulas para cada subtópico
    for (let i = 0; i < Math.min(subtopics.length, 5); i++) { // Limitar a 5 subtópicos por vez
      const subtopic = subtopics[i];

      try {
        console.log(`📝 Gerando aula ${i + 1}/${subtopics.length}: "${subtopic.title}"`);

        const lessonContent = await generateLessonContent({
          courseTitle,
          courseLevel,
          moduleTitle,
          topicTitle,
          subtopicTitle: subtopic.title,
          subtopicDescription: subtopic.description
        });

        // Salvar no banco de dados
        const saveResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/save-subtopic-lesson`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            courseStructureId,
            moduleIndex: subtopic.moduleIndex,
            topicIndex: subtopic.topicIndex,
            subtopicIndex: subtopic.subtopicIndex,
            subtopicTitle: subtopic.title,
            lessonContent,
            metadata: {
              model: 'gpt-4o',
              difficulty: courseLevel,
              generatedAt: new Date().toISOString()
            }
          })
        });

        const saveResult = await saveResponse.json();

        if (saveResult.success) {
          generatedLessons.push({
            subtopicIndex: i,
            subtopicTitle: subtopic.title,
            lessonId: saveResult.lessonId,
            contentLength: lessonContent.length,
            status: 'generated'
          });
          console.log(`✅ Aula "${subtopic.title}" gerada e salva`);
        } else {
          console.error(`❌ Erro ao salvar aula "${subtopic.title}":`, saveResult.error);
          errors.push({
            subtopicIndex: i,
            subtopicTitle: subtopic.title,
            error: saveResult.error
          });
        }

        // Pequena pausa para evitar rate limits
        if (i < subtopics.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        console.error(`❌ Erro ao gerar aula "${subtopic.title}":`, error);
        errors.push({
          subtopicIndex: i,
          subtopicTitle: subtopic.title,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    }

    console.log(`🎉 Geração concluída: ${generatedLessons.length} aulas geradas, ${errors.length} erros`);

    return NextResponse.json({
      success: true,
      generated: generatedLessons,
      errors,
      totalGenerated: generatedLessons.length,
      totalErrors: errors.length
    });

  } catch (error) {
    console.error('❌ Erro no endpoint generate-subtopic-lessons:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}

// Função para gerar conteúdo da aula usando OpenAI
async function generateLessonContent(params: {
  courseTitle: string;
  courseLevel: string;
  moduleTitle: string;
  topicTitle: string;
  subtopicTitle: string;
  subtopicDescription?: string;
}): Promise<string> {
  const {
    courseTitle,
    courseLevel,
    moduleTitle,
    topicTitle,
    subtopicTitle,
    subtopicDescription
  } = params;

  // Ajustar a complexidade do prompt baseado no nível
  const levelInstructions = {
    beginner: 'Use linguagem simples e didática. Inclua exemplos básicos e analogias. Evite termos muito técnicos.',
    intermediate: 'Use linguagem técnica moderada. Inclua exemplos práticos e algumas aplicações.',
    advanced: 'Use linguagem técnica precisa. Inclua exemplos complexos, aplicações avançadas e referências teóricas.'
  };

  const instruction = levelInstructions[courseLevel as keyof typeof levelInstructions] || levelInstructions.intermediate;

  const prompt = `Você é um professor especialista criando uma aula-texto sobre "${subtopicTitle}" para o curso "${courseTitle}".

**Contexto do Curso:**
- Curso: ${courseTitle}
- Módulo: ${moduleTitle}
- Tópico: ${topicTitle}
- Subtópico: ${subtopicTitle}
- Nível: ${courseLevel}
${subtopicDescription ? `- Descrição: ${subtopicDescription}` : ''}

**Instruções:**
${instruction}

**Estrutura da Aula:**
1. **Introdução** (1-2 parágrafos)
   - Contextualize o subtópico dentro do tópico maior
   - Explique a importância e aplicações

2. **Desenvolvimento** (3-5 seções)
   - Conceitos fundamentais
   - Explicações detalhadas
   - Exemplos práticos
   - Fórmulas ou procedimentos (se aplicável)

3. **Exemplos Práticos** (1-2 exemplos)
   - Problemas resolvidos passo a passo
   - Aplicações reais

4. **Pontos-Chave**
   - Lista dos conceitos mais importantes
   - Dicas para memorização

5. **Conclusão**
   - Resumo dos principais aprendizados
   - Conexão com próximos tópicos

**Formato:**
- Use HTML simples (h3, h4, p, ul, li, strong, em)
- Inclua exemplos em blocos destacados
- Use listas para organizar informações
- Mantenha entre 800-1500 palavras
- Seja didático e envolvente

Crie uma aula-texto completa e educativa sobre "${subtopicTitle}":`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Você é um professor universitário especialista em criar conteúdo educacional de alta qualidade. Sempre forneça explicações claras, didáticas e bem estruturadas.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 3000,
      temperature: 0.7
    });

    const content = completion.choices[0]?.message?.content?.trim();

    if (!content) {
      throw new Error('Conteúdo vazio retornado pela OpenAI');
    }

    return content;

  } catch (error) {
    console.error('❌ Erro ao gerar aula com OpenAI:', error);
    throw new Error(`Falha na geração de conteúdo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}