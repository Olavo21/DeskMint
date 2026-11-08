# DeskMint — Notas

Vault do Obsidian dentro do repositório. O Claude Code lê e edita estas notas.

- [[00-Inbox]] — captura rápida, sem organizar
- [[01-Ideias]] — ideias de features, negócio, marketing
- [[02-Features]] — specs de features (uma nota por feature)
- [[03-Decisoes]] — decisões técnicas/produto (ADR curto)
- [[04-Bugs]] — bugs e investigação
- [[05-Releases]] — notas de cada versão

## Em curso
- Migrar as chamadas Finnhub do cliente para um proxy — [[03-Decisoes/finnhub-proxy-pendente]]
- Backlog 1.7.0: percentagens com a língua da app, marcar crédito como liquidado, sessão do `xlsx`, source maps no Sentry

## Releases
- [[05-Releases/v1.6.0]] — builds 11–21 (12 set a 25 out 2026)
- [[05-Releases/v1.5.0]] — lotes, look-through, tetos, análise fundamentalista
- [[05-Releases/v1.4.0]] — inclui 1.4.1 e 1.4.2 (agosto 2026)
- [[05-Releases/v1.3.0]] — inclui 1.3.1 (3 ago 2026)
- [[05-Releases/v1.2.0]] — 2 ago 2026
- [[05-Releases/v1.1.0]] — 22 jul 2026
- [[05-Releases/v1.0.0]] — Founders Preview, 15 jul 2026

## Features (feitas)
- [[02-Features/autenticacao-onboarding]]
- [[02-Features/recuperacao-password]]
- [[02-Features/dashboard]]
- [[02-Features/investimentos-portefolio]]
- [[02-Features/ticker-bar]]
- [[02-Features/lotes-irs]]
- [[02-Features/look-through-etf]]
- [[02-Features/alertas-teto]]
- [[02-Features/analise-fundamentalista]]
- [[02-Features/poupanca]]
- [[02-Features/importacao-xtb]]
- [[02-Features/trading212-sync]]
- [[02-Features/assistente-srmint]]
- [[02-Features/creditos-simulador]]
- [[02-Features/comissoes]]
- [[02-Features/relatorios]]
- [[02-Features/calculadoras]]
- [[02-Features/objetivos-buckets]]
- [[02-Features/sentry]]
- [[02-Features/backup-semanal]]

## Decisões
- [[03-Decisoes/Shopify-rejeitado]]
- [[03-Decisoes/rendimento-fixo-ultima-linha]]
- [[03-Decisoes/despesas-fixas-ligadas-a-creditos]]
- [[03-Decisoes/finnhub-proxy-pendente]]
- [[03-Decisoes/cache-nao-guarda-falhas]]
- [[03-Decisoes/investment-chat-confirmacao]]
- [[03-Decisoes/idempotencia-escritas]]
- [[03-Decisoes/uma-funcao-de-chat]]
- [[03-Decisoes/nao-testar-conta-real]]
- [[03-Decisoes/dependencias-nativas-versao-fixa]]
- [[03-Decisoes/supabase-js-versao-fixa-edge]]
- [[03-Decisoes/sentry-auto-upload-desligado]]
- [[03-Decisoes/estados-comissoes]]
- [[03-Decisoes/relatorios-abas-reduzidas]]
- [[03-Decisoes/smtp-gmail]]
- [[03-Decisoes/xlsx-adiado]]

## Bugs e armadilhas
Abertos:
- [[04-Bugs/expo-public-finnhub-key]]
- [[04-Bugs/finnhub-plano-gratis-limites]]
- [[04-Bugs/yahoo-crumb-cors]]
- [[04-Bugs/sentry-source-maps]]
- [[04-Bugs/xlsx-cves]]
- [[04-Bugs/error-boundary-onpress]]
- [[04-Bugs/eas-build-exit-127]]

Resolvidos, mas armadilhas para código novo:
- [[04-Bugs/stock-fundamentals-cacheia-null]]
- [[04-Bugs/sufixo-us-finnhub]]
- [[04-Bugs/portfolio-assets-id-text]]
- [[04-Bugs/datas-utc-vs-local]]
- [[04-Bugs/comissoes-quatro-estados]]
- [[04-Bugs/smtp-app-password-revogada]]
