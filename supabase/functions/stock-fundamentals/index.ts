import { createClient } from "npm:@supabase/supabase-js";

const FINNHUB_KEY = Deno.env.get("FINNHUB_KEY") ?? "";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  // Auth check
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const url    = new URL(req.url);
  const ticker = url.searchParams.get("ticker")?.toUpperCase();
  if (!ticker) {
    return new Response(JSON.stringify({ error: "Missing ticker" }), {
      status: 400, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  try {
    const [metricRes, profileRes, quoteRes] = await Promise.all([
      fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${ticker}&metric=all&token=${FINNHUB_KEY}`),
      fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${FINNHUB_KEY}`),
      fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_KEY}`),
    ]);

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

    return new Response(JSON.stringify(result), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
