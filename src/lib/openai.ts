import OpenAI from 'openai';
import {
  AulaTextoStructure,
  AulaTextoConfig,
  AulaTextoQualityAssessment,
  RAGContext
} from '@/types';
import {
  buildAulaTextoPrompt,
  SYSTEM_PROMPT_AVALIACAO,
  SYSTEM_PROMPT_MELHORIA,
  validateAulaTextoStructure,
  QUALITY_CHECKLIST
} from './prompts/aulaTexto';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface LearningAnalysis {
  subject: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  topics: Array<{
    title: string;
    description: string;
    keywords: string[];
    order: number;
  }>;
  searchQueries: string[];
}

/**
 * Gera descrição detalhada do que um aluno deve aprender em um tópico específico
 */
export async function generateTopicDescription(
  topicTitle: string, 
  subject: string, 
  level: string
): Promise<{
  description: string;
  learningObjectives: string[];
  keyTerms: string[];
  searchKeywords: string[];
}> {
  const prompt = `Como especialista em educação, crie uma descrição detalhada para o tópico "${topicTitle}" no contexto de um curso de "${subject}" (nível ${level}).

Responda no formato JSON:
{
  "description": "Descrição detalhada do que este tópico aborda (2-3 parágrafos explicativos)",
  "learningObjectives": ["O que o aluno deve saber fazer após estudar este tópico", "Objetivo 2", "..."],
  "keyTerms": ["Termos e conceitos fundamentais", "Conceito 2", "..."],
  "searchKeywords": ["Palavras-chave para buscar vídeos educacionais relevantes", "Keyword 2", "..."]
}

Seja específico, didático e focado no aprendizado prático.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: 'system',
          content: 'Você é um especialista em educação que cria descrições detalhadas de tópicos de aprendizado. Responda APENAS com JSON válido.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 800,
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Resposta vazia da OpenAI');
    }
    
    // Extrair JSON da resposta
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Resposta não contém JSON válido');
    }

    const topicInfo = JSON.parse(jsonMatch[0]);
    
    return {
      description: topicInfo.description || `Estudo sobre ${topicTitle}`,
      learningObjectives: topicInfo.learningObjectives || [],
      keyTerms: topicInfo.keyTerms || [],
      searchKeywords: topicInfo.searchKeywords || [topicTitle]
    };
  } catch (error) {
    console.error('Erro ao gerar descrição do tópico:', error);
    
    // Fallback básico
    return {
      description: `Estudo sobre ${topicTitle} no contexto de ${subject}`,
      learningObjectives: [`Entender os conceitos fundamentais de ${topicTitle}`],
      keyTerms: [topicTitle],
      searchKeywords: [topicTitle, subject]
    };
  }
}

export async function analyzeLearningGoal(userMessage: string): Promise<LearningAnalysis> {
  const prompt = `
    Analise a seguinte mensagem do usuário e extraia:
    1. O assunto que ele quer aprender
    2. O nível de conhecimento atual (beginner, intermediate, advanced)
    3. Uma lista organizada de tópicos para aprender (máximo 8 tópicos)
    4. Queries de busca otimizadas para o YouTube

    Mensagem do usuário: "${userMessage}"

    Responda APENAS com um JSON válido no seguinte formato:
    {
      "subject": "nome do assunto",
      "level": "beginner|intermediate|advanced",
      "topics": [
        {
          "title": "título do tópico",
          "description": "descrição detalhada",
          "keywords": ["palavra-chave1", "palavra-chave2"],
          "order": 1
        }
      ],
      "searchQueries": ["query1", "query2", "query3"]
    }
  `;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Resposta vazia da OpenAI');
    }

    return JSON.parse(content) as LearningAnalysis;
  } catch (error) {
    console.error('Erro ao analisar objetivo de aprendizado:', error);
    throw new Error('Falha ao processar sua solicitação. Tente novamente.');
  }
}

export async function generateFollowUpQuestions(topic: string, level: string): Promise<string[]> {
  const prompt = `
    Gere 3 perguntas de acompanhamento para ajudar o usuário a refinar seu aprendizado sobre "${topic}" no nível "${level}".
    
    Responda APENAS com um array JSON de strings:
    ["pergunta1", "pergunta2", "pergunta3"]
  `;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return [];

    return JSON.parse(content) as string[];
  } catch (error) {
    console.error('Erro ao gerar perguntas de acompanhamento:', error);
    return [];
  }
}

// ============================================================================
// FUNÇÕES PARA AULA-TEXTO MELHORADA
// ============================================================================

/**
 * Sanitiza resposta JSON da OpenAI removendo cercas de código e caracteres inválidos
 */
function sanitizeJsonFromOpenAI(content: string): string {
  // Remove cercas de código
  content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');

  // Remove caracteres de controle
  content = content.replace(/[\u0000-\u0019\u007f-\u009f]/g, ' ');

  // Remove vírgulas penduradas
  content = content.replace(/,(\s*[}\]])/g, '$1');

  // Extrai apenas o JSON se houver texto extra
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  return jsonMatch ? jsonMatch[0] : content;
}

/**
 * Parser JSON robusto com retry automático
 */
async function parseJsonWithRetry(
  content: string,
  topic: string,
  maxRetries = 2
): Promise<AulaTextoStructure> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const sanitized = sanitizeJsonFromOpenAI(content);
      const parsed = JSON.parse(sanitized);

      // Validar estrutura
      const validation = validateAulaTextoStructure(parsed);
      if (!validation.isValid) {
        throw new Error(`Estrutura inválida: ${validation.errors.join(', ')}`);
      }

      return parsed as AulaTextoStructure;
    } catch (error) {
      console.log(`❌ Tentativa ${attempt + 1} falhou:`, error);

      if (attempt === maxRetries) {
        // Última tentativa: tentar corrigir com OpenAI
        console.log('🔄 Tentando corrigir JSON com OpenAI...');

        try {
          const correction = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: "Corrija este JSON para que seja válido. Mantenha todo o conteúdo, apenas corrija a sintaxe. Responda APENAS com o JSON corrigido."
              },
              {
                role: "user",
                content: `Corrija este JSON:\n${content.substring(0, 4000)}`
              }
            ],
            temperature: 0,
            max_tokens: 2000
          });

          const correctedContent = correction.choices[0]?.message?.content;
          if (correctedContent) {
            const correctedSanitized = sanitizeJsonFromOpenAI(correctedContent);
            return JSON.parse(correctedSanitized) as AulaTextoStructure;
          }
        } catch (correctionError) {
          console.error('❌ Falha na correção automática:', correctionError);
        }

        // Fallback final
        throw new Error(`Falha ao processar JSON após ${maxRetries + 1} tentativas`);
      }
    }
  }

  throw new Error('Erro inesperado no parsing');
}

/**
 * Gera aula-texto seguindo princípios pedagógicos científicos
 */
export async function generateAulaTexto(config: AulaTextoConfig): Promise<{
  aulaTexto: AulaTextoStructure;
  tokensUsed: number;
  qualityScore?: number;
}> {
  console.log(`🎯 Gerando aula-texto para: "${config.topic}" (nível: ${config.level})`);

  const prompt = buildAulaTextoPrompt(config);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 4000,
      timeout: 30000, // 30 segundos timeout
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Resposta vazia da OpenAI');
    }

    console.log('📝 Resposta recebida, processando JSON...');

    // Parse robusto com validação
    const aulaTexto = await parseJsonWithRetry(content, config.topic);

    // Adicionar metadados
    aulaTexto.metadata = {
      generatedAt: new Date().toISOString(),
      sources: config.ragContext ? ['RAG Context', 'OpenAI Knowledge'] : ['OpenAI Knowledge'],
      tokensUsed: completion.usage?.total_tokens || 0
    };

    console.log(`✅ Aula-texto gerada com sucesso: ${aulaTexto.desenvolvimento.conceitos.length} conceitos`);

    return {
      aulaTexto,
      tokensUsed: completion.usage?.total_tokens || 0
    };
  } catch (error) {
    console.error('❌ Erro ao gerar aula-texto:', error);

    // Fallback com estrutura mínima
    console.log('🔄 Gerando conteúdo de fallback...');

    const fallbackAulaTexto: AulaTextoStructure = {
      topic: config.topic,
      level: config.level,
      metadata: {
        generatedAt: new Date().toISOString(),
        sources: ['Fallback'],
        tokensUsed: 0
      },
      introducao: {
        objetivos: [`Compreender os conceitos fundamentais de ${config.topic}`],
        preRequisitos: ['Conhecimentos básicos da área'],
        tempoEstimado: '30-45 minutos',
        overview: `Esta aula apresenta uma introdução a ${config.topic}. Este é um conteúdo de fallback gerado automaticamente devido a problemas na geração dinâmica.`
      },
      desenvolvimento: {
        conceitos: [{
          titulo: `Conceitos fundamentais de ${config.topic}`,
          definicao: `${config.topic} é um tópico importante na área de estudo`,
          explicacao: 'Este é um conteúdo de fallback. O sistema não conseguiu gerar a aula completa no momento.',
          exemplos: [{
            titulo: 'Exemplo básico',
            descricao: 'Exemplo não disponível no momento',
            solucao: 'Solução não disponível no momento'
          }],
          analogias: ['Analogia não disponível no momento']
        }]
      },
      conclusao: {
        resumoExecutivo: `Resumo do tópico ${config.topic}. Este conteúdo de fallback foi gerado automaticamente.`,
        pontosChave: [`Conceitos básicos de ${config.topic}`],
        conexoesFuturas: ['Tópicos relacionados para estudo futuro']
      },
      verificacao: {
        perguntasReflexao: ['Questão de reflexão não disponível no momento'],
        exercicios: [{
          pergunta: 'Exercício não disponível no momento',
          dificuldade: 'medio' as const,
          gabarito: 'Resposta não disponível no momento',
          explicacao: 'Explicação não disponível no momento'
        }],
        autoavaliacao: ['Auto-avaliação não disponível no momento']
      },
      referencias: []
    };

    return {
      aulaTexto: fallbackAulaTexto,
      tokensUsed: 0,
      qualityScore: 3.0 // Score baixo para fallback
    };
  }
}

/**
 * Avalia qualidade da aula-texto usando rubrica científica
 */
export async function evaluateAulaTextoQuality(
  aulaTexto: AulaTextoStructure,
  ragContext?: RAGContext[]
): Promise<AulaTextoQualityAssessment> {
  console.log('📊 Avaliando qualidade da aula-texto...');

  // Preparar contexto para verificação factual
  const contextInfo = ragContext
    ? `\n\nCONTEXTO PARA VERIFICAÇÃO FACTUAL:\n${ragContext.map(c => c.content.substring(0, 500)).join('\n---\n')}`
    : '';

  const evaluationPrompt = `${SYSTEM_PROMPT_AVALIACAO}

AULA-TEXTO PARA AVALIAÇÃO:
${JSON.stringify(aulaTexto, null, 2)}${contextInfo}

Avalie seguindo a rubrica especificada e retorne um JSON válido com o formato exato especificado.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: evaluationPrompt
        }
      ],
      temperature: 0.1,
      max_tokens: 1500,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Resposta vazia da OpenAI');
    }

    const sanitized = sanitizeJsonFromOpenAI(content);
    const assessment = JSON.parse(sanitized) as AulaTextoQualityAssessment;

    console.log(`✅ Avaliação concluída: Score ${assessment.score}/10`);

    return assessment;
  } catch (error) {
    console.error('❌ Erro ao avaliar qualidade:', error);

    // Fallback com checklist básico
    const basicChecklist = QUALITY_CHECKLIST.map(item => ({
      item: item.item,
      ok: item.check(aulaTexto),
      comentario: item.check(aulaTexto) ? 'Presente' : 'Ausente'
    }));

    const basicScore = basicChecklist.filter(item => item.ok).length / basicChecklist.length * 10;

    return {
      score: Math.round(basicScore * 100) / 100,
      detalhamento: {
        clareza: { pontos: 7, comentario: 'Avaliação básica' },
        completude: { pontos: 7, comentario: 'Avaliação básica' },
        precisao: { pontos: 7, comentario: 'Avaliação básica' },
        exemplos: { pontos: 7, comentario: 'Avaliação básica' },
        exercicios: { pontos: 7, comentario: 'Avaliação básica' },
        adequacao: { pontos: 7, comentario: 'Avaliação básica' }
      },
      checklist: basicChecklist,
      feedback: ['Avaliação automática não disponível'],
      needsRewrite: basicScore < 8,
      strengths: ['Conteúdo gerado'],
      improvementAreas: ['Avaliação detalhada necessária']
    };
  }
}

/**
 * Melhora aula-texto baseada em feedback de qualidade
 */
export async function improveAulaTexto(
  aulaTexto: AulaTextoStructure,
  assessment: AulaTextoQualityAssessment
): Promise<AulaTextoStructure> {
  if (!assessment.needsRewrite) {
    console.log('✅ Aula-texto já tem qualidade satisfatória, não precisa melhoria');
    return aulaTexto;
  }

  console.log('🔧 Melhorando aula-texto baseada no feedback...');

  const improvementPrompt = SYSTEM_PROMPT_MELHORIA.replace(
    '{feedback_areas}',
    assessment.improvementAreas.join(', ')
  );

  const fullPrompt = `${improvementPrompt}

TEXTO ORIGINAL:
${JSON.stringify(aulaTexto, null, 2)}

FEEDBACK ESPECÍFICO:
${assessment.feedback.join('\n- ')}

Retorne o JSON da aula-texto melhorada, mantendo a estrutura original mas aplicando as melhorias sugeridas.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: fullPrompt
        }
      ],
      temperature: 0.2,
      max_tokens: 4000,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Resposta vazia da OpenAI');
    }

    const improvedAulaTexto = await parseJsonWithRetry(content, aulaTexto.topic);

    // Atualizar metadados
    improvedAulaTexto.metadata = {
      ...aulaTexto.metadata,
      qualityScore: assessment.score,
      generatedAt: new Date().toISOString()
    };

    console.log('✅ Aula-texto melhorada com sucesso');

    return improvedAulaTexto;
  } catch (error) {
    console.error('❌ Erro ao melhorar aula-texto:', error);

    // Retornar original se melhoria falhar
    return aulaTexto;
  }
}

/**
 * Pipeline completo: gera + avalia + melhora se necessário
 */
export async function generateHighQualityAulaTexto(
  config: AulaTextoConfig,
  ragContext?: RAGContext[]
): Promise<{
  aulaTexto: AulaTextoStructure;
  assessment: AulaTextoQualityAssessment;
  tokensUsed: number;
  improved: boolean;
}> {
  console.log('🚀 Iniciando pipeline de geração de aula-texto de alta qualidade...');

  // 1. Gerar aula-texto inicial
  const { aulaTexto: initialAulaTexto, tokensUsed: initialTokens } = await generateAulaTexto(config);

  // 2. Avaliar qualidade
  const assessment = await evaluateAulaTextoQuality(initialAulaTexto, ragContext);

  let finalAulaTexto = initialAulaTexto;
  let improved = false;
  let totalTokens = initialTokens;

  // 3. Melhorar se necessário
  if (assessment.needsRewrite && assessment.score < 8) {
    console.log(`📈 Score ${assessment.score}/10 baixo, iniciando melhoria...`);

    try {
      finalAulaTexto = await improveAulaTexto(initialAulaTexto, assessment);
      improved = true;

      // Re-avaliar após melhoria
      const newAssessment = await evaluateAulaTextoQuality(finalAulaTexto, ragContext);
      console.log(`📊 Score após melhoria: ${newAssessment.score}/10`);

      // Atualizar assessment com novo score
      assessment.score = newAssessment.score;
      assessment.needsRewrite = newAssessment.needsRewrite;

    } catch (error) {
      console.error('⚠️ Erro na melhoria, mantendo versão original:', error);
    }
  }

  finalAulaTexto.metadata.qualityScore = assessment.score;

  console.log(`✅ Pipeline concluído: Score final ${assessment.score}/10, Melhorado: ${improved}`);

  return {
    aulaTexto: finalAulaTexto,
    assessment,
    tokensUsed: totalTokens,
    improved
  };
}