/**
 * Sistema de Chunking de Documentos para RAG
 * Processa documentos grandes em pedaços menores para melhor recuperação
 */

export interface DocumentChunk {
  id: string;
  content: string;
  tokenCount: number;
  metadata: {
    source: string;
    chunkIndex: number;
    totalChunks: number;
    startPosition: number;
    endPosition: number;
    filename?: string;
    page?: number;
    section?: string;
    subsection?: string;
  };
  embedding?: number[];
  relevanceScore?: number;
}

export interface ChunkingConfig {
  maxTokens: number;          // 200-800 tokens por chunk
  overlapTokens: number;      // Sobreposição entre chunks (10-20% do maxTokens)
  preserveSentences: boolean; // Manter frases completas
  preserveParagraphs: boolean; // Manter parágrafos completos quando possível
  minChunkTokens: number;     // Tamanho mínimo de chunk
}

const DEFAULT_CONFIG: ChunkingConfig = {
  maxTokens: 500,
  overlapTokens: 50,
  preserveSentences: true,
  preserveParagraphs: true,
  minChunkTokens: 100
};

/**
 * Estima número de tokens em um texto (aproximação)
 */
function estimateTokenCount(text: string): number {
  // Aproximação: 4 caracteres por token em português
  // Ajustado para ser mais conservador
  return Math.ceil(text.length / 3.5);
}

/**
 * Divide texto em sentenças preservando pontuação
 */
function splitIntoSentences(text: string): string[] {
  // Regex para dividir em sentenças, considerando abreviações comuns
  const sentenceRegex = /(?<![A-Z][a-z])(?<![A-Z])(?<!Dr|Sr|Sra|Prof|Fig|Eq|etc|vs|p\.ex)\.(?=\s+[A-Z])|[!?]+(?=\s+[A-Z])/g;

  const sentences = text.split(sentenceRegex)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  return sentences;
}

/**
 * Divide texto em parágrafos
 */
function splitIntoParagraphs(text: string): string[] {
  return text.split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
}

/**
 * Detecta estruturas hierárquicas (títulos, seções)
 */
function detectStructure(text: string): Array<{type: 'title' | 'section' | 'subsection' | 'paragraph', content: string, level: number}> {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const structure: Array<{type: 'title' | 'section' | 'subsection' | 'paragraph', content: string, level: number}> = [];

  for (const line of lines) {
    // Detecta cabeçalhos markdown
    if (line.match(/^#{1,6}\s+/)) {
      const level = line.match(/^(#{1,6})/)?.[1].length || 1;
      const content = line.replace(/^#{1,6}\s+/, '');
      const type = level <= 2 ? 'section' : 'subsection';
      structure.push({ type, content, level });
    }
    // Detecta títulos em maiúsculo
    else if (line.length < 100 && line === line.toUpperCase() && line.match(/[A-Z\s]+/)) {
      structure.push({ type: 'title', content: line, level: 1 });
    }
    // Detecta seções numeradas
    else if (line.match(/^\d+\.?\s+[A-Z]/)) {
      structure.push({ type: 'section', content: line, level: 2 });
    }
    // Detecta subseções numeradas
    else if (line.match(/^\d+\.\d+\.?\s+/)) {
      structure.push({ type: 'subsection', content: line, level: 3 });
    }
    // Resto é parágrafo
    else {
      structure.push({ type: 'paragraph', content: line, level: 0 });
    }
  }

  return structure;
}

/**
 * Cria chunk com metadados apropriados
 */
function createChunk(
  content: string,
  chunkIndex: number,
  totalChunks: number,
  startPos: number,
  source: string,
  filename?: string,
  section?: string
): DocumentChunk {
  return {
    id: `chunk_${source}_${chunkIndex}_${Date.now()}`,
    content: content.trim(),
    tokenCount: estimateTokenCount(content),
    metadata: {
      source,
      chunkIndex,
      totalChunks,
      startPosition: startPos,
      endPosition: startPos + content.length,
      filename,
      section
    }
  };
}

/**
 * Chunking principal - divide documento em pedaços otimizados
 */
export function chunkDocument(
  text: string,
  source: string,
  config: Partial<ChunkingConfig> = {},
  filename?: string
): DocumentChunk[] {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const chunks: DocumentChunk[] = [];

  console.log(`📄 Processando documento: ${filename || source}`);
  console.log(`📏 Tamanho original: ${text.length} caracteres, ~${estimateTokenCount(text)} tokens`);

  // Se o documento é pequeno, retorna como um chunk único
  if (estimateTokenCount(text) <= fullConfig.maxTokens) {
    console.log('📝 Documento pequeno, retornando como chunk único');
    return [createChunk(text, 0, 1, 0, source, filename)];
  }

  let processedText = text;
  let currentPosition = 0;
  let chunkIndex = 0;

  // Detecta estrutura se preservar parágrafos está habilitado
  if (fullConfig.preserveParagraphs) {
    const paragraphs = splitIntoParagraphs(processedText);
    console.log(`📊 Detectados ${paragraphs.length} parágrafos`);

    let currentChunk = '';
    let currentSection = '';

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];
      const paragraphTokens = estimateTokenCount(paragraph);

      // Detecta se é uma seção/título
      if (paragraph.length < 100 && (paragraph === paragraph.toUpperCase() || paragraph.match(/^\d+\.?\s+[A-Z]/))) {
        currentSection = paragraph;

        // Se temos chunk acumulado, salva antes de iniciar nova seção
        if (currentChunk.trim()) {
          const finalChunk = createChunk(currentChunk, chunkIndex, 0, currentPosition, source, filename, currentSection);
          chunks.push(finalChunk);
          currentPosition += currentChunk.length;
          chunkIndex++;
          currentChunk = '';
        }
      }

      // Se adicionar este parágrafo ultrapassaria o limite
      if (estimateTokenCount(currentChunk + '\n\n' + paragraph) > fullConfig.maxTokens) {
        // Salva chunk atual se não está vazio
        if (currentChunk.trim()) {
          const finalChunk = createChunk(currentChunk, chunkIndex, 0, currentPosition, source, filename, currentSection);
          chunks.push(finalChunk);
          currentPosition += currentChunk.length;
          chunkIndex++;
        }

        // Se o parágrafo sozinho é muito grande, divide em sentenças
        if (paragraphTokens > fullConfig.maxTokens) {
          const sentences = splitIntoSentences(paragraph);
          let sentenceChunk = '';

          for (const sentence of sentences) {
            if (estimateTokenCount(sentenceChunk + ' ' + sentence) > fullConfig.maxTokens) {
              if (sentenceChunk.trim()) {
                const finalChunk = createChunk(sentenceChunk, chunkIndex, 0, currentPosition, source, filename, currentSection);
                chunks.push(finalChunk);
                currentPosition += sentenceChunk.length;
                chunkIndex++;
              }
              sentenceChunk = sentence;
            } else {
              sentenceChunk += (sentenceChunk ? ' ' : '') + sentence;
            }
          }

          currentChunk = sentenceChunk;
        } else {
          currentChunk = paragraph;
        }
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }

    // Adiciona último chunk se não está vazio
    if (currentChunk.trim()) {
      const finalChunk = createChunk(currentChunk, chunkIndex, 0, currentPosition, source, filename, currentSection);
      chunks.push(finalChunk);
      chunkIndex++;
    }
  } else {
    // Chunking simples por caracteres com sobreposição
    const textLength = processedText.length;
    const maxChars = Math.floor(fullConfig.maxTokens * 3.5); // Aproximação de tokens para chars
    const overlapChars = Math.floor(fullConfig.overlapTokens * 3.5);

    while (currentPosition < textLength) {
      const endPosition = Math.min(currentPosition + maxChars, textLength);
      let chunkText = processedText.substring(currentPosition, endPosition);

      // Tenta quebrar em limite de palavra se preservar sentenças
      if (fullConfig.preserveSentences && endPosition < textLength) {
        const lastPeriod = chunkText.lastIndexOf('.');
        const lastSpace = chunkText.lastIndexOf(' ');

        if (lastPeriod > chunkText.length * 0.7) {
          chunkText = chunkText.substring(0, lastPeriod + 1);
        } else if (lastSpace > chunkText.length * 0.8) {
          chunkText = chunkText.substring(0, lastSpace);
        }
      }

      if (chunkText.trim() && estimateTokenCount(chunkText) >= fullConfig.minChunkTokens) {
        const finalChunk = createChunk(chunkText, chunkIndex, 0, currentPosition, source, filename);
        chunks.push(finalChunk);
        chunkIndex++;
      }

      currentPosition += chunkText.length - overlapChars;

      // Evita loop infinito
      if (chunkText.length === 0) {
        currentPosition = endPosition;
      }
    }
  }

  // Atualiza totalChunks em todos os chunks
  chunks.forEach(chunk => {
    chunk.metadata.totalChunks = chunks.length;
  });

  console.log(`✅ Documento dividido em ${chunks.length} chunks`);
  console.log(`📊 Tamanhos dos chunks: ${chunks.map(c => c.tokenCount).join(', ')} tokens`);

  return chunks;
}

/**
 * Processa múltiplos documentos
 */
export function chunkMultipleDocuments(
  documents: Array<{content: string, filename: string, source: string}>,
  config: Partial<ChunkingConfig> = {}
): DocumentChunk[] {
  console.log(`📚 Processando ${documents.length} documentos`);

  const allChunks: DocumentChunk[] = [];

  for (const doc of documents) {
    const chunks = chunkDocument(doc.content, doc.source, config, doc.filename);
    allChunks.push(...chunks);
  }

  console.log(`✅ Total de chunks gerados: ${allChunks.length}`);

  return allChunks;
}

/**
 * Filtra chunks por relevância mínima
 */
export function filterChunksByRelevance(
  chunks: DocumentChunk[],
  minRelevance: number = 0.3
): DocumentChunk[] {
  return chunks
    .filter(chunk => (chunk.relevanceScore || 0) >= minRelevance)
    .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
}

/**
 * Combina chunks relacionados se forem muito pequenos
 */
export function mergeSmallChunks(
  chunks: DocumentChunk[],
  minTokens: number = 100,
  maxTokens: number = 500
): DocumentChunk[] {
  const mergedChunks: DocumentChunk[] = [];
  let currentGroup: DocumentChunk[] = [];
  let currentTokens = 0;

  for (const chunk of chunks) {
    // Se adicionar este chunk ultrapassaria o limite, processa grupo atual
    if (currentTokens + chunk.tokenCount > maxTokens && currentGroup.length > 0) {
      // Combina chunks do grupo atual
      if (currentGroup.length === 1) {
        mergedChunks.push(currentGroup[0]);
      } else {
        const combinedContent = currentGroup.map(c => c.content).join('\n\n');
        const combinedChunk = createChunk(
          combinedContent,
          mergedChunks.length,
          0,
          currentGroup[0].metadata.startPosition,
          currentGroup[0].metadata.source,
          currentGroup[0].metadata.filename,
          currentGroup[0].metadata.section
        );
        mergedChunks.push(combinedChunk);
      }

      currentGroup = [];
      currentTokens = 0;
    }

    currentGroup.push(chunk);
    currentTokens += chunk.tokenCount;
  }

  // Processa último grupo
  if (currentGroup.length > 0) {
    if (currentGroup.length === 1) {
      mergedChunks.push(currentGroup[0]);
    } else {
      const combinedContent = currentGroup.map(c => c.content).join('\n\n');
      const combinedChunk = createChunk(
        combinedContent,
        mergedChunks.length,
        0,
        currentGroup[0].metadata.startPosition,
        currentGroup[0].metadata.source,
        currentGroup[0].metadata.filename,
        currentGroup[0].metadata.section
      );
      mergedChunks.push(combinedChunk);
    }
  }

  return mergedChunks;
}

/**
 * Extrai resumo de cada chunk para contexto
 */
export function extractChunkSummaries(chunks: DocumentChunk[]): Array<DocumentChunk & {summary: string}> {
  return chunks.map(chunk => {
    // Pega primeiras 2 sentenças como resumo
    const sentences = splitIntoSentences(chunk.content);
    const summary = sentences.slice(0, 2).join(' ').substring(0, 150);

    return {
      ...chunk,
      summary: summary + (summary.length < chunk.content.length ? '...' : '')
    };
  });
}