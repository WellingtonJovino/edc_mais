import { NextRequest, NextResponse } from 'next/server';
import { generateLessonText, LessonTextInput } from '@/lib/lesson-text-generator';

// Cache simples para evitar regenerações desnecessárias
const lessonCache = new Map<string, {
  content: string;
  timestamp: number;
  metadata: any;
}>();

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar entrada
    const {
      subtopicId,
      subtopicTitle,
      subtopicDescription,
      moduleTitle,
      courseTitle,
      userLevel,
      discipline,
      estimatedDuration,
      context,
      forceRegenerate = false
    } = body;

    if (!subtopicTitle || !discipline) {
      return NextResponse.json(
        { error: 'subtopicTitle e discipline são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar cache se não for regeneração forçada
    const cacheKey = `${subtopicId || subtopicTitle}_${userLevel || 'intermediate'}_${discipline}`;

    if (!forceRegenerate && lessonCache.has(cacheKey)) {
      const cached = lessonCache.get(cacheKey)!;

      // Verificar se cache ainda é válido
      if (Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log(`📋 Retornando aula-texto do cache: ${subtopicTitle}`);

        return NextResponse.json({
          success: true,
          content: cached.content,
          metadata: cached.metadata,
          cached: true,
          timestamp: cached.timestamp
        });
      } else {
        // Cache expirado
        lessonCache.delete(cacheKey);
      }
    }

    // Preparar input para geração
    const input: LessonTextInput = {
      subtopicTitle,
      subtopicDescription: subtopicDescription || `Estudo detalhado sobre ${subtopicTitle}`,
      moduleTitle: moduleTitle || 'Módulo de Estudo',
      courseTitle: courseTitle || `Curso de ${discipline}`,
      userLevel: userLevel || 'intermediate',
      discipline,
      estimatedDuration: estimatedDuration || '45 min',
      context
    };

    console.log(`🎓 Iniciando geração de aula-texto: ${subtopicTitle}`);

    // Gerar aula-texto
    const result = await generateLessonText(input);

    // Armazenar no cache
    lessonCache.set(cacheKey, {
      content: result.content,
      timestamp: Date.now(),
      metadata: result.metadata
    });

    // Limpar cache antigo (manter apenas os 100 mais recentes)
    if (lessonCache.size > 100) {
      const entries = Array.from(lessonCache.entries());
      entries.sort((a, b) => b[1].timestamp - a[1].timestamp);

      // Manter apenas os 80 mais recentes
      lessonCache.clear();
      entries.slice(0, 80).forEach(([key, value]) => {
        lessonCache.set(key, value);
      });
    }

    console.log(`✅ Aula-texto gerada com sucesso: ${result.metadata.wordCount} palavras`);

    return NextResponse.json({
      success: true,
      content: result.content,
      structure: result.structure,
      metadata: result.metadata,
      generationInfo: result.generationInfo,
      cached: false,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('❌ Erro na API de geração de aula-texto:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno do servidor',
        timestamp: Date.now()
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'cache-stats') {
    // Endpoint para verificar estatísticas do cache
    const stats = {
      totalCached: lessonCache.size,
      oldestEntry: Math.min(...Array.from(lessonCache.values()).map(v => v.timestamp)),
      newestEntry: Math.max(...Array.from(lessonCache.values()).map(v => v.timestamp)),
      totalSize: JSON.stringify(Array.from(lessonCache.entries())).length
    };

    return NextResponse.json({
      success: true,
      stats
    });
  }

  if (action === 'clear-cache') {
    // Endpoint para limpar cache (para desenvolvimento)
    const clearedCount = lessonCache.size;
    lessonCache.clear();

    return NextResponse.json({
      success: true,
      message: `Cache limpo: ${clearedCount} entradas removidas`
    });
  }

  return NextResponse.json(
    { error: 'Endpoint GET requer parâmetro action válido' },
    { status: 400 }
  );
}