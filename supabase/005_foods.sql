-- ════════════════════════════════════════════════════════════════════════════
-- 005_foods.sql — Catalogue d'aliments unifié (master data en BDD)
--
-- UNIFIE TOUT le master data : remplace à terme src/meals.js (la pioche),
-- src/nutrition.js (constantes Bulk), ET les tables recipes + presets. Une seule
-- source de vérité, lisible anon, éditable par l'utilisateur authentifié (→ futur
-- formulaire admin web). Le `kind` distingue food | supplement | extra | recipe.
-- Modèle « unit-aware » : chaque produit déclare son unité naturelle (portion / g /
-- ml / dose) et ses raccourcis de service, donc les règles de calcul doses/verres/
-- portions vivent dans la DATA, pas dans le code.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.foods (
  id             text primary key,            -- slug stable et lisible
  name           text    not null,
  cat            text,                         -- créneau principal (pdj|dej|diner|snack)
  slots          text[]  not null default '{}',
  tags           text[]  not null default '{}',
  kind           text    not null default 'food',     -- food | supplement | extra | recipe
  unit           text    not null default 'portion',  -- portion | g | ml | dose
  per            numeric not null default 1,          -- les macros sont pour `per` `unit`
  kcal           numeric not null,
  p              numeric not null,
  c              numeric,
  f              numeric,
  default_amount numeric,                              -- quantité suggérée au log (dans `unit`)
  servings       jsonb   not null default '[]'::jsonb, -- [{label, amount, unit}] ou [{label, factor}]
  -- propres aux recettes (kind = 'recipe')
  emoji          text,
  quick          boolean not null default false,
  ingredients    jsonb   not null default '[]'::jsonb,
  steps          jsonb   not null default '[]'::jsonb,
  descr          text,
  sort           int     not null default 0
);

create index if not exists foods_kind_idx on public.foods (kind, sort);

alter table public.foods enable row level security;

drop policy if exists "foods lisibles par tous" on public.foods;
create policy "foods lisibles par tous" on public.foods for select using (true);

drop policy if exists "foods modifiables si connecté" on public.foods;
create policy "foods modifiables si connecté" on public.foods
  for all to authenticated using (true) with check (true);
