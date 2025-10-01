-- =============================================================================
-- EDC+ V3 - Migração para adicionar search_key na tabela subtopic_lessons
-- VERSÃO CORRIGIDA - Remove duplicatas e constraint única problemática
-- =============================================================================
-- Esta migração adiciona uma coluna search_key para facilitar a busca de aulas
-- Formato: "assunto::nivel::modulo::topico::subtopico"
-- Exemplo: "calculo 1::undergraduate::0::0::0"
-- =============================================================================

-- 1. Adicionar novas colunas para armazenar informações do curso
ALTER TABLE public.subtopic_lessons
ADD COLUMN IF NOT EXISTS subject TEXT,
ADD COLUMN IF NOT EXISTS education_level TEXT,
ADD COLUMN IF NOT EXISTS search_key TEXT;

-- 2. Criar índice para busca rápida usando search_key (não único!)
DROP INDEX IF EXISTS idx_subtopic_lessons_search_key;
CREATE INDEX idx_subtopic_lessons_search_key
ON public.subtopic_lessons(search_key);

-- 3. Criar índice para busca por subject e education_level
DROP INDEX IF EXISTS idx_subtopic_lessons_subject_level;
CREATE INDEX idx_subtopic_lessons_subject_level
ON public.subtopic_lessons(subject, education_level);

-- 4. Comentários para documentação
COMMENT ON COLUMN public.subtopic_lessons.subject IS 'Assunto do curso (ex: calculo 1, fisica 2)';
COMMENT ON COLUMN public.subtopic_lessons.education_level IS 'Nível educacional (undergraduate, graduate, etc)';
COMMENT ON COLUMN public.subtopic_lessons.search_key IS 'Chave de busca no formato: assunto::nivel::modulo::topico::subtopico';

-- 5. Função para gerar search_key automaticamente
CREATE OR REPLACE FUNCTION generate_search_key()
RETURNS TRIGGER AS $$
BEGIN
    -- Gerar search_key apenas se subject e education_level estiverem preenchidos
    IF NEW.subject IS NOT NULL AND NEW.education_level IS NOT NULL THEN
        NEW.search_key := LOWER(NEW.subject) || '::' ||
                         LOWER(NEW.education_level) || '::' ||
                         NEW.module_index || '::' ||
                         NEW.topic_index || '::' ||
                         NEW.subtopic_index;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Criar trigger para gerar search_key automaticamente
DROP TRIGGER IF EXISTS generate_search_key_trigger ON public.subtopic_lessons;
CREATE TRIGGER generate_search_key_trigger
    BEFORE INSERT OR UPDATE ON public.subtopic_lessons
    FOR EACH ROW
    EXECUTE FUNCTION generate_search_key();

-- 7. LIMPAR registros antigos sem subject/education_level (opcional)
-- Se quiser manter os registros antigos, comente estas linhas:
DELETE FROM public.subtopic_lessons
WHERE subject IS NULL OR education_level IS NULL;

-- 8. Atualizar registros existentes que tenham subject e education_level
UPDATE public.subtopic_lessons
SET search_key = LOWER(COALESCE(subject, 'unknown')) || '::' ||
                 LOWER(COALESCE(education_level, 'unknown')) || '::' ||
                 module_index || '::' ||
                 topic_index || '::' ||
                 subtopic_index
WHERE search_key IS NULL AND subject IS NOT NULL AND education_level IS NOT NULL;

-- 9. Remover a constraint antiga se existir
ALTER TABLE public.subtopic_lessons
DROP CONSTRAINT IF EXISTS subtopic_lessons_unique_path;

-- 10. NÃO criar constraint única em search_key!
-- Pode haver múltiplas versões/tentativas do mesmo subtópico
-- O sistema usa a mais recente baseada em created_at

-- 11. Criar constraint única mais específica usando course_structure_id
-- Isso permite múltiplas estruturas do mesmo curso mas previne duplicatas dentro de uma estrutura
ALTER TABLE public.subtopic_lessons
DROP CONSTRAINT IF EXISTS subtopic_lessons_unique_structure_path;

ALTER TABLE public.subtopic_lessons
ADD CONSTRAINT subtopic_lessons_unique_structure_path
UNIQUE (course_structure_id, module_index, topic_index, subtopic_index);

-- 12. Criar função para buscar aulas por padrão
CREATE OR REPLACE FUNCTION find_lessons_by_pattern(
    p_subject TEXT,
    p_level TEXT,
    p_module_index INTEGER DEFAULT NULL,
    p_topic_index INTEGER DEFAULT NULL,
    p_subtopic_index INTEGER DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    module_index INTEGER,
    topic_index INTEGER,
    subtopic_index INTEGER,
    subtopic_title VARCHAR,
    lesson_content TEXT,
    search_key TEXT,
    created_at TIMESTAMPTZ
) AS $$
DECLARE
    v_search_pattern TEXT;
BEGIN
    -- Construir padrão de busca
    v_search_pattern := LOWER(p_subject) || '::' || LOWER(p_level) || '::';

    IF p_module_index IS NOT NULL THEN
        v_search_pattern := v_search_pattern || p_module_index || '::';
        IF p_topic_index IS NOT NULL THEN
            v_search_pattern := v_search_pattern || p_topic_index || '::';
            IF p_subtopic_index IS NOT NULL THEN
                v_search_pattern := v_search_pattern || p_subtopic_index;
            END IF;
        END IF;
    END IF;

    -- Retornar resultados ordenados por created_at DESC (mais recente primeiro)
    RETURN QUERY
    SELECT
        sl.id,
        sl.module_index,
        sl.topic_index,
        sl.subtopic_index,
        sl.subtopic_title,
        sl.lesson_content,
        sl.search_key,
        sl.created_at
    FROM public.subtopic_lessons sl
    WHERE sl.search_key LIKE v_search_pattern || '%'
    ORDER BY sl.created_at DESC, sl.module_index, sl.topic_index, sl.subtopic_index;
END;
$$ LANGUAGE plpgsql;

-- 13. Criar view para facilitar visualização
CREATE OR REPLACE VIEW v_subtopic_lessons_organized AS
SELECT
    id,
    course_structure_id,
    subject,
    education_level,
    module_index,
    topic_index,
    subtopic_index,
    subtopic_title,
    search_key,
    estimated_reading_time,
    difficulty_level,
    created_at,
    CASE
        WHEN lesson_content IS NOT NULL THEN 'Disponível'
        ELSE 'Não gerado'
    END AS status
FROM public.subtopic_lessons
ORDER BY created_at DESC, subject, education_level, module_index, topic_index, subtopic_index;

-- =============================================================================
-- FIM DA MIGRAÇÃO CORRIGIDA
-- =============================================================================

-- Verificar resultado:
SELECT COUNT(*), subject, education_level, module_index, topic_index, subtopic_index
FROM public.subtopic_lessons
GROUP BY subject, education_level, module_index, topic_index, subtopic_index
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;