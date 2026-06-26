-- ════════════════════════════════════════════════════════════════════════════
--  013_drop_legacy_catalog.sql — supprime les tables legacy `recipes` et `presets`.
--
--  Contexte : 005_foods.sql a UNIFIÉ tout le master data dans `public.foods`
--  (kind = food | supplement | extra | recipe). Depuis, l'app lit UNIQUEMENT `foods`
--  (src/lib/library.js). Les tables `recipes` et `presets` ne sont plus lues par
--  personne → code mort en base. On les retire pour clarifier la source de vérité.
--
--  ⚠️  Vérifie d'abord qu'aucune de tes données vivantes n'est UNIQUEMENT dans
--      ces tables (l'app ne les utilise pas, mais un vieux script peut-être) :
--        select count(*) from public.recipes;
--        select count(*) from public.presets;
--      Les recettes vivantes sont dans foods : select count(*) from public.foods where kind='recipe';
--
--  is_admin() est CONSERVÉE — la policy d'écriture de `foods` s'en sert toujours.
-- ════════════════════════════════════════════════════════════════════════════

drop table if exists public.recipes cascade;
drop table if exists public.presets cascade;
