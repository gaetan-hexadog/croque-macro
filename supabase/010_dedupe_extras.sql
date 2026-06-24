-- 010_dedupe_extras.sql
-- Dédoublonnage du catalogue `foods` : 4 produits Bulk existaient à la fois en
-- `extra` ET en `supplement` (mêmes macros → ils apparaissaient dans deux sections).
-- On GARDE les versions « supplement » (bv1–bv4) et on supprime les clones « extra ».
--
-- Aucun impact sur tes données perso : le frigo (app_state) et l'historique
-- (day_logs) stockent des instantanés {nom, kcal, p} indépendants de `foods`.

delete from public.foods
where id in (
  'extra-barre-gourmet-vegane-bulk',
  'extra-brownie-vegan-bulk',
  'extra-blondie-vegan-bulk',
  'extra-clear-vegan-bulk-1-dose'
);
