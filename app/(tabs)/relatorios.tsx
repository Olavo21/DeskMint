import Header from '../../components/ui/Header'
import { useState } from 'react'
import { ScrollView, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useMonthlyReport, useAllTimeReport } from '../../hooks/useReports'
import type { DmCommissionType } from '../../types/database'

type Tab = 'mensal' | 'sempre'

function fmt(n: number) { return n.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' }) }

function TypeBadge({ type }: { type: DmCommissionType | null }) {
  const color = type?.color ?? '#64748b'
  return (
    <View className="flex-row items-center gap-1 rounded-full px-2.5 py-0.5" style={{ backgroundColor: color + '22', borderWidth: 1, borderColor: color + '66' }}>
      {type?.icon ? <Text style={{ fontSize: 11 }}>{type.icon}</Text> : null}
      <Text style={{ color, fontSize: 11, fontWeight: '600' }}>{type?.name ?? 'Sem tipo'}</Text>
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

  // Dias do serviço ao pagamento, em dias de calendário. service_date e não earned_at:
  // earned_at é a data de registo e chegou a ser posterior ao pagamento (−2 dias).
  const avgDays = (() => {
    const paid = (data?.commissions ?? []).filter((c) => c.status === 'PAID' && c.paid_at)
    if (paid.length === 0) return null
    const dayOf = (v: string) => {
      const d = new Date(v.length === 10 ? v + 'T00:00:00' : v) // 'AAAA-MM-DD' como data local
      return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    }
    const sum = paid.reduce((s, c) => s + (dayOf(c.paid_at!) - dayOf(c.service_date ?? c.earned_at)) / 86_400_000, 0)
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
          label="Pagas neste mês"
          value={fmt(data?.totalCommPaid ?? 0)}
          color="#14b8a6"
          icon="cash-outline"
        />
        <KpiCard
          label="A receber deste mês"
          value={fmt((data?.totalCommToPay ?? 0) + (data?.totalCommPending ?? 0))}
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
          value={avgDays !== null ? `${avgDays} ${avgDays === 1 ? 'dia' : 'dias'}` : '—'}
          color="#6366f1"
          icon="hourglass-outline"
        />
      </View>

      {/* Comissões por tipo */}
      {(data?.commissionsByType?.length ?? 0) > 0 && (
        <View className="bg-dark-800 border border-dark-600 rounded-2xl p-4 mb-4">
          <Text className="text-dark-400 text-xs uppercase tracking-widest mb-3">Comissões por Serviço</Text>
          {data!.commissionsByType.map((g, i) => (
            <View key={i} className="flex-row justify-between items-center py-2 border-t border-dark-600">
              <View className="flex-1 mr-3">
                <TypeBadge type={g.type} />
              </View>
              {/* Os três estados aparecem sempre que têm valor: uma comissão que
                  entra no count tem de aparecer no dinheiro. */}
              <View className="flex-row gap-3 items-center">
                {g.pending > 0 && (
                  <Text className="text-xs font-medium" style={{ color: '#f59e0b' }}>{fmt(g.pending)}</Text>
                )}
                {g.toPay > 0 && (
                  <Text className="text-xs font-medium" style={{ color: '#6366f1' }}>{fmt(g.toPay)}</Text>
                )}
                <Text className="text-sm font-semibold" style={{ color: '#14b8a6' }}>{fmt(g.paid)}</Text>
              </View>
            </View>
          ))}
          <View className="flex-row gap-3 justify-end mt-2 pt-2 border-t border-dark-600">
            <Text className="text-[10px]" style={{ color: '#f59e0b' }}>Por validar</Text>
            <Text className="text-[10px]" style={{ color: '#6366f1' }}>Validadas</Text>
            <Text className="text-[10px]" style={{ color: '#14b8a6' }}>Pagas</Text>
          </View>
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

// ─── TAB: DESDE SEMPRE ──────────────────────────────────────────────────────
function DesdeSempreTab() {
  const { data, isLoading, isError } = useAllTimeReport()

  if (isLoading) return <ActivityIndicator color="#14b8a6" className="mt-20" />
  // Em erro não mostrar 0,00 € — seria uma conclusão errada, não um número em falta.
  if (isError || !data) {
    return (
      <View className="items-center mt-20">
        <Text className="text-dark-400 text-sm">Não foi possível carregar o total.</Text>
      </View>
    )
  }

  return (
    <View
      className="rounded-2xl p-5 mt-2"
      style={{ backgroundColor: '#f0fdfa', borderWidth: 1.5, borderColor: '#99f6e4' }}
    >
      <Text className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#14b8a6' }}>
        Comissões faturadas desde sempre
      </Text>
      <Text className="font-bold" style={{ fontSize: 36, color: '#0f172a', lineHeight: 42 }}>
        {fmt(data.total)}
      </Text>
    </View>
  )
}

// ─── ECRÃ PRINCIPAL ──────────────────────────────────────────────────────────
export default function RelatoriosScreen() {
  const [tab, setTab] = useState<Tab>('mensal')

  const tabs: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'mensal', label: 'Mês',          icon: 'bar-chart-outline' },
    { key: 'sempre', label: 'Desde sempre', icon: 'infinite-outline' },
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
        {tab === 'mensal' && <MensalTab />}
        {tab === 'sempre' && <DesdeSempreTab />}
      </ScrollView>
    </SafeAreaView>
  )
}
