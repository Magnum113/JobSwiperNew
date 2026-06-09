-- hh.ru applicant OAuth connections.
--
-- Stores the per-user hh.ru access/refresh tokens obtained via the
-- authorization_code flow so the app can pull and (re)import the user's resumes
-- after sign-in. Mirrors the access model of the other JobSwiper tables: the row
-- is reached only from server-side /api routes using the Supabase publishable
-- key (PostgREST role `anon`); the browser never talks to Supabase directly.
--
-- `user_id` matches AppAuthUser.id — the deterministic UUID produced by
-- stableProviderUserId("hh", <hh user id>) — so a returning hh.ru user always
-- maps to the same account row.

create table if not exists public.hh_connections (
  user_id       text primary key,
  hh_user_id    text not null,
  access_token  text not null,
  refresh_token text,
  expires_at    timestamptz not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.hh_connections enable row level security;

-- Same permissive policy the rest of the app relies on (access is gated by the
-- server, which holds the publishable key; tighten alongside the other tables
-- when the final guest/auth RLS model is decided — see architecture.md §8.1).
drop policy if exists anon_all_hh_connections on public.hh_connections;
create policy anon_all_hh_connections
  on public.hh_connections
  for all
  to anon
  using (true)
  with check (true);
