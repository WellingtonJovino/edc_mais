/**
 * Templates de Prompt para Aula-Texto
 * Baseado em "Explicações de Alta Qualidade por IA: Estado da Arte e Recomendações"
 *
 * Princípios pedagógicos aplicados:
 * - Aprendizagem ativa (perguntas socráticas)
 * - Controle da carga cognitiva (estrutura clara)
 * - Personalização por nível
 * - Exemplos concretos e analogias
 * - Feedback e verificação
 */

export interface AulaTextoConfig {
  topic: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  studentProfile?: {
    priorKnowledge?: string[];
    learningGoals?: string[];
    timeAvailable?: string;
  };
  ragContext?: string[];
  maxWords?: number;
}

export interface AulaTextoStructure {
  topic: string;
  level: string;
  metadata: {
    generatedAt: string;
    sources: string[];
    tokensUsed?: number;
    qualityScore?: number;
  };
  introducao: {
    objetivos: string[];
    preRequisitos: string[];
    tempoEstimado: string;
    overview: string;
  };
  desenvolvimento: {
    conceitos: Array<{
      titulo: string;
      definicao: string;
      explicacao: string;
      exemplos: Array<{
        titulo: string;
        descricao: string;
        solucao?: string;
      }>;
      analogias: string[];
      figuras?: Array<{
        descricao: string;
        imagePrompt: string;
      }>;
    }>;
  };
  conclusao: {
    resumoExecutivo: string;
    pontosChave: string[];
    conexoesFuturas: string[];
  };
  verificacao: {
    perguntasReflexao: string[];
    exercicios: Array<{
      pergunta: string;
      dificuldade: 'facil' | 'medio' | 'dificil';
      gabarito: string;
      explicacao: string;
    }>;
    autoavaliacao: string[];
  };
  referencias: Array<{
    titulo: string;
    tipo: 'documento' | 'video' | 'artigo' | 'site';
    url?: string;
    citacao?: string;
  }>;
}

/**
 * System Prompt Principal para Geração de Aula-Texto
 * Baseado nas melhores práticas pedagógicas
 */
export const SYSTEM_PROMPT_AULA_TEXTO = `Você é um professor universitário especialista em pedagogia e design instrucional.

Sua missão: gerar uma AULA-TEXTO acadêmica de alta qualidade que siga princípios científicos de aprendizagem.

PRINCÍPIOS PEDAGÓGICOS OBRIGATÓRIOS:
1. **Aprendizagem Ativa**: Inclua perguntas socráticas e momentos de reflexão
2. **Carga Cognitiva Controlada**: Estruture em seções progressivas e digestíveis
3. **Personalização**: Adapte linguagem e profundidade ao nível do aluno
4. **Exemplos Concretos**: Use pelo menos 2 analogias e 3 exemplos práticos
5. **Verificação**: Inclua exercícios de auto-verificação

ESTRUTURA OBRIGATÓRIA:
- **Introdução**: Objetivos claros, pré-requisitos, visão geral motivadora
- **Desenvolvimento**: Conceitos principais com definições, explicações passo-a-passo, exemplos resolvidos
- **Conclusão**: Resumo executivo, pontos-chave, conexões futuras
- **Verificação**: Perguntas de reflexão, exercícios com gabarito, auto-avaliação

QUALIDADE TEXTUAL:
- Use linguagem clara e acessível ao nível especificado
- Defina todos os termos técnicos na primeira menção
- Mantenha tom didático e envolvente
- Inclua transições fluidas entre seções
- Cite fontes quando usar informações específicas

FORMATO DE SAÍDA:
Retorne um JSON válido seguindo exatamente a estrutura AulaTextoStructure fornecida.`;

/**
 * Templates Personalizados por Nível
 */
export const NIVEL_TEMPLATES = {
  beginner: {
    vocabulario: "Use linguagem simples e evite jargões. Explique todos os termos técnicos.",
    profundidade: "Foque nos conceitos fundamentais. Use muitos exemplos do cotidiano.",
    exemplos: "Use analogias simples e situações familiares. Evite complexidade matemática avançada.",
    exercicios: "Exercícios práticos básicos com respostas step-by-step detalhadas."
  },
  intermediate: {
    vocabulario: "Pode usar terminologia técnica, mas sempre explicando. Assuma conhecimento básico.",
    profundidade: "Explore conceitos principais e algumas nuances. Conecte com conhecimento prévio.",
    exemplos: "Use casos reais e alguns exemplos técnicos. Introduza aplicações práticas.",
    exercicios: "Exercícios moderados que conectem teoria e prática."
  },
  advanced: {
    vocabulario: "Use terminologia técnica apropriada. Assuma conhecimento sólido da área.",
    profundidade: "Explore detalhes técnicos, limitações, e casos especiais. Discuta estado da arte.",
    exemplos: "Use casos complexos, research papers, e exemplos industriais.",
    exercicios: "Exercícios desafiadores que requerem pensamento crítico e análise."
  }
};

/**
 * Prompt para Avaliação Automática de Qualidade
 */
export const SYSTEM_PROMPT_AVALIACAO = `Você é um avaliador pedagógico especialista em qualidade de conteúdo educacional.

Avalie o texto da aula-texto segundo esta rubrica (peso entre parênteses):

1. **Clareza** (20%): Linguagem clara, transições fluidas, estrutura lógica
2. **Completude Conceitual** (25%): Cobertura adequada do tópico, profundidade apropriada
3. **Precisão Factual** (20%): Informações corretas, fontes citadas quando necessário
4. **Exemplos e Aplicações** (15%): Qualidade e relevância dos exemplos, analogias eficazes
5. **Exercícios e Verificação** (10%): Presença de exercícios, qualidade das perguntas de reflexão
6. **Adequação ao Nível** (10%): Vocabulário e profundidade apropriados ao nível do aluno

FORMATO DE RESPOSTA:
{
  "score": number, // 0-10 com 2 casas decimais
  "detalhamento": {
    "clareza": { "pontos": number, "comentario": string },
    "completude": { "pontos": number, "comentario": string },
    "precisao": { "pontos": number, "comentario": string },
    "exemplos": { "pontos": number, "comentario": string },
    "exercicios": { "pontos": number, "comentario": string },
    "adequacao": { "pontos": number, "comentario": string }
  },
  "checklist": [
    { "item": string, "ok": boolean, "comentario": string }
  ],
  "feedback": string[], // até 6 sugestões acionáveis
  "needsRewrite": boolean, // true se score < 8
  "strengths": string[], // pontos fortes identificados
  "improvementAreas": string[] // áreas específicas para melhorar
}`;

/**
 * Prompt para Melhoria Automática
 */
export const SYSTEM_PROMPT_MELHORIA = `Você é um editor pedagógico especialista em melhoria de conteúdo educacional.

Reescreva as seções indicadas do texto original para resolver os feedbacks listados.

REQUISITOS DE MELHORIA:
- Manter tom didático e estrutura geral
- Adicionar pelo menos 1 novo exemplo concreto
- Incluir 1 analogia adicional onde apropriado
- Melhorar clareza em frases com mais de 25 palavras
- Fortalecer conexões entre conceitos
- Adicionar verificações de conhecimento quando necessário

FOQUE EM:
{feedback_areas} // áreas específicas de melhoria

MANTENHA:
- Estrutura JSON original
- Seções que não precisam de melhoria
- Referências e citações existentes
- Nível de complexidade apropriado`;

/**
 * Função para construir prompt personalizado
 */
export function buildAulaTextoPrompt(config: AulaTextoConfig): string {
  const nivelTemplate = NIVEL_TEMPLATES[config.level];

  let contextSection = '';
  if (config.ragContext && config.ragContext.length > 0) {
    contextSection = `
CONTEXTO RELEVANTE (extraído de documentos e fontes confiáveis):
${config.ragContext.map((snippet, i) => `[Fonte ${i + 1}] ${snippet}`).join('\n')}

Use este contexto para fundamentar suas explicações e cite as fontes quando apropriado.`;
  }

  let profileSection = '';
  if (config.studentProfile) {
    profileSection = `
PERFIL DO ALUNO:
- Nível: ${config.level}
- Conhecimento prévio: ${config.studentProfile.priorKnowledge?.join(', ') || 'Não especificado'}
- Objetivos: ${config.studentProfile.learningGoals?.join(', ') || 'Não especificado'}
- Tempo disponível: ${config.studentProfile.timeAvailable || 'Não especificado'}`;
  }

  return `${SYSTEM_PROMPT_AULA_TEXTO}

TÓPICO: "${config.topic}"
NÍVEL: ${config.level}

DIRETRIZES ESPECÍFICAS PARA ESTE NÍVEL:
- Vocabulário: ${nivelTemplate.vocabulario}
- Profundidade: ${nivelTemplate.profundidade}
- Exemplos: ${nivelTemplate.exemplos}
- Exercícios: ${nivelTemplate.exercicios}

${profileSection}

${contextSection}

TAMANHO ALVO: ${config.maxWords || 1500} palavras (adaptável conforme necessário para completude)

Gere a aula-texto seguindo exatamente a estrutura JSON especificada, priorizando qualidade pedagógica sobre brevidade.`;
}

/**
 * Função para validar estrutura da aula-texto
 */
export function validateAulaTextoStructure(aulaTexto: any): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Verificações obrigatórias
  if (!aulaTexto.topic) errors.push("Campo 'topic' é obrigatório");
  if (!aulaTexto.level) errors.push("Campo 'level' é obrigatório");
  if (!aulaTexto.introducao) errors.push("Seção 'introducao' é obrigatória");
  if (!aulaTexto.desenvolvimento) errors.push("Seção 'desenvolvimento' é obrigatória");
  if (!aulaTexto.conclusao) errors.push("Seção 'conclusao' é obrigatória");
  if (!aulaTexto.verificacao) errors.push("Seção 'verificacao' é obrigatória");

  // Verificações de qualidade
  if (aulaTexto.introducao && !aulaTexto.introducao.objetivos?.length) {
    warnings.push("Introdução deveria ter objetivos definidos");
  }

  if (aulaTexto.desenvolvimento && !aulaTexto.desenvolvimento.conceitos?.length) {
    warnings.push("Desenvolvimento deveria ter conceitos definidos");
  }

  if (aulaTexto.verificacao && !aulaTexto.verificacao.exercicios?.length) {
    warnings.push("Seção de verificação deveria ter exercícios");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Checklist mínimo para qualidade pedagógica
 */
export const QUALITY_CHECKLIST = [
  {
    item: "Definições claras de termos técnicos",
    check: (aula: AulaTextoStructure) =>
      aula.desenvolvimento.conceitos.some(c => c.definicao && c.definicao.length > 20)
  },
  {
    item: "Pelo menos 2 exemplos práticos",
    check: (aula: AulaTextoStructure) =>
      aula.desenvolvimento.conceitos.reduce((acc, c) => acc + c.exemplos.length, 0) >= 2
  },
  {
    item: "Exercícios de verificação presentes",
    check: (aula: AulaTextoStructure) =>
      aula.verificacao.exercicios && aula.verificacao.exercicios.length >= 3
  },
  {
    item: "Objetivos claros na introdução",
    check: (aula: AulaTextoStructure) =>
      aula.introducao.objetivos && aula.introducao.objetivos.length >= 2
  },
  {
    item: "Resumo executivo na conclusão",
    check: (aula: AulaTextoStructure) =>
      aula.conclusao.resumoExecutivo && aula.conclusao.resumoExecutivo.length > 50
  }
];