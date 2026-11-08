---
tipo: decisao
data: 2026-11-08
---
# Veredito da Análise: na 1.7.0 entra só o texto, a regra fica no backlog

**Contexto:** a NVDA tem 7 verdes, 1 laranja e 1 vermelho (Beta) e fica em "Qualidade moderada", porque `computeVerdict` exige zero vermelhos para "Qualidade alta". O ecrã não diz porquê. Ver [[01-Ideias/veredito-qualidade-vs-risco]].
**Decisão:**
- **Regra:** não muda. Separar qualidade de risco fica no backlog, com a ideia em `a-avaliar`.
- **Texto, na 1.7.0:** quando há vermelhos, o veredito passa a dizer que métricas o impediram de subir (ex.: "Qualidade moderada · Beta muito volátil").
**Alternativas consideradas:**
- *Mudar a regra na 1.7.0:* a 1.7.0 deve ter uma única fonte de risco, o [[02-Features/finnhub-proxy]]. E a regra ainda tem decisões em aberto: onde fica a Dív./Capital, e se o Beta conta para o veredito ou só aparece ao lado.
- *Deixar tudo para depois:* a 1.7.0 já vai ter build, e o texto não mexe na origem dos dados. Se partir, vê-se logo no ecrã e não se confunde com um problema do proxy.
**Consequências:** o utilizador passa a perceber porque é que o veredito ficou abaixo do que os verdes sugerem, sem a regra mudar. Quando a regra for revista, o texto tem de ser revisto com ela.

Ligações: [[02-Features/analise-fundamentalista]], [[01-Ideias/veredito-qualidade-vs-risco]], [[02-Features/finnhub-proxy]]
