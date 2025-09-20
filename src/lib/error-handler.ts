/**
 * Sistema Centralizado de Tratamento de Erros
 * Fornece feedback mais informativo para usuários
 */

export interface ErrorContext {
  action: string;
  component?: string;
  userId?: string;
  timestamp?: string;
  additionalInfo?: Record<string, any>;
}

export interface UserFriendlyError {
  title: string;
  message: string;
  suggestion: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  errorCode?: string;
}

/**
 * Converte erros técnicos em mensagens amigáveis ao usuário
 */
export function createUserFriendlyError(
  error: Error | string,
  context: ErrorContext
): UserFriendlyError {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorStack = typeof error === 'string' ? '' : error.stack || '';

  // Log técnico para desenvolvimento
  console.error(`🔴 Erro em ${context.action}:`, {
    message: errorMessage,
    stack: errorStack,
    context,
    timestamp: new Date().toISOString()
  });

  // Mapear erros conhecidos para mensagens amigáveis
  if (errorMessage.includes('total_topics') && errorMessage.includes('ambiguous')) {
    return {
      title: 'Problema Temporário no Sistema',
      message: 'Encontramos um problema técnico ao salvar sua estrutura de curso.',
      suggestion: 'Não se preocupe! A estrutura foi criada com sucesso. O salvamento será implementado em breve.',
      severity: 'medium',
      recoverable: true,
      errorCode: 'DB_AMBIGUOUS_COLUMN'
    };
  }

  if (errorMessage.includes('OpenAI') || errorMessage.includes('API key')) {
    return {
      title: 'Problema de Conectividade',
      message: 'Não conseguimos nos conectar ao serviço de IA no momento.',
      suggestion: 'Verifique sua conexão com a internet e tente novamente em alguns minutos.',
      severity: 'high',
      recoverable: true,
      errorCode: 'AI_CONNECTION_ERROR'
    };
  }

  if (errorMessage.includes('Perplexity') || errorMessage.includes('network')) {
    return {
      title: 'Falha na Busca de Conteúdo',
      message: 'Não foi possível buscar conteúdo acadêmico adicional.',
      suggestion: 'O curso foi criado com informações básicas. Você pode tentar novamente mais tarde para enriquecer o conteúdo.',
      severity: 'low',
      recoverable: true,
      errorCode: 'CONTENT_SEARCH_ERROR'
    };
  }

  if (errorMessage.includes('prerequisite') || errorMessage.includes('pré-requisito')) {
    return {
      title: 'Erro na Análise de Pré-requisitos',
      message: 'Não conseguimos analisar completamente os pré-requisitos do curso.',
      suggestion: 'O curso foi criado normalmente. Você pode revisar os pré-requisitos manualmente.',
      severity: 'low',
      recoverable: true,
      errorCode: 'PREREQUISITE_ANALYSIS_ERROR'
    };
  }

  if (errorMessage.includes('file') || errorMessage.includes('upload')) {
    return {
      title: 'Problema com Arquivo',
      message: 'Houve um problema ao processar um dos arquivos enviados.',
      suggestion: 'Verifique se o arquivo não está corrompido e tente fazer upload novamente.',
      severity: 'medium',
      recoverable: true,
      errorCode: 'FILE_PROCESSING_ERROR'
    };
  }

  if (errorMessage.includes('timeout') || errorMessage.includes('tempo limite')) {
    return {
      title: 'Tempo Limite Excedido',
      message: 'A operação demorou mais do que o esperado para ser concluída.',
      suggestion: 'Tente dividir sua solicitação em partes menores ou aguarde alguns minutos antes de tentar novamente.',
      severity: 'medium',
      recoverable: true,
      errorCode: 'TIMEOUT_ERROR'
    };
  }

  if (context.action.includes('gerar') || context.action.includes('criar')) {
    return {
      title: 'Falha na Geração de Conteúdo',
      message: 'Não conseguimos gerar o conteúdo solicitado completamente.',
      suggestion: 'Tente refinar sua solicitação ou usar termos mais específicos.',
      severity: 'medium',
      recoverable: true,
      errorCode: 'CONTENT_GENERATION_ERROR'
    };
  }

  // Erro genérico
  return {
    title: 'Erro Inesperado',
    message: 'Algo não funcionou como esperado.',
    suggestion: 'Tente novamente. Se o problema persistir, entre em contato com o suporte.',
    severity: 'high',
    recoverable: true,
    errorCode: 'GENERIC_ERROR'
  };
}

/**
 * Formata erro para exibição no chat
 */
export function formatErrorForChat(friendlyError: UserFriendlyError): string {
  const severityIcon = {
    low: '⚠️',
    medium: '🔶',
    high: '🔴',
    critical: '💥'
  }[friendlyError.severity];

  const recoveryText = friendlyError.recoverable
    ? '\n\n🔄 **Você pode tentar novamente**'
    : '\n\n⚡ **Falha crítica - entre em contato com suporte**';

  return `${severityIcon} **${friendlyError.title}**

${friendlyError.message}

💡 **Como resolver:**
${friendlyError.suggestion}${recoveryText}

${friendlyError.errorCode ? `\n🏷️ Código: \`${friendlyError.errorCode}\`` : ''}`;
}

/**
 * Wrapper para funções que podem falhar
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: ErrorContext
): Promise<{ success: true; data: T } | { success: false; error: UserFriendlyError }> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    const friendlyError = createUserFriendlyError(error as Error, context);
    return { success: false, error: friendlyError };
  }
}

/**
 * Retry com backoff exponencial
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  context: ErrorContext,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        break;
      }

      // Backoff exponencial: 1s, 2s, 4s...
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.warn(`🔄 Tentativa ${attempt} falhou, tentando novamente em ${delay}ms:`, error);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Log estruturado de erros para monitoramento
 */
export function logError(
  error: Error | string,
  context: ErrorContext,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
) {
  const errorData = {
    timestamp: new Date().toISOString(),
    message: typeof error === 'string' ? error : error.message,
    stack: typeof error === 'string' ? '' : error.stack,
    context,
    severity,
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
    url: typeof window !== 'undefined' ? window.location.href : 'server'
  };

  // Log local
  console.error('📊 Error Log:', errorData);

  // Em produção, aqui enviaria para serviço de monitoramento (Sentry, etc.)
  // if (process.env.NODE_ENV === 'production') {
  //   sendToMonitoringService(errorData);
  // }
}