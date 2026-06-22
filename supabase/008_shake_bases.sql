-- ════════════════════════════════════════════════════════════════════════════
-- 008_shake_bases.sql — Bases & liquides du compositeur de shake dans `foods`.
--
-- Le compositeur ne lit plus de constantes en dur (nutrition.js) : ses bases
-- (poudres, tag 'shake-base') et liquides (tag 'shake-liquid') vivent dans foods.
-- ════════════════════════════════════════════════════════════════════════════

-- Les protéines Clear existantes deviennent aussi des bases de shake
update public.foods set tags = array(select distinct unnest(tags || array['shake-base'])) where id in ('bv1', 'bv5');

insert into public.foods (id, name, cat, slots, tags, kind, unit, per, kcal, p, c, f, default_amount, servings, descr, sort) values
  ('supp-allinone',       'Vegan All-in-One (Bulk)', 'pdj', array['pdj','dej','snack'], array['bulk','sans-oeuf','shake-base'], 'supplement', 'dose', 1, 216, 29, 22, 4, 1, '[{"label":"1 dose (60 g)","factor":1}]'::jsonb, 'Bulk Vegan All-in-One, 1 dose = 60 g. Créatine, BCAA, HMB inclus.', 300),
  ('supp-vegan-protein',  'Vegan Protein (Bulk)',    'pdj', array['pdj','dej','snack'], array['bulk','sans-oeuf','shake-base'], 'supplement', 'dose', 1, 127, 24, 4, 1, 1, '[{"label":"1 dose (35 g)","factor":1}]'::jsonb, 'Bulk Vegan Protein, 1 dose = 35 g. À l''eau : 127 kcal / 24 g.', 301),
  ('liq-eau',             'Eau',                     null,  array[]::text[],              array['shake-liquid'],                  'food',       'ml',   250, 0,   0,  0, 0, 250, '[{"label":"250 ml","amount":250}]'::jsonb, 'Eau (0 kcal).', 302),
  ('liq-amande',          'Lait d''amande non sucré','pdj', array['pdj','snack'],         array['shake-liquid','sans-oeuf'],      'food',       'ml',   250, 25,  1,  1, 2, 250, '[{"label":"250 ml","amount":250}]'::jsonb, 'Lait d''amande non sucré, ~25 kcal / 250 ml.', 303),
  ('liq-soja',            'Lait de soja',            'pdj', array['pdj','snack'],         array['shake-liquid','sans-oeuf'],      'food',       'ml',   250, 90,  9,  4, 4, 250, '[{"label":"250 ml","amount":250}]'::jsonb, 'Lait de soja, ~90 kcal / 250 ml, 9 g de protéines.', 304)
on conflict (id) do update set
  name = excluded.name, cat = excluded.cat, slots = excluded.slots, tags = excluded.tags, kind = excluded.kind,
  unit = excluded.unit, per = excluded.per, kcal = excluded.kcal, p = excluded.p, c = excluded.c, f = excluded.f,
  default_amount = excluded.default_amount, servings = excluded.servings, descr = excluded.descr;
