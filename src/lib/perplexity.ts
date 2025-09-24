import { PerplexityResponse, AcademicContent, AcademicReference, WorkedExample, GlossaryItem, ExerciseItem, RecommendedBibliography } from '@/types';
import OpenAI from 'openai';

// Cliente OpenAI para fallback
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Sanitiza texto JSON removendo caracteres de controle e cercas de código
 */
function sanitizeToJson(text: string): string {
  console.log('🔍 ANTES da sanitização (100 chars):', text.substring(0, 100));

  // Remove cercas de código markdown mais agressivamente
  text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').replace(/^```/g, '').replace(/```$/g, '');

  // Remove BOM e espaços iniciais/finais
  text = text.replace(/^\uFEFF/, '').trim();

  // CORREÇÃO CRÍTICA: Remove padrão problemático {\n no início
  if (text.startsWith('{\n')) {
    text = '{' + text.substring(2);
  }

  // SUPER AGRESSIVO: Remove TODOS os escapes problemáticos na entrada
  text = text.replace(/\\bn\\b/g, '').replace(/\\b/g, '').replace(/\b/g, '');

  // NOVO: Remove caracteres problemáticos específicos de forma ultra-agressiva
  // Remove TODOS os backslashes seguidos de qualquer letra (exceto escapes válidos JSON)
  text = text.replace(/\\b/g, '');     // Remove \b (backspace)
  text = text.replace(/\\n/g, ' ');    // Replace \n com espaço por enquanto
  text = text.replace(/\\t/g, ' ');    // Replace \t com espaço
  text = text.replace(/\\r/g, '');     // Remove \r
  text = text.replace(/\\f/g, '');     // Remove \f
  text = text.replace(/\\v/g, '');     // Remove \v

  // Remove caracteres de controle ASCII e Unicode mais agressivamente
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');

  // Remove caracteres problemáticos literais
  text = text.replace(/\b/g, '');      // Backspace literal
  text = text.replace(/\f/g, '');      // Form feed literal
  text = text.replace(/\v/g, '');      // Vertical tab literal
  text = text.replace(/\0/g, '');      // Null character

  // Remove padrões específicos problemáticos vistos nos logs
  text = text.replace(/\\+b/g, '');    // Remove múltiplos \b
  text = text.replace(/\\+n\\+b/g, ''); // Remove \n\b patterns

  // Encontra o primeiro { e último } para extrair apenas o JSON
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
    throw new Error('Não foi possível encontrar JSON válido na resposta');
  }

  text = text.substring(firstBrace, lastBrace + 1);

  // Remove caracteres de controle problemáticos (Unicode)
  text = text.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007f-\u009f]/g, ' ');

  // CORREÇÃO: Não adicionar backslashes desnecessários - deixar quebras reais como espaços
  text = text
    .replace(/\n/g, ' ')               // Converter quebras reais para espaços
    .replace(/\r/g, ' ')               // Converter carriage returns para espaços
    .replace(/\t/g, ' ')               // Converter tabs para espaços
    .replace(/\s+/g, ' ');             // Normalizar múltiplos espaços

  // Normalizar aspas inteligentes para aspas normais
  text = text
    .replace(/[""]/g, '"')             // Smart quotes para aspas normais
    .replace(/['']/g, "'");            // Smart quotes para aspas simples

  // Fix strings quebradas (substitui aspas não fechadas por aspas duplas)
  text = text.replace(/"\s*\n\s*"/g, ' ');
  text = text.replace(/"\s*\n/g, '\\n"');
  text = text.replace(/\n\s*"/g, '"');

  // Remove vírgulas penduradas antes de } ou ]
  text = text.replace(/,(\s*[}\]])/g, '$1');

  // Fix dois pontos seguidos de } ou ] (campos vazios)
  text = text.replace(/:\s*([}\]])/g, ': ""$1');

  return text.trim();
}

/**
 * Parser JSON seguro com sanitização
 */
function safeJsonParse(raw: string): any {
  let clean = '';
  try {
    // Debug: verificar se há padrões problemáticos específicos
    if (raw.includes('\\bn\\b') || raw.includes('\\b')) {
      console.warn('⚠️ Detectados caracteres problemáticos na resposta:', raw.substring(0, 100));
    }

    clean = sanitizeToJson(raw);
    console.log('🔧 JSON sanitizado:', clean.substring(0, 200) + '...');

    // Validação adicional: verificar se ainda há padrões problemáticos
    if (clean.includes('\\b') && !clean.includes('\\"')) {
      console.warn('⚠️ Ainda há caracteres problemáticos após sanitização');
      // Tentar uma limpeza extra para este caso específico
      const extraClean = clean.replace(/\\b/g, '').replace(/\b/g, '');
      return JSON.parse(extraClean);
    }

    return JSON.parse(clean);
  } catch (e) {
    console.error('❌ ERRO CRÍTICO no parsing JSON após todas as tentativas:', e);
    console.error('📄 Texto original (primeiros 500 chars):', raw.substring(0, 500));
    console.error('🔧 Texto sanitizado (primeiros 500 chars):', clean ? clean.substring(0, 500) : 'undefined');
    throw new Error(`JSON parsing falhou: ${e instanceof Error ? e.message : 'Erro desconhecido'}`);
  }
}

/**
 * Fallback usando OpenAI para corrigir/regenerar JSON
 */
async function ensureStructuredJsonOrRegenerate(rawText: string, topic: string): Promise<any> {
  try { 
    return safeJsonParse(rawText); 
  } catch {
    console.log('🔄 Tentando corrigir JSON com OpenAI...');
    
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OpenAI API Key não configurada para fallback');
      throw new Error('JSON inválido e sem fallback OpenAI disponível');
    }
    
    const fix = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Conserte para JSON válido, sem explicações, sem cercas. Mantenha o conteúdo original." },
        { role: "user", content: `Conserte este conteúdo para JSON válido:\n${rawText.substring(0, 3000)}` }
      ],
      temperature: 0
    });
    
    return safeJsonParse(fix.choices[0]?.message?.content ?? '{}');
  }
}

const PERPLEXITY_API_BASE = 'https://api.perplexity.ai/chat/completions';

export interface PerplexitySearchParams {
  query: string;
  model?: string;
  language?: string;
  maxResults?: number;
  siteFilters?: string[];
}

export async function searchRequiredTopics(subject: string, level: string, customPrompt?: string): Promise<string[]> {
  console.log('🔍 Perplexity - Buscando tópicos necessários para:', subject, 'nível:', level);
  console.log('📝 Prompt customizado:', customPrompt ? 'Sim (GPT-generated)' : 'Não (usando padrão)');

  const searchQuery = customPrompt || `Liste todos os tópicos fundamentais e necessários para aprender "${subject}" desde o nível ${level === 'beginner' ? 'iniciante até avançado' : level}.
  Organize os tópicos em uma progressão lógica de aprendizado, do mais básico ao mais avançado.
  Responda APENAS com uma lista numerada dos tópicos, sem explicações adicionais.
  Exemplo de formato:
  1. Conceitos básicos
  2. Fundamentos teóricos
  3. Aplicações práticas
  ...`;

  try {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      console.error('❌ PERPLEXITY_API_KEY não configurada');
      throw new Error('API Key do Perplexity não configurada. Verifique suas variáveis de ambiente.');
    }

    console.log('🌐 Fazendo requisição para buscar tópicos necessários...');
    const response = await fetch(PERPLEXITY_API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em educação e planejamento curricular. Forneça listas estruturadas de tópicos de aprendizado.'
          },
          {
            role: 'user',
            content: searchQuery
          }
        ],
        max_tokens: 1500,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro na busca de tópicos:', errorText);
      throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Extrai os tópicos da resposta
    const topics = extractTopicsFromResponse(content);
    console.log('✅ Tópicos extraídos:', topics);
    
    return topics;
  } catch (error) {
    console.error('Erro ao buscar tópicos necessários no Perplexity:', error);
    throw new Error('Falha ao buscar tópicos necessários. Tente novamente.');
  }
}

/**
 * Constrói query robusta com filtros educacionais
 */
function buildRobustQuery(originalQuery: string, language: string = 'pt', siteFilters?: string[]): string {
  const academicSites = [
    'site:edu.br', 'site:.edu', 'site:scholar.google.com',
    'site:researchgate.net', 'site:arxiv.org', 'site:pubmed.ncbi.nlm.nih.gov'
  ];

  const pdfFilter = 'filetype:pdf';
  const sites = siteFilters || academicSites;

  if (language === 'pt') {
    return `Pesquise conteúdos acadêmicos detalhados sobre "${originalQuery}" em português e inglês. ` +
           `Inclua artigos científicos, papers, livros acadêmicos, ementas universitárias e materiais ` +
           `de universidades reconhecidas. Busque em: ${sites.join(' OR ')} OR ${pdfFilter}. ` +
           `Priorize fontes de alta qualidade acadêmica com autoridade reconhecida.`;
  } else {
    return `Search for detailed academic content about "${originalQuery}". ` +
           `Include scientific articles, research papers, academic books, university syllabi ` +
           `and materials from recognized institutions. Search in: ${sites.join(' OR ')} OR ${pdfFilter}. ` +
           `Prioritize high-quality academic sources with recognized authority.`;
  }
}

export async function searchAcademicContent(params: PerplexitySearchParams): Promise<PerplexityResponse> {
  const {
    query,
    model = 'sonar-pro',
    language = 'pt',
    maxResults = 15,
    siteFilters
  } = params;

  console.log('🔍 Perplexity - Iniciando busca para:', query);
  console.log('🔑 API Key configurada:', !!process.env.PERPLEXITY_API_KEY);

  const searchQuery = buildRobustQuery(query, language, siteFilters);

  console.log('📝 Query preparada:', searchQuery);

  try {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      console.error('❌ PERPLEXITY_API_KEY não configurada');
      throw new Error('API Key do Perplexity não configurada. Verifique suas variáveis de ambiente.');
    }

    console.log('🌐 Fazendo requisição para Perplexity...');
    const response = await fetch(PERPLEXITY_API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente acadêmico especializado. Forneça informações precisas e bem fundamentadas com citações apropriadas.'
          },
          {
            role: 'user',
            content: searchQuery
          }
        ],
        max_tokens: Math.min(4000, Math.max(2000, maxResults * 200)),
        temperature: 0.2,
      }),
    });

    console.log('📡 Status da resposta:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro na resposta do Perplexity:', errorText);
      throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Dados recebidos do Perplexity:', data);
    
    // Extrai citações da resposta
    const citations = extractCitationsFromResponse(data.choices[0].message.content);
    
    return {
      answer: data.choices[0].message.content,
      citations
    };
  } catch (error) {
    console.error('Erro ao buscar conteúdo acadêmico no Perplexity:', error);
    throw new Error('Falha ao buscar conteúdo acadêmico. Tente novamente.');
  }
}

export async function generateAcademicSummary(
  topic: string, 
  perplexityResponse: PerplexityResponse
): Promise<AcademicContent> {
  const systemMessage = `Você é um professor universitário experiente. Explique como em aula, passo a passo, usando analogias, intuição física e rigor. Use LaTeX para fórmulas com \\( ... \\) e \\[ ... \\]. Seja claro e didático.`;
  
  const userPrompt = `
Tópico: "${topic}"
Conteúdo de referência: ${perplexityResponse.answer}

IMPORTANTE: Gere **apenas** um JSON válido UTF-8. Não use cercas de código (\`\`\`), não adicione comentários, não use caracteres de controle.

Schema obrigatório:
{
  "introduction": "2-4 parágrafos: contexto, por que é importante, quando usar",
  "lecture": "AULA COMPLETA: narrativa contínua, com derivação e exemplos intercalados; use \\\\( ... \\\\) e \\\\[ ... \\\\] para fórmulas",
  "keyConcepts": ["itens curtos e objetivos"],
  "workedExamples": [
    {
      "title": "nome do exemplo",
      "statement": "enunciado",
      "solution": "passo a passo com LaTeX"
    }
  ],
  "practicalExamples": ["exemplo 1", "exemplo 2"],
  "commonMisunderstandings": ["erros frequentes", "armadilhas"],
  "exercises": [
    {"statement": "enunciado", "answer": "resposta final objetiva"}
  ],
  "glossary": [{"term":"", "definition":""}],
  "summary": "1-2 parágrafos: o que lembrar"
}

REGRAS CRÍTICAS:
- RESPONDA APENAS COM O JSON (iniciando com { e terminando com })
- NÃO use caracteres de controle (\\b, \\f, \\v)
- NÃO use cercas de código markdown
- NÃO adicione texto antes ou depois do JSON
- Escape quebras de linha como \\n nas strings
- Use apenas aspas duplas (") para strings
- Para referências, use apenas as do conteúdo fornecido
`;

  try {
    console.log('🎯 Gerando aula completa para:', topic);

    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ PERPLEXITY_API_KEY não configurada, usando fallback');
      throw new Error('API Key não disponível');
    }

    const response = await fetch(PERPLEXITY_API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: systemMessage
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        max_tokens: 4000, // Aumentado para aula completa
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Perplexity API error: ${response.status}`, errorText);
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('Resposta vazia do Perplexity');
    }
    
    console.log('📄 Resposta recebida, processando JSON...');
    
    // Usar parser robusto com fallback
    const summaryData = await ensureStructuredJsonOrRegenerate(content, topic);
    
    // Processa referências das citações
    const references: AcademicReference[] = perplexityResponse.citations.map((citation, index) => {
      const authors = extractAuthorsFromTitle(citation.title);
      const year = extractYearFromUrl(citation.url) || new Date().getFullYear();
      
      return {
        title: citation.title,
        authors,
        year,
        url: citation.url,
        type: determineReferenceType(citation.url, citation.title),
      };
    });

    console.log('✅ Conteúdo acadêmico estruturado gerado com sucesso');
    
    return {
      id: `academic-${Date.now()}`,
      topicId: `topic-${Date.now()}`,
      introduction: summaryData.introduction || 'Introdução não disponível',
      lecture: summaryData.lecture || 'Aula completa não disponível',
      keyConcepts: summaryData.keyConcepts || [],
      workedExamples: summaryData.workedExamples || [],
      practicalExamples: summaryData.practicalExamples || [],
      commonMisunderstandings: summaryData.commonMisunderstandings || [],
      exercises: summaryData.exercises || [],
      glossary: summaryData.glossary || [],
      references,
      summary: summaryData.summary || 'Resumo não disponível',
      created_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error('❌ Erro ao gerar conteúdo acadêmico completo:', error);
    
    // Fallback com conteúdo básico quando tudo falha
    console.log('🔄 Gerando conteúdo de fallback...');
    
    return {
      id: `academic-fallback-${Date.now()}`,
      topicId: `topic-${Date.now()}`,
      introduction: `Introdução ao tópico ${topic}. Este conteúdo foi gerado automaticamente devido a problemas na geração dinâmica.`,
      lecture: `Aula sobre ${topic}:\n\nEste é um conteúdo de fallback. O sistema não conseguiu gerar a aula completa no momento.`,
      keyConcepts: [`Conceitos fundamentais de ${topic}`],
      workedExamples: [{
        title: `Exemplo de ${topic}`,
        statement: 'Enunciado não disponível no momento',
        problem: 'Exemplo não disponível no momento',
        solution: 'Solução não disponível no momento',
        keySteps: ['Passo 1: Análise do problema', 'Passo 2: Solução'],
        chapter: 1,
        page: 1,
        relatedTopics: [topic]
      }],
      practicalExamples: [`Exemplo prático de ${topic}`],
      commonMisunderstandings: [`Erros comuns em ${topic}`],
      exercises: [{
        statement: 'Exercício não disponível no momento',
        answer: 'Resposta não disponível no momento'
      }],
      glossary: [{
        term: topic,
        definition: 'Definição não disponível no momento'
      }],
      references: [],
      summary: `Resumo do tópico ${topic}. Este conteúdo de fallback foi gerado automaticamente.`,
      created_at: new Date().toISOString(),
    };
  }
}

function extractCitationsFromResponse(content: string) {
  // Extrai URLs e títulos do conteúdo da resposta
  const urlRegex = /https?:\/\/[^\s\)]+/g;
  const urls = content.match(urlRegex) || [];

  return urls.map((url, index) => {
    const snippet = extractSnippetAroundUrl(content, url);
    const title = extractTitleFromSnippet(snippet) || `Referência ${index + 1}`;

    return {
      title,
      url,
      snippet,
      // Metadados para scoring
      type: determineSourceType(url),
      authority_score: calculateAuthorityScore(url),
      domain: extractDomainFromUrl(url),
      estimated_year: extractYearFromUrl(url) || new Date().getFullYear()
    };
  });
}

function extractSnippetAroundUrl(content: string, url: string) {
  const urlIndex = content.indexOf(url);
  if (urlIndex === -1) return '';
  
  const start = Math.max(0, urlIndex - 100);
  const end = Math.min(content.length, urlIndex + url.length + 100);
  
  return content.substring(start, end).trim();
}

function extractAuthorsFromTitle(title: string): string[] {
  // Tenta extrair autores do título (heurística simples)
  const patterns = [
    /by\s+([^-]+)/i,
    /autor[es]*:\s*([^-\n]+)/i,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:et\s+al\.?|and\s+)/i
  ];
  
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      return match[1].split(/,|\s+and\s+|\s+&\s+/).map(author => author.trim());
    }
  }
  
  return ['Autor não identificado'];
}

function extractYearFromUrl(url: string): number | null {
  const yearMatch = url.match(/\/(\d{4})\//);
  if (yearMatch) {
    const year = parseInt(yearMatch[1]);
    if (year >= 1900 && year <= new Date().getFullYear()) {
      return year;
    }
  }
  return null;
}

function determineReferenceType(url: string, title: string): 'article' | 'paper' | 'book' | 'website' {
  const lowerUrl = url.toLowerCase();
  const lowerTitle = title.toLowerCase();

  if (lowerUrl.includes('doi.org') || lowerUrl.includes('pubmed') || lowerUrl.includes('arxiv')) {
    return 'paper';
  }

  if (lowerUrl.includes('scholar.google') || lowerTitle.includes('journal') || lowerTitle.includes('article')) {
    return 'article';
  }

  if (lowerTitle.includes('book') || lowerTitle.includes('livro')) {
    return 'book';
  }

  return 'website';
}

/**
 * Determina o tipo de fonte para scoring
 */
function determineSourceType(url: string): 'academic_paper' | 'university' | 'educational' | 'commercial' | 'other' {
  const lowerUrl = url.toLowerCase();

  if (lowerUrl.includes('doi.org') || lowerUrl.includes('pubmed') || lowerUrl.includes('arxiv') ||
      lowerUrl.includes('researchgate') || lowerUrl.includes('scholar.google')) {
    return 'academic_paper';
  }

  if (lowerUrl.includes('.edu') || lowerUrl.includes('edu.br') || lowerUrl.includes('university') ||
      lowerUrl.includes('universidade') || lowerUrl.includes('usp.br') || lowerUrl.includes('unicamp.br')) {
    return 'university';
  }

  if (lowerUrl.includes('coursera') || lowerUrl.includes('edx') || lowerUrl.includes('khan') ||
      lowerUrl.includes('mit.edu') || lowerUrl.includes('stanford.edu')) {
    return 'educational';
  }

  if (lowerUrl.includes('.com') || lowerUrl.includes('.org')) {
    return 'commercial';
  }

  return 'other';
}

/**
 * Calcula score de autoridade baseado na URL
 */
function calculateAuthorityScore(url: string): number {
  const lowerUrl = url.toLowerCase();

  // Fontes de alta autoridade (0.8-1.0)
  if (lowerUrl.includes('mit.edu') || lowerUrl.includes('stanford.edu') ||
      lowerUrl.includes('harvard.edu') || lowerUrl.includes('usp.br') ||
      lowerUrl.includes('unicamp.br')) {
    return 0.95;
  }

  // Papers acadêmicos (0.7-0.9)
  if (lowerUrl.includes('doi.org') || lowerUrl.includes('pubmed') ||
      lowerUrl.includes('arxiv') || lowerUrl.includes('researchgate')) {
    return 0.85;
  }

  // Universidades em geral (0.6-0.8)
  if (lowerUrl.includes('.edu') || lowerUrl.includes('edu.br')) {
    return 0.75;
  }

  // Plataformas educacionais (0.5-0.7)
  if (lowerUrl.includes('coursera') || lowerUrl.includes('edx') ||
      lowerUrl.includes('khan') || lowerUrl.includes('scholar.google')) {
    return 0.65;
  }

  // Sites comerciais educacionais (0.3-0.5)
  if (lowerUrl.includes('.org') || lowerUrl.includes('wikipedia')) {
    return 0.45;
  }

  // Outros sites (0.1-0.3)
  return 0.25;
}

/**
 * Extrai domínio da URL
 */
function extractDomainFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url.split('/')[2] || 'unknown';
  }
}

/**
 * Extrai título do snippet quando possível
 */
function extractTitleFromSnippet(snippet: string): string | null {
  // Procura por padrões de título no snippet
  const titlePatterns = [
    /"([^"]{10,100})"/,  // Texto entre aspas
    /^([^.!?]{10,100})[.!?]/,  // Primeira sentença
    /([A-Z][^\n]{10,100})/  // Texto que começa com maiúscula
  ];

  for (const pattern of titlePatterns) {
    const match = snippet.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

function extractTopicsFromResponse(content: string): string[] {
  // Remove quebras de linha extras e normaliza o texto
  const normalizedContent = content.trim();
  
  // Extrai linhas que começam com número seguido de ponto ou parênteses
  const topicRegex = /^\s*\d+[\.\)]\s*(.+)$/gm;
  const matches = normalizedContent.match(topicRegex);
  
  if (matches) {
    return matches.map(match => {
      // Remove o número e limpa o texto
      const cleaned = match.replace(/^\s*\d+[\.\)]\s*/, '').trim();
      return cleaned;
    }).filter(topic => topic.length > 0);
  }
  
  // Fallback: divide por linhas e remove números
  const lines = normalizedContent.split('\n');
  const topics = lines
    .map(line => line.replace(/^\s*[\d\-\*]\s*/, '').trim())
    .filter(line => line.length > 0 && !line.match(/^(resposta|exemplo|formato)/i));
  
  return topics; // Retorna TODOS os tópicos sem limites
}

export interface TopicValidationResult {
  suggestedTopics: string[];
  missingTopics: string[];
  additionalTopics: string[];
  validationSummary: string;
}

export async function validateTopicsWithPerplexity(
  userGoal: string,
  currentTopics: string[],
  level: string,
  assistantId?: string
): Promise<TopicValidationResult> {
  console.log('🔍 Validando tópicos...');
  
  // Se temos um Assistant com arquivos, usar ele para validação mais inteligente
  if (assistantId) {
    console.log('🤖 Usando OpenAI Assistant para validação com base nos arquivos enviados');
    
    try {
      const { askAssistantWithFiles } = await import('@/lib/openai-files');
      
      const validationPrompt = `
Analise os tópicos planejados para o curso "${userGoal}" (nível ${level}) e valide contra o conteúdo dos documentos que você tem acesso:

TÓPICOS ATUALMENTE PLANEJADOS:
${currentTopics.map((topic, i) => `${i + 1}. ${topic}`).join('\n')}

Com base nos documentos enviados, responda no formato JSON:
{
  "missingTopics": ["tópicos importantes que deveriam estar incluídos mas não estão na lista"],
  "additionalTopics": ["tópicos extras que complementariam o aprendizado baseado nos documentos"],
  "validationSummary": "Análise detalhada comparando os tópicos planejados com o conteúdo dos documentos",
  "coverageAnalysis": "Avaliação de quanto os documentos cobrem os tópicos planejados"
}

Foque em identificar lacunas e oportunidades com base no conteúdo real dos documentos.`;

      const result = await askAssistantWithFiles(assistantId, validationPrompt);
      
      // Tentar extrair JSON da resposta
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const validationData = JSON.parse(jsonMatch[0]);
        
        console.log('✅ Validação com arquivos concluída');
        return {
          suggestedTopics: currentTopics, // Usar tópicos atuais como base
          missingTopics: validationData.missingTopics || [],
          additionalTopics: validationData.additionalTopics || [],
          validationSummary: validationData.validationSummary || 'Análise baseada nos arquivos enviados concluída'
        };
      }
    } catch (error) {
      console.error('❌ Erro na validação com Assistant, voltando para Perplexity:', error);
    }
  }

  console.log('🔍 Usando validação simplificada (Perplexity indisponível)...');
  
  // Fallback simples quando Perplexity não está disponível
  try {
    const perplexityTopics = await searchRequiredTopics(userGoal, level);
    
    const validationPrompt = `
Analise os tópicos sugeridos para aprender "${userGoal}" no nível ${level}:

TÓPICOS ATUALMENTE IDENTIFICADOS:
${currentTopics.map((topic, i) => `${i + 1}. ${topic}`).join('\n')}

TÓPICOS RECOMENDADOS PELO PERPLEXITY:
${perplexityTopics.map((topic, i) => `${i + 1}. ${topic}`).join('\n')}

Compare os dois conjuntos e responda no seguinte formato JSON:
{
  "missingTopics": ["tópicos importantes que estão faltando"],
  "additionalTopics": ["tópicos extras que poderiam ser úteis"],
  "validationSummary": "Resumo da análise e recomendações"
}

Foque em identificar lacunas importantes no aprendizado.`;

    const response = await fetch(PERPLEXITY_API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em educação que compara currículos de aprendizado. Responda APENAS com JSON válido.'
          },
          {
            role: 'user',
            content: validationPrompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Resposta não contém JSON válido');
    }

    const validationData = JSON.parse(jsonMatch[0]);
    
    return {
      suggestedTopics: perplexityTopics,
      missingTopics: validationData.missingTopics || [],
      additionalTopics: validationData.additionalTopics || [],
      validationSummary: validationData.validationSummary || 'Análise concluída'
    };
  } catch (perplexityError) {
    console.error('❌ Perplexity indisponível, usando validação básica:', perplexityError);
    
    // Fallback completo - tópicos básicos padrão para Mecânica Vetorial
    const basicTopics = [
      'Conceitos fundamentais de vetores',
      'Operações vetoriais básicas', 
      'Sistemas de forças',
      'Equilíbrio de partículas',
      'Equilíbrio de corpos rígidos',
      'Momento e torque',
      'Centro de gravidade',
      'Análise de estruturas simples'
    ];
    
    return {
      suggestedTopics: basicTopics,
      missingTopics: basicTopics.filter(topic => 
        !currentTopics.some(current => 
          current.toLowerCase().includes(topic.toLowerCase().split(' ')[0])
        )
      ),
      additionalTopics: [],
      validationSummary: 'Validação básica realizada (APIs externas indisponíveis). Tópicos fundamentais identificados.'
    };
  }
}

export interface FileAnalysisResult {
  extractedTopics: string[];
  coverageAnalysis: string;
  recommendations: string[];
  missingFromFiles: string[];
  extraInFiles: string[];
}

/**
 * Analisa documentos para melhorar conteúdo acadêmico
 */
/**
 * Função genérica para chamar a API do Perplexity
 */
export async function callPerplexityAPI(params: {
  prompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<{ content: string; sources?: any[] }> {
  const { prompt, model = 'sonar-pro', maxTokens = 2000, temperature = 0.3 } = params;

  try {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      throw new Error('PERPLEXITY_API_KEY não configurada');
    }

    const response = await fetch(PERPLEXITY_API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente acadêmico especializado. Forneça informações precisas e bem fundamentadas.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';

    return {
      content,
      sources: extractCitationsFromResponse(content)
    };
  } catch (error) {
    console.error('❌ Erro na API do Perplexity:', error);
    throw new Error(`Falha na comunicação com Perplexity: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

export async function enhanceAcademicContentWithFiles(
  assistantId: string,
  topicTitle: string,
  academicContent: AcademicContent,
  subject: string
): Promise<{
  enhancedContent: AcademicContent;
  missingElements: string[];
  additionalFormulas: string[];
  practicalExamples: string[];
}> {
  try {
    console.log(`🔬 Melhorando conteúdo acadêmico para "${topicTitle}" com documentos`);
    
    const { askAssistantWithFiles } = await import('@/lib/openai-files');
    
    const analysisQuery = `
Analise o tópico "${topicTitle}" no contexto de "${subject}" e compare com os documentos que você tem acesso:

CONTEÚDO ACADÊMICO ATUAL:
Introdução: ${academicContent.introduction}
Conceitos-chave: ${academicContent.keyConcepts.join(', ')}
Exemplos práticos: ${academicContent.practicalExamples.join(', ')}

Com base nos documentos, identifique:
1. Fórmulas importantes que deveriam estar incluídas
2. Conceitos adicionais que estão faltando
3. Exemplos práticos específicos dos documentos
4. Erros comuns mencionados nos materiais

Responda no formato JSON:
{
  "missingFormulas": ["fórmula 1", "fórmula 2", "..."],
  "additionalConcepts": ["conceito 1", "conceito 2", "..."],
  "practicalExamples": ["exemplo 1 dos documentos", "exemplo 2", "..."],
  "commonMisunderstandings": ["erro comum 1", "erro comum 2", "..."],
  "enhancedIntroduction": "Introdução melhorada baseada nos documentos"
}
`;

    const result = await askAssistantWithFiles(assistantId, analysisQuery);
    
    // Extrair JSON da resposta
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Resposta não contém JSON válido');
    }

    const analysis = JSON.parse(jsonMatch[0]);
    
    // Criar conteúdo acadêmico melhorado
    const enhancedContent: AcademicContent = {
      ...academicContent,
      introduction: analysis.enhancedIntroduction || academicContent.introduction,
      keyConcepts: [
        ...academicContent.keyConcepts,
        ...(analysis.additionalConcepts || [])
      ],
      practicalExamples: [
        ...academicContent.practicalExamples,
        ...(analysis.practicalExamples || [])
      ],
      commonMisunderstandings: [
        ...academicContent.commonMisunderstandings,
        ...(analysis.commonMisunderstandings || [])
      ]
    };

    console.log(`✅ Conteúdo acadêmico melhorado para "${topicTitle}"`);
    
    return {
      enhancedContent,
      missingElements: analysis.additionalConcepts || [],
      additionalFormulas: analysis.missingFormulas || [],
      practicalExamples: analysis.practicalExamples || []
    };
  } catch (error) {
    console.error(`❌ Erro ao melhorar conteúdo acadêmico para "${topicTitle}":`, error);
    
    // Retornar conteúdo original se falhar
    return {
      enhancedContent: academicContent,
      missingElements: [],
      additionalFormulas: [],
      practicalExamples: []
    };
  }
}

export async function analyzeUploadedFiles(
  files: { name: string; content: string }[],
  plannedTopics: string[],
  subject: string
): Promise<FileAnalysisResult> {
  console.log('📊 Analisando arquivos enviados...');

  if (!files || files.length === 0) {
    return {
      extractedTopics: [],
      coverageAnalysis: 'Nenhum arquivo foi enviado para análise.',
      recommendations: ['Envie arquivos relacionados ao seu objetivo de aprendizado para uma análise mais precisa.'],
      missingFromFiles: plannedTopics,
      extraInFiles: []
    };
  }

  const filesContent = files.map(f => `ARQUIVO: ${f.name}\nCONTEÚDO:\n${f.content.substring(0, 5000)}`).join('\n\n---\n\n');

  const analysisPrompt = `
Analise os seguintes arquivos relacionados ao aprendizado de "${subject}" e compare com os tópicos planejados:

TÓPICOS PLANEJADOS PARA APRENDER:
${plannedTopics.map((topic, i) => `${i + 1}. ${topic}`).join('\n')}

CONTEÚDO DOS ARQUIVOS ENVIADOS:
${filesContent}

Faça uma análise comparativa e responda no formato JSON:
{
  "extractedTopics": ["tópicos identificados nos arquivos"],
  "coverageAnalysis": "Análise de quanto os arquivos cobrem os tópicos planejados",
  "recommendations": ["recomendações baseadas na análise"],
  "missingFromFiles": ["tópicos planejados que não aparecem nos arquivos"],
  "extraInFiles": ["tópicos extras encontrados nos arquivos que podem ser úteis"]
}

Seja preciso na análise e identifique lacunas e oportunidades.`;

  try {
    const response = await fetch(PERPLEXITY_API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em análise educacional que compara conteúdos de aprendizado. Responda APENAS com JSON válido.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Resposta não contém JSON válido');
    }

    const analysisData = JSON.parse(jsonMatch[0]);
    
    return {
      extractedTopics: analysisData.extractedTopics || [],
      coverageAnalysis: analysisData.coverageAnalysis || 'Análise não disponível',
      recommendations: analysisData.recommendations || [],
      missingFromFiles: analysisData.missingFromFiles || [],
      extraInFiles: analysisData.extraInFiles || []
    };
  } catch (error) {
    console.error('Erro na análise dos arquivos:', error);
    return {
      extractedTopics: [],
      coverageAnalysis: 'Não foi possível analisar os arquivos enviados.',
      recommendations: ['Tente novamente ou verifique o formato dos arquivos.'],
      missingFromFiles: plannedTopics,
      extraInFiles: []
    };
  }
}

/**
 * Busca bibliografia recomendada para uma matéria específica
 */
export async function searchRecommendedBooks(
  courseName: string,
  educationLevel: 'high_school' | 'undergraduate' | 'graduate' | 'professional',
  country = 'Brasil'
): Promise<import('@/types').RecommendedBibliography> {
  console.log(`📚 Buscando bibliografia para: ${courseName} (${educationLevel})`);

  try {
    // Construir query específica para bibliografia acadêmica
    const query = buildBibliographyQuery(courseName, educationLevel, country);

    // Buscar no Perplexity com foco em fontes acadêmicas
    const response = await searchAcademicContent({
      query,
      maxResults: 10,
      language: 'pt',
      siteFilters: [
        'site:usp.br',
        'site:unicamp.br',
        'site:ufrj.br',
        'site:ufmg.br',
        'site:puc-rio.br',
        'site:ufsc.br',
        'site:ufrgs.br',
        'site:.edu.br',
        'filetype:pdf "bibliografia" OR "ementa" OR "plano de ensino"',
        'filetype:pdf "livro texto" OR "manual" OR "referência"'
      ]
    });

    // Processar resposta para extrair livros estruturados
    const books = await extractBooksFromResponse(response.answer, courseName, educationLevel);

    return {
      courseName,
      educationLevel,
      country,
      searchDate: new Date().toISOString(),
      books,
      searchSources: response.citations.map(c => c.url),
      confidence: calculateBibliographyConfidence(books, response.citations.length)
    };

  } catch (error) {
    console.error('❌ Erro ao buscar bibliografia:', error);

    // Retornar bibliografia vazia em caso de erro
    return {
      courseName,
      educationLevel,
      country,
      searchDate: new Date().toISOString(),
      books: [],
      searchSources: [],
      confidence: 0
    };
  }
}

/**
 * Constrói query otimizada para busca de bibliografia
 */
function buildBibliographyQuery(
  courseName: string,
  educationLevel: string,
  country: string
): string {
  const levelTerms = {
    'high_school': 'ensino médio',
    'undergraduate': 'graduação faculdade universidade',
    'graduate': 'pós-graduação mestrado doutorado',
    'professional': 'técnico profissionalizante'
  };

  const levelTerm = levelTerms[educationLevel as keyof typeof levelTerms] || 'graduação';

  const baseQuery = `
    Quais são os livros-texto e referências bibliográficas mais utilizados para ensinar "${courseName}"
    em cursos de ${levelTerm} no ${country}?

    Inclua informações sobre:
    1. Livros clássicos e tradicionais da área
    2. Livros modernos mais adotados atualmente
    3. Autores brasileiros ou portugueses relevantes
    4. Edições específicas recomendadas
    5. ISBN quando disponível
    6. Editoras e anos de publicação
    7. Classificação como bibliografia básica, complementar ou de apoio
    8. Universidades que adotam cada livro
    9. Por que cada livro é recomendado (características principais)

    Foque em fontes oficiais como ementas de universidades públicas brasileiras,
    planos de ensino de professores reconhecidos, e documentos curriculares oficiais.
  `;

  return baseQuery.trim();
}

/**
 * Extrai livros estruturados da resposta do Perplexity
 */
async function extractBooksFromResponse(
  response: string,
  courseName: string,
  educationLevel: string
): Promise<import('@/types').RecommendedBibliography['books']> {
  console.log('📖 Extraindo livros da resposta do Perplexity...');

  try {
    // Usar OpenAI para estruturar a resposta em formato JSON
    const structuredResponse = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `Você é um especialista em bibliografia acadêmica. Analise a resposta sobre livros-texto e extraia informações estruturadas em JSON.`
        },
        {
          role: 'user',
          content: `
            Analise esta resposta sobre bibliografia para "${courseName}" (${educationLevel}) e extraia informações sobre livros em formato JSON.

            Resposta a analisar:
            ${response}

            IMPORTANTE: Gere APENAS um JSON válido, sem cercas de código ou comentários.

            Schema:
            {
              "books": [
                {
                  "title": "título completo do livro",
                  "author": "autor(es) completo(s)",
                  "isbn": "ISBN se mencionado",
                  "year": ano de publicação (número),
                  "publisher": "editora",
                  "edition": "edição específica",
                  "category": "primary" | "secondary" | "supplementary" | "reference",
                  "adoptionRate": "high" | "medium" | "low",
                  "universities": ["lista de universidades que adotam"],
                  "description": "breve descrição do livro",
                  "reasons": ["motivos pelos quais é recomendado"]
                }
              ]
            }

            Categorias:
            - primary: Bibliografia básica/obrigatória
            - secondary: Bibliografia complementar
            - supplementary: Material de apoio
            - reference: Obra de referência/consulta

            AdoptionRate baseado na frequência mencionada:
            - high: Muito citado, usado em várias universidades
            - medium: Moderadamente citado
            - low: Pouco citado mas relevante
          `
        }
      ],
      max_tokens: 2000,
      temperature: 0.1
    });

    const jsonResponse = structuredResponse.choices[0].message.content?.trim() || '{"books": []}';
    const cleanJson = sanitizeToJson(jsonResponse);

    const parsedData = JSON.parse(cleanJson);

    console.log(`✅ Extraídos ${parsedData.books?.length || 0} livros da bibliografia`);

    return parsedData.books || [];

  } catch (error) {
    console.error('❌ Erro ao extrair livros:', error);
    return [];
  }
}

/**
 * Calcula confiança da bibliografia baseada na qualidade das fontes
 */
function calculateBibliographyConfidence(
  books: any[],
  citationCount: number
): number {
  if (books.length === 0) return 0;

  let confidence = 50; // Base

  // Mais livros = mais confiança
  confidence += Math.min(books.length * 5, 30);

  // Mais citações = mais confiança
  confidence += Math.min(citationCount * 3, 20);

  // Livros com ISBN = mais confiança
  const booksWithIsbn = books.filter(b => b.isbn).length;
  confidence += (booksWithIsbn / books.length) * 10;

  // Livros de categoria primary = mais confiança
  const primaryBooks = books.filter(b => b.category === 'primary').length;
  confidence += (primaryBooks / books.length) * 10;

  return Math.min(Math.round(confidence), 100);
}

/**
 * Busca bibliografia universitária usando Perplexity
 */
export async function searchUniversityBibliography(
  courseName: string,
  educationLevel: 'high_school' | 'undergraduate' | 'graduate' | 'professional'
): Promise<RecommendedBibliography> {
  try {
    console.log(`📚 Buscando bibliografia universitária para "${courseName}" (${educationLevel})`);

    // Mapear nível educacional para termos de busca
    const levelTerms = {
      high_school: 'ensino médio vestibular',
      undergraduate: 'graduação universidade',
      graduate: 'pós-graduação mestrado doutorado',
      professional: 'técnico profissionalizante'
    };

    // Query focada em ementas e bibliografias oficiais
    const query = `bibliografia ementa syllabus "${courseName}" ${levelTerms[educationLevel]} site:edu.br OR site:.edu OR filetype:pdf`;

    const searchOptions = {
      query,
      language: 'pt' as const
    };

    console.log(`🔍 Query Perplexity: "${query}"`);

    // Buscar usando Perplexity
    const perplexityResponse = await searchAcademicContent(searchOptions);

    // Extrair livros das citações e texto
    const extractedBooks = extractBooksFromPerplexityResponse(perplexityResponse, courseName);

    // Enriquecer com informações adicionais
    const enrichedBooks = await enrichBookInformation(extractedBooks);

    const bibliography: RecommendedBibliography = {
      courseName,
      educationLevel,
      country: 'Brasil',
      searchDate: new Date().toISOString(),
      books: enrichedBooks,
      searchSources: perplexityResponse.citations?.map(c => c.url) || [],
      confidence: calculateBibliographyConfidence(enrichedBooks, perplexityResponse.citations?.length || 0)
    };

    console.log(`✅ Perplexity encontrou ${bibliography.books.length} livros com confiança ${bibliography.confidence}%`);
    bibliography.books.forEach((book, index) => {
      console.log(`   ${index + 1}. ${book.title} - ${book.author} (${book.adoptionRate})`);
    });

    return bibliography;

  } catch (error) {
    console.error('❌ Erro ao buscar bibliografia universitária:', error);

    // Retornar resultado vazio em caso de erro
    return {
      courseName,
      educationLevel,
      country: 'Brasil',
      searchDate: new Date().toISOString(),
      books: [],
      searchSources: [],
      confidence: 0
    };
  }
}

/**
 * Extrai informações de livros da resposta do Perplexity
 */
function extractBooksFromPerplexityResponse(
  response: PerplexityResponse,
  courseName: string
): RecommendedBibliography['books'] {
  const books: RecommendedBibliography['books'] = [];
  const text = response.answer;

  // Padrões para extrair livros
  const bookPatterns = [
    // "Título" por Autor (Ano)
    /"([^"]+)"\s*(?:de|por|by)\s*([^(]+)\s*\((\d{4})\)/gi,
    // Título - Autor, Editora, Ano
    /([A-Z][^-\n]+)\s*-\s*([^,\n]+),\s*([^,\n]+),\s*(\d{4})/gi,
    // AUTOR, Nome. Título. Editora, Ano.
    /([A-Z][A-Z\s,]+)\.\s*([^.]+)\.\s*([^,]+),\s*(\d{4})/gi
  ];

  for (const pattern of bookPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const book = parseBookMatch(match, courseName);
      if (book && !books.some(b => b.title === book.title)) {
        books.push(book);
      }
    }
  }

  // Se não encontrou livros específicos, tentar extração mais geral
  if (books.length === 0) {
    const generalBooks = extractGeneralBookReferences(text, courseName);
    books.push(...generalBooks);
  }

  return books; // Retorna TODOS os livros sem limites
}

/**
 * Parseia um match de livro extraído
 */
function parseBookMatch(match: RegExpMatchArray, courseName: string): RecommendedBibliography['books'][0] | null {
  try {
    const [, title, author, yearOrPublisher, year] = match;

    return {
      title: title.trim(),
      author: author.trim(),
      year: parseInt(year || yearOrPublisher) || undefined,
      publisher: year ? yearOrPublisher?.trim() : undefined,
      category: 'primary' as const,
      adoptionRate: 'medium' as const,
      universities: [],
      reasons: [`Encontrado em bibliografia de ${courseName}`],
      description: `Livro referenciado em materiais acadêmicos de ${courseName}`
    };
  } catch (error) {
    console.warn('⚠️ Erro ao parsear livro:', error);
    return null;
  }
}

/**
 * Extração geral de referências de livros quando padrões específicos falham
 */
function extractGeneralBookReferences(text: string, courseName: string): RecommendedBibliography['books'] {
  const books: RecommendedBibliography['books'] = [];

  // Palavras-chave que indicam livros acadêmicos
  const academicKeywords = ['livro', 'textbook', 'manual', 'handbook', 'principles', 'introduction', 'fundamentos'];

  const sentences = text.split(/[.!?]/);

  for (const sentence of sentences) {
    const hasAcademicKeyword = academicKeywords.some(keyword =>
      sentence.toLowerCase().includes(keyword)
    );

    if (hasAcademicKeyword && sentence.length > 20 && sentence.length < 200) {
      // Tentar extrair título e autor de forma heurística
      const cleanSentence = sentence.trim();
      if (cleanSentence.includes(' - ') || cleanSentence.includes(' por ') || cleanSentence.includes(' de ')) {
        books.push({
          title: cleanSentence.substring(0, Math.min(100, cleanSentence.length)),
          author: 'Autor não identificado',
          category: 'secondary' as const,
          adoptionRate: 'low' as const,
          universities: [],
          reasons: [`Mencionado em contexto de ${courseName}`],
          description: `Referência extraída: ${cleanSentence}`
        });
      }
    }
  }

  return books; // Retorna TODAS as referências sem limites
}

/**
 * Enriquece informações dos livros com dados adicionais
 */
async function enrichBookInformation(
  books: RecommendedBibliography['books']
): Promise<RecommendedBibliography['books']> {
  // Por enquanto, retorna os livros como estão
  // Em uma implementação futura, poderia buscar ISBNs, editoras, etc.
  return books.map(book => ({
    ...book,
    adoptionRate: book.title.toLowerCase().includes('introdução') ||
                  book.title.toLowerCase().includes('fundamentos') ? 'high' as const :
                  book.adoptionRate
  }));
}