import { useState } from 'react'
import {
  Modal, View, Text, TouchableOpacity,
  ScrollView, TextInput, ActivityIndicator, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { usePortfolio } from '../../hooks/usePortfolio'
import { getColor } from '../../lib/portfolioColors'

type Asset = {
  id: string; name: string; ticker: string; broker: string; asset_type: string
  units: number; avg_price: number; capital_invested: number
  current_value: number; pl: number; plPct: number; allocation: number | null
}

type EditState = {
  id: string; currentValue: string; capitalInvested: string; units: string; avgPrice: string
}

interface Props {
  visible: boolean
  onClose: () => void
  onAdd: () => void
}

const EDIT_FIELDS = [
  { field: 'currentValue',    label: 'Valor Atual (€)',       hint: 'Consulta no broker' },
  { field: 'capitalInvested', label: 'Capital Investido (€)', hint: 'Total pago pelas unidades' },
  { field: 'units',           label: 'Nº Unidades',           hint: 'Quantidade detida' },
  { field: 'avgPrice',        label: 'Preço Médio (€)',       hint: 'Preço médio de compra' },
] as const

export default function ManageAssetsModal({ visible, onClose, onAdd }: Props) {
  const { data, updateAsset, deleteAsset } = usePortfolio()
  const assets = (data?.assets ?? []) as Asset[]

  const [editState, setEditState] = useState<EditState | null>(null)

  const fmt = (n: number) =>
    n.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

  const editingAsset = editState ? assets.find((a) => a.id === editState.id) ?? null : null

  function startEdit(asset: Asset) {
    setEditState({
      id:             asset.id,
      currentValue:   String(asset.current_value),
      capitalInvested:String(asset.capital_invested),
      units:          String(asset.units),
      avgPrice:       String(asset.avg_price),
    })
  }

  function cancelEdit() { setEditState(null) }

  async function saveEdit() {
    if (!editState) return
    const p = (s: string) => parseFloat(s.replace(',', '.'))
    const cv = p(editState.currentValue)
    const ci = p(editState.capitalInvested)
    const u  = p(editState.units)
    const ap = p(editState.avgPrice)
    if (isNaN(cv)) return
    await updateAsset.mutateAsync({
      id: editState.id,
      currentValue:    cv,
      capitalInvested: isNaN(ci) ? cv : ci,
      units:           isNaN(u)  ? undefined : u,
      avgPrice:        isNaN(ap) ? undefined : ap,
    })
    cancelEdit()
  }

  function confirmDelete(asset: Asset) {
    Alert.alert(
      'Remover ativo',
      `Tens a certeza que queres remover ${asset.ticker} do portfolio? Esta acção não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover', style: 'destructive',
          onPress: () => { deleteAsset.mutate(asset.id); cancelEdit() },
        },
      ],
    )
  }

  // ── Edit form ─────────────────────────────────────────────────────────────
  if (editState && editingAsset) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={cancelEdit}>
        <SafeAreaView className="flex-1 bg-dark-900">
          <View className="flex-row items-center justify-between px-4 py-4 border-b border-dark-600">
            <TouchableOpacity onPress={cancelEdit}>
              <Text className="text-dark-400 text-base">← Voltar</Text>
            </TouchableOpacity>
            <View className="items-center">
              <Text className="text-dark-50 text-base font-semibold">Editar Ativo</Text>
              <Text className="text-dark-400 text-xs">{editingAsset.name} · {editingAsset.ticker}</Text>
            </View>
            <TouchableOpacity onPress={saveEdit} disabled={updateAsset.isPending}>
              {updateAsset.isPending
                ? <ActivityIndicator size="small" color="#0d9488" />
                : <Text className="text-teal-500 text-base font-semibold">Guardar</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-4 pt-5" keyboardShouldPersistTaps="handled">
            {EDIT_FIELDS.map(({ field, label, hint }) => (
              <View key={field} className="mb-4">
                <Text className="text-dark-400 text-xs mb-1">{label}</Text>
                <TextInput
                  value={editState[field]}
                  onChangeText={(v) => setEditState((prev) => prev ? { ...prev, [field]: v } : prev)}
                  keyboardType="decimal-pad"
                  placeholder={hint}
                  placeholderTextColor="#94a3b8"
                  className="bg-dark-800 border border-dark-600 rounded-xl px-4 py-3.5 text-dark-50 text-base"
                />
              </View>
            ))}

            <View className="mt-4 border-t border-dark-600 pt-6">
              <Text className="text-dark-500 text-xs mb-3 uppercase tracking-widest">Zona de perigo</Text>
              <TouchableOpacity
                onPress={() => confirmDelete(editingAsset)}
                className="flex-row items-center justify-center gap-2 bg-red-50 border border-red-200 rounded-xl py-4"
              >
                <Ionicons name="trash-outline" size={18} color="#dc2626" />
                <Text className="text-red-600 font-semibold text-base">Remover ativo do portfolio</Text>
              </TouchableOpacity>
            </View>
            <View className="h-8" />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    )
  }

  // ── Asset list ────────────────────────────────────────────────────────────
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-dark-900">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-4 border-b border-dark-600">
          <Text className="text-dark-50 text-base font-bold">Gerir Ativos</Text>
          <TouchableOpacity
            onPress={onClose}
            className="w-8 h-8 rounded-full bg-dark-700 border border-dark-600 items-center justify-center"
          >
            <Ionicons name="close" size={18} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Add button */}
        <View className="px-4 py-3 border-b border-dark-600">
          <TouchableOpacity
            onPress={() => { onClose(); setTimeout(onAdd, 300) }}
            className="flex-row items-center justify-center gap-2 bg-teal-500 rounded-xl py-3"
          >
            <Ionicons name="add-circle-outline" size={18} color="#fff" />
            <Text className="text-white font-semibold">Adicionar novo ativo</Text>
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-4 py-3 gap-2">
            {assets.length === 0 && (
              <View className="py-14 items-center">
                <Ionicons name="wallet-outline" size={44} color="#94a3b8" />
                <Text className="text-dark-400 text-sm mt-3 font-medium">Sem ativos no portfolio</Text>
                <Text className="text-dark-500 text-xs mt-1">Toca em "Adicionar" para começar</Text>
              </View>
            )}

            {assets.map((asset, i) => {
              const plPos = asset.pl >= 0
              return (
                <View
                  key={asset.id}
                  className="flex-row items-center gap-3 bg-dark-800 border border-dark-600 rounded-2xl px-4 py-3"
                >
                  {/* Badge */}
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: getColor(i) + '22' }}
                  >
                    <Text style={{ color: getColor(i), fontSize: 9, fontWeight: '800', letterSpacing: -0.5 }}>
                      {asset.ticker.slice(0, 4)}
                    </Text>
                  </View>

                  {/* Name + broker */}
                  <View className="flex-1 min-w-0">
                    <Text className="text-dark-100 text-sm font-semibold" numberOfLines={1}>{asset.ticker}</Text>
                    <Text className="text-dark-500 text-xs" numberOfLines={1}>{asset.name}</Text>
                  </View>

                  {/* Value + P/L */}
                  <View className="items-end mr-1">
                    <Text className="text-dark-200 text-sm font-semibold">{fmt(asset.current_value)}</Text>
                    <Text className="text-xs" style={{ color: plPos ? '#0d9488' : '#ef4444' }}>
                      {plPos ? '+' : ''}{(asset.plPct * 100).toFixed(1)}%
                    </Text>
                  </View>

                  {/* Edit */}
                  <TouchableOpacity
                    onPress={() => startEdit(asset)}
                    className="w-8 h-8 rounded-full bg-dark-700 border border-dark-600 items-center justify-center"
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="create-outline" size={15} color="#64748b" />
                  </TouchableOpacity>

                  {/* Delete */}
                  <TouchableOpacity
                    onPress={() => confirmDelete(asset)}
                    className="w-8 h-8 rounded-full bg-red-50 border border-red-200 items-center justify-center"
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="trash-outline" size={15} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              )
            })}
          </View>
          <View className="h-8" />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}
