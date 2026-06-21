const KEYWORD_EMOJI: Array<{ keywords: string[]; emoji: string }> = [
  { keywords: ['peugeot', '208', 'carro', 'seguro carro', 'gasolina', 'combustível', 'combustivel'], emoji: '🚗' },
  { keywords: ['passe', 'metro', 'comboio', 'autocarro', 'transporte'], emoji: '🚇' },
  { keywords: ['casa', 'habitação', 'habitacao', 'renda', 'condomínio', 'condominio'], emoji: '🏠' },
  { keywords: ['ginásio', 'ginasio', 'saúde', 'saude', 'médico', 'medico', 'farmácia', 'farmacia'], emoji: '💪' },
  { keywords: ['depósito', 'deposito', 'fundo de emergência', 'fundo de emergencia', 'investimento', 'investimentos', 'poupança', 'poupanca'], emoji: '💰' },
]

const FALLBACK_EMOJI = '💸'

export function getExpenseEmoji(description: string, categoryIcon?: string | null): string {
  const normalized = description.toLowerCase()
  for (const { keywords, emoji } of KEYWORD_EMOJI) {
    if (keywords.some((kw) => normalized.includes(kw))) return emoji
  }
  return categoryIcon ?? FALLBACK_EMOJI
}
