export type Region =
  | 'Global'
  | 'EUA'
  | 'Europa'
  | 'Emergentes'
  | 'Obrigações'
  | 'Crypto'
  | 'Outro'

export const REGION_COLORS: Record<Region, string> = {
  Global:      '#14b8a6',
  EUA:         '#3b82f6',
  Europa:      '#6366f1',
  Emergentes:  '#f59e0b',
  Obrigações:  '#10b981',
  Crypto:      '#f97316',
  Outro:       '#64748b',
}

const TICKER_MAP: Record<string, Region> = {
  // Global
  VWCE: 'Global', VWRL: 'Global', IWDA: 'Global', SWDA: 'Global',
  ACWI: 'Global', SSAC: 'Global', ISAC: 'Global', FWRA: 'Global',
  VWRP: 'Global', IUSQ: 'Global', WORL: 'Global',
  // EUA / S&P 500
  CSPX: 'EUA', VUSD: 'EUA', VUSA: 'EUA', IVV: 'EUA', SPY: 'EUA',
  VOO: 'EUA', QQQ: 'EUA', IUQQ: 'EUA', SXRV: 'EUA', SPYL: 'EUA',
  IUSA: 'EUA', CSUS: 'EUA',
  // Europa
  EUNA: 'Europa', DXEU: 'Europa', IEUA: 'Europa', EXW1: 'Europa',
  VEUR: 'Europa', MEUD: 'Europa', DXSU: 'Europa', SX5S: 'Europa',
  IMEU: 'Europa', EXSA: 'Europa',
  // Emergentes
  EMIM: 'Emergentes', EIMI: 'Emergentes', EEM: 'Emergentes',
  VWO: 'Emergentes', IEEM: 'Emergentes', IEMG: 'Emergentes',
  // Obrigações
  AGGH: 'Obrigações', IGLO: 'Obrigações', IBTS: 'Obrigações',
  CSBGU7: 'Obrigações', VAGU: 'Obrigações', IGLT: 'Obrigações',
  IBGL: 'Obrigações', AGBP: 'Obrigações',
  // Crypto
  BTC: 'Crypto', ETH: 'Crypto', SOL: 'Crypto', BNB: 'Crypto',
  BTCE: 'Crypto', ETHC: 'Crypto',
}

// Exchange suffixes that imply European listing (not European assets)
const EU_EXCHANGES = ['L', 'AS', 'PA', 'DE', 'MI', 'MC', 'BR', 'SW', 'VI', 'ST', 'CO', 'HE', 'LS']

export function getRegion(ticker: string, assetType: string): Region {
  if (assetType === 'CRYPTO') return 'Crypto'
  if (assetType === 'BOND') return 'Obrigações'

  const clean = ticker.split('.')[0].toUpperCase()
  if (TICKER_MAP[clean]) return TICKER_MAP[clean]

  return 'Outro'
}

export function getRegionLabel(region: Region): string {
  const labels: Record<Region, string> = {
    Global:      'Global',
    EUA:         'Estados Unidos',
    Europa:      'Europa',
    Emergentes:  'Mercados Emergentes',
    Obrigações:  'Obrigações',
    Crypto:      'Criptomoedas',
    Outro:       'Outro',
  }
  return labels[region]
}
