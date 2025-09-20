/**
 * Sistema de Avaliação de Conhecimento Prévio
 * Analisa o que o usuário já sabe para personalizar o curso
 */

import { LearningGoal, Module, Topic } from '@/types';

export interface KnowledgeAssessment {
  knownConcepts: string[];
  unknownConcepts: string[];
  partialConcepts: string[];
  recommendedStartingPoint: string;
  skipTopics: string[];
  focusAreas: string[];
  difficultyAdjustment: 'reduce' | 'maintain' | 'increase';
  confidence: number; // 0-1
}

export interface PriorKnowledgeAnalysis {
  hasSignificantKnowledge: boolean;
  knowledgeLevel: 'basic' | 'intermediate' | 'advanced';
  specificKnowledge: {
    concepts: string[];
    skills: string[];
    tools: string[];
    experience: string[];
  };
  gaps: string[];
  recommendations: string[];
}

/**
 * Analisa conhecimento prévio do usuário usando IA
 */
export async function analyzePriorKnowledge(
  priorKnowledge: string,
  subject: string,
  targetLevel: string
): Promise<PriorKnowledgeAnalysis> {
  const prompt = `
    Analise o conhecimento prévio do usuário sobre "${subject}".

    Conhecimento declarado pelo usuário:
    "${priorKnowledge}"

    Nível desejado: ${targetLevel}

    Por favor, identifique:
    1. Conceitos que o usuário já domina
    2. Habilidades práticas demonstradas
    3. Ferramentas/tecnologias conhecidas
    4. Experiências relevantes mencionadas
    5. Lacunas de conhecimento identificadas
    6. Nível real estimado (básico/intermediário/avançado)

    Retorne um JSON com a estrutura:
    {
      "hasSignificantKnowledge": boolean,
      "knowledgeLevel": "basic|intermediate|advanced",
      "specificKnowledge": {
        "concepts": ["conceito1", "conceito2"],
        "skills": ["habilidade1", "habilidade2"],
        "tools": ["ferramenta1", "ferramenta2"],
        "experience": ["experiencia1", "experiencia2"]
      },
      "gaps": ["lacuna1", "lacuna2"],
      "recommendations": ["recomendacao1", "recomendacao2"]
    }
  `;

  try {
    // Simulação de análise de conhecimento prévio
    // Em produção, integraria com OpenAI
    const analysis = simulateKnowledgeAnalysis(priorKnowledge, subject, targetLevel);

    console.log('🧠 Análise de conhecimento prévio:', analysis);
    return analysis;
  } catch (error) {
    console.error('❌ Erro na análise de conhecimento prévio:', error);
    return getDefaultAnalysis();
  }
}

/**
 * Simula análise de conhecimento prévio (para desenvolvimento)
 */
function simulateKnowledgeAnalysis(
  priorKnowledge: string,
  subject: string,
  targetLevel: string
): PriorKnowledgeAnalysis {
  const knowledgeText = priorKnowledge.toLowerCase();

  // Mapas de conceitos por área
  const conceptMaps = {
    'mecânica': {
      basic: ['força', 'peso', 'massa', 'velocidade', 'aceleração'],
      intermediate: ['momento', 'torque', 'equilíbrio', 'centro de gravidade', 'centroide'],
      advanced: ['dinâmica', 'cinemática', 'análise estrutural', 'vibração', 'estabilidade']
    },
    'programação': {
      basic: ['variável', 'função', 'loop', 'condicional', 'array'],
      intermediate: ['classe', 'objeto', 'herança', 'polimorfismo', 'interface'],
      advanced: ['padrões de design', 'arquitetura', 'performance', 'threading', 'concorrência']
    },
    'matemática': {
      basic: ['soma', 'multiplicação', 'equação', 'fração', 'porcentagem'],
      intermediate: ['derivada', 'integral', 'limite', 'função', 'gráfico'],
      advanced: ['análise', 'topologia', 'álgebra abstrata', 'cálculo avançado']
    }
  };

  // Detectar área do conhecimento
  let detectedArea = 'geral';
  for (const area of Object.keys(conceptMaps)) {
    if (subject.toLowerCase().includes(area) || knowledgeText.includes(area)) {
      detectedArea = area;
      break;
    }
  }

  const concepts = conceptMaps[detectedArea as keyof typeof conceptMaps] || {
    basic: [], intermediate: [], advanced: []
  };

  // Identificar conceitos mencionados
  const knownConcepts: string[] = [];
  const knownSkills: string[] = [];
  const knownTools: string[] = [];
  const experience: string[] = [];

  // Análise de conceitos básicos
  concepts.basic.forEach(concept => {
    if (knowledgeText.includes(concept)) {
      knownConcepts.push(concept);
    }
  });

  // Análise de conceitos intermediários
  concepts.intermediate.forEach(concept => {
    if (knowledgeText.includes(concept)) {
      knownConcepts.push(concept);
    }
  });

  // Análise de conceitos avançados
  concepts.advanced.forEach(concept => {
    if (knowledgeText.includes(concept)) {
      knownConcepts.push(concept);
    }
  });

  // Detectar habilidades práticas
  const skillKeywords = ['sei calcular', 'consigo fazer', 'já fiz', 'implementei', 'desenvolvi', 'criei'];
  skillKeywords.forEach(keyword => {
    if (knowledgeText.includes(keyword)) {
      const context = extractContext(knowledgeText, keyword);
      knownSkills.push(context);
    }
  });

  // Detectar ferramentas/tecnologias
  const toolKeywords = ['python', 'java', 'javascript', 'autocad', 'solidworks', 'excel', 'matlab'];
  toolKeywords.forEach(tool => {
    if (knowledgeText.includes(tool)) {
      knownTools.push(tool);
    }
  });

  // Detectar experiência
  const experienceKeywords = ['anos', 'meses', 'trabalho', 'projeto', 'curso', 'universidade'];
  experienceKeywords.forEach(keyword => {
    if (knowledgeText.includes(keyword)) {
      const context = extractContext(knowledgeText, keyword);
      experience.push(context);
    }
  });

  // Determinar nível de conhecimento
  let knowledgeLevel: 'basic' | 'intermediate' | 'advanced' = 'basic';
  let hasSignificantKnowledge = false;

  if (knownConcepts.length >= 3 || knownSkills.length >= 2) {
    hasSignificantKnowledge = true;

    if (concepts.advanced.some(concept => knownConcepts.includes(concept))) {
      knowledgeLevel = 'advanced';
    } else if (concepts.intermediate.some(concept => knownConcepts.includes(concept))) {
      knowledgeLevel = 'intermediate';
    }
  }

  // Identificar lacunas
  const gaps: string[] = [];
  if (targetLevel === 'advanced' && knowledgeLevel !== 'advanced') {
    gaps.push('Conceitos avançados necessários para o nível desejado');
  }
  if (knownSkills.length === 0) {
    gaps.push('Experiência prática limitada');
  }

  // Gerar recomendações
  const recommendations: string[] = [];
  if (hasSignificantKnowledge) {
    recommendations.push('Curso pode ser adaptado para focar em tópicos avançados');
    recommendations.push('Considerar pular conceitos básicos já dominados');
  } else {
    recommendations.push('Começar com fundamentos sólidos');
    recommendations.push('Incluir mais exemplos práticos');
  }

  return {
    hasSignificantKnowledge,
    knowledgeLevel,
    specificKnowledge: {
      concepts: knownConcepts,
      skills: knownSkills,
      tools: knownTools,
      experience
    },
    gaps,
    recommendations
  };
}

/**
 * Extrai contexto ao redor de uma palavra-chave
 */
function extractContext(text: string, keyword: string, contextSize: number = 30): string {
  const index = text.indexOf(keyword);
  if (index === -1) return '';

  const start = Math.max(0, index - contextSize);
  const end = Math.min(text.length, index + keyword.length + contextSize);

  return text.substring(start, end).trim();
}

/**
 * Avalia compatibilidade entre conhecimento e curso
 */
export function assessCourseCompatibility(
  course: LearningGoal,
  priorKnowledge: PriorKnowledgeAnalysis
): KnowledgeAssessment {
  const knownConcepts = priorKnowledge.specificKnowledge.concepts;
  const allTopics = extractAllTopics(course);

  // Identificar tópicos que podem ser pulados
  const skipTopics = allTopics.filter(topic =>
    knownConcepts.some(concept =>
      topic.toLowerCase().includes(concept.toLowerCase())
    )
  );

  // Identificar áreas de foco
  const focusAreas = priorKnowledge.gaps.concat(
    allTopics.filter(topic => !skipTopics.includes(topic))
  );

  // Determinar ajuste de dificuldade
  let difficultyAdjustment: 'reduce' | 'maintain' | 'increase' = 'maintain';

  if (priorKnowledge.knowledgeLevel === 'advanced') {
    difficultyAdjustment = 'increase';
  } else if (priorKnowledge.knowledgeLevel === 'basic' && course.level === 'advanced') {
    difficultyAdjustment = 'reduce';
  }

  return {
    knownConcepts,
    unknownConcepts: focusAreas,
    partialConcepts: [], // TODO: implementar lógica para conceitos parciais
    recommendedStartingPoint: skipTopics.length > 0 ?
      `Módulo ${Math.ceil(skipTopics.length / 3) + 1}` : 'Módulo 1',
    skipTopics,
    focusAreas,
    difficultyAdjustment,
    confidence: calculateConfidence(priorKnowledge, course)
  };
}

/**
 * Extrai todos os tópicos de um curso
 */
function extractAllTopics(course: LearningGoal): string[] {
  const topics: string[] = [];

  // Tópicos diretos (estrutura legacy)
  if (course.topics) {
    topics.push(...course.topics.map(t => t.title));
  }

  // Tópicos em módulos (estrutura hierárquica)
  if (course.modules) {
    course.modules.forEach(module => {
      if (module.topics) {
        topics.push(...module.topics.map(t => t.title));
      }
    });
  }

  return topics;
}

/**
 * Calcula confiança da avaliação (0-1)
 */
function calculateConfidence(
  analysis: PriorKnowledgeAnalysis,
  course: LearningGoal
): number {
  let confidence = 0.5; // Base

  // Aumentar confiança baseado na quantidade de informação
  const totalKnowledge =
    analysis.specificKnowledge.concepts.length +
    analysis.specificKnowledge.skills.length +
    analysis.specificKnowledge.experience.length;

  confidence += Math.min(totalKnowledge * 0.05, 0.3);

  // Ajustar baseado na compatibilidade com o curso
  if (analysis.knowledgeLevel === course.level) {
    confidence += 0.2;
  }

  return Math.min(confidence, 1.0);
}

/**
 * Retorna análise padrão em caso de erro
 */
function getDefaultAnalysis(): PriorKnowledgeAnalysis {
  return {
    hasSignificantKnowledge: false,
    knowledgeLevel: 'basic',
    specificKnowledge: {
      concepts: [],
      skills: [],
      tools: [],
      experience: []
    },
    gaps: ['Análise de conhecimento prévio não disponível'],
    recommendations: ['Começar com conceitos fundamentais']
  };
}

/**
 * Personaliza curso baseado no conhecimento prévio
 */
export function personalizeCourseContent(
  course: LearningGoal,
  assessment: KnowledgeAssessment
): LearningGoal {
  const personalizedCourse = { ...course };

  // Filtrar tópicos que podem ser pulados
  if (personalizedCourse.topics) {
    personalizedCourse.topics = personalizedCourse.topics.filter(topic =>
      !assessment.skipTopics.some(skip =>
        topic.title.toLowerCase().includes(skip.toLowerCase())
      )
    );
  }

  // Ajustar módulos
  if (personalizedCourse.modules) {
    personalizedCourse.modules = personalizedCourse.modules.map(module => ({
      ...module,
      topics: module.topics?.filter(topic =>
        !assessment.skipTopics.some(skip =>
          topic.title.toLowerCase().includes(skip.toLowerCase())
        )
      ) || []
    })).filter(module => module.topics && module.topics.length > 0);
  }

  // Adicionar nota sobre personalização
  personalizedCourse.description = `${personalizedCourse.description || ''}\n\n✨ Curso personalizado baseado em seu conhecimento prévio. ${assessment.skipTopics.length} tópicos foram ajustados ou removidos.`;

  return personalizedCourse;
}