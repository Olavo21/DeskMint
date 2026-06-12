import Header from '../../components/ui/Header'
import { useState } from 'react'
import { ScrollView, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useCommissions } from '../../hooks/useCommissions'
import NovaComissaoModal from '../../components/commissions/NovaComissaoModal'
import type { DmCommission } from '../../types/database'

type Status = DmCommission['status']

const fmt = (n: number) => n.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })
const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }) : '—'

// ─── Config dos 3 blocos principais ─────────────────────────────────────────
const BLOCOS = [
  {
    status:    'PENDING' as Status,
    label:     'Pendentes',
    sublabel:  'Serviços efetuados, aguardam validação',
    icon:      'time-outline' as const,
    color:     '#f59e0b',
    bgColor:   '#fffbeb',
    borderColor: '#fde68a',
    nextLabel: 'Validar →',
    nextStatus: 'TO_PAY' as Status,
  },
  {
    status:    'TO_PAY' as Status,
    label:     'Por Pagar',
    sublabel:  'Validadas, aguardam transferência',
    icon:      'card-outline' as const,
    color:     '#6366f1',
    bgColor:   '#eef2ff',
    borderColor: '#c7d2fe',
    nextLabel: 'Marcar paga ✓',
    nextStatus: 'PAID' as Status,
  },
  {
    status:    'PAID' as Status,
    label:     'Pagas',
    sublabel:  'Dinheiro recebido',
    icon:      'checkmark-circle-outline' as const,
    color:     '#14b8a6',
    bgColor:   '#f0fdfa',
    borderColor: '#99f6e4',
    nextLabel:  null,
    nextStatus: null,
  },
] as const

function CommissionCard({
  c,
  bloco,
  onAdvance,
  onRevert,
  isUpdating,
}: {
  c: DmCommission
  bloco: (typeof BLOCOS)[number]
  onAdvance: (id: string, nextStatus: Status) => void
  onRevert:  (id: string) => void
  isUpdating: boolean
}) {
  const isOverdue = c.expected_at && new Date(c.expected_at) < new Date() && c.status !== 'PAID'

  return (
    <View
      className="rounded-xl p-3 mb-2"
      style={{ backgroundColor: bloco.bgColor, borderWidth: 1, borderColor: bloco.borderColor }}
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-1 mr-2">
          <Text className="font-semibold text-sm" style={{ color: '#1e293b' }} numberOfLines={1}>
            {c.description}
          </Text>
          {c.client && (
            <Text className="text-xs mt-0.5" style={{ color: '#64748b' }}>{c.client}</Text>
          )}
          <View className="flex-row items-center gap-2 mt-1 flex-wrap">
            <Text className="text-xs" style={{ color: '#94a3b8' }}>
              {fmtDate(c.earned_at)}
            </Text>
            {c.expected_at && (
              <Text className="text-xs" style={{ color: isOverdue ? '#ef4444' : '#94a3b8' }}>
                {isOverdue ? '⚠ Atrasada' : `Prevista ${fmtDate(c.expected_at)}`}
              </Text>
            )}
          </View>
        </View>
        <Text className="font-bold text-base" style={{ color: bloco.color }}>
          {fmt(c.amount)}
        </Text>
      </View>

      {/* Acções */}
      {(bloco.nextStatus || c.status !== 'PENDING') && (
        <View className="flex-row gap-2 mt-2.5">
          {/* Reverter (só em TO_PAY) */}
          {c.status === 'TO_PAY' && (
            <TouchableOpacity
              onPress={() => onRevert(c.id)}
              disabled={isUpdating}
              className="flex-row items-center gap-1 px-2.5 py-1.5 rounded-lg border border-dark-600"
              style={{ backgroundColor: '#f1f5f9' }}
            >
              <Ionicons name="arrow-undo-outline" size={12} color="#94a3b8" />
              <Text className="text-xs" style={{ color: '#94a3b8' }}>Reverter</Text>
            </TouchableOpacity>
          )}
          {/* Avançar */}
          {bloco.nextStatus && (
            <TouchableOpacity
              onPress={() => onAdvance(c.id, bloco.nextStatus!)}
              disabled={isUpdating}
              className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg py-1.5"
              style={{ backgroundColor: bloco.color + '22', borderWidth: 1, borderColor: bloco.color + '44' }}
            >
              {isUpdating
                ? <ActivityIndicator size="small" color={bloco.color} />
                : <>
                    <Ionicons name="arrow-forward-outline" size={12} color={bloco.color} />
                    <Text className="text-xs font-semibold" style={{ color: bloco.color }}>
                      {bloco.nextLabel}
                    </Text>
                  </>
              }
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  )
}

function BlocoNotas({
  bloco,
  commissions,
  onAdvance,
  onRevert,
  isUpdating,
}: {
  bloco: (typeof BLOCOS)[number]
  commissions: DmCommission[]
  onAdvance: (id: string, s: Status) => void
  onRevert:  (id: string) => void
  isUpdating: boolean
}) {
  const [collapsed, setCollapsed] = useState(false)
  const total = commissions.reduce((s, c) => s + c.amount, 0)

  return (
    <View className="mb-4 rounded-2xl overflow-hidden" style={{ borderWidth: 1.5, borderColor: bloco.borderColor }}>
      {/* Cabeçalho do bloco */}
      <TouchableOpacity
        onPress={() => setCollapsed((p) => !p)}
        className="flex-row items-center justify-between px-4 py-3"
        style={{ backgroundColor: bloco.bgColor }}
        activeOpacity={0.8}
      >
        <View className="flex-row items-center gap-2.5">
          <View
            className="w-8 h-8 rounded-full items-center justify-center"
            style={{ backgroundColor: bloco.color + '20' }}
          >
            <Ionicons name={bloco.icon} size={16} color={bloco.color} />
          </View>
          <View>
            <Text className="font-bold text-sm" style={{ color: bloco.color }}>{bloco.label}</Text>
            <Text className="text-xs" style={{ color: '#94a3b8' }}>{bloco.sublabel}</Text>
          </View>
        </View>
        <View className="items-end">
          <Text className="font-bold text-base" style={{ color: bloco.color }}>{fmt(total)}</Text>
          <View className="flex-row items-center gap-1">
            <Text className="text-xs" style={{ color: '#94a3b8' }}>{commissions.length} item(s)</Text>
            <Ionicons name={collapsed ? 'chevron-down' : 'chevron-up'} size={12} color="#94a3b8" />
          </View>
        </View>
      </TouchableOpacity>

      {/* Items */}
      {!collapsed && (
        <View className="px-3 pt-2 pb-3" style={{ backgroundColor: '#ffffff' }}>
          {commissions.length === 0 ? (
            <View className="py-6 items-center">
              <Text className="text-xs" style={{ color: '#94a3b8' }}>Nenhuma comissão neste estado</Text>
            </View>
          ) : (
            commissions.map((c) => (
              <CommissionCard
                key={c.id}
                c={c}
                bloco={bloco}
                onAdvance={onAdvance}
                onRevert={onRevert}
                isUpdating={isUpdating}
              />
            ))
          )}
        </View>
      )}
    </View>
  )
}

export default function ComissoesScreen() {
  const { data, isLoading, updateStatus, totals } = useCommissions()
  const [showModal, setShowModal] = useState(false)

  function advance(id: string, status: Status) {
    updateStatus.mutate({
      id,
      status,
      ...(status === 'PAID' ? { paidAt: new Date().toISOString() } : {}),
    })
  }

  function revert(id: string) {
    updateStatus.mutate({ id, status: 'PENDING' })
  }

  const all = data ?? []
  const pending = all.filter((c) => c.status === 'PENDING')
  const toPay   = all.filter((c) => c.status === 'TO_PAY')
  const paid    = all.filter((c) => c.status === 'PAID')

  return (
    <SafeAreaView className="flex-1 bg-dark-900">
      <Header />
      <NovaComissaoModal visible={showModal} onClose={() => setShowModal(false)} />

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>

        {/* Título + botão Nova */}
        <View className="mt-4 mb-5 flex-row justify-between items-center">
          <View>
            <Text className="text-dark-400 text-sm">Rastreio</Text>
            <Text className="text-dark-50 text-2xl font-bold">Comissões</Text>
          </View>
          <TouchableOpacity
            className="bg-mint-600 rounded-xl px-4 py-2 flex-row items-center gap-1"
            onPress={() => setShowModal(true)}
          >
            <Ionicons name="add" size={18} color="white" />
            <Text className="text-dark-50 font-medium text-sm">Nova</Text>
          </TouchableOpacity>
        </View>

        {/* Totalizadores rápidos */}
        <View className="flex-row gap-2 mb-5">
          <View className="flex-1 bg-dark-800 border border-dark-600 rounded-2xl p-3 items-center">
            <Text className="text-dark-400 text-xs mb-0.5">Pagas</Text>
            <Text className="font-bold text-base" style={{ color: '#14b8a6' }}>{fmt(totals.paid)}</Text>
          </View>
          <View className="flex-1 bg-dark-800 border border-dark-600 rounded-2xl p-3 items-center">
            <Text className="text-dark-400 text-xs mb-0.5">Por Pagar</Text>
            <Text className="font-bold text-base" style={{ color: '#6366f1' }}>{fmt(totals.toPay)}</Text>
          </View>
          <View className="flex-1 bg-dark-800 border border-dark-600 rounded-2xl p-3 items-center">
            <Text className="text-dark-400 text-xs mb-0.5">Pendentes</Text>
            <Text className="font-bold text-base" style={{ color: '#f59e0b' }}>{fmt(totals.pending)}</Text>
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator color="#14b8a6" className="mt-10" />
        ) : (
          <>
            <BlocoNotas
              bloco={BLOCOS[0]}
              commissions={pending}
              onAdvance={advance}
              onRevert={revert}
              isUpdating={updateStatus.isPending}
            />
            <BlocoNotas
              bloco={BLOCOS[1]}
              commissions={toPay}
              onAdvance={advance}
              onRevert={revert}
              isUpdating={updateStatus.isPending}
            />
            <BlocoNotas
              bloco={BLOCOS[2]}
              commissions={paid}
              onAdvance={advance}
              onRevert={revert}
              isUpdating={updateStatus.isPending}
            />
          </>
        )}

        <View className="h-24" />
      </ScrollView>
    </SafeAreaView>
  )
}
