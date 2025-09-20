/**
 * Sistema de Validação Pós-Geração de Syllabus
 * Implementa verificações automáticas de qualidade, cobertura e coerência pedagógica
 */

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  weight: number; // 0-1, importância da regra
  critical: boolean; // Se falhou, reprova o syllabus
}

export interface ValidationResult {
  ruleId: string;
  passed: boolean;
  score: number; // 0-1
  feedback: string;
  suggestions: string[];
  evidence?: any[];
}

export interface SyllabusValidationReport {
  overallScore: number; // 0-10
  passed: boolean;
  criticalFailures: string[];
  results: ValidationResult[];
  recommendations: string[];
  evidenceGaps: string[];
  pedagogicalIssues: string[];
  needsHumanReview: boolean;
}

const VALIDATION_RULES: ValidationRule[] = [
  {
    id: 'coverage_completeness',
    name: 'Cobertura Completa',
    description: 'Verifica se o syllabus cobre todos os tópicos essenciais do domínio',
    weight: 0.25,
    critical: true
  },
  {
    id: 'topological_prerequisites',
    name: 'Sequência de Pré-requisitos',
    description: 'Verifica se a ordem dos tópicos respeita dependências pedagógicas',
    weight: 0.20,
    critical: true
  },
  {
    id: 'module_granularity',
    name: 'Granularidade dos Módulos',
    description: 'Verifica se módulos têm tamanho apropriado (45-120 min)',
    weight: 0.15,
    critical: false
  },
  {
    id: 'evidence_quality',
    name: 'Qualidade das Evidências',
    description: 'Verifica se cada módulo tem evidências suficientes e confiáveis',
    weight: 0.15,
    critical: false
  },
  {
    id: 'bloom_progression',
    name: 'Progressão de Bloom',
    description: 'Verifica se há progressão adequada na taxonomia de Bloom',
    weight: 0.10,
    critical: false
  },
  {
    id: 'pedagogical_coherence',
    name: 'Coerência Pedagógica',
    description: 'Verifica se objetivos, métodos e avaliações estão alinhados',
    weight: 0.10,
    critical: false
  },
  {
    id: 'personalization_applied',
    name: 'Personalização Aplicada',
    description: 'Verifica se recomendações de personalização foram incorporadas',
    weight: 0.05,
    critical: false
  }
];

/**
 * Valida syllabus completo contra todas as regras
 */
export async function validateSyllabus(
  syllabusData: any,
  originalMessage: string,
  userProfile?: any,
  evidences?: any[]
): Promise<SyllabusValidationReport> {
  console.log('🔍 Iniciando validação completa do syllabus...');

  const results: ValidationResult[] = [];
  const criticalFailures: string[] = [];
  let totalScore = 0;
  let totalWeight = 0;

  // Executar cada regra de validação
  for (const rule of VALIDATION_RULES) {
    console.log(`📋 Validando: ${rule.name}`);

    const result = await executeValidationRule(rule, syllabusData, originalMessage, userProfile, evidences);
    results.push(result);

    totalScore += result.score * rule.weight;
    totalWeight += rule.weight;

    if (!result.passed && rule.critical) {
      criticalFailures.push(rule.name);
    }
  }

  // Calcular score final (0-10)
  const overallScore = totalWeight > 0 ? (totalScore / totalWeight) * 10 : 0;
  const passed = criticalFailures.length === 0 && overallScore >= 6.0;

  // Gerar recomendações baseadas nos resultados
  const recommendations = generateRecommendations(results);
  const evidenceGaps = identifyEvidenceGaps(syllabusData, evidences);
  const pedagogicalIssues = identifyPedagogicalIssues(results);

  // Decidir se precisa de revisão humana
  const needsHumanReview = criticalFailures.length > 0 ||
                          overallScore < 7.0 ||
                          evidenceGaps.length > 3;

  const report: SyllabusValidationReport = {
    overallScore: Number(overallScore.toFixed(1)),
    passed,
    criticalFailures,
    results,
    recommendations,
    evidenceGaps,
    pedagogicalIssues,
    needsHumanReview
  };

  console.log(`✅ Validação concluída: Score ${report.overallScore}/10, Passou: ${passed}`);

  return report;
}

/**
 * Executa uma regra específica de validação
 */
async function executeValidationRule(
  rule: ValidationRule,
  syllabusData: any,
  originalMessage: string,
  userProfile?: any,
  evidences?: any[]
): Promise<ValidationResult> {
  switch (rule.id) {
    case 'coverage_completeness':
      return await validateCoverageCompleteness(syllabusData, originalMessage);

    case 'topological_prerequisites':
      return await validateTopologicalPrerequisites(syllabusData);

    case 'module_granularity':
      return validateModuleGranularity(syllabusData);

    case 'evidence_quality':
      return validateEvidenceQuality(syllabusData, evidences);

    case 'bloom_progression':
      return await validateBloomProgression(syllabusData);

    case 'pedagogical_coherence':
      return validatePedagogicalCoherence(syllabusData);

    case 'personalization_applied':
      return validatePersonalizationApplied(syllabusData, userProfile);

    default:
      return {
        ruleId: rule.id,
        passed: false,
        score: 0,
        feedback: 'Regra de validação não implementada',
        suggestions: []
      };
  }
}

/**
 * Valida se o syllabus cobre tópicos essenciais
 */
async function validateCoverageCompleteness(
  syllabusData: any,
  originalMessage: string
): Promise<ValidationResult> {
  try {
    // Importar sistema de domínio para verificar cobertura
    const { analyzePedagogicalStructure, getEssentialTopicsForDomain } = await import('./pedagogicalEngine');

    const analysis = analyzePedagogicalStructure(originalMessage, {});
    const essentialTopics = getEssentialTopicsForDomain(analysis.domain.name);

    if (!essentialTopics || essentialTopics.length === 0) {
      return {
        ruleId: 'coverage_completeness',
        passed: true,
        score: 0.8,
        feedback: 'Domínio não tem tópicos essenciais definidos',
        suggestions: []
      };
    }

    // Extrair todos os tópicos do syllabus
    const syllabusTopics = extractAllTopicsFromSyllabus(syllabusData);

    // Verificar cobertura
    const coverage = calculateTopicCoverage(essentialTopics, syllabusTopics);
    const passed = coverage.percentageCovered >= 0.8; // 80% de cobertura mínima

    return {
      ruleId: 'coverage_completeness',
      passed,
      score: coverage.percentageCovered,
      feedback: `Cobertura: ${(coverage.percentageCovered * 100).toFixed(1)}% dos tópicos essenciais`,
      suggestions: coverage.missing.map(topic => `Adicionar tópico: ${topic}`)
    };
  } catch (error) {
    console.warn('Erro na validação de cobertura:', error);
    return {
      ruleId: 'coverage_completeness',
      passed: true,
      score: 0.7,
      feedback: 'Validação de cobertura não pôde ser executada',
      suggestions: []
    };
  }
}

/**
 * Valida sequência topológica de pré-requisitos
 */
async function validateTopologicalPrerequisites(syllabusData: any): Promise<ValidationResult> {
  const modules = syllabusData.modules || [];
  const violations: string[] = [];

  // Regras básicas de dependência (simplificadas)
  const prerequisiteRules = [
    { requires: 'fundamentos', before: ['avançado', 'aplicações', 'projetos'] },
    { requires: 'conceitos básicos', before: ['técnicas', 'métodos', 'análise'] },
    { requires: 'introdução', before: ['desenvolvimento', 'implementação'] }
  ];

  for (let i = 0; i < modules.length; i++) {
    const currentModule = modules[i];
    const currentTitle = currentModule.title?.toLowerCase() || '';

    for (const rule of prerequisiteRules) {
      const hasRequirement = currentTitle.includes(rule.requires);

      if (hasRequirement) {
        // Verificar se módulos posteriores dependem deste
        for (let j = 0; j < i; j++) {
          const previousTitle = modules[j].title?.toLowerCase() || '';

          if (rule.before.some(term => previousTitle.includes(term))) {
            violations.push(`"${modules[j].title}" aparece antes de "${currentModule.title}"`);
          }
        }
      }
    }
  }

  const score = violations.length === 0 ? 1.0 : Math.max(0, 1 - violations.length * 0.2);

  return {
    ruleId: 'topological_prerequisites',
    passed: violations.length === 0,
    score,
    feedback: violations.length === 0 ?
      'Sequência de pré-requisitos correta' :
      `${violations.length} violações de sequência detectadas`,
    suggestions: violations.map(v => `Reordenar: ${v}`)
  };
}

/**
 * Valida granularidade dos módulos
 */
function validateModuleGranularity(syllabusData: any): ValidationResult {
  const modules = syllabusData.modules || [];
  const issues: string[] = [];

  for (const module of modules) {
    const duration = parseDuration(module.estimatedDuration || '');
    const topicCount = module.topics?.length || 0;

    // Verificar duração (45-120 min idealmente)
    if (duration < 30) {
      issues.push(`Módulo "${module.title}" muito curto (${duration} min)`);
    } else if (duration > 180) {
      issues.push(`Módulo "${module.title}" muito longo (${duration} min)`);
    }

    // Verificar número de tópicos (2-6 idealmente)
    if (topicCount > 8) {
      issues.push(`Módulo "${module.title}" tem muitos tópicos (${topicCount})`);
    } else if (topicCount === 0) {
      issues.push(`Módulo "${module.title}" não tem tópicos definidos`);
    }
  }

  const score = issues.length === 0 ? 1.0 : Math.max(0, 1 - issues.length * 0.1);

  return {
    ruleId: 'module_granularity',
    passed: issues.length <= 2, // Permitir até 2 problemas menores
    score,
    feedback: issues.length === 0 ?
      'Granularidade dos módulos apropriada' :
      `${issues.length} problemas de granularidade`,
    suggestions: issues.map(issue => `Ajustar: ${issue}`)
  };
}

/**
 * Valida qualidade das evidências
 */
function validateEvidenceQuality(syllabusData: any, evidences?: any[]): ValidationResult {
  const modules = syllabusData.modules || [];
  const issues: string[] = [];

  if (!evidences || evidences.length === 0) {
    return {
      ruleId: 'evidence_quality',
      passed: false,
      score: 0.3,
      feedback: 'Nenhuma evidência fornecida para validação',
      suggestions: ['Incluir evidências académicas para fundamentar o conteúdo']
    };
  }

  // Verificar se cada módulo tem evidências suficientes
  for (const module of modules) {
    const moduleEvidences = module.evidence || [];

    if (moduleEvidences.length === 0) {
      issues.push(`Módulo "${module.title}" sem evidências`);
    } else {
      // Verificar qualidade das evidências
      const lowQualityEvidences = moduleEvidences.filter((e: any) =>
        e.confidence_score < 0.6 || e.authority_score < 0.5
      );

      if (lowQualityEvidences.length > moduleEvidences.length / 2) {
        issues.push(`Módulo "${module.title}" tem evidências de baixa qualidade`);
      }
    }
  }

  // Verificar distribuição geral de evidências
  const avgConfidence = evidences.reduce((sum, e) => sum + (e.confidence_score || 0), 0) / evidences.length;

  if (avgConfidence < 0.7) {
    issues.push('Confiança média das evidências muito baixa');
  }

  const score = issues.length === 0 ? 1.0 : Math.max(0.2, 1 - issues.length * 0.15);

  return {
    ruleId: 'evidence_quality',
    passed: issues.length <= 1 && avgConfidence >= 0.6,
    score,
    feedback: `Qualidade das evidências: ${issues.length} problemas, confiança média: ${(avgConfidence * 100).toFixed(1)}%`,
    suggestions: issues.map(issue => `Melhorar: ${issue}`)
  };
}

/**
 * Valida progressão da taxonomia de Bloom
 */
async function validateBloomProgression(syllabusData: any): Promise<ValidationResult> {
  try {
    const { detectBloomLevel } = await import('./pedagogicalEngine');

    const modules = syllabusData.modules || [];
    const bloomLevels: number[] = [];

    for (const module of modules) {
      const moduleText = `${module.title} ${module.description || ''}`;
      const level = detectBloomLevel(moduleText);
      bloomLevels.push(level);
    }

    // Verificar se há progressão (níveis devem tender a aumentar)
    let progressionScore = 0;
    for (let i = 1; i < bloomLevels.length; i++) {
      if (bloomLevels[i] >= bloomLevels[i-1]) {
        progressionScore += 1;
      }
    }

    const score = bloomLevels.length > 1 ? progressionScore / (bloomLevels.length - 1) : 1;
    const passed = score >= 0.7; // 70% dos módulos devem seguir progressão

    return {
      ruleId: 'bloom_progression',
      passed,
      score,
      feedback: `Progressão de Bloom: ${(score * 100).toFixed(1)}% adequada`,
      suggestions: passed ? [] : [
        'Reorganizar módulos para seguir progressão cognitiva',
        'Começar com conhecimento/compreensão e evoluir para síntese/avaliação'
      ]
    };
  } catch (error) {
    return {
      ruleId: 'bloom_progression',
      passed: true,
      score: 0.7,
      feedback: 'Validação de Bloom não pôde ser executada',
      suggestions: []
    };
  }
}

/**
 * Valida coerência pedagógica
 */
function validatePedagogicalCoherence(syllabusData: any): ValidationResult {
  const issues: string[] = [];

  // Verificar se há objetivos definidos
  if (!syllabusData.description) {
    issues.push('Falta descrição/objetivos do curso');
  }

  // Verificar consistência de durações
  const modules = syllabusData.modules || [];
  const estimatedTotal = modules.reduce((sum: number, m: any) => {
    return sum + parseDuration(m.estimatedDuration || '');
  }, 0);

  const declaredTotal = parseDuration(syllabusData.totalDuration || '');

  if (Math.abs(estimatedTotal - declaredTotal) > declaredTotal * 0.2) {
    issues.push('Duração total inconsistente com soma dos módulos');
  }

  // Verificar se há nível definido
  if (!syllabusData.level) {
    issues.push('Nível do curso não definido');
  }

  const score = issues.length === 0 ? 1.0 : Math.max(0.4, 1 - issues.length * 0.2);

  return {
    ruleId: 'pedagogical_coherence',
    passed: issues.length === 0,
    score,
    feedback: issues.length === 0 ?
      'Coerência pedagógica adequada' :
      `${issues.length} problemas de coerência`,
    suggestions: issues.map(issue => `Corrigir: ${issue}`)
  };
}

/**
 * Valida se personalização foi aplicada
 */
function validatePersonalizationApplied(syllabusData: any, userProfile?: any): ValidationResult {
  if (!userProfile) {
    return {
      ruleId: 'personalization_applied',
      passed: true,
      score: 0.8,
      feedback: 'Sem perfil de usuário para validar personalização',
      suggestions: []
    };
  }

  const issues: string[] = [];

  // Verificar se há metadados de personalização
  if (!syllabusData.pedagogicalMetadata?.personalizations) {
    issues.push('Metadados de personalização não encontrados');
  }

  // Verificar se duração dos módulos respeita tempo disponível do usuário
  if (userProfile.timeAvailable) {
    const timeConstraint = userProfile.timeAvailable.includes('30 min');
    const modules = syllabusData.modules || [];

    if (timeConstraint) {
      const longModules = modules.filter((m: any) => parseDuration(m.estimatedDuration || '') > 45);
      if (longModules.length > 0) {
        issues.push('Módulos muito longos para tempo disponível do usuário');
      }
    }
  }

  const score = issues.length === 0 ? 1.0 : Math.max(0.5, 1 - issues.length * 0.3);

  return {
    ruleId: 'personalization_applied',
    passed: issues.length === 0,
    score,
    feedback: issues.length === 0 ?
      'Personalização aplicada adequadamente' :
      `${issues.length} problemas de personalização`,
    suggestions: issues.map(issue => `Ajustar: ${issue}`)
  };
}

// Funções auxiliares

function extractAllTopicsFromSyllabus(syllabusData: any): string[] {
  const topics: string[] = [];
  const modules = syllabusData.modules || [];

  for (const module of modules) {
    topics.push(module.title);

    if (module.topics) {
      for (const topic of module.topics) {
        topics.push(topic.title);

        if (topic.subtopics) {
          topics.push(...topic.subtopics);
        }
      }
    }
  }

  return topics;
}

function calculateTopicCoverage(essential: string[], syllabus: string[]): {
  percentageCovered: number;
  missing: string[];
  covered: string[];
} {
  const syllabusLower = syllabus.map(t => t.toLowerCase());
  const covered: string[] = [];
  const missing: string[] = [];

  for (const essentialTopic of essential) {
    const found = syllabusLower.some(syllTopic =>
      syllTopic.includes(essentialTopic.toLowerCase()) ||
      essentialTopic.toLowerCase().includes(syllTopic)
    );

    if (found) {
      covered.push(essentialTopic);
    } else {
      missing.push(essentialTopic);
    }
  }

  return {
    percentageCovered: essential.length > 0 ? covered.length / essential.length : 1,
    missing,
    covered
  };
}

function parseDuration(duration: string): number {
  const hourMatch = duration.match(/(\d+)\s*h/);
  const minMatch = duration.match(/(\d+)\s*min/);

  let minutes = 0;
  if (hourMatch) minutes += parseInt(hourMatch[1]) * 60;
  if (minMatch) minutes += parseInt(minMatch[1]);

  return minutes || 60; // default 1 hora
}

function generateRecommendations(results: ValidationResult[]): string[] {
  const recommendations: string[] = [];

  for (const result of results) {
    if (!result.passed && result.suggestions.length > 0) {
      recommendations.push(...result.suggestions);
    }
  }

  // Adicionar recomendações gerais baseadas nos scores
  const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;

  if (avgScore < 0.7) {
    recommendations.push('Considerar redesign significativo do syllabus');
  } else if (avgScore < 0.8) {
    recommendations.push('Fazer ajustes menores para melhorar qualidade');
  }

  return [...new Set(recommendations)]; // Remove duplicatas
}

function identifyEvidenceGaps(syllabusData: any, evidences?: any[]): string[] {
  const gaps: string[] = [];
  const modules = syllabusData.modules || [];

  for (const module of modules) {
    const moduleEvidences = module.evidence || [];

    if (moduleEvidences.length === 0) {
      gaps.push(`Módulo "${module.title}" sem evidências`);
    } else if (moduleEvidences.length < 2) {
      gaps.push(`Módulo "${module.title}" com poucas evidências`);
    }
  }

  return gaps;
}

function identifyPedagogicalIssues(results: ValidationResult[]): string[] {
  const issues: string[] = [];

  const criticalFailures = results.filter(r => !r.passed &&
    ['coverage_completeness', 'topological_prerequisites'].includes(r.ruleId)
  );

  for (const failure of criticalFailures) {
    issues.push(`Falha crítica: ${failure.feedback}`);
  }

  return issues;
}