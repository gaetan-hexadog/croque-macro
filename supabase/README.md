# Schéma Supabase — Croque·Macro

Migrations versionnées avec l'app (avant, elles vivaient hors repo).

> ⚠️ Ces fichiers ont été **reconstruits** depuis le schéma documenté (`CLAUDE.md`)
> et les colonnes réellement utilisées par le code (`src/sync.js`, `src/library.js`).
> Diffe-les contre ta base existante avant de les rejouer en prod.

## Fichiers
- **`001_init.sql`** — bibliothèque publique : tables `recipes` + `presets`, RLS
  (lecture anon, écriture authentifiée).
- **`002_personal.sql`** — données perso : `day_logs`, `weight_logs`, `app_state`,
  RLS `auth.uid()`, triggers `updated_at`, index.
- **`003_seed_library.sql`** — **généré** depuis `src/library.snapshot.js`
  (37 presets + 55 recettes). Idempotent (`truncate` + `insert`).
- **`004_fix_clear_protein.sql`** — correctif macros Clear Protein.
- **`005_foods.sql`** — **catalogue unifié** `foods` (pioche + suppléments + extras
  + recettes, modèle unit-aware). Destiné à remplacer meals.js/nutrition.js + les
  tables recipes/presets. *(Câblage app = phases suivantes.)*
- **`006_seed_foods.sql`** — **généré** (meals.js + snapshot) : 247 lignes
  (155 pioche + 37 extras + 55 recettes). Idempotent.

## Appliquer
Dans le SQL Editor Supabase, exécute dans l'ordre : `001` → `002` → `003`.
Puis : Authentication → Providers → activer **Email** ; URL Configuration →
**Site URL** + **Redirect URLs** = domaine Netlify.

## Régénérer le seed
Après une mise à jour de la bibliothèque (snapshot régénéré), relance :

```bash
node --input-type=module <<'NODE'
import { writeFileSync } from "fs";
import { pathToFileURL } from "url";
const { SNAPSHOT_PRESETS, SNAPSHOT_RECIPES } = await import(pathToFileURL(process.cwd() + "/src/library.snapshot.js").href);
const esc = (s) => String(s).replace(/'/g, "''");
const jsonb = (v) => `'${JSON.stringify(Array.isArray(v) ? v : []).replace(/'/g, "''")}'::jsonb`;
const out = ["truncate table public.presets restart identity;", "truncate table public.recipes;", ""];
let ps = 0; const pv = [];
for (const g of SNAPSHOT_PRESETS) for (const it of g.items) pv.push(`  ('${esc(g.cat)}', '${esc(it.name)}', ${Math.round(it.kcal)||0}, ${Math.round(it.p)||0}, ${ps++})`);
out.push("insert into public.presets (cat, name, kcal, p, sort) values", pv.join(",\n") + ";", "");
let rs = 0;
const rv = SNAPSHOT_RECIPES.map((r) => `  ('${esc(r.id)}', '${esc(r.cat)}', '${esc(r.name)}', ${r.emoji?`'${esc(r.emoji)}'`:"null"}, ${Math.round(r.kcal)||0}, ${Math.round(r.p)||0}, ${r.quick?"true":"false"}, ${r.desc?`'${esc(r.desc)}'`:"null"}, ${jsonb(r.ingredients)}, ${jsonb(r.steps)}, ${rs++})`);
out.push("insert into public.recipes (id, cat, name, emoji, kcal, p, quick, descr, ingredients, steps, sort) values", rv.join(",\n") + ";");
writeFileSync("supabase/003_seed_library.sql", out.join("\n"));
NODE
```
