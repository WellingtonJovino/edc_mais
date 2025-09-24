const fetch = require('node-fetch');

async function testarReutilizacao() {
  console.log('🔄 Testando reutilização da estrutura salva...');

  try {
    // Usar EXATAMENTE os mesmos dados que foram salvos
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

    console.log('✅ Resposta recebida!');
    console.log('📚 Título:', result.goal?.title);
    console.log('📊 Módulos:', result.goal?.modules?.length || 0);
    console.log('🆔 Structure ID:', result.goal?.metadata?.structureId);
    console.log('🆕 Is New Structure:', result.goal?.metadata?.isNewStructure);
    console.log('♻️ Is Cached:', result.goal?.isCached);

    // Verificar se foi reutilizada
    if (result.goal?.metadata?.structureId && result.goal?.metadata?.isNewStructure === false) {
      console.log('\n🎉 SUCESSO: Estrutura foi reutilizada do banco de dados!');
      console.log('✅ ID da estrutura reutilizada:', result.goal.metadata.structureId);
      return true;
    } else if (result.goal?.isCached === true) {
      console.log('\n🎉 SUCESSO: Estrutura foi reutilizada (marcada como cached)!');
      return true;
    } else {
      console.log('\n⚠️ AVISO: Nova estrutura foi gerada (reutilização não funcionou)');
      return false;
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    return false;
  }
}

testarReutilizacao();