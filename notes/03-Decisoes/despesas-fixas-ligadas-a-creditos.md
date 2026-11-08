---
tipo: decisao
data: 2026-08-22
---
# Despesas fixas ligadas a créditos

**Contexto:** a prestação do carro existia como despesa fixa e como crédito; mudar o valor obrigava a editar dois sítios.
**Decisão:** `dm_recurring_expenses.credit_id` (FK nullable para `dm_credits`, `ON DELETE SET NULL`). Quando existe, o valor mostrado é sempre `dm_credits.monthly_payment`. Mesmo padrão de `dm_assets.credit_id`.
**Alternativas consideradas:** manter os dois valores independentes.
**Consequências:** não há UI para ligar/desligar — foi ligado à mão na BD (Peugeot 208 GT). "Marcar crédito como liquidado" tem de decidir o que acontece a esta despesa.

Ligações: [[02-Features/creditos-simulador]], [[02-Features/dashboard]]
