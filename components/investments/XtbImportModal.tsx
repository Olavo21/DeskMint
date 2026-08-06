import { useState } from 'react'
import {
  Modal, View, Text, TouchableOpacity, ScrollView, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as DocumentPicker from 'expo-document-picker'
import { File as ExpoFile } from 'expo-file-system'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { parseXtbArrayBuffer, type XtbParseResult, type XtbHolding } from '../../lib/xtbParser'
import { useFmt } from '../../utils/format'

type Step = 'idle' | 'parsing' | 'preview' | 'importing' | 'done' | 'error'

const fmtN = (n: number) =>
  n.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })

function PLBadge({ pct }: { pct: number }) {
  const pos = pct >= 0
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3,
      backgroundColor: pos ? '#14b8a615' : '#ef444415', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
      <Ionicons name={pos ? 'trending-up-outline' : 'trending-down-outline'} size={10} color={pos ? '#14b8a6' : '#ef4444'} />
      <Text style={{ color: pos ? '#14b8a6' : '#ef4444', fontSize: 10, fontWeight: '700' }}>
        {pos ? '+' : ''}{pct.toFixed(2)}%
      </Text>
    </View>
  )
}

export default function XtbImportModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [step,   setStep]   = useState<Step>('idle')
  const [result, setResult] = useState<XtbParseResult | null>(null)
  const [error,  setError]  = useState('')
  const fmt = useFmt()
  const qc  = useQueryClient()
  const session = useAuthStore((s) => s.session)

  async function pickAndParse() {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
               'application/vnd.ms-excel', 'application/octet-stream', '*/*'],
        copyToCacheDirectory: true,
      })
      if (res.canceled || !res.assets?.[0]) return

      setStep('parsing')
      const uri    = res.assets[0].uri
      const buffer = await new ExpoFile(uri).arrayBuffer()
      const parsed = parseXtbArrayBuffer(buffer)

      if (parsed.holdings.length === 0) {
        setError('Não foram encontradas posições abertas no ficheiro. Certifica-te de que exportaste o relatório correcto da XTB.')
        setStep('error')
        return
      }

      setResult(parsed)
      setStep('preview')
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao ler o ficheiro.')
      setStep('error')
    }
  }

  async function confirmImport() {
    if (!result || !session) return
    setStep('importing')

    try {
      const uid = session.user.id
      const now = new Date().toISOString()

      const upsertRows = result.holdings.map((h: XtbHolding) => ({
        user_id:          uid,
        ticker:           h.ticker,
        name:             h.name,
        asset_type:       h.asset_type,
        broker:           'XTB',
        units:            h.units,
        avg_price:        h.avg_price,
        current_value:    h.current_value,
        capital_invested: h.capital_invested,
        last_updated:     now,
      }))

      const { error: upsertErr } = await supabase
        .from('dm_portfolio_assets')
        .upsert(upsertRows, { onConflict: 'user_id,ticker', ignoreDuplicates: false })

      if (upsertErr) throw upsertErr

      qc.invalidateQueries({ queryKey: ['portfolio'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setStep('done')
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao guardar os dados.')
      setStep('error')
    }
  }

  function reset() {
    setStep('idle')
    setResult(null)
    setError('')
  }

  function handleClose() {
    reset()
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>

        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#0d9488',
              alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
            </View>
            <Text style={{ color: '#0f172a', fontSize: 17, fontWeight: '700' }}>Importar XTB</Text>
          </View>
          <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={22} color="#64748b" />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>

          {/* ── IDLE ─────────────────────────────────────────────────────── */}
          {step === 'idle' && (
            <View style={{ gap: 20 }}>
              <View style={{ backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe',
                borderRadius: 14, padding: 16, gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="information-circle-outline" size={16} color="#2563eb" />
                  <Text style={{ color: '#1e40af', fontSize: 13, fontWeight: '600' }}>Como exportar da XTB</Text>
                </View>
                <Text style={{ color: '#1e40af', fontSize: 12, lineHeight: 19 }}>
                  1. Na xStation → Histórico da conta → aba <Text style={{ fontWeight: '700' }}>Open Positions</Text>{'\n'}
                  2. Clica em <Text style={{ fontWeight: '700' }}>Exportar</Text> → formato <Text style={{ fontWeight: '700' }}>Excel (.xlsx)</Text>{'\n'}
                  3. Seleciona o ficheiro abaixo
                </Text>
              </View>

              <TouchableOpacity
                onPress={pickAndParse}
                style={{ backgroundColor: '#0d9488', borderRadius: 14, padding: 18,
                  alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
                <Ionicons name="document-outline" size={20} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Selecionar ficheiro .xlsx</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── PARSING ──────────────────────────────────────────────────── */}
          {step === 'parsing' && (
            <View style={{ alignItems: 'center', paddingVertical: 60, gap: 16 }}>
              <ActivityIndicator size="large" color="#0d9488" />
              <Text style={{ color: '#64748b', fontSize: 14 }}>A analisar o ficheiro XTB…</Text>
            </View>
          )}

          {/* ── PREVIEW ──────────────────────────────────────────────────── */}
          {step === 'preview' && result && (
            <View style={{ gap: 20 }}>

              {/* Summary chips */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0',
                  borderRadius: 12, padding: 12, alignItems: 'center', gap: 2 }}>
                  <Text style={{ color: '#166534', fontSize: 18, fontWeight: '800' }}>{fmtN(result.total_deposits)}</Text>
                  <Text style={{ color: '#16a34a', fontSize: 10 }}>Depósitos ({result.deposit_count}×)</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe',
                  borderRadius: 12, padding: 12, alignItems: 'center', gap: 2 }}>
                  <Text style={{ color: '#1e40af', fontSize: 18, fontWeight: '800' }}>{fmtN(result.total_dividends)}</Text>
                  <Text style={{ color: '#2563eb', fontSize: 10 }}>Dividendos ({result.dividend_count}×)</Text>
                </View>
              </View>

              {/* Holdings list */}
              <Text style={{ color: '#0f172a', fontSize: 14, fontWeight: '700' }}>
                {result.holdings.length} posições a importar
              </Text>

              <View style={{ gap: 8 }}>
                {result.holdings.map((h) => (
                  <View key={h.ticker}
                    style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0',
                      borderRadius: 14, padding: 14 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#0f172a', fontSize: 14, fontWeight: '700' }} numberOfLines={1}>{h.name}</Text>
                        <Text style={{ color: '#64748b', fontSize: 11, marginTop: 1 }}>{h.ticker} · {h.asset_type}</Text>
                      </View>
                      <PLBadge pct={h.net_profit_pct} />
                    </View>
                    <View style={{ flexDirection: 'row', gap: 0 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#94a3b8', fontSize: 10 }}>Valor atual</Text>
                        <Text style={{ color: '#0f172a', fontSize: 13, fontWeight: '700' }}>{fmtN(h.current_value)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#94a3b8', fontSize: 10 }}>Capital</Text>
                        <Text style={{ color: '#0f172a', fontSize: 13, fontWeight: '600' }}>{fmtN(h.capital_invested)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#94a3b8', fontSize: 10 }}>Unidades</Text>
                        <Text style={{ color: '#0f172a', fontSize: 13, fontWeight: '600' }}>{h.units.toFixed(4)}</Text>
                      </View>
                    </View>
                    <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#94a3b8', fontSize: 10 }}>P&L</Text>
                      <Text style={{ color: h.net_profit >= 0 ? '#16a34a' : '#dc2626', fontSize: 12, fontWeight: '700' }}>
                        {h.net_profit >= 0 ? '+' : ''}{fmtN(h.net_profit)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              <View style={{ backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a',
                borderRadius: 12, padding: 12, flexDirection: 'row', gap: 8 }}>
                <Ionicons name="warning-outline" size={14} color="#d97706" style={{ marginTop: 1 }} />
                <Text style={{ color: '#92400e', fontSize: 11, lineHeight: 17, flex: 1 }}>
                  As posições existentes com o mesmo ticker serão <Text style={{ fontWeight: '700' }}>actualizadas</Text>.
                  Posições não presentes no ficheiro não serão removidas.
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity onPress={reset}
                  style={{ flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, alignItems: 'center' }}>
                  <Text style={{ color: '#64748b', fontSize: 14, fontWeight: '600' }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={confirmImport}
                  style={{ flex: 2, backgroundColor: '#0d9488', borderRadius: 12, padding: 14, alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Confirmar importação</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── IMPORTING ────────────────────────────────────────────────── */}
          {step === 'importing' && (
            <View style={{ alignItems: 'center', paddingVertical: 60, gap: 16 }}>
              <ActivityIndicator size="large" color="#0d9488" />
              <Text style={{ color: '#64748b', fontSize: 14 }}>A guardar no portfólio…</Text>
            </View>
          )}

          {/* ── DONE ─────────────────────────────────────────────────────── */}
          {step === 'done' && result && (
            <View style={{ alignItems: 'center', paddingVertical: 40, gap: 16 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#f0fdf4',
                alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="checkmark-circle" size={40} color="#16a34a" />
              </View>
              <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>Importação concluída!</Text>
              <Text style={{ color: '#64748b', fontSize: 13, textAlign: 'center' }}>
                {result.holdings.length} posições sincronizadas com o teu portfólio XTB.
              </Text>
              <TouchableOpacity onPress={handleClose}
                style={{ backgroundColor: '#0d9488', borderRadius: 14, paddingHorizontal: 40, paddingVertical: 14, marginTop: 8 }}>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Ver portfólio</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── ERROR ────────────────────────────────────────────────────── */}
          {step === 'error' && (
            <View style={{ gap: 20 }}>
              <View style={{ alignItems: 'center', paddingVertical: 32, gap: 12 }}>
                <Ionicons name="alert-circle-outline" size={48} color="#dc2626" />
                <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '700' }}>Erro na importação</Text>
                <Text style={{ color: '#64748b', fontSize: 13, textAlign: 'center', lineHeight: 20 }}>{error}</Text>
              </View>
              <TouchableOpacity onPress={reset}
                style={{ backgroundColor: '#0d9488', borderRadius: 14, padding: 14, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Tentar novamente</Text>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}
