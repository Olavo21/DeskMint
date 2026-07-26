export type ParsedPosition = {
  ticker:           string
  name:             string
  units:            number
  avg_price:        number
  current_value:    number
  capital_invested: number
  asset_type:       'ETF' | 'STOCK' | 'CRYPTO' | 'BOND' | 'OTHER'
  broker:           string
}

export type BrokerId = 'trading212' | 'degiro' | 'xtb' | 'traderepublic' | 'ibkr' | 'revolut' | 'other'

export const BROKERS: { id: BrokerId; label: string; icon: string; hasApi: boolean; csvHelp: string }[] = [
  {
    id:      'trading212',
    label:   'Trading 212',
    icon:    '📊',
    hasApi:  true,
    csvHelp: 'App → Menu → Histórico → Exportar → Transações CSV',
  },
  {
    id:      'degiro',
    label:   'DEGIRO',
    icon:    '🟠',
    hasApi:  false,
    csvHelp: 'Conta → Extractos & Relatórios → Exportar posições (CSV)',
  },
  {
    id:      'xtb',
    label:   'XTB',
    icon:    '🔵',
    hasApi:  false,
    csvHelp: 'App XTB (móvel): separador Portfólio → ícone Exportar → Excel (.xlsx)\n⚠️ Não uses "Operações em numerário" — esse ficheiro não tem posições.\n\nxStation (desktop): tab Posições abertas → botão Exportar → HTML\n\nAceita: .xlsx (Excel) ou .html (xStation)',
  },
  {
    id:      'traderepublic',
    label:   'Trade Republic',
    icon:    '🟢',
    hasApi:  false,
    csvHelp: 'Perfil → Documentos → Extracto de carteira (CSV)',
  },
  {
    id:      'ibkr',
    label:   'Interactive Brokers',
    icon:    '⚫',
    hasApi:  false,
    csvHelp: 'Portal → Relatórios → Extracto de carteira → CSV',
  },
  {
    id:      'revolut',
    label:   'Revolut Invest',
    icon:    '🔷',
    hasApi:  false,
    csvHelp: 'Perfil → Extractos → Investimentos → Exportar',
  },
  {
    id:      'other',
    label:   'Outra corretora',
    icon:    '📁',
    hasApi:  false,
    csvHelp: 'Exporta um CSV com: Ticker, Nome, Unidades, Preço Médio, Valor Atual',
  },
]

// ─── Shared helpers ────────────────────────────────────────────────────────

function parseNum(s: string): number {
  if (!s) return 0
  // Remove currency symbols, thousands separators
  return parseFloat(s.replace(/[€$£\s]/g, '').replace(',', '.')) || 0
}

function removeDiacritics(s: string): string {
  return s.normalize('NFD').replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
}

const KNOWN_ETF_TICKERS = new Set([
  'VWCE','VWRL','VWRP','VUSA','VUSD','VEUR',
  'IWDA','SWDA','SSAC','ISAC','CSPX','IUSA','IUQQ','SXRV','SPYL','CSUS','EMIM','EIMI','AGGH','IGLO','IBTS','VAGU','IGLT','IBGL','AGBP','IUSQ',
  'FWRA','WORL','ACWI',
  'LSMC','QUTM','DFEN',
  'EUNA','DXEU','IEUA','EXW1','MEUD','DXSU','SX5S','IMEU','EXSA',
  'EEM','VWO','IEEM','IEMG','IVV','SPY','VOO','QQQ',
  'BTCE','ETHC',
])

function detectAssetType(ticker: string, name: string): ParsedPosition['asset_type'] {
  const t = ticker.split('.')[0].toUpperCase()
  const n = name.toUpperCase()
  if (['BTC','ETH','SOL','XRP','ADA','DOT','MATIC','LINK'].includes(t)) return 'CRYPTO'
  if (KNOWN_ETF_TICKERS.has(t)) return 'ETF'
  if (n.includes('ETF') || n.includes('UCITS') || n.includes('INDEX') || n.includes('FUND')) return 'ETF'
  if (n.includes('BOND') || n.includes('OBRIG') || n.includes('TREASURY')) return 'BOND'
  return 'STOCK'
}

function parseCsv(text: string, delimiter = ','): string[][] {
  const rows: string[][] = []
  let cur = ''
  let inQuotes = false
  const row: string[] = []

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === delimiter && !inQuotes) {
      row.push(cur.trim())
      cur = ''
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cur.trim())
      rows.push([...row])
      row.length = 0
      cur = ''
    } else {
      cur += ch
    }
  }
  if (cur || row.length) { row.push(cur.trim()); rows.push(row) }
  return rows.filter((r) => r.some((c) => c !== ''))
}

function detectDelimiter(text: string): ',' | ';' | '\t' {
  const firstLine = text.split('\n')[0] ?? ''
  const sc = (firstLine.match(/;/g) ?? []).length
  const co = (firstLine.match(/,/g) ?? []).length
  const tb = (firstLine.match(/\t/g) ?? []).length
  if (tb > sc && tb > co) return '\t'
  if (sc > co) return ';'
  return ','
}

// ─── DEGIRO ────────────────────────────────────────────────────────────────
// Expected header: Product,Symbol/ISIN,Amount,Closing,Value in EUR,...
function parseDEGIRO(text: string): ParsedPosition[] {
  const rows = parseCsv(text)
  if (rows.length < 2) return []
  const header = rows[0].map((h) => h.toLowerCase())
  const col = (name: string) => header.findIndex((h) => h.includes(name))

  const iProduct  = col('product')
  const iSymbol   = col('symbol')
  const iAmount   = col('amount')
  const iClosing  = col('closing')
  const iValue    = col('value')

  return rows.slice(1).flatMap((r) => {
    const name   = r[iProduct]  ?? ''
    const ticker = (r[iSymbol]  ?? '').split('/')[0].trim()
    const units  = parseNum(r[iAmount]  ?? '0')
    const price  = parseNum(r[iClosing] ?? '0')
    const value  = parseNum(r[iValue]   ?? '0')
    if (!ticker || units === 0) return []
    const avg = price > 0 ? price : value / units
    return [{
      ticker, name: name || ticker,
      units,
      avg_price:        avg,
      current_value:    value || units * avg,
      capital_invested: units * avg,
      asset_type: detectAssetType(ticker, name),
      broker: 'DEGIRO',
    }]
  })
}

// ─── Trading 212 ──────────────────────────────────────────────────────────
// Header: Action,Time,ISIN,Ticker,Name,No. of shares,Price / share,Currency (Price / share),...,Total (EUR),...
function parseTrading212(text: string): ParsedPosition[] {
  const rows = parseCsv(text)
  if (rows.length < 2) return []
  const header = rows[0].map((h) => h.toLowerCase())
  const col = (name: string) => header.findIndex((h) => h.includes(name))

  const iAction = col('action')
  const iTicker = col('ticker')
  const iName   = col('name')
  const iShares = col('no. of shares')
  const iPrice  = col('price / share')
  const iTotal  = col('total')

  // Aggregate buys/sells per ticker → net position
  const map: Record<string, { name: string; units: number; cost: number }> = {}

  rows.slice(1).forEach((r) => {
    const action = (r[iAction] ?? '').toLowerCase()
    const ticker = r[iTicker] ?? ''
    const name   = r[iName]   ?? ticker
    const shares = parseNum(r[iShares] ?? '0')
    const price  = parseNum(r[iPrice]  ?? '0')
    const total  = Math.abs(parseNum(r[iTotal] ?? '0'))

    if (!ticker) return
    if (!map[ticker]) map[ticker] = { name, units: 0, cost: 0 }

    if (action.startsWith('buy') || action.startsWith('limit buy') || action === 'market buy') {
      map[ticker].units += shares
      map[ticker].cost  += total || shares * price
    } else if (action.startsWith('sell')) {
      map[ticker].units -= shares
      map[ticker].cost  -= total || shares * price
    }
  })

  return Object.entries(map).flatMap(([ticker, pos]) => {
    if (pos.units <= 0.001) return []
    const avg = pos.cost / pos.units
    return [{
      ticker, name: pos.name,
      units:            pos.units,
      avg_price:        avg,
      current_value:    pos.units * avg, // best estimate without live price
      capital_invested: pos.cost,
      asset_type: detectAssetType(ticker, pos.name),
      broker: 'Trading 212',
    }]
  })
}

// ─── HTML table extractor (XTB HTML export) ───────────────────────────────

function cellText(html: string) {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim()
}

function extractHtmlTable(html: string): { headers: string[]; rows: string[][] } {
  const clean = html.replace(/<script[\s\S]*?<\/script>/gi, '')
                    .replace(/<style[\s\S]*?<\/style>/gi, '')

  const tableParts: Array<{ headers: string[]; rows: string[][] }> = []
  const tableRe = /<table[^>]*>([\s\S]*?)<\/table>/gi
  let tm: RegExpExecArray | null

  while ((tm = tableRe.exec(clean)) !== null) {
    const tableContent = tm[1]

    // Collect <th> headers
    let headers: string[] = []
    const thRe = /<th[^>]*>([\s\S]*?)<\/th>/gi
    let th: RegExpExecArray | null
    while ((th = thRe.exec(tableContent)) !== null) {
      headers.push(cellText(th[1]))
    }

    // Collect all <tr> rows (cells from <td>)
    const rows: string[][] = []
    const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
    let tr: RegExpExecArray | null
    while ((tr = trRe.exec(tableContent)) !== null) {
      const cells: string[] = []
      const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi
      let td: RegExpExecArray | null
      while ((td = tdRe.exec(tr[1])) !== null) {
        cells.push(cellText(td[1]))
      }
      if (cells.length > 1) rows.push(cells)
    }

    // If no <th> found, treat first row as headers
    if (headers.length === 0 && rows.length > 0) {
      headers = rows[0]
      rows.splice(0, 1)
    }

    tableParts.push({ headers, rows })
  }

  // Pick the table with the most data rows
  return tableParts.reduce(
    (best, t) => (t.rows.length > best.rows.length ? t : best),
    { headers: [], rows: [] }
  )
}

function parseXTBHtml(html: string): ParsedPosition[] {
  // Flatten all HTML to plain text — XTB uses complex nested tables
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')

  // XTB report CASH OPERATION HISTORY contains entries like:
  //   OPEN BUY 0.3667 @ 224.60 NVDA.US
  //   OPEN BUY 0.4021/1.4021 @ 13.24 ONDS.US  (partial fill — take number before /)
  //   CLOSE BUY 0.0293 @ 196.90 NVDA.US
  const pattern = /(OPEN|CLOSE)\s+(BUY|SELL)\s+([\d.]+)(?:\/[\d.]+)?\s*@\s*([\d.]+)\s+([A-Z0-9]+\.[A-Z]+)/gi

  const map: Record<string, { units: number; costOpen: number; lastOpen: number }> = {}

  let m: RegExpExecArray | null
  while ((m = pattern.exec(text)) !== null) {
    const action = m[1].toUpperCase()
    const vol    = parseFloat(m[3])
    const price  = parseFloat(m[4])
    const full   = m[5]                     // e.g. NVDA.US
    const ticker = full.split('.')[0]       // NVDA

    if (!ticker || isNaN(vol) || isNaN(price) || vol <= 0) continue
    if (!map[ticker]) map[ticker] = { units: 0, costOpen: 0, lastOpen: 0 }

    if (action === 'OPEN') {
      map[ticker].units    += vol
      map[ticker].costOpen += vol * price
      map[ticker].lastOpen  = price
    } else {
      // CLOSE — reduce position
      map[ticker].units    -= vol
      map[ticker].costOpen -= vol * price
    }
  }

  return Object.entries(map).flatMap(([ticker, pos]) => {
    if (pos.units < 0.0001) return []
    const units  = Math.round(pos.units * 100000) / 100000
    const avg    = pos.costOpen / pos.units
    const value  = units * pos.lastOpen
    return [{
      ticker,
      name: ticker,
      units,
      avg_price:        avg > 0 ? Math.round(avg * 10000) / 10000 : 0,
      current_value:    Math.round(value * 100) / 100,
      capital_invested: Math.round(units * avg * 100) / 100,
      asset_type: detectAssetType(ticker, ticker),
      broker: 'XTB',
    }]
  })
}

// ─── XTB ──────────────────────────────────────────────────────────────────
// Handles two export formats:
// 1. Open Positions: Symbol,Volume,Open price,Current price,Value,Gross profit,...
// 2. Transaction History: Position,Symbol,Comment,Type,Volume,Open Time,Open Price,Close Time,Close Price,Commission,...,Net profit
// Also handles Excel exports that have metadata rows before the actual data table.

// Keywords without diacritics (we normalize before matching)
const XTB_HEADER_KEYWORDS = [
  'symbol', 'position', 'volume', 'type', 'open price', 'close price',
  'instrumento', 'quantidade', 'valor', 'ticker', 'net profit', 'commission',
  'simbolo', 'posicao', 'tipo', 'preco', 'comissao', 'lucro',
]

function findXTBHeaderRow(allRows: string[][]): number {
  return allRows.findIndex((row) => {
    const lower = row.map((c) => removeDiacritics(c.toLowerCase().trim()))
    const hits = XTB_HEADER_KEYWORDS.filter((k) => lower.some((c) => c.includes(k)))
    return hits.length >= 2
  })
}

function parseXTB(text: string): ParsedPosition[] {
  const delim = detectDelimiter(text)
  const allRows = parseCsv(text, delim)
  if (allRows.length < 2) return []

  // Skip metadata rows at the top (Excel exports from XTB have account/date info before data)
  const headerIdx = findXTBHeaderRow(allRows)
  const rows = headerIdx > 0 ? allRows.slice(headerIdx) : allRows

  if (rows.length < 2) return []
  // Normalize header cells to remove diacritics for robust matching
  const header = rows[0].map((h) => removeDiacritics(h.toLowerCase().trim()))
  const col = (...names: string[]) => {
    for (const n of names) {
      const i = header.findIndex((h) => h.includes(removeDiacritics(n.toLowerCase())))
      if (i !== -1) return i
    }
    return -1
  }

  // Detect format: transaction history has "close time" or "close price" column
  const isHistory = col('close time', 'hora de fecho', 'close price', 'preco de fecho') !== -1

  if (isHistory) {
    // Transaction history — aggregate buy/sell by symbol into net positions
    const iSymbol    = col('symbol', 'instrumento', 'instrument', 'simbolo')
    const iType      = col('type', 'tipo')
    const iVolume    = col('volume', 'quantidade')
    const iOpenPrice = col('open price', 'preço de abertura', 'preco de abertura', 'preco abertura')
    const iClosePrice= col('close price', 'preço de fecho', 'preco de fecho', 'preco fecho')

    if (iSymbol === -1) return []

    const map: Record<string, { units: number; cost: number; closePrice: number }> = {}

    rows.slice(1).forEach((r) => {
      const symbol = (r[iSymbol] ?? '').trim()
      const type   = (r[iType]   ?? '').toLowerCase()
      const vol    = parseNum(r[iVolume]    ?? '0')
      const oPrice = parseNum(r[iOpenPrice] ?? '0')
      const cPrice = parseNum(r[iClosePrice]?? '0')
      if (!symbol || vol === 0) return
      // Skip "deposit", "withdrawal", "dividend" etc — keep only trades
      if (type && !type.includes('buy') && !type.includes('sell') &&
          !type.includes('compra') && !type.includes('venda') &&
          type !== 'long' && type !== 'short' && type !== 'buy' && type !== 'sell') return

      if (!map[symbol]) map[symbol] = { units: 0, cost: 0, closePrice: 0 }
      const isSell = type.includes('sell') || type.includes('venda') || type === 'short'
      if (isSell) {
        map[symbol].units -= vol
        map[symbol].cost  -= vol * oPrice
      } else {
        map[symbol].units += vol
        map[symbol].cost  += vol * oPrice
        map[symbol].closePrice = cPrice || oPrice
      }
    })

    return Object.entries(map).flatMap(([ticker, pos]) => {
      if (pos.units <= 0.0001) return []
      const avg = pos.units > 0 ? pos.cost / pos.units : 0
      const lastPrice = pos.closePrice || avg
      return [{
        ticker, name: ticker,
        units:            pos.units,
        avg_price:        avg,
        current_value:    pos.units * lastPrice,
        capital_invested: pos.units * avg,
        asset_type: detectAssetType(ticker, ticker),
        broker: 'XTB',
      }]
    })
  }

  // Open positions snapshot
  const iSymbol  = col('symbol', 'instrumento', 'instrument', 'simbolo')
  const iVolume  = col('volume', 'quantidade')
  const iOpen    = col('open price', 'preço de abertura', 'preco de abertura', 'preco abertura')
  const iCurrent = col('current price', 'preço atual', 'preco atual', 'current')
  const iValue   = col('value', 'valor', 'market value', 'valor de mercado')

  return rows.slice(1).flatMap((r) => {
    const ticker = (r[iSymbol] ?? '').trim()
    const units  = parseNum(r[iVolume] ?? '0')
    const open   = parseNum(r[iOpen]   ?? '0')
    const curr   = parseNum(r[iCurrent]?? '0')
    const value  = parseNum(r[iValue]  ?? '0')
    if (!ticker || units === 0) return []
    const avg = open || (value / units)
    return [{
      ticker, name: ticker,
      units,
      avg_price:        avg,
      current_value:    value || units * (curr || avg),
      capital_invested: units * avg,
      asset_type: detectAssetType(ticker, ticker),
      broker: 'XTB',
    }]
  })
}

// ─── Trade Republic ────────────────────────────────────────────────────────
// Trade Republic exports a simple portfolio CSV
// Header: ISIN,Name,Ticker,Quantity,Average buy price,Current price,Current value
function parseTradeRepublic(text: string): ParsedPosition[] {
  const rows = parseCsv(text)
  if (rows.length < 2) return []
  const header = rows[0].map((h) => h.toLowerCase())
  const col = (name: string) => header.findIndex((h) => h.includes(name))

  const iName  = col('name')
  const iTick  = col('ticker')
  const iQty   = col('quantity')
  const iAvg   = col('average buy price')
  const iCurr  = col('current price')
  const iValue = col('current value')

  return rows.slice(1).flatMap((r) => {
    const ticker = r[iTick] ?? r[0] ?? ''
    const name   = r[iName] ?? ticker
    const units  = parseNum(r[iQty]  ?? '0')
    const avg    = parseNum(r[iAvg]  ?? '0')
    const curr   = parseNum(r[iCurr] ?? '0')
    const value  = parseNum(r[iValue]?? '0')
    if (!ticker || units === 0) return []
    return [{
      ticker, name: name || ticker,
      units,
      avg_price:        avg,
      current_value:    value || units * (curr || avg),
      capital_invested: units * avg,
      asset_type: detectAssetType(ticker, name),
      broker: 'Trade Republic',
    }]
  })
}

// ─── Generic / Other ──────────────────────────────────────────────────────
// Expected columns (flexible order): Ticker, Name, Units/Quantity, Avg Price, Current Value
function parseGeneric(text: string): ParsedPosition[] {
  const rows = parseCsv(text)
  if (rows.length < 2) return []
  const header = rows[0].map((h) => h.toLowerCase())
  const col = (...names: string[]) => {
    for (const n of names) {
      const i = header.findIndex((h) => h.includes(n))
      if (i !== -1) return i
    }
    return -1
  }

  const iTicker = col('ticker', 'symbol', 'isin')
  const iName   = col('name', 'produto', 'product')
  const iUnits  = col('units', 'quantity', 'qty', 'amount', 'shares')
  const iAvg    = col('avg', 'average', 'open price', 'buy price', 'preço médio')
  const iValue  = col('current value', 'value', 'valor')

  return rows.slice(1).flatMap((r) => {
    const ticker = iTicker >= 0 ? r[iTicker] : ''
    const name   = iName   >= 0 ? r[iName]   : ticker
    const units  = parseNum(iUnits >= 0 ? r[iUnits] : '0')
    const avg    = parseNum(iAvg   >= 0 ? r[iAvg]   : '0')
    const value  = parseNum(iValue >= 0 ? r[iValue]  : '0')
    if (!ticker || units === 0) return []
    return [{
      ticker, name: name || ticker,
      units,
      avg_price:        avg,
      current_value:    value || units * avg,
      capital_invested: units * avg,
      asset_type: detectAssetType(ticker, name),
      broker: 'Import',
    }]
  })
}

// ─── Main entry point ─────────────────────────────────────────────────────

function isMhtml(text: string) {
  const t = text.trimStart()
  return t.startsWith('From:') || /^MIME-Version:/im.test(t.slice(0, 200))
}

function isHtml(text: string) {
  const t = text.trimStart().toLowerCase()
  return t.startsWith('<!doctype html') || t.startsWith('<html') || t.includes('<table') || isMhtml(text)
}

// Pure-JS base64 → UTF-8 decoder — no atob/Buffer needed, works everywhere
function decodeBase64Utf8(b64: string): string {
  try {
    const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    const lookup = new Uint8Array(256).fill(255)
    for (let i = 0; i < 64; i++) lookup[CHARS.charCodeAt(i)] = i

    const clean  = b64.replace(/[^A-Za-z0-9+/]/g, '')
    const outLen = Math.ceil(clean.length * 3 / 4)
    const bytes  = new Uint8Array(outLen)
    let j = 0

    for (let i = 0; i < clean.length; i += 4) {
      const c0 = lookup[clean.charCodeAt(i)]
      const c1 = lookup[clean.charCodeAt(i + 1)]
      const c2 = lookup[clean.charCodeAt(i + 2)]
      const c3 = lookup[clean.charCodeAt(i + 3)]
      bytes[j++] = (c0 << 2) | (c1 >> 4)
      if (c2 !== 255) bytes[j++] = ((c1 & 0xf) << 4) | (c2 >> 2)
      if (c3 !== 255) bytes[j++] = ((c2 & 0x3) << 6) | c3
    }

    const raw = bytes.slice(0, j)
    if (typeof TextDecoder !== 'undefined') {
      return new TextDecoder('utf-8').decode(raw)
    }
    // Manual UTF-8 → JS string fallback
    let str = ''
    for (let i = 0; i < raw.length; ) {
      const b = raw[i]
      if (b < 0x80) { str += String.fromCharCode(b); i++ }
      else if ((b & 0xe0) === 0xc0) { str += String.fromCharCode(((b & 0x1f) << 6) | (raw[i+1] & 0x3f)); i += 2 }
      else if ((b & 0xf0) === 0xe0) { str += String.fromCharCode(((b & 0x0f) << 12) | ((raw[i+1] & 0x3f) << 6) | (raw[i+2] & 0x3f)); i += 3 }
      else i++
    }
    return str
  } catch {
    return ''
  }
}

function extractHtmlFromMhtml(text: string): string {
  const boundaryMatch = text.match(/boundary="([^"]+)"/)
  if (!boundaryMatch) {
    const s = text.search(/<!doctype html|<html/i)
    return s !== -1 ? text.slice(s) : text
  }

  // Normalise Windows line endings BEFORE any indexOf/split operations
  const norm    = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const boundary = boundaryMatch[1]
  const escaped  = boundary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts    = norm.split(new RegExp('--' + escaped))

  for (const part of parts) {
    if (!/Content-Type:\s*text\/html/i.test(part)) continue
    const sep = part.indexOf('\n\n')
    if (sep === -1) continue
    let content = part.slice(sep + 2)

    if (/Content-Transfer-Encoding:\s*base64/i.test(part)) {
      content = decodeBase64Utf8(content)
    } else if (/Content-Transfer-Encoding:\s*quoted-printable/i.test(part)) {
      content = content
        .replace(/=\n/g, '')
        .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    }

    if (content.length > 100) return content
  }

  const s = text.search(/<!doctype html|<html/i)
  return s !== -1 ? text.slice(s) : text
}

export function parseCSV(broker: BrokerId, text: string): ParsedPosition[] {
  try {
    const content = isMhtml(text) ? extractHtmlFromMhtml(text) : text
    if (broker === 'xtb' && isHtml(content)) return parseXTBHtml(content)
    switch (broker) {
      case 'degiro':       return parseDEGIRO(content)
      case 'trading212':   return parseTrading212(content)
      case 'xtb':          return parseXTB(content)
      case 'traderepublic':return parseTradeRepublic(content)
      default:             return parseGeneric(content)
    }
  } catch {
    return []
  }
}
