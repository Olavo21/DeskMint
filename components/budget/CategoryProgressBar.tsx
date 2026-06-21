import { View, Text, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

const fmt = (n: number) => n.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })

function barColor(pct: number) {
  if (pct > 1) return '#ef4444'   // vermelho — ultrapassou o teto
  if (pct >= 0.7) return '#f59e0b' // laranja — a aproximar-se
  return '#14b8a6'                 // verde-menta — confortável
}

interface Props {
  name: string
  icon?: string | null
  spent: number
  limit: number | null
  onEditLimit: () => void
}

export default function CategoryProgressBar({ name, icon, spent, limit, onEditLimit }: Props) {
  const pct = limit ? spent / limit : 0
  const color = barColor(pct)

  return (
    <View className="mb-4">
      <View className="flex-row justify-between items-center mb-1.5">
        <View className="flex-row items-center gap-1.5 flex-1">
          {icon ? <Text className="text-base">{icon}</Text> : null}
          <Text className="text-dark-200 text-sm font-medium">{name}</Text>
        </View>
        <TouchableOpacity onPress={onEditLimit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text className="text-dark-400 text-xs">
            {fmt(spent)}{limit ? ` / ${fmt(limit)}` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {limit ? (
        <View className="h-2.5 bg-dark-700 rounded-full overflow-hidden">
          <View
            className="h-full rounded-full"
            style={{ width: `${Math.min(pct * 100, 100)}%`, backgroundColor: color }}
          />
        </View>
      ) : (
        <TouchableOpacity
          onPress={onEditLimit}
          className="flex-row items-center gap-1 border border-dashed border-dark-600 rounded-lg px-2 py-1.5 self-start"
        >
          <Ionicons name="add-circle-outline" size={13} color="#94a3b8" />
          <Text className="text-dark-500 text-xs">Definir teto mensal</Text>
        </TouchableOpacity>
      )}

      {limit && pct > 1 && (
        <Text className="text-red-400 text-xs mt-1">
          {fmt(spent - limit)} acima do teto
        </Text>
      )}
    </View>
  )
}
