import { useState, useCallback, useEffect } from 'react'
import { ScrollView, View, Text, ActivityIndicator, TouchableOpacity, TextInput, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, router } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Path, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg'
import { fmt } from '../../utils/format'
import { supabase } from '../../lib/supabase'
import { useDashboard } from '../../hooks/useDashboard'
import { useNetWorthHistory, type NetWorthPoint } from '../../hooks/useNetWorthHistory'
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

const CARD = {
  backgroundColor: '#ffffff',
  borderRadius: 16,
  borderWidth: 1,
  borderColor: '#e2e8f0',
  flex: 1,
  padding: 16,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 3,
  elevation: 2,
} as const

function MiniCard({ label, value, sub, icon, color, onPress }: {
  label: string; value: string; sub?: string; icon: string; color: string; onPress: () => void
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={CARD}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <View style={{ width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: color + '1a' }}>
          <Ionicons name={icon as any} size={14} color={color} />
        </View>
        <Text style={{ color: '#64748b', fontSize: 10, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' }} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800', letterSpacing: -0.3 }} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {sub && <Text style={{ color: '#94a3b8', fontSize: 10, marginTop: 5 }}>{sub}</Text>}
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

function EmergencyCard({ atual, despesaMensal }: { atual: number; despesaMensal: number }) {
  const safeDespesa = despesaMensal > 50 ? despesaMensal : 1000
  const alvo        = safeDespesa * 6
  const progress    = alvo > 0 ? Math.min(atual / alvo, 1) : 0
  const faltam      = Math.max(0, alvo - atual)
  const isOk        = progress >= 1
  const barColor    = isOk ? '#14b8a6' : '#3b82f6'

  return (
    <View style={{ ...CARD, overflow: 'hidden' }}>
      {/* Cabeçalho idêntico ao MiniCard */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <View style={{ width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#14b8a61a' }}>
          <Ionicons name="shield-checkmark-outline" size={14} color="#14b8a6" />
        </View>
        <Text style={{ color: '#64748b', fontSize: 10, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' }}>
          Emergência
        </Text>
      </View>

      {/* Valor — mesma tipografia que MiniCard */}
      <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800', letterSpacing: -0.3 }} numberOfLines={1} adjustsFontSizeToFit>
        {fmt(atual)}
      </Text>

      {/* Linhas secundárias discretas */}
      <Text style={{ color: '#94a3b8', fontSize: 10, marginTop: 4 }}>
        {isOk ? 'Objetivo atingido ✓' : `Faltam ${fmt(faltam)}`}
      </Text>
      <Text style={{ color: '#94a3b8', fontSize: 10, marginTop: 1 }}>
        Alvo {fmt(alvo)}
      </Text>

      {/* Barra em fluxo normal — sem position absolute */}
      <View style={{ width: '100%', height: 4, backgroundColor: '#f1f5f9', borderRadius: 2, marginTop: 10, flexDirection: 'row', overflow: 'hidden' }}>
        {progress > 0 && <View style={{ flex: progress,     backgroundColor: barColor, borderRadius: 2 }} />}
        {progress < 1 && <View style={{ flex: 1 - progress                                             }} />}
      </View>
    </View>
  )
}

// ── NetWorthChart ──────────────────────────────────────────────────────────

function smoothLinePath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`
  for (let i = 1; i < pts.length; i++) {
    const cpx = ((pts[i - 1].x + pts[i].x) / 2).toFixed(2)
    d += ` C ${cpx} ${pts[i - 1].y.toFixed(2)}, ${cpx} ${pts[i].y.toFixed(2)}, ${pts[i].x.toFixed(2)} ${pts[i].y.toFixed(2)}`
  }
  return d
}

function areaPath(pts: { x: number; y: number }[], lineH: number): string {
  if (pts.length < 2) return ''
  return `${smoothLinePath(pts)} L ${pts.at(-1)!.x.toFixed(2)} ${lineH} L ${pts[0].x.toFixed(2)} ${lineH} Z`
}

function NetWorthChart({ points }: { points: NetWorthPoint[] }) {
  const [svgWidth, setSvgWidth] = useState(0)
  const H       = 90
  const LABEL_H = 18
  const LINE_H  = H - LABEL_H
  const PAD_T   = 8

  if (points.length < 2) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 18, gap: 6, opacity: 0.45 }}>
        <Ionicons name="trending-up-outline" size={20} color="#64748b" />
        <Text style={{ color: '#64748b', fontSize: 11 }}>Histórico em construção</Text>
      </View>
    )
  }

  const values = points.map((p) => p.net_worth)
  const min    = Math.min(...values)
  const max    = Math.max(...values)
  const range  = max - min || 1

  const pts = svgWidth > 0 ? points.map((p, i) => ({
    x: (i / (points.length - 1)) * svgWidth,
    y: PAD_T + (1 - (p.net_worth - min) / range) * (LINE_H - PAD_T),
  })) : []

  return (
    <View
      style={{ marginTop: 12, marginBottom: 4 }}
      onLayout={(e) => setSvgWidth(e.nativeEvent.layout.width)}
    >
      {svgWidth > 0 && pts.length > 0 && (
        <Svg width={svgWidth} height={H}>
          <Defs>
            <LinearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#14b8a6" stopOpacity={0.18} />
              <Stop offset="1" stopColor="#14b8a6" stopOpacity={0}    />
            </LinearGradient>
          </Defs>

          {/* Área sombreada */}
          <Path d={areaPath(pts, LINE_H)} fill="url(#nwGrad)" />

          {/* Linha principal */}
          <Path
            d={smoothLinePath(pts)}
            fill="none"
            stroke="#14b8a6"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Labels dos meses */}
          {points.map((p, i) => (
            <SvgText
              key={i}
              x={(i / (points.length - 1)) * svgWidth}
              y={H - 2}
              fontSize={10}
              fill="#94a3b8"
              textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}
            >
              {p.label}
            </SvgText>
          ))}
        </Svg>
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
  const session = useAuthStore((s) => s.session)
  const qc = useQueryClient()
  const { selectedMonth: MONTH, selectedYear: YEAR } = useDashboardStore()
  const { data, isLoading, isError, refetch } = useDashboard(MONTH, YEAR)
  const { update: updateAsset, linkCredit } = useAssets()
  const { data: credits = [] } = useCredits()
  const { upsert: upsertEmergencyFund } = useEmergencyFund()
  const { canLinkCreditToAsset } = useSubscription()
  const targets = useBudgetTargets()
  const { data: nwHistory = [] } = useNetWorthHistory()

  // Upsert passivo — guarda o net worth do mês corrente sempre que os dados carregam
  useEffect(() => {
    if (!data?.netWorth || !session) return
    const now = new Date()
    supabase
      .from('dm_net_worth_snapshots')
      .upsert(
        {
          user_id:   session.user.id,
          year:      now.getFullYear(),
          month:     now.getMonth() + 1,
          net_worth: data.netWorth,
        },
        { onConflict: 'user_id,year,month' },
      )
      .then(() => qc.invalidateQueries({ queryKey: ['net_worth_history'] }))
  }, [data?.netWorth])

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
            {/* Património Líquido + gráfico de evolução */}
            <NetWorthBanner label="Património Líquido" value={fmt(data?.netWorth ?? 0)} />
            <NetWorthChart points={nwHistory} />

            {/* ── Grelha 2×2 ─────────────────────────────────────────── */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
              <MiniCard
                label="Saldo Disponível" value={fmt(data?.availableBalance ?? 0)}
                sub="receitas − despesas" icon="wallet-outline" color="#0d9488"
                onPress={() => router.push('/(tabs)/orcamento')}
              />
              <MiniCard
                label="Total Investido" value={fmt(data?.portfolioValue ?? 0)}
                sub="ETFs, ações e cripto" icon="trending-up-outline" color="#2563eb"
                onPress={() => router.push('/(tabs)/investimentos')}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
              <EmergencyCard
                atual={data?.emergencyFund ?? 0}
                despesaMensal={data?.expenses ?? 0}
              />
              <MiniCard
                label="Total em Dívida" value={fmt(data?.totalCreditDebt ?? 0)}
                sub="passivos e créditos" icon="card-outline" color="#dc2626"
                onPress={() => router.push('/(tabs)/creditos')}
              />
            </View>

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
