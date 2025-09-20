import { NextRequest, NextResponse } from 'next/server';
import { evaluateAulaTextoQuality, improveAulaTexto } from '@/lib/openai';
import { validateRAGContext } from '@/lib/rag';
import {
  AulaTextoStructure,
  AulaTextoQualityAssessment,
  RAGContext
} from '@/types';

// Force Node.js runtime para operações OpenAI
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ReviewRequest {
  aulaTexto: AulaTextoStructure;
  ragContext?: RAGContext[];
  autoImprove?: boolean; // Se deve melhorar automaticamente quando score < 8
}

interface ReviewResponse {
  success: boolean;
  assessment: AulaTextoQualityAssessment;
  improvedAulaTexto?: AulaTextoStructure;
  improved: boolean;
  error?: string;
}

/**
 * POST /api/review-aula-texto
 *
 * Avalia qualidade de uma aula-texto usando rubrica científica
 * Opcionalmente melhora automaticamente se qualidade for baixa
 */
export async function POST(request: NextRequest): Promise<NextResponse<ReviewResponse>> {
  try {
    const body: ReviewRequest = await request.json();

    // Validação de entrada
    if (!body.aulaTexto) {
      return NextResponse.json(
        {
          success: false,
          error: 'aulaTexto é obrigatório',
          assessment: {} as AulaTextoQualityAssessment,
          improved: false
        },
        { status: 400 }
      );
    }

    if (!body.aulaTexto.topic || !body.aulaTexto.level) {
      return NextResponse.json(
        {
          success: false,
          error: 'aulaTexto deve ter topic e level definidos',
          assessment: {} as AulaTextoQualityAssessment,
          improved: false
        },
        { status: 400 }
      );
    }

    console.log(`📊 Iniciando avaliação para: "${body.aulaTexto.topic}"`);

    // Validar contexto RAG se fornecido
    let validatedRAGContext: RAGContext[] | undefined = undefined;
    if (body.ragContext && body.ragContext.length > 0) {
      const contextStrings = body.ragContext.map(c => c.content);
      const validation = validateRAGContext(contextStrings);

      if (!validation.isValid) {
        console.warn('⚠️ Contexto RAG inválido, prosseguindo sem ele');
      } else {
        validatedRAGContext = body.ragContext;
        if (validation.warnings.length > 0) {
          console.warn('⚠️ Avisos no contexto RAG:', validation.warnings);
        }
      }
    }

    // 1. Avaliar qualidade da aula-texto
    console.log('📊 Avaliando qualidade da aula-texto...');
    const assessment = await evaluateAulaTextoQuality(
      body.aulaTexto,
      validatedRAGContext
    );

    console.log(`✅ Avaliação concluída: Score ${assessment.score}/10`);

    let improvedAulaTexto: AulaTextoStructure | undefined = undefined;
    let improved = false;

    // 2. Melhorar automaticamente se solicitado e score < 8
    if (body.autoImprove && assessment.needsRewrite && assessment.score < 8) {
      console.log(`📈 Score ${assessment.score}/10 baixo, iniciando melhoria automática...`);

      try {
        improvedAulaTexto = await improveAulaTexto(body.aulaTexto, assessment);
        improved = true;

        // Re-avaliar após melhoria para score atualizado
        const newAssessment = await evaluateAulaTextoQuality(
          improvedAulaTexto,
          validatedRAGContext
        );

        console.log(`📊 Score após melhoria: ${newAssessment.score}/10`);

        // Atualizar assessment com novo score
        assessment.score = newAssessment.score;
        assessment.needsRewrite = newAssessment.needsRewrite;

        // Mesclar feedback das duas avaliações
        assessment.feedback = [
          ...assessment.feedback,
          `Versão melhorada automaticamente (score original: ${assessment.score})`,
          ...newAssessment.feedback
        ];

      } catch (improvementError) {
        console.error('❌ Erro durante melhoria automática:', improvementError);

        // Adicionar erro ao feedback
        assessment.feedback.push(
          'Tentativa de melhoria automática falhou - versão original mantida'
        );
      }
    }

    // 3. Preparar resposta
    const response: ReviewResponse = {
      success: true,
      assessment,
      improved,
      ...(improvedAulaTexto && { improvedAulaTexto })
    };

    console.log(`✅ Avaliação completa: Score final ${assessment.score}/10, Melhorado: ${improved}`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Erro na avaliação da aula-texto:', error);

    // Resposta de erro estruturada
    const errorResponse: ReviewResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor',
      assessment: {
        score: 0,
        detalhamento: {
          clareza: { pontos: 0, comentario: 'Avaliação falhou' },
          completude: { pontos: 0, comentario: 'Avaliação falhou' },
          precisao: { pontos: 0, comentario: 'Avaliação falhou' },
          exemplos: { pontos: 0, comentario: 'Avaliação falhou' },
          exercicios: { pontos: 0, comentario: 'Avaliação falhou' },
          adequacao: { pontos: 0, comentario: 'Avaliação falhou' }
        },
        checklist: [],
        feedback: ['Erro durante avaliação automática'],
        needsRewrite: true,
        strengths: [],
        improvementAreas: ['Avaliar manualmente']
      },
      improved: false
    };

    return NextResponse.json(
      errorResponse,
      { status: 500 }
    );
  }
}

/**
 * GET /api/review-aula-texto
 *
 * Retorna informações sobre o endpoint e rubrica de avaliação
 */
export async function GET(): Promise<NextResponse> {
  const info = {
    endpoint: '/api/review-aula-texto',
    description: 'Avalia qualidade de aula-texto usando rubrica científica pedagógica',
    methods: ['POST'],
    rubrica: {
      criterios: [
        { nome: 'Clareza', peso: '20%', descricao: 'Linguagem clara, transições fluidas, estrutura lógica' },
        { nome: 'Completude Conceitual', peso: '25%', descricao: 'Cobertura adequada do tópico, profundidade apropriada' },
        { nome: 'Precisão Factual', peso: '20%', descricao: 'Informações corretas, fontes citadas quando necessário' },
        { nome: 'Exemplos e Aplicações', peso: '15%', descricao: 'Qualidade e relevância dos exemplos, analogias eficazes' },
        { nome: 'Exercícios e Verificação', peso: '10%', descricao: 'Presença de exercícios, qualidade das perguntas de reflexão' },
        { nome: 'Adequação ao Nível', peso: '10%', descricao: 'Vocabulário e profundidade apropriados ao nível do aluno' }
      ],
      escala: 'Score de 0-10 com 2 casas decimais',
      threshold: 'Score < 8 requer melhoria (needsRewrite: true)'
    },
    exemplo_request: {
      aulaTexto: {
        topic: 'Derivadas de funções polinomiais',
        level: 'intermediate',
        // ... estrutura completa da aula-texto
      },
      ragContext: [
        {
          source: 'documento',
          content: 'Contexto extraído de documentos...',
          relevanceScore: 0.9,
          metadata: { title: 'Cálculo I' }
        }
      ],
      autoImprove: true
    },
    exemplo_response: {
      success: true,
      assessment: {
        score: 8.5,
        detalhamento: {
          clareza: { pontos: 9, comentario: 'Linguagem clara e bem estruturada' },
          // ... outros critérios
        },
        checklist: [
          { item: 'Definições claras', ok: true, comentario: 'Presente' }
        ],
        feedback: ['Excelente uso de analogias'],
        needsRewrite: false,
        strengths: ['Estrutura pedagógica sólida'],
        improvementAreas: []
      },
      improved: false
    }
  };

  return NextResponse.json(info);
}