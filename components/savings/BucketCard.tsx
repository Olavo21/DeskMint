import { View, Text, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { SavingBucket } from '../../hooks/useSavingBuckets'
import { useFmt } from '../../utils/format'

type Props = {
  bucket: SavingBucket
  onAddAmount: (bucket: SavingBucket) => void
  onDelete: (id: string) => void
  onEdit: (bucket: SavingBucket) => void
}

export default function BucketCard({ bucket, onAddAmount, onDelete, onEdit }: Props) {
  const fmt = useFmt()
  const pct = bucket.target_amount > 0
    ? Math.min(bucket.current_amount / bucket.target_amount, 1)
    : 0
  const remaining = Math.max(bucket.target_amount - bucket.current_amount, 0)

  const daysLeft = bucket.deadline
    ? Math.ceil((new Date(bucket.deadline).getTime() - Date.now()) / 86_400_000)
    : null

  return (
    <View
      className="bg-dark-800 border border-dark-600 rounded-2xl p-4 mb-3"
      style={bucket.is_completed ? { borderColor: bucket.color + '60' } : undefined}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <Text style={{ fontSize: 22 }}>{bucket.emoji}</Text>
          <View>
            <Text className="text-dark-50 font-semibold text-sm">{bucket.name}</Text>
            {daysLeft !== null && !bucket.is_completed && (
              <Text className="text-dark-400 text-xs">
                {daysLeft > 0 ? `${daysLeft} dias restantes` : 'Prazo ultrapassado'}
              </Text>
            )}
          </View>
        </View>
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => onEdit(bucket)} hitSlop={8}>
            <Ionicons name="pencil-outline" size={16} color="#475569" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(bucket.id)} hitSlop={8}>
            <Ionicons name="trash-outline" size={16} color="#475569" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress bar */}
      <View className="h-2 bg-dark-700 rounded-full overflow-hidden mb-2">
        <View
          className="h-full rounded-full"
          style={{ width: `${pct * 100}%`, backgroundColor: bucket.is_completed ? '#14b8a6' : bucket.color }}
        />
      </View>

      {/* Amounts + CTA */}
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-dark-50 font-bold text-sm">
            {fmt(bucket.current_amount)}
            <Text className="text-dark-400 font-normal"> / {fmt(bucket.target_amount)}</Text>
          </Text>
          {!bucket.is_completed && (
            <Text className="text-dark-500 text-xs">Faltam {fmt(remaining)}</Text>
          )}
        </View>
        {bucket.is_completed ? (
          <View className="flex-row items-center gap-1 px-3 py-1 rounded-full" style={{ backgroundColor: '#14b8a620' }}>
            <Ionicons name="checkmark-circle" size={14} color="#14b8a6" />
            <Text style={{ color: '#14b8a6', fontSize: 12, fontWeight: '600' }}>Concluído</Text>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => onAddAmount(bucket)}
            className="flex-row items-center gap-1 px-3 py-1.5 rounded-full"
            style={{ backgroundColor: bucket.color + '20', borderWidth: 1, borderColor: bucket.color + '40' }}
          >
            <Ionicons name="add" size={14} color={bucket.color} />
            <Text style={{ color: bucket.color, fontSize: 12, fontWeight: '600' }}>Poupar</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}
