-- ════════════════════════════════════════════════════════════════════════════
-- 007_servings_clear.sql — Règles de service (servings) pour les protéines Clear.
--
-- Démonstration du modèle unit-aware : au lieu d'un item figé « verre », le produit
-- porte sa dose de base + des servings (dose / verre dilué = facteur 0,4). Le
-- calculateur de l'app lit ces servings → l'utilisateur choisit le format + la qté.
-- ════════════════════════════════════════════════════════════════════════════

update public.foods set
  name = 'Clear Protein (Bulk)', kind = 'supplement', unit = 'dose', per = 1,
  kcal = 75, p = 18, default_amount = 1,
  servings = '[{"label":"1 dose (20 g)","factor":1},{"label":"verre 150 ml (1 dose + 350 ml)","factor":0.4}]'::jsonb,
  descr = 'Whey clarifiée Bulk. 1 dose (20 g) = 75 kcal / 18 g. Verre 150 ml dilué = 40 % de la dose. Choisis le format et la quantité.'
where id = 'bv5';

update public.foods set
  name = 'Clear Vegan (Bulk)', kind = 'supplement', unit = 'dose', per = 1,
  kcal = 67, p = 15, default_amount = 1,
  servings = '[{"label":"1 dose (~20 g)","factor":1}]'::jsonb,
  descr = 'Protéine vegan clarifiée Bulk, à l''eau glacée. 1 dose = 67 kcal / 15 g.'
where id = 'bv1';
