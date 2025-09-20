/**
 * Sistema de Análise Pedagógica Avançada
 * Implementa Taxonomia de Bloom, análise de domínio e personalização
 */

export interface BloomLevel {
  level: number;
  name: string;
  description: string;
  actionVerbs: string[];
  characteristics: string[];
}

export interface KnowledgeDomain {
  name: string;
  type: 'technical' | 'conceptual' | 'procedural' | 'factual';
  characteristics: string[];
  typicalProgression: string[];
  assessmentMethods: string[];
}

export interface LearningObjective {
  bloomLevel: number;
  statement: string;
  assessmentCriteria: string[];
  prerequisites: string[];
}

export interface TopicStructure {
  id: string;
  title: string;
  bloomLevel: number;
  objectives: LearningObjective[];
  prerequisites: string[];
  estimatedDifficulty: 1 | 2 | 3 | 4 | 5;
  learningType: 'theory' | 'practice' | 'mixed';
  subtopics: SubtopicStructure[];
}

export interface SubtopicStructure {
  id: string;
  title: string;
  bloomLevel: number;
  type: 'concept' | 'example' | 'exercise' | 'application';
  estimatedTime: number; // em minutos
}

export interface PedagogicalAnalysis {
  domain: KnowledgeDomain;
  complexity: 'low' | 'medium' | 'high';
  recommendedApproach: 'sequential' | 'spiral' | 'modular';
  bloomProgression: number[];
  estimatedDuration: {
    total: number;
    theory: number;
    practice: number;
  };
}

/**
 * Taxonomia de Bloom com 6 níveis cognitivos
 */
export const BLOOM_TAXONOMY: BloomLevel[] = [
  {
    level: 1,
    name: 'Lembrar',
    description: 'Recordar informações e conceitos básicos',
    actionVerbs: ['definir', 'listar', 'identificar', 'nomear', 'recordar', 'reconhecer'],
    characteristics: ['memorização', 'reconhecimento', 'conceitos básicos']
  },
  {
    level: 2,
    name: 'Compreender',
    description: 'Explicar ideias ou conceitos',
    actionVerbs: ['explicar', 'interpretar', 'resumir', 'parafrasear', 'classificar', 'comparar'],
    characteristics: ['interpretação', 'tradução', 'extrapolação']
  },
  {
    level: 3,
    name: 'Aplicar',
    description: 'Usar informações em novas situações',
    actionVerbs: ['aplicar', 'demonstrar', 'implementar', 'resolver', 'usar', 'executar'],
    characteristics: ['uso prático', 'transferência', 'aplicação']
  },
  {
    level: 4,
    name: 'Analisar',
    description: 'Dividir informações em partes e examinar relações',
    actionVerbs: ['analisar', 'categorizar', 'comparar', 'contrastar', 'diferenciar', 'examinar'],
    characteristics: ['decomposição', 'relações', 'estrutura']
  },
  {
    level: 5,
    name: 'Avaliar',
    description: 'Justificar decisões ou cursos de ação',
    actionVerbs: ['avaliar', 'criticar', 'defender', 'julgar', 'justificar', 'apoiar'],
    characteristics: ['julgamento', 'crítica', 'verificação']
  },
  {
    level: 6,
    name: 'Criar',
    description: 'Produzir trabalho novo ou original',
    actionVerbs: ['criar', 'projetar', 'formular', 'construir', 'inventar', 'produzir'],
    characteristics: ['síntese', 'originalidade', 'planejamento']
  }
];

/**
 * Domínios de Conhecimento Especializados
 */
export const KNOWLEDGE_DOMAINS: { [key: string]: KnowledgeDomain } = {
  'programming': {
    name: 'Programação',
    type: 'procedural',
    characteristics: ['hands-on', 'iterativo', 'prático', 'baseado em projetos'],
    typicalProgression: ['sintaxe', 'conceitos', 'estruturas', 'algoritmos', 'projetos'],
    assessmentMethods: ['código funcional', 'projetos', 'debugging', 'code review']
  },
  'mathematics': {
    name: 'Matemática',
    type: 'conceptual',
    characteristics: ['sequencial', 'cumulativo', 'abstrato', 'baseado em problemas'],
    typicalProgression: ['definições', 'teoremas', 'demonstrações', 'aplicações', 'generalizações'],
    assessmentMethods: ['resolução de problemas', 'demonstrações', 'aplicações']
  },
  'science': {
    name: 'Ciências',
    type: 'factual',
    characteristics: ['experimental', 'observacional', 'baseado em evidências'],
    typicalProgression: ['observação', 'hipóteses', 'experimentos', 'teorias', 'aplicações'],
    assessmentMethods: ['experimentos', 'relatórios', 'análise de dados']
  },
  'language': {
    name: 'Linguagens',
    type: 'procedural',
    characteristics: ['comunicativo', 'cultural', 'imersivo', 'prático'],
    typicalProgression: ['vocabulário', 'gramática', 'conversação', 'cultura', 'fluência'],
    assessmentMethods: ['conversação', 'escrita', 'compreensão', 'cultural']
  },
  'business': {
    name: 'Negócios',
    type: 'conceptual',
    characteristics: ['caso-baseado', 'estratégico', 'prático', 'colaborativo'],
    typicalProgression: ['conceitos', 'frameworks', 'casos', 'estratégias', 'implementação'],
    assessmentMethods: ['estudos de caso', 'simulações', 'projetos', 'apresentações']
  },
  'engineering': {
    name: 'Engenharia',
    type: 'technical',
    characteristics: ['problema-baseado', 'matemático', 'prático', 'sistemático'],
    typicalProgression: ['fundamentos', 'teoria', 'cálculos', 'projeto', 'implementação'],
    assessmentMethods: ['cálculos', 'projetos', 'simulações', 'protótipos']
  }
};

/**
 * Analisa o domínio de conhecimento baseado na mensagem do usuário
 */
export function analyzeDomain(message: string): KnowledgeDomain {
  const lowercaseMessage = message.toLowerCase();

  // Função para normalizar texto (remover acentos)
  function normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // Remove acentos
  }

  // Palavras-chave para cada domínio (com e sem acentos)
  const domainKeywords = {
    programming: ['programacao', 'programação', 'codigo', 'código', 'javascript', 'python', 'java', 'react', 'node', 'desenvolvimento', 'software', 'app', 'sistema'],
    mathematics: ['matematica', 'matemática', 'calculo', 'cálculo', 'algebra', 'álgebra', 'geometria', 'estatistica', 'estatística', 'equacao', 'equação', 'funcao', 'função', 'integral', 'derivada', 'limite', 'limites', 'diferencial'],
    science: ['fisica', 'física', 'quimica', 'química', 'biologia', 'experimento', 'teoria', 'cientifico', 'científico', 'pesquisa', 'laboratorio', 'laboratório'],
    language: ['ingles', 'inglês', 'portugues', 'português', 'espanhol', 'idioma', 'linguagem', 'conversacao', 'conversação', 'gramatica', 'gramática', 'vocabulario', 'vocabulário'],
    business: ['negocios', 'negócios', 'gestao', 'gestão', 'marketing', 'vendas', 'estrategia', 'estratégia', 'empresa', 'mercado', 'empreendedorismo'],
    engineering: ['engenharia', 'mecanica', 'mecânica', 'civil', 'eletrica', 'elétrica', 'estruturas', 'projeto', 'calculo estrutural', 'cálculo estrutural', 'resistencia', 'resistência', 'vetorial', 'estatica', 'estática', 'dinamica', 'dinâmica', 'forcas', 'forças', 'torque', 'momento', 'trelicas', 'treliças', 'materiais', 'mecanico', 'mecânico', 'estrutural']
  };

  // Contar matches para cada domínio
  let maxMatches = 0;
  let bestDomain = 'programming'; // default

  const normalizedMessage = normalizeText(lowercaseMessage);
  console.log('🔍 Analisando domínio para:', lowercaseMessage);
  console.log('📝 Texto normalizado:', normalizedMessage);

  for (const [domain, keywords] of Object.entries(domainKeywords)) {
    const matches = keywords.filter(keyword => normalizedMessage.includes(normalizeText(keyword))).length;
    if (matches > 0) {
      console.log(`🎯 ${domain}: ${matches} matches`, keywords.filter(keyword => normalizedMessage.includes(normalizeText(keyword))));
    }
    if (matches > maxMatches) {
      maxMatches = matches;
      bestDomain = domain;
    }
  }

  console.log(`✅ Domínio selecionado: ${bestDomain} (${maxMatches} matches)`);

  return KNOWLEDGE_DOMAINS[bestDomain];
}

/**
 * Detecta o nível acadêmico de uma matéria específica
 */
function getSubjectLevel(message: string): 'beginner' | 'intermediate' | 'advanced' {
  const normalizedMessage = message.toLowerCase();

  // Matérias avançadas
  const advancedSubjects = [
    'calculo 2', 'cálculo 2', 'calculo ii', 'cálculo ii',
    'calculo 3', 'cálculo 3', 'calculo iii', 'cálculo iii',
    'calculo vetorial', 'cálculo vetorial',
    'equacoes diferenciais', 'equações diferenciais',
    'algebra linear avancada', 'álgebra linear avançada',
    'fisica quantica', 'física quântica',
    'mecanica dos fluidos', 'mecânica dos fluidos',
    'termodinamica avancada', 'termodinâmica avançada',
    'resistencia dos materiais', 'resistência dos materiais',
    'analise estrutural', 'análise estrutural'
  ];

  // Matérias intermediárias
  const intermediateSubjects = [
    'calculo 1', 'cálculo 1', 'calculo i', 'cálculo i',
    'algebra linear', 'álgebra linear',
    'fisica 2', 'física 2',
    'quimica organica', 'química orgânica',
    'mecanica vetorial', 'mecânica vetorial',
    'estatistica', 'estatística',
    'probabilidade'
  ];

  // Verificar se é matéria avançada
  for (const subject of advancedSubjects) {
    if (normalizedMessage.includes(subject)) {
      return 'advanced';
    }
  }

  // Verificar se é matéria intermediária
  for (const subject of intermediateSubjects) {
    if (normalizedMessage.includes(subject)) {
      return 'intermediate';
    }
  }

  return 'beginner';
}

/**
 * Determina a progressão de Bloom adequada para um domínio
 */
export function getBloomProgression(domain: KnowledgeDomain, level: string, message?: string): number[] {
  // Determinar o nível efetivo baseado na matéria, não apenas no nível do usuário
  const subjectLevel = message ? getSubjectLevel(message) : level;

  console.log(`🎓 Nível do usuário: ${level}, Nível da matéria: ${subjectLevel}`);

  const progressions = {
    'technical': {
      'beginner': [1, 2, 3],
      'intermediate': [2, 3, 4, 5],
      'advanced': [3, 4, 5, 6]
    },
    'conceptual': {
      'beginner': [1, 2],
      'intermediate': [2, 3, 4],
      'advanced': [3, 4, 5, 6]
    },
    'procedural': {
      'beginner': [1, 2, 3],
      'intermediate': [2, 3, 4, 5],
      'advanced': [3, 4, 5, 6]
    },
    'factual': {
      'beginner': [1, 2],
      'intermediate': [2, 3, 4],
      'advanced': [3, 4, 5, 6]
    }
  };

  return progressions[domain.type][subjectLevel as keyof typeof progressions[typeof domain.type]] || [1, 2, 3];
}

/**
 * Analisa complexidade e sugere estrutura pedagógica
 */
export function analyzePedagogicalStructure(
  message: string,
  userProfile: any
): PedagogicalAnalysis {
  const domain = analyzeDomain(message);
  const bloomProgression = getBloomProgression(domain, userProfile?.level || 'beginner', message);

  // Determinar complexidade baseada no nível e domínio
  const complexity = userProfile?.level === 'advanced' ? 'high' :
                    userProfile?.level === 'intermediate' ? 'medium' : 'low';

  // Determinar abordagem baseada no domínio
  const approachMap = {
    'technical': 'modular',
    'conceptual': 'spiral',
    'procedural': 'sequential',
    'factual': 'sequential'
  };

  // Estimar duração baseada no tempo disponível e complexidade
  const timeAvailable = userProfile?.timeAvailable || '1-2 horas/dia';
  const baseHours = complexity === 'high' ? 12 : complexity === 'medium' ? 8 : 6;

  const theoryPracticeRatio = domain.type === 'procedural' ? 0.3 : 0.6; // 30% teoria para procedural, 60% para outros

  return {
    domain,
    complexity,
    recommendedApproach: approachMap[domain.type] as any,
    bloomProgression,
    estimatedDuration: {
      total: baseHours,
      theory: Math.round(baseHours * theoryPracticeRatio),
      practice: Math.round(baseHours * (1 - theoryPracticeRatio))
    }
  };
}

/**
 * Gera estrutura de tópicos baseada na análise pedagógica
 * DEPRECADO: Esta função usa templates genéricos e será removida
 */
export function generateTopicStructure(
  analysis: PedagogicalAnalysis,
  moduleTitle: string,
  moduleIndex: number
): TopicStructure[] {
  console.warn('⚠️ FALLBACK: Usando sistema pedagógico genérico - isso não deveria acontecer');

  // Retornar estrutura mínima sem templates genéricos
  return [
    {
      id: `module-${moduleIndex}-topic-1`,
      title: `Tópico Principal`,
      bloomLevel: 2,
      objectives: generateLearningObjectives('Tópico Principal', 2),
      prerequisites: [],
      estimatedDifficulty: 2,
      learningType: 'mixed' as const,
      subtopics: [
        {
          id: `subtopic-${Date.now()}-1`,
          title: 'Conceitos Básicos',
          bloomLevel: 1,
          type: 'concept' as const,
          estimatedTime: 30
        },
        {
          id: `subtopic-${Date.now()}-2`,
          title: 'Aplicação Prática',
          bloomLevel: 3,
          type: 'application' as const,
          estimatedTime: 45
        }
      ]
    }
  ];
}

/**
 * Gera objetivos de aprendizagem baseados na Taxonomia de Bloom
 */
function generateLearningObjectives(topicTitle: string, bloomLevel: number): LearningObjective[] {
  const bloomInfo = BLOOM_TAXONOMY[bloomLevel - 1];
  const verb = bloomInfo.actionVerbs[0];

  return [{
    bloomLevel,
    statement: `${verb} os conceitos de ${topicTitle}`,
    assessmentCriteria: [
      `Demonstra compreensão dos conceitos principais`,
      `Aplica conhecimento em situações práticas`
    ],
    prerequisites: bloomLevel > 1 ? [`Nível ${bloomLevel - 1} de Bloom`] : []
  }];
}

/**
 * Gera subtópicos específicos baseados no domínio
 */
function generateSubtopics(
  topicTitle: string,
  bloomLevel: number,
  domain: KnowledgeDomain
): SubtopicStructure[] {
  const subtopicTypes = ['concept', 'example', 'exercise', 'application'] as const;

  return subtopicTypes.map((type, index) => ({
    id: `subtopic-${Date.now()}-${index}`,
    title: getSubtopicTitle(type, topicTitle, domain),
    bloomLevel: Math.max(1, bloomLevel - 1),
    type,
    estimatedTime: type === 'exercise' || type === 'application' ? 45 : 30
  }));
}

/**
 * Gera títulos de subtópicos baseados no tipo e domínio
 */
function getSubtopicTitle(
  type: 'concept' | 'example' | 'exercise' | 'application',
  topicTitle: string,
  domain: KnowledgeDomain
): string {
  const templates = {
    'concept': `Fundamentos de ${topicTitle}`,
    'example': `Exemplos Práticos`,
    'exercise': `Exercícios e Atividades`,
    'application': `Aplicação Real`
  };

  return templates[type];
}

/**
 * Retorna tópicos essenciais para um domínio específico
 */
export function getEssentialTopicsForDomain(domainName: string): string[] {
  const essentialTopics: Record<string, string[]> = {
    'mathematics': [
      'conceitos fundamentais',
      'operações básicas',
      'propriedades',
      'aplicações',
      'resolução de problemas'
    ],
    'engineering': [
      'fundamentos teóricos',
      'princípios básicos',
      'análise',
      'design',
      'implementação',
      'validação'
    ],
    'programming': [
      'sintaxe básica',
      'estruturas de dados',
      'algoritmos',
      'paradigmas',
      'práticas de desenvolvimento',
      'debugging'
    ],
    'science': [
      'conceitos fundamentais',
      'metodologia científica',
      'experimentos',
      'análise de dados',
      'conclusões'
    ],
    'business': [
      'fundamentos',
      'estratégia',
      'operações',
      'análise',
      'implementação',
      'avaliação'
    ]
  };

  return essentialTopics[domainName.toLowerCase()] || [];
}

/**
 * Detecta nível de Bloom baseado no texto
 */
export function detectBloomLevel(text: string): number {
  const lowerText = text.toLowerCase();

  // Palavras-chave por nível de Bloom
  const bloomKeywords = {
    1: ['definir', 'listar', 'identificar', 'nomear', 'descrever', 'conceitos', 'introdução'],
    2: ['explicar', 'comparar', 'interpretar', 'resumir', 'compreender', 'entender'],
    3: ['aplicar', 'usar', 'implementar', 'resolver', 'praticar', 'exercitar'],
    4: ['analisar', 'examinar', 'investigar', 'classificar', 'categorizar'],
    5: ['sintetizar', 'criar', 'desenvolver', 'projetar', 'construir', 'formular'],
    6: ['avaliar', 'julgar', 'criticar', 'justificar', 'validar', 'recomendar']
  };

  let maxLevel = 1;
  let maxMatches = 0;

  for (const [level, keywords] of Object.entries(bloomKeywords)) {
    const matches = keywords.filter(keyword => lowerText.includes(keyword)).length;

    if (matches > maxMatches) {
      maxMatches = matches;
      maxLevel = parseInt(level);
    }
  }

  return maxLevel;
}