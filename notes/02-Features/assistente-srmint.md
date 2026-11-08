---
tipo: feature
estado: feita
versao: 1.6.0
criado: 2026-09-17
---
# Assistente de portfólio (Sr. Mint)

## Objetivo
Chat com IA sobre o portfólio, capaz de propor alterações que o utilizador confirma.

## Comportamento esperado
- Ecrã Assistente mostra sempre os 6 cards analíticos (Total, Tops, Alocação, Projeção, Imposto, Objetivo), calculados no cliente sem API
- Chat como camada extra (ícone `sparkles` no Header), só com `EXPO_PUBLIC_ENABLE_ASSISTANT=true` — desligada por defeito e não ligada em produção
- 6 tools: `get_portfolio`, `get_market_data`, `get_news`, `calculate_metrics`, `update_asset_value`, `add_transaction`
- Escritas nunca acontecem no loop do modelo: só propostas, aplicadas quando o utilizador toca Confirmar
- Sem ferramenta de comissões: o modelo recusa estimar

## Notas técnicas
- Ficheiros: `app/(tabs)/assistente.tsx`, `components/investments/InvestmentChatSheet.tsx`, `hooks/useInvestmentChat.ts`
- Edge function `investment-chat` (service_role; `user.id` vem sempre de `auth.getUser(jwt)`)
- Supabase: `dm_agent_usage`, `dm_confirmed_actions`, RPCs `confirm_update_asset_value` / `confirm_add_transaction` (só `service_role`)
- Rate limit 30/hora; `cache_control` ephemeral
- `supabase-js` fixo em 2.45.0 com generic `Database` para o `deno check` funcionar

## Ligações
- [[03-Decisoes/investment-chat-confirmacao]]
- [[03-Decisoes/idempotencia-escritas]]
- [[03-Decisoes/uma-funcao-de-chat]]
- [[03-Decisoes/nao-testar-conta-real]]
- [[05-Releases/v1.6.0]]
