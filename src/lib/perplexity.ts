import { PerplexityResponse, AcademicContent, AcademicReference, WorkedExample, GlossaryItem, ExerciseItem } from '@/types';
import OpenAI from 'openai';

// Cliente OpenAI para fallback
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Sanitiza texto JSON removendo caracteres de controle e cercas de código
 */
function sanitizeToJson(text: string): string {
  // Remove cercas de código markdown
  text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');

  // Encontra o primeiro { e último } para extrair apenas o JSON
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
    throw new Error('Não foi possível encontrar JSON válido na resposta');
  }

  text = text.substring(firstBrace, lastBrace + 1);

  // Remove caracteres de controle problemáticos
  text = text.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007f-\u009f]/g, ' ');

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
  try {
    const clean = sanitizeToJson(raw);
    console.log('🔧 JSON sanitizado:', clean.substring(0, 200) + '...');
    return JSON.parse(clean);
  } catch (e) {
    console.error('❌ Erro no parsing JSON:', e);
    console.error('📄 Texto original (primeiros 500 chars):', raw.substring(0, 500));
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
}

export async function searchRequiredTopics(subject: string, level: string): Promise<string[]> {
  console.log('🔍 Perplexity - Buscando tópicos necessários para:', subject, 'nível:', level);

  const searchQuery = `Liste todos os tópicos fundamentais e necessários para aprender "${subject}" desde o nível ${level === 'beginner' ? 'iniciante até avançado' : level}. 
  Organize os tópicos em uma progressão lógica de aprendizado, do mais básico ao mais avançado. 
  Responda APENAS com uma lista numerada dos tópicos, sem explicações adicionais.
  Exemplo de formato:
  1. Conceitos básicos
  2. Fundamentos teóricos
  3. Aplicações práticas
  ...`;

  try {
    console.log('🌐 Fazendo requisição para buscar tópicos necessários...');
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

export async function searchAcademicContent(params: PerplexitySearchParams): Promise<PerplexityResponse> {
  const {
    query,
    model = 'sonar-pro',
    language = 'pt'
  } = params;

  console.log('🔍 Perplexity - Iniciando busca para:', query);
  console.log('🔑 API Key configurada:', !!process.env.PERPLEXITY_API_KEY);

  const searchQuery = language === 'pt' 
    ? `Pesquise conteúdos acadêmicos sobre "${query}" em português e inglês. Inclua artigos científicos, papers, livros acadêmicos e materiais de universidades reconhecidas.`
    : `Search for academic content about "${query}". Include scientific articles, research papers, academic books, and materials from recognized universities.`;

  console.log('📝 Query preparada:', searchQuery);

  try {
    console.log('🌐 Fazendo requisição para Perplexity...');
    const response = await fetch(PERPLEXITY_API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
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
        max_tokens: 2000,
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

Gere **apenas** um JSON válido UTF-8 (sem \`\`\`, sem comentários), com o seguinte schema:

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

Regras:
- Mantenha JSON válido (sem quebras de linha ilegais, sem barras invertidas extras).
- Priorize rigor e didática, mas seja conciso onde possível.
- Para referências, use apenas as do conteúdo fornecido.
`;

  try {
    console.log('🎯 Gerando aula completa para:', topic);
    
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
        statement: 'Exemplo não disponível no momento',
        solution: 'Solução não disponível no momento'
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
  
  return urls.map((url, index) => ({
    title: `Referência ${index + 1}`,
    url,
    snippet: extractSnippetAroundUrl(content, url)
  }));
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
  
  return topics.slice(0, 15); // Limita a 15 tópicos
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