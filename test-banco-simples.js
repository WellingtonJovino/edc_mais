const { createClient } = require('@supabase/supabase-js');

async function verificarBanco() {
  console.log('🔍 Verificando se a estrutura foi salva no banco...');

  try {
    const supabaseUrl = 'https://wxvwozhmkokdhkfqwrde.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4dndvemhta29rZGhrZnF3cmRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3Mzc2OTMsImV4cCI6MjA3NDMxMzY5M30.BuCF7kX11fphE4k3iVrU3MJwm9NhT-xDiE1POfGwrnA';

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verificar estruturas de curso
    console.log('📊 Buscando estruturas recentes...');
    const { data: structures, error: structError } = await supabase
      .from('course_structures')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (structError) {
      console.error('❌ Erro ao buscar estruturas:', structError);
      return;
    }

    console.log(`✅ Encontradas ${structures.length} estruturas no banco:`);
    structures.forEach((struct, index) => {
      console.log(`   ${index + 1}. "${struct.title}"`);
      console.log(`      📚 Assunto: ${struct.subject}`);
      console.log(`      🎓 Nível: ${struct.education_level}`);
      console.log(`      📊 Módulos: ${struct.total_modules} | Tópicos: ${struct.total_topics}`);
      console.log(`      📅 Criado em: ${new Date(struct.created_at).toLocaleString()}`);
      console.log('');
    });

    // Buscar especificamente por Cálculo Diferencial
    console.log('🔍 Buscando especificamente por "Cálculo Diferencial"...');
    const { data: calculoStruct, error: calculoError } = await supabase
      .from('course_structures')
      .select('*')
      .ilike('subject', '%cálculo diferencial%')
      .order('created_at', { ascending: false });

    if (calculoError) {
      console.error('❌ Erro na busca específica:', calculoError);
    } else if (calculoStruct && calculoStruct.length > 0) {
      console.log(`🎯 Encontradas ${calculoStruct.length} estruturas de Cálculo Diferencial:`);
      calculoStruct.forEach(struct => {
        console.log(`   ✅ "${struct.title}" - ${struct.education_level} (${new Date(struct.created_at).toLocaleString()})`);
      });
    } else {
      console.log('❌ Nenhuma estrutura de Cálculo Diferencial encontrada');
    }

    // Verificar logs de uso
    console.log('\n📈 Verificando logs de uso...');
    const { data: usageLogs, error: usageError } = await supabase
      .from('course_structure_usage')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (usageError) {
      console.error('❌ Erro ao buscar logs de uso:', usageError);
    } else {
      console.log(`📊 ${usageLogs.length} registros de uso encontrados:`);
      usageLogs.forEach((log, index) => {
        console.log(`   ${index + 1}. Estrutura ID: ${log.structure_id} | Reutilizado: ${log.reused} | ${new Date(log.created_at).toLocaleString()}`);
      });
    }

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

verificarBanco();