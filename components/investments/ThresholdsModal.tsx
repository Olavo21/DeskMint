import { useState } from 'react'
import {
  Modal, View, Text, TouchableOpacity, ScrollView,
  TextInput, Switch, Alert, ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import {
  useThresholdAlerts, THRESHOLD_COLOR,
  type ThresholdAlert,
} from '../../hooks/useThresholdAlerts'
import type { DmPortfolioAsset } from '../../types/database'
import type { LookThroughEntry } from '../../hooks/useEtfComposition'

type Props = {
  visible: boolean
  onClose: () => void
  assets: DmPortfolioAsset[]
  lookThroughEntries?: LookThroughEntry[]
}

type Suggestion = {
  block_name: string
  ticker: string | null
  asset_type: string | null
  use_look_through: boolean
  max_pct: number | null
  min_pct: number | null
  description: string
}

const SUGGESTIONS: Suggestion[] = [
  {
    block_name: 'Nvidia total',
    ticker: 'NVDA', asset_type: null,
    use_look_through: true,
    max_pct: 20, min_pct: null,
    description: 'Exposição real (direto + ETFs) ≤ 20%',
  },
  {
    block_name: 'Cripto',
    ticker: null, asset_type: 'CRYPTO',
    use_look_through: false,
    max_pct: 5, min_pct: null,
    description: 'Total em cripto ≤ 5%',
  },
  {
    block_name: 'Ações satélite',
    ticker: null, asset_type: 'STOCK',
    use_look_through: false,
    max_pct: 30, min_pct: null,
    description: 'Total em ações individuais ≤ 30%',
  },
  {
    block_name: 'ETFs core',
    ticker: null, asset_type: 'ETF',
    use_look_through: false,
    max_pct: null, min_pct: 60,
    description: 'Base ETFs ≥ 60%',
  },
]

const MAX_BLOCK_NAME_LEN = 50
const MAX_TICKER_LEN = 10

const ASSET_TYPE_LABELS: Record<string, string> = {
  ETF: 'ETF', STOCK: 'Ação', CRYPTO: 'Cripto', BOND: 'Obrigação', OTHER: 'Outro',
}
const ASSET_TYPES = ['ETF', 'STOCK', 'CRYPTO', 'BOND', 'OTHER']

const STATUS_LABEL = { ok: 'OK', warning: 'AVISO', breached: 'EXCEDIDO' }
const STATUS_BG    = { ok: '#14b8a615', warning: '#f9731615', breached: '#ef444415' }

function ThresholdRow({
  alert,
  onDelete,
}: {
  alert: ThresholdAlert
  onDelete: () => void
}) {
  const color = THRESHOLD_COLOR[alert.status]
  const refPct = alert.max_pct ?? alert.min_pct ?? 100
  const isMin  = alert.max_pct === null && alert.min_pct !== null

  return (
    <View style={{ marginBottom: 10, backgroundColor: '#1e293b', borderRadius: 14, padding: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={{ color: '#f8faf9', fontSize: 14, fontWeight: '600' }}>{alert.block_name}</Text>
          <Text style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>
            {alert.ticker
              ? `${alert.use_look_through ? 'Look-through: ' : ''}${alert.ticker}`
              : alert.asset_type ? ASSET_TYPE_LABELS[alert.asset_type] ?? alert.asset_type : '—'}
            {alert.max_pct !== null ? ` · teto ${alert.max_pct}%` : ''}
            {alert.min_pct !== null ? ` · mín ${alert.min_pct}%` : ''}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ backgroundColor: STATUS_BG[alert.status], paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
            <Text style={{ color, fontSize: 10, fontWeight: '700' }}>{STATUS_LABEL[alert.status]}</Text>
          </View>
          <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress bar */}
      <View style={{ height: 5, backgroundColor: '#334155', borderRadius: 4, overflow: 'hidden' }}>
        <View
          style={{
            height: 5,
            width: `${Math.min(alert.fillPct * 100, 100)}%`,
            backgroundColor: color,
            borderRadius: 4,
          }}
        />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={{ color: '#94a3b8', fontSize: 10 }}>
          {isMin ? 'Atual' : 'Atual'}: {alert.currentPct.toFixed(1)}%
        </Text>
        <Text style={{ color: '#64748b', fontSize: 10 }}>
          {isMin ? `mín ${alert.min_pct}%` : `teto ${alert.max_pct}%`}
        </Text>
      </View>
    </View>
  )
}

export default function ThresholdsModal({ visible, onClose, assets, lookThroughEntries }: Props) {
  const { alerts, isLoading, create, remove } = useThresholdAlerts(assets, lookThroughEntries)

  const [blockName,      setBlockName]      = useState('')
  const [ticker,         setTicker]         = useState('')
  const [assetType,      setAssetType]      = useState('')
  const [maxPct,         setMaxPct]         = useState('')
  const [minPct,         setMinPct]         = useState('')
  const [useLookThrough, setUseLookThrough] = useState(false)
  const [showForm,       setShowForm]       = useState(false)
  const [saving,         setSaving]         = useState(false)

  function resetForm() {
    setBlockName(''); setTicker(''); setAssetType('')
    setMaxPct(''); setMinPct(''); setUseLookThrough(false)
    setShowForm(false)
  }

  async function handleAdd() {
    const name = blockName.trim()
    if (!name) { Alert.alert('Nome obrigatório'); return }
    const parsedMax = maxPct ? parseFloat(maxPct.replace(',', '.')) : null
    const parsedMin = minPct ? parseFloat(minPct.replace(',', '.')) : null
    if (parsedMax === null && parsedMin === null) {
      Alert.alert('Define pelo menos teto máximo ou mínimo'); return
    }
    if (parsedMax !== null && (isNaN(parsedMax) || parsedMax < 0 || parsedMax > 100)) {
      Alert.alert('Teto máximo inválido', 'Tem de estar entre 0 e 100%.'); return
    }
    if (parsedMin !== null && (isNaN(parsedMin) || parsedMin < 0 || parsedMin > 100)) {
      Alert.alert('Mínimo inválido', 'Tem de estar entre 0 e 100%.'); return
    }
    setSaving(true)
    try {
      await create.mutateAsync({
        block_name:      name,
        ticker:          ticker.trim().toUpperCase() || null,
        asset_type:      assetType || null,
        max_pct:         parsedMax,
        min_pct:         parsedMin,
        use_look_through: useLookThrough,
      })
      resetForm()
    } finally {
      setSaving(false)
    }
  }

  async function handleSuggestion(s: Suggestion) {
    const existing = alerts.find((a) => a.block_name === s.block_name)
    if (existing) {
      Alert.alert('Já existe', `O bloco "${s.block_name}" já está configurado.`)
      return
    }
    setSaving(true)
    try {
      await create.mutateAsync({
        block_name:      s.block_name,
        ticker:          s.ticker,
        asset_type:      s.asset_type,
        max_pct:         s.max_pct,
        min_pct:         s.min_pct,
        use_look_through: s.use_look_through,
      })
    } finally {
      setSaving(false)
    }
  }

  function handleDelete(alert: ThresholdAlert) {
    Alert.alert(
      'Remover teto',
      `Remover "${alert.block_name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Remover', style: 'destructive', onPress: () => remove.mutate(alert.id) },
      ],
    )
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
          borderBottomWidth: 1, borderBottomColor: '#1e293b',
        }}>
          <Text style={{ color: '#f8faf9', fontSize: 18, fontWeight: '700' }}>Tetos de Concentração</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

          {/* Existing thresholds */}
          {isLoading ? (
            <ActivityIndicator color="#14b8a6" style={{ marginVertical: 20 }} />
          ) : alerts.length === 0 ? (
            <View style={{
              alignItems: 'center', padding: 24,
              backgroundColor: '#1e293b', borderRadius: 14, marginBottom: 16,
            }}>
              <Ionicons name="shield-outline" size={32} color="#334155" style={{ marginBottom: 8 }} />
              <Text style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>
                Nenhum teto configurado.{'\n'}Adiciona regras ou usa as sugestões abaixo.
              </Text>
            </View>
          ) : (
            alerts.map((alert) => (
              <ThresholdRow key={alert.id} alert={alert} onDelete={() => handleDelete(alert)} />
            ))
          )}

          {/* Suggestions */}
          <Text style={{ color: '#64748b', fontSize: 11, fontWeight: '600', letterSpacing: 0.5, marginBottom: 10, marginTop: 4 }}>
            SUGESTÕES RÁPIDAS
          </Text>
          {SUGGESTIONS.map((s) => {
            const already = alerts.some((a) => a.block_name === s.block_name)
            return (
              <TouchableOpacity
                key={s.block_name}
                onPress={() => handleSuggestion(s)}
                disabled={already || saving}
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  backgroundColor: already ? '#1e293b' : '#14b8a610',
                  borderRadius: 12, padding: 12, marginBottom: 8,
                  borderWidth: 1, borderColor: already ? '#1e293b' : '#14b8a630',
                  opacity: already ? 0.5 : 1,
                }}
              >
                <Ionicons
                  name={already ? 'checkmark-circle' : 'add-circle-outline'}
                  size={18} color={already ? '#14b8a6' : '#14b8a6'}
                  style={{ marginRight: 10 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#f8faf9', fontSize: 13, fontWeight: '600' }}>{s.block_name}</Text>
                  <Text style={{ color: '#64748b', fontSize: 11, marginTop: 1 }}>{s.description}</Text>
                </View>
              </TouchableOpacity>
            )
          })}

          {/* Add form */}
          <TouchableOpacity
            onPress={() => setShowForm((v) => !v)}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              gap: 6, paddingVertical: 11, borderRadius: 12, marginTop: 8,
              backgroundColor: showForm ? '#1e293b' : '#14b8a610',
              borderWidth: 1, borderColor: '#14b8a630',
            }}
          >
            <Ionicons name={showForm ? 'chevron-up' : 'add-outline'} size={16} color="#14b8a6" />
            <Text style={{ color: '#14b8a6', fontSize: 13, fontWeight: '600' }}>
              {showForm ? 'Fechar formulário' : 'Novo teto personalizado'}
            </Text>
          </TouchableOpacity>

          {showForm && (
            <View style={{ backgroundColor: '#1e293b', borderRadius: 14, padding: 14, marginTop: 10, gap: 12 }}>
              <View>
                <Text style={{ color: '#94a3b8', fontSize: 11, marginBottom: 5 }}>NOME DO BLOCO</Text>
                <TextInput
                  value={blockName} onChangeText={setBlockName}
                  maxLength={MAX_BLOCK_NAME_LEN}
                  placeholder="ex: Nvidia total"
                  placeholderTextColor="#475569"
                  style={{ backgroundColor: '#0f172a', color: '#f8faf9', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 }}
                />
              </View>

              <View>
                <Text style={{ color: '#94a3b8', fontSize: 11, marginBottom: 5 }}>TICKER (opcional)</Text>
                <TextInput
                  value={ticker} onChangeText={(v) => setTicker(v.toUpperCase().slice(0, MAX_TICKER_LEN))}
                  maxLength={MAX_TICKER_LEN}
                  placeholder="ex: NVDA"
                  placeholderTextColor="#475569"
                  autoCapitalize="characters"
                  style={{ backgroundColor: '#0f172a', color: '#f8faf9', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 }}
                />
                {ticker.length > 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                    <Text style={{ color: '#94a3b8', fontSize: 12 }}>Incluir via ETFs (look-through)</Text>
                    <Switch
                      value={useLookThrough} onValueChange={setUseLookThrough}
                      trackColor={{ false: '#334155', true: '#14b8a6' }}
                      thumbColor="#f8faf9"
                    />
                  </View>
                )}
              </View>

              {!ticker && (
                <View>
                  <Text style={{ color: '#94a3b8', fontSize: 11, marginBottom: 5 }}>TIPO DE ATIVO</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {ASSET_TYPES.map((t) => (
                      <TouchableOpacity
                        key={t}
                        onPress={() => setAssetType(assetType === t ? '' : t)}
                        style={{
                          paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
                          backgroundColor: assetType === t ? '#14b8a620' : '#0f172a',
                          borderWidth: 1, borderColor: assetType === t ? '#14b8a6' : '#334155',
                        }}
                      >
                        <Text style={{ color: assetType === t ? '#14b8a6' : '#64748b', fontSize: 12, fontWeight: '600' }}>
                          {ASSET_TYPE_LABELS[t]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#94a3b8', fontSize: 11, marginBottom: 5 }}>TETO MÁXIMO %</Text>
                  <TextInput
                    value={maxPct} onChangeText={setMaxPct}
                    placeholder="ex: 20"
                    placeholderTextColor="#475569"
                    keyboardType="decimal-pad"
                    style={{ backgroundColor: '#0f172a', color: '#f8faf9', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#94a3b8', fontSize: 11, marginBottom: 5 }}>MÍNIMO %</Text>
                  <TextInput
                    value={minPct} onChangeText={setMinPct}
                    placeholder="ex: 60"
                    placeholderTextColor="#475569"
                    keyboardType="decimal-pad"
                    style={{ backgroundColor: '#0f172a', color: '#f8faf9', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 }}
                  />
                </View>
              </View>

              <TouchableOpacity
                onPress={handleAdd}
                disabled={saving}
                style={{
                  backgroundColor: '#14b8a6', borderRadius: 12,
                  paddingVertical: 12, alignItems: 'center',
                }}
              >
                {saving
                  ? <ActivityIndicator color="#0f172a" size="small" />
                  : <Text style={{ color: '#0f172a', fontWeight: '700', fontSize: 14 }}>Adicionar teto</Text>
                }
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  )
}
