import { useState } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { useSavingsAccounts } from '../../hooks/useSavingsAccounts'
import { netRate, parseDateOnly, toDateOnly, SAVINGS_WITHHOLDING_RATE } from '../../lib/savings'
import { useFmt } from '../../utils/format'
import SavingsAccountModal from './SavingsAccountModal'
import type { DmSavingsAccount } from '../../types/database'

export default function SavingsSection() {
  const { t, i18n } = useTranslation()
  const fmt = useFmt()
  const { data, isLoading, isError, refetch } = useSavingsAccounts()
  const [editing, setEditing]   = useState<DmSavingsAccount | null>(null)
  const [showModal, setShowModal] = useState(false)

  const pct = (n: number) => n.toLocaleString(i18n.language, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%'
  const openNew  = () => { setEditing(null); setShowModal(true) }
  const openEdit = (a: DmSavingsAccount) => { setEditing(a); setShowModal(true) }

  if (isLoading) {
    return <View className="py-10 items-center"><ActivityIndicator color="#14b8a6" /></View>
  }

  // Em erro não mostra 0 €: um zero por falha de rede seria uma conclusão errada.
  if (isError) {
    return (
      <View className="mx-4 py-10 items-center">
        <Text className="text-dark-400 text-sm mb-3">{t('savingsProducts.loadError')}</Text>
        <TouchableOpacity onPress={() => refetch()}>
          <Text className="text-teal-500 text-sm font-semibold">{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const accounts = data ?? []
  const total = accounts.reduce((s, a) => s + a.balance, 0)
  const today = toDateOnly(new Date())

  return (
    <View>
      <View className="mx-4 mt-3 mb-4 bg-dark-800 border border-dark-600 rounded-2xl px-5 py-4">
        <Text className="text-dark-400 text-xs mb-1">{t('savingsProducts.total')}</Text>
        <Text className="text-dark-50 text-3xl font-bold">{fmt(total)}</Text>
        <Text className="text-dark-500 text-xs mt-2">{t('savingsProducts.productsCount', { count: accounts.length })}</Text>
      </View>

      {accounts.length === 0 ? (
        <View className="mx-4 py-10 items-center">
          <Ionicons name="wallet-outline" size={48} color="#94a3b8" />
          <Text className="text-dark-400 text-sm mt-3 text-center">{t('savingsProducts.empty')}</Text>
          <Text className="text-dark-500 text-xs mt-1 text-center">{t('savingsProducts.emptyHint')}</Text>
        </View>
      ) : (
        <View className="mx-4 gap-2">
          {accounts.map((a) => {
            const subtitle = [t(`savingsProducts.kind_${a.kind}`), a.institution].filter(Boolean).join(' · ')
            const matured = a.maturity_date !== null && a.maturity_date < today
            return (
              <TouchableOpacity
                key={a.id}
                onPress={() => openEdit(a)}
                activeOpacity={0.7}
                className="bg-dark-800 border border-dark-600 rounded-2xl px-4 py-3"
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 mr-3">
                    <Text className="text-dark-50 text-sm font-semibold" numberOfLines={1}>{a.name}</Text>
                    <Text className="text-dark-500 text-xs mt-0.5" numberOfLines={1}>{subtitle}</Text>
                    {/* Na linha das taxas não cabia: selo + bruta + esta marca passam dos
                        ~300 px úteis de um ecrã de 360 dp, sobretudo em espanhol. */}
                    {a.is_emergency_fund && (
                      <View className="flex-row items-center gap-1 mt-1">
                        <Ionicons name="shield-checkmark-outline" size={12} color="#14b8a6" />
                        <Text className="text-xs" style={{ color: '#0d9488' }}>{t('savingsProducts.emergencyBadge')}</Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-dark-50 text-base font-bold">{fmt(a.balance)}</Text>
                </View>

                <View className="flex-row items-center gap-3 mt-3">
                  <View className="px-2 py-1 rounded-lg" style={{ backgroundColor: '#14b8a615' }}>
                    <Text className="text-xs font-bold" style={{ color: '#0d9488' }} numberOfLines={1}>
                      {t('savingsProducts.netBadge', { rate: pct(netRate(a.gross_rate)), pct: SAVINGS_WITHHOLDING_RATE * 100 })}
                    </Text>
                  </View>
                  <Text className="text-dark-500 text-xs" numberOfLines={1}>{t('savingsProducts.gross')} {pct(a.gross_rate)}</Text>
                </View>

                {a.maturity_date && (
                  <Text className={`text-xs mt-2 ${matured ? 'text-amber-600' : 'text-dark-500'}`}>
                    {t(matured ? 'savingsProducts.maturedOn' : 'savingsProducts.maturesOn', {
                      date: parseDateOnly(a.maturity_date).toLocaleDateString(i18n.language),
                    })}
                  </Text>
                )}
              </TouchableOpacity>
            )
          })}
        </View>
      )}

      {accounts.length > 0 && (
        <View className="mx-4 mt-4 bg-dark-800/50 border border-dark-600/50 rounded-xl p-3">
          <Text className="text-dark-500 text-xs">
            {t('savingsProducts.netNote', { pct: SAVINGS_WITHHOLDING_RATE * 100 })} {t('savingsProducts.rateDisclaimer')}
          </Text>
        </View>
      )}

      <View className="mx-4 mt-4">
        <TouchableOpacity
          onPress={openNew}
          className="flex-row items-center justify-center gap-2 bg-teal-500 rounded-2xl py-3"
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text className="text-white text-sm font-semibold">{t('savingsProducts.add')}</Text>
        </TouchableOpacity>
      </View>

      <SavingsAccountModal visible={showModal} onClose={() => setShowModal(false)} account={editing} />
    </View>
  )
}
