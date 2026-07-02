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
  ETF:    0.075,
  STOCK:  0.075,
  CRYPTO: 0.12,
  BOND:   0.04,
  OTHER:  0.06,
}
const DEFAULT_RATE = 0.075

// ── calcWeightedRate ───────────────────────────────────────────────────────

/** Taxa anual ponderada pelo valor actual de cada ativo.
 *  ETF/STOCK → 7.5% · CRYPTO → 12.0% · portfólio vazio → 7.5%
 *  Valores negativos ou NaN são ignorados. */
export function calcWeightedRate(
  assets: { asset_type: string; current_value: number }[],
): number {
  const totalValue = assets.reduce((s, a) => {
    const v = Number.isFinite(a.current_value) ? Math.max(0, a.current_value) : 0
    return s + v
  }, 0)
  if (totalValue <= 0) return DEFAULT_RATE

  const weighted = assets.reduce((s, a) => {
    const v = Number.isFinite(a.current_value) && a.current_value > 0 ? a.current_value : 0
    if (v === 0) return s
    const rate   = ASSET_RATES[a.asset_type] ?? DEFAULT_RATE
    const weight = v / totalValue
    return s + rate * weight
  }, 0)

  return Number.isFinite(weighted) && weighted > 0 ? weighted : DEFAULT_RATE
}

// ── calcNeededMonthlyContrib ───────────────────────────────────────────────

/** PMT mínimo para atingir fireNumber em `months` meses partindo de patrimonyNow.
 *  Fórmula inversa de FV = PV×(1+r)^n + PMT×((1+r)^n − 1)/r → isola PMT.
 *  Devolve Infinity se os inputs forem inválidos ou o prazo insuficiente. */
export function calcNeededMonthlyContrib(
  patrimonyNow: number,
  fireNumber:   number,
  annualRate:   number,
  months:       number,
): number {
  if (
    !Number.isFinite(patrimonyNow) ||
    !Number.isFinite(fireNumber)   ||
    !Number.isFinite(annualRate)
  ) return Infinity
  if (months <= 0) return Infinity

  const r = annualRate / 12
  if (r === 0) return Math.max(0, (fireNumber - patrimonyNow) / months)

  const factor = Math.pow(1 + r, months)
  if (!Number.isFinite(factor)) return Infinity

  const fvOfPV = patrimonyNow * factor
  if (fvOfPV >= fireNumber) return 0

  const denom = factor - 1
  if (denom === 0) return Infinity

  return (fireNumber - fvOfPV) * r / denom
}

// ── projectFIRE ───────────────────────────────────────────────────────────

/** Loop mensal de 50 anos: V(t+1) = V(t)×(1+r/12) + PMT.
 *  Captura snapshots anuais (ano 0..50), detecta fireYear e calcula PMT corretivo.
 *  Sanitiza inputs inválidos (NaN/Infinity/negativos) antes de qualquer cálculo. */
export function projectFIRE(
  patrimonyNow:       number,
  monthlyContrib:     number,
  weightedAnnualRate: number,
  monthlyExpense:     number,
  currentAge:         number,
  targetAge:          number,
): ProjectionResult {
  // Sanitização defensiva — evita propagação de NaN/Infinity na cadeia de 600 iterações
  const safePatrimony = Number.isFinite(patrimonyNow)       && patrimonyNow >= 0       ? patrimonyNow       : 0
  const safeContrib   = Number.isFinite(monthlyContrib)     && monthlyContrib >= 0     ? monthlyContrib     : 0
  const safeRate      = Number.isFinite(weightedAnnualRate) && weightedAnnualRate >= 0 ? weightedAnnualRate : DEFAULT_RATE
  const safeExpense   = Number.isFinite(monthlyExpense)     && monthlyExpense > 0      ? monthlyExpense     : 1

  const fireNumber = safeExpense * 12 * 25
  const r          = safeRate / 12
  const MAX_YEARS  = 50

  const points: ProjectionPoint[] = []
  let V             = safePatrimony
  let totalInvested = safePatrimony
  let fireYear: number | null = null

  points.push({
    year: 0, age: currentAge,
    capitalInvested: Math.round(safePatrimony),
    totalValue:      Math.round(safePatrimony),
  })

  for (let yr = 1; yr <= MAX_YEARS; yr++) {
    for (let m = 0; m < 12; m++) {
      V = V * (1 + r) + safeContrib
      totalInvested += safeContrib
    }
    // Clampa overflow de floating point em cenários extremos
    const safeV = Number.isFinite(V) ? V : safePatrimony
    points.push({
      year: yr,
      age:  currentAge + yr,
      capitalInvested: Math.round(totalInvested),
      totalValue:      Math.round(safeV),
    })
    if (fireYear === null && safeV >= fireNumber) fireYear = yr
  }

  const targetYear      = Math.max(0, targetAge - currentAge)
  const clampedTarget   = Math.min(targetYear, MAX_YEARS)
  const pointAtTarget   = points[clampedTarget] ?? points[points.length - 1]
  const reachedByTarget = fireYear !== null && fireYear <= targetYear

  const needed = reachedByTarget
    ? null
    : calcNeededMonthlyContrib(safePatrimony, fireNumber, safeRate, targetYear * 12)

  return {
    points,
    fireYear,
    fireAge:              fireYear !== null ? currentAge + fireYear : null,
    fireNumber,
    weightedRate:         safeRate,
    monthlyWithdrawal:    (fireNumber * 0.04) / 12,
    valueAtTargetAge:     pointAtTarget.totalValue,
    reachedByTargetAge:   reachedByTarget,
    neededMonthlyContrib: needed !== null && Number.isFinite(needed) && needed > safeContrib
      ? Math.ceil(needed / 10) * 10
      : null,
  }
}
