import { NextRequest, NextResponse } from 'next/server';
import { analyzeUploadedFiles } from '@/lib/perplexity';
import { UploadedFile, FileAnalysisResult } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { files, plannedTopics, subject } = await request.json();

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: 'Arquivos são obrigatórios' },
        { status: 400 }
      );
    }

    if (!plannedTopics || !Array.isArray(plannedTopics) || plannedTopics.length === 0) {
      return NextResponse.json(
        { error: 'Tópicos planejados são obrigatórios' },
        { status: 400 }
      );
    }

    if (!subject || typeof subject !== 'string') {
      return NextResponse.json(
        { error: 'Assunto é obrigatório' },
        { status: 400 }
      );
    }

    console.log('📊 Iniciando análise de', files.length, 'arquivo(s) com', plannedTopics.length, 'tópicos planejados');
    console.log('📚 Assunto:', subject);
    console.log('📁 Arquivos:', files.map((f: UploadedFile) => f.name));

    const fileAnalysis = await analyzeUploadedFiles(
      files.map((f: UploadedFile) => ({ name: f.name, content: f.content })),
      plannedTopics,
      subject
    );

    console.log('✅ Análise de arquivos concluída');
    console.log('📋 Tópicos extraídos:', fileAnalysis.extractedTopics.length);
    console.log('⚠️ Faltando nos arquivos:', fileAnalysis.missingFromFiles.length);
    console.log('➕ Extras nos arquivos:', fileAnalysis.extraInFiles.length);

    return NextResponse.json({
      success: true,
      analysis: fileAnalysis
    });

  } catch (error) {
    console.error('Erro na API /analyze-with-files:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}