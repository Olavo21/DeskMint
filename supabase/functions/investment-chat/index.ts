import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js";

const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });

const SYSTEM = `És o assistente virtual exclusivo do DeskMint — uma plataforma premium de gestão financeira e tracking de comissões de hotelaria. O utilizador chama-se Sr. Mint.

Identidade e tom:
- Profissional e direto, linguagem de alta finança mas de leitura rápida
- Motivador e assertivo — nunca vago ou genérico
- Respostas curtas: máx. 3-4 frases por resposta, sempre com dados concretos
- Nunca uses introduções longas; vai direto ao insight

Âmbito de actuação:
1. Portefólio de investimentos — análise de performance, P/L, diversificação, actualizações de cotações e registo de transacções
2. Comissões de hotelaria — quando perguntado sobre comissões, foca-te em: média semanal, produto mais rentável (ex: Táxis, Transfers, Excursões), tendência vs. período anterior e projecção de crescimento

Ferramentas disponíveis (portefólio):
1. get_portfolio — lê todos os ativos com IDs reais (usa SEMPRE primeiro para confirmar o ativo)
2. analyze_portfolio — análise de diversificação/concentração/P/L
3. update_asset_value — actualiza cotação de um ativo (% ou preço fixo)
4. add_transaction — regista nova compra/aporte num ativo existente

Regras de ferramentas:
- Chama get_portfolio ANTES de qualquer update_asset_value ou add_transaction para obter o ID correcto
- Percentagens negativas: "caiu 2%" → value = -2; positivas: "subiu 1,5%" → value = 1.5
- Preço fixo: "está a 450€" / "para 450€" → modification_type = fixed_value, value = 450
- Aportes: regista o que o utilizador diz — não suponhas unidades se não foram mencionadas
- Confirma sempre com valores exactos: "VWCE: 450,00 € → 441,00 €" ou "Aporte de 200 € registado no VWCE (capital: 1 200 € → 1 400 €)"
- Nunca recomendas comprar/vender — apenas registas o que é pedido
- Se o ativo não existir no portefólio, informa claramente

Regras gerais:
- Responde SEMPRE em português europeu
- Acções de escrita: máx. 2 frases de confirmação, sem pedir confirmação prévia
- Análise/leitura: até 4 frases, dados concretos, sem padding`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: "get_portfolio",
    description:
      "Lista todos os ativos do portefólio com IDs, tickers, nomes, capital investido, valor actual e P/L. Usa sempre antes de qualquer acção de escrita.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "analyze_portfolio",
    description:
      "Analisa diversificação, concentração e P/L do portefólio por tipo de ativo e por broker.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "update_asset_value",
    description:
      "Actualiza o valor de mercado actual de um ativo do portefólio.",
    input_schema: {
      type: "object",
      properties: {
        asset_id: {
          type: "string",
          description: "ID do ativo obtido via get_portfolio",
        },
        modification_type: {
          type: "string",
          enum: ["percentage_change", "fixed_value"],
          description:
            "percentage_change: variação % (ex: -2 para -2%, 1.5 para +1,5%); fixed_value: novo valor total em €",
        },
        value: {
          type: "number",
          description: "Valor da variação % ou novo valor fixo em €",
        },
      },
      required: ["asset_id", "modification_type", "value"],
    },
  },
  {
    name: "add_transaction",
    description:
      "Regista uma nova compra/aporte num ativo existente. Aumenta o capital investido e recalcula o preço médio se as unidades forem fornecidas.",
    input_schema: {
      type: "object",
      properties: {
        asset_id: {
          type: "string",
          description: "ID do ativo obtido via get_portfolio",
        },
        amount_invested_eur: {
          type: "number",
          description: "Montante investido em EUR",
        },
        units_bought: {
          type: "number",
          description:
            "Número de unidades compradas (opcional — omite se o utilizador não mencionou)",
        },
      },
      required: ["asset_id", "amount_invested_eur"],
    },
  },
];

// ─── Tool implementations ─────────────────────────────────────────────────────

type SB = ReturnType<typeof createClient>;

async function getPortfolio(sb: SB, uid: string) {
  const { data, error } = await sb
    .from("dm_portfolio_assets")
    .select(
      "id, name, ticker, asset_type, broker, units, avg_price, capital_invested, current_value, allocation, is_extra"
    )
    .eq("user_id", uid)
    .order("current_value", { ascending: false });

  if (error) return { erro: error.message };

  const assets = data ?? [];
  const totalValue   = assets.reduce((s: number, a: { current_value: number }) => s + a.current_value, 0);
  const totalCapital = assets.reduce((s: number, a: { capital_invested: number }) => s + a.capital_invested, 0);

  return {
    ativos: assets.map((a: {
      id: string; name: string; ticker: string; asset_type: string; broker: string;
      units: number; avg_price: number; capital_invested: number;
      current_value: number; allocation: number | null; is_extra: boolean;
    }) => ({
      id: a.id,
      ticker: a.ticker,
      nome: a.name,
      tipo: a.asset_type,
      broker: a.broker,
      unidades: a.units,
      precoMedio: a.avg_price,
      capitalInvestido: a.capital_invested,
      valorAtual: a.current_value,
      pl: +(a.current_value - a.capital_invested).toFixed(2),
      plPct: a.capital_invested > 0
        ? (((a.current_value - a.capital_invested) / a.capital_invested) * 100).toFixed(2) + "%"
        : "0%",
      isExtra: a.is_extra,
    })),
    resumo: {
      valorTotal: totalValue.toFixed(2),
      capitalInvestido: totalCapital.toFixed(2),
      pl: (totalValue - totalCapital).toFixed(2),
      plPct: totalCapital > 0
        ? (((totalValue - totalCapital) / totalCapital) * 100).toFixed(2) + "%"
        : "0%",
    },
  };
}

async function analyzePortfolio(sb: SB, uid: string) {
  const { data } = await sb
    .from("dm_portfolio_assets")
    .select("name, ticker, asset_type, broker, current_value, capital_invested")
    .eq("user_id", uid);

  const assets = data ?? [];
  if (!assets.length) return { erro: "Portefólio vazio" };

  const total = (assets as { current_value: number }[]).reduce((s, a) => s + a.current_value, 0);

  const porTipo: Record<string, { valor: number; count: number }> = {};
  const porBroker: Record<string, number> = {};

  for (const a of assets as { asset_type: string; broker: string; current_value: number }[]) {
    porTipo[a.asset_type]  = porTipo[a.asset_type]  ?? { valor: 0, count: 0 };
    porTipo[a.asset_type].valor += a.current_value;
    porTipo[a.asset_type].count += 1;
    porBroker[a.broker] = (porBroker[a.broker] ?? 0) + a.current_value;
  }

  const sorted = [...(assets as { name: string; ticker: string; current_value: number }[])]
    .sort((a, b) => b.current_value - a.current_value);

  return {
    valorTotal: total.toFixed(2),
    porTipo: Object.entries(porTipo).map(([tipo, { valor, count }]) => ({
      tipo, count,
      valor: valor.toFixed(2),
      pct:   ((valor / total) * 100).toFixed(1) + "%",
    })),
    porBroker: Object.entries(porBroker).map(([broker, valor]) => ({
      broker,
      valor: valor.toFixed(2),
      pct:   ((valor / total) * 100).toFixed(1) + "%",
    })),
    maiorPosicao: {
      nome:   sorted[0].name,
      ticker: sorted[0].ticker,
      valor:  sorted[0].current_value.toFixed(2),
      pct:    ((sorted[0].current_value / total) * 100).toFixed(1) + "%",
    },
  };
}

async function updateAssetValue(
  sb: SB,
  uid: string,
  assetId: string,
  modType: "percentage_change" | "fixed_value",
  value: number,
  invalidateKeys: Set<string>,
): Promise<object> {
  const { data: asset, error: fetchErr } = await sb
    .from("dm_portfolio_assets")
    .select("id, name, ticker, current_value")
    .eq("id", assetId)
    .eq("user_id", uid)
    .single();

  if (fetchErr || !asset) return { sucesso: false, erro: "Ativo não encontrado" };

  const newValue = modType === "percentage_change"
    ? +(asset.current_value * (1 + value / 100)).toFixed(2)
    : +value.toFixed(2);

  const { error } = await sb
    .from("dm_portfolio_assets")
    .update({ current_value: newValue, last_updated: new Date().toISOString() })
    .eq("id", assetId)
    .eq("user_id", uid);

  if (error) return { sucesso: false, erro: error.message };

  invalidateKeys.add("portfolio");
  return {
    sucesso: true,
    ativo: asset.ticker || asset.name,
    valorAnterior: asset.current_value,
    novoValor: newValue,
    variacao: modType === "percentage_change"
      ? `${value > 0 ? "+" : ""}${value}%`
      : `fixo ${newValue} €`,
  };
}

async function addTransaction(
  sb: SB,
  uid: string,
  assetId: string,
  amountEur: number,
  unitsBought: number | undefined,
  invalidateKeys: Set<string>,
): Promise<object> {
  const { data: asset, error: fetchErr } = await sb
    .from("dm_portfolio_assets")
    .select("id, name, ticker, capital_invested, units, avg_price")
    .eq("id", assetId)
    .eq("user_id", uid)
    .single();

  if (fetchErr || !asset) return { sucesso: false, erro: "Ativo não encontrado" };

  const newCapital = +(asset.capital_invested + amountEur).toFixed(2);
  const update: Record<string, unknown> = {
    capital_invested: newCapital,
    last_updated: new Date().toISOString(),
  };

  if (unitsBought != null && unitsBought > 0) {
    const newUnits    = +(asset.units + unitsBought).toFixed(6);
    const newAvgPrice = +(newCapital / newUnits).toFixed(4);
    update.units     = newUnits;
    update.avg_price = newAvgPrice;
  }

  const { error } = await sb
    .from("dm_portfolio_assets")
    .update(update)
    .eq("id", assetId)
    .eq("user_id", uid);

  if (error) return { sucesso: false, erro: error.message };

  invalidateKeys.add("portfolio");
  return {
    sucesso: true,
    ativo: asset.ticker || asset.name,
    capitalAnterior: asset.capital_invested,
    novoCapital: newCapital,
    aporte: amountEur,
    ...(unitsBought != null ? {
      unidadesCompradas: unitsBought,
      novasUnidades: +(asset.units + unitsBought).toFixed(6),
      novoPrecoMedio: +(newCapital / (asset.units + unitsBought)).toFixed(4),
    } : {}),
  };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

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

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: { user }, error: authError } =
    await sb.auth.getUser(authHeader.replace("Bearer ", ""));

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

  const invalidateKeys = new Set<string>();

  let response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: SYSTEM,
    tools: TOOLS,
    messages,
  });

  while (response.stop_reason === "tool_use") {
    const toolUses = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );

    messages.push({ role: "assistant", content: response.content });
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const tu of toolUses) {
      const inp = tu.input as Record<string, unknown>;
      let result: unknown;

      try {
        switch (tu.name) {
          case "get_portfolio":
            result = await getPortfolio(sb, user.id);
            break;
          case "analyze_portfolio":
            result = await analyzePortfolio(sb, user.id);
            break;
          case "update_asset_value":
            result = await updateAssetValue(
              sb, user.id,
              inp.asset_id as string,
              inp.modification_type as "percentage_change" | "fixed_value",
              inp.value as number,
              invalidateKeys,
            );
            break;
          case "add_transaction":
            result = await addTransaction(
              sb, user.id,
              inp.asset_id as string,
              inp.amount_invested_eur as number,
              inp.units_bought as number | undefined,
              invalidateKeys,
            );
            break;
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
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM,
      tools: TOOLS,
      messages,
    });
  }

  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === "text",
  );

  return new Response(
    JSON.stringify({
      reply: textBlock?.text ?? "Feito.",
      updatedHistory: [...messages, { role: "assistant", content: response.content }],
      invalidateKeys: [...invalidateKeys],
    }),
    { headers: { ...CORS, "Content-Type": "application/json" } },
  );
});
