const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wpnvvtdswjvyljdycbfq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwbnZ2dGRzd2p2eWxqZHljYmZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NTkyNzcsImV4cCI6MjA3NDIzNTI3N30.fP4q5J2ku2OTDQe47IjrWvCVLx1qRm6nBle9og2urag';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('🔍 Testando conexão com Supabase...');

  try {
    // Teste 1: Verificar se consegue conectar
    const { data, error } = await supabase
      .from('course_structures')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ Erro na conexão:', error);
      return false;
    }

    console.log('✅ Conexão funcionando!');
    console.log('📊 Dados retornados:', data);
    return true;

  } catch (err) {
    console.error('❌ Erro de conectividade:', err.message);
    return false;
  }
}

async function testStructureTable() {
  console.log('🔍 Testando tabela course_structures...');

  try {
    // Inserir estrutura de teste
    const testStructure = {
      subject: 'teste conectividade',
      education_level: 'undergraduate',
      title: 'Teste de Conectividade',
      description: 'Teste para verificar se o banco está funcionando',
      course_level: 'beginner',
      structure_data: {
        modules: [{
          title: 'Módulo Teste',
          topics: ['Tópico 1', 'Tópico 2']
        }]
      },
      total_modules: 1,
      total_topics: 2,
      metadata: {
        test: true,
        timestamp: new Date().toISOString()
      }
    };

    const { data, error } = await supabase
      .from('course_structures')
      .insert(testStructure)
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao inserir:', error);
      return false;
    }

    console.log('✅ Inserção funcionando!');
    console.log('📊 Estrutura inserida:', data);

    // Limpar teste
    await supabase
      .from('course_structures')
      .delete()
      .eq('id', data.id);

    console.log('🧹 Teste limpo com sucesso');
    return true;

  } catch (err) {
    console.error('❌ Erro na tabela:', err.message);
    return false;
  }
}

// Executar testes
testConnection()
  .then(connected => {
    if (connected) {
      return testStructureTable();
    }
    return false;
  })
  .then(result => {
    if (result) {
      console.log('🎉 Banco de dados está funcionando perfeitamente!');
    } else {
      console.log('❌ Há problemas com o banco de dados');
    }
    process.exit(result ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Erro geral:', error);
    process.exit(1);
  });