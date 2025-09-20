import { LearningGoal, Topic } from '@/types';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function sanitizeJsonResponse(content: string): string {
  // Remove cercas de código markdown
  let cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');

  // Remove caracteres de controle
  cleaned = cleaned.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007f-\u009f]/g, '');

  // Procura o primeiro { e último }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  return cleaned.trim();
}

export async function generateFallbackAnalysis(userInput: string, files?: any[]): Promise<LearningGoal> {
  console.log('🔄 Usando análise de fallback com OpenAI');

  const prompt = `
Analise o objetivo de aprendizado: "${userInput}"

${files && files.length > 0 ? `
Arquivos enviados:
${files.map(f => `- ${f.name} (${f.type || 'unknown'})`).join('\n')}
` : ''}

Crie uma estrutura hierárquica de aprendizado no formato JSON:

{
  "title": "Título do curso",
  "description": "Descrição do objetivo",
  "level": "beginner|intermediate|advanced",
  "modules": [
    {
      "id": "module-1",
      "title": "Módulo 1",
      "description": "Descrição do módulo",
      "order": 0,
      "topics": [
        {
          "id": "topic-1-1",
          "title": "Tópico 1.1",
          "description": "Descrição do tópico",
          "order": 0,
          "completed": false,
          "videos": [],
          "learningObjectives": ["objetivo 1", "objetivo 2"],
          "keyTerms": ["termo 1", "termo 2"],
          "difficulty": "easy|medium|hard"
        }
      ]
    }
  ]
}

Regras:
- 3-5 módulos máximo
- 3-6 tópicos por módulo
- Progressão lógica do básico ao avançado
- Seja específico e prático
`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Você é um especialista em design educacional. Retorne apenas JSON válido.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content || '{}';
    const cleanedContent = sanitizeJsonResponse(content);
    const analysis = JSON.parse(cleanedContent);

    // Converter para o formato LearningGoal
    return {
      id: `fallback-${Date.now()}`,
      title: analysis.title || userInput,
      description: analysis.description || `Curso sobre ${userInput}`,
      level: analysis.level || 'beginner',
      modules: analysis.modules || [],
      topics: [], // Compatibilidade
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Erro no fallback OpenAI:', error);

    // Fallback final - estrutura mínima
    return {
      id: `fallback-final-${Date.now()}`,
      title: userInput,
      description: `Curso sobre ${userInput}`,
      level: 'beginner',
      modules: [
        {
          id: 'module-1',
          title: 'Fundamentos',
          description: `Conceitos básicos de ${userInput}`,
          order: 0,
          completed: false,
          estimatedDuration: '2 horas',
          topics: [
            {
              id: 'topic-1-1',
              title: 'Introdução',
              description: `Introdução aos conceitos de ${userInput}`,
              detailedDescription: `Introdução aos conceitos de ${userInput}`,
              order: 0,
              completed: false,
              videos: [],
              aulaTexto: {} as any,
              estimatedDuration: '45 min',
              contentType: 'mixed' as const,
              hasDoubtButton: true,
              learningObjectives: [`Entender os conceitos básicos de ${userInput}`],
              keyTerms: [userInput],
              searchKeywords: [userInput.toLowerCase()],
              difficulty: 'easy' as const
            }
          ]
        }
      ],
      topics: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }
}

export async function validateCourseCoverage(
  courseTitle: string,
  modules: any[],
  uploadedFiles?: any[]
): Promise<{
  coverage: number;
  missingTopics: string[];
  suggestions: string[];
}> {
  if (!uploadedFiles || uploadedFiles.length === 0) {
    return {
      coverage: 80,
      missingTopics: [],
      suggestions: ['Envie materiais de referência para uma análise mais detalhada']
    };
  }

  const filesContent = uploadedFiles.map(f =>
    `${f.name}: ${(f.content || '').substring(0, 1000)}`
  ).join('\n\n');

  const analysisPrompt = `
Analise se o curso "${courseTitle}" cobre adequadamente o conteúdo dos arquivos enviados.

MÓDULOS DO CURSO:
${modules.map(m => `${m.title}: ${m.topics?.map((t: any) => t.title).join(', ')}`).join('\n')}

CONTEÚDO DOS ARQUIVOS:
${filesContent}

Retorne um JSON:
{
  "coverage": number (0-100),
  "missingTopics": ["tópico 1", "tópico 2"],
  "suggestions": ["sugestão 1", "sugestão 2"]
}
`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Analise cobertura curricular. Retorne apenas JSON.' },
        { role: 'user', content: analysisPrompt }
      ],
      temperature: 0.2,
    });

    const content = response.choices[0]?.message?.content || '{}';
    const cleanedContent = sanitizeJsonResponse(content);
    return JSON.parse(cleanedContent);
  } catch (error) {
    console.error('Erro na análise de cobertura:', error);
    return {
      coverage: 75,
      missingTopics: [],
      suggestions: ['Análise detalhada indisponível no momento']
    };
  }
}