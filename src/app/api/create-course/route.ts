import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { syllabus, uploadedFiles } = await request.json();

    if (!syllabus) {
      return NextResponse.json(
        { success: false, error: 'Syllabus é obrigatório' },
        { status: 400 }
      );
    }

    console.log('🏗️ Criando curso final:', {
      title: syllabus.title,
      modulesCount: syllabus.modules?.length || 0,
      filesCount: uploadedFiles?.length || 0
    });

    // Simular tempo de processamento (2-5 segundos)
    const processingTime = 2000 + Math.random() * 3000;
    await new Promise(resolve => setTimeout(resolve, processingTime));

    // 1. Gerar ID único simples para o curso
    const courseId = `course_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log('✅ Curso criado com ID:', courseId);

    // 2. Calcular estatísticas do curso
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
      message: `Curso "${syllabus.title}" criado com ${totalTopics} tópicos`
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