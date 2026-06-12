import { useState, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../stores/authStore'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!

// Chaves de TanStack Query correspondentes a cada entidade invalidada pelo servidor
const INVALIDATE_MAP: Record<string, string[]> = {
  portfolio:   ['portfolio'],
  commissions: ['commissions'],
  expenses:    ['expenses'],
}

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
  isAction?: boolean   // true quando a IA executou uma alteração
}

export function useAiChat() {
  const session    = useAuthStore((s) => s.session)
  const qc         = useQueryClient()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const historyRef = useRef<object[]>([])    // histórico serializado para a API

  const send = useCallback(async (text: string) => {
    if (!text.trim() || isLoading || !session) return

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: text.trim(),
    }
    setMessages((prev) => [...prev, userMsg])
    setIsLoading(true)

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          message: text.trim(),
          history: historyRef.current,
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro desconhecido')

      // Atualizar histórico para manter contexto da conversa
      historyRef.current = json.updatedHistory ?? []

      // Invalidar caches do TanStack Query se a IA executou escrita
      if (json.invalidateKeys?.length > 0) {
        for (const key of json.invalidateKeys as string[]) {
          const queryKey = INVALIDATE_MAP[key]
          if (queryKey) qc.invalidateQueries({ queryKey })
        }
      }

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: json.reply ?? 'Feito.',
        isAction: (json.invalidateKeys?.length ?? 0) > 0,
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: 'assistant', text: `Erro: ${msg}` },
      ])
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, session, qc])

  function clearChat() {
    setMessages([])
    historyRef.current = []
  }

  return { messages, isLoading, send, clearChat }
}
