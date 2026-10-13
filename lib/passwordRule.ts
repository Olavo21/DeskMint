// Regra de password do Supabase (Authentication → Sign In / Providers → Email →
// Password requirements: mínimo 6, com minúsculas, maiúsculas, números e símbolos).
// Usada pela recuperação e pelo registo, para dizer a regra antes de o servidor
// recusar com um weak_password genérico.
//
// Última verificação contra o servidor: 13 out 2026, pela resposta 422 do /user à
// password "Senha1ç" (log do Auth). O ç foi recusado: o servidor só aceita os símbolos
// ASCII da lista abaixo, copiada dessa mensagem. Se a regra mudar no painel, muda
// aqui, nos textos recovery.passwordRuleHint / errPasswordRule e nesta data.
export const PASSWORD_MIN_LENGTH = 6
export const PASSWORD_SYMBOLS = "!@#$%^&*()_+-=[]{};'\\:\"|<>?,./`~"

export function meetsPasswordRule(p: string): boolean {
  return (
    p.length >= PASSWORD_MIN_LENGTH &&
    /[a-z]/.test(p) &&
    /[A-Z]/.test(p) &&
    /[0-9]/.test(p) &&
    [...p].some((ch) => PASSWORD_SYMBOLS.includes(ch))
  )
}
