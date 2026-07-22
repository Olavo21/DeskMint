import { View, Text, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTutorial } from '../../hooks/useTutorial'

export default function QuickstartChecklist() {
  const { steps, completedCount, total, isVisible, complete } = useTutorial()

  if (!isVisible) return null

  return (
    <View
      className="rounded-2xl mb-4 overflow-hidden"
      style={{ backgroundColor: '#0f2d2a', borderWidth: 1, borderColor: '#14b8a630' }}
    >
      {/* Header */}
      <View style={{ backgroundColor: '#14b8a610', paddingHorizontal: 16, paddingVertical: 12 }}>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Text style={{ fontSize: 16 }}>🚀</Text>
            <Text style={{ color: '#f1f5f9', fontWeight: '700', fontSize: 14 }}>Primeiros Passos</Text>
          </View>
          <View className="flex-row items-center gap-3">
            <Text style={{ color: '#5eead4', fontSize: 12, fontWeight: '600' }}>
              {completedCount} / {total}
            </Text>
            <TouchableOpacity onPress={() => complete.mutate()} hitSlop={8}>
              <Ionicons name="close" size={16} color="#475569" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Progress bar */}
        <View
          className="mt-3 rounded-full overflow-hidden"
          style={{ height: 3, backgroundColor: '#1e3a37' }}
        >
          <View
            className="h-full rounded-full"
            style={{ width: `${(completedCount / total) * 100}%`, backgroundColor: '#14b8a6' }}
          />
        </View>
      </View>

      {/* Steps */}
      <View className="px-4 py-3 gap-1">
        {steps.map((step, i) => (
          <TouchableOpacity
            key={step.key}
            onPress={() => step.route && router.push(step.route as any)}
            activeOpacity={step.route ? 0.7 : 1}
            className="flex-row items-center gap-3 py-2"
          >
            {/* Circle / Check */}
            <View
              className="w-6 h-6 rounded-full items-center justify-center"
              style={{
                backgroundColor: step.done ? '#14b8a6' : 'transparent',
                borderWidth: step.done ? 0 : 1.5,
                borderColor: '#334155',
              }}
            >
              {step.done
                ? <Ionicons name="checkmark" size={13} color="#fff" />
                : <Text style={{ color: '#475569', fontSize: 10, fontWeight: '700' }}>{i + 1}</Text>
              }
            </View>

            <Text
              style={{
                flex: 1,
                fontSize: 13,
                color: step.done ? '#64748b' : '#e2e8f0',
                textDecorationLine: step.done ? 'line-through' : 'none',
              }}
            >
              {step.label}
            </Text>

            {!step.done && step.route && (
              <Ionicons name="chevron-forward" size={14} color="#475569" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}
