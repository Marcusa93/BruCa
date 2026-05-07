-- =====================================================================
-- BruCa Treasury System — Contrapartes
-- Registro central de contrapartes (vendedores de cheques, contrapartes de
-- compraventa de USD/USDT). Distintas de "investors" que son los clientes
-- que aportan capital.
-- =====================================================================

do $$ begin
  if not exists (select 1 from pg_type where typname = 'counterparty_risk') then
    create type counterparty_risk as enum ('low','normal','high');
  end if;
end $$;

create table if not exists public.counterparties (
  id              uuid primary key default gen_random_uuid(),
  full_name       text not null,
  alias           text,
  document_type   text,
  document_number text,
  email           text,
  phone           text,
  bank            text,
  notes           text,
  risk_level      counterparty_risk not null default 'normal',
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_counterparties_active on public.counterparties(is_active);
create index if not exists idx_counterparties_name on public.counterparties(full_name);

create trigger trg_counterparties_touch before update on public.counterparties
  for each row execute function public.touch_updated_at();

-- Vincular operaciones con contrapartes (FK opcional; mantenemos también el
-- texto plano `operations.counterparty` para mostrar y para casos puntuales)
alter table public.operations
  add column if not exists counterparty_id uuid references public.counterparties(id) on delete set null;

create index if not exists idx_operations_counterparty on public.operations(counterparty_id);

alter table public.counterparties enable row level security;

drop policy if exists counterparties_rw on public.counterparties;
create policy counterparties_rw on public.counterparties
  for all to authenticated using (true) with check (true);
