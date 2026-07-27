export type Sector =
  | 'Tecnologia'
  | 'Diversificado'
  | 'Criptoativos'
  | 'Saúde'
  | 'Financeiro'
  | 'Energia'
  | 'Industrial'
  | 'Consumo'
  | 'Imobiliário'
  | 'Outros'

export const SECTOR_COLORS: Record<Sector, string> = {
  Tecnologia:   '#6366f1',
  Diversificado:'#14b8a6',
  Criptoativos: '#f97316',
  Saúde:        '#10b981',
  Financeiro:   '#3b82f6',
  Energia:      '#f59e0b',
  Industrial:   '#8b5cf6',
  Consumo:      '#ec4899',
  Imobiliário:  '#84cc16',
  Outros:       '#64748b',
}

// ETFs globais / diversificados — mercado amplo
const DIVERSIFIED_ETFS = new Set([
  'VWCE','VWRL','VWRP','IWDA','SWDA','ACWI','SSAC','ISAC','IUSQ','FWRA','WORL',
  'CSPX','VUSD','VUSA','IVV','SPY','VOO','IUSA','CSUS','SPYL',
  'EUNA','DXEU','IEUA','EXW1','VEUR','MEUD','SX5S','IMEU','EXSA','DXSU',
  'EEM','VWO','IEEM','IEMG','EMIM','EIMI',
  // obrigações
  'AGGH','IGLO','IBTS','VAGU','IGLT','IBGL','AGBP','CSBGU7',
])

// ETFs e tickers sectoriais
const TICKER_MAP: Record<string, Sector> = {
  // Tecnologia
  QQQ:  'Tecnologia', IUQQ: 'Tecnologia',
  SXRV: 'Tecnologia', LSMC: 'Tecnologia', QUTM: 'Tecnologia',
  DFEN: 'Industrial',  // Aerospace & Defense
  // Ações tech conhecidas
  AAPL: 'Tecnologia', MSFT: 'Tecnologia', GOOGL: 'Tecnologia', GOOG: 'Tecnologia',
  META: 'Tecnologia', NVDA: 'Tecnologia', AMD:  'Tecnologia',  INTC: 'Tecnologia',
  TSMC: 'Tecnologia', ASML: 'Tecnologia', SAP:  'Tecnologia',  CRM: 'Tecnologia',
  ORCL: 'Tecnologia', CSCO: 'Tecnologia', ADBE: 'Tecnologia',  QCOM:'Tecnologia',
  // Consumo
  AMZN: 'Consumo', TSLA: 'Consumo', NKE: 'Consumo', MCD: 'Consumo',
  SBUX: 'Consumo', KO: 'Consumo',   PEP: 'Consumo', WMT: 'Consumo',
  // Saúde
  JNJ: 'Saúde', PFE: 'Saúde', MRNA: 'Saúde', ABBV: 'Saúde',
  UNH: 'Saúde', LLY: 'Saúde', BMY: 'Saúde',  NOVN: 'Saúde',
  RHHBY:'Saúde', AZN: 'Saúde', GSK: 'Saúde',
  // Financeiro
  JPM: 'Financeiro', BAC: 'Financeiro', GS: 'Financeiro', MS: 'Financeiro',
  V:   'Financeiro', MA: 'Financeiro',  PYPL:'Financeiro',
  HSBA:'Financeiro', BNP: 'Financeiro', BARC:'Financeiro',
  // Energia
  XOM: 'Energia', CVX: 'Energia', BP: 'Energia', SHEL: 'Energia',
  TTE: 'Energia', NEE: 'Energia', ENPH:'Energia',
  // Industrial
  BA: 'Industrial', CAT: 'Industrial', GE: 'Industrial', HON: 'Industrial',
  MMM: 'Industrial', UPS: 'Industrial', RTX: 'Industrial',
  // Imobiliário
  VNQ: 'Imobiliário', O: 'Imobiliário', AMT: 'Imobiliário', PLD: 'Imobiliário',
  // Crypto
  BTC: 'Criptoativos', ETH: 'Criptoativos', SOL: 'Criptoativos',
  BNB: 'Criptoativos', BTCE:'Criptoativos', ETHC:'Criptoativos',
  XRP: 'Criptoativos', ADA: 'Criptoativos', DOT: 'Criptoativos',
}

export function getSector(ticker: string, assetType: string): Sector {
  if (assetType === 'CRYPTO') return 'Criptoativos'

  const clean = ticker.split('.')[0].toUpperCase()

  if (TICKER_MAP[clean]) return TICKER_MAP[clean]
  if (DIVERSIFIED_ETFS.has(clean)) return 'Diversificado'

  return 'Outros'
}
