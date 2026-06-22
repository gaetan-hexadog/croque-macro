-- ════════════════════════════════════════════════════════════════════════════
-- 001_init.sql — Bibliothèque publique (recettes + presets)
--
-- ⚠️ Reconstruit depuis le schéma documenté (CLAUDE.md) et les colonnes réellement
--    lues par le code (src/library.js : recipes/presets ; ordre par `sort`).
--    Diffe contre ta base existante avant d'appliquer en prod.
--
-- Lecture publique via la clé anon (RLS) ; écriture réservée aux utilisateurs
-- authentifiés (toi). Le seed des données vit dans 003_seed_library.sql.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.recipes (
  id          text primary key,
  cat         text    not null,                       -- pdj | dej | diner | snack
  name        text    not null,
  emoji       text,
  kcal        integer not null,
  p           integer not null,                        -- protéines (g)
  quick       boolean not null default false,
  descr       text,
  ingredients jsonb   not null default '[]'::jsonb,
  steps       jsonb   not null default '[]'::jsonb,
  sort        integer not null default 0
);

create table if not exists public.presets (
  id   bigint generated always as identity primary key,
  cat  text    not null,
  name text    not null,
  kcal integer not null,
  p    integer not null,
  sort integer not null default 0
);

alter table public.recipes enable row level security;
alter table public.presets enable row level security;

-- Lecture publique (clé anon)
drop policy if exists "recipes lisibles par tous" on public.recipes;
create policy "recipes lisibles par tous" on public.recipes for select using (true);

drop policy if exists "presets lisibles par tous" on public.presets;
create policy "presets lisibles par tous" on public.presets for select using (true);

-- Écriture réservée aux utilisateurs connectés
drop policy if exists "recipes modifiables si connecté" on public.recipes;
create policy "recipes modifiables si connecté" on public.recipes
  for all to authenticated using (true) with check (true);

drop policy if exists "presets modifiables si connecté" on public.presets;
create policy "presets modifiables si connecté" on public.presets
  for all to authenticated using (true) with check (true);
