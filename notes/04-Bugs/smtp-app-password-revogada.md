---
tipo: bug
estado: resolvido
sentry: 
criado: 2026-10-13
---
# Emails deixam de sair: app password do Gmail revogada

**Como reproduzir:** mudar a password da conta Google (revoga todas as app passwords).
**Esperado vs. atual:** `/recover` dá 500 com `535 5.7.8 BadCredentials` no log do Auth; a app mostra "Verifica a ligação".
**Causa:** a app password gravada no Supabase deixou de existir.
**Correção:** nova app password, colada sem espaços. Trocar a porta 465 ↔ 587 não resolve um 535. Onde ver: Supabase → Logs → Auth, eventos `/recover`, campo `error`. Cuidado: ligar "Enable custom SMTP" com campos vazios corta todos os emails.

Ligações: [[03-Decisoes/smtp-gmail]], [[02-Features/recuperacao-password]]
