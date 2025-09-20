/**
 * Sistema de Scoring e Reranking de Evidências para RAG
 * Implementa a fórmula: confidence = 0.4*authority + 0.35*similarity + 0.15*recency + 0.1*license_score
 */

import { DocumentChunk } from './chunking';

export interface Evidence {
  id: string;
  content: string;
  source: string;
  url?: string;
  title?: string;
  type: 'academic_paper' | 'university' | 'educational' | 'commercial' | 'other' | 'documento' | 'video' | 'perplexity' | 'openai';

  // Scores individuais (0-1)
  authority_score: number;
  similarity_score: number;
  recency_score: number;
  license_score: number;

  // Score final calculado
  confidence_score: number;

  // Metadados adicionais
  metadata: {
    domain?: string;
    year?: number;
    authors?: string[];
    filename?: string;
    page?: number;
    chunk_index?: number;
    word_count?: number;
    language?: 'pt' | 'en' | 'other';
  };

  // Contexto para o tópico específico
  relevance_context?: {
    topic: string;
    query_used: string;
    matching_keywords: string[];
    context_snippet: string;
  };
}

export interface ScoringConfig {
  authority_weight: number;    // 0.4
  similarity_weight: number;   // 0.35
  recency_weight: number;      // 0.15
  license_weight: number;      // 0.1
  min_confidence_threshold: number; // 0.6 para flagging humano
  max_evidences_per_topic: number; // 10-20
  language_preference: 'pt' | 'en' | 'both';
}

const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  authority_weight: 0.4,
  similarity_weight: 0.35,
  recency_weight: 0.15,
  license_weight: 0.1,
  min_confidence_threshold: 0.6,
  max_evidences_per_topic: 15,
  language_preference: 'both'
};

/**
 * Calcula score de autoridade baseado na fonte
 */
export function calculateAuthorityScore(evidence: Evidence): number {
  const { type, url, metadata } = evidence;

  // Scores base por tipo de fonte
  const typeScores = {
    'academic_paper': 0.9,      // Papers em journals
    'university': 0.85,         // Universidades reconhecidas
    'educational': 0.7,         // Plataformas educacionais
    'commercial': 0.4,          // Sites comerciais
    'documento': 0.8,           // Documentos enviados pelo usuário
    'video': 0.5,              // Vídeos educacionais
    'perplexity': 0.75,        // Conteúdo do Perplexity
    'openai': 0.7,             // Conteúdo gerado por IA
    'other': 0.3               // Outras fontes
  };

  let baseScore = typeScores[type] || 0.3;

  // Ajustes baseados na URL/domínio
  if (url) {
    const domain = url.toLowerCase();

    // Universidades de prestígio
    if (domain.includes('mit.edu') || domain.includes('stanford.edu') ||
        domain.includes('harvard.edu') || domain.includes('usp.br') ||
        domain.includes('unicamp.br') || domain.includes('ufsc.br')) {
      baseScore = Math.max(baseScore, 0.95);
    }

    // Journals acadêmicos reconhecidos
    else if (domain.includes('doi.org') || domain.includes('pubmed') ||
             domain.includes('arxiv.org') || domain.includes('researchgate')) {
      baseScore = Math.max(baseScore, 0.9);
    }

    // Universidades em geral
    else if (domain.includes('.edu') || domain.includes('edu.br')) {
      baseScore = Math.max(baseScore, 0.8);
    }

    // Sites educacionais conhecidos
    else if (domain.includes('coursera') || domain.includes('edx') ||
             domain.includes('khanacademy') || domain.includes('wikipedia')) {
      baseScore = Math.max(baseScore, 0.6);
    }
  }

  // Ajuste por autores (se disponível)
  if (metadata.authors && metadata.authors.length > 0) {
    baseScore += 0.05; // Bonus por ter autores identificados
  }

  // Penalização para fontes muito genéricas
  if (evidence.content.length < 100) {
    baseScore *= 0.8;
  }

  return Math.min(1.0, baseScore);
}

/**
 * Calcula score de similaridade usando análise de keywords
 */
export function calculateSimilarityScore(evidence: Evidence, topic: string, query: string): number {
  const content = evidence.content.toLowerCase();
  const topicLower = topic.toLowerCase();
  const queryLower = query.toLowerCase();

  // Extrai palavras-chave do tópico e query
  const topicWords = extractKeywords(topicLower);
  const queryWords = extractKeywords(queryLower);
  const allKeywords = Array.from(new Set([...topicWords, ...queryWords]));

  let matchScore = 0;
  const matchingKeywords: string[] = [];

  // Calcula matches exatos
  for (const keyword of allKeywords) {
    if (content.includes(keyword)) {
      matchingKeywords.push(keyword);
      // Peso maior para palavras do tópico
      const weight = topicWords.includes(keyword) ? 1.0 : 0.7;
      matchScore += weight;
    }
  }

  // Calcula matches parciais (radicais)
  for (const keyword of allKeywords) {
    if (keyword.length > 4) {
      const radical = keyword.substring(0, Math.floor(keyword.length * 0.7));
      if (content.includes(radical) && !matchingKeywords.includes(keyword)) {
        matchingKeywords.push(radical);
        matchScore += 0.5;
      }
    }
  }

  // Normaliza pelo número total de keywords
  const normalizedScore = allKeywords.length > 0 ? matchScore / allKeywords.length : 0;

  // Bonus por densidade de keywords
  const keywordDensity = matchingKeywords.length / (content.split(' ').length || 1);
  const densityBonus = Math.min(0.2, keywordDensity * 10);

  // Atualiza contexto de relevância
  if (evidence.relevance_context) {
    evidence.relevance_context.matching_keywords = matchingKeywords;
    evidence.relevance_context.context_snippet = extractContextSnippet(content, matchingKeywords);
  }

  return Math.min(1.0, normalizedScore + densityBonus);
}

/**
 * Calcula score de recência (mais novo = melhor)
 */
export function calculateRecencyScore(evidence: Evidence): number {
  const currentYear = new Date().getFullYear();
  const sourceYear = evidence.metadata.year || currentYear;

  // Se não tem ano, assume que é recente (documentos do usuário, etc.)
  if (!evidence.metadata.year && evidence.type === 'documento') {
    return 1.0;
  }

  const ageInYears = currentYear - sourceYear;

  // Fontes muito recentes (< 2 anos) = score alto
  if (ageInYears < 2) return 1.0;

  // Fontes de 2-5 anos = score médio-alto
  if (ageInYears < 5) return 0.8;

  // Fontes de 5-10 anos = score médio
  if (ageInYears < 10) return 0.6;

  // Fontes de 10-20 anos = score baixo
  if (ageInYears < 20) return 0.4;

  // Fontes muito antigas = score muito baixo
  return 0.2;
}

/**
 * Calcula score de licença/disponibilidade
 */
export function calculateLicenseScore(evidence: Evidence): number {
  const { type, url } = evidence;

  // Documentos do usuário = máxima disponibilidade
  if (type === 'documento') return 1.0;

  // Conteúdo gerado = alta disponibilidade
  if (type === 'openai' || type === 'perplexity') return 0.9;

  if (url) {
    const domain = url.toLowerCase();

    // Open access e sites públicos
    if (domain.includes('arxiv') || domain.includes('pubmed') ||
        domain.includes('wikipedia') || domain.includes('.gov') ||
        domain.includes('researchgate')) {
      return 1.0;
    }

    // Universidades (geralmente acessível)
    if (domain.includes('.edu') || domain.includes('edu.br')) {
      return 0.8;
    }

    // Plataformas educacionais (pode ter paywall)
    if (domain.includes('coursera') || domain.includes('edx')) {
      return 0.6;
    }

    // Journals comerciais (frequentemente paywall)
    if (domain.includes('springer') || domain.includes('elsevier') ||
        domain.includes('wiley')) {
      return 0.4;
    }
  }

  // Default para fontes desconhecidas
  return 0.7;
}

/**
 * Calcula score de confiança final
 */
export function calculateConfidenceScore(evidence: Evidence, config: ScoringConfig = DEFAULT_SCORING_CONFIG): number {
  const confidence =
    config.authority_weight * evidence.authority_score +
    config.similarity_weight * evidence.similarity_score +
    config.recency_weight * evidence.recency_score +
    config.license_weight * evidence.license_score;

  return Math.min(1.0, Math.max(0.0, confidence));
}

/**
 * Processa e pontua uma evidência completa
 */
export function scoreEvidence(
  evidence: Partial<Evidence>,
  topic: string,
  query: string,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG
): Evidence {
  const fullEvidence: Evidence = {
    id: evidence.id || `evidence_${Date.now()}_${Math.random()}`,
    content: evidence.content || '',
    source: evidence.source || 'unknown',
    url: evidence.url,
    title: evidence.title,
    type: evidence.type || 'other',
    authority_score: 0,
    similarity_score: 0,
    recency_score: 0,
    license_score: 0,
    confidence_score: 0,
    metadata: evidence.metadata || {},
    relevance_context: {
      topic,
      query_used: query,
      matching_keywords: [],
      context_snippet: ''
    }
  };

  // Calcula scores individuais
  fullEvidence.authority_score = calculateAuthorityScore(fullEvidence);
  fullEvidence.similarity_score = calculateSimilarityScore(fullEvidence, topic, query);
  fullEvidence.recency_score = calculateRecencyScore(fullEvidence);
  fullEvidence.license_score = calculateLicenseScore(fullEvidence);

  // Calcula score final
  fullEvidence.confidence_score = calculateConfidenceScore(fullEvidence, config);

  return fullEvidence;
}

/**
 * Reordena evidências por score de confiança
 */
export function rerankEvidences(evidences: Evidence[], config: ScoringConfig = DEFAULT_SCORING_CONFIG): Evidence[] {
  return evidences
    .sort((a, b) => {
      // Primeiro critério: confidence score
      if (b.confidence_score !== a.confidence_score) {
        return b.confidence_score - a.confidence_score;
      }

      // Segundo critério: authority score
      if (b.authority_score !== a.authority_score) {
        return b.authority_score - a.authority_score;
      }

      // Terceiro critério: similarity score
      return b.similarity_score - a.similarity_score;
    })
    .slice(0, config.max_evidences_per_topic);
}

/**
 * Filtra evidências que precisam de revisão humana
 */
export function flagEvidencesForHumanReview(
  evidences: Evidence[],
  config: ScoringConfig = DEFAULT_SCORING_CONFIG
): { approved: Evidence[], needsReview: Evidence[] } {
  const approved: Evidence[] = [];
  const needsReview: Evidence[] = [];

  for (const evidence of evidences) {
    if (evidence.confidence_score >= config.min_confidence_threshold) {
      approved.push(evidence);
    } else {
      needsReview.push(evidence);
    }
  }

  return { approved, needsReview };
}

/**
 * Processa chunks de documento para evidências
 */
export function chunksToEvidences(
  chunks: DocumentChunk[],
  topic: string,
  query: string,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG
): Evidence[] {
  return chunks.map(chunk => {
    const evidence: Partial<Evidence> = {
      id: chunk.id,
      content: chunk.content,
      source: chunk.metadata.source,
      type: 'documento',
      metadata: {
        filename: chunk.metadata.filename,
        page: chunk.metadata.page,
        chunk_index: chunk.metadata.chunkIndex,
        word_count: chunk.content.split(' ').length
      }
    };

    return scoreEvidence(evidence, topic, query, config);
  });
}

/**
 * Combina evidências de múltiplas fontes
 */
export function combineEvidencesFromSources(
  perplexityEvidences: Evidence[],
  documentEvidences: Evidence[],
  videoEvidences: Evidence[] = [],
  config: ScoringConfig = DEFAULT_SCORING_CONFIG
): Evidence[] {
  const allEvidences = [...perplexityEvidences, ...documentEvidences, ...videoEvidences];

  // Remove duplicatas baseado em conteúdo similar
  const uniqueEvidences = deduplicateEvidences(allEvidences);

  // Reordena por confidence score
  return rerankEvidences(uniqueEvidences, config);
}

// Funções auxiliares
function extractKeywords(text: string): string[] {
  return text
    .split(/\s+/)
    .map(word => word.replace(/[^\w]/g, '').toLowerCase())
    .filter(word => word.length > 2)
    .filter(word => !isStopWord(word));
}

function isStopWord(word: string): boolean {
  const stopWords = ['para', 'com', 'por', 'que', 'uma', 'dos', 'das', 'como', 'mais', 'ser', 'tem', 'foi', 'são', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
  return stopWords.includes(word);
}

function extractContextSnippet(content: string, keywords: string[]): string {
  // Encontra a primeira ocorrência de qualquer keyword
  for (const keyword of keywords) {
    const index = content.toLowerCase().indexOf(keyword);
    if (index !== -1) {
      const start = Math.max(0, index - 50);
      const end = Math.min(content.length, index + keyword.length + 50);
      return content.substring(start, end).trim();
    }
  }

  // Se não encontrou keywords, retorna início do conteúdo
  return content.substring(0, 100).trim() + '...';
}

function deduplicateEvidences(evidences: Evidence[]): Evidence[] {
  const seen = new Set<string>();
  const unique: Evidence[] = [];

  for (const evidence of evidences) {
    // Cria uma chave única baseada em conteúdo e fonte
    const key = `${evidence.source}_${evidence.content.substring(0, 100)}`;

    if (!seen.has(key)) {
      seen.add(key);
      unique.push(evidence);
    }
  }

  return unique;
}

/**
 * Gera relatório de scoring para debug
 */
export function generateScoringReport(evidences: Evidence[]): string {
  const report = evidences.map((evidence, index) => {
    return `
Evidence ${index + 1}:
- Source: ${evidence.source} (${evidence.type})
- Authority: ${evidence.authority_score.toFixed(3)}
- Similarity: ${evidence.similarity_score.toFixed(3)}
- Recency: ${evidence.recency_score.toFixed(3)}
- License: ${evidence.license_score.toFixed(3)}
- CONFIDENCE: ${evidence.confidence_score.toFixed(3)}
- Keywords: ${evidence.relevance_context?.matching_keywords.join(', ') || 'N/A'}
- Content preview: ${evidence.content.substring(0, 100)}...
`;
  }).join('\n');

  return `EVIDENCE SCORING REPORT\n======================\n${report}`;
}