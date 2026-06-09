import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

export type BrokerConnection = {
  id:             string
  broker:         string
  display_name:   string | null
  api_key:        string | null
  last_sync_at:   string | null
  last_import_at: string | null
  status:         'active' | 'error' | 'paused'
  error_message:  string | null
  created_at:     string
}

export function useBrokerConnections() {
  const session = useAuthStore((s) => s.session)
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['broker_connections', session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dm_broker_connections')
        .select('*')
        .eq('user_id', session!.user.id)
        .order('created_at')
      if (error) throw error
      return (data ?? []) as BrokerConnection[]
    },
  })

  const upsertConnection = useMutation({
    mutationFn: async (input: {
      broker:       string
      display_name: string
      api_key?:     string
    }) => {
      const { error } = await supabase
        .from('dm_broker_connections')
        .upsert({
          user_id:      session!.user.id,
          broker:       input.broker,
          display_name: input.display_name,
          api_key:      input.api_key ?? null,
          status:       'active',
          error_message: null,
        }, { onConflict: 'user_id,broker' })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['broker_connections'] }),
  })

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

  const syncTrading212 = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/sync-trading212`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session!.access_token}`,
            'Content-Type': 'application/json',
          },
        },
      )
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Sync failed')
      return body as { synced: number }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portfolio'] })
      qc.invalidateQueries({ queryKey: ['broker_connections'] })
    },
  })

  return { ...query, upsertConnection, deleteConnection, syncTrading212 }
}
