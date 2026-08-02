import { useState, useEffect } from 'react'
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Ionicons } from '@expo/vector-icons'
import type { CreateBucketPayload, SavingBucket, UpdateBucketPayload } from '../../hooks/useSavingBuckets'

const EMOJIS = ['🎯','✈️','🏠','🚗','🎓','💍','📱','🏖️','💊','🐾','🎮','🛋️','👶','🌍','💼','🎸']
const COLORS = ['#14b8a6','#6366f1','#f59e0b','#ef4444','#10b981','#8b5cf6','#f97316','#06b6d4']

type Props = {
  visible: boolean
  onClose: () => void
  onCreate: (payload: CreateBucketPayload) => void
  onUpdate?: (id: string, payload: UpdateBucketPayload) => void
  isPending: boolean
  initialBucket?: SavingBucket | null
}

export default function NovoBucketModal({ visible, onClose, onCreate, onUpdate, isPending, initialBucket }: Props) {
  const isEdit = !!initialBucket

  const [name, setName]             = useState('')
  const [emoji, setEmoji]           = useState('🎯')
  const [color, setColor]           = useState('#14b8a6')
  const [target, setTarget]         = useState('')
  const [deadlineDate, setDeadlineDate] = useState<Date | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)

  useEffect(() => {
    if (!visible) return
    if (initialBucket) {
      setName(initialBucket.name)
      setEmoji(initialBucket.emoji)
      setColor(initialBucket.color)
      setTarget(String(initialBucket.target_amount))
      setDeadlineDate(initialBucket.deadline ? new Date(initialBucket.deadline) : null)
    } else {
      setName('')
      setEmoji('🎯')
      setColor('#14b8a6')
      setTarget('')
      setDeadlineDate(null)
    }
    setShowDatePicker(false)
  }, [visible, initialBucket])

  const handleSubmit = () => {
    const amount = parseFloat(target.replace(',', '.'))
    if (!name.trim() || isNaN(amount) || amount <= 0) return
    const payload: CreateBucketPayload = {
      name: name.trim(),
      emoji,
      color,
      target_amount: amount,
      deadline: deadlineDate ? deadlineDate.toISOString().split('T')[0] : null,
    }
    if (isEdit && onUpdate) {
      onUpdate(initialBucket!.id, payload)
    } else {
      onCreate(payload)
    }
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      >
        <View className="flex-1" />
        <View className="bg-dark-900 rounded-t-3xl p-6">
          <View className="w-10 h-1 bg-dark-600 rounded-full self-center mb-5" />

          <View className="flex-row items-center justify-between mb-5">
            <Text className="text-dark-50 text-lg font-bold">
              {isEdit ? 'Editar Objetivo' : 'Novo Objetivo'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Emoji picker */}
            <Text className="text-dark-400 text-xs font-semibold uppercase tracking-widest mb-2">Ícone</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
              <View className="flex-row gap-2">
                {EMOJIS.map((e) => (
                  <TouchableOpacity
                    key={e}
                    onPress={() => setEmoji(e)}
                    className="w-10 h-10 rounded-xl items-center justify-center"
                    style={{ backgroundColor: e === emoji ? color + '30' : '#1e293b', borderWidth: e === emoji ? 1 : 0, borderColor: color }}
                  >
                    <Text style={{ fontSize: 20 }}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Color picker */}
            <Text className="text-dark-400 text-xs font-semibold uppercase tracking-widest mb-2">Cor</Text>
            <View className="flex-row gap-2 mb-4 flex-wrap">
              {COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setColor(c)}
                  className="w-8 h-8 rounded-full items-center justify-center"
                  style={{ backgroundColor: c }}
                >
                  {c === color && <Ionicons name="checkmark" size={14} color="#fff" />}
                </TouchableOpacity>
              ))}
            </View>

            {/* Name */}
            <Text className="text-dark-400 text-xs font-semibold uppercase tracking-widest mb-2">Nome do objetivo</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="ex: Férias 2027"
              placeholderTextColor="#475569"
              className="bg-dark-800 border border-dark-600 rounded-xl px-4 py-3 mb-4"
              style={{ color: '#0f172a', fontSize: 15 }}
            />

            {/* Target */}
            <Text className="text-dark-400 text-xs font-semibold uppercase tracking-widest mb-2">Valor-alvo (€)</Text>
            <TextInput
              value={target}
              onChangeText={setTarget}
              placeholder="ex: 2000"
              placeholderTextColor="#475569"
              keyboardType="decimal-pad"
              className="bg-dark-800 border border-dark-600 rounded-xl px-4 py-3 mb-4"
              style={{ color: '#0f172a', fontSize: 15 }}
            />

            {/* Deadline */}
            <Text className="text-dark-400 text-xs font-semibold uppercase tracking-widest mb-2">Prazo (opcional)</Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              className="bg-dark-800 border border-dark-600 rounded-xl px-4 py-3 flex-row items-center justify-between"
              style={{ marginBottom: deadlineDate ? 6 : 24 }}
            >
              <Text style={{ color: deadlineDate ? '#0f172a' : '#475569', fontSize: 15 }}>
                {deadlineDate ? deadlineDate.toLocaleDateString('pt-PT') : 'Sem prazo definido'}
              </Text>
              <Ionicons name="calendar-outline" size={16} color="#475569" />
            </TouchableOpacity>
            {deadlineDate && (
              <TouchableOpacity onPress={() => setDeadlineDate(null)} className="mb-5 self-start pl-1">
                <Text className="text-dark-500 text-xs">Remover prazo</Text>
              </TouchableOpacity>
            )}

            {showDatePicker && (
              <DateTimePicker
                value={deadlineDate ?? new Date()}
                mode="date"
                display="default"
                minimumDate={new Date()}
                onChange={(_event, date) => {
                  if (Platform.OS !== 'ios') setShowDatePicker(false)
                  if (date) setDeadlineDate(date)
                }}
              />
            )}

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isPending || !name.trim() || !target.trim()}
              className="rounded-2xl py-4 items-center"
              style={{ backgroundColor: color, opacity: isPending || !name.trim() || !target.trim() ? 0.5 : 1 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
                {isPending
                  ? (isEdit ? 'A guardar...' : 'A criar...')
                  : (isEdit ? 'Guardar' : 'Criar Objetivo')}
              </Text>
            </TouchableOpacity>
            <View className="h-6" />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
