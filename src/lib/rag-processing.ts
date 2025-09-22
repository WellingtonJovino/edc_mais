import { EmbeddingResult, TopicMatch, DocumentTopic } from '@/types';
import OpenAI from 'openai';

// Inicializar OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Gera embeddings para uma lista de chunks de texto
 */
export async function generateEmbeddings(
  chunks: Array<{ text: string; startChar: number; endChar: number; tokens: number }>,
  model: 'text-embedding-3-large' | 'text-embedding-3-small' = 'text-embedding-3-small'
): Promise<EmbeddingResult[]> {

  const embeddings: EmbeddingResult[] = [];

  console.log(`🧠 Gerando embeddings para ${chunks.length} chunks usando ${model}`);

  try {
    // Processar em batches para evitar rate limits
    const batchSize = 10;
    const batches = [];

    for (let i = 0; i < chunks.length; i += batchSize) {
      batches.push(chunks.slice(i, i + batchSize));
    }

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`📦 Processando batch ${batchIndex + 1}/${batches.length} (${batch.length} chunks)`);

      const textsToEmbed = batch.map(chunk => chunk.text);

      const response = await openai.embeddings.create({
        model,
        input: textsToEmbed,
        encoding_format: "float",
      });

      // Processar resultados do batch
      for (let i = 0; i < batch.length; i++) {
        const chunkIndex = batchIndex * batchSize + i;
        const embeddingData = response.data[i];

        embeddings.push({
          chunkId: `chunk-${chunkIndex}`,
          embedding: embeddingData.embedding,
          model,
          tokensUsed: response.usage?.total_tokens || 0,
          createdAt: new Date().toISOString()
        });
      }

      // Delay entre batches para respeitar rate limits
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`✅ ${embeddings.length} embeddings gerados com sucesso`);
    return embeddings;

  } catch (error) {
    console.error('❌ Erro ao gerar embeddings:', error);
    throw new Error(`Falha na geração de embeddings: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

/**
 * Calcula similaridade coseno entre dois vetores
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vetores devem ter o mesmo tamanho');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

/**
 * Encontra os chunks mais similares para um tópico
 */
export function findSimilarChunks(
  topicEmbedding: number[],
  documentChunks: Array<{
    id: string;
    text: string;
    embedding?: number[];
  }>,
  topN: number = 5
): Array<{
  chunkId: string;
  text: string;
  similarity: number;
}> {

  const similarities: Array<{
    chunkId: string;
    text: string;
    similarity: number;
  }> = [];

  for (const chunk of documentChunks) {
    if (!chunk.embedding) continue;

    const similarity = cosineSimilarity(topicEmbedding, chunk.embedding);
    similarities.push({
      chunkId: chunk.id,
      text: chunk.text,
      similarity
    });
  }

  // Ordenar por similaridade e retornar top N
  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topN);
}

/**
 * Realiza matching entre tópicos do curso e documentos
 */
export async function performTopicMatching(
  courseTopics: Array<{
    id: string;
    title: string;
    description: string;
    learningObjectives?: string[];
  }>,
  documentTopics: DocumentTopic[],
  strongThreshold: number = 0.75,
  weakThreshold: number = 0.60
): Promise<TopicMatch[]> {

  console.log(`🔄 Fazendo matching entre ${courseTopics.length} tópicos do curso e ${documentTopics.length} tópicos de documentos`);

  const matches: TopicMatch[] = [];

  // Gerar embeddings para tópicos do curso
  const courseTopicTexts = courseTopics.map(topic =>
    `${topic.title}\n${topic.description}\n${topic.learningObjectives?.join(', ') || ''}`
  );

  const courseEmbeddings = await generateEmbeddings(
    courseTopicTexts.map((text, idx) => ({
      text,
      startChar: 0,
      endChar: text.length,
      tokens: Math.ceil(text.length / 4)
    }))
  );

  // Gerar embeddings para tópicos dos documentos
  const documentTopicTexts = documentTopics.map(topic =>
    `${topic.title}\n${topic.description}`
  );

  const documentEmbeddings = await generateEmbeddings(
    documentTopicTexts.map((text, idx) => ({
      text,
      startChar: 0,
      endChar: text.length,
      tokens: Math.ceil(text.length / 4)
    }))
  );

  // Realizar matching
  for (let i = 0; i < courseTopics.length; i++) {
    const courseTopic = courseTopics[i];
    const courseEmbedding = courseEmbeddings[i].embedding;

    let bestMatch: TopicMatch = {
      courseTopicId: courseTopic.id,
      matchType: 'none',
      similarityScore: 0
    };

    // Comparar com todos os tópicos dos documentos
    for (let j = 0; j < documentTopics.length; j++) {
      const documentTopic = documentTopics[j];
      const documentEmbedding = documentEmbeddings[j].embedding;

      const similarity = cosineSimilarity(courseEmbedding, documentEmbedding);

      if (similarity > bestMatch.similarityScore) {
        bestMatch = {
          courseTopicId: courseTopic.id,
          documentTopicId: documentTopic.id,
          matchType: similarity >= strongThreshold ? 'strong' :
                     similarity >= weakThreshold ? 'weak' : 'none',
          similarityScore: similarity
        };

        // Para strong match, incluir chunks relacionados
        if (similarity >= strongThreshold) {
          bestMatch.linkedChunks = documentTopic.relatedChunks.map(chunk => ({
            chunkId: chunk.chunkId,
            score: chunk.relevanceScore,
            excerpt: chunk.excerpt
          }));
        }

        // Para weak match, sugerir gaps
        if (similarity >= weakThreshold && similarity < strongThreshold) {
          bestMatch.gaps = await identifyContentGaps(courseTopic, documentTopic);
          bestMatch.suggestions = [
            `Expandir "${documentTopic.title}" para cobrir aspectos de "${courseTopic.title}"`,
            `Criar sub-tópico específico para lacunas identificadas`,
            `Vincular parcialmente o conteúdo existente`
          ];
        }
      }
    }

    matches.push(bestMatch);
    console.log(`📋 Tópico "${courseTopic.title}": ${bestMatch.matchType} match (${(bestMatch.similarityScore * 100).toFixed(1)}%)`);
  }

  // Identificar tópicos dos documentos não matcheados para criação de novos tópicos
  const matchedDocumentTopicIds = new Set(
    matches
      .filter(match => match.documentTopicId)
      .map(match => match.documentTopicId!)
  );

  for (const documentTopic of documentTopics) {
    if (!matchedDocumentTopicIds.has(documentTopic.id)) {
      matches.push({
        courseTopicId: `new-topic-${documentTopic.id}`,
        documentTopicId: documentTopic.id,
        matchType: 'none',
        similarityScore: 0,
        newTopicSuggestion: {
          title: documentTopic.title,
          description: documentTopic.description,
          chunks: documentTopic.relatedChunks.map(chunk => chunk.chunkId)
        }
      });
    }
  }

  console.log(`✅ Matching concluído: ${matches.filter(m => m.matchType === 'strong').length} strong, ${matches.filter(m => m.matchType === 'weak').length} weak, ${matches.filter(m => m.matchType === 'none').length} none`);

  return matches;
}

/**
 * Identifica lacunas de conteúdo entre um tópico do curso e um do documento
 */
async function identifyContentGaps(
  courseTopic: { title: string; description: string; learningObjectives?: string[] },
  documentTopic: DocumentTopic
): Promise<string[]> {

  try {
    const prompt = `Analise as diferenças entre estes dois tópicos educacionais:

TÓPICO DO CURSO:
Título: ${courseTopic.title}
Descrição: ${courseTopic.description}
Objetivos: ${courseTopic.learningObjectives?.join(', ') || 'Não especificados'}

TÓPICO DO DOCUMENTO:
Título: ${documentTopic.title}
Descrição: ${documentTopic.description}

Identifique quais aspectos do tópico do curso NÃO estão cobertos pelo tópico do documento.
Liste até 3 lacunas específicas:`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
      temperature: 0.3
    });

    const gaps = response.choices[0].message.content
      ?.split('\n')
      .filter(line => line.trim().length > 0)
      .slice(0, 3) || [];

    return gaps;

  } catch (error) {
    console.error('Erro ao identificar gaps:', error);
    return ['Análise detalhada necessária para identificar lacunas'];
  }
}

/**
 * Busca chunks relevantes para um query específico
 */
export async function searchRelevantChunks(
  query: string,
  documentChunks: Array<{
    id: string;
    text: string;
    embedding?: number[];
  }>,
  topK: number = 5
): Promise<Array<{
  chunkId: string;
  text: string;
  relevanceScore: number;
}>> {

  // Gerar embedding para a query
  const queryEmbedding = await generateEmbeddings([{
    text: query,
    startChar: 0,
    endChar: query.length,
    tokens: Math.ceil(query.length / 4)
  }]);

  if (queryEmbedding.length === 0) {
    return [];
  }

  // Encontrar chunks mais similares
  const results = findSimilarChunks(
    queryEmbedding[0].embedding,
    documentChunks,
    topK
  );

  return results.map(result => ({
    chunkId: result.chunkId,
    text: result.text,
    relevanceScore: result.similarity
  }));
}

/**
 * Cria contexto RAG a partir de chunks relevantes
 */
export function createRAGContext(
  topicTitle: string,
  relevantChunks: Array<{
    chunkId: string;
    text: string;
    relevanceScore: number;
    fileName?: string;
  }>
): string {

  if (relevantChunks.length === 0) {
    return `Contexto para: ${topicTitle}\n\nNenhum conteúdo específico encontrado nos documentos fornecidos.`;
  }

  let context = `Contexto RAG para: ${topicTitle}\n\n`;

  relevantChunks.forEach((chunk, index) => {
    context += `--- Fonte ${index + 1} (Relevância: ${(chunk.relevanceScore * 100).toFixed(1)}%) ---\n`;
    if (chunk.fileName) {
      context += `Arquivo: ${chunk.fileName}\n`;
    }
    context += `${chunk.text}\n\n`;
  });

  return context;
}