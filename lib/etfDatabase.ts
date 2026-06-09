export type EtfInfo = {
  provider: string
  description: string
  providerColor: string
  providerDomain: string
}

const DB: Record<string, EtfInfo> = {
  // ── Vanguard ──────────────────────────────────────────────────────────────
  VWCE: { provider: 'Vanguard', description: 'FTSE All-World (ACC)',          providerColor: '#8b1a1a', providerDomain: 'vanguard.com' },
  VWRL: { provider: 'Vanguard', description: 'FTSE All-World (DIST)',         providerColor: '#8b1a1a', providerDomain: 'vanguard.com' },
  VWRP: { provider: 'Vanguard', description: 'FTSE All-World (ACC)',          providerColor: '#8b1a1a', providerDomain: 'vanguard.com' },
  VUSA: { provider: 'Vanguard', description: 'S&P 500 (DIST)',                providerColor: '#8b1a1a', providerDomain: 'vanguard.com' },
  VUSD: { provider: 'Vanguard', description: 'S&P 500 (ACC)',                 providerColor: '#8b1a1a', providerDomain: 'vanguard.com' },
  VEUR: { provider: 'Vanguard', description: 'FTSE Developed Europe (DIST)',  providerColor: '#8b1a1a', providerDomain: 'vanguard.com' },
  VAGU: { provider: 'Vanguard', description: 'Global Bond EUR Hdg (ACC)',     providerColor: '#8b1a1a', providerDomain: 'vanguard.com' },
  // ── iShares (BlackRock) ───────────────────────────────────────────────────
  CSPX: { provider: 'iShares',  description: 'Core S&P 500 (ACC)',            providerColor: '#1a1a1a', providerDomain: 'blackrock.com' },
  SXRV: { provider: 'iShares',  description: 'NASDAQ 100 (ACC)',               providerColor: '#1a1a1a', providerDomain: 'blackrock.com' },
  IWDA: { provider: 'iShares',  description: 'MSCI World (ACC)',              providerColor: '#1a1a1a', providerDomain: 'blackrock.com' },
  SWDA: { provider: 'iShares',  description: 'MSCI World (DIST)',             providerColor: '#1a1a1a', providerDomain: 'blackrock.com' },
  SSAC: { provider: 'iShares',  description: 'MSCI ACWI (ACC)',               providerColor: '#1a1a1a', providerDomain: 'blackrock.com' },
  ISAC: { provider: 'iShares',  description: 'MSCI ACWI (DIST)',              providerColor: '#1a1a1a', providerDomain: 'blackrock.com' },
  IUSA: { provider: 'iShares',  description: 'S&P 500 (DIST)',                providerColor: '#1a1a1a', providerDomain: 'blackrock.com' },
  SPYL: { provider: 'iShares',  description: 'S&P 500 (USD, ACC)',            providerColor: '#1a1a1a', providerDomain: 'blackrock.com' },
  IUQQ: { provider: 'iShares',  description: 'NASDAQ 100 (ACC)',              providerColor: '#1a1a1a', providerDomain: 'blackrock.com' },
  CSUS: { provider: 'iShares',  description: 'Core S&P 500 (USD, ACC)',       providerColor: '#1a1a1a', providerDomain: 'blackrock.com' },
  EMIM: { provider: 'iShares',  description: 'MSCI EM IMI (ACC)',             providerColor: '#1a1a1a', providerDomain: 'blackrock.com' },
  EIMI: { provider: 'iShares',  description: 'MSCI Emerging Markets (ACC)',   providerColor: '#1a1a1a', providerDomain: 'blackrock.com' },
  IUSQ: { provider: 'iShares',  description: 'MSCI World Quality (ACC)',      providerColor: '#1a1a1a', providerDomain: 'blackrock.com' },
  AGGH: { provider: 'iShares',  description: 'Global Aggregate Bond (ACC)',   providerColor: '#1a1a1a', providerDomain: 'blackrock.com' },
  IGLO: { provider: 'iShares',  description: 'Global Govt Bond (DIST)',       providerColor: '#1a1a1a', providerDomain: 'blackrock.com' },
  IGLT: { provider: 'iShares',  description: 'UK Gilts (DIST)',               providerColor: '#1a1a1a', providerDomain: 'blackrock.com' },
  IBTS: { provider: 'iShares',  description: '$ Treasury 1-3yr (DIST)',       providerColor: '#1a1a1a', providerDomain: 'blackrock.com' },
  IBGL: { provider: 'iShares',  description: 'Global Inflation Bond (ACC)',   providerColor: '#1a1a1a', providerDomain: 'blackrock.com' },
  // ── VanEck ────────────────────────────────────────────────────────────────
  QUTM: { provider: 'VanEck',   description: 'Future of Quantum Computing',   providerColor: '#2c3e7c', providerDomain: 'vaneck.com' },
  // ── LGIM (Legal & General) ────────────────────────────────────────────────
  LSMC: { provider: 'LGIM',     description: 'Global Semiconductors (ACC)',   providerColor: '#00a651', providerDomain: 'lgim.com' },
  // ── Direxion ──────────────────────────────────────────────────────────────
  DFEN: { provider: 'Direxion', description: 'Aerospace & Defense Bull 3X',   providerColor: '#c82020', providerDomain: 'direxion.com' },
  // ── Amundi ────────────────────────────────────────────────────────────────
  FWRA: { provider: 'Amundi',   description: 'FTSE All-World (ACC)',          providerColor: '#007b40', providerDomain: 'amundi.com' },
  // ── Invesco ───────────────────────────────────────────────────────────────
  ACWI: { provider: 'Invesco',  description: 'MSCI ACWI (DIST)',              providerColor: '#005eb8', providerDomain: 'invesco.com' },
  // ── Xtrackers (DWS) ───────────────────────────────────────────────────────
  EUNA: { provider: 'Xtrackers', description: 'MSCI Eurozone (ACC)',          providerColor: '#007cc3', providerDomain: 'xtrackers.com' },
  DXEU: { provider: 'Xtrackers', description: 'STOXX Europe 600 (ACC)',       providerColor: '#007cc3', providerDomain: 'xtrackers.com' },
}

export function getEtfInfo(ticker: string): EtfInfo | null {
  const clean = ticker.split('.')[0].toUpperCase()
  return DB[clean] ?? null
}
