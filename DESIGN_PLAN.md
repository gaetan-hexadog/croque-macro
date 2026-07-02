# Plan d'implémentation — Refonte de la section Sport

> Issu du design-lab (juin 2026). Décisions validées par Bob. Remplace le plan visuel de
> [[sport-refonte-design]] pour la partie identité/thème.

## Décisions figées
- **Accueil = « Launchpad »** : focus radical sur la séance du jour. Héros plein cadre (ADN timer)
  avec **le coach intégré dans la card hero** (avatar + briefing motivant + tap → chat), gros
  bouton **Démarrer**. En dessous : une ligne *momentum* glanceable (2/3 semaine · série · charge),
  puis « Ma progression » / « Historique » à un tap. Tout le reste sort de l'accueil.
- **Thème sport = réglage** avec 3 valeurs, **Hybride par défaut** :
  - **Hybride (reco)** : hub (accueil, aperçu, récap, coach, détail, réglages) en **A « Timer vivant »**
    (chaleureux, aplats de couleur, halos, chiffres qui roulent) ; **en séance** (échauffement,
    annonce, prépare-toi, série, repos, tabata, retour au calme) en **C « Contraste brut »**
    (noir + accent néon, typo massive) → lisibilité maximale sous l'effort.
  - **Timer vivant (A)** partout · **Contraste brut (C)** partout.
- **Coach à 3 niveaux** : (1) briefing dans le hero de l'accueil, (2) écran de **chat sport dédié**
  (réutilise l'infra assistant + `adaptWorkout`), (3) **repères en séance** (rappel technique /
  ajustement de charge).
- **Signaux en séance** (les bips inaudibles avec musique) : **bips renforcés + vibration
  (`navigator.vibrate`) + voix (`speechSynthesis` « 3 · 2 · 1 · go »)**, chacun réglable.

## Codes couleur (tokens)
- **A / hub** : accent = `weight` (bleu). Phases : effort=`protein`, calme(échauff./repos/retour)=`weight`.
- **C / séance** : accent = **néon `#c6ff3d`**, surface `#08070a`. **effort = néon (chaud)** ;
  **phases calmes = cyan `#59d3ff` (froid)** → jamais confondre effort et retour au calme.

## Architecture
- Nouveau `src/sport/theme.js` : jeux de tokens `HUB`/`SESSION` pour chaque thème + helper
  `sportTokens(setting, kind)` (`kind` = `"hub"` | `"session"`). Les composants Sport lisent ces
  tokens au lieu des couleurs en dur. Modèle de référence : `src/__design_lab/flowkit.jsx` (lab).
- Réglage persistant `sport.sportTheme` (`"hybride"` défaut). Vit dans `app_state` comme le reste
  de `sport`.

## Phases (build + commit à chaque)
1. **Signaux** — `timers.jsx` : bips renforcés + `vibrate` + `speak`, pilotés par un `cueConfig`
   (sound/haptics/voice). Toggles dans `SportSettings`. `SportScreen` pousse la config. ✅ testable seul.
2. **Module de thème** — `src/sport/theme.js` (tokens hub/session × hybride/timer/gym) + défaut
   `sport.sportTheme`.
3. **Sélecteur de thème** — section « Thème » dans `SportSettings` (Hybride/Timer/Contraste).
4. **Accueil Launchpad** — réécrire `SportHome.jsx` (hero + coach dedans + momentum + tap-tiles),
   en tokens hub.
5. **Séance hybride** — `SessionShell`/`ColorStage` + `ForceWorkout`/`CardioWorkout` en tokens
   session ; boutons de ressenti = puces pleines teintées (🪶/✓/🔥).
6. **Coach sport** — écran de chat dédié + repères en séance.
7. **Nettoyage** — supprimer `src/__design_lab/` + revert `main.jsx`.

## Fichiers touchés
`src/sport/theme.js` (new), `timers.jsx`, `SportScreen.jsx`, `SportSettings.jsx`, `SportHome.jsx`,
`SessionShell.jsx`, `ForceWorkout.jsx`, `CardioWorkout.jsx`, `SessionSummary.jsx`, `SessionDetail.jsx`,
`SessionPreview.jsx`, `components.jsx`. Coach : nouveau sheet + branchement dans `App.jsx`.

## À NE PAS committer
Le scaffold `src/__design_lab/` reste local (référence visuelle) jusqu'à la phase 7.
