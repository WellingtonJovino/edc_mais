const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

async function testarCriacaoCurso() {
  console.log('🏗️ Testando criação final de curso...');

  try {
    // Primeiro gerar estrutura
    const estruturaResponse = await fetch('http://localhost:3001/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Quero estudar Álgebra Linear',
        userProfile: {
          level: 'intermediate',
          purpose: 'academic',
          timeAvailable: 'moderate',
          educationLevel: 'undergraduate',
          background: 'Estudante de Engenharia',
          specificGoals: 'Preparar para disciplinas avançadas',
          priorKnowledge: 'Cálculo básico'
        },
        uploadedFiles: []
      })
    });

    const estrutura = await estruturaResponse.json();
    console.log('✅ Estrutura gerada:', estrutura.goal?.title);

    if (!estrutura.success || !estrutura.goal) {
      throw new Error('Falha ao gerar estrutura');
    }

    // Agora simular "gerar curso" como o frontend faria
    const cursoResponse = await fetch('http://localhost:3001/api/create-course', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        syllabus: estrutura.goal,
        uploadedFiles: []
      })
    });

    const curso = await cursoResponse.json();
    console.log('🎓 Curso criado:', curso.courseId);

    // Verificar se foi salvo no banco
    console.log('🔍 Verificando se curso foi salvo no banco...');

    const supabaseUrl = 'https://wxvwozhmkokdhkfqwrde.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4dndvemhta29rZGhrZnF3cmRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3Mzc2OTMsImV4cCI6MjA3NDMxMzY5M30.BuCF7kX11fphE4k3iVrU3MJwm9NhT-xDiE1POfGwrnA';

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: courses, error } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3);

    if (error) {
      console.error('❌ Erro ao verificar cursos:', error);
    } else {
      console.log(`📚 ${courses.length} cursos encontrados no banco:`);
      courses.forEach(course => {
        console.log(`   - "${course.title}" (${course.id})`);
      });
    }

    return true;

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    return false;
  }
}

testarCriacaoCurso();