import { useState, useRef } from 'react'
import {
  Modal, View, Text, TextInput, TouchableOpacity, Pressable,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  Animated, PanResponder, LayoutChangeEvent,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useExpenseCategories } from '../../hooks/useExpenseCategories'
import { useExpenses } from '../../hooks/useExpenses'

const TODAY = new Date()

const FAB_SIZE   = 56
const MARGIN     = 16
const TAP_SLOP   = 6 // px de movimento abaixo do qual um gesto conta como toque, não arrasto

export default function QuickAddFab() {
  const insets = useSafeAreaInsets()
  const { data: categories = [] } = useExpenseCategories()
  const { create } = useExpenses(TODAY.getMonth() + 1, TODAY.getFullYear())

  const [open, setOpen]     = useState(false)
  const [amount, setAmount] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)

  // Área onde o botão pode ser arrastado — medida em runtime para que os
  // limites correspondam exactamente ao espaço disponível neste ecrã,
  // sem depender de alturas fixas de header/tab bar que podem mudar.
  const bounds = useRef({ width: 0, height: 0 })
  const initialized = useRef(false)
  const pan = useRef(new Animated.ValueXY()).current
  const dragDistance = useRef(0)

  function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max)
  }

  function handleLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout
    bounds.current = { width, height }
    if (!initialized.current && width > 0 && height > 0) {
      initialized.current = true
      pan.setValue({
        x: width - FAB_SIZE - MARGIN,
        y: height - FAB_SIZE - MARGIN,
      })
    }
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragDistance.current = 0
        pan.setOffset({ x: (pan.x as any).__getValue(), y: (pan.y as any).__getValue() })
        pan.setValue({ x: 0, y: 0 })
      },
      onPanResponderMove: (_evt, gesture) => {
        dragDistance.current = Math.abs(gesture.dx) + Math.abs(gesture.dy)
        Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false })(_evt, gesture)
      },
      onPanResponderRelease: () => {
        pan.flattenOffset()

        if (dragDistance.current < TAP_SLOP) {
          setOpen(true)
          return
        }

        const { width, height } = bounds.current
        const x = (pan.x as any).__getValue()
        const y = (pan.y as any).__getValue()
        const snapToRight = x + FAB_SIZE / 2 > width / 2
        const targetX = snapToRight ? width - FAB_SIZE - MARGIN : MARGIN
        const targetY = clamp(y, MARGIN, height - FAB_SIZE - MARGIN)

        Animated.spring(pan, {
          toValue: { x: targetX, y: targetY },
          useNativeDriver: false,
          friction: 7,
          tension: 60,
        }).start()
      },
    })
  ).current

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
        onLayout={handleLayout}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      >
        <Animated.View
          {...panResponder.panHandlers}
          style={{
            position: 'absolute',
            transform: [{ translateX: pan.x }, { translateY: pan.y }],
          }}
        >
          <View
            style={{
              width: 56, height: 56, borderRadius: 28,
              backgroundColor: '#0d9488',
              alignItems: 'center', justifyContent: 'center',
              shadowColor: '#0d9488', shadowOpacity: 0.45, shadowRadius: 10, elevation: 10,
            }}
          >
            <Ionicons name="add" size={28} color="white" />
          </View>
        </Animated.View>
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
