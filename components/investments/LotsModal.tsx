import { useState } from 'react'
import {
  Modal, View, Text, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, Pressable, Platform, Alert,
  KeyboardAvoidingView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import DateTimePicker from '../ui/CrossDateTimePicker'
import { usePortfolioLots } from '../../hooks/usePortfolioLots'
import type { LotWithIrs } from '../../hooks/usePortfolioLots'

interface Props {
  visible: boolean
  onClose: () => void
  assetId: string
  ticker: string
}

function fmtDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

function IrsBadge({ lot }: { lot: LotWithIrs }) {
  if (lot.irsExempt) {
    return (
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 3,
        backgroundColor: '#14b8a615', borderRadius: 6,
        paddingHorizontal: 6, paddingVertical: 2,
      }}>
        <Ionicons name="shield-checkmark-outline" size={11} color="#14b8a6" />
        <Text style={{ color: '#14b8a6', fontSize: 10, fontWeight: '700' }}>Isento IRS</Text>
      </View>
    )
  }
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 3,
      backgroundColor: '#f9731615', borderRadius: 6,
      paddingHorizontal: 6, paddingVertical: 2,
    }}>
      <Ionicons name="time-outline" size={11} color="#f97316" />
      <Text style={{ color: '#f97316', fontSize: 10, fontWeight: '600' }}>
        {lot.daysToExemption}d para isenção
      </Text>
    </View>
  )
}

function LotRow({ lot, onDelete }: { lot: LotWithIrs; onDelete: (id: string) => void }) {
  return (
    <View style={{
      backgroundColor: '#f8faf9', borderWidth: 1, borderColor: '#c9d4cf',
      borderRadius: 14, padding: 14, marginBottom: 10,
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Text style={{ color: '#0f172a', fontSize: 13, fontWeight: '700' }}>
              {lot.quantity} unid. @ {lot.unit_price.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Text style={{ color: '#64748b', fontSize: 11 }}>{fmtDate(lot.purchase_date)}</Text>
            {lot.broker ? (
              <Text style={{ color: '#94a3b8', fontSize: 11 }}>· {lot.broker}</Text>
            ) : null}
            <IrsBadge lot={lot} />
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={{ color: '#0f172a', fontSize: 14, fontWeight: '700' }}>
            {lot.totalCost.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
          </Text>
          <Text style={{ color: '#94a3b8', fontSize: 10 }}>{lot.daysHeld} dias</Text>
          <TouchableOpacity
            onPress={() => onDelete(lot.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={15} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const getToday = () => new Date()

function fmtDateLocal(d: Date) {
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function toIsoDate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function LotsModal({ visible, onClose, assetId, ticker }: Props) {
  const { data: lots = [], isLoading, create, remove } = usePortfolioLots(assetId)

  const [showForm, setShowForm]       = useState(false)
  const [quantity, setQuantity]       = useState('')
  const [unitPrice, setUnitPrice]     = useState('')
  const [broker, setBroker]           = useState('')
  const [purchaseDate, setPurchaseDate] = useState<Date>(getToday)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [errors, setErrors]           = useState<Record<string, string>>({})

  function resetForm() {
    setQuantity(''); setUnitPrice(''); setBroker('')
    setPurchaseDate(getToday()); setErrors({})
    setShowDatePicker(false)
  }

  function validate() {
    const e: Record<string, string> = {}
    const qty = Number(quantity.replace(',', '.'))
    const price = Number(unitPrice.replace(',', '.'))
    if (!quantity || isNaN(qty) || qty <= 0) e.quantity = 'Quantidade inválida'
    if (!unitPrice || isNaN(price) || price < 0) e.unitPrice = 'Preço inválido'
    return e
  }

  async function handleSave() {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }

    await create.mutateAsync({
      asset_id: assetId,
      ticker,
      quantity: Number(quantity.replace(',', '.')),
      unit_price: Number(unitPrice.replace(',', '.')),
      purchase_date: toIsoDate(purchaseDate),
      broker: broker.trim(),
    })

    resetForm()
    setShowForm(false)
  }

  function handleDelete(id: string) {
    Alert.alert('Remover lote', 'Tens a certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover', style: 'destructive',
        onPress: () => remove.mutate(id),
      },
    ])
  }

  const totalInvested = lots.reduce((s, l) => s + l.totalCost, 0)
  const exemptLots    = lots.filter((l) => l.irsExempt).length

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#dfe8e3' }}>

        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 16, paddingVertical: 14,
          borderBottomWidth: 1, borderBottomColor: '#c9d4cf',
        }}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close" size={22} color="#64748b" />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '700' }}>Lotes — {ticker}</Text>
          </View>
          <TouchableOpacity
            onPress={() => { resetForm(); setShowForm((v) => !v) }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name={showForm ? 'close-circle-outline' : 'add-circle-outline'} size={22} color="#14b8a6" />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >

            {/* Resumo */}
            {lots.length > 0 && (
              <View style={{
                backgroundColor: '#f8faf9', borderWidth: 1, borderColor: '#c9d4cf',
                borderRadius: 16, padding: 14, marginBottom: 16,
                flexDirection: 'row', justifyContent: 'space-between',
              }}>
                <View>
                  <Text style={{ color: '#64748b', fontSize: 11 }}>Custo total</Text>
                  <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
                    {totalInvested.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: '#64748b', fontSize: 11 }}>Isentos IRS</Text>
                  <Text style={{ color: '#14b8a6', fontSize: 18, fontWeight: '800' }}>
                    {exemptLots}/{lots.length}
                  </Text>
                </View>
              </View>
            )}

            {/* Formulário novo lote */}
            {showForm && (
              <View style={{
                backgroundColor: '#f8faf9', borderWidth: 1, borderColor: '#14b8a640',
                borderRadius: 16, padding: 16, marginBottom: 16,
              }}>
                <Text style={{ color: '#0f172a', fontSize: 14, fontWeight: '700', marginBottom: 12 }}>
                  Novo lote
                </Text>

                {/* Quantidade */}
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ color: '#475569', fontSize: 11, marginBottom: 4 }}>Quantidade *</Text>
                  <TextInput
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="decimal-pad"
                    placeholder="ex: 10"
                    placeholderTextColor="#94a3b8"
                    style={{
                      backgroundColor: '#fff', borderWidth: 1,
                      borderColor: errors.quantity ? '#ef4444' : '#c9d4cf',
                      borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
                      color: '#0f172a', fontSize: 14,
                    }}
                    autoCorrect={false}
                    autoComplete="off"
                    importantForAutofill="no"
                  />
                  {errors.quantity && (
                    <Text style={{ color: '#ef4444', fontSize: 11, marginTop: 3 }}>{errors.quantity}</Text>
                  )}
                </View>

                {/* Preço unitário */}
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ color: '#475569', fontSize: 11, marginBottom: 4 }}>Preço unitário (€) *</Text>
                  <TextInput
                    value={unitPrice}
                    onChangeText={setUnitPrice}
                    keyboardType="decimal-pad"
                    placeholder="ex: 95,40"
                    placeholderTextColor="#94a3b8"
                    style={{
                      backgroundColor: '#fff', borderWidth: 1,
                      borderColor: errors.unitPrice ? '#ef4444' : '#c9d4cf',
                      borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
                      color: '#0f172a', fontSize: 14,
                    }}
                    autoCorrect={false}
                    autoComplete="off"
                    importantForAutofill="no"
                  />
                  {errors.unitPrice && (
                    <Text style={{ color: '#ef4444', fontSize: 11, marginTop: 3 }}>{errors.unitPrice}</Text>
                  )}
                </View>

                {/* Data de compra */}
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ color: '#475569', fontSize: 11, marginBottom: 4 }}>Data de compra *</Text>
                  <Pressable
                    onPress={() => setShowDatePicker(true)}
                    style={{
                      backgroundColor: '#fff', borderWidth: 1, borderColor: '#c9d4cf',
                      borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    }}
                  >
                    <Text style={{ color: '#0f172a', fontSize: 14 }}>{fmtDateLocal(purchaseDate)}</Text>
                    <Ionicons name="calendar-outline" size={16} color="#475569" />
                  </Pressable>
                  {showDatePicker && (
                    <DateTimePicker
                      value={purchaseDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(_, d) => {
                        setShowDatePicker(Platform.OS === 'ios')
                        if (d) setPurchaseDate(d)
                      }}
                      maximumDate={getToday()}
                      locale="pt-PT"
                    />
                  )}
                </View>

                {/* Corretora */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ color: '#475569', fontSize: 11, marginBottom: 4 }}>Corretora</Text>
                  <TextInput
                    value={broker}
                    onChangeText={setBroker}
                    placeholder="ex: XTB, DEGIRO, Trading212…"
                    placeholderTextColor="#94a3b8"
                    style={{
                      backgroundColor: '#fff', borderWidth: 1, borderColor: '#c9d4cf',
                      borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
                      color: '#0f172a', fontSize: 14,
                    }}
                    autoCorrect={false}
                    autoComplete="off"
                    importantForAutofill="no"
                  />
                </View>

                {/* Preview custo */}
                {quantity && unitPrice && !isNaN(Number(quantity.replace(',', '.'))) && !isNaN(Number(unitPrice.replace(',', '.'))) && (
                  <View style={{
                    backgroundColor: '#14b8a610', borderRadius: 8, padding: 10, marginBottom: 12,
                    flexDirection: 'row', justifyContent: 'space-between',
                  }}>
                    <Text style={{ color: '#64748b', fontSize: 12 }}>Custo total do lote</Text>
                    <Text style={{ color: '#14b8a6', fontSize: 13, fontWeight: '700' }}>
                      {(Number(quantity.replace(',', '.')) * Number(unitPrice.replace(',', '.'))).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  onPress={handleSave}
                  disabled={create.isPending}
                  style={{
                    backgroundColor: '#14b8a6', borderRadius: 10, paddingVertical: 12,
                    alignItems: 'center',
                  }}
                >
                  {create.isPending
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Guardar lote</Text>
                  }
                </TouchableOpacity>
              </View>
            )}

            {/* Lista de lotes */}
            {isLoading ? (
              <ActivityIndicator color="#14b8a6" style={{ marginTop: 32 }} />
            ) : lots.length === 0 && !showForm ? (
              <View style={{ alignItems: 'center', marginTop: 48 }}>
                <Ionicons name="layers-outline" size={40} color="#94a3b8" />
                <Text style={{ color: '#64748b', fontSize: 14, marginTop: 12, textAlign: 'center' }}>
                  Sem lotes registados.{'\n'}Toca em + para adicionar o primeiro.
                </Text>
              </View>
            ) : (
              lots.map((lot) => (
                <LotRow key={lot.id} lot={lot} onDelete={handleDelete} />
              ))
            )}

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  )
}
