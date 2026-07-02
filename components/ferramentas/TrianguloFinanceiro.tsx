import { useState, useMemo } from 'react'
import { View, Text, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { usePortfolio } from '../../hooks/usePortfolio'
import { calcularEstruturaTriangulo, type TrianguloResult } from '../../utils/trianguloMath'
import { fmt } from '../../utils/format'
import StepperInput from '../ui/StepperInput'

// ── VertexCard ─────────────────────────────────────────────────────────────

type VertexStatus = 'baixo' | 'ok' | 'alto' | 'crescimento'

function VertexCard({ icon, label, nome, atual, alvo, desvio, status }: {
  icon:   string
  label:  string
  nome:   string
  atual:  number
  alvo:   number | null
  desvio: number
  status: VertexStatus
}) {
  const mainColor   = status === 'baixo'      ? '#f59e0b'
    : status === 'crescimento' ? '#6366f1'
    :                             '#14b8a6'
  const bgColor     = status === 'baixo'      ? '#1c1400'
    : status === 'crescimento' ? '#1e1b4b'
    :                             '#042f2e'
  const borderColor = status === 'baixo'      ? '#f59e0b30'
    : status === 'crescimento' ? '#6366f130'
    :                             '#14b8a630'

  const fillFlex  = alvo !== null && alvo > 0 ? Math.min(atual / alvo, 1) : 1
  const emptyFlex = Math.max(1 - fillFlex, 0)

  return (
    <View style={{ backgroundColor: bgColor, borderRadius: 18, borderWidth: 1, borderColor, padding: 16, gap: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View>
          <Text style={{ fontSize: 20 }}>{icon}</Text>
          <Text style={{ color: '#64748b', fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 5 }}>
            {label}
          </Text>
          <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>{nome}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: mainColor, fontSize: 22, fontWeight: '800' }} numberOfLines={1} adjustsFontSizeToFit>
            {fmt(atual)}
          </Text>
          {alvo !== null && (
            <Text style={{ color: '#475569', fontSize: 11, marginTop: 3 }}>alvo: {fmt(alvo)}</Text>
          )}
        </View>
      </View>

      {/* Barra de progresso */}
      {alvo !== null && (
        <>
          <View style={{ height: 8, backgroundColor: '#0f172a', borderRadius: 4, flexDirection: 'row', overflow: 'hidden' }}>
            <View style={{ flex: fillFlex, backgroundColor: mainColor }} />
            {emptyFlex > 0 && <View style={{ flex: emptyFlex }} />}
          </View>
          <Text style={{ color: desvio >= 0 ? '#34d399' : '#fbbf24', fontSize: 11, fontWeight: '600' }}>
            {desvio >= 0
              ? `+${fmt(desvio)} excedente${status === 'alto' ? ' · considera redistribuir' : ''}`
              : `−${fmt(Math.abs(desvio))} em falta`}
          </Text>
        </>
      )}

      {/* Investimento — sem alvo */}
      {alvo === null && (
        <Text style={{ color: '#6366f1', fontSize: 11, fontWeight: '500' }}>
          Sem teto — maximizar progressivamente
        </Text>
      )}
    </View>
  )
}

// ── FlowArrow ──────────────────────────────────────────────────────────────

function FlowArrow({ active, label }: { active: boolean; label: string }) {
  const color = active ? '#f59e0b' : '#334155'
  return (
    <View style={{ alignItems: 'center', paddingVertical: 2, gap: 2 }}>
      <View style={{ width: 1.5, height: 14, backgroundColor: color }} />
      <Ionicons name="chevron-down" size={14} color={color} />
      {active && (
        <Text style={{ color, fontSize: 10, fontWeight: '700', letterSpacing: 0.3 }}>{label}</Text>
      )}
    </View>
  )
}

// ── ParamsCard ─────────────────────────────────────────────────────────────

function ParamsCard({ despesa, setDespesa, teto, setTeto, alvoEmergencia }: {
  despesa: number; setDespesa: (v: number) => void
  teto:    number; setTeto:    (v: number) => void
  alvoEmergencia: number
}) {
  return (
    <View style={{ backgroundColor: '#1e293b', borderRadius: 18, borderWidth: 1, borderColor: '#334155', padding: 16, gap: 12 }}>
      <Text style={{ color: '#475569', fontSize: 10, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase' }}>
        Parâmetros
      </Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <StepperInput label="Despesa mensal" value={despesa} step={100} min={200} max={10000} suffix="€" onChange={setDespesa} labelUppercase />
        <StepperInput label="Teto dia-a-dia"  value={teto}   step={100} min={200} max={20000} suffix="€" onChange={setTeto}    labelUppercase />
      </View>
      <View style={{ backgroundColor: '#0f172a', borderRadius: 10, padding: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: '#475569', fontSize: 12 }}>Alvo fundo de emergência</Text>
        <Text style={{ color: '#fbbf24', fontSize: 12, fontWeight: '700' }}>{fmt(alvoEmergencia)}</Text>
      </View>
    </View>
  )
}

// ── InstrucaoCard ──────────────────────────────────────────────────────────

function InstrucaoCard({ instrucoes, prioridade }: {
  instrucoes: string[]
  prioridade: 1 | 2 | 3
}) {
  const isOk      = prioridade === 3
  const mainColor = isOk ? '#14b8a6' : '#f59e0b'
  const bgColor   = isOk ? '#042f2e' : '#1c1400'
  const borderC   = isOk ? '#14b8a630' : '#f59e0b30'
  const icon: any = prioridade === 1 ? 'warning-outline'
    : prioridade === 2 ? 'shield-outline'
    :                    'checkmark-circle'

  const titulo = prioridade === 1 ? 'Ação Urgente — Reforçar Liquidez'
    : prioridade === 2              ? 'Ação — Blindar Emergência'
    :                                 'Triângulo Completo — Investir o Excedente'

  return (
    <View style={{ backgroundColor: bgColor, borderRadius: 20, borderWidth: 1, borderColor: borderC, padding: 20, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: mainColor + '20', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={icon} size={18} color={mainColor} />
        </View>
        <Text style={{ color: mainColor, fontSize: 14, fontWeight: '800', flex: 1, lineHeight: 20 }}>
          {titulo}
        </Text>
      </View>

      <View style={{ gap: 10 }}>
        {instrucoes.map((inst, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
            <Text style={{ color: mainColor, fontSize: 14, lineHeight: 20 }}>→</Text>
            <Text style={{ color: '#94a3b8', fontSize: 13, lineHeight: 21, flex: 1 }}>{inst}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

// ── Componente principal ───────────────────────────────────────────────────

export default function TrianguloFinanceiro() {
  const { data, isLoading } = usePortfolio()

  const [despesa, setDespesa] = useState(1200)
  const [teto,    setTeto]    = useState(1500)

  const bankAccounts = (data?.physicalAssets ?? []).filter((a) => a.type === 'BANK_ACCOUNT')
  const liquidez     = bankAccounts.reduce((s, a) => s + a.value, 0)
  const liquidezNome = bankAccounts.length > 0
    ? bankAccounts.map((a) => a.name).join(' + ')
    : 'Conta Bancária'
  const emergencia   = data?.emergencyFund?.current_amount ?? 0
  const investimento = data?.totalValue ?? 0

  const resultado = useMemo(
    () => calcularEstruturaTriangulo({ liquidez, emergencia, investimento, despesaMensal: despesa, tetoDiaADia: teto }),
    [liquidez, emergencia, investimento, despesa, teto],
  )

  if (isLoading) {
    return <ActivityIndicator color="#14b8a6" style={{ paddingVertical: 30 }} />
  }

  return (
    <View style={{ gap: 4 }}>

      {/* ── Vértice 1 — Liquidez ────────────────────────────────────── */}
      <VertexCard
        icon="💳" label="Liquidez · Dia-a-Dia" nome={liquidezNome}
        atual={liquidez} alvo={teto} desvio={resultado.desvioLiquidez}
        status={resultado.saudeLiquidez}
      />

      {/* ── Seta 1→2 ────────────────────────────────────────────────── */}
      <FlowArrow active={resultado.prioridade === 2} label="transferir excedente" />

      {/* ── Vértice 2 — Emergência ───────────────────────────────────── */}
      <VertexCard
        icon="🛡️" label="Emergência · 6 Meses" nome="Fundo de Emergência"
        atual={emergencia} alvo={resultado.alvoEmergencia} desvio={resultado.desvioEmergencia}
        status={resultado.saudeEmergencia === 'ok' ? 'ok' : 'baixo'}
      />

      {/* ── Seta 2→3 ────────────────────────────────────────────────── */}
      <FlowArrow active={resultado.prioridade === 3} label="alocar excedente" />

      {/* ── Vértice 3 — Investimento ─────────────────────────────────── */}
      <VertexCard
        icon="📈" label="Investimento" nome="Portfólio"
        atual={investimento} alvo={null} desvio={0}
        status="crescimento"
      />

      {/* ── Params ──────────────────────────────────────────────────── */}
      <View style={{ height: 14 }} />
      <ParamsCard
        despesa={despesa} setDespesa={setDespesa}
        teto={teto} setTeto={setTeto}
        alvoEmergencia={resultado.alvoEmergencia}
      />

      {/* ── Instrução ───────────────────────────────────────────────── */}
      <View style={{ height: 4 }} />
      <InstrucaoCard instrucoes={resultado.instrucoes} prioridade={resultado.prioridade} />

      <Text style={{ color: '#334155', fontSize: 10, textAlign: 'center', paddingTop: 10, lineHeight: 15 }}>
        * Saldos lidos do teu perfil. Ajusta os parâmetros conforme a tua situação real.
      </Text>

    </View>
  )
}
