-- Criar tabelas para o sistema de aprendizado

-- Tabela de planos de aprendizado
CREATE TABLE learning_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goal JSONB NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  progress DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX idx_learning_plans_created_at ON learning_plans(created_at);
CREATE INDEX idx_learning_plans_progress ON learning_plans(progress);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_learning_plans_updated_at 
  BEFORE UPDATE ON learning_plans 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS (Row Level Security) se necessário
ALTER TABLE learning_plans ENABLE ROW LEVEL SECURITY;

-- Política básica - ajustar conforme necessário para autenticação
CREATE POLICY "Permitir todas as operações para todos os usuários" ON learning_plans
  FOR ALL USING (true);