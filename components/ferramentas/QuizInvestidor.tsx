import { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import DonutChart from '../investments/DonutChart'

const PERGUNTAS = [
  {
    pergunta: 'Qual é o teu horizonte de investimento?',
    opcoes: [
      { texto: 'Menos de 2 anos — preciso do dinheiro em breve', pts: 1 },
      { texto: '2 a 5 anos — objectivo a médio prazo', pts: 2 },
      { texto: '5 a 10 anos — tenho paciência', pts: 3 },
      { texto: 'Mais de 10 anos — invisto para a reforma', pts: 4 },
    ],
  },
  {
    pergunta: 'Se o teu portfólio caísse 30% num único mês, o que farias?',
    opcoes: [
      { texto: 'Venderia tudo — não aguento ver perdas', pts: 0 },
      { texto: 'Venderia parte para limitar o dano', pts: 1 },
      { texto: 'Manteria a posição e esperaria', pts: 3 },
      { texto: 'Compraria mais — é uma oportunidade', pts: 4 },
    ],
  },
  {
    pergunta: 'Qual é o teu objectivo principal?',
    opcoes: [
      { texto: 'Preservar o capital — priorizo segurança', pts: 1 },
      { texto: 'Crescimento moderado com baixo risco', pts: 2 },
      { texto: 'Crescimento acelerado aceitando volatilidade', pts: 3 },
      { texto: 'Maximizar retorno a longo prazo', pts: 4 },
    ],
  },
  {
    pergunta: 'Qual a tua experiência com investimentos?',
    opcoes: [
      { texto: 'Nenhuma — começo do zero', pts: 1 },
      { texto: 'Básica — já ouvi falar de ETFs e fundos', pts: 2 },
      { texto: 'Intermédia — tenho carteira diversificada', pts: 3 },
      { texto: 'Avançada — opero com confiança e estratégia', pts: 4 },
    ],
  },
  {
    pergunta: 'Que % do capital estás disposto a colocar em risco?',
    opcoes: [
      { texto: 'Menos de 10% — invisto uma pequena parte', pts: 1 },
      { texto: '10% a 30% — equilibrado', pts: 2 },
      { texto: '30% a 60% — estou confortável', pts: 3 },
      { texto: 'Mais de 60% — confio na minha estratégia', pts: 4 },
    ],
  },
]

const PERFIS = [
  {
    nome: 'Conservador',
    desc: 'Prioriza a preservação do capital. Aceita menor rentabilidade em troca de estabilidade e baixa volatilidade.',
    cor: '#d2b48c',
    alocacao: [
      { nome: 'AGGH (Obrigações globais)', pct: 60, color: '#d2b48c' },
      { nome: 'IWDA (Acções globais)',      pct: 25, color: '#8b4513' },
      { nome: 'Liquidez / Depósito',        pct: 15, color: '#a1887f' },
    ],
  },
  {
    nome: 'Moderado',
    desc: 'Equilíbrio entre crescimento e segurança. Tolera alguma volatilidade com perspectiva de retorno estável.',
    cor: '#f59e0b',
    alocacao: [
      { nome: 'IWDA (Acções globais)', pct: 50, color: '#f59e0b' },
      { nome: 'AGGH (Obrigações)',     pct: 30, color: '#d2b48c' },
      { nome: 'EIMI (Emergentes)',     pct: 20, color: '#6366f1' },
    ],
  },
  {
    nome: 'Equilibrado',
    desc: 'Foco no crescimento a longo prazo com diversificação sólida. Confortável com oscilações de mercado.',
    cor: '#14b8a6',
    alocacao: [
      { nome: 'IWDA (Acções globais)', pct: 70, color: '#14b8a6' },
      { nome: 'EIMI (Emergentes)',     pct: 20, color: '#f59e0b' },
      { nome: 'AGGH (Obrigações)',     pct: 10, color: '#d2b48c' },
    ],
  },
  {
    nome: 'Dinâmico',
    desc: 'Maximiza o retorno a longo prazo com alta exposição a acções. Aceita forte volatilidade com convicção.',
    cor: '#6366f1',
    alocacao: [
      { nome: 'IWDA (Acções globais)', pct: 80, color: '#14b8a6' },
      { nome: 'EIMI (Emergentes)',     pct: 20, color: '#6366f1' },
    ],
  },
]

export default function QuizInvestidor() {
  const [respostas, setRespostas] = useState<number[]>([])
  const [atual, setAtual]         = useState(0)
  const [finalizado, setFinalizado] = useState(false)

  const total = respostas.reduce((s, v) => s + v, 0)
  const perfil =
    total <= 8  ? PERFIS[0] :
    total <= 12 ? PERFIS[1] :
    total <= 16 ? PERFIS[2] :
    PERFIS[3]

  function responder(pts: number) {
    const novas = [...respostas, pts]
    setRespostas(novas)
    if (atual + 1 >= PERGUNTAS.length) setFinalizado(true)
    else setAtual(atual + 1)
  }

  function reiniciar() {
    setRespostas([])
    setAtual(0)
    setFinalizado(false)
  }

  if (finalizado) {
    const segments = perfil.alocacao.map((a) => ({ value: a.pct, color: a.color, label: a.nome }))
    return (
      <View className="gap-4">
        {/* Badge */}
        <View className="bg-slate-800 border border-slate-700 rounded-2xl p-5 items-center">
          <View className="w-14 h-14 rounded-2xl items-center justify-center mb-3"
            style={{ backgroundColor: perfil.cor + '20', borderColor: perfil.cor + '40', borderWidth: 1 }}>
            <Ionicons name="shield-checkmark-outline" size={26} color={perfil.cor} />
          </View>
          <Text className="text-slate-400 text-xs uppercase tracking-widest mb-1">O teu perfil de investidor</Text>
          <Text className="text-3xl font-black mb-2" style={{ color: perfil.cor }}>{perfil.nome}</Text>
          <Text className="text-slate-400 text-sm text-center leading-5">{perfil.desc}</Text>
          <View className="mt-3 px-4 py-1.5 rounded-full bg-slate-700">
            <Text className="text-slate-400 text-xs">Pontuação: {total} / 20</Text>
          </View>
        </View>

        {/* Donut */}
        <View className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
          <Text className="text-slate-400 text-xs uppercase tracking-widest mb-3">Alocação sugerida</Text>
          <DonutChart segments={segments} size={200} centerSub="alocação" />
          <View className="mt-4 gap-2">
            {perfil.alocacao.map((a) => (
              <View key={a.nome} className="gap-1">
                <View className="flex-row justify-between">
                  <Text className="text-slate-300 text-xs">{a.nome}</Text>
                  <Text className="text-xs font-bold" style={{ color: a.color }}>{a.pct}%</Text>
                </View>
                <View className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <View className="h-full rounded-full" style={{ width: `${a.pct}%`, backgroundColor: a.color }} />
                </View>
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity
          onPress={reiniciar}
          className="flex-row items-center justify-center gap-2 border border-slate-600 rounded-xl py-3"
        >
          <Ionicons name="refresh-outline" size={16} color="#94a3b8" />
          <Text className="text-slate-400 text-sm">Refazer o quiz</Text>
        </TouchableOpacity>

        <Text className="text-slate-600 text-xs text-center">
          * Sugestão orientativa. Não constitui aconselhamento financeiro profissional.
        </Text>
      </View>
    )
  }

  const pergunta  = PERGUNTAS[atual]
  const progresso = (atual / PERGUNTAS.length) * 100

  return (
    <View className="gap-4">
      {/* Progresso */}
      <View>
        <View className="flex-row justify-between mb-2">
          <Text className="text-slate-400 text-xs">Pergunta {atual + 1} de {PERGUNTAS.length}</Text>
          <Text className="text-slate-400 text-xs">{Math.round(progresso)}%</Text>
        </View>
        <View className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <View className="h-full rounded-full bg-teal-500" style={{ width: `${progresso}%` }} />
        </View>
      </View>

      {/* Pergunta */}
      <View className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
        <Text className="text-slate-200 text-base font-bold mb-5 leading-6">{pergunta.pergunta}</Text>
        <View className="gap-3">
          {pergunta.opcoes.map((opcao, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => responder(opcao.pts)}
              className="flex-row items-center gap-3 border border-slate-600 rounded-xl px-4 py-3 active:border-teal-500"
            >
              <View className="w-7 h-7 rounded-lg border border-slate-600 items-center justify-center">
                <Text className="text-slate-400 text-xs font-bold">{String.fromCharCode(65 + i)}</Text>
              </View>
              <Text className="text-slate-300 text-sm flex-1 leading-5">{opcao.texto}</Text>
              <Ionicons name="chevron-forward" size={14} color="#475569" />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  )
}
