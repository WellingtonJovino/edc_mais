import OpenAI from 'openai';
import { detectUniversityDiscipline, getExpandedStructureHints } from './university-courses-detector';
import { getAcademicTemplate, adaptTemplateForUserGoal } from './academic-curriculum-templates';
import { generatePerplexityPrompt } from '../../new_functions';
import { validateAndImproveFinalStructure, ensureMinimumQualityStandards } from '../../final_validation';

// Configurar limpeza automática do cache
if (typeof global !== 'undefined') {
  (async () => {
    try {
      const { setupAutomaticCleanup } = await import('./cache');
      setupAutomaticCleanup(60); // Cleanup a cada 60 minutos
      console.log('🔄 Cache automatic cleanup configurado');
    } catch (error) {
      console.warn('⚠️ Erro ao configurar cleanup automático do cache:', error);
    }
  })();
}
import {
  AulaTextoStructure,
  AulaTextoConfig,
  AulaTextoQualityAssessment,
  RAGContext,
  Prerequisite,
  SupportCourse,
  Module,
  Section,
  BookRecommendation
} from '@/types';
import {
  buildAulaTextoPrompt,
  SYSTEM_PROMPT_AVALIACAO,
  SYSTEM_PROMPT_MELHORIA,
  validateAulaTextoStructure,
  QUALITY_CHECKLIST
} from './prompts/aulaTexto';
import { buildAulaTextoRespondAi } from './prompts/aulaTextoAvancado';
import { generateScoringReport } from './evidence-scoring';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface LearningAnalysis {
  courseTitle: string; // Título do curso (ex: "Cálculo A")
  subject: string;
  level: 'beginner' | 'intermediate' | 'advanced';

  // Nova estrutura: Course → Module → Topic
  modules: Array<{
    title: string; // Ex: "Funções", "Limites"
    description: string;
    order: number;
    estimatedDuration: string;
    learningObjectives: string[];

    // Tópicos diretamente dentro do módulo
    topics: Array<{
      title: string; // Ex: "Função do 1º Grau"
      description: string;
      detailedDescription: string; // Descrição do que será aprendido
      learningObjectives: string[]; // Objetivos específicos
      keyTerms: string[]; // Termos-chave para contextualização
      searchKeywords: string[]; // Para busca contextual no YouTube
      difficulty: 'easy' | 'medium' | 'hard';
      order: number;
      estimatedDuration: string;
    }>;
  }>;

  totalEstimatedHours: number;
  searchQueries: string[];

  // DEPRECATED: Manter para compatibilidade com código existente
  topics?: Array<{
    title: string;
    description: string;
    keywords: string[];
    order: number;
  }>;
}

export interface SyllabusData {
  title: string;
  description?: string;
  level: string;
  modules: Array<{
    id: string;
    title: string;
    description?: string;
    order: number;
    estimatedDuration?: string;
    topics: Array<{
      id: string;
      title: string;
      description?: string;
      order: number;
      estimatedDuration?: string;
      subtopics?: string[];
    }>;
  }>;
  totalDuration?: string;
  pedagogicalMetadata?: {
    domainAnalysis?: any;
    validationScore?: number;
    personalizations?: string[];
    improvements?: string[];
    bloomProgression?: number[];
    isFallback?: boolean;
  };
}

/**
 * Extrai o assunto principal da mensagem do usuário
 */
function extractSubjectFromMessage(userMessage: string): string {
  // Remove palavras comuns e extrai o assunto principal
  const cleanMessage = userMessage
    .toLowerCase()
    .replace(/^(quero aprender|aprender|estudar|curso de|curso sobre|como|sobre)\s+/i, '')
    .replace(/\s+(para|da|na|no|de|do|em)\s+.*/i, '')
    .trim();

  return cleanMessage || userMessage.substring(0, 50);
}

/**
 * Gera template dinâmico UNIVERSAL usando GPT-4 para QUALQUER assunto
 */
async function generateUniversalDynamicTemplate(
  subject: string,
  userMessage: string,
  level: string,
  userProfile?: any,
  contextInfo?: any,
  academicTopics: string[] = [],
  ragContext: string[] = []
): Promise<LearningAnalysis> {
  console.log(`🤖 Gerando estrutura universal para: "${subject}"`);

  // Determinar tipo de contexto para personalizar o prompt
  const contextType = determineContextType(subject, userMessage, contextInfo);

  const prompt = `Você é um especialista em design educacional. Crie uma estrutura COMPLETA e DETALHADA de aprendizado para "${subject}".

CONTEXTO DO APRENDIZADO:
- Assunto: "${subject}"
- Mensagem original: "${userMessage}"
- Nível do aluno: ${level}
${level === 'beginner' || level === 'intermediate' ? '- IMPORTANTE: Criar curso COMPLETO do INICIANTE ao AVANÇADO (não apenas o nível básico)' : ''}
- Objetivo: ${userProfile?.objective || userProfile?.purpose || 'Aprender de forma completa e profunda, equivalente a um curso universitário completo'}
- Tipo de contexto: ${contextType}
${userProfile?.specificObjectives ? `- Objetivos específicos: ${userProfile.specificObjectives.join(', ')}` : ''}
${contextInfo?.userContext?.mentionsExam ? '- IMPORTANTE: Aluno mencionou PROVA - incluir preparação para avaliações' : ''}
${contextInfo?.userContext?.mentionsProject ? '- IMPORTANTE: Aluno mencionou PROJETO - incluir módulo prático' : ''}

CONTEXTO ACADÊMICO ADICIONAL:
${academicTopics.length > 0 ? `
TÓPICOS ACADÊMICOS RECOMENDADOS (baseado em pesquisa web):
${academicTopics.map((topic, i) => `${i + 1}. ${topic}`).join('\n')}

IMPORTANTE: Use estes tópicos como REFERÊNCIA para criar módulos abrangentes e academicamente sólidos.
` : ''}

${ragContext.length > 0 ? `
CONTEXTO DOS DOCUMENTOS ENVIADOS:
${ragContext.slice(0, 5).map((context, i) => `[Fonte ${i + 1}] ${context.substring(0, 200)}...`).join('\n\n')}

IMPORTANTE: Integre o conhecimento dos documentos enviados na estrutura do curso.
` : ''}

REQUISITOS OBRIGATÓRIOS PARA CURSO COMPLETO:
1. Criar estrutura COMPLETA E ABRANGENTE equivalente a um SEMESTRE UNIVERSITÁRIO INTEIRO
2. INICIANTE ao AVANÇADO: Começar do zero absoluto e chegar ao nível avançado/profissional
3. MÍNIMO 15-25 módulos principais para cobertura completa
4. Cada módulo deve ter 8-15 tópicos específicos e detalhados
5. Total MÍNIMO de 150-300 tópicos para garantir ensino completo
6. Progressão pedagógica rigorosa: Fundamentos → Intermediário → Avançado → Aplicações
7. OBRIGATÓRIO incluir módulos de: Fundamentos, Teoria, Prática, Exercícios, Projetos, Aplicações Avançadas
8. Cada tópico deve ser específico para 1-2 horas de estudo aprofundado
9. Incluir TODOS os tópicos que seriam ensinados em uma universidade de qualidade
10. NÃO ECONOMIZAR conteúdo - ser EXTREMAMENTE ABRANGENTE e COMPLETO

ESTRUTURA OBRIGATÓRIA:
{
  "courseTitle": "Curso Completo de [ASSUNTO]",
  "subject": "${subject}",
  "level": "${level}",
  "modules": [
    {
      "title": "NOME DO MÓDULO EM MAIÚSCULO",
      "description": "Descrição detalhada do que será aprendido",
      "order": 1,
      "estimatedDuration": "1-2 semanas",
      "learningObjectives": ["objetivo1", "objetivo2", "objetivo3"],
      "topics": [
        {
          "title": "Nome específico do tópico",
          "description": "O que será aprendido neste tópico",
          "detailedDescription": "Descrição completa com conceitos e habilidades",
          "learningObjectives": ["objetivo específico 1", "objetivo 2"],
          "keyTerms": ["termo1", "termo2", "termo3"],
          "searchKeywords": ["palavra-chave1", "palavra2"],
          "difficulty": "easy|medium|hard",
          "order": 1,
          "estimatedDuration": "1-2 horas"
        }
      ]
    }
  ],
  "totalEstimatedHours": 240,
  "searchQueries": ["query1", "query2", "query3", "query4"]
}

EXEMPLO DE ESTRUTURA PARA REFERÊNCIA:
- Se INICIANTE: Começar com "Introdução e Conceitos Básicos" e ir até "Aplicações Avançadas e Projetos"
- Se INTERMEDIÁRIO: Incluir revisão básica + conteúdo intermediário + avançado
- Se AVANÇADO: Revisão rápida + foco em conteúdo avançado + projetos complexos

LEMBRE-SE: O usuário quer o curso COMPLETO de um semestre universitário, não um resumo!

DIRETRIZES POR TIPO DE CONTEXTO:
${getContextSpecificGuidelines(contextType)}

IMPORTANTE:
- Ser ESPECÍFICO e DETALHADO em cada tópico
- NÃO ser genérico - criar conteúdo útil e prático
- Adaptar para o nível ${level} do aluno
- Pensar como um educador experiente
- Garantir progressão lógica e pedagógica

Responda APENAS com JSON válido.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-2024-11-20",
      messages: [
        {
          role: 'system',
          content: 'Você é um especialista em design educacional universal. Crie estruturas de aprendizado completas para QUALQUER assunto. Responda APENAS com JSON válido.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 4000,
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Resposta vazia da OpenAI');
    }

    // DEBUG: Log do tamanho da resposta e tokens usados
    console.log(`📊 GPT Response Stats (generateUniversalDynamicTemplate):
      - Content length: ${content.length} chars
      - Tokens used: ${completion.usage?.total_tokens || 'unknown'}
      - Completion tokens: ${completion.usage?.completion_tokens || 'unknown'}
      - Prompt tokens: ${completion.usage?.prompt_tokens || 'unknown'}
      - Academic topics provided: ${academicTopics.length}`);

    const cleanContent = sanitizeJsonFromOpenAI(content);
    let analysis: LearningAnalysis;

    try {
      analysis = JSON.parse(cleanContent) as LearningAnalysis;
    } catch (parseError) {
      console.error('❌ Erro de parsing JSON:', parseError);
      console.log('📄 Conteúdo que causou erro (primeiros 500 chars):', cleanContent.substring(0, 500));

      // Tentar correção automática com GPT-4
      try {
        console.log('🔄 Tentando correção automática com GPT-4...');
        const correction = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "Corrija este JSON malformado e retorne APENAS o JSON válido, sem explicações:"
            },
            {
              role: "user",
              content: cleanContent.substring(0, 4000) // Limitar tamanho
            }
          ],
          max_tokens: 4000,
          temperature: 0
        });

        const correctedContent = correction.choices[0]?.message?.content;
        if (correctedContent) {
          const correctedClean = sanitizeJsonFromOpenAI(correctedContent);
          analysis = JSON.parse(correctedClean) as LearningAnalysis;
          console.log('✅ JSON corrigido com sucesso pelo GPT-4');
        } else {
          throw new Error('Correção automática falhou');
        }
      } catch (correctionError) {
        console.error('❌ Correção automática falhou:', correctionError);
        throw new Error(`Falha ao processar JSON da OpenAI: ${parseError}`);
      }
    }

    // Garantir estrutura de compatibilidade
    if (!analysis.topics && analysis.modules) {
      analysis.topics = analysis.modules.flatMap(module =>
        module.topics?.map(topic => ({
          title: topic.title,
          description: topic.description,
          keywords: topic.keyTerms || topic.searchKeywords || [],
          order: topic.order
        })) || []
      );
    }

    // Garantir totalEstimatedHours
    if (!analysis.totalEstimatedHours) {
      analysis.totalEstimatedHours = Math.ceil(
        analysis.modules.reduce((acc, module) =>
          acc + (module.topics?.length || 0), 0
        ) * 1.5
      );
    }

    // DEBUG detalhado da estrutura gerada
    const moduleTopicsCount = analysis.modules?.reduce((acc, m) => acc + (m.topics?.length || 0), 0) || 0;
    console.log(`✅ Estrutura universal gerada:
      - Módulos: ${analysis.modules.length}
      - Tópicos nos módulos: ${moduleTopicsCount}
      - Tópicos array direto: ${analysis.topics?.length || 0}
      - Academic topics fornecidos: ${academicTopics.length}
      - RAG context snippets: ${ragContext.length}`);

    return analysis;

  } catch (error) {
    console.error('❌ Erro ao gerar estrutura universal:', error);
    throw error;
  }
}

/**
 * Determina o tipo de contexto para personalizar a geração
 */
function determineContextType(subject: string, userMessage: string, contextInfo?: any): string {
  const subjectLower = subject.toLowerCase();
  const messageLower = userMessage.toLowerCase();

  if (contextInfo?.isUniversityDiscipline) {
    return 'acadêmico_universitário';
  }

  if (messageLower.includes('programação') || messageLower.includes('programar') ||
      subjectLower.includes('programação') || subjectLower.includes('código')) {
    return 'técnico_programação';
  }

  if (messageLower.includes('culinária') || messageLower.includes('cozinhar') ||
      subjectLower.includes('culinária') || subjectLower.includes('receita')) {
    return 'prático_culinária';
  }

  if (messageLower.includes('idioma') || messageLower.includes('língua') ||
      messageLower.includes('inglês') || messageLower.includes('espanhol')) {
    return 'idiomas';
  }

  if (messageLower.includes('negócio') || messageLower.includes('empresa') ||
      messageLower.includes('empreender') || subjectLower.includes('administração')) {
    return 'negócios';
  }

  return 'geral';
}

/**
 * Retorna diretrizes específicas por tipo de contexto
 */
function getContextSpecificGuidelines(contextType: string): string {
  const guidelines = {
    'acadêmico_universitário': `
- Incluir teoria fundamental e aplicações práticas
- Adicionar módulo de exercícios e preparação para provas
- Incluir laboratório/projetos quando aplicável
- Seguir progressão pedagógica universitária rigorosa`,

    'técnico_programação': `
- Incluir projetos práticos em cada módulo
- Adicionar módulo de desenvolvimento de portfólio
- Focar em aplicações do mundo real
- Incluir boas práticas e debugging`,

    'prático_culinária': `
- Incluir receitas práticas em cada módulo
- Progressão de técnicas básicas para avançadas
- Adicionar módulo de planejamento de menu
- Incluir segurança alimentar e técnicas fundamentais`,

    'idiomas': `
- Incluir conversação desde o início
- Adicionar módulos de gramática e vocabulário
- Incluir cultura e contexto
- Progressão A1 até B2/C1 dependendo do nível`,

    'negócios': `
- Incluir estudos de caso reais
- Adicionar módulo de aplicação prática
- Focar em ROI e resultados mensuráveis
- Incluir networking e desenvolvimento profissional`,

    'geral': `
- Equilibrar teoria e prática
- Incluir exercícios aplicados
- Adicionar projetos quando relevante
- Focar em aplicabilidade no mundo real`
  };

  return guidelines[contextType as keyof typeof guidelines] || guidelines['geral'];
}

/**
 * Gera template dinâmico completo usando GPT-4 para qualquer disciplina (DEPRECATED - usar generateUniversalDynamicTemplate)
 */
async function generateDynamicTemplate(
  disciplineName: string,
  userMessage: string,
  level: string,
  userProfile?: any,
  userContext?: any
): Promise<LearningAnalysis> {
  console.log(`🤖 Gerando template dinâmico completo para: ${disciplineName}`);

  const prompt = `Você é um especialista em design curricular universitário. Crie uma estrutura COMPLETA e DETALHADA de curso para "${disciplineName}".

CONTEXTO DO ALUNO:
- Mensagem original: "${userMessage}"
- Nível: ${level}
- Objetivo: ${userProfile?.objective || 'Aprender de forma completa'}
- Objetivos específicos: ${userProfile?.specificObjectives?.join(', ') || 'Domínio completo da disciplina'}
${userContext?.mentionsExam ? '- IMPORTANTE: Aluno mencionou PROVA - incluir módulo de exercícios e preparação' : ''}
${userContext?.mentionsProject ? '- IMPORTANTE: Aluno mencionou PROJETO - incluir módulo prático/laboratório' : ''}

REQUISITOS ESSENCIAIS:
1. Criar estrutura IGUAL ou MELHOR que a de "Cálculo Numérico" (que tem 63 tópicos)
2. Mínimo de 8-12 módulos principais
3. Cada módulo deve ter 5-10 tópicos específicos
4. Total mínimo de 50-70 tópicos
5. Incluir módulo de exercícios e preparação para provas
6. Incluir módulo de laboratório/prática quando aplicável
7. Progressão pedagógica clara do básico ao avançado
8. Cada tópico deve ser específico o suficiente para uma aula de 1-2 horas

ESTRUTURA OBRIGATÓRIA:
{
  "courseTitle": "Nome completo do curso",
  "subject": "${disciplineName}",
  "level": "${level}",
  "modules": [
    {
      "title": "NOME DO MÓDULO EM MAIÚSCULO",
      "description": "Descrição detalhada do que será aprendido",
      "order": 1,
      "estimatedDuration": "2-3 semanas",
      "learningObjectives": ["objetivo1", "objetivo2", "objetivo3"],
      "topics": [
        {
          "title": "Nome específico do tópico",
          "description": "O que será aprendido neste tópico",
          "detailedDescription": "Descrição completa com conceitos, técnicas e aplicações",
          "learningObjectives": ["objetivo específico 1", "objetivo 2", "objetivo 3"],
          "keyTerms": ["termo1", "termo2", "termo3", "termo4"],
          "searchKeywords": ["palavra-chave1", "palavra2", "palavra3"],
          "difficulty": "easy|medium|hard",
          "order": 1,
          "estimatedDuration": "1-2 horas"
        }
      ]
    }
  ],
  "totalEstimatedHours": 80,
  "searchQueries": ["query1", "query2"]
}

IMPORTANTE:
- Criar estrutura COMPLETA e PROFUNDA
- NÃO ser genérico - ser ESPECÍFICO em cada tópico
- Cobrir TODOS os aspectos importantes da disciplina
- Incluir teoria, prática, exercícios e aplicações
- Pensar como um professor universitário experiente

Responda APENAS com JSON válido.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-2024-11-20",
      messages: [
        {
          role: 'system',
          content: 'Você é um especialista em design curricular universitário. Crie currículos completos e detalhados. Responda APENAS com JSON válido.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 4000,
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Resposta vazia da OpenAI');
    }

    const cleanContent = sanitizeJsonFromOpenAI(content);
    let analysis: LearningAnalysis;

    try {
      analysis = JSON.parse(cleanContent) as LearningAnalysis;
    } catch (parseError) {
      console.error('❌ Erro de parsing JSON:', parseError);
      console.log('📄 Conteúdo que causou erro (primeiros 500 chars):', cleanContent.substring(0, 500));

      // Tentar correção automática com GPT-4
      try {
        console.log('🔄 Tentando correção automática com GPT-4...');
        const correction = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "Corrija este JSON malformado e retorne APENAS o JSON válido, sem explicações:"
            },
            {
              role: "user",
              content: cleanContent.substring(0, 4000) // Limitar tamanho
            }
          ],
          max_tokens: 4000,
          temperature: 0
        });

        const correctedContent = correction.choices[0]?.message?.content;
        if (correctedContent) {
          const correctedClean = sanitizeJsonFromOpenAI(correctedContent);
          analysis = JSON.parse(correctedClean) as LearningAnalysis;
          console.log('✅ JSON corrigido com sucesso pelo GPT-4');
        } else {
          throw new Error('Correção automática falhou');
        }
      } catch (correctionError) {
        console.error('❌ Correção automática falhou:', correctionError);
        throw new Error(`Falha ao processar JSON da OpenAI: ${parseError}`);
      }
    }

    // Garantir estrutura de compatibilidade
    if (!analysis.topics && analysis.modules) {
      analysis.topics = analysis.modules.flatMap(module =>
        module.topics?.map(topic => ({
          title: topic.title,
          description: topic.description,
          keywords: topic.keyTerms || topic.searchKeywords || [],
          order: topic.order
        })) || []
      );
    }

    // Garantir totalEstimatedHours
    if (!analysis.totalEstimatedHours) {
      analysis.totalEstimatedHours = Math.ceil(
        analysis.modules.reduce((acc, module) =>
          acc + (module.topics?.length || 0), 0
        ) * 1.5
      );
    }

    console.log(`✅ Template dinâmico gerado: ${analysis.modules.length} módulos, ${analysis.topics?.length} tópicos`);
    return analysis;

  } catch (error) {
    console.error('❌ Erro ao gerar template dinâmico:', error);
    throw error;
  }
}

/**
 * Melhora template baseado no relatório de validação pedagógica
 */
async function improveTemplateBasedOnValidation(
  template: LearningAnalysis,
  validationReport: any,
  academicTopics: string[],
  ragContext: string[]
): Promise<LearningAnalysis> {
  console.log('🔧 Melhorando template baseado na validação pedagógica...');

  const improvementPrompt = `Você é um especialista em design educacional. Melhore a estrutura do curso baseado no relatório de validação.

ESTRUTURA ATUAL:
${JSON.stringify(template, null, 2)}

RELATÓRIO DE VALIDAÇÃO:
- Score atual: ${validationReport.overallScore}/10
- Falhas críticas: ${validationReport.criticalFailures.join(', ')}
- Recomendações: ${validationReport.recommendations.join(', ')}
- Problemas pedagógicos: ${validationReport.pedagogicalIssues.join(', ')}

CONTEXTO ADICIONAL:
${academicTopics.length > 0 ? `Tópicos acadêmicos: ${academicTopics.slice(0, 10).join(', ')}` : ''}
${ragContext.length > 0 ? `Contexto dos documentos disponível` : ''}

INSTRUÇÕES PARA MELHORIA:
1. Corrija TODAS as falhas críticas identificadas
2. Implemente as recomendações do relatório
3. Mantenha a estrutura JSON igual, apenas melhore o conteúdo
4. Foque em: sequência pedagógica, granularidade apropriada, cobertura completa
5. Se houver problemas de pré-requisitos, reordene os módulos/tópicos
6. Se módulos estão muito longos/curtos, ajuste a granularidade

Responda APENAS com o JSON melhorado da estrutura completa:`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Você é um especialista em design educacional que corrige problemas pedagógicos em currículos. Responda apenas com JSON válido."
        },
        {
          role: "user",
          content: improvementPrompt
        }
      ],
      max_tokens: 4000,
      temperature: 0.2,
    });

    const improvedContent = completion.choices[0].message.content?.trim();
    if (!improvedContent) {
      throw new Error('Resposta vazia do OpenAI na melhoria');
    }

    const improvedTemplate = JSON.parse(improvedContent);
    console.log('✅ Template melhorado baseado na validação');
    return improvedTemplate;

  } catch (error) {
    console.error('❌ Erro na melhoria baseada em validação:', error);
    return template; // Retorna template original se falhar
  }
}

/**
 * Valida e melhora template gerado com uma segunda passada do GPT-4
 */
async function validateAndImproveTemplate(
  template: LearningAnalysis,
  disciplineName: string,
  userProfile?: any
): Promise<LearningAnalysis> {
  console.log('🔍 Validando e melhorando template com GPT-4...');

  const totalTopics = template.modules.reduce((acc, m) => acc + (m.topics?.length || 0), 0);

  const validationPrompt = `Você é um especialista em design curricular. Analise esta estrutura de curso e sugira melhorias.

DISCIPLINA: "${disciplineName}"
PERFIL DO ALUNO:
- Nível: ${userProfile?.level || 'intermediate'}
- Objetivo: ${userProfile?.objective || 'Aprender de forma completa'}
- Objetivos específicos: ${userProfile?.specificObjectives?.join(', ') || 'Domínio completo'}

ESTRUTURA ATUAL:
${JSON.stringify(template, null, 2)}

ANÁLISE NECESSÁRIA:
1. Esta estrutura está COMPLETA para ensinar ${disciplineName}?
2. Existem tópicos importantes FALTANDO?
3. A progressão pedagógica está correta?
4. Os módulos cobrem teoria E prática?
5. Há exercícios e preparação para avaliações?

CRITÉRIOS DE QUALIDADE:
- Mínimo de 50-70 tópicos no total (atual: ${totalTopics})
- Progressão do básico ao avançado
- Equilíbrio entre teoria e prática
- Inclusão de exercícios e projetos
- Especificidade nos tópicos (não genéricos)

Se a estrutura precisar de melhorias, retorne a estrutura MELHORADA e EXPANDIDA.
Se estiver adequada, retorne a mesma estrutura com uma flag "validated": true.

IMPORTANTE:
- Se faltar conteúdo, ADICIONE mais módulos e tópicos
- Se tiver menos de 50 tópicos, EXPANDA significativamente
- Mantenha o formato JSON idêntico ao original
- Adicione campo "validationNotes" com suas observações

Responda APENAS com JSON válido.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-2024-11-20",
      messages: [
        {
          role: 'system',
          content: 'Você é um especialista em validação curricular. Analise e melhore currículos acadêmicos. Responda APENAS com JSON válido.'
        },
        {
          role: 'user',
          content: validationPrompt
        }
      ],
      max_tokens: 4000,
      temperature: 0.2,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      console.log('⚠️ Sem resposta de validação, mantendo template original');
      return template;
    }

    const cleanContent = sanitizeJsonFromOpenAI(content);
    const validatedTemplate = JSON.parse(cleanContent) as LearningAnalysis & { validationNotes?: string };

    // Garantir estrutura de compatibilidade
    if (!validatedTemplate.topics && validatedTemplate.modules) {
      validatedTemplate.topics = validatedTemplate.modules.flatMap(module =>
        module.topics?.map(topic => ({
          title: topic.title,
          description: topic.description,
          keywords: topic.keyTerms || topic.searchKeywords || [],
          order: topic.order
        })) || []
      );
    }

    const newTotalTopics = validatedTemplate.modules.reduce((acc, m) => acc + (m.topics?.length || 0), 0);
    console.log(`✅ Template validado e melhorado: ${validatedTemplate.modules.length} módulos, ${newTotalTopics} tópicos`);

    if (validatedTemplate.validationNotes) {
      console.log(`📝 Notas de validação: ${validatedTemplate.validationNotes}`);
    }

    return validatedTemplate;

  } catch (error) {
    console.error('❌ Erro na validação, mantendo template original:', error);
    return template;
  }
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

export async function analyzeLearningGoal(userMessage: string, level?: string, uploadedFiles?: any[], userProfile?: any): Promise<LearningAnalysis> {
  console.log('🚀 Gerando estrutura completa com IA para:', userMessage);

  try {
    // Importar processador de tópicos
    const { processTopicsIntoCourse } = await import('./topic-processor');

    // Usar a mensagem original como assunto
    const subject = userMessage;

    // STEP 1: Buscar tópicos acadêmicos recomendados com Perplexity
    console.log('📚 Buscando tópicos acadêmicos recomendados...');
    let academicTopics: string[] = [];
    let ragContext: string[] = [];
    let ragSources: string[] = [];

    try {
      // STEP 1A: Gerar prompt otimizado para Perplexity usando GPT
      const optimizedPrompt = await generatePerplexityPrompt(subject);
      console.log('📝 Prompt Perplexity otimizado gerado');

      const { searchRequiredTopics } = await import('./perplexity');
      academicTopics = await searchRequiredTopics(subject, level || 'intermediate', optimizedPrompt);
      console.log('✅ Tópicos acadêmicos encontrados:', academicTopics.length);
    } catch (perplexityError) {
      console.warn('⚠️ Erro na busca de tópicos acadêmicos:', perplexityError);
    }

    // STEP 2: Construir contexto RAG se há arquivos enviados
    if (uploadedFiles && uploadedFiles.length > 0) {
      console.log('📁 Construindo contexto RAG com arquivos enviados...');
      try {
        const { buildRAGContextForTopic } = await import('./rag');
        const ragResult = await buildRAGContextForTopic({
          topic: subject,
          level: (level as 'beginner' | 'intermediate' | 'advanced') || 'intermediate',
          maxWords: 1000
        }, uploadedFiles);

        ragContext = ragResult.ragContext;
        ragSources = ragResult.sources;
        console.log('✅ Contexto RAG construído:', ragResult.totalSnippets, 'snippets');
      } catch (ragError) {
        console.warn('⚠️ Erro na construção do contexto RAG:', ragError);
      }
    }

    // DECISÃO: Se temos muitos tópicos do Perplexity, usar processamento direto
    let dynamicTemplate: LearningAnalysis;

    // Usar threshold configur\u00e1vel (padr\u00e3o: 30)
    const TOPIC_THRESHOLD = parseInt(process.env.TOPIC_PROCESSING_THRESHOLD || '30');

    if (academicTopics.length >= TOPIC_THRESHOLD) {
      // Caso 1: Muitos tópicos - processar diretamente sem depender do GPT
      console.log(`\n🎯 PROCESSAMENTO DIRETO ATIVADO`);
      console.log(`📊 Estatísticas iniciais:`);
      console.log(`  - Tópicos do Perplexity: ${academicTopics.length}`);
      console.log(`  - Primeiros 3 tópicos:`);
      academicTopics.slice(0, 3).forEach((t, i) => {
        console.log(`    ${i+1}. ${t.substring(0, 80)}${t.length > 80 ? '...' : ''}`);
      });

      const processed = processTopicsIntoCourse(academicTopics, 15);

      console.log(`\n📊 RESULTADO DO PROCESSAMENTO:`);
      console.log(`  - Tópicos originais: ${processed.stats.originalCount}`);
      console.log(`  - Após deduplicação: ${processed.stats.deduplicatedCount}`);
      console.log(`  - Módulos criados: ${processed.stats.modulesCreated}`);
      console.log(`  - Total tópicos final: ${processed.totalTopics}`);

      console.log(`\n📚 ESTRUTURA DOS MÓDULOS:`);
      processed.modules.forEach((mod, i) => {
        console.log(`  Módulo ${i+1}: "${mod.title}" - ${mod.topics.length} tópicos`);
      });

      dynamicTemplate = {
        courseTitle: `Curso Completo de ${subject}`,
        subject,
        level: (level || 'intermediate') as 'beginner' | 'intermediate' | 'advanced',
        modules: processed.modules,
        topics: [],
        totalEstimatedHours: processed.modules.reduce((sum: number, mod: any) => {
          const hours = parseInt(mod.estimatedDuration) || 0;
          return sum + hours;
        }, 0),
        searchQueries: []
      };

      console.log(`\n✅ PIPELINE DIRETO: ${processed.totalTopics} tópicos preservados em ${processed.modules.length} módulos`);
    } else {
      // Caso 2: Poucos tópicos - usar GPT para gerar estrutura
      console.log(`\n🤖 GERAÇÃO GPT TRADICIONAL`);
      console.log(`  - Tópicos do Perplexity: ${academicTopics.length}`);
      console.log(`  - Motivo: menos de 30 tópicos encontrados`);

      dynamicTemplate = await generateUniversalDynamicTemplate(
        subject,
        userMessage,
        level || 'intermediate',
        userProfile,
        {}, // Contexto adicional vazio
        academicTopics, // Tópicos encontrados na web
        ragContext // Contexto dos arquivos
      );

      console.log(`\n📊 RESULTADO GPT:`);
      console.log(`  - Módulos gerados: ${dynamicTemplate.modules?.length || 0}`);
      const gptTopicCount = dynamicTemplate.modules?.reduce((sum, m) => sum + (m.topics?.length || 0), 0) || 0;
      console.log(`  - Total de tópicos: ${gptTopicCount}`);

      if (academicTopics.length > 0 && gptTopicCount < academicTopics.length) {
        console.warn(`  ⚠️ Redução detectada: ${academicTopics.length} → ${gptTopicCount} tópicos`);
      }
    }

    // STEP 3: Aplicar validação pedagógica avançada com auto-melhoria
    console.log('🔍 Aplicando validação pedagógica avançada...');
    let finalTemplate = dynamicTemplate;
    let improvedCount = 0;
    const maxImprovements = 2;

    try {
      const { validateSyllabus } = await import('./syllabus-validation');

      // Converter para formato esperado pela validação
      const syllabusData = {
        title: dynamicTemplate.courseTitle,
        description: `Curso completo de ${subject} (nível ${level})`,
        level: level || 'intermediate',
        modules: dynamicTemplate.modules.map(module => ({
          id: `module-${module.order}`,
          title: module.title,
          description: module.description,
          order: module.order,
          estimatedDuration: module.estimatedDuration,
          topics: module.topics.map(topic => ({
            id: `topic-${module.order}-${topic.order}`,
            title: topic.title,
            description: topic.description,
            order: topic.order,
            estimatedDuration: topic.estimatedDuration
          }))
        })),
        totalDuration: `${dynamicTemplate.totalEstimatedHours}h`,
        pedagogicalMetadata: {
          academicTopics: academicTopics,
          ragSources: ragSources
        }
      };

      // Executar validação completa
      const validationReport = await validateSyllabus(
        syllabusData,
        userMessage,
        userProfile,
        ragContext.length > 0 ? [{ confidence_score: 0.8, authority_score: 0.7 }] : undefined
      );

      console.log('📊 Resultado da validação:', {
        score: validationReport.overallScore,
        passed: validationReport.passed,
        criticalFailures: validationReport.criticalFailures.length,
        needsReview: validationReport.needsHumanReview
      });

      // Auto-melhoria se score baixo
      while (validationReport.overallScore < 7.0 && improvedCount < maxImprovements) {
        console.log(`🔄 Score baixo (${validationReport.overallScore}), aplicando melhorias automáticas...`);

        finalTemplate = await improveTemplateBasedOnValidation(
          finalTemplate,
          validationReport,
          academicTopics,
          ragContext
        );

        improvedCount++;
      }

      console.log(`✅ Validação concluída: Score ${validationReport.overallScore}/10, Melhorias: ${improvedCount}`);

    } catch (validationError) {
      console.warn('⚠️ Erro na validação avançada, usando validação simples:', validationError);

      // Fallback para validação simples
      finalTemplate = await validateAndImproveTemplate(
        dynamicTemplate,
        subject,
        userProfile
      );
    }

    console.log(`✅ Estrutura dinâmica gerada e validada: ${finalTemplate.modules.length} módulos, ${finalTemplate.topics?.length} tópicos`);

    // STEP FINAL: Validação e melhoria final da estrutura antes de enviar ao usuário
    console.log('🔍 Executando validação final da estrutura do curso...');
    const finalValidation = await validateAndImproveFinalStructure(finalTemplate, subject);

    if (finalValidation.changesApplied.length > 0) {
      console.log(`🔄 Melhorias aplicadas: ${finalValidation.changesApplied.length} mudanças`);
      finalValidation.changesApplied.forEach(change => console.log(`   - ${change}`));
    }

    console.log(`📊 Score final de qualidade: ${finalValidation.validationScore}/10`);

    // Garantir padrões mínimos de qualidade
    const qualityAssuredStructure = await ensureMinimumQualityStandards(
      finalValidation.improvedStructure,
      subject
    );

    // DEBUG FINAL: Rastrear conte\u00fado completo
    const finalTopicCount = qualityAssuredStructure.modules?.reduce((sum: number, m: any) => sum + (m.topics?.length || 0), 0) || 0;
    console.log(`\n\ud83c\udfaf RESULTADO FINAL DA AN\u00c1LISE:`);
    console.log(`  - T\u00edtulo: ${qualityAssuredStructure.courseTitle}`);
    console.log(`  - M\u00f3dulos: ${qualityAssuredStructure.modules?.length || 0}`);
    console.log(`  - Total de t\u00f3picos: ${finalTopicCount}`);
    console.log(`  - Distribui\u00e7\u00e3o: [${qualityAssuredStructure.modules?.map((m: any) => m.topics?.length || 0).join(', ') || 'vazio'}]`);

    return qualityAssuredStructure;
  } catch (error) {
    console.error('❌ Erro ao gerar estrutura dinâmica, tentando método simplificado:', error);
    // Continua com método simplificado se falhar
  }

  // Criar contextInfo vazio para fallback
  const contextInfo: {
    isUniversityDiscipline?: boolean;
    discipline?: string;
    userContext?: {
      mentionsExam?: boolean;
      mentionsProject?: boolean;
    };
  } = {};

  // SEMPRE usar estrutura expandida para QUALQUER solicitação de aprendizado
  const structureHints = contextInfo.isUniversityDiscipline && contextInfo.discipline
    ? getExpandedStructureHints(contextInfo.discipline as any)
    : { suggestedModules: 8, suggestedTopicsPerModule: 7, includeExercises: true, includeLab: true };

  // SEMPRE gerar estruturas robustas com muitos módulos e tópicos
  const moduleRange = `${Math.max(8, structureHints?.suggestedModules || 8)} a ${Math.max(12, (structureHints?.suggestedModules || 8) + 4)}`;

  const topicsPerModuleRange = `${Math.max(6, structureHints?.suggestedTopicsPerModule || 6)} a ${Math.max(10, (structureHints?.suggestedTopicsPerModule || 6) + 4)}`;

  const prompt = `
    🚀 REQUISITO ESSENCIAL: Criar estrutura COMPLETA e EXTENSA como a de "Cálculo Numérico" (63+ tópicos)

    IMPORTANTE: PRESERVE EXATAMENTE os termos específicos que o usuário utilizou.
    NÃO generalize nem modifique a terminologia original.

    ${contextInfo.isUniversityDiscipline ? '🎓 DETECTADO: DISCIPLINA UNIVERSITÁRIA - Criar estrutura COMPLETA e DETALHADA' : '📚 Criar estrutura COMPLETA e PROFUNDA para qualquer tema de aprendizado'}
    ${contextInfo.userContext?.mentionsExam ? '📝 CONTEXTO: Usuário mencionou PROVA - incluir módulo de exercícios e preparação' : ''}
    ${contextInfo.userContext?.mentionsProject ? '💻 CONTEXTO: Usuário mencionou PROJETO - incluir módulo prático/laboratório' : ''}

    Analise a seguinte mensagem do usuário e crie uma estrutura hierárquica EXTENSA de aprendizado:

    REGRAS DE PRESERVAÇÃO DE TERMINOLOGIA:
    - Se o usuário disse "construção mecânica", mantenha EXATAMENTE "construção mecânica"
    - Se o usuário disse "matemática", mantenha EXATAMENTE "matemática"
    - NÃO generalize "construção mecânica" para "materiais para engenharia"
    - NÃO modifique termos técnicos específicos do usuário

    NOVA ESTRUTURA HIERÁRQUICA:
    - CURSO (Título usando EXATAMENTE os termos do usuário)
    - MÓDULOS (focados especificamente no que o usuário pediu) - ${moduleRange} módulos idealmente
    - TÓPICOS (sub-tópicos específicos dentro de cada módulo) - ${topicsPerModuleRange} tópicos por módulo

    IMPORTANTE: Cada TÓPICO terá exatamente:
    - 3 vídeos do YouTube (serão buscados automaticamente)
    - 1 aula-texto detalhada (será gerada automaticamente)

    ${structureHints?.includeExercises ? '📝 INCLUIR MÓDULO OBRIGATÓRIO: "Exercícios e Preparação para Provas" com listas de exercícios, provas resolvidas e revisão' : ''}
    ${structureHints?.includeLab ? '💻 INCLUIR MÓDULO OBRIGATÓRIO: "Laboratório Computacional" com implementações práticas em Python/MATLAB' : ''}
    ${contextInfo.userContext?.mentionsExam ? '📊 INCLUIR SEÇÃO: "Simulados e Provas Anteriores" com questões tipo prova' : ''}

    CRIE uma sequência pedagógica lógica onde:
    - Módulos seguem ordem de dificuldade crescente
    - Tópicos dentro do módulo seguem sequência lógica
    - Cada tópico é específico e focado (ideal para 1 aula)
    - TUDO focado especificamente no que o usuário pediu
    ${contextInfo.isUniversityDiscipline ? '- Profundidade universitária com teoria, prática e aplicações' : ''}

    Mensagem ORIGINAL do usuário (mantenha a terminologia): "${userMessage}"
    ${level ? `Nível especificado: ${level}` : ''}

    Responda APENAS com um JSON válido no seguinte formato:
    {
      "courseTitle": "Curso sobre [EXATAMENTE o que o usuário pediu] (ex: 'Construção Mecânica', não 'Materiais para Engenharia')",
      "subject": "mantém os termos exatos do usuário",
      "level": "beginner|intermediate|advanced",
      "modules": [
        {
          "title": "Nome do Módulo (ex: Funções)",
          "description": "Descrição clara do que será aprendido neste módulo",
          "order": 1,
          "estimatedDuration": "1-2 semanas",
          "learningObjectives": ["objetivo1", "objetivo2"],
          "topics": [
            {
              "title": "Tópico Específico (ex: Função do 1º Grau)",
              "description": "Descrição do que será aprendido",
              "detailedDescription": "Descrição detalhada dos conceitos, habilidades e conhecimentos",
              "learningObjectives": ["objetivo específico 1", "objetivo 2"],
              "keyTerms": ["termo1", "termo2", "termo3"],
              "searchKeywords": ["palavra para busca YouTube", "keyword2"],
              "difficulty": "easy|medium|hard",
              "order": 1,
              "estimatedDuration": "45 min"
            }
          ]
        }
      ],
      "totalEstimatedHours": 10,
      "searchQueries": ["query principal", "query secundária"]
    }

    DIRETRIZES OBRIGATÓRIAS PARA ESTRUTURA COMPLETA:
    - MÍNIMO de ${moduleRange.split(' ')[0]} módulos principais (ideal: 10-12 módulos)
    - Cada módulo DEVE ter ${topicsPerModuleRange.split(' ')[0]} tópicos ou mais
    - META: 60-80 tópicos no total (como Cálculo Numérico tem 63)
    - Use nomes em MAIÚSCULO para módulos (como "FUNÇÕES", "LIMITES")
    - Cada tópico deve ser ESPECÍFICO (não genérico)
    - SEMPRE incluir módulo de "EXERCÍCIOS E PREPARAÇÃO PARA PROVAS"
    - SEMPRE incluir módulo de "LABORATÓRIO/PRÁTICA" quando aplicável
    - Progressão do BÁSICO ao AVANÇADO
    - Cada tópico = 1 aula de 1-2 horas

    ESTRUTURA MÍNIMA OBRIGATÓRIA:
    1. Fundamentos e Introdução (6-8 tópicos)
    2. Conceitos Básicos (6-8 tópicos)
    3. Desenvolvimento Teórico (6-8 tópicos)
    4. Técnicas e Métodos (6-8 tópicos)
    5. Aplicações Práticas (6-8 tópicos)
    6. Tópicos Avançados (6-8 tópicos)
    7. Projetos e Laboratório (5-7 tópicos)
    8. Exercícios e Preparação (5-7 tópicos)
    9. Revisão e Consolidação (4-6 tópicos)
    + Mais módulos conforme necessário para completude
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
    let analysis: LearningAnalysis;

    try {
      analysis = JSON.parse(cleanContent) as LearningAnalysis;
    } catch (parseError) {
      console.error('❌ Erro de parsing JSON:', parseError);
      console.log('📄 Conteúdo que causou erro (primeiros 500 chars):', cleanContent.substring(0, 500));

      // Tentar correção automática com GPT-4
      try {
        console.log('🔄 Tentando correção automática com GPT-4...');
        const correction = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "Corrija este JSON malformado e retorne APENAS o JSON válido, sem explicações:"
            },
            {
              role: "user",
              content: cleanContent.substring(0, 4000) // Limitar tamanho
            }
          ],
          max_tokens: 4000,
          temperature: 0
        });

        const correctedContent = correction.choices[0]?.message?.content;
        if (correctedContent) {
          const correctedClean = sanitizeJsonFromOpenAI(correctedContent);
          analysis = JSON.parse(correctedClean) as LearningAnalysis;
          console.log('✅ JSON corrigido com sucesso pelo GPT-4');
        } else {
          throw new Error('Correção automática falhou');
        }
      } catch (correctionError) {
        console.error('❌ Correção automática falhou:', correctionError);
        throw new Error(`Falha ao processar JSON da OpenAI: ${parseError}`);
      }
    }

    // Garantir que a estrutura de compatibilidade existe
    // Nova estrutura: modules[].topics (sem sections)
    if (!analysis.topics && analysis.modules) {
      analysis.topics = analysis.modules.flatMap(module =>
        module.topics?.map(topic => ({
          title: topic.title,
          description: topic.description,
          keywords: topic.keyTerms || topic.searchKeywords || [], // Adaptar para nova estrutura
          order: topic.order
        })) || []
      );
    }

    // Garantir que courseTitle existe
    if (!analysis.courseTitle && analysis.subject) {
      analysis.courseTitle = analysis.subject;
    }

    // Garantir que totalEstimatedHours existe
    if (!analysis.totalEstimatedHours && analysis.modules) {
      analysis.totalEstimatedHours = Math.ceil(
        analysis.modules.reduce((acc, module) =>
          acc + (module.topics?.length || 0) * 0.75, 0
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
  console.log('🔧 Sanitizando JSON da OpenAI...');

  // Remove cercas de código markdown mais agressivamente
  content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').replace(/^```/g, '').replace(/```$/g, '');

  // Remove caracteres de controle e BOM
  content = content.replace(/^\uFEFF/, '').replace(/[\u0000-\u0019\u007f-\u009f]/g, ' ');

  // Encontra o primeiro { e último } para extrair apenas o JSON
  const firstBrace = content.indexOf('{');
  const lastBrace = content.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
    throw new Error('Não foi possível encontrar JSON válido na resposta');
  }

  content = content.substring(firstBrace, lastBrace + 1);

  // Remove vírgulas penduradas antes de } ou ]
  content = content.replace(/,(\s*[}\]])/g, '$1');

  // Fix strings quebradas (substitui quebras de linha por espaços em strings)
  content = content.replace(/"\s*\n\s*"/g, ' ');
  content = content.replace(/"\s*\n/g, '\\n"');
  content = content.replace(/\n\s*"/g, '"');

  // Normalizar espaços em branco
  content = content.replace(/\s+/g, ' ');

  // Fix campos vazios que terminam com : seguido de } ou ]
  content = content.replace(/:\s*([}\]])/g, ': ""$1');

  console.log('✅ JSON sanitizado com sucesso');
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
  console.log(`🎯 Gerando aula-texto RESPONDE AÍ para: "${config.topic}" (nível: ${config.level})`);

  // Detectar área baseada no tópico
  const detectArea = (topic: string): 'construcao_mecanica' | 'matematica' | 'fisica' | 'geral' => {
    const topicLower = topic.toLowerCase();
    if (topicLower.includes('material') || topicLower.includes('construç') ||
        topicLower.includes('mecân') || topicLower.includes('estrutur') ||
        topicLower.includes('aço') || topicLower.includes('metal')) {
      return 'construcao_mecanica';
    }
    if (topicLower.includes('matemá') || topicLower.includes('cálcul') ||
        topicLower.includes('equaç') || topicLower.includes('deriv')) {
      return 'matematica';
    }
    if (topicLower.includes('físic') || topicLower.includes('força') || topicLower.includes('energia')) {
      return 'fisica';
    }
    return 'geral';
  };

  const area = detectArea(config.topic);
  const context = config.ragContext?.join('\n') || '';

  const prompt = buildAulaTextoRespondAi({
    topic: config.topic,
    level: config.level,
    area,
    context
  });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-2024-11-20",
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
      model: "gpt-4o-2024-11-20",
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
      checklist: basicChecklist.map(item => ({
        ...item,
        ok: Boolean(item.ok)
      })),
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
      model: "gpt-4o-2024-11-20",
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

/**
 * Gera syllabus estruturado baseado na mensagem do usuário
 */
export async function generateCourseSyllabus(
  message: string,
  userProfile?: any,
  uploadedFiles?: any[],
  bookData?: any[]
): Promise<SyllabusData> {
  console.log('🎯 Iniciando geração de syllabus com sistema pedagógico avançado...');

  // Importar sistemas pedagógicos
  const { analyzePedagogicalStructure } = await import('./pedagogicalEngine');
  const { buildSpecializedPrompt, validateSyllabusQuality } = await import('./prompts/pedagogicalPrompts');
  const {
    analyzeUserProfile,
    generatePersonalizationRecommendations,
    applyPersonalizationToPrompt
  } = await import('./personalizationEngine');

  try {
    // 1. Processar dados de livros se disponíveis
    let bookContext = '';
    let bookMetadata: any = {};
    if (bookData && bookData.length > 0) {
      console.log('📚 Processando dados de livros para integração...');
      const bookIntegration = await processBookDataForSyllabus(bookData, message, userProfile);
      bookContext = bookIntegration.context;
      bookMetadata = bookIntegration.metadata;
      console.log('✅ Dados de livros integrados:', {
        booksProcessed: bookData.length,
        chaptersFound: bookIntegration.metadata.totalChapters,
        exercisesFound: bookIntegration.metadata.totalExercises,
        contextLength: bookContext.length
      });
    }

    // 2. Análise pedagógica do domínio
    const pedagogicalAnalysis = analyzePedagogicalStructure(message, userProfile);
    console.log('📊 Análise pedagógica:', {
      domain: pedagogicalAnalysis.domain.name,
      complexity: pedagogicalAnalysis.complexity,
      approach: pedagogicalAnalysis.recommendedApproach,
      bloomLevels: pedagogicalAnalysis.bloomProgression
    });

    // 3. Análise detalhada do perfil do usuário
    const detailedProfile = analyzeUserProfile(userProfile || {});
    console.log('👤 Perfil detalhado:', {
      learningStyle: detailedProfile.learningStyle,
      timePerSession: detailedProfile.constraints.timePerSession,
      motivation: detailedProfile.learningGoals.motivation
    });

    // 4. RAG: Recuperação de evidências antes da geração
    let ragEvidences: { approved: any[], needsReview: any[] } = { approved: [], needsReview: [] };
    try {
      console.log('🔍 Iniciando recuperação de evidências (RAG)...');
      ragEvidences = await retrieveEvidencesForSyllabus(message, uploadedFiles);
      console.log('📊 Evidências coletadas:', {
        total: ragEvidences.approved.length + ragEvidences.needsReview.length,
        approved: ragEvidences.approved.length,
        needsReview: ragEvidences.needsReview.length,
        sources: [...new Set(ragEvidences.approved.map((e: any) => e.source))]
      });
    } catch (error) {
      console.warn('⚠️ RAG não disponível, continuando sem evidências:', error);
      ragEvidences = { approved: [], needsReview: [] };
    }

    // 5. Geração de recomendações de personalização
    const personalizationRecs = generatePersonalizationRecommendations(detailedProfile, pedagogicalAnalysis);

    // 6. Construção do prompt especializado
    const specializedPrompt = buildSpecializedPrompt(pedagogicalAnalysis, message, userProfile);

    // 7. Aplicação da personalização ao prompt
    let finalPrompt = applyPersonalizationToPrompt(specializedPrompt, detailedProfile, personalizationRecs);

    // 8. Integração do contexto de livros no prompt
    if (bookContext) {
      finalPrompt = integrateBookContextIntoPrompt(finalPrompt, bookContext, bookMetadata);
    }

    console.log('🔧 Prompt pedagógico construído com sucesso');

    // 9. Geração do syllabus via OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-2024-11-20",
      messages: [
        {
          role: 'system',
          content: `Você é um especialista pedagógico em design curricular que usa metodologias científicas de ensino.
          Sua expertise inclui Taxonomia de Bloom, análise de domínios de conhecimento e personalização educacional.
          Responda APENAS com JSON válido seguindo rigorosamente as especificações pedagógicas fornecidas.`
        },
        {
          role: 'user',
          content: finalPrompt
        }
      ],
      max_tokens: 3000, // Aumentado para acomodar prompts mais detalhados
      temperature: 0.2, // Mais conservador para consistência pedagógica
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Resposta vazia da OpenAI');
    }

    // Parse JSON da resposta
    console.log('📝 Resposta bruta da OpenAI:', content.substring(0, 200) + '...');

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Não foi possível encontrar JSON na resposta');
    }

    let syllabusData = JSON.parse(jsonMatch[0]);

    console.log('✨ Dados parseados antes do mapeamento:', {
      title: syllabusData.title,
      curso: !!syllabusData.curso,
      hasModules: !!syllabusData.modules,
      modulesType: Array.isArray(syllabusData.modules) ? 'array' : typeof syllabusData.modules,
      modulesLength: syllabusData.modules?.length
    });

    // Mapear estrutura se estiver em português
    if (syllabusData.curso && !syllabusData.title) {
      console.log('🔄 Mapeando estrutura de português para inglês');
      syllabusData = {
        title: syllabusData.curso.titulo || syllabusData.curso.title,
        description: syllabusData.curso.descricao || syllabusData.curso.description,
        level: syllabusData.curso.nivel || syllabusData.curso.level || 'beginner',
        modules: syllabusData.curso.modulos || syllabusData.curso.modules || []
      };

      // Mapear módulos se necessário
      if (syllabusData.modules && Array.isArray(syllabusData.modules)) {
        syllabusData.modules = syllabusData.modules.map((module: any, index: number) => ({
          id: module.id || `module-${index + 1}`,
          title: module.titulo || module.title,
          description: module.descricao || module.description || '',
          order: module.ordem || module.order || index + 1,
          estimatedDuration: module.duracaoEstimada || module.estimatedDuration || '2 horas',
          topics: (module.topicos || module.topics || []).map((topic: any, topicIndex: number) => ({
            id: topic.id || `topic-${topicIndex + 1}`,
            title: topic.titulo || topic.title,
            description: topic.descricao || topic.description || '',
            order: topic.ordem || topic.order || topicIndex + 1,
            estimatedDuration: topic.duracaoEstimada || topic.estimatedDuration || '30 min',
            subtopics: topic.subtopicos || topic.subtopics || []
          }))
        }));
      }

      console.log('✅ Estrutura mapeada:', {
        title: syllabusData.title,
        modulesCount: syllabusData.modules?.length
      });
    }

    // 7. Validação pedagógica básica
    const validationResult = validateSyllabusQuality(syllabusData, pedagogicalAnalysis);
    console.log('📋 Validação pedagógica básica:', {
      score: validationResult.score,
      isValid: validationResult.isValid,
      feedbackCount: validationResult.feedback.length
    });

    // 7.5. Validação pós-geração completa
    console.log('🔍 Executando validação pós-geração completa...');
    const { validateSyllabus } = await import('./syllabus-validation');
    const fullValidationReport = await validateSyllabus(
      syllabusData,
      message,
      userProfile,
      ragEvidences.approved
    );

    console.log('📊 Relatório de validação completa:', {
      overallScore: fullValidationReport.overallScore,
      passed: fullValidationReport.passed,
      criticalFailures: fullValidationReport.criticalFailures.length,
      needsHumanReview: fullValidationReport.needsHumanReview
    });

    // 8. Melhorias baseadas na validação (se necessário)
    if (!validationResult.isValid && validationResult.score < 7) {
      console.log('⚠️ Syllabus não passou na validação, aplicando melhorias...');

      // Adicionar metadados de qualidade
      syllabusData.pedagogicalMetadata = {
        domainAnalysis: pedagogicalAnalysis,
        validationScore: validationResult.score,
        personalizations: personalizationRecs.contentAdaptations,
        improvements: validationResult.improvements,
        bloomProgression: pedagogicalAnalysis.bloomProgression,
        ragMetadata: {
          evidencesUsed: ragEvidences.approved.length,
          evidencesNeedingReview: ragEvidences.needsReview.length,
          sources: [...new Set(ragEvidences.approved.map((e: any) => e.source))],
          avgConfidenceScore: ragEvidences.approved.length > 0 ?
            ragEvidences.approved.reduce((sum: number, e: any) => sum + e.confidence_score, 0) / ragEvidences.approved.length : 0
        },
        bookMetadata: bookData ? {
          booksUsed: bookData.length,
          totalChapters: bookMetadata.totalChapters || 0,
          totalExercises: bookMetadata.totalExercises || 0,
          totalFormulas: bookMetadata.totalFormulas || 0,
          pedagogicalAlignment: bookMetadata.pedagogicalAlignment || 'medium',
          bookTitles: bookData.map(book => book.bookInfo?.title || 'Unknown').slice(0, 3)
        } : null,
        fullValidationReport
      };
    }

    // Validar estrutura mínima
    if (!syllabusData.title || !syllabusData.modules || !Array.isArray(syllabusData.modules)) {
      throw new Error('Estrutura de syllabus inválida');
    }

    console.log('✅ Syllabus pedagógico gerado:', {
      title: syllabusData.title,
      modules: syllabusData.modules.length,
      topics: syllabusData.modules.reduce((sum: number, m: any) => sum + (m.topics?.length || 0), 0),
      domain: pedagogicalAnalysis.domain.name,
      bloomLevels: pedagogicalAnalysis.bloomProgression.length,
      validationScore: validationResult.score,
      ragEvidences: ragEvidences.approved.length,
      avgConfidenceScore: syllabusData.pedagogicalMetadata?.ragMetadata?.avgConfidenceScore || 0
    });

    // Log relatório de evidências para debug
    if (ragEvidences.approved.length > 0) {
      console.log('📋 Relatório de evidências:\n', generateScoringReport(ragEvidences.approved.slice(0, 5)));
    }

    // 9. Flagging para revisão humana
    if (ragEvidences.needsReview.length > 0) {
      console.log(`⚠️ ${ragEvidences.needsReview.length} evidências precisam de revisão humana`);
      syllabusData.humanReviewFlags = {
        lowConfidenceEvidences: ragEvidences.needsReview.map((e: any) => ({
          source: e.source,
          confidence: e.confidence_score,
          content: e.content.substring(0, 100) + '...'
        })),
        recommendedActions: [
          'Revisar evidências com baixa confiança',
          'Validar fontes acadêmicas',
          'Verificar precisão do conteúdo'
        ]
      };
    }

    return syllabusData;

  } catch (error) {
    console.error('❌ Erro ao gerar syllabus pedagógico:', error);

    // Fallback: usar sistema pedagógico para gerar estrutura básica
    try {
      const { analyzePedagogicalStructure, generateTopicStructure } = await import('./pedagogicalEngine');

      const pedagogicalAnalysis = analyzePedagogicalStructure(message, userProfile);
      const topic = message.substring(0, 50);

      console.log('🔄 Gerando fallback pedagógico...');

      // Gerar estrutura baseada na análise pedagógica
      const modules = [];
      const moduleCount = pedagogicalAnalysis.complexity === 'high' ? 6 :
                         pedagogicalAnalysis.complexity === 'medium' ? 4 : 3;

      for (let i = 0; i < moduleCount; i++) {
        const moduleTitle = `Módulo ${i + 1}`;
        const topicStructure = generateTopicStructure(pedagogicalAnalysis, moduleTitle, i + 1);

        modules.push({
          id: `module-${i + 1}`,
          title: moduleTitle,
          description: `${moduleTitle} do curso`,
          order: i + 1,
          estimatedDuration: `${Math.round(pedagogicalAnalysis.estimatedDuration.total / moduleCount)} horas`,
          topics: topicStructure.map(topic => ({
            id: topic.id,
            title: topic.title,
            description: `Tópico sobre ${topic.title}`,
            order: topic.bloomLevel,
            estimatedDuration: `${Math.round(60 / topicStructure.length)} min`,
            subtopics: topic.subtopics.map(sub => sub.title)
          }))
        });
      }

      return {
        title: `Curso de ${topic}`,
        description: `Curso estruturado sobre ${topic} baseado em metodologias pedagógicas`,
        level: userProfile?.level || 'intermediate',
        modules,
        totalDuration: `${pedagogicalAnalysis.estimatedDuration.total} horas`,
        pedagogicalMetadata: {
          domainAnalysis: pedagogicalAnalysis,
          validationScore: 6.0, // Score básico para fallback
          isFallback: true,
          bloomProgression: pedagogicalAnalysis.bloomProgression
        }
      };

    } catch (fallbackError) {
      console.error('❌ Erro no fallback pedagógico:', fallbackError);

      // Fallback final: estrutura mínima
      const topic = message.substring(0, 50);
      return {
        title: `Curso de ${topic}`,
        description: `Curso básico sobre ${topic}`,
        level: userProfile?.level || 'intermediate',
        modules: [
          {
            id: 'module-1',
            title: 'Fundamentos',
            description: 'Conceitos básicos e introdução',
            order: 1,
            estimatedDuration: '2 horas',
            topics: [
              {
                id: 'topic-1-1',
                title: 'Introdução',
                description: 'Visão geral do assunto',
                order: 1,
                estimatedDuration: '30 min',
                subtopics: ['Definições', 'Importância', 'Aplicações']
              }
            ]
          }
        ],
        totalDuration: '3-4 horas'
      };
    }
  }
}

/**
 * Recupera evidências académicas para fundamentar a geração do syllabus
 */
async function retrieveEvidencesForSyllabus(
  message: string,
  uploadedFiles?: any[]
): Promise<{ approved: any[], needsReview: any[] }> {
  const { chunkDocument, chunkMultipleDocuments } = await import('./chunking');
  const {
    scoreEvidence,
    rerankEvidences,
    flagEvidencesForHumanReview,
    combineEvidencesFromSources
  } = await import('./evidence-scoring');
  const { searchAcademicContent } = await import('./perplexity');
  const { cacheEvidences, generateEvidenceKey } = await import('./cache');

  const allEvidences: any[] = [];

  try {
    // 1. Processar documentos enviados (com cache)
    if (uploadedFiles && uploadedFiles.length > 0) {
      console.log('📄 Processando documentos enviados...');

      const { cacheDocumentChunks } = await import('./cache');

      const documents = uploadedFiles.map(file => ({
        content: file.content || '',
        filename: file.name || 'unknown',
        source: `documento_${file.name}`
      }));

      // Cache chunks por documento individualmente para melhor granularidade
      const allChunks: any[] = [];
      for (const doc of documents) {
        const chunks = await cacheDocumentChunks(
          doc.filename,
          doc.content,
          () => chunkDocument(doc.content, doc.source, {
            maxTokens: 500,
            overlapTokens: 50
          }, doc.filename),
          24 * 60 * 60 * 1000 // 1 dia TTL (docs mudam mais)
        );
        allChunks.push(...chunks);
      }

      // Converter chunks para evidências
      for (const chunk of allChunks.slice(0, 20)) { // Limite de 20 chunks por performance
        const evidence = scoreEvidence({
          content: chunk.content,
          source: chunk.metadata.source,
          type: 'documento',
          metadata: {
            filename: chunk.metadata.filename,
            chunk_index: chunk.metadata.chunkIndex,
            word_count: chunk.content.split(' ').length
          }
        }, message, message);

        allEvidences.push(evidence);
      }
    }

    // 2. Buscar evidências no Perplexity (com cache)
    console.log('🔍 Buscando evidências académicas no Perplexity...');

    try {
      const perplexityKey = generateEvidenceKey(message, {
        source: 'perplexity',
        maxResults: 15,
        language: 'pt'
      });

      const perplexityResponse = await cacheEvidences(
        perplexityKey,
        () => searchAcademicContent({
          query: message,
          language: 'pt',
          maxResults: 15,
          siteFilters: ['site:.edu', 'site:edu.br', 'site:scholar.google.com', 'filetype:pdf']
        }),
        7 * 24 * 60 * 60 * 1000 // 7 dias TTL
      );

      // Processar resposta do Perplexity
      if (perplexityResponse.answer) {
        const sentences = perplexityResponse.answer.split(/[.!?]+/)
          .filter(s => s.trim().length > 50);

        for (let i = 0; i < sentences.length; i += 2) {
          const content = sentences.slice(i, i + 3).join('. ').trim();

          if (content.length > 100) {
            const evidence = scoreEvidence({
              content,
              source: 'perplexity',
              type: 'academic_paper',
              url: 'https://perplexity.ai',
              metadata: {
                word_count: content.split(' ').length
              }
            }, message, message);

            allEvidences.push(evidence);
          }
        }
      }

      // Processar citações
      for (const citation of perplexityResponse.citations || []) {
        if (citation.snippet && citation.snippet.length > 50) {
          const evidence = scoreEvidence({
            content: citation.snippet,
            source: 'perplexity',
            type: 'academic_paper',
            url: citation.url,
            title: citation.title,
            metadata: {
              word_count: citation.snippet.split(' ').length
            }
          }, message, message);

          allEvidences.push(evidence);
        }
      }
    } catch (perplexityError) {
      console.warn('⚠️ Erro ao buscar no Perplexity:', perplexityError);
    }

    // 3. Reordenar e filtrar evidências
    const rankedEvidences = rerankEvidences(allEvidences, {
      authority_weight: 0.4,
      similarity_weight: 0.35,
      recency_weight: 0.15,
      license_weight: 0.1,
      min_confidence_threshold: 0.6,
      max_evidences_per_topic: 15,
      language_preference: 'both'
    });

    // 4. Separar evidências aprovadas vs. que precisam de revisão
    const { approved, needsReview } = flagEvidencesForHumanReview(rankedEvidences);

    console.log(`✅ Evidências processadas: ${approved.length} aprovadas, ${needsReview.length} para revisão`);

    // Log cache statistics
    const { ragCache, generateCacheReport } = await import('./cache');
    const cacheStats = ragCache.getStats();
    console.log(`💾 Cache stats: ${cacheStats.entries} entradas, ${(ragCache.getHitRate() * 100).toFixed(1)}% hit rate`);

    return { approved, needsReview };

  } catch (error) {
    console.error('❌ Erro ao recuperar evidências:', error);
    return { approved: [], needsReview: [] };
  }
}

/**
 * Formata evidências para inclusão no prompt
 */
function formatEvidencesForPrompt(evidences: any[]): string {
  return evidences.slice(0, 10).map((evidence, index) => {
    const sourceLabel = evidence.type === 'documento' ? 'Documento' :
                       evidence.type === 'academic_paper' ? 'Paper Acadêmico' :
                       evidence.type === 'university' ? 'Universidade' : 'Fonte Educacional';

    const confidenceLabel = evidence.confidence_score >= 0.8 ? 'Alta' :
                           evidence.confidence_score >= 0.6 ? 'Média' : 'Baixa';

    return `[Evidência ${index + 1}] (${sourceLabel} - Confiança: ${confidenceLabel})
Fonte: ${evidence.url || evidence.source}
Conteúdo: ${evidence.content.substring(0, 300)}${evidence.content.length > 300 ? '...' : ''}
Score de Autoridade: ${evidence.authority_score.toFixed(2)}
Score de Similaridade: ${evidence.similarity_score.toFixed(2)}
---`;
  }).join('\n\n');
}

/**
 * Adiciona metadados de evidências aos módulos do syllabus
 */
function addEvidenceMetadataToSyllabus(syllabusData: any, evidences: any[]): any {
  if (!syllabusData.modules || !Array.isArray(syllabusData.modules)) {
    return syllabusData;
  }

  // Distribuir evidências entre os módulos baseado em relevância
  const evidencesByModule = distributeEvidencesToModules(syllabusData.modules, evidences);

  syllabusData.modules = syllabusData.modules.map((module: any, index: number) => {
    const moduleEvidences = evidencesByModule[index] || [];

    return {
      ...module,
      evidence: moduleEvidences.map(e => ({
        source: e.source,
        type: e.type,
        confidence_score: e.confidence_score,
        authority_score: e.authority_score,
        url: e.url,
        title: e.title,
        content_preview: e.content.substring(0, 100) + '...'
      }))
    };
  });

  return syllabusData;
}

/**
 * Distribui evidências entre módulos baseado em relevância de tópicos
 */
function distributeEvidencesToModules(modules: any[], evidences: any[]): any[][] {
  const evidencesByModule: any[][] = modules.map(() => []);

  for (const evidence of evidences) {
    let bestMatch = 0;
    let bestScore = 0;

    // Encontrar módulo mais relevante para esta evidência
    for (let i = 0; i < modules.length; i++) {
      const module = modules[i];
      const moduleText = `${module.title} ${module.description || ''} ${module.topics?.map((t: any) => t.title).join(' ') || ''}`;

      const relevanceScore = calculateSimpleRelevance(evidence.content, moduleText);

      if (relevanceScore > bestScore) {
        bestScore = relevanceScore;
        bestMatch = i;
      }
    }

    // Adicionar evidência ao módulo mais relevante (máximo 3 por módulo)
    if (evidencesByModule[bestMatch].length < 3) {
      evidencesByModule[bestMatch].push(evidence);
    }
  }

  return evidencesByModule;
}

/**
 * Calcula relevância simples entre dois textos
 */
function calculateSimpleRelevance(text1: string, text2: string): number {
  const words1 = text1.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const words2 = text2.toLowerCase().split(/\s+/).filter(w => w.length > 3);

  let matches = 0;
  for (const word of words1) {
    if (words2.includes(word)) {
      matches++;
    }
  }

  return words1.length > 0 ? matches / words1.length : 0;
}

/**
 * Processa dados de livros para integração ao syllabus
 */
async function processBookDataForSyllabus(
  bookData: any[],
  message: string,
  userProfile?: any
): Promise<{
  context: string;
  metadata: any;
}> {
  console.log(`📚 Processando ${bookData.length} livros para integração ao syllabus...`);

  const allChapters: any[] = [];
  const allExercises: any[] = [];
  const allFormulas: any[] = [];
  const allExamples: any[] = [];
  let totalChapters = 0;
  let totalExercises = 0;
  let totalFormulas = 0;

  // Extrair dados estruturados de cada livro
  for (const book of bookData) {
    if (book.chapters) {
      allChapters.push(...book.chapters);
      totalChapters += book.chapters.length;
    }
    if (book.exercises) {
      allExercises.push(...book.exercises);
      totalExercises += book.exercises.length;
    }
    if (book.formulas) {
      allFormulas.push(...book.formulas);
      totalFormulas += book.formulas.length;
    }
    if (book.examples) {
      allExamples.push(...book.examples);
    }
  }

  // Análise pedagógica dos livros
  const pedagogicalAlignment = await analyzePedagogicalAlignment(allChapters, message, userProfile);

  // Construir contexto estruturado
  const context = buildBookContext(allChapters, allExercises, allFormulas, allExamples, pedagogicalAlignment);

  const metadata = {
    totalChapters,
    totalExercises,
    totalFormulas,
    totalExamples: allExamples.length,
    pedagogicalAlignment: pedagogicalAlignment.overall,
    chapterAlignment: pedagogicalAlignment.chapters,
    recommendedSequence: pedagogicalAlignment.sequence
  };

  console.log(`✅ Processamento concluído: ${totalChapters} capítulos, ${totalExercises} exercícios, ${totalFormulas} fórmulas`);

  return { context, metadata };
}

/**
 * Analisa alinhamento pedagógico dos capítulos dos livros com o curso desejado
 */
async function analyzePedagogicalAlignment(
  chapters: any[],
  message: string,
  userProfile?: any
): Promise<{
  overall: 'high' | 'medium' | 'low';
  chapters: Array<{ chapterTitle: string; relevance: number; reason: string }>;
  sequence: string[];
}> {
  const prompt = `Analise o alinhamento pedagógico entre os capítulos de livros acadêmicos e o curso desejado pelo usuário.

CURSO DESEJADO: "${message}"
NÍVEL DO USUÁRIO: ${userProfile?.level || 'intermediate'}

CAPÍTULOS DOS LIVROS:
${chapters.slice(0, 10).map((chapter, i) =>
  `${i + 1}. "${chapter.title}" - Tópicos: ${chapter.keyTopics?.join(', ') || 'N/A'} - Dificuldade: ${chapter.difficulty || 'medium'}`
).join('\n')}

Analise:
1. Relevância de cada capítulo para o curso (0-10)
2. Sequência pedagógica recomendada
3. Alinhamento geral

Responda APENAS com JSON:
{
  "overall": "high|medium|low",
  "chapters": [
    {
      "chapterTitle": "nome do capítulo",
      "relevance": 8.5,
      "reason": "por que é relevante"
    }
  ],
  "sequence": ["capítulo 1", "capítulo 2", "..."]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: 'system',
          content: 'Você é um especialista em design curricular e análise pedagógica. Responda apenas com JSON válido.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.2,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Resposta vazia da OpenAI');
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('JSON não encontrado na resposta');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('❌ Erro ao analisar alinhamento pedagógico:', error);

    // Fallback simples
    return {
      overall: 'medium',
      chapters: chapters.slice(0, 5).map(chapter => ({
        chapterTitle: chapter.title,
        relevance: 7.0,
        reason: 'Análise automática não disponível'
      })),
      sequence: chapters.slice(0, 5).map(chapter => chapter.title)
    };
  }
}

/**
 * Constrói contexto estruturado dos livros para o prompt
 */
function buildBookContext(
  chapters: any[],
  exercises: any[],
  formulas: any[],
  examples: any[],
  alignment: any
): string {
  const relevantChapters = alignment.chapters
    .filter((ch: any) => ch.relevance >= 6.0)
    .slice(0, 8);

  const relevantExercises = exercises
    .filter(ex => relevantChapters.some((ch: any) =>
      ch.chapterTitle.toLowerCase().includes(ex.chapter?.toString() || '')))
    .slice(0, 15);

  const relevantFormulas = formulas.slice(0, 10);
  const relevantExamples = examples.slice(0, 8);

  return `
CONTEXTO DE LIVROS ACADÊMICOS:

=== ESTRUTURA DE CAPÍTULOS RELEVANTES ===
${relevantChapters.map((ch: any, i: number) =>
  `${i + 1}. "${ch.chapterTitle}" (Relevância: ${ch.relevance}/10)
   - Razão: ${ch.reason}
   - Tópicos-chave: ${chapters.find(c => c.title === ch.chapterTitle)?.keyTopics?.join(', ') || 'N/A'}`
).join('\n')}

=== SEQUÊNCIA PEDAGÓGICA RECOMENDADA ===
${alignment.sequence.slice(0, 6).map((title: string, i: number) => `${i + 1}. ${title}`).join('\n')}

=== EXERCÍCIOS TIPO DOS LIVROS ===
${relevantExercises.slice(0, 8).map((ex: any, i: number) =>
  `${i + 1}. ${ex.type || 'Prático'} - ${ex.content?.substring(0, 100) || 'Exercício não especificado'}...`
).join('\n')}

=== FÓRMULAS E CONCEITOS CHAVE ===
${relevantFormulas.map((formula: any, i: number) =>
  `${i + 1}. ${formula.name}: ${formula.expression || 'N/A'} - ${formula.description?.substring(0, 80) || 'Sem descrição'}...`
).join('\n')}

=== EXEMPLOS RESOLVIDOS TIPO ===
${relevantExamples.map((ex: any, i: number) =>
  `${i + 1}. ${ex.title} - ${ex.problem?.substring(0, 100) || 'Problema não especificado'}...`
).join('\n')}

ALINHAMENTO GERAL: ${alignment.overall.toUpperCase()}
`;
}

/**
 * Integra contexto de livros no prompt do syllabus
 */
function integrateBookContextIntoPrompt(
  basePrompt: string,
  bookContext: string,
  bookMetadata: any
): string {
  const bookIntegrationSection = `

=== INTEGRAÇÃO COM LIVROS ACADÊMICOS ===
${bookContext}

INSTRUÇÕES PARA USO DOS LIVROS:
1. Alinhe os módulos do syllabus com a estrutura de capítulos relevantes
2. Use a sequência pedagógica recomendada como base para ordenação dos tópicos
3. Inclua referências aos exercícios tipo encontrados nos livros
4. Adapte as fórmulas e conceitos identificados aos tópicos correspondentes
5. Cite os livros nas referências bibliográficas dos módulos relevantes

NÍVEL DE ALINHAMENTO: ${bookMetadata.pedagogicalAlignment || 'medium'}
TOTAL DE RECURSOS: ${bookMetadata.totalChapters} capítulos, ${bookMetadata.totalExercises} exercícios, ${bookMetadata.totalFormulas} fórmulas
`;

  // Inserir o contexto de livros antes das instruções finais do prompt
  const insertionPoint = basePrompt.lastIndexOf('Responda APENAS com JSON');
  if (insertionPoint === -1) {
    return basePrompt + bookIntegrationSection;
  }

  return basePrompt.substring(0, insertionPoint) + bookIntegrationSection + '\n\n' + basePrompt.substring(insertionPoint);
}

/**
 * Consulta OpenAI para obter recomendações de livros acadêmicos
 */
export async function getRecommendedTextbooks(
  subject: string,
  level: 'beginner' | 'intermediate' | 'advanced',
  language: string = 'pt'
): Promise<BookRecommendation[]> {
  try {
    console.log(`📚 Consultando OpenAI para livros de "${subject}" (nível ${level})`);

    const prompt = `Você é um especialista em bibliografia acadêmica universitária.

TAREFA: Identifique os 3 principais livros-texto mais utilizados por professores universitários para ensinar "${subject}" no nível ${level}.

CRITÉRIOS:
1. Livros amplamente adotados em universidades reconhecidas
2. Autores autoridades na área
3. Edições atualizadas e bem estabelecidas
4. Adequados para o nível ${level}
5. ${language === 'pt' ? 'Priorizar livros em português quando possível' : 'Preferir livros em inglês'}

IMPORTANTE:
- Focar em livros-texto principais (não livros complementares)
- Incluir ISBNs quando possível
- Explicar por que cada livro é recomendado
- Avaliar universalidade de uso

Responda APENAS com JSON válido no formato:
{
  "recommendations": [
    {
      "title": "Título completo do livro",
      "author": "Nome completo do(s) autor(es)",
      "isbn": "ISBN se conhecido",
      "year": 2023,
      "publisher": "Editora",
      "edition": "10ª edição",
      "category": "primary",
      "description": "Descrição do livro e sua abordagem",
      "reasons": ["Razão 1", "Razão 2", "Razão 3"],
      "relevanceScore": 95,
      "universallyUsed": true
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 2000
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      console.error('❌ OpenAI não retornou resposta para livros recomendados');
      return [];
    }

    console.log('📝 Resposta bruta da OpenAI:', content.substring(0, 200));

    const parsed = JSON.parse(content);
    const recommendations: BookRecommendation[] = parsed.recommendations || [];

    console.log(`✅ OpenAI recomendou ${recommendations.length} livros para "${subject}"`);
    recommendations.forEach((book, index) => {
      console.log(`   ${index + 1}. ${book.title} - ${book.author} (score: ${book.relevanceScore})`);
    });

    return recommendations;

  } catch (error) {
    console.error('❌ Erro ao consultar OpenAI para livros recomendados:', error);
    return [];
  }
}
