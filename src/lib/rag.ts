/**
 * Sistema RAG (Retrieval-Augmented Generation) Aprimorado
 * Baseado nas recomendações de "Explicações de Alta Qualidade por IA"
 *
 * Implementa extração inteligente de contexto de múltiplas fontes:
 * - Arquivos enviados pelo usuário (PDFs, documentos)
 * - Respostas do Perplexity
 * - Conhecimento da OpenAI
 * - Transcrições de vídeos (futuro)
 */

import { RAGContext, UploadedFile, AulaTextoConfig } from '@/types';
import { askAssistantWithFiles } from './openai-files';
import { searchAcademicContent } from './perplexity';

export interface RAGSnippet {
  content: string;
  source: 'documento' | 'video' | 'perplexity' | 'openai';
  relevanceScore: number;
  metadata: {
    title?: string;
    author?: string;
    url?: string;
    page?: number;
    filename?: string;
  };
}

export interface RAGSearchConfig {
  topic: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  maxSnippets?: number;
  minRelevanceScore?: number;
  prioritizeSources?: Array<'documento' | 'video' | 'perplexity' | 'openai'>;
}

/**
 * Extrai snippets relevantes de arquivos enviados usando OpenAI File Search
 */
export async function extractSnippetsFromFiles(
  uploadedFiles: UploadedFile[],
  topic: string,
  level: string
): Promise<RAGSnippet[]> {
  console.log(`📁 Extraindo snippets de ${uploadedFiles.length} arquivo(s) para: "${topic}"`);

  const snippets: RAGSnippet[] = [];

  // Usar OpenAI File Search se disponível
  const filesWithAssistant = uploadedFiles.filter(f => f.assistantId);

  if (filesWithAssistant.length > 0) {
    console.log('🤖 Usando OpenAI File Search para extração inteligente...');

    for (const file of filesWithAssistant) {
      try {
        const extractionQuery = `
Extraia trechos específicos relevantes para o tópico "${topic}" (nível ${level}) do documento "${file.name}".

Foque em:
1. Definições e conceitos fundamentais
2. Exemplos práticos e aplicações
3. Fórmulas e procedimentos
4. Erros comuns e armadilhas
5. Referências bibliográficas

Para cada trecho relevante, forneça:
- O texto exato (citação)
- Contexto/explicação breve
- Página/seção se disponível

Responda no formato JSON:
{
  "snippets": [
    {
      "content": "texto extraído do documento",
      "context": "breve explicação do contexto",
      "page": "página ou seção",
      "relevance": "alta|media|baixa",
      "type": "definicao|exemplo|formula|referencia|outro"
    }
  ]
}

Limite-se aos 10 trechos mais relevantes.`;

        const result = await askAssistantWithFiles(file.assistantId!, extractionQuery);

        // Extrair JSON da resposta
        const jsonMatch = result.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const extractionData = JSON.parse(jsonMatch[0]);

          if (extractionData.snippets && Array.isArray(extractionData.snippets)) {
            for (const snippet of extractionData.snippets) {
              snippets.push({
                content: snippet.content,
                source: 'documento',
                relevanceScore: snippet.relevance === 'alta' ? 0.9 :
                               snippet.relevance === 'media' ? 0.7 : 0.5,
                metadata: {
                  title: file.name,
                  filename: file.name,
                  page: snippet.page,
                  author: snippet.context
                }
              });
            }
          }
        }

        console.log(`✅ Extraídos ${snippets.length} snippets de ${file.name}`);

      } catch (error) {
        console.error(`❌ Erro ao extrair snippets de ${file.name}:`, error);

        // Fallback: usar conteúdo direto do arquivo
        const fileSnippets = extractSnippetsFromText(
          file.content,
          topic,
          file.name
        );
        snippets.push(...fileSnippets);
      }
    }
  } else {
    // Fallback: análise tradicional de texto
    console.log('📄 Usando análise tradicional de texto...');

    for (const file of uploadedFiles) {
      const fileSnippets = extractSnippetsFromText(
        file.content,
        topic,
        file.name
      );
      snippets.push(...fileSnippets);
    }
  }

  console.log(`📊 Total de snippets extraídos dos arquivos: ${snippets.length}`);
  return snippets;
}

/**
 * Extração tradicional de snippets de texto (fallback)
 */
function extractSnippetsFromText(
  content: string,
  topic: string,
  filename: string
): RAGSnippet[] {
  const snippets: RAGSnippet[] = [];

  // Dividir texto em parágrafos
  const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 50);

  // Palavras-chave do tópico para scoring
  const topicKeywords = topic.toLowerCase().split(' ');

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i].trim();

    if (paragraph.length < 100) continue; // Pular parágrafos muito curtos

    // Calcular relevância baseada em palavras-chave
    const relevanceScore = calculateTextRelevance(paragraph, topicKeywords);

    if (relevanceScore > 0.3) { // Apenas snippets com relevância mínima
      snippets.push({
        content: paragraph,
        source: 'documento',
        relevanceScore,
        metadata: {
          filename,
          title: filename,
          page: Math.floor(i / 10) + 1 // Estimativa de página
        }
      });
    }
  }

  // Retornar apenas os 10 mais relevantes
  return snippets
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 10);
}

/**
 * Calcula relevância de texto baseado em palavras-chave
 */
function calculateTextRelevance(text: string, keywords: string[]): number {
  const lowerText = text.toLowerCase();
  let score = 0;

  for (const keyword of keywords) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) {
      score += matches.length * 0.2;
    }
  }

  // Bonus para definições
  if (lowerText.includes('definição') || lowerText.includes('conceito') ||
      lowerText.includes('é definido') || lowerText.includes('refere-se')) {
    score += 0.3;
  }

  // Bonus para exemplos
  if (lowerText.includes('exemplo') || lowerText.includes('por exemplo') ||
      lowerText.includes('consideremos') || lowerText.includes('seja')) {
    score += 0.2;
  }

  // Bonus para fórmulas/equações
  if (lowerText.includes('fórmula') || lowerText.includes('equação') ||
      lowerText.includes('=') || lowerText.includes('∑') || lowerText.includes('∫')) {
    score += 0.3;
  }

  return Math.min(score, 1.0); // Cap em 1.0
}

/**
 * Busca conteúdo acadêmico no Perplexity e extrai snippets
 */
export async function extractSnippetsFromPerplexity(
  topic: string,
  level: string
): Promise<RAGSnippet[]> {
  console.log(`🔍 Buscando conteúdo acadêmico no Perplexity para: "${topic}"`);

  try {
    const perplexityResponse = await searchAcademicContent({
      query: topic,
      language: 'pt'
    });

    const content = perplexityResponse.answer;

    // Dividir resposta em snippets menores
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 50);
    const snippets: RAGSnippet[] = [];

    for (let i = 0; i < sentences.length; i += 2) {
      // Agrupar 2-3 sentenças por snippet
      const snippetContent = sentences.slice(i, i + 3).join('. ').trim();

      if (snippetContent.length > 100) {
        const keywords = topic.toLowerCase().split(' ');
        const relevanceScore = calculateTextRelevance(snippetContent, keywords);

        snippets.push({
          content: snippetContent,
          source: 'perplexity',
          relevanceScore,
          metadata: {
            title: `Pesquisa Perplexity: ${topic}`,
            url: 'https://perplexity.ai'
          }
        });
      }
    }

    // Adicionar citações como snippets separados
    for (const citation of perplexityResponse.citations) {
      snippets.push({
        content: citation.snippet,
        source: 'perplexity',
        relevanceScore: 0.8, // Alta relevância para citações
        metadata: {
          title: citation.title,
          url: citation.url
        }
      });
    }

    console.log(`✅ ${snippets.length} snippets extraídos do Perplexity`);
    return snippets.slice(0, 15); // Limite de 15 snippets

  } catch (error) {
    console.error('❌ Erro ao buscar no Perplexity:', error);
    return [];
  }
}

/**
 * Combina e ranqueia snippets de múltiplas fontes
 */
export function combineAndRankSnippets(
  snippetsLists: RAGSnippet[][],
  config: RAGSearchConfig
): RAGSnippet[] {
  console.log('🔗 Combinando e ranqueando snippets de múltiplas fontes...');

  // Combinar todos os snippets
  const allSnippets = snippetsLists.flat();

  // Aplicar filtros
  let filteredSnippets = allSnippets.filter(snippet =>
    snippet.relevanceScore >= (config.minRelevanceScore || 0.3)
  );

  // Aplicar priorização de fontes se especificada
  if (config.prioritizeSources && config.prioritizeSources.length > 0) {
    filteredSnippets = filteredSnippets.map(snippet => {
      const sourceIndex = config.prioritizeSources!.indexOf(snippet.source);
      if (sourceIndex >= 0) {
        // Boost para fontes priorizadas
        snippet.relevanceScore += (3 - sourceIndex) * 0.1;
      }
      return snippet;
    });
  }

  // Remover duplicatas por conteúdo similar
  const uniqueSnippets = removeSimilarSnippets(filteredSnippets);

  // Ranquear por relevância
  const rankedSnippets = uniqueSnippets.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Limitar quantidade
  const maxSnippets = config.maxSnippets || 20;
  const finalSnippets = rankedSnippets.slice(0, maxSnippets);

  console.log(`✅ ${finalSnippets.length} snippets finais selecionados`);

  return finalSnippets;
}

/**
 * Remove snippets com conteúdo muito similar
 */
function removeSimilarSnippets(snippets: RAGSnippet[]): RAGSnippet[] {
  const unique: RAGSnippet[] = [];

  for (const snippet of snippets) {
    let isDuplicate = false;

    for (const existing of unique) {
      const similarity = calculateSimilarity(snippet.content, existing.content);
      if (similarity > 0.8) { // 80% de similaridade = duplicata
        isDuplicate = true;
        // Manter o de maior relevância
        if (snippet.relevanceScore > existing.relevanceScore) {
          const index = unique.indexOf(existing);
          unique[index] = snippet;
        }
        break;
      }
    }

    if (!isDuplicate) {
      unique.push(snippet);
    }
  }

  return unique;
}

/**
 * Calcula similaridade simples entre dois textos
 */
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size; // Jaccard similarity
}

/**
 * Converte snippets para contexto RAG formatado
 */
export function formatSnippetsAsRAGContext(snippets: RAGSnippet[]): string[] {
  return snippets.map((snippet, index) => {
    const sourceLabel = snippet.source === 'documento' ? 'Documento' :
                       snippet.source === 'perplexity' ? 'Pesquisa Acadêmica' :
                       snippet.source === 'video' ? 'Vídeo' : 'Conhecimento Base';

    const metadataInfo = snippet.metadata.title || snippet.metadata.filename || 'Fonte desconhecida';

    return `[${sourceLabel}: ${metadataInfo}]\n${snippet.content}`;
  });
}

/**
 * Função principal: busca contexto RAG completo para um tópico
 */
export async function buildRAGContextForTopic(
  config: AulaTextoConfig,
  uploadedFiles?: UploadedFile[]
): Promise<{
  ragContext: string[];
  sources: string[];
  totalSnippets: number;
}> {
  console.log(`🚀 Construindo contexto RAG para: "${config.topic}"`);

  const allSnippets: RAGSnippet[][] = [];
  const sources: string[] = [];

  // 1. Extrair de arquivos enviados (prioridade alta)
  if (uploadedFiles && uploadedFiles.length > 0) {
    console.log('📁 Extraindo contexto dos arquivos enviados...');
    const fileSnippets = await extractSnippetsFromFiles(
      uploadedFiles,
      config.topic,
      config.level
    );

    if (fileSnippets.length > 0) {
      allSnippets.push(fileSnippets);
      sources.push('Documentos Enviados');
    }
  }

  // 2. Buscar no Perplexity (prioridade média)
  console.log('🔍 Buscando contexto acadêmico...');
  const perplexitySnippets = await extractSnippetsFromPerplexity(
    config.topic,
    config.level
  );

  if (perplexitySnippets.length > 0) {
    allSnippets.push(perplexitySnippets);
    sources.push('Pesquisa Acadêmica');
  }

  // 3. Combinar e ranquear todos os snippets
  const searchConfig: RAGSearchConfig = {
    topic: config.topic,
    level: config.level,
    maxSnippets: 15, // Limite para não sobrecarregar o prompt
    minRelevanceScore: 0.4,
    prioritizeSources: ['documento', 'perplexity'] // Priorizar documentos e pesquisa acadêmica
  };

  const finalSnippets = combineAndRankSnippets(allSnippets, searchConfig);

  // 4. Formatar para uso em prompts
  const ragContext = formatSnippetsAsRAGContext(finalSnippets);

  console.log(`✅ Contexto RAG construído: ${finalSnippets.length} snippets de ${sources.length} fontes`);

  return {
    ragContext,
    sources,
    totalSnippets: finalSnippets.length
  };
}

/**
 * Validação e sanitização de contexto RAG
 */
export function validateRAGContext(ragContext: string[]): {
  isValid: boolean;
  warnings: string[];
  sanitizedContext: string[];
} {
  const warnings: string[] = [];
  const sanitizedContext: string[] = [];

  for (const context of ragContext) {
    // Verificar tamanho
    if (context.length > 2000) {
      warnings.push(`Contexto muito longo (${context.length} chars), será truncado`);
      sanitizedContext.push(context.substring(0, 2000) + '...');
    } else if (context.length < 50) {
      warnings.push('Contexto muito curto, pode não ser útil');
      sanitizedContext.push(context);
    } else {
      sanitizedContext.push(context);
    }
  }

  return {
    isValid: sanitizedContext.length > 0,
    warnings,
    sanitizedContext
  };
}