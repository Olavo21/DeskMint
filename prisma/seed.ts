import { PrismaClient, Plan, CommissionStatus, BudgetType, AssetType, AssetKind } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding DeskMint com dados de demonstração (ficticios)...')

  // ─── LIMPAR BASE DE DADOS ───────────────────────────────────────────────
  await prisma.retirementScenario.deleteMany()
  await prisma.retirementPlan.deleteMany()
  await prisma.emergencyFund.deleteMany()
  await prisma.portfolioSnapshot.deleteMany()
  await prisma.portfolioAsset.deleteMany()
  await prisma.asset.deleteMany()
  await prisma.budgetRule.deleteMany()
  await prisma.expense.deleteMany()
  await prisma.expenseCategory.deleteMany()
  await prisma.commission.deleteMany()
  await prisma.income.deleteMany()
  await prisma.profile.deleteMany()
  await prisma.user.deleteMany()

  // ─── USER ───────────────────────────────────────────────────────────────
  const user = await prisma.user.create({
    data: {
      email: 'user@example.com',
      name: 'Utilizador Exemplo',
      plan: Plan.FOUNDER,
      profile: {
        create: {
          birthYear: 2000,
          retirementAge: 67,
          currency: 'EUR',
        },
      },
    },
  })
  console.log('✅ User criado:', user.email)

  // ─── RENDIMENTO — MÊS DE EXEMPLO ─────────────────────────────────────────
  await prisma.income.create({
    data: {
      userId: user.id,
      month: 5,
      year: 2026,
      baseSalary: 1300.00,
      totalNet: 1300.00,
      notes: 'Rendimento líquido mensal — dados de exemplo',
    },
  })
  console.log('✅ Income criado: €1,300.00')

  // ─── COMISSÕES DE EXEMPLO ────────────────────────────────────────────────
  await prisma.commission.createMany({
    data: [
      {
        userId: user.id,
        description: 'Comissão Maio — exemplo',
        client: 'Cliente A',
        amount: 150.00,
        status: CommissionStatus.PAID,
        earnedAt: new Date('2026-05-01'),
        expectedAt: new Date('2026-05-31'),
        paidAt: new Date('2026-05-20'),
        notes: 'Paga conforme previsto',
      },
      {
        userId: user.id,
        description: 'Comissão Junho — pendente',
        client: 'Cliente B',
        amount: 200.00,
        status: CommissionStatus.PENDING,
        earnedAt: new Date('2026-05-15'),
        expectedAt: new Date('2026-06-30'),
        notes: 'Aguarda pagamento no próximo mês',
      },
    ],
  })
  console.log('✅ Comissões de exemplo criadas')

  // ─── CATEGORIAS DE DESPESA ───────────────────────────────────────────────
  const catTransporte = await prisma.expenseCategory.create({
    data: { userId: user.id, name: 'Transporte', type: BudgetType.NEEDS, icon: '🚗' },
  })
  const catHabitacao = await prisma.expenseCategory.create({
    data: { userId: user.id, name: 'Habitação', type: BudgetType.NEEDS, icon: '🏠' },
  })
  const catSaude = await prisma.expenseCategory.create({
    data: { userId: user.id, name: 'Saúde & Bem-estar', type: BudgetType.NEEDS, icon: '💪' },
  })
  const catBanco = await prisma.expenseCategory.create({
    data: { userId: user.id, name: 'Banco', type: BudgetType.NEEDS, icon: '🏦' },
  })
  const catLazer = await prisma.expenseCategory.create({
    data: { userId: user.id, name: 'Lazer & Desejos', type: BudgetType.WANTS, icon: '🎯' },
  })
  const catInvestimento = await prisma.expenseCategory.create({
    data: { userId: user.id, name: 'Investimento', type: BudgetType.SAVINGS, icon: '📈' },
  })
  const catEmergencia = await prisma.expenseCategory.create({
    data: { userId: user.id, name: 'Fundo de Emergência', type: BudgetType.SAVINGS, icon: '🛡️' },
  })
  console.log('✅ Categorias criadas')

  // ─── DESPESAS — MÊS DE EXEMPLO ───────────────────────────────────────────
  await prisma.expense.createMany({
    data: [
      // FIXAS — NEEDS
      {
        userId: user.id,
        categoryId: catTransporte.id,
        description: 'Crédito automóvel',
        amount: 430.00,
        isFixed: true,
        month: 5,
        year: 2026,
        paidAt: new Date('2026-05-01'),
      },
      {
        userId: user.id,
        categoryId: catHabitacao.id,
        description: 'Ajuda casa',
        amount: 150.00,
        isFixed: true,
        month: 5,
        year: 2026,
        paidAt: new Date('2026-05-01'),
      },
      {
        userId: user.id,
        categoryId: catTransporte.id,
        description: 'Seguro carro',
        amount: 80.00,
        isFixed: true,
        month: 5,
        year: 2026,
        paidAt: new Date('2026-05-01'),
      },
      {
        userId: user.id,
        categoryId: catSaude.id,
        description: 'Ginásio',
        amount: 35.00,
        isFixed: true,
        month: 5,
        year: 2026,
        paidAt: new Date('2026-05-01'),
      },
      {
        userId: user.id,
        categoryId: catBanco.id,
        description: 'Comissões bancárias',
        amount: 7.00,
        isFixed: true,
        month: 5,
        year: 2026,
        paidAt: new Date('2026-05-01'),
      },
      // VARIÁVEIS — WANTS
      {
        userId: user.id,
        categoryId: catLazer.id,
        description: 'Gasolina',
        amount: 50.00,
        isFixed: false,
        month: 5,
        year: 2026,
      },
      {
        userId: user.id,
        categoryId: catLazer.id,
        description: 'Transportes públicos',
        amount: 40.00,
        isFixed: false,
        month: 5,
        year: 2026,
      },
      // POUPANÇA
      {
        userId: user.id,
        categoryId: catEmergencia.id,
        description: 'Depósito fundo de emergência',
        amount: 200.00,
        isFixed: true,
        month: 5,
        year: 2026,
        paidAt: new Date('2026-05-01'),
      },
      {
        userId: user.id,
        categoryId: catInvestimento.id,
        description: 'Aporte mensal ETFs',
        amount: 200.00,
        isFixed: true,
        month: 5,
        year: 2026,
        paidAt: new Date('2026-05-01'),
      },
    ],
  })
  console.log('✅ Despesas criadas (fixas + variáveis + poupança)')

  // ─── REGRA 50/30/20 — MÊS DE EXEMPLO ─────────────────────────────────────
  await prisma.budgetRule.create({
    data: {
      userId: user.id,
      month: 5,
      year: 2026,
      totalIncome: 1300.00,
      needsPct: 0.55,
      wantsPct: 0.07,
      savingsPct: 0.31,
      needsAmt: 710.00,
      wantsAmt: 90.00,
      savingsAmt: 400.00,
    },
  })
  console.log('✅ Regra 50/30/20 registada')

  // ─── PORTFOLIO DE EXEMPLO ─────────────────────────────────────────────────
  const vwce = await prisma.portfolioAsset.create({
    data: {
      userId: user.id,
      name: 'FTSE All-World',
      ticker: 'VWCE.DE',
      assetType: AssetType.ETF,
      broker: 'Corretora Exemplo',
      units: 0,
      avgPrice: 0,
      capitalInvested: 900.00,
      currentValue: 930.00,
      allocation: 0.80,
      isExtra: false,
    },
  })

  const sxrv = await prisma.portfolioAsset.create({
    data: {
      userId: user.id,
      name: 'NASDAQ-100',
      ticker: 'SXRV.DE',
      assetType: AssetType.ETF,
      broker: 'Corretora Exemplo',
      units: 0,
      avgPrice: 0,
      capitalInvested: 100.00,
      currentValue: 105.00,
      allocation: 0.15,
      isExtra: false,
    },
  })

  const lsmc = await prisma.portfolioAsset.create({
    data: {
      userId: user.id,
      name: 'Semicondutores',
      ticker: 'LSMC.DE',
      assetType: AssetType.ETF,
      broker: 'Corretora Exemplo',
      units: 0,
      avgPrice: 0,
      capitalInvested: 80.00,
      currentValue: 82.00,
      allocation: 0.05,
      isExtra: false,
    },
  })

  await prisma.portfolioAsset.create({
    data: {
      userId: user.id,
      name: 'Ação Exemplo (20 unidades)',
      ticker: 'EXMP.DE',
      assetType: AssetType.STOCK,
      broker: 'Corretora Exemplo',
      units: 20,
      avgPrice: 3.50,
      capitalInvested: 70.00,
      currentValue: 68.00,
      allocation: null,
      isExtra: true,
    },
  })
  console.log('✅ Portfolio de exemplo criado')

  // snapshot de hoje
  const today = new Date('2026-05-22')
  await prisma.portfolioSnapshot.createMany({
    data: [
      { portfolioAssetId: vwce.id, date: today, price: 0, totalValue: 930.00 },
      { portfolioAssetId: sxrv.id, date: today, price: 0, totalValue: 105.00 },
      { portfolioAssetId: lsmc.id, date: today, price: 0, totalValue: 82.00 },
    ],
  })
  console.log('✅ Snapshot de hoje criado')

  // ─── ATIVOS (PATRIMÔNIO) ─────────────────────────────────────────────────
  await prisma.asset.createMany({
    data: [
      {
        userId: user.id,
        name: 'Automóvel de exemplo',
        type: AssetKind.VEHICLE,
        value: 16000.00,
        debt: 4800.00,
        notes: 'Valor de mercado de exemplo, com crédito associado',
      },
      {
        userId: user.id,
        name: 'Conta à ordem',
        type: AssetKind.BANK_ACCOUNT,
        value: 90.00,
        debt: 0,
        notes: 'Conta corrente de exemplo',
      },
    ],
  })
  console.log('✅ Ativos criados (exemplo)')

  // ─── FUNDO DE EMERGÊNCIA ─────────────────────────────────────────────────
  await prisma.emergencyFund.create({
    data: {
      userId: user.id,
      currentAmount: 1900.00,
      targetMonths: 6,
      targetAmount: 4800.00,
    },
  })
  console.log('✅ Fundo de emergência: €1,900.00 / €4,800.00')

  // ─── PLANO DE REFORMA ────────────────────────────────────────────────────
  await prisma.retirementPlan.create({
    data: {
      userId: user.id,
      currentAge: 26,
      retirementAge: 67,
      monthlyContrib: 200.00,
      initialCapital: 1200.00,
      scenarios: {
        create: [
          {
            name: 'Conservador',
            annualReturn: 0.05,
            projectedCapital: null,
          },
          {
            name: 'Realista',
            annualReturn: 0.07,
            projectedCapital: null,
          },
          {
            name: 'Otimista',
            annualReturn: 0.10,
            projectedCapital: null,
          },
        ],
      },
    },
  })
  console.log('✅ Plano de reforma criado (3 cenários até aos 67 anos)')

  // ─── RESUMO ──────────────────────────────────────────────────────────────
  console.log('\n📊 RESUMO DO SEED (dados de demonstração):')
  console.log('   👤 User:', user.name, `(${user.email})`)
  console.log('   💶 Rendimento mensal: €1,300.00')
  console.log('   📉 Despesas totais: €1,200.00 (inclui €400 poupança)')
  console.log('   💰 Poupança: €400 | Lazer disponível: ~€100')
  console.log('   📈 Portfolio de exemplo: €1,200.00')
  console.log('   🏦 Fundo emergência: €1,900.00')
  console.log('   🚗 Automóvel: €16,000 (líquido)')
  console.log('   🏦 Conta à ordem: €90.00')
  console.log('   🏛️  Património total: ~€19,000.00')
  console.log('   🏁 Reforma aos 67: 3 cenários configurados')
  console.log('\n✅ Seed completo!')
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
