// Script simples para testar o upload enhanced

async function testEnhancedUpload() {
  console.log('🧪 Testando Enhanced Upload API...');

  try {
    // 1. Testar upload básico
    console.log('📤 Testando upload...');

    const testFile = new File(['Este é um texto de teste sobre mecânica vetorial estática.\n\nForças e momentos são conceitos fundamentais.\n\nO equilíbrio de corpos rígidos é estudado através das condições de equilíbrio.'], 'test-mecanica.txt', {
      type: 'text/plain'
    });

    const formData = new FormData();
    formData.append('files', testFile);

    const uploadResponse = await fetch('/api/upload/enhanced', {
      method: 'POST',
      body: formData
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.status}`);
    }

    const uploadResult = await uploadResponse.json();
    console.log('✅ Upload concluído:', uploadResult);

    if (!uploadResult.success || !uploadResult.processedFiles) {
      throw new Error('Upload não retornou arquivos processados');
    }

    // 2. Testar análise enhanced
    console.log('🔍 Testando análise enhanced...');

    const analysisBody = {
      message: 'Quero estudar Mecânica Vetorial Estática para Engenharia',
      userProfile: {
        level: 'beginner',
        purpose: 'academic',
        timeAvailable: 'moderate',
        educationLevel: 'undergraduate',
        background: 'Estudante de engenharia',
        specificGoals: 'Entender forças e equilíbrio'
      },
      uploadedFiles: uploadResult.processedFiles
    };

    const analysisResponse = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(analysisBody)
    });

    if (!analysisResponse.ok) {
      throw new Error(`Analysis failed: ${analysisResponse.status}`);
    }

    const analysisResult = await analysisResponse.json();
    console.log('✅ Análise enhanced concluída:', analysisResult);

    // 3. Verificar resultados
    if (analysisResult.success && analysisResult.structure) {
      const structure = analysisResult.structure;
      console.log('📊 Estatísticas:');
      console.log(`- Módulos: ${structure.course.modules.length}`);
      console.log(`- Tópicos totais: ${structure.course.modules.reduce((sum, m) => sum + m.topics.length, 0)}`);
      console.log(`- Matches: ${Object.keys(structure.documentMatches).length}`);
      console.log(`- Novos tópicos: ${structure.documentDerivedTopics.length}`);
      console.log(`- Sem match: ${structure.unmatchedTopics.length}`);
    }

    return true;

  } catch (error) {
    console.error('❌ Erro no teste:', error);
    return false;
  }
}

// Se estiver em Node.js, executar o teste
if (typeof module !== 'undefined' && module.exports) {
  module.exports = testEnhancedUpload;
} else {
  // Se estiver no browser, disponibilizar globalmente
  window.testEnhancedUpload = testEnhancedUpload;
}

console.log('📋 Teste disponível. Execute testEnhancedUpload() para rodar.');