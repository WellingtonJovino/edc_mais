const fetch = require('node-fetch');

async function testeRapido() {
  console.log('⚡ Teste rápido de verificação...');

  try {
    const response = await fetch('http://localhost:3001/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Quero estudar Matemática Básica',
        userProfile: {
          level: 'beginner',
          purpose: 'academic',
          timeAvailable: 'minimal',
          educationLevel: 'high_school',
          background: 'Estudante',
          specificGoals: 'Preparação básica',
          priorKnowledge: 'Pouco'
        },
        uploadedFiles: []
      })
    });

    console.log('📊 Status:', response.status);

    if (response.status === 200) {
      console.log('✅ API está funcionando!');
      console.log('📄 Headers:', Object.fromEntries(response.headers.entries()));

      // Tentar ler apenas o início da resposta
      const text = await response.text();
      let result;

      try {
        result = JSON.parse(text);
        console.log('✅ JSON válido recebido');
        console.log('🎯 Estrutura:', {
          success: result.success,
          hasGoal: !!result.goal,
          hasStructure: !!result.structure,
          goalTitle: result.goal?.title || result.structure?.goal?.title
        });

        // Testar a lógica de compatibilidade do frontend
        const goalData = result.goal || result.structure?.goal;
        if (goalData) {
          console.log('✅ Frontend conseguirá processar a resposta');
          console.log('📚 Título encontrado:', goalData.title);
        } else {
          console.log('❌ Frontend não conseguirá processar');
        }

      } catch (parseError) {
        console.log('❌ Erro de parse JSON:', parseError.message);
        console.log('📄 Primeiros 200 chars:', text.substring(0, 200));
      }

    } else {
      console.log('❌ Status não é 200:', response.status);
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

// Usar timeout mais curto
const timeout = setTimeout(() => {
  console.log('⏰ Timeout de 30 segundos atingido');
  process.exit(1);
}, 30000);

testeRapido().then(() => {
  clearTimeout(timeout);
  console.log('✅ Teste concluído');
}).catch((error) => {
  clearTimeout(timeout);
  console.error('❌ Falha no teste:', error.message);
  process.exit(1);
});