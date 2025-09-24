const fetch = require('node-fetch');

async function testarCorrecaoFrontend() {
  console.log('🧪 Testando se a correção do frontend funcionou...');

  try {
    // Fazer request simulando o frontend
    const response = await fetch('http://localhost:3000/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Quero estudar Álgebra Linear Básica',
        userProfile: {
          level: 'beginner',
          purpose: 'academic',
          timeAvailable: 'moderate',
          educationLevel: 'undergraduate',
          background: 'Estudante de Matemática',
          specificGoals: 'Preparar para disciplinas avançadas',
          priorKnowledge: 'Matemática do ensino médio'
        },
        uploadedFiles: []
      })
    });

    const data = await response.json();

    console.log('📋 Resposta da API:', {
      success: data.success,
      hasGoal: !!data.goal,
      hasStructure: !!data.structure,
      goalTitle: data.goal?.title || data.structure?.goal?.title
    });

    // Simular lógica do frontend corrigida
    if (data.success && (data.structure || data.goal)) {
      const goalData = data.goal || data.structure?.goal;
      const prerequisites = goalData.prerequisites || data.prerequisites;

      if (!goalData) {
        throw new Error('Estrutura do curso não encontrada na resposta');
      }

      const syllabusData = {
        title: goalData.title,
        description: goalData.description,
        modules: goalData.modules || [],
        level: goalData.level
      };

      console.log('✅ Syllabus criado com sucesso:', {
        title: syllabusData.title,
        modulesCount: syllabusData.modules.length,
        level: syllabusData.level,
        hasPrerequisites: !!(prerequisites && prerequisites.length > 0)
      });

      return true;
    } else {
      console.error('❌ Resposta inválida:', {
        success: data.success,
        error: data.error,
        keys: Object.keys(data)
      });
      return false;
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    return false;
  }
}

testarCorrecaoFrontend();