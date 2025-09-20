import OpenAI from 'openai';
import { getModelMaxTokens, calculateSafeTokenLimit, getAvailableModel, estimateCost } from './src/lib/model-utils';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Sanitiza resposta JSON do GPT removendo markdown e caracteres problemáticos
 */
function sanitizeJsonResponse(content: string): string {
  // Remove cercas de código markdown
  let cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');

  // Remove caracteres de controle
  cleaned = cleaned.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007f-\u009f]/g, '');

  // Procura o primeiro { e último }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  return cleaned.trim();
}

/**
 * Valida e melhora a estrutura final do curso usando GPT antes de enviar ao usuário
 */
export async function validateAndImproveFinalStructure(
  courseStructure: any,
  originalSubject: string
): Promise<{
  improvedStructure: any;
  changesApplied: string[];
  validationScore: number;
}> {
  try {
    console.log(`🔍 Validando estrutura final do curso para: "${originalSubject}"`);

    // Selecionar modelo disponível no início
    const selectedModel = getAvailableModel(['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo']);

    // Etapa 1: Análise da estrutura atual
    const analysisCompletion = await openai.chat.completions.create({
      model: selectedModel,
      messages: [
        {
          role: 'system',
          content: `Você é um especialista em design educacional e revisor de currículos acadêmicos. Analise a estrutura de curso fornecida e avalie:

1. COMPLETUDE: A estrutura cobre todos os aspectos essenciais do assunto?
2. ORGANIZAÇÃO: A sequência pedagógica está lógica e progressiva?
3. PROFUNDIDADE: Os tópicos têm o nível de detalhamento adequado?
4. COERÊNCIA: Todos os módulos e tópicos são relevantes para o assunto?
5. QUALIDADE: A estrutura é digna de um curso universitário completo?

RETORNE APENAS JSON:
{
  "score": 8.5,
  "needsImprovement": true/false,
  "strengths": ["pontos fortes identificados"],
  "weaknesses": ["problemas encontrados"],
  "missingElements": ["elementos importantes que faltam"],
  "unnecessaryElements": ["elementos que deveriam ser removidos"],
  "improvements": ["melhorias específicas a serem feitas"],
  "overallAssessment": "resumo da qualidade geral"
}`
        },
        {
          role: 'user',
          content: `Analise esta estrutura de curso sobre "${originalSubject}":

${JSON.stringify(courseStructure, null, 2)}

Seja rigoroso na análise. Esta estrutura será apresentada ao usuário como um curso universitário completo.`
        }
      ],
      max_tokens: 2000,
      temperature: 0.2,
    });

    const analysisContent = analysisCompletion.choices[0]?.message?.content;
    if (!analysisContent) {
      throw new Error('Falha na análise da estrutura');
    }

    const cleanedContent = sanitizeJsonResponse(analysisContent);
    const analysis = JSON.parse(cleanedContent);
    console.log(`📊 Score da estrutura: ${analysis.score}/10`);
    console.log(`🎯 Precisa melhorias: ${analysis.needsImprovement}`);

    // Se a estrutura já está boa (score >= 8.5), retorna sem mudanças
    if (!analysis.needsImprovement || analysis.score >= 8.5) {
      console.log('✅ Estrutura aprovada sem necessidade de melhorias');
      return {
        improvedStructure: courseStructure,
        changesApplied: [],
        validationScore: analysis.score
      };
    }

    // Etapa 2: Aplicar melhorias se necessário
    console.log('🔄 Aplicando melhorias na estrutura do curso...');

    const improvementPrompt = `
MELHORIAS NECESSÁRIAS:
${analysis.improvements.map((imp: string, i: number) => `${i + 1}. ${imp}`).join('\n')}

ELEMENTOS FALTANTES:
${analysis.missingElements.map((elem: string, i: number) => `${i + 1}. ${elem}`).join('\n')}

ELEMENTOS DESNECESSÁRIOS:
${analysis.unnecessaryElements.map((elem: string, i: number) => `${i + 1}. ${elem}`).join('\n')}

PONTOS FRACOS IDENTIFICADOS:
${analysis.weaknesses.map((weak: string, i: number) => `${i + 1}. ${weak}`).join('\n')}
`;

    // IMPORTANTE: Para estruturas grandes, usar limites seguros baseados no modelo
    const courseStructureStr = JSON.stringify(courseStructure, null, 2);
    const structureSizeKB = courseStructureStr.length / 1024;

    console.log(`📊 Tamanho da estrutura: ${structureSizeKB.toFixed(2)} KB`);

    // Calcular limite seguro de tokens
    const estimatedInputTokens = Math.ceil(courseStructureStr.length / 4);
    const targetOutputTokens = Math.max(4000, estimatedInputTokens); // Target razoável
    const maxTokensToUse = calculateSafeTokenLimit(selectedModel, estimatedInputTokens, targetOutputTokens);

    // Estimar custo
    const estimatedCostUSD = estimateCost(selectedModel, estimatedInputTokens, maxTokensToUse);
    console.log(`💰 Custo estimado: $${estimatedCostUSD}`);

    const improvementCompletion = await openai.chat.completions.create({
      model: selectedModel,
      messages: [
        {
          role: 'system',
          content: `Você é um especialista em design educacional. Sua tarefa é MELHORAR a estrutura de curso fornecida com base nas diretrizes específicas.

INSTRUÇÕES:
1. Mantenha a estrutura base (formato JSON)
2. Aplique TODAS as melhorias solicitadas
3. Adicione elementos faltantes mas PRESERVE TODOS OS TÓPICOS EXISTENTES
4. Remova APENAS elementos claramente desnecessários
5. Reorganize se necessário para melhor sequência pedagógica
6. NUNCA reduza o número total de tópicos - apenas adicione ou reorganize
7. Se a estrutura for muito grande, mantenha o essencial mas não remova conteúdo

RETORNE APENAS a estrutura melhorada em JSON válido.`
        },
        {
          role: 'user',
          content: `Melhore esta estrutura de curso sobre "${originalSubject}" aplicando as seguintes diretrizes:

${improvementPrompt}

ESTRUTURA ATUAL:
${JSON.stringify(courseStructure, null, 2)}

Aplique todas as melhorias listadas e retorne a estrutura completa aprimorada.`
        }
      ],
      max_tokens: maxTokensToUse,
      temperature: 0.3,
    });

    const improvementContent = improvementCompletion.choices[0]?.message?.content;
    if (!improvementContent) {
      throw new Error('Falha na melhoria da estrutura');
    }

    const cleanedImprovementContent = sanitizeJsonResponse(improvementContent);
    const improvedStructure = JSON.parse(cleanedImprovementContent);

    // Verificar se houve truncamento
    const improvedTopicCount = improvedStructure.modules?.reduce((sum: number, m: any) => sum + (m.topics?.length || 0), 0) || 0;
    const originalTopicCount = courseStructure.modules?.reduce((sum: number, m: any) => sum + (m.topics?.length || 0), 0) || 0;

    if (improvedTopicCount < originalTopicCount) {
      console.warn(`⚠️ Possível truncamento detectado: ${originalTopicCount} → ${improvedTopicCount} tópicos`);
      console.warn(`  Retornando estrutura original para evitar perda de conteúdo`);

      return {
        improvedStructure: courseStructure, // Retorna original se houve redução
        changesApplied: ['Mantida estrutura original devido a risco de truncamento'],
        validationScore: analysis.score
      };
    }

    console.log(`✅ Estrutura melhorada: ${originalTopicCount} → ${improvedTopicCount} tópicos`);
    console.log(`📈 Melhorias aplicadas: ${analysis.improvements.length} itens`);

    return {
      improvedStructure,
      changesApplied: analysis.improvements,
      validationScore: analysis.score
    };

  } catch (error) {
    console.error('❌ Erro na validação final da estrutura:', error);
    // Em caso de erro, retorna estrutura original
    return {
      improvedStructure: courseStructure,
      changesApplied: ['Erro na validação - estrutura original mantida'],
      validationScore: 7.0
    };
  }
}

/**
 * Validação adicional específica para assegurar qualidade mínima
 */
export async function ensureMinimumQualityStandards(
  courseStructure: any,
  subject: string
): Promise<any> {
  try {
    console.log(`🏆 Verificando padrões mínimos de qualidade para: "${subject}"`);

    // Selecionar modelo disponível
    const selectedModel = getAvailableModel(['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo']);

    const qualityCheck = await openai.chat.completions.create({
      model: selectedModel,
      messages: [
        {
          role: 'system',
          content: `Você é um auditor de qualidade educacional. Verifique se a estrutura atende aos padrões mínimos:

PADRÕES OBRIGATÓRIOS:
- Mínimo 15 módulos para curso completo
- Mínimo 8 tópicos por módulo
- Descrições detalhadas e específicas
- Sequência pedagógica lógica
- Objetivos de aprendizagem claros
- Estimativas realistas de tempo

Se NÃO atender aos padrões, adicione o que falta mas NUNCA remova conteúdo existente.
IMPORTANTE: Preserve TODOS os tópicos existentes!
RETORNE a estrutura em JSON válido (com adições se necessário, mas sem remoções).`
        },
        {
          role: 'user',
          content: `Verifique e corrija esta estrutura para ${subject}:

${JSON.stringify(courseStructure, null, 2)}

Garanta que atende a TODOS os padrões mínimos de qualidade.`
        }
      ],
      max_tokens: calculateSafeTokenLimit(selectedModel, 2000, 6000), // Limite seguro baseado no modelo
      temperature: 0.1,
    });

    const qualityContent = qualityCheck.choices[0]?.message?.content;
    if (!qualityContent) {
      return courseStructure;
    }

    const cleanedQualityContent = sanitizeJsonResponse(qualityContent);
    const qualityStructure = JSON.parse(cleanedQualityContent);
    // Verificar se houve perda de conteúdo
    const originalTopicCount = courseStructure.modules?.reduce((sum: number, m: any) => sum + (m.topics?.length || 0), 0) || 0;
    const qualityTopicCount = qualityStructure.modules?.reduce((sum: number, m: any) => sum + (m.topics?.length || 0), 0) || 0;

    if (qualityTopicCount < originalTopicCount) {
      console.warn(`⚠️ Verificação de qualidade tentou reduzir conteúdo: ${originalTopicCount} → ${qualityTopicCount} tópicos`);
      console.warn(`  Mantendo estrutura original para preservar conteúdo`);
      return courseStructure;
    }

    console.log(`✅ Padrões de qualidade aplicados: ${originalTopicCount} → ${qualityTopicCount} tópicos`);

    return qualityStructure;

  } catch (error) {
    console.error('❌ Erro na verificação de qualidade:', error);
    return courseStructure;
  }
}