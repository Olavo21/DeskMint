---
tipo: bug
estado: aberto
sentry: 
criado: 2026-11-08
---
# Análise fundamentalista sempre em português

**Como reproduzir:** Definições → língua inglês (ou espanhol) → Investimentos → um ativo → Análise.
**Esperado vs. atual:** esperado o ecrã na língua escolhida; atual tudo em português ("Qualidade moderada", "Excelente", "Muito volátil", "Métricas fundamentais"…). Bug em produção desde que o ecrã existe, não é consequência do texto novo do veredito.
**Causa:** nem `lib/fundamentalsMetrics.ts` nem `components/investments/FundamentalsModal.tsx` usam `t()` (zero ocorrências de `t(`, `useTranslation` ou `i18n` nos dois, verificado a 8 nov 2026). Os números também estão presos a `pt-PT`: `fmtMetricValue` usa `toLocaleString('pt-PT')` e a calculadora formata dinheiro com `'pt-PT'` + `' €'` fixo.

**Contagem das strings fixas (8 nov 2026):**

| Onde | Strings | Notas |
|---|---|---|
| Rótulos dos semáforos (`getLightLabel`) | 27 | 3 por métrica × 9; 21 textos diferentes ("Bom", "Excelente", "Fraco" e "Razoável" repetem-se) |
| Veredito (`computeVerdict`) | 6 | 3 rótulos + 3 subtítulos; o de "Fragilidades" tem plural interpolado |
| **Subtotal semáforos + veredito** | **33** | |
| Fichas de informação de cada métrica (`description`, `formula`, `good`, `bad`, `example`) | 45 | textos longos, com exemplos em € |
| Rótulos e nomes em português (`Margem Op.`, `Dív./Capital`, `Receita/Emp.`, e os `fullName` em português) | ~8 | P/E, PEG, ROE, ROIC, EV/EBITDA e Beta são universais; alguns `fullName` já estão em inglês, outros em português |
| Placeholders (`ex: …`) | 9 + 2 no modal | |
| Resto do `FundamentalsModal` (abas, "Métricas fundamentais", "positivos", "críticos", "por empregado", "Fórmula", "Mau quando", "Exemplo", calculadora, aviso de teto, "Registar compra", erro do "Auto") | ~30 | contagem aproximada |

**Decidido a 8 nov 2026:**
- **1.7.0: semáforos + veredito (33 strings), confirmado.** Estão acopladas ao item do veredito da 1.7.0: o sufixo novo é "veredito · métrica + rótulo do semáforo", e o critério "os mesmos casos com a app em inglês" só passa se os dois já estiverem no `t()`. O ficheiro já vai ser mexido nesse build
- **Backlog: o resto (~95 strings e os formatos `pt-PT`)**, como item próprio. As fichas de informação são texto longo, com exemplos em €, e precisam de tradução a sério, não de uma passagem mecânica

**Como fazer o item do backlog:** as 45 strings das fichas são a parte delicada (exemplos em € e tom didático). Primeiro, exportá-las de `lib/fundamentalsMetrics.ts` para um ficheiro (por métrica: `description`, `formula`, `good`, `bad`, `example`) e mandá-lo ao Claude da conversa de produto, que as traduz nos três idiomas com os exemplos adaptados à moeda. Depois é só metê-las no `t()`. O resto do modal e os formatos `pt-PT` podem ser feitos diretamente

**Nota técnica:** `lib/fundamentalsMetrics.ts` não é um componente. Ou devolve chaves de tradução e o modal faz o `t()`, ou usa o `i18n.t` de `lib/i18n.ts`. A primeira opção mantém o ficheiro puro e mostra a língua certa quando ela muda com o ecrã aberto.

Ligações: [[02-Features/analise-fundamentalista]], [[03-Decisoes/veredito-texto-antes-da-regra]], [[02-Features/finnhub-proxy]]
