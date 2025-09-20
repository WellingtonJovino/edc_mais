import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Sanitiza resposta JSON do GPT removendo markdown e caracteres problemáticos
 */
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

/**
 * Extrai o assunto que o usuário quer aprender usando GPT
 */
export async function extractLearningSubject(userMessage: string): Promise<{
  subject: string;
  context: string;
  isContextUseful: boolean;
}> {
  try {
    console.log(`🔍 Extraindo assunto da mensagem: "${userMessage}"`);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-2024-11-20",
      messages: [
        {
          role: 'system',
          content: `Você é um especialista em análise de texto educacional. Sua tarefa é extrair exatamente o que o usuário quer aprender e separar o contexto útil do desnecessário.

RETORNE APENAS JSON no formato:
{
  "subject": "assunto principal que quer aprender",
  "context": "contexto útil para personalizar o curso",
  "isContextUseful": true/false
}

Regras:
1. "subject" deve ser o tópico principal, limpo e direto
2. "context" inclui apenas informações úteis como nível, objetivo, tempo, experiência
3. "isContextUseful" = true se há contexto relevante, false se apenas palavras desnecessárias
4. Remova palavras como "quero aprender", "me ensine", "preciso saber", etc.`
        },
        {
          role: 'user',
          content: userMessage
        }
      ],
      max_tokens: 300,
      temperature: 0.1,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Resposta vazia da OpenAI');
    }

    const cleanedContent = sanitizeJsonResponse(content);
    const result = JSON.parse(cleanedContent);
    console.log(`✅ Assunto extraído: "${result.subject}" | Contexto útil: ${result.isContextUseful}`);

    return result;

  } catch (error) {
    console.error('❌ Erro ao extrair assunto, usando fallback:', error);
    // Fallback simples
    const subject = userMessage
      .replace(/quero aprender|me ensine|preciso saber|gostaria de aprender/gi, '')
      .trim();

    return {
      subject: subject || userMessage,
      context: '',
      isContextUseful: false
    };
  }
}

/**
 * Detecta a disciplina usando GPT ao invés de correspondência estática
 */
export async function detectSubjectWithGPT(userMessage: string): Promise<{
  discipline: string;
  confidence: number;
  isAcademic: boolean;
}> {
  try {
    console.log(`🎓 Detectando disciplina com GPT: "${userMessage}"`);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-2024-11-20",
      messages: [
        {
          role: 'system',
          content: `Você é um especialista em classificação de disciplinas acadêmicas. Analise a mensagem e determine:

1. A disciplina/matéria específica que o usuário quer aprender
2. Se é uma disciplina acadêmica formal ou assunto geral
3. Seu nível de confiança na classificação

RETORNE APENAS JSON:
{
  "discipline": "nome da disciplina (ex: Mecânica Vetorial Estática, Química Geral, Física I)",
  "confidence": 0.95,
  "isAcademic": true/false
}

Regras:
- Se for uma disciplina universitária específica (ex: "mecânica vetorial estática"), mantenha o nome completo
- Se for um assunto geral (ex: "química"), classifique como "Química Geral"
- confidence deve ser entre 0 e 1
- isAcademic = true para disciplinas formais, false para assuntos gerais`
        },
        {
          role: 'user',
          content: userMessage
        }
      ],
      max_tokens: 200,
      temperature: 0.1,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Resposta vazia da OpenAI');
    }

    const cleanedContent = sanitizeJsonResponse(content);
    const result = JSON.parse(cleanedContent);
    console.log(`✅ Disciplina detectada: "${result.discipline}" (confiança: ${result.confidence})`);

    return result;

  } catch (error) {
    console.error('❌ Erro na detecção GPT, usando fallback:', error);
    return {
      discipline: userMessage,
      confidence: 0.5,
      isAcademic: false
    };
  }
}

/**
 * Gera prompt otimizado para o Perplexity usando GPT
 */
export async function generatePerplexityPrompt(subject: string): Promise<string> {
  try {
    console.log(`📝 Gerando prompt Perplexity para: "${subject}"`);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-2024-11-20",
      messages: [
        {
          role: 'system',
          content: `Você é um especialista em design de prompts para pesquisa acadêmica. Crie um prompt otimizado para ser enviado ao Perplexity que irá buscar informações sobre estrutura curricular.

O prompt deve:
1. Ser específico para a disciplina/assunto fornecido
2. Pedir módulos, tópicos e subtópicos detalhados
3. Solicitar sequência pedagógica apropriada
4. Incluir referências acadêmicas quando possível

RETORNE APENAS o texto do prompt, sem aspas ou formatação JSON.`
        },
        {
          role: 'user',
          content: `Quero montar a estrutura de um curso completo sobre "${subject}". Escreva um prompt para eu mandar no Perplexity para conseguir os módulos, tópicos e subtópicos necessários para um curso abrangente de ${subject}.`
        }
      ],
      max_tokens: 500,
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Resposta vazia da OpenAI');
    }

    console.log(`✅ Prompt Perplexity gerado (${content.length} caracteres)`);
    return content.trim();

  } catch (error) {
    console.error('❌ Erro ao gerar prompt Perplexity, usando fallback:', error);
    // Fallback com prompt genérico mas funcional
    return `Quais são os principais módulos, tópicos e subtópicos necessários para um curso universitário completo de ${subject}? Liste de forma estruturada e hierárquica, incluindo sequência pedagógica apropriada e referências curriculares de universidades reconhecidas.`;
  }
}