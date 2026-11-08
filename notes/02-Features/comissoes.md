---
tipo: feature
estado: feita
versao: 1.0.0
criado: 2026-07-15
---
# Comissões

## Objetivo
Registar comissões de serviços (Tour, Táxi…) e acompanhar o que está por validar, por pagar e pago.

## Comportamento esperado
- Estados: `PENDING` (por validar) → `TO_PAY` (validada, a receber) → `PAID`; também `TO_PAY → PENDING`
- `CANCELLED` existe no enum e o calendário lê-o, mas não há transição na UI (zero linhas)
- Campo de hora opcional junto à Data do Serviço
- Calendário por dia; totalizadores Pagas / Validadas / Por validar

## Notas técnicas
- Ficheiros: `app/(tabs)/comissoes.tsx`, `hooks/useCommissions.ts`, `lib/commissions.ts`, `components/commissions/CommissionsCalendar.tsx`
- Agregações sempre com `groupByType()` — nunca somas ad-hoc por estado
- Mutações chamam `invalidateCommissionQueries(qc)` (chaves em `COMMISSION_DEPENDENT_QUERY_KEYS`)
- Enum declarado em `types/database.ts`, `prisma/schema.prisma`, `types/index.ts` — atualizar os três

## Ligações
- [[02-Features/relatorios]]
- [[03-Decisoes/estados-comissoes]]
- [[04-Bugs/comissoes-quatro-estados]]
