import { useState } from 'react'
import {
  Modal, View, Text, TextInput, TouchableOpacity, Pressable,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useExpenseCategories } from '../../hooks/useExpenseCategories'
import { useExpenses } from '../../hooks/useExpenses'

const TODAY = new Date()

export default function QuickAddFab() {
  const insets = useSafeAreaInsets()
  const { data: categories = [] } = useExpenseCategories()
  const { create } = useExpenses(TODAY.getMonth() + 1, TODAY.getFullYear())

  const [open, setOpen]     = useState(false)
  const [amount, setAmount] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)

  const amountVal = Number(amount.replace(',', '.'))
  const amountValid = !isNaN(amountVal) && amountVal > 0

  function close() {
    setOpen(false)
    setAmount('')
    setSavingId(null)
  }

  async function handlePickCategory(categoryId: string, categoryName: string) {
    if (!amountValid || savingId) return
    setSavingId(categoryId)
    try {
      await create.mutateAsync({
        category_id: categoryId,
        description: categoryName,
        amount: amountVal,
        is_fixed: false,
        month: TODAY.getMonth() + 1,
        year: TODAY.getFullYear(),
        paid_at: TODAY.toISOString(),
      })
      close()
    } catch {
      setSavingId(null)
    }
  }

  return (
    <>
      <View
        pointerEvents="box-none"
        style={{ position: 'absolute', bottom: 24 + insets.bottom, right: 16 }}
      >
        <TouchableOpacity
          onPress={() => setOpen(true)}
          activeOpacity={0.85}
          style={{
            width: 56, height: 56, borderRadius: 28,
            backgroundColor: '#0d9488',
            alignItems: 'center', justifyContent: 'center',
            shadowColor: '#0d9488', shadowOpacity: 0.45, shadowRadius: 10, elevation: 10,
          }}
        >
          <Ionicons name="add" size={28} color="white" />
        </TouchableOpacity>
      </View>

      <Modal visible={open} transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }} onPress={close}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              backgroundColor: '#f8faf9',
              borderTopLeftRadius: 24, borderTopRightRadius: 24,
              paddingTop: 18, paddingBottom: 18 + insets.bottom,
              paddingHorizontal: 20,
            }}
          >
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <Text style={{ color: '#64748b', fontSize: 13, marginBottom: 10, textAlign: 'center' }}>
                Quanto gastaste?
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                <Text style={{ color: '#0f172a', fontSize: 32, fontWeight: '700', marginRight: 4 }}>€</Text>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  placeholder="0,00"
                  placeholderTextColor="#94a3b8"
                  autoFocus
                  style={{
                    color: '#0f172a', fontSize: 32, fontWeight: '700',
                    minWidth: 80, textAlign: 'center',
                  }}
                />
              </View>

              <Text style={{ color: '#64748b', fontSize: 13, marginBottom: 10 }}>
                {amountValid ? 'Escolhe a categoria' : 'Escreve o valor para continuar'}
              </Text>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, opacity: amountValid ? 1 : 0.4 }}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => handlePickCategory(cat.id, cat.name)}
                    disabled={!amountValid || !!savingId}
                    style={{
                      width: '30%',
                      alignItems: 'center',
                      gap: 4,
                      backgroundColor: '#ffffff',
                      borderWidth: 1,
                      borderColor: '#e2e8f0',
                      borderRadius: 14,
                      paddingVertical: 12,
                    }}
                  >
                    {savingId === cat.id ? (
                      <ActivityIndicator size="small" color="#0d9488" />
                    ) : (
                      <Text style={{ fontSize: 22 }}>{cat.icon ?? '💸'}</Text>
                    )}
                    <Text style={{ color: '#334155', fontSize: 11, textAlign: 'center' }} numberOfLines={1}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </KeyboardAvoidingView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}
