create table if not exists public.leaderboard_entries (
  id uuid primary key default gen_random_uuid(),
  puid text not null,
  nickname text not null,
  scope_key text not null,
  mode text not null,
  code text,
  weapon text not null,
  completed_floors int not null check (completed_floors between 0 and 50),
  enemies_defeated int not null check (enemies_defeated between 0 and 100000),
  bosses_defeated int not null check (bosses_defeated between 0 and 1000),
  duration_ms bigint not null check (duration_ms between 0 and 604800000),
  hp_ratio numeric(4,3) not null check (hp_ratio between 0 and 1),
  gold int not null check (gold between 0 and 1000000),
  cleared boolean not null default false,
  score int not null check (score >= 0),
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (puid, scope_key)
);

-- The HTTP cloud function is the only writer. It recalculates scores and reads
-- the Hupu gateway identity before touching this table.
alter table public.leaderboard_entries disable row level security;
create index if not exists leaderboard_entries_scope_score_idx
  on public.leaderboard_entries (scope_key, score desc, duration_ms asc, submitted_at asc);
create index if not exists leaderboard_entries_scope_puid_idx
  on public.leaderboard_entries (scope_key, puid);

revoke all on table public.leaderboard_entries from public, anon, authenticated;
grant all on table public.leaderboard_entries to service_role;
grant usage on schema public to service_role;
