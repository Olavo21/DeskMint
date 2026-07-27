import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js";

const FINNHUB_KEY = Deno.env.get("FINNHUB_KEY") ?? "";
const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });

// ─── System Prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `És o DeskMint Financial Assistant — um copiloto financeiro inteligente, determinístico e altamente preciso integrado na aplicação DeskMint.

## PRINCÍPIOS OPERACIONAIS

1. **Zero Alucinação / Precisão Absoluta:**
   - Nunca inventes ou estimes números sem base nos dados reais do utilizador.
   - Todos os cálculos (totais, percentagens, projeções, pesos de ativos) devem basear-se exclusivamente nos dados obtidos pelas ferramentas.

2. **Resposta Estruturada e Escaneável:**
   - Usa o template de output abaixo para respostas estruturadas.
   - Valores monetários formatados em EUR (ex: 1 234,56 €).
   - Usa emojis de cabeçalho, **negrito** para métricas-chave e bullet points.
   - Respostas concisas — sem blocos de texto longos.

3. **Privacidade:**
   - Processa cálculos estritamente em referência a métricas de portefólio.
   - Nunca divulgas IDs internos ou dados sensíveis de autenticação.

4. **Idioma:** Responde sempre em português europeu (pt-PT).

5. **Sem recomendações de compra/venda:** Podes analisar, mas a decisão é sempre do utilizador.

---

## TEMPLATE DE OUTPUT

Usa SEMPRE este formato para respostas com dados:

### 📊 [Título do Intent]

* **[Métrica Principal]:** [Valor]
* **[Métrica Secundária]:** [Valor]

> **Insight:** [1 frase clara, acionável, com base nos dados calculados]

---

## INTENTS E COMO RESPONDER

### CATEGORIA A — Visão Geral & Liquidez

**GET_TOTAL_INVESTED_AND_NAV** — "Quanto investi no total e qual é o valor atual?"
→ Usa get_portfolio. Devolve: capital_invested, valor_atual, ganho_absoluto (€), ganho_percentual (%).

**GET_TOP_PERFORMERS** — "Qual é a minha melhor e pior posição?"
→ Usa get_portfolio. Identifica o ativo com maior % de retorno e o com menor % de retorno.

### CATEGORIA B — Projeções & Estimativas

**PROJECT_FUTURE_WEALTH** — "Se mantiver este ritmo, quanto terei daqui a X anos?"
→ Usa get_portfolio (PV) e get_user_profile (monthly_invest como PMT).
→ Taxa anual padrão: 7% (r_anual = 0,07). Converte para mensal: r = r_anual/12. n = anos × 12.
→ Fórmula: FV = PV(1+r)^n + PMT × ((1+r)^n − 1) / r
→ Apresenta FV para o horizonte pedido. Se o horizonte não for especificado, usa 5, 10 e 20 anos.

**GOAL_CALCULATOR** — "Quanto preciso de investir por mês para atingir X€?"
→ Usa get_portfolio (PV atual). Pede FV e n (horizonte em anos) ao utilizador se não fornecidos.
→ Fórmula PMT: PMT = (FV − PV(1+r)^n) × r / ((1+r)^n − 1)
→ Taxa padrão: 7% a.a.

### CATEGORIA C — Risco & Diversificação

**GET_ASSET_ALLOCATION** — "Como está dividida a minha carteira?"
→ Usa analyze_portfolio. Devolve % por tipo de ativo (ETF, Ação, Cripto, etc.) e por broker.

**GET_CONCENTRATION_RISK** — "Qual o ativo com maior peso?"
→ Usa analyze_portfolio. Identifica a maior posição. Se > 50% do total, avisa sobre concentração excessiva.

### CATEGORIA D — Fiscalidade & Histórico

**ESTIMATE_UNREALIZED_TAX** — "Qual seria o meu imposto se vendesse tudo hoje?"
→ Usa get_portfolio. Calcula: Mais-valias = valorAtual − capitalInvestido.
→ Aplica taxa PT por defeito: 28% sobre mais-valias positivas.
→ Apresenta: mais-valias brutas, imposto estimado (€), valor líquido após imposto.

**GET_EXPENSE_TRENDS** — "Quanto gastei ou investi nos últimos meses?"
→ Usa get_expense_trends. Apresenta evolução mensal e média.

---

Quando o utilizador fizer uma pergunta que não se enquadre nos intents acima, responde com base nos dados disponíveis das ferramentas, sempre em formato estruturado.`;

// ─── Tool Definitions ──────────────────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: "get_portfolio",
    description:
      "Obtém todos os ativos do portefólio: nome, ticker, tipo, broker, unidades, preço médio, capital investido, valor atual e P/L. Essencial para cálculos de visão geral, projeções e fiscalidade.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_user_profile",
    description:
      "Obtém o perfil do investidor: tipo de investidor, objetivo, horizonte temporal, investimento mensal (monthly_invest), plano de reforma e cenários. Usa monthly_invest como PMT nas projeções.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "analyze_portfolio",
    description:
      "Analisa concentração e diversificação: alocação % por tipo de ativo (ETF, Ação, Cripto…) e por broker, maior posição e respetivo peso. Usa para GET_ASSET_ALLOCATION e GET_CONCENTRATION_RISK.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_expense_trends",
    description:
      "Retorna o total de despesas registadas nos últimos 3 meses, agrupados por mês e por categoria, e a média mensal. Útil para GET_EXPENSE_TRENDS e contexto de poupança.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_news",
    description: "Obtém as últimas notícias de mercado para um ticker específico via Finnhub.",
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
];

// ─── Tool Implementations ──────────────────────────────────────────────────────

async function getPortfolio(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await supabase
    .from("dm_portfolio_assets")
    .select("*")
    .eq("user_id", userId)
    .order("current_value", { ascending: false });

  if (error) throw new Error(`Erro ao ler portefólio: ${error.message}`);

  const assets = data ?? [];
  const totalValue   = assets.reduce((s: number, a: { current_value: number }) => s + (a.current_value ?? 0), 0);
  const totalCapital = assets.reduce((s: number, a: { capital_invested: number }) => s + (a.capital_invested ?? 0), 0);
  const pl = totalValue - totalCapital;
  const plPct = totalCapital > 0 ? ((pl / totalCapital) * 100) : 0;

  return {
    ativos: assets.map((a: {
      name: string; ticker: string; asset_type: string; broker: string;
      units: number; avg_price: number; capital_invested: number;
      current_value: number; allocation: number | null;
    }) => {
      const ativoPl = (a.current_value ?? 0) - (a.capital_invested ?? 0);
      const ativoPct = a.capital_invested > 0 ? ((ativoPl / a.capital_invested) * 100) : 0;
      return {
        nome: a.name,
        ticker: a.ticker,
        tipo: a.asset_type,
        broker: a.broker,
        unidades: a.units,
        precoMedio: a.avg_price,
        capitalInvestido: +(a.capital_invested ?? 0).toFixed(2),
        valorAtual: +(a.current_value ?? 0).toFixed(2),
        pl: +ativoPl.toFixed(2),
        plPct: +ativoPct.toFixed(2),
        peso: totalValue > 0 ? +((a.current_value / totalValue) * 100).toFixed(1) : 0,
      };
    }),
    resumo: {
      totalAtivos: assets.length,
      valorTotal: +totalValue.toFixed(2),
      capitalInvestido: +totalCapital.toFixed(2),
      pl: +pl.toFixed(2),
      plPct: +plPct.toFixed(2),
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
          investimentoMensalTarget: profileRes.data.monthly_invest ?? 0,
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

async function analyzePortfolio(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data } = await supabase
    .from("dm_portfolio_assets")
    .select("name, ticker, asset_type, broker, current_value, capital_invested")
    .eq("user_id", userId);

  const assets = data ?? [];
  if (assets.length === 0) return { erro: "Portefólio vazio" };

  const totalValue = assets.reduce(
    (s: number, a: { current_value: number }) => s + (a.current_value ?? 0), 0
  );

  const porTipo: Record<string, { valor: number; count: number }> = {};
  const porBroker: Record<string, number> = {};

  for (const a of assets as { asset_type: string; broker: string; current_value: number }[]) {
    porTipo[a.asset_type] = porTipo[a.asset_type] ?? { valor: 0, count: 0 };
    porTipo[a.asset_type].valor += a.current_value ?? 0;
    porTipo[a.asset_type].count += 1;
    porBroker[a.broker] = (porBroker[a.broker] ?? 0) + (a.current_value ?? 0);
  }

  const sorted = [...(assets as { name: string; ticker: string; current_value: number }[])]
    .sort((a, b) => (b.current_value ?? 0) - (a.current_value ?? 0));
  const top = sorted[0];
  const topPct = totalValue > 0 ? ((top.current_value / totalValue) * 100) : 0;

  return {
    totalAtivos: assets.length,
    valorTotal: +totalValue.toFixed(2),
    alocacaoPorTipo: Object.entries(porTipo).map(([tipo, { valor, count }]) => ({
      tipo,
      valor: +valor.toFixed(2),
      pct: +((valor / totalValue) * 100).toFixed(1),
      count,
    })).sort((a, b) => b.pct - a.pct),
    alocacaoPorBroker: Object.entries(porBroker).map(([broker, valor]) => ({
      broker,
      valor: +valor.toFixed(2),
      pct: +((valor / totalValue) * 100).toFixed(1),
    })).sort((a, b) => b.pct - a.pct),
    maiorPosicao: {
      nome: top.name,
      ticker: top.ticker,
      valor: +(top.current_value ?? 0).toFixed(2),
      pct: +topPct.toFixed(1),
      alertaConcentracao: topPct > 50,
    },
  };
}

async function getExpenseTrends(supabase: ReturnType<typeof createClient>, userId: string) {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const { data, error } = await supabase
    .from("dm_expenses")
    .select("amount, date, category")
    .eq("user_id", userId)
    .gte("date", threeMonthsAgo.toISOString().split("T")[0])
    .order("date", { ascending: false });

  if (error) return { erro: `Erro: ${error.message}` };

  const expenses = data ?? [];
  const byMonth: Record<string, { total: number; byCategory: Record<string, number> }> = {};

  for (const e of expenses as { amount: number; date: string; category: string }[]) {
    const month = e.date.slice(0, 7);
    byMonth[month] = byMonth[month] ?? { total: 0, byCategory: {} };
    byMonth[month].total += e.amount ?? 0;
    byMonth[month].byCategory[e.category] = (byMonth[month].byCategory[e.category] ?? 0) + (e.amount ?? 0);
  }

  const months = Object.entries(byMonth)
    .map(([mes, { total, byCategory }]) => ({ mes, total: +total.toFixed(2), byCategory }))
    .sort((a, b) => b.mes.localeCompare(a.mes));

  const avgMonthly = months.length > 0
    ? +(months.reduce((s, m) => s + m.total, 0) / months.length).toFixed(2)
    : 0;

  return { ultimosMeses: months, mediaMonsal: avgMonthly };
}

async function getNews(ticker: string) {
  if (!FINNHUB_KEY) return { erro: "Finnhub key não configurada" };

  const cleanTicker = ticker.split(".")[0].toUpperCase();
  const to   = new Date().toISOString().split("T")[0];
  const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const url = `https://finnhub.io/api/v1/company-news?symbol=${cleanTicker}&from=${from}&to=${to}&token=${FINNHUB_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return { erro: `Erro Finnhub: ${res.status}` };

  const data = await res.json();
  const noticias = Array.isArray(data) ? data.slice(0, 5) : [];

  return {
    ticker: cleanTicker,
    noticias: noticias.map((n: { headline: string; summary?: string; source: string; datetime: number }) => ({
      titulo: n.headline,
      resumo: n.summary?.slice(0, 200) ?? "",
      fonte: n.source,
      data: new Date(n.datetime * 1000).toLocaleDateString("pt-PT"),
    })),
  };
}

// ─── CORS & Handler ───────────────────────────────────────────────────────────

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
      status: 401, headers: { ...CORS, "Content-Type": "application/json" },
    });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace("Bearer ", "")
  );

  if (authError || !user)
    return new Response(JSON.stringify({ error: "Token inválido" }), {
      status: 401, headers: { ...CORS, "Content-Type": "application/json" },
    });

  const { message, history = [] } = await req.json();

  const messages: Anthropic.MessageParam[] = [
    ...history,
    { role: "user", content: message },
  ];

  let response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    tools: TOOLS,
    messages,
  });

  // Agentic loop: execute tools until the model produces a final text response
  while (response.stop_reason === "tool_use") {
    const toolUses = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );

    messages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const tu of toolUses) {
      let result: unknown;
      try {
        switch (tu.name) {
          case "get_portfolio":
            result = await getPortfolio(supabase, user.id); break;
          case "get_user_profile":
            result = await getUserProfile(supabase, user.id); break;
          case "analyze_portfolio":
            result = await analyzePortfolio(supabase, user.id); break;
          case "get_expense_trends":
            result = await getExpenseTrends(supabase, user.id); break;
          case "get_news":
            result = await getNews((tu.input as { ticker: string }).ticker); break;
          default:
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
      max_tokens: 2048,
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
      updatedHistory: [...messages, { role: "assistant", content: response.content }],
    }),
    { headers: { ...CORS, "Content-Type": "application/json" } }
  );
});
