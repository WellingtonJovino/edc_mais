-- ========================================
-- SETUP SIMPLES SUPABASE - SEM ERROS
-- Sistema EDC+ V3.1
-- ========================================

-- EXECUTE ESTE SCRIPT NO SUPABASE SQL EDITOR

-- ========================================
-- 1. CRIAR TABELAS
-- ========================================

-- Tabela principal para estruturas de cursos
CREATE TABLE IF NOT EXISTS course_structures (
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

-- Tabela para uso/estatísticas
CREATE TABLE IF NOT EXISTS course_structure_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    structure_id UUID REFERENCES course_structures(id) ON DELETE CASCADE,
    user_identifier TEXT,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reused BOOLEAN DEFAULT FALSE
);

-- ========================================
-- 2. ÍNDICES
-- ========================================

CREATE INDEX IF NOT EXISTS idx_course_structures_subject
    ON course_structures(LOWER(subject));

CREATE INDEX IF NOT EXISTS idx_course_structures_education_level
    ON course_structures(education_level);

CREATE INDEX IF NOT EXISTS idx_course_structures_hash_key
    ON course_structures(hash_key);

-- ========================================
-- 3. FUNÇÃO PRINCIPAL (OBRIGATÓRIA)
-- ========================================

CREATE OR REPLACE FUNCTION find_existing_structure(
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
    FROM course_structures cs
    WHERE cs.hash_key = MD5(LOWER(p_subject) || '::' || p_education_level)
    ORDER BY cs.created_at DESC
    LIMIT 1;
END;
$$;

-- ========================================
-- 4. RLS SIMPLES
-- ========================================

ALTER TABLE course_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_structure_usage ENABLE ROW LEVEL SECURITY;

-- Remover políticas se existirem
DROP POLICY IF EXISTS "public_read_structures" ON course_structures;
DROP POLICY IF EXISTS "public_insert_structures" ON course_structures;
DROP POLICY IF EXISTS "public_insert_usage" ON course_structure_usage;

-- Criar políticas
CREATE POLICY "public_read_structures"
    ON course_structures FOR SELECT
    USING (true);

CREATE POLICY "public_insert_structures"
    ON course_structures FOR INSERT
    WITH CHECK (true);

CREATE POLICY "public_insert_usage"
    ON course_structure_usage FOR INSERT
    WITH CHECK (true);

-- ========================================
-- 5. TESTE FINAL
-- ========================================

SELECT 'Setup completo! ✅' as status;