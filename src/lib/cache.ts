/**
 * Sistema de Cache para RAG e Performance
 * Implementa cache em memória com TTL para evidências e resultados de busca
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // em milissegundos
  hits: number;
}

export interface CacheConfig {
  defaultTTL: number; // 7 dias em ms por padrão
  maxEntries: number; // máximo de entradas
  enableStats: boolean;
}

export interface CacheStats {
  hits: number;
  misses: number;
  entries: number;
  totalSize: number;
  oldestEntry: number;
  newestEntry: number;
}

const DEFAULT_CONFIG: CacheConfig = {
  defaultTTL: 7 * 24 * 60 * 60 * 1000, // 7 dias
  maxEntries: 1000,
  enableStats: true
};

/**
 * Sistema de Cache Principal
 */
export class RAGCache {
  private cache = new Map<string, CacheEntry<any>>();
  private config: CacheConfig;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    entries: 0,
    totalSize: 0,
    oldestEntry: 0,
    newestEntry: 0
  };

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Armazena um item no cache
   */
  set<T>(key: string, data: T, customTTL?: number): void {
    const ttl = customTTL || this.config.defaultTTL;
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      hits: 0
    };

    // Se exceder limite, remover entradas antigas
    if (this.cache.size >= this.config.maxEntries) {
      this.evictOldEntries();
    }

    this.cache.set(key, entry);
    this.updateStats();

    console.log(`💾 Cache SET: ${key} (TTL: ${Math.floor(ttl / 1000 / 60)} min)`);
  }

  /**
   * Recupera um item do cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      console.log(`❌ Cache MISS: ${key}`);
      return null;
    }

    // Verificar se expirou
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.stats.misses++;
      console.log(`⏰ Cache EXPIRED: ${key}`);
      return null;
    }

    // Incrementar hits
    entry.hits++;
    this.stats.hits++;

    console.log(`✅ Cache HIT: ${key} (hits: ${entry.hits})`);
    return entry.data as T;
  }

  /**
   * Verifica se uma chave existe no cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry ? !this.isExpired(entry) : false;
  }

  /**
   * Remove uma chave do cache
   */
  delete(key: string): boolean {
    const result = this.cache.delete(key);
    this.updateStats();
    console.log(`🗑️ Cache DELETE: ${key}`);
    return result;
  }

  /**
   * Limpa cache expirado
   */
  cleanup(): number {
    const initialSize = this.cache.size;
    const expiredKeys: string[] = [];

    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (this.isExpired(entry)) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key);
    }

    this.updateStats();
    const removedCount = initialSize - this.cache.size;

    if (removedCount > 0) {
      console.log(`🧹 Cache cleanup: ${removedCount} entradas expiradas removidas`);
    }

    return removedCount;
  }

  /**
   * Limpa todo o cache
   */
  clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      entries: 0,
      totalSize: 0,
      oldestEntry: 0,
      newestEntry: 0
    };
    console.log('🧹 Cache completamente limpo');
  }

  /**
   * Retorna estatísticas do cache
   */
  getStats(): CacheStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * Retorna taxa de acerto do cache
   */
  getHitRate(): number {
    const total = this.stats.hits + this.stats.misses;
    return total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Lista todas as chaves no cache
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Exporta cache para JSON (para debug)
   */
  export(): any {
    const exported: any = {};

    for (const [key, entry] of Array.from(this.cache.entries())) {
      exported[key] = {
        timestamp: entry.timestamp,
        ttl: entry.ttl,
        hits: entry.hits,
        dataSize: JSON.stringify(entry.data).length,
        expiresAt: new Date(entry.timestamp + entry.ttl).toISOString()
      };
    }

    return {
      config: this.config,
      stats: this.getStats(),
      entries: exported
    };
  }

  // Métodos privados

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() > (entry.timestamp + entry.ttl);
  }

  private evictOldEntries(): void {
    // Remove as 10% das entradas mais antigas
    const entriesToRemove = Math.floor(this.config.maxEntries * 0.1);
    const entries = Array.from(this.cache.entries());

    // Ordena por timestamp (mais antigas primeiro)
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    for (let i = 0; i < entriesToRemove; i++) {
      this.cache.delete(entries[i][0]);
    }

    console.log(`🧹 Cache eviction: ${entriesToRemove} entradas antigas removidas`);
  }

  private updateStats(): void {
    this.stats.entries = this.cache.size;

    if (this.cache.size > 0) {
      const timestamps = Array.from(this.cache.values()).map(e => e.timestamp);
      this.stats.oldestEntry = Math.min(...timestamps);
      this.stats.newestEntry = Math.max(...timestamps);

      // Calcular tamanho aproximado
      this.stats.totalSize = Array.from(this.cache.values())
        .reduce((sum, entry) => sum + JSON.stringify(entry.data).length, 0);
    } else {
      this.stats.oldestEntry = 0;
      this.stats.newestEntry = 0;
      this.stats.totalSize = 0;
    }
  }
}

// Instância global do cache
export const ragCache = new RAGCache({
  defaultTTL: 7 * 24 * 60 * 60 * 1000, // 7 dias
  maxEntries: 500,
  enableStats: true
});

/**
 * Gera chave única para busca de evidências
 */
export function generateEvidenceKey(query: string, options: any = {}): string {
  const optionsStr = JSON.stringify(options);
  const hash = simpleHash(query + optionsStr);
  return `evidence_${hash}`;
}

/**
 * Gera chave única para syllabus
 */
export function generateSyllabusKey(message: string, userProfile: any = {}): string {
  const profileStr = JSON.stringify({
    level: userProfile.level,
    timeAvailable: userProfile.timeAvailable,
    purpose: userProfile.purpose
  });
  const hash = simpleHash(message + profileStr);
  return `syllabus_${hash}`;
}

/**
 * Gera chave para chunks de documento
 */
export function generateDocumentChunkKey(filename: string, content: string): string {
  const contentHash = simpleHash(content.substring(0, 1000)); // Primeiros 1000 chars
  return `chunks_${filename}_${contentHash}`;
}

/**
 * Cache inteligente para evidências (wrapper)
 */
export async function cacheEvidences<T>(
  key: string,
  fetchFunction: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // Tentar obter do cache primeiro
  const cached = ragCache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Se não está no cache, buscar e armazenar
  try {
    console.log(`🔄 Buscando evidências: ${key}`);
    const result = await fetchFunction();
    ragCache.set(key, result, ttl);
    return result;
  } catch (error) {
    console.error(`❌ Erro ao buscar evidências: ${key}`, error);
    throw error;
  }
}

/**
 * Cache inteligente para chunks de documento
 */
export async function cacheDocumentChunks<T>(
  filename: string,
  content: string,
  processFunction: () => T,
  ttl?: number
): Promise<T> {
  const key = generateDocumentChunkKey(filename, content);

  // Tentar obter do cache primeiro
  const cached = ragCache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Se não está no cache, processar e armazenar
  try {
    console.log(`🔄 Processando chunks de documento: ${filename}`);
    const result = processFunction();
    ragCache.set(key, result, ttl);
    return result;
  } catch (error) {
    console.error(`❌ Erro ao processar chunks: ${filename}`, error);
    throw error;
  }
}

/**
 * Cleanup automático do cache (executar periodicamente)
 */
export function setupAutomaticCleanup(intervalMinutes: number = 60): NodeJS.Timeout {
  const interval = intervalMinutes * 60 * 1000;

  return setInterval(() => {
    const removed = ragCache.cleanup();
    const stats = ragCache.getStats();

    console.log(`🔄 Cache automatic cleanup:`, {
      removed,
      remaining: stats.entries,
      hitRate: (ragCache.getHitRate() * 100).toFixed(1) + '%',
      totalSize: Math.floor(stats.totalSize / 1024) + 'KB'
    });
  }, interval);
}

/**
 * Hash simples para gerar chaves
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Cache Manager simplificado para casos específicos
 */
export class CacheManager<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private ttl: number;
  private prefix: string;

  constructor(prefix: string, ttl: number = 60 * 60 * 1000) {
    this.prefix = prefix;
    this.ttl = ttl;
  }

  get(key: string): T | null {
    const fullKey = `${this.prefix}_${key}`;
    const entry = this.cache.get(fullKey);

    if (!entry) {
      return null;
    }

    if (Date.now() > (entry.timestamp + entry.ttl)) {
      this.cache.delete(fullKey);
      return null;
    }

    entry.hits++;
    return entry.data;
  }

  set(key: string, data: T, customTTL?: number): void {
    const fullKey = `${this.prefix}_${key}`;
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: customTTL || this.ttl,
      hits: 0
    };

    this.cache.set(fullKey, entry);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * Relatório detalhado do cache
 */
export function generateCacheReport(): string {
  const stats = ragCache.getStats();
  const hitRate = ragCache.getHitRate();

  return `
RELATÓRIO DO CACHE RAG
=====================

📊 ESTATÍSTICAS:
- Entradas ativas: ${stats.entries}
- Taxa de acerto: ${(hitRate * 100).toFixed(1)}%
- Hits: ${stats.hits}
- Misses: ${stats.misses}
- Tamanho total: ${Math.floor(stats.totalSize / 1024)} KB

⏰ TEMPOS:
- Entrada mais antiga: ${stats.oldestEntry ? new Date(stats.oldestEntry).toLocaleString() : 'N/A'}
- Entrada mais recente: ${stats.newestEntry ? new Date(stats.newestEntry).toLocaleString() : 'N/A'}

🔑 CHAVES ATIVAS:
${ragCache.keys().slice(0, 10).map(key => `- ${key}`).join('\n')}
${ragCache.keys().length > 10 ? `... e mais ${ragCache.keys().length - 10} chaves` : ''}

💡 RECOMENDAÇÕES:
${hitRate < 0.5 ? '- Taxa de acerto baixa, considere aumentar TTL' : ''}
${stats.entries > 400 ? '- Cache próximo do limite, considere aumentar maxEntries' : ''}
${stats.totalSize > 1024 * 1024 ? '- Cache grande (>1MB), considere cleanup mais frequente' : ''}
`;
}