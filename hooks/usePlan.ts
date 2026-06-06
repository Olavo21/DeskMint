import { useAuthStore } from '../stores/authStore'

type Plan = 'FREE' | 'BASE' | 'PRO' | 'FOUNDER'

export type PlanFeatures = {
  // Tabs
  canAccessInvestimentos: boolean
  canAccessComissoes:     boolean
  canAccessRelatorios:    boolean
  canAccessFiscal:        boolean
  // Dashboard
  fullDashboard:          boolean
  // AI
  aiMessages:             number   // -1 = unlimited, 0 = none, N = limit/day
  // Meta
  plan:                   Plan
  isFounder:              boolean
  founderNumber:          number | null
}

const PLAN_FEATURES: Record<Plan, PlanFeatures> = {
  FREE: {
    canAccessInvestimentos: false,
    canAccessComissoes:     false,
    canAccessRelatorios:    false,
    canAccessFiscal:        true,
    fullDashboard:          false,
    aiMessages:             0,
    plan:                   'FREE',
    isFounder:              false,
    founderNumber:          null,
  },
  BASE: {
    canAccessInvestimentos: false,
    canAccessComissoes:     true,
    canAccessRelatorios:    false,
    canAccessFiscal:        true,
    fullDashboard:          false,
    aiMessages:             5,
    plan:                   'BASE',
    isFounder:              false,
    founderNumber:          null,
  },
  PRO: {
    canAccessInvestimentos: true,
    canAccessComissoes:     true,
    canAccessRelatorios:    true,
    canAccessFiscal:        true,
    fullDashboard:          true,
    aiMessages:             -1,
    plan:                   'PRO',
    isFounder:              false,
    founderNumber:          null,
  },
  FOUNDER: {
    canAccessInvestimentos: true,
    canAccessComissoes:     true,
    canAccessRelatorios:    true,
    canAccessFiscal:        true,
    fullDashboard:          true,
    aiMessages:             -1,
    plan:                   'FOUNDER',
    isFounder:              true,
    founderNumber:          null,
  },
}

export function usePlan(): PlanFeatures {
  const profile = useAuthStore((s) => s.profile)
  const plan = (profile?.plan ?? 'FREE') as Plan
  const features = PLAN_FEATURES[plan] ?? PLAN_FEATURES.FREE
  return {
    ...features,
    founderNumber: (profile as any)?.founder_number ?? null,
  }
}

export const PLAN_NAMES: Record<Plan, string> = {
  FREE:    'Gratuito',
  BASE:    'Base',
  PRO:     'Pro',
  FOUNDER: 'Founder',
}

export const PLAN_COLORS: Record<Plan, string> = {
  FREE:    '#64748b',
  BASE:    '#3b82f6',
  PRO:     '#8b5cf6',
  FOUNDER: '#f59e0b',
}

export const FOUNDER_SLOTS = 10
