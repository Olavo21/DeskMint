import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import type { Database } from "../../../types/database.ts";

// NOTA (17 set 2026): versão do @supabase/supabase-js fixada em 2.45.0 —
// não deixar sem pin. Com "npm:@supabase/supabase-js" em aberto (o que
// esta função e todas as outras tinham antes), o Deno resolve "latest" a
// cada deploy/check, e a versão atual (2.116.0) introduziu uma
// inconsistência entre o tipo devolvido por createClient() e o que
// .from()/.update() esperam internamente — gera falsos positivos de tipo
// em qualquer função que passe o cliente Supabase por fronteira de função
// (confirmado: o investment-chat antigo, já deployado, dá o mesmo erro
// sob esta versão). 2.45.0 é a última versão testada sem essa
// inconsistência. Isto não é um bug de runtime (o Deno remove tipos antes
// de executar) mas sem o pin o `deno check` fica permanentemente
// inutilizável como rede de segurança — ver AGENTS.md.

// ─────────────────────────────────────────────────────────────────────────
// investment-chat — assistente de investimentos + comissões da DeskMint.
//
// Reescrito em 17 set 2026 para trazer os padrões de segurança já
// estabelecidos no stock-fundamentals (CORS restrito, rate limiting,
// erros genéricos ao cliente) e acrescentar tools de mercado/notícias/
// métricas. Substitui inteiramente a versão anterior (só get_portfolio/
// analyze_portfolio/update_asset_value/add_transaction, CORS "*", sem
// rate limit) — ver AGENTS.md para o histórico completo da decisão e o
// porquê de investment-agent/ e ai-assistant/ (código morto, sem
// nenhuma chamada no cliente) terem sido removidos em vez de mantidos
// em paralelo.
//
// IMPORTANTE — confirmação de escrita: update_asset_value e
// add_transaction NUNCA escrevem na BD durante o loop agêntico — só
// devolvem uma "proposta" (ao modelo, para ele explicar ao utilizador,
// e ao cliente em `pendingActions`). A escrita real só acontece através
// do campo `confirmAction` num pedido separado, disparado quando o
// utilizador confirma no ecrã (botão Confirmar/Cancelar) — ver
// hooks/useInvestmentChat.ts (a atualizar no próximo passo).
// ─────────────────────────────────────────────────────────────────────────

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const FINNHUB_KEY        = Deno.env.get("FINNHUB_KEY") ?? "";
const SENTRY_DSN         = Deno.env.get("SENTRY_DSN") ?? "";

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

const MODEL               = "claude-sonnet-4-6";
const MAX_TOKENS          = 2000;
const MAX_TOOL_ITERATIONS = 6;
const MAX_MESSAGE_LEN     = 2000;
const MAX_HISTORY_ITEMS   = 40;

const RATE_LIMIT_MAX        = 30;
const RATE_LIMIT_WINDOW_MS  = 60 * 60 * 1000; // 1 hora
const ENDPOINT_NAME         = "investment-chat";

// ─── CORS & Security headers (mesmo padrão do stock-fundamentals) ───────

const ALLOWED_ORIGIN = "https://deskmint.app";
const CORS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, ...SECURITY_HEADERS, "Content-Type": "application/json" },
  });
}

// ─── Sentry (best-effort, sem SDK) ───────────────────────────────────────
// NOTA (17 set 2026): usa a Store API legada da Sentry via fetch simples —
// evita puxar o SDK completo para dentro de uma function Deno. NÃO
// confirmado ao vivo se o projeto DeskMint em sentry.io ainda aceita esta
// API (pode exigir a envelope API mais recente) — a confirmar no primeiro
// erro real, tal como o resto da integração Sentry desta app. Uma falha
// aqui nunca deve impedir a resposta real ao utilizador.

async function reportToSentry(
  error: unknown,
  userId: string | null,
  extra?: Record<string, unknown>,
) {
  if (!SENTRY_DSN) return;
  try {
    const match = SENTRY_DSN.match(/^https:\/\/([^@]+)@([^/]+)\/(.+)$/);
    if (!match) return;
    const [, publicKey, host, projectId] = match;
    const message = error instanceof Error ? error.message : String(error);

    await fetch(`https://${host}/api/${projectId}/store/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sentry-Auth":
          `Sentry sentry_version=7, sentry_key=${publicKey}, sentry_client=deskmint-edge/1.0`,
      },
      body: JSON.stringify({
        event_id: crypto.randomUUID().replace(/-/g, ""),
        timestamp: new Date().toISOString(),
        platform: "other",
        level: "error",
        message,
        user: userId ? { id: userId } : undefined,
        tags: { source: ENDPOINT_NAME },
        extra,
      }),
    });
  } catch {
    // Nunca deixar uma falha do Sentry rebentar a resposta real.
  }
}

// ─── System Prompt ───────────────────────────────────────────────────────
// Texto-base pedido mantido tal como especificado, com duas secções
// acrescentadas por decisão explícita (17 set 2026): COMISSÕES DE
// HOTELARIA (para não perder essa capacidade do investment-chat antigo)
// e CONFIRMAÇÃO DE ESCRITA (para as duas tools de escrita nunca
// executarem sem passar pelo ecrã de confirmação do utilizador).

const SYSTEM_PROMPT = `És o assistente de investimentos da DeskMint, uma app
portuguesa de finanças pessoais. Falas com o dono da
carteira, em português europeu.

FERRAMENTAS
- get_portfolio: posições reais do utilizador
- get_market_data: cotações atuais
- get_news: notícias por ticker
- calculate_metrics: concentração, desempenho,
  diversificação
- update_asset_value: propõe atualizar o valor atual de
  um ativo (nunca escreve sozinha — ver regra abaixo)
- add_transaction: propõe registar um novo aporte/compra
  num ativo existente (nunca escreve sozinha — ver regra
  abaixo)

REGRAS DE DADOS
- Nunca indiques preços, cotações ou números da carteira
  de memória. Obtém-nos sempre por ferramenta.
- Se uma ferramenta falhar ou devolver vazio, diz isso
  claramente. Não estimes o valor em falta.
- Distingue sempre o que vem de dados reais do que é
  raciocínio teu.
- Os tickers guardados têm sufixos (.US, .DE, .CRYPTO).
  Retira-os antes de consultar dados de mercado.

CONFIRMAÇÃO DE ESCRITA (obrigatório)
- update_asset_value e add_transaction NUNCA escrevem
  nada sozinhas — só devolvem uma proposta com os valores
  antes/depois. Depois de chamares a ferramenta, descreve
  a proposta em 1-2 frases claras e diz que o utilizador
  tem de confirmar no ecrã. Nunca digas que já está feito.
- Não peças a confirmação por texto ("confirmas?") — o
  botão de confirmar/cancelar aparece automaticamente a
  seguir à tua proposta. Não repitas o pedido de
  confirmação em frases diferentes.

COMISSÕES DE HOTELARIA
- Também respondes sobre comissões de hotelaria quando
  perguntado: foca-te em média semanal, produto mais
  rentável (ex: Táxis, Transfers, Excursões) e tendência
  vs. período anterior. Não tens ferramenta dedicada a
  comissões nesta versão — usa apenas o que já estiver no
  histórico da conversa; se não tiveres dados suficientes,
  diz isso claramente em vez de estimar.

LIMITES
- Dás informação e análise, não recomendações
  personalizadas de investimento. Não dizes "compra" nem
  "vende"; expões o que os dados mostram, os cenários e
  os riscos, e a decisão fica com o utilizador.
- Não prometes nem projetas rentabilidades futuras.
  Se te pedirem previsões de preço, explicas porque não
  são fiáveis e ofereces cenários em vez de um número.
- Referências fiscais portuguesas (ex.: isenção de
  mais-valias aos 365 dias) são informativas; recomenda
  confirmação com contabilista em casos concretos.
- Não expões user_id, emails, chaves nem detalhes técnicos
  internos ao utilizador.

ESTILO
- Ecrã de telemóvel: respostas curtas, sem preâmbulos.
  Começa pela conclusão.
- Números com unidade e data de referência.
- No máximo uma pergunta de seguimento por resposta.`;

// ─── Tool Definitions ────────────────────────────────────────────────────
// cache_control no último bloco (add_transaction) — cacheia o prefixo
// completo do system+tools entre pedidos do mesmo utilizador.

type ToolDef = Anthropic.Tool & { cache_control?: { type: "ephemeral" } };

const TOOLS: ToolDef[] = [
  {
    name: "get_portfolio",
    description:
      "Posições reais do utilizador: ticker, nome, tipo, broker, unidades, preço médio, capital investido, valor atual, P/L e peso. Inclui os lotes de cada posição (quantidade, preço, data de aquisição e se já passou os 365 dias de isenção de mais-valias em Portugal).",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_market_data",
    description:
      "Cotações atuais via Finnhub para uma lista de tickers. Tickers sem cobertura no plano gratuito (ex: ETFs .DE) vêm marcados como indisponíveis em vez de dar erro.",
    input_schema: {
      type: "object",
      properties: {
        tickers: {
          type: "array",
          items: { type: "string" },
          description: "Tickers tal como guardados no portefólio (ex: AAPL.US, VWCE.DE). Máx. 20 por pedido.",
        },
      },
      required: ["tickers"],
    },
  },
  {
    name: "get_news",
    description: "Notícias recentes (últimos 7 dias) de um ticker específico via Finnhub.",
    input_schema: {
      type: "object",
      properties: {
        ticker: { type: "string", description: "Símbolo do ticker (ex: AAPL, NVDA)" },
        limit:  { type: "number", description: "Número máximo de notícias (defeito: 5, máx.: 10)" },
      },
      required: ["ticker"],
    },
  },
  {
    name: "calculate_metrics",
    description:
      "Cálculo server-side sobre as posições reais do utilizador — nunca faças esta aritmética por conta própria.",
    input_schema: {
      type: "object",
      properties: {
        metric: {
          type: "string",
          enum: ["concentration", "performance", "diversification"],
          description:
            "concentration: alocação por tipo/broker e maior posição. performance: P/L total e melhor/pior ativo. diversification: nº de tipos/brokers distintos e peso do maior grupo.",
        },
      },
      required: ["metric"],
    },
  },
  {
    name: "update_asset_value",
    description:
      "Propõe atualizar o valor de mercado atual de um ativo (variação % ou valor fixo). NUNCA escreve sozinha — devolve uma proposta que o utilizador confirma no ecrã.",
    input_schema: {
      type: "object",
      properties: {
        asset_id: { type: "string", description: "ID do ativo obtido via get_portfolio" },
        modification_type: {
          type: "string",
          enum: ["percentage_change", "fixed_value"],
          description: "percentage_change: variação % (-2 para -2%, 1.5 para +1,5%); fixed_value: novo valor total em €",
        },
        value: { type: "number", description: "Valor da variação % ou novo valor fixo em €" },
      },
      required: ["asset_id", "modification_type", "value"],
    },
  },
  {
    name: "add_transaction",
    description:
      "Propõe registar uma nova compra/aporte num ativo existente. NUNCA escreve sozinha — devolve uma proposta que o utilizador confirma no ecrã.",
    input_schema: {
      type: "object",
      properties: {
        asset_id:             { type: "string", description: "ID do ativo obtido via get_portfolio" },
        amount_invested_eur:  { type: "number", description: "Montante investido em EUR" },
        units_bought:         { type: "number", description: "Unidades compradas (opcional)" },
      },
      required: ["asset_id", "amount_invested_eur"],
    },
    cache_control: { type: "ephemeral" },
  },
];

// ─── Helpers de validação (mesmo espírito da auditoria de segurança) ────

const MAX_VALUE = 1_000_000_000;

function validatePercentage(value: number): string | null {
  if (!Number.isFinite(value)) return "Valor inválido";
  if (value < -100 || value > 1000) return "Variação fora de limites razoáveis";
  return null;
}
function validateFixedValue(value: number): string | null {
  if (!Number.isFinite(value) || value < 0 || value > MAX_VALUE) return "Valor fora de limites razoáveis";
  return null;
}
function validateAmount(value: number): string | null {
  if (!Number.isFinite(value) || value <= 0 || value > MAX_VALUE) return "Montante fora de limites razoáveis";
  return null;
}

// ─── Validação do payload de confirmAction ───────────────────────────────
// O confirmAction contorna deliberadamente o modelo (ver nota no topo do
// ficheiro) — por isso o payload vem diretamente do cliente e NUNCA pode
// ser confiado às cegas. asset_id/ownership são sempre revalidados aqui E
// depois de novo dentro de executeUpdateAssetValue/executeAddTransaction
// (a query já filtra por user_id do JWT, nunca do body — defesa em
// profundidade). Não há campos de ticker nem de data de compra nestes dois
// payloads (usam asset_id, não ticker; não envolvem lotes/purchase_date),
// por isso essas duas validações do checklist genérico não se aplicam
// aqui tal como estão — ficam a valer quando/se houver uma tool que
// receba ticker ou data em bruto do cliente.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateConfirmPayload(kind: string, payload: Record<string, unknown>): string | null {
  if (typeof payload?.asset_id !== "string" || !UUID_RE.test(payload.asset_id)) {
    return "asset_id inválido";
  }
  if (kind === "update_asset_value") {
    if (payload.modification_type !== "percentage_change" && payload.modification_type !== "fixed_value") {
      return "modification_type inválido";
    }
    if (typeof payload.value !== "number" || !Number.isFinite(payload.value)) {
      return "value inválido";
    }
    return null;
  }
  if (kind === "add_transaction") {
    if (typeof payload.amount_invested_eur !== "number" || !Number.isFinite(payload.amount_invested_eur)) {
      return "amount_invested_eur inválido";
    }
    if (
      payload.units_bought !== undefined &&
      (typeof payload.units_bought !== "number" || !Number.isFinite(payload.units_bought))
    ) {
      return "units_bought inválido";
    }
    return null;
  }
  return "Ação desconhecida";
}

const KNOWN_SUFFIXES = [".US", ".DE", ".CRYPTO"];
function stripSuffix(ticker: string): string {
  for (const suf of KNOWN_SUFFIXES) {
    if (ticker.endsWith(suf)) return ticker.slice(0, -suf.length);
  }
  return ticker;
}

// ─── Tool implementations (leitura) ──────────────────────────────────────

type SB = ReturnType<typeof createClient<Database>>;

async function getPortfolio(sb: SB, uid: string) {
  const [assetsRes, lotsRes] = await Promise.all([
    sb.from("dm_portfolio_assets")
      .select("id, name, ticker, asset_type, broker, units, avg_price, capital_invested, current_value, allocation, is_extra")
      .eq("user_id", uid)
      .order("current_value", { ascending: false }),
    sb.from("dm_portfolio_lots")
      .select("id, asset_id, ticker, quantity, unit_price, purchase_date, broker")
      .eq("user_id", uid),
  ]);

  if (assetsRes.error) return { erro: assetsRes.error.message };

  type AssetRow = { id: string; name: string; ticker: string; asset_type: string; broker: string; units: number; avg_price: number; capital_invested: number; current_value: number; allocation: number | null; is_extra: boolean };
  type LotRow = { id: string; asset_id: string; ticker: string; quantity: number; unit_price: number; purchase_date: string; broker: string };

  const assets = (assetsRes.data ?? []) as AssetRow[];
  const lots   = (lotsRes.data ?? []) as LotRow[];
  const now    = Date.now();

  const lotsByAsset = new Map<string, LotRow[]>();
  for (const lot of lots) {
    const arr = lotsByAsset.get(lot.asset_id) ?? [];
    arr.push(lot);
    lotsByAsset.set(lot.asset_id, arr);
  }

  const totalValue   = assets.reduce((s, a) => s + (a.current_value ?? 0), 0);
  const totalCapital = assets.reduce((s, a) => s + (a.capital_invested ?? 0), 0);

  return {
    ativos: assets.map((a) => {
      const pl = (a.current_value ?? 0) - (a.capital_invested ?? 0);
      const plPct = a.capital_invested > 0 ? (pl / a.capital_invested) * 100 : 0;
      const assetLots = (lotsByAsset.get(a.id) ?? []).map((l) => {
        const dias = Math.floor((now - new Date(l.purchase_date).getTime()) / 86_400_000);
        return {
          quantidade: l.quantity,
          precoUnitario: l.unit_price,
          dataAquisicao: l.purchase_date,
          diasDesdeAquisicao: dias,
          isentoMaisValias365: dias >= 365,
        };
      });
      return {
        id: a.id,
        ticker: a.ticker,
        nome: a.name,
        tipo: a.asset_type,
        broker: a.broker,
        unidades: a.units,
        precoMedio: a.avg_price,
        capitalInvestido: +(a.capital_invested ?? 0).toFixed(2),
        valorAtual: +(a.current_value ?? 0).toFixed(2),
        pl: +pl.toFixed(2),
        plPct: +plPct.toFixed(2),
        peso: totalValue > 0 ? +((a.current_value / totalValue) * 100).toFixed(1) : 0,
        lotes: assetLots,
      };
    }),
    resumo: {
      totalAtivos: assets.length,
      valorTotal: +totalValue.toFixed(2),
      capitalInvestido: +totalCapital.toFixed(2),
      pl: +(totalValue - totalCapital).toFixed(2),
      plPct: totalCapital > 0 ? +(((totalValue - totalCapital) / totalCapital) * 100).toFixed(2) : 0,
    },
  };
}

const MAX_TICKERS_PER_CALL = 20;

async function getMarketData(tickers: string[]) {
  if (!FINNHUB_KEY) return { erro: "Finnhub key não configurada" };
  const list = (Array.isArray(tickers) ? tickers : []).slice(0, MAX_TICKERS_PER_CALL);

  const cotacoes = await Promise.all(list.map(async (original) => {
    const symbol = stripSuffix(String(original).toUpperCase());
    try {
      const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_KEY}`);
      if (!res.ok) return { ticker: original, disponivel: false };
      const q = await res.json();
      if (q.c == null || q.c === 0) return { ticker: original, disponivel: false };
      return {
        ticker: original,
        disponivel: true,
        preco: q.c,
        variacao: q.d,
        variacaoPct: q.dp,
        maximoDia: q.h,
        minimoDia: q.l,
        fechoAnterior: q.pc,
      };
    } catch {
      return { ticker: original, disponivel: false };
    }
  }));

  return { cotacoes };
}

const MAX_NEWS = 10;

async function getNews(ticker: string, limit?: number) {
  if (!FINNHUB_KEY) return { erro: "Finnhub key não configurada" };
  const cleanTicker  = stripSuffix((ticker ?? "").toUpperCase());
  const cappedLimit  = Math.min(Math.max(1, limit || 5), MAX_NEWS);

  const to   = new Date().toISOString().split("T")[0];
  const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const res = await fetch(`https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(cleanTicker)}&from=${from}&to=${to}&token=${FINNHUB_KEY}`);
  if (!res.ok) return { erro: `Erro Finnhub: ${res.status}` };

  const data = await res.json();
  const noticias = Array.isArray(data) ? data.slice(0, cappedLimit) : [];

  return {
    ticker: cleanTicker,
    noticias: noticias.map((n: { headline: string; summary?: string; source: string; datetime: number }) => ({
      titulo: n.headline,
      resumo: (n.summary ?? "").slice(0, 200),
      fonte: n.source,
      data: new Date(n.datetime * 1000).toLocaleDateString("pt-PT"),
    })),
  };
}

async function calculateMetrics(sb: SB, uid: string, metric: "concentration" | "performance" | "diversification") {
  const { data, error } = await sb
    .from("dm_portfolio_assets")
    .select("name, ticker, asset_type, broker, current_value, capital_invested")
    .eq("user_id", uid);

  if (error) return { erro: error.message };

  type Row = { name: string; ticker: string; asset_type: string; broker: string; current_value: number; capital_invested: number };
  const assets = (data ?? []) as Row[];
  if (assets.length === 0) return { erro: "Portefólio vazio" };

  const totalValue = assets.reduce((s, a) => s + (a.current_value ?? 0), 0);

  if (metric === "concentration") {
    const porTipo: Record<string, number> = {};
    const porBroker: Record<string, number> = {};
    for (const a of assets) {
      porTipo[a.asset_type] = (porTipo[a.asset_type] ?? 0) + (a.current_value ?? 0);
      porBroker[a.broker]   = (porBroker[a.broker] ?? 0) + (a.current_value ?? 0);
    }
    const sorted = [...assets].sort((a, b) => (b.current_value ?? 0) - (a.current_value ?? 0));
    const top = sorted[0];
    const topPct = totalValue > 0 ? (top.current_value / totalValue) * 100 : 0;
    return {
      alocacaoPorTipo: Object.entries(porTipo)
        .map(([tipo, valor]) => ({ tipo, valor: +valor.toFixed(2), pct: +((valor / totalValue) * 100).toFixed(1) }))
        .sort((a, b) => b.pct - a.pct),
      alocacaoPorBroker: Object.entries(porBroker)
        .map(([broker, valor]) => ({ broker, valor: +valor.toFixed(2), pct: +((valor / totalValue) * 100).toFixed(1) }))
        .sort((a, b) => b.pct - a.pct),
      maiorPosicao: {
        nome: top.name, ticker: top.ticker,
        valor: +top.current_value.toFixed(2),
        pct: +topPct.toFixed(1),
        alertaConcentracao: topPct > 50,
      },
    };
  }

  if (metric === "performance") {
    const totalCapital = assets.reduce((s, a) => s + (a.capital_invested ?? 0), 0);
    const porAtivo = assets.map((a) => {
      const pl = (a.current_value ?? 0) - (a.capital_invested ?? 0);
      const plPct = a.capital_invested > 0 ? (pl / a.capital_invested) * 100 : 0;
      return { ticker: a.ticker, nome: a.name, pl: +pl.toFixed(2), plPct: +plPct.toFixed(2) };
    }).sort((a, b) => b.plPct - a.plPct);

    return {
      valorTotal: +totalValue.toFixed(2),
      capitalInvestido: +totalCapital.toFixed(2),
      pl: +(totalValue - totalCapital).toFixed(2),
      plPct: totalCapital > 0 ? +(((totalValue - totalCapital) / totalCapital) * 100).toFixed(2) : 0,
      melhor: porAtivo[0] ?? null,
      pior: porAtivo.length > 1 ? porAtivo[porAtivo.length - 1] : null,
    };
  }

  // diversification
  const tipos   = new Set(assets.map((a) => a.asset_type));
  const brokers = new Set(assets.map((a) => a.broker));
  const porTipo: Record<string, number> = {};
  for (const a of assets) porTipo[a.asset_type] = (porTipo[a.asset_type] ?? 0) + (a.current_value ?? 0);
  const maxTipoValor = Math.max(...Object.values(porTipo));
  const maxTipoPct = totalValue > 0 ? (maxTipoValor / totalValue) * 100 : 0;

  return {
    totalAtivos: assets.length,
    tiposDistintos: tipos.size,
    brokersDistintos: brokers.size,
    maiorGrupoPct: +maxTipoPct.toFixed(1),
    concentradoDemais: maxTipoPct > 70,
  };
}

// ─── Tool implementations (escrita → proposta, nunca escreve) ───────────

async function proposeUpdateAssetValue(
  sb: SB, uid: string,
  assetId: string, modType: "percentage_change" | "fixed_value", value: number,
) {
  const validationErr = modType === "percentage_change" ? validatePercentage(value) : validateFixedValue(value);
  if (validationErr) return { erro: validationErr };

  const { data: asset, error } = await sb
    .from("dm_portfolio_assets")
    .select("id, name, ticker, current_value")
    .eq("id", assetId)
    .eq("user_id", uid)
    .single();
  if (error || !asset) return { erro: "Ativo não encontrado" };

  const a = asset as { id: string; name: string; ticker: string; current_value: number };
  const newValue = modType === "percentage_change"
    ? +(a.current_value * (1 + value / 100)).toFixed(2)
    : +value.toFixed(2);

  return {
    pendente: true,
    proposta: {
      kind: "update_asset_value" as const,
      payload: { asset_id: assetId, modification_type: modType, value },
      ativo: a.ticker || a.name,
      valorAtual: a.current_value,
      novoValor: newValue,
    },
  };
}

async function proposeAddTransaction(
  sb: SB, uid: string,
  assetId: string, amountEur: number, unitsBought?: number,
) {
  const amountErr = validateAmount(amountEur);
  if (amountErr) return { erro: amountErr };
  if (unitsBought != null) {
    const unitsErr = validateAmount(unitsBought);
    if (unitsErr) return { erro: "Unidades fora de limites razoáveis" };
  }

  const { data: asset, error } = await sb
    .from("dm_portfolio_assets")
    .select("id, name, ticker, capital_invested, units, avg_price")
    .eq("id", assetId)
    .eq("user_id", uid)
    .single();
  if (error || !asset) return { erro: "Ativo não encontrado" };

  const a = asset as { id: string; name: string; ticker: string; capital_invested: number; units: number; avg_price: number };
  const newCapital = +(a.capital_invested + amountEur).toFixed(2);

  return {
    pendente: true,
    proposta: {
      kind: "add_transaction" as const,
      payload: { asset_id: assetId, amount_invested_eur: amountEur, units_bought: unitsBought },
      ativo: a.ticker || a.name,
      capitalAnterior: a.capital_invested,
      novoCapital: newCapital,
      unidadesCompradas: unitsBought ?? null,
    },
  };
}

// ─── Execução real (só via confirmAction, nunca a partir do loop) ───────

async function executeUpdateAssetValue(
  sb: SB, uid: string,
  payload: { asset_id: string; modification_type: "percentage_change" | "fixed_value"; value: number },
) {
  const validationErr = payload.modification_type === "percentage_change"
    ? validatePercentage(payload.value) : validateFixedValue(payload.value);
  if (validationErr) return { sucesso: false, erro: validationErr };

  const { data: asset, error: fetchErr } = await sb
    .from("dm_portfolio_assets")
    .select("id, name, ticker, current_value")
    .eq("id", payload.asset_id)
    .eq("user_id", uid)
    .single();
  if (fetchErr || !asset) return { sucesso: false, erro: "Ativo não encontrado" };

  const a = asset as { id: string; name: string; ticker: string; current_value: number };
  const newValue = payload.modification_type === "percentage_change"
    ? +(a.current_value * (1 + payload.value / 100)).toFixed(2)
    : +payload.value.toFixed(2);

  const { error } = await sb
    .from("dm_portfolio_assets")
    .update({ current_value: newValue, last_updated: new Date().toISOString() })
    .eq("id", payload.asset_id)
    .eq("user_id", uid);
  if (error) return { sucesso: false, erro: "Erro ao atualizar" };

  return { sucesso: true, ativo: a.ticker || a.name, valorAnterior: a.current_value, novoValor: newValue };
}

async function executeAddTransaction(
  sb: SB, uid: string,
  payload: { asset_id: string; amount_invested_eur: number; units_bought?: number },
) {
  const amountErr = validateAmount(payload.amount_invested_eur);
  if (amountErr) return { sucesso: false, erro: amountErr };

  const { data: asset, error: fetchErr } = await sb
    .from("dm_portfolio_assets")
    .select("id, name, ticker, capital_invested, units, avg_price")
    .eq("id", payload.asset_id)
    .eq("user_id", uid)
    .single();
  if (fetchErr || !asset) return { sucesso: false, erro: "Ativo não encontrado" };

  const a = asset as { id: string; name: string; ticker: string; capital_invested: number; units: number; avg_price: number };
  const newCapital = +(a.capital_invested + payload.amount_invested_eur).toFixed(2);
  const update: Record<string, unknown> = {
    capital_invested: newCapital,
    last_updated: new Date().toISOString(),
  };

  const unitsBought = payload.units_bought;
  if (unitsBought != null && unitsBought > 0) {
    const newUnits    = +(a.units + unitsBought).toFixed(6);
    const newAvgPrice = +(newCapital / newUnits).toFixed(4);
    update.units     = newUnits;
    update.avg_price = newAvgPrice;
  }

  const { error } = await sb
    .from("dm_portfolio_assets")
    .update(update)
    .eq("id", payload.asset_id)
    .eq("user_id", uid);
  if (error) return { sucesso: false, erro: "Erro ao atualizar" };

  return { sucesso: true, ativo: a.ticker || a.name, capitalAnterior: a.capital_invested, novoCapital: newCapital, aporte: payload.amount_invested_eur };
}

// ─── Uso/custo (dm_agent_usage — tabela criada na próxima migração) ─────

type UsageAcc = { input_tokens: number; output_tokens: number; cache_creation_input_tokens: number; cache_read_input_tokens: number };

function accumulateUsage(acc: UsageAcc, u: { input_tokens?: number; output_tokens?: number; cache_creation_input_tokens?: number | null; cache_read_input_tokens?: number | null }) {
  acc.input_tokens += u.input_tokens ?? 0;
  acc.output_tokens += u.output_tokens ?? 0;
  acc.cache_creation_input_tokens += u.cache_creation_input_tokens ?? 0;
  acc.cache_read_input_tokens += u.cache_read_input_tokens ?? 0;
}

// ─── Main handler ─────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: { ...CORS, ...SECURITY_HEADERS } });
  if (req.method !== "POST") return jsonResponse({ error: "Method Not Allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonResponse({ error: "Sem autorização" }, 401);

  const sb = createClient<Database>(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: { user }, error: authError } = await sb.auth.getUser(authHeader.replace("Bearer ", ""));
  if (authError || !user) return jsonResponse({ error: "Token inválido" }, 401);

  let body: {
    message?: string;
    history?: Anthropic.MessageParam[];
    confirmAction?: { kind: string; payload: Record<string, unknown> };
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Pedido inválido" }, 400);
  }

  // ── Caminho de confirmação: execução direta, sem passar pelo modelo ──
  // (a UI chama isto quando o utilizador confirma a proposta no ecrã)
  // O payload vem diretamente do cliente e contorna o modelo — NUNCA é
  // confiado às cegas: validado aqui (shape/tipos/formato) e outra vez
  // dentro de executeUpdateAssetValue/executeAddTransaction (ownership via
  // user_id do JWT, nunca do body; limites de valor).
  if (body.confirmAction) {
    const { kind, payload } = body.confirmAction;
    const shapeErr = validateConfirmPayload(kind, payload ?? {});
    if (shapeErr) return jsonResponse({ error: shapeErr }, 400);

    try {
      let result: { sucesso: boolean; erro?: string; [k: string]: unknown };
      if (kind === "update_asset_value") {
        result = await executeUpdateAssetValue(sb, user.id, payload as never);
      } else {
        result = await executeAddTransaction(sb, user.id, payload as never);
      }
      if (!result.sucesso) {
        return jsonResponse({ error: result.erro ?? "Não foi possível aplicar a ação" }, 400);
      }
      return jsonResponse({ result, invalidateKeys: ["portfolio", "dashboard"] });
    } catch (err) {
      console.error("investment-chat confirmAction error:", err);
      await reportToSentry(err, user.id, { phase: "confirmAction", kind });
      return jsonResponse({ error: "Erro ao aplicar a ação" }, 500);
    }
  }

  const message = body.message;
  if (!message || typeof message !== "string" || message.length > MAX_MESSAGE_LEN) {
    return jsonResponse({ error: "Mensagem inválida" }, 400);
  }

  // ── Rate limit: 30 mensagens/hora/utilizador (reutiliza dm_rate_limits
  //    já criada para o stock-fundamentals — endpoint diferente, mesma tabela) ──
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const { count } = await sb
    .from("dm_rate_limits")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("endpoint", ENDPOINT_NAME)
    .gte("created_at", windowStart);

  if ((count ?? 0) >= RATE_LIMIT_MAX) {
    return jsonResponse({ error: "Demasiados pedidos. Tenta novamente daqui a pouco." }, 429);
  }

  const history = Array.isArray(body.history) ? body.history.slice(-MAX_HISTORY_ITEMS) : [];
  const messages: Anthropic.MessageParam[] = [...history, { role: "user", content: message }];

  const pendingActions: unknown[] = [];
  const startedAt = Date.now();
  const usage: UsageAcc = { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 };
  let toolCallCount = 0;

  const baseParams = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: [{ type: "text" as const, text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" as const } }],
    tools: TOOLS,
  };

  let response;
  try {
    response = await anthropic.messages.create({ ...baseParams, messages } as never);
  } catch (err) {
    console.error("investment-chat anthropic error:", err);
    await reportToSentry(err, user.id, { phase: "initial_call" });
    return jsonResponse({ error: "Erro ao contactar o assistente" }, 502);
  }
  accumulateUsage(usage, response.usage);

  let iterations = 0;
  while (response.stop_reason === "tool_use" && iterations < MAX_TOOL_ITERATIONS) {
    iterations++;
    const toolUses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    messages.push({ role: "assistant", content: response.content });

    // Todas as tools desta versão são livres de efeitos secundários durante
    // o loop (as de escrita só propõem) — seguro correr sempre em paralelo.
    const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(toolUses.map(async (tu) => {
      toolCallCount++;
      const inp = tu.input as Record<string, unknown>;
      try {
        let result: unknown;
        switch (tu.name) {
          case "get_portfolio":
            result = await getPortfolio(sb, user.id);
            break;
          case "get_market_data":
            result = await getMarketData((inp.tickers as string[]) ?? []);
            break;
          case "get_news":
            result = await getNews(inp.ticker as string, inp.limit as number | undefined);
            break;
          case "calculate_metrics":
            result = await calculateMetrics(sb, user.id, inp.metric as "concentration" | "performance" | "diversification");
            break;
          case "update_asset_value": {
            const r = await proposeUpdateAssetValue(
              sb, user.id,
              inp.asset_id as string,
              inp.modification_type as "percentage_change" | "fixed_value",
              inp.value as number,
            );
            if ((r as { pendente?: boolean }).pendente) pendingActions.push((r as { proposta: unknown }).proposta);
            result = r;
            break;
          }
          case "add_transaction": {
            const r = await proposeAddTransaction(
              sb, user.id,
              inp.asset_id as string,
              inp.amount_invested_eur as number,
              inp.units_bought as number | undefined,
            );
            if ((r as { pendente?: boolean }).pendente) pendingActions.push((r as { proposta: unknown }).proposta);
            result = r;
            break;
          }
          default:
            return { type: "tool_result", tool_use_id: tu.id, content: `Ferramenta desconhecida: ${tu.name}`, is_error: true };
        }
        return { type: "tool_result", tool_use_id: tu.id, content: JSON.stringify(result) };
      } catch (err) {
        console.error(`investment-chat tool error (${tu.name}):`, err);
        return { type: "tool_result", tool_use_id: tu.id, content: "Erro ao executar a ferramenta.", is_error: true };
      }
    }));

    messages.push({ role: "user", content: toolResults });

    try {
      response = await anthropic.messages.create({ ...baseParams, messages } as never);
    } catch (err) {
      console.error("investment-chat anthropic error (loop):", err);
      await reportToSentry(err, user.id, { phase: "loop", iteration: iterations });
      return jsonResponse({ error: "Erro ao contactar o assistente" }, 502);
    }
    accumulateUsage(usage, response.usage);
  }

  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
  const incomplete = iterations >= MAX_TOOL_ITERATIONS && response.stop_reason === "tool_use";

  // ── Regista uso e consumo de rate limit — nunca bloqueia a resposta ──
  sb.from("dm_agent_usage").insert({
    user_id: user.id,
    model: MODEL,
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
    cache_creation_input_tokens: usage.cache_creation_input_tokens,
    cache_read_input_tokens: usage.cache_read_input_tokens,
    tool_calls: toolCallCount,
    latency_ms: Date.now() - startedAt,
  }).then(({ error }) => { if (error) console.error("dm_agent_usage insert error:", error); });

  sb.from("dm_rate_limits").insert({ user_id: user.id, endpoint: ENDPOINT_NAME })
    .then(({ error }) => { if (error) console.error("dm_rate_limits insert error:", error); });

  return jsonResponse({
    reply: textBlock?.text ?? (incomplete ? "Não consegui terminar esta análise — tenta reformular ou dividir o pedido." : "Feito."),
    updatedHistory: [...messages, { role: "assistant", content: response.content }],
    invalidateKeys: [] as string[],
    pendingActions,
    incomplete,
  });
});
