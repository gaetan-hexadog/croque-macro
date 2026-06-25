# Plan d'implémentation — Refonte onglet Sport

> Issu du Design Lab (synthèse **F**). Refonte **présentation** de l'onglet Sport +
> ajout des fonctions de suivi manquantes. **La logique de `src/sport.js` reste la source de
> vérité** ; on n'y ajoute que des helpers purs. Couleurs via tokens `C`, conteneurs via
> `cardStyle()`, modales via `src/Sheet.jsx`. Cible : PWA iOS, tactile, dark + light.

## Décisions de design (validées)

| Écran | Piste retenue | Idée |
|---|---|---|
| **Accueil** | **B** | Timeline verticale de la semaine (fait → aujourd'hui → à venir) + carte stats |
| **Séance active** | **C** | **Mode focus** : une seule série à la fois, plein cadre, zéro distraction |
| **Récap** | **D** | Tuiles stats + record (PR) + ressenti étoiles + slide-to-enregistrer |
| Énergie | « gym app » | Direction « Vivant maîtrisé », accent corail, gros chiffres animés |

### Fonctions de suivi à ajouter
**Fort impact** : détail d'une séance passée (+ **éditer/supprimer**) · **« la dernière fois »** en
séance · **courbe de force + assiduité** sur l'accueil · **records (PR)** + célébration.
**Secondaire** : **ressenti global** de séance · **réglage des jours** de séance · **logging manuel**
a posteriori.
**Abandonné** : notes libres de séance (force) — *ne pas implémenter* (retirer le champ « notes »
qui figurait dans la maquette du récap).

## Organisation du code (demande de Bob)

Extraire le Sport (aujourd'hui `src/SportScreen.jsx` ~660 lignes) dans un dossier dédié :

```
src/sport/
├── SportScreen.jsx     # orchestrateur : state local (active/preview/detail/manual), routing interne
├── SportHome.jsx       # accueil B : timeline + carte force/assiduité + week control + historique→détail + adapt guide
├── SessionPreview.jsx  # consultation avant de démarrer (existant, restylé)
├── ForceWorkout.jsx    # séance force MODE FOCUS (1 série) + repos animé + slide-to-finish
├── CardioWorkout.jsx   # séance cardio (existant, restylé : timers animés)
├── SessionSummary.jsx  # récap D : tuiles + PR + ressenti + slide  (force & cardio)
├── SessionDetail.jsx   # NOUVEAU : détail d'une séance passée + éditer/supprimer
├── ManualLogSheet.jsx  # NOUVEAU : logging manuel a posteriori (Sheet)
├── SportSettings.jsx   # NOUVEAU : réglage des jours de séance (Sheet)
├── timers.jsx          # PhaseTimer, IntervalTimer, barre de repos, useCountdown, playBeep
└── components.jsx      # atomiques : NumberFlow, DurationFlow, StatTile, RadialStat,
                        #   SessionProgress, SlideButton, Sparkline, PrescriptionBadge, StepDots, SetRow/SetFocus
```

`src/sport.js` **reste à la racine**. Mettre à jour l'import dans `src/App.jsx`
(`./SportScreen.jsx` → `./sport/SportScreen.jsx`).

> Les composants atomiques sont déjà écrits et éprouvés dans le lab
> (`.claude-design/lab/parts.jsx` + variantes) — les porter quasi tels quels dans
> `src/sport/components.jsx`, en remplaçant `DIFFS/diffColor` par `DIFFICULTY_OPTIONS` de `sport.js`.

## Composants atomiques (`src/sport/components.jsx`)

Tous purs CSS/JS (aucune dépendance — la « micro-lib » autorisée n'a finalement pas été nécessaire).
- **`NumberFlow`** / **`DurationFlow`** — chiffres à défilement vertical (roue), `M:SS`. Respecte
  `prefers-reduced-motion`. Remplace les `tabular-nums` des minuteurs et de la charge.
- **`StatTile`** — tuile `cardStyle()` + dégradé radial teinté + pastille d'icône + grand nombre.
- **`RadialStat`** — anneau simple (progression semaine / séance).
- **`Sparkline`** — mini-courbe SVG (force par semaine).
- **`SessionProgress`** — barre de progression de séance (% séries notées).
- **`SlideButton`** — glisser-pour-valider (Pointer Events) + fallback tap si reduced-motion.
- **`PrescriptionBadge`**, **`StepDots`** — repris de l'existant.

## Détail par écran

### Accueil — `SportHome.jsx` (piste B)
- En-tête : Semaine N/14, phase, charge du bloc.
- **Carte force + assiduité** (NOUVEAU) : `Sparkline` de la charge moyenne par semaine
  (`strengthSeries`) + tendance (`strengthTrend`) ; rangée d'assiduité 6 sem. (`assiduitySeries`).
- **Timeline** des séances A/B/C : pastille d'état sur un fil vertical ; carte « Aujourd'hui »
  bordée accent et cliquable pour démarrer.
- **Historique** : items **cliquables → `SessionDetail`** (NOUVEAU). Bouton « Logger une séance
  manuellement » → `ManualLogSheet`. Accès `SportSettings` (jours) via icône réglages.
- Conserver `WeekControl`, `AdaptGuide`, `Banner` (gap warning).

### Séance active force — `ForceWorkout.jsx` (piste C — MODE FOCUS)
- En-tête minimal : nom d'exo · index, **chrono écoulé** (`DurationFlow`, démarré à l'ouverture),
  **`SessionProgress`** discret.
- **Corps focus** : une seule série affichée en grand →
  badge `Série k/n · charge ↑`, ligne **« dernière fois : X kg · reps »** (`getLastPerformance`),
  gros sélecteur de reps (`NumberFlow` + −/+), 3 boutons de difficulté (`DIFFICULTY_OPTIONS`).
- Après notation d'une série : **repos plein cadre animé** (`DurationFlow` + bips existants +
  +15s / Passer) ; à la fin du repos → série suivante. Dernière série → bouton **suivant**, ou
  **`SlideButton`** « terminer » sur le dernier exercice.
- Garde l'ajustement de charge en direct (barre) et `chargeAdjustments` (logique inchangée).
- Étapes échauffement / finition cardio / retour au calme : `PhaseTimer`/`IntervalTimer` animés.

### Séance active cardio — `CardioWorkout.jsx`
- Timers d'intervalles animés (`DurationFlow`). Écran chiffres existant (distance/résistance/sauts/
  RPE/notes) conservé. Validation par `SlideButton`.

### Récap — `SessionSummary.jsx` (piste D)
- « Séance terminée 💪 » + tuiles **Durée / Séries / Exercices / Volume** (`sessionVolume`).
- **Bannière PR** (NOUVEAU) si `isVolumePR` (comparaison à `getBestVolume`).
- **Ressenti global** étoiles 1-5 → `feel` (NOUVEAU, retenu). **Pas de champ notes** (abandonné).
- **`SlideButton`** « glisser pour enregistrer » → `onFinish(payload)`.

### Détail d'une séance — `SessionDetail.jsx` (NOUVEAU)
- Ouvert depuis l'historique. Tuiles (durée/exos/volume) + par exercice : charge + chips de séries
  (reps + couleur de difficulté). Boutons **Modifier** / **Supprimer** → `updateWorkout`/`deleteWorkout`.

### Réglages & manuel (NOUVEAU, secondaires)
- **`SportSettings.jsx`** (Sheet) : éditer `sport.preferences.sessionDays` (A/B/C → jour).
- **`ManualLogSheet.jsx`** (Sheet) : choisir séance + semaine + saisie rapide → entrée `manual:true`.

## Logique pure à ajouter dans `src/sport.js`

Helpers purs (réutiliser l'existant : `lastEntryWithExercise`, `strengthTrend`, `DIFFICULTY_OPTIONS`).
- `getLastPerformance(history, exerciseName)` → `{ weight, reps:[...] }` de la dernière séance contenant l'exo.
- `sessionVolume(entry)` → `Σ weight × repsDone` (séances force).
- `getBestVolume(history, sessionId)` / `isVolumePR(entry, history)` → détection record.
- `strengthSeries(history)` → points de charge moyenne par semaine (sparkline).
- `assiduitySeries(history, weeks)` → `[{ w, done }]` par semaine.

## Modèle de données (rétro-compatible — `workout_logs.data` JSONB)

Champs **optionnels** ajoutés, lus/écrits sans migration (table JSONB libre, sync en bloc) :
- `feel` (1-5) : ressenti global de séance.
- `durationSec` : durée de la séance (chrono).
- `manual: true` : séance loggée a posteriori.

## State & mutations (`src/App.jsx`)

- `updateWorkout(id, patch)` et `deleteWorkout(id)` (mutent `workouts`, déclenchent `pushWorkouts`).
- Création d'entrée **manuelle** (id `manual-<sid>-<ts>`).
- Passer `setSport` à l'écran pour `SportSettings`. Import Sport → `./sport/SportScreen.jsx`.

## Vérification

1. **`pnpm build`** passe (obligatoire après modif — CLAUDE.md).
2. `pnpm dev`, onglet Sport :
   - Accueil : timeline correcte (aujourd'hui/fait), **sparkline force + assiduité** cohérentes,
     historique → **détail** ouvrable.
   - **Séance A (focus)** : chrono qui tourne, une série à la fois, **« dernière fois »** affichée,
     notation → **repos animé** → série suivante, **slide-to-finish** sur le dernier exo.
   - **Récap** : tuiles (dont **Volume**), **bannière PR** si record, ressenti étoiles, slide → toast
     « Séance A enregistrée 💪 », séance marquée faite.
   - **Détail** : modifier/supprimer une séance → l'historique reflète le changement.
   - **Réglages jours** + **logging manuel** fonctionnels.
   - **Cardio (B)** : timers animés, slide-to-save.
   - Vérifier que **charges adaptées** (↑/↓) et `chargeAdjustments` restent corrects (le moteur lit
     toujours `difficulty` par série).
3. Basculer **thème clair/sombre** : lisibilité des nouveaux composants OK.
4. Sync Supabase : `feel`/`durationSec`/`manual` round-trip sans casse ; suppression propagée.

---
*Maquettes de référence (supprimées au nettoyage) : Design Lab `?design_lab`, variante F.*
