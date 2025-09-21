import OpenAI from 'openai';
// import { getAvailableModel, calculateSafeTokenLimit, estimateCost } from './model-utils'; // ARCHIVED
import { searchRequiredTopics } from './perplexity';
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
 * Busca tópicos referenciais via Perplexity/RAG
 */
export async function fetchReferenceTopics(
  subject: string,
  discipline: string,
  educationLevel: string
): Promise<string[]> {
  console.log(`📚 Buscando tópicos acadêmicos recomendados...`);

  const searchQuery = `Extraia dos melhores sites que ensinam ${subject}, para ${educationLevel}, da disciplina: ${discipline}.
Liste TODOS os módulos, tópicos e sub-tópicos ensinados, organizados do nível iniciante → intermediário → avançado.
Inclua:
- Todos os capítulos e seções de cursos universitários
- Tópicos de ementas oficiais
- Conteúdo de livros-texto recomendados
- Exercícios e aplicações práticas
Organize em uma lista completa e detalhada.`;

  try {
    const perplexityResponse = await searchRequiredTopics(subject, educationLevel, searchQuery);

    if (perplexityResponse && perplexityResponse.length > 0) {
      console.log(`✅ ${perplexityResponse.length} tópicos encontrados via Perplexity`);
      return perplexityResponse;
    }
  } catch (error) {
    console.log(`⚠️ Perplexity indisponível, tentando busca web...`);
  }

  // Fallback para busca web desabilitado para V1
  /*
  try {
    const webSearch = new WebSearch();
    const results = await webSearch.search(
      `${discipline} curriculum topics syllabus university course outline`,
      { maxResults: 10 }
    );

    const topics: string[] = [];
    for (const result of results) {
      if (result.snippet) {
        topics.push(result.snippet);
      }
    }

    console.log(`✅ ${topics.length} tópicos encontrados via busca web`);
    return topics;
  } catch (error) {
    console.log(`⚠️ Busca web também falhou, continuando sem tópicos referenciais`);
    return [];
  }
  */

  // V1: Return empty array as fallback
  console.log('⚠️ Busca web desabilitada para V1, continuando sem tópicos referenciais');
  return [];
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
 * Monta a estrutura completa do curso com todos os dados coletados
 */
export async function generateCompleteCourseStructure(
  subject: string,
  discipline: string,
  userProfile: any,
  referenceTopics: string[],
  bookData: any,
  uploadedContent?: string
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
    hasUploadedContent: !!uploadedContent
  };

  console.log(`📊 Contexto:`, context);

  // Se temos muitos tópicos (>30), usar abordagem de clustering
  if (referenceTopics.length > CONFIG.MIN_TOPICS_FOR_CLUSTERING) {
    return await generateWithClustering(
      subject,
      discipline,
      userProfile,
      referenceTopics,
      bookData,
      uploadedContent
    );
  }

  // Caso contrário, gerar diretamente
  const systemPrompt = `Você é um designer instrucional especializado em criar currículos acadêmicos completos e estruturados.

TAREFA: Criar um curso universitário COMPLETO e DETALHADO para ${discipline}.

DADOS DISPONÍVEIS:
1. Tópicos referenciais de sites educacionais (${referenceTopics.length} itens)
2. Livros recomendados (${bookData.books.length} livros)
3. Sumários de livros (${bookData.summaries.length} sumários)
${uploadedContent ? '4. Material enviado pelo usuário' : ''}

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

Organize TUDO em uma estrutura curricular universitária completa.`;

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

  const structure = JSON.parse(completion.choices[0]?.message?.content || '{}');

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
  referenceTopics: string[],
  bookData: any,
  uploadedContent?: string
): Promise<any> {
  console.log(`📊 Usando clustering para ${referenceTopics.length} tópicos...`);

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
        content: `Agrupe estes ${referenceTopics.length} tópicos:\n${
          referenceTopics.map((t, i) => `${i}: ${t.substring(0, 100)}`).join('\n')
        }`
      }
    ],
    max_tokens: 2000,
    temperature: 0.2,
    response_format: { type: "json_object" }
  });

  const clusters = JSON.parse(clusteringCompletion.choices[0]?.message?.content || '{"clusters": []}');

  console.log(`✅ ${clusters.clusters?.length || 0} clusters criados`);

  // Passo 2: Gerar estrutura detalhada para cada cluster
  const modules = [];

  for (const cluster of clusters.clusters || []) {
    const clusterTopics = cluster.topics.map((i: number) => referenceTopics[i]).filter(Boolean);

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

    const module = JSON.parse(moduleCompletion.choices[0]?.message?.content || '{}');
    modules.push(module);
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
      totalTopics: referenceTopics.length,
      sources: ['perplexity', 'books', 'gpt']
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

    // 2. Detectar disciplina acadêmica (15-25%)
    await updateProgress(20, 1, 'Detectando disciplina acadêmica...');
    const { discipline, confidence, isAcademic } = await detectAcademicDiscipline(
      subject,
      userProfile,
      userMessage
    );

    // 3. Buscar tópicos referenciais (25-50%)
    await updateProgress(30, 2, 'Buscando tópicos acadêmicos especializados...');
    const referenceTopics = await fetchReferenceTopics(
      subject,
      discipline,
      userProfile.educationLevel || 'undergraduate'
    );
    await updateProgress(50, 2, 'Tópicos acadêmicos encontrados...');

    // 4. Buscar e validar livros (50-60%)
    await updateProgress(55, 2, 'Buscando recomendações bibliográficas...');
    const bookData = await fetchBookRecommendations(
      discipline,
      userProfile.educationLevel || 'undergraduate',
      referenceTopics
    );

    // 5. Processar arquivos enviados (se houver) (60-65%)
    await updateProgress(62, 2, 'Processando arquivos enviados...');
    let uploadedContent = '';
    if (uploadedFiles && uploadedFiles.length > 0) {
      uploadedContent = uploadedFiles.map(f => f.content || '').join('\n\n');
    }

    // 6. Gerar estrutura completa (65-85%)
    await updateProgress(68, 3, 'Gerando estrutura curricular completa...');
    const structure = await generateCompleteCourseStructure(
      subject,
      discipline,
      userProfile,
      referenceTopics,
      bookData,
      uploadedContent
    );
    await updateProgress(85, 3, 'Estrutura curricular gerada...');

    // 7. Validar por níveis (85-95%)
    await updateProgress(87, 4, 'Validando qualidade acadêmica...');
    const beginnerValidation = await validateStructureByLevel(structure, 'beginner');
    const intermediateValidation = await validateStructureByLevel(structure, 'intermediate');
    const advancedValidation = await validateStructureByLevel(structure, 'advanced');
    await updateProgress(95, 4, 'Validação de qualidade concluída...');

    // 8. Aplicar melhorias se necessário
    if (!beginnerValidation.isComplete || beginnerValidation.score < CONFIG.MIN_QUALITY_SCORE) {
      console.log(`🔧 Aplicando melhorias no nível iniciante...`);
      // Aqui você pode adicionar lógica para melhorar o nível iniciante
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
        booksFound: bookData.books.length,
        validationScores: {
          beginner: beginnerValidation.score,
          intermediate: intermediateValidation.score,
          advanced: advancedValidation.score
        }
      }
    };

    // 8. Finalizar (95-100%)
    await updateProgress(100, 4, 'Curso gerado com sucesso!');
    console.log(`✅ Pipeline completo! Estrutura final gerada com sucesso.`);

    return structure;

  } catch (error) {
    console.error(`❌ Erro no pipeline de geração:`, error);
    throw error;
  }
}