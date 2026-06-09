import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Trading 212 API types
interface T212Position {
  ticker:               string
  quantity:             number
  averagePrice:         number
  currentPrice:         number
  ppl:                  number
  fxPpl:                number
  initialFillDate:      string
  frontend:             string
  maxBuy:               number
  maxSell:              number
  pieQuantity:          number
}

function detectAssetType(ticker: string): string {
  const cryptos = ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOT', 'MATIC']
  if (cryptos.includes(ticker.toUpperCase())) return 'CRYPTO'
  // Trading 212 ETF tickers often end with _EQ or contain common ETF names
  // Most positions from T212 are stocks or ETFs
  if (ticker.includes('_EQ')) return 'STOCK'
  return 'ETF'
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Auth via Supabase JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Verify JWT and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch the user's Trading 212 connection
    const { data: conn, error: connError } = await supabase
      .from('dm_broker_connections')
      .select('id, api_key')
      .eq('user_id', user.id)
      .eq('broker', 'trading212')
      .eq('status', 'active')
      .single()

    if (connError || !conn?.api_key) {
      return new Response(JSON.stringify({ error: 'Ligação Trading 212 não encontrada ou sem API key.' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Call Trading 212 API — live account endpoint
    // If using practice/demo account, use https://demo.trading212.com/api/v0/equity/portfolio
    const t212Res = await fetch('https://live.trading212.com/api/v0/equity/portfolio', {
      headers: { Authorization: conn.api_key },
    })

    if (!t212Res.ok) {
      const errText = await t212Res.text()
      // Mark connection as error
      await supabase
        .from('dm_broker_connections')
        .update({ status: 'error', error_message: `T212 API ${t212Res.status}: ${errText}` })
        .eq('id', conn.id)
      return new Response(JSON.stringify({ error: `Trading 212 API error: ${t212Res.status}` }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const positions: T212Position[] = await t212Res.json()

    // Map T212 positions → dm_portfolio_assets rows
    const upserts = positions.map((pos) => ({
      user_id:          user.id,
      ticker:           pos.ticker,
      name:             pos.ticker,          // T212 doesn't return full name in portfolio endpoint
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
        .upsert(upserts, {
          onConflict: 'user_id,ticker',
          ignoreDuplicates: false,
        })

      if (upsertError) {
        return new Response(JSON.stringify({ error: upsertError.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Update last_sync_at and clear any errors
    await supabase
      .from('dm_broker_connections')
      .update({ last_sync_at: new Date().toISOString(), status: 'active', error_message: null })
      .eq('id', conn.id)

    return new Response(JSON.stringify({ synced: upserts.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
