import Header from '../../components/ui/Header'
import { useState } from 'react'
import { ScrollView, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useWeeklyReport, useMonthlyReport, usePendingByType } from '../../hooks/useReports'
import type { DmCommissionType } from '../../types/database'

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
      <View className="bg-dark-800 border border-dark-600 rounded-2xl p-4 mb-4">
        <Text className="text-dark-400 text-xs mb-1">Total a receber</Text>
        <Text className="text-dark-50 text-3xl font-bold">{fmt(data.totalPending)}</Text>
        <Text className="text-xs mt-1" style={{ color: '#f59e0b' }}>{data.all.length} comissão(ões) pendente(s)</Text>
      </View>

      {data.byType.map((group, i) => {
        const color = group.type?.color ?? '#64748b'
        return (
          <View key={i} className="bg-dark-800 border border-dark-600 rounded-2xl mb-3 overflow-hidden">
            <View className="flex-row items-center justify-between px-4 py-3" style={{ borderLeftWidth: 3, borderLeftColor: color }}>
              <View className="flex-row items-center gap-2">
                {group.type?.icon ? <Text className="text-lg">{group.type.icon}</Text> : <Ionicons name="ellipse" size={14} color={color} />}
                <Text className="text-dark-50 font-semibold">{group.type?.name ?? 'Sem tipo'}</Text>
                <View className="bg-dark-700 rounded-full px-2 py-0.5">
                  <Text className="text-dark-400 text-xs">{group.items.length}</Text>
                </View>
              </View>
              <Text style={{ color }} className="font-bold text-base">{fmt(group.total)}</Text>
            </View>
            {group.items.map((c) => {
              const isOverdue = c.expected_at && new Date(c.expected_at) < new Date() && c.status === 'PENDING'
              return (
                <View key={c.id} className="flex-row justify-between items-start px-4 py-3 border-t border-dark-600">
                  <View className="flex-1 mr-3">
                    <Text className="text-dark-50 text-sm font-medium">{c.description}</Text>
                    {c.client && <Text className="text-dark-400 text-xs mt-0.5">{c.client}</Text>}
                    <View className="flex-row items-center gap-2 mt-1">
                      <Text className="text-dark-400 text-xs">Gerada {fmtDate(c.earned_at)}</Text>
                      {c.expected_at && (
                        <Text className="text-xs" style={{ color: isOverdue ? '#ef4444' : '#94a3b8' }}>
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
        <View className="flex-1 bg-dark-800 border border-dark-600 rounded-2xl p-4">
          <Text className="text-dark-400 text-xs mb-1">Recebido</Text>
          <Text className="font-bold text-xl" style={{ color: '#14b8a6' }}>{fmt(totalPaid)}</Text>
          <Text className="text-dark-400 text-xs mt-1">{paid.length} comissão(ões)</Text>
        </View>
        <View className="flex-1 bg-dark-800 border border-dark-600 rounded-2xl p-4">
          <Text className="text-dark-400 text-xs mb-1">Pendente</Text>
          <Text className="font-bold text-xl" style={{ color: '#f59e0b' }}>{fmt(totalPending)}</Text>
          <Text className="text-dark-400 text-xs mt-1">{pending.length} comissão(ões)</Text>
        </View>
      </View>
      {commissions?.length === 0 ? (
        <View className="items-center py-12">
          <Text className="text-dark-400 text-sm">Nenhuma comissão esta semana</Text>
        </View>
      ) : (
        commissions?.map((c) => (
          <View key={c.id} className="bg-dark-800 border border-dark-600 rounded-2xl p-4 mb-3">
            <View className="flex-row justify-between items-start">
              <View className="flex-1 mr-3">
                <Text className="text-dark-50 font-medium">{c.description}</Text>
                {c.client && <Text className="text-dark-400 text-xs mt-0.5">{c.client}</Text>}
                <View className="flex-row items-center gap-2 mt-2">
                  <TypeBadge type={c.dm_commission_types} />
                  <Text className="text-dark-400 text-xs">{fmtDate(c.earned_at)}</Text>
                </View>
              </View>
              <View className="items-end">
                <Text className="text-dark-50 font-bold">{fmt(c.amount)}</Text>
                <Text className="text-xs mt-1" style={{ color: c.status === 'PAID' ? '#14b8a6' : '#f59e0b' }}>
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

// ─── KPI CARD ────────────────────────────────────────────────────────────────
function KpiCard({ label, value, color, icon }: {
  label: string
  value: string
  color: string
  icon: keyof typeof Ionicons.glyphMap
}) {
  return (
    <View className="flex-1 bg-dark-800 border border-dark-600 rounded-2xl p-3 items-center">
      <View className="w-8 h-8 rounded-full items-center justify-center mb-1.5" style={{ backgroundColor: color + '20' }}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text className="text-dark-400 text-xs text-center mb-0.5">{label}</Text>
      <Text className="font-bold text-sm text-center" style={{ color }}>{value}</Text>
    </View>
  )
}

// ─── BARRA DE PROGRESSO ───────────────────────────────────────────────────────
function BudgetBar({ label, pct, ideal, amount, good }: {
  label: string; pct: number; ideal: number; amount: number; good: boolean
}) {
  return (
    <View className="mb-3">
      <View className="flex-row justify-between items-center mb-1">
        <View className="flex-row items-center gap-1.5">
          <Text style={{ color: good ? '#14b8a6' : '#f59e0b', fontSize: 12 }}>{good ? '✓' : '!'}</Text>
          <Text className="text-dark-50 text-sm font-medium">{label}</Text>
        </View>
        <View className="items-end">
          <Text className="text-dark-50 text-sm font-semibold">{fmt(amount)}</Text>
          <Text className="text-dark-400 text-xs">{(pct * 100).toFixed(0)}% · ideal {(ideal * 100).toFixed(0)}%</Text>
        </View>
      </View>
      <View className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
        <View
          className="h-full rounded-full"
          style={{ width: `${Math.min(pct / ideal, 1.5) * 100}%`, backgroundColor: good ? '#14b8a6' : '#f59e0b' }}
        />
      </View>
    </View>
  )
}

// ─── NAVEGADOR DE MÊS ────────────────────────────────────────────────────────
function MonthNav({ month, year, onPrev, onNext }: {
  month: number; year: number; onPrev: () => void; onNext: () => void
}) {
  const now = new Date()
  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear()
  const label = new Date(year, month - 1).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })

  return (
    <View className="flex-row items-center justify-between bg-dark-800 border border-dark-600 rounded-2xl px-4 py-2.5 mb-4">
      <TouchableOpacity onPress={onPrev} hitSlop={8}>
        <Ionicons name="chevron-back" size={20} color="#14b8a6" />
      </TouchableOpacity>
      <Text className="text-dark-50 font-semibold capitalize">{label}</Text>
      <TouchableOpacity onPress={onNext} disabled={isCurrentMonth} hitSlop={8}>
        <Ionicons name="chevron-forward" size={20} color={isCurrentMonth ? '#c9d4cf' : '#14b8a6'} />
      </TouchableOpacity>
    </View>
  )
}

// ─── TAB: MENSAL ─────────────────────────────────────────────────────────────
function MensalTab() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear]   = useState(now.getFullYear())

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1) }
    else setMonth((m) => m - 1)
  }
  function nextMonth() {
    const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear()
    if (isCurrentMonth) return
    if (month === 12) { setMonth(1); setYear((y) => y + 1) }
    else setMonth((m) => m + 1)
  }

  const { data, isLoading } = useMonthlyReport(month, year)

  if (isLoading) return (
    <>
      <MonthNav month={month} year={year} onPrev={prevMonth} onNext={nextMonth} />
      <ActivityIndicator color="#14b8a6" className="mt-16" />
    </>
  )

  const totalIncome = (data?.income?.total_net ?? 0) + (data?.totalCommPaid ?? 0)
  const portfolioPL = data?.portfolio.totalPL ?? 0
  const plPositive  = portfolioPL >= 0

  // Média de dias para receber (earned_at → paid_at) das comissões PAID do mês
  const avgDays = (() => {
    const paid = (data?.commissions ?? []).filter((c) => c.status === 'PAID' && c.paid_at && c.earned_at)
    if (paid.length === 0) return null
    const sum = paid.reduce((s, c) => {
      const diff = new Date(c.paid_at!).getTime() - new Date(c.earned_at).getTime()
      return s + diff / (1000 * 60 * 60 * 24)
    }, 0)
    return Math.round(sum / paid.length)
  })()

  return (
    <View>
      <MonthNav month={month} year={year} onPrev={prevMonth} onNext={nextMonth} />

      {/* HERO — rendimento total do mês */}
      <View
        className="rounded-2xl p-5 mb-4"
        style={{ backgroundColor: '#f0fdfa', borderWidth: 1.5, borderColor: '#99f6e4' }}
      >
        <Text className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#14b8a6' }}>
          Este mês já faturaste
        </Text>
        <Text className="font-bold mb-1" style={{ fontSize: 36, color: '#0f172a', lineHeight: 42 }}>
          {fmt(totalIncome)}
        </Text>
        <View className="flex-row gap-3">
          {data?.income && (
            <Text className="text-xs" style={{ color: '#64748b' }}>
              Salário {fmt(data.income.total_net)}
            </Text>
          )}
          {(data?.totalCommPaid ?? 0) > 0 && (
            <Text className="text-xs" style={{ color: '#64748b' }}>
              + Comissões {fmt(data!.totalCommPaid)}
            </Text>
          )}
        </View>
      </View>

      {/* KPIs rápidos — 2×2 */}
      <View className="flex-row gap-2 mb-2">
        <KpiCard
          label="Comissões pagas"
          value={fmt(data?.totalCommPaid ?? 0)}
          color="#14b8a6"
          icon="cash-outline"
        />
        <KpiCard
          label="Tens a receber"
          value={fmt(data?.totalCommPending ?? 0)}
          color="#f59e0b"
          icon="time-outline"
        />
      </View>
      <View className="flex-row gap-2 mb-4">
        <KpiCard
          label="Portfolio P/L"
          value={(plPositive ? '+' : '') + fmt(portfolioPL)}
          color={plPositive ? '#14b8a6' : '#ef4444'}
          icon="trending-up-outline"
        />
        <KpiCard
          label="Média dias a receber"
          value={avgDays !== null ? `${avgDays} dias` : '—'}
          color="#6366f1"
          icon="hourglass-outline"
        />
      </View>

      {/* Orçamento 50/30/20 */}
      {data?.budget && (
        <View className="bg-dark-800 border border-dark-600 rounded-2xl p-4 mb-4">
          <Text className="text-dark-400 text-xs uppercase tracking-widest mb-3">Orçamento</Text>
          <BudgetBar
            label="Necessidades"
            pct={data.budget.needs_pct}
            ideal={0.5}
            amount={data.budget.needs_amt}
            good={data.budget.needs_pct <= 0.5}
          />
          <BudgetBar
            label="Desejos"
            pct={data.budget.wants_pct}
            ideal={0.3}
            amount={data.budget.wants_amt}
            good={data.budget.wants_pct <= 0.3}
          />
          <BudgetBar
            label="Poupança"
            pct={data.budget.savings_pct}
            ideal={0.2}
            amount={data.budget.savings_amt}
            good={data.budget.savings_pct >= 0.2}
          />
        </View>
      )}

      {/* Comissões por tipo */}
      {(data?.commissionsByType?.length ?? 0) > 0 && (
        <View className="bg-dark-800 border border-dark-600 rounded-2xl p-4 mb-4">
          <Text className="text-dark-400 text-xs uppercase tracking-widest mb-3">Comissões por Serviço</Text>
          {data!.commissionsByType.map((g, i) => (
            <View key={i} className="flex-row justify-between items-center py-2 border-t border-dark-600">
              <TypeBadge type={g.type} />
              <View className="flex-row gap-3 items-center">
                {g.pending > 0 && (
                  <Text className="text-xs font-medium" style={{ color: '#f59e0b' }}>{fmt(g.pending)}</Text>
                )}
                <Text className="text-sm font-semibold" style={{ color: '#14b8a6' }}>{fmt(g.paid)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Portfolio resumo */}
      <View className="bg-dark-800 border border-dark-600 rounded-2xl p-4 mb-4">
        <Text className="text-dark-400 text-xs uppercase tracking-widest mb-3">Portfolio</Text>
        <View className="flex-row justify-between items-center">
          <Text className="text-dark-50 text-sm">Valor atual</Text>
          <Text className="text-dark-50 font-semibold">{fmt(data?.portfolio.totalValue ?? 0)}</Text>
        </View>
        <View className="flex-row justify-between items-center mt-2">
          <Text className="text-dark-50 text-sm">P/L total</Text>
          <Text className="font-semibold" style={{ color: plPositive ? '#14b8a6' : '#ef4444' }}>
            {plPositive ? '+' : ''}{fmt(portfolioPL)}
          </Text>
        </View>
      </View>

      {/* Top despesas */}
      {(data?.topExpenses?.length ?? 0) > 0 && (
        <View className="bg-dark-800 border border-dark-600 rounded-2xl p-4 mb-4">
          <Text className="text-dark-400 text-xs uppercase tracking-widest mb-3">Top Despesas</Text>
          {(data?.topExpenses ?? []).map((e: any, i: number) => (
            <View key={e.id ?? i} className="flex-row justify-between items-center py-2 border-t border-dark-600">
              <View className="flex-1 mr-3">
                <Text className="text-dark-50 text-sm" numberOfLines={1}>{e.description}</Text>
                {e.dm_expense_categories?.name && (
                  <Text className="text-dark-400 text-xs">{e.dm_expense_categories.name}</Text>
                )}
              </View>
              <Text className="text-dark-50 font-semibold">{fmt(e.amount)}</Text>
            </View>
          ))}
        </View>
      )}

      {!data && (
        <View className="items-center py-12">
          <Text className="text-dark-400 text-sm">Sem dados para este mês</Text>
        </View>
      )}

      <View className="h-8" />
    </View>
  )
}

// ─── ECRÃ PRINCIPAL ──────────────────────────────────────────────────────────
export default function RelatoriosScreen() {
  const [tab, setTab] = useState<Tab>('mensal')

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
        <View className="flex-row bg-dark-800 border border-dark-600 rounded-xl p-1 mb-1">
          {tabs.map((t) => (
            <TouchableOpacity
              key={t.key}
              className={`flex-1 flex-row items-center justify-center gap-1.5 py-2 rounded-lg ${tab === t.key ? 'bg-mint-600' : ''}`}
              onPress={() => setTab(t.key)}
            >
              <Ionicons name={t.icon} size={14} color={tab === t.key ? 'white' : '#475569'} />
              <Text className={`text-xs font-medium ${tab === t.key ? 'text-dark-50' : 'text-dark-400'}`}>
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
