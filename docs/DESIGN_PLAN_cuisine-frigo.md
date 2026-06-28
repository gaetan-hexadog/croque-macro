# Plan d'implémentation — Refonte « Ma Cuisine » + « Frigo »

> Issu du Design Lab. **Cuisine = synthèse F** (hub condensé de A + liste en carrousels de B).
> **Frigo = variante C** (tableau de bord stock) + **pattern d'actions** (rupture en 1 tap, édition/suppression
> dans une bottom-sheet). Tokens `C`, conteneurs `cardStyle()`, modales `Sheet.jsx`. Dark + light, Android tactile.
> La **logique reste inchangée** (mêmes props/handlers) — c'est une refonte de présentation.

## Décisions validées (Bob)

| Écran | Retenu | Idée |
|---|---|---|
| **Ma Cuisine** | **F** | Hub condensé (barre recherche + « + » + chips, Frigo en carte d'état) + contenu rangé en **carrousels par type** |
| **Frigo** | **C** | Tableau de bord (gros chiffre protéines + barre dispo/rupture) + **catégories** repliables + actions au tap |

---

## 1. Ma Cuisine — `src/screens/CuisineScreen.jsx`

**Haut (remplace le hub `grid-cols-4`)**
- Barre : `Search` (existante) + bouton **« + »** carré dégradé `linear-gradient(150deg, C.protein, C.accent)`.
- Le « + » ouvre un petit **ActionSheet** (Sheet.jsx) : *Créer une recette* / *Importer depuis URL* / *Scanner*.
  (réutilise `setAdding`, `setImportOpen`, `onScan` déjà câblés).
- Sous la barre : 3 **chips fines** secondaires (Importer / Scanner / Guide) — optionnel si déjà dans le « + ».
- **Frigo sort du hub** → **carte d'état** dédiée : icône `Refrigerator`, « Mon frigo », sous-texte `{nbDispo} aliments · ~{protStock} g prot. dispo`, chevron → `onOpenFrigo`.

**Contenu (remplace la liste plate filtrée)**
- En **navigation par défaut** (recherche vide) : sections en **carrousels horizontaux** :
  `Récents & favoris` · `Recettes` · `Repas` · `Aliments`.
  Chaque section = header (icône + label MAJ + `count ›`) + scroll horizontal de **MiniCard**
  (emoji dans pastille teintée par `kind`, nom 2 lignes, `kcal · p g`). Tap carte → `setDetail`.
- En **recherche active** (`nq` non vide) : revenir à une **liste à plat** tous types (les carrousels
  par type n'ont pas de sens en recherche). Réutiliser la ligne actuelle ou MiniCard en colonne.
- `FILTERS` : supprimés au profit des sections (ou gardés comme filtre rapide en recherche).

**À extraire / créer**
- `MiniCard({ m, onOpen })` — carte recette compacte (réutilisable). Peut vivre dans `src/components/`.
- `SectionCarousel({ icon, label, color, items, onOpen })` — header + scroll horizontal.
- Menu « + » via `Sheet`.

**Inchangé** : `RecipeDetailSheet`, `SlotPickSheet`, `AddRecipeSheet`, import URL, `RecipeAdaptSheet`,
empty state, lien Guide. Props du composant inchangées.

---

## 2. Frigo — `src/sheets/PantrySheet.jsx`

**En-tête** : inchangé (retour, titre, **Partager**).

**Hero stock** (nouveau, en tête) : carte `cardStyle()` —
- gros chiffre **protéines en stock** `protStock(dispo)` g + nb **articles dispo** ;
- **barre dispo/rupture** (`width = dispo/total`), légende `{n} dispo · {n} à racheter`.

**À racheter** (items `out`) **en avant** : carte teintée `C.over`, chaque item + bouton **Remettre** (`onToggle`).

**Ajout** : un **seul** bouton « Ajouter un aliment » → ActionSheet (Chercher/scanner `OffSearch` **ou** à la main).
(garde les 2 voies derrière un bouton unique au lieu des 2 boutons actuels).

**Catégories repliables** : catégorisation **auto par mots-clés** →
`Protéines · Fruits & légumes · Frais & laitiers · Placard · Boissons · Autre`.
Chaque catégorie = carte `cardStyle()` : header (emoji + label + count + chevron), ouverte = lignes.

**Lignes aérées + pattern d'actions (remplace les 3 icônes/ligne)**
- Ligne : nom + densité `/100` (2 lignes) + **chip d'état** à droite : **« Dispo »** (vert) ↔ **« Rupture »**.
  Tap chip = `onToggle` → **bascule en 1 tap** (l'action fréquente reste immédiate, ligne épurée).
- **Tap sur la ligne** (nom) → **bottom-sheet d'actions** (`Sheet.jsx`) :
  *Modifier les valeurs* (→ le form existant nom/quantité/densité, en sheet) · *Mettre en rupture / Remettre* (`onToggle`) · *Supprimer* (`onRemove`).

**Helpers à ajouter** (dans `core.js`, testables + réutilisables) :
- `catOf(name)` → clé catégorie (regex mots-clés ; gère « lait d'amande » → Boissons avant Laitiers).
- `catMeta(key)` → `{ label, color, emoji }` (lit `C`).
- `protStock(items)` → somme `p100·qty/100` (ignore unité `pièce`/sans densité).

**Inchangé** : props `onAdd/onToggle/onUpdate/onRemove`, `OffSearch`, `parsePkg`, partage.

---

## Fichiers
- **Modifier** : `src/screens/CuisineScreen.jsx`, `src/sheets/PantrySheet.jsx`.
- **Ajouter** : `src/components/MealMiniCard.jsx` (+ `SectionCarousel` si réutilisé), helpers `catOf/catMeta/protStock` dans `core.js`.
- **Tests** : `core.test.js` → `catOf` (catégorisation, piège lait d'amande), `protStock`.

## Vérification
- `pnpm build` + `pnpm test`.
- **Cuisine** : carrousels scrollent ; recherche → liste à plat ; « + » ouvre les actions ; carte Frigo (badge) OK ; tap carte → fiche.
- **Frigo** : catégorisation correcte ; chip Dispo → rupture **1 tap** ; tap aliment → sheet (Modifier/Rupture/Supprimer) ; hero + barre se recalculent.
- **Dark + light**, largeur mobile réelle.

---

*Généré via Design Lab — directions retenues : Cuisine F, Frigo C.*
