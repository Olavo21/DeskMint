---
tipo: feature
estado: feita
versao: 1.2.0
criado: 2026-08-02
---
# Sincronização Trading212

## Objetivo
Ligar a conta Trading212 e sincronizar as posições automaticamente.

## Comportamento esperado
- O utilizador cola a API key; fica encriptada (AES-256-GCM) no servidor
- A key nunca volta ao cliente nem aparece em logs ou respostas
- Erros do Postgres não chegam ao cliente (mensagem genérica)

## Notas técnicas
- Edge function `sync-trading212`; `ENCRYPTION_SECRET` só nos Secrets do Supabase, nunca no código
- CORS ainda wildcard

## Ligações
- [[02-Features/investimentos-portefolio]]
- [[05-Releases/v1.2.0]]
