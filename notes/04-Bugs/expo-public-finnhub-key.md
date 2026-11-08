---
tipo: bug
estado: aberto
sentry: 
criado: 2026-09-18
---
# Chave da Finnhub exposta no APK

**Como reproduzir:** extrair o bundle JS de qualquer APK publicado — `EXPO_PUBLIC_FINNHUB_KEY` aparece em texto.
**Esperado vs. atual:** esperado nenhuma chave de servidor no cliente; atual a chave é a mesma do `FINNHUB_KEY` do servidor.
**Causa:** `hooks/useTickerBarQuotes.ts`, `lib/newsApi.ts` e `hooks/useTickerSearch.ts` chamam a Finnhub diretamente. Qualquer `EXPO_PUBLIC_*` é pública.
**Correção:** proxy no servidor e só depois regenerar a chave — ver [[03-Decisoes/finnhub-proxy-pendente]].
