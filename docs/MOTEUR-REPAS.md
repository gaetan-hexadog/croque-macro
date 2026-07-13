# Moteur de repas — Spécification v2 (déterministe, local-first)

> **Origine** : document fonctionnel de Gaétan (v1, 13 juillet 2026), amendé par un contre-audit
> à trois lentilles (algorithmique, données/nutrition, intégration codebase — 36 constats dont
> 4 bloquants, tous résolus ci-dessous) et étendu d'une **couche composition** (repas complets
> entrée/plat/dessert ou partiels — § 3.6, statut : proposée, à valider).
> Principe fondateur inchangé : **zéro appel IA au runtime**. L'IA travaille en amont
> (génération de banque, parsing d'import), le runtime est algorithmique, instantané, offline.

## 1. Objectif et principes

Proposer des **repas** végétariens (complets ou partiels) réalisables avec l'inventaire réel,
dans un budget kcal (plafond) et un objectif protéines (plancher), variés (anti-répétition),
sans réseau. Principes durs :

- **Protéines = plancher prioritaire, kcal = plafond.** Tolérances **asymétriques** :
  ±10–15 % sur les kcal, mais **−5 % max** sur le plancher protéines (−15 % uniforme ferait
  dériver ~20 g/jour en silence).
- **L'app répond toujours.** Aucun chemin ne peut aboutir à « rien à proposer » : tout filtre
  a un mode dégradé (candidats écartés re-proposés avec mention d'écart, cascade de fallback § 7).
- **Une donnée = une source.** La nutrition vit uniquement sur les ingrédients ; recettes et
  gabarits référencent par ID. Les kcal/p stockés sur une recette sont un **cache dénormalisé**
  (recalculé pour les recettes liées, figé pour les importées « telles quelles »).

## 2. Modèle de données

### 2.1 Ingrédients (référentiel central)

Par ingrédient : `slug` stable, catégorie fonctionnelle (`cereale`, `legumineuse`,
`proteine_vegetale`, `oeuf`, `fromage`, `legume`, `sauce`, `matiere_grasse`…), tags
(`haute_proteine`, `cuisson_rapide`…), lieu de stockage, valeurs /100 g, et — ajouts v2 :

- **`unites` (jsonb)** : conversions vers grammes — `{piece_g: 50, cas_g: 10, cac_g: 4,
  tranche_g: 35, dose_g: 60…}`. Remplies à la génération (IA en amont) et **validées
  humainement comme les codes CIQUAL**. Sans elles : saisie d'inventaire pénible (personne ne
  pèse ses œufs), faisabilité fausse, imports non recalculables.
- **`poids_egoutte`** pour les conserves (boîte de pois chiches : 400 g brut ≈ 265 g égoutté —
  50 % d'erreur sinon).
- **`discret`** : ajustement par pas entiers (œufs, tranches, doses). Le solveur ne lisse que
  les continus (§ 3.4).
- **`facteur_cuisson`** (sec→cuit : riz ~2,8, pâtes ~2,3, lentilles ~2,4…) : le référentiel
  reste en **poids sec/cru** (aligné CIQUAL « cru »), seule l'UI convertit — double affichage
  (« 80 g cru ≈ 220 g cuit ») et toggle cru/cuit à la saisie d'un log.

**Fusion des trois sources nutritionnelles** (sinon le référentiel dérive) : un **slug
fonctionnel** (`pois_chiches`) porte catégorie, tags, slots et anti-répétition ; des
**variantes produit** (étiquette, Open Food Facts) s'y rattachent avec leurs propres macros.
Priorité écrite : **étiquette saisie main > OFF vérifié > CIQUAL générique**. Un scan OFF est
forcé de se rattacher à un slug existant (ou création explicite validée).

**CIQUAL** : matching à l'import via `ciqual_recherche` + `ciqual_code` validé humainement,
jamais deviné. Règle d'ambiguïté : « cru » par défaut, exceptions documentées sur l'ingrédient.
Contrôle d'import : rejet des entrées sans kcal/protéines exploitables. Fallback étiquette pour
les composites (tofu fumé, sauces du commerce).

### 2.2 Gabarits (templates)

Structures combinatoires à **slots** (catégories acceptées, quantité de base, bornes min/max,
`ajustable`, `optionnel`, `choix_multiples`). Ajouts v2 :

- **`type_de_piece`** sur chaque gabarit et recette : `entree` / `plat` / `accompagnement` /
  `dessert` / `laitage` / `fruit` — la brique de la composition (§ 3.6).
- **Combler le trou bloquant petit-déj/shakes/snacks** (40–60 g des 150 g quotidiens ; sans
  eux l'objectif est mathématiquement hors d'atteinte) : gabarits d'assemblage **shake**
  (slot poudre + slot liquide + extras — c'est l'actuel `ShakeBuilder`, qui valide le modèle),
  **bol skyr/fromage blanc**, **tartines/petit-déj salé**, **snack froid**, **dessert protéiné**.
  Triviaux pour le solveur (2-3 slots linéaires).
- **Slot « booster protéique » optionnel** injectable dans la plupart des gabarits (œuf poché,
  fromage râpé, skyr en accompagnement, dose de poudre en dessert) : activé quand le plancher
  est inatteignable, avec message honnête (« ce plat plafonne à 32 g, complète avec X »)
  plutôt qu'écartement silencieux. Vital en 100 % végétal où l'infaisabilité serait fréquente.

### 2.3 Recettes signature

Instructions + `components` `{ref_id, qty, min, max, ajustable, principal}` + slots flexibles +
`portions`. `ingredient_principal` déclaré (anti-répétition).

### 2.4 Patrons de repas (couche composition — **proposée, à valider**)

Une poignée de structures : `plat_seul`, `plat_dessert`, `entree_plat`, `entree_plat_dessert`,
`plat_laitage_fruit`, `shake_seul`… Chaque patron : pièces (obligatoires/optionnelles, par
`type_de_piece`) + **part indicative du budget** (plat 60–75 %, dessert 15–25 %, entrée 10–20 %).

## 3. Pipeline runtime

### 3.0 Étage 0 — budget du créneau (nouveau : personne ne le calculait)

`budget_repas = (cible_jour − consommé) × poids_créneau / Σ poids des créneaux restants`,
poids par créneau (petit-déj 0 si `skipBreakfast`, déjeuner 0,45, dîner 0,55 — ajustables,
appris des patterns réels). Idem pour le plancher protéines. **Garde-fou** : si le plancher du
créneau dépasse ~55 g (irréaliste en un repas), le plafonner et recommander explicitement un
shake en complément (les Clear/All-in-One sont déjà dans core.js).

### 3.1 Étape A — faisabilité sur inventaire FLOU

L'hypothèse « inventaire au gramme » ne survivra pas au réel. L'inventaire porte **trois
états** — `en_stock` / `entamé` / `fini` — la quantité précise étant optionnelle (poudres et
pesables exceptés). Faisabilité = **présence**, pas quantité, sauf quantité connue ET récente.

- Recette : faisable si chaque composant fixe est présent (≥ min si quantité connue) et chaque
  slot obligatoire couvert. Gabarit : chaque slot obligatoire couvert. Optionnels omis.
- **Liaison pantry → référentiel = LE chantier préalable** (le pantry actuel est du texte
  libre sans ID → la faisabilité stricte tournerait à vide) : `ref_id` **nullable** sur chaque
  item ; à l'ajout (scan/saisie), match exact/fuzzy proposé, confirmable en 1 tap ; table
  d'**alias** `name→ref_id` apprise des confirmations ; les items non liés restent utilisables
  comme aujourd'hui et couvrent les slots en mode « probable » (pas garanti). Indicateur
  « X aliments non reliés » dans le Frigo, liaison au fil de l'eau.
- **Restes multi-portions** : les portions restantes d'un plat cuisiné entrent à l'inventaire
  comme « restes », avec bonus de consommation et **exemption d'anti-répétition** (finir son
  curry est un objectif, pas une répétition à punir).

### 3.2 Étape A' — instanciation bornée mais pas aveugle

Top-**5** candidats par slot (le top-2-3 pur score écartait des candidats qui étaient les seuls
à satisfaire le budget après ajustement) :

1. Sélection par slot **diversifiée par profil macro** : garantir au moins un candidat
   haute-densité-protéique, un basse-densité-calorique, et le meilleur au score.
2. Pré-score **budget-aware** : pénaliser au niveau slot les candidats dont la densité kcal
   est incompatible avec le budget du repas.

Dimensionnement validé par l'audit : ~1 000–2 000 instanciations, arithmétique pure —
millisecondes sur mobile. Pas de beam search, pas de solveur.

### 3.3 Étape B — ajustement : **glouton exact par ratio** (remplace le « 2×2 »)

Le problème est une optimisation sous **inégalités** avec bornes, pas un système d'équations
(la « règle de trois itérative » peut osciller sans converger ; le 2×2 est mal conditionné
quand les leviers ont des ratios kcal/prot proches ; le clamp naïf viole les cibles).
Algorithme exact, optimal pour cette structure linéaire (sac à dos fractionnaire) :

1. Calculer (kcal, prot) aux quantités de base.
2. **Si prot < plancher** : augmenter les leviers `ajustable` par ordre décroissant de
   rendement `p_i/k_i` (protéines gagnées par kcal ajoutée), chacun clampé à sa borne max,
   jusqu'au plancher.
3. **Si kcal > plafond** : réduire les leviers par ordre décroissant de `k_i/p_i` (la matière
   grasse, p≈0, part en premier), clampés à leur borne min.
4. Re-vérifier le plancher : s'il casse, le repas est **prouvé infaisable dans les bornes** →
   écarté ou proposé avec mention d'écart (jamais de boucle).

Terminaison ≤ 2×L étapes (chaque étape sature un levier), déterministe, zéro inversion de
matrice. Cas à un levier : intersection d'intervalles `[(P−P0)/p, (K−K0)/k] ∩ [min, max]`,
vide = infaisable.

**Discrétisation** (œufs, tranches, doses) : énumérer les valeurs entières plausibles du
levier discret (domaine minuscule : 2–4 œufs) × ajustement continu des autres ; garder la
meilleure combinaison. Les macros sont recalculées **après** arrondi de tous les grammages à
l'unité pratique (5 g), jamais avant.

### 3.4 Étape C — scoring composite, échelles écrites

Toutes les composantes normalisées dans **[0,1]** :

- **Proximité budget** (bonus si protéines dépassées sans exploser les kcal).
- **Anti-répétition en malus absolus** : recette 0,5 · ingrédient principal 0,3 · gabarit 0,15
  (points de départ), décroissance linéaire (recette ~7 j, ingrédient ~3-4 j), fenêtres en
  **jours fractionnaires** par créneau (déjeuner→dîner = 0,3 j). **Cumul plafonné à 0,7** —
  la triple peine ne devient jamais un filtre dur déguisé. Jamais de filtre dur : mode dégradé
  = re-proposer les meilleurs écartés avec mention.
- **Consommation d'inventaire** : bonus périssables / fins de stock / restes.
- **Préférences apprises** (zéro IA, quelques compteurs dans app_state) : taux d'acceptation
  lissé par recette et ingrédient principal, prior Beta(2,2) — pas de conclusion sur
  2 observations —, poids modéré.
- **Exclusions de session** (« pas envie de tofu ce soir ») : filtres durs **éphémères**
  (portée repas ou journée) — la seule exception légitime au « jamais de filtre dur », car
  c'est une commande explicite, pas une heuristique. Les « envies » sont le miroir en bonus.

**Top-k dissimilaire (MMR)** : sélection itérative
`argmax[0,7·score − 0,3·max sim(c, déjà choisis)]` ; `sim = 1` si même recette, sinon
`0,4·[même gabarit] + 0,4·[même ingrédient principal] + 0,2·Jaccard(ingrédients pondéré kcal)`
(le persil ne compte pas comme le tofu). Contrainte dure (gabarits ET ingrédients principaux
tous différents) tant que le pool le permet, **relâchée automatiquement en pénalité** quand le
pool faisable < 2k.

### 3.5 Étape D — décrément

`consumePantry` (existant dans core.js) : décrémenter ce qui est quantifié, marquer « entamé »
sinon ; micro-réconciliation périodique (« il te reste du tofu ? ») plutôt que comptabilité
continue. Entrée dans l'historique (recette, gabarit, ingrédient principal, horodatage).

### 3.6 Couche composition — repas complets ou partiels (**proposée, à valider**)

L'assemblage vit **au-dessus** du pipeline pièce (3.1→3.4 inchangés, appliqués par pièce) :

1. **Choix du patron** selon budget du créneau (620 kcal le soir → 2-3 pièces ; 400 → plat
   seul), le moment, les patterns appris.
2. **Le plat d'abord** — il porte le plancher protéines, ajusté sur sa part de budget.
3. **Compléments ensuite**, choisis pour boucher le budget **résiduel** et les protéines
   **manquantes** (un skyr = 60 kcal · 10 g : bouche-trou protéique arithmétiquement idéal).
   Séquentiel : meilleur candidat de la catégorie, budget mis à jour — pas d'explosion.
   Si le glouton strict s'avère trop myope : évaluer les 2-3 meilleurs plats × leurs 2-3
   meilleurs compléments (une douzaine d'assemblages, toujours instantané).
4. **Mode partiel** : l'assemblage démarre d'un repas **déjà entamé** (loggé/prévu = état
   initial) et propose ce qui complète. Couvre « j'ai mon plat, propose un dessert »,
   « j'ai mangé un bout de pizza, complète », et le rééquilibrage du plan vivant.
5. Anti-répétition par pièce (inchangée) + diversité intra-assemblage (pas deux pièces à
   féculent) + malus léger de patron.
6. UX : la carte « Ce soir » affiche les pièces (Plat · Curry — Dessert · Skyr) avec actions
   par pièce (adapter/remplacer/retirer) et globales (« Simplifier », « Compléter »).
7. Contenu requis : gabarits desserts/entrées/accompagnements (§ 2.2) — sans eux, les patrons
   multi-pièces n'ont rien à assembler.

## 4. Banque de contenu : protocole qualité (la « validation humaine » ne suffit pas)

Quatre passes avant le runtime — les trois premières sont **du code, pas de l'IA** :

1. **Lint schéma** : tout `ref_id` existe, min ≤ base ≤ max, slots → catégories valides.
2. **Lint plausibilité** par catégorie : bornes de grammage (huile 5–30 g, épices < 10 g,
   féculent sec 40–120 g/portion…).
3. **Recalcul automatique** des macros à quantités de base ET aux bornes : rejet si la recette
   ne peut atteindre aucun couple (kcal, prot) utile, ou si kcal/portion sort de [250, 900].
4. **Revue humaine** (statut draft→validé) + cuisson-test d'un échantillon (1/5) par lot.

Garde-fous végétariens élargis (liste vivante, au-delà de pesto/pecorino) : présure animale,
gélatine, sauce Worcestershire (anchois), certains parmesans/grana — exclusion à la source
dans le référentiel, notes sur les ingrédients ambigus.

Lait d'amande : ~1 g prot/250 ml — **jamais compté comme source de protéines** (il compte
évidemment dans les kcal).

## 5. Import URL / copier-coller (« hyper important ») — deux régimes qui coexistent

L'import actuel livre déjà des ingrédients structurés `{qty, unit, name}` (aujourd'hui aplatis
en strings par `prefillFrom` — à conserver structurés, changement local).

**Temps 1 — immédiat, jamais bloquant** : parser → matcher chaque ligne sur le référentiel
(exact → fuzzy sur slugs/synonymes → proposition dans l'appel IA d'import existant, conforme au
principe « IA en amont ») ; table de conversion des unités courantes (cup/tbsp/pincée, boîtes)
au parseur. Lignes matchées → héritent des macros ; inconnues → **stubs « pending »** (badge).
La recette entre comme **« telle quelle »** (macros figées, loggable, zéro friction — le
fallback actuel reste le plancher d'expérience).

**Temps 2 — asynchrone, optionnel** : file de validation des stubs (`ciqual_recherche` → code,
unités) ; **promotion** manuelle en recette **« liée »** (déclarer slots flexibles, bornes,
ingrédient principal) → elle devient citoyenne complète du moteur : faisabilité, ajustement,
adaptation, décrément. La liaison est un **enrichissement progressif, jamais un péage**.

## 6. Intégration au code existant

- **Terrain favorable** : `consumePantry` (= étape D), `correctMacros` (recalcul linéaire),
  `wishSignals` (contraintes dures), `ShakeBuilder` (déjà un gabarit à 2 slots) existent.
  Le pattern de `lib/library.js` (table Supabase + snapshot généré + cache offline) est le
  véhicule du référentiel et des gabarits.
- **Le moteur naît comme module PUR** — `engine.js` + `engine.test.js` : zéro import
  React/lucide/localStorage/document, toutes données injectées (référentiel, gabarits, pantry,
  historique, cibles, date). Attention : core.js n'est **pas** partagé entre PWA et native, il
  est dupliqué et diverge déjà — court terme : copie synchronisée avec tests identiques des
  deux côtés (« on modifie côté PWA puis on copie ») ; cible : premier vrai package partagé
  (`@croque/engine`), candidat idéal car sans dépendance UI.
- **Schéma (option pragmatique retenue)** : étendre `foods` avec `kind='ingredient'`
  (ciqual_code, ciqual_recherche, catégorie fonctionnelle, stockage, `unites` jsonb) et
  `kind='template'` (slots jsonb) ; colonne `components` jsonb sur `recipes`. Réutilise tel
  quel le pipeline library.js, les seeds, la RLS. Les kcal/p des recettes deviennent un cache
  dénormalisé (§ 1).

## 7. Périmètre IA restant (et les deux cas tranchés)

Reste à l'IA : chat coach libre, photo→estimation, parsing d'import, génération de banque
(hors ligne). **Demande texte libre** dans les idées : routage vers l'IA (le moteur gère les
demandes sans texte) — un mapping texte→tags pourra venir plus tard. **Zéro-faisable** (frigo
vide) : cascade — relâcher la faisabilité (recettes à 1 ingrédient manquant, présentées
« il te manque X », ajout aux courses en 1 tap) → puis appel IA explicite. Sans cette cascade,
le moteur serait vécu comme une régression les jours de frigo vide, là où l'IA actuelle brille.
Bascule : **coexistence** moteur/IA (le moteur d'abord, l'IA en escalade), pas de
remplacement sec.

## 8. Ordre des chantiers

1. **Liaison pantry → référentiel** (ref_id nullable + alias + indicateur « non reliés ») —
   bloquant, tout en dépend.
2. **Moteur pur** (`engine.js` : étage 0, faisabilité floue, glouton exact, scoring, MMR)
   + tests exhaustifs (golden tests du solveur : bornes, saturation, infaisabilité prouvée,
   discrétisation ; property tests de linéarité).
3. **Banque v1** : référentiel ingrédients (CIQUAL validé) + 14 gabarits plats + gabarits
   d'assemblage (shake, bols, tartines, snacks, desserts) via le protocole § 4.
4. **Import lié** (temps 1 dans l'appel existant, file de validation temps 2).
5. **Couche composition** (patrons, mode partiel) — après validation du § 3.6.
6. **Bascule UI** : le plan vivant consomme le moteur ; l'IA passe en escalade explicite.

## 9. Questions ouvertes

- Validation de la **couche composition** (§ 2.4, § 3.6) : patrons retenus, parts de budget.
- Poids des créneaux à l'étage 0 (0,45/0,55 ?) — à caler sur l'historique réel.
- Seuils des malus anti-répétition (0,5/0,3/0,15, plafond 0,7) — à ajuster à l'usage.
- Licence CIQUAL : intégration Etalab à vérifier formellement + poids embarqué du référentiel
  (~3 200 entrées → sous-ensemble utile seulement).
