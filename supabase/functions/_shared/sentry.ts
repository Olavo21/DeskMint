// Reporte ao Sentry a partir das edge functions, sem SDK: Store API via fetch.
// Nunca deixa uma falha do Sentry afetar a resposta ao utilizador.
// NOTA: a aceitação da Store API pelo projeto em sentry.io ainda não foi
// confirmada ao vivo — confirmar no primeiro evento real.

const SENTRY_DSN = Deno.env.get("SENTRY_DSN") ?? "";
const SENTRY_TIMEOUT_MS = 2000;

export const FINNHUB_TIMEOUT_MS = 8000;

export type SentryContext = {
  fn: string;
  userId?: string | null;
  level?: "error" | "warning";
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  fingerprint?: string[];
};

export async function reportToSentry(error: unknown, ctx: SentryContext): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  const match = SENTRY_DSN.match(/^https:\/\/([^@]+)@([^/]+)\/(.+)$/);
  if (!match) {
    console.error(`[${ctx.fn}] ${message}`, ctx.tags ?? {}, ctx.extra ?? {});
    return;
  }
  const [, publicKey, host, projectId] = match;
  try {
    await fetch(`https://${host}/api/${projectId}/store/`, {
      method: "POST",
      signal: AbortSignal.timeout(SENTRY_TIMEOUT_MS),
      headers: {
        "Content-Type": "application/json",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${publicKey}, sentry_client=deskmint-edge/1.1`,
      },
      body: JSON.stringify({
        event_id: crypto.randomUUID().replace(/-/g, ""),
        timestamp: new Date().toISOString(),
        platform: "other",
        level: ctx.level ?? "error",
        environment: "production",
        message,
        user: ctx.userId ? { id: ctx.userId } : undefined,
        // "function" é chave reservada no Sentry e é descartada em silêncio.
        tags: { edge_function: ctx.fn, runtime: "edge", ...ctx.tags },
        extra: ctx.extra,
        fingerprint: ctx.fingerprint,
      }),
    });
  } catch (err) {
    console.error(`[${ctx.fn}] sentry report failed:`, err instanceof Error ? err.message : err);
  }
}

// ─── Falhas da Finnhub ───────────────────────────────────────────────────
// "Sem cobertura" (200 com dados vazios) é esperado e nunca passa por aqui.

export type FinnhubFailureKind =
  | "rate_limit" | "auth_error" | "server_error" | "http_error" | "timeout" | "network";

export type FinnhubFailure = {
  endpoint: string;
  kind: FinnhubFailureKind;
  status?: number;
  symbol?: string;
};

export function failureFromStatus(endpoint: string, status: number, symbol?: string): FinnhubFailure {
  // auth_error: chave inválida ou revogada — o sinal a vigiar depois de a regenerar.
  const kind: FinnhubFailureKind =
    status === 429 ? "rate_limit"
    : status === 401 || status === 403 ? "auth_error"
    : status >= 500 ? "server_error"
    : "http_error";
  return { endpoint, kind, status, symbol };
}

export function failureFromError(endpoint: string, err: unknown, symbol?: string): FinnhubFailure {
  const isTimeout = err instanceof DOMException && err.name === "TimeoutError";
  return { endpoint, kind: isTimeout ? "timeout" : "network", symbol };
}

// Um evento por (endpoint, tipo): 20 tickers a dar 429 no mesmo pedido são
// um problema, não vinte. Nunca incluir o URL — leva o token na query string.
export async function reportFinnhubFailures(
  fn: string,
  userId: string | null,
  failures: FinnhubFailure[],
): Promise<void> {
  const groups = new Map<string, FinnhubFailure[]>();
  for (const f of failures) {
    const key = `${f.endpoint}:${f.kind}`;
    groups.set(key, [...(groups.get(key) ?? []), f]);
  }
  await Promise.all([...groups.values()].map((group) => {
    const { endpoint, kind, status } = group[0];
    return reportToSentry(`finnhub ${endpoint} ${kind}${status ? ` (${status})` : ""}`, {
      fn,
      userId,
      level: kind === "rate_limit" ? "warning" : "error",
      tags: { finnhub_endpoint: endpoint, finnhub_failure: kind },
      extra: {
        statuses: [...new Set(group.map((f) => f.status).filter(Boolean))],
        symbols: group.map((f) => f.symbol).filter(Boolean),
        count: group.length,
      },
      fingerprint: ["finnhub", fn, endpoint, kind],
    });
  }));
}
