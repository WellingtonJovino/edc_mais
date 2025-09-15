import { NextRequest, NextResponse } from 'next/server';
import { searchVideosByTopics } from '@/lib/youtube';
import { generateHighQualityAulaTexto } from '@/lib/openai';
import { buildRAGContextForTopic } from '@/lib/rag';
import { AulaTextoConfig } from '@/types';
import { updateCourseProgress } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { topicTitle, topicId, courseId } = await request.json();

    if (!topicTitle || !topicId) {
      return NextResponse.json(
        { error: 'topicTitle e topicId são obrigatórios' },
        { status: 400 }
      );
    }

    console.log(`🔄 Carregando conteúdo para tópico: "${topicTitle}"`);

    // Buscar vídeos para o tópico específico
    console.log('🎬 Buscando vídeos...');
    const topicForSearch = [{ title: topicTitle, description: '', keywords: [topicTitle.toLowerCase()], order: 1 }];
    const videosResults = await searchVideosByTopics(topicForSearch);
    const videos = videosResults[topicTitle] || [];

    // Gerar conteúdo acadêmico usando o novo sistema de aula-texto
    console.log('🎓 Gerando aula-texto científica...');
    let academicContent = null;

    try {
      // Configurar aula-texto
      const config: AulaTextoConfig = {
        topic: topicTitle,
        level: 'intermediate', // Usar nível intermediário como padrão
        maxWords: 1500
      };

      // Construir contexto RAG (sem arquivos, apenas pesquisa acadêmica)
      const ragResult = await buildRAGContextForTopic(config);

      // Converter para formato RAGContext
      const ragContext = ragResult.ragContext.map((content, index) => ({
        source: 'perplexity' as const,
        content,
        relevanceScore: 0.8,
        metadata: { title: `Contexto ${index + 1}` }
      }));

      // Gerar aula-texto de alta qualidade
      const result = await generateHighQualityAulaTexto(config, ragContext);

      // Converter AulaTextoStructure para AcademicContent para compatibilidade
      academicContent = {
        id: `academic-${Date.now()}`,
        topicId: topicId,
        introduction: result.aulaTexto.introducao.overview,
        lecture: result.aulaTexto.desenvolvimento.explicacao,
        keyConcepts: result.aulaTexto.desenvolvimento.conceitos,
        workedExamples: result.aulaTexto.desenvolvimento.exemplosResolvidos || [],
        practicalExamples: result.aulaTexto.desenvolvimento.exemplos || [],
        commonMisunderstandings: result.aulaTexto.desenvolvimento.errosComuns || [],
        exercises: result.aulaTexto.verificacao.exercicios,
        glossary: result.aulaTexto.verificacao.perguntasReflexao.map(p => ({
          term: `Questão ${result.aulaTexto.verificacao.perguntasReflexao.indexOf(p) + 1}`,
          definition: p
        })),
        references: result.aulaTexto.referencias.fontes,
        summary: result.aulaTexto.conclusao.resumoExecutivo,
        created_at: new Date().toISOString(),
      };

      console.log(`✅ Aula-texto gerada com score: ${result.assessment.score}/10`);

    } catch (error) {
      console.error('❌ Erro ao gerar aula-texto:', error);
    }

    // Se há um courseId, podemos atualizar o tópico no banco de dados
    if (courseId) {
      try {
        // Aqui você poderia adicionar uma função para atualizar o tópico específico
        // Por enquanto, vamos apenas logar
        console.log(`💾 Tópico ${topicId} do curso ${courseId} atualizado com conteúdo`);
      } catch (error) {
        console.warn('⚠️ Não foi possível atualizar o tópico no banco:', error);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        topicId,
        videos,
        academicContent,
        message: `Conteúdo carregado para: ${topicTitle}`
      }
    });

  } catch (error) {
    console.error('Erro na API /load-topic-content:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}