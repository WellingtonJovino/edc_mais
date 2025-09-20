/**
 * Mapeia valores internos do perfil do usuário para os labels exatos da interface
 *
 * Garante que o chat exiba exatamente o que o usuário selecionou nas opções,
 * em vez dos valores internos como 'academic' ou 'moderate'
 */

export interface ProfileLabels {
  level: string;
  purpose: string;
  timeAvailable: string;
}

/**
 * Mapeamento para níveis de conhecimento
 */
const LEVEL_LABELS: Record<string, string> = {
  'beginner': 'Iniciante',
  'intermediate': 'Intermediário',
  'advanced': 'Avançado'
};

/**
 * Mapeamento para objetivos/propósitos
 */
const PURPOSE_LABELS: Record<string, string> = {
  'career': 'Desenvolvimento da carreira',
  'personal': 'Interesse pessoal',
  'project': 'Projeto específico',
  'academic': 'Estudos acadêmicos'
};

/**
 * Mapeamento para tempo disponível
 */
const TIME_AVAILABLE_LABELS: Record<string, string> = {
  'minimal': '30 min/dia',
  'moderate': '1-2 horas/dia',
  'intensive': '3+ horas/dia'
};

/**
 * Converte valores internos do perfil para labels em português
 * @param profile - Perfil do usuário com valores internos
 * @returns Perfil com labels em português para exibição
 */
export function getProfileLabels(profile: {
  level: string;
  purpose: string;
  timeAvailable: string;
}): ProfileLabels {
  return {
    level: LEVEL_LABELS[profile.level] || profile.level,
    purpose: PURPOSE_LABELS[profile.purpose] || profile.purpose,
    timeAvailable: TIME_AVAILABLE_LABELS[profile.timeAvailable] || profile.timeAvailable
  };
}

/**
 * Converte um valor individual para seu label correspondente
 * @param value - Valor interno
 * @param field - Campo do perfil (level, purpose, timeAvailable)
 * @returns Label em português ou o valor original se não encontrado
 */
export function getFieldLabel(value: string, field: 'level' | 'purpose' | 'timeAvailable'): string {
  switch (field) {
    case 'level':
      return LEVEL_LABELS[value] || value;
    case 'purpose':
      return PURPOSE_LABELS[value] || value;
    case 'timeAvailable':
      return TIME_AVAILABLE_LABELS[value] || value;
    default:
      return value;
  }
}