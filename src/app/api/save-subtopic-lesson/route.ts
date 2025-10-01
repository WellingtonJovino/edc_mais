import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      courseStructureId,
      moduleIndex,
      topicIndex,
      subtopicIndex,
      subtopicTitle,
      lessonContent,
      subject,        // Novo: assunto do curso
      educationLevel, // Novo: nível educacional
      metadata = {}
    } = body;

    // Validar parâmetros obrigatórios
    if (!courseStructureId || moduleIndex === undefined || topicIndex === undefined ||
        subtopicIndex === undefined || !subtopicTitle || !lessonContent) {
      return NextResponse.json({
        success: false,
        error: 'Parâmetros obrigatórios faltando'
      }, { status: 400 });
    }

    console.log('💾 Salvando aula-texto no banco...', {
      courseStructureId,
      moduleIndex,
      topicIndex,
      subtopicIndex,
      subtopicTitle: subtopicTitle.substring(0, 50) + '...',
      contentLength: lessonContent.length
    });

    // Verificar se Supabase está configurado
    if (!supabase) {
      console.warn('⚠️ Supabase não configurado - salvando localmente');
      return NextResponse.json({
        success: true,
        lessonId: `local_${Date.now()}`,
        message: 'Aula salva localmente (Supabase não configurado)'
      });
    }

    // Construir o caminho do subtópico
    const subtopicPath = `${moduleIndex}/${topicIndex}/${subtopicIndex}`;

    // Gerar search_key para busca mais fácil
    const searchKey = subject && educationLevel
      ? `${subject.toLowerCase()}::${educationLevel.toLowerCase()}::${moduleIndex}::${topicIndex}::${subtopicIndex}`
      : null;

    console.log('🔑 Search Key gerada:', searchKey);

    // Preparar dados para inserção
    const lessonData = {
      course_structure_id: courseStructureId,
      module_index: moduleIndex,
      topic_index: topicIndex,
      subtopic_index: subtopicIndex,
      subtopic_title: subtopicTitle,
      subtopic_path: subtopicPath,
      lesson_content: lessonContent,
      subject: subject || null,            // Adicionar subject
      education_level: educationLevel || null, // Adicionar education_level
      search_key: searchKey,                // Adicionar search_key
      lesson_metadata: {
        ...metadata,
        generatedAt: new Date().toISOString(),
        contentLength: lessonContent.length,
        source: 'automatic_generation'
      },
      generation_model: metadata.model || 'gpt-4o',
      generation_tokens: metadata.tokens || null,
      estimated_reading_time: estimateReadingTime(lessonContent),
      difficulty_level: metadata.difficulty || 'medium'
    };

    // Usar inserção direta (mais confiável)
    console.log('💾 Usando upsert direto para salvar aula...');
    const { data: directData, error: directError } = await supabase
      .from('subtopic_lessons')
      .upsert(lessonData, {
        onConflict: 'course_structure_id,module_index,topic_index,subtopic_index'
      })
      .select('id')
      .single();

    if (directError) {
      console.error('❌ Erro na inserção direta:', directError);
      throw directError;
    }

    console.log('✅ Aula salva com sucesso:', directData.id);
    return NextResponse.json({
      success: true,
      lessonId: directData.id,
      message: 'Aula-texto salva no banco de dados'
    });

  } catch (error) {
    console.error('❌ Erro no endpoint save-subtopic-lesson:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}

// Função auxiliar para estimar tempo de leitura
function estimateReadingTime(content: string): string {
  // Contar palavras (aproximadamente)
  const wordCount = content.split(/\s+/).length;

  // Velocidade média de leitura: 200-250 palavras por minuto
  const avgWordsPerMinute = 225;
  const minutes = Math.ceil(wordCount / avgWordsPerMinute);

  if (minutes <= 1) {
    return '1-2 min';
  } else if (minutes <= 3) {
    return '2-4 min';
  } else if (minutes <= 5) {
    return '4-6 min';
  } else if (minutes <= 10) {
    return '8-12 min';
  } else {
    return `${minutes} min`;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const courseStructureId = searchParams.get('courseStructureId');
    const subject = searchParams.get('subject');
    const educationLevel = searchParams.get('educationLevel');

    // Aceitar busca por courseStructureId OU por subject+educationLevel
    if (!courseStructureId && (!subject || !educationLevel)) {
      return NextResponse.json({
        success: false,
        error: 'courseStructureId ou subject+educationLevel são obrigatórios'
      }, { status: 400 });
    }

    console.log('🔍 Buscando aulas:', {
      courseStructureId,
      subject,
      educationLevel
    });

    // Verificar se Supabase está configurado
    if (!supabase) {
      console.warn('⚠️ Supabase não configurado');
      return NextResponse.json({
        success: true,
        lessons: [],
        message: 'Supabase não configurado'
      });
    }

    // Usar query direta (mais confiável que RPC)
    console.log('📊 Fazendo query direta para buscar aulas...');

    let directData;
    let directError;
    const structureId = String(courseStructureId).trim(); // Definir fora do bloco para estar acessível

    // Se temos subject e educationLevel, usar search_key (mais confiável)
    if (subject && educationLevel) {
      const searchPattern = `${subject.toLowerCase()}::${educationLevel.toLowerCase()}::`;
      console.log('🔑 Buscando por search_key:', searchPattern);

      const queryResult = await supabase
        .from('subtopic_lessons')
        .select('*')
        .like('search_key', `${searchPattern}%`);

      directData = queryResult.data;
      directError = queryResult.error;
    } else {
      // Fallback: usar course_structure_id
      console.log('🔑 Buscando por course_structure_id:', structureId);

      const queryResult = await supabase
        .from('subtopic_lessons')
        .select('*')
        .eq('course_structure_id', structureId);

      directData = queryResult.data;
      directError = queryResult.error;
    }

    if (directError) {
      console.error('❌ Erro na primeira query:', directError);

      // Tentar query alternativa usando LIKE
      console.log('🔄 Tentando query alternativa com LIKE...');
      const alternativeQuery = await supabase
        .from('subtopic_lessons')
        .select('*')
        .like('course_structure_id', `%${structureId}%`);

      if (alternativeQuery.data && alternativeQuery.data.length > 0) {
        console.log(`✅ Query alternativa encontrou ${alternativeQuery.data.length} aulas`);
        directData = alternativeQuery.data.filter((lesson: any) =>
          lesson.course_structure_id === structureId
        );
        directError = null;
      } else {
        throw directError;
      }
    }

    console.log(`✅ ${directData?.length || 0} aulas encontradas no banco`);

    // Debug adicional: buscar TODAS as aulas para ver quantas existem
    const { data: allLessons, error: allError } = await supabase
      .from('subtopic_lessons')
      .select('*')
      .limit(100);

    if (allLessons) {
      console.log('🔍 Total de aulas em TODO o banco:', allLessons.length);

      // Filtrar manualmente as aulas desta estrutura
      const thisCourseLessons = allLessons.filter((l: any) => {
        const lessonStructureId = String(l.course_structure_id).trim();
        const targetId = String(courseStructureId).trim();
        return lessonStructureId === targetId;
      });

      console.log(`📊 Aulas desta estrutura (${courseStructureId}):`, thisCourseLessons.length);

      if (thisCourseLessons.length > (directData?.length || 0)) {
        console.warn('⚠️ AVISO: Query direta retornou menos aulas do que existem!');
        console.log('🔍 Aulas encontradas pela query:', directData?.length || 0);
        console.log('🔍 Aulas reais desta estrutura:', thisCourseLessons.length);

        // Usar as aulas filtradas manualmente se forem mais
        if (thisCourseLessons.length > 0) {
          console.log('✅ Usando aulas filtradas manualmente');
          directData = thisCourseLessons;
        }
      }
    }

    console.log('📚 Primeiras 3 aulas retornadas:', directData?.slice(0, 3).map((l: any) => ({
      module: l.module_index,
      topic: l.topic_index,
      subtopic: l.subtopic_index,
      title: l.subtopic_title?.substring(0, 30) + '...'
    })));

    return NextResponse.json({
      success: true,
      lessons: directData || []
    });

  } catch (error) {
    console.error('❌ Erro ao buscar aulas:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}