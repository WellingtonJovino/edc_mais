/**
 * Base de dados curada de livros acadêmicos
 * Livros selecionados por qualidade e relevância pedagógica
 */

import { BookSearchResult } from '@/types';

export interface AcademicBook {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  year?: number;
  publisher: string;
  description: string;
  subjects: string[];
  level: 'undergraduate' | 'graduate' | 'professional';
  language: 'pt' | 'en';
  rating: number; // 0-5
  topics: string[];
}

// Base curada de livros acadêmicos por área
const ACADEMIC_BOOKS: AcademicBook[] = [
  // MATEMÁTICA E CÁLCULO
  {
    id: 'stewart-calculo-vol1',
    title: 'Cálculo Volume 1',
    author: 'James Stewart',
    isbn: '9788522106844',
    year: 2013,
    publisher: 'Cengage Learning',
    description: 'Livro clássico de Cálculo para cursos de Engenharia e Ciências Exatas. Aborda limites, derivadas e integrais de forma clara e didática.',
    subjects: ['matemática', 'cálculo', 'engenharia'],
    level: 'undergraduate',
    language: 'pt',
    rating: 4.8,
    topics: ['funções', 'limites', 'derivadas', 'integrais', 'aplicações']
  },
  {
    id: 'guidorizzi-calculo-vol1',
    title: 'Um Curso de Cálculo Volume 1',
    author: 'Hamilton Luiz Guidorizzi',
    isbn: '9788521612599',
    year: 2018,
    publisher: 'LTC',
    description: 'Texto brasileiro clássico para o ensino de Cálculo, com abordagem pedagógica voltada para estudantes brasileiros.',
    subjects: ['matemática', 'cálculo'],
    level: 'undergraduate',
    language: 'pt',
    rating: 4.6,
    topics: ['números reais', 'funções', 'limites', 'continuidade', 'derivadas']
  },

  // MECÂNICA E FÍSICA
  {
    id: 'beer-johnston-estatica',
    title: 'Mecânica Vetorial para Engenheiros: Estática',
    author: 'Ferdinand P. Beer, E. Russell Johnston Jr., David F. Mazurek',
    isbn: '9788580555172',
    year: 2019,
    publisher: 'McGraw Hill Brasil',
    description: 'Livro clássico de Mecânica Vetorial e Estática para Engenharia, amplamente usado em universidades brasileiras.',
    subjects: ['física', 'mecânica', 'engenharia', 'estática'],
    level: 'undergraduate',
    language: 'pt',
    rating: 4.8,
    topics: ['vetores', 'equilíbrio', 'forças', 'momentos', 'treliças', 'estruturas']
  },
  {
    id: 'hibbeler-estatica',
    title: 'Estática - Mecânica para Engenharia',
    author: 'R.C. Hibbeler',
    isbn: '9788543020327',
    year: 2016,
    publisher: 'Pearson',
    description: 'Abordagem clara e sistemática da Estática com muitos exercícios resolvidos e propostos.',
    subjects: ['física', 'mecânica', 'engenharia', 'estática'],
    level: 'undergraduate',
    language: 'pt',
    rating: 4.7,
    topics: ['equilíbrio de partículas', 'corpos rígidos', 'análise estrutural', 'centroide', 'momento de inércia']
  },
  {
    id: 'halliday-fundamentos-fisica-vol1',
    title: 'Fundamentos de Física Volume 1: Mecânica',
    author: 'David Halliday, Robert Resnick, Jearl Walker',
    isbn: '9788521618553',
    year: 2016,
    publisher: 'LTC',
    description: 'Texto fundamental de Física para cursos de Engenharia, com abordagem conceitual sólida.',
    subjects: ['física', 'mecânica'],
    level: 'undergraduate',
    language: 'pt',
    rating: 4.7,
    topics: ['cinemática', 'dinâmica', 'trabalho', 'energia', 'momentum', 'rotação']
  },

  // PROGRAMAÇÃO
  {
    id: 'deitel-java',
    title: 'Java Como Programar',
    author: 'Harvey Deitel, Paul Deitel',
    isbn: '9788543004792',
    year: 2017,
    publisher: 'Pearson',
    description: 'Guia completo e didático para programação em Java, desde conceitos básicos até tópicos avançados.',
    subjects: ['programação', 'java', 'orientação a objetos'],
    level: 'undergraduate',
    language: 'pt',
    rating: 4.5,
    topics: ['sintaxe java', 'classes', 'objetos', 'herança', 'polimorfismo', 'interfaces', 'threads']
  },
  {
    id: 'cormen-algoritmos',
    title: 'Algoritmos: Teoria e Prática',
    author: 'Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, Clifford Stein',
    isbn: '9788535236996',
    year: 2012,
    publisher: 'Elsevier',
    description: 'Referência mundial em algoritmos e estruturas de dados, essencial para Ciência da Computação.',
    subjects: ['algoritmos', 'estruturas de dados', 'computação'],
    level: 'undergraduate',
    language: 'pt',
    rating: 4.9,
    topics: ['complexidade', 'ordenação', 'grafos', 'programação dinâmica', 'algoritmos gulosos']
  },

  // QUÍMICA
  {
    id: 'atkins-fisico-quimica',
    title: 'Físico-Química',
    author: 'Peter Atkins, Julio de Paula',
    isbn: '9788521617297',
    year: 2018,
    publisher: 'LTC',
    description: 'Texto clássico de Físico-Química com abordagem moderna e rigorosa dos conceitos fundamentais.',
    subjects: ['química', 'físico-química', 'termodinâmica'],
    level: 'undergraduate',
    language: 'pt',
    rating: 4.6,
    topics: ['termodinâmica', 'cinética química', 'equilíbrio químico', 'eletroquímica']
  },

  // ENGENHARIA ELÉTRICA
  {
    id: 'nilsson-circuitos-eletricos',
    title: 'Circuitos Elétricos',
    author: 'James W. Nilsson, Susan A. Riedel',
    isbn: '9788581430508',
    year: 2015,
    publisher: 'LTC',
    description: 'Fundamentos de circuitos elétricos com abordagem clara e muitos exercícios práticos.',
    subjects: ['engenharia elétrica', 'circuitos', 'eletrônica'],
    level: 'undergraduate',
    language: 'pt',
    rating: 4.5,
    topics: ['lei de ohm', 'análise nodal', 'teoremas de circuitos', 'capacitores', 'indutores', 'ac/dc']
  },

  // ECONOMIA
  {
    id: 'mankiw-principios-economia',
    title: 'Princípios de Economia',
    author: 'N. Gregory Mankiw',
    isbn: '9788522125098',
    year: 2020,
    publisher: 'Cengage Learning',
    description: 'Introdução clara e abrangente aos princípios fundamentais da economia moderna.',
    subjects: ['economia', 'microeconomia', 'macroeconomia'],
    level: 'undergraduate',
    language: 'pt',
    rating: 4.4,
    topics: ['oferta e demanda', 'elasticidade', 'custos', 'mercados', 'pib', 'inflação', 'desemprego']
  },

  // ESTATÍSTICA
  {
    id: 'montgomery-estatistica',
    title: 'Estatística Aplicada e Probabilidade para Engenheiros',
    author: 'Douglas C. Montgomery, George C. Runger',
    isbn: '9788521618522',
    year: 2016,
    publisher: 'LTC',
    description: 'Abordagem prática da estatística voltada para aplicações em engenharia.',
    subjects: ['estatística', 'probabilidade', 'engenharia'],
    level: 'undergraduate',
    language: 'pt',
    rating: 4.3,
    topics: ['probabilidade', 'distribuições', 'inferência', 'regressão', 'anova', 'controle de qualidade']
  },

  // MACHINE LEARNING
  {
    id: 'bishop-pattern-recognition',
    title: 'Pattern Recognition and Machine Learning',
    author: 'Christopher Bishop',
    isbn: '9780387310732',
    year: 2006,
    publisher: 'Springer',
    description: 'Texto fundamental em reconhecimento de padrões e aprendizado de máquina com abordagem matemática rigorosa.',
    subjects: ['machine learning', 'inteligência artificial', 'reconhecimento de padrões'],
    level: 'graduate',
    language: 'en',
    rating: 4.6,
    topics: ['regressão', 'classificação', 'redes neurais', 'svm', 'clustering', 'dimensionality reduction']
  },

  // CONSTRUÇÃO MECÂNICA / MATERIAIS
  {
    id: 'callister-ciencia-materiais',
    title: 'Ciência e Engenharia de Materiais: Uma Introdução',
    author: 'William D. Callister Jr., David G. Rethwisch',
    isbn: '9788521630957',
    year: 2016,
    publisher: 'LTC',
    description: 'Texto fundamental sobre ciência dos materiais, cobrindo estrutura, propriedades e aplicações.',
    subjects: ['engenharia de materiais', 'ciência dos materiais', 'construção mecânica'],
    level: 'undergraduate',
    language: 'pt',
    rating: 4.5,
    topics: ['estrutura cristalina', 'propriedades mecânicas', 'metais', 'cerâmicas', 'polímeros', 'tratamentos térmicos']
  },

  // TERMODINÂMICA
  {
    id: 'cengel-termodinamica',
    title: 'Termodinâmica',
    author: 'Yunus A. Çengel, Michael A. Boles',
    isbn: '9788580555561',
    year: 2013,
    publisher: 'McGraw Hill Brasil',
    description: 'Abordagem clara e didática da termodinâmica com muitas aplicações práticas.',
    subjects: ['termodinâmica', 'engenharia mecânica', 'física'],
    level: 'undergraduate',
    language: 'pt',
    rating: 4.4,
    topics: ['primeira lei', 'segunda lei', 'entropia', 'ciclos termodinâmicos', 'propriedades']
  }
];

/**
 * Busca livros por área de conhecimento ou tópicos
 */
export function searchBooksByArea(query: string): AcademicBook[] {
  const queryLower = query.toLowerCase();

  // Palavras-chave para diferentes áreas
  const areaKeywords = {
    matematica: ['matemática', 'cálculo', 'álgebra', 'geometria', 'equações', 'derivadas', 'integrais'],
    fisica: ['física', 'mecânica', 'termodinâmica', 'eletromagnetismo', 'ótica', 'estática', 'dinâmica'],
    programacao: ['programação', 'java', 'python', 'algoritmos', 'estruturas de dados', 'orientação a objetos'],
    engenharia: ['engenharia', 'construção', 'materiais', 'estruturas', 'circuitos', 'elétrica', 'mecânica'],
    quimica: ['química', 'físico-química', 'orgânica', 'inorgânica', 'reações'],
    economia: ['economia', 'microeconomia', 'macroeconomia', 'mercado', 'oferta', 'demanda'],
    estatistica: ['estatística', 'probabilidade', 'inferência', 'regressão', 'distribuições'],
    ia: ['machine learning', 'inteligência artificial', 'ia', 'redes neurais', 'deep learning']
  };

  // Função para calcular relevância
  const calculateRelevance = (book: AcademicBook): number => {
    let score = 0;

    // Busca direta no título
    if (book.title.toLowerCase().includes(queryLower)) score += 10;

    // Busca nos assuntos
    const subjectMatches = book.subjects.filter(subject =>
      subject.toLowerCase().includes(queryLower) || queryLower.includes(subject.toLowerCase())
    ).length;
    score += subjectMatches * 5;

    // Busca nos tópicos
    const topicMatches = book.topics.filter(topic =>
      topic.toLowerCase().includes(queryLower) || queryLower.includes(topic.toLowerCase())
    ).length;
    score += topicMatches * 3;

    // Busca por área usando palavras-chave
    for (const [area, keywords] of Object.entries(areaKeywords)) {
      const areaMatches = keywords.filter(keyword => queryLower.includes(keyword)).length;
      if (areaMatches > 0) {
        const bookAreaMatches = book.subjects.filter(subject =>
          keywords.some(keyword => subject.toLowerCase().includes(keyword))
        ).length;
        score += areaMatches * bookAreaMatches * 2;
      }
    }

    // Boost para livros em português
    if (book.language === 'pt') score += 1;

    // Boost baseado no rating
    score += book.rating;

    return score;
  };

  // Filtrar e ordenar por relevância
  const relevantBooks = ACADEMIC_BOOKS
    .map(book => ({ book, relevance: calculateRelevance(book) }))
    .filter(item => item.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance)
    .map(item => item.book);

  return relevantBooks.slice(0, 8); // Retornar top 8 livros mais relevantes
}

/**
 * Obtém livros por nível educacional
 */
export function getBooksByLevel(level: 'undergraduate' | 'graduate' | 'professional'): AcademicBook[] {
  return ACADEMIC_BOOKS.filter(book => book.level === level);
}

/**
 * Obtém livros por assunto específico
 */
export function getBooksBySubject(subject: string): AcademicBook[] {
  const subjectLower = subject.toLowerCase();
  return ACADEMIC_BOOKS.filter(book =>
    book.subjects.some(s => s.toLowerCase().includes(subjectLower))
  );
}

/**
 * Converte AcademicBook para BookSearchResult (compatibilidade)
 */
export function convertToBookRecommendation(book: AcademicBook): any {
  return {
    title: book.title,
    author: book.author,
    isbn: book.isbn || '',
    year: book.year || new Date().getFullYear(),
    publisher: book.publisher,
    description: book.description,
    relevanceScore: book.rating * 20, // Converter 0-5 para 0-100
    educationLevel: book.level,
    topics: book.topics,
    language: book.language
  };
}

/**
 * Busca livros relacionados a um tópico específico
 */
export function findRelatedBooks(topics: string[], maxResults: number = 5): AcademicBook[] {
  const allMatches = new Map<string, number>();

  // Para cada tópico, encontrar livros relevantes
  topics.forEach(topic => {
    const matches = searchBooksByArea(topic);
    matches.forEach((book, index) => {
      const currentScore = allMatches.get(book.id) || 0;
      // Pontuação decrescente baseada na posição
      const topicScore = Math.max(10 - index, 1);
      allMatches.set(book.id, currentScore + topicScore);
    });
  });

  // Ordenar por pontuação total e retornar livros
  const sortedIds = Array.from(allMatches.entries())
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0]);

  return sortedIds
    .map(id => ACADEMIC_BOOKS.find(book => book.id === id))
    .filter(book => book !== undefined)
    .slice(0, maxResults) as AcademicBook[];
}

/**
 * Obtém estatísticas da base de livros
 */
export function getBookDatabaseStats() {
  const subjects = new Set<string>();
  const authors = new Set<string>();
  let totalBooks = ACADEMIC_BOOKS.length;

  ACADEMIC_BOOKS.forEach(book => {
    book.subjects.forEach(subject => subjects.add(subject));
    authors.add(book.author);
  });

  return {
    totalBooks,
    uniqueSubjects: subjects.size,
    uniqueAuthors: authors.size,
    subjectsList: Array.from(subjects).sort(),
    levelDistribution: {
      undergraduate: ACADEMIC_BOOKS.filter(b => b.level === 'undergraduate').length,
      graduate: ACADEMIC_BOOKS.filter(b => b.level === 'graduate').length,
      professional: ACADEMIC_BOOKS.filter(b => b.level === 'professional').length
    }
  };
}