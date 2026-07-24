import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { usePlan } from './usePlan'

// api_key is intentionally excluded — never returned to the client
export type BrokerConnection = {
  id:             string
  broker:         string
  display_name:   string | null
  last_sync_at:   string | null
  last_import_at: string | null
  status:         'active' | 'error' | 'paused'
  error_message:  string | null
  created_at:     string
}

const EDGE_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/sync-trading212`

export function useBrokerConnections() {
  const session = useAuthStore((s) => s.session)
  const plan    = usePlan()
  const qc      = useQueryClient()

  // ── Read — api_key column explicitly excluded ──────────────────────────
  const query = useQuery({
    queryKey: ['broker_connections', session?.user.id],
    enabled:  !!session,
    queryFn:  async () => {
      const { data, error } = await supabase
        .from('dm_broker_connections')
        .select('id, broker, display_name, status, last_sync_at, last_import_at, error_message, created_at')
        .eq('user_id', session!.user.id)
        .order('created_at')
      if (error) throw error
      return (data ?? []) as BrokerConnection[]
    },
  })

  // ── Save key — goes through Edge Function so the key is encrypted server-side
  const upsertConnection = useMutation({
    mutationFn: async (input: {
      broker:       string
      display_name: string
      api_key?:     string
    }) => {
      const res = await fetch(EDGE_URL, {
        method:  'POST',
        headers: {
          Authorization:  `Bearer ${session!.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action:       'save_key',
          broker:       input.broker,
          display_name: input.display_name,
          api_key:      input.api_key ?? '',
        }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'save_key failed')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['broker_connections'] }),
  })

  // ── CSV import — no API key, goes directly to Supabase (no Edge Function)
  const saveCsvConnection = useMutation({
    mutationFn: async (input: { broker: string; display_name: string }) => {
      const { error } = await supabase
        .from('dm_broker_connections')
        .upsert(
          {
            user_id:      session!.user.id,
            broker:       input.broker,
            display_name: input.display_name,
            status:       'active',
          },
          { onConflict: 'user_id,broker' },
        )
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['broker_connections'] }),
  })

  // ── Delete ─────────────────────────────────────────────────────────────
  const deleteConnection = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('dm_broker_connections')
        .delete()
        .eq('id', id)
        .eq('user_id', session!.user.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['broker_connections'] }),
  })

  // ── Sync — PRO/FOUNDER only ────────────────────────────────────────────
  const syncTrading212 = useMutation({
    mutationFn: async () => {
      if (plan.plan === 'FREE') throw new Error('UPGRADE_REQUIRED')

      const res = await fetch(EDGE_URL, {
        method:  'POST',
        headers: {
          Authorization:  `Bearer ${session!.access_token}`,
          'Content-Type': 'application/json',
        },
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Sync failed')
      return body as { synced: number }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portfolio'] })
      qc.invalidateQueries({ queryKey: ['broker_connections'] })
    },
  })

  return { ...query, upsertConnection, saveCsvConnection, deleteConnection, syncTrading212 }
}
