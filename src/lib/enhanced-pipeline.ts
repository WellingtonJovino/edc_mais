import {
  ProcessedFile,
  EnhancedCourseStructure,
  TopicMatch,
  Course,
  Module,
  Topic
} from '@/types';
import {
  runCourseGenerationPipeline,
  extractSubject,
  detectAcademicDiscipline
} from './course-generation-pipeline';
import { performTopicMatching } from './rag-processing';
import { extractTopicsFromDocument } from './document-analysis';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Pipeline enhanced que integra documentos processados com a geração de curso
 */
export async function runEnhancedCourseGenerationPipeline(
  userMessage: string,
  userProfile: any,
  processedFiles: ProcessedFile[] = [],
  progressCallback?: (progress: number, step: number, message: string) => Promise<void>
): Promise<EnhancedCourseStructure> {

  console.log(`🚀 Iniciando pipeline enhanced com ${processedFiles.length} documentos processados`);

  const updateProgress = async (progress: number, step: number, message: string) => {
    if (progressCallback) {
      await progressCallback(progress, step, message);
    }
  };

  try {
    // Etapa 1: Gerar estrutura base do curso (0-60%)
    await updateProgress(5, 1, 'Gerando estrutura base do curso...');

    const baseCourse = await runCourseGenerationPipeline(
      userMessage,
      userProfile,
      [], // Não usar arquivos no pipeline original
      async (progress, step, message) => {
        // Mapear progresso para 0-60%
        const adjustedProgress = Math.round(progress * 0.6);
        await updateProgress(adjustedProgress, step, message);
      }
    );

    await updateProgress(60, 3, 'Estrutura base criada, integrando documentos...');

    // Etapa 2: Integrar documentos se houver (60-80%)
    let enhancedStructure: EnhancedCourseStructure;

    if (processedFiles.length > 0) {
      enhancedStructure = await integrateDocumentsWithCourse(
        baseCourse,
        processedFiles,
        async (progress) => {
          const adjustedProgress = 60 + Math.round(progress * 0.2);
          await updateProgress(adjustedProgress, 3, 'Integrando conteúdo dos documentos...');
        }
      );
    } else {
      // Sem documentos, retornar estrutura básica
      enhancedStructure = createBasicEnhancedStructure(baseCourse);
    }

    // Etapa 3: Validação e otimização final (80-100%)
    await updateProgress(85, 4, 'Validando estrutura integrada...');
    const validatedStructure = await validateEnhancedStructure(enhancedStructure);

    await updateProgress(95, 4, 'Otimizando organização pedagógica...');
    const finalStructure = await optimizePedagogicalOrder(validatedStructure);

    await updateProgress(100, 4, 'Curso enhanced criado com sucesso!');

    console.log(`✅ Pipeline enhanced concluído:`);
    console.log(`📚 Módulos: ${finalStructure.course.modules.length}`);
    console.log(`📋 Tópicos matched: ${Object.keys(finalStructure.documentMatches).length}`);
    console.log(`➕ Novos tópicos: ${finalStructure.documentDerivedTopics.length}`);
    console.log(`❓ Tópicos sem match: ${finalStructure.unmatchedTopics.length}`);

    return finalStructure;

  } catch (error) {
    console.error('❌ Erro no pipeline enhanced:', error);
    throw error;
  }
}

/**
 * Integra documentos processados com a estrutura do curso
 */
async function integrateDocumentsWithCourse(
  baseCourse: Course,
  processedFiles: ProcessedFile[],
  progressCallback?: (progress: number) => Promise<void>
): Promise<EnhancedCourseStructure> {

  console.log(`🔗 Integrando ${processedFiles.length} documentos com o curso`);

  // Extrair todos os tópicos dos módulos do curso
  const courseTopics: Array<{
    id: string;
    title: string;
    description: string;
    learningObjectives?: string[];
    moduleId: string;
  }> = [];

  for (const module of baseCourse.modules) {
    for (const topic of module.topics) {
      courseTopics.push({
        id: topic.id,
        title: topic.title,
        description: topic.description,
        learningObjectives: topic.learningObjectives,
        moduleId: module.id
      });
    }
  }

  await progressCallback?.(20);

  // Extrair todos os tópicos dos documentos
  const allDocumentTopics = processedFiles.flatMap(file => file.extractedTopics);
  console.log(`📋 ${courseTopics.length} tópicos do curso vs ${allDocumentTopics.length} dos documentos`);

  await progressCallback?.(40);

  // Realizar matching entre tópicos
  const matches = await performTopicMatching(
    courseTopics,
    allDocumentTopics,
    0.75, // strong threshold
    0.60  // weak threshold
  );

  await progressCallback?.(70);

  // Organizar matches por tipo
  const documentMatches: EnhancedCourseStructure['documentMatches'] = {};
  const newTopics: EnhancedCourseStructure['documentDerivedTopics'] = [];
  const unmatchedTopics: EnhancedCourseStructure['unmatchedTopics'] = [];

  for (const match of matches) {
    if (match.courseTopicId.startsWith('new-topic-')) {
      // Novo tópico derivado de documento
      if (match.newTopicSuggestion && match.documentTopicId) {
        const documentTopic = allDocumentTopics.find(t => t.id === match.documentTopicId);
        if (documentTopic) {
          // Decidir em qual módulo colocar (baseado em similaridade semântica)
          const bestModule = await findBestModuleForTopic(
            match.newTopicSuggestion.title,
            baseCourse.modules
          );

          const newTopic: Topic = {
            id: `doc-topic-${match.documentTopicId}`,
            title: match.newTopicSuggestion.title,
            description: match.newTopicSuggestion.description,
            detailedDescription: documentTopic.description,
            order: bestModule.topics.length + 1,
            videos: [],
            aulaTexto: {} as any, // Será preenchido depois
            completed: false,
            estimatedDuration: documentTopic.estimatedDuration || '1-2 horas',
            learningObjectives: [`Compreender ${match.newTopicSuggestion.title}`],
            keyTerms: documentTopic.keyTerms || [],
            searchKeywords: documentTopic.keyTerms || [],
            difficulty: documentTopic.difficulty || 'medium'
          };

          newTopics.push({
            moduleId: bestModule.id,
            topic: newTopic,
            sourceChunks: documentTopic.relatedChunks.map(chunk => ({
              fileId: processedFiles.find(f =>
                f.chunks.some(c => c.id === chunk.chunkId)
              )?.id || '',
              chunkId: chunk.chunkId,
              text: chunk.excerpt
            }))
          });
        }
      }
    } else {
      // Match com tópico existente
      if (match.matchType !== 'none') {
        const sourceFile = processedFiles.find(file =>
          file.extractedTopics.some(topic => topic.id === match.documentTopicId)
        );

        documentMatches[match.courseTopicId] = {
          matchType: match.matchType,
          documentSources: sourceFile ? [{
            fileId: sourceFile.id,
            fileName: sourceFile.name,
            chunks: match.linkedChunks?.map(chunk => ({
              chunkId: chunk.chunkId,
              text: chunk.excerpt,
              score: chunk.score
            })) || []
          }] : []
        };
      } else {
        // Tópico do curso sem match
        const courseTopic = courseTopics.find(t => t.id === match.courseTopicId);
        if (courseTopic) {
          unmatchedTopics.push({
            topicId: courseTopic.id,
            title: courseTopic.title,
            needsExternalContent: true
          });
        }
      }
    }
  }

  await progressCallback?.(90);

  // Adicionar novos tópicos aos módulos
  for (const newTopicEntry of newTopics) {
    const module = baseCourse.modules.find(m => m.id === newTopicEntry.moduleId);
    if (module) {
      module.topics.push(newTopicEntry.topic);
      console.log(`➕ Adicionado tópico "${newTopicEntry.topic.title}" ao módulo "${module.title}"`);
    }
  }

  await progressCallback?.(100);

  return {
    course: baseCourse,
    documentMatches,
    documentDerivedTopics: newTopics,
    unmatchedTopics
  };
}

/**
 * Encontra o melhor módulo para um novo tópico baseado em similaridade semântica
 */
async function findBestModuleForTopic(
  topicTitle: string,
  modules: Module[]
): Promise<Module> {

  if (modules.length === 0) {
    throw new Error('Nenhum módulo disponível');
  }

  try {
    const prompt = `Analise este novo tópico e determine qual módulo é mais adequado:

NOVO TÓPICO: "${topicTitle}"

MÓDULOS DISPONÍVEIS:
${modules.map((module, idx) =>
  `${idx + 1}. ${module.title}: ${module.description}`
).join('\n')}

Retorne apenas o NÚMERO do módulo mais adequado (1-${modules.length}):`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 10,
      temperature: 0.1
    });

    const moduleNumber = parseInt(response.choices[0].message.content?.trim() || '1');
    const moduleIndex = Math.max(0, Math.min(moduleNumber - 1, modules.length - 1));

    console.log(`🎯 Tópico "${topicTitle}" será adicionado ao módulo "${modules[moduleIndex].title}"`);
    return modules[moduleIndex];

  } catch (error) {
    console.error('Erro ao determinar módulo, usando o primeiro:', error);
    return modules[0];
  }
}

/**
 * Cria estrutura enhanced básica para cursos sem documentos
 */
function createBasicEnhancedStructure(course: Course): EnhancedCourseStructure {
  const unmatchedTopics: EnhancedCourseStructure['unmatchedTopics'] = [];

  // Marcar todos os tópicos como não tendo documentos
  for (const module of course.modules) {
    for (const topic of module.topics) {
      unmatchedTopics.push({
        topicId: topic.id,
        title: topic.title,
        needsExternalContent: true
      });
    }
  }

  return {
    course,
    documentMatches: {},
    documentDerivedTopics: [],
    unmatchedTopics
  };
}

/**
 * Valida a estrutura enhanced gerada
 */
async function validateEnhancedStructure(
  structure: EnhancedCourseStructure
): Promise<EnhancedCourseStructure> {

  console.log(`🔍 Validando estrutura enhanced...`);

  // Validações básicas
  const validations = [];

  // 1. Verificar se módulos têm tópicos suficientes
  for (const module of structure.course.modules) {
    if (module.topics.length < 3) {
      validations.push(`Módulo "${module.title}" tem poucos tópicos (${module.topics.length})`);
    }
  }

  // 2. Verificar se há um bom equilíbrio de matches
  const totalTopics = structure.course.modules.reduce((sum, module) => sum + module.topics.length, 0);
  const matchedTopics = Object.keys(structure.documentMatches).length;
  const matchRatio = totalTopics > 0 ? matchedTopics / totalTopics : 0;

  if (matchRatio > 0.8) {
    console.log(`✅ Alto matching com documentos: ${(matchRatio * 100).toFixed(1)}%`);
  } else if (matchRatio > 0.4) {
    console.log(`⚠️ Matching parcial com documentos: ${(matchRatio * 100).toFixed(1)}%`);
  } else {
    console.log(`❓ Baixo matching com documentos: ${(matchRatio * 100).toFixed(1)}%`);
  }

  // 3. Log de novos tópicos
  if (structure.documentDerivedTopics.length > 0) {
    console.log(`➕ ${structure.documentDerivedTopics.length} novos tópicos derivados dos documentos`);
  }

  if (validations.length > 0) {
    console.log(`⚠️ Validações encontradas:`, validations);
  } else {
    console.log(`✅ Estrutura enhanced validada com sucesso`);
  }

  return structure;
}

/**
 * Otimiza a ordem pedagógica dos tópicos considerando os documentos
 */
async function optimizePedagogicalOrder(
  structure: EnhancedCourseStructure
): Promise<EnhancedCourseStructure> {

  console.log(`🎯 Otimizando ordem pedagógica...`);

  // Para cada módulo, reorganizar tópicos por dificuldade e dependências
  for (const module of structure.course.modules) {
    if (module.topics.length > 1) {
      // Ordenar por dificuldade (easy -> medium -> hard) e depois por ordem original
      module.topics.sort((a, b) => {
        const difficultyOrder = { easy: 1, medium: 2, hard: 3 };
        const aDiff = difficultyOrder[a.difficulty] || 2;
        const bDiff = difficultyOrder[b.difficulty] || 2;

        if (aDiff !== bDiff) {
          return aDiff - bDiff;
        }

        return a.order - b.order;
      });

      // Atualizar números de ordem
      module.topics.forEach((topic, index) => {
        topic.order = index + 1;
      });

      console.log(`📚 Módulo "${module.title}" reorganizado com ${module.topics.length} tópicos`);
    }
  }

  console.log(`✅ Ordem pedagógica otimizada`);
  return structure;
}