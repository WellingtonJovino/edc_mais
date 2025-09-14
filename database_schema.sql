-- Tabela para armazenar cursos criados
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  level VARCHAR(50), -- 'beginner', 'intermediate', 'advanced'
  subject VARCHAR(255),
  user_profile JSONB, -- Armazena o perfil do usuário que criou o curso
  progress INTEGER DEFAULT 0,
  total_topics INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para armazenar tópicos do curso
CREATE TABLE course_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  academic_content JSONB, -- Conteúdo acadêmico do Perplexity
  videos JSONB DEFAULT '[]'::jsonb, -- Array de vídeos do YouTube
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para armazenar mensagens do chat de cada curso
CREATE TABLE course_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL, -- 'user' ou 'assistant'
  content TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para armazenar arquivos enviados para cada curso
CREATE TABLE course_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100),
  size INTEGER,
  content TEXT, -- Conteúdo extraído do arquivo
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para armazenar validações de tópicos (dados do Perplexity)
CREATE TABLE course_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  validation_summary TEXT,
  missing_topics JSONB DEFAULT '[]'::jsonb,
  validation_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhorar performance
CREATE INDEX idx_courses_created_at ON courses(created_at DESC);
CREATE INDEX idx_course_topics_course_id ON course_topics(course_id);
CREATE INDEX idx_course_topics_order ON course_topics(course_id, order_index);
CREATE INDEX idx_course_messages_course_id ON course_messages(course_id, timestamp);
CREATE INDEX idx_course_files_course_id ON course_files(course_id);

-- Função para atualizar o timestamp de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at automaticamente
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_topics_updated_at BEFORE UPDATE ON course_topics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();