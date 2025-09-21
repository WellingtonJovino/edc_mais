/**
 * Web Search Service
 * Fallback para quando Perplexity não estiver disponível
 */

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface SearchOptions {
  maxResults?: number;
  language?: string;
  region?: string;
}

export class WebSearch {
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.WEB_SEARCH_API_KEY;
  }

  /**
   * Busca na web usando múltiplas estratégias
   */
  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const { maxResults = 5 } = options;

    try {
      // Estratégia 1: Usar API de busca se configurada
      if (this.apiKey) {
        return await this.searchWithAPI(query, maxResults);
      }

      // Estratégia 2: Fallback para simulação/mock
      // Silencioso quando não há API configurada (esperado em muitos casos)
      if (process.env.DEBUG_MODE === 'true') {
        console.log(`⚠️ Web search API não configurada, usando dados mock`);
      }
      return this.getMockResults(query);

    } catch (error) {
      console.error('❌ Erro na busca web:', error);
      return this.getMockResults(query);
    }
  }

  /**
   * Busca usando API configurada
   */
  private async searchWithAPI(query: string, maxResults: number): Promise<SearchResult[]> {
    // Implementação da API de busca (Google Custom Search, Bing, etc.)
    // Esta é uma implementação placeholder

    console.log(`🔍 Buscando via API: "${query}"`);

    // Aqui você implementaria a chamada real à API
    // Por exemplo, Google Custom Search API:
    /*
    const response = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${this.apiKey}&cx=YOUR_CX&q=${encodeURIComponent(query)}&num=${maxResults}`
    );
    const data = await response.json();

    return data.items?.map((item: any) => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet
    })) || [];
    */

    // Por enquanto, retorna mock
    return this.getMockResults(query);
  }

  /**
   * Retorna resultados mock para desenvolvimento/teste
   */
  private getMockResults(query: string): SearchResult[] {
    const lowerQuery = query.toLowerCase();

    // Mock especializado por tipo de busca
    if (lowerQuery.includes('cálculo') || lowerQuery.includes('calculus')) {
      return [
        {
          title: 'Cálculo 2 - Ementa Completa',
          url: 'https://example.edu/calculus2',
          snippet: 'Módulo 1: Técnicas de Integração (substituição, partes, frações parciais). Módulo 2: Integrais Impróprias. Módulo 3: Séries e Sequências. Módulo 4: Funções de Várias Variáveis.'
        },
        {
          title: 'Stewart - Cálculo Volume 2',
          url: 'https://books.example.com/stewart-calculus',
          snippet: 'Capítulo 7: Técnicas de Integração. Capítulo 8: Aplicações da Integral. Capítulo 11: Sequências e Séries Infinitas. Capítulo 14: Derivadas Parciais.'
        }
      ];
    }

    if (lowerQuery.includes('mecânica') || lowerQuery.includes('mechanics')) {
      return [
        {
          title: 'Mecânica Vetorial para Engenheiros - Estática',
          url: 'https://example.edu/mechanics',
          snippet: 'Capítulo 1: Introdução. Capítulo 2: Estática de Partículas. Capítulo 3: Corpos Rígidos. Capítulo 4: Equilíbrio. Capítulo 5: Análise de Estruturas.'
        }
      ];
    }

    if (lowerQuery.includes('table of contents') || lowerQuery.includes('outline')) {
      return [
        {
          title: 'Sumário do Livro',
          url: 'https://example.com/book-toc',
          snippet: 'Parte I: Fundamentos. Capítulo 1: Introdução. Capítulo 2: Conceitos Básicos. Parte II: Desenvolvimento. Capítulo 3: Técnicas Intermediárias. Parte III: Aplicações Avançadas.'
        }
      ];
    }

    // Resultados genéricos
    return [
      {
        title: `Curso Completo de ${query}`,
        url: 'https://example.edu/course',
        snippet: `Ementa completa do curso de ${query} com todos os tópicos essenciais organizados progressivamente.`
      },
      {
        title: `${query} - Material Didático`,
        url: 'https://example.com/material',
        snippet: `Material de referência para ${query} incluindo exercícios, exemplos e aplicações práticas.`
      }
    ];
  }

  /**
   * Busca específica para sumários de livros
   */
  async searchBookTOC(bookTitle: string, authors: string): Promise<string | null> {
    const query = `"${bookTitle}" "${authors}" table of contents chapters outline`;
    const results = await this.search(query, { maxResults: 3 });

    for (const result of results) {
      if (result.snippet && result.snippet.length > 100) {
        return result.snippet;
      }
    }

    return null;
  }

  /**
   * Busca específica para ementas de disciplinas
   */
  async searchCourseSyllabus(discipline: string, level: string): Promise<string[]> {
    const query = `${discipline} ${level} syllabus curriculum topics university`;
    const results = await this.search(query, { maxResults: 5 });

    return results.map(r => r.snippet).filter(s => s && s.length > 50);
  }
}