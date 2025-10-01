-- =============================================================================
-- EDC+ V3 - Migração para Aulas-Texto de Subtópicos (CORRIGIDA)
-- =============================================================================

-- Primeiro, criar a função update_updated_at_column se não existir
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Tabela para armazenar aulas-texto dos subtópicos
CREATE TABLE IF NOT EXISTS public.subtopic_lessons (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    course_structure_id UUID REFERENCES public.course_structures(id) ON DELETE CASCADE,

    -- Identificação hierárquica do subtópico
    module_index INTEGER NOT NULL,
    topic_index INTEGER NOT NULL,
    subtopic_index INTEGER NOT NULL,

    -- Informações do subtópico
    subtopic_title VARCHAR(500) NOT NULL,
    subtopic_path TEXT NOT NULL, -- Formato: "modulo/topico/subtopico"

    -- Conteúdo da aula-texto
    lesson_content TEXT NOT NULL,
    lesson_metadata JSONB DEFAULT '{}',

    -- Informações de geração
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    generation_model VARCHAR(50) DEFAULT 'gpt-4o',
    generation_tokens INTEGER,

    -- Informações educacionais
    estimated_reading_time VARCHAR(50) DEFAULT '5-10 min',
    difficulty_level VARCHAR(20) DEFAULT 'medium',

    -- Status e qualidade
    is_approved BOOLEAN DEFAULT true,
    quality_score DECIMAL(3,2),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT subtopic_lessons_difficulty_check CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
    CONSTRAINT subtopic_lessons_quality_check CHECK (quality_score >= 0 AND quality_score <= 1),
    CONSTRAINT subtopic_lessons_unique_path UNIQUE (course_structure_id, module_index, topic_index, subtopic_index)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_subtopic_lessons_structure_id ON public.subtopic_lessons(course_structure_id);
CREATE INDEX IF NOT EXISTS idx_subtopic_lessons_path ON public.subtopic_lessons(course_structure_id, module_index, topic_index, subtopic_index);
CREATE INDEX IF NOT EXISTS idx_subtopic_lessons_created_at ON public.subtopic_lessons(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subtopic_lessons_approved ON public.subtopic_lessons(is_approved);

-- Trigger para updated_at (só criar se a tabela foi criada com sucesso)
DO $$
BEGIN
    -- Verificar se o trigger já existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_subtopic_lessons_updated_at'
    ) THEN
        CREATE TRIGGER update_subtopic_lessons_updated_at
            BEFORE UPDATE ON public.subtopic_lessons
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Comentários para documentação
COMMENT ON TABLE public.subtopic_lessons IS 'Aulas-texto geradas automaticamente para cada subtópico dos cursos';
COMMENT ON COLUMN public.subtopic_lessons.subtopic_path IS 'Caminho hierárquico do subtópico (módulo/tópico/subtópico)';
COMMENT ON COLUMN public.subtopic_lessons.lesson_content IS 'Conteúdo HTML da aula-texto gerada pela IA';
COMMENT ON COLUMN public.subtopic_lessons.lesson_metadata IS 'Metadados da geração (prompt usado, parâmetros, etc.)';

-- View para facilitar consultas com estrutura hierárquica
CREATE OR REPLACE VIEW public.subtopic_lessons_with_structure AS
SELECT
    sl.*,
    cs.subject,
    cs.education_level,
    cs.title as course_title,
    cs.description as course_description,
    (cs.structure_data->'modules'->sl.module_index->>'title') as module_title,
    (cs.structure_data->'modules'->sl.module_index->'topics'->sl.topic_index->>'title') as topic_title
FROM public.subtopic_lessons sl
JOIN public.course_structures cs ON sl.course_structure_id = cs.id
ORDER BY sl.course_structure_id, sl.module_index, sl.topic_index, sl.subtopic_index;

-- Função para buscar aulas por estrutura do curso
CREATE OR REPLACE FUNCTION get_lessons_for_course_structure(p_structure_id UUID)
RETURNS TABLE (
    lesson_id UUID,
    module_index INTEGER,
    topic_index INTEGER,
    subtopic_index INTEGER,
    subtopic_title VARCHAR(500),
    lesson_content TEXT,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        sl.id,
        sl.module_index,
        sl.topic_index,
        sl.subtopic_index,
        sl.subtopic_title,
        sl.lesson_content,
        sl.created_at
    FROM public.subtopic_lessons sl
    WHERE sl.course_structure_id = p_structure_id
    ORDER BY sl.module_index, sl.topic_index, sl.subtopic_index;
END;
$$;

-- Função para salvar aula de subtópico
CREATE OR REPLACE FUNCTION save_subtopic_lesson(
    p_structure_id UUID,
    p_module_index INTEGER,
    p_topic_index INTEGER,
    p_subtopic_index INTEGER,
    p_subtopic_title VARCHAR(500),
    p_lesson_content TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    lesson_id UUID;
    subtopic_path TEXT;
BEGIN
    -- Construir o caminho do subtópico
    subtopic_path := p_module_index || '/' || p_topic_index || '/' || p_subtopic_index;

    -- Inserir ou atualizar a aula
    INSERT INTO public.subtopic_lessons (
        course_structure_id,
        module_index,
        topic_index,
        subtopic_index,
        subtopic_title,
        subtopic_path,
        lesson_content,
        lesson_metadata
    ) VALUES (
        p_structure_id,
        p_module_index,
        p_topic_index,
        p_subtopic_index,
        p_subtopic_title,
        subtopic_path,
        p_lesson_content,
        p_metadata
    )
    ON CONFLICT (course_structure_id, module_index, topic_index, subtopic_index)
    DO UPDATE SET
        subtopic_title = EXCLUDED.subtopic_title,
        lesson_content = EXCLUDED.lesson_content,
        lesson_metadata = EXCLUDED.lesson_metadata,
        updated_at = CURRENT_TIMESTAMP
    RETURNING id INTO lesson_id;

    RETURN lesson_id;
END;
$$;

-- Verificar se a migração foi aplicada
DO $$
BEGIN
    -- Verificar se a tabela foi criada
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'subtopic_lessons'
    ) THEN
        RAISE NOTICE '✅ Tabela subtopic_lessons criada com sucesso!';

        -- Verificar se as funções foram criadas
        IF EXISTS (
            SELECT 1 FROM information_schema.routines
            WHERE routine_schema = 'public'
            AND routine_name = 'save_subtopic_lesson'
        ) THEN
            RAISE NOTICE '✅ Função save_subtopic_lesson criada com sucesso!';
        END IF;

        IF EXISTS (
            SELECT 1 FROM information_schema.routines
            WHERE routine_schema = 'public'
            AND routine_name = 'get_lessons_for_course_structure'
        ) THEN
            RAISE NOTICE '✅ Função get_lessons_for_course_structure criada com sucesso!';
        END IF;

        RAISE NOTICE '🚀 Migração de subtopic_lessons concluída!';
    ELSE
        RAISE EXCEPTION '❌ Erro: Tabela subtopic_lessons não foi criada!';
    END IF;
END $$;