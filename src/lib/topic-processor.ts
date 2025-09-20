/**
 * Processador de tópicos para criar estruturas de curso completas
 * Implementa deduplicação, agrupamento e geração modular
 */

interface ProcessedTopic {
  title: string;
  original: string;
  source: 'perplexity' | 'gpt' | 'user';
  relevance: number;
  confidence: number;
  cluster?: number;
  similarityScore?: number; // Para detecção de duplicatas
  mergedFrom?: string[]; // Se foi resultado de merge
}

interface TopicCluster {
  id: string;
  title: string;
  topics: ProcessedTopic[];
  order: number;
}

/**
 * Normaliza e remove duplicatas dos tópicos
 */
export function normalizeAndDeduplicate(topics: string[]): ProcessedTopic[] {
  const normalized = new Map<string, ProcessedTopic>();

  topics.forEach(topic => {
    // Limpar e normalizar
    const cleaned = topic
      .replace(/^\d+\.\s*/, '') // Remove numeração
      .replace(/\[.*?\]/g, '') // Remove referências [1], [2], etc
      .replace(/^[-•*]\s*/, '') // Remove bullets
      .replace(/\*\*/g, '') // Remove markdown bold
      .replace(/^##\s*/, '') // Remove headers markdown
      .trim();

    if (cleaned.length < 3) return; // Ignorar tópicos muito curtos

    // Normalizar para comparação
    const normalized_key = cleaned
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove pontuação
      .replace(/\s+/g, ' ') // Normaliza espaços
      .trim();

    // Se já existe um similar, manter o mais longo/detalhado
    if (!normalized.has(normalized_key) ||
        (normalized.get(normalized_key)!.original.length < cleaned.length)) {
      normalized.set(normalized_key, {
        title: cleaned,
        original: topic,
        source: 'perplexity',
        relevance: 1.0,
        confidence: 0.85 // Confiança padrão para Perplexity
      });
    }
  });

  return Array.from(normalized.values());
}

/**
 * Agrupa tópicos em clusters/módulos usando similaridade semântica simples
 */
export function clusterTopics(
  topics: ProcessedTopic[],
  targetModules: number = 15
): TopicCluster[] {
  // Palavras-chave para agrupamento temático
  const themeKeywords = {
    'fundamentos': ['básico', 'introdução', 'conceito', 'fundamental', 'princípio', 'definição', 'história'],
    'estrutura': ['estrutura', 'átomo', 'molécula', 'ligação', 'cristal', 'arranjo', 'orbital'],
    'propriedades': ['propriedade', 'característica', 'físico', 'químico', 'mecânico', 'térmico'],
    'reações': ['reação', 'transformação', 'processo', 'mecanismo', 'cinética', 'catálise'],
    'cálculos': ['cálculo', 'estequiometria', 'concentração', 'equação', 'balanço', 'quantitativo'],
    'termodinâmica': ['termo', 'energia', 'calor', 'entropia', 'entalpia', 'gibbs'],
    'equilíbrio': ['equilíbrio', 'constante', 'deslocamento', 'le chatelier', 'ácido', 'base', 'ph'],
    'eletroquímica': ['eletro', 'pilha', 'eletrólise', 'redox', 'oxidação', 'redução', 'potencial'],
    'orgânica': ['orgânic', 'carbono', 'hidrocarboneto', 'função', 'isomeria', 'polímero'],
    'analítica': ['análise', 'identificação', 'separação', 'titulação', 'espectro', 'cromatografia'],
    'aplicações': ['aplicação', 'industrial', 'ambiental', 'tecnologia', 'cotidiano', 'prático'],
    'laboratório': ['laboratório', 'experimento', 'prática', 'segurança', 'técnica', 'procedimento'],
    'avançado': ['avançado', 'complexo', 'especial', 'moderno', 'nano', 'bio', 'computacional']
  };

  // Inicializar clusters
  const clusters: Map<string, TopicCluster> = new Map();
  const unassigned: ProcessedTopic[] = [];

  // Primeira passada: agrupar por tema
  topics.forEach(topic => {
    const topicLower = topic.title.toLowerCase();
    let assigned = false;

    for (const [theme, keywords] of Object.entries(themeKeywords)) {
      if (keywords.some(keyword => topicLower.includes(keyword))) {
        if (!clusters.has(theme)) {
          clusters.set(theme, {
            id: `module-${theme}`,
            title: theme.charAt(0).toUpperCase() + theme.slice(1),
            topics: [],
            order: Object.keys(themeKeywords).indexOf(theme)
          });
        }
        topic.cluster = clusters.get(theme)!.topics.length;
        clusters.get(theme)!.topics.push(topic);
        assigned = true;
        break;
      }
    }

    if (!assigned) {
      unassigned.push(topic);
    }
  });

  // Segunda passada: distribuir não-atribuídos
  if (unassigned.length > 0) {
    // Se temos poucos clusters, criar um "Tópicos Gerais"
    if (clusters.size < targetModules) {
      clusters.set('geral', {
        id: 'module-geral',
        title: 'Tópicos Complementares',
        topics: unassigned,
        order: clusters.size
      });
    } else {
      // Distribuir uniformemente nos clusters existentes
      let clusterIndex = 0;
      const clusterArray = Array.from(clusters.values());
      unassigned.forEach(topic => {
        clusterArray[clusterIndex % clusterArray.length].topics.push(topic);
        clusterIndex++;
      });
    }
  }

  // Ordenar clusters e equilibrar tamanhos
  const finalClusters = Array.from(clusters.values())
    .sort((a, b) => a.order - b.order)
    .filter(cluster => cluster.topics.length > 0);

  // Se temos muitos tópicos em poucos clusters, subdividir
  const maxTopicsPerCluster = Math.ceil(topics.length / targetModules);
  const expandedClusters: TopicCluster[] = [];

  finalClusters.forEach(cluster => {
    if (cluster.topics.length > maxTopicsPerCluster) {
      // Dividir cluster grande em múltiplos
      const numSubClusters = Math.ceil(cluster.topics.length / maxTopicsPerCluster);
      for (let i = 0; i < numSubClusters; i++) {
        const start = i * maxTopicsPerCluster;
        const end = Math.min(start + maxTopicsPerCluster, cluster.topics.length);
        expandedClusters.push({
          id: `${cluster.id}-${i + 1}`,
          title: `${cluster.title} - Parte ${i + 1}`,
          topics: cluster.topics.slice(start, end),
          order: cluster.order + (i * 0.1)
        });
      }
    } else {
      expandedClusters.push(cluster);
    }
  });

  return expandedClusters;
}

/**
 * Converte clusters em estrutura de módulos para o curso
 */
export function clustersToModules(clusters: TopicCluster[]): any[] {
  return clusters.map((cluster, index) => ({
    id: cluster.id,
    title: cluster.title,
    description: `Módulo sobre ${cluster.title.toLowerCase()} com ${cluster.topics.length} tópicos`,
    order: index,
    estimatedDuration: `${Math.ceil(cluster.topics.length * 1.5)} horas`,
    learningObjectives: [
      `Compreender os conceitos de ${cluster.title.toLowerCase()}`,
      `Aplicar conhecimentos na prática`,
      `Resolver problemas relacionados`
    ],
    topics: cluster.topics.map((topic, topicIndex) => ({
      id: `topic-${cluster.id}-${topicIndex}`,
      title: topic.title,
      description: `Estudo sobre ${topic.title}`,
      order: topicIndex,
      estimatedDuration: '45 min',
      difficulty: topicIndex < cluster.topics.length / 3 ? 'easy' :
                  topicIndex < (cluster.topics.length * 2) / 3 ? 'medium' : 'hard',
      learningObjectives: [`Entender ${topic.title}`],
      keyTerms: extractKeyTerms(topic.title),
      searchKeywords: extractKeyTerms(topic.title)
    }))
  }));
}

/**
 * Extrai termos-chave de um título
 */
function extractKeyTerms(title: string): string[] {
  // Remove palavras comuns e retorna termos significativos
  const stopWords = ['de', 'da', 'do', 'e', 'a', 'o', 'em', 'para', 'com', 'por'];
  return title
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.includes(word))
    .slice(0, 5); // Máximo 5 termos
}

/**
 * Marca possíveis duplicatas baseado em similaridade
 */
function markPossibleDuplicates(topics: ProcessedTopic[], threshold: number): void {
  for (let i = 0; i < topics.length; i++) {
    for (let j = i + 1; j < topics.length; j++) {
      const similarity = calculateSimilarity(topics[i].title, topics[j].title);
      if (similarity >= threshold) {
        topics[i].similarityScore = similarity;
        topics[j].similarityScore = similarity;
        console.log(`🔍 Possível duplicata: "${topics[i].title}" ↔ "${topics[j].title}" (${(similarity * 100).toFixed(1)}%)`);
      }
    }
  }
}

/**
 * Calcula similaridade simples entre duas strings (Jaccard)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const set1 = new Set(str1.toLowerCase().split(/\s+/));
  const set2 = new Set(str2.toLowerCase().split(/\s+/));
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return intersection.size / union.size;
}

/**
 * Pipeline completo: processa tópicos do Perplexity em estrutura de curso
 */
export function processTopicsIntoCourse(
  perplexityTopics: string[],
  targetModules: number = 15,
  options: {
    enableSmartDedupe?: boolean;
    similarityThreshold?: number;
    preserveAll?: boolean;
  } = {}
): {
  modules: any[];
  totalTopics: number;
  stats: {
    originalCount: number;
    deduplicatedCount: number;
    modulesCreated: number;
    mergedTopics?: number;
    duplicatesFound?: number;
  };
  metadata?: {
    processingMode: string;
    timestamp: string;
    options: any;
  };
} {
  const { enableSmartDedupe = true, similarityThreshold = 0.88, preserveAll = false } = options;

  console.log(`🔄 Processando ${perplexityTopics.length} tópicos do Perplexity...`);
  console.log(`⚙️ Opções: smartDedupe=${enableSmartDedupe}, threshold=${similarityThreshold}, preserveAll=${preserveAll}`);

  // 1. Normalizar e deduplicar
  const processed = normalizeAndDeduplicate(perplexityTopics);
  const duplicatesFound = perplexityTopics.length - processed.length;
  console.log(`📊 Deduplicação: ${perplexityTopics.length} → ${processed.length} tópicos únicos`);

  // Marcar possíveis duplicatas para revisão (sem remover ainda)
  if (enableSmartDedupe && !preserveAll) {
    markPossibleDuplicates(processed, similarityThreshold);
  }

  // 2. Agrupar em clusters
  const clusters = clusterTopics(processed, targetModules);
  console.log(`📦 Agrupamento: ${clusters.length} módulos criados`);

  // 3. Converter para formato de módulos
  const modules = clustersToModules(clusters);

  const totalTopics = modules.reduce((sum, mod) => sum + mod.topics.length, 0);

  return {
    modules,
    totalTopics,
    stats: {
      originalCount: perplexityTopics.length,
      deduplicatedCount: processed.length,
      modulesCreated: modules.length,
      duplicatesFound,
      mergedTopics: 0 // Implementar quando merge for ativado
    },
    metadata: {
      processingMode: preserveAll ? 'preserve_all' : 'smart_dedupe',
      timestamp: new Date().toISOString(),
      options
    }
  };
}