/**
 * Pipeline de enriquecimento modular para cursos
 * Preserva todos os tópicos enquanto melhora qualidade
 */

import OpenAI from 'openai';
import { calculateSafeTokenLimit, getAvailableModel, estimateCost } from './model-utils';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface EnrichmentResult {
  enrichedModule: any;
  tokensUsed: number;
  cost: number;
  processingTime: number;
}

interface EnrichmentOptions {
  mode: 'preview' | 'full' | 'economy';
  maxModulesToEnrich?: number;
  preserveAllTopics?: boolean;
}

/**
 * Enriquece um módulo individual com GPT
 * Preserva todos os tópicos, apenas adiciona qualidade
 */
async function enrichSingleModule(
  module: any,
  courseContext: string,
  modelName: string
): Promise<EnrichmentResult> {
  const startTime = Date.now();

  try {
    // Preparar lista de tópicos para preservação
    const topicsList = module.topics.map((t: any) => `- ${t.title}`).join('\n');

    const prompt = `Você é um especialista em design educacional.

CONTEXTO DO CURSO: ${courseContext}

MÓDULO ATUAL: ${module.title}

TÓPICOS DO MÓDULO (PRESERVAR TODOS):
${topicsList}

TAREFA: Enriquecer este módulo com:
1. Título melhorado (se necessário)
2. Descrição detalhada e pedagógica (2-3 frases)
3. Objetivos de aprendizagem claros (3-5 itens)
4. Sugestões de atividades práticas (2-3 itens)
5. Estimativa de duração realista

REGRA FUNDAMENTAL: MANTER TODOS OS ${module.topics.length} TÓPICOS LISTADOS!
Apenas melhorar títulos e adicionar descrições, NUNCA remover tópicos.

Retorne APENAS JSON:
{
  "title": "título melhorado ou original",
  "description": "descrição pedagógica",
  "learningObjectives": ["objetivo 1", "objetivo 2"],
  "practicalActivities": ["atividade 1", "atividade 2"],
  "estimatedDuration": "X horas",
  "enrichedTopics": [
    {
      "title": "título do tópico (preservado ou melhorado)",
      "briefDescription": "1 frase sobre o tópico",
      "keyConceptsToLearn": ["conceito 1", "conceito 2"]
    }
  ]
}`;

    // Calcular tokens e chamar GPT
    const estimatedInputTokens = Math.ceil(prompt.length / 4);
    const maxTokens = calculateSafeTokenLimit(modelName, estimatedInputTokens, 1200);

    const completion = await openai.chat.completions.create({
      model: modelName,
      messages: [
        { role: 'system', content: 'Você é um designer instrucional. Preserve TODOS os tópicos fornecidos.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: maxTokens,
      temperature: 0.3, // Baixa temperatura para consistência
    });

    const response = completion.choices[0]?.message?.content || '{}';
    const enrichedData = JSON.parse(response);

    // Verificar preservação de tópicos
    const originalTopicCount = module.topics.length;
    const enrichedTopicCount = enrichedData.enrichedTopics?.length || 0;

    if (enrichedTopicCount < originalTopicCount) {
      console.warn(`⚠️ Enriquecimento tentou reduzir tópicos: ${originalTopicCount} → ${enrichedTopicCount}`);
      console.warn(`  Mantendo tópicos originais`);

      // Preservar tópicos originais
      enrichedData.enrichedTopics = module.topics;
    }

    // Merge dados enriquecidos com módulo original
    const enrichedModule = {
      ...module,
      title: enrichedData.title || module.title,
      description: enrichedData.description || module.description,
      learningObjectives: enrichedData.learningObjectives || module.learningObjectives,
      practicalActivities: enrichedData.practicalActivities,
      estimatedDuration: enrichedData.estimatedDuration || module.estimatedDuration,
      topics: mergeTopicData(module.topics, enrichedData.enrichedTopics || []),
      metadata: {
        ...module.metadata,
        enriched: true,
        enrichedAt: new Date().toISOString(),
        model: modelName,
        preservedTopics: originalTopicCount
      }
    };

    const tokensUsed = completion.usage?.total_tokens || 0;
    const cost = estimateCost(modelName, completion.usage?.prompt_tokens || 0, completion.usage?.completion_tokens || 0);

    return {
      enrichedModule,
      tokensUsed,
      cost,
      processingTime: Date.now() - startTime
    };

  } catch (error) {
    console.error(`❌ Erro ao enriquecer módulo "${module.title}":`, error);

    // Em caso de erro, retornar módulo original
    return {
      enrichedModule: {
        ...module,
        metadata: { ...module.metadata, enrichmentFailed: true }
      },
      tokensUsed: 0,
      cost: 0,
      processingTime: Date.now() - startTime
    };
  }
}

/**
 * Merge dados enriquecidos com tópicos originais
 * Preserva todos os tópicos originais
 */
function mergeTopicData(originalTopics: any[], enrichedTopics: any[]): any[] {
  const enrichedMap = new Map(
    enrichedTopics.map(t => [normalizeTitle(t.title), t])
  );

  return originalTopics.map(original => {
    const normalizedTitle = normalizeTitle(original.title);
    const enriched = enrichedMap.get(normalizedTitle);

    if (enriched) {
      return {
        ...original,
        title: enriched.title || original.title, // Pode ter título melhorado
        description: enriched.briefDescription || original.description,
        keyConceptsToLearn: enriched.keyConceptsToLearn,
        metadata: {
          ...original.metadata,
          enriched: true
        }
      };
    }

    // Se não foi enriquecido, manter original
    return {
      ...original,
      metadata: {
        ...original.metadata,
        enriched: false
      }
    };
  });
}

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

/**
 * Pipeline principal de enriquecimento
 */
export async function enrichCourseModules(
  modules: any[],
  courseTitle: string,
  options: EnrichmentOptions = { mode: 'economy' }
): Promise<{
  enrichedModules: any[];
  stats: {
    modulesEnriched: number;
    totalTokensUsed: number;
    totalCost: number;
    processingTime: number;
    preservedTopics: number;
  };
}> {
  const startTime = Date.now();
  const modelName = getAvailableModel(['gpt-4o-mini', 'gpt-3.5-turbo']); // Usar modelo econômico

  console.log(`🚀 Iniciando enriquecimento de ${modules.length} módulos (modo: ${options.mode})`);

  // Determinar quantos módulos enriquecer baseado no modo
  let modulesToEnrich: number;
  switch (options.mode) {
    case 'preview':
      modulesToEnrich = Math.min(3, modules.length); // Apenas 3 primeiros
      break;
    case 'economy':
      modulesToEnrich = Math.min(5, modules.length); // Até 5 módulos
      break;
    case 'full':
      modulesToEnrich = options.maxModulesToEnrich || modules.length; // Todos ou limite
      break;
    default:
      modulesToEnrich = 5;
  }

  console.log(`📊 Enriquecendo ${modulesToEnrich} de ${modules.length} módulos`);

  const enrichedModules: any[] = [];
  let totalTokensUsed = 0;
  let totalCost = 0;

  // Processar módulos sequencialmente para controlar custos
  for (let i = 0; i < modules.length; i++) {
    if (i < modulesToEnrich) {
      console.log(`  Enriquecendo módulo ${i + 1}: "${modules[i].title}"...`);

      const result = await enrichSingleModule(
        modules[i],
        courseTitle,
        modelName
      );

      enrichedModules.push(result.enrichedModule);
      totalTokensUsed += result.tokensUsed;
      totalCost += result.cost;

      // Delay pequeno entre chamadas para evitar rate limiting
      if (i < modulesToEnrich - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } else {
      // Módulos além do limite mantém estrutura original
      enrichedModules.push({
        ...modules[i],
        metadata: {
          ...modules[i].metadata,
          enriched: false,
          reason: 'beyond_limit'
        }
      });
    }
  }

  // Calcular total de tópicos preservados
  const preservedTopics = enrichedModules.reduce(
    (sum, mod) => sum + (mod.topics?.length || 0),
    0
  );

  const stats = {
    modulesEnriched: modulesToEnrich,
    totalTokensUsed,
    totalCost,
    processingTime: Date.now() - startTime,
    preservedTopics
  };

  console.log(`✅ Enriquecimento concluído:`);
  console.log(`  - Módulos enriquecidos: ${stats.modulesEnriched}`);
  console.log(`  - Tópicos preservados: ${stats.preservedTopics}`);
  console.log(`  - Tokens usados: ${stats.totalTokensUsed}`);
  console.log(`  - Custo estimado: $${stats.totalCost.toFixed(3)}`);
  console.log(`  - Tempo: ${(stats.processingTime / 1000).toFixed(1)}s`);

  return {
    enrichedModules,
    stats
  };
}

/**
 * Modo preview rápido para demonstração
 */
export async function generateCoursePreview(
  modules: any[],
  courseTitle: string
): Promise<any> {
  return enrichCourseModules(modules, courseTitle, { mode: 'preview' });
}