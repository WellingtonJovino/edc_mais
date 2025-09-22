import { NextRequest, NextResponse } from 'next/server';
import { ProcessedFile, EnhancedCourseStructure } from '@/types';
import { runEnhancedCourseGenerationPipeline } from '@/lib/enhanced-pipeline';

// Force Node.js runtime
export const runtime = 'nodejs';

// Storage compartilhado com SSE
declare global {
  var enhancedProgressStates: Map<string, any>;
}

if (!global.enhancedProgressStates) {
  global.enhancedProgressStates = new Map();
}

const progressStates = global.enhancedProgressStates;

// Update progress helper
async function updateProgress(
  sessionId: string,
  progress: number,
  step: number,
  message: string,
  isComplete: boolean = false
) {
  const progressData = {
    sessionId,
    progress: Math.round(progress),
    currentStep: step,
    message,
    isComplete,
    timestamp: Date.now()
  };

  progressStates.set(sessionId, progressData);
  console.log(`📊 [${sessionId}] Step ${step} (${progress}%): ${message}`);
}

export async function POST(request: NextRequest) {
  const sessionId = `enhanced-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    console.log('🚀 Enhanced Analysis API called');

    const body = await request.json();
    const { message, userProfile, processedFiles = [] } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Mensagem é obrigatória' },
        { status: 400 }
      );
    }

    if (!userProfile) {
      return NextResponse.json(
        { error: 'Perfil do usuário é obrigatório' },
        { status: 400 }
      );
    }

    console.log(`📋 Iniciando análise enhanced:`);
    console.log(`💬 Mensagem: "${message.substring(0, 100)}..."`);
    console.log(`👤 Perfil: ${userProfile.level} - ${userProfile.purpose}`);
    console.log(`📄 Documentos: ${processedFiles.length} arquivo(s) processado(s)`);

    // Inicializar progresso
    await updateProgress(sessionId, 0, 1, 'Iniciando análise enhanced...');

    // Validar arquivos processados
    const validatedFiles: ProcessedFile[] = [];
    for (const file of processedFiles) {
      if (file.id && file.name && file.processingStatus === 'complete') {
        validatedFiles.push(file);
        console.log(`✅ Arquivo validado: ${file.name} (${file.chunks.length} chunks, ${file.extractedTopics.length} tópicos)`);
      } else {
        console.log(`⚠️ Arquivo inválido ignorado: ${file.name || 'unknown'} (status: ${file.processingStatus || 'unknown'})`);
      }
    }

    await updateProgress(sessionId, 5, 1, `${validatedFiles.length} documentos validados...`);

    // Executar pipeline enhanced
    const enhancedStructure = await runEnhancedCourseGenerationPipeline(
      message,
      userProfile,
      validatedFiles,
      async (progress: number, step: number, message: string) => {
        await updateProgress(sessionId, progress, step, message);
      }
    );

    // Finalizar
    await updateProgress(sessionId, 100, 4, 'Análise enhanced concluída!', true);

    // Preparar estatísticas para resposta
    const stats = {
      totalModules: enhancedStructure.course.modules.length,
      totalTopics: enhancedStructure.course.modules.reduce((sum, module) => sum + module.topics.length, 0),
      documentMatchedTopics: Object.keys(enhancedStructure.documentMatches).length,
      documentDerivedTopics: enhancedStructure.documentDerivedTopics.length,
      unmatchedTopics: enhancedStructure.unmatchedTopics.length,
      strongMatches: Object.values(enhancedStructure.documentMatches).filter(match => match.matchType === 'strong').length,
      weakMatches: Object.values(enhancedStructure.documentMatches).filter(match => match.matchType === 'weak').length,
      documentsUsed: validatedFiles.length,
      totalChunks: validatedFiles.reduce((sum, file) => sum + file.chunks.length, 0)
    };

    console.log(`🎉 Análise enhanced concluída:`);
    console.log(`📚 ${stats.totalModules} módulos, ${stats.totalTopics} tópicos`);
    console.log(`🔗 ${stats.documentMatchedTopics} tópicos com match (${stats.strongMatches} strong, ${stats.weakMatches} weak)`);
    console.log(`➕ ${stats.documentDerivedTopics} novos tópicos dos documentos`);
    console.log(`❓ ${stats.unmatchedTopics} tópicos sem documentos`);

    return NextResponse.json({
      success: true,
      sessionId,
      structure: enhancedStructure,
      stats,
      message: `Curso enhanced criado com ${stats.totalTopics} tópicos usando ${stats.documentsUsed} documento(s)`
    });

  } catch (error) {
    console.error('❌ Error in enhanced analysis:', error);

    await updateProgress(sessionId, 0, 1, 'Erro no processamento enhanced');

    return NextResponse.json(
      {
        error: 'Erro na análise enhanced',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
        sessionId
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ error: 'SessionId obrigatório' }, { status: 400 });
  }

  const progress = progressStates.get(sessionId);

  if (!progress) {
    return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 });
  }

  return NextResponse.json(progress);
}