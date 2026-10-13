-- Aplicado a 13 out 2026 (migração "create_dm_savings_accounts"), depois de
-- backup com npm run db:export. Registado aqui só como histórico: o projeto não
-- usa supabase/migrations, e este ficheiro não é aplicado por nenhuma ferramenta.
--
-- Produtos de poupança (depósitos a prazo, contas poupança, certificados de aforro).
-- Diferente de dm_saving_buckets, que são os Objetivos de Poupança (metas) do Orçamento.

create type public.dm_savings_kind as enum
  ('term_deposit', 'savings_account', 'savings_certificate', 'other');

create table public.dm_savings_accounts (
  id                text primary key default (gen_random_uuid())::text,
  user_id           uuid not null references auth.users(id) on delete cascade,
  kind              public.dm_savings_kind not null,
  name              text not null check (char_length(name) between 1 and 80),
  institution       text check (char_length(institution) <= 80),
  balance           numeric(10,2) not null check (balance >= 0),
  gross_rate        numeric(6,3)  not null check (gross_rate >= 0 and gross_rate <= 100),
  start_date        date not null,
  maturity_date     date check (maturity_date is null or maturity_date >= start_date),
  notes             text check (char_length(notes) <= 500),
  is_emergency_fund boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- no máximo um produto marcado como fundo de emergência por utilizador
create unique index dm_savings_accounts_one_emergency_fund
  on public.dm_savings_accounts (user_id) where is_emergency_fund;
create index dm_savings_accounts_user_id_idx on public.dm_savings_accounts (user_id);

alter table public.dm_savings_accounts enable row level security;
-- with check explícito, como as 8 políticas mais recentes (as 19 "_own" antigas não o têm;
-- sem ele o Postgres reaplica o using às escritas, o efeito é o mesmo).
create policy savings_accounts_own on public.dm_savings_accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger trg_dm_savings_accounts_updated_at
  before update on public.dm_savings_accounts
  for each row execute function public.update_updated_at();
