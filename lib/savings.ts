import type { QueryClient } from '@tanstack/react-query'
import type { DmSavingsAccount } from '../types/database'

// Retenção na fonte sobre juros de depósitos e certificados de aforro (taxa
// liberatória de 28%). Constante única: nenhum ecrã escreve 0.28 à mão. É um
// pressuposto e não uma verificação: em contas de instituições estrangeiras os
// juros podem não ser retidos na fonte e ser declarados no IRS.
export const SAVINGS_WITHHOLDING_RATE = 0.28

// A taxa é sempre a que o utilizador introduz (em %, ex: 3 = 3%). A app nunca
// afirma taxas de mercado.
export function netRate(grossRatePct: number): number {
  return grossRatePct * (1 - SAVINGS_WITHHOLDING_RATE)
}

// O fundo de emergência efetivo: se um produto estiver marcado, é o saldo dele e
// o valor editável deixa de contar (senão o mesmo dinheiro contava duas vezes).
// Sem produto marcado, tudo fica como antes desta tabela existir.
export function splitSavings(accounts: Pick<DmSavingsAccount, 'balance' | 'is_emergency_fund'>[], editableEmergencyFund: number) {
  const marked = accounts.find((a) => a.is_emergency_fund)
  return {
    emergencyFund:        marked ? marked.balance : editableEmergencyFund,
    emergencyFromProduct: !!marked,
    savingsTotal:         accounts.filter((a) => !a.is_emergency_fund).reduce((s, a) => s + a.balance, 0),
  }
}

// Colunas `date` ('AAAA-MM-DD') lidas e escritas em hora local. new Date('AAAA-MM-DD')
// seria lido como UTC, e toISOString() converte para UTC: em Lisboa ambos mudam o dia.
export function parseDateOnly(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function toDateOnly(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

// Queries que dependem de dm_savings_accounts. Query nova que leia a tabela entra
// aqui, nunca nos onSuccess (o mesmo padrão de COMMISSION_DEPENDENT_QUERY_KEYS).
export const SAVINGS_DEPENDENT_QUERY_KEYS = [
  'savings-accounts',
  'dashboard', // património, fundo de emergência efetivo e projeção
  'portfolio', // usePortfolio: fundo efetivo do Triângulo Financeiro
] as const

export function invalidateSavingsQueries(qc: QueryClient) {
  for (const key of SAVINGS_DEPENDENT_QUERY_KEYS) {
    qc.invalidateQueries({ queryKey: [key] })
  }
}
