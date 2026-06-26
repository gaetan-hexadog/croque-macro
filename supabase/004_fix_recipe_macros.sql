-- ════════════════════════════════════════════════════════════════════════════
--  004_fix_recipe_macros.sql — corrige des incohérences kcal/protéines repérées
--  par audit sur des recettes au skyr / amande.
--
--  ⚠️  VALEURS ESTIMÉES — à VÉRIFIER avant exécution. Calculées à partir d'ingrédients
--  courants (skyr soja ~60 kcal / 10 g prot /100 g ; lait d'amande ~13 kcal / 0,4 g /250 ml ;
--  pâtes crues ~370 kcal / 12 g /100 g ; pesto ~520 kcal / 5 g /100 g ; muesli ~360 /100 g).
--  Lance ligne par ligne, ajuste si tu connais les vraies valeurs de tes produits.
--
--  Après exécution : régénère library.snapshot.js (bootstrap GÉNÉRÉ) pour que le cache
--  offline reflète les corrections — sinon l'app affiche l'ancien snapshot jusqu'au refresh.
-- ════════════════════════════════════════════════════════════════════════════

-- 🔴 CONFIANT — Coleslaw au skyr : 150 g de skyr soja seul ≈ 15 g prot, donc 8 g est impossible.
--    150 g skyr (90/15) + chou+carotte (~80/3) ≈ 170 kcal / 18 g.
update public.recipes set kcal = 170, p = 18 where id = 'idea-coleslaw';

-- 🔴 CONFIANT (direction) — Pâtes pesto au skyr : 80 g pâtes crues (~296/10) + ~40 g pesto
--    (~210/3) + 150 g skyr (90/15) + légumes (~55/5) ≈ 650/33. 480/22 sous-estime nettement.
update public.recipes set kcal = 640, p = 33 where id = 'idea-pastapestoskyr';

-- 🟠 À VÉRIFIER — Shake amande & fruit : 1 dose All-in-One (216/29) + 250 ml amande (13/1)
--    + fruit (~60/1) ≈ 290/31. 330 kcal semble un peu haut.
update public.recipes set kcal = 290, p = 31 where id = 'idea-shakefruit';

-- 🟠 À VÉRIFIER — Skyr soja & noix : 150 g skyr (90/15) + ~25 g noix (~165/4) + fruit (~40/1)
--    ≈ 295/20. Annoncé 230/16.
-- update public.recipes set kcal = 295, p = 20 where id = 'idea-skyrnoix';

-- 🟡 OPTIONNEL — Porridge protéiné : si pas de dose de protéine en plus, 35 g prot paraît élevé.
-- update public.recipes set kcal = 360, p = 32 where id = 'idea-porridge';

-- Contrôle après coup : liste les recettes au skyr / amande avec leurs valeurs.
-- select id, name, cat, kcal, p from public.recipes
--   where name ilike '%skyr%' or name ilike '%amande%' order by cat, name;
