# Moteur de repas — modules purs

Implémente `docs/MOTEUR-REPAS.md` (spec v2). Règles du dossier :

- **Modules PURS** : aucun import hors de ce dossier (fixtures comprises). Zéro React, zéro
  `localStorage`/`document`, zéro `core.js` (core.js est dupliqué PWA/native — le moteur doit
  rester copiable tel quel, cible : package partagé). Toutes les données sont injectées en
  arguments. Pas de `Date.now()` caché : `now` est toujours un paramètre.
- Tests vitest à côté de chaque module (`*.test.js`). Les fixtures de `fixtures.js` sont le
  jeu de données de référence commun.
- Commentaires en français, style du repo.

## Formes de données (contrats)

```js
// Ingrédient du référentiel (spec § 2.1) — v0 : la base foods existante étendue
Ingredient = {
  slug: 'tofu-ferme',            // id stable
  nom: 'Tofu ferme',
  cat: 'proteine_vegetale',      // catégorie fonctionnelle (slots)
  tags: ['haute_proteine'],
  kcal100: 125, p100: 13.5,      // par 100 g (poids SEC/CRU pour céréales & légumineuses)
  unites: { piece_g: 50, cas_g: 10, tranche_g: 35, dose_g: 60, poignee_g: 30 }, // sous-ensemble pertinent
  poids_egoutte: 265,            // conserves uniquement (g égouttés pour l'unité « boîte »)
  discret: true,                 // ajustement par pas entiers (œufs, tranches, doses)
  facteur_cuisson: 2.8,          // sec→cuit, UI seulement (le moteur reste en cru)
}

// Slot de gabarit (spec § 2.2)
Slot = { cats: ['legume'], base: 150, min: 80, max: 300, ajustable: true,
         optionnel: false, choix_multiples: 1, booster: false }

// Gabarit
Gabarit = { id: 'bowl', type_de_piece: 'plat', slots: [Slot, …] }

// Recette signature (spec § 2.3) — components à la place des slots libres
Recette = { id: 'curry-pois-chiches', type_de_piece: 'plat', portions: 2,
  components: [{ ref: 'pois-chiches-sec', qty: 120, min: 80, max: 180,
                 ajustable: true, principal: true }, …],
  slots: [] }

// Item d'inventaire (pantry actuel + liaison § 3.1)
PantryItem = { id, name: 'Tofu bio du marché', qty: 200, unit: 'g',
  kcal100, p100, out: false,
  ref_id: 'tofu-ferme' | null,   // liaison au référentiel, nullable
  etat: 'en_stock' | 'entame' | 'fini',  // inventaire flou ; déduit de out/qty si absent
  qty_date: '2026-07-13',        // dernière mise à jour de la quantité (fraîcheur)
  reste: false }                 // restes multi-portions (bonus + exemption anti-répétition)

// Historique (anti-répétition § 3.4)
HistEntry = { date: '2026-07-12T19:30', recetteId, gabaritId, ingredientPrincipal }

// Budget de repas (étage 0, § 3.0)
Budget = { kcal: 620, prot: 48, protCapped: false, shakeRecommended: false }
```

## Signatures

```js
// budget.js — étage 0
computeMealBudget({ targets: {kcal, protein}, consumed: {kcal, protein},
  slots: [{ slot: 'diner', weight: 0.55, remaining: true }, …],
  slot: 'diner', protMealCap = 55 }) → Budget

// solver.js — étape B : glouton exact par ratio (§ 3.3)
adjustQuantities({ items: [{ ing: Ingredient, qty, min, max, ajustable }],
  protFloor, kcalCap, tolKcal = 0.12, tolProt = 0.05 })
  → { items: [{ …, qty }], kcal, prot, feasible, gap: {kcal, prot} | null }
// - montée par p/k décroissant jusqu'au plancher, descente par k/p décroissant sous le plafond,
//   clamp aux bornes, re-vérification du plancher → feasible:false PROUVÉ si cassé
// - ingrédients discrets : énumération des pas entiers (piece_g/dose_g/tranche_g) × ajustement
//   continu des autres ; arrondi final 5 g PUIS recalcul des macros

// feasibility.js — étape A + A' (§ 3.1-3.2)
checkFeasibility(recetteOuGabarit, pantry, { now }) →
  { feasible, probable, missing: [slug|catégorie], coverage: [{slotIdx|ref, pantryId, sure}] }
instantiate(gabarit, pantry, budget, { now, topPerSlot = 5 }) → [candidat]
// top-5 par slot DIVERSIFIÉ : ≥1 haute densité protéique, ≥1 basse densité kcal, meilleur score
// pré-score budget-aware : pénalise les densités kcal incompatibles avec le budget

// scoring.js — étape C (§ 3.4)
scoreCandidate(candidat, { budget, history, pantry, prefs, exclusions, now })
  → { score, parts: {budget, fraicheur, inventaire, prefs} }   // composantes ∈ [0,1]
// malus absolus : recette 0.5, ingrédient principal 0.3, gabarit 0.15 ; cumul plafonné 0.7 ;
// fenêtres en jours fractionnaires ; exclusions de session = filtre dur éphémère (seule exception)
selectDiverse(candidats, k, { lambda = 0.7 }) → [candidat]
// MMR : argmax[λ·score − (1−λ)·maxSim] ; sim = 1 même recette, sinon 0.4·gabarit +
// 0.4·ingrédient principal + 0.2·Jaccard pondéré kcal ; contrainte dure relâchée si pool < 2k ;
// mode dégradé : ne JAMAIS renvoyer vide si des candidats existent (mention d'écart)

// linking.js — liaison pantry → référentiel (§ 3.1, chantier 1)
matchPantryItem(name, referentiel, aliases) →
  { refId, confidence: 0..1, kind: 'exact'|'alias'|'fuzzy' } | null
// normalisation accents/pluriels, alias appris prioritaires, fuzzy = tokens communs pondérés ;
// seuil de suggestion 0.6, jamais de liaison automatique sous 0.9 sans confirmation
```
