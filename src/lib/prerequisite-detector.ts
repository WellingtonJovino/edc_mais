/**
 * Sistema de Detecção de Pré-requisitos Acadêmicos Aprimorado
 * Identifica pré-requisitos reais de matérias usando múltiplas estratégias e validação semântica
 */

export interface PrerequisiteInfo {
  hasPrerequisites: boolean;
  prerequisites: AcademicPrerequisite[];
  source: 'perplexity' | 'knowledge_base' | 'hybrid' | 'abstain';
  confidence: number; // 0-100
  confidenceJustification: string;
  searchQuery: string;
  extractionInfo: {
    courseName: string;
    confidence: number; // 0-100
    method: 'exact_match' | 'pattern_based' | 'nlp_hybrid' | 'fallback';
    originalTitle: string;
    cleaningSteps: string[];
  };
  semanticValidation?: {
    categoryMatch: boolean;
    relevanceScore: number;
    circularDependency: boolean;
    validationWarnings: string[];
  };
}

export interface AcademicPrerequisite {
  name: string;
  importance: 'essencial' | 'recomendado' | 'opcional';
  level: 'ensino_medio' | 'universitario' | 'tecnico';
  category?: 'matematica' | 'fisica' | 'programacao' | 'engenharia' | 'ciencias' | 'humanidades';
  description: string;
  commonAt: string[]; // universidades onde é comum
  estimatedTime: string;
  topics: string[];
  confidence?: number; // 0-100, confiança específica deste pré-requisito
}

/**
 * Base de conhecimento de pré-requisitos comuns no Brasil
 */
const PREREQUISITE_KNOWLEDGE_BASE: Record<string, AcademicPrerequisite[]> = {
  // Matemática Básica - Primeiro ano universitário
  'cálculo 1': [
    {
      name: 'Funções',
      importance: 'essencial',
      level: 'ensino_medio',
      category: 'matematica',
      description: 'Domínio completo de funções polinomiais, racionais, exponenciais e logarítmicas',
      commonAt: ['Padrão do Ensino Médio'],
      estimatedTime: '2-3 meses de revisão',
      topics: ['Domínio e imagem', 'Composição', 'Funções inversas', 'Gráficos', 'Transformações'],
      confidence: 95
    },
    {
      name: 'Trigonometria',
      importance: 'essencial',
      level: 'ensino_medio',
      category: 'matematica',
      description: 'Funções trigonométricas, identidades e equações',
      commonAt: ['Padrão do Ensino Médio'],
      estimatedTime: '1-2 meses de revisão',
      topics: ['Seno, cosseno, tangente', 'Identidades fundamentais', 'Equações trigonométricas', 'Ciclo trigonométrico'],
      confidence: 95
    },
    {
      name: 'Matemática Básica',
      importance: 'essencial',
      level: 'ensino_medio',
      category: 'matematica',
      description: 'Álgebra, manipulação algébrica e resolução de equações',
      commonAt: ['Padrão do Ensino Médio'],
      estimatedTime: '1-2 meses de revisão',
      topics: ['Fatoração', 'Produtos notáveis', 'Inequações', 'Módulo', 'Potenciação'],
      confidence: 95
    }
  ],

  'cálculo a': [
    {
      name: 'Funções',
      importance: 'essencial',
      level: 'ensino_medio',
      category: 'matematica',
      description: 'Domínio completo de funções polinomiais, racionais, exponenciais e logarítmicas',
      commonAt: ['Padrão do Ensino Médio'],
      estimatedTime: '2-3 meses de revisão',
      topics: ['Domínio e imagem', 'Composição', 'Funções inversas', 'Gráficos', 'Transformações'],
      confidence: 95
    },
    {
      name: 'Trigonometria',
      importance: 'essencial',
      level: 'ensino_medio',
      category: 'matematica',
      description: 'Funções trigonométricas, identidades e equações',
      commonAt: ['Padrão do Ensino Médio'],
      estimatedTime: '1-2 meses de revisão',
      topics: ['Seno, cosseno, tangente', 'Identidades fundamentais', 'Equações trigonométricas', 'Ciclo trigonométrico'],
      confidence: 95
    }
  ],

  'cálculo b': [
    {
      name: 'Cálculo A',
      importance: 'essencial',
      level: 'universitario',
      category: 'matematica',
      description: 'Derivadas, limites e conceitos básicos de cálculo diferencial são fundamentais',
      commonAt: ['USP', 'UNICAMP', 'UFRJ', 'UFMG'],
      estimatedTime: '1 semestre',
      topics: ['Limites', 'Derivadas', 'Aplicações de derivadas', 'Gráficos de funções'],
      confidence: 98
    },
    {
      name: 'Geometria Analítica',
      importance: 'recomendado',
      level: 'universitario',
      category: 'matematica',
      description: 'Facilita a compreensão de cálculo em múltiplas variáveis',
      commonAt: ['USP', 'UFRJ'],
      estimatedTime: '1 semestre',
      topics: ['Vetores', 'Retas e planos', 'Cônicas', 'Coordenadas'],
      confidence: 85
    }
  ],

  'cálculo 2': [
    {
      name: 'Cálculo 1',
      importance: 'essencial',
      level: 'universitario',
      category: 'matematica',
      description: 'Base fundamental para integrais e séries',
      commonAt: ['USP', 'UNICAMP', 'UFRJ', 'UFMG', 'PUC'],
      estimatedTime: '1 semestre',
      topics: ['Derivadas', 'Limites', 'Continuidade', 'Teoremas fundamentais'],
      confidence: 98
    }
  ],
  'cálculo 3': [
    {
      name: 'Cálculo 2',
      importance: 'essencial',
      level: 'universitario',
      description: 'Integrais múltiplas dependem do domínio de integrais simples',
      commonAt: ['USP', 'UNICAMP', 'UFRJ'],
      estimatedTime: '1 semestre',
      topics: ['Integrais', 'Técnicas de integração', 'Séries', 'Equações diferenciais básicas']
    },
    {
      name: 'Álgebra Linear',
      importance: 'essencial',
      level: 'universitario',
      description: 'Vetores, matrizes e transformações são cruciais para cálculo vetorial',
      commonAt: ['USP', 'UNICAMP', 'UFRJ'],
      estimatedTime: '1 semestre',
      topics: ['Vetores', 'Matrizes', 'Determinantes', 'Sistemas lineares']
    }
  ],

  'álgebra linear': [
    {
      name: 'Sistemas Lineares',
      importance: 'essencial',
      level: 'ensino_medio',
      description: 'Resolução de sistemas de equações lineares',
      commonAt: ['Padrão do Ensino Médio'],
      estimatedTime: '1 mês de revisão',
      topics: ['Método da substituição', 'Método da eliminação', 'Representação matricial', 'Determinantes 2x2']
    },
    {
      name: 'Matrizes Básicas',
      importance: 'essencial',
      level: 'ensino_medio',
      description: 'Operações básicas com matrizes',
      commonAt: ['Padrão do Ensino Médio'],
      estimatedTime: '1-2 meses',
      topics: ['Operações básicas', 'Determinantes', 'Matriz inversa', 'Multiplicação']
    },
    {
      name: 'Geometria Analítica Básica',
      importance: 'recomendado',
      level: 'ensino_medio',
      description: 'Conceitos de vetores e coordenadas',
      commonAt: ['Padrão do Ensino Médio'],
      estimatedTime: '1 mês',
      topics: ['Coordenadas cartesianas', 'Vetores 2D', 'Distâncias', 'Áreas']
    }
  ],

  'geometria analítica': [
    {
      name: 'Geometria Plana',
      importance: 'essencial',
      level: 'ensino_medio',
      description: 'Conceitos básicos de geometria plana',
      commonAt: ['Padrão do Ensino Médio'],
      estimatedTime: '1-2 meses',
      topics: ['Teorema de Pitágoras', 'Áreas', 'Perímetros', 'Semelhança']
    },
    {
      name: 'Trigonometria',
      importance: 'essencial',
      level: 'ensino_medio',
      description: 'Funções trigonométricas no círculo unitário',
      commonAt: ['Padrão do Ensino Médio'],
      estimatedTime: '1 mês',
      topics: ['Seno e cosseno', 'Lei dos senos', 'Lei dos cossenos']
    }
  ],

  // Física
  'física 1': [
    {
      name: 'Matemática Básica',
      importance: 'essencial',
      level: 'ensino_medio',
      description: 'Operações fundamentais, álgebra e resolução de equações',
      commonAt: ['Padrão do Ensino Médio'],
      estimatedTime: '1-2 meses de revisão',
      topics: ['Equações de 1º e 2º grau', 'Proporções', 'Potências', 'Notação científica', 'Gráficos']
    },
    {
      name: 'Trigonometria Básica',
      importance: 'essencial',
      level: 'ensino_medio',
      description: 'Seno, cosseno e tangente para análise de vetores',
      commonAt: ['Padrão do Ensino Médio'],
      estimatedTime: '2-3 semanas',
      topics: ['Seno, cosseno, tangente', 'Teorema de Pitágoras', 'Decomposição de vetores']
    },
    {
      name: 'Álgebra Vetorial Básica',
      importance: 'recomendado',
      level: 'ensino_medio',
      description: 'Conceitos básicos de vetores para mecânica',
      commonAt: ['Padrão do Ensino Médio'],
      estimatedTime: '2-3 semanas',
      topics: ['Soma vetorial', 'Decomposição', 'Produto escalar básico', 'Módulo de vetor']
    }
  ],

  'física 2': [
    {
      name: 'Física 1',
      importance: 'essencial',
      level: 'universitario',
      description: 'Mecânica clássica é base para eletromagnetismo',
      commonAt: ['USP', 'UNICAMP', 'UFRJ'],
      estimatedTime: '1 semestre',
      topics: ['Mecânica', 'Leis de Newton', 'Energia', 'Movimento']
    },
    {
      name: 'Cálculo 1',
      importance: 'essencial',
      level: 'universitario',
      description: 'Ferramentas matemáticas para análise de fenômenos elétricos',
      commonAt: ['USP', 'UNICAMP'],
      estimatedTime: '1 semestre',
      topics: ['Derivadas', 'Integrais', 'Funções trigonométricas']
    }
  ],

  // Engenharia
  'resistência dos materiais': [
    {
      name: 'Mecânica Geral',
      importance: 'essencial',
      level: 'universitario',
      description: 'Conceitos de forças, momentos e equilíbrio são fundamentais',
      commonAt: ['POLI-USP', 'UNICAMP', 'UFRJ'],
      estimatedTime: '1 semestre',
      topics: ['Estática', 'Forças', 'Momentos', 'Equilíbrio', 'Treliças']
    },
    {
      name: 'Cálculo Diferencial',
      importance: 'essencial',
      level: 'universitario',
      description: 'Necessário para análise de tensões e deformações',
      commonAt: ['POLI-USP', 'UNICAMP'],
      estimatedTime: '1 semestre',
      topics: ['Derivadas', 'Aplicações de derivadas', 'Máximos e mínimos']
    }
  ],

  'materiais para construção mecânica': [
    {
      name: 'Estrutura e Propriedades dos Materiais',
      importance: 'essencial',
      level: 'universitario',
      description: 'Base teórica sobre estrutura cristalina e propriedades fundamentais',
      commonAt: ['POLI-USP', 'UFMG', 'UFRGS'],
      estimatedTime: '1 semestre',
      topics: ['Estrutura cristalina', 'Ligações químicas', 'Defeitos', 'Propriedades mecânicas']
    },
    {
      name: 'Química Geral',
      importance: 'recomendado',
      level: 'universitario',
      description: 'Facilita o entendimento das propriedades químicas dos materiais',
      commonAt: ['POLI-USP', 'UNICAMP'],
      estimatedTime: '1 semestre',
      topics: ['Ligações químicas', 'Termoquímica', 'Cinética química']
    }
  ],

  'termodinâmica': [
    {
      name: 'Física 1',
      importance: 'essencial',
      level: 'universitario',
      description: 'Conceitos de energia, trabalho e conservação',
      commonAt: ['USP', 'UNICAMP', 'UFRJ'],
      estimatedTime: '1 semestre',
      topics: ['Energia', 'Trabalho', 'Conservação', 'Temperatura', 'Calor']
    },
    {
      name: 'Cálculo 1',
      importance: 'essencial',
      level: 'universitario',
      description: 'Necessário para análise matemática dos processos termodinâmicos',
      commonAt: ['USP', 'UNICAMP'],
      estimatedTime: '1 semestre',
      topics: ['Derivadas', 'Integrais', 'Funções de várias variáveis']
    }
  ],

  'mecânica dos fluidos': [
    {
      name: 'Mecânica Geral',
      importance: 'essencial',
      level: 'universitario',
      description: 'Princípios de mecânica aplicados a fluidos',
      commonAt: ['POLI-USP', 'UNICAMP'],
      estimatedTime: '1 semestre',
      topics: ['Dinâmica', 'Forças', 'Movimento', 'Conservação']
    },
    {
      name: 'Cálculo Diferencial e Integral',
      importance: 'essencial',
      level: 'universitario',
      description: 'Equações diferenciais para modelagem de fluxos',
      commonAt: ['POLI-USP', 'UNICAMP'],
      estimatedTime: '2 semestres',
      topics: ['Derivadas parciais', 'Integrais múltiplas', 'Equações diferenciais']
    }
  ],

  // Programação
  'programação 1': [
    {
      name: 'Lógica Matemática Básica',
      importance: 'essencial',
      level: 'ensino_medio',
      description: 'Raciocínio lógico e resolução de problemas',
      commonAt: ['Padrão do Ensino Médio'],
      estimatedTime: '2-4 semanas',
      topics: ['Sequências lógicas', 'Proposições', 'Operadores lógicos', 'Resolução de problemas']
    },
    {
      name: 'Matemática Básica',
      importance: 'recomendado',
      level: 'ensino_medio',
      description: 'Operações básicas e álgebra para algoritmos',
      commonAt: ['Padrão do Ensino Médio'],
      estimatedTime: '1-2 semanas',
      topics: ['Operações básicas', 'Equações simples', 'Proporções', 'Porcentagem']
    }
  ],

  'algoritmos e estruturas de dados': [
    {
      name: 'Programação I',
      importance: 'essencial',
      level: 'universitario',
      description: 'Lógica de programação e estruturas básicas',
      commonAt: ['USP', 'UNICAMP', 'UFRJ'],
      estimatedTime: '1 semestre',
      topics: ['Variáveis', 'Estruturas de controle', 'Funções', 'Arrays']
    },
    {
      name: 'Matemática Discreta',
      importance: 'recomendado',
      level: 'universitario',
      description: 'Base matemática para análise de algoritmos',
      commonAt: ['USP', 'UNICAMP'],
      estimatedTime: '1 semestre',
      topics: ['Lógica', 'Conjuntos', 'Grafos', 'Combinatória']
    }
  ],

  'banco de dados': [
    {
      name: 'Programação Orientada a Objetos',
      importance: 'essencial',
      level: 'universitario',
      description: 'Conceitos necessários para modelagem de dados',
      commonAt: ['USP', 'UNICAMP'],
      estimatedTime: '1 semestre',
      topics: ['Classes', 'Objetos', 'Herança', 'Encapsulamento']
    },
    {
      name: 'Lógica de Programação',
      importance: 'essencial',
      level: 'universitario',
      description: 'Base fundamental para estruturação de consultas',
      commonAt: ['USP', 'UNICAMP'],
      estimatedTime: '1 semestre',
      topics: ['Algoritmos', 'Estruturas de dados', 'Lógica booleana']
    }
  ],

  // Química
  'química geral': [
    {
      name: 'Matemática Básica',
      importance: 'essencial',
      level: 'ensino_medio',
      category: 'matematica',
      description: 'Cálculos estequiométricos e proporções',
      commonAt: ['Padrão do Ensino Médio'],
      estimatedTime: '1 mês',
      topics: ['Proporções', 'Regra de três', 'Notação científica', 'Logaritmos básicos'],
      confidence: 90
    },
    {
      name: 'Física Básica',
      importance: 'recomendado',
      level: 'ensino_medio',
      category: 'fisica',
      description: 'Conceitos de energia e estados da matéria',
      commonAt: ['Padrão do Ensino Médio'],
      estimatedTime: '2-3 semanas',
      topics: ['Estados da matéria', 'Temperatura', 'Pressão', 'Densidade'],
      confidence: 85
    }
  ],

  // Estatística e Probabilidade
  'estatística': [
    {
      name: 'Matemática Básica',
      importance: 'essencial',
      level: 'ensino_medio',
      category: 'matematica',
      description: 'Operações com frações, porcentagens e proporções',
      commonAt: ['Padrão do Ensino Médio'],
      estimatedTime: '2-3 semanas',
      topics: ['Frações', 'Porcentagens', 'Proporções', 'Gráficos básicos'],
      confidence: 95
    },
    {
      name: 'Cálculo I',
      importance: 'recomendado',
      level: 'universitario',
      category: 'matematica',
      description: 'Derivadas para distribuições contínuas',
      commonAt: ['USP', 'UNICAMP', 'UFRJ'],
      estimatedTime: '1 semestre',
      topics: ['Limites', 'Derivadas', 'Integrais básicas'],
      confidence: 75
    }
  ],

  'probabilidade': [
    {
      name: 'Matemática Básica',
      importance: 'essencial',
      level: 'ensino_medio',
      category: 'matematica',
      description: 'Operações com frações e proporções',
      commonAt: ['Padrão do Ensino Médio'],
      estimatedTime: '2-3 semanas',
      topics: ['Frações', 'Porcentagens', 'Combinatória básica'],
      confidence: 95
    },
    {
      name: 'Análise Combinatória',
      importance: 'essencial',
      level: 'ensino_medio',
      category: 'matematica',
      description: 'Base para cálculo de probabilidades',
      commonAt: ['Padrão do Ensino Médio'],
      estimatedTime: '3-4 semanas',
      topics: ['Permutações', 'Combinações', 'Arranjos', 'Princípio fundamental da contagem'],
      confidence: 95
    }
  ],

  // Engenharias específicas
  'estrutura e propriedades dos materiais': [
    {
      name: 'Química Geral',
      importance: 'essencial',
      level: 'universitario',
      category: 'ciencias',
      description: 'Ligações químicas e estrutura atômica',
      commonAt: ['USP', 'UNICAMP', 'UFRJ'],
      estimatedTime: '1 semestre',
      topics: ['Tabela periódica', 'Ligações químicas', 'Estrutura atômica', 'Estados da matéria'],
      confidence: 95
    },
    {
      name: 'Física I',
      importance: 'essencial',
      level: 'universitario',
      category: 'fisica',
      description: 'Conceitos de força, tensão e deformação',
      commonAt: ['USP', 'UNICAMP', 'UFRJ'],
      estimatedTime: '1 semestre',
      topics: ['Mecânica', 'Forças', 'Tensão', 'Deformação'],
      confidence: 90
    }
  ],

  'engenharia de software': [
    {
      name: 'Programação Orientada a Objetos',
      importance: 'essencial',
      level: 'universitario',
      category: 'programacao',
      description: 'Base para arquiteturas de software modernas',
      commonAt: ['USP', 'UNICAMP', 'UFRJ'],
      estimatedTime: '1 semestre',
      topics: ['Classes', 'Herança', 'Polimorfismo', 'Encapsulamento'],
      confidence: 95
    },
    {
      name: 'Algoritmos e Estruturas de Dados',
      importance: 'essencial',
      level: 'universitario',
      category: 'programacao',
      description: 'Fundamentos para design eficiente de software',
      commonAt: ['USP', 'UNICAMP', 'UFRJ'],
      estimatedTime: '1 semestre',
      topics: ['Complexidade', 'Estruturas lineares', 'Árvores', 'Grafos'],
      confidence: 95
    }
  ],

  // Áreas específicas
  'inteligência artificial': [
    {
      name: 'Cálculo I',
      importance: 'essencial',
      level: 'universitario',
      category: 'matematica',
      description: 'Base para otimização em ML',
      commonAt: ['USP', 'UNICAMP', 'UFRJ'],
      estimatedTime: '1 semestre',
      topics: ['Derivadas', 'Otimização', 'Gradiente'],
      confidence: 90
    },
    {
      name: 'Álgebra Linear',
      importance: 'essencial',
      level: 'universitario',
      category: 'matematica',
      description: 'Operações com vetores e matrizes em ML',
      commonAt: ['USP', 'UNICAMP', 'UFRJ'],
      estimatedTime: '1 semestre',
      topics: ['Matrizes', 'Vetores', 'Autovalores', 'Transformações'],
      confidence: 95
    },
    {
      name: 'Probabilidade e Estatística',
      importance: 'essencial',
      level: 'universitario',
      category: 'matematica',
      description: 'Base para modelos probabilísticos',
      commonAt: ['USP', 'UNICAMP', 'UFRJ'],
      estimatedTime: '1 semestre',
      topics: ['Distribuições', 'Bayes', 'Regressão', 'Inferência'],
      confidence: 95
    },
    {
      name: 'Programação (Python/R)',
      importance: 'essencial',
      level: 'universitario',
      category: 'programacao',
      description: 'Implementação de algoritmos de IA',
      commonAt: ['Mercado'],
      estimatedTime: '2-3 meses',
      topics: ['Sintaxe', 'Bibliotecas científicas', 'NumPy', 'Pandas'],
      confidence: 90
    }
  ],

  'machine learning': [
    {
      name: 'Cálculo I',
      importance: 'essencial',
      level: 'universitario',
      category: 'matematica',
      description: 'Derivadas para algoritmos de otimização',
      commonAt: ['USP', 'UNICAMP', 'UFRJ'],
      estimatedTime: '1 semestre',
      topics: ['Derivadas parciais', 'Gradiente', 'Otimização'],
      confidence: 95
    },
    {
      name: 'Álgebra Linear',
      importance: 'essencial',
      level: 'universitario',
      category: 'matematica',
      description: 'Manipulação de dados em formato matricial',
      commonAt: ['USP', 'UNICAMP', 'UFRJ'],
      estimatedTime: '1 semestre',
      topics: ['Operações matriciais', 'Decomposições', 'Espaços vetoriais'],
      confidence: 95
    },
    {
      name: 'Estatística',
      importance: 'essencial',
      level: 'universitario',
      category: 'matematica',
      description: 'Validação e análise de modelos',
      commonAt: ['USP', 'UNICAMP', 'UFRJ'],
      estimatedTime: '1 semestre',
      topics: ['Distribuições', 'Testes de hipóteses', 'Regressão'],
      confidence: 95
    }
  ],

  // Ciências Biológicas
  'biologia molecular': [
    {
      name: 'Química Geral',
      importance: 'essencial',
      level: 'universitario',
      category: 'ciencias',
      description: 'Base química para reações biológicas',
      commonAt: ['USP', 'UNICAMP', 'UFRJ'],
      estimatedTime: '1 semestre',
      topics: ['Ligações químicas', 'pH', 'Soluções', 'Reações'],
      confidence: 95
    },
    {
      name: 'Bioquímica',
      importance: 'essencial',
      level: 'universitario',
      category: 'ciencias',
      description: 'Reações e moléculas biológicas',
      commonAt: ['USP', 'UNICAMP', 'UFRJ'],
      estimatedTime: '1 semestre',
      topics: ['Proteínas', 'Carboidratos', 'Lipídios', 'Ácidos nucleicos'],
      confidence: 95
    }
  ],

  // Economia e Administração
  'microeconomia': [
    {
      name: 'Matemática Básica',
      importance: 'essencial',
      level: 'ensino_medio',
      category: 'matematica',
      description: 'Funções e gráficos para curvas econômicas',
      commonAt: ['Padrão do Ensino Médio'],
      estimatedTime: '3-4 semanas',
      topics: ['Funções', 'Gráficos', 'Sistemas de equações', 'Otimização básica'],
      confidence: 90
    },
    {
      name: 'Cálculo I',
      importance: 'recomendado',
      level: 'universitario',
      category: 'matematica',
      description: 'Otimização de funções econômicas',
      commonAt: ['USP', 'FGV', 'INSPER'],
      estimatedTime: '1 semestre',
      topics: ['Derivadas', 'Máximos e mínimos', 'Elasticidade'],
      confidence: 75
    }
  ],

  'macroeconomia': [
    {
      name: 'Microeconomia',
      importance: 'essencial',
      level: 'universitario',
      category: 'ciencias',
      description: 'Base microeconômica para agregados macroeconômicos',
      commonAt: ['USP', 'FGV', 'INSPER'],
      estimatedTime: '1 semestre',
      topics: ['Oferta e demanda', 'Elasticidades', 'Teoria do consumidor', 'Teoria da firma'],
      confidence: 95
    },
    {
      name: 'Matemática Básica',
      importance: 'essencial',
      level: 'ensino_medio',
      category: 'matematica',
      description: 'Cálculos de indicadores econômicos',
      commonAt: ['Padrão do Ensino Médio'],
      estimatedTime: '2-3 semanas',
      topics: ['Porcentagens', 'Proporções', 'Variação percentual', 'Números índices'],
      confidence: 90
    }
  ]
};

/**
 * Sistema de aliases para matérias
 */
const COURSE_ALIASES: Record<string, string[]> = {
  // Matemática
  'cálculo 1': ['calc 1', 'cálculo i', 'cálculo a', 'cálculo diferencial', 'calculus 1', 'calculus i'],
  'cálculo 2': ['calc 2', 'cálculo ii', 'cálculo b', 'cálculo integral', 'calculus 2', 'calculus ii'],
  'cálculo 3': ['calc 3', 'cálculo iii', 'cálculo c', 'cálculo vetorial', 'calculus 3', 'calculus iii'],
  'álgebra linear': ['algebra linear', 'linear algebra', 'álgebra matricial'],
  'geometria analítica': ['geometria analitica', 'analytic geometry', 'geometria cartesiana'],

  // Física
  'física 1': ['física i', 'física a', 'física geral 1', 'mecânica clássica', 'physics 1'],
  'física 2': ['física ii', 'física b', 'física geral 2', 'eletromagnetismo', 'physics 2'],

  // Programação
  'programação 1': ['programacao 1', 'prog 1', 'programming 1', 'algoritmos básicos', 'lógica de programação'],
  'algoritmos e estruturas de dados': ['algoritmos', 'estruturas de dados', 'data structures', 'AED'],
  'banco de dados': ['bd', 'database', 'sistemas de banco de dados', 'sgbd'],
  'engenharia de software': ['eng software', 'software engineering', 'eng de software'],

  // Química e Ciências
  'química geral': ['quimica geral', 'general chemistry', 'química básica'],
  'biologia molecular': ['bio molecular', 'molecular biology'],

  // Engenharia
  'materiais para construção mecânica': ['materiais de construção mecânica', 'materials for mechanical construction', 'materiais mecânicos'],
  'resistência dos materiais': ['resistencia dos materiais', 'strength of materials', 'mecânica dos materiais'],
  'termodinâmica': ['termodinamica', 'thermodynamics', 'termo'],
  'mecânica dos fluidos': ['mecanica dos fluidos', 'fluid mechanics', 'mecânica de fluidos'],
  'estrutura e propriedades dos materiais': ['estrutura dos materiais', 'propriedades dos materiais', 'materials science'],

  // Estatística e Probabilidade
  'estatística': ['estatistica', 'statistics', 'estatística aplicada'],
  'probabilidade': ['prob', 'probability', 'probabilidade e estatística'],

  // Inteligência Artificial e ML
  'inteligência artificial': ['ia', 'artificial intelligence', 'ai', 'inteligencia artificial'],
  'machine learning': ['ml', 'aprendizado de máquina', 'aprendizagem de máquina', 'machine learning'],

  // Economia
  'microeconomia': ['micro', 'microeconomics', 'teoria microeconômica'],
  'macroeconomia': ['macro', 'macroeconomics', 'teoria macroeconômica']
};

/**
 * Extrai o nome real da matéria do título do syllabus com sistema híbrido NLP
 */
export function extractCourseNameFromTitle(title: string): {
  courseName: string;
  confidence: number; // 0-100
  method: 'exact_match' | 'pattern_based' | 'nlp_hybrid' | 'fallback';
  originalTitle: string;
  cleaningSteps: string[];
} {
  const originalTitle = title;
  const cleaningSteps: string[] = [];
  let confidence = 100; // Começa com confiança máxima
  let method: 'exact_match' | 'pattern_based' | 'nlp_hybrid' | 'fallback' = 'exact_match';

  // Etapa 1: Verificar se já é um nome limpo
  const normalizedTitle = normalizeCourseName(title);
  if (PREREQUISITE_KNOWLEDGE_BASE[normalizedTitle] || COURSE_ALIASES[normalizedTitle]) {
    return {
      courseName: title,
      confidence: 100,
      method: 'exact_match',
      originalTitle,
      cleaningSteps: ['Título já é um nome de curso reconhecido']
    };
  }

  // Etapa 2: Limpeza pattern-based com pontuação detalhada
  let cleanName = title;
  method = 'pattern_based';

  // Remove prefixos de curso
  if (cleanName.match(/^curso\s+(de\s+)?/i)) {
    cleanName = cleanName.replace(/^curso\s+(de\s+)?/i, '');
    cleaningSteps.push('Removido prefixo "Curso (de)"');
    confidence -= 5;
  }

  // Remove sufixos de nível
  if (cleanName.match(/\s+para\s+(iniciantes?|intermediários?|avançados?)/i)) {
    cleanName = cleanName.replace(/\s+para\s+(iniciantes?|intermediários?|avançados?)/i, '');
    cleaningSteps.push('Removido sufixo de nível de dificuldade');
    confidence -= 5;
  }

  // Remove palavras qualificadoras
  const qualifiers = ['completo', 'básico', 'avançado', 'introdutório', 'fundamental'];
  for (const qualifier of qualifiers) {
    const regex = new RegExp(`\\s+${qualifier}`, 'i');
    if (cleanName.match(regex)) {
      cleanName = cleanName.replace(regex, '');
      cleaningSteps.push(`Removida palavra qualificadora "${qualifier}"`);
      confidence -= 3;
    }
  }

  // Remove frases introdutórias
  if (cleanName.match(/\s+introdução\s+(a|ao)\s+/i)) {
    cleanName = cleanName.replace(/\s+introdução\s+(a|ao)\s+/i, ' ');
    cleaningSteps.push('Removida frase introdutória');
    confidence -= 8;
  }

  // Remove estruturas entre parênteses/colchetes
  if (cleanName.match(/\s+[\(\[][^\)\]]*[\)\]]/)) {
    cleanName = cleanName.replace(/\s+[\(\[][^\)\]]*[\)\]]/g, '');
    cleaningSteps.push('Removido conteúdo entre parênteses/colchetes');
    confidence -= 10;
  }

  // Remove tudo após hífen ou dois pontos (pode ser descrição)
  if (cleanName.match(/\s*[-:]\s*.+$/)) {
    const removedPart = cleanName.match(/\s*[-:]\s*(.+)$/)?.[1] || '';
    cleanName = cleanName.replace(/\s*[-:]\s*.+$/, '');
    cleaningSteps.push(`Removida descrição após hífen/dois pontos: "${removedPart}"`);

    // Se o que foi removido é muito grande, reduz mais a confiança
    if (removedPart.length > cleanName.length) {
      confidence -= 20;
      method = 'nlp_hybrid';
    } else {
      confidence -= 10;
    }
  }

  cleanName = cleanName.trim();

  // Etapa 3: Validação semântica
  const normalizedClean = normalizeCourseName(cleanName);

  // Verifica se o resultado final faz sentido
  if (cleanName.length < 3) {
    confidence = 15; // Muito baixo
    method = 'fallback';
    cleaningSteps.push('⚠️ Nome extraído muito curto, baixa confiança');
  } else if (cleanName.length < originalTitle.length * 0.3) {
    confidence -= 25;
    method = 'nlp_hybrid';
    cleaningSteps.push('⚠️ Muita informação removida, confiança reduzida');
  }

  // Verifica se contém palavras-chave acadêmicas
  const academicKeywords = [
    'cálculo', 'álgebra', 'geometria', 'física', 'química', 'biologia',
    'programação', 'algoritmos', 'banco', 'dados', 'software', 'engenharia',
    'materiais', 'mecânica', 'elétrica', 'estatística', 'probabilidade',
    'economia', 'administração', 'inteligência', 'artificial', 'machine',
    'learning', 'estruturas', 'resistência', 'fluidos', 'termodinâmica'
  ];

  const hasAcademicKeywords = academicKeywords.some(keyword =>
    normalizedClean.includes(normalizeCourseName(keyword))
  );

  if (hasAcademicKeywords) {
    confidence += 5;
    cleaningSteps.push('✅ Contém palavras-chave acadêmicas reconhecidas');
  } else {
    confidence -= 10;
    cleaningSteps.push('⚠️ Não contém palavras-chave acadêmicas típicas');
  }

  // Verifica correspondência parcial com conhecimento base
  let partialMatch = false;
  for (const [knownCourse] of Object.entries(PREREQUISITE_KNOWLEDGE_BASE)) {
    const knownWords = knownCourse.split(' ');
    const cleanWords = normalizedClean.split(' ');

    const matchingWords = knownWords.filter(kw =>
      cleanWords.some(cw => cw.includes(kw) || kw.includes(cw))
    );

    if (matchingWords.length > 0 && matchingWords.length >= knownWords.length * 0.5) {
      partialMatch = true;
      confidence += 10;
      cleaningSteps.push(`✅ Correspondência parcial com "${knownCourse}"`);
      break;
    }
  }

  if (!partialMatch && method !== 'fallback') {
    confidence -= 5;
    cleaningSteps.push('⚠️ Nenhuma correspondência com cursos conhecidos');
  }

  // Garantir que confidence está no range [0, 100]
  confidence = Math.max(0, Math.min(100, confidence));

  // Determinar método final baseado na confiança
  if (confidence >= 80) {
    method = 'pattern_based';
  } else if (confidence >= 50) {
    method = 'nlp_hybrid';
  } else {
    method = 'fallback';
  }

  return {
    courseName: cleanName,
    confidence,
    method,
    originalTitle,
    cleaningSteps
  };
}

/**
 * Normaliza nome da matéria para busca
 */
function normalizeCourseName(courseName: string): string {
  return courseName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s]/g, ' ') // Remove caracteres especiais
    .replace(/\s+/g, ' ') // Normaliza espaços
    .trim();
}

/**
 * Busca pré-requisitos na base de conhecimento local
 */
function searchInKnowledgeBase(courseName: string): AcademicPrerequisite[] {
  const normalized = normalizeCourseName(courseName);

  // 1. Busca exata primeiro
  if (PREREQUISITE_KNOWLEDGE_BASE[normalized]) {
    console.log(`✅ Match exato encontrado: ${normalized}`);
    return PREREQUISITE_KNOWLEDGE_BASE[normalized];
  }

  // 2. Busca por aliases
  for (const [canonicalName, aliases] of Object.entries(COURSE_ALIASES)) {
    const normalizedCanonical = normalizeCourseName(canonicalName);
    const normalizedAliases = aliases.map(alias => normalizeCourseName(alias));

    if (normalizedAliases.includes(normalized)) {
      console.log(`✅ Match por alias encontrado: ${normalized} → ${canonicalName}`);
      return PREREQUISITE_KNOWLEDGE_BASE[normalizedCanonical] || [];
    }
  }

  // 3. Busca reversa (se courseName está nos aliases de alguma matéria)
  for (const [baseKey, prerequisites] of Object.entries(PREREQUISITE_KNOWLEDGE_BASE)) {
    const aliases = COURSE_ALIASES[baseKey];
    if (aliases) {
      const normalizedAliases = aliases.map(alias => normalizeCourseName(alias));
      if (normalizedAliases.includes(normalized)) {
        console.log(`✅ Match reverso encontrado: ${normalized} → ${baseKey}`);
        return prerequisites;
      }
    }
  }

  // 4. Busca fuzzy (mais restritiva: 80% de match)
  for (const [key, prerequisites] of Object.entries(PREREQUISITE_KNOWLEDGE_BASE)) {
    const keyWords = key.split(' ');
    const courseWords = normalized.split(' ');

    const matches = keyWords.filter(kw =>
      courseWords.some(cw =>
        (cw.includes(kw) || kw.includes(cw)) &&
        Math.min(cw.length, kw.length) > 2 // palavras com pelo menos 3 caracteres
      )
    );

    // Aumentei de 60% para 80% para ser mais restritivo
    if (matches.length / keyWords.length >= 0.8) {
      console.log(`✅ Match fuzzy encontrado (${Math.round(matches.length / keyWords.length * 100)}%): ${normalized} → ${key}`);
      return prerequisites;
    }
  }

  console.log(`❌ Nenhum match encontrado na base de conhecimento para: ${normalized}`);
  return [];
}

/**
 * Busca pré-requisitos acadêmicos usando Perplexity
 */
async function searchPrerequisitesWithPerplexity(courseName: string, courseLevel: string): Promise<{
  prerequisites: AcademicPrerequisite[];
  confidence: number;
}> {
  try {
    const { searchAcademicContent } = await import('./perplexity');

    // Query específica para pré-requisitos
    const query = `Quais são os pré-requisitos acadêmicos da matéria "${courseName}" (nível ${courseLevel}) nas universidades brasileiras?

Busque informações sobre:
- Disciplinas obrigatórias que devem ser cursadas antes
- Conhecimentos essenciais necessários
- Grade curricular típica de universidades como USP, UNICAMP, UFRJ
- Sequência recomendada de disciplinas

Inclua apenas pré-requisitos reais e formais, não sugestões gerais.`;

    console.log(`🔍 Buscando pré-requisitos para: "${courseName}" no Perplexity...`);

    const result = await searchAcademicContent({
      query,
      maxResults: 8,
      language: 'pt',
      siteFilters: [
        'site:usp.br',
        'site:unicamp.br',
        'site:ufrj.br',
        'site:ufmg.br',
        'site:.edu.br',
        'filetype:pdf'
      ]
    });

    if (!result.answer) {
      return { prerequisites: [], confidence: 0 };
    }

    // Processar resposta do Perplexity para extrair pré-requisitos
    const prerequisites = parsePrerequisitesFromPerplexity(result.answer, courseName);

    return {
      prerequisites,
      confidence: result.citations.length > 3 ? 0.8 : 0.6
    };

  } catch (error) {
    console.warn('⚠️ Erro ao buscar pré-requisitos no Perplexity:', error);
    return { prerequisites: [], confidence: 0 };
  }
}

/**
 * Processa resposta do Perplexity para extrair pré-requisitos estruturados
 */
function parsePrerequisitesFromPerplexity(content: string, courseName: string): AcademicPrerequisite[] {
  const prerequisites: AcademicPrerequisite[] = [];

  // Padrões comuns para identificar pré-requisitos
  const patterns = [
    /pré-requisito[s]?:?\s*([^.!?]+)/gi,
    /requisito[s]?:?\s*([^.!?]+)/gi,
    /disciplina[s]?\s+obrigatória[s]?:?\s*([^.!?]+)/gi,
    /antes\s+de\s+cursar:?\s*([^.!?]+)/gi,
    /necessário\s+ter\s+cursado:?\s*([^.!?]+)/gi
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const prereqText = match[1].trim();

      // Extrair nomes de disciplinas do texto
      const subjects = extractSubjectNames(prereqText);

      for (const subject of subjects) {
        if (!prerequisites.find(p => p.name.toLowerCase() === subject.toLowerCase())) {
          prerequisites.push({
            name: subject,
            importance: determineImportance(prereqText, subject),
            level: 'universitario', // Default level for Perplexity results
            category: detectCourseCategory(subject),
            description: `Pré-requisito identificado para ${courseName}`,
            commonAt: ['Universidades brasileiras'],
            estimatedTime: '1 semestre',
            topics: [],
            confidence: 70 // Default confidence for Perplexity results
          });
        }
      }
    }
  }

  return prerequisites.slice(0, 5); // Limitar a 5 pré-requisitos
}

/**
 * Extrai nomes de disciplinas de um texto
 */
function extractSubjectNames(text: string): string[] {
  const subjects: string[] = [];

  // Padrões comuns de nomes de disciplinas
  const subjectPatterns = [
    /cálculo\s*[AIB123]?/gi,
    /álgebra\s*linear/gi,
    /física\s*[I123]?/gi,
    /mecânica\s*(?:geral|dos\s*materiais|dos\s*fluidos)?/gi,
    /termodinâmica/gi,
    /resistência\s*dos\s*materiais/gi,
    /estrutura\s*e\s*propriedades\s*dos\s*materiais/gi,
    /programação\s*[I123]?/gi,
    /algoritmos/gi,
    /geometria\s*analítica/gi,
    /química\s*geral/gi,
    /estatística/gi,
    /probabilidade/gi
  ];

  for (const pattern of subjectPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      subjects.push(...matches.map(m => m.trim()));
    }
  }

  return Array.from(new Set(subjects)); // Remove duplicatas
}

/**
 * Determina a importância de um pré-requisito baseado no contexto
 */
function determineImportance(context: string, subject: string): 'essencial' | 'recomendado' | 'opcional' {
  const lowerContext = context.toLowerCase();

  if (lowerContext.includes('obrigatório') || lowerContext.includes('essencial') ||
      lowerContext.includes('fundamental') || lowerContext.includes('indispensável')) {
    return 'essencial';
  }

  if (lowerContext.includes('recomendado') || lowerContext.includes('aconselhável') ||
      lowerContext.includes('desejável')) {
    return 'recomendado';
  }

  return 'opcional';
}

/**
 * Função principal para detectar pré-requisitos acadêmicos com validação semântica
 */
export async function detectAcademicPrerequisites(
  courseName: string,
  courseLevel: 'beginner' | 'intermediate' | 'advanced'
): Promise<PrerequisiteInfo> {
  console.log(`🎯 Detectando pré-requisitos para: "${courseName}" (${courseLevel})`);

  let confidence = 0;
  let confidenceJustification = '';
  let source: 'perplexity' | 'knowledge_base' | 'hybrid' | 'abstain' = 'knowledge_base';
  let prerequisites: AcademicPrerequisite[] = [];

  // 1. Buscar na base de conhecimento local
  const knowledgeBaseResults = searchInKnowledgeBase(courseName);

  if (knowledgeBaseResults.length > 0) {
    console.log(`✅ ${knowledgeBaseResults.length} pré-requisitos encontrados na base de conhecimento`);

    // Calcular confiança baseada na qualidade dos pré-requisitos
    const avgPrereqConfidence = knowledgeBaseResults.reduce((sum, prereq) =>
      sum + (prereq.confidence || 85), 0) / knowledgeBaseResults.length;

    confidence = Math.round(avgPrereqConfidence);
    prerequisites = knowledgeBaseResults;
    source = 'knowledge_base';

    confidenceJustification = [
      `Encontrados ${knowledgeBaseResults.length} pré-requisitos na base de conhecimento interna`,
      `Confiança média dos pré-requisitos: ${Math.round(avgPrereqConfidence)}%`,
      `Fonte: Base de conhecimento curada com ${Object.keys(PREREQUISITE_KNOWLEDGE_BASE).length} matérias`
    ].join('. ');

    // Validação semântica adicional
    const semanticValidation = validateSemanticConsistency(courseName, knowledgeBaseResults);

    return {
      hasPrerequisites: true,
      prerequisites: knowledgeBaseResults,
      source,
      confidence,
      confidenceJustification,
      searchQuery: courseName,
      extractionInfo: {
        courseName,
        confidence,
        method: 'exact_match',
        originalTitle: courseName,
        cleaningSteps: ['Busca direta na base de conhecimento']
      },
      semanticValidation
    };
  }

  // 2. Se não encontrou, buscar no Perplexity
  console.log('🔍 Buscando no Perplexity como fallback...');
  const perplexityResults = await searchPrerequisitesWithPerplexity(courseName, courseLevel);

  if (perplexityResults.prerequisites.length > 0) {
    console.log(`✅ ${perplexityResults.prerequisites.length} pré-requisitos encontrados no Perplexity`);

    confidence = Math.round(perplexityResults.confidence * 100);
    prerequisites = perplexityResults.prerequisites;
    source = 'perplexity';

    confidenceJustification = [
      `Pré-requisitos encontrados via Perplexity API`,
      `${perplexityResults.prerequisites.length} pré-requisitos identificados`,
      `Confiança baseada na qualidade das fontes acadêmicas consultadas`,
      `Validação manual recomendada para casos críticos`
    ].join('. ');

    const semanticValidation = validateSemanticConsistency(courseName, perplexityResults.prerequisites);

    return {
      hasPrerequisites: true,
      prerequisites: perplexityResults.prerequisites,
      source,
      confidence,
      confidenceJustification,
      searchQuery: courseName,
      extractionInfo: {
        courseName,
        confidence,
        method: 'nlp_hybrid',
        originalTitle: courseName,
        cleaningSteps: ['Busca via Perplexity API', 'Processamento de linguagem natural']
      },
      semanticValidation
    };
  }

  // 3. Política de abstenção - quando não há pré-requisitos ou confiança muito baixa
  console.log('❌ Nenhum pré-requisito específico encontrado');

  // Verificar se devemos abster
  if (shouldAbstain(courseName, courseLevel)) {
    return {
      hasPrerequisites: false,
      prerequisites: [],
      source: 'abstain',
      confidence: 0,
      confidenceJustification: 'Confiança insuficiente para fornecer pré-requisitos. Recomenda-se consulta manual com coordenação acadêmica.',
      searchQuery: courseName,
      extractionInfo: {
        courseName,
        confidence: 0,
        method: 'fallback',
        originalTitle: courseName,
        cleaningSteps: ['Nenhuma correspondência encontrada', 'Sistema optou por se abster']
      }
    };
  }

  return {
    hasPrerequisites: false,
    prerequisites: [],
    source: 'knowledge_base',
    confidence: 50, // Confiança média para "sem pré-requisitos"
    confidenceJustification: 'Não foram identificados pré-requisitos específicos nas fontes consultadas. Pode ser uma matéria introdutória ou a base de conhecimento precisa ser expandida.',
    searchQuery: courseName,
    extractionInfo: {
      courseName,
      confidence: 50,
      method: 'fallback',
      originalTitle: courseName,
      cleaningSteps: ['Busca completa realizada', 'Nenhum pré-requisito identificado']
    }
  };
}

/**
 * Valida se um pré-requisito é relevante para o curso
 */
export function validatePrerequisiteRelevance(
  prerequisite: AcademicPrerequisite,
  courseName: string,
  courseLevel: string
): boolean {
  const courseWords = normalizeCourseName(courseName).split(' ');
  const prereqWords = normalizeCourseName(prerequisite.name).split(' ');

  // Evitar pré-requisitos circulares ou irrelevantes
  const overlap = courseWords.filter(word => prereqWords.includes(word)).length;

  // Se há mais de 50% de sobreposição, pode ser circular
  if (overlap / Math.min(courseWords.length, prereqWords.length) > 0.5) {
    return false;
  }

  return true;
}

/**
 * Gera relatório de pré-requisitos para exibição
 */
export function generatePrerequisiteReport(prerequisiteInfo: PrerequisiteInfo): string {
  if (!prerequisiteInfo.hasPrerequisites) {
    return "✅ Esta matéria não possui pré-requisitos específicos identificados.";
  }

  // Separar por nível de ensino
  const universitarios = prerequisiteInfo.prerequisites.filter(p => p.level === 'universitario');
  const ensinoMedio = prerequisiteInfo.prerequisites.filter(p => p.level === 'ensino_medio');
  const tecnicos = prerequisiteInfo.prerequisites.filter(p => p.level === 'tecnico');

  let report = "📚 Pré-requisitos Identificados:\n\n";

  // Pré-requisitos universitários primeiro (mais importantes)
  if (universitarios.length > 0) {
    report += "🎓 UNIVERSITÁRIOS (matérias anteriores do curso):\n";

    const essenciais = universitarios.filter(p => p.importance === 'essencial');
    const recomendados = universitarios.filter(p => p.importance === 'recomendado');

    if (essenciais.length > 0) {
      essenciais.forEach(prereq => {
        report += `• ${prereq.name} (ESSENCIAL)\n`;
        report += `  📖 ${prereq.description}\n`;
        report += `  🏫 Comum em: ${prereq.commonAt.join(', ')}\n`;
        report += `  ⏱️ Tempo: ${prereq.estimatedTime}\n\n`;
      });
    }

    if (recomendados.length > 0) {
      recomendados.forEach(prereq => {
        report += `• ${prereq.name} (recomendado)\n`;
        report += `  📖 ${prereq.description}\n\n`;
      });
    }
  }

  // Pré-requisitos do ensino médio
  if (ensinoMedio.length > 0) {
    report += "📖 ENSINO MÉDIO (base necessária):\n";

    const essenciais = ensinoMedio.filter(p => p.importance === 'essencial');
    const recomendados = ensinoMedio.filter(p => p.importance === 'recomendado');

    if (essenciais.length > 0) {
      essenciais.forEach(prereq => {
        report += `• ${prereq.name} (ESSENCIAL)\n`;
        report += `  📖 ${prereq.description}\n`;
        report += `  ⏱️ Revisão estimada: ${prereq.estimatedTime}\n`;
        if (prereq.topics.length > 0) {
          report += `  📋 Tópicos: ${prereq.topics.slice(0, 3).join(', ')}${prereq.topics.length > 3 ? '...' : ''}\n`;
        }
        report += '\n';
      });
    }

    if (recomendados.length > 0) {
      recomendados.forEach(prereq => {
        report += `• ${prereq.name} (recomendado)\n`;
        report += `  📖 ${prereq.description}\n\n`;
      });
    }
  }

  // Pré-requisitos técnicos (se houver)
  if (tecnicos.length > 0) {
    report += "🔧 TÉCNICOS (conhecimentos específicos):\n";
    tecnicos.forEach(prereq => {
      report += `• ${prereq.name} (${prereq.importance})\n`;
      report += `  📖 ${prereq.description}\n\n`;
    });
  }

  // Orientações específicas baseadas no tipo de pré-requisitos
  if (universitarios.length > 0) {
    report += `💡 Você precisa completar as matérias universitárias listadas primeiro.\n`;
    report += `Digite "Gerar curso de [nome da matéria]" para qualquer pré-requisito.\n\n`;
  } else if (ensinoMedio.length > 0) {
    report += `💡 Base do ensino médio necessária.\n`;
    report += `Se precisar revisar, posso criar um curso de nivelamento.\n`;
    report += `Digite "Gerar curso de [nome do tópico]" para revisão.\n\n`;
  }

  return report;
}

/**
 * Valida consistência semântica entre curso e pré-requisitos
 */
function validateSemanticConsistency(
  courseName: string,
  prerequisites: AcademicPrerequisite[]
): {
  categoryMatch: boolean;
  relevanceScore: number;
  circularDependency: boolean;
  validationWarnings: string[];
} {
  const warnings: string[] = [];
  let categoryMatch = false;
  let relevanceScore = 0;
  let circularDependency = false;

  // 1. Verificar correspondência de categoria
  const courseCategory = detectCourseCategory(courseName);
  const prereqCategories = prerequisites.map(p => p.category).filter(Boolean);

  if (prereqCategories.length > 0) {
    const sameCategoryCount = prereqCategories.filter(cat => cat === courseCategory).length;
    categoryMatch = sameCategoryCount > 0;

    if (!categoryMatch && courseCategory) {
      warnings.push(`Pré-requisitos de categorias diferentes da matéria principal (${courseCategory})`);
    }
  }

  // 2. Calcular score de relevância baseado na sobreposição de palavras-chave
  const courseWords = normalizeCourseName(courseName).split(' ');
  let totalRelevance = 0;

  prerequisites.forEach(prereq => {
    const prereqWords = normalizeCourseName(prereq.name).split(' ');
    const commonWords = courseWords.filter(word =>
      prereqWords.some(pWord => pWord.includes(word) || word.includes(pWord))
    );

    const prereqRelevance = commonWords.length / Math.max(courseWords.length, prereqWords.length);
    totalRelevance += prereqRelevance;
  });

  relevanceScore = Math.round((totalRelevance / Math.max(prerequisites.length, 1)) * 100);

  if (relevanceScore < 20) {
    warnings.push(`Baixa relevância semântica entre curso e pré-requisitos (${relevanceScore}%)`);
  }

  // 3. Detectar dependências circulares
  prerequisites.forEach(prereq => {
    const prereqNormalized = normalizeCourseName(prereq.name);
    const courseNormalized = normalizeCourseName(courseName);

    // Verificar se o curso atual está nos pré-requisitos do pré-requisito
    if (PREREQUISITE_KNOWLEDGE_BASE[prereqNormalized]) {
      const nestedPrereqs = PREREQUISITE_KNOWLEDGE_BASE[prereqNormalized];
      const hasCircular = nestedPrereqs.some(nested =>
        normalizeCourseName(nested.name) === courseNormalized
      );

      if (hasCircular) {
        circularDependency = true;
        warnings.push(`Possível dependência circular detectada com "${prereq.name}"`);
      }
    }
  });

  return {
    categoryMatch,
    relevanceScore,
    circularDependency,
    validationWarnings: warnings
  };
}

/**
 * Determina se o sistema deve se abster de fornecer pré-requisitos
 */
function shouldAbstain(courseName: string, courseLevel: string): boolean {
  // Cursos muito específicos ou pouco comuns
  const uncommonPatterns = [
    /tópicos?\s+especiais/i,
    /estudos?\s+dirigidos?/i,
    /seminário/i,
    /workshop/i,
    /laboratório\s+de\s+pesquisa/i
  ];

  for (const pattern of uncommonPatterns) {
    if (courseName.match(pattern)) {
      return true;
    }
  }

  // Cursos muito curtos ou genéricos demais
  if (courseName.length < 5 || courseName.trim().split(' ').length < 2) {
    return true;
  }

  return false;
}

/**
 * Detecta categoria do curso baseada em palavras-chave
 */
function detectCourseCategory(courseName: string): 'matematica' | 'fisica' | 'programacao' | 'engenharia' | 'ciencias' | 'humanidades' | undefined {
  const normalized = normalizeCourseName(courseName);

  if (normalized.match(/calcul|algebra|geometri|estatist|probabilidad|matematica/)) return 'matematica';
  if (normalized.match(/fisic|mecanic|eletric|eletron|optic/)) return 'fisica';
  if (normalized.match(/program|algorithm|software|comput|dados|web/)) return 'programacao';
  if (normalized.match(/engenhari|material|estrutur|construc|mecanc/)) return 'engenharia';
  if (normalized.match(/quimic|biolog|bioqu|molecular/)) return 'ciencias';
  if (normalized.match(/economi|administr|financ|gestao/)) return 'humanidades';

  return undefined;
}

/**
 * Retorna indicador visual de confiança
 */
function getConfidenceIndicator(confidence: number): string {
  if (confidence >= 90) return '🟢 (Muito Alta)';
  if (confidence >= 75) return '🟡 (Alta)';
  if (confidence >= 50) return '🟠 (Média)';
  if (confidence >= 25) return '🔴 (Baixa)';
  return '⚫ (Muito Baixa)';
}

/**
 * Retorna descrição da fonte
 */
function getSourceDescription(source: string): string {
  switch (source) {
    case 'knowledge_base': return 'Base de conhecimento interna curada';
    case 'perplexity': return 'API Perplexity com fontes acadêmicas';
    case 'hybrid': return 'Combinação de fontes internas e externas';
    case 'abstain': return 'Sistema optou por se abster';
    default: return source;
  }
}

/**
 * Retorna descrição do método de extração
 */
function getMethodDescription(method: string): string {
  switch (method) {
    case 'exact_match': return 'Correspondência exata';
    case 'pattern_based': return 'Baseado em padrões';
    case 'nlp_hybrid': return 'Processamento híbrido NLP';
    case 'fallback': return 'Método de fallback';
    default: return method;
  }
}