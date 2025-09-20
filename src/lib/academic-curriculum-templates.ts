/**
 * Templates de Currículos Acadêmicos
 * Estruturas completas e detalhadas para disciplinas universitárias
 */

// Usando tipos simplificados para templates (não usar o tipo completo Module/Topic)

// Tipo simplificado para tópicos do template
export interface TemplateTopic {
  title: string;
  description: string;
  order: number;
  learningObjectives?: string[];
  keyTerms?: string[];
  searchKeywords?: string[];
}

// Tipo simplificado para seções do template
export interface TemplateSection {
  title: string;
  order: number;
  topics: TemplateTopic[];
}

// Tipo simplificado para módulos do template
export interface TemplateModule {
  title: string;
  description: string;
  order: number;
  estimatedDuration: string;
  sections: TemplateSection[];
}

export interface AcademicCurriculumTemplate {
  disciplineId: string;
  courseName: string;
  description: string;
  modules: TemplateModule[];
  totalHours: number;
  bibliography: {
    main: string[];
    complementary: string[];
  };
  evaluationMethods: string[];
  practicalTools?: string[];
}

/**
 * Template completo para Cálculo Numérico
 */
export const CALCULO_NUMERICO_TEMPLATE: AcademicCurriculumTemplate = {
  disciplineId: 'numerical_calculus',
  courseName: 'Cálculo Numérico',
  description: 'Estudo de métodos numéricos para resolução de problemas matemáticos usando computadores, incluindo análise de erros, zeros de funções, interpolação, integração numérica e resolução de sistemas.',
  totalHours: 72,
  modules: [
    {
      title: 'Fundamentos e Teoria dos Erros',
      description: 'Introdução ao cálculo numérico e análise detalhada de erros computacionais',
      order: 1,
      estimatedDuration: '2 semanas',
      sections: [
        {
          title: 'Conceitos Fundamentais',
          order: 1,
          topics: [
            {
              title: 'O que é Cálculo Numérico',
              description: 'Definição, importância e aplicações do cálculo numérico na engenharia e ciências',
              // keywords: ['cálculo numérico', 'métodos numéricos', 'computação científica'],
              order: 1,
              learningObjectives: ['Compreender o papel do cálculo numérico', 'Identificar problemas que requerem métodos numéricos'],
              keyTerms: ['método numérico', 'algoritmo', 'aproximação'],
              searchKeywords: ['introdução cálculo numérico', 'numerical methods introduction']
            },
            {
              title: 'Representação de Números em Computadores',
              description: 'Sistemas de numeração, ponto flutuante e limitações computacionais',
              // keywords: ['ponto flutuante', 'IEEE 754', 'precisão'],
              order: 2,
              learningObjectives: ['Entender representação binária', 'Compreender limitações de precisão'],
              keyTerms: ['mantissa', 'expoente', 'underflow', 'overflow'],
              searchKeywords: ['floating point', 'representação numérica']
            },
            {
              title: 'Ferramentas Computacionais',
              description: 'Python/NumPy, MATLAB, Octave e outras ferramentas para cálculo numérico',
              // keywords: ['Python', 'MATLAB', 'NumPy', 'Octave'],
              order: 3,
              learningObjectives: ['Configurar ambiente de desenvolvimento', 'Usar bibliotecas numéricas'],
              keyTerms: ['NumPy', 'SciPy', 'matplotlib'],
              searchKeywords: ['python numerical computing', 'matlab numerical methods']
            }
          ]
        },
        {
          title: 'Teoria dos Erros',
          order: 2,
          topics: [
            {
              title: 'Tipos de Erros',
              description: 'Erro absoluto, relativo, truncamento e arredondamento',
              // keywords: ['erro absoluto', 'erro relativo', 'truncamento', 'arredondamento'],
              order: 1,
              learningObjectives: ['Classificar tipos de erros', 'Calcular erros absolutos e relativos'],
              keyTerms: ['erro absoluto', 'erro relativo', 'erro percentual'],
              searchKeywords: ['numerical errors', 'tipos de erro cálculo numérico']
            },
            {
              title: 'Propagação de Erros',
              description: 'Como erros se propagam em operações aritméticas sucessivas',
              // keywords: ['propagação', 'acumulação', 'estabilidade'],
              order: 2,
              learningObjectives: ['Analisar propagação de erros', 'Identificar operações instáveis'],
              keyTerms: ['condicionamento', 'estabilidade numérica'],
              searchKeywords: ['error propagation', 'numerical stability']
            },
            {
              title: 'Análise de Algoritmos Numéricos',
              description: 'Estabilidade, convergência e complexidade computacional',
              // keywords: ['convergência', 'estabilidade', 'complexidade'],
              order: 3,
              learningObjectives: ['Avaliar estabilidade de algoritmos', 'Analisar taxa de convergência'],
              keyTerms: ['ordem de convergência', 'critério de parada'],
              searchKeywords: ['algorithm stability', 'convergence analysis']
            }
          ]
        }
      ]
    },
    {
      title: 'Zeros de Funções',
      description: 'Métodos para encontrar raízes de equações não-lineares',
      order: 2,
      estimatedDuration: '3 semanas',
      sections: [
        {
          title: 'Métodos de Intervalo',
          order: 1,
          topics: [
            {
              title: 'Método da Bisseção',
              description: 'Método robusto baseado no teorema do valor intermediário',
              // keywords: ['bisseção', 'intervalo', 'convergência linear'],
              order: 1,
              learningObjectives: ['Implementar método da bisseção', 'Analisar convergência'],
              keyTerms: ['teorema de Bolzano', 'convergência linear'],
              searchKeywords: ['bisection method', 'método da bisseção python']
            },
            {
              title: 'Método da Falsa Posição',
              description: 'Refinamento da bisseção usando interpolação linear',
              // keywords: ['falsa posição', 'regula falsi', 'secante'],
              order: 2,
              learningObjectives: ['Implementar falsa posição', 'Comparar com bisseção'],
              keyTerms: ['interpolação linear', 'convergência superlinear'],
              searchKeywords: ['false position method', 'regula falsi']
            }
          ]
        },
        {
          title: 'Métodos Abertos',
          order: 2,
          topics: [
            {
              title: 'Método de Newton-Raphson',
              description: 'Método de convergência quadrática usando derivadas',
              // keywords: ['Newton', 'Raphson', 'convergência quadrática'],
              order: 1,
              learningObjectives: ['Implementar Newton-Raphson', 'Analisar condições de convergência'],
              keyTerms: ['derivada', 'tangente', 'convergência quadrática'],
              searchKeywords: ['Newton Raphson method', 'newton method python']
            },
            {
              title: 'Método da Secante',
              description: 'Aproximação do método de Newton sem calcular derivadas',
              // keywords: ['secante', 'diferenças finitas'],
              order: 2,
              learningObjectives: ['Implementar método da secante', 'Comparar com Newton'],
              keyTerms: ['diferença dividida', 'convergência superlinear'],
              searchKeywords: ['secant method', 'método secante']
            },
            {
              title: 'Método do Ponto Fixo',
              description: 'Reformulação iterativa de equações',
              // keywords: ['ponto fixo', 'iteração', 'contração'],
              order: 3,
              learningObjectives: ['Formular problemas de ponto fixo', 'Analisar convergência'],
              keyTerms: ['função de iteração', 'teorema do ponto fixo'],
              searchKeywords: ['fixed point iteration', 'ponto fixo']
            }
          ]
        },
        {
          title: 'Aplicações e Comparações',
          order: 3,
          topics: [
            {
              title: 'Sistemas de Equações Não-Lineares',
              description: 'Extensão dos métodos para sistemas multidimensionais',
              // keywords: ['sistemas', 'Newton multidimensional', 'Jacobiano'],
              order: 1,
              learningObjectives: ['Resolver sistemas não-lineares', 'Calcular matriz Jacobiana'],
              keyTerms: ['matriz Jacobiana', 'método de Newton-Raphson generalizado'],
              searchKeywords: ['nonlinear systems', 'multidimensional Newton']
            },
            {
              title: 'Comparação de Métodos',
              description: 'Análise comparativa de eficiência e robustez',
              // keywords: ['comparação', 'eficiência', 'robustez'],
              order: 2,
              learningObjectives: ['Escolher método apropriado', 'Avaliar trade-offs'],
              keyTerms: ['taxa de convergência', 'custo computacional'],
              searchKeywords: ['methods comparison', 'convergence rates']
            }
          ]
        }
      ]
    },
    {
      title: 'Interpolação e Aproximação',
      description: 'Técnicas para aproximar funções e dados discretos',
      order: 3,
      estimatedDuration: '3 semanas',
      sections: [
        {
          title: 'Interpolação Polinomial',
          order: 1,
          topics: [
            {
              title: 'Interpolação Linear e Sistemas Lineares',
              description: 'Fundamentos da interpolação e solução via sistemas lineares',
              // keywords: ['interpolação linear', 'Vandermonde'],
              order: 1,
              learningObjectives: ['Construir polinômio interpolador', 'Resolver sistema de Vandermonde'],
              keyTerms: ['matriz de Vandermonde', 'unicidade do polinômio'],
              searchKeywords: ['linear interpolation', 'Vandermonde matrix']
            },
            {
              title: 'Forma de Lagrange',
              description: 'Interpolação usando polinômios de Lagrange',
              // keywords: ['Lagrange', 'polinômio interpolador'],
              order: 2,
              learningObjectives: ['Implementar forma de Lagrange', 'Calcular polinômios base'],
              keyTerms: ['polinômios de Lagrange', 'função base'],
              searchKeywords: ['Lagrange interpolation', 'Lagrange polynomial']
            },
            {
              title: 'Forma de Newton',
              description: 'Interpolação usando diferenças divididas',
              // keywords: ['Newton', 'diferenças divididas'],
              order: 3,
              learningObjectives: ['Calcular diferenças divididas', 'Implementar forma de Newton'],
              keyTerms: ['diferenças divididas', 'tabela de diferenças'],
              searchKeywords: ['Newton interpolation', 'divided differences']
            },
            {
              title: 'Erro de Interpolação',
              description: 'Análise e estimativa do erro de interpolação',
              // keywords: ['erro', 'fenômeno de Runge'],
              order: 4,
              learningObjectives: ['Estimar erro de interpolação', 'Compreender fenômeno de Runge'],
              keyTerms: ['erro de truncamento', 'fenômeno de Runge'],
              searchKeywords: ['interpolation error', 'Runge phenomenon']
            }
          ]
        },
        {
          title: 'Interpolação por Partes',
          order: 2,
          topics: [
            {
              title: 'Splines Lineares',
              description: 'Interpolação por segmentos lineares',
              // keywords: ['spline linear', 'interpolação segmentada'],
              order: 1,
              learningObjectives: ['Construir splines lineares', 'Garantir continuidade'],
              keyTerms: ['continuidade', 'nós'],
              searchKeywords: ['linear splines', 'piecewise linear']
            },
            {
              title: 'Splines Cúbicos',
              description: 'Interpolação suave com polinômios de grau 3',
              // keywords: ['spline cúbico', 'continuidade C2'],
              order: 2,
              learningObjectives: ['Construir splines cúbicos', 'Resolver sistema tridiagonal'],
              keyTerms: ['spline natural', 'spline fixado', 'matriz tridiagonal'],
              searchKeywords: ['cubic splines', 'spline interpolation']
            }
          ]
        },
        {
          title: 'Ajuste de Curvas',
          order: 3,
          topics: [
            {
              title: 'Método dos Mínimos Quadrados',
              description: 'Ajuste ótimo quando há mais dados que parâmetros',
              // keywords: ['mínimos quadrados', 'regressão'],
              order: 1,
              learningObjectives: ['Formular problema de mínimos quadrados', 'Resolver equações normais'],
              keyTerms: ['equações normais', 'resíduo'],
              searchKeywords: ['least squares', 'curve fitting']
            },
            {
              title: 'Regressão Linear e Polinomial',
              description: 'Aplicações específicas de mínimos quadrados',
              // keywords: ['regressão', 'correlação', 'R²'],
              order: 2,
              learningObjectives: ['Implementar regressão linear', 'Avaliar qualidade do ajuste'],
              keyTerms: ['coeficiente de determinação', 'correlação'],
              searchKeywords: ['linear regression', 'polynomial regression']
            }
          ]
        }
      ]
    },
    {
      title: 'Integração Numérica',
      description: 'Métodos para calcular integrais definidas numericamente',
      order: 4,
      estimatedDuration: '2 semanas',
      sections: [
        {
          title: 'Fórmulas de Newton-Cotes',
          order: 1,
          topics: [
            {
              title: 'Regra do Trapézio',
              description: 'Aproximação por segmentos lineares',
              // keywords: ['trapézio', 'integração', 'Newton-Cotes'],
              order: 1,
              learningObjectives: ['Implementar regra do trapézio', 'Analisar erro'],
              keyTerms: ['trapézio', 'erro de truncamento'],
              searchKeywords: ['trapezoidal rule', 'numerical integration']
            },
            {
              title: 'Regra de Simpson 1/3',
              description: 'Aproximação usando parábolas',
              // keywords: ['Simpson', 'parábola', 'ordem 4'],
              order: 2,
              learningObjectives: ['Implementar Simpson 1/3', 'Comparar precisão'],
              keyTerms: ['Simpson 1/3', 'ordem de precisão'],
              searchKeywords: ['Simpson rule', 'Simpson 1/3']
            },
            {
              title: 'Regra de Simpson 3/8',
              description: 'Aproximação usando polinômios de grau 3',
              // keywords: ['Simpson 3/8', 'cúbica'],
              order: 3,
              learningObjectives: ['Implementar Simpson 3/8', 'Escolher método apropriado'],
              keyTerms: ['Simpson 3/8', 'polinômio cúbico'],
              searchKeywords: ['Simpson 3/8 rule', 'cubic approximation']
            },
            {
              title: 'Integração Composta',
              description: 'Subdivisão do intervalo para maior precisão',
              // keywords: ['composta', 'subdivisão', 'precisão'],
              order: 4,
              learningObjectives: ['Implementar regras compostas', 'Estimar número de subdivisões'],
              keyTerms: ['trapézio composto', 'Simpson composto'],
              searchKeywords: ['composite integration', 'composite Simpson']
            }
          ]
        },
        {
          title: 'Quadratura Gaussiana',
          order: 2,
          topics: [
            {
              title: 'Quadratura de Gauss-Legendre',
              description: 'Integração ótima usando pontos e pesos de Gauss',
              // keywords: ['Gauss', 'Legendre', 'quadratura'],
              order: 1,
              learningObjectives: ['Compreender quadratura Gaussiana', 'Usar tabelas de pontos e pesos'],
              keyTerms: ['pontos de Gauss', 'pesos', 'polinômios de Legendre'],
              searchKeywords: ['Gaussian quadrature', 'Gauss-Legendre']
            },
            {
              title: 'Integração Adaptativa',
              description: 'Ajuste automático da precisão',
              // keywords: ['adaptativa', 'erro estimado', 'recursão'],
              order: 2,
              learningObjectives: ['Implementar integração adaptativa', 'Controlar erro'],
              keyTerms: ['subdivisão adaptativa', 'estimativa de erro'],
              searchKeywords: ['adaptive integration', 'adaptive quadrature']
            }
          ]
        }
      ]
    },
    {
      title: 'Derivação Numérica',
      description: 'Aproximação de derivadas usando diferenças finitas',
      order: 5,
      estimatedDuration: '1 semana',
      sections: [
        {
          title: 'Diferenças Finitas',
          order: 1,
          topics: [
            {
              title: 'Diferenças Progressivas e Regressivas',
              description: 'Aproximações de primeira ordem para derivadas',
              // keywords: ['diferença progressiva', 'diferença regressiva'],
              order: 1,
              learningObjectives: ['Calcular derivadas numéricas', 'Analisar erro de truncamento'],
              keyTerms: ['diferença finita', 'ordem do erro'],
              searchKeywords: ['finite differences', 'forward difference']
            },
            {
              title: 'Diferenças Centrais',
              description: 'Aproximações de segunda ordem',
              // keywords: ['diferença central', 'segunda ordem'],
              order: 2,
              learningObjectives: ['Implementar diferenças centrais', 'Comparar precisão'],
              keyTerms: ['diferença central', 'erro O(h²)'],
              searchKeywords: ['central difference', 'centered difference']
            },
            {
              title: 'Derivadas de Ordem Superior',
              description: 'Aproximação de segundas derivadas e além',
              // keywords: ['segunda derivada', 'derivada parcial'],
              order: 3,
              learningObjectives: ['Calcular derivadas superiores', 'Aplicar em EDPs'],
              keyTerms: ['operador de diferenças', 'estêncil'],
              searchKeywords: ['higher order derivatives', 'second derivative']
            },
            {
              title: 'Extrapolação de Richardson',
              description: 'Melhoramento da precisão através de extrapolação',
              // keywords: ['Richardson', 'extrapolação', 'precisão'],
              order: 4,
              learningObjectives: ['Aplicar extrapolação de Richardson', 'Aumentar ordem de precisão'],
              keyTerms: ['extrapolação', 'ordem de convergência'],
              searchKeywords: ['Richardson extrapolation', 'accuracy improvement']
            }
          ]
        }
      ]
    },
    {
      title: 'Sistemas de Equações Lineares',
      description: 'Métodos diretos e iterativos para resolver sistemas lineares',
      order: 6,
      estimatedDuration: '3 semanas',
      sections: [
        {
          title: 'Métodos Diretos',
          order: 1,
          topics: [
            {
              title: 'Eliminação de Gauss',
              description: 'Método fundamental para resolver sistemas lineares',
              // keywords: ['Gauss', 'eliminação', 'pivoteamento'],
              order: 1,
              learningObjectives: ['Implementar eliminação de Gauss', 'Aplicar pivoteamento'],
              keyTerms: ['pivô', 'matriz aumentada', 'substituição retroativa'],
              searchKeywords: ['Gaussian elimination', 'Gauss method']
            },
            {
              title: 'Decomposição LU',
              description: 'Fatoração em matrizes triangulares',
              // keywords: ['LU', 'fatoração', 'triangular'],
              order: 2,
              learningObjectives: ['Realizar decomposição LU', 'Resolver múltiplos sistemas'],
              keyTerms: ['matriz L', 'matriz U', 'permutação'],
              searchKeywords: ['LU decomposition', 'LU factorization']
            },
            {
              title: 'Decomposição de Cholesky',
              description: 'Fatoração para matrizes simétricas positivas definidas',
              // keywords: ['Cholesky', 'simétrica', 'positiva definida'],
              order: 3,
              learningObjectives: ['Aplicar Cholesky', 'Verificar condições'],
              keyTerms: ['matriz simétrica', 'positiva definida'],
              searchKeywords: ['Cholesky decomposition', 'Cholesky factorization']
            },
            {
              title: 'Análise de Condicionamento',
              description: 'Número de condição e sensibilidade a erros',
              // keywords: ['condicionamento', 'número de condição', 'mal condicionado'],
              order: 4,
              learningObjectives: ['Calcular número de condição', 'Identificar sistemas mal condicionados'],
              keyTerms: ['norma matricial', 'número de condição'],
              searchKeywords: ['condition number', 'matrix conditioning']
            }
          ]
        },
        {
          title: 'Métodos Iterativos',
          order: 2,
          topics: [
            {
              title: 'Método de Jacobi',
              description: 'Método iterativo simples com atualização simultânea',
              // keywords: ['Jacobi', 'iteração', 'convergência'],
              order: 1,
              learningObjectives: ['Implementar método de Jacobi', 'Analisar convergência'],
              keyTerms: ['diagonal dominante', 'critério de convergência'],
              searchKeywords: ['Jacobi method', 'Jacobi iteration']
            },
            {
              title: 'Método de Gauss-Seidel',
              description: 'Melhoria do Jacobi com atualização sequencial',
              // keywords: ['Gauss-Seidel', 'convergência mais rápida'],
              order: 2,
              learningObjectives: ['Implementar Gauss-Seidel', 'Comparar com Jacobi'],
              keyTerms: ['atualização in-place', 'taxa de convergência'],
              searchKeywords: ['Gauss Seidel method', 'iterative methods']
            },
            {
              title: 'Métodos de Sobre-Relaxação',
              description: 'SOR e técnicas de aceleração',
              // keywords: ['SOR', 'sobre-relaxação', 'omega'],
              order: 3,
              learningObjectives: ['Implementar SOR', 'Escolher parâmetro ótimo'],
              keyTerms: ['fator de relaxação', 'convergência acelerada'],
              searchKeywords: ['SOR method', 'successive over-relaxation']
            },
            {
              title: 'Métodos de Gradiente',
              description: 'Gradiente conjugado e métodos modernos',
              // keywords: ['gradiente conjugado', 'Krylov'],
              order: 4,
              learningObjectives: ['Compreender gradiente conjugado', 'Aplicar em sistemas grandes'],
              keyTerms: ['espaço de Krylov', 'minimização'],
              searchKeywords: ['conjugate gradient', 'gradient methods']
            }
          ]
        }
      ]
    },
    {
      title: 'Equações Diferenciais Ordinárias',
      description: 'Métodos numéricos para resolver EDOs',
      order: 7,
      estimatedDuration: '2 semanas',
      sections: [
        {
          title: 'Problemas de Valor Inicial',
          order: 1,
          topics: [
            {
              title: 'Método de Euler',
              description: 'Método básico de primeira ordem',
              // keywords: ['Euler', 'primeira ordem', 'PVI'],
              order: 1,
              learningObjectives: ['Implementar método de Euler', 'Analisar erro local e global'],
              keyTerms: ['passo', 'erro de truncamento'],
              searchKeywords: ['Euler method', 'initial value problem']
            },
            {
              title: 'Método de Euler Melhorado',
              description: 'Heun e ponto médio',
              // keywords: ['Heun', 'ponto médio', 'segunda ordem'],
              order: 2,
              learningObjectives: ['Implementar Euler melhorado', 'Comparar precisão'],
              keyTerms: ['preditor-corretor', 'método de Heun'],
              searchKeywords: ['improved Euler', 'Heun method']
            },
            {
              title: 'Métodos de Runge-Kutta',
              description: 'RK2, RK4 e variantes',
              // keywords: ['Runge-Kutta', 'RK4', 'quarta ordem'],
              order: 3,
              learningObjectives: ['Implementar RK4', 'Compreender ordem de precisão'],
              keyTerms: ['coeficientes de Butcher', 'estágios'],
              searchKeywords: ['Runge Kutta', 'RK4 method']
            },
            {
              title: 'Controle de Passo Adaptativo',
              description: 'Ajuste automático do tamanho do passo',
              // keywords: ['adaptativo', 'controle de erro', 'RK45'],
              order: 4,
              learningObjectives: ['Implementar controle adaptativo', 'Otimizar eficiência'],
              keyTerms: ['Runge-Kutta-Fehlberg', 'tolerância'],
              searchKeywords: ['adaptive step size', 'RK45']
            }
          ]
        },
        {
          title: 'Sistemas de EDOs e Estabilidade',
          order: 2,
          topics: [
            {
              title: 'Sistemas de EDOs',
              description: 'Extensão dos métodos para sistemas',
              // keywords: ['sistemas', 'vetor de estado', 'múltiplas equações'],
              order: 1,
              learningObjectives: ['Resolver sistemas de EDOs', 'Implementar métodos vetoriais'],
              keyTerms: ['forma matricial', 'acoplamento'],
              searchKeywords: ['ODE systems', 'coupled equations']
            },
            {
              title: 'Análise de Estabilidade',
              description: 'Estabilidade numérica e stiff equations',
              // keywords: ['estabilidade', 'stiff', 'implícito'],
              order: 2,
              learningObjectives: ['Analisar estabilidade', 'Identificar problemas stiff'],
              keyTerms: ['região de estabilidade', 'métodos implícitos'],
              searchKeywords: ['numerical stability ODE', 'stiff equations']
            }
          ]
        }
      ]
    },
    {
      title: 'Laboratório Computacional',
      description: 'Implementação prática em Python/MATLAB',
      order: 8,
      estimatedDuration: '2 semanas',
      sections: [
        {
          title: 'Implementações em Python',
          order: 1,
          topics: [
            {
              title: 'Ambiente Python para Cálculo Numérico',
              description: 'Setup com NumPy, SciPy, Matplotlib',
              // keywords: ['Python', 'NumPy', 'SciPy', 'Jupyter'],
              order: 1,
              learningObjectives: ['Configurar ambiente Python', 'Usar bibliotecas numéricas'],
              keyTerms: ['Anaconda', 'pip', 'virtual environment'],
              searchKeywords: ['Python numerical setup', 'NumPy SciPy tutorial']
            },
            {
              title: 'Biblioteca de Métodos Numéricos',
              description: 'Criação de módulo próprio com todos os métodos',
              // keywords: ['biblioteca', 'módulo', 'reutilização'],
              order: 2,
              learningObjectives: ['Criar biblioteca própria', 'Organizar código'],
              keyTerms: ['módulo Python', 'documentação', 'testes'],
              searchKeywords: ['Python numerical library', 'custom module']
            },
            {
              title: 'Visualização de Resultados',
              description: 'Gráficos e animações com Matplotlib',
              // keywords: ['visualização', 'gráficos', 'matplotlib'],
              order: 3,
              learningObjectives: ['Criar visualizações efetivas', 'Animar convergência'],
              keyTerms: ['pyplot', 'subplots', 'animação'],
              searchKeywords: ['matplotlib numerical', 'visualization Python']
            }
          ]
        },
        {
          title: 'Projetos Aplicados',
          order: 2,
          topics: [
            {
              title: 'Projeto 1: Análise de Circuitos',
              description: 'Aplicação em engenharia elétrica',
              // keywords: ['circuito', 'kirchhoff', 'sistemas lineares'],
              order: 1,
              learningObjectives: ['Modelar circuito', 'Resolver sistema'],
              keyTerms: ['lei de Kirchhoff', 'análise nodal'],
              searchKeywords: ['circuit analysis numerical', 'Kirchhoff numerical']
            },
            {
              title: 'Projeto 2: Dinâmica de Populações',
              description: 'Modelo predador-presa com EDOs',
              // keywords: ['Lotka-Volterra', 'população', 'EDO'],
              order: 2,
              learningObjectives: ['Modelar sistema biológico', 'Analisar comportamento'],
              keyTerms: ['modelo predador-presa', 'equilíbrio'],
              searchKeywords: ['population dynamics', 'Lotka Volterra numerical']
            },
            {
              title: 'Projeto 3: Otimização de Processos',
              description: 'Aplicação em engenharia química',
              // keywords: ['otimização', 'processo', 'industrial'],
              order: 3,
              learningObjectives: ['Formular problema de otimização', 'Encontrar solução ótima'],
              keyTerms: ['função objetivo', 'restrições'],
              searchKeywords: ['process optimization', 'chemical engineering numerical']
            }
          ]
        }
      ]
    },
    {
      title: 'Exercícios e Preparação para Provas',
      description: 'Prática intensiva e revisão para avaliações',
      order: 9,
      estimatedDuration: '2 semanas',
      sections: [
        {
          title: 'Listas de Exercícios',
          order: 1,
          topics: [
            {
              title: 'Lista 1: Erros e Zeros de Funções',
              description: 'Exercícios fundamentais dos primeiros módulos',
              // keywords: ['exercícios', 'erros', 'raízes'],
              order: 1,
              learningObjectives: ['Resolver problemas básicos', 'Aplicar métodos'],
              keyTerms: ['resolução passo a passo'],
              searchKeywords: ['numerical methods exercises', 'practice problems']
            },
            {
              title: 'Lista 2: Interpolação e Integração',
              description: 'Problemas de interpolação e quadratura',
              // keywords: ['exercícios', 'interpolação', 'integração'],
              order: 2,
              learningObjectives: ['Escolher método apropriado', 'Estimar erros'],
              keyTerms: ['escolha de método', 'análise de erro'],
              searchKeywords: ['interpolation exercises', 'integration problems']
            },
            {
              title: 'Lista 3: Sistemas e EDOs',
              description: 'Problemas avançados',
              // keywords: ['exercícios', 'sistemas', 'EDO'],
              order: 3,
              learningObjectives: ['Resolver sistemas complexos', 'Implementar soluções'],
              keyTerms: ['problemas aplicados', 'modelagem'],
              searchKeywords: ['linear systems exercises', 'ODE problems']
            }
          ]
        },
        {
          title: 'Simulados e Provas Anteriores',
          order: 2,
          topics: [
            {
              title: 'Provas Resolvidas',
              description: 'Análise de provas de semestres anteriores',
              // keywords: ['provas', 'resoluções', 'gabarito'],
              order: 1,
              learningObjectives: ['Conhecer formato de prova', 'Praticar tempo'],
              keyTerms: ['questões típicas', 'estratégia de resolução'],
              searchKeywords: ['numerical calculus exams', 'solved tests']
            },
            {
              title: 'Simulado Completo',
              description: 'Prova simulada com tempo cronometrado',
              // keywords: ['simulado', 'prova', 'avaliação'],
              order: 2,
              learningObjectives: ['Testar conhecimento', 'Gerenciar tempo'],
              keyTerms: ['simulação de prova', 'autoavaliação'],
              searchKeywords: ['practice exam', 'mock test']
            },
            {
              title: 'Revisão de Conceitos-Chave',
              description: 'Resumo dos pontos mais importantes',
              // keywords: ['revisão', 'resumo', 'conceitos'],
              order: 3,
              learningObjectives: ['Revisar conteúdo essencial', 'Memorizar fórmulas'],
              keyTerms: ['fórmulas importantes', 'checklist'],
              searchKeywords: ['numerical methods review', 'key concepts']
            }
          ]
        }
      ]
    }
  ],
  bibliography: {
    main: [
      'BURDEN, R. L.; FAIRES, J. D. Análise Numérica. 8ª ed. Cengage Learning, 2008.',
      'RUGGIERO, M. A. G.; LOPES, V. L. R. Cálculo Numérico: Aspectos Teóricos e Computacionais. 2ª ed. Makron Books, 1996.',
      'FRANCO, N. B. Cálculo Numérico. Pearson Prentice Hall, 2006.'
    ],
    complementary: [
      'CHAPRA, S. C.; CANALE, R. P. Métodos Numéricos para Engenharia. 5ª ed. McGraw-Hill, 2008.',
      'PRESS, W. H. et al. Numerical Recipes: The Art of Scientific Computing. 3ª ed. Cambridge University Press, 2007.',
      'QUARTERONI, A.; SACCO, R.; SALERI, F. Numerical Mathematics. 2ª ed. Springer, 2007.'
    ]
  },
  evaluationMethods: [
    'Provas teóricas (P1 e P2)',
    'Trabalhos computacionais',
    'Listas de exercícios',
    'Projeto final'
  ],
  practicalTools: [
    'Python com NumPy/SciPy',
    'MATLAB/Octave',
    'Jupyter Notebooks',
    'Git para versionamento de código'
  ]
};

/**
 * Obtém template por ID da disciplina
 */
export function getAcademicTemplate(disciplineId: string): AcademicCurriculumTemplate | null {
  const templates: { [key: string]: AcademicCurriculumTemplate } = {
    'numerical_calculus': CALCULO_NUMERICO_TEMPLATE,
    // Adicionar mais templates aqui conforme necessário
  };

  return templates[disciplineId] || null;
}

/**
 * Adapta template para objetivo específico do usuário
 */
export function adaptTemplateForUserGoal(
  template: AcademicCurriculumTemplate,
  userContext?: {
    mentionsExam: boolean;
    mentionsHomework: boolean;
    mentionsProject: boolean;
  }
): AcademicCurriculumTemplate {
  const adapted = { ...template };

  // Se menciona prova, dar mais ênfase em exercícios
  if (userContext?.mentionsExam) {
    // Garantir que módulo de exercícios está presente e expandido
    const exercisesModule = adapted.modules.find(m =>
      m.title.toLowerCase().includes('exercício') ||
      m.title.toLowerCase().includes('prova')
    );

    if (exercisesModule) {
      // Mover para posição mais prominente
      const index = adapted.modules.indexOf(exercisesModule);
      adapted.modules.splice(index, 1);
      adapted.modules.splice(adapted.modules.length - 2, 0, exercisesModule);
    }
  }

  // Se menciona trabalho/projeto, enfatizar parte prática
  if (userContext?.mentionsHomework || userContext?.mentionsProject) {
    const labModule = adapted.modules.find(m =>
      m.title.toLowerCase().includes('laboratório') ||
      m.title.toLowerCase().includes('projeto')
    );

    if (labModule) {
      labModule.estimatedDuration = '3 semanas'; // Mais tempo para projetos
    }
  }

  return adapted;
}