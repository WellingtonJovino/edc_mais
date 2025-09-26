import { NextRequest, NextResponse } from 'next/server';

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
    if (sessionId && syllabus.modules && syllabus.modules.length > 0) {
      console.log('🎓 Iniciando geração de aulas do primeiro módulo...');

      // Fazer chamada assíncrona para gerar aulas (não await aqui para não bloquear)
      lessonGenerationPromise = fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3002'}/api/generate-first-module-lessons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          syllabus,
          sessionId
        })
      }).catch(error => {
        console.error('Erro ao iniciar geração de aulas:', error);
        return null;
      });
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
      sessionId: sessionId,
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