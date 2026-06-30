export type BudgetCategory = 'needs' | 'wants' | 'savings'
export type Severity = 'ok' | 'warning' | 'critical'

export interface BudgetAlert {
  category: BudgetCategory
  label: string
  actualPct: number      // fracção, ex: 0.548
  targetPct: number      // fracção, ex: 0.50
  deviationPp: number    // pontos percentuais na direção "má"; <=0 = dentro da meta
  severity: Severity
  direction: 'over' | 'under'
}

const CRITICAL_THRESHOLD_PP = 5

function classify(deviationPp: number): Severity {
  if (deviationPp <= 0) return 'ok'
  if (deviationPp <= CRITICAL_THRESHOLD_PP) return 'warning'
  return 'critical'
}

const CATEGORY_DEFS: { category: BudgetCategory; label: string; direction: 'over' | 'under' }[] = [
  { category: 'needs',   label: 'Necessidades',     direction: 'over' },  // mau = exceder a meta
  { category: 'wants',   label: 'Disponível/Lazer', direction: 'over' },  // mau = exceder a meta
  { category: 'savings', label: 'Poupança',         direction: 'under' }, // mau = ficar abaixo da meta
]

export function computeBudgetAlerts(
  actual: Record<BudgetCategory, number>,
  target: Record<BudgetCategory, number>
): BudgetAlert[] {
  return CATEGORY_DEFS.map(({ category, label, direction }) => {
    const actualPct = actual[category]
    const targetPct = target[category]
    const deviationPp = direction === 'over'
      ? (actualPct - targetPct) * 100
      : (targetPct - actualPct) * 100
    return { category, label, actualPct, targetPct, deviationPp, severity: classify(deviationPp), direction }
  })
}

export const BUDGET_TIPS: Record<BudgetCategory, string[]> = {
  needs: [
    'Audita subscrições esquecidas ou duplicadas.',
    'Negoceia contratos de serviços públicos (eletricidade, internet, seguros).',
    'Usa a regra das 48 horas antes de compras de impulso.',
  ],
  wants: [
    'Define um limite semanal para lazer e segue-o à risca.',
    'Compara preços antes de qualquer compra não essencial.',
    'Usa a regra das 48 horas antes de compras de impulso.',
  ],
  savings: [
    'Automatiza uma transferência para poupança no dia do salário.',
    'Revê as despesas variáveis do mês para libertar margem.',
    'Define uma meta mensal de poupança e acompanha-a semanalmente.',
  ],
}
