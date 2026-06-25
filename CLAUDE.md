# CLAUDE.md — Croque·Macro

> Constitution du projet, lue automatiquement à chaque session Claude Code.
> Garde ce fichier court et à jour. L'état d'avancement détaillé est dans `docs/HANDOFF.md`.

## Projet
Croque·Macro — PWA de planification de repas végétariens (pioche adaptative, suivi
kcal/protéines/poids, historique, graphiques, écran recettes). Usage perso, mono-utilisateur,
installée en **PWA standalone sur iPhone iOS**.

- **Stack** : Vite 6 + React 18 (JSX) + Tailwind v4 (`@tailwindcss/vite`) + `vite-plugin-pwa`.
- **Icônes** : `lucide-react`. **Gestionnaire** : `pnpm`. **Déploiement** : Netlify.
- **Build** : `pnpm build`. Toujours vérifier que le build passe après une modif.

## Interlocuteur
- Propriétaire : Gaétan (« Bob »). **Réponds en français.** Concis, direct, honnête (ose
  contredire quand c'est justifié, sans complaisance).
- Préfère recevoir des versions complètes et fonctionnelles, avec vérification à chaque étape.

## Règles diététiques (NON négociables — elles pilotent recettes, presets, macros)
- **Végétarien** : œufs + fromages **au lait de vache uniquement** (jamais chèvre ni brebis).
  Ne boit **pas** de lait de vache.
- **Lait végétal par défaut = lait d'AMANDE non sucré** dans TOUTES les suggestions de recettes
  et de shakes. L'amande apporte ~1 g de protéines/250 ml → **la protéine vient de la poudre**.
- Cibles quotidiennes : **~1850 kcal / ~150 g de protéines**, objectif **perte de gras**.
- Suppléments Bulk : Vegan All-in-One (216/29 par 60 g), Clear Whey Isolate, Clear Vegan.
- Souvent pressé / saute le petit-déj → privilégier le **grab-and-go** (shaker en voiture).

## Architecture du code (`src/`)
Organisée en sous-dossiers. À la **racine de `src/`** : `App.jsx`, `main.jsx`, `core.js`, `index.css`,
`core.test.js`. **`core.js` reste à la racine** (module central, importé partout + par le design-lab).
- **`core.js`** — données + helpers + thème, **hors composants React**. Source unique de vérité
  pour les constantes nutritionnelles. Exporte MEALS, SLOTS, store, C/SLOT_UI, applyTheme,
  helpers de date/quantité, dayTotals, DEFAULT_COMBOS, SHAKE_BASES/LIQUIDS, etc.
  **Les constantes Clear sont centralisées** (`CLEAR_PROTEIN_DOSE`, `CLEAR_VEGAN_DOSE`,
  `GLASS_FRACTION`, `glassOf`) — un chiffre se change ICI et nulle part ailleurs.
- **`App.jsx`** — racine `PiocheRepas` + `TabBar` (4 onglets : Jour/Suivi/Cuisine/Sport).
  Détient tout le state, la navigation par History API (geste retour OS), la persistance
  localStorage, la synchro Supabase. Plus de FAB : les ajouts passent par l'écran Jour.
- **`src/lib/`** — logique non-React : `sport.js`, `assistant.js`, `library.js`,
  `openfoodfacts.js`, `sync.js`, `supabaseClient.js`, `supabase.config.js`.
- **`src/data/`** — snapshots générés (bootstrap offline) : `foods.snapshot.js`, `library.snapshot.js`.
- **`src/components/`** — UI partagée : `Sheet.jsx`, `Toast.jsx`, `ui.jsx` (SectionTitle),
  `VariantChips.jsx`, `ProductVerdict.jsx`, `MealCard.jsx`, `Week.jsx`, `Deck.jsx` (pioche),
  `FrigoPick.jsx`, `OffSearch.jsx` (Open Food Facts).
- **`src/sheets/`** — modales/bottom-sheets : `AccountSheet.jsx`, `MealSuggestSheet.jsx`,
  `QuickLogSheet.jsx`, `PantrySheet.jsx`, `RecipeAdaptSheet.jsx`, `RecipeForm.jsx`.
- **`src/screens/`** — écrans : `DayScreen.jsx`, `JournalScreen.jsx`, `ProgressScreen.jsx`,
  `GuideScreen.jsx`, `CuisineScreen.jsx`, `IdeasScreen.jsx` (mort), `PlanScreen.jsx`,
  `Settings.jsx` (`SettingsSheet`), `AuthGate.jsx`.
- **`src/sport/`** — onglet Sport (écran + composants + timers + logique d'affichage).

## Conventions
- Composants fonctionnels, hooks. Tailwind **classes utilitaires de base uniquement**
  (pas de classes générées dynamiquement). Couleurs via les tokens `C` de `core.js`.
- **Pas de tableaux de données en dur** pour presets/recettes : la source vivante est Supabase
  (tables `recipes` / `presets`). `library.snapshot.js` est un bootstrap GÉNÉRÉ, ne pas l'éditer
  à la main — le régénérer depuis les données si besoin.
- Modales = bottom-sheets `fixed inset-0 z-30` (voir `ExtrasSheet`/`SettingsSheet` comme modèle).
- Macros restaurant/suppléments : **estimations conservatrices**, arrondir vers le haut.

## Supabase
- Projet : `https://zmilkvfzjwhzwstebigj.supabase.co`. Clé **anon = publique** (lecture seule
  via RLS), vit dans `supabase.config.js`. **Ne jamais committer le `service_role`.**
- Tables publiques (lecture anon) : `recipes`, `presets`.
- Tables perso (RLS `auth.uid()`) : `day_logs` (= le log de repas : `{picks, skipBreakfast}` par
  jour), `weight_logs` (kg/jour), `app_state` (bloc : settings, templates, customMeals, usage,
  combos, shakeBases, shakeLiquids, comboSeed, favs, customRecipes).
- Migrations SQL **dans le repo** : `supabase/001_init.sql` (recipes+presets),
  `supabase/002_personal.sql` (day_logs/weight_logs/app_state), `supabase/003_seed_library.sql`
  (seed généré depuis `library.snapshot.js`). Voir `supabase/README.md`.
- Auth activée : **email/mot de passe + magic link**. Site URL + Redirect URLs = domaine Netlify.

## Modèle de données local (payload localStorage, clé `croque-macro:v1`)
`{ settings, days, weights, theme, templates, customMeals, usage, combos, shakeBases,
shakeLiquids, comboSeed, favs, customRecipes }`. **`days` = l'historique des repas** (`{ iso: {picks, skipBreakfast} }`).
**`customRecipes`** = recettes perso (écran Idées), fusionnées à `library.recipes` au rendu.

## Principe directeur sync
**Local-first.** localStorage reste la copie de travail (offline natif). Supabase = sauvegarde +
sync. La sync n'efface JAMAIS le local. Pas de login forcé : sans compte, l'app marche en local.
Stratégie : last-write-wins par enregistrement (days/weights par jour) + app_state en bloc.
