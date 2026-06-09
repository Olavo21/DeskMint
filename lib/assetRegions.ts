export type Region = 'EUA' | 'Europa' | 'Asia' | 'Resto'

export const REGION_COLORS: Record<Region, string> = {
  EUA:    '#3b82f6',
  Europa: '#6366f1',
  Asia:   '#f59e0b',
  Resto:  '#14b8a6',
}

const TICKER_MAP: Record<string, Region> = {
  // ── EUA ───────────────────────────────────────────────────────────────────
  CSPX: 'EUA', VUSD: 'EUA', VUSA: 'EUA', IVV: 'EUA', SPY: 'EUA',
  VOO: 'EUA', QQQ: 'EUA', IUQQ: 'EUA', SXRV: 'EUA', SPYL: 'EUA',
  IUSA: 'EUA', CSUS: 'EUA', DFEN: 'EUA',
  // ── Europa ────────────────────────────────────────────────────────────────
  EUNA: 'Europa', DXEU: 'Europa', IEUA: 'Europa', EXW1: 'Europa',
  VEUR: 'Europa', MEUD: 'Europa', DXSU: 'Europa', SX5S: 'Europa',
  IMEU: 'Europa', EXSA: 'Europa',
  // ── Ásia ──────────────────────────────────────────────────────────────────
  EEM: 'Asia', VWO: 'Asia', IEEM: 'Asia', IEMG: 'Asia',
  EMIM: 'Asia', EIMI: 'Asia',
  // ── Resto do Mundo (Global / Temático / Obrigações / Crypto) ──────────────
  VWCE: 'Resto', VWRL: 'Resto', VWRP: 'Resto',
  IWDA: 'Resto', SWDA: 'Resto',
  ACWI: 'Resto', SSAC: 'Resto', ISAC: 'Resto', IUSQ: 'Resto',
  FWRA: 'Resto', WORL: 'Resto',
  LSMC: 'Resto', QUTM: 'Resto',
  AGGH: 'Resto', IGLO: 'Resto', IBTS: 'Resto',
  VAGU: 'Resto', IGLT: 'Resto', IBGL: 'Resto', AGBP: 'Resto', CSBGU7: 'Resto',
  BTC: 'Resto', ETH: 'Resto', SOL: 'Resto', BNB: 'Resto', BTCE: 'Resto', ETHC: 'Resto',
}

const EU_EXCHANGES  = new Set(['L','AS','PA','DE','MI','MC','BR','SW','VI','ST','CO','HE','LS','FN','VX'])
const ASIA_EXCHANGES = new Set(['JP','HK','KR','SG','AU','TW','T','SS','SZ'])

export function getRegion(ticker: string, _assetType: string): Region {
  const parts    = ticker.split('.')
  const clean    = parts[0].toUpperCase()
  const exchange = (parts[1] ?? '').toUpperCase()

  if (TICKER_MAP[clean]) return TICKER_MAP[clean]
  if (exchange === 'US')               return 'EUA'
  if (EU_EXCHANGES.has(exchange))      return 'Europa'
  if (ASIA_EXCHANGES.has(exchange))    return 'Asia'
  return 'Resto'
}

export function getRegionLabel(region: Region): string {
  const labels: Record<Region, string> = {
    EUA:    'Estados Unidos',
    Europa: 'Europa',
    Asia:   'Ásia',
    Resto:  'Resto do Mundo',
  }
  return labels[region]
}
