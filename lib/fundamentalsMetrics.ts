export type MetricKey =
  | 'pe' | 'peg' | 'roe' | 'roic' | 'evEbitda'
  | 'opMargin' | 'beta' | 'debtEquity' | 'revenuePerEmployee'

export type TrafficLight = 'green' | 'yellow' | 'red' | 'neutral'

export type MetricConfig = {
  key: MetricKey
  label: string
  fullName: string
  description: string
  formula: string
  good: string
  bad: string
  example: string
  unit: string
  placeholder: string
  higherIsBetter: boolean
  getLight: (value: number) => TrafficLight
  getLightLabel: (value: number) => string
}

export const METRICS: MetricConfig[] = [
  {
    key: 'pe',
    label: 'P/E',
    fullName: 'Price to Earnings',
    description: 'Quanto pagas por cada €1 de lucro da empresa. Quanto menor, mais barata a ação em relação ao que ganha.',
    formula: 'Preço da ação ÷ Lucro por ação',
    good: 'Abaixo de 25',
    bad: 'Acima de 40',
    example: 'P/E 32 = pagas €32 por cada €1 de lucro anual',
    unit: 'x',
    placeholder: 'ex: 32.88',
    higherIsBetter: false,
    getLight: (v) => (v <= 0 ? 'neutral' : v < 25 ? 'green' : v < 40 ? 'yellow' : 'red'),
    getLightLabel: (v) => (v <= 0 ? '' : v < 25 ? 'Avaliação baixa' : v < 40 ? 'Avaliação razoável' : 'Potencialmente caro'),
  },
  {
    key: 'peg',
    label: 'PEG',
    fullName: 'Price/Earnings to Growth',
    description: 'Corrige o P/E pelo crescimento esperado. É o indicador mais equilibrado para empresas em crescimento — tem em conta que uma empresa que cresce rápido pode justificar um P/E alto.',
    formula: 'P/E ÷ Taxa de crescimento anual esperada',
    good: 'Abaixo de 1 = potencialmente subavaliada',
    bad: 'Acima de 2 = potencialmente sobrevalorizada',
    example: 'PEG 0.59 da Nvidia sugere que o preço ainda não reflete o crescimento esperado',
    unit: 'x',
    placeholder: 'ex: 0.59',
    higherIsBetter: false,
    getLight: (v) => (v <= 0 ? 'neutral' : v < 1 ? 'green' : v < 2 ? 'yellow' : 'red'),
    getLightLabel: (v) => (v <= 0 ? '' : v < 1 ? 'Potencialmente subavaliada' : v < 2 ? 'Avaliação justa' : 'Potencialmente sobrevalorizada'),
  },
  {
    key: 'roe',
    label: 'ROE',
    fullName: 'Return on Equity',
    description: 'Rendimento gerado por cada €1 dos acionistas. Mede quão eficientemente a empresa usa o capital dos seus investidores para gerar lucro.',
    formula: 'Lucro líquido ÷ Capital próprio × 100',
    good: 'Acima de 15% é bom, acima de 30% é excelente',
    bad: 'Abaixo de 5%',
    example: 'ROE 114% da Nvidia é extraordinário — gera €114 de lucro por cada €100 dos acionistas',
    unit: '%',
    placeholder: 'ex: 114.29',
    higherIsBetter: true,
    getLight: (v) => (v === 0 ? 'neutral' : v >= 30 ? 'green' : v >= 15 ? 'yellow' : 'red'),
    getLightLabel: (v) => (v === 0 ? '' : v >= 30 ? 'Excelente' : v >= 15 ? 'Bom' : 'Abaixo do esperado'),
  },
  {
    key: 'roic',
    label: 'ROIC',
    fullName: 'Return on Invested Capital',
    description: 'Eficiência com que a empresa usa todo o capital investido — ações e dívida. Mais completo que o ROE porque inclui também o dinheiro emprestado.',
    formula: 'Lucro operacional ÷ Capital total investido × 100',
    good: 'Acima de 10% é bom. Acima de 100% é raro e excecional',
    bad: 'Abaixo do custo de capital da empresa (tipicamente <8%)',
    example: 'ROIC 104% da Nvidia significa que cada €1 investido gera >€1 de retorno',
    unit: '%',
    placeholder: 'ex: 104.59',
    higherIsBetter: true,
    getLight: (v) => (v === 0 ? 'neutral' : v >= 30 ? 'green' : v >= 10 ? 'yellow' : 'red'),
    getLightLabel: (v) => (v === 0 ? '' : v >= 30 ? 'Excecional' : v >= 10 ? 'Bom' : 'Fraco'),
  },
  {
    key: 'evEbitda',
    label: 'EV/EBITDA',
    fullName: 'Enterprise Value / EBITDA',
    description: 'Avalia a empresa toda — incluindo dívida — em relação aos seus lucros operacionais. Útil para comparar empresas do mesmo setor com estruturas de dívida diferentes.',
    formula: 'Valor da empresa (EV) ÷ EBITDA',
    good: 'Abaixo de 15 é barato',
    bad: 'Acima de 30 é caro',
    example: 'Útil para comparar a Nvidia com a AMD: mesmo setor, estruturas de capital diferentes',
    unit: 'x',
    placeholder: 'ex: 23.5',
    higherIsBetter: false,
    getLight: (v) => (v <= 0 ? 'neutral' : v < 15 ? 'green' : v < 30 ? 'yellow' : 'red'),
    getLightLabel: (v) => (v <= 0 ? '' : v < 15 ? 'Barato' : v < 30 ? 'Razoável' : 'Caro'),
  },
  {
    key: 'opMargin',
    label: 'Margem Op.',
    fullName: 'Margem Operacional',
    description: 'Percentagem das vendas que se converte em lucro operacional. Mede a eficiência do negócio antes de impostos e juros.',
    formula: 'Lucro operacional ÷ Receita total × 100',
    good: 'Acima de 20% é excelente',
    bad: 'Abaixo de 5%',
    example: '64% da Nvidia = €64 de lucro por cada €100 faturados — excepcional para o setor',
    unit: '%',
    placeholder: 'ex: 64.02',
    higherIsBetter: true,
    getLight: (v) => (v === 0 ? 'neutral' : v >= 20 ? 'green' : v >= 5 ? 'yellow' : 'red'),
    getLightLabel: (v) => (v === 0 ? '' : v >= 20 ? 'Excelente' : v >= 5 ? 'Razoável' : 'Fraco'),
  },
  {
    key: 'beta',
    label: 'Beta',
    fullName: 'Beta',
    description: 'Volatilidade da ação em relação ao mercado geral. Mede quanto a ação se move para cada 1% de movimento do mercado.',
    formula: 'Covariância (ação, mercado) ÷ Variância (mercado)',
    good: 'Beta 1 = move igual ao mercado. Beta < 1 = menos volátil',
    bad: 'Beta > 2 = muito volátil, alto risco/recompensa',
    example: 'Beta 1.98 da Nvidia: se o S&P500 cair 10%, a Nvidia tende a cair ~20%',
    unit: '',
    placeholder: 'ex: 1.98',
    higherIsBetter: false,
    getLight: (v) => (v <= 0 ? 'neutral' : v <= 1 ? 'green' : v <= 2 ? 'yellow' : 'red'),
    getLightLabel: (v) => (v <= 0 ? '' : v <= 1 ? 'Estável' : v <= 2 ? 'Moderadamente volátil' : 'Muito volátil'),
  },
  {
    key: 'debtEquity',
    label: 'Dív./Capital',
    fullName: 'Dívida / Capital Próprio',
    description: 'Quanto a empresa deve em relação ao seu valor contabilístico. Indica o nível de endividamento e risco financeiro.',
    formula: 'Dívida total ÷ Capital próprio',
    good: 'Abaixo de 0.5 é seguro',
    bad: 'Acima de 2 é preocupante — muita dívida',
    example: '0.06 da Nvidia = praticamente sem dívida, balanço muito sólido',
    unit: '',
    placeholder: 'ex: 0.06',
    higherIsBetter: false,
    getLight: (v) => (v < 0 ? 'neutral' : v < 0.5 ? 'green' : v < 2 ? 'yellow' : 'red'),
    getLightLabel: (v) => (v < 0 ? '' : v < 0.5 ? 'Balanço sólido' : v < 2 ? 'Moderada' : 'Alavancada'),
  },
  {
    key: 'revenuePerEmployee',
    label: 'Receita/Emp.',
    fullName: 'Receita por Empregado',
    description: 'Eficiência operacional — receita gerada por cada trabalhador. Empresas de software/tecnologia tendem a ter valores muito altos.',
    formula: 'Receita total ÷ Número de empregados',
    good: 'Acima de €1M/emp. é muito bom; >€3M é excecional',
    bad: 'Abaixo de €200K indica muita mão de obra para a receita gerada',
    example: '€6M/emp. da Nvidia é um dos mais altos do mundo — reflexo de ser uma empresa de chips e software',
    unit: '€',
    placeholder: 'ex: 6000000',
    higherIsBetter: true,
    getLight: (v) => (v === 0 ? 'neutral' : v >= 1_000_000 ? 'green' : v >= 200_000 ? 'yellow' : 'red'),
    getLightLabel: (v) => (v === 0 ? '' : v >= 1_000_000 ? 'Excecional' : v >= 200_000 ? 'Bom' : 'Baixo'),
  },
]

export type VerdictResult = {
  label: string
  sub: string
  color: string
  score: number
  greens: number
  reds: number
  total: number
}

export function computeVerdict(values: Partial<Record<MetricKey, number>>): VerdictResult | null {
  let greens = 0, yellows = 0, reds = 0, total = 0
  for (const m of METRICS) {
    const v = values[m.key]
    if (v === undefined || v === null || Number.isNaN(v)) continue
    const light = m.getLight(v)
    if (light === 'neutral') continue
    total++
    if (light === 'green') greens++
    else if (light === 'yellow') yellows++
    else reds++
  }
  if (total === 0) return null
  const score = greens / total

  if (score >= 0.7 && reds === 0) {
    return { label: 'Qualidade alta', sub: 'Fundamentos sólidos sem pontos críticos', color: '#14b8a6', score, greens, reds, total }
  }
  if (score >= 0.5) {
    return { label: 'Qualidade moderada', sub: 'Bons fundamentos com alguns pontos a monitorizar', color: '#f97316', score, greens, reds, total }
  }
  return { label: 'Fragilidades detectadas', sub: `${reds} indicador${reds > 1 ? 'es' : ''} crítico${reds > 1 ? 's' : ''} — analisa com cuidado`, color: '#ef4444', score, greens, reds, total }
}

export const LIGHT_COLORS: Record<TrafficLight, string> = {
  green:   '#14b8a6',
  yellow:  '#f97316',
  red:     '#ef4444',
  neutral: '#94a3b8',
}

export function fmtMetricValue(key: MetricKey, value: number): string {
  if (key === 'revenuePerEmployee') {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`
    return value.toLocaleString('pt-PT')
  }
  const m = METRICS.find((x) => x.key === key)
  const formatted = value % 1 === 0 ? value.toFixed(0) : value.toFixed(2)
  return m?.unit ? `${formatted}${m.unit}` : formatted
}
