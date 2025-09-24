const fetch = require('node-fetch');

async function testarRespostaCompleta() {
  console.log('🔍 Testando resposta completa da API...');

  try {
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

    console.log('📊 Status Response:', response.status);
    console.log('📊 Response Headers:', Object.fromEntries(response.headers));

    const text = await response.text();
    console.log('📄 Raw Response:', text.substring(0, 500) + '...');

    let result;
    try {
      result = JSON.parse(text);
    } catch (parseError) {
      console.error('❌ Erro ao fazer parse do JSON:', parseError.message);
      console.log('📄 Primeira parte do texto:', text.substring(0, 200));
      return;
    }

    console.log('\n📊 Estrutura da resposta:');
    console.log('- success:', result.success);
    console.log('- error:', result.error);
    console.log('- goal existe?', !!result.goal);

    if (result.goal) {
      console.log('- goal.title:', result.goal.title);
      console.log('- goal.modules length:', result.goal.modules?.length);
      console.log('- goal.metadata:', result.goal.metadata);
      console.log('- goal.isCached:', result.goal.isCached);
    }

    if (result.success && result.goal && result.goal.title) {
      console.log('\n🎉 SUCCESS: API retornou estrutura válida!');
      if (result.goal.metadata?.structureId) {
        console.log('✅ ID da estrutura:', result.goal.metadata.structureId);
        console.log('♻️ Estrutura nova?', result.goal.metadata.isNewStructure);
      }
    } else {
      console.log('\n❌ PROBLEMA: API não retornou estrutura válida');
      console.log('📄 Response completa:', JSON.stringify(result, null, 2));
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

testarRespostaCompleta();