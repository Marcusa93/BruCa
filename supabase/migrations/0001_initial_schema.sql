-- =====================================================================
-- BruCa Treasury System — Migración inicial
-- =====================================================================
-- Modelo ajustado tras leer la planilla TESORO.xlsx:
--   * Inversores con devolución comprometida a fecha cierta.
--   * Operaciones tipadas (cheques, FX efectivo, USDT, otros).
--   * Tesorería real con conteo por denominación.
--   * Movimientos de caja generados por las operaciones.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ========== ENUMS ==========

create type currency as enum ('ARS', 'USD', 'EUR', 'BRL');
create type investment_status as enum ('active','partially_placed','fully_placed','returned','cancelled');
create type placement_status as enum ('active','near_due','overdue','in_default','collected','reinvested','cancelled');
create type operation_kind as enum ('fx_buy','fx_sell','crypto_buy','crypto_sell','check_purchase','other');
create type payment_direction as enum ('incoming','outgoing');
create type payment_concept as enum ('principal','interest','mixed','fee');
create type guarantee_type as enum ('check','property','vehicle','personal','other');

-- ========== HELPER: updated_at ==========

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ========== INVESTORS ==========

create table public.investors (
  id              uuid primary key default gen_random_uuid(),
  full_name       text not null,
  document_type   text,
  document_number text,
  email           text,
  phone           text,
  notes           text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger trg_investors_touch before update on public.investors
  for each row execute function public.touch_updated_at();

-- ========== GUARANTEES ==========

create table public.guarantees (
  id              uuid primary key default gen_random_uuid(),
  type            guarantee_type not null,
  description     text,
  estimated_value numeric(18,2),
  currency        currency,
  holder          text,
  document_url    text,
  created_at      timestamptz not null default now()
);

-- ========== INVESTMENTS ==========

create table public.investments (
  id                       uuid primary key default gen_random_uuid(),
  investor_id              uuid not null references public.investors(id) on delete restrict,
  currency                 currency not null,
  amount                   numeric(18,2) not null check (amount > 0),
  entry_date               date not null,
  estimated_term_days      int check (estimated_term_days is null or estimated_term_days > 0),
  monthly_rate             numeric(7,6) not null default 0,
  committed_return_amount  numeric(18,2),
  committed_return_date    date,
  guarantee_id             uuid references public.guarantees(id) on delete set null,
  status                   investment_status not null default 'active',
  notes                    text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index idx_investments_investor on public.investments(investor_id);
create index idx_investments_status on public.investments(status);
create index idx_investments_committed_date on public.investments(committed_return_date);

create trigger trg_investments_touch before update on public.investments
  for each row execute function public.touch_updated_at();

-- ========== OPERATIONS (placements) ==========

create table public.operations (
  id                 uuid primary key default gen_random_uuid(),
  kind               operation_kind not null,
  counterparty       text,
  currency           currency not null,
  amount             numeric(18,2) not null check (amount > 0),
  start_date         date not null,
  due_date           date,
  term_days          int generated always as (
    case when due_date is null then null
         else (due_date - start_date)::int
    end
  ) stored,
  monthly_rate       numeric(7,6),
  expected_return    numeric(18,2),
  expected_total     numeric(18,2),
  actual_return      numeric(18,2),
  actual_total       numeric(18,2),
  status             placement_status not null default 'active',
  guarantee_id       uuid references public.guarantees(id) on delete set null,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index idx_operations_status on public.operations(status);
create index idx_operations_due_date on public.operations(due_date);
create index idx_operations_kind on public.operations(kind);

create trigger trg_operations_touch before update on public.operations
  for each row execute function public.touch_updated_at();

-- ========== CHECKS (detalle de cheques comprados) ==========

create table public.checks (
  id              uuid primary key default gen_random_uuid(),
  operation_id    uuid not null unique references public.operations(id) on delete cascade,
  check_number    text,
  bank            text,
  drawer          text,
  paid_amount     numeric(18,2) not null,
  face_value      numeric(18,2) not null check (face_value >= paid_amount),
  due_date        date not null,
  notes           text,
  created_at      timestamptz not null default now()
);

create index idx_checks_due_date on public.checks(due_date);

-- ========== FX & CRYPTO TRADES (detalle de compraventa) ==========

create table public.fx_trades (
  id              uuid primary key default gen_random_uuid(),
  operation_id    uuid not null unique references public.operations(id) on delete cascade,
  side            text not null check (side in ('buy','sell')),
  asset           text not null,                 -- 'USD','USDT','EUR'...
  quote_currency  currency not null default 'ARS',
  unit_price      numeric(18,4) not null,
  units           numeric(18,4) not null,
  notes           text
);

-- ========== INVESTMENT ↔ OPERATION (asignación N:M opcional) ==========

create table public.investment_operations (
  id                uuid primary key default gen_random_uuid(),
  investment_id     uuid not null references public.investments(id) on delete cascade,
  operation_id      uuid not null references public.operations(id) on delete cascade,
  allocated_amount  numeric(18,2) not null check (allocated_amount > 0),
  created_at        timestamptz not null default now(),
  unique (investment_id, operation_id)
);

create index idx_invop_inv on public.investment_operations(investment_id);
create index idx_invop_op  on public.investment_operations(operation_id);

-- ========== PAYMENTS (movimientos de cobro / pago lógicos) ==========

create table public.payments (
  id              uuid primary key default gen_random_uuid(),
  operation_id    uuid references public.operations(id) on delete set null,
  investment_id   uuid references public.investments(id) on delete set null,
  direction       payment_direction not null,
  concept         payment_concept not null,
  amount          numeric(18,2) not null check (amount > 0),
  currency        currency not null,
  payment_date    date not null,
  notes           text,
  created_at      timestamptz not null default now(),
  check (operation_id is not null or investment_id is not null)
);

create index idx_payments_date on public.payments(payment_date);
create index idx_payments_op on public.payments(operation_id);
create index idx_payments_inv on public.payments(investment_id);

-- ========== REINVESTMENTS ==========

create table public.reinvestments (
  id                     uuid primary key default gen_random_uuid(),
  source_operation_id    uuid references public.operations(id) on delete set null,
  source_investment_id   uuid references public.investments(id) on delete set null,
  target_operation_id    uuid not null references public.operations(id) on delete cascade,
  amount                 numeric(18,2) not null,
  includes_principal     boolean not null default true,
  includes_interest      boolean not null default true,
  reinvested_at          date not null,
  notes                  text,
  created_at             timestamptz not null default now()
);

-- ========== TESORERÍA ==========

create table public.denominations (
  id        uuid primary key default gen_random_uuid(),
  currency  currency not null,
  value     numeric(18,2) not null check (value > 0),
  is_active boolean not null default true,
  unique (currency, value)
);

-- Catálogo inicial — alineado con tu planilla TESORO
insert into public.denominations (currency, value) values
  ('ARS', 20000),('ARS', 10000),('ARS', 2000),('ARS', 1000),('ARS', 500),
  ('ARS', 200),('ARS', 100),('ARS', 50),('ARS', 20),('ARS', 10),
  ('USD', 100),('USD', 50),('USD', 20),('USD', 10),('USD', 5),('USD', 2),('USD', 1),
  ('EUR', 500),('EUR', 200),('EUR', 100),('EUR', 50),('EUR', 20),('EUR', 10),('EUR', 5),
  ('BRL', 100),('BRL', 50),('BRL', 20),('BRL', 10),('BRL', 5),('BRL', 2),('BRL', 1);

create table public.cash_counts (
  id          uuid primary key default gen_random_uuid(),
  count_date  date not null,
  notes       text,
  created_by  uuid,
  created_at  timestamptz not null default now()
);

create index idx_cash_counts_date on public.cash_counts(count_date desc);

create table public.cash_count_lines (
  id             uuid primary key default gen_random_uuid(),
  cash_count_id  uuid not null references public.cash_counts(id) on delete cascade,
  denomination_id uuid not null references public.denominations(id) on delete restrict,
  bundles        int not null default 0 check (bundles >= 0),  -- "fajos" (típicamente 100)
  loose          int not null default 0 check (loose >= 0),    -- billetes sueltos
  bundle_size    int not null default 100 check (bundle_size > 0),
  total_units    int generated always as (bundles * bundle_size + loose) stored,
  unique (cash_count_id, denomination_id)
);

create table public.cash_movements (
  id             uuid primary key default gen_random_uuid(),
  operation_id   uuid references public.operations(id) on delete set null,
  payment_id     uuid references public.payments(id) on delete set null,
  direction      payment_direction not null,
  currency       currency not null,
  amount         numeric(18,2) not null check (amount > 0),
  movement_date  date not null,
  notes          text,
  created_at     timestamptz not null default now()
);

create index idx_cash_mov_date on public.cash_movements(movement_date desc);

-- ========== ASSISTANT LOGS ==========

create table public.assistant_logs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid,
  prompt         text not null,
  response       text,
  tool_calls     jsonb,
  tokens_input   int,
  tokens_output  int,
  created_at     timestamptz not null default now()
);

create index idx_assistant_logs_date on public.assistant_logs(created_at desc);

-- ========== VISTAS ÚTILES ==========

-- Saldo por moneda según último arqueo
create view public.v_treasury_latest as
with latest as (
  select cc.id, cc.count_date
  from public.cash_counts cc
  order by cc.count_date desc, cc.created_at desc
  limit 1
)
select
  d.currency,
  sum(l.total_units * d.value) as total_amount,
  (select count_date from latest) as count_date
from public.cash_count_lines l
join latest cc on cc.id = l.cash_count_id
join public.denominations d on d.id = l.denomination_id
group by d.currency;

-- Operaciones enriquecidas con días restantes
create view public.v_operations_enriched as
select
  o.*,
  case
    when o.due_date is null then null
    else (o.due_date - current_date)::int
  end as days_until_due
from public.operations o;

-- KPIs agregados por moneda
create view public.v_dashboard_kpis as
select
  i.currency,
  sum(case when i.status in ('active','partially_placed','fully_placed') then i.amount else 0 end) as capital_received,
  sum(case when i.status in ('active','partially_placed','fully_placed') then coalesce(i.committed_return_amount, i.amount) else 0 end) as committed_return
from public.investments i
group by i.currency;

-- ========== RLS — v1: usuario único compartido ==========

alter table public.investors             enable row level security;
alter table public.investments           enable row level security;
alter table public.operations            enable row level security;
alter table public.checks                enable row level security;
alter table public.fx_trades             enable row level security;
alter table public.investment_operations enable row level security;
alter table public.payments              enable row level security;
alter table public.reinvestments         enable row level security;
alter table public.guarantees            enable row level security;
alter table public.denominations         enable row level security;
alter table public.cash_counts           enable row level security;
alter table public.cash_count_lines      enable row level security;
alter table public.cash_movements        enable row level security;
alter table public.assistant_logs        enable row level security;

-- Política temporal: cualquier usuario autenticado tiene acceso completo.
-- Cuando se separen los dueños, agregar columna owner_id y refinar.
do $$
declare t text;
begin
  for t in select unnest(array[
    'investors','investments','operations','checks','fx_trades',
    'investment_operations','payments','reinvestments','guarantees',
    'denominations','cash_counts','cash_count_lines','cash_movements','assistant_logs'
  ])
  loop
    execute format('create policy %I_rw on public.%I for all to authenticated using (true) with check (true);', t, t);
  end loop;
end $$;

-- Lectura pública de denominaciones (no es sensible)
create policy denominations_read_anon on public.denominations
  for select to anon using (true);
