/**
 * Sistema de Personalização Avançada
 * Adapta conteúdo baseado em perfil detalhado, objetivos e contexto
 */

import { KnowledgeDomain, PedagogicalAnalysis } from './pedagogicalEngine';

export interface LearningStyle {
  visual: number;     // 0-100
  auditory: number;   // 0-100
  kinesthetic: number; // 0-100
  readingWriting: number; // 0-100
}

export interface PriorKnowledge {
  domain: string;
  level: number; // 1-10
  experience: string[];
  gaps: string[];
}

export interface LearningGoals {
  primary: string;
  secondary: string[];
  timeline: 'short' | 'medium' | 'long'; // weeks, months, years
  motivation: 'career' | 'personal' | 'academic' | 'hobby';
  specificOutcomes: string[];
}

export interface LearningConstraints {
  timePerSession: number; // minutes
  sessionsPerWeek: number;
  preferredDifficulty: 'gentle' | 'moderate' | 'challenging';
  availableResources: string[];
  technicalLimitations: string[];
}

export interface DetailedUserProfile {
  // Dados básicos
  level: 'beginner' | 'intermediate' | 'advanced';
  purpose: string;
  timeAvailable: string;
  background: string;
  specificGoals: string;

  // Dados avançados
  learningStyle: LearningStyle;
  priorKnowledge: PriorKnowledge[];
  learningGoals: LearningGoals;
  constraints: LearningConstraints;
  preferences: {
    contentTypes: string[];
    assessmentTypes: string[];
    interactionStyle: 'guided' | 'exploratory' | 'mixed';
  };

  // Contexto brasileiro
  context: {
    region: string;
    profession: string;
    educationLevel: string;
    culturalReferences: string[];
  };
}

export interface PersonalizationRecommendations {
  contentAdaptations: string[];
  structuralChanges: string[];
  assessmentMethods: string[];
  resourceSuggestions: string[];
  paceAdjustments: string[];
}

/**
 * Analisa perfil do usuário e gera recomendações de personalização
 */
export function analyzeUserProfile(profile: any): DetailedUserProfile {
  // Converter perfil básico para perfil detalhado
  const detailedProfile: DetailedUserProfile = {
    // Manter dados básicos
    level: profile.level || 'beginner',
    purpose: profile.purpose || '',
    timeAvailable: profile.timeAvailable || '1-2 horas/dia',
    background: profile.background || '',
    specificGoals: profile.specificGoals || '',

    // Inferir estilo de aprendizagem baseado nas respostas
    learningStyle: inferLearningStyle(profile),

    // Analisar conhecimento prévio
    priorKnowledge: analyzePriorKnowledge(profile),

    // Mapear objetivos detalhados
    learningGoals: mapLearningGoals(profile),

    // Inferir restrições
    constraints: inferConstraints(profile),

    // Definir preferências
    preferences: {
      contentTypes: inferContentPreferences(profile),
      assessmentTypes: inferAssessmentPreferences(profile),
      interactionStyle: inferInteractionStyle(profile)
    },

    // Contexto brasileiro (padrão)
    context: {
      region: 'Brasil',
      profession: profile.profession || 'estudante',
      educationLevel: profile.level === 'advanced' ? 'superior' : 'médio',
      culturalReferences: ['mercado brasileiro', 'legislação nacional', 'casos locais']
    }
  };

  return detailedProfile;
}

/**
 * Infere estilo de aprendizagem baseado no perfil
 */
function inferLearningStyle(profile: any): LearningStyle {
  // Análise baseada em palavras-chave e preferências declaradas
  const purpose = profile.purpose?.toLowerCase() || '';
  const background = profile.background?.toLowerCase() || '';
  const goals = profile.specificGoals?.toLowerCase() || '';

  const text = `${purpose} ${background} ${goals}`;

  let visual = 40; // Base
  let auditory = 30;
  let kinesthetic = 20;
  let readingWriting = 30;

  // Palavras-chave que indicam preferências
  if (text.includes('visual') || text.includes('gráfico') || text.includes('diagrama')) {
    visual += 30;
  }

  if (text.includes('prático') || text.includes('hands-on') || text.includes('fazer')) {
    kinesthetic += 40;
  }

  if (text.includes('ler') || text.includes('escrever') || text.includes('texto') || text.includes('livro')) {
    readingWriting += 30;
  }

  if (text.includes('explicação') || text.includes('conversa') || text.includes('discussão')) {
    auditory += 30;
  }

  // Normalizar para que a soma seja 100
  const total = visual + auditory + kinesthetic + readingWriting;
  return {
    visual: Math.round((visual / total) * 100),
    auditory: Math.round((auditory / total) * 100),
    kinesthetic: Math.round((kinesthetic / total) * 100),
    readingWriting: Math.round((readingWriting / total) * 100)
  };
}

/**
 * Analisa conhecimento prévio baseado na experiência declarada
 */
function analyzePriorKnowledge(profile: any): PriorKnowledge[] {
  const background = profile.background || '';
  const level = profile.level || 'beginner';

  const levelMap = {
    'beginner': 2,
    'intermediate': 5,
    'advanced': 8
  };

  // Extrair domínios mencionados na experiência
  const domains = extractMentionedDomains(background);

  return domains.map(domain => ({
    domain,
    level: levelMap[level as keyof typeof levelMap] + Math.floor(Math.random() * 2), // Variação pequena
    experience: extractExperiences(background, domain),
    gaps: identifyKnowledgeGaps(background, domain, level)
  }));
}

/**
 * Mapeia objetivos de aprendizagem detalhados
 */
function mapLearningGoals(profile: any): LearningGoals {
  const purpose = profile.purpose || '';
  const goals = profile.specificGoals || '';
  const timeAvailable = profile.timeAvailable || '';

  // Determinar timeline baseado no tempo disponível
  let timeline: 'short' | 'medium' | 'long' = 'medium';
  if (timeAvailable === 'minimal' || timeAvailable.includes('30 min') || timeAvailable.includes('pouco tempo')) {
    timeline = 'long';
  } else if (timeAvailable === 'intensive' || timeAvailable.includes('3+') || timeAvailable.includes('intensivo')) {
    timeline = 'short';
  }

  // Determinar motivação - aceitar valores em inglês e português
  let motivation: 'career' | 'personal' | 'academic' | 'hobby' = 'personal';
  if (purpose === 'career' || purpose.includes('carreira') || purpose.includes('emprego') || purpose.includes('promoção')) {
    motivation = 'career';
  } else if (purpose === 'academic' || purpose.includes('acadêmico') || purpose.includes('universidade') ||
             purpose.includes('estudos') || purpose.includes('provas') || purpose.includes('faculdade') ||
             purpose.includes('universidad') || purpose.includes('escola')) {
    motivation = 'academic';
  } else if (purpose === 'project' || purpose === 'personal' || purpose.includes('pessoal') || purpose.includes('projeto')) {
    motivation = 'personal';
  } else if (purpose.includes('hobby') || purpose.includes('diversão') || purpose.includes('interesse')) {
    motivation = 'hobby';
  }

  return {
    primary: goals.split(',')[0] || purpose,
    secondary: goals.split(',').slice(1) || [],
    timeline,
    motivation,
    specificOutcomes: extractSpecificOutcomes(goals)
  };
}

/**
 * Infere restrições de aprendizagem
 */
function inferConstraints(profile: any): LearningConstraints {
  const timeAvailable = profile.timeAvailable || '1-2 horas/dia';
  const level = profile.level || 'beginner';

  // Mapear tempo por sessão - aceitar tanto valores antigos quanto novos
  let timePerSession = 60; // padrão 1 hora

  if (timeAvailable === 'minimal' || timeAvailable.includes('30 min')) {
    timePerSession = 30;
  } else if (timeAvailable === 'moderate' || timeAvailable.includes('1-2 horas')) {
    timePerSession = 60;
  } else if (timeAvailable === 'intensive' || timeAvailable.includes('3+')) {
    timePerSession = 120;
  }

  // Sessões por semana baseadas no tempo total
  let sessionsPerWeek = 5;
  if (timeAvailable === 'minimal' || timeAvailable.includes('pouco') || timeAvailable.includes('30 min')) {
    sessionsPerWeek = 3;
  } else if (timeAvailable === 'intensive' || timeAvailable.includes('intensivo') || timeAvailable.includes('3+')) {
    sessionsPerWeek = 7;
  }

  // Dificuldade preferida baseada no nível
  let preferredDifficulty: 'gentle' | 'moderate' | 'challenging' = 'moderate';
  if (level === 'beginner') {
    preferredDifficulty = 'gentle';
  } else if (level === 'advanced') {
    preferredDifficulty = 'challenging';
  }

  return {
    timePerSession,
    sessionsPerWeek,
    preferredDifficulty,
    availableResources: ['computador', 'internet', 'tempo limitado'],
    technicalLimitations: []
  };
}

/**
 * Gera recomendações de personalização
 */
export function generatePersonalizationRecommendations(
  profile: DetailedUserProfile,
  analysis: PedagogicalAnalysis
): PersonalizationRecommendations {
  const recommendations: PersonalizationRecommendations = {
    contentAdaptations: [],
    structuralChanges: [],
    assessmentMethods: [],
    resourceSuggestions: [],
    paceAdjustments: []
  };

  // Adaptações baseadas no estilo de aprendizagem
  if (profile.learningStyle.visual > 40) {
    recommendations.contentAdaptations.push(
      'Incluir mais diagramas e infográficos',
      'Usar mapas mentais para conceitos complexos',
      'Adicionar representações gráficas de dados'
    );
  }

  if (profile.learningStyle.kinesthetic > 40) {
    recommendations.contentAdaptations.push(
      'Aumentar atividades práticas e hands-on',
      'Incluir simulações interativas',
      'Adicionar projetos de implementação'
    );
  }

  if (profile.learningStyle.readingWriting > 40) {
    recommendations.contentAdaptations.push(
      'Fornecer materiais de leitura complementares',
      'Incluir exercícios de redação e síntese',
      'Adicionar resumos detalhados'
    );
  }

  // Adaptações baseadas nas restrições de tempo
  if (profile.constraints.timePerSession <= 30) {
    recommendations.structuralChanges.push(
      'Dividir tópicos em micro-módulos de 15-20 minutos',
      'Criar checkpoints frequentes de progresso',
      'Implementar sistema de pause/resume'
    );

    recommendations.paceAdjustments.push(
      'Estender prazo total do curso',
      'Reduzir quantidade de exercícios por sessão',
      'Focar em conceitos essenciais primeiro'
    );
  }

  // Adaptações baseadas na motivação
  if (profile.learningGoals.motivation === 'career') {
    recommendations.contentAdaptations.push(
      'Incluir casos de aplicação profissional',
      'Adicionar certificações e badges',
      'Conectar com oportunidades de carreira'
    );
  }

  // Adaptações baseadas no contexto brasileiro
  recommendations.contentAdaptations.push(
    'Usar exemplos e casos do mercado brasileiro',
    'Incluir referências à legislação nacional quando aplicável',
    'Adaptar terminologia para o português brasileiro'
  );

  // Métodos de avaliação personalizados
  if (profile.preferences.assessmentTypes.includes('projeto')) {
    recommendations.assessmentMethods.push(
      'Projetos práticos como avaliação principal',
      'Portfolio de trabalhos desenvolvidos',
      'Peer review entre estudantes'
    );
  } else {
    recommendations.assessmentMethods.push(
      'Quizzes frequentes e rápidos',
      'Auto-avaliações reflexivas',
      'Exercícios de aplicação prática'
    );
  }

  // Recursos sugeridos baseados nas limitações
  recommendations.resourceSuggestions.push(
    'Ferramentas gratuitas e open-source quando possível',
    'Recursos offline para estudo em mobilidade',
    'Comunidades brasileiras da área para networking'
  );

  return recommendations;
}

/**
 * Aplica personalizações ao prompt de geração
 */
export function applyPersonalizationToPrompt(
  basePrompt: string,
  profile: DetailedUserProfile,
  recommendations: PersonalizationRecommendations
): string {
  const personalizationSection = `
PERSONALIZAÇÃO AVANÇADA APLICADA:

PERFIL DETALHADO DO ALUNO:
- Estilo de aprendizagem: Visual(${profile.learningStyle.visual}%) | Auditivo(${profile.learningStyle.auditory}%) | Cinestésico(${profile.learningStyle.kinesthetic}%) | Leitura/Escrita(${profile.learningStyle.readingWriting}%)
- Tempo por sessão: ${profile.constraints.timePerSession} minutos
- Sessões por semana: ${profile.constraints.sessionsPerWeek}
- Dificuldade preferida: ${profile.constraints.preferredDifficulty}
- Motivação principal: ${profile.learningGoals.motivation}
- Timeline: ${profile.learningGoals.timeline}

ADAPTAÇÕES OBRIGATÓRIAS:
${recommendations.contentAdaptations.map(adaptation => `- ${adaptation}`).join('\n')}

ESTRUTURA PERSONALIZADA:
${recommendations.structuralChanges.map(change => `- ${change}`).join('\n')}

AVALIAÇÃO PERSONALIZADA:
${recommendations.assessmentMethods.map(method => `- ${method}`).join('\n')}

RECURSOS RECOMENDADOS:
${recommendations.resourceSuggestions.map(resource => `- ${resource}`).join('\n')}

AJUSTES DE RITMO:
${recommendations.paceAdjustments.map(adjustment => `- ${adjustment}`).join('\n')}

CONTEXTO CULTURAL:
- Região: ${profile.context.region}
- Nível educacional: ${profile.context.educationLevel}
- Referências culturais: ${profile.context.culturalReferences.join(', ')}
`;

  return basePrompt + personalizationSection;
}

// Funções auxiliares
function extractMentionedDomains(background: string): string[] {
  const domains = ['programming', 'mathematics', 'engineering', 'science', 'language', 'business'];
  const text = background.toLowerCase();

  return domains.filter(domain => {
    const keywords = {
      'programming': ['programação', 'código', 'software', 'desenvolvimento'],
      'mathematics': ['matemática', 'cálculo', 'estatística', 'álgebra'],
      'engineering': ['engenharia', 'projeto', 'construção', 'estruturas'],
      'science': ['ciência', 'pesquisa', 'laboratório', 'experimento'],
      'language': ['idioma', 'língua', 'inglês', 'comunicação'],
      'business': ['negócios', 'gestão', 'vendas', 'marketing']
    };

    return keywords[domain as keyof typeof keywords]?.some(keyword => text.includes(keyword)) || false;
  });
}

function extractExperiences(background: string, domain: string): string[] {
  // Implementação simplificada - extrair frases que mencionam experiências
  const sentences = background.split(/[.!?]+/);
  return sentences.filter(sentence =>
    sentence.toLowerCase().includes(domain) ||
    sentence.includes('experiência') ||
    sentence.includes('trabalho')
  ).map(s => s.trim()).filter(s => s.length > 0);
}

function identifyKnowledgeGaps(background: string, domain: string, level: string): string[] {
  // Gaps típicos por nível
  const typicalGaps = {
    'beginner': ['conceitos básicos', 'terminologia', 'fundamentos'],
    'intermediate': ['aplicação prática', 'integração de conceitos', 'casos complexos'],
    'advanced': ['otimização', 'arquitetura', 'liderança técnica']
  };

  return typicalGaps[level as keyof typeof typicalGaps] || [];
}

function extractSpecificOutcomes(goals: string): string[] {
  // Extrair objetivos específicos do texto
  const outcomes = goals.split(/[,;]/).map(goal => goal.trim()).filter(goal => goal.length > 0);
  return outcomes.length > 0 ? outcomes : ['Dominar os conceitos fundamentais'];
}

function inferContentPreferences(profile: any): string[] {
  const preferences = ['texto', 'exemplos'];

  if (profile.background?.includes('prático') || profile.specificGoals?.includes('projeto')) {
    preferences.push('projeto', 'hands-on');
  }

  if (profile.background?.includes('visual') || profile.purpose?.includes('design')) {
    preferences.push('visual', 'diagramas');
  }

  return preferences;
}

function inferAssessmentPreferences(profile: any): string[] {
  const level = profile.level || 'beginner';

  if (level === 'beginner') {
    return ['quiz', 'exercícios guiados'];
  } else if (level === 'intermediate') {
    return ['projeto', 'estudos de caso'];
  } else {
    return ['projeto avançado', 'pesquisa', 'apresentação'];
  }
}

function inferInteractionStyle(profile: any): 'guided' | 'exploratory' | 'mixed' {
  const level = profile.level || 'beginner';

  if (level === 'beginner') {
    return 'guided';
  } else if (level === 'advanced') {
    return 'exploratory';
  } else {
    return 'mixed';
  }
}