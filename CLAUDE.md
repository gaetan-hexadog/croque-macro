# CLAUDE.md — Croque·Macro

> Constitution du projet, lue automatiquement à chaque session Claude Code.
> Garde ce fichier court et à jour. L'état d'avancement détaillé est dans `HANDOFF.md`.

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
- **`core.js`** — données + helpers + thème, **hors composants React**. Source unique de vérité
  pour les constantes nutritionnelles. Exporte MEALS, SLOTS, store, C/SLOT_UI, applyTheme,
  helpers de date/quantité, dayTotals, DEFAULT_COMBOS, SHAKE_BASES/LIQUIDS, etc.
  **Les constantes Clear sont centralisées** (`CLEAR_PROTEIN_DOSE`, `CLEAR_VEGAN_DOSE`,
  `GLASS_FRACTION`, `glassOf`) — un chiffre se change ICI et nulle part ailleurs.
- **`App.jsx`** — racine `PiocheRepas` + `TabBar` (5 onglets : Jour/Journal/Progrès/Guide/Idées).
  Détient tout le state, la navigation par History API (geste retour OS), la persistance
  localStorage, et (en cours) la synchro Supabase.
- **Écrans** : `DayScreen.jsx` (+ `ExtrasSheet`), `IdeasScreen.jsx`, `JournalScreen.jsx`,
  `ProgressScreen.jsx`, `GuideScreen.jsx`, `Settings.jsx` (`SettingsSheet`), `Deck.jsx` (pioche),
  `Week.jsx`, `OffSearch.jsx` (Open Food Facts).
- **Bibliothèque presets/recettes (offline-first)** : `library.js` (fetch Supabase → cache
  localStorage → fallback `library.snapshot.js`), `supabase.config.js` (URL + clé anon).
- **Sync perso (en cours)** : `supabaseClient.js`, `sync.js`, `AccountSheet.jsx`.

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
- Migrations SQL dans `../croque-macro-supabase/001_init.sql` et `002_personal.sql`.
- Auth activée : **email/mot de passe + magic link**. Site URL + Redirect URLs = domaine Netlify.

## Modèle de données local (payload localStorage, clé `croque-macro:v1`)
`{ settings, days, weights, theme, templates, customMeals, usage, combos, shakeBases,
shakeLiquids, comboSeed, favs, customRecipes }`. **`days` = l'historique des repas** (`{ iso: {picks, skipBreakfast} }`).
**`customRecipes`** = recettes perso (écran Idées), fusionnées à `library.recipes` au rendu.

## Principe directeur sync
**Local-first.** localStorage reste la copie de travail (offline natif). Supabase = sauvegarde +
sync. La sync n'efface JAMAIS le local. Pas de login forcé : sans compte, l'app marche en local.
Stratégie : last-write-wins par enregistrement (days/weights par jour) + app_state en bloc.
