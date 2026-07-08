import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Session } from '@supabase/supabase-js'
import type { DmBudgetRule } from '../types/database'

type Targets = { needs: number; wants: number; savings: number }

async function upsertIfNew(
  userId:           string,
  title:            string,
  message:          string,
  type:             'warning' | 'info' | 'success',
  dedupeWindowDays: number,
) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - dedupeWindowDays)

  const { count } = await supabase
    .from('dm_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('title', title)
    .gte('created_at', cutoff.toISOString())

  if ((count ?? 0) > 0) return

  await supabase.from('dm_notifications').insert({ user_id: userId, title, message, type })
}

export function useNotificationEngine({
  availableBalance,
  budgetRule,
  lazerPct,
  targets,
  session,
}: {
  availableBalance: number | undefined
  budgetRule:       DmBudgetRule | null | undefined
  lazerPct:         number
  targets:          Targets
  session:          Session | null
}) {
  const needsPct = budgetRule?.needs_pct ?? 0
  const userId   = session?.user.id

  useEffect(() => {
    if (!userId || availableBalance === undefined || !budgetRule) return

    // ── Regra 1: Liquidez crítica — cooldown 7 dias ───────────────────────
    if (availableBalance < 50) {
      const bal = availableBalance.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })
      upsertIfNew(
        userId,
        'Liquidez Crítica',
        `O teu saldo disponível é de ${bal}. Reforça a liquidez antes de qualquer despesa não essencial.`,
        'warning',
        7,
      )
    }

    // ── Regra 2: Derrapagem Necessidades — cooldown 30 dias ───────────────
    if (needsPct > targets.needs) {
      const real   = (needsPct * 100).toFixed(1)
      const limite = (targets.needs * 100).toFixed(0)
      upsertIfNew(
        userId,
        'Derrapagem — Necessidades',
        `Os teus gastos em Necessidades atingiram ${real}% do rendimento (limite: ${limite}%). Revê as despesas fixas este mês.`,
        'warning',
        30,
      )
    }

    // ── Regra 3: Derrapagem Lazer — cooldown 30 dias ──────────────────────
    if (lazerPct > targets.wants) {
      const real   = (lazerPct * 100).toFixed(1)
      const limite = (targets.wants * 100).toFixed(0)
      upsertIfNew(
        userId,
        'Derrapagem — Lazer',
        `Os teus gastos em Lazer atingiram ${real}% do rendimento (limite: ${limite}%). Considera ajustar os gastos discricionários.`,
        'warning',
        30,
      )
    }
  }, [userId, availableBalance, needsPct, lazerPct, targets.needs, targets.wants])
}
