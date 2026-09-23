import { createClient } from "npm:@supabase/supabase-js";

const FINNHUB_KEY = Deno.env.get("FINNHUB_KEY") ?? "";

// CORS restrito ao domínio de produção — só afeta chamadas feitas a partir
// de um browser (a build Web em https://deskmint.app). Não afeta o app
// nativo (iOS/Android): CORS é uma restrição do browser, não do servidor,
// por isso pedidos nativos continuam a funcionar independentemente deste
// valor. Nota: correr `expo start --web` localmente contra esta função em
// produção vai falhar por CORS (origem localhost) — usar o emulador Supabase
// local para testar a função nesse cenário.
const ALLOWED_ORIGIN = "https://deskmint.app";
const CORS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

const CACHE_TTL_MS   = 5 * 60 * 1000; // 5 minutos
const RATE_LIMIT_MAX = 20;            // chamadas por utilizador
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hora
const ENDPOINT_NAME  = "stock-fundamentals";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, ...SECURITY_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...CORS, ...SECURITY_HEADERS } });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const url    = new URL(req.url);
  const ticker = url.searchParams.get("ticker")?.toUpperCase();
  if (!ticker) {
    return jsonResponse({ error: "Missing ticker" }, 400);
  }
  // A Finnhub não usa o sufixo ".US" (símbolo dos EUA é sempre "nu" —
  // "NVDA", nunca "NVDA.US") — sem isto, todas as chamadas devolviam nulls
  // para qualquer ativo americano do portefólio. Mesma regra já usada em
  // lib/yahooFinance.ts (toYahooSymbol). O ticker original (com sufixo)
  // continua a ser a chave da cache/rate-limit, só o pedido à Finnhub muda.
  const finnhubSymbol = ticker.endsWith(".US") ? ticker.slice(0, -3) : ticker;

  try {
    // ── Cache: 5 min por utilizador+ticker — evita gastar chamadas Finnhub
    //    (e a quota de rate limit abaixo) em pedidos repetidos.
    const { data: cached } = await supabase
      .from("dm_fundamentals_cache")
      .select("response, created_at")
      .eq("user_id", user.id)
      .eq("ticker", ticker)
      .maybeSingle();

    if (cached && Date.now() - new Date(cached.created_at).getTime() < CACHE_TTL_MS) {
      return jsonResponse(cached.response);
    }

    // ── Rate limit: máx. 20 chamadas/hora/utilizador (só conta pedidos que
    //    realmente vão à Finnhub, não os que a cache já resolveu acima).
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const { count } = await supabase
      .from("dm_rate_limits")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("endpoint", ENDPOINT_NAME)
      .gte("created_at", windowStart);

    if ((count ?? 0) >= RATE_LIMIT_MAX) {
      return jsonResponse({ error: "Too many requests" }, 429);
    }

    const [metricRes, profileRes, quoteRes] = await Promise.all([
      fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${finnhubSymbol}&metric=all&token=${FINNHUB_KEY}`),
      fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${finnhubSymbol}&token=${FINNHUB_KEY}`),
      fetch(`https://finnhub.io/api/v1/quote?symbol=${finnhubSymbol}&token=${FINNHUB_KEY}`),
    ]);

    // Registar a chamada mesmo que a Finnhub falhe: o pedido saiu e consumiu
    // quota deles, por isso conta para o rate limit local na mesma.
    const rlResult = await supabase
      .from("dm_rate_limits")
      .insert({ user_id: user.id, endpoint: ENDPOINT_NAME });
    if (rlResult.error) console.error("rate_limits insert error:", rlResult.error);

    // Falhar em aberto, nunca cachear o vazio. Sem esta verificação, um 429
    // (ou 5xx, ou hiccup de rede) devolvia um corpo JSON de erro, `metric`
    // ficava undefined e todos os campos caíam nos `?? null` — a função
    // respondia 200 com tudo a null e gravava isso na cache. Uma falha de um
    // segundo ficava presa 5 minutos por user+ticker, e o utilizador via um
    // ecrã vazio indistinguível de "este ticker não tem cobertura".
    const upstream = [
      { label: "metric",   res: metricRes },
      { label: "profile2", res: profileRes },
      { label: "quote",    res: quoteRes },
    ].find((r) => !r.res.ok);
    if (upstream) {
      // Nunca logar res.url — traz o token da Finnhub na query string.
      console.error(`finnhub ${upstream.label} devolveu ${upstream.res.status} para ${finnhubSymbol}`);
      return jsonResponse(
        { error: upstream.res.status === 429 ? "Upstream rate limited" : "Upstream unavailable" },
        503,
      );
    }

    const [metricData, profileData, quoteData] = await Promise.all([
      metricRes.json(),
      profileRes.json(),
      quoteRes.json(),
    ]);

    const m = metricData.metric ?? {};
    const p = profileData ?? {};
    const q = quoteData ?? {};

    // Build response mapping Finnhub fields → our metric keys
    const result = {
      ticker,
      name:         p.name   ?? null,
      currency:     p.currency ?? "USD",
      currentPrice: q.c ?? null,

      // Fundamentals
      pe:               m.peTTM          ?? m.peAnnual        ?? null,
      peg:              m.pegAnnual       ?? null,
      roe:              m.roeTTM          ?? m.roeAnnual       ?? null,
      roic:             m.roicAnnual      ?? m.roiAnnual       ?? null,
      evEbitda:         m["enterpriseValue/ebitdaAnnual"] ?? null,
      opMargin:         m.operatingMarginTTM ?? m.operatingMarginAnnual ?? null,
      beta:             m.beta            ?? p.beta            ?? null,
      debtEquity:       m["totalDebt/totalEquityAnnual"] ?? m["totalDebt/totalEquityQuarterly"] ?? null,
      revenuePerEmployee: m.revenuePerEmployeeTTM ?? m.revenuePerEmployeeAnnual ?? null,
    };

    // Só se chega aqui com as três respostas ok — a cache nunca guarda o
    // resultado de uma chamada falhada. Falhas do upsert não devem impedir a
    // resposta ao utilizador: ficam só logadas.
    const cacheResult = await supabase.from("dm_fundamentals_cache").upsert(
      { user_id: user.id, ticker, response: result, created_at: new Date().toISOString() },
      { onConflict: "user_id,ticker" },
    );
    if (cacheResult.error) console.error("cache upsert error:", cacheResult.error);

    return jsonResponse(result);
  } catch (err) {
    // Nunca devolver String(err)/stack trace ao cliente — só mensagem genérica.
    // O detalhe real fica só nos logs da função (Supabase Dashboard → Functions → Logs).
    console.error("stock-fundamentals error:", err);
    return jsonResponse({ error: "Internal error" }, 500);
  }
});
