/**
 * Cache local para estruturas de curso
 * Usado como fallback quando Supabase não está disponível
 */

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const CACHE_DIR = path.join(process.cwd(), '.cache', 'courses');
const CACHE_FILE = path.join(CACHE_DIR, 'structures.json');

interface LocalCourseStructure {
  id: string;
  subject: string;
  education_level: string;
  title: string;
  description?: string;
  course_level: string;
  structure_data: any;
  total_modules: number;
  total_topics: number;
  created_at: string;
  updated_at: string;
  hash_key: string;
  metadata?: any;
}

interface LocalCourseCache {
  structures: LocalCourseStructure[];
  lastUpdated: string;
}

/**
 * Inicializa o diretório de cache
 */
function initCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

/**
 * Gera hash para busca
 */
function generateHashKey(subject: string, educationLevel: string): string {
  const key = `${subject.toLowerCase().trim()}::${educationLevel}`;
  return Buffer.from(key).toString('base64').replace(/[/+=]/g, '').substring(0, 32);
}

/**
 * Carrega o cache do arquivo
 */
function loadCache(): LocalCourseCache {
  initCacheDir();

  if (!fs.existsSync(CACHE_FILE)) {
    return {
      structures: [],
      lastUpdated: new Date().toISOString()
    };
  }

  try {
    const data = fs.readFileSync(CACHE_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.warn('⚠️ Erro ao carregar cache local, criando novo:', error);
    return {
      structures: [],
      lastUpdated: new Date().toISOString()
    };
  }
}

/**
 * Salva o cache no arquivo
 */
function saveCache(cache: LocalCourseCache) {
  try {
    cache.lastUpdated = new Date().toISOString();
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch (error) {
    console.error('❌ Erro ao salvar cache local:', error);
  }
}

/**
 * Salva estrutura de curso no cache local
 */
export async function saveCourseStructureLocal(
  subject: string,
  educationLevel: string,
  structure: any
): Promise<{ id: string; isNew: boolean }> {
  console.log('💾 Salvando estrutura no cache local...');
  console.log(`📚 Assunto: ${subject} | Nível: ${educationLevel}`);

  const cache = loadCache();

  // Verificar se já existe
  const hashKey = generateHashKey(subject, educationLevel);
  const existing = cache.structures.find(s => s.hash_key === hashKey);

  if (existing) {
    console.log('✅ Estrutura existente encontrada no cache local');
    return { id: existing.id, isNew: false };
  }

  // Contar módulos e tópicos
  let totalModules = 0;
  let totalTopics = 0;

  if (structure.modules && Array.isArray(structure.modules)) {
    totalModules = structure.modules.length;
    structure.modules.forEach((module: any) => {
      if (module.topics && Array.isArray(module.topics)) {
        totalTopics += module.topics.length;
      }
    });
  }

  // Criar nova estrutura
  const newStructure: LocalCourseStructure = {
    id: uuidv4(),
    subject: subject.toLowerCase().trim(),
    education_level: educationLevel,
    title: structure.title || `Curso de ${subject}`,
    description: structure.description || null,
    course_level: structure.level || 'intermediate',
    structure_data: structure,
    total_modules: totalModules,
    total_topics: totalTopics,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    hash_key: hashKey,
    metadata: {
      generatedAt: new Date().toISOString(),
      version: 'v3.1-local',
      sources: structure.metadata?.sources || []
    }
  };

  cache.structures.push(newStructure);
  saveCache(cache);

  console.log('✅ Nova estrutura salva no cache local:', newStructure.id);
  return { id: newStructure.id, isNew: true };
}

/**
 * Busca estrutura existente no cache local
 */
export async function findExistingStructureLocal(
  subject: string,
  educationLevel: string
): Promise<any | null> {
  console.log('🔍 Buscando estrutura no cache local...');
  console.log(`📊 Parâmetros: subject="${subject}", level="${educationLevel}"`);

  const cache = loadCache();

  // Busca por hash exato
  const hashKey = generateHashKey(subject, educationLevel);
  const exactMatch = cache.structures.find(s => s.hash_key === hashKey);

  if (exactMatch) {
    console.log('✅ Estrutura encontrada por hash exato:', exactMatch.title);
    return {
      id: exactMatch.id,
      title: exactMatch.title,
      description: exactMatch.description,
      data: exactMatch.structure_data,
      created_at: exactMatch.created_at
    };
  }

  // Busca por similaridade
  const normalizedSubject = subject.toLowerCase().trim();
  const similarMatch = cache.structures.find(s => {
    const similarity = calculateSimilarity(normalizedSubject, s.subject);
    return s.education_level === educationLevel && similarity > 0.8;
  });

  if (similarMatch) {
    console.log('✅ Estrutura similar encontrada:', similarMatch.title);
    return {
      id: similarMatch.id,
      title: similarMatch.title,
      description: similarMatch.description,
      data: similarMatch.structure_data,
      created_at: similarMatch.created_at
    };
  }

  console.log('❌ Nenhuma estrutura encontrada no cache local');
  return null;
}

/**
 * Registra uso de uma estrutura
 */
export async function recordStructureUsageLocal(
  structureId: string,
  isReused: boolean = false,
  userIdentifier?: string
): Promise<void> {
  console.log(`📊 Uso registrado localmente: ${isReused ? 'Reutilização' : 'Primeira geração'}`);

  // Simular registro de uso (poderia ser expandido para um arquivo separado)
  const usageLog = {
    structureId,
    userIdentifier: userIdentifier || `session_${Date.now()}`,
    reused: isReused,
    timestamp: new Date().toISOString()
  };

  // Por simplicidade, apenas log - em produção poderia salvar em arquivo separado
  console.log('📊 Uso registrado:', usageLog);
}

/**
 * Calcula similaridade entre strings
 */
function calculateSimilarity(str1: string, str2: string): number {
  const normalize = (s: string) => s.toLowerCase().trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');

  const s1 = normalize(str1);
  const s2 = normalize(str2);

  if (s1 === s2) return 1.0;

  const words1 = s1.split(' ');
  const words2 = s2.split(' ');

  const commonWords = words1.filter(word => words2.includes(word));
  const totalWords = Math.max(words1.length, words2.length);

  return commonWords.length / totalWords;
}

/**
 * Lista todas as estruturas no cache
 */
export function listCachedStructures(): LocalCourseStructure[] {
  const cache = loadCache();
  return cache.structures;
}

/**
 * Limpa estruturas antigas do cache
 */
export function cleanOldStructures(daysToKeep: number = 30): number {
  const cache = loadCache();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const originalCount = cache.structures.length;
  cache.structures = cache.structures.filter(structure => {
    const createdAt = new Date(structure.created_at);
    return createdAt > cutoffDate;
  });

  const deletedCount = originalCount - cache.structures.length;

  if (deletedCount > 0) {
    saveCache(cache);
    console.log(`🧹 ${deletedCount} estruturas antigas removidas do cache`);
  }

  return deletedCount;
}