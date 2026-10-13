import * as Sentry from '@sentry/react-native'
import type { AuthError } from '@supabase/supabase-js'

// Um 5xx do Auth não é problema de ligação: a 13 out 2026 foi a password de
// aplicação do Gmail revogada (535 BadCredentials do SMTP, devolvido como 500
// "unexpected_failure"), e o ecrã dizia "Verifica a ligação".
export function isServerError(e: AuthError): boolean {
  return typeof e.status === 'number' && e.status >= 500
}

// Falhas que o ecrã não explica sozinho vão para o Sentry, para uma avaria (SMTP
// em baixo, regra de password do painel diferente da da app) se ver logo em vez
// de ficar escondida atrás de uma mensagem genérica. Só código e status: nunca o
// email nem a password.
export function reportAuthFailure(flow: string, e: AuthError) {
  Sentry.captureException(new Error(`auth ${flow}: ${e.code ?? 'sem código'} (${e.status ?? '?'})`), {
    tags: { flow, auth_code: e.code ?? 'none', auth_status: String(e.status ?? 'none') },
  })
}
