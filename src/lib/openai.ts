import OpenAI from 'openai';
import {
  AulaTextoStructure,
  AulaTextoConfig,
  AulaTextoQualityAssessment,
  RAGContext,
  Prerequisite,
  SupportCourse,
  Module,
  Section
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
  modules: Array<{
    title: string;
    description: string;
    order: number;
    estimatedDuration: string;
    sections: Array<{
      title: string;
      description: string;
      order: number;
      topics: Array<{
        title: string;
        description: string;
        keywords: string[];
        order: number;
        contentType: 'video' | 'aula-texto' | 'exercise';
        estimatedDuration: string;
      }>;
    }>;
  }>;
  topics: Array<{
    title: string;
    description: string;
    keywords: string[];
    order: number;
  }>; // Mantém compatibilidade
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

export async function analyzeLearningGoal(userMessage: string, level?: string, uploadedFiles?: any[]): Promise<LearningAnalysis> {
  const prompt = `
    Analise a seguinte mensagem do usuário e crie uma estrutura hierárquica de aprendizado seguindo o modelo do Responde Aí:

    ESTRUTURA DESEJADA:
    - MÓDULOS (ex: "PRÉ-CÁLCULO", "LIMITES", "DERIVADAS")
    - SEÇÕES dentro de cada módulo (ex: "Funções", "Gráficos", "Operações")
    - TÓPICOS dentro de cada seção (ex: "Função do 1º grau", "Função quadrática")

    Mensagem do usuário: "${userMessage}"
    ${level ? `Nível especificado: ${level}` : ''}

    Responda APENAS com um JSON válido no seguinte formato:
    {
      "subject": "nome do assunto",
      "level": "beginner|intermediate|advanced",
      "modules": [
        {
          "title": "NOME DO MÓDULO",
          "description": "Descrição do módulo",
          "order": 1,
          "estimatedDuration": "2 semanas",
          "sections": [
            {
              "title": "Nome da Seção",
              "description": "Descrição da seção",
              "order": 1,
              "topics": [
                {
                  "title": "Nome do Tópico",
                  "description": "Descrição do tópico",
                  "keywords": ["palavra-chave1", "palavra-chave2"],
                  "order": 1,
                  "contentType": "video|aula-texto|exercise",
                  "estimatedDuration": "30 min"
                }
              ]
            }
          ]
        }
      ],
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

    DIRETRIZES:
    - Crie 2-4 módulos principais
    - Cada módulo deve ter 2-4 seções
    - Cada seção deve ter 3-6 tópicos
    - Use nomes em MAIÚSCULO para módulos (como "FUNÇÕES", "LIMITES")
    - Seções e tópicos em formato normal
    - Varie o contentType: intercale vídeos, aula-texto e exercícios
    - Seja específico e pedagógico na organização
  `;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Resposta vazia da OpenAI');
    }

    const cleanContent = sanitizeJsonFromOpenAI(content);
    const analysis = JSON.parse(cleanContent) as LearningAnalysis;

    // Garantir que a estrutura de compatibilidade existe
    if (!analysis.topics && analysis.modules) {
      analysis.topics = analysis.modules.flatMap(module =>
        module.sections.flatMap(section =>
          section.topics.map(topic => ({
            title: topic.title,
            description: topic.description,
            keywords: topic.keywords,
            order: topic.order
          }))
        )
      );
    }

    return analysis;
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

/**
 * Gera lista de pré-requisitos para um curso
 */
export async function generatePrerequisites(
  courseTitle: string,
  courseDescription: string,
  level: 'beginner' | 'intermediate' | 'advanced',
  topics: string[]
): Promise<Prerequisite[]> {
  const prompt = `Como especialista em educação, analise o curso "${courseTitle}" (nível ${level}) e identifique os pré-requisitos essenciais.

DESCRIÇÃO DO CURSO: ${courseDescription}

TÓPICOS DO CURSO:
${topics.map((topic, i) => `${i + 1}. ${topic}`).join('\n')}

Identifique pré-requisitos categorizados por importância:
- ESSENCIAL: Conhecimento absolutamente necessário para compreender o curso
- RECOMENDADO: Conhecimento que facilita significativamente o aprendizado
- OPCIONAL: Conhecimento que pode ser útil mas não impede o progresso

Para cada pré-requisito, estime o tempo necessário para dominar o conhecimento.

Responda APENAS com JSON válido no formato:
{
  "prerequisites": [
    {
      "id": "prereq-1",
      "topic": "Nome do pré-requisito",
      "description": "Por que é necessário e como se relaciona com o curso",
      "importance": "essential|recommended|optional",
      "estimatedTime": "tempo estimado (ex: '2 horas', '1 semana')",
      "resources": [
        {
          "type": "course|video|article|book",
          "title": "Nome do recurso",
          "description": "Breve descrição do que cobre"
        }
      ]
    }
  ]
}

IMPORTANTE: Retorne apenas o JSON, sem explicações adicionais.`;

  try {
    console.log(`🔍 Gerando pré-requisitos para: "${courseTitle}"`);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Você é um especialista em design curricular e pré-requisitos educacionais. Responda sempre com JSON válido.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1500,
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Resposta vazia da OpenAI');
    }

    // Parse JSON da resposta
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Não foi possível encontrar JSON na resposta');
    }

    const data = JSON.parse(jsonMatch[0]);

    if (!data.prerequisites || !Array.isArray(data.prerequisites)) {
      throw new Error('Formato de resposta inválido');
    }

    console.log(`✅ ${data.prerequisites.length} pré-requisitos identificados`);

    return data.prerequisites;

  } catch (error) {
    console.error('❌ Erro ao gerar pré-requisitos:', error);

    // Fallback com pré-requisitos básicos baseados no nível
    const fallbackPrerequisites: Prerequisite[] = [];

    if (level === 'intermediate' || level === 'advanced') {
      fallbackPrerequisites.push({
        id: 'basic-math',
        topic: 'Matemática Básica',
        description: 'Conhecimentos fundamentais de álgebra e aritmética necessários para acompanhar o curso.',
        importance: 'essential',
        estimatedTime: '1-2 semanas',
        resources: [{
          type: 'course',
          title: 'Revisão de Matemática Básica',
          description: 'Curso de nivelamento em matemática fundamental'
        }]
      });
    }

    if (level === 'advanced') {
      fallbackPrerequisites.push({
        id: 'intermediate-concepts',
        topic: 'Conceitos Intermediários',
        description: 'Domínio dos conceitos de nível intermediário da área de estudo.',
        importance: 'essential',
        estimatedTime: '2-4 semanas',
        resources: [{
          type: 'course',
          title: 'Curso Intermediário da Área',
          description: 'Preparação para conceitos avançados'
        }]
      });
    }

    return fallbackPrerequisites;
  }
}

/**
 * Detecta dificuldades do aluno e sugere cursos de apoio
 */
export async function detectLearningDifficulties(
  chatHistory: string[],
  currentTopic: string,
  courseTitle: string
): Promise<{
  hasProblems: boolean;
  missingKnowledge: string[];
  suggestedSupportCourses: SupportCourse[];
  recommendation: string;
}> {
  const prompt = `Analise as dúvidas do aluno para detectar se há dificuldades com pré-requisitos.

CURSO: "${courseTitle}"
TÓPICO ATUAL: "${currentTopic}"

HISTÓRICO DE DÚVIDAS:
${chatHistory.map((msg, i) => `${i + 1}. ${msg}`).join('\n')}

Com base nas perguntas, identifique:
1. Se o aluno tem dificuldades com conhecimentos básicos necessários
2. Quais conhecimentos específicos estão faltando
3. Se seria útil fazer um curso de apoio antes de continuar

Responda APENAS com JSON:
{
  "hasProblems": boolean,
  "missingKnowledge": ["conhecimento 1", "conhecimento 2"],
  "recommendation": "texto explicando a situação e recomendação",
  "suggestedCourses": [
    {
      "id": "support-1",
      "title": "Título do curso de apoio",
      "description": "Para que serve e como ajuda",
      "prerequisiteFor": "tópico atual",
      "topics": ["tópico 1", "tópico 2"],
      "estimatedDuration": "tempo estimado",
      "difficulty": "beginner|intermediate"
    }
  ]
}`;

  try {
    console.log(`🔍 Analisando dificuldades para: "${currentTopic}"`);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Você é um especialista em detectar lacunas de conhecimento em estudantes. Responda sempre com JSON válido.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1000,
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Resposta vazia da OpenAI');
    }

    // Parse JSON da resposta
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Não foi possível encontrar JSON na resposta');
    }

    const data = JSON.parse(jsonMatch[0]);

    console.log(`✅ Análise de dificuldades concluída: ${data.hasProblems ? 'Problemas detectados' : 'Sem problemas'}`);

    return {
      hasProblems: data.hasProblems || false,
      missingKnowledge: data.missingKnowledge || [],
      suggestedSupportCourses: data.suggestedCourses || [],
      recommendation: data.recommendation || 'Continue com o curso atual.'
    };

  } catch (error) {
    console.error('❌ Erro ao detectar dificuldades:', error);

    return {
      hasProblems: false,
      missingKnowledge: [],
      suggestedSupportCourses: [],
      recommendation: 'Continue estudando. Se tiver dúvidas, use o chat para pedir ajuda.'
    };
  }
}