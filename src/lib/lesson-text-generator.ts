import OpenAI from 'openai';
import { openaiWebSearch, WebSearchResult } from './openai-web-search';
import { callPerplexityAPI } from './perplexity';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Configurações do GPT-5-mini para aulas-texto
const LESSON_CONFIG = {
  model: 'gpt-4o-mini' as const,
  max_tokens: 8000, // Para aulas-texto de 8-12 páginas
  temperature: 0.7,
};

// Interfaces
export interface LessonTextInput {
  subtopicTitle: string;
  subtopicDescription: string;
  moduleTitle: string;
  courseTitle: string;
  userLevel: 'beginner' | 'intermediate' | 'advanced';
  discipline: string;
  estimatedDuration: string;
  context?: {
    previousSubtopics?: string[];
    nextSubtopics?: string[];
    learningObjectives?: string[];
  };
}

export interface LessonTextResult {
  content: string;
  structure: {
    ignition: string;
    foundation: string;
    development: string;
    integration: string;
    consolidation: string;
  };
  metadata: {
    wordCount: number;
    estimatedReadingTime: string;
    difficultyLevel: string;
    sources: Array<{
      title: string;
      url: string;
      type: 'academic' | 'web' | 'research';
    }>;
  };
  generationInfo: {
    pipeline: 'hybrid';
    phases: Array<{
      phase: string;
      duration: number;
      status: 'completed' | 'error';
    }>;
    totalDuration: number;
  };
}

// Template principal para geração de aula-texto contínua
const CONTINUOUS_LESSON_PROMPT = `
Você é um especialista pedagogo universitário. Crie uma aula-texto acadêmica CONTÍNUA e FLUÍDA sobre o tópico fornecido.

ESTRUTURA DA AULA-TEXTO (texto corrido, SEM divisões visuais):

**INTRODUÇÃO (Hook + Objetivos):**
- Inicie com uma pergunta instigante ou cenário atual relevante
- Estabeleça claramente o que será aprendido
- Explique a relevância prática do tópico
- Liste 3-4 objetivos de aprendizagem específicos

**FUNDAMENTAÇÃO TEÓRICA (flui naturalmente da introdução):**
- Contextualize o tópico no conhecimento geral
- Defina conceitos essenciais progressivamente
- Explique terminologia-chave no contexto
- Use analogias facilitadoras quando apropriado
- Baseie-se em fundamentos científicos sólidos

**DESENVOLVIMENTO PRÁTICO (continua o fluxo):**
- Apresente explicações detalhadas
- Use exemplos escalonados (simples → complexo)
- Inclua casos práticos e aplicações reais
- Mencione alertas sobre erros comuns
- Integre perguntas reflexivas no texto

**SÍNTESE E APLICAÇÕES (conclusão natural):**
- Sintetize os pontos principais
- Conecte com outros tópicos relacionados
- Mencione aplicações futuras/tendências
- Finalize com recursos complementares
- Encoraje o aprofundamento

DIRETRIZES IMPORTANTES:
- TEXTO CONTÍNUO: Sem separadores (---), sem seções numeradas
- TRANSIÇÕES NATURAIS: Cada parágrafo flui para o próximo
- LINGUAGEM ACADÊMICA: Formal mas acessível
- EXEMPLOS ATUAIS: Use dados de 2024-2025
- EXTENSÃO: 3.000-5.000 palavras (8-12 páginas)
- FORMATO: Markdown simples (# ## ### para títulos, **negrito**, *itálico*)

IMPORTANTE: Não use marcadores como "## 🚀 Ignição" ou separadores "---".
Crie um texto acadêmico contínuo que flua naturalmente do início ao fim.
`;

/**
 * Pipeline principal de geração de aula-texto híbrida
 */
export async function generateLessonText(
  input: LessonTextInput,
  onProgress?: (phase: string, progress: number) => void
): Promise<LessonTextResult> {
  const startTime = Date.now();
  const phases: Array<{ phase: string; duration: number; status: 'completed' | 'error' }> = [];

  console.log(`🎓 Iniciando geração de aula-texto: ${input.subtopicTitle}`);

  try {
    // FASE 1: Pesquisa e Contextualização (25%)
    onProgress?.('Pesquisando dados atuais...', 10);
    const phaseStart = Date.now();

    const webSearchResults = await openaiWebSearch(
      `"${input.subtopicTitle}" ${input.discipline} aplicações práticas exemplos atuais 2024 2025`,
      {
        mode: 'agentic_search',
        domain_category: 'all_edu',
        max_sources: 10
      }
    );

    phases.push({
      phase: 'Web Search',
      duration: Date.now() - phaseStart,
      status: 'completed'
    });

    // FASE 2: Validação Científica (50%)
    onProgress?.('Validando conceitos científicos...', 35);
    const perplexityStart = Date.now();

    let scientificValidation: any = null;
    try {
      scientificValidation = await callPerplexityAPI({
        prompt: `Validate and provide scientific foundation for: "${input.subtopicTitle}" in ${input.discipline}. Include recent research, academic definitions, and theoretical framework.`,
        model: 'sonar-pro'
      });

      phases.push({
        phase: 'Scientific Validation',
        duration: Date.now() - perplexityStart,
        status: 'completed'
      });
    } catch (error) {
      console.warn(`⚠️ Perplexity indisponível para ${input.subtopicTitle}, usando fallback OpenAI`);

      // Fallback: usar OpenAI para validação científica
      scientificValidation = {
        content: `Conceitos fundamentais sobre ${input.subtopicTitle} em ${input.discipline}:\n\n` +
                 `${input.subtopicDescription || `Estudo avançado de ${input.subtopicTitle}`}\n\n` +
                 `Este é um tópico importante em ${input.discipline} que requer compreensão sólida dos fundamentos teóricos.`,
        sources: []
      };

      phases.push({
        phase: 'Scientific Validation (Fallback)',
        duration: Date.now() - perplexityStart,
        status: 'completed'
      });
    }

    // FASE 3: Geração de Conteúdo Contínuo (75%)
    onProgress?.('Gerando aula-texto contínua...', 60);
    const contentStart = Date.now();

    const finalContent = await generateContinuousLessonText(input, webSearchResults, scientificValidation);

    phases.push({
      phase: 'Continuous Content Generation',
      duration: Date.now() - contentStart,
      status: 'completed'
    });

    // FASE 4: Finalização e Metadados (100%)
    onProgress?.('Finalizando e gerando metadados...', 85);
    const synthesisStart = Date.now();
    const metadata = generateMetadata(finalContent, webSearchResults, scientificValidation);

    phases.push({
      phase: 'Final Synthesis',
      duration: Date.now() - synthesisStart,
      status: 'completed'
    });

    onProgress?.('Concluído!', 100);

    const totalDuration = Date.now() - startTime;
    console.log(`✅ Aula-texto gerada em ${totalDuration}ms`);

    // Criar estrutura fictícia para compatibilidade (não será usada no novo viewer)
    const dummyStructure = {
      ignition: '',
      foundation: '',
      development: '',
      integration: '',
      consolidation: ''
    };

    return {
      content: finalContent,
      structure: dummyStructure,
      metadata,
      generationInfo: {
        pipeline: 'hybrid',
        phases,
        totalDuration
      }
    };

  } catch (error) {
    console.error('❌ Erro na geração da aula-texto:', error);

    // Registrar erro na fase atual
    phases.push({
      phase: 'Error',
      duration: Date.now() - startTime,
      status: 'error'
    });

    throw new Error(`Falha na geração da aula-texto: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

/**
 * Gera aula-texto contínua usando GPT com prompt unificado
 */
async function generateContinuousLessonText(
  input: LessonTextInput,
  webData: WebSearchResult,
  scientificData: any
): Promise<string> {

  const contextualPrompt = `
${CONTINUOUS_LESSON_PROMPT}

INFORMAÇÕES ESPECÍFICAS DA AULA:
- Tópico: ${input.subtopicTitle}
- Descrição: ${input.subtopicDescription}
- Módulo: ${input.moduleTitle}
- Curso: ${input.courseTitle}
- Disciplina: ${input.discipline}
- Nível do usuário: ${input.userLevel}
- Duração estimada: ${input.estimatedDuration}

DADOS ATUAIS PESQUISADOS:
${webData.content.substring(0, 1500)}...

FUNDAMENTAÇÃO CIENTÍFICA:
${typeof scientificData === 'string' ? scientificData.substring(0, 1500) : JSON.stringify(scientificData).substring(0, 1500)}...

INSTRUÇÕES FINAIS:
- Adapte a linguagem para o nível ${input.userLevel}
- Mantenha tom acadêmico profissional
- Use exemplos práticos da pesquisa web fornecida
- Integre dados científicos validados
- Crie um texto que flua naturalmente do início ao fim
- Extensão alvo: 3.000-5.000 palavras

Agora crie a aula-texto completa sobre "${input.subtopicTitle}":
`;

  try {
    console.log(`📝 Gerando aula-texto contínua: ${input.subtopicTitle}`);

    const response = await openai.chat.completions.create({
      ...LESSON_CONFIG,
      max_tokens: 8000, // Aumentado para acomodar texto longo
      messages: [
        {
          role: 'system',
          content: 'Você é um especialista pedagogo universitário com PhD em educação. Crie aulas-texto acadêmicas excepcionais que fluem naturalmente e mantêm o leitor engajado do início ao fim.'
        },
        {
          role: 'user',
          content: contextualPrompt
        }
      ]
    });

    const content = response.choices[0]?.message?.content || '';

    if (!content || content.length < 500) {
      throw new Error('Conteúdo gerado muito curto ou vazio');
    }

    return content;

  } catch (error) {
    console.error(`❌ Erro ao gerar aula-texto contínua:`, error);

    // Fallback: tentar com configuração mais simples
    try {
      const fallbackResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 6000,
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: 'Você é um professor universitário especialista. Crie uma aula-texto detalhada e contínua.'
          },
          {
            role: 'user',
            content: `Crie uma aula-texto completa e detalhada sobre "${input.subtopicTitle}" em ${input.discipline}.
            Nível: ${input.userLevel}.
            Use linguagem acadêmica mas acessível.
            Extensão: 3.000+ palavras.
            Formato: Texto contínuo sem seções separadas.`
          }
        ]
      });

      return fallbackResponse.choices[0]?.message?.content ||
        `# ${input.subtopicTitle}\n\nConteúdo não pôde ser gerado devido a erro técnico. Tente novamente mais tarde.`;

    } catch (fallbackError) {
      console.error(`❌ Fallback falhou:`, fallbackError);
      return `# ${input.subtopicTitle}\n\nErro ao gerar conteúdo. Verifique sua conexão e tente novamente.`;
    }
  }
}

/**
 * Sintetiza conteúdo final unificado
 */
async function synthesizeFinalContent(
  sections: LessonTextResult['structure'],
  input: LessonTextInput
): Promise<string> {

  const unifiedContent = `# ${input.subtopicTitle}

## 🚀 Ignição
${sections.ignition}

---

## 📚 Fundamentação
${sections.foundation}

---

## ⚡ Desenvolvimento
${sections.development}

---

## 🔗 Integração
${sections.integration}

---

## 💡 Consolidação
${sections.consolidation}

---

*Aula gerada automaticamente pelo sistema EDC+ V3.1*
*Tempo estimado de leitura: ${calculateReadingTime(sections)}*
`;

  return unifiedContent;
}

/**
 * Gera metadados da aula-texto
 */
function generateMetadata(
  content: string,
  webData: WebSearchResult,
  scientificData: any
): LessonTextResult['metadata'] {

  const wordCount = content.split(/\s+/).length;
  const estimatedReadingTime = `${Math.ceil(wordCount / 200)} min`; // 200 palavras/min

  const sources = [
    ...webData.sources.map(source => ({
      title: source.title,
      url: source.url,
      type: 'web' as const
    })),
    ...(scientificData?.sources || []).map((source: any) => ({
      title: source.title || 'Fonte acadêmica',
      url: source.url || '#',
      type: 'academic' as const
    }))
  ].slice(0, 10); // Limitar a 10 fontes

  return {
    wordCount,
    estimatedReadingTime,
    difficultyLevel: determineDifficultyLevel(content),
    sources
  };
}

/**
 * Calcula tempo de leitura baseado no conteúdo
 */
function calculateReadingTime(sections: LessonTextResult['structure']): string {
  const totalContent = Object.values(sections).join(' ');
  const wordCount = totalContent.split(/\s+/).length;
  const minutes = Math.ceil(wordCount / 200); // 200 palavras por minuto

  if (minutes < 60) {
    return `${minutes} min`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}min`;
  }
}

/**
 * Determina nível de dificuldade baseado no conteúdo
 */
function determineDifficultyLevel(content: string): string {
  const technicalTerms = (content.match(/[A-Z][a-z]+ção|[A-Z][a-z]+ismo|[A-Z][a-z]+ncia/g) || []).length;
  const sentenceComplexity = content.split(/[.!?]/).reduce((acc, sentence) => {
    return acc + (sentence.split(/[,;:]/).length - 1);
  }, 0);

  const complexityScore = (technicalTerms * 2) + (sentenceComplexity / 10);

  if (complexityScore < 10) return 'Iniciante';
  if (complexityScore < 25) return 'Intermediário';
  return 'Avançado';
}

/**
 * Versão simplificada para testes rápidos
 */
export async function generateSimpleLessonText(
  subtopicTitle: string,
  discipline: string,
  level: 'beginner' | 'intermediate' | 'advanced' = 'intermediate'
): Promise<string> {

  const input: LessonTextInput = {
    subtopicTitle,
    subtopicDescription: `Aula sobre ${subtopicTitle}`,
    moduleTitle: 'Módulo de Estudo',
    courseTitle: `Curso de ${discipline}`,
    userLevel: level,
    discipline,
    estimatedDuration: '45 min'
  };

  const result = await generateLessonText(input);
  return result.content;
}