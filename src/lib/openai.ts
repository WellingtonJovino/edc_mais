import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface LearningAnalysis {
  subject: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  topics: Array<{
    title: string;
    description: string;
    keywords: string[];
    order: number;
  }>;
  searchQueries: string[];
}

export async function analyzeLearningGoal(userMessage: string): Promise<LearningAnalysis> {
  const prompt = `
    Analise a seguinte mensagem do usuário e extraia:
    1. O assunto que ele quer aprender
    2. O nível de conhecimento atual (beginner, intermediate, advanced)
    3. Uma lista organizada de tópicos para aprender (máximo 8 tópicos)
    4. Queries de busca otimizadas para o YouTube

    Mensagem do usuário: "${userMessage}"

    Responda APENAS com um JSON válido no seguinte formato:
    {
      "subject": "nome do assunto",
      "level": "beginner|intermediate|advanced",
      "topics": [
        {
          "title": "título do tópico",
          "description": "descrição detalhada",
          "keywords": ["palavra-chave1", "palavra-chave2"],
          "order": 1
        }
      ],
      "searchQueries": ["query1", "query2", "query3"]
    }
  `;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Resposta vazia da OpenAI');
    }

    return JSON.parse(content) as LearningAnalysis;
  } catch (error) {
    console.error('Erro ao analisar objetivo de aprendizado:', error);
    throw new Error('Falha ao processar sua solicitação. Tente novamente.');
  }
}

export async function generateFollowUpQuestions(topic: string, level: string): Promise<string[]> {
  const prompt = `
    Gere 3 perguntas de acompanhamento para ajudar o usuário a refinar seu aprendizado sobre "${topic}" no nível "${level}".
    
    Responda APENAS com um array JSON de strings:
    ["pergunta1", "pergunta2", "pergunta3"]
  `;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return [];

    return JSON.parse(content) as string[];
  } catch (error) {
    console.error('Erro ao gerar perguntas de acompanhamento:', error);
    return [];
  }
}