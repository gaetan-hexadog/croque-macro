-- ════════════════════════════════════════════════════════════════════════════
-- 004_fix_clear_protein.sql — Correction macros Clear Protein (fiche Bulk 2026)
--
-- La dose Bulk Clear Whey Isolate (20 g) = 75 kcal / 18 g (pas 86 / 20).
-- Le « verre 150 ml » (40 % de la dose) = 30 kcal / 7 g (pas 34 / 8).
-- Met à jour le preset stocké en base pour coller au code (nutrition.js).
-- ════════════════════════════════════════════════════════════════════════════

update public.presets
   set kcal = 30, p = 7
 where name = 'Clear Protein Bulk (verre 150 ml)';

-- Si une dose entière de Clear Protein existait aussi en preset/recette, l'aligner
-- sur 75 / 18 ici (rien trouvé dans le snapshot actuel).
