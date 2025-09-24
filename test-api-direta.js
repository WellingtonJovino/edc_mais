const fetch = require('node-fetch');

async function testApiDirect() {
  console.log('🧪 Testando API diretamente...');

  try {
    const response = await fetch('http://localhost:3001/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Quero estudar Física Básica',
        userProfile: {
          level: 'beginner',
          purpose: 'academic',
          timeAvailable: 'moderate',
          educationLevel: 'high_school',
          background: 'Estudante do ensino médio',
          specificGoals: 'Aprender física para vestibular',
          priorKnowledge: 'Matemática básica'
        },
        uploadedFiles: []
      })
    });

    console.log('📊 Status:', response.status);
    console.log('📊 Headers:', Object.fromEntries(response.headers));

    const data = await response.json();
    console.log('✅ Resposta recebida');
    console.log('📚 Título:', data.goal?.title);
    console.log('📊 Módulos:', data.goal?.modules?.length || 0);
    console.log('🆔 Structure ID:', data.goal?.metadata?.structureId);
    console.log('🆕 Is New:', data.goal?.metadata?.isNewStructure);

    return data;
  } catch (error) {
    console.error('❌ Erro:', error.message);
    return null;
  }
}

testApiDirect();