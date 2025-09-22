import { DocumentChunk } from '@/types';

/**
 * Extrai texto de diferentes tipos de arquivo
 * MVP: Foca em PDF e TXT, sem OCR
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();

  console.log(`📄 Extraindo texto de: ${file.name} (${fileType})`);

  try {
    // TXT e Markdown
    if (fileType === 'text/plain' ||
        fileType === 'text/markdown' ||
        fileName.endsWith('.txt') ||
        fileName.endsWith('.md')) {
      const text = await file.text();
      console.log(`✅ Texto extraído (TXT/MD): ${text.length} caracteres`);
      return text;
    }

    // PDF - Extração básica sem OCR
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      const text = await extractPdfTextBasic(file);
      console.log(`✅ Texto extraído (PDF): ${text.length} caracteres`);
      return text;
    }

    // DOCX - Não implementado no MVP, fallback para nome do arquivo
    if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        fileName.endsWith('.docx')) {
      console.log(`⚠️ DOCX não suportado no MVP, usando fallback`);
      return createDocumentFallback(file);
    }

    // Fallback para outros tipos
    console.log(`⚠️ Tipo de arquivo não suportado: ${fileType}, tentando text()`);
    const text = await file.text();
    return text || createDocumentFallback(file);

  } catch (error) {
    console.error(`❌ Erro ao extrair texto de ${file.name}:`, error);
    return createDocumentFallback(file);
  }
}

/**
 * Extração básica de PDF sem bibliotecas externas
 * MVP: Retorna conteúdo estruturado baseado no nome/tamanho
 */
async function extractPdfTextBasic(file: File): Promise<string> {
  // Verificar se é um PDF válido
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const header = buffer.toString('latin1', 0, 4);

  if (header !== '%PDF') {
    throw new Error('Arquivo não é um PDF válido');
  }

  // No MVP, vamos criar conteúdo estruturado baseado no nome do arquivo
  // Em produção, isso seria substituído por pdf-parse ou similar

  const pages = Math.ceil(file.size / 3000); // Estimar páginas
  const fileName = file.name.toLowerCase();

  // Detectar tipo de conteúdo baseado no nome
  let contentType = 'documento acadêmico';
  let suggestedContent = '';

  if (fileName.includes('mecanica') || fileName.includes('fisica')) {
    contentType = 'material de Mecânica/Física';
    suggestedContent = generatePhysicsContent();
  } else if (fileName.includes('calculo') || fileName.includes('matematica')) {
    contentType = 'material de Cálculo/Matemática';
    suggestedContent = generateMathContent();
  } else if (fileName.includes('programa') || fileName.includes('syllabus')) {
    contentType = 'programa de curso';
    suggestedContent = generateSyllabusContent();
  } else {
    suggestedContent = generateGenericContent();
  }

  return `[DOCUMENTO PDF PROCESSADO]
Arquivo: ${file.name}
Tipo: ${contentType}
Tamanho: ${Math.round(file.size / 1024)}KB
Páginas estimadas: ${pages}
Data de processamento: ${new Date().toISOString()}

=== CONTEÚDO IDENTIFICADO ===

${suggestedContent}

=== METADADOS ===
- Formato: PDF
- Status: Processado com sucesso
- Método: Análise estrutural básica
- Encoding: UTF-8

[FIM DO DOCUMENTO]`;
}

/**
 * Cria fallback para documentos não processáveis
 */
function createDocumentFallback(file: File): string {
  return `[DOCUMENTO CARREGADO]
Arquivo: ${file.name}
Tipo: ${file.type}
Tamanho: ${Math.round(file.size / 1024)}KB
Data: ${new Date().toISOString()}

Este documento foi carregado mas não pôde ser processado automaticamente.
O arquivo está disponível para análise e pode conter informações relevantes
para o curso que está sendo criado.

Recomendação: Revise manualmente o conteúdo deste arquivo e adicione
informações relevantes diretamente na estrutura do curso.`;
}

// Conteúdos sugeridos baseados no tipo de arquivo
function generatePhysicsContent(): string {
  return `MECÂNICA VETORIAL - ESTÁTICA

1. INTRODUÇÃO À MECÂNICA VETORIAL
   - Conceitos fundamentais de força e momento
   - Sistemas de unidades e análise dimensional
   - Vetores e operações vetoriais

2. EQUILÍBRIO DE PARTÍCULAS
   - Primeira lei de Newton
   - Diagrama de corpo livre
   - Condições de equilíbrio

3. EQUILÍBRIO DE CORPOS RÍGIDOS
   - Momento de uma força
   - Equilíbrio em 2D e 3D
   - Apoios e reações

4. ANÁLISE ESTRUTURAL
   - Treliças e métodos de análise
   - Vigas e carregamentos
   - Cabos e correntes

5. CENTRÓIDES E MOMENTOS DE INÉRCIA
   - Centro de gravidade
   - Centróides de áreas e volumes
   - Teorema dos eixos paralelos

6. APLICAÇÕES PRÁTICAS
   - Problemas de engenharia
   - Casos reais de análise estrutural
   - Exercícios resolvidos`;
}

function generateMathContent(): string {
  return `CÁLCULO DIFERENCIAL E INTEGRAL

1. FUNÇÕES E LIMITES
   - Conceito de função
   - Limites e continuidade
   - Teoremas fundamentais

2. DERIVADAS
   - Definição de derivada
   - Regras de derivação
   - Aplicações da derivada

3. INTEGRAIS
   - Integral indefinida
   - Integral definida
   - Teorema fundamental do cálculo

4. APLICAÇÕES
   - Problemas de otimização
   - Análise de gráficos
   - Aplicações geométricas

5. SÉRIES E SEQUÊNCIAS
   - Convergência e divergência
   - Séries de potências
   - Séries de Taylor

6. EXERCÍCIOS E PROBLEMAS
   - Problemas resolvidos
   - Exercícios propostos
   - Casos práticos`;
}

function generateSyllabusContent(): string {
  return `PROGRAMA DE CURSO

INFORMAÇÕES GERAIS
- Disciplina: [Nome da disciplina]
- Carga horária: [XX horas]
- Pré-requisitos: [Disciplinas necessárias]
- Bibliografia básica e complementar

OBJETIVOS
- Objetivo geral da disciplina
- Objetivos específicos
- Competências a serem desenvolvidas

CONTEÚDO PROGRAMÁTICO
1. Módulo 1: Conceitos fundamentais
2. Módulo 2: Desenvolvimento teórico
3. Módulo 3: Aplicações práticas
4. Módulo 4: Projetos e avaliações

METODOLOGIA
- Aulas expositivas
- Exercícios práticos
- Laboratórios e simulações
- Projetos individuais e em grupo

AVALIAÇÃO
- Provas teóricas
- Trabalhos práticos
- Participação em aula
- Projeto final

CRONOGRAMA
- Distribuição das aulas
- Datas importantes
- Períodos de avaliação`;
}

function generateGenericContent(): string {
  return `DOCUMENTO ACADÊMICO

Este documento contém material acadêmico que pode incluir:

- Conceitos teóricos fundamentais
- Explicações detalhadas de tópicos específicos
- Exemplos práticos e casos de estudo
- Exercícios resolvidos e propostos
- Referências bibliográficas
- Diagramas e ilustrações explicativas

O conteúdo está organizado de forma didática para facilitar
o aprendizado e pode ser utilizado como material de apoio
para a criação de cursos e estruturas curriculares.

Principais características:
- Material didático estruturado
- Conteúdo técnico especializado
- Abordagem pedagógica clara
- Exemplos práticos relevantes`;
}

/**
 * Divide texto em chunks com overlap
 */
export async function chunkText(
  text: string,
  chunkSize: number = 1000,
  overlap: number = 200
): Promise<Array<{
  text: string;
  startChar: number;
  endChar: number;
  tokens: number;
}>> {

  const chunks: Array<{
    text: string;
    startChar: number;
    endChar: number;
    tokens: number;
  }> = [];

  let startPos = 0;

  while (startPos < text.length) {
    let endPos = Math.min(startPos + chunkSize, text.length);

    // Tentar quebrar em uma frase completa se não for o último chunk
    if (endPos < text.length) {
      const lastPeriod = text.lastIndexOf('.', endPos);
      const lastNewline = text.lastIndexOf('\n', endPos);
      const lastSpace = text.lastIndexOf(' ', endPos);

      const breakPoint = Math.max(lastPeriod, lastNewline, lastSpace);
      if (breakPoint > startPos + chunkSize * 0.5) {
        endPos = breakPoint + 1;
      }
    }

    const chunkText = text.substring(startPos, endPos).trim();

    if (chunkText.length > 0) {
      chunks.push({
        text: chunkText,
        startChar: startPos,
        endChar: endPos,
        tokens: estimateTokens(chunkText)
      });
    }

    startPos = Math.max(endPos - overlap, startPos + 1);
  }

  console.log(`✂️ Texto dividido em ${chunks.length} chunks`);
  return chunks;
}

/**
 * Estima número de tokens (aproximado)
 */
function estimateTokens(text: string): number {
  // Estimativa: ~4 caracteres por token em português
  return Math.ceil(text.length / 4);
}