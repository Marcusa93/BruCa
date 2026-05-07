-- =====================================================================
-- BruCa Treasury System — Push Subscriptions
-- Tabla para almacenar suscripciones de Web Push (Web Push API + VAPID).
-- =====================================================================

create table if not exists public.push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  endpoint      text not null unique,
  p256dh_key    text not null,
  auth_key      text not null,
  user_agent    text,
  platform      text,             -- ej. "android-chrome", "ios-safari", "desktop-chrome"
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz not null default now()
);

create index if not exists idx_push_subs_user on public.push_subscriptions(user_id);
create index if not exists idx_push_subs_last_used on public.push_subscriptions(last_used_at desc);

alter table public.push_subscriptions enable row level security;

-- Cada usuario sólo accede a sus propias suscripciones
drop policy if exists push_subs_select on public.push_subscriptions;
create policy push_subs_select on public.push_subscriptions
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists push_subs_insert on public.push_subscriptions;
create policy push_subs_insert on public.push_subscriptions
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists push_subs_delete on public.push_subscriptions;
create policy push_subs_delete on public.push_subscriptions
  for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists push_subs_update on public.push_subscriptions;
create policy push_subs_update on public.push_subscriptions
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
