import type { QueryClient } from '@tanstack/react-query'
import type { DmCommission, DmCommissionType } from '../types/database'

export type CommissionWithType = DmCommission & { dm_commission_types: DmCommissionType | null }

// O join é opcional de propósito: useCommissions faz .select('*') sem
// dm_commission_types, e a função tem de servir esse ecrã tal como está. Sem
// join, todas as comissões caem num grupo com type: null.
export type CommissionLike = DmCommission & { dm_commission_types?: DmCommissionType | null }

export type CommissionGroup<T extends CommissionLike = CommissionWithType> = {
  type: DmCommissionType | null
  items: T[]
  paid: number
  toPay: number
  pending: number
  total: number
  count: number
  cancelled: number
  cancelledCount: number
}

// Os quatro estados de dm_commission_status são tratados explicitamente: uma
// comissão em TO_PAY já foi validada e só espera transferência, por isso conta
// como dinheiro a receber. Antes desta função, dois reduces separados somavam
// apenas PAID e PENDING — uma comissão TO_PAY entrava no count do grupo sem
// aparecer em nenhuma coluna de dinheiro.
// CANCELLED fica fora de items/total/count e é contado à parte: não é dinheiro
// esperado, mas o CommissionsCalendar marca os dias em que existe.
export function groupByType<T extends CommissionLike>(commissions: T[]): CommissionGroup<T>[] {
  const groups = new Map<string, CommissionGroup<T>>()

  for (const c of commissions) {
    const key = c.type_id ?? 'sem-tipo'
    let g = groups.get(key)
    if (!g) {
      g = {
        type: c.dm_commission_types ?? null,
        items: [],
        paid: 0,
        toPay: 0,
        pending: 0,
        total: 0,
        count: 0,
        cancelled: 0,
        cancelledCount: 0,
      }
      groups.set(key, g)
    }

    if (c.status === 'CANCELLED') {
      g.cancelled += c.amount
      g.cancelledCount++
      continue
    }

    g.items.push(c)
    g.count++
    g.total += c.amount
    if (c.status === 'PAID')    g.paid    += c.amount
    if (c.status === 'TO_PAY')  g.toPay   += c.amount
    if (c.status === 'PENDING') g.pending += c.amount
  }

  return [...groups.values()]
}

// Queries que dependem de dm_commissions. Query nova que leia comissões entra aqui,
// nunca nos onSuccess — a falha de 1 out nasceu de esta lista estar em quatro sítios.
export const COMMISSION_DEPENDENT_QUERY_KEYS = [
  'commissions',
  'dashboard', // não lê comissões hoje; mantido por já ser invalidado antes
  'monthly-report',
  'all-time-report',
] as const

export function invalidateCommissionQueries(qc: QueryClient) {
  for (const key of COMMISSION_DEPENDENT_QUERY_KEYS) {
    qc.invalidateQueries({ queryKey: [key] })
  }
}
