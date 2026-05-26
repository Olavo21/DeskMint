import { useState } from 'react'
import { ScrollView, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useCommissions } from '../../hooks/useCommissions'
import NovaComissaoModal from '../../components/commissions/NovaComissaoModal'
import type { DmCommission } from '../../types/database'

type Status = DmCommission['status']

const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  PAID:      { label: 'Paga',      color: '#2dd4bf', bg: '#042f2e', icon: 'checkmark-circle' },
  PENDING:   { label: 'Pendente',  color: '#facc15', bg: '#422006', icon: 'time-outline' },
  CANCELLED: { label: 'Cancelada', color: '#f87171', bg: '#450a0a', icon: 'close-circle' },
}

export default function ComissoesScreen() {
  const { data, isLoading, updateStatus, totals } = useCommissions()
  const [showModal, setShowModal] = useState(false)
  const fmt = (n: number) => n.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })

  function handleMarkPaid(id: string) {
    updateStatus.mutate({ id, status: 'PAID', paidAt: new Date().toISOString() })
  }

  return (
    <SafeAreaView className="flex-1 bg-dark-900">
      <NovaComissaoModal visible={showModal} onClose={() => setShowModal(false)} />
      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>

        <View className="mt-4 mb-6 flex-row justify-between items-center">
          <View>
            <Text className="text-dark-400 text-sm">Rastreio</Text>
            <Text className="text-white text-2xl font-bold">Comissões</Text>
          </View>
          <TouchableOpacity
            className="bg-mint-600 rounded-xl px-4 py-2 flex-row items-center gap-1"
            onPress={() => setShowModal(true)}
          >
            <Ionicons name="add" size={18} color="white" />
            <Text className="text-white font-medium text-sm">Nova</Text>
          </TouchableOpacity>
        </View>

        {/* Totais */}
        <View className="flex-row gap-3 mb-6">
          <View className="bg-dark-800 rounded-2xl p-4 flex-1">
            <Text className="text-dark-400 text-xs mb-1">Recebidas</Text>
            <Text className="text-mint-400 text-xl font-bold">{fmt(totals.paid)}</Text>
          </View>
          <View className="bg-dark-800 rounded-2xl p-4 flex-1">
            <Text className="text-dark-400 text-xs mb-1">A receber</Text>
            <Text className="text-yellow-400 text-xl font-bold">{fmt(totals.pending)}</Text>
          </View>
        </View>

        {/* Lista */}
        {isLoading ? (
          <ActivityIndicator color="#14b8a6" className="mt-10" />
        ) : (
          <>
            <Text className="text-dark-400 text-xs font-medium mb-2 ml-1 uppercase tracking-wider">
              Todas · {data?.length ?? 0}
            </Text>
            {data?.map((c) => {
              const cfg = STATUS_CONFIG[c.status]
              return (
                <View key={c.id} className="bg-dark-800 rounded-2xl p-4 mb-3">
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1 mr-3">
                      <Text className="text-white font-semibold">{c.description}</Text>
                      {c.client && <Text className="text-dark-400 text-xs mt-0.5">{c.client}</Text>}
                    </View>
                    <Text className="text-white text-lg font-bold">{fmt(c.amount)}</Text>
                  </View>

                  <View className="flex-row justify-between items-center mt-3">
                    <View className="flex-row items-center gap-1 rounded-full px-2.5 py-1" style={{ backgroundColor: cfg.bg }}>
                      <Ionicons name={cfg.icon} size={13} color={cfg.color} />
                      <Text style={{ color: cfg.color }} className="text-xs font-medium">{cfg.label}</Text>
                    </View>
                    <View className="items-end">
                      {c.paid_at
                        ? <Text className="text-dark-400 text-xs">Paga a {new Date(c.paid_at).toLocaleDateString('pt-PT')}</Text>
                        : c.expected_at
                          ? <Text className="text-dark-400 text-xs">Prevista {new Date(c.expected_at).toLocaleDateString('pt-PT')}</Text>
                          : null
                      }
                    </View>
                  </View>

                  {/* Ação rápida para marcar como paga */}
                  {c.status === 'PENDING' && (
                    <TouchableOpacity
                      className="mt-3 border border-mint-700 rounded-xl py-2 items-center"
                      onPress={() => handleMarkPaid(c.id)}
                      disabled={updateStatus.isPending}
                    >
                      <Text className="text-mint-400 text-sm font-medium">Marcar como paga</Text>
                    </TouchableOpacity>
                  )}

                  {c.notes && <Text className="text-dark-500 text-xs mt-2">{c.notes}</Text>}
                </View>
              )
            })}
            <View className="h-8" />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
