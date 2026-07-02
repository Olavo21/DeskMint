import { useState, useCallback, useEffect } from 'react'
import { ScrollView, View, Text, ActivityIndicator, TouchableOpacity, TextInput, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, router } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { useDashboard } from '../../hooks/useDashboard'
import { useAssets } from '../../hooks/useAssets'
import { useCredits } from '../../hooks/useCredits'
import { useEmergencyFund } from '../../hooks/useEmergencyFund'
import { useSubscription } from '../../hooks/useSubscription'
import { useBudgetTargets } from '../../hooks/useBudgetTargets'
import { useAuthStore } from '../../stores/authStore'
import { useDashboardStore } from '../../stores/dashboardStore'
import Header from '../../components/ui/Header'
import QuickAddFab from '../../components/budget/QuickAddFab'
import type { DmAsset, DmCredit } from '../../types/database'

type AssetWithLiveDebt = DmAsset & { effectiveDebt: number; linkedCredit?: DmCredit }

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

function NetWorthBanner({ label, value }: { label: string; value: string }) {
  return (
    <View className="bg-mint-900/30 border border-mint-700/40 rounded-2xl px-5 py-4 mb-3 items-center">
      <Text className="text-mint-800 text-xs mb-0.5">{label}</Text>
      <Text className="text-dark-50 text-3xl font-bold">{value}</Text>
    </View>
  )
}

function DashboardError({ onRetry }: { onRetry: () => void }) {
  return (
    <View className="items-center justify-center mt-20 px-6">
      <Ionicons name="cloud-offline-outline" size={48} color="#94a3b8" />
      <Text className="text-dark-50 text-base font-semibold mt-4 text-center">
        Não foi possível carregar os teus dados financeiros
      </Text>
      <Text className="text-dark-400 text-sm mt-1 text-center">
        Verifica a tua ligação à internet e tenta novamente.
      </Text>
      <TouchableOpacity
        onPress={onRetry}
        className="bg-mint-600 rounded-xl px-5 py-3 mt-5 flex-row items-center gap-2"
      >
        <Ionicons name="refresh" size={16} color="white" />
        <Text className="text-white font-semibold text-sm">Tentar Novamente</Text>
      </TouchableOpacity>
    </View>
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

function EmergencyProgressCard({ atual, despesaMensal }: { atual: number; despesaMensal: number }) {
  const safeDespesa = despesaMensal > 50 ? despesaMensal : 1000
  const alvo        = safeDespesa * 6
  const pct         = alvo > 0 ? Math.min(atual / alvo, 1) : 0
  const faltam      = Math.max(0, alvo - atual)
  const meses       = Math.floor(atual / safeDespesa)
  const isOk        = pct >= 1
  const color       = isOk ? '#14b8a6' : pct >= 0.5 ? '#f59e0b' : '#ef4444'
  const fmtE        = (v: number) =>
    v.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

  return (
    <View style={{ backgroundColor: '#1e293b', borderRadius: 20, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: '#334155' }}>

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Ionicons name="shield-checkmark-outline" size={15} color={color} />
        <Text style={{ color: '#64748b', fontSize: 10, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' }}>
          Fundo de Emergência
        </Text>
      </View>

      {/* Valor em grande + percentagem */}
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <Text style={{ color, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 }}>
          {fmtE(atual)}
        </Text>
        <Text style={{ color, fontSize: 13, fontWeight: '700' }}>
          {Math.round(pct * 100)}%
        </Text>
      </View>

      {/* Barra de progresso — loading style */}
      <View style={{ height: 8, backgroundColor: '#0f172a', borderRadius: 4, flexDirection: 'row', overflow: 'hidden' }}>
        {pct > 0 && <View style={{ flex: pct,     backgroundColor: color }} />}
        {pct < 1 && <View style={{ flex: 1 - pct                        }} />}
      </View>

      {/* Sub info */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        <Text style={{ color: '#475569', fontSize: 11 }}>{meses}/6 meses cobertos</Text>
        <Text style={{ color: '#475569', fontSize: 11 }}>objetivo: {fmtE(alvo)}</Text>
      </View>

      {/* Rodapé — só se não atingido */}
      {!isOk && (
        <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#0f172a', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="warning-outline" size={13} color={color} />
          <Text style={{ color, fontSize: 12, fontWeight: '500', flex: 1 }}>
            Faltam {fmtE(faltam)} para blindar a tua segurança.
          </Text>
        </View>
      )}
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
          <Text className={`text-sm font-semibold ${over ? 'text-red-700' : 'text-mint-800'}`}>
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
  asset: AssetWithLiveDebt
  editMode: boolean
  isEditing: boolean
  credits: DmCredit[]
  canLinkCreditToAsset: boolean
  onStartEdit: (id: string) => void
  onSaveEdit: (id: string, name: string, value: number, debt: number) => void
  onCancelEdit: () => void
  onLinkCredit: (assetId: string, creditId: string | null) => void
  fmt: (n: number) => string
}

function AssetRow({
  asset, editMode, isEditing, credits, canLinkCreditToAsset,
  onStartEdit, onSaveEdit, onCancelEdit, onLinkCredit, fmt,
}: AssetRowProps) {
  const [localName, setLocalName] = useState(asset.name)
  const [localValue, setLocalValue] = useState(String(asset.value))
  const [localDebt, setLocalDebt] = useState(String(asset.debt))
  const isLinked = !!asset.linkedCredit

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
        <View className="flex-row gap-2 mb-2">
          <TextInput
            className="bg-dark-700 rounded-lg px-3 py-2 text-sm flex-1 border border-dark-600"
            style={{ color: '#0f172a', minWidth: 0 }}
            value={localValue}
            onChangeText={setLocalValue}
            keyboardType="decimal-pad"
            placeholder="Valor de mercado"
            placeholderTextColor="#94a3b8"
            autoCorrect={false}
            autoComplete="off"
            importantForAutofill="no"
          />
          {isLinked ? (
            <View className="flex-1 bg-dark-700 rounded-lg px-3 py-2 border border-dark-600 justify-center">
              <Text className="text-dark-400 text-xs" numberOfLines={1}>Dívida (automática)</Text>
            </View>
          ) : (
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
          )}
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

        {isLinked ? (
          <View className="flex-row items-center gap-1.5 bg-mint-900/40 rounded-lg px-2.5 py-1.5 self-start">
            <Ionicons name="link" size={12} color="#2dd4bf" />
            <Text className="text-mint-800 text-xs">Vinculado a "{asset.linkedCredit!.name}"</Text>
            <TouchableOpacity onPress={() => onLinkCredit(asset.id, null)} hitSlop={8} className="ml-1">
              <Ionicons name="close-circle" size={14} color="#2dd4bf" />
            </TouchableOpacity>
          </View>
        ) : credits.length > 0 ? (
          <View className="flex-row flex-wrap gap-1.5">
            {credits.map((c) => (
              <TouchableOpacity
                key={c.id}
                onPress={() => {
                  if (!canLinkCreditToAsset) {
                    Alert.alert(
                      'Disponível no plano Pro',
                      'Vincular créditos a ativos é uma funcionalidade Pro. Faz upgrade para a desbloquear.'
                    )
                    return
                  }
                  onLinkCredit(asset.id, c.id)
                }}
                className="flex-row items-center gap-1 border border-dashed border-dark-600 rounded-lg px-2 py-1"
                style={{ opacity: canLinkCreditToAsset ? 1 : 0.5 }}
              >
                <Ionicons name={canLinkCreditToAsset ? 'link-outline' : 'lock-closed-outline'} size={12} color="#94a3b8" />
                <Text className="text-dark-400 text-xs">Vincular a "{c.name}"</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </View>
    )
  }

  return (
    <View className="flex-row justify-between items-center py-3 border-b border-dark-700">
      <View className="flex-1 mr-2">
        <Text className="text-dark-300 text-sm">{asset.name}</Text>
        {isLinked && (
          <View className="flex-row items-center gap-1 mt-0.5">
            <Ionicons name="link" size={10} color="#64748b" />
            <Text className="text-dark-500 text-xs">{asset.linkedCredit!.name}</Text>
          </View>
        )}
      </View>
      <View className="flex-row items-center gap-3">
        <Text className="text-dark-50 text-sm font-semibold">{fmt(asset.value - asset.effectiveDebt)}</Text>
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
  const { data, isLoading, isError, refetch } = useDashboard(MONTH, YEAR)
  const { update: updateAsset, linkCredit } = useAssets()
  const { data: credits = [] } = useCredits()
  const { upsert: upsertEmergencyFund } = useEmergencyFund()
  const { canLinkCreditToAsset } = useSubscription()
  const targets = useBudgetTargets()
  const [assetsEditMode, setAssetsEditMode] = useState(false)
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null)
  const [detailsExpanded, setDetailsExpanded] = useState(false)
  const [editingEmergencyFund, setEditingEmergencyFund] = useState(false)
  const [emergencyFundInput, setEmergencyFundInput] = useState('')

  async function handleSaveAsset(id: string, name: string, value: number, debt: number) {
    await updateAsset.mutateAsync({ id, name, value, debt })
    setEditingAssetId(null)
  }

  function handleLinkCredit(assetId: string, creditId: string | null) {
    linkCredit.mutate({ id: assetId, creditId })
  }

  function startEditEmergencyFund() {
    setEmergencyFundInput(String(data?.emergencyFund ?? 0))
    setEditingEmergencyFund(true)
  }

  async function saveEmergencyFund() {
    const val = parseFloat(emergencyFundInput.replace(',', '.'))
    if (!isNaN(val) && val >= 0) await upsertEmergencyFund.mutateAsync(val)
    setEditingEmergencyFund(false)
  }

  useFocusEffect(
    useCallback(() => {
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    }, [qc])
  )

  const fmt = (n: number) => n.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`
  const lazerAmt = data?.lazerAmt ?? 0
  const lazerPct = data?.lazerPct ?? 0

  return (
    <SafeAreaView className="flex-1 bg-dark-900">
      <Header showSignOut />
      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >

        <View className="mt-4 mb-6">
          <Text className="text-dark-400 text-sm capitalize">
            {new Date(YEAR, MONTH - 1).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}
          </Text>
          <Text className="text-dark-50 text-2xl font-bold">Dashboard</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator color="#14b8a6" className="mt-20" />
        ) : isError ? (
          <DashboardError onRetry={() => refetch()} />
        ) : (
          <>
            {/* Património Líquido — indicador estático, sem navegação */}
            <NetWorthBanner label="Património Líquido" value={fmt(data?.netWorth ?? 0)} />

            {/* 3 Cartões Premium */}
            <PremiumCard
              label="Saldo Disponível"
              value={fmt(data?.availableBalance ?? 0)}
              sub="receitas − despesas correntes"
              icon="wallet-outline"
              color="#0d9488"
              onPress={() => router.push('/(tabs)/orcamento')}
            />
            <EmergencyProgressCard
              atual={data?.emergencyFund ?? 0}
              despesaMensal={data?.expenses ?? 0}
            />
            <PremiumCard
              label="Total Investido"
              value={fmt(data?.portfolioValue ?? 0)}
              sub="ETFs, ações e cripto"
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
                  <KpiCard label="Disponível/Lazer" value={fmt(data?.freeCash ?? 0)} sub="não alocado" />
                </View>
                <View className="flex-row gap-3 mb-6">
                  <KpiCard label="Investido" value={fmt(data?.portfolioValue ?? 0)} valueColor="#0d9488" />
                  <KpiCard label="Total em Dívida" value={fmt(data?.totalCreditDebt ?? 0)} valueColor="#dc2626" />
                </View>

                {/* Necessidades/Lazer/Poupança — metas personalizadas do utilizador */}
                {data?.budgetRule && (
                  <View className="bg-dark-800 rounded-2xl p-4 mb-4">
                    <Text className="text-dark-50 font-semibold mb-3">
                      Regra {Math.round(targets.needs * 100)} / {Math.round(targets.wants * 100)} / {Math.round(targets.savings * 100)}
                    </Text>
                    <RuleRow label="Necessidades" pct={data.budgetRule.needs_pct} ideal={targets.needs} amt={data.budgetRule.needs_amt} fmt={fmt} />
                    <RuleRow label="Disponível/Lazer" pct={lazerPct} ideal={targets.wants} amt={lazerAmt} fmt={fmt} />
                    <RuleRow label="Poupança" pct={data.budgetRule.savings_pct} ideal={targets.savings} amt={data.budgetRule.savings_amt} fmt={fmt} />
                  </View>
                )}

                {/* Património */}
                <View className="bg-dark-800 rounded-2xl p-4 mb-8">
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-dark-50 font-semibold">Património Líquido</Text>
                    <View className="flex-row items-center gap-3">
                      <Text className="text-mint-800 text-lg font-bold">{fmt(data?.netWorth ?? 0)}</Text>
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
                      credits={credits}
                      canLinkCreditToAsset={canLinkCreditToAsset}
                      onStartEdit={setEditingAssetId}
                      onSaveEdit={handleSaveAsset}
                      onCancelEdit={() => setEditingAssetId(null)}
                      onLinkCredit={handleLinkCredit}
                      fmt={fmt}
                    />
                  ))}
                  <View className="flex-row justify-between items-center py-3 border-b border-dark-700">
                    <Text className="text-dark-300 text-sm">Portefólio</Text>
                    <Text className="text-dark-50 text-sm font-semibold">{fmt(data?.portfolioValue ?? 0)}</Text>
                  </View>
                  {editingEmergencyFund ? (
                    <View className="py-3 border-b border-dark-700">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-dark-300 text-sm flex-1">Fundo de Emergência</Text>
                        <TextInput
                          className="bg-dark-700 rounded-lg px-3 py-2 text-sm border border-dark-600"
                          style={{ color: '#0f172a', minWidth: 0, width: 110 }}
                          value={emergencyFundInput}
                          onChangeText={setEmergencyFundInput}
                          keyboardType="decimal-pad"
                          placeholder="0.00"
                          placeholderTextColor="#94a3b8"
                          autoFocus
                          autoCorrect={false}
                          autoComplete="off"
                          importantForAutofill="no"
                        />
                        <TouchableOpacity
                          className="bg-mint-600 rounded-lg px-3 py-2 items-center justify-center"
                          onPress={saveEmergencyFund}
                        >
                          <Ionicons name="checkmark" size={16} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          className="bg-dark-700 rounded-lg px-2.5 py-2 items-center justify-center"
                          onPress={() => setEditingEmergencyFund(false)}
                        >
                          <Ionicons name="close" size={16} color="#64748b" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View className="flex-row justify-between items-center py-3 border-b border-dark-700">
                      <Text className="text-dark-300 text-sm">Fundo de Emergência</Text>
                      <View className="flex-row items-center gap-3">
                        <Text className="text-dark-50 text-sm font-semibold">{fmt(data?.emergencyFund ?? 0)}</Text>
                        {assetsEditMode && (
                          <TouchableOpacity
                            onPress={startEditEmergencyFund}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                          >
                            <Ionicons name="pencil-outline" size={17} color="#94a3b8" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  )}
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
