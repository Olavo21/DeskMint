import { useState } from 'react'
import { Modal, View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { usePlan, FOUNDER_SLOTS } from '../../hooks/usePlan'

interface Props {
  visible: boolean
  onClose: () => void
}

function Check({ ok }: { ok: boolean }) {
  return (
    <Ionicons
      name={ok ? 'checkmark-circle' : 'close-circle'}
      size={16}
      color={ok ? '#14b8a6' : '#334155'}
    />
  )
}

type Billing = 'monthly' | 'annual'

const FEATURES = [
  'Dashboard básico',
  'Orçamento mensal',
  'Aba Fiscal (IRS)',
  'Comissões completas',
  'Dashboard completo',
  'Investimentos + Notícias',
  'Relatórios',
  'Agente IA',
]

const PLAN_DATA = [
  {
    key: 'FREE',
    name: 'Gratuito',
    color: '#64748b',
    monthlyPrice: 0,
    annualPrice: 0,
    cta: null,
    features: [true, true, true, false, false, false, false, false],
    aiLabel: '—',
  },
  {
    key: 'PRO',
    name: 'Premium',
    color: '#8b5cf6',
    monthlyPrice: 9.99,
    annualPrice: 7.99,
    cta: 'Escolher Premium',
    badge: 'Popular',
    features: [true, true, true, true, true, true, true, true],
    aiLabel: 'Ilimitado',
  },
  {
    key: 'FOUNDER',
    name: 'Founder ⭐',
    color: '#f59e0b',
    monthlyPrice: 0,
    annualPrice: 0,
    cta: 'Quero ser Founder',
    badge: `${FOUNDER_SLOTS} vagas`,
    features: [true, true, true, true, true, true, true, true],
    aiLabel: 'Ilimitado',
    lifetime: true,
  },
]

export default function PlansModal({ visible, onClose }: Props) {
  const { plan, founderNumber } = usePlan()
  const [billing, setBilling] = useState<Billing>('monthly')

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-dark-900">

        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-4 border-b border-dark-700">
          <Text className="text-white text-lg font-bold">Planos DeskMint</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#64748b" />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>

          {/* Plano actual */}
          <View className="bg-dark-800 rounded-2xl px-4 py-3 mb-4 flex-row items-center gap-3">
            <Ionicons name="person-circle-outline" size={20} color="#14b8a6" />
            <Text className="text-dark-300 text-sm">
              Plano actual:{' '}
              <Text className="font-semibold" style={{ color: '#0f172a' }}>
                {plan === 'FOUNDER' ? `Founder #${founderNumber ?? '?'}` : plan === 'PRO' ? 'Premium' : plan}
              </Text>
            </Text>
          </View>

          {/* Toggle mensal / anual */}
          <View className="flex-row bg-dark-800 rounded-xl p-1 mb-5">
            <TouchableOpacity
              className={`flex-1 py-2 rounded-lg items-center ${billing === 'monthly' ? 'bg-dark-600' : ''}`}
              onPress={() => setBilling('monthly')}
            >
              <Text className={`text-sm font-medium ${billing === 'monthly' ? 'text-dark-50' : 'text-dark-500'}`}>
                Mensal
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 py-2 rounded-lg items-center ${billing === 'annual' ? 'bg-dark-600' : ''}`}
              onPress={() => setBilling('annual')}
            >
              <Text className={`text-sm font-medium ${billing === 'annual' ? 'text-dark-50' : 'text-dark-500'}`}>
                Anual
              </Text>
              <Text className="text-mint-800 text-xs font-semibold">-20%</Text>
            </TouchableOpacity>
          </View>

          {PLAN_DATA.map((p) => {
            const isCurrent = p.key === plan
            const price = billing === 'annual' ? p.annualPrice : p.monthlyPrice
            const priceLabel = p.lifetime
              ? 'Vitalício grátis'
              : price === 0
              ? 'Grátis'
              : `€${price.toFixed(2)}/mês`
            const annualNote = billing === 'annual' && !p.lifetime && price > 0
              ? `€${(price * 12).toFixed(2)} cobrado anualmente`
              : null

            return (
              <View
                key={p.key}
                className="rounded-2xl mb-4 overflow-hidden border"
                style={{
                  borderColor: isCurrent ? p.color : p.key === 'PRO' ? '#8b5cf644' : '#1e293b',
                  borderWidth: isCurrent || p.key === 'PRO' ? 2 : 1,
                  backgroundColor: p.key === 'FOUNDER' ? '#1c1200' : p.key === 'PRO' ? '#150d2e' : '#1e293b',
                }}
              >
                {/* Header do plano */}
                <View className="px-4 pt-4 pb-3" style={{ borderBottomWidth: 1, borderBottomColor: '#334155' }}>
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-white font-bold text-base">{p.name}</Text>
                    <View className="flex-row items-center gap-2">
                      {p.badge && (
                        <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: p.color }}>
                          <Text className="text-xs font-bold" style={{ color: p.key === 'FOUNDER' ? '#000' : '#fff' }}>
                            {p.badge}
                          </Text>
                        </View>
                      )}
                      {isCurrent && (
                        <View className="bg-mint-900 border border-mint-700 rounded-full px-2 py-0.5">
                          <Text className="text-mint-400 text-xs font-semibold">Actual</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Text className="text-white text-xl font-bold">{priceLabel}</Text>
                  {annualNote && <Text className="text-dark-500 text-xs mt-0.5">{annualNote}</Text>}
                </View>

                {/* Lista de features */}
                <View className="px-4 py-3 gap-2.5">
                  {FEATURES.map((f, i) => (
                    <View key={f} className="flex-row items-center gap-2">
                      <Check ok={p.features[i]} />
                      <Text className={`text-sm flex-1 ${p.features[i] ? 'text-white' : 'text-dark-500'}`}>
                        {f}{f === 'Agente IA' ? ` · ${p.aiLabel}` : ''}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* CTA */}
                {!isCurrent && p.cta && (
                  <View className="px-4 pb-4">
                    <TouchableOpacity
                      className="rounded-xl py-3 items-center"
                      style={{ backgroundColor: p.color }}
                    >
                      <Text
                        className="font-bold text-sm"
                        style={{ color: p.key === 'FOUNDER' ? '#000' : '#fff' }}
                      >
                        {p.cta}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )
          })}

          <Text className="text-dark-300 text-xs text-center mb-8 leading-4">
            Pagamentos seguros via Stripe · Cancela quando quiseres{'\n'}
            Plano anual pago de uma vez, sem renovação automática
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}
