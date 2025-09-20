import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { detectLearningDifficulties } from '@/lib/openai';

// Force Node.js runtime para operações OpenAI
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  topicContext?: string;
}

interface ChatRequest {
  message: string;
  courseTitle: string;
  currentTopic?: {
    id: string;
    title: string;
  };
  chatHistory?: ChatMessage[];
}

/**
 * POST /api/courses/[id]/chat
 *
 * Conversa interativa durante o curso
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const courseId = params.id;
    const body: ChatRequest = await request.json();

    if (!body.message?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Mensagem é obrigatória' },
        { status: 400 }
      );
    }

    console.log(`💬 Chat do curso ${courseId}: "${body.message}"`);

    // Construir contexto do sistema baseado no curso e tópico atual
    let systemPrompt = `Você é um assistente educacional especializado que ajuda estudantes durante um curso.

CURSO ATUAL: "${body.courseTitle}"

SUAS FUNÇÕES:
- Esclarecer dúvidas sobre o conteúdo do curso
- Dar explicações adicionais com exemplos práticos
- Sugerir exercícios de fixação
- Recomendar recursos complementares
- Identificar pré-requisitos em falta
- Motivar e orientar o estudante

DIRETRIZES:
- Seja didático e use linguagem acessível
- Sempre dê exemplos práticos quando possível
- Se o aluno não entender algo, explique de outra forma
- Para matemática/engenharia, use notação LaTeX com \\(...\\)
- Seja encorajador e paciente
- Se perceber que falta base, sugira estudar pré-requisitos

FORMATO DAS RESPOSTAS:
- Respostas concisas mas completas (máximo 200 palavras)
- Use emojis para deixar mais amigável
- Termine sempre perguntando se ficou claro ou se tem outras dúvidas`;

    // Adicionar contexto do tópico atual se houver
    if (body.currentTopic) {
      systemPrompt += `\n\nTÓPICO ATUAL: "${body.currentTopic.title}"
Esta pergunta pode estar relacionada ao tópico que o aluno está estudando agora.`;
    }

    // Construir histórico da conversa para o modelo
    const messages: any[] = [
      { role: 'system', content: systemPrompt }
    ];

    // Adicionar histórico recente (últimas 5 mensagens para contexto)
    if (body.chatHistory && body.chatHistory.length > 0) {
      const recentHistory = body.chatHistory.slice(-5);
      recentHistory.forEach(msg => {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      });
    }

    // Adicionar a mensagem atual
    messages.push({
      role: 'user',
      content: body.message
    });

    // Gerar resposta usando OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content;

    if (!response) {
      throw new Error('Resposta vazia da OpenAI');
    }

    console.log(`✅ Resposta do assistente gerada (${response.length} chars)`);

    // Detectar possíveis dificuldades com pré-requisitos
    let difficultyAnalysis = null;
    if (body.chatHistory && body.chatHistory.length >= 2 && body.currentTopic) {
      try {
        console.log('🔍 Analisando possíveis dificuldades...');

        // Extrair apenas mensagens do usuário para análise
        const userMessages = body.chatHistory
          .filter(msg => msg.role === 'user')
          .map(msg => msg.content);

        // Adicionar a mensagem atual
        userMessages.push(body.message);

        difficultyAnalysis = await detectLearningDifficulties(
          userMessages,
          body.currentTopic.title,
          body.courseTitle
        );

        if (difficultyAnalysis.hasProblems) {
          console.log(`⚠️ Dificuldades detectadas: ${difficultyAnalysis.missingKnowledge.join(', ')}`);
        }
      } catch (error) {
        console.error('❌ Erro ao detectar dificuldades:', error);
      }
    }

    // TODO: Salvar conversa no banco de dados para persistência
    // Implementar depois quando necessário

    return NextResponse.json({
      success: true,
      response,
      metadata: {
        tokensUsed: completion.usage?.total_tokens || 0,
        courseId,
        topicContext: body.currentTopic?.title,
        difficultyAnalysis
      }
    });

  } catch (error) {
    console.error('❌ Erro no chat do curso:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno do servidor',
        response: 'Desculpe, ocorreu um erro. Você pode tentar reformular sua pergunta? 🤖'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/courses/[id]/chat
 *
 * Retorna histórico do chat (implementação futura)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const courseId = params.id;

    // TODO: Implementar busca do histórico no banco
    // Por enquanto retorna vazio

    return NextResponse.json({
      success: true,
      messages: [],
      courseId
    });

  } catch (error) {
    console.error('❌ Erro ao buscar histórico do chat:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao buscar histórico',
        messages: []
      },
      { status: 500 }
    );
  }
}