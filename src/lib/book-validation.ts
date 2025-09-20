/**
 * Sistema de validação de livros acadêmicos
 * Valida relevância, qualidade e adequação pedagógica
 */

import { BookSearchResult } from '@/types';

export interface BookValidation {
  book: BookSearchResult | any;
  score: number; // 0-100
  reasons: string[];
  isRelevant: boolean;
  educationalValue: number; // 0-10
  topicAlignment: number; // 0-10
  levelAppropriate: boolean;
}

export interface ValidationCriteria {
  query: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  minScore: number;
  preferredLanguage?: string;
  requiredTopics?: string[];
}

/**
 * Valida uma lista de livros baseado em critérios pedagógicos
 */
export function validateBookList(
  books: any[],
  query: string,
  level: 'beginner' | 'intermediate' | 'advanced',
  minScore: number = 60
): BookValidation[] {
  const criteria: ValidationCriteria = {
    query,
    level,
    minScore,
    preferredLanguage: 'pt'
  };

  return books.map(book => validateSingleBook(book, criteria));
}

/**
 * Valida um único livro
 */
export function validateSingleBook(
  book: any,
  criteria: ValidationCriteria
): BookValidation {
  const validation: BookValidation = {
    book,
    score: 0,
    reasons: [],
    isRelevant: false,
    educationalValue: 0,
    topicAlignment: 0,
    levelAppropriate: false
  };

  // 1. Validação de relevância do tópico (0-40 pontos)
  const topicScore = calculateTopicRelevance(book, criteria.query);
  validation.topicAlignment = topicScore / 4; // Converter para 0-10
  validation.score += topicScore;

  if (topicScore >= 20) {
    validation.reasons.push('Alta relevância para o tópico');
  } else if (topicScore >= 10) {
    validation.reasons.push('Relevância moderada para o tópico');
  } else {
    validation.reasons.push('Baixa relevância para o tópico');
  }

  // 2. Validação de nível educacional (0-25 pontos)
  const levelScore = calculateLevelAppropriateness(book, criteria.level);
  validation.score += levelScore;
  validation.levelAppropriate = levelScore >= 15;

  if (validation.levelAppropriate) {
    validation.reasons.push(`Apropriado para nível ${criteria.level}`);
  } else {
    validation.reasons.push(`Pode não ser ideal para nível ${criteria.level}`);
  }

  // 3. Qualidade e reputação (0-20 pontos)
  const qualityScore = calculateQualityScore(book);
  validation.educationalValue = qualityScore / 2; // Converter para 0-10
  validation.score += qualityScore;

  if (qualityScore >= 15) {
    validation.reasons.push('Livro de alta qualidade e reputação');
  } else if (qualityScore >= 10) {
    validation.reasons.push('Livro de qualidade adequada');
  } else {
    validation.reasons.push('Qualidade do livro incerta');
  }

  // 4. Idioma e acessibilidade (0-10 pontos)
  const languageScore = calculateLanguageScore(book, criteria.preferredLanguage);
  validation.score += languageScore;

  if (languageScore >= 8) {
    validation.reasons.push('Disponível no idioma preferido');
  } else {
    validation.reasons.push('Pode haver barreira de idioma');
  }

  // 5. Atualidade (0-5 pontos)
  const recencyScore = calculateRecencyScore(book);
  validation.score += recencyScore;

  if (recencyScore >= 3) {
    validation.reasons.push('Conteúdo atualizado');
  } else {
    validation.reasons.push('Conteúdo pode estar desatualizado');
  }

  // Determinar se é relevante
  validation.isRelevant = validation.score >= criteria.minScore;

  return validation;
}

/**
 * Calcula relevância do livro para o tópico (0-40 pontos)
 */
function calculateTopicRelevance(book: any, query: string): number {
  let score = 0;
  const queryLower = query.toLowerCase();
  const title = book.title?.toLowerCase() || '';
  const description = book.description?.toLowerCase() || '';
  const subjects = book.subjects || [];
  const topics = book.topics || [];

  // Correspondência no título (0-15 pontos)
  if (title.includes(queryLower)) {
    score += 15;
  } else {
    const queryWords = queryLower.split(' ');
    const titleMatches = queryWords.filter(word => title.includes(word)).length;
    score += Math.min(titleMatches * 3, 10);
  }

  // Correspondência nos assuntos (0-15 pontos)
  const subjectMatches = subjects.filter((subject: string) =>
    subject.toLowerCase().includes(queryLower) || queryLower.includes(subject.toLowerCase())
  ).length;
  score += Math.min(subjectMatches * 5, 15);

  // Correspondência nos tópicos (0-10 pontos)
  const topicMatches = topics.filter((topic: string) =>
    topic.toLowerCase().includes(queryLower) || queryLower.includes(topic.toLowerCase())
  ).length;
  score += Math.min(topicMatches * 2, 10);

  return Math.min(score, 40);
}

/**
 * Calcula adequação do nível educacional (0-25 pontos)
 */
function calculateLevelAppropriateness(book: any, targetLevel: string): number {
  const bookLevel = book.level || book.educationLevel || 'undergraduate';

  // Mapeamento de níveis
  const levelMapping = {
    'beginner': ['undergraduate', 'high_school'],
    'intermediate': ['undergraduate', 'professional'],
    'advanced': ['graduate', 'professional', 'undergraduate']
  };

  const appropriateLevels = levelMapping[targetLevel as keyof typeof levelMapping] || [];

  if (appropriateLevels.includes(bookLevel)) {
    // Pontuação baseada na correspondência exata
    if (
      (targetLevel === 'beginner' && bookLevel === 'undergraduate') ||
      (targetLevel === 'intermediate' && bookLevel === 'undergraduate') ||
      (targetLevel === 'advanced' && bookLevel === 'graduate')
    ) {
      return 25;
    } else {
      return 20;
    }
  }

  // Penalidade por incompatibilidade
  if (targetLevel === 'beginner' && bookLevel === 'graduate') {
    return 5; // Muito avançado
  }
  if (targetLevel === 'advanced' && bookLevel === 'high_school') {
    return 5; // Muito básico
  }

  return 15; // Neutro
}

/**
 * Calcula pontuação de qualidade (0-20 pontos)
 */
function calculateQualityScore(book: any): number {
  let score = 0;

  // Rating do livro (0-10 pontos)
  if (book.rating) {
    score += Math.min(book.rating * 2, 10);
  } else {
    score += 5; // Pontuação neutra se não há rating
  }

  // Reputação do autor/editora (0-5 pontos)
  const reputablePublishers = [
    'mcgraw hill', 'pearson', 'cengage', 'ltc', 'springer',
    'elsevier', 'wiley', 'oxford', 'cambridge'
  ];

  const publisher = book.publisher?.toLowerCase() || '';
  if (reputablePublishers.some(pub => publisher.includes(pub))) {
    score += 5;
  } else {
    score += 2;
  }

  // Presença de ISBN (0-3 pontos)
  if (book.isbn && book.isbn.length >= 10) {
    score += 3;
  }

  // Descrição detalhada (0-2 pontos)
  if (book.description && book.description.length > 100) {
    score += 2;
  }

  return Math.min(score, 20);
}

/**
 * Calcula pontuação de idioma (0-10 pontos)
 */
function calculateLanguageScore(book: any, preferredLanguage: string = 'pt'): number {
  const bookLanguage = book.language || 'pt';

  if (bookLanguage === preferredLanguage) {
    return 10;
  }

  // Se preferir português mas livro está em inglês, ainda é aceitável
  if (preferredLanguage === 'pt' && bookLanguage === 'en') {
    return 6;
  }

  // Outros casos
  return 4;
}

/**
 * Calcula pontuação de atualidade (0-5 pontos)
 */
function calculateRecencyScore(book: any): number {
  const currentYear = new Date().getFullYear();
  const bookYear = book.year || currentYear - 10; // Assumir 10 anos se não especificado

  const age = currentYear - bookYear;

  if (age <= 5) return 5;      // Muito recente
  if (age <= 10) return 4;     // Recente
  if (age <= 15) return 3;     // Moderadamente antigo
  if (age <= 20) return 2;     // Antigo
  return 1;                    // Muito antigo
}

/**
 * Gera relatório de validação legível
 */
export function generateValidationReport(validations: BookValidation[]): string {
  const relevant = validations.filter(v => v.isRelevant);
  const irrelevant = validations.filter(v => !v.isRelevant);

  let report = `📊 RELATÓRIO DE VALIDAÇÃO DE LIVROS\n\n`;

  report += `✅ Livros relevantes: ${relevant.length}\n`;
  report += `❌ Livros não relevantes: ${irrelevant.length}\n`;
  report += `📈 Taxa de aprovação: ${((relevant.length / validations.length) * 100).toFixed(1)}%\n\n`;

  if (relevant.length > 0) {
    report += `📚 LIVROS APROVADOS (por pontuação):\n`;
    relevant
      .sort((a, b) => b.score - a.score)
      .forEach((v, index) => {
        report += `${index + 1}. ${v.book.title} (${v.score}/100 pontos)\n`;
        report += `   Autor: ${v.book.author}\n`;
        report += `   Razões: ${v.reasons.join(', ')}\n\n`;
      });
  }

  if (irrelevant.length > 0) {
    report += `❌ LIVROS REJEITADOS:\n`;
    irrelevant.forEach((v, index) => {
      report += `${index + 1}. ${v.book.title} (${v.score}/100 pontos)\n`;
      report += `   Problemas: ${v.reasons.filter(r => r.includes('Baixa') || r.includes('não')).join(', ')}\n\n`;
    });
  }

  return report;
}

/**
 * Filtra livros mantendo apenas os mais relevantes
 */
export function filterBestBooks(
  validations: BookValidation[],
  maxCount: number = 5
): BookValidation[] {
  return validations
    .filter(v => v.isRelevant)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxCount);
}