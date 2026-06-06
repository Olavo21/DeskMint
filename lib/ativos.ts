export type Ativo = {
  ticker: string;
  nome: string;
  descricao: string;
  tipo: "ETF" | "Ação";
  precoBase: number;
  retornoAnual: number;
  volatilidade: number;
  categoria: string;
  dividendYield: number;
  acumulativo: boolean;
};

export const ATIVOS: Ativo[] = [
  /* ── ETFs — Mercado Amplo ── */
  { ticker: "IWDA",  tipo: "ETF",  nome: "iShares Core MSCI World",          descricao: "Acções de países desenvolvidos (23 mercados, ~1 600 empresas)",          precoBase: 65,   retornoAnual: 0.10,  volatilidade: 0.14, categoria: "Acções Globais",   dividendYield: 0,      acumulativo: true  },
  { ticker: "VWCE",  tipo: "ETF",  nome: "Vanguard FTSE All-World Acc",       descricao: "Desenvolvidos + emergentes (~3 700 empresas) — o ETF mais popular na Europa",precoBase: 95,   retornoAnual: 0.095, volatilidade: 0.15, categoria: "Acções Globais",   dividendYield: 0,      acumulativo: true  },
  { ticker: "SWRD",  tipo: "ETF",  nome: "SPDR MSCI World UCITS",             descricao: "MSCI World com TER de apenas 0,12% — alternativa económica ao IWDA",       precoBase: 32,   retornoAnual: 0.10,  volatilidade: 0.14, categoria: "Acções Globais",   dividendYield: 0,      acumulativo: true  },
  { ticker: "IUSQ",  tipo: "ETF",  nome: "iShares MSCI ACWI",                 descricao: "Mercado accionista mundial completo (MSCI All Country World Index)",        precoBase: 75,   retornoAnual: 0.09,  volatilidade: 0.14, categoria: "Acções Globais",   dividendYield: 0,      acumulativo: true  },
  { ticker: "XDWD",  tipo: "ETF",  nome: "Xtrackers MSCI World Swap",         descricao: "MSCI World via swap sintético — maior eficiência fiscal para EUA",          precoBase: 85,   retornoAnual: 0.10,  volatilidade: 0.14, categoria: "Acções Globais",   dividendYield: 0,      acumulativo: true  },
  /* ── ETFs — EUA ── */
  { ticker: "CSPX",  tipo: "ETF",  nome: "iShares Core S&P 500 Acc",          descricao: "As 500 maiores empresas americanas — benchmark mundial",                    precoBase: 450,  retornoAnual: 0.12,  volatilidade: 0.16, categoria: "EUA",             dividendYield: 0,      acumulativo: true  },
  { ticker: "VUSA",  tipo: "ETF",  nome: "Vanguard S&P 500 UCITS",            descricao: "S&P 500 acumulativo da Vanguard — TER 0,07%",                               precoBase: 85,   retornoAnual: 0.12,  volatilidade: 0.16, categoria: "EUA",             dividendYield: 0,      acumulativo: true  },
  { ticker: "SPYL",  tipo: "ETF",  nome: "SPDR S&P 500 UCITS ETF",            descricao: "S&P 500 da SPDR com preço de entrada baixo (~5 €) — TER 0,03%",             precoBase: 5.8,  retornoAnual: 0.12,  volatilidade: 0.16, categoria: "EUA",             dividendYield: 0,      acumulativo: true  },
  { ticker: "CNDX",  tipo: "ETF",  nome: "iShares NASDAQ 100 UCITS Acc",      descricao: "As 100 maiores tecnológicas do NASDAQ (Apple, NVIDIA, Microsoft…)",         precoBase: 870,  retornoAnual: 0.18,  volatilidade: 0.22, categoria: "NASDAQ",          dividendYield: 0,      acumulativo: true  },
  { ticker: "EQQQ",  tipo: "ETF",  nome: "Invesco EQQQ NASDAQ 100 UCITS",     descricao: "NASDAQ 100 da Invesco — alternativa ao CNDX com mais liquidez",             precoBase: 375,  retornoAnual: 0.18,  volatilidade: 0.22, categoria: "NASDAQ",          dividendYield: 0,      acumulativo: true  },
  { ticker: "SXRV",  tipo: "ETF",  nome: "iShares NASDAQ 100 UCITS ETF (DE)", descricao: "NASDAQ 100 acumulativo domiciliado na Alemanha (SXRV.DE) — iShares/BlackRock", precoBase: 105,  retornoAnual: 0.18,  volatilidade: 0.22, categoria: "NASDAQ",          dividendYield: 0,      acumulativo: true  },
  /* ── ETFs — Emergentes & Regiões ── */
  { ticker: "EIMI",  tipo: "ETF",  nome: "iShares Core MSCI EM IMI",          descricao: "Acções de mercados emergentes (China, Índia, Brasil, Taiwan…)",             precoBase: 30,   retornoAnual: 0.07,  volatilidade: 0.20, categoria: "Emergentes",      dividendYield: 0,      acumulativo: true  },
  { ticker: "MEUD",  tipo: "ETF",  nome: "Amundi MSCI Europe",                descricao: "Maiores empresas europeias — cobertura de 15 países desenvolvidos",         precoBase: 40,   retornoAnual: 0.07,  volatilidade: 0.16, categoria: "Europa",          dividendYield: 0,      acumulativo: true  },
  { ticker: "FLXI",  tipo: "ETF",  nome: "Franklin FTSE India UCITS",         descricao: "Acções indianas — a economia de maior crescimento global (TER 0,19%)",       precoBase: 8.5,  retornoAnual: 0.14,  volatilidade: 0.26, categoria: "Índia",           dividendYield: 0,      acumulativo: true  },
  /* ── ETFs — Obrigações & Defensivos ── */
  { ticker: "AGGH",  tipo: "ETF",  nome: "iShares Core Global Agg Bond",      descricao: "Obrigações globais diversificadas — âncora defensiva para o portfólio",    precoBase: 50,   retornoAnual: 0.03,  volatilidade: 0.05, categoria: "Obrigações",      dividendYield: 0.025,  acumulativo: false },
  { ticker: "EUNH",  tipo: "ETF",  nome: "iShares Core EUR Corp Bond",        descricao: "Obrigações corporativas europeias de grau de investimento",                 precoBase: 130,  retornoAnual: 0.03,  volatilidade: 0.05, categoria: "Obrigações Corp.", dividendYield: 0.028,  acumulativo: false },
  /* ── ETFs — Dividendos ── */
  { ticker: "VHYL",  tipo: "ETF",  nome: "Vanguard FTSE All-World High Div",  descricao: "Acções globais com dividendos elevados — yield estimado ~3,8%",             precoBase: 72,   retornoAnual: 0.07,  volatilidade: 0.13, categoria: "Dividendos",      dividendYield: 0.038,  acumulativo: false },
  { ticker: "TDIV",  tipo: "ETF",  nome: "VanEck Morningstar Div Leaders",    descricao: "Líderes mundiais em dividendos consistentes — yield ~4,2%",                 precoBase: 35,   retornoAnual: 0.075, volatilidade: 0.12, categoria: "Dividendos",      dividendYield: 0.042,  acumulativo: false },
  /* ── ETFs — Temáticos ── */
  { ticker: "SMH",   tipo: "ETF",  nome: "VanEck Semiconductor ETF",          descricao: "Líderes globais em semicondutores (NVIDIA, TSMC, ASML, Broadcom…)",         precoBase: 180,  retornoAnual: 0.22,  volatilidade: 0.32, categoria: "Semicondutores",  dividendYield: 0.005,  acumulativo: false },
  { ticker: "CHIP",  tipo: "ETF",  nome: "Amundi MSCI Semiconductors ESG Acc",descricao: "Semicondutores globais (NVIDIA, TSMC, ASML, Broadcom…) — acumulativo UCITS",  precoBase: 28,   retornoAnual: 0.21,  volatilidade: 0.31, categoria: "Semicondutores",  dividendYield: 0,      acumulativo: true  },
  { ticker: "LSMC",  tipo: "ETF",  nome: "L&G Semiconductor UCITS ETF (LSMC.DE)", descricao: "Semicondutores globais via Solactive Index (NVIDIA, TSMC, ASML…) — L&G, acumulativo", precoBase: 22, retornoAnual: 0.22, volatilidade: 0.33, categoria: "Semicondutores", dividendYield: 0, acumulativo: true },
  { ticker: "ITA",   tipo: "ETF",  nome: "iShares U.S. Aerospace & Defense",  descricao: "Empresas de defesa e aeroespacial EUA — sector em expansão estrutural",     precoBase: 120,  retornoAnual: 0.13,  volatilidade: 0.18, categoria: "Defesa",          dividendYield: 0.009,  acumulativo: false },
  { ticker: "DFND",  tipo: "ETF",  nome: "VanEck Defense UCITS ETF Acc",      descricao: "Indústria de defesa global (Rheinmetall, L3Harris, Leonardo…) — acumulativo",  precoBase: 35,   retornoAnual: 0.18,  volatilidade: 0.22, categoria: "Defesa",          dividendYield: 0,      acumulativo: true  },
  { ticker: "CIBR",  tipo: "ETF",  nome: "First Trust Nasdaq Cybersecurity",  descricao: "Líderes mundiais em cibersegurança (CrowdStrike, Palo Alto, Fortinet…)",    precoBase: 55,   retornoAnual: 0.16,  volatilidade: 0.26, categoria: "Cibersegurança",  dividendYield: 0.003,  acumulativo: false },
  { ticker: "HEAL",  tipo: "ETF",  nome: "iShares S&P 500 Health Care UCITS", descricao: "Empresas de saúde do S&P 500 — defensivo com crescimento secular",          precoBase: 43,   retornoAnual: 0.13,  volatilidade: 0.16, categoria: "Saúde",           dividendYield: 0.012,  acumulativo: false },
  { ticker: "INRG",  tipo: "ETF",  nome: "iShares Global Clean Energy",       descricao: "Empresas de energia renovável — solar, eólica e hidrogénio",                precoBase: 14,   retornoAnual: 0.02,  volatilidade: 0.35, categoria: "Energia Limpa",   dividendYield: 0.010,  acumulativo: false },
  { ticker: "IPRP",  tipo: "ETF",  nome: "iShares European Property Yield",   descricao: "REITs e imobiliário europeu cotado — rendimento + valorização",             precoBase: 28,   retornoAnual: 0.05,  volatilidade: 0.20, categoria: "Imobiliário",     dividendYield: 0.034,  acumulativo: false },
  /* ── Ações — Tecnologia ── */
  { ticker: "AAPL",  tipo: "Ação", nome: "Apple Inc.",                        descricao: "O iPhone, serviços (App Store, Apple TV+) e o maior buyback da história",   precoBase: 188,  retornoAnual: 0.16,  volatilidade: 0.25, categoria: "Tecnologia",      dividendYield: 0.005,  acumulativo: false },
  { ticker: "MSFT",  tipo: "Ação", nome: "Microsoft Corporation",             descricao: "Azure, Office 365, LinkedIn e líder na integração de IA empresarial",        precoBase: 415,  retornoAnual: 0.18,  volatilidade: 0.22, categoria: "Tecnologia",      dividendYield: 0.007,  acumulativo: false },
  { ticker: "NVDA",  tipo: "Ação", nome: "NVIDIA Corporation",                descricao: "GPUs para IA, data centers e gaming — o chip mais valioso do mundo",         precoBase: 135,  retornoAnual: 0.55,  volatilidade: 0.55, categoria: "Semicondutores",  dividendYield: 0.001,  acumulativo: false },
  { ticker: "GOOGL", tipo: "Ação", nome: "Alphabet (Google)",                 descricao: "Pesquisa, YouTube, Google Cloud e o maior negócio de publicidade digital",   precoBase: 173,  retornoAnual: 0.17,  volatilidade: 0.24, categoria: "Tecnologia",      dividendYield: 0,      acumulativo: false },
  { ticker: "AMZN",  tipo: "Ação", nome: "Amazon.com Inc.",                   descricao: "E-commerce nº1 mundial + AWS, a maior plataforma de cloud do mundo",         precoBase: 185,  retornoAnual: 0.20,  volatilidade: 0.28, categoria: "Tecnologia",      dividendYield: 0,      acumulativo: false },
  { ticker: "META",  tipo: "Ação", nome: "Meta Platforms",                    descricao: "Facebook, Instagram, WhatsApp e a aposta no metaverso e IA generativa",      precoBase: 495,  retornoAnual: 0.35,  volatilidade: 0.38, categoria: "Tecnologia",      dividendYield: 0.004,  acumulativo: false },
  { ticker: "TSLA",  tipo: "Ação", nome: "Tesla Inc.",                        descricao: "Líder em veículos eléctricos, baterias, Solar e FSD (condução autónoma)",    precoBase: 250,  retornoAnual: 0.22,  volatilidade: 0.60, categoria: "EV / Mobilidade", dividendYield: 0,      acumulativo: false },
  { ticker: "TSM",   tipo: "Ação", nome: "Taiwan Semiconductor (TSMC)",       descricao: "Fabrica chips para Apple, NVIDIA e AMD — monopólio dos chips avançados",     precoBase: 165,  retornoAnual: 0.22,  volatilidade: 0.30, categoria: "Semicondutores",  dividendYield: 0.015,  acumulativo: false },
  { ticker: "ASML",  tipo: "Ação", nome: "ASML Holding NV",                   descricao: "Fabrica as máquinas EUV sem as quais nenhum chip avançado pode ser feito",    precoBase: 700,  retornoAnual: 0.24,  volatilidade: 0.28, categoria: "Semicondutores",  dividendYield: 0.009,  acumulativo: false },
  { ticker: "BRKB",  tipo: "Ação", nome: "Berkshire Hathaway (B)",            descricao: "O conglomerado de Warren Buffett — GEICO, BNSF Railway, Apple e muito mais", precoBase: 410,  retornoAnual: 0.12,  volatilidade: 0.18, categoria: "Financeiro",      dividendYield: 0,      acumulativo: false },
  { ticker: "JPM",   tipo: "Ação", nome: "JPMorgan Chase & Co.",              descricao: "O maior banco americano — retail, investment banking e wealth management",    precoBase: 215,  retornoAnual: 0.14,  volatilidade: 0.22, categoria: "Financeiro",      dividendYield: 0.022,  acumulativo: false },
  { ticker: "V",     tipo: "Ação", nome: "Visa Inc.",                         descricao: "Infra-estrutura global de pagamentos — 4 mil milhões de cartões activos",     precoBase: 278,  retornoAnual: 0.15,  volatilidade: 0.18, categoria: "Financeiro",      dividendYield: 0.008,  acumulativo: false },
  { ticker: "LLY",   tipo: "Ação", nome: "Eli Lilly and Company",             descricao: "Líder em medicamentos para diabetes e obesidade (Mounjaro, Zepbound)",       precoBase: 790,  retornoAnual: 0.35,  volatilidade: 0.30, categoria: "Saúde / Farma",   dividendYield: 0.007,  acumulativo: false },
  { ticker: "NVO",   tipo: "Ação", nome: "Novo Nordisk",                      descricao: "Criador do Ozempic/Wegovy — domina o mercado de GLP-1 global",               precoBase: 78,   retornoAnual: 0.30,  volatilidade: 0.28, categoria: "Saúde / Farma",   dividendYield: 0.011,  acumulativo: false },
  { ticker: "XOM",   tipo: "Ação", nome: "ExxonMobil Corporation",            descricao: "Uma das maiores petrolíferas do mundo — dividendo consistente há décadas",    precoBase: 112,  retornoAnual: 0.10,  volatilidade: 0.22, categoria: "Energia",         dividendYield: 0.034,  acumulativo: false },
  { ticker: "3CP",   tipo: "Ação", nome: "Xiaomi Group (3CP.DE)",             descricao: "3º maior fabricante de smartphones, ecossistema IoT e expansão em VE (Xetra)", precoBase: 1.8,  retornoAnual: 0.20,  volatilidade: 0.45, categoria: "Tecnologia",      dividendYield: 0,      acumulativo: false },
  { ticker: "PLTR",  tipo: "Ação", nome: "Palantir Technologies",             descricao: "Plataforma de IA e análise de dados para governos e empresas — líder em ontologia", precoBase: 22,   retornoAnual: 0.38,  volatilidade: 0.58, categoria: "Tecnologia",      dividendYield: 0,      acumulativo: false },
  { ticker: "BABA",  tipo: "Ação", nome: "Alibaba Group Holding",             descricao: "Maior plataforma de e-commerce da China — Taobao, Tmall, Aliyun (cloud)",          precoBase: 88,   retornoAnual: 0.06,  volatilidade: 0.45, categoria: "China / Tech",    dividendYield: 0,      acumulativo: false },
  { ticker: "AVGO",  tipo: "Ação", nome: "Broadcom Inc.",                     descricao: "Chips para networking, storage e IA + software VMware — dividendo crescente",        precoBase: 160,  retornoAnual: 0.32,  volatilidade: 0.28, categoria: "Semicondutores",  dividendYield: 0.012,  acumulativo: false },
];

export function gerarHistorico(ativo: Ativo) {
  let seed = ativo.ticker.split("").reduce((a, c) => a + c.charCodeAt(0), 0) * 7919;
  function rand() { seed = (seed * 1664525 + 1013904223) & 0x7fffffff; return seed / 0x7fffffff; }
  const retornoMensal = Math.pow(1 + ativo.retornoAnual, 1 / 12) - 1;
  const agora = new Date();
  let preco = ativo.precoBase;
  const dados = [];
  for (let i = 119; i >= 0; i--) {
    const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
    const choque = (rand() - 0.5) * 2 * ativo.volatilidade / Math.sqrt(12);
    preco = Math.max(preco * (1 + retornoMensal + choque), 0.01);
    dados.push({ data: d.toLocaleDateString("pt-PT", { month: "short", year: "2-digit" }), preco: parseFloat(preco.toFixed(2)) });
  }
  return dados;
}

export function calcMetricas(h: { preco: number }[]) {
  const preco = h.at(-1)!.preco;
  const perf = (a: number, b: number) => (((b - a) / a) * 100).toFixed(1);
  return {
    preco,
    p1m:  perf(h[h.length - 2]?.preco  ?? h[0].preco, preco),
    p6m:  perf(h[h.length - 7]?.preco  ?? h[0].preco, preco),
    p1a:  perf(h[h.length - 13]?.preco ?? h[0].preco, preco),
    p3a:  perf(h[h.length - 37]?.preco ?? h[0].preco, preco),
    p5a:  perf(h[h.length - 61]?.preco ?? h[0].preco, preco),
    p10a: perf(h[0].preco, preco),
  };
}
