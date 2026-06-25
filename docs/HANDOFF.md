# HANDOFF.md — état d'avancement Croque·Macro

> Journal de reprise. Lis ce fichier + `CLAUDE.md` au démarrage, finis les étapes « À FAIRE »,
> puis mets ce fichier à jour avant de terminer la session.

## ✅ Fait

### Phase 5 — Relooking visuel global « Vivant maîtrisé » (TERMINÉ)
- Direction retenue via design lab (skill design-lab) : variante **E** (base chaude, accent corail
  `#ff8a3d`, créneaux saturés, chips, barres latérales, micro-mouvement) + **cartes premium de C**.
  Décliné **clair + sombre**.
- **`core.js`** : tokens `THEMES.dark`/`light` refaits + token `accent` + `cardGrad`/`cardTop` ;
  helper **`cardStyle()`** (carte premium centralisée, theme-aware) ; `SLOT_THEMES` saturés.
  Fond de page : ambiance en haut, non-fixed (corrige un effet de halo au scroll).
- **Composant `Sheet.jsx`** (nouveau) : bottom-sheet partagée — poignée, **swipe-pour-fermer**,
  slide-up, `prefers-reduced-motion`, prop `stickyHeader`, prop `z` (sous-sheets). Toutes les
  modales y sont passées : Deck (pioche), Extras, Réglages, Compte, Modèles + **sous-sheet dédiée**
  pour l'ajout d'aliment manuel (avant : accordion).
- **Écran Jour** : hiérarchie revue — training en chip dans la jauge, bilan hebdo descendu sous les
  repas, marqueurs de créneau dédoublonnés (barre + icône), jauge sans redondance (anneau = reste,
  pills = consommé/cible, légende = protéine à viser).
- **Tous les écrans** (Idées, Journal, Progrès, Guide, Week) passés à `cardStyle()`.
- Bugfix : bouton « Compte & synchronisation » dans Réglages (collision d'historique → transition
  propre `openAccountFromSettings` dans App.jsx).
- Design lab nettoyé (`.claude-design/` supprimé, hook `main.jsx` revert).

### Phase 4 — Cible adaptative, recettes selon budget, export Claude, scan iOS (TERMINÉ)
- **core.js** — nouveaux helpers exportés :
  - `DEFAULT_PROFILE` + `computeTargets(profile)` : calcul Mifflin-St Jeor centralisé (source unique,
    réutilisé par Settings ET l'ajustement auto). Settings n'a plus son calcul inline.
  - `smoothedWeight(weights, refISO, {span,min})` : poids lissé (moyenne pondérée des dernières
    pesées, récent = plus de poids) → `{ kg, n }` ou null.
  - `buildClaudePrompt({customMeals, remKcal, remP, dateLabel})` : génère le texte prêt à coller
    dans Claude.ai (règles diététiques + base perso + budget du jour).
- **#4 Cible adaptative** : `App.jsx` calcule `targetSuggestion` (si profil + ≥3 pesées + écart
  poids ≥1,5 kg). Proposée, **jamais appliquée en silence** — bandeau dans `DayScreen` (props
  `targetSuggestion`/`onApplyTarget`/`onDismissTarget`) avec « Ajuster » / « Plus tard » (dismiss
  par poids, session). `Settings.jsx` : bouton « Utiliser mon poids actuel » dans la calculatrice.
- **#3 Recettes selon budget** : `IdeasScreen` reçoit `remKcal`/`remP`/`dateLabel`, toggle
  « Dans mon budget » (tolérance 10 %, tri au plus proche), optionnel → voit tout sinon (anticipation
  des jours futurs en changeant de date sur l'écran Jour).
- **#2 Export Claude** : bouton « Copier ma base + budget pour Claude » dans `IdeasScreen`
  (`navigator.clipboard`).
- **#1 Scan iOS** : `OffSearch.jsx` — `BarcodeDetector` natif (Android) avec **fallback ZXing**
  (`@zxing/browser`, import dynamique → chunk séparé, seulement chargé sur iOS). Dépendance ajoutée.
  ⚠️ **À tester sur l'iPhone réel** (caméra en PWA standalone iOS) — non vérifiable hors device.

### Phase 1 — Migration presets/recettes vers Supabase
- `../croque-macro-supabase/001_init.sql` : tables `recipes` + `presets`, RLS (anon lecture,
  authenticated écriture), seed des 55 recettes + 37 presets extraits de l'ancien `core.js`.
- À exécuter dans Supabase (SQL Editor) si pas déjà fait.

### Phase 2 — Chargement offline-first (TERMINÉ et câblé)
- `src/library.snapshot.js` : bootstrap GÉNÉRÉ (données actuelles). Ne pas éditer à la main.
- `src/supabase.config.js` : `SUPABASE_URL` + `SUPABASE_ANON_KEY` (anon = publique).
- `src/library.js` : `getLibrarySync()` (cache→snapshot) + `refreshLibrary()` (fetch Supabase
  REST → cache localStorage → fallback). Reshape lignes plates → shapes app.
- `core.js` : **les tableaux `EXTRA_PRESETS` et `MEAL_IDEAS` ont été SUPPRIMÉS** (et retirés des
  exports). Supabase est la source vivante.
- `App.jsx` : state `library` (init `getLibrarySync`), effet `refreshLibrary().then(setLibrary)`,
  passe `library.recipes` → `<IdeasScreen ideas=…>` et `library.presets` → `<ExtrasSheet presets=…>`.
- `DayScreen.jsx` : `ExtrasSheet({ presets, … })` lit la prop (plus d'import `EXTRA_PRESETS`).

### Phase 3 — Sync perso (TERMINÉ et câblé)
- `../croque-macro-supabase/002_personal.sql` : tables `day_logs` / `weight_logs` / `app_state`,
  RLS `auth.uid()`, triggers `updated_at`, index. À exécuter dans Supabase.
- `package.json` : dépendance `@supabase/supabase-js` (`pnpm install` faite).
- `pnpm-workspace.yaml` : `onlyBuiltDependencies: [esbuild]` (pnpm 11 bloquait sinon le build
  script d'esbuild → `pnpm build` échouait). **Ne pas remettre la clé `pnpm` dans package.json,
  ignorée en v11.**
- `src/supabaseClient.js` : client unique (persistSession + detectSessionInUrl pour magic link).
- `src/sync.js` : `pullAll(uid)`, `pushDays(uid, obj)`, `pushWeights(uid, obj)`, `pushAppState(uid, data)`.
- `src/AccountSheet.jsx` : UI compte (email/mdp + magic link + statut + déconnexion).
- `App.jsx` — **câblage terminé** :
  - imports (`supabase`, sync, `AccountSheet`) ; state `session`/`accountOpen`/`syncStatus`/
    `syncReady` ; `openAccount` ; refs `stateRef`/`lastSynced`/`syncTimer` ; helper `appStateNow()`.
  - effets de sync collés après la persistance localStorage : miroir `stateRef`, abonnement
    `onAuthStateChange`, `runInitialSync` (pull→fusion remote-prioritaire en recouvrement, push du
    local-only), déclencheur de sync initiale, `pushChanges` débouncé (2 s, diff vs `lastSynced`),
    re-push sur événement `online`.
  - rendu `{accountOpen && <AccountSheet … />}` ; prop `onOpenAccount={openAccount}` sur `SettingsSheet`.
- `Settings.jsx` : prop `onOpenAccount` + bouton « Compte & synchronisation » (icône `Cloud`)
  qui ferme les réglages et ouvre la modale compte.
- **Build vérifié** : `pnpm build` passe (exit 0).

## ⛔ À FAIRE
- Rien côté code. Reste les actions Supabase de Gaétan (ci-dessous) + tests bout-en-bout.

### Tests bout-en-bout (à faire après config Supabase)
- Login email/mdp, puis magic link ; vérifier qu'un repas logué apparaît dans la table
  `day_logs` (Supabase) ; vérifier offline (couper le réseau, loguer, rétablir → push auto).

## 🔧 Côté Supabase (actions Gaétan, hors code)
1. Exécuter `001_init.sql` puis `002_personal.sql`.
2. Authentication → Providers → activer **Email** (couvre mot de passe + magic link).
3. Authentication → URL Configuration → **Site URL** + **Redirect URLs** = domaine Netlify.

## ⚠️ Sécurité données (important)
- Avant de déployer la version avec sync : **exporter un backup JSON** depuis l'app (filet).
- Migration auto : au **premier login sur l'iPhone qui contient l'historique**, le local-only est
  poussé vers Supabase. Se connecter sur cet appareil EN PREMIER, le laisser synchroniser, puis
  les autres appareils. La sync n'efface jamais le local.
