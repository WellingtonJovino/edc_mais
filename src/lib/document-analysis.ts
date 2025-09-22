import { DocumentTopic } from '@/types';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Extrai tópicos e table of contents de um documento
 */
export async function extractTopicsFromDocument(
  text: string,
  fileName: string
): Promise<{
  toc: string[];
  topics: DocumentTopic[];
}> {

  console.log(`🔍 Analisando documento: ${fileName} (${text.length} chars)`);

  try {
    // Extrair TOC (Table of Contents)
    const toc = await extractTableOfContents(text);
    console.log(`📚 TOC extraído: ${toc.length} entradas`);

    // Extrair tópicos detalhados
    const topics = await extractDetailedTopics(text, fileName);
    console.log(`📋 Tópicos extraídos: ${topics.length} tópicos`);

    return { toc, topics };

  } catch (error) {
    console.error(`❌ Erro na análise do documento ${fileName}:`, error);

    // Fallback: análise básica
    return {
      toc: extractBasicTOC(text),
      topics: await createFallbackTopics(text, fileName)
    };
  }
}

/**
 * Extrai table of contents usando IA
 */
async function extractTableOfContents(text: string): Promise<string[]> {
  // Se o texto é muito grande, usar apenas os primeiros 8000 caracteres
  const sampleText = text.length > 8000 ? text.substring(0, 8000) + '...' : text;

  const prompt = `Analise este documento acadêmico e extraia o sumário/table of contents.

DOCUMENTO:
${sampleText}

Extraia apenas os títulos principais e subtítulos, retornando uma lista limpa.
Se não houver um sumário explícito, identifique os principais tópicos/seções.
Retorne no máximo 15 itens, um por linha:`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.3
    });

    const content = response.choices[0].message.content || '';
    const toc = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('```'))
      .slice(0, 15);

    return toc;

  } catch (error) {
    console.error('Erro ao extrair TOC via IA:', error);
    return extractBasicTOC(text);
  }
}

/**
 * Extrai TOC básico procurando por padrões no texto
 */
function extractBasicTOC(text: string): string[] {
  const lines = text.split('\n');
  const toc: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Procurar por padrões de títulos
    if (trimmed.length > 0 && trimmed.length < 100) {
      // Títulos numerados (1., 1.1, etc.)
      if (/^\d+\.(\d+\.)*\s+/.test(trimmed)) {
        toc.push(trimmed);
      }
      // Títulos em maiúsculas
      else if (trimmed === trimmed.toUpperCase() && trimmed.length > 5) {
        toc.push(trimmed);
      }
      // Títulos que começam com maiúscula e têm poucas palavras
      else if (/^[A-Z]/.test(trimmed) && trimmed.split(' ').length <= 8 && !trimmed.includes('.')) {
        toc.push(trimmed);
      }
    }

    if (toc.length >= 15) break;
  }

  return toc.slice(0, 15);
}

/**
 * Extrai tópicos detalhados do documento usando IA
 */
async function extractDetailedTopics(text: string, fileName: string): Promise<DocumentTopic[]> {
  // Dividir texto em seções para análise
  const sections = splitTextIntoSections(text, 3000);
  const allTopics: DocumentTopic[] = [];

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    console.log(`📖 Analisando seção ${i + 1}/${sections.length}`);

    try {
      const sectionTopics = await extractTopicsFromSection(section, i);
      allTopics.push(...sectionTopics);

      // Delay para evitar rate limits
      if (i < sections.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } catch (error) {
      console.error(`❌ Erro na seção ${i + 1}:`, error);
      // Continuar com próxima seção
    }
  }

  // Remover duplicatas e limitar número de tópicos
  const uniqueTopics = removeDuplicateTopics(allTopics);
  console.log(`✅ ${uniqueTopics.length} tópicos únicos extraídos`);

  return uniqueTopics.slice(0, 20); // Máximo 20 tópicos por documento
}

/**
 * Divide texto em seções menores
 */
function splitTextIntoSections(text: string, maxSectionLength: number): string[] {
  const sections: string[] = [];
  let currentPos = 0;

  while (currentPos < text.length) {
    let endPos = Math.min(currentPos + maxSectionLength, text.length);

    // Tentar quebrar em uma frase ou parágrafo
    if (endPos < text.length) {
      const lastPeriod = text.lastIndexOf('.', endPos);
      const lastNewline = text.lastIndexOf('\n\n', endPos);

      const breakPoint = Math.max(lastPeriod, lastNewline);
      if (breakPoint > currentPos + maxSectionLength * 0.5) {
        endPos = breakPoint + 1;
      }
    }

    const section = text.substring(currentPos, endPos).trim();
    if (section.length > 100) { // Só incluir seções com conteúdo suficiente
      sections.push(section);
    }

    currentPos = endPos;
  }

  return sections;
}

/**
 * Extrai tópicos de uma seção específica
 */
async function extractTopicsFromSection(sectionText: string, sectionIndex: number): Promise<DocumentTopic[]> {
  const prompt = `Analise esta seção de um documento acadêmico e extraia os principais tópicos de aprendizado.

SEÇÃO DO DOCUMENTO:
${sectionText}

Para cada tópico identificado, forneça:
1. Título claro e conciso
2. Descrição em 1-2 frases
3. Lista de termos-chave

Extraia de 1 a 5 tópicos principais desta seção.
Formato de resposta:

TÓPICO 1:
Título: [título]
Descrição: [descrição]
Termos: [termo1, termo2, termo3]

TÓPICO 2:
[etc...]`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 800,
      temperature: 0.3
    });

    const content = response.choices[0].message.content || '';
    return parseTopicsFromResponse(content, sectionText, sectionIndex);

  } catch (error) {
    console.error('Erro ao extrair tópicos da seção:', error);
    return [];
  }
}

/**
 * Parseia resposta da IA para extrair tópicos estruturados
 */
function parseTopicsFromResponse(response: string, sectionText: string, sectionIndex: number): DocumentTopic[] {
  const topics: DocumentTopic[] = [];
  const topicBlocks = response.split(/TÓPICO \d+:/);

  for (let i = 1; i < topicBlocks.length; i++) {
    const block = topicBlocks[i].trim();
    const lines = block.split('\n').map(line => line.trim());

    let title = '';
    let description = '';
    let terms: string[] = [];

    for (const line of lines) {
      if (line.startsWith('Título:')) {
        title = line.replace('Título:', '').trim();
      } else if (line.startsWith('Descrição:')) {
        description = line.replace('Descrição:', '').trim();
      } else if (line.startsWith('Termos:')) {
        const termsText = line.replace('Termos:', '').trim();
        terms = termsText.split(',').map(term => term.trim()).filter(term => term.length > 0);
      }
    }

    if (title && description) {
      topics.push({
        id: `topic-section-${sectionIndex}-${i}`,
        title,
        description,
        relatedChunks: [{
          chunkId: `chunk-section-${sectionIndex}`,
          relevanceScore: 0.8,
          excerpt: sectionText.substring(0, 200) + '...'
        }],
        keyTerms: terms,
        difficulty: estimateDifficulty(description, terms)
      });
    }
  }

  return topics;
}

/**
 * Remove tópicos duplicados baseado em similaridade de título
 */
function removeDuplicateTopics(topics: DocumentTopic[]): DocumentTopic[] {
  const unique: DocumentTopic[] = [];

  for (const topic of topics) {
    const isDuplicate = unique.some(existing =>
      calculateTitleSimilarity(existing.title, topic.title) > 0.8
    );

    if (!isDuplicate) {
      unique.push(topic);
    }
  }

  return unique;
}

/**
 * Calcula similaridade entre títulos (simples)
 */
function calculateTitleSimilarity(title1: string, title2: string): number {
  const words1 = title1.toLowerCase().split(/\s+/);
  const words2 = title2.toLowerCase().split(/\s+/);

  const intersection = words1.filter(word => words2.includes(word));
  const union = [...new Set([...words1, ...words2])];

  return intersection.length / union.length;
}

/**
 * Estima dificuldade do tópico baseado no conteúdo
 */
function estimateDifficulty(description: string, terms: string[]): 'easy' | 'medium' | 'hard' {
  const complexityIndicators = [
    'avançado', 'complexo', 'análise', 'síntese', 'integração',
    'aplicação', 'derivação', 'demonstração', 'prova',
    'teoria', 'abstrato', 'matemático', 'cálculo'
  ];

  const basicIndicators = [
    'introdução', 'conceito', 'definição', 'exemplo',
    'básico', 'fundamental', 'simples', 'elementar'
  ];

  const text = (description + ' ' + terms.join(' ')).toLowerCase();

  const complexityScore = complexityIndicators.reduce((score, indicator) =>
    text.includes(indicator) ? score + 1 : score, 0
  );

  const basicScore = basicIndicators.reduce((score, indicator) =>
    text.includes(indicator) ? score + 1 : score, 0
  );

  if (complexityScore >= 2) return 'hard';
  if (basicScore >= 2) return 'easy';
  return 'medium';
}

/**
 * Cria tópicos de fallback quando a análise IA falha
 */
async function createFallbackTopics(text: string, fileName: string): Promise<DocumentTopic[]> {
  // Análise simples baseada em padrões
  const paragraphs = text.split('\n\n').filter(p => p.trim().length > 100);
  const topics: DocumentTopic[] = [];

  for (let i = 0; i < Math.min(paragraphs.length, 5); i++) {
    const paragraph = paragraphs[i];
    const firstSentence = paragraph.split('.')[0].trim();

    if (firstSentence.length > 10 && firstSentence.length < 100) {
      topics.push({
        id: `fallback-topic-${i}`,
        title: firstSentence,
        description: paragraph.length > 200 ? paragraph.substring(0, 200) + '...' : paragraph,
        relatedChunks: [{
          chunkId: `fallback-chunk-${i}`,
          relevanceScore: 0.6,
          excerpt: paragraph.substring(0, 150) + '...'
        }],
        difficulty: 'medium'
      });
    }
  }

  return topics;
}