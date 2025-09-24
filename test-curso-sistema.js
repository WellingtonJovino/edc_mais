const fetch = require('node-fetch');

// Teste 1: Gerar estrutura de curso e verificar se é salva no banco
async function testarGeracaoEstrutura() {
  console.log('🧪 TESTE 1: Gerando estrutura de curso...');

  try {
    // Simular dados do usuário
    const userData = {
      level: 'intermediate',
      purpose: 'academic',
      timeAvailable: 'moderate',
      educationLevel: 'undergraduate',
      background: 'Estudante de Engenharia Civil',
      specificGoals: 'Aprender cálculo para matérias do curso',
      priorKnowledge: 'Álgebra e geometria básica'
    };

    // Fazer request para API
    const response = await fetch('http://localhost:3001/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Quero aprender Cálculo Diferencial e Integral',
        userProfile: userData,
        uploadedFiles: []
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Estrutura gerada com sucesso!');
    console.log('📊 Dados retornados:', {
      hasGoal: !!result.goal,
      title: result.goal?.title,
      modulesCount: result.goal?.modules?.length || 0,
      isNew: result.isNew !== undefined ? result.isNew : 'não informado'
    });

    return result;

  } catch (error) {
    console.error('❌ Erro no teste de geração:', error.message);
    return null;
  }
}

// Teste 2: Tentar gerar a mesma estrutura novamente para ver se é reutilizada
async function testarReutilizacao() {
  console.log('\n🧪 TESTE 2: Testando reutilização da mesma estrutura...');

  try {
    // Usar exatamente os mesmos dados
    const userData = {
      level: 'intermediate',
      purpose: 'academic',
      timeAvailable: 'moderate',
      educationLevel: 'undergraduate',
      background: 'Estudante de Engenharia Civil',
      specificGoals: 'Aprender cálculo para matérias do curso',
      priorKnowledge: 'Álgebra e geometria básica'
    };

    const response = await fetch('http://localhost:3001/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Quero aprender Cálculo Diferencial e Integral',
        userProfile: userData,
        uploadedFiles: []
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Segunda geração concluída!');
    console.log('📊 Resultado:', {
      title: result.goal?.title,
      isNew: result.isNew !== undefined ? result.isNew : 'não informado',
      wasCached: result.goal?.isCached || false
    });

    if (result.isNew === false || result.goal?.isCached === true) {
      console.log('🎉 SUCESSO: Estrutura foi reutilizada do cache!');
    } else {
      console.log('⚠️ AVISO: Nova estrutura foi gerada (cache não funcionou)');
    }

    return result;

  } catch (error) {
    console.error('❌ Erro no teste de reutilização:', error.message);
    return null;
  }
}

// Teste 3: Verificar diretamente no banco se a estrutura foi salva
async function verificarBancoDados() {
  console.log('\n🧪 TESTE 3: Verificando estruturas no banco de dados...');

  try {
    const { createClient } = require('@supabase/supabase-js');

    const supabaseUrl = 'https://wxvwozhmkokdhkfqwrde.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4dndvemhta29rZGhrZnF3cmRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3Mzc2OTMsImV4cCI6MjA3NDMxMzY5M30.BuCF7kX11fphE4k3iVrU3MJwm9NhT-xDiE1POfGwrnA';

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verificar estruturas de curso
    const { data: structures, error: structError } = await supabase
      .from('course_structures')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (structError) {
      console.error('❌ Erro ao buscar estruturas:', structError);
    } else {
      console.log(`📊 Encontradas ${structures.length} estruturas no banco:`);
      structures.forEach((struct, index) => {
        console.log(`   ${index + 1}. "${struct.title}" (${struct.subject}) - ${new Date(struct.created_at).toLocaleString()}`);
      });
    }

    // Verificar cursos gerados
    const { data: courses, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (courseError) {
      console.error('❌ Erro ao buscar cursos:', courseError);
    } else {
      console.log(`📚 Encontrados ${courses.length} cursos no banco:`);
      courses.forEach((course, index) => {
        console.log(`   ${index + 1}. "${course.title}" - ${new Date(course.created_at).toLocaleString()}`);
      });
    }

  } catch (error) {
    console.error('❌ Erro ao verificar banco:', error.message);
  }
}

// Executar todos os testes
async function executarTestes() {
  console.log('🚀 Iniciando testes do sistema EDC+...\n');

  // Teste 1
  const resultado1 = await testarGeracaoEstrutura();

  // Aguardar um pouco entre os testes
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Teste 2
  const resultado2 = await testarReutilizacao();

  // Aguardar um pouco
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Teste 3
  await verificarBancoDados();

  console.log('\n🏁 Testes concluídos!');

  // Relatório final
  console.log('\n📋 RELATÓRIO:');
  console.log('─'.repeat(50));

  if (resultado1) {
    console.log('✅ Geração inicial: OK');
  } else {
    console.log('❌ Geração inicial: FALHOU');
  }

  if (resultado2) {
    if (resultado2.isNew === false || resultado2.goal?.isCached) {
      console.log('✅ Reutilização do cache: OK');
    } else {
      console.log('⚠️ Reutilização do cache: NÃO FUNCIONOU');
    }
  } else {
    console.log('❌ Teste de reutilização: FALHOU');
  }

  console.log('✅ Verificação do banco: OK');
}

// Executar
executarTestes().catch(console.error);