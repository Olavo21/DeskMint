import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Web Crypto helpers ─────────────────────────────────────────────────────

async function deriveKey(secret: string): Promise<CryptoKey> {
  const raw = new TextEncoder().encode(secret)
  const keyMaterial = await crypto.subtle.importKey('raw', raw, 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: new TextEncoder().encode('deskmint-v1'), iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

async function encrypt(plaintext: string, secret: string): Promise<string> {
  const key = await deriveKey(secret)
  const iv  = crypto.getRandomValues(new Uint8Array(12))
  const ct  = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext))
  const b64 = (buf: Uint8Array) => btoa(String.fromCharCode(...buf))
  return `${b64(iv)}.${b64(new Uint8Array(ct))}`
}

async function decrypt(blob: string, secret: string): Promise<string> {
  const [ivB64, ctB64] = blob.split('.')
  if (!ivB64 || !ctB64) throw new Error('connection_key_invalid')
  const iv  = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0))
  const ct  = Uint8Array.from(atob(ctB64), (c) => c.charCodeAt(0))
  const key = await deriveKey(secret)
  const pt  = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
  return new TextDecoder().decode(pt)
}

// ── Response helpers ───────────────────────────────────────────────────────

function ok(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function fail(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// ── Trading 212 types ──────────────────────────────────────────────────────

interface T212Position {
  ticker:          string
  quantity:        number
  averagePrice:    number
  currentPrice:    number
  ppl:             number
  fxPpl:           number
  initialFillDate: string
  frontend:        string
  maxBuy:          number
  maxSell:         number
  pieQuantity:     number
}

function detectAssetType(ticker: string): string {
  const cryptos = ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOT', 'MATIC']
  if (cryptos.includes(ticker.toUpperCase())) return 'CRYPTO'
  if (ticker.includes('_EQ')) return 'STOCK'
  return 'ETF'
}

// ── Handler ────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    // ── Auth ──────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return fail(401, 'Unauthorized')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', ''),
    )
    if (authError || !user) return fail(401, 'Invalid token')

    // ── Encryption secret ─────────────────────────────────────────────────
    const encSecret = Deno.env.get('ENCRYPTION_SECRET')
    if (!encSecret) return fail(500, 'ENCRYPTION_SECRET not configured')

    // ── Parse action ──────────────────────────────────────────────────────
    let action = 'sync'
    let body: Record<string, string> = {}

    if (req.method === 'POST' && req.body) {
      try {
        body   = await req.json()
        action = body.action ?? 'sync'
      } catch {
        // empty body → default sync
      }
    }

    // ── save_key ──────────────────────────────────────────────────────────
    if (action === 'save_key') {
      const { broker, display_name, api_key } = body
      if (!api_key) return fail(400, 'api_key required')
      if (!broker)  return fail(400, 'broker required')

      const encrypted = await encrypt(api_key, encSecret)

      const { error: upsertErr } = await supabase
        .from('dm_broker_connections')
        .upsert({
          user_id:       user.id,
          broker,
          display_name:  display_name ?? broker,
          api_key:       encrypted,
          status:        'active',
          error_message: null,
        }, { onConflict: 'user_id,broker' })

      if (upsertErr) return fail(500, upsertErr.message)
      return ok({ saved: true })
    }

    // ── sync ──────────────────────────────────────────────────────────────
    const { data: conn, error: connError } = await supabase
      .from('dm_broker_connections')
      .select('id, api_key')
      .eq('user_id', user.id)
      .eq('broker', 'trading212')
      .eq('status', 'active')
      .single()

    if (connError || !conn?.api_key) {
      return fail(404, 'Ligação Trading 212 não encontrada ou sem API key.')
    }

    // Decrypt internally — never logged, never returned
    let apiKey: string
    try {
      apiKey = await decrypt(conn.api_key, encSecret)
    } catch {
      await supabase
        .from('dm_broker_connections')
        .update({ status: 'error', error_message: 'connection_key_invalid — re-save your API key' })
        .eq('id', conn.id)
      return fail(400, 'connection_key_invalid')
    }

    // Call Trading 212 API
    const t212Res = await fetch('https://live.trading212.com/api/v0/equity/portfolio', {
      headers: { Authorization: apiKey },
    })

    apiKey = '' // clear from memory immediately after use

    if (!t212Res.ok) {
      const errText = await t212Res.text()
      await supabase
        .from('dm_broker_connections')
        .update({ status: 'error', error_message: `T212 API ${t212Res.status}: ${errText}` })
        .eq('id', conn.id)
      return fail(502, `Trading 212 API error: ${t212Res.status}`)
    }

    const positions: T212Position[] = await t212Res.json()

    const upserts = positions.map((pos) => ({
      user_id:          user.id,
      ticker:           pos.ticker,
      name:             pos.ticker,
      asset_type:       detectAssetType(pos.ticker),
      broker:           'Trading 212',
      units:            pos.quantity,
      avg_price:        pos.averagePrice,
      current_value:    pos.quantity * pos.currentPrice,
      capital_invested: pos.quantity * pos.averagePrice,
      source:           'api_sync',
      external_id:      pos.ticker,
      connection_id:    conn.id,
      last_updated:     new Date().toISOString(),
    }))

    if (upserts.length > 0) {
      const { error: upsertError } = await supabase
        .from('dm_portfolio_assets')
        .upsert(upserts, { onConflict: 'user_id,ticker', ignoreDuplicates: false })
      if (upsertError) return fail(500, upsertError.message)
    }

    await supabase
      .from('dm_broker_connections')
      .update({ last_sync_at: new Date().toISOString(), status: 'active', error_message: null })
      .eq('id', conn.id)

    return ok({ synced: upserts.length })

  } catch (_e) {
    // Never include stack traces or key material in error responses
    return fail(500, 'internal_error')
  }
})
