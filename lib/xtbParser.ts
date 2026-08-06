import * as XLSX from 'xlsx'

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

// Signature of an Open Positions summary row: col[3] is STOCK|ETF, col[4] is empty.
// Closed Positions has col[3]=BUY/SELL, Cash Operations has no STOCK/ETF — so this
// signature uniquely identifies the Open Positions sheet regardless of its name or order.
function isOpenPositionsSheet(rows: any[][]): boolean {
  return rows.some(r => (r[3] === 'STOCK' || r[3] === 'ETF') && (r[4] === '' || r[4] == null))
}

export function parseXtbWorkbook(wb: XLSX.WorkBook): XtbParseResult {

  const holdings: XtbHolding[] = []
  let total_deposits  = 0
  let total_dividends = 0
  let deposit_count   = 0
  let dividend_count  = 0

  // ── Open Positions ─────────────────────────────────────────────────────────
  // Scan all sheets to find the one with Open Positions structure.
  // This works regardless of sheet name (language) or order (mobile vs desktop export).
  let openRows: any[][] = []
  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name]
    if (!sheet) continue
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 })
    if (isOpenPositionsSheet(rows)) { openRows = rows; break }
  }

  for (const row of openRows) {
    const category = row[3]
    const type     = row[4]
    if ((category === 'STOCK' || category === 'ETF') && (type === '' || type == null)) {
      const units         = parseFloat(row[5]) || 0
      const current_value = parseFloat(row[6]) || 0
      const avg_price     = parseFloat(row[8]) || 0
      const net_profit    = parseFloat(row[13]) || 0
      const net_profit_pct = parseFloat(row[12]) || 0
      if (units > 0 && current_value > 0) {
        holdings.push({
          name:             String(row[1]),
          ticker:           String(row[2]),
          asset_type:       category as 'ETF' | 'STOCK',
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

  // ── Cash Operations ────────────────────────────────────────────────────────
  // Try by name variants (EN/PT), fall back to 2nd sheet.
  const cashSheet = wb.Sheets['Cash Operations']
    ?? wb.Sheets['Operações em Numerário']
    ?? wb.Sheets[wb.SheetNames[1]]
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

export function parseXtbBase64(base64: string): XtbParseResult {
  return parseXtbWorkbook(XLSX.read(base64, { type: 'base64' }))
}

export function parseXtbArrayBuffer(buffer: ArrayBuffer): XtbParseResult {
  return parseXtbWorkbook(XLSX.read(buffer, { type: 'array' }))
}
