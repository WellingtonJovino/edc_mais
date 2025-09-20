/**
 * Sistema de Detecção de Disciplinas Universitárias
 * Identifica quando o usuário está solicitando uma disciplina acadêmica específica
 * e retorna informações contextuais para geração de estrutura apropriada
 */

export interface UniversityDiscipline {
  id: string;
  name: string;
  aliases: string[];
  category: 'exact_sciences' | 'engineering' | 'computer_science' | 'physics' | 'mathematics' | 'statistics' | 'chemistry';
  level: 'undergraduate' | 'graduate';
  typicalSemester?: number;
  prerequisites: string[];
  isCoreCurriculum: boolean;
  requiresProgramming: boolean;
  requiresLab: boolean;
  keywords: string[];
}

export interface DetectionResult {
  isUniversityDiscipline: boolean;
  discipline?: UniversityDiscipline;
  confidence: number;
  userContext?: {
    mentionsExam: boolean;
    mentionsHomework: boolean;
    mentionsProject: boolean;
    semester?: string;
    urgency?: 'high' | 'medium' | 'low';
  };
}

// Base de dados de disciplinas universitárias comuns
const UNIVERSITY_DISCIPLINES: UniversityDiscipline[] = [
  // Matemática
  {
    id: 'numerical_calculus',
    name: 'Cálculo Numérico',
    aliases: ['calculo numerico', 'metodos numericos', 'analise numerica', 'numerical analysis', 'numerical methods'],
    category: 'mathematics',
    level: 'undergraduate',
    typicalSemester: 4,
    prerequisites: ['Cálculo I', 'Cálculo II', 'Álgebra Linear', 'Programação'],
    isCoreCurriculum: true,
    requiresProgramming: true,
    requiresLab: true,
    keywords: ['bisseção', 'newton', 'interpolação', 'integração numérica', 'edo', 'sistemas lineares', 'erro', 'truncamento']
  },
  {
    id: 'calculus_1',
    name: 'Cálculo I',
    aliases: ['calculo 1', 'calculo i', 'calculo diferencial', 'differential calculus', 'calc 1'],
    category: 'mathematics',
    level: 'undergraduate',
    typicalSemester: 1,
    prerequisites: ['Matemática Básica'],
    isCoreCurriculum: true,
    requiresProgramming: false,
    requiresLab: false,
    keywords: ['limites', 'derivadas', 'integral', 'continuidade', 'função', 'taxa de variação']
  },
  {
    id: 'calculus_2',
    name: 'Cálculo II',
    aliases: ['calculo 2', 'calculo ii', 'calculo integral', 'integral calculus', 'calc 2'],
    category: 'mathematics',
    level: 'undergraduate',
    typicalSemester: 2,
    prerequisites: ['Cálculo I'],
    isCoreCurriculum: true,
    requiresProgramming: false,
    requiresLab: false,
    keywords: ['integral', 'técnicas de integração', 'séries', 'sequências', 'coordenadas polares']
  },
  {
    id: 'calculus_3',
    name: 'Cálculo III',
    aliases: ['calculo 3', 'calculo iii', 'calculo vetorial', 'vector calculus', 'calc 3', 'multivariable calculus'],
    category: 'mathematics',
    level: 'undergraduate',
    typicalSemester: 3,
    prerequisites: ['Cálculo II', 'Geometria Analítica'],
    isCoreCurriculum: true,
    requiresProgramming: false,
    requiresLab: false,
    keywords: ['gradiente', 'divergente', 'rotacional', 'integral dupla', 'integral tripla', 'campos vetoriais']
  },
  {
    id: 'linear_algebra',
    name: 'Álgebra Linear',
    aliases: ['algebra linear', 'linear algebra', 'matrizes', 'vetores e matrizes'],
    category: 'mathematics',
    level: 'undergraduate',
    typicalSemester: 2,
    prerequisites: ['Geometria Analítica'],
    isCoreCurriculum: true,
    requiresProgramming: false,
    requiresLab: false,
    keywords: ['matriz', 'determinante', 'autovalor', 'autovetor', 'espaço vetorial', 'transformação linear']
  },
  {
    id: 'probability_statistics',
    name: 'Probabilidade e Estatística',
    aliases: ['probabilidade', 'estatistica', 'prob e estat', 'statistics', 'probability'],
    category: 'statistics',
    level: 'undergraduate',
    typicalSemester: 3,
    prerequisites: ['Cálculo I'],
    isCoreCurriculum: true,
    requiresProgramming: false,
    requiresLab: false,
    keywords: ['distribuição', 'média', 'variância', 'desvio padrão', 'teste de hipótese', 'regressão']
  },

  // Física
  {
    id: 'physics_1',
    name: 'Física I',
    aliases: ['fisica 1', 'fisica i', 'mecanica', 'mechanics', 'classical mechanics'],
    category: 'physics',
    level: 'undergraduate',
    typicalSemester: 1,
    prerequisites: ['Cálculo I (co-requisito)'],
    isCoreCurriculum: true,
    requiresProgramming: false,
    requiresLab: true,
    keywords: ['cinemática', 'dinâmica', 'trabalho', 'energia', 'momento', 'rotação']
  },
  {
    id: 'physics_2',
    name: 'Física II',
    aliases: ['fisica 2', 'fisica ii', 'termodinamica', 'ondas', 'thermodynamics'],
    category: 'physics',
    level: 'undergraduate',
    typicalSemester: 2,
    prerequisites: ['Física I', 'Cálculo II'],
    isCoreCurriculum: true,
    requiresProgramming: false,
    requiresLab: true,
    keywords: ['temperatura', 'calor', 'entropia', 'ondas', 'som', 'termodinâmica']
  },
  {
    id: 'physics_3',
    name: 'Física III',
    aliases: ['fisica 3', 'fisica iii', 'eletromagnetismo', 'electromagnetism'],
    category: 'physics',
    level: 'undergraduate',
    typicalSemester: 3,
    prerequisites: ['Física II', 'Cálculo III'],
    isCoreCurriculum: true,
    requiresProgramming: false,
    requiresLab: true,
    keywords: ['campo elétrico', 'campo magnético', 'lei de gauss', 'faraday', 'maxwell', 'ondas eletromagnéticas']
  },

  // Computação
  {
    id: 'data_structures',
    name: 'Estruturas de Dados',
    aliases: ['estrutura de dados', 'data structures', 'ed', 'algoritmos e estruturas'],
    category: 'computer_science',
    level: 'undergraduate',
    typicalSemester: 2,
    prerequisites: ['Programação I'],
    isCoreCurriculum: true,
    requiresProgramming: true,
    requiresLab: true,
    keywords: ['lista', 'pilha', 'fila', 'árvore', 'grafo', 'busca', 'ordenação', 'complexidade']
  },
  {
    id: 'algorithms',
    name: 'Algoritmos',
    aliases: ['algoritmos', 'algorithms', 'analise de algoritmos', 'algorithm analysis'],
    category: 'computer_science',
    level: 'undergraduate',
    typicalSemester: 3,
    prerequisites: ['Estruturas de Dados'],
    isCoreCurriculum: true,
    requiresProgramming: true,
    requiresLab: true,
    keywords: ['complexidade', 'dividir conquistar', 'programação dinâmica', 'guloso', 'backtracking', 'np']
  },
  {
    id: 'databases',
    name: 'Banco de Dados',
    aliases: ['banco de dados', 'database', 'bd', 'sgbd', 'sql'],
    category: 'computer_science',
    level: 'undergraduate',
    typicalSemester: 3,
    prerequisites: ['Estruturas de Dados'],
    isCoreCurriculum: true,
    requiresProgramming: true,
    requiresLab: true,
    keywords: ['sql', 'modelo relacional', 'normalização', 'acid', 'transação', 'índice', 'nosql']
  },

  // Engenharia
  {
    id: 'materials_science',
    name: 'Ciência dos Materiais',
    aliases: ['ciencia dos materiais', 'materials science', 'estrutura e propriedade dos materiais', 'propriedades dos materiais', 'estrutura dos materiais', 'materiais'],
    category: 'engineering',
    level: 'undergraduate',
    typicalSemester: 3,
    prerequisites: ['Química', 'Física I'],
    isCoreCurriculum: true,
    requiresProgramming: false,
    requiresLab: true,
    keywords: ['cristalografia', 'liga', 'polímero', 'cerâmica', 'metal', 'propriedades mecânicas', 'microestrutura', 'diagrama de fases', 'tratamento térmico', 'corrosão']
  },
  {
    id: 'materials_engineering',
    name: 'Engenharia de Materiais',
    aliases: ['engenharia de materiais', 'materials engineering', 'seleção de materiais', 'processamento de materiais'],
    category: 'engineering',
    level: 'undergraduate',
    typicalSemester: 4,
    prerequisites: ['Ciência dos Materiais'],
    isCoreCurriculum: true,
    requiresProgramming: false,
    requiresLab: true,
    keywords: ['seleção', 'processamento', 'conformação', 'fundição', 'soldagem', 'usinagem', 'fadiga', 'fratura']
  },
  {
    id: 'strength_materials',
    name: 'Resistência dos Materiais',
    aliases: ['resistencia dos materiais', 'resmat', 'mechanics of materials', 'strength of materials'],
    category: 'engineering',
    level: 'undergraduate',
    typicalSemester: 4,
    prerequisites: ['Mecânica', 'Cálculo II'],
    isCoreCurriculum: true,
    requiresProgramming: false,
    requiresLab: true,
    keywords: ['tensão', 'deformação', 'flexão', 'torção', 'flambagem', 'critério de falha']
  },
  {
    id: 'thermodynamics',
    name: 'Termodinâmica',
    aliases: ['termodinamica', 'thermo', 'thermodynamics', 'termo'],
    category: 'engineering',
    level: 'undergraduate',
    typicalSemester: 3,
    prerequisites: ['Física II', 'Cálculo II'],
    isCoreCurriculum: true,
    requiresProgramming: false,
    requiresLab: true,
    keywords: ['entropia', 'entalpia', 'ciclo', 'carnot', 'energia', 'trabalho', 'calor']
  },
  {
    id: 'fluid_mechanics',
    name: 'Mecânica dos Fluidos',
    aliases: ['mecanica dos fluidos', 'fluidos', 'fluid mechanics', 'hidraulica'],
    category: 'engineering',
    level: 'undergraduate',
    typicalSemester: 4,
    prerequisites: ['Física I', 'Cálculo III'],
    isCoreCurriculum: true,
    requiresProgramming: false,
    requiresLab: true,
    keywords: ['bernoulli', 'reynolds', 'viscosidade', 'escoamento', 'turbulência', 'perda de carga']
  },
  {
    id: 'circuits_1',
    name: 'Circuitos Elétricos I',
    aliases: ['circuitos 1', 'circuitos eletricos', 'circuits', 'circuit analysis'],
    category: 'engineering',
    level: 'undergraduate',
    typicalSemester: 3,
    prerequisites: ['Física III'],
    isCoreCurriculum: true,
    requiresProgramming: false,
    requiresLab: true,
    keywords: ['kirchhoff', 'thévenin', 'norton', 'malha', 'nó', 'fasores', 'impedância']
  },

  // Química
  {
    id: 'general_chemistry',
    name: 'Química Geral',
    aliases: ['quimica', 'química', 'quimica geral', 'química geral', 'general chemistry', 'chemistry'],
    category: 'exact_sciences',
    level: 'undergraduate',
    typicalSemester: 1,
    prerequisites: ['Matemática Básica'],
    isCoreCurriculum: true,
    requiresProgramming: false,
    requiresLab: true,
    keywords: ['átomos', 'moléculas', 'tabela periódica', 'ligações químicas', 'reações', 'estequiometria', 'soluções']
  },
  {
    id: 'organic_chemistry',
    name: 'Química Orgânica',
    aliases: ['quimica organica', 'química orgânica', 'organic chemistry', 'organica'],
    category: 'exact_sciences',
    level: 'undergraduate',
    typicalSemester: 3,
    prerequisites: ['Química Geral'],
    isCoreCurriculum: true,
    requiresProgramming: false,
    requiresLab: true,
    keywords: ['hidrocarbonetos', 'funções orgânicas', 'isomeria', 'reações orgânicas', 'mecanismos']
  },
  {
    id: 'inorganic_chemistry',
    name: 'Química Inorgânica',
    aliases: ['quimica inorganica', 'química inorgânica', 'inorganic chemistry', 'inorganica'],
    category: 'exact_sciences',
    level: 'undergraduate',
    typicalSemester: 2,
    prerequisites: ['Química Geral'],
    isCoreCurriculum: true,
    requiresProgramming: false,
    requiresLab: true,
    keywords: ['compostos inorgânicos', 'ácidos', 'bases', 'sais', 'óxidos', 'cristalografia']
  },
  {
    id: 'analytical_chemistry',
    name: 'Química Analítica',
    aliases: ['quimica analitica', 'química analítica', 'analytical chemistry', 'analitica'],
    category: 'exact_sciences',
    level: 'undergraduate',
    typicalSemester: 4,
    prerequisites: ['Química Geral', 'Química Inorgânica'],
    isCoreCurriculum: true,
    requiresProgramming: false,
    requiresLab: true,
    keywords: ['análise qualitativa', 'análise quantitativa', 'titulação', 'espectroscopia', 'cromatografia']
  },
  {
    id: 'physical_chemistry',
    name: 'Físico-Química',
    aliases: ['fisico quimica', 'físico-química', 'physical chemistry', 'fisicoquimica'],
    category: 'exact_sciences',
    level: 'undergraduate',
    typicalSemester: 5,
    prerequisites: ['Química Geral', 'Física II', 'Cálculo II'],
    isCoreCurriculum: true,
    requiresProgramming: false,
    requiresLab: true,
    keywords: ['termodinâmica química', 'cinética química', 'equilíbrio químico', 'eletroquímica']
  },

  // Física
  {
    id: 'general_physics',
    name: 'Física Geral',
    aliases: ['fisica', 'física', 'fisica geral', 'física geral', 'general physics', 'physics'],
    category: 'physics',
    level: 'undergraduate',
    typicalSemester: 1,
    prerequisites: ['Matemática Básica'],
    isCoreCurriculum: true,
    requiresProgramming: false,
    requiresLab: true,
    keywords: ['mecânica', 'cinemática', 'dinâmica', 'energia', 'movimento', 'força', 'velocidade']
  }
];

/**
 * Detecta se a mensagem do usuário refere-se a uma disciplina universitária
 */
export function detectUniversityDiscipline(userMessage: string, userProfile?: any): DetectionResult {
  const normalizedMessage = userMessage.toLowerCase().trim();
  console.log(`🔍 [DETECTION] Testing message: "${normalizedMessage}"`);

  // Detectar contexto do usuário (prova, trabalho, etc.)
  const userContext = {
    mentionsExam: /prova|exame|avaliação|teste|p1|p2|p3|final/i.test(userMessage),
    mentionsHomework: /trabalho|exercício|lista|atividade|tarefa/i.test(userMessage),
    mentionsProject: /projeto|apresentação|seminário/i.test(userMessage),
    semester: extractSemester(userMessage),
    urgency: detectUrgency(userMessage)
  };

  // Buscar disciplina correspondente
  let bestMatch: UniversityDiscipline | undefined;
  let highestScore = 0;

  for (const discipline of UNIVERSITY_DISCIPLINES) {
    let score = 0;
    const scoreDetails: string[] = [];

    // Verificar correspondência exata do nome completo (maior prioridade)
    if (normalizedMessage === discipline.name.toLowerCase()) {
      score += 20;
      scoreDetails.push(`nome exato (+20)`);
    }
    // Verificar se contém o nome completo como uma frase
    else if (normalizedMessage.includes(discipline.name.toLowerCase())) {
      score += 15;
      scoreDetails.push(`contém nome (+15)`);
    }

    // Verificar aliases com prioridade para correspondências mais longas
    for (const alias of discipline.aliases) {
      const aliasLower = alias.toLowerCase();

      // Correspondência exata de alias
      if (normalizedMessage === aliasLower) {
        score += 18;
        scoreDetails.push(`alias exato "${alias}" (+18)`);
      }
      // Correspondência completa do alias na frase
      else if (normalizedMessage.includes(aliasLower)) {
        // Bonus para aliases mais específicos (mais longos)
        const lengthBonus = Math.min(aliasLower.length / 10, 5);
        const aliasScore = 12 + lengthBonus;
        score += aliasScore;
        scoreDetails.push(`alias "${alias}" (+${aliasScore.toFixed(1)})`);
      }
    }

    // Verificar keywords (menor peso para evitar falsos positivos)
    let keywordMatches = 0;
    for (const keyword of discipline.keywords) {
      if (normalizedMessage.includes(keyword.toLowerCase())) {
        keywordMatches++;
      }
    }

    // Só adicionar pontos por keywords se houver múltiplas correspondências
    if (keywordMatches >= 2) {
      score += keywordMatches * 1.5;
    } else if (keywordMatches === 1) {
      score += 0.5;
    }

    // Bonus se o perfil do usuário indica estudos acadêmicos
    if (userProfile?.purpose === 'academic' || userProfile?.objetivo === 'Estudos acadêmicos') {
      score += 2;
    }

    if (score > 0) {
      console.log(`🔍 [DETECTION] "${discipline.name}": ${score} pontos [${scoreDetails.join(', ')}]`);
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = discipline;
    }
  }

  // Determinar confiança (mais rigoroso para evitar falsos positivos)
  const confidence = highestScore >= 15 ? 1.0 : highestScore >= 12 ? 0.8 : highestScore >= 8 ? 0.6 : highestScore >= 3 ? 0.3 : 0;

  // Debug log para diagnóstico
  console.log(`🔍 [DETECTION] RESULTADO: "${userMessage}" -> ${bestMatch?.name || 'NENHUMA'} (score: ${highestScore}, confiança: ${confidence})`);

  if (process.env.NODE_ENV === 'development') {
    console.log(`🔍 Detecção para "${userMessage}": melhor score=${highestScore}, disciplina=${bestMatch?.name}, confiança=${confidence}`);
  }

  return {
    isUniversityDiscipline: confidence >= 0.8,
    discipline: confidence >= 0.8 ? bestMatch : undefined,
    confidence,
    userContext: Object.values(userContext).some(v => v) ? userContext : undefined
  };
}

/**
 * Extrai informação sobre semestre da mensagem
 */
function extractSemester(message: string): string | undefined {
  const semestreMatch = message.match(/(\d+)[ºo°]?\s*(?:semestre|período|ano)/i);
  if (semestreMatch) {
    return semestreMatch[1];
  }
  return undefined;
}

/**
 * Detecta urgência baseado em palavras-chave
 */
function detectUrgency(message: string): 'high' | 'medium' | 'low' {
  if (/urgente|amanhã|hoje|agora|socorro|help/i.test(message)) {
    return 'high';
  }
  if (/semana|próxima|breve/i.test(message)) {
    return 'medium';
  }
  return 'low';
}

/**
 * Retorna sugestão de estrutura expandida para disciplina detectada
 */
export function getExpandedStructureHints(discipline: UniversityDiscipline): {
  suggestedModules: number;
  suggestedTopicsPerModule: number;
  includeExercises: boolean;
  includeLab: boolean;
  includeExamPrep: boolean;
} {
  return {
    suggestedModules: discipline.isCoreCurriculum ? 8 : 6,
    suggestedTopicsPerModule: discipline.requiresProgramming ? 8 : 6,
    includeExercises: true,
    includeLab: discipline.requiresLab,
    includeExamPrep: true
  };
}