import { useAuthStore } from '../stores/authStore'

const DEFAULT_TARGETS = { needs: 0.5, wants: 0.3, savings: 0.2 }

// Metas personalizadas da regra Necessidades/Lazer/Poupança, guardadas em
// dm_profiles como percentagens inteiras (ex: 50) — devolvidas aqui já como
// fracções (0.5) para uso direto em cálculos e nas barras de progresso.
export function useBudgetTargets() {
  const profile = useAuthStore((s) => s.profile)

  return {
    needs:   profile?.target_needs   != null ? profile.target_needs   / 100 : DEFAULT_TARGETS.needs,
    wants:   profile?.target_wants   != null ? profile.target_wants   / 100 : DEFAULT_TARGETS.wants,
    savings: profile?.target_savings != null ? profile.target_savings / 100 : DEFAULT_TARGETS.savings,
  }
}
