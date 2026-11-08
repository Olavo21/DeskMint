---
tipo: feature
estado: feita
versao: 1.6.0
criado: 2026-10-04
---
# Recuperação de password

## Objetivo
Permitir repor a password sem deep links, com um código de 6 dígitos enviado por email.

## Comportamento esperado
- Link "Esqueci-me da palavra-passe" no login
- Mensagem igual exista ou não a conta; o intervalo por utilizador do Supabase é tratado como envio normal (não revela contas)
- "Reenviar código" com espera de 60 s; máximo 8 códigos errados na UI
- Password recusada depois de `verifyOtp` só repete o `updateUser`
- Cancelar faz `signOut()`; depois de mudar, chega à Dashboard sem reabrir a app
- Textos em `recovery.*` nos três idiomas

## Notas técnicas
- Ficheiros: `app/(auth)/recuperar.tsx`, `app/_layout.tsx`, `stores/authStore.ts` (flag `recovering`), `lib/passwordRule.ts`
- `resetPasswordForEmail` → `verifyOtp({ type: 'recovery' })` → `updateUser({ password })`
- Ligar `recovering` antes do `verifyOtp`; nunca a limpar antes do `updateUser`
- Dashboard Supabase: template "Reset Password" com `{{ .Token }}`; OTP 600 s e 6 dígitos; "Require current password" desligado; SMTP Gmail próprio
- Validado nos builds 18–21. Por testar: email de outra pessoa

## Ligações
- [[02-Features/autenticacao-onboarding]]
- [[03-Decisoes/smtp-gmail]]
- [[04-Bugs/smtp-app-password-revogada]]
- [[05-Releases/v1.6.0]]
