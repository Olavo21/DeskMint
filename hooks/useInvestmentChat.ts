import { useState, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../stores/authStore'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!

export type InvestMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
  isAction?: boolean
}

export function useInvestmentChat() {
  const session = useAuthStore((s) => s.session)
  const qc      = useQueryClient()

  const [messages, setMessages] = useState<InvestMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const historyRef = useRef<object[]>([])

  const send = useCallback(async (text: string) => {
    if (!text.trim() || isLoading || !session) return

    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: 'user', text: text.trim() },
    ])
    setIsLoading(true)

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/investment-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ message: text.trim(), history: historyRef.current }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro desconhecido')

      historyRef.current = json.updatedHistory ?? []

      const isAction = (json.invalidateKeys?.length ?? 0) > 0
      if (isAction) {
        qc.invalidateQueries({ queryKey: ['portfolio'] })
        qc.invalidateQueries({ queryKey: ['dashboard'] })
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: json.reply ?? 'Feito.',
          isAction,
        },
      ])
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
