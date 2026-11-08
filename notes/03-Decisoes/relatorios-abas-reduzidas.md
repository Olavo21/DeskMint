---
tipo: decisao
data: 2026-10-02
---
# Relatórios: abas reduzidas, "Desde sempre" como placeholder

**Contexto:** as abas Pendentes e Semana repetiam (ou quase) o ecrã de Comissões; com 9 comissões em 4 meses, vistas de período longo seriam ruído.
**Decisão:** ficam só Mês e "Desde sempre". "Desde sempre" mostra um número: comissões faturadas (exclui `CANCELLED`), calculado com `groupByType()`.
**Alternativas consideradas:** tendência, composição por valor, sazonalidade, velocidade de pagamento — adiadas até haver volume.
**Consequências:** perdeu-se a vista semanal (código no commit `584467e`). A questão "Desde sempre" não está resolvida, só adiada.

Ligações: [[02-Features/relatorios]]
