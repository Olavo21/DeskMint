---
tipo: decisao
data: 2026-09-23
---
# Finnhub: zero chaves no cliente, rotação só no fim

**Contexto:** `EXPO_PUBLIC_FINNHUB_KEY` é extraível de qualquer APK e tem o mesmo valor que o `FINNHUB_KEY` do servidor. Quem abusar da chave esgota a quota da análise fundamental e do assistente para todos. O plano grátis da Finnhub só dá uma chave por conta, sem estatísticas nem restrição por IP.
**Decisão:** a chave fica só em `Deno.env`; os 3 pontos do cliente (`hooks/useTickerBarQuotes.ts`, `lib/newsApi.ts`, `hooks/useTickerSearch.ts`) passam por um proxy no servidor. Ordem: migrar → publicar a release → esperar alguns dias → só então carregar em Regenerate.
**Alternativas consideradas:** duas chaves (pública + privada) — impossível neste provedor. Regenerar já — partiria a app publicada sem ganho.
**Consequências:** até à migração a chave continua exposta. Regra geral: uma `EXPO_PUBLIC_*` nunca tem o valor de um secret de servidor.

Estado: **por executar**.

Ligações: [[04-Bugs/expo-public-finnhub-key]], [[02-Features/ticker-bar]]
