---
tipo: decisao
data: 2026-10-04
---
# SMTP próprio com Gmail

**Contexto:** o email por omissão do Supabase tem limites baixos (2/hora) e pode só entregar a membros da equipa — a recuperação de password falharia para quem a motivou.
**Decisão:** SMTP do Gmail do dono (`smtp.gmail.com`, 465, app password), remetente "DeskMint". O limite sobe para 30 emails/hora.
**Alternativas consideradas:** serviço transacional com domínio próprio.
**Consequências:** o Gmail não é pensado para email transacional; um email pode cair no spam. Aceite num círculo fechado. A app password fica num gestor de passwords, nunca no chat nem no repo.

Ligações: [[02-Features/recuperacao-password]], [[04-Bugs/smtp-app-password-revogada]]
