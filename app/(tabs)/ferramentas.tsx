import Header from '../../components/ui/Header'
import { useState } from 'react'
import { ScrollView, View, Text, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import CalculadoraETF from '../../components/ferramentas/CalculadoraETF'
import QuizInvestidor from '../../components/ferramentas/QuizInvestidor'
import PesquisaAtivos from '../../components/ferramentas/PesquisaAtivos'
import CalculadoraCreditos from '../../components/ferramentas/CalculadoraCreditos'

type Ferramenta = 'etf' | 'ativos' | 'quiz' | 'creditos'

const FERRAMENTAS: { key: Ferramenta; label: string; icon: string; desc: string; cor: string }[] = [
  {
    key:   'etf',
    label: 'Calculadora ETF',
    icon:  'trending-up-outline',
    desc:  'Juros compostos, aportes mensais e evolução do portfólio',
    cor:   '#14b8a6',
  },
  {
    key:   'ativos',
    label: 'Pesquisa de Ativos',
    icon:  'search-outline',
    desc:  '37 ETFs e ações com histórico simulado e métricas',
    cor:   '#6366f1',
  },
  {
    key:   'quiz',
    label: 'Quiz do Investidor',
    icon:  'shield-checkmark-outline',
    desc:  '5 perguntas para descobrir o teu perfil de risco',
    cor:   '#f59e0b',
  },
  {
    key:   'creditos',
    label: 'Créditos & Euribor',
    icon:  'home-outline',
    desc:  'Simulador de crédito habitação com stress test Euribor',
    cor:   '#10b981',
  },
]

export default function FerramentasScreen() {
  const [ativa, setAtiva] = useState<Ferramenta | null>(null)

  const ferramenta = FERRAMENTAS.find((f) => f.key === ativa)

  return (
    <SafeAreaView className="flex-1 bg-dark-900">
      <Header title={ferramenta?.label ?? 'Ferramentas'} />

      {/* Botão voltar quando está dentro de uma ferramenta */}
      {ativa && (
        <TouchableOpacity
          onPress={() => setAtiva(null)}
          className="flex-row items-center gap-2 px-4 py-2 border-b border-dark-600"
        >
          <Ionicons name="arrow-back-outline" size={16} color="#64748b" />
          <Text className="text-dark-400 text-sm">Todas as ferramentas</Text>
        </TouchableOpacity>
      )}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {!ativa && (
          <>
            <Text className="text-dark-400 text-sm mb-4">
              Ferramentas de análise e simulação para os teus investimentos.
            </Text>

            <View className="gap-3">
              {FERRAMENTAS.map((f) => (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => setAtiva(f.key)}
                  className="flex-row items-center gap-4 bg-dark-800 border border-dark-600 rounded-2xl p-4"
                >
                  <View
                    className="w-12 h-12 rounded-2xl items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: f.cor + '20', borderColor: f.cor + '40', borderWidth: 1 }}
                  >
                    <Ionicons name={f.icon as 'search-outline'} size={22} color={f.cor} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-dark-200 font-semibold">{f.label}</Text>
                    <Text className="text-dark-400 text-sm mt-0.5">{f.desc}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#475569" />
                </TouchableOpacity>
              ))}
            </View>

            <View className="mt-6 bg-dark-800/50 border border-dark-600/50 rounded-xl p-4">
              <View className="flex-row items-center gap-2 mb-2">
                <Ionicons name="information-circle-outline" size={14} color="#475569" />
                <Text className="text-dark-500 text-xs font-semibold">Aviso</Text>
              </View>
              <Text className="text-dark-500 text-xs leading-5">
                Estas ferramentas são meramente educativas e informativas. Não constituem aconselhamento financeiro profissional. Consulta sempre um especialista antes de tomar decisões de investimento.
              </Text>
            </View>
          </>
        )}

        {ativa === 'etf'      && <CalculadoraETF />}
        {ativa === 'ativos'   && <PesquisaAtivos />}
        {ativa === 'quiz'     && <QuizInvestidor />}
        {ativa === 'creditos' && <CalculadoraCreditos />}
      </ScrollView>
    </SafeAreaView>
  )
}
