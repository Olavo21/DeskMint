import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js";

const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });

const SYSTEM = `És o assistente de ações rápidas do DeskMint, app de gestão financeira pessoal.

Podes executar estas ações directas na conta do utilizador:
1. Actualizar o valor de um ativo do portefólio
2. Registar uma despesa no mês corrente
3. Mover uma comissão de estado (Pendente → Por Pagar → Paga)
4. Registar uma nova comissão

Regras:
- Responde SEMPRE em português europeu, de forma concisa
- Executa as acções imediatamente ao ser pedido — não peças confirmação
- Confirma o que fizeste com os valores exactos em EUR (ex: 1 234,56 €)
- Para actualizar preços: "caiu X%" → percentage_change negativo; "está a X€" → fixed_value
- Para despesas: chama get_expense_categories primeiro para escolher a categoria correcta
- Para mover comissões: chama get_commissions primeiro para obter o ID correcto
- Se não encontrares um ativo ou comissão, avisa claramente — nunca advinhas`;

// ─── Definição das ferramentas ────────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  // Leitura
  {
    name: "get_portfolio",
    description: "Obtém os ativos do portefólio com ids, tickers, nomes e valores actuais.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_commissions",
    description: "Obtém as comissões pendentes e por pagar (com IDs para mover estado).",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_expense_categories",
    description: "Obtém as categorias de despesa do utilizador para escolher a mais adequada.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  // Escrita
  {
    name: "update_asset_price",
    description: "Actualiza o valor actual de um ativo do portefólio.",
    input_schema: {
      type: "object",
      properties: {
        asset_identifier: {
          type: "string",
          description: "Ticker ou parte do nome do ativo (ex: VWCE, Apple, Nasdaq)",
        },
        modification_type: {
          type: "string",
          enum: ["percentage_change", "fixed_value"],
          description: "percentage_change: variação % (ex: -2.5); fixed_value: novo valor em €",
        },
        value: {
          type: "number",
          description: "Valor da variação (ex: -2.5 para -2,5%) ou novo valor fixo (ex: 450.00)",
        },
      },
      required: ["asset_identifier", "modification_type", "value"],
    },
  },
  {
    name: "register_expense",
    description: "Regista uma nova despesa no mês e ano correntes.",
    input_schema: {
      type: "object",
      properties: {
        description: { type: "string", description: "Descrição da despesa" },
        amount: { type: "number", description: "Valor em euros" },
        category_id: {
          type: "string",
          description: "ID da categoria (obtém com get_expense_categories)",
        },
      },
      required: ["description", "amount", "category_id"],
    },
  },
  {
    name: "move_commission",
    description: "Move uma comissão para o próximo estado (PENDING→TO_PAY ou TO_PAY→PAID).",
    input_schema: {
      type: "object",
      properties: {
        commission_id: {
          type: "string",
          description: "ID da comissão (obtém com get_commissions)",
        },
        to_status: {
          type: "string",
          enum: ["TO_PAY", "PAID"],
          description: "TO_PAY: mover para Por Pagar; PAID: marcar como Paga",
        },
      },
      required: ["commission_id", "to_status"],
    },
  },
  {
    name: "add_commission",
    description: "Regista uma nova comissão no estado Pendente.",
    input_schema: {
      type: "object",
      properties: {
        description: { type: "string", description: "Descrição do serviço prestado" },
        amount: { type: "number", description: "Valor em euros" },
        client: { type: "string", description: "Nome do cliente (opcional)" },
        earned_at: {
          type: "string",
          description: "Data ISO do serviço (opcional, default: hoje)",
        },
      },
      required: ["description", "amount"],
    },
  },
];

// ─── Implementação das ferramentas ────────────────────────────────────────────

type SB = ReturnType<typeof createClient>;

async function getPortfolio(sb: SB, uid: string) {
  const { data } = await sb
    .from("dm_portfolio_assets")
    .select("id, name, ticker, asset_type, broker, current_value, capital_invested")
    .eq("user_id", uid)
    .order("current_value", { ascending: false });
  return data ?? [];
}

async function getCommissions(sb: SB, uid: string) {
  const { data } = await sb
    .from("dm_commissions")
    .select("id, description, client, amount, status, expected_at, earned_at")
    .eq("user_id", uid)
    .in("status", ["PENDING", "TO_PAY"])
    .order("earned_at", { ascending: false });
  return data ?? [];
}

async function getExpenseCategories(sb: SB, uid: string) {
  const { data } = await sb
    .from("dm_expense_categories")
    .select("id, name, type, icon")
    .eq("user_id", uid);
  return data ?? [];
}

async function updateAssetPrice(
  sb: SB,
  uid: string,
  identifier: string,
  modType: "percentage_change" | "fixed_value",
  value: number,
  invalidateKeys: Set<string>
) {
  const { data: assets } = await sb
    .from("dm_portfolio_assets")
    .select("id, name, ticker, current_value")
    .eq("user_id", uid);

  const search = identifier.toLowerCase();
  const match = (assets ?? []).find(
    (a: { ticker: string; name: string }) =>
      a.ticker.toLowerCase().includes(search) ||
      a.name.toLowerCase().includes(search)
  ) as { id: string; name: string; ticker: string; current_value: number } | undefined;

  if (!match) {
    return { sucesso: false, erro: `Não encontrei nenhum ativo com "${identifier}" no portefólio.` };
  }

  const newValue =
    modType === "percentage_change"
      ? match.current_value * (1 + value / 100)
      : value;

  const newValueRounded = +newValue.toFixed(2);

  const { error } = await sb
    .from("dm_portfolio_assets")
    .update({ current_value: newValueRounded, last_updated: new Date().toISOString() })
    .eq("id", match.id)
    .eq("user_id", uid);

  if (error) return { sucesso: false, erro: error.message };

  invalidateKeys.add("portfolio");
  return {
    sucesso: true,
    ativo: match.ticker || match.name,
    valorAnterior: match.current_value,
    novoValor: newValueRounded,
    variacao: modType === "percentage_change" ? `${value > 0 ? "+" : ""}${value}%` : `${newValueRounded} €`,
  };
}

async function registerExpense(
  sb: SB,
  uid: string,
  description: string,
  amount: number,
  categoryId: string,
  invalidateKeys: Set<string>
) {
  const now = new Date();
  const { error } = await sb.from("dm_expenses").insert({
    user_id: uid,
    description,
    amount,
    category_id: categoryId,
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    is_fixed: false,
  });

  if (error) return { sucesso: false, erro: error.message };

  invalidateKeys.add("expenses");
  return { sucesso: true, descricao: description, valor: amount };
}

async function moveCommission(
  sb: SB,
  uid: string,
  commissionId: string,
  toStatus: "TO_PAY" | "PAID",
  invalidateKeys: Set<string>
) {
  const update: Record<string, unknown> = { status: toStatus };
  if (toStatus === "PAID") update.paid_at = new Date().toISOString();

  const { error } = await sb
    .from("dm_commissions")
    .update(update)
    .eq("id", commissionId)
    .eq("user_id", uid);

  if (error) return { sucesso: false, erro: error.message };

  invalidateKeys.add("commissions");
  return { sucesso: true, novoEstado: toStatus };
}

async function addCommission(
  sb: SB,
  uid: string,
  description: string,
  amount: number,
  client: string | undefined,
  earnedAt: string | undefined,
  invalidateKeys: Set<string>
) {
  const { error } = await sb.from("dm_commissions").insert({
    user_id: uid,
    description,
    amount,
    client: client ?? null,
    earned_at: earnedAt ?? new Date().toISOString(),
    status: "PENDING",
    quantity: 1,
  });

  if (error) return { sucesso: false, erro: error.message };

  invalidateKeys.add("commissions");
  return { sucesso: true, descricao: description, valor: amount, estado: "PENDING" };
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

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const {
    data: { user },
    error: authError,
  } = await sb.auth.getUser(authHeader.replace("Bearer ", ""));

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
    model: "claude-haiku-4-5-20251001", // Haiku — mais rápido para ações curtas
    max_tokens: 1024,
    system: SYSTEM,
    tools: TOOLS,
    messages,
  });

  // Loop agêntico — executa ferramentas até obter resposta de texto final
  while (response.stop_reason === "tool_use") {
    const toolUses = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );

    messages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const tu of toolUses) {
      let result: unknown;
      try {
        const inp = tu.input as Record<string, unknown>;

        if (tu.name === "get_portfolio") {
          result = await getPortfolio(sb, user.id);
        } else if (tu.name === "get_commissions") {
          result = await getCommissions(sb, user.id);
        } else if (tu.name === "get_expense_categories") {
          result = await getExpenseCategories(sb, user.id);
        } else if (tu.name === "update_asset_price") {
          result = await updateAssetPrice(
            sb, user.id,
            inp.asset_identifier as string,
            inp.modification_type as "percentage_change" | "fixed_value",
            inp.value as number,
            invalidateKeys
          );
        } else if (tu.name === "register_expense") {
          result = await registerExpense(
            sb, user.id,
            inp.description as string,
            inp.amount as number,
            inp.category_id as string,
            invalidateKeys
          );
        } else if (tu.name === "move_commission") {
          result = await moveCommission(
            sb, user.id,
            inp.commission_id as string,
            inp.to_status as "TO_PAY" | "PAID",
            invalidateKeys
          );
        } else if (tu.name === "add_commission") {
          result = await addCommission(
            sb, user.id,
            inp.description as string,
            inp.amount as number,
            inp.client as string | undefined,
            inp.earned_at as string | undefined,
            invalidateKeys
          );
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
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM,
      tools: TOOLS,
      messages,
    });
  }

  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === "text"
  );

  return new Response(
    JSON.stringify({
      reply: textBlock?.text ?? "Feito.",
      updatedHistory: [
        ...messages,
        { role: "assistant", content: response.content },
      ],
      // Chaves de TanStack Query a invalidar no cliente
      invalidateKeys: [...invalidateKeys],
    }),
    { headers: { ...CORS, "Content-Type": "application/json" } }
  );
});
