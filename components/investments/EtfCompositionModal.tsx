import { useState } from 'react'
import {
  Modal, View, Text, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useEtfComposition } from '../../hooks/useEtfComposition'
import type { DmEtfComposition } from '../../types/database'

interface Props {
  visible: boolean
  onClose: () => void
  etfId: string
  etfTicker: string
}

function CompanyRow({
  row,
  onDelete,
}: {
  row: DmEtfComposition
  onDelete: (id: string) => void
}) {
  return (
    <View style={{
      backgroundColor: '#f8faf9', borderWidth: 1, borderColor: '#c9d4cf',
      borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 8,
    }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#0f172a', fontSize: 13, fontWeight: '700' }}>{row.company_ticker}</Text>
        {row.company_name ? (
          <Text style={{ color: '#64748b', fontSize: 11, marginTop: 1 }}>{row.company_name}</Text>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text style={{ color: '#14b8a6', fontSize: 15, fontWeight: '800' }}>
          {row.weight_pct.toFixed(2)}%
        </Text>
        <TouchableOpacity onPress={() => onDelete(row.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="trash-outline" size={15} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  )
}

export default function EtfCompositionModal({ visible, onClose, etfId, etfTicker }: Props) {
  const { data: rows = [], isLoading, upsert, remove } = useEtfComposition(etfId)

  const [ticker, setTicker]   = useState('')
  const [name, setName]       = useState('')
  const [weight, setWeight]   = useState('')
  const [errors, setErrors]   = useState<Record<string, string>>({})
  const [showForm, setShowForm] = useState(false)

  function resetForm() {
    setTicker(''); setName(''); setWeight(''); setErrors({})
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!ticker.trim())                                          e.ticker = 'Ticker obrigatório'
    const w = Number(weight.replace(',', '.'))
    if (!weight || isNaN(w) || w <= 0 || w > 100)              e.weight = 'Percentagem entre 0 e 100'
    return e
  }

  async function handleSave() {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }

    await upsert.mutateAsync({
      etf_id: etfId,
      company_ticker: ticker.trim().toUpperCase(),
      company_name:   name.trim(),
      weight_pct:     Number(weight.replace(',', '.')),
    })

    resetForm()
    setShowForm(false)
  }

  function handleDelete(id: string) {
    Alert.alert('Remover empresa', 'Remover desta composição?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => remove.mutate(id) },
    ])
  }

  const totalWeight = rows.reduce((s, r) => s + r.weight_pct, 0)

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
            <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '700' }}>Composição — {etfTicker}</Text>
            <Text style={{ color: '#64748b', fontSize: 11, marginTop: 1 }}>% de cada empresa (fact sheet)</Text>
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

            {/* Peso total monitorizado */}
            {rows.length > 0 && (
              <View style={{
                backgroundColor: '#f8faf9', borderWidth: 1, borderColor: '#c9d4cf',
                borderRadius: 14, padding: 12, marginBottom: 16,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <Text style={{ color: '#64748b', fontSize: 12 }}>
                  {rows.length} empresa{rows.length !== 1 ? 's' : ''} monitorizada{rows.length !== 1 ? 's' : ''}
                </Text>
                <Text style={{ color: '#0f172a', fontSize: 13, fontWeight: '700' }}>
                  {totalWeight.toFixed(2)}% monitorizado
                </Text>
              </View>
            )}

            {/* Formulário */}
            {showForm && (
              <View style={{
                backgroundColor: '#f8faf9', borderWidth: 1, borderColor: '#14b8a640',
                borderRadius: 16, padding: 16, marginBottom: 16,
              }}>
                <Text style={{ color: '#0f172a', fontSize: 14, fontWeight: '700', marginBottom: 12 }}>
                  Adicionar empresa
                </Text>

                <View style={{ marginBottom: 10 }}>
                  <Text style={{ color: '#475569', fontSize: 11, marginBottom: 4 }}>Ticker *</Text>
                  <TextInput
                    value={ticker}
                    onChangeText={(v) => setTicker(v.toUpperCase())}
                    placeholder="ex: NVDA"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    autoComplete="off"
                    importantForAutofill="no"
                    style={{
                      backgroundColor: '#fff', borderWidth: 1,
                      borderColor: errors.ticker ? '#ef4444' : '#c9d4cf',
                      borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
                      color: '#0f172a', fontSize: 14,
                    }}
                  />
                  {errors.ticker && <Text style={{ color: '#ef4444', fontSize: 11, marginTop: 3 }}>{errors.ticker}</Text>}
                </View>

                <View style={{ marginBottom: 10 }}>
                  <Text style={{ color: '#475569', fontSize: 11, marginBottom: 4 }}>Nome (opcional)</Text>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="ex: NVIDIA Corporation"
                    placeholderTextColor="#94a3b8"
                    autoCorrect={false}
                    autoComplete="off"
                    importantForAutofill="no"
                    style={{
                      backgroundColor: '#fff', borderWidth: 1, borderColor: '#c9d4cf',
                      borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
                      color: '#0f172a', fontSize: 14,
                    }}
                  />
                </View>

                <View style={{ marginBottom: 16 }}>
                  <Text style={{ color: '#475569', fontSize: 11, marginBottom: 4 }}>Peso no ETF (%) *</Text>
                  <TextInput
                    value={weight}
                    onChangeText={setWeight}
                    placeholder="ex: 8,40"
                    placeholderTextColor="#94a3b8"
                    keyboardType="decimal-pad"
                    autoCorrect={false}
                    autoComplete="off"
                    importantForAutofill="no"
                    style={{
                      backgroundColor: '#fff', borderWidth: 1,
                      borderColor: errors.weight ? '#ef4444' : '#c9d4cf',
                      borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
                      color: '#0f172a', fontSize: 14,
                    }}
                  />
                  {errors.weight && <Text style={{ color: '#ef4444', fontSize: 11, marginTop: 3 }}>{errors.weight}</Text>}
                  <Text style={{ color: '#94a3b8', fontSize: 10, marginTop: 4 }}>
                    Disponível na fact sheet do ETF (ex: iShares, Amundi, Vanguard)
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={handleSave}
                  disabled={upsert.isPending}
                  style={{ backgroundColor: '#14b8a6', borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}
                >
                  {upsert.isPending
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Guardar</Text>
                  }
                </TouchableOpacity>
              </View>
            )}

            {/* Lista */}
            {isLoading ? (
              <ActivityIndicator color="#14b8a6" style={{ marginTop: 32 }} />
            ) : rows.length === 0 && !showForm ? (
              <View style={{ alignItems: 'center', marginTop: 48 }}>
                <Ionicons name="pie-chart-outline" size={40} color="#94a3b8" />
                <Text style={{ color: '#64748b', fontSize: 14, marginTop: 12, textAlign: 'center' }}>
                  Sem empresas registadas.{'\n'}Toca em + para adicionar a primeira.
                </Text>
              </View>
            ) : (
              rows.map((row) => (
                <CompanyRow key={row.id} row={row} onDelete={handleDelete} />
              ))
            )}

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  )
}
