import { NextRequest, NextResponse } from 'next/server';
import { generateHighQualityAulaTexto } from '@/lib/openai';
import { buildRAGContextForTopic } from '@/lib/rag';
import { generateImagesForAulaTexto } from '@/lib/image-generation';
import {
  AulaTextoConfig,
  AulaTextoStructure,
  AulaTextoQualityAssessment,
  UploadedFile,
  RAGContext
} from '@/types';

// Force Node.js runtime para operações OpenAI
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface GenerateRequest {
  topic: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  studentProfile?: {
    priorKnowledge?: string[];
    learningGoals?: string[];
    timeAvailable?: string;
  };
  uploadedFiles?: UploadedFile[];
  maxWords?: number;
  autoImprove?: boolean; // Se deve usar pipeline de melhoria automática
  generateImages?: boolean; // Se deve gerar imagens automaticamente
}

interface GenerateResponse {
  success: boolean;
  aulaTexto?: AulaTextoStructure;
  assessment?: AulaTextoQualityAssessment;
  metadata: {
    tokensUsed: number;
    processingTime: number;
    ragSources: string[];
    totalSnippets: number;
    improved: boolean;
    qualityScore: number;
    imagesGenerated: boolean;
  };
  error?: string;
}

/**
 * POST /api/generate-aula-texto
 *
 * Gera aula-texto de alta qualidade usando:
 * - Templates de prompt pedagógicos científicos
 * - Sistema RAG com arquivos enviados e pesquisa acadêmica
 * - Avaliação automática de qualidade
 * - Melhoria automática se necessário
 */
export async function POST(request: NextRequest): Promise<NextResponse<GenerateResponse>> {
  const startTime = Date.now();

  try {
    const body: GenerateRequest = await request.json();

    // Validação de entrada
    if (!body.topic || !body.level) {
      return NextResponse.json(
        {
          success: false,
          error: 'topic e level são obrigatórios',
          metadata: {
            tokensUsed: 0,
            processingTime: Date.now() - startTime,
            ragSources: [],
            totalSnippets: 0,
            improved: false,
            qualityScore: 0,
            imagesGenerated: false
          }
        },
        { status: 400 }
      );
    }

    if (!['beginner', 'intermediate', 'advanced'].includes(body.level)) {
      return NextResponse.json(
        {
          success: false,
          error: 'level deve ser: beginner, intermediate, ou advanced',
          metadata: {
            tokensUsed: 0,
            processingTime: Date.now() - startTime,
            ragSources: [],
            totalSnippets: 0,
            improved: false,
            qualityScore: 0,
            imagesGenerated: false
          }
        },
        { status: 400 }
      );
    }

    console.log(`🚀 Iniciando geração de aula-texto para: "${body.topic}" (${body.level})`);

    // 1. Construir configuração da aula-texto
    const config: AulaTextoConfig = {
      topic: body.topic,
      level: body.level,
      studentProfile: body.studentProfile,
      maxWords: body.maxWords || 1500
    };

    // 2. Construir contexto RAG se houver arquivos ou pesquisa acadêmica
    console.log('🔍 Construindo contexto RAG...');
    const ragResult = await buildRAGContextForTopic(config, body.uploadedFiles);

    // Adicionar contexto RAG à configuração
    if (ragResult.ragContext.length > 0) {
      config.ragContext = ragResult.ragContext;
      console.log(`✅ Contexto RAG construído: ${ragResult.totalSnippets} snippets de ${ragResult.sources.length} fontes`);
    } else {
      console.log('ℹ️ Nenhum contexto RAG disponível, usando apenas conhecimento base');
    }

    // 3. Converter para formato RAGContext para avaliação
    const ragContextForAssessment: RAGContext[] = ragResult.ragContext.map((content, index) => ({
      source: ragResult.sources.includes('Documentos Enviados') ? 'documento' : 'perplexity',
      content,
      relevanceScore: 0.8,
      metadata: {
        title: `Contexto ${index + 1}`
      }
    }));

    // 4. Gerar aula-texto usando pipeline completo ou básico
    let aulaTexto: AulaTextoStructure;
    let assessment: AulaTextoQualityAssessment;
    let tokensUsed: number;
    let improved: boolean;

    if (body.autoImprove !== false) {
      // Pipeline completo com avaliação e melhoria automática
      console.log('🎯 Usando pipeline completo (geração + avaliação + melhoria)...');

      const result = await generateHighQualityAulaTexto(config, ragContextForAssessment);

      aulaTexto = result.aulaTexto;
      assessment = result.assessment;
      tokensUsed = result.tokensUsed;
      improved = result.improved;

    } else {
      // Pipeline básico apenas com geração
      console.log('🎯 Usando pipeline básico (apenas geração)...');

      const { generateAulaTexto, evaluateAulaTextoQuality } = await import('@/lib/openai');

      const generateResult = await generateAulaTexto(config);
      aulaTexto = generateResult.aulaTexto;
      tokensUsed = generateResult.tokensUsed;
      improved = false;

      // Avaliação básica
      assessment = await evaluateAulaTextoQuality(aulaTexto, ragContextForAssessment);
    }

    // 5. Gerar imagens se solicitado
    let imagesGenerated = false;
    if (body.generateImages) {
      try {
        console.log('🎨 Iniciando geração de imagens para aula-texto...');
        aulaTexto = await generateImagesForAulaTexto(aulaTexto);
        imagesGenerated = true;
        console.log('✅ Imagens geradas e inseridas na aula-texto');
      } catch (imageError) {
        console.error('⚠️ Erro na geração de imagens (continuando sem imagens):', imageError);
        // Continua sem as imagens em caso de erro
      }
    }

    const processingTime = Date.now() - startTime;

    console.log(`✅ Aula-texto gerada com sucesso em ${processingTime}ms`);
    console.log(`📊 Score final: ${assessment.score}/10, Melhorado: ${improved}`);
    console.log(`🎨 Imagens geradas: ${imagesGenerated}`);
    console.log(`🔗 Fontes RAG: ${ragResult.sources.join(', ')}`);

    // 6. Preparar resposta
    const response: GenerateResponse = {
      success: true,
      aulaTexto,
      assessment,
      metadata: {
        tokensUsed,
        processingTime,
        ragSources: ragResult.sources,
        totalSnippets: ragResult.totalSnippets,
        improved,
        qualityScore: assessment.score,
        imagesGenerated
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Erro na geração da aula-texto:', error);

    const errorResponse: GenerateResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor',
      metadata: {
        tokensUsed: 0,
        processingTime,
        ragSources: [],
        totalSnippets: 0,
        improved: false,
        qualityScore: 0,
        imagesGenerated: false
      }
    };

    return NextResponse.json(
      errorResponse,
      { status: 500 }
    );
  }
}

/**
 * GET /api/generate-aula-texto
 *
 * Retorna informações sobre o endpoint e exemplos de uso
 */
export async function GET(): Promise<NextResponse> {
  const info = {
    endpoint: '/api/generate-aula-texto',
    description: 'Gera aula-texto de alta qualidade usando princípios pedagógicos científicos',
    features: [
      'Templates de prompt baseados em pesquisa educacional',
      'Sistema RAG com arquivos enviados e pesquisa acadêmica',
      'Avaliação automática de qualidade (rubrica científica)',
      'Melhoria automática quando score < 8',
      'Estrutura pedagógica: Introdução → Desenvolvimento → Conclusão → Verificação',
      'Geração automática de imagens educacionais com IA (DALL-E 3 + Gemini Nano)',
      'Suporte a fórmulas matemáticas em LaTeX',
      'Diagramas, gráficos e ilustrações contextualizadas'
    ],
    methods: ['POST'],
    parametros: {
      obrigatorios: {
        topic: 'string - Tópico da aula (ex: "Derivadas de funções polinomiais")',
        level: 'string - Nível: beginner, intermediate, advanced'
      },
      opcionais: {
        studentProfile: {
          priorKnowledge: 'string[] - Conhecimentos prévios do aluno',
          learningGoals: 'string[] - Objetivos de aprendizado',
          timeAvailable: 'string - Tempo disponível para estudo'
        },
        uploadedFiles: 'UploadedFile[] - Arquivos enviados pelo usuário',
        maxWords: 'number - Máximo de palavras (padrão: 1500)',
        autoImprove: 'boolean - Usar melhoria automática (padrão: true)',
        generateImages: 'boolean - Gerar imagens automaticamente (padrão: false)'
      }
    },
    exemplo_request: {
      topic: 'Introdução aos Materiais para Construção Mecânica',
      level: 'beginner',
      studentProfile: {
        priorKnowledge: ['física básica', 'matemática do ensino médio'],
        learningGoals: ['compreender propriedades dos materiais', 'aplicar em projetos'],
        timeAvailable: '2 horas por semana'
      },
      maxWords: 1200,
      autoImprove: true
    },
    exemplo_response: {
      success: true,
      aulaTexto: {
        topic: 'Introdução aos Materiais para Construção Mecânica',
        level: 'beginner',
        metadata: {
          generatedAt: '2025-09-14T10:30:00Z',
          sources: ['RAG Context', 'OpenAI Knowledge'],
          tokensUsed: 3500,
          qualityScore: 8.7
        },
        introducao: {
          objetivos: ['Compreender tipos de materiais', 'Identificar propriedades fundamentais'],
          preRequisitos: ['Física básica', 'Noções de química'],
          tempoEstimado: '45-60 minutos',
          overview: 'Esta aula apresenta os materiais fundamentais...'
        },
        // ... estrutura completa
      },
      assessment: {
        score: 8.7,
        needsRewrite: false,
        // ... detalhes da avaliação
      },
      metadata: {
        tokensUsed: 3500,
        processingTime: 15000,
        ragSources: ['Documentos Enviados', 'Pesquisa Acadêmica'],
        totalSnippets: 12,
        improved: true,
        qualityScore: 8.7
      }
    },
    estrutura_aula_texto: {
      introducao: 'Objetivos, pré-requisitos, visão geral',
      desenvolvimento: 'Conceitos com definições, exemplos, analogias',
      conclusao: 'Resumo executivo, pontos-chave, conexões futuras',
      verificacao: 'Perguntas de reflexão, exercícios, auto-avaliação',
      referencias: 'Fontes e materiais adicionais'
    }
  };

  return NextResponse.json(info);
}