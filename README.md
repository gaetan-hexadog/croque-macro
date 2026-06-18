# Croque·Macro

Planificateur de repas végétarien (sans lait, fromage/œufs OK) orienté **perte de gras + reprise de la muscu**.
Pioche adaptative dans une base de plats, suivi des **calories** et des **protéines**, **poids**, **historique** éditable jour par jour, **graphiques** de progression, thème **clair/sombre**, et **import/export** des données. PWA installable.

Stack : **React + Vite + Tailwind v4**, déployable sur **Netlify** (comme l'app fitness).

---

## Prérequis

- Node 18+ (recommandé 20)
- pnpm (`npm i -g pnpm`) — npm/yarn fonctionnent aussi

## Démarrer en local

```bash
pnpm install
pnpm dev          # http://localhost:5173
```

## Build de production

```bash
pnpm build        # génère dist/
pnpm preview      # prévisualise le build
```

## Déployer sur Netlify

**Option A — Git (recommandé)**
1. Pousse ce dossier sur un repo GitHub.
2. Sur Netlify : *Add new site → Import from Git*.
3. Build command : `pnpm build` · Publish directory : `dist` (déjà dans `netlify.toml`).

**Option B — Glisser-déposer**
```bash
pnpm build
```
puis dépose le dossier `dist/` sur https://app.netlify.com/drop

Le fichier `netlify.toml` gère déjà la redirection SPA (`/* → /index.html`).

---

## PWA / installation

`vite-plugin-pwa` génère le manifest et le service worker (mise à jour automatique).
Une fois le site servi en HTTPS (Netlify le fait), tu peux **l'installer** depuis Chrome Android (menu → « Installer l'application ») : elle s'ouvre en plein écran, hors barre d'URL, avec l'icône cadran.

> En local, le service worker n'est actif qu'après `pnpm build && pnpm preview` (pas en `dev`).

## Où sont mes données ?

Tout est stocké **en local dans le navigateur** (`localStorage`, clé `croque-macro:v1` (migration auto depuis l’ancienne clé)) :
objectifs, repas de chaque jour, poids, thème. Rien ne part sur un serveur.

### Migrer depuis la version web (artifact)

L'écran **Réglages → Sauvegarde & restauration** permet d'**exporter** un fichier JSON et de le **réimporter** ici. Exporte depuis la version web, importe dans cette app : ton historique suit.
> `localStorage` est propre à un domaine et à un appareil. Pour passer d'un téléphone à un autre, utilise l'export/import.

---

## Personnaliser

- **Objectifs (kcal / protéines)** : Réglages → curseurs, ou le calculateur Mifflin-St Jeor.
- **Thème clair/sombre** : Réglages → en haut. Le choix est mémorisé.
- **Base de plats** : dans `src/App.jsx`, tableau `MEALS` (chaque plat : `kcal`, `p` protéines, `c` glucides, `f` lipides, `slots`, `tags`). Tu peux en ajouter librement.
- **Couleurs / thèmes** : objet `THEMES` (`dark` / `light`) en haut de `src/App.jsx`.

## Structure

```
croque-macro/
├─ index.html            # entrée + polices (Space Grotesk / Inter)
├─ vite.config.js        # React + Tailwind v4 + PWA
├─ netlify.toml          # build + redirection SPA
├─ public/               # favicon.svg + icônes PWA (192/512/maskable/apple)
└─ src/
   ├─ main.jsx           # bootstrap React
   ├─ index.css          # @import "tailwindcss" + safe-area
   ├─ core.js            # données + thème + helpers + moteur hebdo (weekStats/weekCoach)
   ├─ openfoodfacts.js   # accès API Open Food Facts (recherche texte + code-barres)
   ├─ OffSearch.jsx      # composant recherche/scan Open Food Facts
   ├─ Week.jsx           # bilan hebdomadaire : WeekStrip (Jour) + WeekCard (Progrès)
   ├─ DayScreen.jsx      # écran Jour : anneau, repas, extras, poids, templates
   ├─ ProgressScreen.jsx # écran Progrès : KPI, graphiques kcal/poids, tendance
   ├─ GuideScreen.jsx    # écran Guide : méthode, antisèches, outils
   ├─ JournalScreen.jsx  # écran Journal : historique des jours
   ├─ Deck.jsx           # pioche : suggestion, recherche base perso + Open Food Facts
   ├─ Settings.jsx       # réglages : cibles, thème, base perso, import/export
   └─ App.jsx            # racine : état, persistance, routing onglets, overlays
```

## Notes

- Les valeurs nutritionnelles sont des **estimations par portion**, à ajuster selon tes produits.
- Les graphiques sont en SVG maison (aucune dépendance de charts).
- Pour bumper les versions : `pnpm up --latest` (vérifie Tailwind v4 / vite-plugin-pwa après coup).
