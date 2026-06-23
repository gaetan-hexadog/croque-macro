-- 009_lock_catalog.sql
-- Multi-utilisateur : le catalogue partagé (foods / recipes / presets) doit rester
-- LISIBLE par tous mais MODIFIABLE par toi seul (admin). Sans ça, n'importe quel
-- compte connecté pouvait éditer/supprimer la pioche et les recettes communes.
--
-- ⚠️ AVANT D'EXÉCUTER : remplace la valeur de admin_uid ci-dessous par TON user id.
--    Où le trouver : Supabase → Authentication → Users → clique sur ton compte → "User UID".
--    (ou, connecté dans l'app, exécute `select auth.uid();` dans le SQL editor.)

-- On centralise l'uid admin dans une petite fonction → un seul endroit à changer.
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid  -- ← REMPLACE par ton User UID
$$;

-- ── foods ───────────────────────────────────────────────────────────────────
drop policy if exists "foods modifiables si connecté" on public.foods;
drop policy if exists "foods lisibles par tous"       on public.foods;
create policy "foods lisibles par tous"     on public.foods for select using (true);
create policy "foods modifiables par admin" on public.foods for all
  using (public.is_admin()) with check (public.is_admin());

-- ── recipes (legacy) ─────────────────────────────────────────────────────────
drop policy if exists "recipes modifiables si connecté" on public.recipes;
drop policy if exists "recipes lisibles par tous"       on public.recipes;
create policy "recipes lisibles par tous"     on public.recipes for select using (true);
create policy "recipes modifiables par admin" on public.recipes for all
  using (public.is_admin()) with check (public.is_admin());

-- ── presets (legacy) ─────────────────────────────────────────────────────────
drop policy if exists "presets modifiables si connecté" on public.presets;
drop policy if exists "presets lisibles par tous"       on public.presets;
create policy "presets lisibles par tous"     on public.presets for select using (true);
create policy "presets modifiables par admin" on public.presets for all
  using (public.is_admin()) with check (public.is_admin());
