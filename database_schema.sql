-- =============================================================================
-- EDC+ V3 - Schema Completo do Banco de Dados Supabase
-- =============================================================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. TABELA PRINCIPAL: COURSES
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    level VARCHAR(50) DEFAULT 'beginner',
    subject VARCHAR(255),
    user_profile JSONB,
    progress INTEGER DEFAULT 0,
    total_topics INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Campos adicionais para cache
    cache_hash VARCHAR(32),
    is_cached BOOLEAN DEFAULT false,
    original_generation_date TIMESTAMP WITH TIME ZONE,

    -- Metadados do curso
    metadata JSONB DEFAULT '{}',
    total_hours INTEGER DEFAULT 0,
    estimated_duration VARCHAR(100),

    -- Índices para performance
    CONSTRAINT courses_level_check CHECK (level IN ('beginner', 'intermediate', 'advanced', 'undergraduate', 'graduate', 'professional'))
);

-- Índices para a tabela courses
CREATE INDEX IF NOT EXISTS idx_courses_level ON public.courses(level);
CREATE INDEX IF NOT EXISTS idx_courses_subject ON public.courses(subject);
CREATE INDEX IF NOT EXISTS idx_courses_cache_hash ON public.courses(cache_hash);
CREATE INDEX IF NOT EXISTS idx_courses_created_at ON public.courses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_courses_is_cached ON public.courses(is_cached);

-- =============================================================================
-- 2. TABELA: COURSE_MODULES (OPCIONAL - para estrutura hierárquica)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.course_modules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    module_order INTEGER DEFAULT 0,
    level VARCHAR(50) DEFAULT 'beginner',
    estimated_hours INTEGER DEFAULT 0,
    estimated_duration VARCHAR(100),
    learning_objectives TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT course_modules_level_check CHECK (level IN ('beginner', 'intermediate', 'advanced'))
);

-- Índices para course_modules
CREATE INDEX IF NOT EXISTS idx_course_modules_course_id ON public.course_modules(course_id);
CREATE INDEX IF NOT EXISTS idx_course_modules_order ON public.course_modules(course_id, module_order);

-- =============================================================================
-- 3. TABELA PRINCIPAL: COURSE_TOPICS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.course_topics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    module_id UUID REFERENCES public.course_modules(id) ON DELETE SET NULL,

    -- Informações básicas do tópico
    title VARCHAR(255) NOT NULL,
    description TEXT,
    detailed_description TEXT,

    -- Estrutura hierárquica (quando não há módulos)
    module_title VARCHAR(255),
    module_description TEXT,
    module_order INTEGER DEFAULT 0,

    -- Ordem e organização
    order_index INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT false,

    -- Conteúdo pedagógico
    learning_objectives TEXT[],
    key_terms TEXT[],
    search_keywords TEXT[],
    difficulty VARCHAR(20) DEFAULT 'medium',
    estimated_duration VARCHAR(100) DEFAULT '45 min',

    -- Conteúdo do tópico
    academic_content JSONB DEFAULT '{}',
    videos JSONB DEFAULT '[]',
    aula_texto JSONB DEFAULT '{}',

    -- Configurações de interface
    has_doubt_button BOOLEAN DEFAULT true,
    content_type VARCHAR(50) DEFAULT 'mixed',

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT course_topics_difficulty_check CHECK (difficulty IN ('easy', 'medium', 'hard'))
);

-- Índices para course_topics
CREATE INDEX IF NOT EXISTS idx_course_topics_course_id ON public.course_topics(course_id);
CREATE INDEX IF NOT EXISTS idx_course_topics_module_id ON public.course_topics(module_id);
CREATE INDEX IF NOT EXISTS idx_course_topics_order ON public.course_topics(course_id, order_index);
CREATE INDEX IF NOT EXISTS idx_course_topics_module_order ON public.course_topics(course_id, module_order, order_index);
CREATE INDEX IF NOT EXISTS idx_course_topics_completed ON public.course_topics(course_id, completed);

-- =============================================================================
-- 4. TABELA: COURSE_MESSAGES (Chat/Conversas)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.course_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Metadados da mensagem
    message_type VARCHAR(50) DEFAULT 'chat',
    attachments JSONB DEFAULT '[]',

    CONSTRAINT course_messages_role_check CHECK (role IN ('user', 'assistant', 'system'))
);

-- Índices para course_messages
CREATE INDEX IF NOT EXISTS idx_course_messages_course_id ON public.course_messages(course_id);
CREATE INDEX IF NOT EXISTS idx_course_messages_timestamp ON public.course_messages(course_id, timestamp);

-- =============================================================================
-- 5. TABELA: COURSE_FILES (Arquivos Enviados)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.course_files (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    size BIGINT,
    content TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Metadados do arquivo
    file_hash VARCHAR(64),
    mime_type VARCHAR(100),
    original_path VARCHAR(500),

    -- Integração com OpenAI
    openai_file_id VARCHAR(100),
    vector_store_id VARCHAR(100),
    assistant_id VARCHAR(100)
);

-- Índices para course_files
CREATE INDEX IF NOT EXISTS idx_course_files_course_id ON public.course_files(course_id);
CREATE INDEX IF NOT EXISTS idx_course_files_uploaded_at ON public.course_files(uploaded_at DESC);

-- =============================================================================
-- 6. TABELA: COURSE_PREREQUISITES (Pré-requisitos)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.course_prerequisites (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    importance VARCHAR(20) DEFAULT 'medium',
    estimated_time VARCHAR(100),
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT course_prerequisites_importance_check CHECK (importance IN ('essential', 'recommended', 'optional', 'high', 'medium', 'low'))
);

-- Índices para course_prerequisites
CREATE INDEX IF NOT EXISTS idx_course_prerequisites_course_id ON public.course_prerequisites(course_id);

-- =============================================================================
-- 7. TABELA: COURSE_BOOK_RECOMMENDATIONS (Bibliografia)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.course_book_recommendations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    authors TEXT[],
    year INTEGER,
    isbn VARCHAR(20),
    description TEXT,
    level VARCHAR(50),
    language VARCHAR(10) DEFAULT 'pt',
    topics TEXT[],
    reason TEXT,
    available_formats TEXT[],
    estimated_pages INTEGER,
    difficulty INTEGER,
    confidence DECIMAL(3,2) DEFAULT 0.8,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para course_book_recommendations
CREATE INDEX IF NOT EXISTS idx_course_books_course_id ON public.course_book_recommendations(course_id);

-- =============================================================================
-- 8. TABELA: COURSE_VALIDATIONS (Validações de Qualidade)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.course_validations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    validation_type VARCHAR(50) NOT NULL,
    level VARCHAR(50),
    is_complete BOOLEAN DEFAULT false,
    score DECIMAL(4,2),
    missing_topics TEXT[],
    improvements TEXT[],
    feedback JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT course_validations_score_check CHECK (score >= 0 AND score <= 10)
);

-- Índices para course_validations
CREATE INDEX IF NOT EXISTS idx_course_validations_course_id ON public.course_validations(course_id);
CREATE INDEX IF NOT EXISTS idx_course_validations_type ON public.course_validations(validation_type);

-- =============================================================================
-- 9. TABELA: COURSE_SUPPORT_COURSES (Cursos de Apoio/Pré-requisito)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.course_support_courses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    main_course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    support_course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) DEFAULT 'prerequisite',
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT course_support_courses_relationship_check CHECK (relationship_type IN ('prerequisite', 'complementary', 'advanced', 'alternative'))
);

-- Índices para course_support_courses
CREATE INDEX IF NOT EXISTS idx_course_support_main ON public.course_support_courses(main_course_id);
CREATE INDEX IF NOT EXISTS idx_course_support_support ON public.course_support_courses(support_course_id);

-- =============================================================================
-- 10. TABELA: COURSE_CONTEXTUAL_SEARCHES (Buscas Contextuais - OPCIONAL)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.course_contextual_searches (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    topic_id UUID REFERENCES public.course_topics(id) ON DELETE CASCADE,
    search_query VARCHAR(500) NOT NULL,
    search_results JSONB DEFAULT '{}',
    sources TEXT[],
    confidence DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para course_contextual_searches
CREATE INDEX IF NOT EXISTS idx_course_contextual_topic_id ON public.course_contextual_searches(topic_id);

-- =============================================================================
-- 11. TABELA: LEARNING_PLANS (Compatibilidade com V1/V2 - OPCIONAL)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.learning_plans (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    goal JSONB NOT NULL,
    messages JSONB DEFAULT '[]',
    progress INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para learning_plans
CREATE INDEX IF NOT EXISTS idx_learning_plans_created_at ON public.learning_plans(created_at DESC);

-- =============================================================================
-- FUNÇÕES E TRIGGERS
-- =============================================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_course_modules_updated_at BEFORE UPDATE ON public.course_modules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_course_topics_updated_at BEFORE UPDATE ON public.course_topics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_learning_plans_updated_at BEFORE UPDATE ON public.learning_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- POLÍTICAS RLS (Row Level Security) - OPCIONAL
-- =============================================================================

-- Habilitar RLS nas tabelas principais (descomente se quiser segurança por usuário)
-- ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.course_topics ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.course_messages ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.course_files ENABLE ROW LEVEL SECURITY;

-- Exemplo de política (todos podem ler/escrever por enquanto)
-- CREATE POLICY "Allow all access to courses" ON public.courses FOR ALL USING (true);
-- CREATE POLICY "Allow all access to course_topics" ON public.course_topics FOR ALL USING (true);

-- =============================================================================
-- VIEWS ÚTEIS
-- =============================================================================

-- View para cursos com contagem de tópicos
CREATE OR REPLACE VIEW public.courses_with_stats AS
SELECT
    c.*,
    COUNT(ct.id) as actual_topics_count,
    COUNT(CASE WHEN ct.completed = true THEN 1 END) as completed_topics_count,
    ROUND((COUNT(CASE WHEN ct.completed = true THEN 1 END) * 100.0 / NULLIF(COUNT(ct.id), 0)), 2) as completion_percentage
FROM public.courses c
LEFT JOIN public.course_topics ct ON c.id = ct.course_id
GROUP BY c.id;

-- View para estrutura hierárquica de cursos
CREATE OR REPLACE VIEW public.course_structure AS
SELECT
    c.id as course_id,
    c.title as course_title,
    c.level as course_level,
    cm.id as module_id,
    cm.title as module_title,
    cm.module_order,
    ct.id as topic_id,
    ct.title as topic_title,
    ct.order_index as topic_order,
    ct.completed,
    ct.difficulty,
    ct.estimated_duration
FROM public.courses c
LEFT JOIN public.course_modules cm ON c.id = cm.course_id
LEFT JOIN public.course_topics ct ON cm.id = ct.module_id OR c.id = ct.course_id
ORDER BY c.created_at DESC, cm.module_order, ct.order_index;

-- =============================================================================
-- DADOS DE EXEMPLO (OPCIONAL)
-- =============================================================================

-- Inserir um curso de exemplo para teste
INSERT INTO public.courses (title, description, level, subject, total_topics)
VALUES (
    'Curso de Teste - Cálculo 1',
    'Curso exemplo para testar o sistema',
    'beginner',
    'Matemática - Cálculo 1',
    5
) ON CONFLICT DO NOTHING;

-- =============================================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- =============================================================================

COMMENT ON TABLE public.courses IS 'Tabela principal com informações dos cursos gerados';
COMMENT ON TABLE public.course_topics IS 'Tópicos específicos de cada curso, organizados hierarquicamente';
COMMENT ON TABLE public.course_messages IS 'Histórico de conversas do chat para cada curso';
COMMENT ON TABLE public.course_files IS 'Arquivos PDF e materiais enviados pelos usuários';
COMMENT ON TABLE public.course_prerequisites IS 'Pré-requisitos identificados automaticamente para cada curso';
COMMENT ON TABLE public.course_book_recommendations IS 'Livros recomendados pela IA para cada curso';

COMMENT ON COLUMN public.courses.cache_hash IS 'Hash único para identificação rápida de cursos similares';
COMMENT ON COLUMN public.course_topics.module_title IS 'Título do módulo quando não há tabela course_modules';
COMMENT ON COLUMN public.course_topics.academic_content IS 'Conteúdo acadêmico em formato JSON';
COMMENT ON COLUMN public.course_topics.aula_texto IS 'Texto da aula gerado pela IA';

-- =============================================================================
-- FINALIZAÇÃO
-- =============================================================================

-- Verificar se as tabelas foram criadas corretamente
SELECT
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE 'course%'
ORDER BY tablename;

-- Mostrar estatísticas das tabelas
SELECT
    'courses' as tabela,
    COUNT(*) as registros
FROM public.courses
UNION ALL
SELECT
    'course_topics' as tabela,
    COUNT(*) as registros
FROM public.course_topics
UNION ALL
SELECT
    'course_messages' as tabela,
    COUNT(*) as registros
FROM public.course_messages;

-- Mensagem de sucesso
DO $$
BEGIN
    RAISE NOTICE '✅ Schema EDC+ V3 criado com sucesso!';
    RAISE NOTICE '📊 Total de tabelas criadas: %', (
        SELECT COUNT(*)
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename LIKE 'course%'
    );
    RAISE NOTICE '🚀 Sistema pronto para uso!';
END $$;