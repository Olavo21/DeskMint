import { useState } from 'react'
import { ScrollView, View, Text, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

// ─── Tipos ───────────────────────────────────────────────────────────────────
type Status = 'obrigatorio' | 'atencao' | 'isento' | 'info'

const STATUS_CFG: Record<Status, { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  obrigatorio: { color: '#f87171', bg: '#450a0a', icon: 'alert-circle',        label: 'Obrigatório' },
  atencao:     { color: '#fbbf24', bg: '#451a03', icon: 'warning-outline',      label: 'Atenção' },
  isento:      { color: '#34d399', bg: '#022c22', icon: 'checkmark-circle',     label: 'Isento' },
  info:        { color: '#93c5fd', bg: '#1e3a5f', icon: 'information-circle',   label: 'Info' },
}

// ─── Componentes ─────────────────────────────────────────────────────────────
function Tag({ status, text }: { status: Status; text?: string }) {
  const cfg = STATUS_CFG[status]
  return (
    <View className="flex-row items-center gap-1 rounded-full px-2.5 py-1 self-start"
      style={{ backgroundColor: cfg.bg }}>
      <Ionicons name={cfg.icon} size={12} color={cfg.color} />
      <Text style={{ color: cfg.color }} className="text-xs font-semibold">{text ?? cfg.label}</Text>
    </View>
  )
}

function Section({ title, icon, children, defaultOpen = false }:
  { title: string; icon: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <View className="bg-dark-800 rounded-2xl mb-3 overflow-hidden">
      <TouchableOpacity
        className="flex-row items-center justify-between px-4 py-4"
        onPress={() => setOpen(!open)}
      >
        <View className="flex-row items-center gap-2">
          <Text className="text-lg">{icon}</Text>
          <Text className="text-white font-semibold text-sm">{title}</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color="#475569" />
      </TouchableOpacity>
      {open && <View className="px-4 pb-4">{children}</View>}
    </View>
  )
}

function Row({ label, value, status, note }:
  { label: string; value: string; status?: Status; note?: string }) {
  return (
    <View className="py-2.5 border-t border-dark-700">
      <View className="flex-row justify-between items-center gap-2">
        <Text className="text-dark-300 text-sm flex-1">{label}</Text>
        <View className="flex-row items-center gap-2">
          <Text className="text-white text-sm font-medium">{value}</Text>
          {status && <Tag status={status} />}
        </View>
      </View>
      {note && <Text className="text-dark-500 text-xs mt-1 leading-4">{note}</Text>}
    </View>
  )
}

function Alert({ status, text }: { status: Status; text: string }) {
  const cfg = STATUS_CFG[status]
  return (
    <View className="rounded-xl px-4 py-3 mb-3 flex-row gap-2"
      style={{ backgroundColor: cfg.bg, borderLeftWidth: 3, borderLeftColor: cfg.color }}>
      <Ionicons name={cfg.icon} size={16} color={cfg.color} style={{ marginTop: 1 }} />
      <Text style={{ color: cfg.color }} className="text-xs leading-5 flex-1">{text}</Text>
    </View>
  )
}

// ─── ECRÃ PRINCIPAL ──────────────────────────────────────────────────────────
export default function FiscalScreen() {
  return (
    <SafeAreaView className="flex-1 bg-dark-900">
      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View className="mt-4 mb-4">
          <Text className="text-dark-400 text-sm">Portugal · IRS 2025</Text>
          <Text className="text-white text-2xl font-bold">Fiscalidade</Text>
        </View>

        {/* Aviso legal — topo */}
        <View className="bg-yellow-900/40 border border-yellow-700 rounded-2xl px-4 py-3 mb-5 flex-row gap-3 items-start">
          <Text className="text-lg">⚠️</Text>
          <Text className="text-yellow-200 text-xs leading-5 flex-1">
            Este conteúdo é informativo e baseado na legislação portuguesa em vigor para 2025.
            Não substitui aconselhamento de um contabilista ou consultor fiscal certificado.
            Consulta sempre um profissional para a tua situação específica.
          </Text>
        </View>

        {/* KPIs rápidos */}
        <View className="flex-row gap-3 mb-4">
          <View className="bg-dark-800 rounded-2xl p-4 flex-1 items-center">
            <Text className="text-white text-2xl font-bold">28%</Text>
            <Text className="text-dark-400 text-xs text-center mt-1">Taxa liberatória sobre mais-valias e dividendos</Text>
          </View>
          <View className="bg-dark-800 rounded-2xl p-4 flex-1 items-center">
            <Text className="text-white text-2xl font-bold">365</Text>
            <Text className="text-dark-400 text-xs text-center mt-1">Dias para isenção de cripto (+ de 1 ano)</Text>
          </View>
        </View>

        {/* ─── Contas Estrangeiras ─────────────────────────────────────── */}
        <Section title="Contas e Brokers Estrangeiros" icon="🏦" defaultOpen>
          <Alert status="obrigatorio"
            text="Todos os rendimentos obtidos em bancos ou brokers estrangeiros devem ser declarados no IRS em Anexo J — independentemente do valor." />

          <Row label="Trade Republic (banco alemão)"
               value="Declarar juros"
               status="obrigatorio"
               note="É um banco licenciado na Alemanha. Juros da conta poupança (ex: 3.75% a.a.) declarar em Anexo J como rendimentos de capitais. Retenção na fonte alemã pode ser creditada em Portugal." />

          <Row label="XTB (broker polaco)"
               value="Declarar mais-valias e dividendos"
               status="obrigatorio"
               note="Vendas de ETFs/ações: Anexo G. Dividendos recebidos: Anexo J. O XTB emite relatório anual de transações — exportar em formato PDF/CSV antes do IRS." />

          <Row label="Degiro (broker holandês)"
               value="Declarar mais-valias e dividendos"
               status="obrigatorio"
               note="Mesmo processo que XTB. Descarregar o relatório anual em Degiro > Conta > Relatórios." />

          <Row label="Interactive Brokers (EUA/Irlanda)"
               value="Declarar tudo"
               status="obrigatorio"
               note="Conta em USD/EUR. Atenção à conversão cambial — mais-valias calculadas em EUR à data de compra e venda. Relatório disponível no portal IB." />

          <Row label="Trading212 (Reino Unido/Bulgária)"
               value="Declarar mais-valias e dividendos"
               status="obrigatorio"
               note="Relatório anual disponível na app. Declarar Anexo G (vendas) e Anexo J (dividendos)." />

          <Row label="Revolut (Lituânia — licença bancária EU)"
               value="Declarar juros, mais-valias e dividendos"
               status="obrigatorio"
               note="A Revolut tem licença bancária na Lituânia. Juros da conta poupança e rendimentos do Revolut Invest declarar em Anexo J. Descarregar extrato anual em Revolut > Perfil > Extratos > Anual. Atenção: o Revolut pode fazer retenção na fonte lituana — creditar em Portugal para evitar dupla tributação." />

          <Alert status="atencao"
            text="Conta poupança estrangeira (ex: Trade Republic) com saldo superior a €50.000 pode ter obrigações adicionais de reporte (Modelo 49). Consultar AT.gov.pt." />
        </Section>

        {/* ─── Ações ──────────────────────────────────────────────────── */}
        <Section title="Ações (Stocks)" icon="📈">
          <Row label="Mais-valias (lucro na venda)"
               value="28%"
               status="obrigatorio"
               note="Calculado sobre: preço de venda − preço de compra − comissões. Declarar em Anexo G." />

          <Row label="Dividendos de ações"
               value="28%"
               status="obrigatorio"
               note="Se o broker fez retenção na fonte (ex: 15% nos EUA via W-8BEN), a diferença até 28% deve ser regularizada em Portugal. Declarar Anexo J." />

          <Row label="Ações detidas < 365 dias"
               value="28%"
               status="info"
               note="Não existe em Portugal a distinção short-term vs long-term como nos EUA. A taxa é sempre 28% independentemente do período de detenção." />

          <Row label="Ação vendida com PERDA (menos-valia)"
               value="Declarar em Anexo G"
               status="obrigatorio"
               note="Mesmo vendendo com prejuízo, tens de declarar no IRS (Anexo G, Quadro 9). É fundamental fazê-lo para poder deduzir as perdas em mais-valias futuras nos próximos 5 anos. Exemplo: perdes €500 na TSLA em 2024 → podes descontar esses €500 de lucros em ETFs ou ações até 2029." />

          <Alert status="atencao"
            text="Se não declarares a menos-valia no ano em que ocorreu, PERDES o direito a usá-la como dedução futura. O AT não aceita declarações retroactivas de prejuízos." />

          <Alert status="info"
            text="Formulário W-8BEN: ao assinar este formulário num broker americano, a retenção na fonte americana em dividendos fica em 15% (vs 30% sem o formulário), e regularizas os restantes 13% em Portugal." />
        </Section>

        {/* ─── ETFs ────────────────────────────────────────────────────── */}
        <Section title="ETFs — Acumulativos vs Distributivos" icon="📊">
          <Alert status="info"
            text="A grande maioria dos ETFs irlandeses (domiciliados na Irlanda) disponíveis na Europa beneficiam de isenção de withholding tax em dividendos internos — vantagem fiscal importante vs ETFs americanos." />

          <Row label="ETFs Acumulativos (ex: VWCE, SXRV, LSMC)"
               value="Só na venda"
               status="isento"
               note="Reinvestem os dividendos internamente. Não há tributação anual. Só pagas 28% na mais-valia quando venderes. Vantagem: compound interest sem fricção fiscal anual." />

          <Row label="ETFs Distributivos (ex: VWRL, IWDA.AS)"
               value="28% por dividendo"
               status="atencao"
               note="Distribuem dividendos periodicamente (trimestral ou anual). Cada distribuição é tributada a 28% — mesmo que reinvestas manualmente. Menos eficiente fiscalmente que acumulativos." />

          <Row label="ETFs domiciliados na Irlanda (.IE ISIN)"
               value="Vantajoso"
               status="isento"
               note="Portugal tem convenção de dupla tributação com a Irlanda. ETFs como VWCE.DE (domiciliado na Irlanda, listado em Frankfurt) beneficiam de 0% withholding tax interno." />

          <Row label="ETFs americanos (ex: QQQ, SPY, VTI)"
               value="Não recomendado"
               status="atencao"
               note="Investidores europeus não podem legalmente comprar novos ETFs americanos sem KIID (MiFID II). Além disso, sujeitos a estate tax americana de 40% para não-residentes com >$60k em ativos EUA." />

          <Alert status="info"
            text="💡 VWCE, SXRV e LSMC são todos acumulativos e domiciliados na Irlanda — a escolha mais eficiente fiscalmente para investidores portugueses." />
        </Section>

        {/* ─── Cripto ──────────────────────────────────────────────────── */}
        <Section title="Criptomoedas" icon="₿">
          <Row label="Mais-valias detidas > 365 dias"
               value="0% (isento)"
               status="isento"
               note="Desde 2023. Criptoativos detidos mais de 1 ano estão isentos de IRS em Portugal. Data conta da compra original." />

          <Row label="Mais-valias detidas < 365 dias"
               value="28%"
               status="obrigatorio"
               note="Declarar em Anexo G. Inclui troca entre criptomoedas (ex: BTC → ETH é um facto tributável)." />

          <Row label="Staking / Mining / Airdrop"
               value="IRS progressivo"
               status="atencao"
               note="Considerados rendimentos de trabalho ou empresariais. Tributados à taxa marginal do IRS, não à taxa liberatória de 28%." />
        </Section>

        {/* ─── Fundo de Emergência ─────────────────────────────────────── */}
        <Section title="Fundo de Emergência e Poupança" icon="🛡️">
          <Row label="Conta poupança portuguesa (ex: CGD, Novobanco)"
               value="28% sobre juros"
               status="obrigatorio"
               note="Juros declarados em Anexo E. Normalmente a retenção na fonte já é feita pelo banco — verificar certificado anual." />

          <Row label="Trade Republic — conta de poupança"
               value="28% sobre juros"
               status="obrigatorio"
               note="Banco alemão, sem retenção portuguesa automática. Os juros recebidos devem ser declarados em Anexo J. Guarda os extractos mensais como comprovativos." />

          <Row label="Certificados de Aforro / Tesouro"
               value="28% sobre juros"
               status="obrigatorio"
               note="Emitidos pelo Estado português. Retenção na fonte efetuada automaticamente — normalmente não precisas de declarar separadamente." />
        </Section>

        {/* ─── Formulários IRS ─────────────────────────────────────────── */}
        <Section title="Formulários IRS — O que preencher" icon="📋">
          <Row label="Anexo G"
               value="Mais-valias"
               status="info"
               note="Vendas de ações, ETFs, fundos. Inclui data de compra, data de venda, preço de compra, preço de venda e comissões." />
          <Row label="Anexo J"
               value="Rendimentos estrangeiros"
               status="info"
               note="Dividendos, juros e mais-valias obtidos em brokers/bancos estrangeiros. Campo 8.2 para mais-valias, campo 7.A para rendimentos de capitais." />
          <Row label="Anexo E"
               value="Rendimentos de capitais PT"
               status="info"
               note="Dividendos de empresas portuguesas, juros de contas portuguesas. Frequentemente já vem pré-preenchido." />
          <Row label="Prazo de entrega"
               value="1 Abril – 30 Junho"
               status="atencao"
               note="IRS do ano anterior. Por exemplo, os rendimentos de 2024 declaram-se entre Abril e Junho de 2025." />

          <Alert status="atencao"
            text="Guarda TODOS os comprovativos de compra e venda (notas de execução, extractos do broker) durante pelo menos 4 anos — o prazo de caducidade do AT é 4 anos." />
        </Section>

        {/* ─── Dicas ───────────────────────────────────────────────────── */}
        <Section title="Dicas de Optimização Fiscal" icon="💡">
          <Row label="Preferir ETFs acumulativos"
               value="Diferimento fiscal"
               status="isento"
               note="Com ETFs acumulativos (VWCE, etc.) adiás o pagamento de impostos para quando venderes — permite que os dividendos compostos trabalhem sem tributação anual." />
          <Row label="Englobamento: quando vale a pena?"
               value="Rendimento colectável baixo"
               status="info"
               note="Se a tua taxa marginal de IRS for inferior a 28%, podes optar pelo englobamento (somar as mais-valias ao rendimento colectável). Calcula os dois cenários antes de escolher." />
          <Row label="Compensar mais-valias com menos-valias"
               value="Poupança real"
               status="isento"
               note="Se tens ETF A em lucro e ETF B em prejuízo, vender ambos no mesmo ano compensa fiscalmente. Técnica conhecida como 'tax-loss harvesting'." />
          <Row label="W-8BEN no broker americano"
               value="Reduz withholding EUA"
               status="info"
               note="Preenche no XTB/IBKR para reduzir retenção americana em dividendos de 30% para 15%. A diferença até 28% regularizas em Portugal." />
        </Section>

        <View className="h-8" />

      </ScrollView>
    </SafeAreaView>
  )
}
