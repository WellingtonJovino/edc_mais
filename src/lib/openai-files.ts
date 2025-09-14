import OpenAI from "openai";

const client = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY!
});

export interface OpenAIFileInfo {
  id: string;
  name: string;
  size: number;
  purpose: string;
  created_at: number;
}

export interface AssistantInfo {
  id: string;
  name: string;
  model: string;
  fileIds: string[];
}

export interface FileSearchResult {
  assistantId: string;
  threadId: string;
  messageId: string;
  content: string;
  role: string;
}

/**
 * Faz upload de um arquivo para a OpenAI
 */
export async function uploadFileToOpenAI(file: File, purpose: string = "assistants"): Promise<OpenAIFileInfo> {
  try {
    console.log(`📤 Fazendo upload de "${file.name}" para OpenAI...`);
    
    // Converter File para formato esperado pela OpenAI
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const uploadedFile = await client.files.create({
      file: new File([buffer], file.name, { type: file.type }),
      purpose: purpose as any
    });

    console.log(`✅ Arquivo "${file.name}" enviado com ID: ${uploadedFile.id}`);

    return {
      id: uploadedFile.id,
      name: file.name,
      size: file.size,
      purpose: purpose,
      created_at: Date.now()
    };
  } catch (error) {
    console.error(`❌ Erro ao fazer upload de "${file.name}":`, error);
    throw new Error(`Falha no upload do arquivo: ${file.name}`);
  }
}

/**
 * Faz upload de múltiplos arquivos para a OpenAI
 */
export async function uploadFilesToOpenAI(files: File[]): Promise<OpenAIFileInfo[]> {
  console.log(`📤 Fazendo upload de ${files.length} arquivo(s) para OpenAI...`);
  
  const uploadPromises = files.map(file => uploadFileToOpenAI(file));
  const results = await Promise.allSettled(uploadPromises);
  
  const uploadedFiles: OpenAIFileInfo[] = [];
  const errors: string[] = [];
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      uploadedFiles.push(result.value);
    } else {
      errors.push(`Erro no arquivo "${files[index].name}": ${result.reason}`);
    }
  });
  
  if (errors.length > 0) {
    console.warn(`⚠️ ${errors.length} erro(s) no upload:`, errors);
  }
  
  console.log(`✅ Upload concluído: ${uploadedFiles.length}/${files.length} arquivo(s)`);
  return uploadedFiles;
}

/**
 * Cria um Assistant com acesso a arquivos
 */
export async function createAssistantWithFiles(
  fileIds: string[],
  name: string = "EDC+ Tutor",
  instructions?: string
): Promise<AssistantInfo> {
  try {
    console.log(`🤖 Criando Assistant "${name}" com ${fileIds.length} arquivo(s)...`);
    
    const defaultInstructions = `Você é um tutor especializado em educação online. 
    Use os arquivos fornecidos para responder perguntas de forma didática e precisa.
    Analise os documentos e forneça explicações claras e estruturadas.
    Quando usar informações dos documentos, seja específico sobre a fonte.`;

    const assistant = await client.beta.assistants.create({
      name: name,
      model: "gpt-4o-mini", 
      instructions: instructions || defaultInstructions,
      tools: [{ type: "file_search" }],
      tool_resources: {
        file_search: {
          vector_stores: [{ file_ids: fileIds }]
        }
      }
    });

    console.log(`✅ Assistant criado: ${assistant.id}`);

    return {
      id: assistant.id,
      name: assistant.name || name,
      model: assistant.model,
      fileIds: fileIds
    };
  } catch (error) {
    console.error('❌ Erro ao criar Assistant:', error);
    throw new Error('Falha ao criar Assistant');
  }
}

/**
 * Faz uma pergunta usando o Assistant com arquivos
 */
export async function askAssistantWithFiles(
  assistantId: string,
  question: string,
  context?: string
): Promise<FileSearchResult> {
  try {
    console.log(`💬 Fazendo pergunta para Assistant ${assistantId}`);
    console.log(`❓ Pergunta: "${question.substring(0, 100)}..."`);

    // Preparar mensagem com contexto se fornecido
    let messageContent = question;
    if (context) {
      messageContent = `Contexto: ${context}\n\nPergunta: ${question}`;
    }

    // Criar thread com mensagem inicial
    const thread = await client.beta.threads.create({
      messages: [{ role: "user", content: messageContent }],
    });
    const threadId = thread.id; // Guardamos o ID localmente
    console.log(`🧵 Thread criado: ${threadId}`);

    // Usar createAndPoll para execução mais segura
    const run = await client.beta.threads.runs.createAndPoll(threadId, {
      assistant_id: assistantId,
    });
    
    console.log(`🚀 Run executado: ${run.id} com status: ${run.status}`);

    if (run.status === 'completed') {
      // Obter as mensagens mais recentes do thread
      const messages = await client.beta.threads.messages.list(threadId, { 
        order: "desc", 
        limit: 1 
      });
      const lastMessage = messages.data[0];
      
      if (lastMessage && lastMessage.content[0] && 'text' in lastMessage.content[0]) {
        const content = lastMessage.content[0].text.value;
        
        console.log(`✅ Resposta obtida (${content.length} caracteres)`);

        return {
          assistantId,
          threadId: threadId,
          messageId: lastMessage.id,
          content: content,
          role: lastMessage.role
        };
      }
    }

    throw new Error(`Run não completado. Status: ${run.status}`);
  } catch (error) {
    console.error('❌ Erro ao fazer pergunta ao Assistant:', error);
    throw new Error('Falha ao processar pergunta com Assistant');
  }
}

/**
 * Cria sistema completo: Upload + Assistant
 */
export async function createCompleteFileSearchSystem(
  files: File[],
  systemName: string = "EDC+ Learning System"
): Promise<{
  uploadedFiles: OpenAIFileInfo[];
  assistant: AssistantInfo;
  vectorStore: any;
  fileIds: string[];
}> {
  try {
    console.log(`🚀 Criando sistema completo: "${systemName}"`);
    
    // 1. Upload dos arquivos
    const uploadedFiles = await uploadFilesToOpenAI(files);
    const fileIds = uploadedFiles.map(f => f.id);
    
    if (fileIds.length === 0) {
      throw new Error('Nenhum arquivo foi enviado com sucesso');
    }
    
    // 2. Criar Assistant com File Search habilitado
    const assistant = await client.beta.assistants.create({
      name: `${systemName} - Tutor`,
      model: "gpt-4o-mini",
      instructions: `Você é um tutor especializado que ajuda estudantes com base nos materiais fornecidos.
      Use os documentos carregados para criar análises detalhadas e responder perguntas.
      Seja específico sobre as fontes quando usar informações dos documentos.
      Adapte as explicações para serem didáticas e claras.`,
      tools: [{ type: "file_search" }],
      tool_resources: { 
        file_search: { 
          vector_stores: [{ file_ids: fileIds }] 
        } 
      },
    });
    
    console.log(`✅ Assistant criado: ${assistant.id}`);

    const assistantInfo: AssistantInfo = {
      id: assistant.id,
      name: assistant.name || `${systemName} - Tutor`,
      model: assistant.model,
      fileIds: fileIds
    };

    console.log(`🎉 Sistema completo criado!`);
    console.log(`📊 Resumo: Assistant ${assistant.id} com ${fileIds.length} arquivo(s)`);

    return {
      uploadedFiles,
      assistant: assistantInfo,
      vectorStore: { id: 'auto-created' }, // Placeholder já que não temos Vector Store explícito
      fileIds
    };
  } catch (error) {
    console.error('❌ Erro ao criar sistema completo:', error);
    throw new Error('Falha ao criar sistema de File Search completo');
  }
}

/**
 * Deletar um arquivo da OpenAI
 */
export async function deleteOpenAIFile(fileId: string): Promise<boolean> {
  try {
    await client.files.delete(fileId);
    console.log(`🗑️ Arquivo ${fileId} deletado`);
    return true;
  } catch (error) {
    console.error(`❌ Erro ao deletar arquivo ${fileId}:`, error);
    return false;
  }
}

/**
 * Deletar Assistant
 */
export async function deleteAssistant(assistantId: string): Promise<boolean> {
  try {
    await client.beta.assistants.delete(assistantId);
    console.log(`🗑️ Assistant ${assistantId} deletado`);
    return true;
  } catch (error) {
    console.error(`❌ Erro ao deletar Assistant ${assistantId}:`, error);
    return false;
  }
}

/**
 * Listar arquivos da OpenAI
 */
export async function listOpenAIFiles(): Promise<OpenAIFileInfo[]> {
  try {
    const files = await client.files.list();
    return files.data.map(file => ({
      id: file.id,
      name: file.filename,
      size: file.bytes,
      purpose: file.purpose,
      created_at: file.created_at
    }));
  } catch (error) {
    console.error('❌ Erro ao listar arquivos:', error);
    return [];
  }
}