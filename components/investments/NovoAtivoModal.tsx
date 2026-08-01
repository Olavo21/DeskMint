import { useState } from 'react'
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Switch,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { useTickerSearch } from '../../hooks/useTickerSearch'
import { useFmt2 } from '../../utils/format'

type AssetType = 'ETF' | 'STOCK' | 'CRYPTO' | 'BOND' | 'OTHER'

const TYPES: { key: AssetType; label: string; icon: string }[] = [
  { key: 'ETF',    label: 'ETF',        icon: '📊' },
  { key: 'STOCK',  label: 'Ação',      icon: '📈' },
  { key: 'CRYPTO', label: 'Cripto',     icon: '₿' },
  { key: 'BOND',   label: 'Obrigação',  icon: '🏛️' },
  { key: 'OTHER',  label: 'Outro',      icon: '⚡' },
]

const COMMON_BROKERS = ['XTB', 'Degiro', 'Revolut', 'Interactive Brokers', 'Trading212', 'eToro']

interface Props {
  visible: boolean
  onClose: () => void
}

export default function NovoAtivoModal({ visible, onClose }: Props) {
  const fmt = useFmt2()
  const session = useAuthStore((s) => s.session)
  const qc = useQueryClient()
  const { query: tickerQ, setQuery: setTickerQ, results, loading: searchLoading, typeToAssetType } = useTickerSearch()

  const [assetType, setAssetType] = useState<AssetType>('STOCK')
  const [name, setName]           = useState('')
  const [ticker, setTicker]       = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [broker, setBroker]       = useState('XTB')
  const [units, setUnits]         = useState('')
  const [avgPrice, setAvgPrice]   = useState('')
  const [currentValue, setCurrentValue] = useState('')
  const [isSatellite, setIsSatellite]   = useState(true)
  const [errors, setErrors]       = useState<Record<string, string>>({})

  // Capital investido = unidades × preço médio (calculado auto)
  const capitalInvested = parseFloat(units.replace(',', '.') || '0') *
                          parseFloat(avgPrice.replace(',', '.') || '0')

  const save = useMutation({
    mutationFn: async () => {
      const cap   = capitalInvested || parseFloat(currentValue.replace(',', '.') || '0')
      const curr  = parseFloat(currentValue.replace(',', '.') || '0') || cap
      const { error } = await supabase.from('dm_portfolio_assets').insert({
        user_id:          session!.user.id,
        name:             name.trim(),
        ticker:           ticker.trim().toUpperCase(),
        asset_type:       assetType,
        broker:           broker.trim(),
        units:            parseFloat(units.replace(',', '.') || '0'),
        avg_price:        parseFloat(avgPrice.replace(',', '.') || '0'),
        capital_invested: cap,
        current_value:    curr,
        is_extra:         isSatellite,
        allocation:       null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portfolio'] })
      qc.invalidateQueries({ queryKey: ['market-news', 'portfolio'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      handleClose()
    },
  })

  function validate() {
    const e: Record<string, string> = {}
    if (!name.trim())   e.name   = 'Nome obrigatório'
    if (!ticker.trim()) e.ticker = 'Ticker obrigatório (ex: AAPL)'
    if (!currentValue || isNaN(parseFloat(currentValue.replace(',', '.'))))
                        e.currentValue = 'Valor atual obrigatório'
    return e
  }

  async function handleSubmit() {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    setErrors({})
    save.mutate()
  }

  function selectSuggestion(r: { symbol: string; displaySymbol: string; description: string; type: string }) {
    setTicker(r.displaySymbol)
    setName(r.description)
    setAssetType(typeToAssetType(r.type))
    setTickerQ('')
    setShowSuggestions(false)
  }

  function handleClose() {
    setAssetType('STOCK'); setName(''); setTicker(''); setBroker('XTB')
    setUnits(''); setAvgPrice(''); setCurrentValue(''); setIsSatellite(true)
    setErrors({}); setTickerQ(''); setShowSuggestions(false)
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView className="flex-1 bg-dark-900">

        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-4 border-b border-dark-700">
          <TouchableOpacity onPress={handleClose}>
            <Text className="text-dark-300 text-base">Cancelar</Text>
          </TouchableOpacity>
          <Text className="text-dark-50 text-base font-semibold">Novo Ativo</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={save.isPending}>
            {save.isPending
              ? <ActivityIndicator color="#14b8a6" size="small" />
              : <Text className="text-mint-800 text-base font-semibold">Guardar</Text>
            }
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-4 pt-5" keyboardShouldPersistTaps="handled">

          {/* Tipo */}
          <Text className="text-dark-300 text-xs mb-2 ml-1">Tipo de ativo</Text>
          <View className="flex-row flex-wrap gap-2 mb-5">
            {TYPES.map((t) => {
              const active = assetType === t.key
              return (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => setAssetType(t.key)}
                  className="flex-row items-center gap-1.5 rounded-xl px-3 py-2 border"
                  style={{
                    backgroundColor: active ? '#0d948820' : '#f4f7f5',
                    borderColor: active ? '#0d9488' : '#c9d4cf',
                  }}
                >
                  <Text>{t.icon}</Text>
                  <Text className={`text-sm font-medium ${active ? 'text-mint-800' : 'text-dark-400'}`}>{t.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Nome */}
          <View className="mb-4">
            <Text className="text-dark-300 text-xs mb-1.5 ml-1">Nome *</Text>
            <TextInput
              className="bg-dark-800 text-dark-50 rounded-xl px-4 py-3.5 text-base border border-dark-700"
              placeholder="ex: Apple Inc."
              placeholderTextColor="#475569"
              value={name}
              onChangeText={setName}
            />
            {errors.name && <Text className="text-red-700 text-xs mt-1 ml-1">{errors.name}</Text>}
          </View>

          {/* Ticker com autocomplete */}
          <View className="mb-4">
            <Text className="text-dark-300 text-xs mb-1.5 ml-1">Ticker / Pesquisar *</Text>
            <View className="flex-row items-center bg-dark-800 rounded-xl px-4 border border-dark-700">
              <Ionicons name="search-outline" size={15} color="#475569" />
              <TextInput
                className="flex-1 text-dark-50 text-base py-3.5 ml-2"
                placeholder="ex: Apple, VWCE, NVDA..."
                placeholderTextColor="#475569"
                value={tickerQ || ticker}
                onChangeText={(v) => {
                  setTickerQ(v)
                  setTicker(v.toUpperCase())
                  setShowSuggestions(true)
                }}
                autoCapitalize="characters"
              />
              {searchLoading && <ActivityIndicator size="small" color="#14b8a6" />}
            </View>
            {errors.ticker && <Text className="text-red-700 text-xs mt-1 ml-1">{errors.ticker}</Text>}

            {/* Sugestões */}
            {showSuggestions && results.length > 0 && (
              <View className="bg-dark-700 rounded-xl mt-1 overflow-hidden border border-dark-600">
                {results.map((r, i) => (
                  <TouchableOpacity
                    key={`${r.symbol}-${i}`}
                    onPress={() => selectSuggestion(r)}
                    className="px-4 py-3 flex-row items-center justify-between"
                    style={{ borderBottomWidth: i < results.length - 1 ? 1 : 0, borderBottomColor: '#c9d4cf' }}
                  >
                    <View className="flex-1">
                      <Text className="text-dark-50 text-sm font-semibold">{r.displaySymbol}</Text>
                      <Text className="text-dark-300 text-xs" numberOfLines={1}>{r.description}</Text>
                    </View>
                    <View className="bg-dark-600 rounded px-2 py-0.5 ml-2">
                      <Text className="text-dark-300 text-xs">{r.type}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Broker */}
          <View className="mb-4">
            <Text className="text-dark-300 text-xs mb-2 ml-1">Broker</Text>
            <View className="flex-row flex-wrap gap-2">
              {COMMON_BROKERS.map((b) => (
                <TouchableOpacity
                  key={b}
                  onPress={() => setBroker(b)}
                  className="rounded-lg px-3 py-2 border"
                  style={{
                    backgroundColor: broker === b ? '#eff6ff' : '#f4f7f5',
                    borderColor: broker === b ? '#3b82f6' : '#c9d4cf',
                  }}
                >
                  <Text style={{ color: broker === b ? '#2563eb' : '#64748b' }} className="text-sm">{b}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              className="bg-dark-800 text-dark-50 rounded-xl px-4 py-3 text-sm border border-dark-700 mt-2"
              placeholder="Outro broker..."
              placeholderTextColor="#475569"
              value={COMMON_BROKERS.includes(broker) ? '' : broker}
              onChangeText={setBroker}
            />
          </View>

          {/* Unidades + Preço médio */}
          <View className="flex-row gap-3 mb-4">
            <View className="flex-1">
              <Text className="text-dark-300 text-xs mb-1.5 ml-1">Nº unidades</Text>
              <TextInput
                className="bg-dark-800 text-dark-50 rounded-xl px-4 py-3.5 text-base border border-dark-700"
                placeholder="0"
                placeholderTextColor="#475569"
                value={units}
                onChangeText={setUnits}
                keyboardType="decimal-pad"
              />
            </View>
            <View className="flex-1">
              <Text className="text-dark-300 text-xs mb-1.5 ml-1">Preço médio (€)</Text>
              <TextInput
                className="bg-dark-800 text-dark-50 rounded-xl px-4 py-3.5 text-base border border-dark-700"
                placeholder="0.00"
                placeholderTextColor="#475569"
                value={avgPrice}
                onChangeText={setAvgPrice}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Capital investido calculado */}
          {capitalInvested > 0 && (
            <View className="bg-dark-700 rounded-xl px-4 py-2.5 mb-4 flex-row justify-between">
              <Text className="text-dark-400 text-sm">Capital investido (calculado)</Text>
              <Text className="text-dark-50 font-semibold text-sm">
                {fmt(capitalInvested)}
              </Text>
            </View>
          )}

          {/* Valor atual */}
          <View className="mb-4">
            <Text className="text-dark-300 text-xs mb-1.5 ml-1">Valor atual (€) *</Text>
            <TextInput
              className="bg-dark-800 text-dark-50 rounded-xl px-4 py-3.5 text-base border border-dark-700"
              placeholder="Consulta no broker e insere aqui"
              placeholderTextColor="#475569"
              value={currentValue}
              onChangeText={setCurrentValue}
              keyboardType="decimal-pad"
            />
            {errors.currentValue && <Text className="text-red-700 text-xs mt-1 ml-1">{errors.currentValue}</Text>}
          </View>

          {/* Ação satélite */}
          <View className="bg-dark-800 rounded-xl px-4 py-3.5 mb-4 flex-row items-center justify-between">
            <View className="flex-1 mr-3">
              <Text className="text-dark-50 text-sm font-medium">Posição satélite</Text>
              <Text className="text-dark-500 text-xs mt-0.5">Fora da alocação principal do portfolio</Text>
            </View>
            <Switch
              value={isSatellite}
              onValueChange={setIsSatellite}
              trackColor={{ false: '#334155', true: '#0d9488' }}
              thumbColor="white"
            />
          </View>

          {save.isError && (
            <View className="bg-red-100 border border-red-300 rounded-xl px-4 py-3 mb-4">
              <Text className="text-red-800 text-sm">Erro ao guardar. Verifica os dados e tenta novamente.</Text>
            </View>
          )}

          <TouchableOpacity
            className="bg-mint-600 rounded-xl py-4 items-center mb-8"
            onPress={handleSubmit}
            disabled={save.isPending}
          >
            {save.isPending
              ? <ActivityIndicator color="white" />
              : <Text className="text-dark-50 font-semibold text-base">Adicionar ao Portfolio</Text>
            }
          </TouchableOpacity>

        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}
