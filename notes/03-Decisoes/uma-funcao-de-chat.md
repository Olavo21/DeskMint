---
tipo: decisao
data: 2026-09-17
---
# Só uma edge function de chat de cada vez

**Contexto:** o chat mudou de função duas vezes (`investment-chat` em jun, `investment-agent` em jul, removido em ago) e cada mudança deixou código morto. `investment-agent` e `ai-assistant` estavam órfãs, uma ainda deployada com service_role e CORS wildcard.
**Decisão:** aplicar a spec nova à função realmente em uso (`investment-chat`) e apagar as outras do repo e do Supabase.
**Alternativas consideradas:** manter as duas "por precaução".
**Consequências:** nunca deixar duas funções de chat vivas. O chat volta atrás de `EXPO_PUBLIC_ENABLE_ASSISTANT`, desligada por defeito; não ligar em produção sem medir o custo em `dm_agent_usage`.

Ligações: [[02-Features/assistente-srmint]]
