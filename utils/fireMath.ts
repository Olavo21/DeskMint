// ── Tipos ──────────────────────────────────────────────────────────────────

export interface ProjectionPoint {
  year:            number   // anos desde hoje (0..50)
  age:             number   // currentAge + year
  capitalInvested: number   // total depositado (sem juros)
  totalValue:      number   // V(t) com juros compostos mensais
}

export interface ProjectionResult {
  points:               ProjectionPoint[]  // 51 pontos (ano 0 a 50)
  fireYear:             number | null      // 1º ano em que totalValue >= fireNumber
  fireAge:              number | null      // currentAge + fireYear
  fireNumber:           number             // despesaMensal × 12 × 25
  weightedRate:         number             // fracção anual (ex: 0.083)
  monthlyWithdrawal:    number             // fireNumber × 0.04 / 12
  valueAtTargetAge:     number             // totalValue no ano (targetAge − currentAge)
  reachedByTargetAge:   boolean
  neededMonthlyContrib: number | null      // PMT corretivo; null se já na meta
}

// ── Taxas por classe de ativo ──────────────────────────────────────────────

const ASSET_RATES: Record<string, number> = {
  ETF:   0.075,
  STOCK: 0.075,
  CRYPTO: 0.12,
  BOND:  0.04,
  OTHER: 0.06,
}
const DEFAULT_RATE = 0.075

// ── calcWeightedRate ───────────────────────────────────────────────────────

/** Taxa anual ponderada pelo valor actual de cada ativo.
 *  ETF/STOCK → 7.5% · CRYPTO → 12.0% · portfólio vazio → 7.5% */
export function calcWeightedRate(
  assets: { asset_type: string; current_value: number }[],
): number {
  const totalValue = assets.reduce((s, a) => s + a.current_value, 0)
  if (totalValue === 0) return DEFAULT_RATE
  return assets.reduce((s, a) => {
    const rate   = ASSET_RATES[a.asset_type] ?? DEFAULT_RATE
    const weight = a.current_value / totalValue
    return s + rate * weight
  }, 0)
}

// ── calcNeededMonthlyContrib ───────────────────────────────────────────────

/** PMT mínimo para atingir fireNumber em `months` meses partindo de patrimonyNow.
 *  Fórmula inversa de FV = PV×(1+r)^n + PMT×((1+r)^n − 1)/r → isola PMT. */
export function calcNeededMonthlyContrib(
  patrimonyNow: number,
  fireNumber:   number,
  annualRate:   number,
  months:       number,
): number {
  if (months <= 0) return Infinity
  const r = annualRate / 12
  if (r === 0) return Math.max(0, (fireNumber - patrimonyNow) / months)
  const factor  = Math.pow(1 + r, months)
  const fvOfPV  = patrimonyNow * factor
  if (fvOfPV >= fireNumber) return 0
  return (fireNumber - fvOfPV) * r / (factor - 1)
}

// ── projectFIRE ───────────────────────────────────────────────────────────

/** Loop mensal de 50 anos: V(t+1) = V(t)×(1+r/12) + PMT.
 *  Captura snapshots anuais (ano 0..50), detecta fireYear e calcula PMT corretivo. */
export function projectFIRE(
  patrimonyNow:       number,
  monthlyContrib:     number,
  weightedAnnualRate: number,
  monthlyExpense:     number,
  currentAge:         number,
  targetAge:          number,
): ProjectionResult {
  const fireNumber = monthlyExpense * 12 * 25
  const r          = weightedAnnualRate / 12
  const MAX_YEARS  = 50

  const points: ProjectionPoint[] = []
  let V             = patrimonyNow
  let totalInvested = patrimonyNow
  let fireYear: number | null = null

  points.push({
    year: 0, age: currentAge,
    capitalInvested: Math.round(patrimonyNow),
    totalValue:      Math.round(patrimonyNow),
  })

  for (let yr = 1; yr <= MAX_YEARS; yr++) {
    for (let m = 0; m < 12; m++) {
      V = V * (1 + r) + monthlyContrib
      totalInvested += monthlyContrib
    }
    points.push({
      year: yr,
      age:  currentAge + yr,
      capitalInvested: Math.round(totalInvested),
      totalValue:      Math.round(V),
    })
    if (fireYear === null && V >= fireNumber) fireYear = yr
  }

  const targetYear       = Math.max(0, targetAge - currentAge)
  const clampedTarget    = Math.min(targetYear, MAX_YEARS)
  const pointAtTarget    = points[clampedTarget] ?? points[points.length - 1]
  const reachedByTarget  = fireYear !== null && fireYear <= targetYear

  const needed = reachedByTarget
    ? null
    : calcNeededMonthlyContrib(patrimonyNow, fireNumber, weightedAnnualRate, targetYear * 12)

  return {
    points,
    fireYear,
    fireAge:              fireYear !== null ? currentAge + fireYear : null,
    fireNumber,
    weightedRate:         weightedAnnualRate,
    monthlyWithdrawal:    (fireNumber * 0.04) / 12,
    valueAtTargetAge:     pointAtTarget.totalValue,
    reachedByTargetAge:   reachedByTarget,
    neededMonthlyContrib: needed !== null && needed > monthlyContrib ? Math.ceil(needed / 10) * 10 : null,
  }
}
