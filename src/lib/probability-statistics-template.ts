/**
 * Template Completo para Probabilidade e Estatística
 * Estrutura acadêmica detalhada com 10 módulos e 70+ tópicos
 */

import { AcademicCurriculumTemplate } from './academic-curriculum-templates';

export const PROBABILIDADE_ESTATISTICA_TEMPLATE: AcademicCurriculumTemplate = {
  disciplineId: 'probability_statistics',
  courseName: 'Probabilidade e Estatística',
  description: 'Curso completo de Probabilidade e Estatística cobrindo desde conceitos fundamentais até métodos avançados de inferência estatística, incluindo aplicações computacionais em R e Python.',
  totalHours: 80,
  modules: [
    {
      title: 'Introdução e Estatística Descritiva',
      description: 'Fundamentos da estatística e técnicas para descrever e visualizar dados',
      order: 1,
      estimatedDuration: '2 semanas',
      sections: [
        {
          title: 'Conceitos Fundamentais',
          order: 1,
          topics: [
            {
              title: 'O que é Estatística',
              description: 'Definição, importância e aplicações da estatística',
              order: 1,
              learningObjectives: ['Compreender o papel da estatística', 'Diferenciar estatística descritiva de inferencial'],
              keyTerms: ['população', 'amostra', 'parâmetro', 'estatística'],
              searchKeywords: ['introdução estatística', 'statistics introduction']
            },
            {
              title: 'Tipos de Dados e Variáveis',
              description: 'Classificação de dados: qualitativos e quantitativos, discretos e contínuos',
              order: 2,
              learningObjectives: ['Classificar tipos de variáveis', 'Escolher análise apropriada'],
              keyTerms: ['variável qualitativa', 'variável quantitativa', 'escala nominal', 'escala ordinal'],
              searchKeywords: ['tipos de dados estatística', 'data types statistics']
            },
            {
              title: 'Coleta e Amostragem',
              description: 'Técnicas de amostragem e planejamento de coleta de dados',
              order: 3,
              learningObjectives: ['Aplicar técnicas de amostragem', 'Evitar viés de seleção'],
              keyTerms: ['amostragem aleatória', 'amostragem estratificada', 'viés', 'erro amostral'],
              searchKeywords: ['sampling techniques', 'amostragem estatística']
            }
          ]
        },
        {
          title: 'Medidas de Posição',
          order: 2,
          topics: [
            {
              title: 'Média, Mediana e Moda',
              description: 'Medidas de tendência central e suas aplicações',
              order: 1,
              learningObjectives: ['Calcular medidas de tendência central', 'Escolher medida apropriada'],
              keyTerms: ['média aritmética', 'mediana', 'moda', 'média ponderada'],
              searchKeywords: ['medidas tendência central', 'mean median mode']
            },
            {
              title: 'Quartis e Percentis',
              description: 'Medidas de posição relativa e box plots',
              order: 2,
              learningObjectives: ['Calcular quartis e percentis', 'Construir e interpretar box plots'],
              keyTerms: ['quartil', 'percentil', 'decil', 'box plot', 'outliers'],
              searchKeywords: ['quartiles percentiles', 'box plot statistics']
            }
          ]
        },
        {
          title: 'Medidas de Dispersão',
          order: 3,
          topics: [
            {
              title: 'Variância e Desvio Padrão',
              description: 'Medidas de variabilidade dos dados',
              order: 1,
              learningObjectives: ['Calcular variância e desvio padrão', 'Interpretar dispersão'],
              keyTerms: ['variância', 'desvio padrão', 'amplitude', 'coeficiente de variação'],
              searchKeywords: ['variance standard deviation', 'medidas dispersão']
            },
            {
              title: 'Assimetria e Curtose',
              description: 'Forma da distribuição dos dados',
              order: 2,
              learningObjectives: ['Analisar forma da distribuição', 'Identificar assimetria'],
              keyTerms: ['assimetria', 'curtose', 'distribuição simétrica', 'cauda pesada'],
              searchKeywords: ['skewness kurtosis', 'shape distribution']
            }
          ]
        },
        {
          title: 'Visualização de Dados',
          order: 4,
          topics: [
            {
              title: 'Gráficos Estatísticos',
              description: 'Histogramas, gráficos de barras, dispersão e outros',
              order: 1,
              learningObjectives: ['Criar visualizações apropriadas', 'Interpretar gráficos'],
              keyTerms: ['histograma', 'gráfico de barras', 'gráfico de pizza', 'scatter plot'],
              searchKeywords: ['statistical graphs', 'data visualization']
            },
            {
              title: 'Tabelas de Frequência',
              description: 'Construção e interpretação de tabelas',
              order: 2,
              learningObjectives: ['Construir tabelas de frequência', 'Calcular frequências relativas'],
              keyTerms: ['frequência absoluta', 'frequência relativa', 'frequência acumulada'],
              searchKeywords: ['frequency tables', 'tabelas frequência']
            }
          ]
        }
      ]
    },
    {
      title: 'Teoria da Probabilidade',
      description: 'Fundamentos matemáticos da probabilidade',
      order: 2,
      estimatedDuration: '3 semanas',
      sections: [
        {
          title: 'Conceitos Básicos',
          order: 1,
          topics: [
            {
              title: 'Experimentos Aleatórios e Espaço Amostral',
              description: 'Fundamentos da teoria de probabilidade',
              order: 1,
              learningObjectives: ['Identificar experimentos aleatórios', 'Determinar espaço amostral'],
              keyTerms: ['experimento aleatório', 'espaço amostral', 'evento', 'evento complementar'],
              searchKeywords: ['sample space', 'random experiment']
            },
            {
              title: 'Definições de Probabilidade',
              description: 'Clássica, frequentista e axiomática',
              order: 2,
              learningObjectives: ['Aplicar diferentes definições', 'Calcular probabilidades'],
              keyTerms: ['probabilidade clássica', 'frequência relativa', 'axiomas de Kolmogorov'],
              searchKeywords: ['probability definitions', 'axioms probability']
            },
            {
              title: 'Técnicas de Contagem',
              description: 'Princípio fundamental, permutações e combinações',
              order: 3,
              learningObjectives: ['Aplicar técnicas de contagem', 'Resolver problemas combinatórios'],
              keyTerms: ['permutação', 'combinação', 'arranjo', 'princípio multiplicativo'],
              searchKeywords: ['counting techniques', 'permutations combinations']
            }
          ]
        },
        {
          title: 'Probabilidade Condicional',
          order: 2,
          topics: [
            {
              title: 'Probabilidade Condicional e Independência',
              description: 'Eventos condicionais e independentes',
              order: 1,
              learningObjectives: ['Calcular probabilidades condicionais', 'Verificar independência'],
              keyTerms: ['probabilidade condicional', 'eventos independentes', 'regra do produto'],
              searchKeywords: ['conditional probability', 'independent events']
            },
            {
              title: 'Teorema de Bayes',
              description: 'Aplicações do teorema de Bayes',
              order: 2,
              learningObjectives: ['Aplicar teorema de Bayes', 'Resolver problemas de diagnóstico'],
              keyTerms: ['teorema de Bayes', 'probabilidade a priori', 'probabilidade a posteriori'],
              searchKeywords: ['Bayes theorem', 'bayesian probability']
            },
            {
              title: 'Lei da Probabilidade Total',
              description: 'Partição do espaço amostral',
              order: 3,
              learningObjectives: ['Aplicar lei da probabilidade total', 'Usar árvores de decisão'],
              keyTerms: ['partição', 'probabilidade total', 'árvore de probabilidade'],
              searchKeywords: ['total probability', 'probability tree']
            }
          ]
        }
      ]
    },
    {
      title: 'Variáveis Aleatórias',
      description: 'Conceitos e propriedades de variáveis aleatórias',
      order: 3,
      estimatedDuration: '2 semanas',
      sections: [
        {
          title: 'Variáveis Aleatórias Discretas',
          order: 1,
          topics: [
            {
              title: 'Definição e Função de Probabilidade',
              description: 'Conceito de variável aleatória discreta',
              order: 1,
              learningObjectives: ['Definir variável aleatória', 'Construir função de probabilidade'],
              keyTerms: ['variável aleatória discreta', 'função de probabilidade', 'função massa'],
              searchKeywords: ['discrete random variable', 'probability mass function']
            },
            {
              title: 'Esperança e Variância',
              description: 'Valor esperado e medidas de dispersão',
              order: 2,
              learningObjectives: ['Calcular esperança matemática', 'Calcular variância'],
              keyTerms: ['valor esperado', 'esperança', 'variância', 'momento'],
              searchKeywords: ['expected value', 'variance discrete']
            },
            {
              title: 'Função Geradora de Momentos',
              description: 'Técnica para cálculo de momentos',
              order: 3,
              learningObjectives: ['Usar função geradora', 'Calcular momentos'],
              keyTerms: ['função geradora de momentos', 'momento de ordem k'],
              searchKeywords: ['moment generating function', 'mgf']
            }
          ]
        },
        {
          title: 'Variáveis Aleatórias Contínuas',
          order: 2,
          topics: [
            {
              title: 'Função Densidade de Probabilidade',
              description: 'PDF e suas propriedades',
              order: 1,
              learningObjectives: ['Trabalhar com PDF', 'Calcular probabilidades'],
              keyTerms: ['função densidade', 'PDF', 'integral de probabilidade'],
              searchKeywords: ['probability density function', 'continuous random variable']
            },
            {
              title: 'Função de Distribuição Acumulada',
              description: 'CDF e suas aplicações',
              order: 2,
              learningObjectives: ['Calcular e usar CDF', 'Relacionar PDF e CDF'],
              keyTerms: ['função distribuição', 'CDF', 'função acumulada'],
              searchKeywords: ['cumulative distribution function', 'CDF']
            },
            {
              title: 'Transformação de Variáveis',
              description: 'Mudança de variáveis aleatórias',
              order: 3,
              learningObjectives: ['Transformar variáveis', 'Calcular distribuições derivadas'],
              keyTerms: ['transformação', 'jacobiano', 'método da transformação'],
              searchKeywords: ['variable transformation', 'change of variables']
            }
          ]
        }
      ]
    },
    {
      title: 'Distribuições de Probabilidade',
      description: 'Principais distribuições discretas e contínuas',
      order: 4,
      estimatedDuration: '3 semanas',
      sections: [
        {
          title: 'Distribuições Discretas',
          order: 1,
          topics: [
            {
              title: 'Distribuição Binomial',
              description: 'Ensaios de Bernoulli e distribuição binomial',
              order: 1,
              learningObjectives: ['Aplicar distribuição binomial', 'Calcular probabilidades'],
              keyTerms: ['Bernoulli', 'binomial', 'sucesso', 'fracasso'],
              searchKeywords: ['binomial distribution', 'bernoulli trials']
            },
            {
              title: 'Distribuição de Poisson',
              description: 'Eventos raros e processos de Poisson',
              order: 2,
              learningObjectives: ['Aplicar Poisson', 'Aproximar binomial por Poisson'],
              keyTerms: ['Poisson', 'taxa média', 'eventos raros'],
              searchKeywords: ['Poisson distribution', 'rare events']
            },
            {
              title: 'Distribuição Geométrica e Hipergeométrica',
              description: 'Outras distribuições discretas importantes',
              order: 3,
              learningObjectives: ['Usar distribuição geométrica', 'Aplicar hipergeométrica'],
              keyTerms: ['geométrica', 'hipergeométrica', 'sem reposição'],
              searchKeywords: ['geometric distribution', 'hypergeometric']
            }
          ]
        },
        {
          title: 'Distribuições Contínuas',
          order: 2,
          topics: [
            {
              title: 'Distribuição Normal',
              description: 'A distribuição mais importante da estatística',
              order: 1,
              learningObjectives: ['Usar tabela normal', 'Padronizar variáveis'],
              keyTerms: ['normal', 'Gaussiana', 'curva sino', 'Z-score'],
              searchKeywords: ['normal distribution', 'gaussian distribution']
            },
            {
              title: 'Distribuição Exponencial',
              description: 'Tempo entre eventos e confiabilidade',
              order: 2,
              learningObjectives: ['Aplicar exponencial', 'Modelar tempo de vida'],
              keyTerms: ['exponencial', 'taxa de falha', 'memoryless'],
              searchKeywords: ['exponential distribution', 'reliability']
            },
            {
              title: 'Distribuição Uniforme',
              description: 'Distribuição com probabilidade constante',
              order: 3,
              learningObjectives: ['Usar distribuição uniforme', 'Gerar números aleatórios'],
              keyTerms: ['uniforme', 'equiprovável', 'retangular'],
              searchKeywords: ['uniform distribution', 'rectangular distribution']
            },
            {
              title: 'Distribuições t, Qui-quadrado e F',
              description: 'Distribuições para inferência estatística',
              order: 4,
              learningObjectives: ['Identificar quando usar cada distribuição', 'Usar tabelas'],
              keyTerms: ['t-Student', 'qui-quadrado', 'F-Snedecor', 'graus de liberdade'],
              searchKeywords: ['t distribution', 'chi square', 'F distribution']
            }
          ]
        },
        {
          title: 'Teorema Central do Limite',
          order: 3,
          topics: [
            {
              title: 'Enunciado e Demonstração',
              description: 'O teorema fundamental da estatística',
              order: 1,
              learningObjectives: ['Compreender TCL', 'Aplicar em problemas'],
              keyTerms: ['teorema central do limite', 'convergência', 'normalidade assintótica'],
              searchKeywords: ['central limit theorem', 'CLT']
            },
            {
              title: 'Aplicações do TCL',
              description: 'Uso prático do teorema central do limite',
              order: 2,
              learningObjectives: ['Aplicar TCL', 'Aproximar distribuições'],
              keyTerms: ['aproximação normal', 'correção de continuidade'],
              searchKeywords: ['CLT applications', 'normal approximation']
            }
          ]
        }
      ]
    },
    {
      title: 'Inferência Estatística - Estimação',
      description: 'Teoria e prática de estimação de parâmetros',
      order: 5,
      estimatedDuration: '2 semanas',
      sections: [
        {
          title: 'Estimação Pontual',
          order: 1,
          topics: [
            {
              title: 'Estimadores e suas Propriedades',
              description: 'Características de bons estimadores',
              order: 1,
              learningObjectives: ['Avaliar estimadores', 'Calcular viés e variância'],
              keyTerms: ['estimador', 'viés', 'consistência', 'eficiência'],
              searchKeywords: ['point estimation', 'estimator properties']
            },
            {
              title: 'Método dos Momentos',
              description: 'Estimação por igualação de momentos',
              order: 2,
              learningObjectives: ['Aplicar método dos momentos', 'Derivar estimadores'],
              keyTerms: ['momentos amostrais', 'momentos populacionais'],
              searchKeywords: ['method of moments', 'moment estimation']
            },
            {
              title: 'Máxima Verossimilhança',
              description: 'O método mais usado de estimação',
              order: 3,
              learningObjectives: ['Aplicar MLE', 'Maximizar função de verossimilhança'],
              keyTerms: ['verossimilhança', 'MLE', 'log-verossimilhança'],
              searchKeywords: ['maximum likelihood', 'MLE']
            }
          ]
        },
        {
          title: 'Estimação por Intervalo',
          order: 2,
          topics: [
            {
              title: 'Intervalos de Confiança para Média',
              description: 'IC para média com variância conhecida e desconhecida',
              order: 1,
              learningObjectives: ['Construir IC para média', 'Interpretar intervalos'],
              keyTerms: ['intervalo de confiança', 'nível de confiança', 'margem de erro'],
              searchKeywords: ['confidence interval mean', 'IC média']
            },
            {
              title: 'Intervalos para Proporção',
              description: 'IC para proporções e diferença de proporções',
              order: 2,
              learningObjectives: ['Construir IC para proporção', 'Determinar tamanho amostral'],
              keyTerms: ['proporção', 'intervalo de Wald', 'intervalo de Wilson'],
              searchKeywords: ['proportion confidence interval', 'IC proporção']
            },
            {
              title: 'Intervalos para Variância',
              description: 'IC usando distribuição qui-quadrado',
              order: 3,
              learningObjectives: ['Construir IC para variância', 'Usar qui-quadrado'],
              keyTerms: ['intervalo para variância', 'qui-quadrado'],
              searchKeywords: ['variance confidence interval', 'chi-square CI']
            },
            {
              title: 'Determinação de Tamanho Amostral',
              description: 'Cálculo do n necessário',
              order: 4,
              learningObjectives: ['Calcular tamanho amostral', 'Considerar precisão desejada'],
              keyTerms: ['tamanho amostral', 'erro máximo', 'poder estatístico'],
              searchKeywords: ['sample size', 'sample size calculation']
            }
          ]
        }
      ]
    },
    {
      title: 'Testes de Hipóteses',
      description: 'Teoria e aplicação de testes estatísticos',
      order: 6,
      estimatedDuration: '3 semanas',
      sections: [
        {
          title: 'Fundamentos',
          order: 1,
          topics: [
            {
              title: 'Conceitos Básicos de Testes',
              description: 'Hipóteses nula e alternativa, tipos de erro',
              order: 1,
              learningObjectives: ['Formular hipóteses', 'Compreender erros tipo I e II'],
              keyTerms: ['hipótese nula', 'hipótese alternativa', 'erro tipo I', 'erro tipo II'],
              searchKeywords: ['hypothesis testing', 'null hypothesis']
            },
            {
              title: 'Nível de Significância e P-valor',
              description: 'Interpretação e uso do p-valor',
              order: 2,
              learningObjectives: ['Interpretar p-valor', 'Tomar decisões estatísticas'],
              keyTerms: ['nível de significância', 'p-valor', 'região crítica'],
              searchKeywords: ['p-value', 'significance level']
            },
            {
              title: 'Poder do Teste',
              description: 'Probabilidade de rejeitar H0 falsa',
              order: 3,
              learningObjectives: ['Calcular poder', 'Analisar curva de poder'],
              keyTerms: ['poder do teste', 'função poder', 'tamanho do efeito'],
              searchKeywords: ['statistical power', 'power analysis']
            }
          ]
        },
        {
          title: 'Testes Paramétricos',
          order: 2,
          topics: [
            {
              title: 'Teste t para Uma Amostra',
              description: 'Teste para média de uma população',
              order: 1,
              learningObjectives: ['Aplicar teste t', 'Verificar pressupostos'],
              keyTerms: ['teste t', 'one-sample t-test', 'normalidade'],
              searchKeywords: ['one sample t test', 'teste t uma amostra']
            },
            {
              title: 'Teste t para Duas Amostras',
              description: 'Comparação de médias independentes e pareadas',
              order: 2,
              learningObjectives: ['Comparar duas médias', 'Escolher teste apropriado'],
              keyTerms: ['amostras independentes', 'amostras pareadas', 'teste t pareado'],
              searchKeywords: ['two sample t test', 'paired t test']
            },
            {
              title: 'Teste para Proporções',
              description: 'Testes para uma e duas proporções',
              order: 3,
              learningObjectives: ['Testar proporções', 'Comparar proporções'],
              keyTerms: ['teste z para proporção', 'teste binomial exato'],
              searchKeywords: ['proportion test', 'z test proportion']
            },
            {
              title: 'Teste F para Variâncias',
              description: 'Comparação de variâncias',
              order: 4,
              learningObjectives: ['Comparar variâncias', 'Verificar homocedasticidade'],
              keyTerms: ['teste F', 'razão de variâncias', 'homogeneidade de variâncias'],
              searchKeywords: ['F test variance', 'variance ratio test']
            }
          ]
        },
        {
          title: 'Testes Qui-quadrado',
          order: 3,
          topics: [
            {
              title: 'Teste de Aderência',
              description: 'Goodness-of-fit test',
              order: 1,
              learningObjectives: ['Testar ajuste de distribuição', 'Verificar normalidade'],
              keyTerms: ['teste de aderência', 'goodness-of-fit', 'frequências esperadas'],
              searchKeywords: ['chi square goodness of fit', 'teste aderência']
            },
            {
              title: 'Teste de Independência',
              description: 'Associação entre variáveis categóricas',
              order: 2,
              learningObjectives: ['Testar independência', 'Analisar tabelas de contingência'],
              keyTerms: ['independência', 'tabela de contingência', 'associação'],
              searchKeywords: ['chi square independence', 'contingency table']
            },
            {
              title: 'Teste de Homogeneidade',
              description: 'Comparação de distribuições',
              order: 3,
              learningObjectives: ['Comparar distribuições', 'Testar homogeneidade'],
              keyTerms: ['homogeneidade', 'comparação de grupos'],
              searchKeywords: ['chi square homogeneity', 'homogeneity test']
            }
          ]
        }
      ]
    },
    {
      title: 'Análise de Regressão e Correlação',
      description: 'Modelagem de relações entre variáveis',
      order: 7,
      estimatedDuration: '3 semanas',
      sections: [
        {
          title: 'Correlação',
          order: 1,
          topics: [
            {
              title: 'Coeficiente de Correlação de Pearson',
              description: 'Medida de associação linear',
              order: 1,
              learningObjectives: ['Calcular correlação', 'Interpretar coeficiente'],
              keyTerms: ['correlação de Pearson', 'correlação linear', 'covariância'],
              searchKeywords: ['Pearson correlation', 'linear correlation']
            },
            {
              title: 'Correlação de Spearman e Kendall',
              description: 'Correlações não-paramétricas',
              order: 2,
              learningObjectives: ['Usar correlação de postos', 'Escolher medida apropriada'],
              keyTerms: ['Spearman', 'Kendall', 'correlação de postos'],
              searchKeywords: ['Spearman correlation', 'rank correlation']
            },
            {
              title: 'Teste de Significância da Correlação',
              description: 'Inferência sobre correlação',
              order: 3,
              learningObjectives: ['Testar significância', 'Construir IC para correlação'],
              keyTerms: ['teste de correlação', 'transformação de Fisher'],
              searchKeywords: ['correlation test', 'Fisher transformation']
            }
          ]
        },
        {
          title: 'Regressão Linear Simples',
          order: 2,
          topics: [
            {
              title: 'Modelo de Regressão Linear',
              description: 'Ajuste da reta de regressão',
              order: 1,
              learningObjectives: ['Ajustar modelo linear', 'Estimar parâmetros'],
              keyTerms: ['reta de regressão', 'mínimos quadrados', 'intercepto', 'inclinação'],
              searchKeywords: ['simple linear regression', 'least squares']
            },
            {
              title: 'Análise de Resíduos',
              description: 'Verificação de pressupostos',
              order: 2,
              learningObjectives: ['Analisar resíduos', 'Verificar pressupostos'],
              keyTerms: ['resíduos', 'homocedasticidade', 'normalidade dos resíduos'],
              searchKeywords: ['residual analysis', 'regression assumptions']
            },
            {
              title: 'Inferência em Regressão',
              description: 'Testes e intervalos para parâmetros',
              order: 3,
              learningObjectives: ['Testar significância', 'Construir intervalos de predição'],
              keyTerms: ['teste t para coeficientes', 'intervalo de confiança', 'intervalo de predição'],
              searchKeywords: ['regression inference', 'prediction interval']
            },
            {
              title: 'Coeficiente de Determinação',
              description: 'Qualidade do ajuste',
              order: 4,
              learningObjectives: ['Calcular R²', 'Interpretar qualidade do ajuste'],
              keyTerms: ['R²', 'coeficiente de determinação', 'variação explicada'],
              searchKeywords: ['R squared', 'coefficient determination']
            }
          ]
        },
        {
          title: 'Regressão Linear Múltipla',
          order: 3,
          topics: [
            {
              title: 'Modelo de Regressão Múltipla',
              description: 'Regressão com múltiplas variáveis',
              order: 1,
              learningObjectives: ['Ajustar modelo múltiplo', 'Interpretar coeficientes'],
              keyTerms: ['regressão múltipla', 'coeficientes parciais', 'multicolinearidade'],
              searchKeywords: ['multiple regression', 'multiple linear regression']
            },
            {
              title: 'Seleção de Variáveis',
              description: 'Métodos para escolher preditores',
              order: 2,
              learningObjectives: ['Aplicar seleção de variáveis', 'Usar critérios de informação'],
              keyTerms: ['stepwise', 'forward', 'backward', 'AIC', 'BIC'],
              searchKeywords: ['variable selection', 'stepwise regression']
            },
            {
              title: 'Diagnóstico e Validação',
              description: 'Verificação do modelo',
              order: 3,
              learningObjectives: ['Diagnosticar problemas', 'Validar modelo'],
              keyTerms: ['VIF', 'leverage', 'pontos influentes', 'validação cruzada'],
              searchKeywords: ['regression diagnostics', 'model validation']
            }
          ]
        }
      ]
    },
    {
      title: 'Análise de Variância (ANOVA)',
      description: 'Comparação de múltiplas médias',
      order: 8,
      estimatedDuration: '2 semanas',
      sections: [
        {
          title: 'ANOVA de Um Fator',
          order: 1,
          topics: [
            {
              title: 'Fundamentos da ANOVA',
              description: 'Princípios e pressupostos',
              order: 1,
              learningObjectives: ['Compreender lógica da ANOVA', 'Verificar pressupostos'],
              keyTerms: ['variação entre grupos', 'variação dentro dos grupos', 'F-ratio'],
              searchKeywords: ['one way ANOVA', 'ANOVA basics']
            },
            {
              title: 'Tabela ANOVA',
              description: 'Construção e interpretação',
              order: 2,
              learningObjectives: ['Construir tabela ANOVA', 'Calcular estatística F'],
              keyTerms: ['soma de quadrados', 'graus de liberdade', 'quadrado médio'],
              searchKeywords: ['ANOVA table', 'sum of squares']
            },
            {
              title: 'Comparações Múltiplas',
              description: 'Testes post-hoc',
              order: 3,
              learningObjectives: ['Aplicar testes post-hoc', 'Controlar erro tipo I'],
              keyTerms: ['Tukey', 'Bonferroni', 'Scheffé', 'LSD'],
              searchKeywords: ['multiple comparisons', 'post hoc tests']
            }
          ]
        },
        {
          title: 'ANOVA de Dois Fatores',
          order: 2,
          topics: [
            {
              title: 'ANOVA Fatorial',
              description: 'Dois fatores com interação',
              order: 1,
              learningObjectives: ['Analisar dois fatores', 'Interpretar interação'],
              keyTerms: ['efeito principal', 'interação', 'design fatorial'],
              searchKeywords: ['two way ANOVA', 'factorial ANOVA']
            },
            {
              title: 'Delineamentos Experimentais',
              description: 'Planejamento de experimentos',
              order: 2,
              learningObjectives: ['Planejar experimentos', 'Escolher delineamento'],
              keyTerms: ['blocos casualizados', 'quadrado latino', 'split-plot'],
              searchKeywords: ['experimental design', 'randomized blocks']
            }
          ]
        }
      ]
    },
    {
      title: 'Estatística Não-Paramétrica',
      description: 'Métodos livres de distribuição',
      order: 9,
      estimatedDuration: '2 semanas',
      sections: [
        {
          title: 'Testes para Uma Amostra',
          order: 1,
          topics: [
            {
              title: 'Teste do Sinal',
              description: 'Alternativa não-paramétrica ao teste t',
              order: 1,
              learningObjectives: ['Aplicar teste do sinal', 'Comparar com teste t'],
              keyTerms: ['teste do sinal', 'mediana', 'distribuição binomial'],
              searchKeywords: ['sign test', 'nonparametric test']
            },
            {
              title: 'Teste de Wilcoxon',
              description: 'Teste de postos sinalizados',
              order: 2,
              learningObjectives: ['Aplicar Wilcoxon', 'Calcular postos'],
              keyTerms: ['Wilcoxon signed-rank', 'postos sinalizados'],
              searchKeywords: ['Wilcoxon test', 'signed rank test']
            }
          ]
        },
        {
          title: 'Testes para Duas Amostras',
          order: 2,
          topics: [
            {
              title: 'Teste de Mann-Whitney',
              description: 'Comparação de duas amostras independentes',
              order: 1,
              learningObjectives: ['Aplicar Mann-Whitney', 'Comparar distribuições'],
              keyTerms: ['Mann-Whitney U', 'soma de postos', 'Wilcoxon rank-sum'],
              searchKeywords: ['Mann Whitney test', 'rank sum test']
            },
            {
              title: 'Teste de Kolmogorov-Smirnov',
              description: 'Comparação de distribuições',
              order: 2,
              learningObjectives: ['Aplicar KS test', 'Comparar CDFs'],
              keyTerms: ['Kolmogorov-Smirnov', 'distribuição empírica'],
              searchKeywords: ['KS test', 'Kolmogorov Smirnov']
            }
          ]
        },
        {
          title: 'Testes para Múltiplas Amostras',
          order: 3,
          topics: [
            {
              title: 'Teste de Kruskal-Wallis',
              description: 'ANOVA não-paramétrica',
              order: 1,
              learningObjectives: ['Aplicar Kruskal-Wallis', 'Comparar k grupos'],
              keyTerms: ['Kruskal-Wallis', 'ANOVA por postos'],
              searchKeywords: ['Kruskal Wallis test', 'nonparametric ANOVA']
            },
            {
              title: 'Teste de Friedman',
              description: 'Blocos casualizados não-paramétrico',
              order: 2,
              learningObjectives: ['Aplicar Friedman', 'Analisar medidas repetidas'],
              keyTerms: ['teste de Friedman', 'blocos', 'medidas repetidas'],
              searchKeywords: ['Friedman test', 'repeated measures nonparametric']
            }
          ]
        }
      ]
    },
    {
      title: 'Laboratório Computacional',
      description: 'Implementação prática em R e Python',
      order: 10,
      estimatedDuration: '2 semanas',
      sections: [
        {
          title: 'Análise em R',
          order: 1,
          topics: [
            {
              title: 'Introdução ao R e RStudio',
              description: 'Ambiente e sintaxe básica',
              order: 1,
              learningObjectives: ['Configurar R/RStudio', 'Usar sintaxe básica'],
              keyTerms: ['R', 'RStudio', 'packages', 'data.frame'],
              searchKeywords: ['R programming statistics', 'RStudio tutorial']
            },
            {
              title: 'Análise Descritiva em R',
              description: 'Estatística descritiva e visualização',
              order: 2,
              learningObjectives: ['Calcular estatísticas', 'Criar gráficos em R'],
              keyTerms: ['summary', 'ggplot2', 'dplyr', 'tidyverse'],
              searchKeywords: ['R descriptive statistics', 'ggplot2 tutorial']
            },
            {
              title: 'Testes Estatísticos em R',
              description: 'Implementação de testes',
              order: 3,
              learningObjectives: ['Realizar testes em R', 'Interpretar outputs'],
              keyTerms: ['t.test', 'aov', 'lm', 'chisq.test'],
              searchKeywords: ['statistical tests R', 'hypothesis testing R']
            }
          ]
        },
        {
          title: 'Análise em Python',
          order: 2,
          topics: [
            {
              title: 'Python para Estatística',
              description: 'NumPy, Pandas e SciPy',
              order: 1,
              learningObjectives: ['Usar bibliotecas Python', 'Manipular dados'],
              keyTerms: ['NumPy', 'Pandas', 'SciPy', 'Statsmodels'],
              searchKeywords: ['Python statistics', 'pandas tutorial']
            },
            {
              title: 'Visualização com Python',
              description: 'Matplotlib e Seaborn',
              order: 2,
              learningObjectives: ['Criar visualizações', 'Usar Seaborn'],
              keyTerms: ['matplotlib', 'seaborn', 'plotly'],
              searchKeywords: ['data visualization Python', 'seaborn tutorial']
            },
            {
              title: 'Machine Learning Básico',
              description: 'Introdução ao scikit-learn',
              order: 3,
              learningObjectives: ['Usar scikit-learn', 'Implementar modelos básicos'],
              keyTerms: ['scikit-learn', 'classificação', 'regressão', 'clustering'],
              searchKeywords: ['scikit learn tutorial', 'machine learning Python']
            }
          ]
        },
        {
          title: 'Projetos Aplicados',
          order: 3,
          topics: [
            {
              title: 'Projeto 1: Análise de Dados Reais',
              description: 'Dataset completo do início ao fim',
              order: 1,
              learningObjectives: ['Realizar análise completa', 'Apresentar resultados'],
              keyTerms: ['projeto', 'análise exploratória', 'relatório'],
              searchKeywords: ['data analysis project', 'statistical project']
            },
            {
              title: 'Projeto 2: Simulação Monte Carlo',
              description: 'Simulações estatísticas',
              order: 2,
              learningObjectives: ['Implementar simulações', 'Validar teoria'],
              keyTerms: ['Monte Carlo', 'simulação', 'bootstrap'],
              searchKeywords: ['Monte Carlo simulation', 'bootstrap statistics']
            },
            {
              title: 'Projeto 3: Dashboard Interativo',
              description: 'Visualização interativa de dados',
              order: 3,
              learningObjectives: ['Criar dashboard', 'Comunicar insights'],
              keyTerms: ['Shiny', 'Dash', 'dashboard', 'interativo'],
              searchKeywords: ['statistical dashboard', 'Shiny app']
            }
          ]
        }
      ]
    },
    {
      title: 'Exercícios e Preparação para Provas',
      description: 'Prática intensiva e revisão',
      order: 11,
      estimatedDuration: '2 semanas',
      sections: [
        {
          title: 'Listas de Exercícios',
          order: 1,
          topics: [
            {
              title: 'Lista 1: Estatística Descritiva e Probabilidade',
              description: 'Exercícios dos primeiros módulos',
              order: 1,
              learningObjectives: ['Resolver problemas básicos', 'Aplicar conceitos'],
              keyTerms: ['exercícios', 'problemas resolvidos'],
              searchKeywords: ['statistics exercises', 'probability problems']
            },
            {
              title: 'Lista 2: Distribuições e Inferência',
              description: 'Problemas de distribuições e estimação',
              order: 2,
              learningObjectives: ['Aplicar distribuições', 'Realizar inferência'],
              keyTerms: ['distribuições', 'intervalos de confiança'],
              searchKeywords: ['distribution problems', 'inference exercises']
            },
            {
              title: 'Lista 3: Testes e Regressão',
              description: 'Testes de hipóteses e análise de regressão',
              order: 3,
              learningObjectives: ['Realizar testes', 'Ajustar modelos'],
              keyTerms: ['testes de hipóteses', 'regressão'],
              searchKeywords: ['hypothesis testing exercises', 'regression problems']
            },
            {
              title: 'Lista 4: ANOVA e Não-Paramétricos',
              description: 'Exercícios avançados',
              order: 4,
              learningObjectives: ['Aplicar ANOVA', 'Usar testes não-paramétricos'],
              keyTerms: ['ANOVA', 'testes não-paramétricos'],
              searchKeywords: ['ANOVA exercises', 'nonparametric problems']
            }
          ]
        },
        {
          title: 'Simulados e Provas',
          order: 2,
          topics: [
            {
              title: 'Provas Resolvidas de Anos Anteriores',
              description: 'Banco de provas com gabarito',
              order: 1,
              learningObjectives: ['Conhecer formato', 'Praticar questões'],
              keyTerms: ['provas antigas', 'gabarito'],
              searchKeywords: ['statistics exams', 'past papers']
            },
            {
              title: 'Simulado P1',
              description: 'Primeira metade do curso',
              order: 2,
              learningObjectives: ['Testar conhecimento P1', 'Identificar lacunas'],
              keyTerms: ['simulado', 'prova 1'],
              searchKeywords: ['midterm exam', 'practice test 1']
            },
            {
              title: 'Simulado P2',
              description: 'Segunda metade do curso',
              order: 3,
              learningObjectives: ['Testar conhecimento P2', 'Preparar para final'],
              keyTerms: ['simulado', 'prova 2'],
              searchKeywords: ['final exam', 'practice test 2']
            }
          ]
        },
        {
          title: 'Revisão e Resumos',
          order: 3,
          topics: [
            {
              title: 'Fórmulas e Tabelas',
              description: 'Formulário completo',
              order: 1,
              learningObjectives: ['Memorizar fórmulas', 'Usar tabelas'],
              keyTerms: ['formulário', 'tabelas estatísticas'],
              searchKeywords: ['statistics formulas', 'statistical tables']
            },
            {
              title: 'Mapas Conceituais',
              description: 'Resumos visuais dos conceitos',
              order: 2,
              learningObjectives: ['Revisar conceitos', 'Conectar ideias'],
              keyTerms: ['mapa mental', 'resumo visual'],
              searchKeywords: ['concept maps statistics', 'mind maps']
            },
            {
              title: 'Questões Frequentes em Provas',
              description: 'Tipos de questões mais cobradas',
              order: 3,
              learningObjectives: ['Identificar padrões', 'Preparar estratégias'],
              keyTerms: ['questões típicas', 'pegadinhas'],
              searchKeywords: ['common exam questions', 'statistics FAQ']
            }
          ]
        }
      ]
    }
  ],
  bibliography: {
    main: [
      'MONTGOMERY, D. C.; RUNGER, G. C. Estatística Aplicada e Probabilidade para Engenheiros. 6ª ed. LTC, 2018.',
      'MEYER, P. L. Probabilidade: Aplicações à Estatística. 2ª ed. LTC, 1983.',
      'BUSSAB, W. O.; MORETTIN, P. A. Estatística Básica. 9ª ed. Saraiva, 2017.',
      'DEVORE, J. L. Probabilidade e Estatística para Engenharia e Ciências. 8ª ed. Cengage, 2014.'
    ],
    complementary: [
      'CASELLA, G.; BERGER, R. L. Statistical Inference. 2ª ed. Duxbury, 2001.',
      'MOOD, A. M.; GRAYBILL, F. A.; BOES, D. C. Introduction to the Theory of Statistics. 3ª ed. McGraw-Hill, 1974.',
      'JAMES, G.; WITTEN, D.; HASTIE, T.; TIBSHIRANI, R. An Introduction to Statistical Learning. Springer, 2013.',
      'FREEDMAN, D.; PISANI, R.; PURVES, R. Statistics. 4ª ed. W. W. Norton, 2007.'
    ]
  },
  evaluationMethods: [
    'Provas teóricas (P1 e P2)',
    'Trabalhos práticos com dados reais',
    'Listas de exercícios',
    'Projeto final de análise',
    'Participação em aula'
  ],
  practicalTools: [
    'R e RStudio',
    'Python (NumPy, Pandas, SciPy, Statsmodels)',
    'Excel para análises básicas',
    'SPSS (opcional)',
    'Jupyter Notebooks'
  ]
};