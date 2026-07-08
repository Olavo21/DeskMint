import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

export type DmNotification = {
  id:         string
  title:      string
  message:    string
  type:       'warning' | 'info' | 'success'
  is_read:    boolean
  created_at: string
}

export function useNotifications() {
  const session = useAuthStore((s) => s.session)
  const qc      = useQueryClient()

  const query = useQuery({
    queryKey:  ['notifications', session?.user.id],
    enabled:   !!session,
    staleTime: 1000 * 30,
    queryFn:   async () => {
      const { data, error } = await supabase
        .from('dm_notifications')
        .select('id, title, message, type, is_read, created_at')
        .eq('user_id', session!.user.id)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return (data ?? []) as DmNotification[]
    },
  })

  const unreadCount = (query.data ?? []).filter((n) => !n.is_read).length

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('dm_notifications')
        .update({ is_read: true })
        .eq('user_id', session!.user.id)
        .eq('is_read', false)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  return { ...query, unreadCount, markAllRead }
}
