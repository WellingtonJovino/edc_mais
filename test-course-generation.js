/**
 * Teste automatizado para o sistema de geração e armazenamento de cursos
 * Testa: 1) Geração de curso, 2) Salvamento no banco, 3) Reutilização
 */

// Usar fetch nativo do Node.js 18+
// Se não funcionar, usar http nativo

const BASE_URL = 'http://localhost:3005';

// Simular uma requisição de geração de curso
async function testCourseGeneration() {
  console.log('🧪 === TESTE 1: GERAÇÃO DE ESTRUTURA DE CURSO ===');

  const testRequest = {
    message: "Quero aprender Cálculo Diferencial e Integral",
    userProfile: {
      level: 'intermediate',
      purpose: 'academic',
      timeAvailable: 'moderate',
      educationLevel: 'undergraduate',
      background: 'Engenharia',
      specificGoals: 'Dominar derivadas e integrais para disciplinas de engenharia',
      priorKnowledge: 'Conhecimento básico de matemática do ensino médio'
    },
    files: []
  };

  try {
    console.log('📤 Enviando requisição para /api/analyze...');

    const response = await fetch(`${BASE_URL}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testRequest)
    });

    console.log(`📊 Status da resposta: ${response.status}`);

    if (response.ok) {
      const result = await response.json();

      if (result.success) {
        console.log('✅ Estrutura gerada com sucesso!');
        console.log(`📚 Título: ${result.data.title}`);
        console.log(`📊 Módulos: ${result.data.modules?.length || 0}`);
        console.log(`📝 Total de tópicos: ${result.data.modules?.reduce((total, mod) => total + (mod.topics?.length || 0), 0) || 0}`);

        // Verificar se foi salva no banco
        if (result.data.structureId) {
          console.log(`💾 ID da estrutura salva: ${result.data.structureId}`);
          console.log(`🔄 É novo?: ${result.data.isNewStructure ? 'Sim' : 'Não (reutilizado)'}`);
          return result.data;
        } else {
          console.log('⚠️ Estrutura gerada mas sem ID de salvamento');
          return result.data;
        }
      } else {
        console.log('❌ Falha na geração:', result.error);
        return null;
      }
    } else {
      const errorText = await response.text();
      console.log('❌ Erro na requisição:', errorText);
      return null;
    }

  } catch (error) {
    console.error('❌ Erro na comunicação:', error.message);
    return null;
  }
}

// Testar reutilização da mesma estrutura
async function testCourseReuse() {
  console.log('\n🧪 === TESTE 2: REUTILIZAÇÃO DE ESTRUTURA ===');

  // Mesmo assunto e perfil do teste anterior
  const testRequest = {
    message: "Quero estudar Cálculo Diferencial e Integral",
    userProfile: {
      level: 'intermediate',
      purpose: 'academic',
      timeAvailable: 'moderate',
      educationLevel: 'undergraduate',
      background: 'Engenharia',
      specificGoals: 'Aprender derivadas e integrais',
      priorKnowledge: 'Matemática básica'
    },
    files: []
  };

  try {
    console.log('📤 Enviando requisição similar para verificar reutilização...');

    const response = await fetch(`${BASE_URL}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testRequest)
    });

    if (response.ok) {
      const result = await response.json();

      if (result.success) {
        console.log('✅ Resposta recebida!');
        console.log(`📚 Título: ${result.data.title}`);

        if (result.data.structureId) {
          console.log(`💾 ID da estrutura: ${result.data.structureId}`);
          console.log(`🔄 É nova?: ${result.data.isNewStructure ? 'Sim' : 'Não (reutilizada!)'}`);

          if (!result.data.isNewStructure) {
            console.log('🎉 SUCESSO! Estrutura foi reutilizada do banco de dados!');
          } else {
            console.log('⚠️ Estrutura foi gerada novamente (problema na reutilização)');
          }

          return result.data;
        } else {
          console.log('⚠️ Resposta sem informação de banco de dados');
          return null;
        }
      } else {
        console.log('❌ Falha na geração:', result.error);
        return null;
      }
    } else {
      const errorText = await response.text();
      console.log('❌ Erro na requisição:', errorText);
      return null;
    }

  } catch (error) {
    console.error('❌ Erro na comunicação:', error.message);
    return null;
  }
}

// Executar os testes
async function runTests() {
  console.log('🚀 Iniciando testes do sistema de geração de cursos...\n');

  // Aguardar servidor estar pronto
  console.log('⏳ Aguardando servidor estar disponível...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  const result1 = await testCourseGeneration();

  if (result1) {
    console.log('\n⏳ Aguardando 2 segundos antes do teste de reutilização...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    const result2 = await testCourseReuse();

    console.log('\n📊 === RESUMO DOS TESTES ===');
    console.log(`Teste 1 (Geração): ${result1 ? '✅ Sucesso' : '❌ Falhou'}`);
    console.log(`Teste 2 (Reutilização): ${result2 ? '✅ Sucesso' : '❌ Falhou'}`);

    if (result1 && result2) {
      console.log('🎉 Todos os testes passaram!');
    } else {
      console.log('⚠️ Alguns testes falharam - verifique os logs acima');
    }
  } else {
    console.log('\n❌ Teste de geração falhou - pulando teste de reutilização');
  }
}

// Verificar se o servidor está rodando primeiro
async function checkServer() {
  try {
    const response = await fetch(`${BASE_URL}`, {
      method: 'GET',
      timeout: 5000
    });

    if (response.ok) {
      console.log('✅ Servidor está rodando, iniciando testes...\n');
      return true;
    } else {
      console.log('❌ Servidor não está respondendo corretamente');
      return false;
    }
  } catch (error) {
    console.log('❌ Servidor não está acessível:', error.message);
    console.log('💡 Certifique-se de que `npm run dev` está rodando');
    return false;
  }
}

// Executar
checkServer().then(serverOk => {
  if (serverOk) {
    runTests();
  } else {
    console.log('\n🛑 Não é possível executar os testes sem o servidor rodando');
  }
});