import { NextRequest, NextResponse } from 'next/server';
import { generateCourseSyllabus } from '@/lib/openai';
import {
  detectAcademicPrerequisites,
  generatePrerequisiteReport,
  extractCourseNameFromTitle
} from '@/lib/prerequisite-detector';

export async function POST(request: NextRequest) {
  try {
    const { message, uploadedFiles, userProfile } = await request.json();

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Mensagem é obrigatória' },
        { status: 400 }
      );
    }

    console.log('🔍 Gerando syllabus para:', {
      message: message.substring(0, 100),
      userProfile: userProfile?.level,
      filesCount: uploadedFiles?.length || 0
    });

    // Gerar syllabus usando OpenAI
    const syllabusResult = await generateCourseSyllabus(message, userProfile, uploadedFiles);

    if (!syllabusResult) {
      throw new Error('Falha ao gerar syllabus');
    }

    console.log('✅ Syllabus gerado com sucesso:', {
      title: syllabusResult.title,
      modulesCount: syllabusResult.modules?.length || 0
    });

    // Detectar pré-requisitos acadêmicos após gerar o syllabus
    console.log('🔍 Detectando pré-requisitos acadêmicos...');
    let prerequisiteInfo = null;
    let prerequisiteReport = null;

    try {
      // 1. Extrair nome real da matéria do título do syllabus
      const courseNameExtraction = extractCourseNameFromTitle(syllabusResult.title);
      console.log('📝 Extração de nome:', courseNameExtraction);

      // 2. Detectar pré-requisitos usando o nome limpo
      const courseLevel = userProfile?.level || 'beginner';
      prerequisiteInfo = await detectAcademicPrerequisites(courseNameExtraction.courseName, courseLevel);

      if (prerequisiteInfo.hasPrerequisites) {
        prerequisiteReport = generatePrerequisiteReport(prerequisiteInfo);
        console.log('⚠️ Pré-requisitos encontrados:', prerequisiteInfo.prerequisites.map(p => p.name));
      } else {
        console.log('✅ Nenhum pré-requisito específico encontrado');
      }

      // Mesclar informações de extração (se não foram definidas internamente)
      if (!prerequisiteInfo.extractionInfo) {
        prerequisiteInfo.extractionInfo = courseNameExtraction;
      }
    } catch (error) {
      console.warn('⚠️ Erro ao detectar pré-requisitos:', error);
    }

    return NextResponse.json({
      success: true,
      syllabus: syllabusResult,
      prerequisites: prerequisiteInfo,
      prerequisiteReport: prerequisiteReport
    });

  } catch (error) {
    console.error('❌ Erro ao gerar syllabus:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno do servidor'
      },
      { status: 500 }
    );
  }
}