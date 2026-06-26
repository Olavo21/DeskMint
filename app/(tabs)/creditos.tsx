import { useState } from 'react'
import { ScrollView, View, Text, ActivityIndicator, TouchableOpacity, RefreshControl, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useQueryClient } from '@tanstack/react-query'
import Header from '../../components/ui/Header'
import { useCredits } from '../../hooks/useCredits'
import { useIncome } from '../../hooks/useIncome'
import { useSubscription } from '../../hooks/useSubscription'
import { useDashboardStore } from '../../stores/dashboardStore'
import CreditoCard from '../../components/creditos/CreditoCard'
import DicasFinanceiras from '../../components/creditos/DicasFinanceiras'
import NovoCreditoModal from '../../components/creditos/NovoCreditoModal'
import type { DmCredit } from '../../types/database'

export default function CreditosScreen() {
  const qc = useQueryClient()
  const { selectedMonth: MONTH, selectedYear: YEAR } = useDashboardStore()
  const { data: credits = [], isLoading, isFetching, remove } = useCredits()
  const { data: income } = useIncome(MONTH, YEAR)
  const { canAddMoreCredits } = useSubscription()

  const [showModal, setShowModal]   = useState(false)
  const [editing, setEditing]       = useState<DmCredit | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function handleNew() {
    if (!canAddMoreCredits) {
      Alert.alert(
        'Disponível no plano Pro',
        'O plano gratuito permite apenas 1 crédito registado. Faz upgrade para adicionar mais.'
      )
      return
    }
    setEditing(null)
    setShowModal(true)
  }

  function handleEdit(credit: DmCredit) {
    setEditing(credit)
    setShowModal(true)
  }

  function handleDelete(id: string) {
    setDeletingId(id)
    remove.mutate(id, { onSettled: () => setDeletingId(null) })
  }

  const totalMonthlyPayments = credits.reduce((s, c) => s + c.monthly_payment, 0)

  return (
    <SafeAreaView className="flex-1 bg-dark-900">
      <Header />
      <NovoCreditoModal visible={showModal} onClose={() => setShowModal(false)} credit={editing} />
      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={() => qc.invalidateQueries({ queryKey: ['credits'] })}
            tintColor="#14b8a6"
          />
        }
      >
        <View className="mt-4 mb-6 flex-row justify-between items-center">
          <View>
            <Text className="text-dark-400 text-sm">Passivos</Text>
            <Text className="text-dark-50 text-2xl font-bold">Créditos</Text>
          </View>
          <TouchableOpacity
            className="bg-mint-600 rounded-xl px-3 py-2 flex-row items-center gap-1"
            style={{ opacity: canAddMoreCredits ? 1 : 0.5 }}
            onPress={handleNew}
          >
            <Ionicons name={canAddMoreCredits ? 'add' : 'lock-closed'} size={16} color="white" />
            <Text className="text-dark-50 font-medium text-xs">Novo</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator color="#14b8a6" className="mt-20" />
        ) : (
          <>
            {credits.length === 0 ? (
              <View className="bg-dark-800 rounded-2xl p-6 mb-4 items-center">
                <Text className="text-3xl mb-2">🏦</Text>
                <Text className="text-dark-50 font-semibold mb-1">Ainda não tens créditos registados</Text>
                <Text className="text-dark-400 text-sm text-center">
                  Adiciona o teu crédito automóvel ou habitação para acompanhares a dívida em falta automaticamente.
                </Text>
              </View>
            ) : (
              credits.map((credit) => (
                <CreditoCard
                  key={credit.id}
                  credit={credit}
                  onEdit={() => handleEdit(credit)}
                  onDelete={handleDelete}
                  isDeleting={deletingId === credit.id}
                />
              ))
            )}

            <View className="h-px bg-dark-700 my-2" />

            <View className="mt-4 mb-8">
              <DicasFinanceiras
                totalMonthlyPayments={totalMonthlyPayments}
                income={income?.total_net ?? 0}
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
