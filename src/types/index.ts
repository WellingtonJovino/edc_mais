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

export interface LearningGoal {
  id: string;
  title: string;
  description: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  modules: Module[]; // Estrutura hierárquica: módulos > seções > tópicos
  topics: Topic[]; // Mantém compatibilidade com código existente
  prerequisites?: Prerequisite[];
  supportCourses?: SupportCourse[];
  created_at: string;
  updated_at: string;
}

export interface Module {
  id: string;
  title: string;
  description: string;
  order: number;
  sections: Section[];
  completed: boolean;
  estimatedDuration: string;
  color?: string; // Para diferenciação visual
}

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

export interface SubTopic {
  id: string;
  title: string;
  description: string;
  order: number;
  content: SubTopicContent;
  completed: boolean;
  estimatedDuration: string;
  hasDoubtButton?: boolean; // Para o botão de dúvidas específico
}

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

export interface Topic {
  id: string;
  title: string;
  description: string;
  order: number;
  videos: YouTubeVideo[];
  academicContent?: AcademicContent;
  aulaTexto?: AulaTextoStructure; // Nova aula-texto aprimorada
  subtopics?: SubTopic[]; // Suporte a subtópicos
  completed: boolean;
  estimatedDuration?: string;
  hasDoubtButton?: boolean; // Botão de dúvidas específico
  // Novas propriedades para melhor aprendizado
  detailedDescription?: string;
  learningObjectives?: string[];
  keyTerms?: string[];
  searchKeywords?: string[];
  // Para o layout do Responde Aí
  contentType?: 'video' | 'aula-texto' | 'exercise' | 'mixed';
  difficulty?: 'easy' | 'medium' | 'hard';
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
  goal: LearningGoal;
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
// NOVOS TIPOS PARA AULA-TEXTO MELHORADA
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