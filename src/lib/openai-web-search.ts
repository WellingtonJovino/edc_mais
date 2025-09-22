import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Configurações do Web Search
const WEB_SEARCH_CONFIG = {
  defaultMode: (process.env.WEB_SEARCH_MODE as 'quick' | 'agentic_search' | 'deep_research') || 'agentic_search',
  enableDomainFiltering: process.env.ENABLE_DOMAIN_FILTERING !== 'false',
  maxSourcesPerQuery: parseInt(process.env.MAX_SOURCES_PER_QUERY || '20'),
  enableBrazilianContext: process.env.ENABLE_BRAZILIAN_CONTEXT !== 'false',
  fallbackToPerplexity: process.env.FALLBACK_TO_PERPLEXITY !== 'false',
  userLocation: {
    country: process.env.WEB_SEARCH_LOCATION_COUNTRY || 'BR',
    city: process.env.WEB_SEARCH_LOCATION_CITY || 'São Paulo',
    region: process.env.WEB_SEARCH_LOCATION_REGION || 'São Paulo'
  }
};

// Domínios especializados por área
const DOMAIN_SETS = {
  academic_general: [
    'ocw.mit.edu',
    'oyc.yale.edu',
    'oli.cmu.edu',
    'coursera.org',
    'edx.org',
    'khanacademy.org',
    'openlearn.open.ac.uk'
  ],

  brazilian_universities: [
    'usp.br',
    'unicamp.br',
    'ufrj.br',
    'ufmg.br',
    'ufsc.br',
    'puc-rio.br',
    'mackenzie.br'
  ],

  engineering_standards: [
    'asme.org',
    'astm.org',
    'ieee.org',
    'iso.org',
    'abnt.org.br',
    'din.de',
    'ansi.org'
  ],

  programming_resources: [
    'developer.mozilla.org',
    'docs.python.org',
    'reactjs.org',
    'vuejs.org',
    'angular.io',
    'nodejs.org',
    'github.com',
    'stackoverflow.com',
    'freecodecamp.org'
  ],

  scientific_research: [
    'scholar.google.com',
    'pubmed.ncbi.nlm.nih.gov',
    'arxiv.org',
    'researchgate.net',
    'jstor.org',
    'sciencedirect.com'
  ],

  business_finance: [
    'harvard.edu',
    'wharton.upenn.edu',
    'insead.edu',
    'investopedia.com',
    'mckinsey.com',
    'bain.com'
  ],

  medical_health: [
    'who.int',
    'cdc.gov',
    'nih.gov',
    'mayoclinic.org',
    'webmd.com',
    'medlineplus.gov'
  ]
};

// Interfaces
export interface WebSearchOptions {
  allowed_domains?: string[];
  user_location?: {
    country: string;
    city?: string;
    region?: string;
  };
  mode?: 'quick' | 'agentic_search' | 'deep_research';
  domain_category?: keyof typeof DOMAIN_SETS | 'all_edu';
  max_sources?: number;
}

export interface WebSearchResult {
  content: string;
  sources: SearchSource[];
  citations: Citation[];
  query: string;
  search_id: string;
  mode_used: string;
}

export interface SearchSource {
  url: string;
  title: string;
  domain: string;
  relevance_score?: number;
}

export interface Citation {
  url: string;
  title: string;
  start_index: number;
  end_index: number;
  text_snippet: string;
}

export interface CurriculumSearchResult {
  generalTopics: string[];
  academicSyllabi: string[];
  industryStandards: string[];
  practicalApplications: string[];
  sources: {
    academic: SearchSource[];
    industry: SearchSource[];
    practical: SearchSource[];
  };
  completenessScore: number;
}

/**
 * Busca principal usando OpenAI Web Search
 */
export async function openaiWebSearch(
  query: string,
  options: WebSearchOptions = {}
): Promise<WebSearchResult> {
  console.log(`🌐 OpenAI Web Search: "${query}"`);

  try {
    // Configurar domínios baseado na categoria
    let allowed_domains = options.allowed_domains;

    if (options.domain_category && !allowed_domains) {
      if (options.domain_category === 'all_edu') {
        allowed_domains = ['edu', 'ac.uk', 'edu.br', 'ac.jp', 'edu.au'];
      } else {
        allowed_domains = DOMAIN_SETS[options.domain_category];
      }
    }

    // Se contexto brasileiro estiver habilitado, adicionar universidades brasileiras
    if (WEB_SEARCH_CONFIG.enableBrazilianContext && allowed_domains) {
      allowed_domains = [...allowed_domains, ...DOMAIN_SETS.brazilian_universities];
    }

    // Configurar ferramentas
    const tools = [{
      type: "web_search" as const,
      ...(allowed_domains && WEB_SEARCH_CONFIG.enableDomainFiltering && {
        filters: { allowed_domains: Array.from(new Set(allowed_domains)) }
      }),
      ...(options.user_location && {
        user_location: { type: "approximate" as const, ...options.user_location }
      })
    }];

    // Escolher modelo baseado no modo
    const mode = options.mode || WEB_SEARCH_CONFIG.defaultMode;
    const model = mode === 'deep_research' ? 'o3-deep-research' :
                 mode === 'agentic_search' ? 'gpt-5' : 'o4-mini';

    console.log(`🤖 Usando modelo ${model} com modo ${mode}`);

    const response = await openai.responses.create({
      model,
      tools,
      input: query,
      ...(mode === 'agentic_search' && {
        reasoning: { effort: "medium" }
      }),
      ...(mode === 'deep_research' && {
        reasoning: { effort: "high" }
      })
    });

    const sources = extractSources(response);
    const citations = extractCitations(response);

    console.log(`✅ Web Search concluída: ${sources.length} fontes, ${citations.length} citações`);

    return {
      content: response.output_text || '',
      sources,
      citations,
      query,
      search_id: generateSearchId(),
      mode_used: mode
    };

  } catch (error) {
    console.error('❌ Erro na busca web OpenAI:', error);

    // Fallback mais simples se disponível
    if (options.mode !== 'quick') {
      console.log('🔄 Tentando novamente com busca rápida...');
      return openaiWebSearch(query, { ...options, mode: 'quick' });
    }

    throw error;
  }
}

/**
 * Busca especializada para ementas e currículos universitários
 */
export async function searchUniversitySyllabi(
  subject: string,
  level: string,
  includeInternational: boolean = true
): Promise<WebSearchResult> {
  console.log(`🎓 Buscando ementas universitárias para ${subject} (${level})`);

  const domains = [
    ...DOMAIN_SETS.academic_general,
    ...DOMAIN_SETS.brazilian_universities
  ];

  if (includeInternational) {
    domains.push('edu', 'ac.uk', 'edu.au', 'ac.jp');
  }

  const query = `"${subject}" syllabus curriculum "${level}" university course outline topics`;

  return openaiWebSearch(query, {
    allowed_domains: domains,
    mode: 'agentic_search',
    user_location: WEB_SEARCH_CONFIG.userLocation
  });
}

/**
 * Busca por padrões industriais e certificações
 */
export async function searchIndustryStandards(
  subject: string,
  includeInternational: boolean = true
): Promise<WebSearchResult> {
  console.log(`🏭 Buscando padrões industriais para ${subject}`);

  let domains = [...DOMAIN_SETS.engineering_standards];

  if (includeInternational) {
    domains.push('gov', 'org');
  }

  const query = `"${subject}" industry standards certification requirements professional practice`;

  return openaiWebSearch(query, {
    allowed_domains: domains,
    mode: 'agentic_search'
  });
}

/**
 * Busca por aplicações práticas e casos de uso
 */
export async function searchPracticalApplications(
  subject: string,
  industryContext?: string
): Promise<WebSearchResult> {
  console.log(`🔧 Buscando aplicações práticas para ${subject}`);

  const contextQuery = industryContext ? ` ${industryContext}` : '';
  const query = `"${subject}" practical applications case studies projects examples${contextQuery}`;

  return openaiWebSearch(query, {
    mode: 'agentic_search',
    user_location: WEB_SEARCH_CONFIG.userLocation
  });
}

/**
 * Busca especializada por domínio
 */
export async function searchByDomain(
  subject: string,
  domain: keyof typeof DOMAIN_SETS,
  specificQuery?: string
): Promise<WebSearchResult> {
  console.log(`🎯 Busca especializada em ${domain} para ${subject}`);

  const baseQuery = specificQuery || `complete curriculum ${subject} comprehensive topics`;

  return openaiWebSearch(baseQuery, {
    domain_category: domain,
    mode: 'agentic_search'
  });
}

/**
 * Busca abrangente coordenada para gerar currículo completo
 */
export async function comprehensiveCurriculumSearch(
  subject: string,
  discipline: string,
  level: string,
  userProfile?: any,
  domainSpecificConfig?: {
    searchQueries: string[];
    domains: string[];
    additionalTerms: string[];
  }
): Promise<CurriculumSearchResult> {
  console.log(`🌐 Busca abrangente para currículo: ${discipline} (${level})`);

  // Identificar categoria do domínio ou usar configurações específicas
  const domainCategory = identifyDomainCategory(subject, discipline);

  // Configurar buscas baseadas no domínio específico se fornecido
  let searchQueries: string[];
  let domainFilter: string | undefined;

  if (domainSpecificConfig) {
    console.log(`🎓 Usando configuração específica do domínio`);
    searchQueries = domainSpecificConfig.searchQueries.map(query =>
      `${query} ${domainSpecificConfig.additionalTerms.join(' ')}`
    );
    // Filtrar apenas domínios válidos e não usar site: syntax que está causando erro
    const validDomains = domainSpecificConfig.domains.filter(domain =>
      !domain.includes('edu') && domain.includes('.')
    );
    domainFilter = validDomains.length > 0 ? validDomains[0] : undefined;
  } else {
    searchQueries = [
      `complete comprehensive curriculum "${discipline}" ${level} topics modules`,
      `"${subject}" course outline university curriculum`,
      `${discipline} syllabus ${level} academic program`
    ];
  }

  // Busca paralela em múltiplas fontes
  const [
    generalResults,
    academicResults,
    standardsResults,
    practicalResults
  ] = await Promise.all([
    // Busca geral com configuração do domínio
    openaiWebSearch(
      searchQueries[0],
      {
        domain_category: 'all_edu',
        mode: 'agentic_search'
      }
    ),

    // Ementas universitárias
    searchUniversitySyllabi(subject, level),

    // Padrões industriais (se aplicável)
    domainCategory !== 'general'
      ? searchIndustryStandards(subject)
      : openaiWebSearch(`"${subject}" professional requirements certification`),

    // Aplicações práticas
    searchPracticalApplications(subject, userProfile?.background)
  ]);

  // Processar e organizar resultados
  const generalTopics = extractTopicsFromContent(generalResults.content);
  const academicSyllabi = extractTopicsFromContent(academicResults.content);
  const industryStandards = extractTopicsFromContent(standardsResults.content);
  const practicalApplications = extractTopicsFromContent(practicalResults.content);

  // Calcular score de completude
  const completenessScore = calculateCompleteness({
    generalTopics,
    academicSyllabi,
    industryStandards,
    practicalApplications
  });

  console.log(`✅ Busca abrangente concluída: ${generalTopics.length + academicSyllabi.length + industryStandards.length + practicalApplications.length} tópicos totais`);

  return {
    generalTopics,
    academicSyllabi,
    industryStandards,
    practicalApplications,
    sources: {
      academic: [...generalResults.sources, ...academicResults.sources],
      industry: standardsResults.sources,
      practical: practicalResults.sources
    },
    completenessScore
  };
}

/**
 * Validação de completude usando referências web
 */
export async function validateCourseCompleteness(
  courseTopics: string[],
  subject: string,
  level: string
): Promise<{
  score: number;
  missingTopics: string[];
  suggestions: string[];
  referenceSources: SearchSource[];
}> {
  console.log(`🔍 Validando completude do curso: ${subject}`);

  // Buscar currículos de referência
  const referenceSearch = await openaiWebSearch(
    `best comprehensive university curriculum "${subject}" ${level} complete topics essential`,
    {
      domain_category: 'all_edu',
      mode: 'deep_research'
    }
  );

  const referenceTopics = extractTopicsFromContent(referenceSearch.content);
  const missingTopics = findMissingTopics(courseTopics, referenceTopics);

  // Calcular score (percentual de cobertura)
  const score = Math.max(0, (referenceTopics.length - missingTopics.length) / referenceTopics.length);

  // Gerar sugestões
  const suggestions = await generateImprovementSuggestions(missingTopics, subject);

  console.log(`📊 Score de completude: ${(score * 100).toFixed(1)}%`);

  return {
    score,
    missingTopics,
    suggestions,
    referenceSources: referenceSearch.sources
  };
}

// Funções utilitárias
function extractSources(response: any): SearchSource[] {
  try {
    const sources: SearchSource[] = [];

    // Buscar em diferentes locais da resposta
    if (response.choices?.[0]?.message?.tool_calls) {
      response.choices[0].message.tool_calls.forEach((call: any) => {
        if (call.function?.name === 'web_search' && call.function?.arguments) {
          const args = JSON.parse(call.function.arguments);
          if (args.sources) {
            sources.push(...args.sources.map((source: any) => ({
              url: source.url,
              title: source.title || source.url,
              domain: extractDomain(source.url)
            })));
          }
        }
      });
    }

    // Extrair de annotations se disponível
    if (response.output) {
      response.output.forEach((item: any) => {
        if (item.type === 'web_search_call' && item.action?.sources) {
          sources.push(...item.action.sources.map((source: any) => ({
            url: source.url,
            title: source.title || source.url,
            domain: extractDomain(source.url)
          })));
        }
      });
    }

    return sources;
  } catch (error) {
    console.warn('⚠️ Erro ao extrair sources:', error);
    return [];
  }
}

function extractCitations(response: any): Citation[] {
  try {
    const citations: Citation[] = [];

    if (response.output) {
      response.output.forEach((item: any) => {
        if (item.type === 'message' && item.content?.[0]?.annotations) {
          item.content[0].annotations.forEach((annotation: any) => {
            if (annotation.type === 'url_citation') {
              citations.push({
                url: annotation.url,
                title: annotation.title || annotation.url,
                start_index: annotation.start_index,
                end_index: annotation.end_index,
                text_snippet: response.output_text?.substring(
                  annotation.start_index,
                  annotation.end_index
                ) || ''
              });
            }
          });
        }
      });
    }

    return citations;
  } catch (error) {
    console.warn('⚠️ Erro ao extrair citations:', error);
    return [];
  }
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function generateSearchId(): string {
  return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function identifyDomainCategory(subject: string, discipline: string): keyof typeof DOMAIN_SETS | 'general' {
  const text = `${subject} ${discipline}`.toLowerCase();

  if (text.includes('programming') || text.includes('software') || text.includes('development')) {
    return 'programming_resources';
  }
  if (text.includes('engineering') || text.includes('mechanical') || text.includes('civil')) {
    return 'engineering_standards';
  }
  if (text.includes('business') || text.includes('finance') || text.includes('management')) {
    return 'business_finance';
  }
  if (text.includes('medical') || text.includes('health') || text.includes('medicine')) {
    return 'medical_health';
  }
  if (text.includes('research') || text.includes('science') || text.includes('physics')) {
    return 'scientific_research';
  }

  return 'general';
}

function extractTopicsFromContent(content: string): string[] {
  // Extrair tópicos de forma inteligente do conteúdo
  const topics: string[] = [];

  // Padrões comuns para identificar tópicos
  const patterns = [
    /(?:^|\n)\s*[-•*]\s*(.+)/gm,           // Lista com bullets
    /(?:^|\n)\s*\d+\.\s*(.+)/gm,          // Lista numerada
    /(?:^|\n)\s*[A-Z][^.\n]*(?=\n|$)/gm,  // Títulos em maiúscula
    /(?:Course|Module|Chapter|Topic|Section):\s*(.+)/gi  // Marcadores explícitos
  ];

  patterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const cleaned = match.replace(/^[-•*\d.\s]+/, '').trim();
        if (cleaned.length > 5 && cleaned.length < 100) {
          topics.push(cleaned);
        }
      });
    }
  });

  // Se não encontrou muitos tópicos, dividir por sentenças
  if (topics.length < 10) {
    const sentences = content.split(/[.!?]\s+/)
      .filter(s => s.length > 20 && s.length < 150)
      .slice(0, 20);
    topics.push(...sentences);
  }

  // Remover duplicatas e limpar
  return Array.from(new Set(topics))
    .map(topic => topic.trim())
    .filter(topic => topic.length > 5);
}

function calculateCompleteness(results: {
  generalTopics: string[];
  academicSyllabi: string[];
  industryStandards: string[];
  practicalApplications: string[];
}): number {
  const total = results.generalTopics.length +
                results.academicSyllabi.length +
                results.industryStandards.length +
                results.practicalApplications.length;

  // Score baseado na diversidade e quantidade de fontes
  const diversityScore = [
    results.generalTopics.length > 0,
    results.academicSyllabi.length > 0,
    results.industryStandards.length > 0,
    results.practicalApplications.length > 0
  ].filter(Boolean).length / 4;

  const quantityScore = Math.min(total / 50, 1); // 50 tópicos como ideal

  return (diversityScore * 0.4 + quantityScore * 0.6);
}

function findMissingTopics(courseTopics: string[], referenceTopics: string[]): string[] {
  const courseLower = courseTopics.map(t => t.toLowerCase());
  return referenceTopics.filter(refTopic =>
    !courseLower.some(courseTopic =>
      courseTopic.includes(refTopic.toLowerCase()) ||
      refTopic.toLowerCase().includes(courseTopic)
    )
  );
}

async function generateImprovementSuggestions(
  missingTopics: string[],
  subject: string
): Promise<string[]> {
  if (missingTopics.length === 0) return [];

  // Agrupar tópicos similares e gerar sugestões
  const suggestions = [
    `Considere adicionar módulo sobre: ${missingTopics.slice(0, 3).join(', ')}`,
    `Tópicos práticos recomendados: ${missingTopics.filter(t =>
      t.toLowerCase().includes('application') ||
      t.toLowerCase().includes('practice')
    ).slice(0, 2).join(', ')}`,
    `Fundamentos que podem estar faltando: ${missingTopics.slice(-3).join(', ')}`
  ].filter(s => s.length > 30);

  return suggestions;
}