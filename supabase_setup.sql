-- ========================================
-- SETUP COMPLETO DO BANCO DE DADOS SUPABASE
-- Sistema EDC+ V3.1
-- ========================================

-- IMPORTANTE: Execute este script no Supabase SQL Editor
-- Vá em: SQL Editor > New Query > Cole este script > Run

-- ========================================
-- 1. CRIAR TABELAS (se não existirem)
-- ========================================

-- Tabela principal para armazenar estruturas de cursos
CREATE TABLE IF NOT EXISTS public.course_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject TEXT NOT NULL,
    education_level TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    course_level TEXT,
    structure_data JSONB NOT NULL,
    total_modules INTEGER,
    total_topics INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    hash_key TEXT GENERATED ALWAYS AS (MD5(LOWER(subject) || '::' || education_level)) STORED,
    metadata JSONB
);

-- Tabela para rastrear uso das estruturas
CREATE TABLE IF NOT EXISTS public.course_structure_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    structure_id UUID REFERENCES public.course_structures(id) ON DELETE CASCADE,
    user_identifier TEXT,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reused BOOLEAN DEFAULT FALSE
);

-- ========================================
-- 2. CRIAR ÍNDICES PARA PERFORMANCE
-- ========================================

CREATE INDEX IF NOT EXISTS idx_course_structures_subject
    ON public.course_structures(LOWER(subject));

CREATE INDEX IF NOT EXISTS idx_course_structures_education_level
    ON public.course_structures(education_level);

CREATE INDEX IF NOT EXISTS idx_course_structures_hash_key
    ON public.course_structures(hash_key);

CREATE INDEX IF NOT EXISTS idx_course_structures_created_at
    ON public.course_structures(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_course_structures_structure_data
    ON public.course_structures USING GIN(structure_data);

-- ========================================
-- 3. CRIAR VIEW PARA ESTATÍSTICAS
-- ========================================

CREATE OR REPLACE VIEW public.course_structure_stats AS
SELECT
    cs.id,
    cs.subject,
    cs.education_level,
    cs.title,
    cs.created_at,
    COUNT(csu.id) as usage_count,
    COUNT(CASE WHEN csu.reused = true THEN 1 END) as reuse_count
FROM public.course_structures cs
LEFT JOIN public.course_structure_usage csu ON cs.id = csu.structure_id
GROUP BY cs.id;

-- ========================================
-- 4. CRIAR FUNÇÃO PARA BUSCAR ESTRUTURA EXISTENTE
-- ========================================

CREATE OR REPLACE FUNCTION public.find_existing_structure(
    p_subject TEXT,
    p_education_level TEXT
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    structure_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        cs.id,
        cs.title,
        cs.description,
        cs.structure_data,
        cs.created_at
    FROM public.course_structures cs
    WHERE cs.hash_key = MD5(LOWER(p_subject) || '::' || p_education_level)
    ORDER BY cs.created_at DESC
    LIMIT 1;
END;
$$;

-- ========================================
-- 5. CRIAR FUNÇÃO PARA BUSCAR POR SIMILARIDADE
-- ========================================

CREATE OR REPLACE FUNCTION public.find_similar_structure(
    p_subject TEXT,
    p_education_level TEXT,
    p_threshold FLOAT DEFAULT 0.8
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    structure_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        cs.id,
        cs.title,
        cs.description,
        cs.structure_data,
        cs.created_at,
        similarity(LOWER(cs.subject), LOWER(p_subject)) as similarity
    FROM public.course_structures cs
    WHERE cs.education_level = p_education_level
    AND similarity(LOWER(cs.subject), LOWER(p_subject)) >= p_threshold
    ORDER BY similarity DESC, cs.created_at DESC
    LIMIT 1;
END;
$$;

-- Nota: A função similarity requer a extensão pg_trgm
-- Habilitar extensão para busca por similaridade
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ========================================
-- 6. CONFIGURAR RLS (Row Level Security)
-- ========================================

-- Habilitar RLS nas tabelas
ALTER TABLE public.course_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_structure_usage ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes se existirem (para evitar conflitos)
DROP POLICY IF EXISTS "Allow public read structures" ON public.course_structures;
DROP POLICY IF EXISTS "Allow public insert structures" ON public.course_structures;
DROP POLICY IF EXISTS "Allow public insert usage" ON public.course_structure_usage;

-- Política para permitir leitura pública
CREATE POLICY "Allow public read structures"
    ON public.course_structures
    FOR SELECT
    USING (true);

-- Política para permitir inserção pública
CREATE POLICY "Allow public insert structures"
    ON public.course_structures
    FOR INSERT
    WITH CHECK (true);

-- Política para permitir inserção de uso
CREATE POLICY "Allow public insert usage"
    ON public.course_structure_usage
    FOR INSERT
    WITH CHECK (true);

-- ========================================
-- 7. CRIAR FUNÇÃO AUXILIAR PARA LIMPAR ESTRUTURAS ANTIGAS
-- ========================================

CREATE OR REPLACE FUNCTION public.clean_old_structures(
    days_to_keep INTEGER DEFAULT 30
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Deletar estruturas não usadas há mais de X dias
    DELETE FROM public.course_structures
    WHERE id NOT IN (
        SELECT DISTINCT structure_id
        FROM public.course_structure_usage
        WHERE used_at > NOW() - INTERVAL '1 day' * days_to_keep
    )
    AND created_at < NOW() - INTERVAL '1 day' * days_to_keep;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- ========================================
-- 8. CRIAR FUNÇÃO PARA ESTATÍSTICAS
-- ========================================

CREATE OR REPLACE FUNCTION public.get_structure_statistics()
RETURNS TABLE (
    total_structures BIGINT,
    total_usage BIGINT,
    total_reuse BIGINT,
    most_used_subject TEXT,
    most_used_level TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(DISTINCT cs.id) as total_structures,
        COUNT(csu.id) as total_usage,
        COUNT(CASE WHEN csu.reused = true THEN 1 END) as total_reuse,
        (SELECT subject FROM public.course_structures
         GROUP BY subject ORDER BY COUNT(*) DESC LIMIT 1) as most_used_subject,
        (SELECT education_level FROM public.course_structures
         GROUP BY education_level ORDER BY COUNT(*) DESC LIMIT 1) as most_used_level
    FROM public.course_structures cs
    LEFT JOIN public.course_structure_usage csu ON cs.id = csu.structure_id;
END;
$$;

-- ========================================
-- 9. VERIFICAR SE TUDO FOI CRIADO
-- ========================================

-- Verificar tabelas
SELECT 'Tabela course_structures: ' ||
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'course_structures'
    ) THEN '✅ Criada' ELSE '❌ Não existe' END as status
UNION ALL
SELECT 'Tabela course_structure_usage: ' ||
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'course_structure_usage'
    ) THEN '✅ Criada' ELSE '❌ Não existe' END
UNION ALL
-- Verificar funções
SELECT 'Função find_existing_structure: ' ||
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_schema = 'public'
        AND routine_name = 'find_existing_structure'
    ) THEN '✅ Criada' ELSE '❌ Não existe' END
UNION ALL
SELECT 'Função find_similar_structure: ' ||
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_schema = 'public'
        AND routine_name = 'find_similar_structure'
    ) THEN '✅ Criada' ELSE '❌ Não existe' END;

-- ========================================
-- FIM DO SCRIPT
-- ========================================

-- Após executar, você deve ver:
-- ✅ Tabela course_structures: Criada
-- ✅ Tabela course_structure_usage: Criada
-- ✅ Função find_existing_structure: Criada
-- ✅ Função find_similar_structure: Criada