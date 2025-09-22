import { NextRequest, NextResponse } from 'next/server';
import { ProcessedFile, FileProcessingConfig, FileProcessingStatus } from '@/types';
import { extractTextFromFile, chunkText } from '@/lib/text-extraction';
import { generateEmbeddings } from '@/lib/rag-processing';
import { extractTopicsFromDocument } from '@/lib/document-analysis';
import fs from 'fs';
import path from 'path';

// Force Node.js runtime
export const runtime = 'nodejs';

// Configuração padrão para o MVP
const DEFAULT_CONFIG: FileProcessingConfig = {
  chunkSize: 1000,
  chunkOverlap: 200,
  embeddingModel: 'text-embedding-3-small', // Mais barato para MVP
  batchSize: 10,
  strongMatchThreshold: 0.75,
  weakMatchThreshold: 0.60,
  enableOCR: false, // Desabilitado no MVP
  maxFileSize: 10 * 1024 * 1024, // 10MB
  supportedFormats: [
    'application/pdf',
    'text/plain',
    'text/markdown',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
};

// Armazenamento temporário para status de processamento
const processingStatuses = new Map<string, FileProcessingStatus>();

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ error: 'SessionId obrigatório' }, { status: 400 });
  }

  const status = processingStatuses.get(sessionId);

  if (!status) {
    return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 });
  }

  return NextResponse.json(status);
}

export async function POST(request: NextRequest) {
  const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    console.log('🚀 Enhanced Upload API called');

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const configJson = formData.get('config') as string | null;

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum arquivo foi enviado' },
        { status: 400 }
      );
    }

    // Parse configuração ou usar padrão
    const config: FileProcessingConfig = configJson
      ? { ...DEFAULT_CONFIG, ...JSON.parse(configJson) }
      : DEFAULT_CONFIG;

    console.log(`📤 Processing ${files.length} file(s) with enhanced pipeline`);

    // Inicializar status de processamento
    const status: FileProcessingStatus = {
      sessionId,
      currentStep: 'uploading',
      progress: 0,
      message: 'Iniciando processamento...',
      processedFiles: [],
      matches: [],
      errors: []
    };

    processingStatuses.set(sessionId, status);

    // Validar arquivos
    await updateStatus(sessionId, 'uploading', 10, 'Validando arquivos...');

    const validFiles: File[] = [];
    const errors: string[] = [];

    for (const file of files) {
      console.log(`📋 Validating file: ${file.name} (${file.type}, ${Math.round(file.size / 1024)}KB)`);

      if (file.size > config.maxFileSize) {
        errors.push(`Arquivo "${file.name}" muito grande`);
        continue;
      }

      const isSupported = config.supportedFormats.some(format =>
        file.type === format ||
        file.name.toLowerCase().endsWith(format.split('/').pop() || '')
      );

      if (!isSupported) {
        errors.push(`Arquivo "${file.name}" tem formato não suportado`);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) {
      await updateStatus(sessionId, 'uploading', 0, 'Erro: Nenhum arquivo válido', errors);
      return NextResponse.json(
        {
          error: 'Nenhum arquivo válido encontrado',
          details: errors,
          sessionId
        },
        { status: 400 }
      );
    }

    console.log(`✅ ${validFiles.length} arquivo(s) válido(s)`);

    // Processar cada arquivo
    const processedFiles: ProcessedFile[] = [];

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      const fileProgress = Math.round((i / validFiles.length) * 80) + 20; // 20-100%

      try {
        await updateStatus(sessionId, 'extracting', fileProgress, `Extraindo texto de ${file.name}...`);

        // Extrair texto
        console.log(`📄 Extraindo texto de: ${file.name}`);
        const extractedText = await extractTextFromFile(file);

        // Chunking
        await updateStatus(sessionId, 'chunking', fileProgress + 5, `Dividindo texto em chunks...`);
        console.log(`✂️ Fazendo chunking do texto`);
        const chunks = await chunkText(extractedText, config.chunkSize, config.chunkOverlap);

        // Embeddings
        await updateStatus(sessionId, 'embedding', fileProgress + 10, `Gerando embeddings...`);
        console.log(`🧠 Gerando embeddings para ${chunks.length} chunks`);
        const embeddings = await generateEmbeddings(chunks, config.embeddingModel);

        // Análise de tópicos
        await updateStatus(sessionId, 'analyzing', fileProgress + 15, `Analisando tópicos...`);
        console.log(`🔍 Extraindo tópicos do documento`);
        const { toc, topics } = await extractTopicsFromDocument(extractedText, file.name);

        const processedFile: ProcessedFile = {
          id: `file-${Date.now()}-${i}`,
          name: file.name,
          type: file.type,
          size: file.size,
          uploadedAt: new Date().toISOString(),
          rawText: extractedText,
          extractedMetadata: {
            pages: estimatePages(extractedText),
            headings: extractHeadings(extractedText),
            title: file.name.replace(/\.[^/.]+$/, ""),
            language: 'pt'
          },
          chunks: chunks.map((chunk: any, idx: number) => ({
            id: `chunk-${i}-${idx}`,
            fileId: `file-${Date.now()}-${i}`,
            text: chunk.text,
            order: idx,
            startChar: chunk.startChar,
            endChar: chunk.endChar,
            tokens: chunk.tokens,
            embedding: embeddings[idx]?.embedding,
            embeddingModel: config.embeddingModel
          })),
          extractedTOC: toc,
          extractedTopics: topics,
          processingStatus: 'complete'
        };

        processedFiles.push(processedFile);
        console.log(`✅ Arquivo processado: ${file.name}`);

        // Salvar debug
        await saveProcessedFileDebug(processedFile);

      } catch (error) {
        console.error(`❌ Erro ao processar ${file.name}:`, error);
        status.errors.push({
          fileId: `file-${Date.now()}-${i}`,
          step: status.currentStep,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    }

    // Finalizar processamento
    await updateStatus(sessionId, 'complete', 100, `Processamento concluído! ${processedFiles.length} arquivo(s)`);

    console.log(`🎉 Enhanced upload concluído! ${processedFiles.length} arquivo(s) processado(s)`);

    return NextResponse.json({
      success: true,
      sessionId,
      processedFiles,
      config,
      message: `${processedFiles.length} arquivo(s) processado(s) com pipeline RAG`,
      stats: {
        totalFiles: processedFiles.length,
        totalChunks: processedFiles.reduce((sum, file) => sum + file.chunks.length, 0),
        totalTokens: processedFiles.reduce((sum, file) =>
          sum + file.chunks.reduce((chunkSum, chunk) => chunkSum + chunk.tokens, 0), 0)
      }
    });

  } catch (error) {
    console.error('❌ Error in enhanced upload:', error);

    await updateStatus(sessionId, 'uploading', 0, 'Erro interno no processamento');

    return NextResponse.json(
      {
        error: 'Erro no processamento enhanced',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
        sessionId
      },
      { status: 500 }
    );
  }
}

// Utilitários
async function updateStatus(
  sessionId: string,
  step: FileProcessingStatus['currentStep'],
  progress: number,
  message: string,
  errors: string[] = []
) {
  const status = processingStatuses.get(sessionId);
  if (status) {
    status.currentStep = step;
    status.progress = progress;
    status.message = message;
    if (errors.length > 0) {
      status.errors.push(...errors.map(error => ({
        fileId: 'unknown',
        step,
        error
      })));
    }
    processingStatuses.set(sessionId, status);
  }
}

function estimatePages(text: string): number {
  // Estimar páginas baseado em caracteres (aproximadamente 2000 caracteres por página)
  return Math.ceil(text.length / 2000);
}

function extractHeadings(text: string): string[] {
  // Extrair headings simples (linhas que começam com maiúscula e têm menos de 100 chars)
  const lines = text.split('\n');
  const headings: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 0 &&
        trimmed.length < 100 &&
        /^[A-Z]/.test(trimmed) &&
        !trimmed.includes('.') &&
        !/^\d/.test(trimmed)) {
      headings.push(trimmed);
    }
  }

  return headings.slice(0, 20); // Máximo 20 headings
}

async function saveProcessedFileDebug(file: ProcessedFile) {
  try {
    const debugDir = path.join(process.cwd(), 'debug', 'enhanced');
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const debugFilename = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}_processed.json`;
    const debugPath = path.join(debugDir, debugFilename);

    const debugContent = {
      metadata: {
        fileName: file.name,
        processedAt: new Date().toISOString(),
        status: file.processingStatus
      },
      extractedMetadata: file.extractedMetadata,
      chunksCount: file.chunks.length,
      topicsCount: file.extractedTopics.length,
      tocEntries: file.extractedTOC.length,
      firstChunk: file.chunks[0]?.text.substring(0, 500),
      topics: file.extractedTopics.map(topic => ({
        title: topic.title,
        description: topic.description,
        chunksCount: topic.relatedChunks.length
      }))
    };

    fs.writeFileSync(debugPath, JSON.stringify(debugContent, null, 2), 'utf8');
    console.log(`📝 Debug processado salvo em ${debugPath}`);
  } catch (error) {
    console.error('Erro ao salvar debug processado:', error);
  }
}