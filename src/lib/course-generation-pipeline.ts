import OpenAI from 'openai';
// import { getAvailableModel, calculateSafeTokenLimit, estimateCost } from './model-utils'; // ARCHIVED
import { searchRequiredTopics } from './perplexity';
import {
  comprehensiveCurriculumSearch,
  validateCourseCompleteness,
  searchUniversitySyllabi,
  searchIndustryStandards,
  searchPracticalApplications,
  openaiWebSearch
} from './openai-web-search';
// import { WebSearch } from './websearch'; // ARCHIVED

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Configurações via ENV com fallbacks
const CONFIG = {
  // Thresholds para processamento
  MIN_TOPICS_FOR_CLUSTERING: parseInt(process.env.MIN_TOPICS_FOR_CLUSTERING || '30'),
  TARGET_MODULES_MIN: parseInt(process.env.TARGET_MODULES_MIN || '12'),
  TARGET_MODULES_MAX: parseInt(process.env.TARGET_MODULES_MAX || '20'),
  SIMILARITY_THRESHOLD: parseFloat(process.env.SIMILARITY_THRESHOLD || '0.88'),

  // Limites de tokens
  MAX_TOKENS_PER_MODULE: parseInt(process.env.MAX_TOKENS_PER_MODULE || '1600'),
  MIN_TOKENS_PER_MODULE: parseInt(process.env.MIN_TOKENS_PER_MODULE || '800'),

  // Qualidade
  MIN_QUALITY_SCORE: parseFloat(process.env.MIN_QUALITY_SCORE || '8.0'),
  MIN_TOPICS_PER_MODULE: parseInt(process.env.MIN_TOPICS_PER_MODULE || '8'),
  MIN_MODULES_FOR_COMPLETE_COURSE: parseInt(process.env.MIN_MODULES_FOR_COMPLETE_COURSE || '15'),
};

/**
 * Extrai o assunto principal da mensagem do usuário
 */
export async function extractSubject(userMessage: string): Promise<{
  subject: string;
  hasUsefulContext: boolean;
  context?: string;
}> {
  console.log(`🤖 Extraindo assunto com GPT...`);
  console.log(`🔍 Extraindo assunto da mensagem: "${userMessage.substring(0, 100)}..."`);

  const model = 'gpt-4o-mini'; // Fallback model

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `Extraia o assunto principal que o usuário quer aprender.

Retorne em JSON:
{
  "subject": "assunto extraído",
  "hasUsefulContext": true/false,
  "context": "contexto útil se houver (nível, objetivo, etc)"
}

Exemplos:
- "Quero aprender química para faculdade" → {"subject": "química", "hasUsefulContext": true, "context": "para faculdade"}
- "Preciso estudar cálculo 2" → {"subject": "cálculo 2", "hasUsefulContext": false}
- "Mecânica vetorial estática nível graduação" → {"subject": "mecânica vetorial estática", "hasUsefulContext": true, "context": "nível graduação"}`
      },
      {
        role: 'user',
        content: userMessage
      }
    ],
    max_tokens: 200,
    temperature: 0.1,
    response_format: { type: "json_object" }
  });

  const response = JSON.parse(completion.choices[0]?.message?.content || '{}');

  console.log(`✅ Assunto extraído: "${response.subject}" | Contexto útil: ${response.hasUsefulContext}`);
  if (response.context) {
    console.log(`📝 Contexto útil: ${response.context}`);
  }

  return response;
}

/**
 * Detecta a disciplina acadêmica específica
 */
export async function detectAcademicDiscipline(
  subject: string,
  userProfile: any,
  fullMessage: string
): Promise<{
  discipline: string;
  confidence: number;
  isAcademic: boolean;
}> {
  console.log(`🎓 Detectando disciplina com GPT...`);

  const model = 'gpt-4o-mini'; // Fallback model

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `Identifique a disciplina acadêmica específica baseada no contexto.

Retorne em JSON:
{
  "discipline": "nome oficial da disciplina",
  "confidence": 0.95,
  "isAcademic": true/false
}

Exemplos:
- "cálculo 2" + graduação → {"discipline": "Cálculo 2", "confidence": 0.95, "isAcademic": true}
- "mecânica vetorial estática" + engenharia → {"discipline": "Mecânica Vetorial Estática", "confidence": 0.9, "isAcademic": true}
- "python básico" → {"discipline": "Programação em Python", "confidence": 0.7, "isAcademic": false}`
      },
      {
        role: 'user',
        content: `Assunto: ${subject}
Nível educacional: ${userProfile.educationLevel || 'não informado'}
Objetivo: ${userProfile.purpose || 'não informado'}
Contexto completo: ${fullMessage}`
      }
    ],
    max_tokens: 200,
    temperature: 0.1,
    response_format: { type: "json_object" }
  });

  const response = JSON.parse(completion.choices[0]?.message?.content || '{}');

  console.log(`✅ Disciplina detectada: "${response.discipline}" (confiança: ${response.confidence})`);
  console.log(`🏛️ É disciplina acadêmica: ${response.isAcademic}`);

  return response;
}

/**
 * Busca tópicos referenciais via Perplexity + OpenAI Web Search (Híbrido V2)
 */
export async function fetchReferenceTopics(
  subject: string,
  discipline: string,
  educationLevel: string,
  academicDomain?: keyof typeof DOMAIN_CONFIGS | 'general'
): Promise<string[]> {
  console.log(`📚 Buscando tópicos acadêmicos com sistema híbrido (Perplexity + Web Search)...`);

  const allTopics: string[] = [];

  // 1. Busca via Perplexity (mantém funcionalidade original)
  console.log(`🔍 Fase 1: Buscando via Perplexity...`);
  try {
    const searchQuery = `Extraia dos melhores sites que ensinam ${subject}, para ${educationLevel}, da disciplina: ${discipline}.
Liste TODOS os módulos, tópicos e sub-tópicos ensinados, organizados do nível iniciante → intermediário → avançado.
Inclua:
- Todos os capítulos e seções de cursos universitários
- Tópicos de ementas oficiais
- Conteúdo de livros-texto recomendados
- Exercícios e aplicações práticas
Organize em uma lista completa e detalhada.`;

    const perplexityResponse = await searchRequiredTopics(subject, educationLevel, searchQuery);

    if (perplexityResponse && perplexityResponse.length > 0) {
      allTopics.push(...perplexityResponse);
      console.log(`✅ ${perplexityResponse.length} tópicos encontrados via Perplexity`);
    }
  } catch (error) {
    console.log(`⚠️ Perplexity indisponível:`, error);
  }

  // 2. Busca abrangente via OpenAI Web Search com configurações do domínio (novo sistema V2)
  console.log(`🌐 Fase 2: Buscando via OpenAI Web Search...`);
  try {
    // Usar configurações específicas do domínio se disponível
    let searchConfig = undefined;
    if (academicDomain && academicDomain !== 'general') {
      searchConfig = await generateDomainSpecificSearch(discipline, subject, educationLevel);
      console.log(`🎓 Usando busca especializada para domínio: ${academicDomain}`);
      console.log(`🔍 Domínios de busca: ${searchConfig.domains.join(', ')}`);
      console.log(`📚 Termos adicionais: ${searchConfig.additionalTerms.join(', ')}`);
    }

    const webSearchResults = await comprehensiveCurriculumSearch(
      subject,
      discipline,
      educationLevel,
      undefined, // userProfile
      searchConfig // Configurações específicas do domínio
    );

    // Combinar todos os tópicos das diferentes fontes
    const webTopics = [
      ...webSearchResults.generalTopics,
      ...webSearchResults.academicSyllabi,
      ...webSearchResults.industryStandards,
      ...webSearchResults.practicalApplications
    ];

    if (webTopics.length > 0) {
      allTopics.push(...webTopics);
      console.log(`✅ ${webTopics.length} tópicos encontrados via Web Search`);
      console.log(`📊 Score de completude: ${(webSearchResults.completenessScore * 100).toFixed(1)}%`);
    }
  } catch (error) {
    console.log(`⚠️ Web Search indisponível:`, error);
  }

  // 3. Busca adicional direcionada se poucos tópicos foram encontrados
  if (allTopics.length < 20) {
    console.log(`📈 Fase 3: Busca adicional direcionada (poucos tópicos encontrados)...`);
    try {
      const additionalResults = await Promise.all([
        // Busca específica por ementas
        searchUniversitySyllabi(subject, educationLevel),
        // Busca por aplicações práticas
        searchPracticalApplications(subject),
        // Busca geral mais específica
        openaiWebSearch(
          `"${discipline}" essential topics must learn ${educationLevel} comprehensive curriculum`,
          { domain_category: 'all_edu', mode: 'agentic_search' }
        )
      ]);

      const additionalTopics = additionalResults.flatMap(result =>
        result.content.split('\n').filter(line => line.trim().length > 10)
      );

      if (additionalTopics.length > 0) {
        allTopics.push(...additionalTopics);
        console.log(`✅ ${additionalTopics.length} tópicos adicionais encontrados`);
      }
    } catch (error) {
      console.log(`⚠️ Busca adicional falhou:`, error);
    }
  }

  // 4. Processamento e limpeza dos tópicos
  const uniqueTopics = removeDuplicateTopics(allTopics);
  const cleanedTopics = cleanAndValidateTopics(uniqueTopics);

  console.log(`🎯 Total: ${cleanedTopics.length} tópicos únicos encontrados (${allTopics.length} antes da limpeza)`);

  // 5. Verificar se há tópicos suficientes para o domínio
  const minTopicsForDomain = academicDomain && academicDomain !== 'general' ? 30 : 20;

  if (cleanedTopics.length < minTopicsForDomain) {
    console.log(`📈 Poucos tópicos encontrados (${cleanedTopics.length}), gerando tópicos adicionais via GPT...`);
    const additionalTopics = await generateAdditionalTopicsForDomain(
      subject,
      discipline,
      educationLevel,
      academicDomain || 'general',
      minTopicsForDomain - cleanedTopics.length
    );
    cleanedTopics.push(...additionalTopics);
    console.log(`✅ ${additionalTopics.length} tópicos adicionais gerados via GPT`);
  }

  // 6. Fallback se ainda nada foi encontrado
  if (cleanedTopics.length === 0) {
    console.log(`⚠️ Nenhum tópico encontrado, gerando tópicos básicos via GPT...`);
    return await generateFallbackTopics(subject, discipline, educationLevel);
  }

  return cleanedTopics;
}

/**
 * Gera tópicos adicionais específicos para o domínio acadêmico
 */
async function generateAdditionalTopicsForDomain(
  subject: string,
  discipline: string,
  educationLevel: string,
  academicDomain: keyof typeof DOMAIN_CONFIGS | 'general',
  numTopics: number
): Promise<string[]> {
  console.log(`🧠 Gerando ${numTopics} tópicos adicionais para domínio ${academicDomain}...`);

  const model = 'gpt-4o-mini';

  // Usar configurações específicas do domínio se disponível
  let domainContext = '';
  if (academicDomain && academicDomain !== 'general') {
    const config = DOMAIN_CONFIGS[academicDomain];
    domainContext = `
Contexto do domínio ${config.name}:
- Termos importantes: ${config.additionalSearchTerms.join(', ')}
- Competências necessárias: ${config.skillFocus.join(', ')}
- Tem padrões industriais: ${config.industryStandards ? 'Sim' : 'Não'}
- Tem trabalho prático: ${config.labWork ? 'Sim' : 'Não'}
- Balanceamento teoria/prática: ${Math.round(config.moduleStructure.theory * 100)}% teoria, ${Math.round(config.moduleStructure.practice * 100)}% prática`;
  }

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `Você é um especialista acadêmico em ${discipline}.

Gere uma lista de ${numTopics} tópicos específicos e avançados para um curso de ${discipline} nível ${educationLevel}.

${domainContext}

Retorne APENAS uma lista em JSON:
{
  "topics": [
    "Tópico específico 1",
    "Tópico específico 2",
    ...
  ]
}

IMPORTANTE:
- Tópicos devem ser específicos e não genéricos
- Incluir aspectos práticos, normas e aplicações específicas da área
- Focar em competências e habilidades específicas do domínio
- Evitar tópicos muito básicos`
      },
      {
        role: 'user',
        content: `Disciplina: ${discipline}
Assunto: ${subject}
Nível: ${educationLevel}
Domínio: ${academicDomain}

Gere ${numTopics} tópicos específicos adicionais que um estudante precisa dominar nesta área.`
      }
    ],
    max_tokens: 2000,
    temperature: 0.7,
    response_format: { type: "json_object" }
  });

  try {
    const result = JSON.parse(completion.choices[0]?.message?.content || '{"topics": []}');
    return result.topics || [];
  } catch (error) {
    console.error('❌ Erro ao parsear tópicos adicionais do domínio:', error);
    return [];
  }
}

/**
 * Remove tópicos duplicados usando similaridade semântica
 */
function removeDuplicateTopics(topics: string[]): string[] {
  const unique: string[] = [];
  const seen = new Set<string>();

  for (const topic of topics) {
    const normalized = topic.toLowerCase().trim();
    if (normalized.length < 5) continue;

    // Verificar duplicatas exatas
    if (seen.has(normalized)) continue;

    // Verificar similaridade com tópicos já adicionados
    const isDuplicate = unique.some(existingTopic => {
      const existing = existingTopic.toLowerCase();
      return (
        normalized.includes(existing) ||
        existing.includes(normalized) ||
        calculateStringSimilarity(normalized, existing) > 0.8
      );
    });

    if (!isDuplicate) {
      unique.push(topic.trim());
      seen.add(normalized);
    }
  }

  return unique;
}

/**
 * Limpa e valida tópicos removendo conteúdo inválido
 */
function cleanAndValidateTopics(topics: string[]): string[] {
  return topics
    .map(topic => topic.trim())
    .filter(topic => {
      // Filtros de qualidade
      if (topic.length < 5 || topic.length > 200) return false;
      if (/^[\d.\-\s]+$/.test(topic)) return false; // Apenas números/pontuação
      if (topic.includes('http')) return false; // URLs
      if (topic.match(/^[^a-zA-Z]*$/)) return false; // Sem letras

      // Remover marcadores de lista
      return true;
    })
    .map(topic => {
      // Limpar marcadores comuns
      return topic
        .replace(/^[-•*\d.\s]+/, '')
        .replace(/^\w+\)?\s*/, '') // Remove "a)" "1)" etc
        .trim();
    })
    .filter(topic => topic.length > 5);
}

/**
 * Calcula similaridade entre duas strings
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calcula distância de Levenshtein entre duas strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Gera tópicos básicos via GPT como fallback
 */
async function generateFallbackTopics(
  subject: string,
  discipline: string,
  educationLevel: string
): Promise<string[]> {
  console.log(`🆘 Gerando tópicos de fallback via GPT para ${discipline}`);

  const model = 'gpt-4o-mini';

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `Gere uma lista de 30-50 tópicos essenciais para um curso de ${discipline} no nível ${educationLevel}.

Retorne apenas a lista de tópicos, um por linha, sem numeração ou marcadores.
Organize do básico ao avançado.
Inclua tópicos teóricos e práticos.
Foque em conceitos fundamentais da área.`
      },
      {
        role: 'user',
        content: `Discipline: ${discipline}
Subject: ${subject}
Level: ${educationLevel}

Gere tópicos essenciais para esta disciplina.`
      }
    ],
    max_tokens: 1500,
    temperature: 0.3
  });

  const content = completion.choices[0]?.message?.content || '';
  const topics = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 5 && !line.match(/^[\d.\-\s]+$/));

  console.log(`✅ ${topics.length} tópicos de fallback gerados`);
  return topics;
}

/**
 * Busca e valida recomendações de livros
 */
export async function fetchBookRecommendations(
  discipline: string,
  educationLevel: string,
  topics: string[]
): Promise<{
  books: Array<{
    title: string;
    authors: string;
    year: string;
    isbn?: string;
    confidence: number;
  }>;
  summaries: string[];
}> {
  console.log(`📚 Buscando recomendações de livros...`);

  const model = 'gpt-4o'; // Fallback model

  // Passo 1: Buscar recomendações via Perplexity
  const bookQuery = `Quais são os melhores livros universitários para aprender ${discipline} no nível ${educationLevel}?
Inclua: título completo, autores, ano, editora, ISBN se disponível.
Foque em livros amplamente adotados em universidades.`;

  let bookList: any[] = [];

  try {
    console.log(`🔍 Buscando livros via Perplexity para ${discipline}...`);
    const perplexityBooks = await searchRequiredTopics(discipline, educationLevel, bookQuery);
    if (perplexityBooks && perplexityBooks.length > 0) {
      console.log(`📖 ${perplexityBooks.length} respostas sobre livros encontradas`);
      // Processar resposta do Perplexity para extrair livros
      // Verificar se já temos livros estruturados na resposta
      const fullText = perplexityBooks.join('\n');
      const hasStructuredBooks = fullText.includes('Autores:') || fullText.includes('**Autor') || fullText.includes('ISBN:');

      if (hasStructuredBooks) {
        console.log(`📚 Livros estruturados detectados, extraindo...`);
        const booksCompletion = await openai.chat.completions.create({
          model,
          messages: [
            {
              role: 'system',
              content: `Extraia TODAS as informações de livros do texto fornecido.
O texto já contém livros bem formatados. Extraia cada livro mencionado.

Retorne em JSON:
{
  "books": [
    {
      "title": "título completo exato",
      "authors": "nomes completos dos autores",
      "year": "ano de publicação",
      "isbn": "ISBN se mencionado",
      "confidence": 0.95
    }
  ]
}

IMPORTANTE: Extraia TODOS os livros mencionados, não apenas os primeiros.`
            },
            {
              role: 'user',
              content: fullText
            }
          ],
          max_tokens: 2000,
          temperature: 0.1,
          response_format: { type: "json_object" }
        });

        const extracted = JSON.parse(booksCompletion.choices[0]?.message?.content || '{"books": []}');
        bookList = extracted.books || [];
        console.log(`✅ ${bookList.length} livros extraídos do Perplexity`);
      } else {
        console.log(`📝 Resposta não estruturada, tentando extrair informações...`);
        // Tentar extrair mesmo assim
        const extractionCompletion = await openai.chat.completions.create({
          model,
          messages: [
            {
              role: 'system',
              content: `Analise o texto e identifique menções a livros acadêmicos.

Retorne em JSON:
{
  "books": [
    {
      "title": "título mencionado",
      "authors": "autores se mencionados",
      "year": "ano se mencionado",
      "isbn": "",
      "confidence": 0.7
    }
  ]
}`
            },
            {
              role: 'user',
              content: fullText.substring(0, 3000) // Limitar tamanho
            }
          ],
          max_tokens: 1000,
          temperature: 0.1,
          response_format: { type: "json_object" }
        });

        const extracted = JSON.parse(extractionCompletion.choices[0]?.message?.content || '{"books": []}');
        bookList = extracted.books || [];
      }
    }
  } catch (error) {
    console.log(`⚠️ Erro ao buscar livros via Perplexity`);
  }

  // Se não encontrou livros suficientes, gerar com GPT baseado nos tópicos
  if (bookList.length < 3) {
    console.log(`📖 Gerando recomendações de livros com GPT...`);

    const gptBooksCompletion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `Você é um bibliotecário acadêmico especializado. Recomende os 5 melhores livros universitários para a disciplina especificada.

Retorne em JSON:
{
  "books": [
    {
      "title": "título completo do livro",
      "authors": "nome completo dos autores",
      "year": "ano de publicação",
      "isbn": "ISBN se conhecido",
      "confidence": 0.85
    }
  ]
}

Use livros REAIS e amplamente adotados em universidades.`
        },
        {
          role: 'user',
          content: `Disciplina: ${discipline}
Nível: ${educationLevel}
Tópicos abordados: ${topics.slice(0, 10).join(', ')}`
        }
      ],
      max_tokens: 1000,
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const gptBooks = JSON.parse(gptBooksCompletion.choices[0]?.message?.content || '{"books": []}');
    bookList = [...bookList, ...(gptBooks.books || [])];
  }

  // Passo 2: Buscar sumários dos livros
  const summaries: string[] = [];

  // Tentar buscar todos os sumários via Perplexity primeiro
  if (bookList.length > 0) {
    const summaryPrompt = `Liste o sumário/índice completo dos seguintes livros acadêmicos:
${bookList.slice(0, 5).map((b: any) => `- ${b.title} (${b.authors})`).join('\n')}

Para cada livro, forneça:
1. Lista de capítulos principais
2. Principais tópicos abordados
3. Estrutura do conteúdo`;

    try {
      console.log(`📚 Buscando sumários via Perplexity...`);
      const perplexitySummaries = await searchRequiredTopics(discipline, educationLevel, summaryPrompt);

      if (perplexitySummaries && perplexitySummaries.length > 0) {
        // Adicionar sumários do Perplexity
        summaries.push(...perplexitySummaries.slice(0, 5));
        console.log(`✅ ${summaries.length} sumários encontrados via Perplexity`);
      }
    } catch (error) {
      console.log(`⚠️ Perplexity indisponível para sumários, tentando busca web...`);

      // Fallback para busca web apenas se Perplexity falhar
      for (const book of bookList.slice(0, 3)) {
        try {
          // ARCHIVED: WebSearch não disponível na V1
          // const summaryQuery = `"${book.title}" "${book.authors}" table of contents chapters outline`;
          // const webSearch = new WebSearch();
          // const results = await webSearch.search(summaryQuery, { maxResults: 2 });
          // for (const result of results) {
          //   if (result.snippet && result.snippet.length > 100) {
          //     summaries.push(`[${book.title}] ${result.snippet}`);
          //   }
          // }

          // Fallback simples para V1
          summaries.push(`[${book.title}] Livro recomendado pelos autores ${book.authors}`);
        } catch (webError) {
          console.log(`⚠️ Erro ao buscar sumário de ${book.title}`);
        }
      }
    }
  }

  console.log(`✅ ${bookList.length} livros recomendados, ${summaries.length} sumários encontrados`);

  return {
    books: bookList.slice(0, 5),
    summaries
  };
}

/**
 * Analisa documentos enviados via OpenAI Assistant
 */
async function analyzeUploadedDocuments(
  uploadedFiles: any[],
  subject: string,
  discipline: string
): Promise<{ topics: string[]; analysis: string }> {
  console.log(`🤖 Analisando documentos com OpenAI Assistant...`);

  const topics: string[] = [];
  let analysis = '';

  for (const file of uploadedFiles) {
    try {
      // Se o arquivo tem assistantId, usar para fazer query
      if (file.assistantId && file.vectorStoreId) {
        console.log(`🔍 Consultando Assistant para ${file.name}...`);

        const queryResult = await queryOpenAIAssistant(
          file.assistantId,
          `Analise este documento sobre ${subject}/${discipline} e extraia:
1. Todos os tópicos principais e subtópicos mencionados
2. Conceitos fundamentais abordados
3. Como estes tópicos se relacionam com ${discipline}

Liste os tópicos de forma estruturada e detalhada.`,
          file.vectorStoreId
        );

        if (queryResult.topics) {
          topics.push(...queryResult.topics);
          analysis += `[${file.name}] ${queryResult.analysis}\n\n`;
        }
      } else {
        // Fallback: análise simples do conteúdo extraído
        console.log(`📄 Analisando conteúdo textual de ${file.name}...`);
        const content = file.content || file.rawText || '';

        if (content.length > 100) {
          const simpleAnalysis = await extractTopicsFromText(content, subject, discipline);
          topics.push(...simpleAnalysis.topics);
          analysis += `[${file.name}] ${simpleAnalysis.analysis}\n\n`;
        }
      }
    } catch (error) {
      console.error(`❌ Erro ao analisar ${file.name}:`, error);
    }
  }

  console.log(`✅ Análise concluída: ${topics.length} tópicos extraídos`);
  return { topics: [...new Set(topics)], analysis }; // Remove duplicatas
}

/**
 * Consulta OpenAI Assistant com File Search
 */
async function queryOpenAIAssistant(
  assistantId: string,
  query: string,
  vectorStoreId?: string
): Promise<{ topics: string[]; analysis: string }> {
  try {
    console.log(`🤖 Criando thread com Assistant ${assistantId}...`);

    // Criar thread
    const thread = await openai.beta.threads.create({
      tool_resources: vectorStoreId ? {
        file_search: {
          vector_store_ids: [vectorStoreId]
        }
      } : undefined
    });

    // Adicionar mensagem
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: query
    });

    // Executar
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistantId
    });

    // Aguardar conclusão
    let runStatus = await openai.beta.threads.runs.retrieve(run.id, { thread_id: thread.id });

    while (runStatus.status === 'in_progress' || runStatus.status === 'queued') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(run.id, { thread_id: thread.id });
    }

    if (runStatus.status === 'completed') {
      // Recuperar mensagens
      const messages = await openai.beta.threads.messages.list(thread.id);
      const assistantMessage = messages.data.find(msg => msg.role === 'assistant');

      if (assistantMessage && assistantMessage.content[0]?.type === 'text') {
        const responseText = assistantMessage.content[0].text.value;

        // Extrair tópicos do texto de resposta
        const extractedTopics = await extractTopicsFromAssistantResponse(responseText);

        return {
          topics: extractedTopics,
          analysis: responseText
        };
      }
    }

    throw new Error(`Assistant run failed with status: ${runStatus.status}`);

  } catch (error) {
    console.error('❌ Erro ao consultar Assistant:', error);
    throw error;
  }
}

/**
 * Extrai tópicos do texto usando GPT
 */
async function extractTopicsFromText(
  content: string,
  subject: string,
  discipline: string
): Promise<{ topics: string[]; analysis: string }> {
  console.log(`📝 Extraindo tópicos do texto (${content.length} chars)...`);

  const model = 'gpt-4o-mini';

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `Analise o texto e extraia todos os tópicos relacionados a ${subject}/${discipline}.

Retorne em JSON:
{
  "topics": ["tópico 1", "tópico 2", ...],
  "analysis": "resumo da análise"
}

Foque em conceitos, teorias, métodos e aplicações mencionados.`
      },
      {
        role: 'user',
        content: content.substring(0, 4000) // Limitar tamanho
      }
    ],
    max_tokens: 1000,
    temperature: 0.3,
    response_format: { type: "json_object" }
  });

  const result = JSON.parse(completion.choices[0]?.message?.content || '{"topics": [], "analysis": ""}');
  return result;
}

/**
 * Extrai tópicos da resposta do Assistant
 */
async function extractTopicsFromAssistantResponse(responseText: string): Promise<string[]> {
  console.log(`🔍 Extraindo tópicos da resposta do Assistant...`);

  const model = 'gpt-4o-mini';

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `Extraia uma lista limpa de tópicos da resposta fornecida.

Retorne em JSON:
{
  "topics": ["tópico 1", "tópico 2", ...]
}

Inclua apenas os tópicos principais mencionados, removendo duplicatas.`
      },
      {
        role: 'user',
        content: responseText
      }
    ],
    max_tokens: 800,
    temperature: 0.1,
    response_format: { type: "json_object" }
  });

  const result = JSON.parse(completion.choices[0]?.message?.content || '{"topics": []}');
  return result.topics || [];
}

/**
 * Monta a estrutura completa do curso com todos os dados coletados
 */
export async function generateCompleteCourseStructure(
  subject: string,
  discipline: string,
  userProfile: any,
  referenceTopics: string[],
  bookData: any,
  uploadedContent?: string,
  extractedDocumentTopics?: string[]
): Promise<any> {
  console.log(`🚀 Montando estrutura completa do curso...`);

  const model = 'gpt-4o'; // Fallback model

  // Preparar contexto completo
  const context = {
    subject,
    discipline,
    userProfile,
    referenceTopicsCount: referenceTopics.length,
    booksCount: bookData.books.length,
    summariesCount: bookData.summaries.length,
    hasUploadedContent: !!uploadedContent,
    documentTopicsCount: extractedDocumentTopics?.length || 0
  };

  console.log(`📊 Contexto:`, context);

  // Combinar tópicos de documentos com tópicos de referência
  const allTopics = [...referenceTopics];
  if (extractedDocumentTopics && extractedDocumentTopics.length > 0) {
    console.log(`📚 Integrando ${extractedDocumentTopics.length} tópicos dos documentos enviados...`);
    allTopics.push(...extractedDocumentTopics);
  }

  // Se temos muitos tópicos (>30), usar abordagem de clustering
  if (allTopics.length > CONFIG.MIN_TOPICS_FOR_CLUSTERING) {
    return await generateWithClustering(
      subject,
      discipline,
      userProfile,
      allTopics,
      bookData,
      uploadedContent,
      extractedDocumentTopics
    );
  }

  // Caso contrário, gerar diretamente
  const systemPrompt = `Você é um designer instrucional especializado em criar currículos acadêmicos completos e estruturados.

TAREFA: Criar um curso universitário COMPLETO e DETALHADO para ${discipline}.

DADOS DISPONÍVEIS:
1. Tópicos referenciais de sites educacionais (${referenceTopics.length} itens)
2. Livros recomendados (${bookData.books.length} livros)
3. Sumários de livros (${bookData.summaries.length} sumários)
${extractedDocumentTopics && extractedDocumentTopics.length > 0 ? `4. Tópicos extraídos de documentos enviados (${extractedDocumentTopics.length} itens)` : ''}
${uploadedContent ? `${extractedDocumentTopics ? '5' : '4'}. Material enviado pelo usuário` : ''}

REQUISITOS OBRIGATÓRIOS:
- Preservar TODOS os tópicos fornecidos (não deletar nenhum)
- Organizar em módulos progressivos (iniciante → intermediário → avançado)
- Cada módulo deve ter no mínimo ${CONFIG.MIN_TOPICS_PER_MODULE} tópicos
- Mínimo de ${CONFIG.MIN_MODULES_FOR_COMPLETE_COURSE} módulos para curso completo
- Incluir pré-requisitos claros
- Estimar carga horária realista
- Citar fontes e referências

ESTRUTURA JSON OBRIGATÓRIA:
{
  "title": "título do curso",
  "description": "descrição detalhada",
  "level": "undergraduate/graduate/etc",
  "totalHours": 120,
  "modules": [
    {
      "id": "mod1",
      "title": "Nome do Módulo",
      "description": "Descrição",
      "level": "beginner/intermediate/advanced",
      "estimatedHours": 8,
      "topics": [
        {
          "id": "topic1",
          "title": "Nome do Tópico",
          "description": "Descrição detalhada",
          "subtopics": ["subtópico 1", "subtópico 2"],
          "source": "perplexity/books/user",
          "confidence": 0.9
        }
      ]
    }
  ],
  "prerequisites": [
    {
      "title": "Pré-requisito",
      "description": "Por que é necessário",
      "level": "high/medium/low"
    }
  ],
  "references": [
    {
      "title": "Título do Livro",
      "authors": "Autores",
      "year": "2024",
      "type": "book"
    }
  ],
  "metadata": {
    "topicsPreserved": true,
    "totalTopics": 0,
    "sources": ["perplexity", "books", "gpt"]
  }
}`;

  const userPrompt = `Crie a estrutura COMPLETA do curso de ${discipline} usando TODOS os dados fornecidos:

TÓPICOS REFERENCIAIS (TODOS devem ser incluídos):
${referenceTopics.map((t, i) => `${i + 1}. ${t}`).join('\n')}

${extractedDocumentTopics && extractedDocumentTopics.length > 0 ? `
TÓPICOS DOS DOCUMENTOS ENVIADOS (dar prioridade alta):
${extractedDocumentTopics.map((t, i) => `${i + 1}. ${t}`).join('\n')}
` : ''}

LIVROS RECOMENDADOS:
${bookData.books.map((b: any) => `- ${b.title} (${b.authors}, ${b.year})`).join('\n')}

SUMÁRIOS DE LIVROS:
${bookData.summaries.join('\n\n')}

${uploadedContent ? `MATERIAL DO USUÁRIO:\n${uploadedContent.substring(0, 5000)}` : ''}

PERFIL DO ALUNO:
- Nível: ${userProfile.level}
- Objetivo: ${userProfile.purpose}
- Tempo disponível: ${userProfile.timeAvailable}
- Background: ${userProfile.background || 'não informado'}

Organize TUDO em uma estrutura curricular universitária completa.
${extractedDocumentTopics && extractedDocumentTopics.length > 0 ? `
IMPORTANTE: Dê prioridade especial aos tópicos extraídos dos documentos enviados pelo usuário, integrando-os de forma proeminente na estrutura do curso.` : ''}`;

  const maxTokens = 5000; // Fallback token limit

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    max_tokens: maxTokens,
    temperature: 0.3,
    response_format: { type: "json_object" }
  });

  // Parse com tratamento de erro robusto
  let structure;
  try {
    const rawContent = completion.choices[0]?.message?.content || '{}';
    console.log(`📝 Raw JSON response length: ${rawContent.length} characters`);

    // Tentar limpar JSON malformado
    let cleanedContent = rawContent;

    // Remover possíveis caracteres de controle
    cleanedContent = cleanedContent.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

    // Corrigir strings não terminadas (problema reportado)
    // Detectar e corrigir aspas não fechadas
    const lines = cleanedContent.split('\n');
    const fixedLines = lines.map(line => {
      // Contar aspas duplas na linha
      const doubleQuotes = (line.match(/"/g) || []).length;
      // Se número ímpar de aspas, adicionar uma ao final antes de vírgula ou chave
      if (doubleQuotes % 2 !== 0) {
        if (line.trimEnd().endsWith(',')) {
          return line.slice(0, -1) + '",';
        } else if (line.trimEnd().endsWith('}') || line.trimEnd().endsWith(']')) {
          const lastChar = line[line.length - 1];
          return line.slice(0, -1) + '"' + lastChar;
        } else {
          return line + '"';
        }
      }
      return line;
    });
    cleanedContent = fixedLines.join('\n');

    // Se o JSON estiver incompleto, tentar completar
    if (!cleanedContent.trim().endsWith('}')) {
      console.log('⚠️ JSON aparenta estar incompleto, tentando completar...');

      // Contar chaves e colchetes
      const openBraces = (cleanedContent.match(/{/g) || []).length;
      const closeBraces = (cleanedContent.match(/}/g) || []).length;
      const openBrackets = (cleanedContent.match(/\[/g) || []).length;
      const closeBrackets = (cleanedContent.match(/\]/g) || []).length;

      const missingBrackets = openBrackets - closeBrackets;
      const missingBraces = openBraces - closeBraces;

      // Fechar colchetes primeiro, depois chaves
      if (missingBrackets > 0) {
        cleanedContent += ']'.repeat(missingBrackets);
        console.log(`🔧 Adicionados ${missingBrackets} colchetes de fechamento`);
      }

      if (missingBraces > 0) {
        cleanedContent += '}'.repeat(missingBraces);
        console.log(`🔧 Adicionadas ${missingBraces} chaves de fechamento`);
      }
    }

    structure = JSON.parse(cleanedContent);

  } catch (jsonError) {
    console.error('❌ Erro ao parsear JSON:', jsonError);
    console.log('📄 Conteúdo problemático (primeiros 500 chars):',
      completion.choices[0]?.message?.content?.substring(0, 500));

    // Fallback: estrutura básica
    structure = {
      title: `Curso de ${discipline}`,
      description: `Curso estruturado para aprender ${discipline}`,
      level: userProfile.educationLevel || 'undergraduate',
      totalHours: 80,
      modules: [],
      prerequisites: [],
      references: [],
      metadata: {
        topicsPreserved: false,
        totalTopics: allTopics.length,
        referenceTopics: referenceTopics.length,
        documentTopics: extractedDocumentTopics?.length || 0,
        sources: ['fallback'],
        error: 'JSON parsing failed'
      }
    };
  }

  console.log(`✅ Estrutura gerada: ${structure.modules?.length || 0} módulos, ${
    structure.modules?.reduce((sum: number, m: any) => sum + (m.topics?.length || 0), 0) || 0
  } tópicos`);

  return structure;
}

/**
 * Gera estrutura usando clustering para muitos tópicos
 */
async function generateWithClustering(
  subject: string,
  discipline: string,
  userProfile: any,
  allTopics: string[],
  bookData: any,
  uploadedContent?: string,
  extractedDocumentTopics?: string[]
): Promise<any> {
  console.log(`📊 Usando clustering para ${allTopics.length} tópicos...`);

  const model = 'gpt-4o'; // Fallback model

  // Passo 1: Agrupar tópicos em clusters temáticos
  const clusteringCompletion = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `Agrupe os tópicos fornecidos em ${CONFIG.TARGET_MODULES_MIN}-${CONFIG.TARGET_MODULES_MAX} clusters temáticos para um curso de ${discipline}.

Retorne em JSON:
{
  "clusters": [
    {
      "name": "Nome do Cluster/Módulo",
      "level": "beginner/intermediate/advanced",
      "topics": [0, 1, 5, 8] // índices dos tópicos
    }
  ]
}

Regras:
- Cada cluster deve ter tópicos relacionados
- Ordenar do básico ao avançado
- Distribuir equilibradamente
- Não deixar nenhum tópico de fora`
      },
      {
        role: 'user',
        content: `Agrupe estes ${allTopics.length} tópicos:\n${
          allTopics.map((t, i) => `${i}: ${t.substring(0, 100)}`).join('\n')
        }`
      }
    ],
    max_tokens: 2000,
    temperature: 0.2,
    response_format: { type: "json_object" }
  });

  // Parse clusters com tratamento de erro
  let clusters;
  try {
    clusters = JSON.parse(clusteringCompletion.choices[0]?.message?.content || '{"clusters": []}');
  } catch (error) {
    console.error('❌ Erro ao parsear clusters JSON:', error);
    clusters = { clusters: [] };
  }

  console.log(`✅ ${clusters.clusters?.length || 0} clusters criados`);

  // Passo 2: Gerar estrutura detalhada para cada cluster
  const modules = [];

  for (const cluster of clusters.clusters || []) {
    const clusterTopics = cluster.topics.map((i: number) => allTopics[i]).filter(Boolean);

    if (clusterTopics.length === 0) continue;

    const moduleCompletion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `Crie um módulo detalhado do curso de ${discipline}.

Retorne em JSON:
{
  "id": "mod_x",
  "title": "título do módulo",
  "description": "descrição",
  "level": "beginner/intermediate/advanced",
  "estimatedHours": 10,
  "topics": [
    {
      "id": "topic_x",
      "title": "título",
      "description": "descrição detalhada",
      "subtopics": ["sub1", "sub2"],
      "source": "perplexity",
      "confidence": 0.9
    }
  ]
}`
        },
        {
          role: 'user',
          content: `Crie o módulo "${cluster.name}" com estes tópicos:\n${
            clusterTopics.map((t: string) => `- ${t}`).join('\n')
          }`
        }
      ],
      max_tokens: CONFIG.MAX_TOKENS_PER_MODULE,
      temperature: 0.2,
      response_format: { type: "json_object" }
    });

    // Parse módulo com tratamento de erro
    let parsedModule;
    try {
      parsedModule = JSON.parse(moduleCompletion.choices[0]?.message?.content || '{}');
    } catch (error) {
      console.error(`❌ Erro ao parsear módulo ${cluster.name}:`, error);
      parsedModule = {
        id: `mod_${modules.length + 1}`,
        title: cluster.name,
        description: `Módulo sobre ${cluster.name}`,
        level: 'beginner',
        estimatedHours: 8,
        topics: []
      };
    }
    modules.push(parsedModule);
  }

  // Passo 3: Gerar pré-requisitos baseados na disciplina
  const prerequisites = await generatePrerequisitesForDiscipline(discipline, userProfile.educationLevel, subject);

  // Passo 4: Montar estrutura final
  const finalStructure = {
    title: `Curso Completo de ${discipline}`,
    description: `Curso universitário completo e estruturado de ${discipline}, desenvolvido com base em currículos de referência e livros acadêmicos.`,
    level: userProfile.educationLevel || 'undergraduate',
    totalHours: modules.reduce((sum: number, m: any) => sum + (m.estimatedHours || 0), 0),
    modules,
    prerequisites,
    references: bookData.books,
    metadata: {
      topicsPreserved: true,
      totalTopics: allTopics.length,
      referenceTopics: allTopics.length - (extractedDocumentTopics?.length || 0),
      documentTopics: extractedDocumentTopics?.length || 0,
      sources: ['perplexity', 'books', 'gpt', ...(extractedDocumentTopics?.length ? ['documents'] : [])]
    }
  };

  console.log(`✅ Estrutura final: ${modules.length} módulos gerados via clustering`);

  return finalStructure;
}

/**
 * Gera pré-requisitos baseados na disciplina de forma inteligente
 */
async function generatePrerequisitesForDiscipline(
  discipline: string,
  educationLevel: string,
  subject: string
): Promise<any[]> {
  const prerequisites: any[] = [];
  const disciplineLower = discipline.toLowerCase();
  const subjectLower = subject.toLowerCase();

  // Base de conhecimento expandida para pré-requisitos
  const prereqPatterns = {
    // Matemática e Cálculo
    'cálculo 2|calculo ii': ['Cálculo 1', 'Pré-Cálculo'],
    'cálculo 3|calculo iii': ['Cálculo 2', 'Álgebra Linear'],
    'equações diferenciais': ['Cálculo 2', 'Álgebra Linear'],
    'análise|analysis': ['Cálculo 3', 'Álgebra Linear', 'Topologia'],

    // Física e Engenharia
    'mecânica|estática|dinâmica': ['Cálculo 1', 'Física 1', 'Geometria Analítica'],
    'eletromagnetismo|circuitos': ['Cálculo 2', 'Física 2', 'Álgebra Linear'],
    'termodinâmica': ['Cálculo 2', 'Física 1', 'Química Geral'],
    'mecânica dos fluidos': ['Cálculo 3', 'Física 1', 'Termodinâmica'],

    // Computação
    'estrutura de dados': ['Programação Básica', 'Lógica de Programação'],
    'algoritmos': ['Estrutura de Dados', 'Matemática Discreta'],
    'machine learning|aprendizado de máquina': ['Álgebra Linear', 'Cálculo', 'Estatística', 'Programação'],
    'inteligência artificial': ['Algoritmos', 'Estatística', 'Lógica'],
    'banco de dados|database': ['Algoritmos', 'Lógica'],

    // Química
    'química orgânica': ['Química Geral', 'Química Inorgânica'],
    'bioquímica': ['Química Orgânica', 'Biologia Celular'],
    'físico-química': ['Cálculo 2', 'Física 2', 'Química Geral'],

    // Estatística e Probabilidade
    'estatística': ['Matemática Básica', 'Probabilidade'],
    'inferência': ['Estatística', 'Cálculo'],
    'econometria': ['Estatística', 'Cálculo', 'Economia'],

    // Economia e Administração
    'microeconomia': ['Cálculo 1', 'Matemática Básica'],
    'macroeconomia': ['Microeconomia', 'Estatística'],
    'finanças': ['Matemática Financeira', 'Estatística'],

    // Biologia e Saúde
    'anatomia': ['Biologia Básica'],
    'fisiologia': ['Anatomia', 'Bioquímica'],
    'genética': ['Biologia Celular', 'Química Orgânica'],

    // Default para áreas não mapeadas
    'default': []
  };

  // Buscar padrões correspondentes
  let foundPrereqs: string[] = [];

  for (const [pattern, prereqs] of Object.entries(prereqPatterns)) {
    if (pattern === 'default') continue;

    const regex = new RegExp(pattern, 'i');
    if (regex.test(disciplineLower) || regex.test(subjectLower)) {
      foundPrereqs = prereqs as string[];
      break;
    }
  }

  // Se encontrou pré-requisitos conhecidos, formatar
  if (foundPrereqs.length > 0) {
    foundPrereqs.forEach((prereq, index) => {
      prerequisites.push({
        title: prereq,
        description: `Conhecimento fundamental em ${prereq}`,
        level: index === 0 ? 'high' : 'medium'
      });
    });
  } else if (educationLevel === 'undergraduate') {
    // Para disciplinas não mapeadas em nível universitário
    // Usar GPT para inferir pré-requisitos baseado no contexto
    try {
      const model = 'gpt-4o-mini'; // Fallback model
      const completion = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: `Identifique os 2-3 pré-requisitos mais importantes para estudar "${discipline}".
Retorne em JSON:
{
  "prerequisites": [
    {"title": "Nome do Pré-requisito", "description": "Breve descrição", "level": "high/medium/low"}
  ]
}`
          },
          {
            role: 'user',
            content: `Disciplina: ${discipline}\nNível: ${educationLevel}`
          }
        ],
        max_tokens: 300,
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(completion.choices[0]?.message?.content || '{"prerequisites": []}');
      prerequisites.push(...(result.prerequisites || []));
    } catch (error) {
      console.log('⚠️ Erro ao gerar pré-requisitos com GPT');
      // Fallback genérico
      prerequisites.push({
        title: 'Conhecimentos Básicos',
        description: 'Fundamentos da área de estudo',
        level: 'medium'
      });
    }
  }

  return prerequisites;
}

/**
 * Valida e melhora a estrutura por nível (iniciante/intermediário/avançado)
 */
export async function validateStructureByLevel(
  structure: any,
  level: 'beginner' | 'intermediate' | 'advanced'
): Promise<{
  isComplete: boolean;
  missingTopics: string[];
  improvements: string[];
  score: number;
}> {
  console.log(`🔍 Validando nível ${level}...`);

  const model = 'gpt-4o-mini'; // Fallback model

  // Filtrar módulos do nível especificado
  const levelModules = structure.modules?.filter((m: any) =>
    m.level === level || (level === 'beginner' && !m.level)
  ) || [];

  if (levelModules.length === 0) {
    return {
      isComplete: false,
      missingTopics: [`Nenhum módulo encontrado para nível ${level}`],
      improvements: [`Adicionar módulos de nível ${level}`],
      score: 0
    };
  }

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `Avalie se a parte ${level} do curso está completa e bem estruturada.

Retorne em JSON:
{
  "isComplete": true/false,
  "score": 8.5,
  "missingTopics": ["tópico que falta"],
  "improvements": ["melhoria sugerida"],
  "analysis": "análise detalhada"
}

Critérios:
- Cobertura completa do nível
- Progressão lógica
- Profundidade adequada
- Preparação para próximo nível`
      },
      {
        role: 'user',
        content: `Avalie os módulos de nível ${level}:\n${JSON.stringify(levelModules, null, 2)}\n\n
Contexto completo do curso (apenas para referência):\n${JSON.stringify({
          title: structure.title,
          totalModules: structure.modules?.length,
          levels: structure.modules?.map((m: any) => m.level)
        }, null, 2)}`
      }
    ],
    max_tokens: 1000,
    temperature: 0.2,
    response_format: { type: "json_object" }
  });

  const validation = JSON.parse(completion.choices[0]?.message?.content || '{}');

  console.log(`✅ Validação ${level}: Score ${validation.score}/10, Completo: ${validation.isComplete}`);

  return validation;
}

/**
 * Pipeline completo de geração de curso
 */
export async function runCourseGenerationPipeline(
  userMessage: string,
  userProfile: any,
  uploadedFiles?: any[],
  progressCallback?: (progress: number, step: number, message: string) => Promise<void>
): Promise<any> {
  console.log(`🚀 Iniciando pipeline completo de geração de curso...`);

  const updateProgress = async (progress: number, step: number, message: string) => {
    if (progressCallback) {
      await progressCallback(progress, step, message);
    }
  };

  try {
    // 1. Extrair assunto (0-15%)
    await updateProgress(8, 1, 'Extraindo assunto principal...');
    const { subject, hasUsefulContext, context } = await extractSubject(userMessage);

    // 1.5. VERIFICAR ESTRUTURAS EXISTENTES ANTES DE GERAR (15-25%)
    await updateProgress(15, 1, 'Verificando estruturas existentes...');

    // Importar funções do Supabase
    const { findExistingStructure, saveCourseStructure } = await import('./supabase');

    // Primeiro, verificar se existe estrutura para esse assunto e nível
    const educationLevel = userProfile.educationLevel || 'undergraduate';
    console.log('🔍 Verificando estrutura existente no banco...');
    console.log('📝 Parâmetros de busca:', {
      subject,
      educationLevel
    });

    const existingStructure = await findExistingStructure(subject, educationLevel);

    if (existingStructure) {
      console.log('🎯 Estrutura existente encontrada! Reutilizando estrutura do banco.');
      await updateProgress(100, 4, 'Estrutura encontrada no banco!');

      // Retornar estrutura existente
      return existingStructure.data;
    }

    console.log('🔄 Nenhuma estrutura encontrada. Gerando nova estrutura...');
    await updateProgress(25, 1, 'Nenhuma estrutura no banco. Gerando nova...');

    // 2. Detectar disciplina acadêmica (15-25%)
    await updateProgress(20, 1, 'Detectando disciplina acadêmica...');
    const { discipline, confidence, isAcademic } = await detectAcademicDiscipline(
      subject,
      userProfile,
      userMessage
    );

    // 2.1. Detectar domínio acadêmico e aplicar configurações específicas
    const academicDomain = detectAcademicDomain(discipline, subject);
    const domainConfig = applyDomainConfiguration(academicDomain, CONFIG);
    console.log(`🎓 Domínio detectado: ${academicDomain} (${domainConfig.DOMAIN_NAME || 'Geral'})`);
    console.log(`📊 Configurações do domínio: ${domainConfig.TARGET_MODULES_MIN}-${domainConfig.TARGET_MODULES_MAX} módulos`);

    // Atualizar configurações globais com configurações do domínio
    Object.assign(CONFIG, domainConfig);

    // 3. Buscar tópicos referenciais com configurações do domínio (25-50%)
    await updateProgress(30, 2, 'Buscando tópicos acadêmicos especializados...');
    const referenceTopics = await fetchReferenceTopics(
      subject,
      discipline,
      userProfile.educationLevel || 'undergraduate',
      academicDomain // Passar domínio para busca especializada
    );
    await updateProgress(50, 2, 'Tópicos acadêmicos encontrados...');

    // Combinar todos os tópicos para uso no pipeline
    let allTopics = [...referenceTopics];

    // 4. Buscar e validar livros (50-60%)
    await updateProgress(55, 2, 'Buscando recomendações bibliográficas...');
    const bookData = await fetchBookRecommendations(
      discipline,
      userProfile.educationLevel || 'undergraduate',
      referenceTopics
    );

    // 5. Processar arquivos enviados (se houver) (60-70%)
    await updateProgress(62, 2, 'Processando arquivos enviados...');
    let uploadedContent = '';
    let extractedDocumentTopics: string[] = [];

    if (uploadedFiles && uploadedFiles.length > 0) {
      console.log(`📁 Processando ${uploadedFiles.length} arquivo(s) enviado(s)...`);
      uploadedContent = uploadedFiles.map(f => f.content || '').join('\n\n');

      // Analisar arquivos via OpenAI Assistant se disponível
      await updateProgress(65, 2, 'Analisando conteúdo dos documentos...');
      try {
        console.log(`📚 Iniciando análise de ${uploadedFiles.length} arquivo(s) enviado(s)...`);
        const documentAnalysis = await analyzeUploadedDocuments(uploadedFiles, subject, discipline);
        if (documentAnalysis.topics.length > 0) {
          extractedDocumentTopics = documentAnalysis.topics;
          console.log(`📊 ${extractedDocumentTopics.length} tópicos extraídos dos documentos`);
          console.log(`🔗 Integrando tópicos dos documentos com tópicos referenciais...`);

          // Adicionar tópicos dos documentos aos tópicos totais
          allTopics.push(...extractedDocumentTopics);
          console.log(`✅ Total de tópicos agora: ${allTopics.length} (${referenceTopics.length} referenciais + ${extractedDocumentTopics.length} dos documentos)`);
        } else {
          console.log(`⚠️ Nenhum tópico foi extraído dos documentos`);
        }
      } catch (error) {
        console.error(`❌ Erro ao analisar documentos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
    } else {
      console.log(`📝 Nenhum arquivo enviado para análise`);
    }
    await updateProgress(70, 2, 'Análise de documentos concluída...');

    // 6. Gerar estrutura completa (70-85%)
    await updateProgress(72, 3, 'Gerando estrutura curricular completa...');
    const structure = await generateCompleteCourseStructure(
      subject,
      discipline,
      userProfile,
      referenceTopics,
      bookData,
      uploadedContent,
      extractedDocumentTopics
    );
    await updateProgress(85, 3, 'Estrutura curricular gerada...');

    // 7. Validar por níveis (85-95%)
    await updateProgress(87, 4, 'Validando qualidade acadêmica...');
    const beginnerValidation = await validateStructureByLevel(structure, 'beginner');
    const intermediateValidation = await validateStructureByLevel(structure, 'intermediate');
    const advancedValidation = await validateStructureByLevel(structure, 'advanced');

    // 7.1. Validação específica do domínio acadêmico
    await updateProgress(92, 4, 'Validando completude específica do domínio...');
    const domainValidation = await validateDomainSpecificCompleteness(structure, academicDomain);
    console.log(`🎓 Validação do domínio ${academicDomain}: ${domainValidation.score}/10`);
    if (domainValidation.missingElements.length > 0) {
      console.log(`⚠️ Elementos faltantes: ${domainValidation.missingElements.join(', ')}`);
    }
    if (domainValidation.domainSpecificFeedback.length > 0) {
      console.log(`💡 Feedback específico: ${domainValidation.domainSpecificFeedback.join(', ')}`);
    }

    await updateProgress(95, 4, 'Validação de qualidade concluída...');

    // 8. Aplicar melhorias se necessário
    if (!beginnerValidation.isComplete || beginnerValidation.score < CONFIG.MIN_QUALITY_SCORE) {
      console.log(`🔧 Aplicando melhorias no nível iniciante...`);
      // Aqui você pode adicionar lógica para melhorar o nível iniciante
    }

    // 8.1. Aplicar melhorias específicas do domínio se necessário
    if (!domainValidation.isComplete || domainValidation.score < CONFIG.MIN_QUALITY_SCORE) {
      console.log(`🔧 Aplicando melhorias específicas do domínio ${academicDomain}...`);
      // Aqui você pode adicionar lógica para melhorar aspectos específicos do domínio
    }

    // 9. Adicionar metadados finais
    structure.metadata = {
      ...structure.metadata,
      pipeline: {
        subject,
        discipline,
        confidence,
        isAcademic,
        referenceTopicsCount: referenceTopics.length,
        documentTopicsCount: extractedDocumentTopics?.length || 0,
        totalTopicsUsed: allTopics.length,
        booksFound: bookData.books.length,
        uploadedFilesCount: uploadedFiles?.length || 0,
        validationScores: {
          beginner: beginnerValidation.score,
          intermediate: intermediateValidation.score,
          advanced: advancedValidation.score,
          domainSpecific: domainValidation.score
        },
        academicDomain: {
          detected: academicDomain,
          domainName: domainConfig.DOMAIN_NAME || 'Geral',
          configurationApplied: true,
          domainCompleteness: domainValidation.isComplete,
          missingElements: domainValidation.missingElements,
          domainFeedback: domainValidation.domainSpecificFeedback
        }
      }
    };

    // 8. Salvar estrutura no banco (95-98%)
    await updateProgress(95, 4, 'Salvando estrutura no banco...');
    try {
      // Salvar a estrutura gerada no novo sistema
      const { id, isNew } = await saveCourseStructure(subject, educationLevel, structure);

      if (isNew) {
        console.log('💾 Nova estrutura salva no banco com sucesso! ID:', id);
      } else {
        console.log('♻️ Estrutura já existente foi reutilizada! ID:', id);
      }

      // Adicionar ID da estrutura aos metadados
      structure.metadata = {
        ...structure.metadata,
        structureId: id,
        isNewStructure: isNew
      };
    } catch (error) {
      console.warn('⚠️ Erro ao salvar estrutura no banco:', error);
      // Não interromper o fluxo se o salvamento falhar
    }

    // 9. Finalizar (98-100%)
    await updateProgress(100, 4, 'Curso gerado com sucesso!');
    console.log(`✅ Pipeline completo! Estrutura final gerada com sucesso.`);

    return structure;

  } catch (error) {
    console.error(`❌ Erro no pipeline de geração:`, error);
    throw error;
  }
}

/**
 * Converte curso do cache para o formato esperado pelo frontend
 */
function convertCachedCourseToStructure(cachedCourse: any, userProfile: any): any {
  console.log('🔄 Convertendo curso do cache para estrutura do frontend...');

  // Converter tópicos para módulos se necessário
  const modules: any[] = [];

  // PRIORIDADE 1: Se existem módulos reais no banco
  if (cachedCourse.modules && cachedCourse.modules.length > 0) {
    console.log(`📦 Usando ${cachedCourse.modules.length} módulos reais do banco de dados`);

    // Organizar tópicos por module_id se existir
    const topicsByModuleId = new Map();
    const topicsWithoutModule: any[] = [];

    if (cachedCourse.topics) {
      cachedCourse.topics.forEach((topic: any) => {
        if (topic.module_id) {
          if (!topicsByModuleId.has(topic.module_id)) {
            topicsByModuleId.set(topic.module_id, []);
          }
          topicsByModuleId.get(topic.module_id).push({
            id: topic.id,
            title: topic.title,
            description: topic.description || topic.detailed_description,
            detailedDescription: topic.detailed_description,
            learningObjectives: topic.learning_objectives || [],
            keyTerms: topic.key_terms || [],
            searchKeywords: topic.search_keywords || [topic.title],
            estimatedDuration: topic.estimated_duration || '45 min',
            difficulty: topic.difficulty || 'medium',
            order: topic.order_index,
            completed: topic.completed || false,
            videos: topic.videos || [],
            aulaTexto: topic.aula_texto || {}
          });
        } else {
          topicsWithoutModule.push(topic);
        }
      });
    }

    // Converter módulos reais
    cachedCourse.modules.forEach((module: any) => {
      const moduleTopics = topicsByModuleId.get(module.id) || [];

      modules.push({
        id: module.id,
        title: module.title,
        description: module.description,
        order: module.module_order,
        topics: moduleTopics.sort((a: any, b: any) => a.order - b.order),
        estimatedDuration: module.estimated_duration || `${Math.ceil(moduleTopics.length * 1.5)} horas`,
        estimatedHours: module.estimated_hours,
        learningObjectives: module.learning_objectives || [],
        level: module.level,
        completed: false
      });
    });

    // Adicionar tópicos órfãos em um módulo geral se existirem
    if (topicsWithoutModule.length > 0) {
      console.log(`📝 Encontrados ${topicsWithoutModule.length} tópicos órfãos, criando módulo adicional`);

      const orphanTopics = topicsWithoutModule.map((topic: any) => ({
        id: topic.id,
        title: topic.title,
        description: topic.description || topic.detailed_description,
        detailedDescription: topic.detailed_description,
        learningObjectives: topic.learning_objectives || [],
        keyTerms: topic.key_terms || [],
        searchKeywords: topic.search_keywords || [topic.title],
        estimatedDuration: topic.estimated_duration || '45 min',
        difficulty: topic.difficulty || 'medium',
        order: topic.order_index,
        completed: topic.completed || false,
        videos: topic.videos || [],
        aulaTexto: topic.aula_texto || {}
      })).sort((a: any, b: any) => a.order - b.order);

      modules.push({
        id: 'module-additional',
        title: 'Tópicos Adicionais',
        description: 'Tópicos complementares do curso',
        order: 999,
        topics: orphanTopics,
        estimatedDuration: `${Math.ceil(orphanTopics.length * 1.5)} horas`,
        learningObjectives: [],
        completed: false
      });
    }

  } else if (cachedCourse.topics && cachedCourse.topics.length > 0) {
    // PRIORIDADE 2: Agrupar tópicos por module_title (método antigo)
    console.log(`📝 Agrupando ${cachedCourse.topics.length} tópicos por module_title`);

    const topicsByModule = new Map();

    cachedCourse.topics.forEach((topic: any) => {
      const moduleTitle = topic.module_title || 'Módulo Geral';

      if (!topicsByModule.has(moduleTitle)) {
        topicsByModule.set(moduleTitle, []);
      }

      topicsByModule.get(moduleTitle).push({
        id: topic.id,
        title: topic.title,
        description: topic.description || topic.detailed_description,
        detailedDescription: topic.detailed_description,
        learningObjectives: topic.learning_objectives || [],
        keyTerms: topic.key_terms || [],
        searchKeywords: topic.search_keywords || [topic.title],
        estimatedDuration: topic.estimated_duration || '45 min',
        difficulty: topic.difficulty || 'medium',
        order: topic.order_index,
        completed: topic.completed || false,
        videos: topic.videos || [],
        aulaTexto: topic.aula_texto || {}
      });
    });

    // Converter Map para array de módulos
    let moduleIndex = 0;
    topicsByModule.forEach((topics, moduleTitle) => {
      modules.push({
        id: `module-${moduleIndex}`,
        title: moduleTitle,
        description: `Módulo sobre ${moduleTitle}`,
        order: moduleIndex,
        topics: topics.sort((a: any, b: any) => a.order - b.order),
        estimatedDuration: `${Math.ceil(topics.length * 1.5)} horas`,
        learningObjectives: [],
        completed: false
      });
      moduleIndex++;
    });
  }

  const structure = {
    title: cachedCourse.title,
    description: cachedCourse.description || `Curso de ${cachedCourse.subject}`,
    level: userProfile.level || cachedCourse.level,
    modules: modules,
    prerequisites: [],
    recommendedBooks: [],
    totalDuration: `${modules.length * 8} horas`,
    metadata: {
      fromCache: true,
      originalCourseId: cachedCourse.id,
      cacheTimestamp: new Date().toISOString(),
      totalTopics: cachedCourse.topics?.length || 0,
      sources: ['cache']
    }
  };

  console.log(`✅ Curso convertido: ${modules.length} módulos, ${cachedCourse.topics?.length || 0} tópicos`);
  return structure;
}

// ============================================================================
// CONFIGURAÇÕES ADAPTÁVEIS POR ÁREA ACADÊMICA
// ============================================================================

/**
 * Configurações específicas por domínio acadêmico para otimizar busca e estruturação
 */
export const DOMAIN_CONFIGS = {
  // Engenharias
  engineering: {
    name: 'Engenharia',
    searchDomains: ['ieee.org', 'abnt.org.br', 'confea.org.br'],
    additionalSearchTerms: ['normas técnicas', 'códigos de construção', 'padrões industriais'],
    moduleStructure: {
      theory: 0.4,        // 40% teoria
      practice: 0.6       // 60% prática
    },
    minModules: 15,
    maxModules: 25,
    prerequisites: ['Matemática', 'Física', 'Química'],
    skillFocus: ['problem-solving', 'design', 'analysis'],
    industryStandards: true,
    labWork: true
  },

  // Ciências Exatas
  mathematics: {
    name: 'Matemática',
    searchDomains: ['mathworld.wolfram.com', 'ams.org', 'sbm.org.br'],
    additionalSearchTerms: ['teoremas', 'demonstrações', 'axiomas'],
    moduleStructure: {
      theory: 0.7,
      practice: 0.3
    },
    minModules: 12,
    maxModules: 20,
    prerequisites: ['Álgebra', 'Geometria'],
    skillFocus: ['logical-reasoning', 'proof-writing', 'abstraction'],
    industryStandards: false,
    labWork: false
  },

  physics: {
    name: 'Física',
    searchDomains: ['aps.org', 'sbfisica.org.br', 'cern.ch'],
    additionalSearchTerms: ['experimentos', 'leis físicas', 'aplicações'],
    moduleStructure: {
      theory: 0.6,
      practice: 0.4
    },
    minModules: 12,
    maxModules: 18,
    prerequisites: ['Matemática', 'Cálculo'],
    skillFocus: ['experimentation', 'modeling', 'analysis'],
    industryStandards: false,
    labWork: true
  },

  // Computação
  computer_science: {
    name: 'Ciência da Computação',
    searchDomains: ['acm.org', 'ieee.org', 'github.com'],
    additionalSearchTerms: ['algoritmos', 'estruturas de dados', 'programação'],
    moduleStructure: {
      theory: 0.3,
      practice: 0.7
    },
    minModules: 15,
    maxModules: 25,
    prerequisites: ['Lógica', 'Matemática Discreta'],
    skillFocus: ['programming', 'problem-solving', 'systems-design'],
    industryStandards: true,
    labWork: true
  },

  // Ciências Biológicas
  biology: {
    name: 'Biologia',
    searchDomains: [ 'ncbi.nlm.nih.gov', 'sbb.org.br', 'nature.com'],
    additionalSearchTerms: ['organismos', 'sistemas biológicos', 'ecologia'],
    moduleStructure: {
      theory: 0.5,
      practice: 0.5
    },
    minModules: 12,
    maxModules: 20,
    prerequisites: ['Química', 'Biologia Básica'],
    skillFocus: ['observation', 'classification', 'experimentation'],
    industryStandards: false,
    labWork: true
  },

  // Química
  chemistry: {
    name: 'Química',
    searchDomains: [ 'acs.org', 'sbq.org.br', 'iupac.org'],
    additionalSearchTerms: ['reações químicas', 'síntese', 'análise'],
    moduleStructure: {
      theory: 0.5,
      practice: 0.5
    },
    minModules: 12,
    maxModules: 18,
    prerequisites: ['Matemática', 'Física'],
    skillFocus: ['synthesis', 'analysis', 'safety'],
    industryStandards: true,
    labWork: true
  },

  // Medicina e Saúde
  medicine: {
    name: 'Medicina',
    searchDomains: [ 'cfm.org.br', 'pubmed.ncbi.nlm.nih.gov', 'who.int'],
    additionalSearchTerms: ['diagnóstico', 'tratamento', 'anatomia', 'fisiologia'],
    moduleStructure: {
      theory: 0.4,
      practice: 0.6
    },
    minModules: 20,
    maxModules: 30,
    prerequisites: ['Biologia', 'Química', 'Física'],
    skillFocus: ['diagnosis', 'treatment', 'patient-care'],
    industryStandards: true,
    labWork: true
  },

  // Economia e Administração
  economics: {
    name: 'Economia',
    searchDomains: [ 'aea-web.org', 'anpec.org.br', 'bcb.gov.br'],
    additionalSearchTerms: ['mercados', 'políticas econômicas', 'estatísticas'],
    moduleStructure: {
      theory: 0.6,
      practice: 0.4
    },
    minModules: 12,
    maxModules: 18,
    prerequisites: ['Matemática', 'Estatística'],
    skillFocus: ['analysis', 'modeling', 'policy-making'],
    industryStandards: false,
    labWork: false
  },

  business: {
    name: 'Administração',
    searchDomains: [ 'ama.org', 'cfa.org.br', 'sebrae.com.br'],
    additionalSearchTerms: ['gestão', 'estratégia', 'marketing', 'finanças'],
    moduleStructure: {
      theory: 0.4,
      practice: 0.6
    },
    minModules: 15,
    maxModules: 22,
    prerequisites: ['Matemática Básica', 'Economia'],
    skillFocus: ['leadership', 'strategy', 'decision-making'],
    industryStandards: true,
    labWork: false
  },

  // Direito
  law: {
    name: 'Direito',
    searchDomains: [ 'oab.org.br', 'stf.jus.br', 'planalto.gov.br'],
    additionalSearchTerms: ['legislação', 'jurisprudência', 'doutrina'],
    moduleStructure: {
      theory: 0.7,
      practice: 0.3
    },
    minModules: 15,
    maxModules: 25,
    prerequisites: ['História', 'Filosofia'],
    skillFocus: ['interpretation', 'argumentation', 'research'],
    industryStandards: true,
    labWork: false
  },

  // Psicologia
  psychology: {
    name: 'Psicologia',
    searchDomains: [ 'apa.org', 'cfp.org.br', 'scielo.br'],
    additionalSearchTerms: ['comportamento', 'terapia', 'desenvolvimento'],
    moduleStructure: {
      theory: 0.5,
      practice: 0.5
    },
    minModules: 15,
    maxModules: 22,
    prerequisites: ['Biologia', 'Estatística'],
    skillFocus: ['assessment', 'intervention', 'research'],
    industryStandards: true,
    labWork: true
  },

  // Arquitetura
  architecture: {
    name: 'Arquitetura',
    searchDomains: [ 'cau.org.br', 'archdaily.com.br', 'abnt.org.br'],
    additionalSearchTerms: ['projeto', 'urbanismo', 'sustentabilidade'],
    moduleStructure: {
      theory: 0.3,
      practice: 0.7
    },
    minModules: 18,
    maxModules: 25,
    prerequisites: ['Matemática', 'Física', 'Arte'],
    skillFocus: ['design', 'planning', 'visualization'],
    industryStandards: true,
    labWork: true
  },

  // Arte e Design
  arts: {
    name: 'Artes',
    searchDomains: [ 'funarte.gov.br', 'mac.usp.br'],
    additionalSearchTerms: ['técnicas artísticas', 'história da arte', 'criatividade'],
    moduleStructure: {
      theory: 0.3,
      practice: 0.7
    },
    minModules: 10,
    maxModules: 18,
    prerequisites: ['História', 'Filosofia'],
    skillFocus: ['creativity', 'expression', 'technique'],
    industryStandards: false,
    labWork: true
  },

  // Geografia
  geography: {
    name: 'Geografia',
    searchDomains: [ 'ibge.gov.br', 'inpe.br', 'agb.org.br'],
    additionalSearchTerms: ['cartografia', 'geopolítica', 'meio ambiente'],
    moduleStructure: {
      theory: 0.6,
      practice: 0.4
    },
    minModules: 12,
    maxModules: 18,
    prerequisites: ['História', 'Matemática'],
    skillFocus: ['mapping', 'analysis', 'field-work'],
    industryStandards: false,
    labWork: true
  },

  // História
  history: {
    name: 'História',
    searchDomains: [ 'anpuh.org', 'bn.gov.br', 'ihgb.org.br'],
    additionalSearchTerms: ['fontes históricas', 'historiografia', 'cronologia'],
    moduleStructure: {
      theory: 0.8,
      practice: 0.2
    },
    minModules: 12,
    maxModules: 20,
    prerequisites: ['Leitura Crítica', 'Geografia'],
    skillFocus: ['research', 'interpretation', 'writing'],
    industryStandards: false,
    labWork: false
  },

  // Educação
  education: {
    name: 'Educação',
    searchDomains: [ 'mec.gov.br', 'anped.org.br', 'capes.gov.br'],
    additionalSearchTerms: ['pedagogia', 'didática', 'currículo'],
    moduleStructure: {
      theory: 0.5,
      practice: 0.5
    },
    minModules: 15,
    maxModules: 22,
    prerequisites: ['Psicologia', 'Sociologia'],
    skillFocus: ['teaching', 'curriculum-design', 'assessment'],
    industryStandards: true,
    labWork: true
  }
};

/**
 * Detecta automaticamente o domínio acadêmico baseado na disciplina
 */
export function detectAcademicDomain(discipline: string, subject: string): keyof typeof DOMAIN_CONFIGS | 'general' {
  const disciplineLower = discipline.toLowerCase();
  const subjectLower = subject.toLowerCase();
  const combined = `${disciplineLower} ${subjectLower}`;

  // Engenharias
  if (/engenharia|mecânica|elétrica|civil|química|produção|materiais|estruturas/i.test(combined)) {
    return 'engineering';
  }

  // Matemática
  if (/matemática|cálculo|álgebra|geometria|estatística|análise/i.test(combined)) {
    return 'mathematics';
  }

  // Física
  if (/física|mecânica|eletromagnetismo|termodinâmica|óptica/i.test(combined)) {
    return 'physics';
  }

  // Computação
  if (/computação|programação|algoritmos|software|dados|inteligência artificial|machine learning/i.test(combined)) {
    return 'computer_science';
  }

  // Biologia
  if (/biologia|genética|ecologia|botânica|zoologia|microbiologia/i.test(combined)) {
    return 'biology';
  }

  // Química
  if (/química|orgânica|inorgânica|analítica|físico-química/i.test(combined)) {
    return 'chemistry';
  }

  // Medicina
  if (/medicina|anatomia|fisiologia|patologia|farmacologia|enfermagem/i.test(combined)) {
    return 'medicine';
  }

  // Economia
  if (/economia|microeconomia|macroeconomia|econometria|finanças/i.test(combined)) {
    return 'economics';
  }

  // Administração
  if (/administração|gestão|marketing|recursos humanos|estratégia/i.test(combined)) {
    return 'business';
  }

  // Direito
  if (/direito|jurídico|lei|legislação|advocacia/i.test(combined)) {
    return 'law';
  }

  // Psicologia
  if (/psicologia|comportamento|terapia|desenvolvimento/i.test(combined)) {
    return 'psychology';
  }

  // Arquitetura
  if (/arquitetura|urbanismo|projeto|construção/i.test(combined)) {
    return 'architecture';
  }

  // Arte
  if (/arte|design|música|teatro|cinema|pintura/i.test(combined)) {
    return 'arts';
  }

  // Geografia
  if (/geografia|cartografia|geopolítica|meio ambiente/i.test(combined)) {
    return 'geography';
  }

  // História
  if (/história|historiografia|cronologia/i.test(combined)) {
    return 'history';
  }

  // Educação
  if (/educação|pedagogia|didática|ensino/i.test(combined)) {
    return 'education';
  }

  return 'general';
}

/**
 * Aplica configurações específicas do domínio ao pipeline
 */
export function applyDomainConfiguration(
  domain: keyof typeof DOMAIN_CONFIGS | 'general',
  baseConfig: any
): any {
  if (domain === 'general') {
    return baseConfig;
  }

  const domainConfig = DOMAIN_CONFIGS[domain];

  return {
    ...baseConfig,
    TARGET_MODULES_MIN: domainConfig.minModules,
    TARGET_MODULES_MAX: domainConfig.maxModules,
    DOMAIN_SEARCH_TERMS: domainConfig.additionalSearchTerms,
    DOMAIN_SEARCH_DOMAINS: domainConfig.searchDomains,
    MODULE_THEORY_RATIO: domainConfig.moduleStructure.theory,
    MODULE_PRACTICE_RATIO: domainConfig.moduleStructure.practice,
    EXPECTED_PREREQUISITES: domainConfig.prerequisites,
    FOCUS_SKILLS: domainConfig.skillFocus,
    REQUIRES_INDUSTRY_STANDARDS: domainConfig.industryStandards,
    REQUIRES_LAB_WORK: domainConfig.labWork,
    DOMAIN_NAME: domainConfig.name
  };
}

/**
 * Gera busca especializada baseada no domínio
 */
export async function generateDomainSpecificSearch(
  discipline: string,
  subject: string,
  level: string
): Promise<{
  searchQueries: string[];
  domains: string[];
  additionalTerms: string[];
}> {
  const domain = detectAcademicDomain(discipline, subject);

  if (domain === 'general') {
    return {
      searchQueries: [
        `${discipline} curriculum ${level}`,
        `${subject} course outline`,
        `${discipline} topics syllabus`
      ],
      domains: ['edu.br', 'edu'],
      additionalTerms: ['curriculum', 'syllabus', 'course']
    };
  }

  const config = DOMAIN_CONFIGS[domain];

  const searchQueries = [
    `${discipline} curriculum ${level} ${config.additionalSearchTerms[0]}`,
    `${subject} course outline university`,
    `${discipline} syllabus ${config.additionalSearchTerms[1] || ''}`,
    ...(config.industryStandards ? [`${discipline} industry standards`] : []),
    ...(config.labWork ? [`${discipline} laboratory exercises`] : [])
  ];

  return {
    searchQueries,
    domains: config.searchDomains,
    additionalTerms: config.additionalSearchTerms
  };
}

/**
 * Valida completude baseada no domínio
 */
export async function validateDomainSpecificCompleteness(
  structure: any,
  domain: keyof typeof DOMAIN_CONFIGS | 'general'
): Promise<{
  isComplete: boolean;
  score: number;
  missingElements: string[];
  domainSpecificFeedback: string[];
}> {
  if (domain === 'general') {
    return {
      isComplete: true,
      score: 8.0,
      missingElements: [],
      domainSpecificFeedback: []
    };
  }

  const config = DOMAIN_CONFIGS[domain];
  const missingElements: string[] = [];
  const feedback: string[] = [];
  let score = 10;

  // Verificar número de módulos (penalidade mais suave)
  const moduleCount = structure.modules?.length || 0;
  if (moduleCount < config.minModules) {
    const ratio = moduleCount / config.minModules;
    if (ratio < 0.5) {
      missingElements.push(`Mínimo ${config.minModules} módulos (atual: ${moduleCount})`);
      score -= 2; // Penalidade maior apenas se muito abaixo
    } else {
      feedback.push(`Recomenda-se mais módulos (atual: ${moduleCount}, ideal: ${config.minModules})`);
      score -= 0.5; // Penalidade menor se próximo
    }
  }

  // Verificar balanceamento teoria/prática
  const theoryModules = structure.modules?.filter((m: any) =>
    m.description?.toLowerCase().includes('teoria') ||
    m.description?.toLowerCase().includes('fundamentos')
  ).length || 0;

  const practiceModules = structure.modules?.filter((m: any) =>
    m.description?.toLowerCase().includes('prática') ||
    m.description?.toLowerCase().includes('exercício') ||
    m.description?.toLowerCase().includes('aplicação')
  ).length || 0;

  const actualTheoryRatio = theoryModules / moduleCount;
  const expectedTheoryRatio = config.moduleStructure.theory;

  if (Math.abs(actualTheoryRatio - expectedTheoryRatio) > 0.2) {
    feedback.push(`Ajustar balanceamento teoria/prática (esperado: ${Math.round(expectedTheoryRatio * 100)}% teoria)`);
    score -= 0.5;
  }

  // Verificar pré-requisitos
  const hasPrerequisites = structure.prerequisites && structure.prerequisites.length > 0;
  if (!hasPrerequisites && config.prerequisites.length > 0) {
    missingElements.push('Pré-requisitos específicos da área');
    score -= 1;
  }

  // Verificar aspectos específicos (penalidades mais suaves)
  if (config.industryStandards) {
    const hasStandards = structure.modules?.some((m: any) =>
      m.description?.toLowerCase().includes('norma') ||
      m.description?.toLowerCase().includes('padrão') ||
      m.description?.toLowerCase().includes('regulamentação') ||
      m.title?.toLowerCase().includes('norma') ||
      m.title?.toLowerCase().includes('padrão')
    );
    if (!hasStandards) {
      feedback.push('Considere incluir normas e padrões industriais');
      score -= 0.3; // Penalidade menor
    }
  }

  if (config.labWork) {
    const hasLab = structure.modules?.some((m: any) =>
      m.description?.toLowerCase().includes('laboratório') ||
      m.description?.toLowerCase().includes('prática') ||
      m.description?.toLowerCase().includes('experimento') ||
      m.title?.toLowerCase().includes('prática') ||
      m.description?.toLowerCase().includes('aplicação')
    );
    if (!hasLab) {
      feedback.push('Considere incluir mais atividades práticas/laboratoriais');
      score -= 0.3; // Penalidade menor
    }
  }

  // Verificar competências específicas (busca mais ampla)
  const skillsFound = config.skillFocus.some(skill => {
    const skillWords = skill.replace('-', ' ').split(' ');
    return skillWords.some(word =>
      JSON.stringify(structure).toLowerCase().includes(word)
    );
  });
  if (!skillsFound) {
    feedback.push(`Incluir competências específicas: ${config.skillFocus.join(', ')}`);
    score -= 0.2; // Penalidade bem menor
  }

  return {
    isComplete: missingElements.length === 0,
    score: Math.max(score, 0),
    missingElements,
    domainSpecificFeedback: feedback
  };
}