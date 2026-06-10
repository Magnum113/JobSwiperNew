-- Billing tables for one-time JobSwiper limit packs.
-- Apply once in Supabase SQL Editor before enabling payments in production.

create table if not exists public.billing_orders (
  id text primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  plan_id text not null,
  amount integer not null check (amount > 0),
  status text not null default 'created',
  tbank_payment_id text,
  payment_url text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists billing_orders_user_id_idx
  on public.billing_orders(user_id);

create index if not exists billing_orders_tbank_payment_id_idx
  on public.billing_orders(tbank_payment_id);

alter table public.billing_orders enable row level security;

create policy "billing_orders_select_own"
  on public.billing_orders
  for select
  to authenticated
  using (auth.uid() = user_id);

create table if not exists public.user_entitlements (
  id text primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  order_id text not null references public.billing_orders(id) on delete cascade,
  responses_total integer not null default 0 check (responses_total >= 0),
  analyses_total integer not null default 0 check (analyses_total >= 0),
  resumes_total integer not null default 0 check (resumes_total >= 0),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique(order_id)
);

create index if not exists user_entitlements_user_id_expires_at_idx
  on public.user_entitlements(user_id, expires_at);

alter table public.user_entitlements enable row level security;

create policy "user_entitlements_select_own"
  on public.user_entitlements
  for select
  to authenticated
  using (auth.uid() = user_id);

create table if not exists public.billing_events (
  id text primary key,
  order_id text references public.billing_orders(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists billing_events_order_id_created_at_idx
  on public.billing_events(order_id, created_at desc);

alter table public.billing_events enable row level security;

create policy "billing_events_select_own"
  on public.billing_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.billing_orders o
      where o.id = billing_events.order_id
        and o.user_id = auth.uid()
    )
  );
