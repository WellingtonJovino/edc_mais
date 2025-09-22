export interface Prerequisite {
  id: string;
  topic: string;
  description: string;
  importance: 'essential' | 'recommended' | 'optional';
  estimatedTime: string; // ex: "2 horas", "1 semana"
  resources?: {
    type: 'course' | 'video' | 'article' | 'book';
    title: string;
    url?: string;
    description?: string;
  }[];
}

export interface SupportCourse {
  id: string;
  title: string;
  description: string;
  prerequisiteFor: string; // ID do tópico que precisa desta base
  topics: string[]; // Lista de tópicos do curso de apoio
  estimatedDuration: string;
  difficulty: 'beginner' | 'intermediate';
}

// NOVA ESTRUTURA: Course representa o curso completo (ex: "Cálculo A")
export interface Course {
  id: string;
  title: string; // Ex: "Cálculo A", "Física Geral I", "Programação Web"
  description: string;
  level: 'beginner' | 'intermediate' | 'advanced';

  // Nova hierarquia: Course → Module → Topic
  modules: Module[]; // Módulos principais (ex: "Funções", "Limites")

  // Metadados do curso
  prerequisites?: Prerequisite[];
  supportCourses?: SupportCourse[];
  recommendedBooks?: BookSearchResult[]; // Livros recomendados do Anna's Archive
  totalEstimatedHours?: number;
  difficultyLevel?: number; // 1-10
  created_at: string;
  updated_at: string;

  // DEPRECATED: Manter para compatibilidade
  topics?: Topic[]; // Usar modules[].topics em vez disso

  // Metadados opcionais para análises avançadas
  metadata?: {
    [key: string]: any;
    priorKnowledgeAnalysis?: any;
    courseAssessment?: any;
    personalizedContent?: boolean;
  };
}

// Manter LearningGoal como alias para compatibilidade
export type LearningGoal = Course;

// NOVA DEFINIÇÃO: Module representa um tópico principal (ex: "Funções", "Limites")
export interface Module {
  id: string;
  title: string; // Ex: "Funções", "Limites", "Derivadas"
  description: string;
  order: number;

  // Diretamente tópicos específicos (sub-tópicos)
  topics: Topic[]; // Array de sub-tópicos específicos

  // Estado e metadados
  completed: boolean;
  estimatedDuration: string;
  color?: string; // Para diferenciação visual

  // Para organização pedagógica
  learningObjectives?: string[]; // Objetivos gerais do módulo
  prerequisiteModules?: string[]; // Módulos pré-requisito

  // DEPRECATED: Manter sections para compatibilidade, mas usar topics diretamente
  sections?: Section[]; // Para compatibilidade com código existente
}

// DEPRECATED: Section não é mais necessária na nova hierarquia
// Mantida apenas para compatibilidade com código existente
export interface Section {
  id: string;
  title: string;
  description: string;
  order: number;
  topics: Topic[];
  completed: boolean;
  estimatedDuration: string;
  learningObjectives?: string[];
}

// NOVA ESTRUTURA HIERÁRQUICA INSPIRADA NO RESPONDE AÍ
// Course (Título) → Module (Tópicos principais) → Topic (Sub-tópicos) → Content (3 vídeos + 1 aula-texto)

export interface SubTopic {
  id: string;
  title: string;
  description: string;
  detailedDescription: string; // Descrição detalhada do que deve ser aprendido
  order: number;
  // Cada sub-tópico tem exatamente 3 vídeos + 1 aula-texto
  videos: YouTubeVideo[]; // Exatamente 3 vídeos
  aulaTexto: AulaTextoStructure; // 1 aula-texto específica
  completed: boolean;
  estimatedDuration: string;
  hasDoubtButton?: boolean; // Para o botão de dúvidas específico

  // Metadados para contextualização e busca
  learningObjectives: string[]; // O que deve ser aprendido
  prerequisiteTopics?: string[]; // Tópicos que devem ser dominados antes
  keyTerms: string[]; // Termos-chave para busca contextual
  searchKeywords: string[]; // Palavras-chave para YouTube search
  difficulty: 'easy' | 'medium' | 'hard';
}

// DEPRECATED: Manter para compatibilidade, mas usar SubTopic diretamente
export interface SubTopicContent {
  type: 'video' | 'aula-texto' | 'exercise' | 'quiz';
  data: YouTubeVideo | AulaTextoStructure | ExerciseSet | any;
}

export interface ExerciseSet {
  id: string;
  title: string;
  exercises: ExerciseItem[];
  difficulty: 'easy' | 'medium' | 'hard';
  totalQuestions: number;
}

// NOVA DEFINIÇÃO: Topic agora é um Sub-tópico específico
// Cada Topic tem conteúdo específico: 3 vídeos + 1 aula-texto
export interface Topic {
  id: string;
  title: string;
  description: string;
  detailedDescription: string; // Descrição detalhada do que deve ser aprendido
  order: number;

  // Conteúdo específico do sub-tópico
  videos: YouTubeVideo[]; // Exatamente 3 melhores vídeos
  aulaTexto: AulaTextoStructure; // 1 aula-texto específica

  // Estado e metadados
  completed: boolean;
  estimatedDuration: string;
  hasDoubtButton?: boolean;

  // Para contextualização e busca inteligente
  learningObjectives: string[]; // Objetivos específicos deste sub-tópico
  prerequisiteTopics?: string[]; // Tópicos pré-requisito
  keyTerms: string[]; // Termos-chave
  searchKeywords: string[]; // Para busca contextual no YouTube
  difficulty: 'easy' | 'medium' | 'hard';

  // DEPRECATED: Manter para compatibilidade com código legado
  academicContent?: AcademicContent;
  subtopics?: SubTopic[]; // Usar subtopics como array de conteúdos alternativos
  contentType?: 'video' | 'aula-texto' | 'exercise' | 'mixed';
}

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  channelTitle: string;
  publishedAt: string;
  videoId: string;
  relevanceScore?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  attachedFiles?: UploadedFile[];
}

export interface WorkedExample {
  title: string;
  statement: string;
  solution: string; // com LaTeX
}

export interface GlossaryItem {
  term: string;
  definition: string;
}

export interface ExerciseItem {
  statement: string;
  answer: string;
}

export interface AcademicContent {
  id: string;
  topicId: string;
  introduction: string;
  lecture: string;                 // NOVO: aula completa
  keyConcepts: string[];
  workedExamples: WorkedExample[]; // NOVO: exemplos resolvidos
  practicalExamples: string[];     // Mantém compatibilidade
  commonMisunderstandings: string[];
  exercises: ExerciseItem[];       // NOVO: exercícios
  glossary: GlossaryItem[];        // NOVO: glossário
  references: AcademicReference[];
  summary: string;
  created_at: string;
}

export interface AcademicReference {
  title: string;
  authors: string[];
  year: number;
  url?: string;
  doi?: string;
  type: 'article' | 'paper' | 'book' | 'website';
}

export interface PerplexityResponse {
  answer: string;
  citations: PerplexityCitation[];
}

export interface PerplexityCitation {
  title: string;
  url: string;
  snippet: string;
}

export interface LearningPlan {
  id: string;
  goal: LearningGoal; // Manter compatibilidade
  course?: Course; // Nova referência direta ao curso
  messages: ChatMessage[];
  progress: number;
  created_at: string;
  uploadedFiles?: UploadedFile[];
  topicValidation?: TopicValidationResult;
  fileAnalysis?: FileAnalysisResult;
  courseId?: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string;
  uploadedAt: string;
  // OpenAI File Search info
  openaiFileId?: string;
  vectorStoreId?: string;
  assistantId?: string;
}

export interface TopicValidationResult {
  suggestedTopics: string[];
  missingTopics: string[];
  additionalTopics: string[];
  validationSummary: string;
}

export interface FileAnalysisResult {
  extractedTopics: string[];
  coverageAnalysis: string;
  recommendations: string[];
  missingFromFiles: string[];
  extraInFiles: string[];
  // OpenAI File Search results
  vectorStoreId?: string;
  assistantId?: string;
  fileSearchEnabled?: boolean;
}

// ============================================================================
// TIPOS PARA AULA-TEXTO MELHORADA (ATUALIZADA PARA NOVA ESTRUTURA)
// ============================================================================

export interface AulaTextoStructure {
  topic: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  metadata: {
    generatedAt: string;
    sources: string[];
    tokensUsed?: number;
    qualityScore?: number;
  };
  introducao: {
    objetivos: string[];
    preRequisitos: string[];
    tempoEstimado: string;
    overview: string;
  };
  desenvolvimento: {
    conceitos: Array<{
      titulo: string;
      definicao: string;
      explicacao: string;
      exemplos: Array<{
        titulo: string;
        descricao: string;
        solucao?: string;
      }>;
      analogias: string[];
      figuras?: Array<{
        descricao: string;
        imagePrompt: string;
        tipo: 'diagrama' | 'grafico' | 'ilustracao' | 'esquema' | 'foto';
        posicao: 'inicio' | 'meio' | 'fim';
        tamanho: 'pequeno' | 'medio' | 'grande';
        legenda: string;
        imageUrl?: string; // URL da imagem gerada
      }>;
      formulas?: Array<{
        nome: string;
        latex: string;
        explicacao: string;
        aplicacao: string;
      }>;
      graficos?: Array<{
        titulo: string;
        tipo: 'linha' | 'barra' | 'pizza' | 'dispersao' | 'funcao';
        descricao: string;
        dados?: any; // Dados para gerar o gráfico
        imagePrompt: string; // Para gerar via IA
        imageUrl?: string;
      }>;
    }>;
  };
  conclusao: {
    resumoExecutivo: string;
    pontosChave: string[];
    conexoesFuturas: string[];
  };
  verificacao: {
    perguntasReflexao: string[];
    exercicios: Array<{
      pergunta: string;
      dificuldade: 'facil' | 'medio' | 'dificil';
      gabarito: string;
      explicacao: string;
    }>;
    autoavaliacao: string[];
  };
  referencias: Array<{
    titulo: string;
    tipo: 'documento' | 'video' | 'artigo' | 'site';
    url?: string;
    citacao?: string;
  }>;
}

export interface AulaTextoConfig {
  topic: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  studentProfile?: {
    priorKnowledge?: string[];
    learningGoals?: string[];
    timeAvailable?: string;
  };
  ragContext?: string[];
  maxWords?: number;
}

export interface AulaTextoQualityAssessment {
  score: number; // 0-10 com 2 casas decimais
  detalhamento: {
    clareza: { pontos: number; comentario: string };
    completude: { pontos: number; comentario: string };
    precisao: { pontos: number; comentario: string };
    exemplos: { pontos: number; comentario: string };
    exercicios: { pontos: number; comentario: string };
    adequacao: { pontos: number; comentario: string };
  };
  checklist: Array<{
    item: string;
    ok: boolean;
    comentario: string;
  }>;
  feedback: string[]; // até 6 sugestões acionáveis
  needsRewrite: boolean; // true se score < 8
  strengths: string[]; // pontos fortes identificados
  improvementAreas: string[]; // áreas específicas para melhorar
}

export interface RAGContext {
  source: 'documento' | 'video' | 'perplexity' | 'openai';
  content: string;
  relevanceScore?: number;
  metadata?: {
    title?: string;
    author?: string;
    url?: string;
    page?: number;
  };
}

// ============================================================================
// NOVOS TIPOS PARA GERAÇÃO CONTEXTUAL E BUSCA INTELIGENTE
// ============================================================================

/**
 * Configuração para busca contextual de vídeos por sub-tópico
 */
export interface ContextualVideoSearch {
  courseTitle: string; // Título do curso (ex: "Cálculo A")
  moduleTitle: string; // Tópico principal (ex: "Funções")
  topicTitle: string; // Sub-tópico específico (ex: "Função Afim")
  topicDescription: string; // Descrição do que deve ser aprendido
  learningObjectives: string[]; // Objetivos específicos
  keyTerms: string[]; // Termos-chave para busca
  difficulty: 'easy' | 'medium' | 'hard';
  targetVideoCount: number; // Quantos vídeos buscar (padrão: 3)
}

/**
 * Resultado da busca contextual com metadata
 */
export interface ContextualSearchResult {
  videos: YouTubeVideo[];
  searchMetadata: {
    queriesUsed: string[];
    totalCandidates: number;
    filteredCount: number;
    avgRelevanceScore: number;
    searchDuration: number;
  };
  contextUsed: {
    courseTitle: string;
    moduleTitle: string;
    topicTitle: string;
    keyTermsUsed: string[];
  };
}

/**
 * Configuração para geração de estrutura hierárquica
 */
export interface HierarchicalStructureConfig {
  userGoal: string; // O que o usuário quer aprender
  level: 'beginner' | 'intermediate' | 'advanced';
  targetModules?: number; // Número ideal de módulos (padrão: 4-8)
  topicsPerModule?: number; // Número ideal de sub-tópicos por módulo (padrão: 3-6)
  includePrerequisites?: boolean; // Se deve incluir pré-requisitos
  academicRigor?: boolean; // Se deve seguir sequência acadêmica
}

/**
 * Validação pedagógica da estrutura gerada
 */
export interface PedagogicalValidation {
  isValid: boolean;
  score: number; // 0-10
  feedback: {
    sequenceLogic: { valid: boolean; comment: string };
    difficultyProgression: { valid: boolean; comment: string };
    completeness: { valid: boolean; comment: string };
    academicRigor: { valid: boolean; comment: string };
  };
  suggestions: string[];
  missingTopics?: string[];
  redundantTopics?: string[];
}

// ========================================
// SISTEMA DE BIBLIOGRAFIA ACADÊMICA
// ========================================

/**
 * Resultado da busca de livros no Anna's Archive
 */
export interface BookSearchResult {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  year?: number;
  language: string;
  downloadLink: string;
  fileSize: string;
  format: 'pdf' | 'epub' | 'djvu' | 'doc' | 'other';
  coverImage?: string;
  publisher?: string;
  pages?: number;
  description?: string;
  rating?: number;
  downloadCount?: number;
}

/**
 * Capítulo extraído de um livro
 */
export interface BookChapter {
  number: number;
  title: string;
  startPage: number;
  endPage?: number;
  sections: BookSection[];
  keyTopics: string[];
  estimatedReadingTime: string;
  difficulty: 'basic' | 'intermediate' | 'advanced';
  exercises?: BookExercise[];
}

/**
 * Seção de um capítulo
 */
export interface BookSection {
  title: string;
  startPage: number;
  endPage?: number;
  subsections?: string[];
  keyTerms: string[];
  formulas: Formula[];
  examples: WorkedExample[];
}

/**
 * Exercício extraído de um livro
 */
export interface BookExercise {
  chapter: number;
  section?: string;
  number: string; // Ex: "3.1", "5.4", "Exercício 12"
  type: 'theoretical' | 'practical' | 'computational' | 'proof';
  difficulty: number; // 1-5
  topics: string[];
  hasSolution: boolean;
  content: string;
  page: number;
}

/**
 * Fórmula matemática extraída
 */
export interface Formula {
  name: string;
  expression: string; // LaTeX ou texto
  description: string;
  variables: {
    symbol: string;
    meaning: string;
    unit?: string;
  }[];
  chapter: number;
  page: number;
}

/**
 * Exemplo resolvido
 */
export interface WorkedExample {
  title: string;
  problem: string;
  solution: string;
  keySteps: string[];
  chapter: number;
  page: number;
  relatedTopics: string[];
}

/**
 * Conteúdo completo extraído de um livro
 */
export interface ExtractedBookContent {
  // Metadados
  bookInfo: BookSearchResult;
  extractionDate: string;
  totalPages: number;

  // Estrutura do livro
  chapters: BookChapter[];
  tableOfContents: {
    title: string;
    page: number;
    level: number; // 1=capítulo, 2=seção, 3=subseção
  }[];

  // Conteúdo pedagógico
  exercises: BookExercise[];
  formulas: Formula[];
  examples: WorkedExample[];
  glossary: {
    term: string;
    definition: string;
    page: number;
  }[];

  // Bibliografia e referências
  bibliography: {
    title: string;
    author: string;
    year?: number;
    isbn?: string;
  }[];

  // Análise pedagógica
  pedagogicalAnalysis: {
    approach: string; // teórico, prático, misto
    prerequisites: string[];
    learningObjectives: string[];
    targetAudience: string;
    estimatedCourseLength: string;
  };
}

/**
 * Recomendação de livro acadêmico pela OpenAI
 */
export interface BookRecommendation {
  title: string;
  author: string;
  isbn?: string;
  year?: number;
  publisher?: string;
  edition?: string;
  category: 'primary' | 'secondary' | 'supplementary' | 'reference';
  description: string;
  reasons: string[]; // Por que é recomendado
  relevanceScore: number; // 0-100
  universallyUsed: boolean; // Se é amplamente usado em universidades
}

/**
 * Bibliografia recomendada encontrada via Perplexity
 */
export interface RecommendedBibliography {
  courseName: string;
  educationLevel: 'high_school' | 'undergraduate' | 'graduate' | 'professional';
  country: string;
  searchDate: string;

  books: {
    title: string;
    author: string;
    isbn?: string;
    year?: number;
    publisher?: string;
    edition?: string;
    category: 'primary' | 'secondary' | 'supplementary' | 'reference';
    adoptionRate: 'high' | 'medium' | 'low'; // Baseado na frequência encontrada
    universities: string[]; // Universidades que adotam
    description?: string;
    reasons: string[]; // Por que é recomendado
  }[];

  searchSources: string[]; // URLs das fontes consultadas
  confidence: number; // 0-100
}

/**
 * Insights extraídos de um livro para melhorar o syllabus
 */
export interface BookInsights {
  bookId: string;

  // Alinhamento com o curso
  relevantChapters: {
    chapter: BookChapter;
    relevanceScore: number; // 0-100
    mappedTopics: string[]; // Tópicos do syllabus que este capítulo cobre
  }[];

  // Sugestões de melhoria
  syllabusImprovements: {
    missingTopics: string[]; // Tópicos no livro que não estão no syllabus
    redundantTopics: string[]; // Tópicos no syllabus que não estão no livro
    sequencingSuggestions: {
      topic: string;
      suggestedOrder: number;
      reason: string;
    }[];
  };

  // Recursos pedagógicos
  pedagogicalResources: {
    exercises: BookExercise[];
    examples: WorkedExample[];
    formulas: Formula[];
    practicalApplications: string[];
  };

  // Citações e referências
  citations: {
    topic: string;
    chapter: number;
    page: number;
    quote: string;
    context: string;
  }[];
}

/**
 * Análise de cobertura curricular
 */
export interface CurriculumCoverage {
  courseName: string;
  comparedBooks: string[]; // IDs dos livros comparados

  coverage: {
    coveredTopics: string[];
    missingTopics: string[];
    additionalTopics: string[];
    alignmentScore: number; // 0-100%
  };

  recommendations: {
    topicsToAdd: {
      topic: string;
      reason: string;
      suggestedPosition: number;
      foundInBooks: string[];
    }[];

    topicsToRemove: {
      topic: string;
      reason: string;
      rarity: number; // Quão raro é este tópico nos livros
    }[];

    sequenceAdjustments: {
      topic: string;
      currentPosition: number;
      suggestedPosition: number;
      reason: string;
    }[];
  };
}

/**
 * Estado da biblioteca virtual do usuário
 */
export interface VirtualLibrary {
  userId?: string;
  books: {
    bookInfo: BookSearchResult;
    status: 'downloading' | 'available' | 'error';
    downloadedAt?: string;
    bookmarks: {
      page: number;
      note: string;
      topic: string;
      createdAt: string;
    }[];
    readingProgress: {
      pagesRead: number[];
      lastReadPage: number;
      lastReadAt: string;
    };
  }[];

  collections: {
    name: string;
    description: string;
    bookIds: string[];
    createdAt: string;
  }[];
}

// ============================================================================
// TIPOS PARA SISTEMA DE UPLOAD E RAG - V2
// ============================================================================

/**
 * Arquivo processado com texto extraído e metadata
 */
export interface ProcessedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;

  // Conteúdo extraído
  rawText: string;
  extractedMetadata: {
    pages?: number;
    headings?: string[];
    author?: string;
    title?: string;
    language?: string;
  };

  // Processamento para RAG
  chunks: DocumentChunk[];
  embeddings?: EmbeddingResult[];

  // Análise do documento
  extractedTOC: string[];
  extractedTopics: DocumentTopic[];

  // Estados de processamento
  processingStatus: 'uploaded' | 'extracting' | 'chunking' | 'embedding' | 'analyzed' | 'complete' | 'error';
  errorMessage?: string;
}

/**
 * Chunk de texto do documento com embeddings
 */
export interface DocumentChunk {
  id: string;
  fileId: string;
  text: string;
  order: number;

  // Metadata do chunk
  startChar: number;
  endChar: number;
  tokens: number;

  // Para overlap
  overlapBefore?: string;
  overlapAfter?: string;

  // Embedding
  embedding?: number[];
  embeddingModel?: string;
}

/**
 * Resultado de embedding de um chunk
 */
export interface EmbeddingResult {
  chunkId: string;
  embedding: number[];
  model: string;
  tokensUsed: number;
  createdAt: string;
}

/**
 * Tópico extraído do documento via RAG
 */
export interface DocumentTopic {
  id: string;
  title: string;
  description: string;

  // Chunks relacionados a este tópico
  relatedChunks: {
    chunkId: string;
    relevanceScore: number;
    excerpt: string; // Trecho relevante do chunk
  }[];

  // Metadata
  estimatedDuration?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  keyTerms?: string[];
}

/**
 * Resultado do matching entre tópicos do curso e documentos
 */
export interface TopicMatch {
  courseTopicId: string;
  documentTopicId?: string;
  matchType: 'strong' | 'weak' | 'none';
  similarityScore: number;

  // Para strong match
  linkedChunks?: {
    chunkId: string;
    score: number;
    excerpt: string;
  }[];

  // Para weak match
  gaps?: string[]; // Partes não cobertas
  suggestions?: string[]; // Sugestões de granularização

  // Para no match
  newTopicSuggestion?: {
    title: string;
    description: string;
    chunks: string[];
  };
}

/**
 * Configuração para o pipeline de processamento de arquivos
 */
export interface FileProcessingConfig {
  // Configurações de chunking
  chunkSize: number; // caracteres (padrão: 1000)
  chunkOverlap: number; // caracteres (padrão: 200)

  // Configurações de embedding
  embeddingModel: 'text-embedding-3-large' | 'text-embedding-3-small';
  batchSize: number; // chunks por batch (padrão: 10)

  // Configurações de matching
  strongMatchThreshold: number; // padrão: 0.75
  weakMatchThreshold: number; // padrão: 0.60

  // Configurações gerais
  enableOCR: boolean;
  maxFileSize: number; // bytes
  supportedFormats: string[];
}

/**
 * Estado do processamento de arquivos
 */
export interface FileProcessingStatus {
  sessionId: string;
  currentFile?: string;
  currentStep: 'uploading' | 'extracting' | 'chunking' | 'embedding' | 'analyzing' | 'matching' | 'complete';
  progress: number; // 0-100
  message: string;

  // Resultados parciais
  processedFiles: ProcessedFile[];
  matches: TopicMatch[];

  // Erros
  errors: {
    fileId: string;
    step: string;
    error: string;
  }[];
}

/**
 * Resultado final do processamento com estrutura integrada
 */
export interface EnhancedCourseStructure {
  // Estrutura base do curso
  course: Course;

  // Integração com documentos
  documentMatches: {
    [topicId: string]: {
      matchType: 'strong' | 'weak' | 'none';
      documentSources: {
        fileId: string;
        fileName: string;
        chunks: {
          chunkId: string;
          text: string;
          score: number;
        }[];
      }[];
    };
  };

  // Novos tópicos criados a partir dos documentos
  documentDerivedTopics: {
    moduleId: string;
    topic: Topic;
    sourceChunks: {
      fileId: string;
      chunkId: string;
      text: string;
    }[];
  }[];

  // Tópicos sem correspondência em documentos
  unmatchedTopics: {
    topicId: string;
    title: string;
    needsExternalContent: boolean;
  }[];
}

/**
 * Contexto RAG para geração de conteúdo
 */
export interface RAGContext {
  topicId: string;
  sources: {
    type: 'document' | 'web' | 'perplexity';
    content: string;
    metadata: {
      fileName?: string;
      chunkId?: string;
      url?: string;
      relevanceScore: number;
    };
  }[];

  // Para geração de aula-texto
  keyPoints: string[];
  examples: string[];
  relatedConcepts: string[];
}