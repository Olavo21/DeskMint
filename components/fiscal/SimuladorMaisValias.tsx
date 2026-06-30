import { useState, useMemo } from 'react'
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { usePortfolio } from '../../hooks/usePortfolio'
import CrossDateTimePicker from '../ui/CrossDateTimePicker'

// ── Tipos ──────────────────────────────────────────────────────────────────

type Regime = 'isento_cripto_365' | 'taxa_28' | 'menos_valia'

interface CalcResult {
  diasDetidos:      number
  regime:           Regime
  maisValiasBrutas: number
  taxa:             number
  impostoEstimado:  number
  ganhoLiquido:     number
  precoVendaTotal:  number
  custoBaseTotal:   number
}

type PortfolioPos = {
  id: string; ticker: string; name: string; asset_type: string
  units: number; avg_price: number; current_value: number
  pl: number; plPct: number
}

// ── Utilitários ────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  v.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })

function calcularImpostoMaisValias(
  assetType: string,
  unitsToSell: number,
  avgPrice: number,
  currentPricePerUnit: number,
  acquisitionDate: Date,
): CalcResult {
  const diasDetidos = Math.floor(
    (Date.now() - acquisitionDate.getTime()) / (1000 * 60 * 60 * 24),
  )

  const isCrypto = assetType === 'CRYPTO'
  const isIsento = isCrypto && diasDetidos >= 365

  const precoVendaTotal  = currentPricePerUnit * unitsToSell
  const custoBaseTotal   = avgPrice * unitsToSell
  const maisValiasBrutas = precoVendaTotal - custoBaseTotal

  const regime: Regime =
    maisValiasBrutas <= 0  ? 'menos_valia'
    : isIsento             ? 'isento_cripto_365'
    :                        'taxa_28'

  const impostoEstimado = regime === 'taxa_28' ? maisValiasBrutas * 0.28 : 0
  const ganhoLiquido    = maisValiasBrutas - impostoEstimado

  return {
    diasDetidos, regime, maisValiasBrutas,
    taxa:            regime === 'taxa_28' ? 0.28 : 0,
    impostoEstimado, ganhoLiquido,
    precoVendaTotal, custoBaseTotal,
  }
}

// ── PositionCard ───────────────────────────────────────────────────────────

function PositionCard({ position, selected, onPress }: {
  position: PortfolioPos; selected: boolean; onPress: () => void
}) {
  const pos = position.pl >= 0
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        width: 118, marginRight: 10,
        backgroundColor: selected ? '#042f2e' : '#1e293b',
        borderRadius: 16, borderWidth: selected ? 1.5 : 1,
        borderColor: selected ? '#14b8a6' : '#334155',
        padding: 12,
      }}
    >
      <Text style={{ color: '#64748b', fontSize: 9, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 }}>
        {position.asset_type}
      </Text>
      <Text style={{ color: '#e2e8f0', fontSize: 14, fontWeight: '700', marginTop: 4 }} numberOfLines={1}>
        {position.ticker}
      </Text>
      <Text style={{ color: '#475569', fontSize: 10, marginTop: 2 }} numberOfLines={1}>
        {position.name}
      </Text>
      <Text style={{ color: pos ? '#34d399' : '#f87171', fontSize: 12, fontWeight: '600', marginTop: 10 }}>
        {pos ? '+' : ''}{(position.plPct * 100).toFixed(1)}%
      </Text>
      <Text style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>
        {position.units.toLocaleString('pt-PT', { maximumFractionDigits: 3 })} un.
      </Text>
    </TouchableOpacity>
  )
}

// ── ResultRow ──────────────────────────────────────────────────────────────

function ResultRow({ label, value, color, bold }: {
  label: string; value: string; color: string; bold?: boolean
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 }}>
      <Text style={{ color: '#64748b', fontSize: 12 }}>{label}</Text>
      <Text style={{ color, fontSize: bold ? 14 : 12, fontWeight: bold ? '700' : '500' }}>{value}</Text>
    </View>
  )
}

// ── ResultCard ─────────────────────────────────────────────────────────────

function ResultCard({ result }: { result: CalcResult }) {
  const isIsento    = result.regime === 'isento_cripto_365'
  const isMenosValia = result.regime === 'menos_valia'

  const regimeBorderColor = isIsento ? '#14b8a630' : isMenosValia ? '#64748b40' : '#f59e0b30'
  const regimeTextColor   = isIsento ? '#34d399'   : isMenosValia ? '#94a3b8'   : '#fbbf24'
  const regimeIcon: any   = isIsento ? 'checkmark-circle' : isMenosValia ? 'trending-down-outline' : 'receipt-outline'

  return (
    <View style={{
      backgroundColor: '#0f172a', borderRadius: 20,
      borderWidth: 1, borderColor: regimeBorderColor, padding: 20,
    }}>
      {/* Regime badge */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Ionicons name={regimeIcon} size={15} color={regimeTextColor} />
        <Text style={{ color: regimeTextColor, fontSize: 11, fontWeight: '700', flex: 1, lineHeight: 16 }}>
          {isIsento
            ? `Isento · Cripto detida ${result.diasDetidos} dias (regra ≥ 365 dias PT)`
            : isMenosValia
              ? `Menos-valia · ${Math.abs(result.diasDetidos)} dias detidos`
              : `Taxa Autónoma 28% · ${result.diasDetidos} dias detidos`}
        </Text>
      </View>

      {/* Breakdown */}
      <ResultRow label="Preço de venda estimado" value={fmt(result.precoVendaTotal)} color="#94a3b8" />
      <ResultRow label="Custo de aquisição"      value={`− ${fmt(result.custoBaseTotal)}`} color="#64748b" />

      <View style={{ height: 1, backgroundColor: '#1e293b', marginVertical: 10 }} />

      <ResultRow
        label="Mais-valia bruta"
        value={fmt(result.maisValiasBrutas)}
        color={result.maisValiasBrutas >= 0 ? '#34d399' : '#f87171'}
        bold
      />
      <ResultRow
        label={isIsento ? 'Imposto estimado (isento)' : `Imposto estimado (${(result.taxa * 100).toFixed(0)}%)`}
        value={isIsento ? '0,00 €' : `− ${fmt(result.impostoEstimado)}`}
        color={isIsento || isMenosValia ? '#34d399' : '#f87171'}
      />

      <View style={{ height: 1, backgroundColor: '#1e293b', marginVertical: 10 }} />

      {/* Ganho líquido — destaque */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: '#64748b', fontSize: 13 }}>Ganho líquido</Text>
        <Text style={{
          fontSize: 22, fontWeight: '900',
          color: result.ganhoLiquido >= 0 ? '#2dd4bf' : '#f87171',
        }}>
          {fmt(result.ganhoLiquido)}
        </Text>
      </View>

      {/* Nota englobamento (só para taxa_28) */}
      {result.regime === 'taxa_28' && (
        <View style={{ marginTop: 14, backgroundColor: '#1e293b', borderRadius: 12, padding: 12, flexDirection: 'row', gap: 8 }}>
          <Ionicons name="information-circle-outline" size={14} color="#475569" style={{ marginTop: 1 }} />
          <Text style={{ color: '#64748b', fontSize: 11, lineHeight: 17, flex: 1 }}>
            <Text style={{ fontWeight: '700', color: '#94a3b8' }}>Englobamento:</Text>
            {' '}se a tua taxa marginal de IRS for inferior a 28%, somar estas mais-valias ao rendimento colectável pode ser mais vantajoso. Consulta sempre um fiscalista.
          </Text>
        </View>
      )}

      {/* Nota menos-valia */}
      {isMenosValia && (
        <View style={{ marginTop: 14, backgroundColor: '#1e293b', borderRadius: 12, padding: 12, flexDirection: 'row', gap: 8 }}>
          <Ionicons name="information-circle-outline" size={14} color="#475569" style={{ marginTop: 1 }} />
          <Text style={{ color: '#64748b', fontSize: 11, lineHeight: 17, flex: 1 }}>
            <Text style={{ fontWeight: '700', color: '#94a3b8' }}>Menos-valia:</Text>
            {' '}declara no Anexo G mesmo com prejuízo — podes compensar com lucros do mesmo ano ou nos próximos 5 anos fiscais.
          </Text>
        </View>
      )}
    </View>
  )
}

// ── Componente principal ───────────────────────────────────────────────────

export default function SimuladorMaisValias() {
  const { data, isLoading } = usePortfolio()
  const positions: PortfolioPos[] = (data?.assets ?? []) as PortfolioPos[]

  const [selectedId,      setSelectedId]      = useState<string | null>(null)
  const [unitsToSell,     setUnitsToSell]     = useState(0)
  const [acquisitionDate, setAcquisitionDate] = useState(new Date('2024-01-01'))
  const [showDatePicker,  setShowDatePicker]  = useState(false)

  const pos          = positions.find((p) => p.id === selectedId) ?? null
  const pricePerUnit = pos && pos.units > 0 ? pos.current_value / pos.units : 0
  const isCrypto     = pos?.asset_type === 'CRYPTO'
  const step         = isCrypto ? 0.001 : 1
  const decimals     = isCrypto ? 3 : 2

  const result = useMemo(
    () => pos && unitsToSell > 0
      ? calcularImpostoMaisValias(pos.asset_type, unitsToSell, pos.avg_price, pricePerUnit, acquisitionDate)
      : null,
    [pos, unitsToSell, pricePerUnit, acquisitionDate],
  )

  function selectPosition(p: PortfolioPos) {
    setSelectedId(p.id)
    setUnitsToSell(parseFloat(p.units.toFixed(p.asset_type === 'CRYPTO' ? 3 : 2)))
  }

  function decrement() {
    setUnitsToSell((v) => parseFloat(Math.max(step, parseFloat((v - step).toFixed(3))).toFixed(3)))
  }
  function increment() {
    if (!pos) return
    setUnitsToSell((v) => parseFloat(Math.min(pos.units, parseFloat((v + step).toFixed(3))).toFixed(3)))
  }

  return (
    <View style={{ gap: 14 }}>

      {/* ── PositionPicker ──────────────────────────────────────────────── */}
      {isLoading ? (
        <ActivityIndicator color="#14b8a6" style={{ paddingVertical: 20 }} />
      ) : positions.length === 0 ? (
        <Text style={{ color: '#475569', fontSize: 13, textAlign: 'center', paddingVertical: 20, lineHeight: 20 }}>
          Sem posições no portfólio.{'\n'}Adiciona ativos no separador Investimentos.
        </Text>
      ) : (
        <>
          <Text style={{ color: '#64748b', fontSize: 11, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' }}>
            Seleciona o ativo
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 4 }}
          >
            {positions.map((p) => (
              <PositionCard key={p.id} position={p} selected={p.id === selectedId} onPress={() => selectPosition(p)} />
            ))}
          </ScrollView>
        </>
      )}

      {/* ── Stepper + DatePicker (apenas com posição selecionada) ────────── */}
      {pos && (
        <>
          {/* Stepper de unidades */}
          <View style={{
            backgroundColor: '#1e293b', borderRadius: 16,
            borderWidth: 1, borderColor: '#334155', padding: 14, gap: 10,
          }}>
            <Text style={{ color: '#64748b', fontSize: 11, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' }}>
              Unidades a vender
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <TouchableOpacity
                onPress={decrement}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
                style={{
                  width: 42, height: 42, backgroundColor: '#0f172a', borderRadius: 10,
                  alignItems: 'center', justifyContent: 'center',
                  borderWidth: 1, borderColor: '#334155',
                }}
              >
                <Text style={{ color: '#94a3b8', fontSize: 22, lineHeight: 24 }}>−</Text>
              </TouchableOpacity>

              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ color: '#2dd4bf', fontSize: 20, fontWeight: '700' }}>
                  {unitsToSell.toFixed(decimals)}
                </Text>
                <Text style={{ color: '#475569', fontSize: 10, marginTop: 2 }}>
                  de {pos.units.toFixed(decimals)} {pos.ticker}
                </Text>
              </View>

              <TouchableOpacity
                onPress={increment}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                style={{
                  width: 42, height: 42, backgroundColor: '#0f172a', borderRadius: 10,
                  alignItems: 'center', justifyContent: 'center',
                  borderWidth: 1, borderColor: '#334155',
                }}
              >
                <Text style={{ color: '#2dd4bf', fontSize: 22, lineHeight: 24 }}>+</Text>
              </TouchableOpacity>
            </View>
            {pricePerUnit > 0 && (
              <Text style={{ color: '#475569', fontSize: 11, textAlign: 'center' }}>
                Venda estimada: {fmt(pricePerUnit * unitsToSell)}
              </Text>
            )}
          </View>

          {/* Data de compra */}
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            style={{
              backgroundColor: '#1e293b', borderRadius: 16,
              borderWidth: 1, borderColor: '#334155', padding: 14,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            }}
          >
            <View>
              <Text style={{ color: '#64748b', fontSize: 11, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>
                Data de compra
              </Text>
              <Text style={{ color: '#e2e8f0', fontSize: 16, fontWeight: '600' }}>
                {acquisitionDate.toLocaleDateString('pt-PT')}
              </Text>
              {isCrypto && result && (
                <Text style={{
                  fontSize: 11, marginTop: 4, fontWeight: '600',
                  color: result.regime === 'isento_cripto_365' ? '#34d399' : '#fbbf24',
                }}>
                  {result.diasDetidos} dias detidos
                  {result.regime === 'isento_cripto_365' ? ' · Isento ✓' : ' · Tributável'}
                </Text>
              )}
            </View>
            <Ionicons name="calendar-outline" size={20} color="#475569" />
          </TouchableOpacity>

          {showDatePicker && (
            <CrossDateTimePicker
              value={acquisitionDate}
              mode="date"
              maximumDate={new Date()}
              onChange={(_, date) => {
                setShowDatePicker(false)
                if (date) setAcquisitionDate(date)
              }}
            />
          )}
        </>
      )}

      {/* ── ResultCard ──────────────────────────────────────────────────── */}
      {result && <ResultCard result={result} />}

      {!pos && positions.length > 0 && (
        <Text style={{ color: '#334155', fontSize: 11, textAlign: 'center' }}>
          ↑ Seleciona um ativo para iniciar a simulação
        </Text>
      )}

    </View>
  )
}
