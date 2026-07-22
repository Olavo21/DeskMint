import { useState } from 'react'
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { SavingBucket } from '../../hooks/useSavingBuckets'

const fmt = (v: number) =>
  v.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })

type Props = {
  bucket: SavingBucket | null
  onClose: () => void
  onConfirm: (id: string, amount: number) => void
  isPending: boolean
}

export default function AddAmountModal({ bucket, onClose, onConfirm, isPending }: Props) {
  const [value, setValue] = useState('')

  const handleClose = () => { setValue(''); onClose() }

  const handleConfirm = () => {
    if (!bucket) return
    const amount = parseFloat(value.replace(',', '.'))
    if (isNaN(amount) || amount <= 0) return
    onConfirm(bucket.id, amount)
    setValue('')
    onClose()
  }

  const remaining = bucket ? Math.max(bucket.target_amount - bucket.current_amount, 0) : 0

  return (
    <Modal visible={!!bucket} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
        style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      >
        <View className="flex-1" />
        <View className="bg-dark-900 rounded-t-3xl p-6">
          <View className="w-10 h-1 bg-dark-600 rounded-full self-center mb-5" />

          <View className="flex-row items-center justify-between mb-5">
            <View className="flex-row items-center gap-2">
              <Text style={{ fontSize: 24 }}>{bucket?.emoji}</Text>
              <Text className="text-dark-50 text-lg font-bold">{bucket?.name}</Text>
            </View>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={22} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View
            className="rounded-xl p-4 mb-5 flex-row items-center justify-between"
            style={{ backgroundColor: (bucket?.color ?? '#14b8a6') + '15' }}
          >
            <View>
              <Text className="text-dark-400 text-xs">Já poupado</Text>
              <Text className="text-dark-50 font-bold">{fmt(bucket?.current_amount ?? 0)}</Text>
            </View>
            <Ionicons name="arrow-forward" size={16} color="#475569" />
            <View>
              <Text className="text-dark-400 text-xs">Objetivo</Text>
              <Text className="text-dark-50 font-bold">{fmt(bucket?.target_amount ?? 0)}</Text>
            </View>
          </View>

          <Text className="text-dark-400 text-xs font-semibold uppercase tracking-widest mb-2">
            Valor a adicionar (€)
          </Text>
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder={`Máx. ${fmt(remaining)}`}
            placeholderTextColor="#475569"
            keyboardType="decimal-pad"
            autoFocus
            className="bg-dark-800 border border-dark-600 rounded-xl px-4 py-3 mb-6"
            style={{ color: '#0f172a', fontSize: 15 }}
          />

          <TouchableOpacity
            onPress={handleConfirm}
            disabled={isPending || !value.trim()}
            className="rounded-2xl py-4 items-center mb-8"
            style={{
              backgroundColor: bucket?.color ?? '#14b8a6',
              opacity: isPending || !value.trim() ? 0.5 : 1,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
              {isPending ? 'A guardar...' : 'Adicionar Poupança'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
