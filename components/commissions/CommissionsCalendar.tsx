import { useMemo, useState } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { DmCommission } from '../../types/database'

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

const fmt = (n: number) => n.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

function toDateKey(iso: string) {
  return iso.slice(0, 10) // "YYYY-MM-DD"
}

// Conversão segunda-feira-primeiro: getDay() devolve 0=Domingo..6=Sábado
function mondayIndex(jsDay: number) {
  return (jsDay + 6) % 7
}

type DayInfo = { date: Date; key: string; received: number; hasCancelled: boolean }

interface Props {
  commissions: DmCommission[]
  selectedDay: string | null
  onSelectDay: (day: string | null) => void
}

export default function CommissionsCalendar({ commissions, selectedDay, onSelectDay }: Props) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return { month: now.getMonth(), year: now.getFullYear() }
  })

  // Totais de "recebido" (PAID, por paid_at) e "cancelado" (CANCELLED, por earned_at) por dia
  const { receivedByDay, cancelledDays } = useMemo(() => {
    const received = new Map<string, number>()
    const cancelled = new Set<string>()
    for (const c of commissions) {
      if (c.status === 'PAID' && c.paid_at) {
        const key = toDateKey(c.paid_at)
        received.set(key, (received.get(key) ?? 0) + c.amount)
      }
      if (c.status === 'CANCELLED') {
        cancelled.add(toDateKey(c.earned_at))
      }
    }
    return { receivedByDay: received, cancelledDays: cancelled }
  }, [commissions])

  const weeks = useMemo(() => {
    const firstOfMonth = new Date(cursor.year, cursor.month, 1)
    const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate()
    const leadingBlanks = mondayIndex(firstOfMonth.getDay())

    const cells: (DayInfo | null)[] = []
    for (let i = 0; i < leadingBlanks; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(cursor.year, cursor.month, d)
      const key = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      cells.push({
        date,
        key,
        received: receivedByDay.get(key) ?? 0,
        hasCancelled: cancelledDays.has(key),
      })
    }
    while (cells.length % 7 !== 0) cells.push(null)

    const result: (DayInfo | null)[][] = []
    for (let i = 0; i < cells.length; i += 7) result.push(cells.slice(i, i + 7))
    return result
  }, [cursor, receivedByDay, cancelledDays])

  const monthLabel = new Date(cursor.year, cursor.month).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })

  function changeMonth(delta: number) {
    setCursor((prev) => {
      const d = new Date(prev.year, prev.month + delta, 1)
      return { month: d.getMonth(), year: d.getFullYear() }
    })
    onSelectDay(null)
  }

  function handlePressDay(day: DayInfo) {
    onSelectDay(selectedDay === day.key ? null : day.key)
  }

  return (
    <View className="bg-dark-800 rounded-2xl p-4 mb-5">
      {/* Navegação de mês */}
      <View className="flex-row items-center justify-between mb-3">
        <TouchableOpacity onPress={() => changeMonth(-1)} hitSlop={10}>
          <Ionicons name="chevron-back" size={18} color="#94a3b8" />
        </TouchableOpacity>
        <Text className="text-dark-50 font-semibold text-sm capitalize">{monthLabel}</Text>
        <TouchableOpacity onPress={() => changeMonth(1)} hitSlop={10}>
          <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      {/* Cabeçalho dos dias da semana */}
      <View className="flex-row mb-1.5">
        {WEEKDAYS.map((w) => (
          <View key={w} className="flex-1 items-center">
            <Text className="text-dark-500 text-[10px]">{w}</Text>
          </View>
        ))}
      </View>

      {/* Grid */}
      {weeks.map((week, wi) => (
        <View key={wi} className="flex-row mb-1.5" style={{ gap: 4 }}>
          {week.map((day, di) => {
            if (!day) return <View key={di} style={{ flex: 1, aspectRatio: 1 }} />

            const isSelected = selectedDay === day.key
            const isProfit = day.received > 0
            const isLoss = !isProfit && day.hasCancelled
            const bg = isProfit ? '#0d948833' : isLoss ? '#ef444433' : '#1e293b'
            const borderColor = isSelected ? '#14b8a6' : isProfit ? '#0d948866' : isLoss ? '#ef444466' : '#334155'
            const textColor = isProfit ? '#2dd4bf' : isLoss ? '#f87171' : '#94a3b8'

            return (
              <TouchableOpacity
                key={di}
                onPress={() => handlePressDay(day)}
                style={{
                  flex: 1, aspectRatio: 1, borderRadius: 8,
                  backgroundColor: bg,
                  borderWidth: isSelected ? 2 : 1,
                  borderColor,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Text style={{ color: textColor, fontSize: 11, fontWeight: isProfit || isLoss ? '700' : '400' }}>
                  {day.date.getDate()}
                </Text>
                {isProfit && (
                  <Text style={{ color: textColor, fontSize: 8 }} numberOfLines={1}>
                    {fmt(day.received)}
                  </Text>
                )}
              </TouchableOpacity>
            )
          })}
        </View>
      ))}

      {/* Legenda */}
      <View className="flex-row items-center justify-center gap-4 mt-2">
        <View className="flex-row items-center gap-1.5">
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#0d9488' }} />
          <Text className="text-dark-500 text-[10px]">Recebido</Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' }} />
          <Text className="text-dark-500 text-[10px]">Cancelada</Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' }} />
          <Text className="text-dark-500 text-[10px]">Sem atividade</Text>
        </View>
      </View>
    </View>
  )
}
