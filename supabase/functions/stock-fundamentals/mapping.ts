// Mapeamento das respostas da Finnhub para os campos do FundamentalsModal.
// Separado do index.ts para poder ser testado contra respostas reais sem
// servir a função.

// Sobe sempre que a forma ou o significado da resposta mudar: entradas da
// dm_fundamentals_cache com outra versão deixam de ser servidas.
// v2 (8 nov 2026): peg, evEbitda e revenuePerEmployee passaram a vir preenchidos.
export const RESPONSE_VERSION = 2;

type Obj = Record<string, unknown>;

// Só aceita números finitos; tudo o resto é null — nunca 0.
function num(...candidates: unknown[]): number | null {
  for (const v of candidates) {
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return null;
}

export function mapFundamentals(ticker: string, metricData: Obj, profileData: Obj, quoteData: Obj) {
  const m = (metricData?.metric ?? {}) as Obj;
  const p = profileData ?? {};
  const q = quoteData ?? {};

  // A Finnhub dá a receita por empregado em milhões de USD (NVDA: 7.2135).
  // A app espera unidades (semáforo em 1 000 000 / 200 000). O rótulo diz €,
  // mas o valor é USD: aproximação aceite até à 1.7.0.
  const revenueEmployeeM = num(m.revenueEmployeeTTM, m.revenueEmployeeAnnual);

  return {
    v: RESPONSE_VERSION,
    ticker,
    name:         (p.name as string) ?? null,
    currency:     (p.currency as string) ?? "USD",
    currentPrice: num(q.c),

    pe:                 num(m.peTTM, m.peAnnual),
    peg:                num(m.pegTTM, m.pegAnnual),
    roe:                num(m.roeTTM, m.roeAnnual),
    roic:               num(m.roicAnnual, m.roiAnnual),
    evEbitda:           num(m.evEbitdaTTM),
    opMargin:           num(m.operatingMarginTTM, m.operatingMarginAnnual),
    beta:               num(m.beta, p.beta),
    debtEquity:         num(m["totalDebt/totalEquityAnnual"], m["totalDebt/totalEquityQuarterly"]),
    revenuePerEmployee: revenueEmployeeM === null ? null : Math.round(revenueEmployeeM * 1_000_000),
  };
}
