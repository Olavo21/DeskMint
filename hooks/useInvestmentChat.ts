import { useState, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../stores/authStore'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!
const ENDPOINT = `${SUPABASE_URL}/functions/v1/investment-chat`

// Espelha exatamente o que investment-chat/index.ts devolve em
// `pendingActions` (ver proposeUpdateAssetValue/proposeAddTransaction) —
// e o que se reenvia tal-e-qual em `confirmAction` quando o utilizador
// confirma no ecrã. Nunca construir este payload à mão no cliente.
// `actionId` nasce no servidor (não aqui) — é a chave de idempotência
// que impede a mesma proposta ser aplicada duas vezes (duplo-toque,
// retry de rede, histórico reaberto); ver confirm_update_asset_value/
// confirm_add_transaction na BD. payload.new_value (não uma percentagem)
// porque a percentagem já foi resolvida num valor absoluto no momento
// da proposta — reaplicar o mesmo valor duas vezes nunca compõe.
export type PendingAction =
  | {
      actionId: string
      kind: 'update_asset_value'
      payload: { asset_id: string; new_value: number }
      ativo: string
      valorAtual: number
      novoValor: number
    }
  | {
      actionId: string
      kind: 'add_transaction'
      payload: { asset_id: string; amount_invested_eur: number; units_bought?: number | null }
      ativo: string
      capitalAnterior: number
      novoCapital: number
      unidadesCompradas: number | null
    }

export type InvestMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
  isAction?: boolean
  /** Proposta(s) de escrita por confirmar — o servidor nunca escreveu nada ainda. */
  pendingActions?: PendingAction[]
  /** true depois de o utilizador confirmar OU rejeitar — esconde os botões. */
  actionsResolved?: boolean
}

export function useInvestmentChat() {
  const session = useAuthStore((s) => s.session)
  const qc      = useQueryClient()

  const [messages, setMessages] = useState<InvestMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const historyRef = useRef<object[]>([])

  const send = useCallback(async (text: string) => {
    if (!text.trim() || isLoading || !session) return

    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: 'user', text: text.trim() },
    ])
    setIsLoading(true)

    try {
      const res = await fetch(ENDPOINT, {
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

      const pendingActions: PendingAction[] = json.pendingActions ?? []
      // Nota: com as tools de escrita agora "propose-only", invalidateKeys
      // vem sempre vazio nesta resposta — só o confirmAction (abaixo) invalida
      // queries, porque só ele escreve mesmo na BD.
      const isAction = (json.invalidateKeys?.length ?? 0) > 0

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: json.reply ?? 'Feito.',
          isAction,
          pendingActions: pendingActions.length > 0 ? pendingActions : undefined,
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
  }, [isLoading, session])

  // Confirma uma proposta no ecrã — dispara o caminho confirmAction do
  // investment-chat, que executa a escrita diretamente (sem passar pelo
  // modelo outra vez) e valida tudo server-side. O payload devolvido pelo
  // próprio servidor é reenviado tal-e-qual, nunca reconstruído aqui.
  const confirmAction = useCallback(async (messageId: string, action: PendingAction) => {
    if (!session || confirmingId) return
    setConfirmingId(messageId)

    // Esconde os botões assim que o utilizador confirma — nunca fica
    // clicável duas vezes enquanto o pedido está em curso.
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, actionsResolved: true } : m)))

    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          confirmAction: { kind: action.kind, actionId: action.actionId, payload: action.payload },
        }),
      })
      const json = await res.json()

      // 409 = actionId já consumido (duplo-toque, retry, histórico reaberto).
      // Não é um erro real — a escrita original já aconteceu — só não se
      // repete. Refrescar as queries na mesma, caso a UI esteja desatualizada.
      if (res.status === 409) {
        qc.invalidateQueries({ queryKey: ['portfolio'] })
        qc.invalidateQueries({ queryKey: ['dashboard'] })
        setMessages((prev) => [
          ...prev,
          { id: `${Date.now()}-confirm-dup`, role: 'assistant', text: 'Esta ação já tinha sido aplicada — não foi repetida.' },
        ])
        return
      }

      if (!res.ok) throw new Error(json.error ?? 'Erro ao aplicar a ação')

      qc.invalidateQueries({ queryKey: ['portfolio'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })

      const r = json.result as {
        ativo?: string
        valorAnterior?: number
        novoValor?: number
        capitalAnterior?: number
        novoCapital?: number
        aporte?: number
      }
      const confirmText = action.kind === 'update_asset_value'
        ? `✅ ${r.ativo}: ${r.valorAnterior?.toFixed(2)} € → ${r.novoValor?.toFixed(2)} €`
        : `✅ Aporte de ${r.aporte?.toFixed(2)} € registado em ${r.ativo} (capital: ${r.capitalAnterior?.toFixed(2)} € → ${r.novoCapital?.toFixed(2)} €)`

      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-confirm`, role: 'assistant', text: confirmText, isAction: true },
      ])
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-confirm-err`, role: 'assistant', text: `Não foi possível aplicar: ${msg}` },
      ])
    } finally {
      setConfirmingId(null)
    }
  }, [session, qc, confirmingId])

  // Rejeitar é só local — o servidor nunca escreveu nada, não há nada para desfazer.
  const rejectAction = useCallback((messageId: string) => {
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, actionsResolved: true } : m)))
  }, [])

  function clearChat() {
    setMessages([])
    historyRef.current = []
  }

  return { messages, isLoading, send, clearChat, confirmAction, rejectAction, confirmingId }
}
