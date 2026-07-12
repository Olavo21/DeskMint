# DeskMint — Play Console Launch Checklist

**Package:** `com.deskmint.app` | **Version:** `1.0.0` | **versionCode:** `1`

---

## FASE 0 — Pré-requisitos (local)

- [ ] Build AAB de produção: `eas build --platform android --profile production`
- [ ] Keystore guardada em local seguro (EAS gere automaticamente — guardar no EAS dashboard)
- [ ] Ícone 512×512 px PNG sem transparência (para Store Listing)
- [ ] Feature Graphic 1024×500 px (banner da loja)
- [ ] Screenshots: mínimo 2, formato 1080×1920 px (ou equivalente 9:16)
- [ ] Texto curto ≤80 chars e longo ≤4000 chars em PT-PT

---

## FASE 1 — Criar App na Play Console

URL: https://play.google.com/console

- [ ] Criar app
- [ ] Nome da app: **DeskMint — Finanças Pessoais**
- [ ] Idioma padrão: Português (Portugal)
- [ ] Tipo: App (não jogo)
- [ ] Distribuição: Gratuita
- [ ] Aceitar políticas do programador Google Play

---

## FASE 2 — Configuração Obrigatória

### Acesso à app
- [ ] "Todas as funcionalidades disponíveis sem acesso especial"

### Classificação de conteúdo (IARC)
- [ ] Preencher questionário → categoria **Finanças**
- [ ] Responder "Não" a: violência, conteúdo sexual, gambling, drogas
- [ ] Classificação esperada: **E (Para todos)** / PEGI 3

### Audiência alvo
- [ ] Idade mínima: **18+** (app de finanças pessoais para adultos)
- [ ] Confirmar: NÃO dirigida a crianças

### Segurança de dados (Data Safety)
- [ ] **Dados recolhidos:**
  - Email / endereço (autenticação de conta)
  - Dados financeiros introduzidos pelo utilizador (receitas, despesas, investimentos)
- [ ] **Propósito:** Funcionalidade da app
- [ ] **Partilha com terceiros:** Não (Supabase é subcontratante, não partilha)
- [ ] **Encriptação em trânsito:** Sim (HTTPS/TLS)
- [ ] **Opção de eliminação de dados:** Sim — via email ferreiraolavo21@gmail.com

### Política de Privacidade
- [ ] URL: `https://olavo21.github.io/DeskMint/privacy.html`

### Declaração de app financeira (se solicitada)
- [ ] NÃO é app de empréstimos pessoais
- [ ] NÃO oferece produtos de investimento regulados
- [ ] É uma ferramenta de **gestão financeira pessoal** (Personal Finance Manager)

---

## FASE 3 — Store Listing

### Textos
- [ ] **Título:** `DeskMint — Finanças Pessoais`
- [ ] **Título curto:** `DeskMint` (≤30 chars)
- [ ] **Descrição curta** (≤80 chars):
  > Orçamento · Poupança · Investimento — controla o teu dinheiro.
- [ ] **Descrição longa** (≤4000 chars):

```
Toma o controlo das tuas finanças pessoais com o DeskMint.

📊 ORÇAMENTO INTELIGENTE
Regista receitas e despesas, segue a regra 50/30/20 personalizada
e visualiza como distribuís o teu rendimento mensal em tempo real.

📈 SIMULADOR DE LONGO PRAZO
Calcula a projeção do teu património com juros compostos reais,
com base no teu perfil de investidor e horizonte temporal.

💼 INVESTIMENTOS E ATIVOS
Acompanha o teu portefólio de ETFs, ações e cripto. Regista ativos,
créditos vinculados e o teu fundo de emergência.

🔔 ALERTAS INTELIGENTES
Notificações automáticas quando o orçamento está em desequilíbrio
ou o saldo disponível é crítico.

🎯 PERFIL DE INVESTIDOR
Define o teu tipo de investidor (Conservador a Especulativo),
objetivo e horizonte, e deixa a app calcular as metas certas para ti.

Desenvolvido em Portugal para quem quer construir riqueza de forma
simples e consciente.
```

### Recursos visuais
- [ ] Ícone 512×512 px (PNG, sem transparência)
- [ ] Feature Graphic 1024×500 px
- [ ] Mínimo 2 screenshots de telemóvel (9:16)
- [ ] (Opcional) Vídeo de apresentação no YouTube

### Categorização
- [ ] Categoria: **Finanças**
- [ ] Tags sugeridas: finanças pessoais, orçamento, poupança, investimento
- [ ] Email de contacto: ferreiraolavo21@gmail.com
- [ ] URL da política de privacidade: `https://olavo21.github.io/DeskMint/privacy.html`

---

## FASE 4 — Internal Testing (primeiro upload)

- [ ] Releases → **Internal Testing** → Criar release
- [ ] Upload do ficheiro `.aab` gerado pelo `eas build`
- [ ] Nome da release: `1.0.0 — Founders Preview`
- [ ] Notas da release (PT):
  > Primeira versão da app DeskMint para testes internos.
  > Inclui: dashboard financeiro, simulador de longo prazo, perfil de
  > investidor, onboarding, notificações e gestão de ativos e créditos.
- [ ] Rever e publicar no Internal Testing
- [ ] Adicionar emails de testers internos (teus + mais alguns)

---

## FASE 5 — Closed Testing (obrigatório para produção)

> ⚠️ A Google exige um mínimo de **20 testers activos durante 14 dias corridos**
> no Closed Testing antes de autorizar o acesso à produção.

- [ ] Releases → **Closed Testing** → Criar track (ex: "Founders")
- [ ] Adicionar lista de 20+ emails de testers
- [ ] Promover build do Internal Testing → Closed Testing
- [ ] Publicar e aguardar aprovação inicial (**3–7 dias úteis**)
- [ ] Confirmar que os 20 testers instalaram e usaram a app
- [ ] Aguardar os 14 dias corridos de período de teste
- [ ] Recolher feedback e corrigir eventuais problemas

### Lista de testers sugerida
- Contactos pessoais de confiança
- Os utilizadores Founders actuais (Ricardo, Nani, Hélder, Francisca)
- Completar até 20 com conhecidos dispostos a testar

---

## FASE 6 — Produção

- [ ] Após 14 dias + ≥20 testers → Releases → **Production**
- [ ] Rollout gradual: começar em **10%**
- [ ] Monitorizar **Android Vitals** (crashes, ANRs) nas primeiras 48h
- [ ] Rever os primeiros reviews e responder
- [ ] Aumentar para **100%** ao fim de 48–72h sem regressões críticas

---

## Referências rápidas

| Campo | Valor |
|---|---|
| Package name | `com.deskmint.app` |
| Version name | `1.0.0` |
| Version code | `1` |
| Privacy policy | `https://olavo21.github.io/DeskMint/privacy.html` |
| Terms of service | `https://olavo21.github.io/DeskMint/terms.html` |
| Email de contacto | `ferreiraolavo21@gmail.com` |
| EAS Project ID | `727241b8-4cd7-4649-bf85-112899526204` |
