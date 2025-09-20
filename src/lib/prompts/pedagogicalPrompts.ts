/**
 * Prompts Pedagógicos Especializados por Domínio de Conhecimento
 * Baseados na Taxonomia de Bloom e melhores práticas pedagógicas
 */

import { KnowledgeDomain, PedagogicalAnalysis } from '../pedagogicalEngine';

export interface SpecializedPrompt {
  domain: string;
  systemPrompt: string;
  syllabusPrompt: string;
  validationRules: string[];
  bloomGuidelines: { [level: number]: string };
}

/**
 * Sistema de Prompts base com princípios pedagógicos universais
 */
const BASE_PEDAGOGICAL_PRINCIPLES = `
PRINCÍPIOS PEDAGÓGICOS FUNDAMENTAIS:
1. **Taxonomia de Bloom**: Organize tópicos seguindo progressão cognitiva (Lembrar → Compreender → Aplicar → Analisar → Avaliar → Criar)
2. **Aprendizagem Significativa**: Conecte novos conceitos com conhecimentos prévios
3. **Carga Cognitiva**: Limite informações por módulo (7±2 conceitos principais)
4. **Feedback Contínuo**: Inclua verificações e auto-avaliações
5. **Aplicação Prática**: Balance teoria e prática adequadamente
6. **Progressão Gradual**: Construa complexidade incrementalmente
7. **Contextualização**: Use exemplos relevantes ao contexto brasileiro
`;

/**
 * Prompts especializados por domínio
 */
export const SPECIALIZED_PROMPTS: { [key: string]: SpecializedPrompt } = {
  programming: {
    domain: 'Programação',
    systemPrompt: `${BASE_PEDAGOGICAL_PRINCIPLES}

ESPECIALIZAÇÃO PARA PROGRAMAÇÃO:
- **Abordagem Hands-on**: 70% prática, 30% teoria
- **Progressão**: Sintaxe → Conceitos → Estruturas → Projetos → Arquitetura
- **Metodologia**: Learn by doing, debugging como aprendizagem
- **Avaliação**: Código funcional, projetos incrementais, code review
- **Contexto Brasileiro**: Exemplos de startups, mercado tech nacional
- **Ferramentas**: Privilegiar tecnologias usadas no mercado brasileiro`,

    syllabusPrompt: `Crie um syllabus de programação com tópicos ESPECÍFICOS para a linguagem/tecnologia solicitada:

INSTRUÇÃO CRÍTICA:
- NÃO use títulos genéricos como "Conceitos Básicos", "Fundamentos", "Estruturas Básicas"
- SEMPRE use nomes específicos da linguagem/framework solicitado
- Para cada módulo, inclua conceitos reais que um programador precisa aprender

EXEMPLO PARA JAVASCRIPT:
- "Variáveis e Tipos em JavaScript" (não "Conceitos Básicos")
- "Funções e Arrow Functions"
- "Objetos e Arrays em JS"
- "DOM Manipulation"
- "Promises e Async/Await"
- "Eventos e Event Listeners"

EXEMPLO PARA PYTHON:
- "Sintaxe Python e PEP 8"
- "Estruturas de Dados Python"
- "Programação Orientada a Objetos em Python"
- "Manipulação de Arquivos"
- "Bibliotecas Pandas e NumPy"

EXEMPLO PARA REACT:
- "Componentes React e JSX"
- "State e Props"
- "Hooks: useState e useEffect"
- "Roteamento com React Router"
- "Gerenciamento de Estado"

ESTRUTURA BASEADA NA TECNOLOGIA ESPECÍFICA:
- Identifique os conceitos principais da linguagem/framework
- Crie módulos com nomes que refletem funcionalidades reais
- Inclua projetos práticos relevantes
- Organize em progressão lógica da tecnologia

CADA TÓPICO DEVE TER:
- Conceito teórico específico (15min)
- Exemplo prático da linguagem (15min)
- Exercício hands-on (30min)
- Mini-projeto aplicado (45min)`,

    validationRules: [
      'Pelo menos 60% dos tópicos devem ser práticos',
      'Cada módulo deve ter um projeto integrador',
      'Progressão clara de complexidade nos exercícios',
      'Inclusão de debugging como habilidade explícita'
    ],

    bloomGuidelines: {
      1: 'Definir sintaxe, reconhecer padrões de código',
      2: 'Explicar conceitos, interpretar código existente',
      3: 'Implementar algoritmos, resolver problemas básicos',
      4: 'Analisar código, identificar bugs, comparar soluções',
      5: 'Avaliar qualidade de código, justificar escolhas arquiteturais',
      6: 'Criar projetos originais, projetar arquiteturas'
    }
  },

  mathematics: {
    domain: 'Matemática',
    systemPrompt: `${BASE_PEDAGOGICAL_PRINCIPLES}

ESPECIALIZAÇÃO PARA MATEMÁTICA:
- **Abordagem Conceitual**: 50% teoria, 50% exercícios
- **Progressão**: Definições → Teoremas → Demonstrações → Aplicações
- **Metodologia**: Rigor matemático adaptado ao nível, visualizações
- **Avaliação**: Resolução de problemas, demonstrações, aplicações
- **Contexto Brasileiro**: Problemas do cotidiano nacional, dados reais
- **Ferramentas**: GeoGebra, calculadoras, software matemático gratuito`,

    syllabusPrompt: `Crie um syllabus de matemática com tópicos ESPECÍFICOS para a área matemática solicitada:

INSTRUÇÃO CRÍTICA:
- NÃO use títulos genéricos como "Fundamentos", "Conceitos Básicos", "Desenvolvimento"
- SEMPRE use nomes específicos da área matemática solicitada
- Para cada módulo, inclua conceitos matemáticos reais da disciplina

EXEMPLO PARA CÁLCULO DIFERENCIAL E INTEGRAL:
- "Limites e Continuidade" (não "Fundamentos")
- "Derivadas e Regras de Derivação"
- "Aplicações da Derivada"
- "Integrais Indefinidas"
- "Integrais Definidas"
- "Teorema Fundamental do Cálculo"
- "Aplicações da Integral"

EXEMPLO PARA ÁLGEBRA LINEAR:
- "Sistemas de Equações Lineares"
- "Matrizes e Operações Matriciais"
- "Determinantes"
- "Espaços Vetoriais"
- "Transformações Lineares"
- "Autovalores e Autovetores"

EXEMPLO PARA ESTATÍSTICA:
- "Estatística Descritiva"
- "Probabilidade e Distribuições"
- "Distribuições de Probabilidade"
- "Inferência Estatística"
- "Testes de Hipóteses"
- "Correlação e Regressão"

ESTRUTURA BASEADA NA ÁREA MATEMÁTICA ESPECÍFICA:
- Identifique os conceitos principais da área matemática
- Crie módulos com nomes que refletem teorias e métodos reais
- Inclua aplicações práticas da área
- Organize em progressão lógica matemática

CADA TÓPICO DEVE TER:
- Conceito e definição formal específica (20min)
- Exemplos resolvidos da área (25min)
- Exercícios graduais (40min)
- Problema aplicado/contextualizado (25min)`,

    validationRules: [
      'Progressão rigorosa de pré-requisitos',
      'Balanceamento entre abstração e aplicação',
      'Exemplos contextualizados brasileiros',
      'Verificação de compreensão conceitual'
    ],

    bloomGuidelines: {
      1: 'Definir conceitos, listar propriedades, reconhecer padrões',
      2: 'Explicar teoremas, interpretar gráficos, resumir métodos',
      3: 'Aplicar fórmulas, resolver problemas, demonstrar técnicas',
      4: 'Analisar soluções, comparar métodos, categorizar problemas',
      5: 'Avaliar validade de demonstrações, criticar abordagens',
      6: 'Criar novas demonstrações, formular conjecturas'
    }
  },

  engineering: {
    domain: 'Engenharia',
    systemPrompt: `${BASE_PEDAGOGICAL_PRINCIPLES}

ESPECIALIZAÇÃO PARA ENGENHARIA:
- **Abordagem Problema-baseada**: 40% teoria, 60% aplicação
- **Progressão**: Princípios → Análise → Projeto → Implementação
- **Metodologia**: Problem-based learning, projetos integradores
- **Avaliação**: Cálculos, projetos, simulações, protótipos
- **Contexto Brasileiro**: Normas ABNT, problemas de infraestrutura nacional
- **Ferramentas**: Software de engenharia gratuito, normas brasileiras`,

    syllabusPrompt: `Crie um syllabus de engenharia com tópicos ESPECÍFICOS para o assunto solicitado:

INSTRUÇÃO CRÍTICA:
- NÃO use títulos genéricos como "Conceitos Fundamentais", "Princípios Básicos", "Sintaxe Básica"
- SEMPRE use nomes específicos da disciplina de engenharia solicitada
- Para cada módulo, inclua tópicos reais que um engenheiro precisa aprender
- Analise o assunto de engenharia e identifique seus conceitos fundamentais ESPECÍFICOS

EXEMPLO PARA MECÂNICA VETORIAL ESTÁTICA:
- "Introdução à Mecânica Vetorial Estática" (não "Conceitos Fundamentais")
- "Vetores: Conceitos e Operações" (não "Estruturas Básicas")
- "Forças e Sistemas de Forças"
- "Equilíbrio de Corpos Rígidos"
- "Momento de Força (Torque)"
- "Diagrama de Corpo Livre"
- "Centro de Massa e Centróide"
- "Treliças e Estruturas"
- "Atrito"

EXEMPLO PARA RESISTÊNCIA DOS MATERIAIS:
- "Tensão e Deformação"
- "Propriedades Mecânicas dos Materiais"
- "Esforços Internos: Tração e Compressão"
- "Flexão e Cisalhamento"
- "Torção"
- "Flambagem"

ESTRUTURA BASEADA NO ASSUNTO ESPECÍFICO:
- Identifique os conceitos principais da disciplina solicitada
- Crie módulos com nomes que refletem o conteúdo real
- Inclua aplicações práticas relevantes ao contexto brasileiro
- Organize em progressão lógica do assunto

CADA TÓPICO DEVE TER:
- Fundamento teórico específico da área (25min)
- Exemplo de cálculo real da disciplina (30min)
- Projeto prático da área de engenharia (50min)
- Validação e discussão (15min)`,

    validationRules: [
      'Conformidade com normas brasileiras (ABNT)',
      'Problemas reais de engenharia nacional',
      'Progressão de complexidade em projetos',
      'Integração teoria-prática constante'
    ],

    bloomGuidelines: {
      1: 'Identificar normas, listar propriedades de materiais',
      2: 'Explicar fenômenos, interpretar resultados de ensaios',
      3: 'Aplicar métodos de cálculo, usar normas em projetos',
      4: 'Analisar estruturas, comparar soluções técnicas',
      5: 'Avaliar projetos, justificar escolhas de design',
      6: 'Projetar sistemas inovadores, criar soluções originais'
    }
  },

  science: {
    domain: 'Ciências',
    systemPrompt: `${BASE_PEDAGOGICAL_PRINCIPLES}

ESPECIALIZAÇÃO PARA CIÊNCIAS:
- **Abordagem Investigativa**: 30% teoria, 70% investigação/experimentação
- **Progressão**: Observação → Hipótese → Experimento → Teoria
- **Metodologia**: Inquiry-based learning, método científico
- **Avaliação**: Relatórios de experimentos, análise de dados
- **Contexto Brasileiro**: Biodiversidade, recursos naturais, problemas ambientais
- **Ferramentas**: Experimentos virtuais, dados científicos brasileiros`,

    syllabusPrompt: `Crie um syllabus de ciências seguindo esta estrutura pedagógica:

ESTRUTURA INVESTIGATIVA RECOMENDADA:
Módulo 1: Observação (Bloom 1-2)
- Fenômenos naturais
- Coleta e organização de dados
- Descrição sistemática

Módulo 2: Investigação (Bloom 2-3)
- Formulação de hipóteses
- Planejamento experimental
- Experimentos controlados

Módulo 3: Análise (Bloom 3-4)
- Interpretação de resultados
- Relações causa-efeito
- Modelos explicativos

Módulo 4: Aplicação (Bloom 4-6)
- Pesquisa original
- Aplicações tecnológicas
- Impacto social e ambiental

CADA TÓPICO DEVE TER:
- Observação/demonstração (20min)
- Experimento ou simulação (45min)
- Análise de dados (30min)
- Discussão e conclusões (15min)`,

    validationRules: [
      'Método científico explícito em cada módulo',
      'Experimentos factíveis ou simulações validadas',
      'Conexão com questões ambientais brasileiras',
      'Desenvolvimento de pensamento crítico'
    ],

    bloomGuidelines: {
      1: 'Identificar fenômenos, listar observações, nomear estruturas',
      2: 'Explicar mecanismos, interpretar gráficos, resumir teorias',
      3: 'Aplicar leis científicas, conduzir experimentos, usar instrumentos',
      4: 'Analisar dados, comparar teorias, examinar evidências',
      5: 'Avaliar validade de estudos, criticar metodologias',
      6: 'Projetar experimentos originais, formular novas hipóteses'
    }
  },

  language: {
    domain: 'Linguagens',
    systemPrompt: `${BASE_PEDAGOGICAL_PRINCIPLES}

ESPECIALIZAÇÃO PARA LINGUAGENS:
- **Abordagem Comunicativa**: 20% gramática, 80% uso prático
- **Progressão**: Vocabulário → Estruturas → Comunicação → Fluência
- **Metodologia**: Task-based learning, imersão controlada
- **Avaliação**: Comunicação oral, escrita, compreensão cultural
- **Contexto Brasileiro**: Situações cotidianas, cultura local
- **Ferramentas**: Recursos multimídia, apps de idiomas gratuitos`,

    syllabusPrompt: `Crie um syllabus de linguagem seguindo esta estrutura pedagógica:

ESTRUTURA COMUNICATIVA RECOMENDADA:
Módulo 1: Fundamentos (Bloom 1-2)
- Vocabulário essencial
- Estruturas básicas
- Pronúncia e entonação

Módulo 2: Comunicação (Bloom 2-3)
- Diálogos práticos
- Situações cotidianas
- Expressões culturais

Módulo 3: Fluência (Bloom 3-4)
- Conversação avançada
- Compreensão de textos
- Produção escrita

Módulo 4: Proficiência (Bloom 4-6)
- Debates e apresentações
- Análise cultural
- Criação de conteúdo original

CADA TÓPICO DEVE TER:
- Apresentação em contexto (15min)
- Prática comunicativa (40min)
- Atividade cultural (20min)
- Autoavaliação comunicativa (15min)`,

    validationRules: [
      'Foco em competência comunicativa',
      'Integração cultural constante',
      'Situações autênticas brasileiras',
      'Avaliação baseada em tarefas comunicativas'
    ],

    bloomGuidelines: {
      1: 'Reconhecer vocabulário, repetir estruturas, identificar sons',
      2: 'Compreender textos, explicar significados, parafrasear',
      3: 'Usar estruturas em comunicação, aplicar regras gramaticais',
      4: 'Analisar registros, comparar culturas, distinguir estilos',
      5: 'Avaliar adequação comunicativa, criticar textos',
      6: 'Criar textos originais, adaptar linguagem para contextos'
    }
  },

  business: {
    domain: 'Negócios',
    systemPrompt: `${BASE_PEDAGOGICAL_PRINCIPLES}

ESPECIALIZAÇÃO PARA NEGÓCIOS:
- **Abordagem Caso-baseada**: 40% conceitos, 60% casos práticos
- **Progressão**: Conceitos → Frameworks → Casos → Estratégias
- **Metodologia**: Case-based learning, simulações empresariais
- **Avaliação**: Análise de casos, planos de negócio, apresentações
- **Contexto Brasileiro**: Mercado nacional, regulamentação brasileira
- **Ferramentas**: Planilhas, ferramentas de gestão gratuitas`,

    syllabusPrompt: `Crie um syllabus de negócios seguindo esta estrutura pedagógica:

ESTRUTURA CASO-BASEADA RECOMENDADA:
Módulo 1: Conceitos (Bloom 1-2)
- Fundamentos empresariais
- Terminologia de negócios
- Contexto econômico brasileiro

Módulo 2: Frameworks (Bloom 2-3)
- Modelos de análise
- Ferramentas de gestão
- Metodologias empresariais

Módulo 3: Casos (Bloom 3-4)
- Estudos de caso brasileiros
- Análise de empresas nacionais
- Simulações de negócios

Módulo 4: Estratégia (Bloom 4-6)
- Planejamento estratégico
- Inovação e empreendedorismo
- Liderança e gestão de mudanças

CADA TÓPICO DEVE TER:
- Conceito e framework (25min)
- Caso prático brasileiro (35min)
- Simulação ou exercício (30min)
- Discussão estratégica (20min)`,

    validationRules: [
      'Casos reais de empresas brasileiras',
      'Consideração do ambiente regulatório nacional',
      'Aplicabilidade prática imediata',
      'Desenvolvimento de pensamento estratégico'
    ],

    bloomGuidelines: {
      1: 'Definir conceitos empresariais, identificar stakeholders',
      2: 'Explicar modelos de negócio, interpretar indicadores',
      3: 'Aplicar frameworks, implementar estratégias, resolver problemas',
      4: 'Analisar mercados, comparar estratégias, examinar concorrência',
      5: 'Avaliar planos de negócio, justificar decisões estratégicas',
      6: 'Criar modelos de negócio inovadores, projetar estratégias'
    }
  }
};

/**
 * Constrói prompt especializado baseado na análise pedagógica
 */
export function buildSpecializedPrompt(
  analysis: PedagogicalAnalysis,
  message: string,
  userProfile: any
): string {
  const domainKey = analysis.domain.name.toLowerCase();
  const specializedPrompt = SPECIALIZED_PROMPTS[domainKey] || SPECIALIZED_PROMPTS['programming'];

  const bloomLevels = analysis.bloomProgression.map(level =>
    `Nível ${level} (${specializedPrompt.bloomGuidelines[level]})`
  ).join('\n- ');

  return `${specializedPrompt.systemPrompt}

⚠️ ASSUNTO ESPECÍFICO SOLICITADO: "${message}"

INSTRUÇÃO SUPER CRÍTICA:
- Você deve criar um curso específico sobre "${message}"
- NÃO use títulos genéricos como "Conceitos Fundamentais", "Princípios Básicos", "Sintaxe Básica"
- TODOS os módulos e tópicos devem ter nomes específicos relacionados a "${message}"
- Analise o que é "${message}" e identifique seus conceitos principais REAIS

PERFIL DO ALUNO:
- Nível: ${userProfile?.level || 'beginner'}
- Objetivo: ${userProfile?.purpose || 'aprendizado geral'}
- Tempo disponível: ${userProfile?.timeAvailable || '1-2 horas/dia'}
- Experiência prévia: ${userProfile?.background || 'Não informado'}

ANÁLISE PEDAGÓGICA:
- Domínio: ${analysis.domain.name} (${analysis.domain.type})
- Complexidade: ${analysis.complexity}
- Abordagem recomendada: ${analysis.recommendedApproach}
- Duração estimada: ${analysis.estimatedDuration.total} horas (${analysis.estimatedDuration.theory}h teoria + ${analysis.estimatedDuration.practice}h prática)

PROGRESSÃO BLOOM PLANEJADA:
- ${bloomLevels}

${specializedPrompt.syllabusPrompt}

REGRAS DE VALIDAÇÃO ESPECÍFICAS:
${specializedPrompt.validationRules.map(rule => `- ${rule}`).join('\n')}
- ⚠️ CRÍTICO: Todos os títulos devem ser específicos para "${message}"
- ⚠️ CRÍTICO: Não aceitar títulos genéricos como "Conceitos Básicos" ou "Fundamentos"

FORMATO DE RESPOSTA OBRIGATÓRIO:
Retorne EXATAMENTE este formato JSON (nomes de campos em inglês):

{
  "title": "Nome do curso específico para ${message}",
  "description": "Descrição do curso",
  "level": "beginner/intermediate/advanced",
  "modules": [
    {
      "id": "module-1",
      "title": "Nome específico do módulo (não genérico)",
      "description": "Descrição do módulo",
      "order": 1,
      "estimatedDuration": "X horas",
      "topics": [
        {
          "id": "topic-1",
          "title": "Nome específico do tópico de ${message}",
          "description": "Descrição específica",
          "order": 1,
          "estimatedDuration": "X min",
          "subtopics": ["Subtópico 1", "Subtópico 2"]
        }
      ]
    }
  ]
}

CRÍTICO: Use nomes de campos em INGLÊS (title, modules, topics) e tópicos específicos para "${message}".

Responda APENAS com o JSON válido, sem texto adicional.`;
}

/**
 * Valida syllabus gerado contra regras pedagógicas
 */
export function validateSyllabusQuality(
  syllabus: any,
  analysis: PedagogicalAnalysis
): {
  isValid: boolean;
  score: number;
  feedback: string[];
  improvements: string[];
} {
  const feedback: string[] = [];
  const improvements: string[] = [];
  let score = 10;

  const domainKey = analysis.domain.name.toLowerCase();
  const specializedPrompt = SPECIALIZED_PROMPTS[domainKey];

  // Validar regras específicas do domínio
  if (specializedPrompt) {
    specializedPrompt.validationRules.forEach(rule => {
      // Implementar validações específicas baseadas nas regras
      // Esta é uma implementação simplificada
      if (rule.includes('prático') && !checkPracticalBalance(syllabus, analysis.domain.type)) {
        score -= 2;
        feedback.push(`Balanceamento teoria/prática inadequado: ${rule}`);
        improvements.push('Adicionar mais atividades práticas');
      }
    });
  }

  // Validar progressão Bloom
  if (!checkBloomProgression(syllabus, analysis.bloomProgression)) {
    score -= 3;
    feedback.push('Progressão da Taxonomia de Bloom não respeitada');
    improvements.push('Reorganizar tópicos seguindo progressão cognitiva');
  }

  // Validar pré-requisitos
  if (!checkPrerequisites(syllabus)) {
    score -= 2;
    feedback.push('Cadeia de pré-requisitos inconsistente');
    improvements.push('Revisar dependências entre tópicos');
  }

  return {
    isValid: score >= 7,
    score: Math.max(0, score),
    feedback,
    improvements
  };
}

// Funções auxiliares de validação
function checkPracticalBalance(syllabus: any, domainType: string): boolean {
  const practicalRatios = {
    'procedural': 0.6,
    'technical': 0.5,
    'conceptual': 0.3,
    'factual': 0.3
  };

  // Implementação simplificada - conta tópicos com palavras-chave práticas
  const practicalKeywords = ['prático', 'exercício', 'projeto', 'aplicação', 'implementação'];
  let practicalCount = 0;
  let totalCount = 0;

  syllabus.modules?.forEach((module: any) => {
    module.topics?.forEach((topic: any) => {
      totalCount++;
      if (practicalKeywords.some(keyword =>
        topic.title.toLowerCase().includes(keyword) ||
        topic.description?.toLowerCase().includes(keyword)
      )) {
        practicalCount++;
      }
    });
  });

  const actualRatio = totalCount > 0 ? practicalCount / totalCount : 0;
  const expectedRatio = practicalRatios[domainType as keyof typeof practicalRatios] || 0.4;

  return Math.abs(actualRatio - expectedRatio) <= 0.2; // Tolerância de 20%
}

function checkBloomProgression(syllabus: any, expectedProgression: number[]): boolean {
  // Implementação simplificada - verifica se há progressão nos verbos
  const bloomVerbs = {
    1: ['definir', 'listar', 'identificar', 'nomear'],
    2: ['explicar', 'interpretar', 'resumir', 'comparar'],
    3: ['aplicar', 'demonstrar', 'implementar', 'resolver'],
    4: ['analisar', 'categorizar', 'examinar', 'comparar'],
    5: ['avaliar', 'criticar', 'defender', 'justificar'],
    6: ['criar', 'projetar', 'formular', 'construir']
  };

  let hasProgression = false;
  expectedProgression.forEach(level => {
    const verbs = bloomVerbs[level as keyof typeof bloomVerbs] || [];
    const content = JSON.stringify(syllabus).toLowerCase();
    if (verbs.some((verb: string) => content.includes(verb))) {
      hasProgression = true;
    }
  });

  return hasProgression;
}

function checkPrerequisites(syllabus: any): boolean {
  // Implementação simplificada - verifica se módulos têm ordem lógica
  if (!syllabus.modules || syllabus.modules.length === 0) return false;

  let hasLogicalOrder = true;
  for (let i = 1; i < syllabus.modules.length; i++) {
    const currentModule = syllabus.modules[i];
    const previousModule = syllabus.modules[i - 1];

    if (currentModule.order <= previousModule.order) {
      hasLogicalOrder = false;
      break;
    }
  }

  return hasLogicalOrder;
}