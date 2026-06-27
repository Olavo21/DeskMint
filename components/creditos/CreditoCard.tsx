import { useState } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { getCreditOutstandingBalance, calcMonthlyPayment } from '../../lib/creditMath'
import type { DmCredit } from '../../types/database'
import AmortizacaoPanel from './AmortizacaoPanel'
import { confirmDestructive } from '../../lib/confirmDialog'

const KIND_LABEL: Record<DmCredit['kind'], { label: string; icon: string }> = {
  VEHICLE: { label: 'Automóvel', icon: '🚗' },
  HOUSING: { label: 'Habitação', icon: '🏠' },
}

const EURIBOR_CENARIOS = [
  { label: '+0,5%', delta: 0.5 },
  { label: '+1,0%', delta: 1.0 },
  { label: '+2,0%', delta: 2.0 },
]

const fmt = (v: number) => v.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })

interface Props {
  credit: DmCredit
  onEdit: () => void
  onDelete: (id: string) => void
  isDeleting: boolean
}

export default function CreditoCard({ credit, onEdit, onDelete, isDeleting }: Props) {
  const [expanded, setExpanded] = useState(false)
  const kindInfo = KIND_LABEL[credit.kind]
  const { remainingMonths, balance } = getCreditOutstandingBalance(credit)

  function handleDeletePress() {
    confirmDestructive(
      'Eliminar crédito',
      `Tens a certeza que queres eliminar "${credit.name}"?`,
      'Eliminar',
      () => onDelete(credit.id)
    )
  }

  return (
    <View className="bg-dark-800 rounded-2xl p-4 mb-4 border border-dark-700">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2 flex-1">
          <Text className="text-2xl">{kindInfo.icon}</Text>
          <View className="flex-1">
            <Text className="text-dark-50 font-semibold">{credit.name}</Text>
            <Text className="text-dark-400 text-xs">
              {kindInfo.label} · {credit.rate_type === 'FIXED' ? 'Taxa Fixa' : 'Taxa Variável'}
            </Text>
          </View>
        </View>
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={onEdit} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="pencil-outline" size={18} color="#94a3b8" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDeletePress} disabled={isDeleting} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            {isDeleting
              ? <ActivityIndicator size="small" color="#ef4444" />
              : <Ionicons name="trash-outline" size={18} color="#ef4444" />
            }
          </TouchableOpacity>
        </View>
      </View>

      <View className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-3">
        <Text className="text-red-700 text-xs mb-1">Valor Total em Dívida</Text>
        <Text className="text-red-700 text-2xl font-bold">{fmt(balance)}</Text>
      </View>

      <View className="flex-row justify-between mb-3">
        <View>
          <Text className="text-dark-400 text-xs">Prestação</Text>
          <Text className="text-dark-50 font-semibold">{fmt(credit.monthly_payment)}</Text>
        </View>
        <View>
          <Text className="text-dark-400 text-xs">Taxa</Text>
          <Text className="text-dark-50 font-semibold">{credit.interest_rate.toFixed(2)}%</Text>
        </View>
        <View>
          <Text className="text-dark-400 text-xs">Meses Restantes</Text>
          <Text className="text-dark-50 font-semibold">{remainingMonths}</Text>
        </View>
      </View>

      <TouchableOpacity
        className="flex-row items-center justify-center gap-1.5 py-2 border-t border-dark-700"
        onPress={() => setExpanded(!expanded)}
      >
        <Text className="text-mint-800 text-sm font-medium">
          {expanded ? 'Ocultar simulador' : 'Simular amortização antecipada'}
        </Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color="#2dd4bf" />
      </TouchableOpacity>

      {expanded && (
        <View className="mt-3 gap-3">
          <AmortizacaoPanel
            balance={balance}
            annualRatePct={credit.interest_rate}
            monthlyPayment={credit.monthly_payment}
            remainingMonths={remainingMonths}
          />

          {credit.rate_type === 'VARIABLE' && (
            <View className="bg-dark-700 rounded-xl p-3">
              <Text className="text-dark-400 text-xs uppercase tracking-wider mb-2">
                Stress test Euribor (impacto na prestação)
              </Text>
              {EURIBOR_CENARIOS.map((sc) => {
                const novaTaxa = credit.interest_rate + sc.delta
                const novaPmt  = calcMonthlyPayment(balance, novaTaxa, remainingMonths)
                const delta    = novaPmt - credit.monthly_payment
                return (
                  <View key={sc.label} className="flex-row justify-between items-center py-1.5">
                    <Text className="text-dark-300 text-sm">{sc.label}</Text>
                    <Text className="text-dark-50 text-sm font-medium">{fmt(novaPmt)}</Text>
                    <Text className="text-red-700 text-sm font-semibold">+{fmt(delta)}</Text>
                  </View>
                )
              })}
            </View>
          )}
        </View>
      )}
    </View>
  )
}
