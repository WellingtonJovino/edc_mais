import { askAssistantWithFiles } from './openai-files';

export interface PDFIntelligentAnalysis {
  topicCoverage: {
    topic: string;
    covered: boolean;
    details: string[];
    missingElements: string[];
  }[];
  keyFormulas: {
    name: string;
    formula: string;
    context: string;
    page?: number;
  }[];
  practicalExamples: {
    title: string;
    description: string;
    context: string;
  }[];
  conceptualGaps: string[];
  enhancementSuggestions: string[];
}

/**
 * Análise inteligente de PDFs usando OpenAI File Search
 * Extrai informações específicas para melhorar aulas-texto
 */
export async function analyzeTopicWithPDFs(
  assistantId: string,
  topic: string,
  courseArea: string,
  level: 'beginner' | 'intermediate' | 'advanced'
): Promise<PDFIntelligentAnalysis> {
  try {
    console.log(`🔬 Analisando PDFs para tópico: "${topic}" na área: ${courseArea}`);

    const analysisQuery = `
Analise os documentos enviados para o tópico "${topic}" na área de ${courseArea} (nível ${level}).

ANÁLISE SOLICITADA:

1. **COBERTURA DO TÓPICO**:
   - O tópico "${topic}" é abordado nos documentos?
   - Quais aspectos específicos são cobertos?
   - Que informações importantes estão faltando?

2. **FÓRMULAS E EQUAÇÕES**:
   - Identifique fórmulas matemáticas relevantes
   - Extraia a notação exata (para converter em LaTeX)
   - Explique o contexto de cada fórmula

3. **EXEMPLOS PRÁTICOS**:
   - Encontre exemplos resolvidos ou casos práticos
   - Identifique aplicações do mundo real
   - Extraia dados numéricos específicos

4. **LACUNAS CONCEITUAIS**:
   - Que conceitos fundamentais não estão nos documentos?
   - Que explicações precisam ser complementadas?

5. **SUGESTÕES DE MELHORIA**:
   - Como usar os documentos para enriquecer uma aula sobre "${topic}"?
   - Que elementos visuais seriam úteis?

FORMATO DE RESPOSTA:
Retorne um JSON estruturado com:

{
  "topicCoverage": [{
    "topic": "${topic}",
    "covered": true/false,
    "details": ["detalhe1", "detalhe2"],
    "missingElements": ["elemento1", "elemento2"]
  }],
  "keyFormulas": [{
    "name": "Nome da fórmula",
    "formula": "Notação matemática exata",
    "context": "Onde e como é usada",
    "page": número_da_página
  }],
  "practicalExamples": [{
    "title": "Título do exemplo",
    "description": "Descrição detalhada",
    "context": "Contexto de aplicação"
  }],
  "conceptualGaps": ["conceito1 não abordado", "conceito2 superficial"],
  "enhancementSuggestions": ["sugestão1", "sugestão2"]
}

IMPORTANTE:
- Seja específico e baseie-se apenas no conteúdo dos documentos
- Se não encontrar informações, indique claramente
- Priorize informações que podem melhorar uma aula didática
`;

    const result = await askAssistantWithFiles(assistantId, analysisQuery);

    // Extrair JSON da resposta
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('⚠️ Resposta não contém JSON válido, usando estrutura padrão');
      return createEmptyAnalysis(topic);
    }

    const analysis = JSON.parse(jsonMatch[0]);
    console.log(`✅ Análise PDF concluída para "${topic}"`);

    return analysis as PDFIntelligentAnalysis;
  } catch (error) {
    console.error(`❌ Erro na análise PDF do tópico "${topic}":`, error);
    return createEmptyAnalysis(topic);
  }
}

/**
 * Enriquece uma aula-texto com informações extraídas dos PDFs
 */
export async function enrichAulaTextoWithPDFs(
  assistantId: string,
  topic: string,
  aulaTextoContent: string,
  courseArea: string
): Promise<{
  enhancedContent: string;
  addedElements: string[];
  pdfFormulas: { name: string; latex: string; explanation: string; }[];
  pdfExamples: { title: string; description: string; solution?: string; }[];
}> {
  try {
    console.log(`🚀 Enriquecendo aula-texto de "${topic}" com PDFs`);

    const enrichmentQuery = `
Baseando-se nos documentos enviados, ENRIQUEÇA o seguinte conteúdo de aula sobre "${topic}" na área de ${courseArea}:

CONTEÚDO ATUAL DA AULA:
${aulaTextoContent.substring(0, 3000)}...

TAREFAS DE ENRIQUECIMENTO:

1. **FÓRMULAS DOS DOCUMENTOS**:
   - Identifique fórmulas específicas dos documentos que complementam a aula
   - Converta para LaTeX correto
   - Adicione contexto prático dos documentos

2. **EXEMPLOS DOS DOCUMENTOS**:
   - Encontre exemplos específicos dos PDFs
   - Extraia dados numéricos reais
   - Inclua contexto original dos documentos

3. **MELHORIAS NO CONTEÚDO**:
   - Que informações dos documentos podem tornar a explicação mais específica?
   - Como conectar a teoria da aula com a prática dos documentos?

4. **ELEMENTOS VISUAIS**:
   - Que diagramas ou figuras dos documentos seriam úteis?
   - Descreva elementos visuais para geração de imagens

FORMATO DE RESPOSTA JSON:
{
  "enhancedContent": "Versão melhorada do conteúdo da aula",
  "addedElements": ["elemento1 adicionado", "elemento2"],
  "pdfFormulas": [{
    "name": "Nome",
    "latex": "Fórmula em LaTeX",
    "explanation": "Explicação baseada nos documentos"
  }],
  "pdfExamples": [{
    "title": "Título",
    "description": "Exemplo dos documentos",
    "solution": "Solução se disponível"
  }]
}

IMPORTANTE: Base-se EXCLUSIVAMENTE no conteúdo dos documentos enviados.
`;

    const result = await askAssistantWithFiles(assistantId, enrichmentQuery);

    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        enhancedContent: aulaTextoContent,
        addedElements: [],
        pdfFormulas: [],
        pdfExamples: []
      };
    }

    const enrichment = JSON.parse(jsonMatch[0]);
    console.log(`✅ Aula-texto enriquecida com ${enrichment.addedElements?.length || 0} elementos dos PDFs`);

    return enrichment;
  } catch (error) {
    console.error(`❌ Erro ao enriquecer aula-texto com PDFs:`, error);
    return {
      enhancedContent: aulaTextoContent,
      addedElements: [],
      pdfFormulas: [],
      pdfExamples: []
    };
  }
}

function createEmptyAnalysis(topic: string): PDFIntelligentAnalysis {
  return {
    topicCoverage: [{
      topic,
      covered: false,
      details: [],
      missingElements: ['Análise não disponível - documentos não processados']
    }],
    keyFormulas: [],
    practicalExamples: [],
    conceptualGaps: ['Análise de lacunas indisponível'],
    enhancementSuggestions: ['Envie documentos relevantes para análise personalizada']
  };
}

/**
 * Gera sugestões de imagens baseadas no conteúdo dos PDFs
 */
export async function generateImageSuggestionsFromPDFs(
  assistantId: string,
  topic: string,
  courseArea: string
): Promise<{
  title: string;
  prompt: string;
  type: 'diagram' | 'graph' | 'illustration' | 'scheme';
  priority: 'high' | 'medium' | 'low';
  description: string;
}[]> {
  try {
    const imageQuery = `
Baseando-se nos documentos sobre "${topic}" na área de ${courseArea}, sugira imagens educacionais que seriam úteis para uma aula didática.

TIPOS DE IMAGENS DESEJADAS:
- Diagramas técnicos
- Gráficos explicativos
- Ilustrações conceituais
- Esquemas paso-a-passo

Para cada sugestão, forneça:
1. Título descritivo
2. Prompt detalhado para geração de imagem
3. Tipo (diagram/graph/illustration/scheme)
4. Prioridade (high/medium/low)
5. Descrição do valor educacional

Retorne JSON array com as sugestões.
`;

    const result = await askAssistantWithFiles(assistantId, imageQuery);
    const jsonMatch = result.content.match(/\[[\s\S]*\]/);

    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return [];
  } catch (error) {
    console.error('Erro ao gerar sugestões de imagem:', error);
    return [];
  }
}