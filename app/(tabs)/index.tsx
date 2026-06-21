import { useState, useCallback, useEffect } from 'react'
import { ScrollView, View, Text, ActivityIndicator, TouchableOpacity, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, router } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { useDashboard } from '../../hooks/useDashboard'
import { useAssets } from '../../hooks/useAssets'
import { useAuthStore } from '../../stores/authStore'
import { useDashboardStore } from '../../stores/dashboardStore'
import Header from '../../components/ui/Header'
import QuickAddFab from '../../components/budget/QuickAddFab'
import type { DmAsset } from '../../types/database'

function PremiumCard({
  label, value, sub, icon, color, onPress,
}: { label: string; value: string; sub?: string; icon: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className="bg-dark-800 rounded-2xl p-5 mb-3 flex-row items-center"
    >
      <View
        className="w-12 h-12 rounded-2xl items-center justify-center mr-4"
        style={{ backgroundColor: color + '1a' }}
      >
        <Ionicons name={icon as 'wallet-outline'} size={22} color={color} />
      </View>
      <View className="flex-1">
        <Text className="text-dark-400 text-xs mb-0.5">{label}</Text>
        <Text className="text-2xl font-bold" style={{ color }}>{value}</Text>
        {sub ? <Text className="text-dark-400 text-xs mt-0.5">{sub}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color="#475569" />
    </TouchableOpacity>
  )
}

function KpiCard({ label, value, sub, valueColor }: { label: string; value: string; sub?: string; valueColor?: string }) {
  return (
    <View className="bg-dark-800 rounded-2xl p-4 flex-1">
      <Text className="text-dark-400 text-xs mb-1">{label}</Text>
      <Text className="text-xl font-bold" style={{ color: valueColor ?? '#0f172a' }}>{value}</Text>
      {sub ? <Text className="text-dark-400 text-xs mt-1">{sub}</Text> : null}
    </View>
  )
}

function RuleRow({ label, pct, ideal, amt, fmt }: { label: string; pct: number; ideal: number; amt: number; fmt: (n: number) => string }) {
  const over = pct > ideal && label !== 'Poupança'
  return (
    <View className="mb-3">
      <View className="flex-row justify-between items-center mb-1">
        <Text className="text-dark-300 text-sm">{label}</Text>
        <View className="flex-row items-center gap-2">
          <Text className={`text-sm font-semibold ${over ? 'text-red-400' : 'text-mint-400'}`}>
            {(pct * 100).toFixed(1)}%
          </Text>
          <Text className="text-dark-300 text-sm">{fmt(amt)}</Text>
        </View>
      </View>
      <View className="h-2 bg-dark-700 rounded-full overflow-hidden">
        <View
          className={`h-full rounded-full ${over ? 'bg-red-400' : 'bg-mint-500'}`}
          style={{ width: `${Math.min(pct * 100, 100)}%` }}
        />
      </View>
    </View>
  )
}

type AssetRowProps = {
  asset: DmAsset
  editMode: boolean
  isEditing: boolean
  onStartEdit: (id: string) => void
  onSaveEdit: (id: string, name: string, value: number, debt: number) => void
  onCancelEdit: () => void
  fmt: (n: number) => string
}

function AssetRow({ asset, editMode, isEditing, onStartEdit, onSaveEdit, onCancelEdit, fmt }: AssetRowProps) {
  const [localName, setLocalName] = useState(asset.name)
  const [localValue, setLocalValue] = useState(String(asset.value))
  const [localDebt, setLocalDebt] = useState(String(asset.debt))

  // Só repõe o texto local quando entra em modo de edição — nunca enquanto
  // o utilizador escreve, para um refetch em segundo plano não apagar o que está a escrever.
  useEffect(() => {
    if (isEditing) {
      setLocalName(asset.name)
      setLocalValue(String(asset.value))
      setLocalDebt(String(asset.debt))
    }
  }, [isEditing])

  if (isEditing) {
    return (
      <View className="py-3 border-b border-dark-700">
        <TextInput
          className="bg-dark-700 rounded-lg px-3 py-2 text-sm mb-2 border border-dark-600"
          style={{ color: '#0f172a' }}
          value={localName}
          onChangeText={setLocalName}
          placeholder="Nome"
          placeholderTextColor="#94a3b8"
          autoFocus
          autoCorrect={false}
          autoComplete="off"
          importantForAutofill="no"
        />
        <View className="flex-row gap-2">
          <TextInput
            className="bg-dark-700 rounded-lg px-3 py-2 text-sm flex-1 border border-dark-600"
            style={{ color: '#0f172a', minWidth: 0 }}
            value={localValue}
            onChangeText={setLocalValue}
            keyboardType="decimal-pad"
            placeholder="Valor"
            placeholderTextColor="#94a3b8"
            autoCorrect={false}
            autoComplete="off"
            importantForAutofill="no"
          />
          <TextInput
            className="bg-dark-700 rounded-lg px-3 py-2 text-sm flex-1 border border-dark-600"
            style={{ color: '#0f172a', minWidth: 0 }}
            value={localDebt}
            onChangeText={setLocalDebt}
            keyboardType="decimal-pad"
            placeholder="Dívida"
            placeholderTextColor="#94a3b8"
            autoCorrect={false}
            autoComplete="off"
            importantForAutofill="no"
          />
          <TouchableOpacity
            className="bg-mint-600 rounded-lg px-4 items-center justify-center"
            onPress={() => {
              const val = parseFloat(localValue.replace(',', '.'))
              const debt = parseFloat(localDebt.replace(',', '.'))
              if (!isNaN(val) && val >= 0) {
                onSaveEdit(asset.id, localName.trim() || asset.name, val, isNaN(debt) ? 0 : debt)
              }
            }}
          >
            <Ionicons name="checkmark" size={18} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-dark-700 rounded-lg px-3 items-center justify-center"
            onPress={onCancelEdit}
          >
            <Ionicons name="close" size={18} color="#64748b" />
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View className="flex-row justify-between items-center py-3 border-b border-dark-700">
      <Text className="text-dark-300 text-sm flex-1 mr-2">{asset.name}</Text>
      <View className="flex-row items-center gap-3">
        <Text className="text-dark-50 text-sm font-semibold">{fmt(asset.value - asset.debt)}</Text>
        {editMode && (
          <TouchableOpacity
            onPress={() => onStartEdit(asset.id)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="pencil-outline" size={17} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

export default function DashboardScreen() {
  const profile = useAuthStore((s) => s.profile)
  const qc = useQueryClient()
  const { selectedMonth: MONTH, selectedYear: YEAR } = useDashboardStore()
  const { data, isLoading } = useDashboard(MONTH, YEAR)
  const { update: updateAsset } = useAssets()
  const [assetsEditMode, setAssetsEditMode] = useState(false)
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null)
  const [detailsExpanded, setDetailsExpanded] = useState(false)

  async function handleSaveAsset(id: string, name: string, value: number, debt: number) {
    await updateAsset.mutateAsync({ id, name, value, debt })
    setEditingAssetId(null)
  }

  useFocusEffect(
    useCallback(() => {
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    }, [qc])
  )

  const fmt = (n: number) => n.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`

  return (
    <SafeAreaView className="flex-1 bg-dark-900">
      <Header showSignOut />
      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>

        <View className="mt-4 mb-6">
          <Text className="text-dark-400 text-sm capitalize">
            {new Date(YEAR, MONTH - 1).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}
          </Text>
          <Text className="text-dark-50 text-2xl font-bold">Dashboard</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator color="#14b8a6" className="mt-20" />
        ) : (
          <>
            {/* 3 Cartões Premium */}
            <PremiumCard
              label="Saldo Disponível"
              value={fmt(data?.availableBalance ?? 0)}
              sub="receitas − despesas correntes"
              icon="wallet-outline"
              color="#0d9488"
              onPress={() => router.push('/(tabs)/orcamento')}
            />
            <PremiumCard
              label="Total Guardado / Investido"
              value={fmt(data?.netWorth ?? 0)}
              sub="património líquido acumulado"
              icon="trending-up-outline"
              color="#2563eb"
              onPress={() => router.push('/(tabs)/investimentos')}
            />
            <PremiumCard
              label="Total em Dívida"
              value={fmt(data?.totalCreditDebt ?? 0)}
              sub="passivos e créditos consolidados"
              icon="card-outline"
              color="#dc2626"
              onPress={() => router.push('/(tabs)/creditos')}
            />

            <TouchableOpacity
              className="flex-row items-center justify-center gap-1.5 py-3 mb-2"
              onPress={() => setDetailsExpanded(!detailsExpanded)}
            >
              <Text className="text-dark-400 text-sm font-medium">
                {detailsExpanded ? 'Ocultar detalhes' : 'Ver detalhes'}
              </Text>
              <Ionicons name={detailsExpanded ? 'chevron-up' : 'chevron-down'} size={14} color="#94a3b8" />
            </TouchableOpacity>

            {detailsExpanded && (
              <>
                {/* KPIs */}
                <View className="flex-row gap-3 mb-3">
                  <KpiCard label="Rendimento" value={fmt(data?.income ?? 0)} />
                  <KpiCard label="Despesas" value={fmt(data?.expenses ?? 0)} />
                </View>
                <View className="flex-row gap-3 mb-6">
                  <KpiCard label="Poupança" value={fmt(data?.savings ?? 0)} sub={pct(data?.savingsRate ?? 0)} />
                  <KpiCard label="Disponível" value={fmt(data?.freeCash ?? 0)} sub="não alocado" />
                </View>
                <View className="flex-row gap-3 mb-6">
                  <KpiCard label="Investido" value={fmt(data?.portfolioValue ?? 0)} valueColor="#0d9488" />
                  <KpiCard label="Total em Dívida" value={fmt(data?.totalCreditDebt ?? 0)} valueColor="#dc2626" />
                </View>

                {/* 50/30/20 */}
                {data?.budgetRule && (
                  <View className="bg-dark-800 rounded-2xl p-4 mb-4">
                    <Text className="text-dark-50 font-semibold mb-3">Regra 50 / 30 / 20</Text>
                    <RuleRow label="Necessidades" pct={data.budgetRule.needs_pct} ideal={0.5} amt={data.budgetRule.needs_amt} fmt={fmt} />
                    <RuleRow label="Desejos" pct={data.budgetRule.wants_pct} ideal={0.3} amt={data.budgetRule.wants_amt} fmt={fmt} />
                    <RuleRow label="Poupança" pct={data.budgetRule.savings_pct} ideal={0.2} amt={data.budgetRule.savings_amt} fmt={fmt} />
                  </View>
                )}

                {/* Património */}
                <View className="bg-dark-800 rounded-2xl p-4 mb-8">
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-dark-50 font-semibold">Património Líquido</Text>
                    <View className="flex-row items-center gap-3">
                      <Text className="text-mint-400 text-lg font-bold">{fmt(data?.netWorth ?? 0)}</Text>
                      <TouchableOpacity
                        onPress={() => { setAssetsEditMode(!assetsEditMode); setEditingAssetId(null) }}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      >
                        <Ionicons
                          name={assetsEditMode ? 'checkmark-done-outline' : 'create-outline'}
                          size={18}
                          color={assetsEditMode ? '#14b8a6' : '#94a3b8'}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                  {(data?.assets ?? []).map((asset) => (
                    <AssetRow
                      key={asset.id}
                      asset={asset}
                      editMode={assetsEditMode}
                      isEditing={editingAssetId === asset.id}
                      onStartEdit={setEditingAssetId}
                      onSaveEdit={handleSaveAsset}
                      onCancelEdit={() => setEditingAssetId(null)}
                      fmt={fmt}
                    />
                  ))}
                  <View className="flex-row justify-between items-center py-3 border-b border-dark-700">
                    <Text className="text-dark-300 text-sm">Portefólio</Text>
                    <Text className="text-dark-50 text-sm font-semibold">{fmt(data?.portfolioValue ?? 0)}</Text>
                  </View>
                  <View className="flex-row justify-between items-center py-3 border-b border-dark-700">
                    <Text className="text-dark-300 text-sm">Fundo de Emergência</Text>
                    <Text className="text-dark-50 text-sm font-semibold">{fmt(data?.emergencyFund ?? 0)}</Text>
                  </View>
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
      <QuickAddFab />
    </SafeAreaView>
  )
}
