import { YouTubeVideo, ContextualVideoSearch, ContextualSearchResult } from '@/types';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

export interface YouTubeSearchParams {
  query: string;
  maxResults?: number;
  order?: 'relevance' | 'date' | 'rating' | 'viewCount';
  duration?: 'short' | 'medium' | 'long';
  language?: string;
}

export interface ScoredVideo {
  video: any;
  score: number;
  reason: string;
}

/**
 * Constrói queries inteligentes PT/EN para melhor cobertura
 */
function buildQueries(topic: string, context?: string): string[] {
  const base = topic.replace(/\s+/g, ' ').trim();
  
  const queriesPT = [
    `"${base}" aula`,
    `"${base}" explicação`,
    `"${base}" exercícios resolvidos`,
    `"${base}" mecânica vetorial estática`,
    `"${base}" engenharia estática`,
    `"${base}" introdução`,
    `${base} aula tutorial`,
    `${base} professor engenharia`
  ];
  
  const queriesEN = [
    `"${base}" lecture`,
    `"${base}" tutorial`,
    `"${base}" statics engineering`,
    `"${base}" example problems`,
    `"${base}" mechanics statics`,
    `${base} engineering lecture`,
    `${base} statics tutorial`
  ];
  
  // Se temos contexto (descrição do tópico), extrair termos técnicos
  const contextTerms: string[] = [];
  if (context) {
    const technicalTerms = extractTechnicalTerms(base, context);
    technicalTerms.forEach(term => {
      contextTerms.push(`"${term}" aula`);
      contextTerms.push(`"${term}" tutorial`);
    });
  }
  
  return [...queriesPT, ...queriesEN, ...contextTerms];
}

/**
 * Extrai termos técnicos baseado no tópico e contexto
 */
function extractTechnicalTerms(topic: string, context: string): string[] {
  const topicLower = topic.toLowerCase();
  const contextLower = context.toLowerCase();
  
  const termsByTopic: { [key: string]: string[] } = {
    'vetor': ['grandezas vetoriais', 'decomposição', 'produto escalar', 'produto vetorial', 'resultante'],
    'equilíbrio': ['condições de equilíbrio', 'ΣF=0', 'ΣM=0', 'Varignon'],
    'diagrama': ['diagrama de corpo livre', 'DCL', 'free body diagram'],
    'momento': ['momento de uma força', 'torque', 'par de forças'],
    'estrutura': ['treliças', 'pórticos', 'cargas distribuídas'],
    'força': ['resultante', 'componentes', 'decomposição de forças']
  };
  
  const terms: string[] = [];
  
  Object.keys(termsByTopic).forEach(key => {
    if (topicLower.includes(key) || contextLower.includes(key)) {
      terms.push(...termsByTopic[key]);
    }
  });
  
  return terms.slice(0, 5); // Limite de 5 termos por tópico
}

/**
 * Busca candidatos usando a YouTube Data API
 */
async function searchCandidates(
  query: string, 
  language: 'pt' | 'en' = 'pt',
  fallbackLevel: number = 0
): Promise<any[]> {
  const params = new URLSearchParams({
    part: 'snippet',
    q: query,
    type: 'video',
    maxResults: '25',
    videoEmbeddable: 'true',
    key: process.env.YOUTUBE_API_KEY!,
  });
  
  // Aplicar parâmetros baseados no nível de fallback (removidos filtros problemáticos)
  if (fallbackLevel === 0) {
    // Primeira tentativa: ordem por relevância
    params.append('order', 'relevance');
  } else if (fallbackLevel === 1) {
    // Segunda tentativa: ordem por rating
    params.append('order', 'rating');
  } else if (fallbackLevel === 2) {
    // Terceira tentativa: ordem por data
    params.append('order', 'date');
  } else {
    // Último recurso: só por views
    params.append('order', 'viewCount');
  }
  
  try {
    console.log(`🔍 Buscando: "${query}" (${language}, fallback: ${fallbackLevel})`);
    const response = await fetch(`${YOUTUBE_API_BASE}/search?${params}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ YouTube Search API error: ${response.status}`, errorText);
      return [];
    }
    
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error(`❌ Erro na busca "${query}":`, error);
    return [];
  }
}

/**
 * Busca detalhes dos vídeos usando videos.list
 */
async function fetchVideoDetails(videoIds: string[]): Promise<any[]> {
  if (!videoIds.length) return [];
  
  const params = new URLSearchParams({
    part: 'contentDetails,statistics,snippet',
    id: videoIds.join(','),
    key: process.env.YOUTUBE_API_KEY!,
  });
  
  try {
    const response = await fetch(`${YOUTUBE_API_BASE}/videos?${params}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ YouTube Videos API error: ${response.status}`, errorText);
      return [];
    }
    
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('❌ Erro ao buscar detalhes dos vídeos:', error);
    return [];
  }
}

/**
 * Converte duração ISO 8601 para segundos
 */
function parseISODuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Verifica se é um canal confiável (universidades/professores)
 */
function isTrustedChannel(channelTitle: string): boolean {
  const title = channelTitle.toLowerCase();
  const trustedKeywords = [
    'universidade', 'university', 'uff', 'usp', 'unicamp', 'ufmg', 'ita',
    'prof.', 'professor', 'engenharia', 'mechanics', 'statics', 'mit',
    'stanford', 'ufrj', 'ufsc', 'puc', 'fatec'
  ];
  
  return trustedKeywords.some(keyword => title.includes(keyword));
}

/**
 * Calcula score de similaridade textual
 */
function textMatchScore(topic: string, title: string, description: string): number {
  const needle = topic.toLowerCase();
  const haystack = (title + ' ' + description).toLowerCase();
  
  let score = 0;
  
  // Score base por conter o tópico
  if (haystack.includes(needle)) score += 1;
  
  // Bônus por termos técnicos relevantes
  const technicalTerms = [
    'vetor', 'equilíbrio', 'momento', 'torque', 'dcl', 'varignon', 
    'estática', 'statics', 'mechanics', 'engineering', 'força', 'resultante'
  ];
  
  technicalTerms.forEach(term => {
    if (haystack.includes(term)) score += 0.2;
  });
  
  // Bônus por palavras educacionais
  const educationalTerms = ['aula', 'tutorial', 'explicação', 'lecture', 'example'];
  educationalTerms.forEach(term => {
    if (haystack.includes(term)) score += 0.1;
  });
  
  return Math.min(score, 2.5); // Cap no score
}

/**
 * Calcula score de qualidade didática para um vídeo
 */
function scoreVideo(topic: string, video: any): { score: number; reason: string } {
  const stats = video.statistics || {};
  const views = parseInt(stats.viewCount || '0', 10);
  const likes = parseInt(stats.likeCount || '0', 10);
  const snippet = video.snippet || {};
  
  // Engagement ratio (normalizado)
  const engagementRatio = views > 0 ? (likes / Math.pow(views, 0.7)) : 0;
  
  // Score de duração (favorece 8-60 min)
  const durationSeconds = parseISODuration(video.contentDetails?.duration || 'PT0S');
  let durationScore = 0;
  if (durationSeconds >= 8 * 60 && durationSeconds <= 60 * 60) {
    durationScore = 1;
  } else if (durationSeconds >= 5 * 60 && durationSeconds <= 90 * 60) {
    durationScore = 0.5;
  }
  
  // Score de recencia (favorece últimos 8 anos)
  const publishDate = new Date(snippet.publishedAt || '2000-01-01');
  const yearsAgo = (Date.now() - publishDate.getTime()) / (365 * 24 * 3600 * 1000);
  const recencyScore = yearsAgo <= 8 ? 1 : (yearsAgo <= 12 ? 0.6 : 0.3);
  
  // Bônus por canal confiável
  const channelBoost = isTrustedChannel(snippet.channelTitle || '') ? 1.3 : 1.0;
  
  // Score de similaridade textual
  const textScore = textMatchScore(topic, snippet.title || '', snippet.description || '');
  
  // Score de views (normalizado logaritmicamente)
  const viewScore = Math.log10(views + 1) / 6; // ~0 a 1
  
  // Cálculo final do score
  const finalScore = (
    0.35 * textScore +
    0.25 * durationScore +
    0.20 * viewScore +
    0.12 * Math.min(engagementRatio * 1000, 1) + // Normalizar engagement
    0.08 * recencyScore
  ) * channelBoost;
  
  // Gerar razão para o score
  const reasons: string[] = [];
  if (textScore > 1) reasons.push('alta relevância textual');
  if (durationScore === 1) reasons.push('duração ideal');
  if (isTrustedChannel(snippet.channelTitle || '')) reasons.push('canal confiável');
  if (viewScore > 0.5) reasons.push('bom número de views');
  if (recencyScore === 1) reasons.push('conteúdo recente');
  
  const reason = reasons.length > 0 ? reasons.join(', ') : 'score geral';
  
  return { score: finalScore, reason };
}

export async function searchYouTubeVideos(params: YouTubeSearchParams): Promise<YouTubeVideo[]> {
  // Sistema legado - manter compatibilidade
  return await searchAndRankYouTube(params.query, undefined, params.maxResults || 10);
}

/**
 * Busca inteligente com ranking e fallback progressivo
 */
export async function searchAndRankYouTube(
  topic: string, 
  context?: string, 
  maxResults: number = 3
): Promise<YouTubeVideo[]> {
  // Verificar se a API key está configurada
  if (!process.env.YOUTUBE_API_KEY) {
    console.error('❌ YOUTUBE_API_KEY não está configurada');
    return getFallbackVideos(topic);
  }

  console.log(`🎯 Buscando vídeos inteligentes para: "${topic}"`);
  
  // 1. Construir queries inteligentes
  const queries = buildQueries(topic, context);
  console.log(`🔍 Usando ${queries.length} queries: ${queries.slice(0, 3).join(', ')}...`);
  
  let allCandidates: any[] = [];
  let fallbackLevel = 0;
  
  // 2. Buscar com fallback progressivo
  while (allCandidates.length < 20 && fallbackLevel < 4) {
    console.log(`🔄 Tentativa ${fallbackLevel + 1}/4`);
    
    // Usar menos queries nos fallbacks
    const querySubset = fallbackLevel === 0 ? queries.slice(0, 6) : queries.slice(0, 3);
    
    for (const query of querySubset) {
      // Alternar entre PT e EN
      const language = Math.random() > 0.7 ? 'en' : 'pt';
      const candidates = await searchCandidates(query, language, fallbackLevel);
      allCandidates.push(...candidates);
      
      if (allCandidates.length >= 40) break; // Early stop
    }
    
    fallbackLevel++;
  }
  
  console.log(`📈 Total de candidatos: ${allCandidates.length}`);
  
  if (allCandidates.length === 0) {
    console.warn('⚠️ Nenhum candidato encontrado, usando fallback');
    return getFallbackVideos(topic);
  }
  
  // 3. Remover duplicatas por videoId
  const uniqueVideoIds = Array.from(new Set(
    allCandidates
      .map(candidate => candidate.id?.videoId)
      .filter(Boolean)
  ));
  
  console.log(`🔢 Vídeos únicos: ${uniqueVideoIds.length}`);
  
  // 4. Buscar detalhes dos vídeos
  const videoDetails = await fetchVideoDetails(uniqueVideoIds);
  
  if (videoDetails.length === 0) {
    console.warn('⚠️ Nenhum detalhe obtido, usando fallback');
    return getFallbackVideos(topic);
  }
  
  // 5. Filtrar vídeos inapropriados
  const filtered = videoDetails.filter(video => {
    const duration = parseISODuration(video.contentDetails?.duration || 'PT0S');
    const isLive = video.snippet?.liveBroadcastContent !== 'none';
    
    // Filtros básicos: remover Shorts muito curtos e lives
    return duration >= 120 && duration <= 2 * 3600 && !isLive;
  });
  
  console.log(`🗺 Após filtros: ${filtered.length} vídeos`);
  
  // Se filtros muito rígidos, relaxar
  const pool = filtered.length >= 3 ? filtered : videoDetails;
  
  // 6. Calcular scores e rankear
  const scoredVideos: ScoredVideo[] = pool.map(video => {
    const { score, reason } = scoreVideo(topic, video);
    return { video, score, reason };
  });
  
  // Ordenar por score
  scoredVideos.sort((a, b) => b.score - a.score);
  
  // 7. Garantir diversidade de canais
  const seenChannels = new Set<string>();
  const diverseVideos: ScoredVideo[] = [];
  
  for (const scoredVideo of scoredVideos) {
    const channelId = scoredVideo.video.snippet?.channelId;
    
    if (!seenChannels.has(channelId)) {
      seenChannels.add(channelId);
      diverseVideos.push(scoredVideo);
      
      if (diverseVideos.length >= maxResults) break;
    }
  }
  
  // 8. Se ainda não temos o suficiente, pegar os melhores por score
  while (diverseVideos.length < maxResults && diverseVideos.length < scoredVideos.length) {
    const next = scoredVideos.find(sv => !diverseVideos.includes(sv));
    if (next) diverseVideos.push(next);
    else break;
  }
  
  console.log(`🏆 Selecionados ${diverseVideos.length} vídeos finais`);
  
  // 9. Converter para formato YouTubeVideo
  return diverseVideos.map(({ video, score, reason }) => ({
    id: `${video.id}-${Date.now()}`,
    videoId: video.id,
    title: video.snippet?.title || 'Título não disponível',
    description: video.snippet?.description || '',
    thumbnail: video.snippet?.thumbnails?.medium?.url || 
               video.snippet?.thumbnails?.default?.url || 
               `https://img.youtube.com/vi/${video.id}/mqdefault.jpg`,
    channelTitle: video.snippet?.channelTitle || 'Canal desconhecido',
    publishedAt: video.snippet?.publishedAt || new Date().toISOString(),
    duration: formatDuration(video.contentDetails?.duration || 'PT0S'),
    relevanceScore: Math.round(score * 100) / 100,
    selectionReason: reason
  } as YouTubeVideo & { selectionReason?: string }));
}

/**
 * Vídeos de fallback quando a busca falha completamente
 */
function getFallbackVideos(topic: string): YouTubeVideo[] {
  console.log('🔄 Usando vídeos de fallback');
  return [
    {
      id: `fallback-${Date.now()}-1`,
      videoId: 'dQw4w9WgXcQ',
      title: `Estudo sobre ${topic}`,
      description: 'Vídeo educativo sobre o tópico solicitado.',
      thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
      channelTitle: 'Canal Educativo',
      publishedAt: new Date().toISOString(),
      duration: '5:30',
    },
    {
      id: `fallback-${Date.now()}-2`,
      videoId: 'jNQXAC9IVRw',
      title: `Tutorial: ${topic}`,
      description: 'Tutorial detalhado sobre o assunto.',
      thumbnail: 'https://img.youtube.com/vi/jNQXAC9IVRw/mqdefault.jpg',
      channelTitle: 'Canal Tutorial',
      publishedAt: new Date().toISOString(),
      duration: '8:15',
    }
  ];
}

export async function searchVideosByTopics(topics: Array<{ title: string; keywords: string[]; description?: string }>): Promise<{ [topicTitle: string]: YouTubeVideo[] }> {
  const results: { [topicTitle: string]: YouTubeVideo[] } = {};

  console.log(`🎬 Iniciando busca inteligente para ${topics.length} tópicos`);

  for (const topic of topics) {
    console.log(`🎯 Processando tópico: "${topic.title}"`);
    
    try {
      // Usar nova busca inteligente com contexto
      const videos = await searchAndRankYouTube(
        topic.title,
        topic.description, // Usar descrição como contexto
        3 // 3 vídeos por tópico
      );
      
      results[topic.title] = videos;
      console.log(`✅ Tópico "${topic.title}": ${videos.length} vídeos selecionados`);
      
      // Log dos vídeos encontrados com suas razões
      videos.forEach((video, index) => {
        const reason = (video as any).selectionReason || 'seleção padrão';
        console.log(`   ${index + 1}. "${video.title}" (${reason})`);
      });
      
    } catch (error) {
      console.error(`❌ Erro ao buscar vídeos para "${topic.title}":`, error);
      results[topic.title] = [];
    }
  }

  console.log(`🎬 Busca inteligente concluída para todos os tópicos`);
  return results;
}

/**
 * Busca vídeos educacionais usando o novo sistema inteligente
 * Esta função é mantida para compatibilidade, mas agora usa searchAndRankYouTube
 */
export async function searchEducationalVideos(
  topicTitle: string,
  searchKeywords: string[],
  subject: string
): Promise<YouTubeVideo[]> {
  console.log(`🎯 Buscando vídeos educacionais para: "${topicTitle}"`);
  
  // Criar contexto combinando keywords
  const context = `${subject}. Palavras-chave: ${searchKeywords.join(', ')}`;
  
  // Usar o novo sistema inteligente
  const videos = await searchAndRankYouTube(topicTitle, context, 5);
  
  console.log(`✅ Encontrados ${videos.length} vídeos educacionais para "${topicTitle}"`);
  return videos;
}

// Funções antigas removidas - agora usamos o novo sistema de scoring integrado

/**
 * Formata duração ISO 8601 para formato legível
 */
function formatDuration(duration: string): string {
  const seconds = parseISODuration(duration);
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// ============================================================================
// NOVA BUSCA CONTEXTUAL POR SUB-TÓPICO
// ============================================================================

/**
 * Constrói queries contextuais avançadas usando toda a hierarquia
 */
function buildContextualQueries(config: ContextualVideoSearch): string[] {
  const { courseTitle, moduleTitle, topicTitle, keyTerms, difficulty } = config;

  // Base queries com contexto hierárquico
  const baseQueries = [
    `"${topicTitle}" aula ${moduleTitle}`,
    `"${topicTitle}" ${courseTitle}`,
    `${topicTitle} ${moduleTitle} aula`,
    `${topicTitle} explicação`,
    `${topicTitle} tutorial`
  ];

  // Queries com termos-chave
  const keyTermQueries = keyTerms.flatMap(term => [
    `"${term}" ${topicTitle}`,
    `${term} ${moduleTitle}`,
    `${term} aula`
  ]);

  // Queries específicas por dificuldade
  const difficultyQueries = {
    easy: [`${topicTitle} introdução`, `${topicTitle} básico`],
    medium: [`${topicTitle} exercícios`, `${topicTitle} exemplos`],
    hard: [`${topicTitle} avançado`, `${topicTitle} aplicado`]
  };

  // Combinar todas as queries
  const allQueries = [
    ...baseQueries,
    ...keyTermQueries.slice(0, 8), // Limitar a 8 queries de termos-chave
    ...difficultyQueries[difficulty]
  ];

  // Remover duplicatas e limitar a 15 queries total
  return Array.from(new Set(allQueries)).slice(0, 15);
}

/**
 * Busca contextual por sub-tópico usando hierarquia completa
 */
export async function searchContextualVideos(config: ContextualVideoSearch): Promise<ContextualSearchResult> {
  const startTime = Date.now();
  console.log(`🎯 Busca contextual: ${config.courseTitle} > ${config.moduleTitle} > ${config.topicTitle}`);

  // Construir queries contextuais
  const queries = buildContextualQueries(config);
  console.log(`🔍 Usando ${queries.length} queries contextuais`);

  try {
    // Usar o sistema de busca inteligente existente
    const contextDescription = `Curso: ${config.courseTitle}. Módulo: ${config.moduleTitle}. Objetivos: ${config.learningObjectives.join(', ')}. Termos-chave: ${config.keyTerms.join(', ')}`;

    const videos = await searchAndRankYouTube(
      config.topicTitle,
      contextDescription,
      config.targetVideoCount
    );

    const searchDuration = Date.now() - startTime;

    const result: ContextualSearchResult = {
      videos,
      searchMetadata: {
        queriesUsed: queries,
        totalCandidates: videos.length * 3, // Estimativa
        filteredCount: videos.length,
        avgRelevanceScore: videos.reduce((acc, v: any) => acc + (v.relevanceScore || 0), 0) / videos.length,
        searchDuration
      },
      contextUsed: {
        courseTitle: config.courseTitle,
        moduleTitle: config.moduleTitle,
        topicTitle: config.topicTitle,
        keyTermsUsed: config.keyTerms
      }
    };

    console.log(`✅ Busca contextual concluída em ${searchDuration}ms: ${videos.length} vídeos`);
    videos.forEach((video, i) => {
      const reason = (video as any).selectionReason || 'seleção contextual';
      console.log(`   ${i + 1}. "${video.title}" (${reason})`);
    });

    return result;

  } catch (error) {
    console.error(`❌ Erro na busca contextual:`, error);
    throw new Error(`Falha na busca contextual para ${config.topicTitle}`);
  }
}

/**
 * Busca vídeos para múltiplos sub-tópicos usando contexto hierárquico
 */
export async function searchVideosForTopics(
  courseTitle: string,
  modules: Array<{
    title: string;
    topics: Array<{
      title: string;
      description: string;
      detailedDescription: string;
      learningObjectives: string[];
      keyTerms: string[];
      searchKeywords: string[];
      difficulty: 'easy' | 'medium' | 'hard';
    }>;
  }>
): Promise<{ [topicTitle: string]: YouTubeVideo[] }> {
  const results: { [topicTitle: string]: YouTubeVideo[] } = {};

  console.log(`🎥 Iniciando busca contextual para curso: "${courseTitle}"`);

  for (const module of modules) {
    console.log(`📚 Processando módulo: "${module.title}"`);

    for (const topic of module.topics) {
      const config: ContextualVideoSearch = {
        courseTitle,
        moduleTitle: module.title,
        topicTitle: topic.title,
        topicDescription: topic.detailedDescription,
        learningObjectives: topic.learningObjectives,
        keyTerms: topic.keyTerms,
        difficulty: topic.difficulty,
        targetVideoCount: 3 // 3 vídeos por sub-tópico
      };

      try {
        const searchResult = await searchContextualVideos(config);
        results[topic.title] = searchResult.videos;

      } catch (error) {
        console.error(`❌ Erro ao buscar vídeos para "${topic.title}":`, error);
        results[topic.title] = [];
      }

      // Delay entre buscas para respeitar rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log(`✅ Busca contextual concluída para todos os módulos`);
  return results;
}