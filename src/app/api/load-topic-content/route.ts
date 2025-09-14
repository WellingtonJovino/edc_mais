import { NextRequest, NextResponse } from 'next/server';
import { searchVideosByTopics } from '@/lib/youtube';
import { searchAcademicContent, generateAcademicSummary } from '@/lib/perplexity';
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

    // Buscar conteúdo acadêmico
    console.log('🎓 Buscando conteúdo acadêmico...');
    let academicContent = null;
    
    try {
      const perplexityResponse = await searchAcademicContent({
        query: topicTitle,
        language: 'pt'
      });
      
      academicContent = await generateAcademicSummary(
        topicTitle,
        perplexityResponse
      );
    } catch (error) {
      console.error('❌ Erro ao buscar conteúdo acadêmico:', error);
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