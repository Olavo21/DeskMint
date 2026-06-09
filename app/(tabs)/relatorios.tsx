import Header from '../../components/ui/Header'
import { useState } from 'react'
import { ScrollView, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useWeeklyReport, useMonthlyReport, usePendingByType } from '../../hooks/useReports'
import type { DmCommissionType } from '../../types/database'

const MONTH = 5
const YEAR  = 2026

type Tab = 'pendentes' | 'semanal' | 'mensal'

function fmt(n: number) { return n.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' }) }
function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })
}

function TypeBadge({ type }: { type: DmCommissionType | null }) {
  const color = type?.color ?? '#64748b'
  return (
    <View className="flex-row items-center gap-1 rounded-full px-2.5 py-0.5" style={{ backgroundColor: color + '22', borderWidth: 1, borderColor: color + '66' }}>
      {type?.icon ? <Text style={{ fontSize: 11 }}>{type.icon}</Text> : null}
      <Text style={{ color, fontSize: 11, fontWeight: '600' }}>{type?.name ?? 'Sem tipo'}</Text>
    </View>
  )
}

// ─── TAB: PENDENTES ──────────────────────────────────────────────────────────
function PendentesTab() {
  const { data, isLoading } = usePendingByType()

  if (isLoading) return <ActivityIndicator color="#14b8a6" className="mt-20" />
  if (!data || data.all.length === 0) {
    return (
      <View className="items-center mt-20">
        <Text className="text-4xl mb-3">🎉</Text>
        <Text className="text-dark-50 font-semibold text-base">Nenhuma comissão pendente</Text>
        <Text className="text-dark-400 text-sm mt-1">Tudo pago e em dia!</Text>
      </View>
    )
  }

  return (
    <View>
      {/* Total pendente */}
      <View className="bg-yellow-900/40 border border-yellow-700 rounded-2xl p-4 mb-4">
        <Text className="text-yellow-300 text-xs mb-1">Total a receber</Text>
        <Text className="text-dark-50 text-3xl font-bold">{fmt(data.totalPending)}</Text>
        <Text className="text-yellow-400 text-xs mt-1">{data.all.length} comissão(ões) pendente(s)</Text>
      </View>

      {/* Por tipo de serviço */}
      {data.byType.map((group, i) => {
        const color = group.type?.color ?? '#64748b'
        return (
          <View key={i} className="bg-dark-800 rounded-2xl mb-3 overflow-hidden">
            {/* Header do grupo */}
            <View className="flex-row items-center justify-between px-4 py-3" style={{ borderLeftWidth: 3, borderLeftColor: color }}>
              <View className="flex-row items-center gap-2">
                {group.type?.icon ? <Text className="text-lg">{group.type.icon}</Text> : <Ionicons name="ellipse" size={14} color={color} />}
                <Text className="text-dark-50 font-semibold">{group.type?.name ?? 'Sem tipo'}</Text>
                <View className="bg-dark-700 rounded-full px-2 py-0.5">
                  <Text className="text-dark-300 text-xs">{group.items.length}</Text>
                </View>
              </View>
              <Text style={{ color }} className="font-bold text-base">{fmt(group.total)}</Text>
            </View>

            {/* Itens */}
            {group.items.map((c) => {
              const isOverdue = c.expected_at && new Date(c.expected_at) < new Date() && c.status === 'PENDING'
              return (
                <View key={c.id} className="flex-row justify-between items-start px-4 py-3 border-t border-dark-700">
                  <View className="flex-1 mr-3">
                    <Text className="text-dark-200 text-sm font-medium">{c.description}</Text>
                    {c.client && <Text className="text-dark-500 text-xs mt-0.5">{c.client}</Text>}
                    <View className="flex-row items-center gap-2 mt-1">
                      <Text className="text-dark-500 text-xs">Gerada {fmtDate(c.earned_at)}</Text>
                      {c.expected_at && (
                        <Text className={`text-xs ${isOverdue ? 'text-red-400' : 'text-dark-500'}`}>
                          {isOverdue ? '⚠️ Atrasada' : `Prevista ${fmtDate(c.expected_at)}`}
                        </Text>
                      )}
                    </View>
                  </View>
                  <Text className="text-dark-50 font-semibold">{fmt(c.amount)}</Text>
                </View>
              )
            })}
          </View>
        )
      })}
    </View>
  )
}

// ─── TAB: SEMANAL ────────────────────────────────────────────────────────────
function SemanalTab() {
  const { data: commissions, isLoading } = useWeeklyReport()

  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const mon = new Date(now); mon.setDate(now.getDate() + diff)
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
  const label = `${mon.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })} – ${sun.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}`

  if (isLoading) return <ActivityIndicator color="#14b8a6" className="mt-20" />

  const paid    = commissions?.filter((c) => c.status === 'PAID')    ?? []
  const pending = commissions?.filter((c) => c.status === 'PENDING') ?? []
  const totalPaid    = paid.reduce((s, c) => s + c.amount, 0)
  const totalPending = pending.reduce((s, c) => s + c.amount, 0)

  return (
    <View>
      <Text className="text-dark-400 text-xs mb-3">{label}</Text>

      <View className="flex-row gap-3 mb-4">
        <View className="flex-1 bg-dark-800 rounded-2xl p-4">
          <Text className="text-dark-400 text-xs mb-1">Recebido</Text>
          <Text className="text-mint-400 text-xl font-bold">{fmt(totalPaid)}</Text>
          <Text className="text-dark-500 text-xs mt-1">{paid.length} comissão(ões)</Text>
        </View>
        <View className="flex-1 bg-dark-800 rounded-2xl p-4">
          <Text className="text-dark-400 text-xs mb-1">Pendente</Text>
          <Text className="text-yellow-400 text-xl font-bold">{fmt(totalPending)}</Text>
          <Text className="text-dark-500 text-xs mt-1">{pending.length} comissão(ões)</Text>
        </View>
      </View>

      {commissions?.length === 0 ? (
        <View className="items-center py-12">
          <Text className="text-dark-500 text-sm">Nenhuma comissão esta semana</Text>
        </View>
      ) : (
        commissions?.map((c) => (
          <View key={c.id} className="bg-dark-800 rounded-2xl p-4 mb-3">
            <View className="flex-row justify-between items-start">
              <View className="flex-1 mr-3">
                <Text className="text-dark-50 font-medium">{c.description}</Text>
                {c.client && <Text className="text-dark-500 text-xs mt-0.5">{c.client}</Text>}
                <View className="flex-row items-center gap-2 mt-2">
                  <TypeBadge type={c.dm_commission_types} />
                  <Text className="text-dark-500 text-xs">{fmtDate(c.earned_at)}</Text>
                </View>
              </View>
              <View className="items-end">
                <Text className="text-dark-50 font-bold">{fmt(c.amount)}</Text>
                <Text className={`text-xs mt-1 ${c.status === 'PAID' ? 'text-mint-400' : 'text-yellow-400'}`}>
                  {c.status === 'PAID' ? '✓ Pago' : '⏳ Pendente'}
                </Text>
              </View>
            </View>
          </View>
        ))
      )}
    </View>
  )
}

// ─── TAB: MENSAL ─────────────────────────────────────────────────────────────
function MensalTab() {
  const { data, isLoading } = useMonthlyReport(MONTH, YEAR)

  if (isLoading) return <ActivityIndicator color="#14b8a6" className="mt-20" />
  if (!data) return null

  const monthName = new Date(YEAR, MONTH - 1).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })

  return (
    <View>
      <Text className="text-dark-400 text-xs mb-3 capitalize">{monthName}</Text>

      {/* Rendimento */}
      {data.income && (
        <View className="bg-dark-800 rounded-2xl p-4 mb-3">
          <Text className="text-dark-400 text-xs mb-2 uppercase tracking-wider">Rendimento</Text>
          <View className="flex-row justify-between">
            <Text className="text-dark-300 text-sm">Salário líquido</Text>
            <Text className="text-dark-50 font-semibold">{fmt(data.income.total_net)}</Text>
          </View>
        </View>
      )}

      {/* Comissões do mês */}
      <View className="bg-dark-800 rounded-2xl p-4 mb-3">
        <Text className="text-dark-400 text-xs mb-2 uppercase tracking-wider">Comissões do Mês</Text>
        <View className="flex-row gap-3 mb-3">
          <View className="flex-1">
            <Text className="text-dark-500 text-xs">Recebidas</Text>
            <Text className="text-mint-400 font-bold text-base">{fmt(data.totalCommPaid)}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-dark-500 text-xs">Pendentes</Text>
            <Text className="text-yellow-400 font-bold text-base">{fmt(data.totalCommPending)}</Text>
          </View>
        </View>
        {data.commissionsByType.map((g, i) => (
          <View key={i} className="flex-row justify-between items-center py-2 border-t border-dark-700">
            <TypeBadge type={g.type} />
            <View className="flex-row gap-4">
              <Text className="text-mint-400 text-sm">{fmt(g.paid)}</Text>
              {g.pending > 0 && <Text className="text-yellow-400 text-sm">{fmt(g.pending)}</Text>}
            </View>
          </View>
        ))}
      </View>

      {/* 50/30/20 */}
      {data.budget && (
        <View className="bg-dark-800 rounded-2xl p-4 mb-3">
          <Text className="text-dark-400 text-xs mb-2 uppercase tracking-wider">Orçamento</Text>
          {[
            { label: 'Necessidades', pct: data.budget.needs_pct, amt: data.budget.needs_amt, ideal: 0.5, good: data.budget.needs_pct <= 0.5 },
            { label: 'Desejos',      pct: data.budget.wants_pct, amt: data.budget.wants_amt, ideal: 0.3, good: data.budget.wants_pct <= 0.3 },
            { label: 'Poupança',     pct: data.budget.savings_pct, amt: data.budget.savings_amt, ideal: 0.2, good: data.budget.savings_pct >= 0.2 },
          ].map((r) => (
            <View key={r.label} className="flex-row justify-between items-center py-2 border-t border-dark-700">
              <View className="flex-row items-center gap-2">
                <Text className={r.good ? 'text-mint-400' : 'text-red-400'}>{r.good ? '✓' : '!'}</Text>
                <Text className="text-dark-300 text-sm">{r.label}</Text>
              </View>
              <View className="items-end">
                <Text className="text-dark-50 text-sm font-medium">{fmt(r.amt)}</Text>
                <Text className="text-dark-500 text-xs">{(r.pct * 100).toFixed(1)}% / ideal {(r.ideal * 100).toFixed(0)}%</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Portfolio */}
      <View className="bg-dark-800 rounded-2xl p-4 mb-3">
        <Text className="text-dark-400 text-xs mb-2 uppercase tracking-wider">Portfolio XTB</Text>
        <View className="flex-row justify-between">
          <Text className="text-dark-300 text-sm">Valor atual</Text>
          <Text className="text-dark-50 font-semibold">{fmt(data.portfolio.totalValue)}</Text>
        </View>
        <View className="flex-row justify-between mt-2">
          <Text className="text-dark-300 text-sm">P/L total</Text>
          <Text className={`font-semibold ${data.portfolio.totalPL >= 0 ? 'text-mint-400' : 'text-red-400'}`}>
            {data.portfolio.totalPL >= 0 ? '+' : ''}{fmt(data.portfolio.totalPL)}
          </Text>
        </View>
      </View>

      <View className="h-8" />
    </View>
  )
}

// ─── ECRÃ PRINCIPAL ──────────────────────────────────────────────────────────
export default function RelatoriosScreen() {
  const [tab, setTab] = useState<Tab>('pendentes')

  const tabs: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'pendentes', label: 'Pendentes', icon: 'time-outline' },
    { key: 'semanal',   label: 'Semana',    icon: 'calendar-outline' },
    { key: 'mensal',    label: 'Mês',       icon: 'bar-chart-outline' },
  ]

  return (
    <SafeAreaView className="flex-1 bg-dark-900">
      <Header />
      <View className="px-4 pt-4 pb-2">
        <Text className="text-dark-50 text-2xl font-bold mb-4">Relatórios</Text>

        {/* Tab selector */}
        <View className="flex-row bg-dark-800 rounded-xl p-1 mb-1">
          {tabs.map((t) => (
            <TouchableOpacity
              key={t.key}
              className={`flex-1 flex-row items-center justify-center gap-1.5 py-2 rounded-lg ${tab === t.key ? 'bg-mint-600' : ''}`}
              onPress={() => setTab(t.key)}
            >
              <Ionicons name={t.icon} size={14} color={tab === t.key ? 'white' : '#475569'} />
              <Text className={`text-xs font-medium ${tab === t.key ? 'text-dark-50' : 'text-dark-500'}`}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView className="flex-1 px-4 pt-2" showsVerticalScrollIndicator={false}>
        {tab === 'pendentes' && <PendentesTab />}
        {tab === 'semanal'   && <SemanalTab />}
        {tab === 'mensal'    && <MensalTab />}
      </ScrollView>
    </SafeAreaView>
  )
}
