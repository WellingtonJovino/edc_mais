/**
 * Utilitários para gerenciamento de modelos e limites
 */

interface ModelConfig {
  maxTokens: number;
  costPer1kTokens: number;
  preferenceOrder: number;
}

const MODEL_CONFIGS: Record<string, ModelConfig> = {
  'gpt-4o-2024-11-20': { maxTokens: 16384, costPer1kTokens: 0.01, preferenceOrder: 1 },
  'gpt-4o': { maxTokens: 8192, costPer1kTokens: 0.01, preferenceOrder: 2 },
  'gpt-4o-mini': { maxTokens: 4096, costPer1kTokens: 0.002, preferenceOrder: 3 },
  'gpt-4-turbo': { maxTokens: 4096, costPer1kTokens: 0.03, preferenceOrder: 4 },
  'gpt-3.5-turbo': { maxTokens: 4096, costPer1kTokens: 0.002, preferenceOrder: 5 },
};

/**
 * Obtém o limite máximo de tokens para um modelo
 */
export function getModelMaxTokens(modelName: string): number {
  const config = MODEL_CONFIGS[modelName];
  if (!config) {
    console.warn(`⚠️ Modelo ${modelName} não configurado, usando limite padrão de 4096`);
    return 4096; // Fallback seguro
  }
  return config.maxTokens;
}

/**
 * Seleciona o melhor modelo disponível
 */
export function getAvailableModel(preferredModels?: string[]): string {
  // Se há lista de preferência, usar o primeiro disponível
  if (preferredModels && preferredModels.length > 0) {
    for (const model of preferredModels) {
      if (MODEL_CONFIGS[model]) {
        console.log(`✅ Usando modelo preferido: ${model}`);
        return model;
      }
    }
  }

  // Caso contrário, usar ordem de preferência padrão
  const sortedModels = Object.entries(MODEL_CONFIGS)
    .sort((a, b) => a[1].preferenceOrder - b[1].preferenceOrder);

  const selectedModel = sortedModels[0][0];
  console.log(`📋 Modelo selecionado por padrão: ${selectedModel}`);
  return selectedModel;
}

/**
 * Calcula limite seguro de tokens baseado no modelo e input
 */
export function calculateSafeTokenLimit(
  modelName: string,
  estimatedInputTokens: number,
  targetOutputTokens: number
): number {
  const modelMax = getModelMaxTokens(modelName);

  // Reservar espaço para input + margem de segurança
  const availableForOutput = modelMax - estimatedInputTokens - 500; // 500 tokens de margem

  // Limitar a 8000 como máximo prático (evita custos excessivos)
  const practicalMax = 8000;

  // Escolher o menor entre: target, disponível, prático
  const safeLimit = Math.min(
    targetOutputTokens,
    availableForOutput,
    practicalMax
  );

  // Garantir mínimo de 1000 tokens
  const finalLimit = Math.max(safeLimit, 1000);

  console.log(`🎯 Token limit calculado: ${finalLimit} (modelo: ${modelName}, max: ${modelMax})`);
  return finalLimit;
}

/**
 * Estima custo de uma chamada
 */
export function estimateCost(
  modelName: string,
  inputTokens: number,
  outputTokens: number
): number {
  const config = MODEL_CONFIGS[modelName] || MODEL_CONFIGS['gpt-3.5-turbo'];
  const totalTokens = inputTokens + outputTokens;
  const cost = (totalTokens / 1000) * config.costPer1kTokens;
  return Math.round(cost * 1000) / 1000; // 3 decimal places
}

/**
 * Divide conteúdo em chunks seguros para o modelo
 */
export function chunkContentForModel(
  content: string,
  modelName: string,
  basePromptTokens: number = 500
): string[] {
  const modelMax = getModelMaxTokens(modelName);
  const availablePerChunk = modelMax - basePromptTokens - 1000; // Margem de segurança

  // Estimar ~4 chars por token
  const charsPerChunk = availablePerChunk * 4;

  const chunks: string[] = [];
  let currentChunk = '';

  const lines = content.split('\n');
  for (const line of lines) {
    if ((currentChunk.length + line.length) > charsPerChunk && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = line;
    } else {
      currentChunk += (currentChunk ? '\n' : '') + line;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  console.log(`📦 Conteúdo dividido em ${chunks.length} chunks para ${modelName}`);
  return chunks;
}