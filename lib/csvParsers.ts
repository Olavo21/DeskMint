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
    csvHelp: 'xStation → Conta → Histórico de transações → Exportar CSV\n\nOu: Portfólio → Posições abertas → Exportar',
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

function detectAssetType(ticker: string, name: string): ParsedPosition['asset_type'] {
  const t = ticker.toUpperCase()
  const n = name.toUpperCase()
  if (['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOT', 'MATIC', 'LINK'].includes(t)) return 'CRYPTO'
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

// ─── XTB ──────────────────────────────────────────────────────────────────
// Handles two export formats:
// 1. Open Positions: Symbol,Volume,Open price,Current price,Value,Gross profit,...
// 2. Transaction History: Position,Symbol,Comment,Type,Volume,Open Time,Open Price,Close Time,Close Price,Commission,...,Net profit
function parseXTB(text: string): ParsedPosition[] {
  const delim = detectDelimiter(text)
  const rows = parseCsv(text, delim)
  if (rows.length < 2) return []
  const header = rows[0].map((h) => h.toLowerCase().trim())
  const col = (...names: string[]) => {
    for (const n of names) {
      const i = header.findIndex((h) => h.includes(n))
      if (i !== -1) return i
    }
    return -1
  }

  // Detect format: transaction history has "close time" or "close price" column
  const isHistory = col('close time', 'close price') !== -1

  if (isHistory) {
    // Transaction history — aggregate buy/sell by symbol into net positions
    const iSymbol    = col('symbol', 'instrumento', 'instrument')
    const iType      = col('type', 'tipo')
    const iVolume    = col('volume', 'quantidade')
    const iOpenPrice = col('open price', 'preço de abertura', 'preco abertura')
    const iClosePrice= col('close price', 'preço de fecho', 'preco fecho')

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
  const iSymbol  = col('symbol', 'instrumento', 'instrument')
  const iVolume  = col('volume', 'quantidade')
  const iOpen    = col('open price', 'preço de abertura')
  const iCurrent = col('current price', 'preço atual', 'current')
  const iValue   = col('value', 'valor', 'market value')

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

export function parseCSV(broker: BrokerId, text: string): ParsedPosition[] {
  try {
    switch (broker) {
      case 'degiro':       return parseDEGIRO(text)
      case 'trading212':   return parseTrading212(text)
      case 'xtb':          return parseXTB(text)
      case 'traderepublic':return parseTradeRepublic(text)
      default:             return parseGeneric(text)
    }
  } catch {
    return []
  }
}
