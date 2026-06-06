import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js";

const FINNHUB_KEY = Deno.env.get("FINNHUB_KEY") ?? "";

const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });

const SYSTEM_PROMPT = `És o assistente financeiro pessoal integrado no DeskMint.
Tens acesso à carteira real do utilizador, ao perfil de investidor e a notícias de mercado.

Regras:
- Responde sempre em português europeu, de forma direta e concreta
- Usa os dados reais quando disponíveis — não inventes valores
- Nunca recomendas comprar ou vender ativos específicos; podes analisar, mas a decisão é do utilizador
- Formata valores monetários em EUR (ex: 1 234,56 €)
- Quando te perguntarem sobre a carteira, chama get_portfolio para teres dados reais
- Para análise de diversificação/concentração, chama analyze_portfolio
- Para notícias de um ativo, chama get_news com o ticker
- Para contexto do perfil do investidor, chama get_user_profile`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: "get_portfolio",
    description:
      "Obtém todos os ativos do portfolio: nome, ticker, tipo, broker, unidades, preço médio, capital investido, valor atual e P/L.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_user_profile",
    description:
      "Obtém o perfil do investidor: tipo de investidor, objetivo, horizonte temporal, plano de reforma e cenários.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_news",
    description: "Obtém as últimas notícias de mercado para um ticker específico.",
    input_schema: {
      type: "object",
      properties: {
        ticker: {
          type: "string",
          description: "Símbolo do ticker (ex: AAPL, VWCE, MSFT)",
        },
      },
      required: ["ticker"],
    },
  },
  {
    name: "analyze_portfolio",
    description:
      "Analisa a concentração e diversificação do portfolio: alocação por tipo de ativo, por broker e maior posição.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
];

// ─── Implementação das ferramentas ───────────────────────────────────────────

async function getPortfolio(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await supabase
    .from("dm_portfolio_assets")
    .select("*")
    .eq("user_id", userId)
    .order("is_extra");

  if (error) throw new Error(`Erro ao ler portfolio: ${error.message}`);

  const assets = data ?? [];
  const totalValue = assets.reduce((s: number, a: { current_value: number }) => s + a.current_value, 0);
  const totalCapital = assets.reduce((s: number, a: { capital_invested: number }) => s + a.capital_invested, 0);
  const pl = totalValue - totalCapital;

  return {
    ativos: assets.map((a: {
      name: string; ticker: string; asset_type: string; broker: string;
      units: number; avg_price: number; capital_invested: number;
      current_value: number; allocation: number | null; is_extra: boolean;
    }) => ({
      nome: a.name,
      ticker: a.ticker,
      tipo: a.asset_type,
      broker: a.broker,
      unidades: a.units,
      precoMedio: a.avg_price,
      capitalInvestido: a.capital_invested,
      valorAtual: a.current_value,
      pl: +(a.current_value - a.capital_invested).toFixed(2),
      plPct:
        a.capital_invested > 0
          ? (((a.current_value - a.capital_invested) / a.capital_invested) * 100).toFixed(2) + "%"
          : "0%",
      alocacao: a.allocation != null ? (a.allocation * 100).toFixed(1) + "%" : "N/A",
      isExtra: a.is_extra,
    })),
    resumo: {
      totalAtivos: assets.length,
      valorTotal: totalValue.toFixed(2),
      capitalInvestido: totalCapital.toFixed(2),
      pl: pl.toFixed(2),
      plPct:
        totalCapital > 0
          ? ((pl / totalCapital) * 100).toFixed(2) + "%"
          : "0%",
    },
  };
}

async function getUserProfile(supabase: ReturnType<typeof createClient>, userId: string) {
  const [profileRes, retirementRes] = await Promise.all([
    supabase.from("dm_profiles").select("*").eq("id", userId).single(),
    supabase
      .from("dm_retirement_plans")
      .select("*, dm_retirement_scenarios(*)")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  return {
    perfil: profileRes.data
      ? {
          tipoInvestidor: profileRes.data.investor_type,
          objetivo: profileRes.data.invest_goal,
          horizonteTemporal: profileRes.data.time_horizon,
          anoNascimento: profileRes.data.birth_year,
          idadeReforma: profileRes.data.retirement_age,
          investimentoMensal: profileRes.data.monthly_invest,
          plano: profileRes.data.plan,
        }
      : null,
    reforma: retirementRes.data
      ? {
          idadeAtual: retirementRes.data.current_age,
          idadeReforma: retirementRes.data.retirement_age,
          contribuicaoMensal: retirementRes.data.monthly_contrib,
          capitalInicial: retirementRes.data.initial_capital,
          cenarios: retirementRes.data.dm_retirement_scenarios,
        }
      : null,
  };
}

async function getNews(ticker: string) {
  if (!FINNHUB_KEY) return { erro: "Finnhub key não configurada" };

  const cleanTicker = ticker.split(".")[0].toUpperCase();
  const to = new Date().toISOString().split("T")[0];
  const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const url = `https://finnhub.io/api/v1/company-news?symbol=${cleanTicker}&from=${from}&to=${to}&token=${FINNHUB_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return { erro: `Erro Finnhub: ${res.status}` };

  const data = await res.json();
  const noticias = Array.isArray(data) ? data.slice(0, 5) : [];

  return {
    ticker,
    noticias: noticias.map((n: { headline: string; summary?: string; source: string; datetime: number }) => ({
      titulo: n.headline,
      resumo: n.summary?.slice(0, 250) ?? "",
      fonte: n.source,
      data: new Date(n.datetime * 1000).toLocaleDateString("pt-PT"),
    })),
  };
}

async function analyzePortfolio(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data } = await supabase
    .from("dm_portfolio_assets")
    .select("name, ticker, asset_type, broker, current_value, capital_invested, is_extra")
    .eq("user_id", userId);

  const assets = data ?? [];
  if (assets.length === 0) return { erro: "Portfolio vazio" };

  const totalValue = assets.reduce(
    (s: number, a: { current_value: number }) => s + a.current_value,
    0
  );

  const porTipo: Record<string, { valor: number; count: number }> = {};
  const porBroker: Record<string, number> = {};

  for (const a of assets as { asset_type: string; broker: string; current_value: number }[]) {
    porTipo[a.asset_type] = porTipo[a.asset_type] ?? { valor: 0, count: 0 };
    porTipo[a.asset_type].valor += a.current_value;
    porTipo[a.asset_type].count += 1;
    porBroker[a.broker] = (porBroker[a.broker] ?? 0) + a.current_value;
  }

  const sorted = [...(assets as { name: string; ticker: string; current_value: number }[])].sort(
    (a, b) => b.current_value - a.current_value
  );
  const top = sorted[0];

  return {
    totalAtivos: assets.length,
    valorTotal: totalValue.toFixed(2),
    alocacaoPorTipo: Object.entries(porTipo).map(([tipo, { valor, count }]) => ({
      tipo,
      valor: valor.toFixed(2),
      pct: ((valor / totalValue) * 100).toFixed(1) + "%",
      count,
    })),
    alocacaoPorBroker: Object.entries(porBroker).map(([broker, valor]) => ({
      broker,
      valor: valor.toFixed(2),
      pct: ((valor / totalValue) * 100).toFixed(1) + "%",
    })),
    maiorPosicao: {
      nome: top.name,
      ticker: top.ticker,
      valor: top.current_value.toFixed(2),
      pct: ((top.current_value / totalValue) * 100).toFixed(1) + "%",
    },
  };
}

// ─── Handler principal ────────────────────────────────────────────────────────

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST")
    return new Response("Method Not Allowed", { status: 405, headers: CORS });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader)
    return new Response(JSON.stringify({ error: "Sem autorização" }), {
      status: 401,
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

  if (authError || !user)
    return new Response(JSON.stringify({ error: "Token inválido" }), {
      status: 401,
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  const { message, history = [] } = await req.json();

  const messages: Anthropic.MessageParam[] = [
    ...history,
    { role: "user", content: message },
  ];

  let response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    tools: TOOLS,
    messages,
  });

  // Loop agêntico: enquanto o modelo pedir ferramentas, executa-as
  while (response.stop_reason === "tool_use") {
    const toolUses = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );

    messages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const tu of toolUses) {
      let result: unknown;
      try {
        if (tu.name === "get_portfolio") {
          result = await getPortfolio(supabase, user.id);
        } else if (tu.name === "get_user_profile") {
          result = await getUserProfile(supabase, user.id);
        } else if (tu.name === "get_news") {
          result = await getNews((tu.input as { ticker: string }).ticker);
        } else if (tu.name === "analyze_portfolio") {
          result = await analyzePortfolio(supabase, user.id);
        } else {
          result = { erro: `Ferramenta desconhecida: ${tu.name}` };
        }
      } catch (e) {
        result = { erro: String(e) };
      }

      toolResults.push({
        type: "tool_result",
        tool_use_id: tu.id,
        content: JSON.stringify(result),
      });
    }

    messages.push({ role: "user", content: toolResults });

    response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages,
    });
  }

  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === "text"
  );

  return new Response(
    JSON.stringify({
      reply: textBlock?.text ?? "Sem resposta.",
      updatedHistory: [
        ...messages,
        { role: "assistant", content: response.content },
      ],
    }),
    { headers: { ...CORS, "Content-Type": "application/json" } }
  );
});
