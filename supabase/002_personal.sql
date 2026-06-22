-- ════════════════════════════════════════════════════════════════════════════
-- 002_personal.sql — Données perso synchronisées (RLS auth.uid())
--
-- ⚠️ Reconstruit depuis CLAUDE.md + les colonnes utilisées par src/sync.js :
--      day_logs    : (user_id, iso, data)   data = { picks, skipBreakfast }
--      weight_logs : (user_id, iso, kg)
--      app_state   : (user_id, data)        un seul bloc par user
--    Chaque ligne n'est lisible/écrivable que par son propriétaire (auth.uid()).
--    Diffe contre ta base existante avant d'appliquer en prod.
-- ════════════════════════════════════════════════════════════════════════════

-- Journal de repas : une ligne par jour
create table if not exists public.day_logs (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  iso        date        not null,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, iso)
);

-- Poids : une ligne par jour
create table if not exists public.weight_logs (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  iso        date        not null,
  kg         numeric     not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, iso)
);

-- État applicatif : un seul bloc par user (settings, templates, customMeals,
-- usage, combos, shakeBases, shakeLiquids, comboSeed, favs, customRecipes…)
create table if not exists public.app_state (
  user_id    uuid        primary key references auth.users (id) on delete cascade,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Index pour le tri/lecture par date
create index if not exists day_logs_user_iso_idx    on public.day_logs    (user_id, iso desc);
create index if not exists weight_logs_user_iso_idx on public.weight_logs (user_id, iso desc);

-- updated_at automatique
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists day_logs_updated_at    on public.day_logs;
create trigger day_logs_updated_at    before update on public.day_logs    for each row execute function public.set_updated_at();

drop trigger if exists weight_logs_updated_at on public.weight_logs;
create trigger weight_logs_updated_at before update on public.weight_logs for each row execute function public.set_updated_at();

drop trigger if exists app_state_updated_at   on public.app_state;
create trigger app_state_updated_at   before update on public.app_state   for each row execute function public.set_updated_at();

-- RLS : chacun ne voit/écrit que ses lignes
alter table public.day_logs    enable row level security;
alter table public.weight_logs enable row level security;
alter table public.app_state   enable row level security;

drop policy if exists "day_logs perso"    on public.day_logs;
create policy "day_logs perso"    on public.day_logs    for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "weight_logs perso" on public.weight_logs;
create policy "weight_logs perso" on public.weight_logs for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "app_state perso"   on public.app_state;
create policy "app_state perso"   on public.app_state   for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
