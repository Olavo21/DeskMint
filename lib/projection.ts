// Inflação anual assumida para trazer o valor final a euros de hoje. 2% é a meta
// do BCE para a zona euro — um pressuposto, não uma previsão.
export const INFLATION_RATE = 0.02

export type ProjectionInput = {
  startingCapital: number
  monthlyInvest:   number
  annualRate:      number
  years:           number
}

export type ProjectionResult = {
  finalValue:      number
  totalInvested:   number
  interestGained:  number
  realFinalValue:  number  // finalValue em euros de hoje
}

export function computeProjection(input: ProjectionInput): ProjectionResult {
  const { startingCapital, monthlyInvest, annualRate, years } = input
  const P   = Math.max(startingCapital, 0)
  const PMT = Math.max(monthlyInvest,   0)
  const n   = 12
  const nt  = n * years
  const rn  = annualRate / n

  const cf = Math.pow(1 + rn, nt)

  const principalGrown = P * cf
  const pmtGrown = rn > 0
    ? PMT * ((cf - 1) / rn) * (1 + rn)   // anuidade antecipada
    : PMT * nt

  const finalValue     = principalGrown + pmtGrown
  const totalInvested  = P + PMT * 12 * years
  const interestGained = Math.max(0, finalValue - totalInvested)
  const realFinalValue = finalValue / Math.pow(1 + INFLATION_RATE, years)
  return { finalValue, totalInvested, interestGained, realFinalValue }
}

export const RATE_BY_INVESTOR_TYPE: Record<string, number> = {
  CONSERVATIVE: 0.04,
  MODERATE:     0.06,
  AGGRESSIVE:   0.08,
  SPECULATIVE:  0.10,
}

export const YEARS_BY_HORIZON: Record<string, number> = {
  SHORT:  5,
  MEDIUM: 15,
  LONG:   30,
}

export const GOAL_PHRASE: Record<string, (years: number) => string> = {
  RETIREMENT: (_y) => `O teu fundo de Reforma ganha força a cada mês que passa.`,
  WEALTH:     (y)  => `Em ${y} anos estarás significativamente mais perto da independência financeira.`,
  INCOME:     (y)  => `Construindo rendimento passivo ao longo de ${y} anos.`,
  EDUCATION:  (y)  => `Fundo de Educação em construção para os próximos ${y} anos.`,
  EMERGENCY:  (y)  => `Uma base financeira cada vez mais sólida ao longo de ${y} anos.`,
  OTHER:      (y)  => `Crescimento consistente projetado para os próximos ${y} anos.`,
}
