import XLSX from 'xlsx'

export type XtbHolding = {
  name: string
  ticker: string
  asset_type: 'ETF' | 'STOCK'
  units: number
  current_value: number
  avg_price: number
  capital_invested: number
  net_profit: number
  net_profit_pct: number
}

export type XtbParseResult = {
  holdings: XtbHolding[]
  total_deposits: number
  total_dividends: number
  deposit_count: number
  dividend_count: number
}

export function parseXtbBase64(base64: string): XtbParseResult {
  const wb = XLSX.read(base64, { type: 'base64' })

  const holdings: XtbHolding[] = []
  let total_deposits  = 0
  let total_dividends = 0
  let deposit_count   = 0
  let dividend_count  = 0

  // ── Open Positions ─────────────────────────────────────────────────────────
  // Header is row index 10 (0-based); data starts at row 11.
  // Summary rows (per ticker): col[4] (Type) is empty, col[3] (Category) is STOCK|ETF
  // Position rows (per trade):  col[4] is "BUY" etc. → skip
  const opSheet = wb.Sheets['Open Positions']
  if (opSheet) {
    const rows = XLSX.utils.sheet_to_json<any[]>(opSheet, { header: 1 })
    for (const row of rows) {
      const category = row[3]
      const type     = row[4]
      if ((category === 'STOCK' || category === 'ETF') && type === '') {
        const units         = parseFloat(row[5]) || 0
        const current_value = parseFloat(row[6]) || 0
        const avg_price     = parseFloat(row[8]) || 0
        const net_profit    = parseFloat(row[13]) || 0
        const net_profit_pct = parseFloat(row[12]) || 0
        if (units > 0 && current_value > 0) {
          holdings.push({
            name:            String(row[1]),
            ticker:          String(row[2]),
            asset_type:      category as 'ETF' | 'STOCK',
            units,
            current_value,
            avg_price,
            capital_invested: current_value - net_profit,
            net_profit,
            net_profit_pct,
          })
        }
      }
    }
  }

  // ── Cash Operations ────────────────────────────────────────────────────────
  // Real data starts at row index 5 (after 4 metadata rows + 1 header row)
  const cashSheet = wb.Sheets['Cash Operations']
  if (cashSheet) {
    const rows = XLSX.utils.sheet_to_json<any[]>(cashSheet, { header: 1 })
    for (const row of rows.slice(5)) {
      const opType = row[0]
      const amount = parseFloat(row[5]) || 0
      if (opType === 'Deposit') {
        total_deposits += amount
        deposit_count++
      } else if (opType === 'Dividend') {
        total_dividends += amount
        dividend_count++
      }
    }
  }

  return { holdings, total_deposits, total_dividends, deposit_count, dividend_count }
}
