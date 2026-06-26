import { usePlan } from './usePlan'
import { useCredits } from './useCredits'
import { useExpenses } from './useExpenses'

const MAX_FREE_CREDITS = 1
const MAX_FREE_EXPENSES = 15 // placeholder — ajustável, sem valor definido pelo produto ainda

// Hook de conveniência para gates de funcionalidades Freemium.
// Não decide o plano efetivo (isso é usePlan, que já trata expiração) —
// só combina esse resultado com contagens reais de dados do utilizador.
export function useSubscription() {
  const plan = usePlan()
  const { data: credits = [] } = useCredits()

  const now = new Date()
  const { data: expensesData } = useExpenses(now.getMonth() + 1, now.getFullYear())
  const expensesCount = expensesData?.expenses.length ?? 0

  const isPro = plan.plan === 'PRO' || plan.isFounder

  return {
    isPro,
    plan: plan.plan,
    isFounder: plan.isFounder,
    canAddMoreCredits: isPro || credits.length < MAX_FREE_CREDITS,
    canLinkCreditToAsset: isPro || credits.length <= MAX_FREE_CREDITS,
    canAddMoreExpenses: isPro || expensesCount < MAX_FREE_EXPENSES,
  }
}
