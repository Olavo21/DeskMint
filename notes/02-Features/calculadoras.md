---
tipo: feature
estado: feita
versao: 1.2.0
criado: 2026-08-02
---
# Calculadoras (Ferramentas)

## Objetivo
Ferramentas de planeamento financeiro independentes dos dados registados.

## Comportamento esperado
- Triângulo Financeiro (usa o mesmo fundo de emergência da Dashboard)
- Motor FIRE e Simulador FIRE
- Otimizador de Dívida (mesma conta do simulador de amortização)
- Simulador de Mais-Valias PT (28%)

## Notas técnicas
- Ficheiros: `app/(tabs)/ferramentas.tsx`, `components/ferramentas/` (`TrianguloFinanceiro`, `MotorFIRE`, `SimuladorFIRE`, `OtimizadorDebito`, `CalculadoraETF`, `PesquisaAtivos`, `QuizInvestidor`)
- Projeção de longo prazo em `lib/projection.ts` (anuidade, taxa por perfil de investidor)

## Ligações
- [[02-Features/creditos-simulador]]
- [[05-Releases/v1.2.0]]
