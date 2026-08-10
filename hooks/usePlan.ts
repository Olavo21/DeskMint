import { useAuthStore } from '../stores/authStore'

type Plan = 'FREE' | 'PRO' | 'FOUNDER'

export type PlanFeatures = {
  plan:         Plan
  isFounder:    boolean
  founderNumber: number | null
}

const PLAN_FEATURES: Record<Plan, PlanFeatures> = {
  FREE:    { plan: 'FREE',    isFounder: false, founderNumber: null },
  PRO:     { plan: 'PRO',     isFounder: false, founderNumber: null },
  FOUNDER: { plan: 'FOUNDER', isFounder: true,  founderNumber: null },
}

export function usePlan(): PlanFeatures {
  const profile = useAuthStore((s) => s.profile)
  let plan = (profile?.plan ?? 'FREE') as Plan

  // FOUNDER é vitalício (sem expiração). Para os restantes planos pagos,
  // uma subscrição expirada reverte o acesso para FREE.
  if (plan !== 'FOUNDER' && profile?.plan_expires_at && new Date(profile.plan_expires_at) < new Date()) {
    plan = 'FREE'
  }

  const features = PLAN_FEATURES[plan] ?? PLAN_FEATURES.FREE
  return {
    ...features,
    founderNumber: profile?.founder_number ?? null,
  }
}

export const PLAN_NAMES: Record<Plan, string> = {
  FREE:    'Gratuito',
  PRO:     'Premium',
  FOUNDER: 'Founder',
}

export const PLAN_COLORS: Record<Plan, string> = {
  FREE:    '#64748b',
  PRO:     '#8b5cf6',
  FOUNDER: '#f59e0b',
}

export const FOUNDER_SLOTS = 10
