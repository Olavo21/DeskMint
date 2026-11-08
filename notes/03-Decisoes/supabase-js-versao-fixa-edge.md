---
tipo: decisao
data: 2026-09-17
---
# Edge Functions: supabase-js fixo e generic Database

**Contexto:** as edge functions importam `npm:@supabase/supabase-js` sem versão; o `deno check` resolvia "latest" (2.116.0) e dava falsos erros de tipo, e sem `Database` o `.update()`/`.insert()` colapsava para `never`.
**Decisão:** no `investment-chat`: `npm:@supabase/supabase-js@2.45.0`, `createClient<Database>(...)`, `type SB = ReturnType<typeof createClient<Database>>`. Replicar nas outras functions quando for preciso confiar no `deno check`.
**Alternativas consideradas:** ignorar os erros do `deno check`.
**Consequências:** `deno check --node-modules-dir=auto` corre a zero erros. `types/database.ts` ainda não tem `dm_fundamentals_cache`.
