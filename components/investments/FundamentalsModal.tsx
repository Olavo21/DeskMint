import { useState, useCallback } from 'react'
import {
  Modal, View, Text, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'

const SUPABASE_URL    = process.env.EXPO_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON   = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
import LotsModal from './LotsModal'
import {
  METRICS, computeVerdict, LIGHT_COLORS, fmtMetricValue,
  type MetricKey, type MetricConfig,
} from '../../lib/fundamentalsMetrics'
import { usePortfolioLimits, STATUS_COLOR } from '../../hooks/usePortfolioLimits'
import { usePortfolio } from '../../hooks/usePortfolio'

interface Props {
  visible: boolean
  onClose: () => void
  assetId: string
  ticker: string
  currentPrice?: number
}

type Tab = 'analysis' | 'calculator'

const SCENARIOS = [
  { key: 'immediate', label: 'Imediato',   icon: 'flash-outline' as const },
  { key: 'fractional', label: 'Fracionado', icon: 'infinite-outline' as const },
  { key: 'dca',        label: 'DCA 3M',     icon: 'calendar-outline' as const },
] as const

// ── Info card per metric ─────────────────────────────────────────────────────
function MetricInfoCard({ m, onClose }: { m: MetricConfig; onClose: () => void }) {
  return (
    <View style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15,23,42,0.6)', zIndex: 100,
      justifyContent: 'flex-end',
    }}>
      <TouchableOpacity
        style={{ flex: 1 }}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={{
        backgroundColor: '#f8faf9', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 20, paddingBottom: 36,
        borderWidth: 1, borderColor: '#c9d4cf',
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>{m.fullName}</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={20} color="#64748b" />
          </TouchableOpacity>
        </View>
        <Text style={{ color: '#475569', fontSize: 13, lineHeight: 20, marginBottom: 12 }}>{m.description}</Text>
        <View style={{ gap: 8 }}>
          <Row icon="calculator-outline" label="Fórmula" value={m.formula} />
          <Row icon="checkmark-circle-outline" label="Bom quando" value={m.good} color="#14b8a6" />
          <Row icon="alert-circle-outline"     label="Mau quando"  value={m.bad}  color="#ef4444" />
          <Row icon="bulb-outline"             label="Exemplo"    value={m.example} />
        </View>
      </View>
    </View>
  )
}

function Row({ icon, label, value, color }: { icon: string; label: string; value: string; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Ionicons name={icon as 'bulb-outline'} size={14} color={color ?? '#64748b'} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
        <Text style={{ color: color ?? '#475569', fontSize: 12, lineHeight: 18, marginTop: 1 }}>{value}</Text>
      </View>
    </View>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export default function FundamentalsModal({ visible, onClose, assetId, ticker, currentPrice }: Props) {
  const session = useAuthStore((s) => s.session)

  // Portfolio data for limit checks
  const { data: portfolioData } = usePortfolio()
  const assetWeights = (() => {
    const total = portfolioData?.totalValue ?? 0
    if (total === 0) return {}
    return Object.fromEntries(
      (portfolioData?.assets ?? []).map((a) => [a.ticker, (a.current_value / total) * 100])
    )
  })()
  const limitsQuery = usePortfolioLimits(assetWeights)

  const [tab, setTab]             = useState<Tab>('analysis')
  const [activeInfo, setActiveInfo] = useState<MetricKey | null>(null)
  const [metricValues, setMetricValues] = useState<Partial<Record<MetricKey, string>>>({})
  const [isFetching, setIsFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [fetchedName, setFetchedName] = useState<string | null>(null)

  // Calculator state
  const [amount, setAmount]       = useState('')
  const [price, setPrice]         = useState(currentPrice ? String(currentPrice) : '')
  const [scenario, setScenario]   = useState<0 | 1 | 2>(0)
  const [showLots, setShowLots]   = useState(false)

  const numericValues = Object.fromEntries(
    Object.entries(metricValues).map(([k, v]) => {
      const n = Number((v ?? '').replace(',', '.'))
      return [k, isNaN(n) ? 0 : n]
    }),
  ) as Partial<Record<MetricKey, number>>

  const verdict = computeVerdict(numericValues)
  const activeInfoMetric = activeInfo ? METRICS.find((m) => m.key === activeInfo) : null

  // Auto-fetch from Finnhub via Edge Function
  const handleFetch = useCallback(async () => {
    setIsFetching(true)
    setFetchError(null)
    try {
      const { data: { session: s } } = await supabase.auth.getSession()
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/stock-fundamentals?ticker=${encodeURIComponent(ticker)}`,
        {
          headers: {
            Authorization: `Bearer ${s?.access_token ?? ''}`,
            apikey: SUPABASE_ANON,
          },
        },
      )
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()

      if (data.error) throw new Error(data.error)

      setFetchedName(data.name ?? null)

      // Map received data to metric inputs
      const updates: Partial<Record<MetricKey, string>> = {}
      const map: Partial<Record<MetricKey, number | null>> = {
        pe:                 data.pe,
        peg:                data.peg,
        roe:                data.roe,
        roic:               data.roic,
        evEbitda:           data.evEbitda,
        opMargin:           data.opMargin,
        beta:               data.beta,
        debtEquity:         data.debtEquity,
        revenuePerEmployee: data.revenuePerEmployee,
      }
      for (const [key, val] of Object.entries(map)) {
        if (val !== null && val !== undefined && !isNaN(Number(val))) {
          updates[key as MetricKey] = String(Number(val).toFixed(2))
        }
      }
      setMetricValues((prev) => ({ ...prev, ...updates }))

      if (data.currentPrice && !price) {
        setPrice(String(data.currentPrice))
      }
    } catch (err) {
      setFetchError('Erro ao buscar dados. Podes introduzir manualmente.')
    } finally {
      setIsFetching(false)
    }
  }, [ticker, price])

  // Calculator
  const priceNum  = Number(price.replace(',', '.'))
  const amountNum = Number(amount.replace(',', '.'))
  const validCalc = priceNum > 0 && amountNum > 0

  const sharesImmediate  = validCalc ? Math.floor(amountNum / priceNum) : 0
  const costImmediate    = sharesImmediate * priceNum
  const remainder        = validCalc ? amountNum - costImmediate : 0
  const sharesFractional = validCalc ? amountNum / priceNum : 0
  const dcaMonthly       = amountNum / 3
  const dcaShares        = validCalc ? Math.floor(dcaMonthly / priceNum) : 0

  function fmtEur(n: number) {
    return n.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
  }

  return (
    <>
      <LotsModal
        visible={showLots}
        onClose={() => setShowLots(false)}
        assetId={assetId}
        ticker={ticker}
      />

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
              <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '700' }}>{ticker}</Text>
              {fetchedName && <Text style={{ color: '#64748b', fontSize: 11, marginTop: 1 }}>{fetchedName}</Text>}
            </View>
            <TouchableOpacity
              onPress={handleFetch}
              disabled={isFetching}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              {isFetching
                ? <ActivityIndicator size="small" color="#14b8a6" />
                : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="cloud-download-outline" size={18} color="#14b8a6" />
                    <Text style={{ color: '#14b8a6', fontSize: 11, fontWeight: '600' }}>Auto</Text>
                  </View>
                )
              }
            </TouchableOpacity>
          </View>

          {fetchError && (
            <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 16, paddingVertical: 8 }}>
              <Text style={{ color: '#92400e', fontSize: 11 }}>{fetchError}</Text>
            </View>
          )}

          {/* Tab bar */}
          <View style={{
            flexDirection: 'row', marginHorizontal: 16, marginTop: 12, marginBottom: 4,
            backgroundColor: '#e8efec', borderRadius: 12, padding: 3,
          }}>
            {(['analysis', 'calculator'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setTab(t)}
                style={{
                  flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center',
                  backgroundColor: tab === t ? '#f8faf9' : 'transparent',
                }}
              >
                <Text style={{ color: tab === t ? '#0f172a' : '#64748b', fontSize: 13, fontWeight: '600' }}>
                  {t === 'analysis' ? 'Análise' : 'Calculadora'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            {tab === 'analysis' ? (
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* Metrics */}
                <View style={{
                  backgroundColor: '#f8faf9', borderWidth: 1, borderColor: '#c9d4cf',
                  borderRadius: 20, padding: 16, marginBottom: 12,
                }}>
                  <Text style={{ color: '#64748b', fontSize: 11, marginBottom: 14, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Métricas fundamentais
                  </Text>

                  {METRICS.map((m, i) => {
                    const raw      = metricValues[m.key] ?? ''
                    const numVal   = Number(raw.replace(',', '.'))
                    const hasValue = raw !== '' && !isNaN(numVal)
                    const light    = hasValue ? m.getLight(numVal) : 'neutral'
                    const lightLabel = hasValue ? m.getLightLabel(numVal) : ''
                    const lightColor = LIGHT_COLORS[light]

                    return (
                      <View key={m.key} style={{ marginBottom: i < METRICS.length - 1 ? 14 : 0 }}>
                        {/* Label + info */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 5 }}>
                          <Text style={{ color: '#475569', fontSize: 11, fontWeight: '600' }}>{m.label}</Text>
                          <TouchableOpacity
                            onPress={() => setActiveInfo(m.key)}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <Ionicons name="information-circle-outline" size={14} color="#94a3b8" />
                          </TouchableOpacity>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          {/* Input */}
                          <TextInput
                            value={raw}
                            onChangeText={(v) => setMetricValues((prev) => ({ ...prev, [m.key]: v }))}
                            placeholder={m.placeholder}
                            placeholderTextColor="#c0c9c4"
                            keyboardType="decimal-pad"
                            autoCorrect={false}
                            autoComplete="off"
                            importantForAutofill="no"
                            style={{
                              flex: 1, backgroundColor: '#fff', borderWidth: 1,
                              borderColor: hasValue ? lightColor + '60' : '#c9d4cf',
                              borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9,
                              color: '#0f172a', fontSize: 14,
                            }}
                          />

                          {/* Semáforo */}
                          <View style={{
                            width: 80, flexDirection: 'row', alignItems: 'center', gap: 5,
                          }}>
                            {hasValue && (
                              <>
                                <View style={{
                                  width: 10, height: 10, borderRadius: 5,
                                  backgroundColor: lightColor,
                                }} />
                                <Text style={{ color: lightColor, fontSize: 10, fontWeight: '700', flexShrink: 1 }}>
                                  {lightLabel}
                                </Text>
                              </>
                            )}
                          </View>
                        </View>

                        {/* Formatted value hint */}
                        {hasValue && m.key === 'revenuePerEmployee' && (
                          <Text style={{ color: '#94a3b8', fontSize: 10, marginTop: 3, marginLeft: 2 }}>
                            ≈ {fmtMetricValue(m.key, numVal)} por empregado
                          </Text>
                        )}
                      </View>
                    )
                  })}
                </View>

                {/* Verdict */}
                {verdict && (
                  <View style={{
                    borderWidth: 1.5, borderColor: verdict.color + '50',
                    borderRadius: 16, padding: 16,
                    backgroundColor: verdict.color + '10',
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                  }}>
                    <View style={{
                      width: 48, height: 48, borderRadius: 24,
                      backgroundColor: verdict.color + '20',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Text style={{ fontSize: 22 }}>
                        {verdict.score >= 0.7 && verdict.reds === 0 ? '🟢' : verdict.score >= 0.5 ? '🟡' : '🔴'}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: verdict.color, fontSize: 15, fontWeight: '800' }}>{verdict.label}</Text>
                      <Text style={{ color: '#475569', fontSize: 12, marginTop: 2 }}>{verdict.sub}</Text>
                      <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
                        <Text style={{ color: '#14b8a6', fontSize: 11, fontWeight: '600' }}>✓ {verdict.greens} positivos</Text>
                        {verdict.reds > 0 && (
                          <Text style={{ color: '#ef4444', fontSize: 11, fontWeight: '600' }}>✗ {verdict.reds} críticos</Text>
                        )}
                      </View>
                    </View>
                  </View>
                )}

              </ScrollView>
            ) : (
              /* ── Calculator Tab ── */
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* Inputs */}
                <View style={{
                  backgroundColor: '#f8faf9', borderWidth: 1, borderColor: '#c9d4cf',
                  borderRadius: 16, padding: 16, marginBottom: 12, gap: 12,
                }}>
                  <View>
                    <Text style={{ color: '#475569', fontSize: 11, fontWeight: '600', marginBottom: 5 }}>
                      Preço actual ({ticker})
                    </Text>
                    <TextInput
                      value={price}
                      onChangeText={setPrice}
                      keyboardType="decimal-pad"
                      placeholder="ex: 131.00"
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
                  <View>
                    <Text style={{ color: '#475569', fontSize: 11, fontWeight: '600', marginBottom: 5 }}>
                      Quanto quero investir (€)
                    </Text>
                    <TextInput
                      value={amount}
                      onChangeText={setAmount}
                      keyboardType="decimal-pad"
                      placeholder="ex: 500"
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
                </View>

                {/* Scenario selector */}
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  {SCENARIOS.map((s, i) => (
                    <TouchableOpacity
                      key={s.key}
                      onPress={() => setScenario(i as 0 | 1 | 2)}
                      style={{
                        flex: 1, borderRadius: 12, padding: 10, alignItems: 'center',
                        backgroundColor: scenario === i ? '#14b8a6' : '#f8faf9',
                        borderWidth: 1, borderColor: scenario === i ? '#14b8a6' : '#c9d4cf',
                      }}
                    >
                      <Ionicons name={s.icon} size={18} color={scenario === i ? '#fff' : '#64748b'} />
                      <Text style={{
                        color: scenario === i ? '#fff' : '#475569',
                        fontSize: 11, fontWeight: '600', marginTop: 4, textAlign: 'center',
                      }}>
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Scenario detail */}
                {validCalc && (
                  <View style={{
                    backgroundColor: '#f8faf9', borderWidth: 1, borderColor: '#c9d4cf',
                    borderRadius: 16, padding: 16, marginBottom: 16,
                  }}>
                    {scenario === 0 && (
                      <>
                        <Text style={{ color: '#0f172a', fontSize: 14, fontWeight: '700', marginBottom: 10 }}>
                          Compra Imediata
                        </Text>
                        <CalcRow label="Ações inteiras"    value={`${sharesImmediate} ${ticker}`} highlight />
                        <CalcRow label="Custo total"       value={fmtEur(costImmediate)} />
                        <CalcRow label="Sobra"             value={fmtEur(remainder)} />
                        <CalcRow label="Preço por ação"    value={fmtEur(priceNum)} />
                        <View style={{ marginTop: 8, backgroundColor: '#edf1ee', borderRadius: 8, padding: 8 }}>
                          <Text style={{ color: '#64748b', fontSize: 11 }}>
                            Compras imediatamente ao preço de mercado. Simples e direto.
                          </Text>
                        </View>
                      </>
                    )}
                    {scenario === 1 && (
                      <>
                        <Text style={{ color: '#0f172a', fontSize: 14, fontWeight: '700', marginBottom: 10 }}>
                          Compra Fracionada
                        </Text>
                        <CalcRow label="Ações (decimal)"   value={`${sharesFractional.toFixed(4)} ${ticker}`} highlight />
                        <CalcRow label="Custo total"       value={fmtEur(amountNum)} />
                        <CalcRow label="Valor por ação"    value={fmtEur(priceNum)} />
                        <View style={{ marginTop: 8, backgroundColor: '#6366f110', borderRadius: 8, padding: 8 }}>
                          <Text style={{ color: '#6366f1', fontSize: 11 }}>
                            Disponível em XTB, Trading212 e Interactive Brokers. Permite investir o valor exato sem sobras.
                          </Text>
                        </View>
                      </>
                    )}
                    {scenario === 2 && (
                      <>
                        <Text style={{ color: '#0f172a', fontSize: 14, fontWeight: '700', marginBottom: 10 }}>
                          DCA — 3 Meses
                        </Text>
                        <CalcRow label="Por mês"          value={fmtEur(dcaMonthly)} highlight />
                        <CalcRow label="Ações/mês"        value={`${dcaShares} ${ticker}`} />
                        <CalcRow label="Total ao fim de 3M" value={fmtEur(amountNum)} />
                        <View style={{ marginTop: 8, backgroundColor: '#10b98110', borderRadius: 8, padding: 8 }}>
                          <Text style={{ color: '#10b981', fontSize: 11 }}>
                            Reduz o risco de comprar no pico. Compras em 3 momentos diferentes levam ao preço médio do período.
                          </Text>
                        </View>
                      </>
                    )}
                  </View>
                )}

                {!validCalc && (
                  <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                    <Ionicons name="calculator-outline" size={36} color="#94a3b8" />
                    <Text style={{ color: '#64748b', fontSize: 13, marginTop: 8 }}>
                      Introduz o preço e o valor a investir
                    </Text>
                  </View>
                )}

                {/* Aviso de teto */}
                {(() => {
                  if (!validCalc) return null
                  const additionalPct = (amountNum / (portfolioData?.totalValue ?? 1)) * 100
                  const check = limitsQuery.checkLimit(ticker, additionalPct)
                  if (!check) return null
                  const color = check.wouldExceed ? '#ef4444' : '#f97316'
                  return (
                    <View style={{
                      flexDirection: 'row', alignItems: 'flex-start', gap: 8,
                      backgroundColor: color + '12', borderWidth: 1, borderColor: color + '40',
                      borderRadius: 12, padding: 12, marginBottom: 12,
                    }}>
                      <Ionicons name={check.wouldExceed ? 'alert-circle' : 'warning-outline'} size={18} color={color} style={{ marginTop: 1 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color, fontSize: 13, fontWeight: '700' }}>
                          {check.wouldExceed ? 'Teto excedido' : 'Próximo do teto'}
                        </Text>
                        <Text style={{ color: '#475569', fontSize: 11, marginTop: 2 }}>
                          {ticker} — Atual: {check.currentPct.toFixed(1)}% · Após compra: {check.afterPct.toFixed(1)}% · Limite: {check.maxPct}%
                          {check.wouldExceed ? ` · Excede em ${check.exceedBy.toFixed(1)}%` : ''}
                        </Text>
                      </View>
                    </View>
                  )
                })()}

                {/* Registar compra */}
                <TouchableOpacity
                  onPress={() => setShowLots(true)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                    gap: 8, backgroundColor: '#14b8a6', borderRadius: 14, paddingVertical: 14,
                  }}
                >
                  <Ionicons name="layers-outline" size={18} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Registar compra</Text>
                </TouchableOpacity>
                <Text style={{ color: '#94a3b8', fontSize: 11, textAlign: 'center', marginTop: 6 }}>
                  Regista o lote para controlo fiscal e rastreamento dos 365 dias
                </Text>
              </ScrollView>
            )}
          </KeyboardAvoidingView>

          {/* Info overlay */}
          {activeInfoMetric && (
            <MetricInfoCard m={activeInfoMetric} onClose={() => setActiveInfo(null)} />
          )}

        </SafeAreaView>
      </Modal>
    </>
  )
}

function CalcRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
      <Text style={{ color: '#64748b', fontSize: 13 }}>{label}</Text>
      <Text style={{ color: highlight ? '#14b8a6' : '#0f172a', fontSize: 13, fontWeight: highlight ? '800' : '600' }}>
        {value}
      </Text>
    </View>
  )
}
