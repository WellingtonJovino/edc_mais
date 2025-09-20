import { NextRequest, NextResponse } from 'next/server';
import { analyzeLearningGoal, generatePrerequisites } from '@/lib/openai';
import { searchAndRankYouTube } from '@/lib/youtube';
import { saveCourse } from '@/lib/supabase';
import { SupportCourse } from '@/types';

// Force Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CreateSupportCourseRequest {
  supportCourse: SupportCourse;
  parentCourseId: string;
  userLevel?: 'beginner' | 'intermediate' | 'advanced';
}

/**
 * POST /api/courses/support/create
 *
 * Cria automaticamente um curso de apoio baseado nas dificuldades detectadas
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: CreateSupportCourseRequest = await request.json();

    if (!body.supportCourse) {
      return NextResponse.json(
        { success: false, error: 'supportCourse é obrigatório' },
        { status: 400 }
      );
    }

    const { supportCourse, parentCourseId, userLevel = 'beginner' } = body;

    console.log(`🚀 Criando curso de apoio: "${supportCourse.title}"`);

    // 1. Gerar análise detalhada do curso de apoio
    const analysis = await analyzeLearningGoal(
      `Criar um curso de apoio focado em: ${supportCourse.title}.

       Descrição: ${supportCourse.description}

       Tópicos sugeridos: ${supportCourse.topics.join(', ')}

       Este curso deve preparar o aluno para: ${supportCourse.prerequisiteFor}`,
      userLevel,
      []
    );

    console.log(`📊 Análise concluída: ${analysis.subject} (${analysis.level})`);

    // 2. Criar tópicos estruturados baseados nas sugestões
    const structuredTopics = supportCourse.topics.map((topicTitle, index) => ({
      id: `support-topic-${Date.now()}-${index}`,
      title: topicTitle,
      description: `Conceitos fundamentais sobre ${topicTitle} necessários para prosseguir no curso principal.`,
      detailedDescription: `Conceitos fundamentais sobre ${topicTitle} necessários para prosseguir no curso principal.`,
      order: index + 1,
      videos: [],
      aulaTexto: {} as any,
      completed: false,
      estimatedDuration: '30 min',
      contentType: 'mixed' as const,
      hasDoubtButton: true,
      difficulty: 'easy' as const,
      learningObjectives: [
        `Compreender os conceitos básicos de ${topicTitle}`,
        `Aplicar conhecimentos de ${topicTitle} em exercícios simples`,
        `Estar preparado para estudar ${supportCourse.prerequisiteFor}`
      ],
      keyTerms: [topicTitle.toLowerCase()],
      searchKeywords: [topicTitle.toLowerCase(), 'básico', 'fundamentos']
    }));

    // 3. Buscar vídeos para os primeiros 3 tópicos
    console.log('🎬 Buscando vídeos educacionais...');
    for (let i = 0; i < Math.min(3, structuredTopics.length); i++) {
      const topic = structuredTopics[i];
      try {
        const videos = await searchAndRankYouTube(
          `${topic.title} básico fundamentos`,
          `Curso introdutório de ${topic.title}`,
          2 // 2 vídeos por tópico para curso de apoio
        );
        (topic as any).videos = videos;
        console.log(`✅ ${videos.length} vídeos encontrados para: ${topic.title}`);
      } catch (error) {
        console.error(`❌ Erro ao buscar vídeos para ${topic.title}:`, error);
      }
    }

    // 4. Criar goal do curso de apoio
    const goal = {
      id: `support-goal-${Date.now()}`,
      title: supportCourse.title,
      description: supportCourse.description,
      level: supportCourse.difficulty,
      modules: [], // Curso de apoio usa estrutura simples
      topics: structuredTopics,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      prerequisites: [] // Cursos de apoio não têm pré-requisitos por definição
    };

    // 5. Criar mensagens do plano
    const userMessage = {
      id: `msg-user-support-${Date.now()}`,
      role: 'user' as const,
      content: `Preciso de um curso de apoio para: ${supportCourse.title}`,
      timestamp: new Date().toISOString(),
    };

    const assistantMessage = {
      id: `msg-assistant-support-${Date.now()}`,
      role: 'assistant' as const,
      content: `🎯 Curso de apoio "${supportCourse.title}" criado! Este curso foi especialmente projetado para fortalecer sua base antes de continuar com o curso principal. Complete todos os tópicos para estar bem preparado.`,
      timestamp: new Date().toISOString(),
    };

    // 6. Salvar o curso de apoio
    console.log('💾 Salvando curso de apoio...');
    const learningPlan = {
      id: `support-plan-${Date.now()}`,
      goal,
      messages: [userMessage, assistantMessage],
      progress: 0,
      created_at: new Date().toISOString(),
      uploadedFiles: [],
      // supportCourseFor: parentCourseId, // Indica que é curso de apoio - campo removido por tipo
      // isSupport: true // campo removido por tipo
    };

    const savedCourse = await saveCourse(learningPlan);

    console.log(`✅ Curso de apoio criado com sucesso: ${savedCourse.id}`);

    return NextResponse.json({
      success: true,
      course: savedCourse,
      message: 'Curso de apoio criado com sucesso',
      metadata: {
        parentCourseId,
        supportCourseId: savedCourse.id,
        topicsCount: structuredTopics.length,
        videosFound: structuredTopics.reduce((total, topic) => total + topic.videos.length, 0)
      }
    });

  } catch (error) {
    console.error('❌ Erro ao criar curso de apoio:', error);

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
 * GET /api/courses/support/create
 *
 * Retorna informações sobre o endpoint
 */
export async function GET(): Promise<NextResponse> {
  const info = {
    endpoint: '/api/courses/support/create',
    description: 'Cria automaticamente cursos de apoio para ajudar com dificuldades detectadas',
    methods: ['POST'],
    features: [
      'Criação automática baseada em dificuldades detectadas',
      'Tópicos estruturados para suprir lacunas de conhecimento',
      'Vídeos educacionais específicos para nivelamento',
      'Integração com curso principal'
    ],
    parameters: {
      supportCourse: {
        id: 'string - ID único',
        title: 'string - Título do curso de apoio',
        description: 'string - Descrição do objetivo',
        prerequisiteFor: 'string - Para que tópico serve de pré-requisito',
        topics: 'string[] - Lista de tópicos a cobrir',
        estimatedDuration: 'string - Duração estimada',
        difficulty: 'beginner|intermediate - Nível de dificuldade'
      },
      parentCourseId: 'string - ID do curso principal',
      userLevel: 'string - Nível do usuário (opcional)'
    },
    example: {
      supportCourse: {
        id: 'support-1',
        title: 'Revisão de Álgebra Básica',
        description: 'Fundamentos de álgebra necessários para Cálculo I',
        prerequisiteFor: 'Límites e Derivadas',
        topics: ['Equações lineares', 'Funções', 'Gráficos'],
        estimatedDuration: '1 semana',
        difficulty: 'beginner'
      },
      parentCourseId: 'course-123',
      userLevel: 'beginner'
    }
  };

  return NextResponse.json(info);
}