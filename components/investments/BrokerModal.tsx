import { useState } from 'react'
import {
  Modal, View, Text, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as DocumentPicker from 'expo-document-picker'
import { File as ExpoFile } from 'expo-file-system'
import { Platform } from 'react-native'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { parseCSV, BROKERS, type BrokerId, type ParsedPosition } from '../../lib/csvParsers'
import { useBrokerConnections } from '../../hooks/useBrokerConnections'
import { useQueryClient } from '@tanstack/react-query'
import BrokerLogo from './BrokerLogo'
import * as XLSX from 'xlsx'

function isExcelFile(name: string, mime?: string | null) {
  return name.toLowerCase().endsWith('.xlsx') ||
    name.toLowerCase().endsWith('.xls') ||
    (mime ?? '').includes('spreadsheetml') ||
    (mime ?? '').includes('ms-excel')
}

function excelToText(data: ArrayBuffer | string, type: 'array' | 'base64'): string {
  const wb = XLSX.read(data, { type })
  const ws = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_csv(ws)
}

type Step = 'select_broker' | 'setup_api' | 'select_csv' | 'preview' | 'syncing'

interface Props {
  visible: boolean
  onClose: () => void
}

const fmt = (n: number) =>
  n.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

export default function BrokerModal({ visible, onClose }: Props) {
  const session    = useAuthStore((s) => s.session)
  const qc         = useQueryClient()
  const { data: connections, upsertConnection, saveCsvConnection, syncTrading212 } = useBrokerConnections()

  const [step,     setStep]     = useState<Step>('select_broker')
  const [broker,   setBroker]   = useState<BrokerId | null>(null)
  const [apiKey,   setApiKey]   = useState('')
  const [parsed,   setParsed]   = useState<ParsedPosition[]>([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const brokerInfo = BROKERS.find((b) => b.id === broker)

  function reset() {
    setStep('select_broker')
    setBroker(null)
    setApiKey('')
    setParsed([])
    setError(null)
  }

  function close() { reset(); onClose() }

  function pickCSVWeb(): Promise<string> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.csv,.txt,.tsv,.html,.htm,.mhtml,.mht,.xlsx,.xls,*/*'
      input.style.display = 'none'
      document.body.appendChild(input)
      input.onchange = () => {
        const file = input.files?.[0]
        document.body.removeChild(input)
        if (!file) { reject(new Error('cancelled')); return }
        const reader = new FileReader()
        if (isExcelFile(file.name, file.type)) {
          reader.onload = (e) => resolve(excelToText(e.target?.result as ArrayBuffer, 'array'))
          reader.onerror = () => reject(new Error('Erro ao ler o ficheiro'))
          reader.readAsArrayBuffer(file)
        } else {
          reader.onload = (e) => resolve(e.target?.result as string)
          reader.onerror = () => reject(new Error('Erro ao ler o ficheiro'))
          reader.readAsText(file, 'UTF-8')
        }
      }
      input.oncancel = () => { document.body.removeChild(input); reject(new Error('cancelled')) }
      input.click()
    })
  }

  async function pickCSV() {
    setError(null)
    try {
      let text: string

      if (Platform.OS === 'web') {
        try {
          text = await pickCSVWeb()
        } catch (e) {
          if (String(e).includes('cancelled')) return
          throw e
        }
      } else {
        const result = await DocumentPicker.getDocumentAsync({
          type: ['text/csv', 'text/plain',
                 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                 'application/vnd.ms-excel', '*/*'],
          copyToCacheDirectory: true,
        })
        if (result.canceled || !result.assets?.[0]) return
        const asset = result.assets[0]
        const expoFile = new ExpoFile(asset.uri)
        if (isExcelFile(asset.name ?? '', asset.mimeType)) {
          const buffer = await expoFile.arrayBuffer()
          text = excelToText(buffer, 'array')
        } else {
          text = await expoFile.text()
        }
      }

      const positions = parseCSV(broker!, text)

      if (positions.length === 0) {
        setError('Não foi possível ler o ficheiro. Confirma que é um CSV exportado deste broker.')
        return
      }

      setParsed(positions)
      setStep('preview')
    } catch (e) {
      setError('Erro ao ler o ficheiro: ' + String(e))
    }
  }

  async function importPositions() {
    if (!session || parsed.length === 0) return
    setLoading(true)
    setError(null)
    try {
      // Ensure connection record exists (CSV path — no API key, direct to Supabase)
      await saveCsvConnection.mutateAsync({
        broker:       broker!,
        display_name: brokerInfo?.label ?? broker!,
      })

      // Upsert all positions
      const rows = parsed.map((p) => ({
        user_id:          session.user.id,
        name:             p.name,
        ticker:           p.ticker,
        asset_type:       p.asset_type,
        broker:           p.broker,
        units:            p.units,
        avg_price:        p.avg_price,
        current_value:    p.current_value,
        capital_invested: p.capital_invested,
        source:           'csv_import',
        external_id:      p.ticker,
        last_updated:     new Date().toISOString(),
      }))

      const { error: upsertErr } = await supabase
        .from('dm_portfolio_assets')
        .upsert(rows, { onConflict: 'user_id,ticker', ignoreDuplicates: false })

      if (upsertErr) throw new Error(upsertErr.message)

      // Update last_import_at on the connection
      await supabase
        .from('dm_broker_connections')
        .update({ last_import_at: new Date().toISOString() })
        .eq('user_id', session.user.id)
        .eq('broker', broker!)

      qc.invalidateQueries({ queryKey: ['portfolio'] })
      Alert.alert('Importação concluída', `${parsed.length} ativo(s) importado(s) com sucesso.`)
      close()
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  async function saveApiKeyAndSync() {
    if (!session || !apiKey.trim()) return
    setLoading(true)
    setError(null)
    setStep('syncing')
    try {
      await upsertConnection.mutateAsync({
        broker:       'trading212',
        display_name: 'Trading 212',
        api_key:      apiKey.trim(),
      })
      const result = await syncTrading212.mutateAsync()
      Alert.alert('Sincronizado!', `${result.synced} posição(ões) importadas do Trading 212.`)
      close()
    } catch (e) {
      setError(String(e))
      setStep('setup_api')
    } finally {
      setLoading(false)
    }
  }

  // ── Renders ──────────────────────────────────────────────────────────────

  function renderSelectBroker() {
    return (
      <>
        <Text className="text-dark-50 text-lg font-bold mb-1">Conectar Corretora</Text>
        <Text className="text-dark-400 text-sm mb-5">
          Importa o teu portfolio directamente ou via API.
        </Text>

        {/* Already connected */}
        {(connections?.length ?? 0) > 0 && (
          <View className="mb-4 bg-mint-50 border border-mint-200 rounded-xl p-3">
            <Text className="text-dark-400 text-xs mb-2 font-semibold uppercase tracking-widest">Já ligadas</Text>
            {connections!.map((c) => (
              <View key={c.id} className="flex-row items-center gap-2.5 py-1.5">
                <BrokerLogo id={c.broker as any} size={28} />
                <View className="flex-1">
                  <View className="flex-row items-center gap-1.5">
                    <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.status === 'active' ? '#059669' : '#dc2626' }} />
                    <Text className="text-dark-200 text-sm font-medium">
                      {BROKERS.find((b) => b.id === c.broker)?.label ?? c.broker}
                    </Text>
                  </View>
                  <Text className="text-dark-500 text-xs">
                    {c.last_sync_at ? `sync ${new Date(c.last_sync_at).toLocaleDateString('pt-PT')}` : ''}
                    {c.last_import_at ? `import ${new Date(c.last_import_at).toLocaleDateString('pt-PT')}` : ''}
                  </Text>
                </View>
                {c.broker === 'trading212' && (
                  <TouchableOpacity
                    onPress={async () => {
                      setLoading(true)
                      try { await syncTrading212.mutateAsync() } catch { /* handled in hook */ }
                      setLoading(false)
                    }}
                    className="flex-row items-center gap-1 bg-teal-500/15 border border-teal-500/30 rounded-lg px-2.5 py-1"
                  >
                    {loading ? <ActivityIndicator size="small" color="#0d9488" /> : <Ionicons name="refresh-outline" size={12} color="#0d9488" />}
                    <Text className="text-teal-600 text-xs font-semibold">Sync</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}

        <Text className="text-dark-400 text-xs mb-3 font-semibold uppercase tracking-widest">Adicionar corretora</Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="gap-2">
            {BROKERS.map((b) => (
              <TouchableOpacity
                key={b.id}
                onPress={() => {
                  setBroker(b.id)
                  setStep(b.hasApi ? 'setup_api' : 'select_csv')
                }}
                className="flex-row items-center gap-3 bg-dark-800 border border-dark-600 rounded-2xl px-4 py-3.5"
              >
                <BrokerLogo id={b.id} size={40} />
                <View className="flex-1">
                  <Text className="text-dark-50 font-semibold text-sm">{b.label}</Text>
                  <Text className="text-dark-400 text-xs mt-0.5">
                    {b.hasApi ? 'API key · Sincronização automática' : 'Importação via CSV'}
                  </Text>
                </View>
                {b.hasApi && (
                  <View className="bg-teal-500/15 border border-teal-500/30 rounded-lg px-2 py-1">
                    <Text className="text-teal-600 text-xs font-semibold">Tempo-real</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </>
    )
  }

  function renderSetupApi() {
    return (
      <>
        <TouchableOpacity onPress={() => setStep('select_broker')} className="flex-row items-center gap-2 mb-4">
          <Ionicons name="arrow-back" size={16} color="#64748b" />
          <Text className="text-dark-400 text-sm">Corretoras</Text>
        </TouchableOpacity>

        <Text className="text-dark-50 text-lg font-bold mb-1">Trading 212 — API Key</Text>
        <Text className="text-dark-400 text-sm mb-5 leading-5">
          Gera uma chave API no Trading 212 e cola aqui. O DeskMint irá sincronizar as tuas posições automaticamente.
        </Text>

        <View className="bg-mint-50 border border-mint-200 rounded-xl p-4 mb-5">
          <Text className="text-dark-300 text-xs font-semibold mb-2">Como obter a API key:</Text>
          <Text className="text-dark-400 text-xs leading-5">
            1. Abre o Trading 212{'\n'}
            2. Menu → Definições → API{'\n'}
            3. Cria uma nova chave (só leitura é suficiente){'\n'}
            4. Cola a chave abaixo
          </Text>
        </View>

        <Text className="text-dark-400 text-xs mb-1.5">API Key</Text>
        <TextInput
          value={apiKey}
          onChangeText={setApiKey}
          placeholder="Cole aqui a tua API key..."
          placeholderTextColor="#94a3b8"
          autoCapitalize="none"
          autoCorrect={false}
          className="bg-dark-700 border border-dark-600 rounded-xl px-4 py-3 text-dark-50 text-sm mb-4"
        />

        {error && (
          <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
            <Text className="text-red-600 text-xs leading-5">{error}</Text>
          </View>
        )}

        <TouchableOpacity
          onPress={saveApiKeyAndSync}
          disabled={!apiKey.trim() || loading}
          className="bg-teal-500 rounded-xl py-3.5 items-center"
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text className="text-dark-50 font-semibold">Ligar e sincronizar</Text>}
        </TouchableOpacity>
      </>
    )
  }

  function renderSelectCsv() {
    return (
      <>
        <TouchableOpacity onPress={() => setStep('select_broker')} className="flex-row items-center gap-2 mb-4">
          <Ionicons name="arrow-back" size={16} color="#64748b" />
          <Text className="text-dark-400 text-sm">Corretoras</Text>
        </TouchableOpacity>

        <Text className="text-dark-50 text-lg font-bold mb-1">
          {brokerInfo?.label} — {broker === 'xtb' ? 'Excel / HTML' : 'CSV'}
        </Text>
        <Text className="text-dark-400 text-sm mb-5 leading-5">
          {broker === 'xtb'
            ? 'Exporta o teu portfolio em Excel ou HTML e importa aqui.'
            : 'Exporta o teu portfolio em CSV e importa aqui.'}
        </Text>

        <View className="bg-mint-50 border border-mint-200 rounded-xl p-4 mb-5">
          <Text className="text-dark-300 text-xs font-semibold mb-2">Como exportar:</Text>
          <Text className="text-dark-400 text-xs leading-5">{brokerInfo?.csvHelp}</Text>
        </View>

        {error && (
          <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
            <Text className="text-red-600 text-xs leading-5">{error}</Text>
          </View>
        )}

        <TouchableOpacity
          onPress={pickCSV}
          className="flex-row items-center justify-center gap-3 border-2 border-dashed border-dark-600 rounded-2xl py-8 bg-dark-700"
        >
          <Ionicons name="document-attach-outline" size={28} color="#64748b" />
          <View>
            <Text className="text-dark-200 font-semibold">Seleccionar ficheiro</Text>
            <Text className="text-dark-500 text-xs mt-0.5">
              {broker === 'xtb' ? 'Excel (.xlsx) ou HTML' : 'CSV ou HTML'}{' (exportação do broker)'}
            </Text>
          </View>
        </TouchableOpacity>
      </>
    )
  }

  function renderPreview() {
    const total = parsed.reduce((s, p) => s + p.current_value, 0)
    return (
      <>
        <TouchableOpacity onPress={() => setStep('select_csv')} className="flex-row items-center gap-2 mb-4">
          <Ionicons name="arrow-back" size={16} color="#64748b" />
          <Text className="text-dark-400 text-sm">Seleccionar ficheiro</Text>
        </TouchableOpacity>

        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-dark-50 text-lg font-bold">{parsed.length} posições encontradas</Text>
          <Text className="text-dark-400 text-sm">{fmt(total)}</Text>
        </View>

        <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false} className="mb-4">
          {parsed.map((p, i) => (
            <View key={i} className="flex-row items-center justify-between py-2.5 border-b border-dark-600">
              <View className="flex-1 min-w-0 mr-3">
                <Text className="text-dark-100 text-sm font-semibold" numberOfLines={1}>{p.ticker}</Text>
                <Text className="text-dark-400 text-xs" numberOfLines={1}>{p.name}</Text>
              </View>
              <View className="items-end">
                <Text className="text-dark-200 text-sm font-medium">{fmt(p.current_value)}</Text>
                <Text className="text-dark-500 text-xs">{p.units.toFixed(4)} un.</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        <View className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
          <Text className="text-amber-700 text-xs leading-5">
            Se já tens estes ativos no portfolio, os valores serão actualizados. Não serão criadas duplicações.
          </Text>
        </View>

        {error && (
          <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
            <Text className="text-red-600 text-xs leading-5">{error}</Text>
          </View>
        )}

        <TouchableOpacity
          onPress={importPositions}
          disabled={loading}
          className="bg-teal-500 rounded-xl py-3.5 items-center"
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text className="text-dark-50 font-semibold">Importar {parsed.length} posições</Text>}
        </TouchableOpacity>
      </>
    )
  }

  function renderSyncing() {
    return (
      <View className="flex-1 items-center justify-center gap-4">
        <ActivityIndicator size="large" color="#0d9488" />
        <Text className="text-dark-50 font-semibold text-base">A sincronizar com Trading 212…</Text>
        <Text className="text-dark-400 text-sm text-center">A importar as tuas posições em tempo-real.</Text>
        {error && (
          <View className="bg-red-50 border border-red-200 rounded-xl p-3 mt-2">
            <Text className="text-red-600 text-xs leading-5">{error}</Text>
          </View>
        )}
      </View>
    )
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <SafeAreaView className="flex-1 bg-dark-900">
        <View className="flex-row justify-between items-center px-4 py-3 border-b border-dark-600">
          <Text className="text-dark-50 font-bold text-base">Corretoras</Text>
          <TouchableOpacity onPress={close} className="w-8 h-8 rounded-full bg-dark-700 items-center justify-center">
            <Ionicons name="close" size={18} color="#475569" />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-4 pt-5" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {step === 'select_broker' && renderSelectBroker()}
          {step === 'setup_api'     && renderSetupApi()}
          {step === 'select_csv'    && renderSelectCsv()}
          {step === 'preview'       && renderPreview()}
          {step === 'syncing'       && renderSyncing()}
          <View className="h-8" />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}
