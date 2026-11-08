---
tipo: feature
estado: feita
versao: 1.0.0
criado: 2026-07-15
---
# Autenticação e Onboarding

## Objetivo
Registar e autenticar utilizadores, recolher o perfil de investidor e configurar as regras orçamentais iniciais.

## Comportamento esperado
- Login/registo com Supabase Auth (email + password)
- Onboarding 4 passos: dados básicos, perfil de investidor (Conservador/Moderado/Agressivo/Especulativo), objectivo financeiro, configuração inicial
- `fetchProfile` em `_layout.tsx` é a única autoridade de routing — decide entre Dashboard, Onboarding e Auth
- `PASSWORD_RECOVERY` não navega; flag `recovering` em `authStore` garante que o `USER_UPDATED` seguinte encaminha para a Dashboard

## Notas técnicas
- Ficheiros/ecrãs afetados: `app/_layout.tsx`, `app/(auth)/login.tsx`, `app/(auth)/onboarding.tsx`, `app/(auth)/recuperar.tsx`
- Supabase: `dm_profiles`, `dm_budget_rules`, `dm_net_worth_snapshots` criados em `handleFinish`
- Regra da password: só símbolos ASCII aceites pelo Supabase (ç/acentos não contam) — `lib/passwordRule.ts`

## Ligações
- [[05-Releases/v1.0.0]]
- [[05-Releases/v1.6.0]]
- [[02-Features/recuperacao-password]]
