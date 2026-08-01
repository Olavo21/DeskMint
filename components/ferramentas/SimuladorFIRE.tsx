import { useState, useMemo } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native'
import Svg, { Path, Defs, LinearGradient, Stop, Line, Circle } from 'react-native-svg'
import { useDashboard } from '../../hooks/useDashboard'
import { useDashboardStore } from '../../stores/dashboardStore'
import { useFmt } from '../../utils/format'

// ── Stepper ────────────────────────────────────────────────────────────────
function StepperInput({
  label, value, step, min, max, suffix, decimals = 0, onChange,
}: {
  label: string; value: number; step: number; min: number; max: number
  suffix: string; decimals?: number; onChange: (v: number) => void
}) {
  const dec = () => onChange(parseFloat(Math.max(min, value - step).toFixed(decimals)))
  const inc = () => onChange(parseFloat(Math.min(max, value + step).toFixed(decimals)))
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: '#64748b', fontSize: 11, marginBottom: 6 }}>{label}</Text>
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#0f172a', borderRadius: 12, borderWidth: 1, borderColor: '#334155',
        overflow: 'hidden',
      }}>
        <TouchableOpacity
          onPress={dec}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 0 }}
          style={{ width: 40, height: 46, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: '#1e293b' }}
        >
          <Text style={{ color: '#94a3b8', fontSize: 22, lineHeight: 24 }}>−</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center', paddingVertical: 12 }}>
          <Text style={{ color: '#2dd4bf', fontSize: 14, fontWeight: '700' }}>
            {value.toFixed(decimals)}{suffix}
          </Text>
        </View>
        <TouchableOpacity
          onPress={inc}
          hitSlop={{ top: 8, bottom: 8, left: 0, right: 8 }}
          style={{ width: 40, height: 46, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: '#1e293b' }}
        >
          <Text style={{ color: '#2dd4bf', fontSize: 22, lineHeight: 24 }}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ── Chart ──────────────────────────────────────────────────────────────────
function FireChart({
  pontos, fireNumber, crossYear,
}: {
  pontos: { ano: number; valor: number }[]
  fireNumber: number
  crossYear: number | null
}) {
  const W = 320; const H = 180
  const PAD = { t: 16, b: 28, l: 8, r: 12 }
  const IW = W - PAD.l - PAD.r
  const IH = H - PAD.t - PAD.b

  if (pontos.length < 2) return null

  const maxYear = pontos[pontos.length - 1].ano
  const maxVal = Math.max(...pontos.map((p) => p.valor), fireNumber) * 1.08
  const minVal = Math.min(...pontos.map((p) => p.valor), 0)

  const toX = (year: number) => PAD.l + (maxYear > 0 ? year / maxYear : 0) * IW
  const toY = (val: number) => PAD.t + (1 - (val - minVal) / (maxVal - minVal || 1)) * IH

  const portLine = pontos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.ano)} ${toY(p.valor)}`).join(' ')
  const portFill = `${portLine} L ${toX(maxYear)} ${H - PAD.b} L ${toX(0)} ${H - PAD.b} Z`
  const fireY = toY(fireNumber)

  const labelIdxs = [0, Math.floor((pontos.length - 1) / 2), pontos.length - 1]
  const uniqueLabels = [...new Set(labelIdxs)]

  const crossX = crossYear !== null ? toX(crossYear) : null

  return (
    <View>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          <LinearGradient id="gfire" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#14b8a6" stopOpacity="0.28" />
            <Stop offset="1" stopColor="#14b8a6" stopOpacity="0.02" />
          </LinearGradient>
        </Defs>

        {/* Portfolio area fill */}
        <Path d={portFill} fill="url(#gfire)" />
        {/* Portfolio line */}
        <Path d={portLine} fill="none" stroke="#14b8a6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* FIRE target dashed line */}
        <Line
          x1={PAD.l} y1={fireY} x2={W - PAD.r} y2={fireY}
          stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="7 5" strokeLinecap="round"
        />

        {/* Intersection point */}
        {crossX !== null && fireY >= PAD.t && fireY <= H - PAD.b && (
          <>
            <Circle cx={crossX} cy={fireY} r={8} fill="#f59e0b" opacity={0.2} />
            <Circle cx={crossX} cy={fireY} r={4.5} fill="#f59e0b" />
          </>
        )}
      </Svg>

      {/* X axis labels */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: PAD.l, marginTop: -4 }}>
        {uniqueLabels.map((i) => (
          <Text key={i} style={{ color: '#475569', fontSize: 9 }}>Ano {pontos[i].ano}</Text>
        ))}
      </View>

      {/* Legend */}
      <View style={{ flexDirection: 'row', gap: 16, justifyContent: 'center', marginTop: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 12, height: 2.5, backgroundColor: '#14b8a6', borderRadius: 2 }} />
          <Text style={{ color: '#64748b', fontSize: 10 }}>Portfólio</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 12, height: 2, backgroundColor: '#f59e0b', borderRadius: 2 }} />
          <Text style={{ color: '#64748b', fontSize: 10 }}>Número FIRE</Text>
        </View>
      </View>
    </View>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function SimuladorFIRE() {
  const fmt = useFmt()
  const { selectedMonth, selectedYear } = useDashboardStore()
  const { data, isLoading } = useDashboard(selectedMonth, selectedYear)

  const [aporte, setAporte]       = useState(200)
  const [taxa, setTaxa]           = useState(7.0)
  const [custoVida, setCustoVida] = useState(1500)

  const portfolioAtual = data?.portfolioValue ?? 0
  const netWorth       = data?.netWorth ?? 0

  const { pontos, anosParaFire, fireNumber, retiradaMensal, atingido } = useMemo(() => {
    const fire = custoVida * 12 * 25
    const r    = taxa / 100
    const pts: { ano: number; valor: number }[] = [{ ano: 0, valor: portfolioAtual }]
    let V    = portfolioAtual
    let anos = -1

    for (let mes = 1; mes <= 50 * 12; mes++) {
      V = V * (1 + r / 12) + aporte
      if (mes % 12 === 0) {
        const ano = mes / 12
        pts.push({ ano, valor: Math.round(V) })
        if (anos === -1 && V >= fire) anos = ano
      }
    }

    const displayPts = anos > 0 ? pts.slice(0, Math.min(anos + 3, pts.length)) : pts

    return {
      pontos:         displayPts,
      anosParaFire:   anos,
      fireNumber:     fire,
      retiradaMensal: (fire * 0.04) / 12,
      atingido:       portfolioAtual >= fire && fire > 0,
    }
  }, [aporte, taxa, custoVida, portfolioAtual])

  if (isLoading) {
    return (
      <View style={{ paddingVertical: 40, alignItems: 'center' }}>
        <ActivityIndicator color="#14b8a6" />
      </View>
    )
  }

  return (
    <View style={{ gap: 14 }}>

      {/* ── Estado actual ───────────────────────────────────── */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{
          flex: 1, backgroundColor: '#042f2e', borderRadius: 16,
          borderWidth: 1, borderColor: '#14b8a630', padding: 14,
        }}>
          <Text style={{ color: '#64748b', fontSize: 11, marginBottom: 4 }}>Portfólio atual</Text>
          <Text style={{ color: '#2dd4bf', fontSize: 17, fontWeight: '700' }} numberOfLines={1} adjustsFontSizeToFit>
            {fmt(portfolioAtual)}
          </Text>
        </View>
        <View style={{
          flex: 1, backgroundColor: '#1e293b', borderRadius: 16,
          borderWidth: 1, borderColor: '#334155', padding: 14,
        }}>
          <Text style={{ color: '#64748b', fontSize: 11, marginBottom: 4 }}>Património líquido</Text>
          <Text style={{ color: '#94a3b8', fontSize: 17, fontWeight: '700' }} numberOfLines={1} adjustsFontSizeToFit>
            {fmt(netWorth)}
          </Text>
        </View>
      </View>

      {/* ── Parâmetros ─────────────────────────────────────── */}
      <View style={{
        backgroundColor: '#1e293b', borderRadius: 20,
        borderWidth: 1, borderColor: '#334155', padding: 16, gap: 14,
      }}>
        <Text style={{ color: '#475569', fontSize: 11, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' }}>
          Parâmetros da simulação
        </Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <StepperInput
            label="Aporte mensal"
            value={aporte} step={50} min={0} max={10000} suffix="€"
            onChange={setAporte}
          />
          <StepperInput
            label="Taxa anual"
            value={taxa} step={0.5} min={0} max={20} suffix="%" decimals={1}
            onChange={setTaxa}
          />
        </View>
        <StepperInput
          label="Custo de vida mensal desejado na reforma"
          value={custoVida} step={100} min={200} max={10000} suffix="€"
          onChange={setCustoVida}
        />
      </View>

      {/* ── Resultado FIRE ─────────────────────────────────── */}
      {atingido ? (
        <View style={{
          backgroundColor: '#052e16', borderRadius: 20, borderWidth: 1.5,
          borderColor: '#14b8a6', padding: 20, alignItems: 'center',
        }}>
          <Text style={{ fontSize: 36 }}>🎯</Text>
          <Text style={{ color: '#2dd4bf', fontSize: 22, fontWeight: '900', marginTop: 10, textAlign: 'center', lineHeight: 28 }}>
            Já atingiste a{'\n'}Independência Financeira!
          </Text>
          <Text style={{ color: '#5eead4', fontSize: 13, marginTop: 8, textAlign: 'center' }}>
            Podes retirar {fmt(retiradaMensal)}/mês com a regra dos 4%.
          </Text>
        </View>
      ) : anosParaFire > 0 ? (
        <View style={{
          backgroundColor: '#0c1a29', borderRadius: 20, borderWidth: 1,
          borderColor: '#14b8a630', padding: 20,
        }}>
          <Text style={{ color: '#475569', fontSize: 10, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>
            Independência financeira
          </Text>
          <Text style={{ color: '#2dd4bf', fontSize: 48, fontWeight: '900', lineHeight: 52 }}>
            {anosParaFire}
            <Text style={{ color: '#5eead4', fontSize: 22, fontWeight: '700' }}> anos</Text>
          </Text>
          <Text style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>
            para atingires o teu Número FIRE
          </Text>
          <View style={{ marginTop: 14, backgroundColor: '#1e293b', borderRadius: 12, padding: 12, gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: '#64748b', fontSize: 12 }}>Número FIRE</Text>
              <Text style={{ color: '#f59e0b', fontSize: 13, fontWeight: '700' }}>{fmt(fireNumber)}</Text>
            </View>
            <View style={{ height: 1, backgroundColor: '#334155' }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: '#64748b', fontSize: 12 }}>Retirada mensal segura</Text>
              <Text style={{ color: '#2dd4bf', fontSize: 13, fontWeight: '700' }}>{fmt(retiradaMensal)}</Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={{
          backgroundColor: '#1e293b', borderRadius: 20, borderWidth: 1,
          borderColor: '#7f1d1d40', padding: 20, alignItems: 'center',
        }}>
          <Text style={{ color: '#f87171', fontSize: 14, fontWeight: '600', textAlign: 'center' }}>
            Com estes parâmetros, o FIRE não é atingido em 50 anos.
          </Text>
          <Text style={{ color: '#64748b', fontSize: 12, marginTop: 6, textAlign: 'center' }}>
            Aumenta o aporte mensal ou a taxa de rentabilidade.
          </Text>
        </View>
      )}

      {/* ── Gráfico ────────────────────────────────────────── */}
      <View style={{
        backgroundColor: '#1e293b', borderRadius: 20,
        borderWidth: 1, borderColor: '#334155', padding: 16,
      }}>
        <Text style={{ color: '#475569', fontSize: 10, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>
          Curva de crescimento
        </Text>
        <FireChart
          pontos={pontos}
          fireNumber={fireNumber}
          crossYear={anosParaFire > 0 ? anosParaFire : null}
        />
      </View>

      <Text style={{ color: '#334155', fontSize: 10, textAlign: 'center', paddingHorizontal: 8, lineHeight: 15 }}>
        Simulação educativa baseada na Regra dos 4%. Não constitui aconselhamento financeiro.
      </Text>

    </View>
  )
}
