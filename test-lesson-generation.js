// Teste simples da geração de aula-texto
// Execute com: node test-lesson-generation.js

const fetch = require('node-fetch');

async function testLessonGeneration() {
  console.log('🧪 Testando geração de aula-texto...');

  try {
    const response = await fetch('http://localhost:3000/api/generate-lesson', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subtopicId: 'test-001',
        subtopicTitle: 'Derivadas de Funções Polinomiais',
        subtopicDescription: 'Introdução ao conceito de derivadas aplicado a funções polinomiais',
        moduleTitle: 'Cálculo Diferencial',
        courseTitle: 'Cálculo A',
        userLevel: 'intermediate',
        discipline: 'Matemática',
        estimatedDuration: '45 min'
      })
    });

    console.log(`📡 Status da resposta: ${response.status}`);

    const data = await response.json();

    if (data.success) {
      console.log('✅ Aula-texto gerada com sucesso!');
      console.log(`📊 Metadados:`, {
        wordCount: data.metadata?.wordCount,
        readingTime: data.metadata?.estimatedReadingTime,
        difficulty: data.metadata?.difficultyLevel,
        sources: data.metadata?.sources?.length || 0
      });
      console.log(`⏱️ Tempo de geração: ${data.generationInfo?.totalDuration}ms`);
      console.log(`📄 Preview do conteúdo (200 chars):`, data.content.substring(0, 200) + '...');
    } else {
      console.error('❌ Erro na geração:', data.error);
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

// Executar teste
testLessonGeneration();