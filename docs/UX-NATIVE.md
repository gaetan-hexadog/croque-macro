# Brief UX — Croque·Macro native

> Refonte UX de la PWA React (`src/`) vers React Native + Expo (expo-router, onglets natifs).
> Base retenue : proposition « archi-donnees », corrigée de sa faiblesse principale (poids exilé du Jour) par la morning card de « zero-friction », et enrichie des idées validées par les juges. Version corrigée après relecture adversariale : réintègre la création des repas enregistrés, arbitre le décrément frigo, trace « Réadapter », le poids des jours passés, la migration des données PWA, la tuile Shake sans geste caché et toutes les actions par item du Jour. Toutes les références `fichier:ligne` pointent vers la PWA actuelle, source de vérité fonctionnelle.

---

## Principes (5)

1. **Une donnée = une maison.** Quatre données maîtresses (le Jour, le Frigo, la Bibliothèque, le Suivi) = quatre onglets. Une donnée s'affiche partout où c'est utile mais **s'édite à un seul endroit** ; tout raccourci ailleurs est un deep-link ou un raccourci d'écriture explicite, jamais une surface dupliquée (fin des 4 montages de PantrySheet : `App.jsx:971`, `PlanScreen.jsx:319`, via Cuisine, via MealSuggestSheet ; fin du CRUD de consignes à 3 endroits).
2. **Local-first non négociable.** Chaque intention a un chemin 100 % offline ; l'IA enrichit, ne conditionne jamais (**contrat d'états IA standard**, voir section dédiée, appliqué à TOUTES les surfaces génératives, pas seulement IdeaSheet). Le login redevient **optionnel** — l'AuthGate bloquant actuel (`App.jsx:847-850`) contredit CLAUDE.md et disparaît. Corollaire : **la reprise du vécu existant (localStorage PWA) est une étape de plan à part entière**, pas un sous-entendu (voir Migration, étape 1).
3. **Le quotidien à ≤ 2 taps, avec filet.** L'heure pilote le créneau par défaut partout (plus jamais de re-choix de slot — corrige `App.jsx:974-978` / `QuickLogSheet.jsx:119-124`) ; habituels en 1 tap sur l'écran Jour ; **Undo universel** (toast 5 s sur tout log/suppression, **qui restaure aussi le stock frigo décrémenté**), condition psychologique du 1-tap. **Aucun geste invisible n'est le seul chemin d'une action** : pas de swipe pour logger, pas d'appui long porteur d'une capacité sans équivalent visible ; les swipes n'existent qu'au Frigo et doublés de boutons visibles.
4. **Une seule recherche, un seul scan, une seule voix coach.** Un composant `GlobalSearch` à résultats typés (🥘/🍽️/🥚/🧊/🌐) remplace les 6 barres actuelles ; le type décide du rendu, **le contexte décide du verbe** (voir / logger / stocker) ; dédoublonnage frigo > base perso > OFF. Le scan est une icône de cette barre. Le bilan de semaine passe de 5 surfaces à 1.
5. **Le natif au service des gestes, jamais décoratif.** Back OS natif via expo-router (suppression de `pushNav`/`undoStack`, `App.jsx:83-131` — **sauf la reprise de séance sport au boot, remappée en route initiale conditionnelle**, voir Sport) ; stores Zustand par domaine persistés MMKV (fin du composant-dieu à ~40 useState, `App.jsx:35-81`) ; max 2 niveaux de superposition (contre 4 aujourd'hui) ; **l'état des sheets génératives survit à un deep-link sortant** (voir Navigation) ; haptique sobre (tick au log, double-tick objectif protéines). Widget/notifications = phase 2 : **l'app tient ses budgets de taps sans eux**.

---

## Architecture : onglets et écrans

### 5 onglets (expo-router, tabs natifs)

| Onglet | Donnée maîtresse | Badge | Absorbe |
|---|---|---|---|
| **Jour** (défaut) | picks, cibles, skipBreakfast, training | — | DayScreen + morning card (raccourci d'écriture du poids) |
| **Frigo** | pantry, péremptions, ruptures→courses | nb « à finir vite » ou ruptures (sobre) | PantrySheet plein écran (`PantrySheet.jsx:134`), ShoppingSheet |
| **Bibliothèque** | recettes + repas enregistrés + aliments + OFF | — | CuisineScreen, panneaux Recettes/Base du Deck, OffSearch |
| **Suivi** | weights, days agrégés, graphiques, bilan | point si pas pesé aujourd'hui | ProgressScreen + JournalScreen + CoachPanel + ReviewSheet |
| **Sport** | — | — | **Intact, hors périmètre** (SportScreen + son coach tels quels) |

Header par onglet (natif, remplace le header global bricolé `App.jsx:856-900`) : à droite **Coach** (Sprout → ChatSheet unique) et **Réglages** (écran poussé). Le scan quitte le header : il vit dans la barre de recherche globale (coût en taps budgété au flux 9).

**Route initiale conditionnelle** : au boot, si une séance sport est en cours (`loadLive`, comportement actuel `App.jsx:102`), expo-router ouvre directement l'onglet Sport — ce comportement vit aujourd'hui dans App.jsx et non dans `src/sport/`, il est **explicitement porté** dans le layout racine des tabs.

**Vues poussées (stack)** : Réglages (Cibles, Consignes, Compte, Guide/Méthode, Données), Planifier (ex-PlanScreen, depuis Jour), Fiche recette/aliment, **Jour passé** (Jour en mode date ≠ aujourd'hui, poussé depuis l'historique du Suivi OU depuis la bande 7 jours du Jour — remplace le `goToDay` qui change d'onglet, `App.jsx:788`). **Le Jour passé porte un champ poids éditable pour SA date** (équivalent de l'actuelle WeightCard qui écrit sur `activeDate`, `App.jsx:914` → `setWeight(activeDate, kg)`) : noter/corriger le poids d'hier reste possible (voir Suivi pour l'accès aux jours vides).

### Navigation : deep-links sortants sans perte de contexte

Règle transverse : quand une surface générative (IdeaSheet, Planifier) deep-linke vers le Frigo ou les Réglages, **son état vit dans son store Zustand** (texte du composer, toggles, résultats IA déjà générés, sélections d'OptionCards) et n'est pas détruit à la fermeture. Au retour (back OS), la sheet se ré-ouvre avec son état intact ; l'état est invalidé seulement au changement de jour ou sur « Régénérer ». Planifier étant un écran poussé, le deep-link Frigo s'empile par-dessus et le back y revient naturellement. « Vérifier mon frigo avant Frigo strict » reste un aller-retour non destructif — c'est la contrepartie exigée de la suppression des superpositions à 4 niveaux.

### Mapping ancien → nouveau

| Existant | Devient |
|---|---|
| `DayScreen.jsx` | Onglet Jour (+ morning card, − WeightCard en fond de scroll `DayScreen.jsx:228-231`) ; **toutes les actions par item (DayRow) conservées**, voir Zone 5 |
| `Deck.jsx` (pioche, 7 panneaux) | **Supprimé** → AddSheet (3 zones fixes). Migration des panneaux : Recettes/Base → recherche globale ; Frigo/FrigoPick → section de la recherche ; Shake → tuile AddSheet **scindée visuellement** (ShakeBuilder conservé tel quel, y compris verre dilué `Deck.jsx:598-616`) ; Plaisirs → chips contextuelles snack ; Coller/Manuel → tuile regroupée (capacité « Ajouter ET enregistrer en recette » `Deck.jsx:385-388` conservée) ; OFF → section « En ligne » |
| `QuickLogSheet.jsx` | **Supprimé** → mode Photo/Décrire de l'AddSheet, **slot transmis** (bug corrigé), avec états offline/erreur (contrat IA standard) |
| `MealSuggestSheet.jsx` (8 zones) | **IdeaSheet** aplatie en 3 zones (voir section dédiée), **carte d'erreur IA conservée** (`MealSuggestSheet.jsx:263-272`) |
| « Enregistrer ce repas » (`DayScreen.jsx:318-325` → `saveCombo` `App.jsx:536`) | **Conservé tel quel sur la carte créneau du Jour** — SEUL chemin de création d'un repas enregistré (combo), voir Zone 5 |
| `rebalanceSlot` + bandeau « Réadapter » (`App.jsx:692-701`, `DayScreen.jsx:74`, `:106`) | **Conservé** : entrée prioritaire du bandeau contextuel unique de la Zone 3 (déclencheur `planOverflow > 80` inchangé) |
| `PantrySheet.jsx` | Écran de l'onglet Frigo, **une seule instance** |
| `ShoppingSheet.jsx` | Section « Idées ✨ » du segment Courses du Frigo |
| `ProgressScreen` + `JournalScreen` + `CoachPanel` + `ReviewSheet` | Écran Suivi unique, période partagée 7/30/90 j (corrige `JournalScreen.jsx:8` vs courbe 90 j fixe `ProgressScreen.jsx:178`) ; ReviewSheet → « Bilan détaillé » (épinglage de consignes conservé, `ReviewSheet.jsx:61-65`) |
| `GuideScreen` | Section « Méthode » des Réglages ; **DrinkCalc** (`GuideScreen.jsx:326-400`) → action « 🍺 Boisson » des chips snack de l'AddSheet ; liens Play Store OFF/Yuka (`GuideScreen.jsx:253-256`) supprimés (le scan est interne) |
| `PlanScreen` | Écran poussé « Planifier » conservé (OptionCards, génération séquentielle, mode semaine) ; résumé frigo → deep-link avec état préservé, plus de PantrySheet imbriquée |
| Sheet scan header (`App.jsx:965-970`) | **Supprimée** (l'ajout partait en en-cas quel que soit le repas) → scan dans GlobalSearch, créneau de l'heure par défaut (budget : flux 9) |
| Sheet « De saison » + contexte saison du héro (`DayScreen.jsx:130`, `:263-270`) | **Conservés** : chip saison dans le héro Jour → sheet De saison (liste produits + « Une idée de repas de saison » pré-remplissant le chat coach) |
| `ChatSheet` ×2 instances (`App.jsx:998-1006`) | Une instance, contexte injecté (nutrition ou sport) ; **en contexte sport, les actions agentiques nutrition sont neutralisées** (l'instance sport actuelle a `onAction={() => {}}`, `App.jsx:1001-1006` — iso-fonctionnel exigé) ; « Pourquoi ce poids ? » et « Bilan » deviennent des prompts contextuels de CE chat |
| AssistantBar de la Cuisine (`CuisineScreen.jsx:253`) | **Conservée** en pied de l'onglet Bibliothèque (prompt pré-rempli → chat coach), comme celle du Frigo |
| Consignes (3 surfaces d'édition) | CRUD **uniquement** dans Réglages ; ailleurs ligne « n consignes → » deep-link |
| `profile.weight` vs `weights` (`Settings.jsx:130-134`) | L'estimateur Mifflin lit automatiquement le poids lissé — plus de double saisie |
| Décrément frigo au log (`App.jsx:521`, `:640`, `:659`, `confirmMeal :680-687`) | **Conservé automatique sur les chemins structurés**, opt-in ailleurs — arbitrage tracé, voir « Frigo : règle de décrément » |
| Reprise séance au boot (`App.jsx:102`) | Route initiale conditionnelle expo-router (voir ci-dessus) |

### Supprimé (code mort confirmé)
`Week.jsx` ; vue `progres` (`App.jsx:926`) ; `cuisineAdd`/`autoAdd` (`App.jsx:65`) ; props morts de DayScreen (`App.jsx:908,912`) ; `WISH_CHIPS` + texte d'aide mensonger (`MealSuggestSheet.jsx:13-20`, `:174`) ; `streakCount` (`core.js:1214` — jamais affiché : supprimer, ne pas ressusciter) ; toute la mécanique `pushNav`/`undoStack`/`popstate` (`App.jsx:83-131`), **hors reprise de séance sport, remappée**.

### Conservé (une instance, une porte)
RecipeDetailSheet (variantes live, « Ajouter à » avec créneau du moment `RecipeDetailSheet.jsx:95-105`), RecipeForm (garde anti-perte), RecipeAdaptSheet, AccountSheet, TargetSheet, ConsignesSheet, DataSheet (**export/import JSON — pilier de la migration PWA→native**), TemplatesSheet, ServingPicker (**avec dernière portion pré-sélectionnée** — nouveau), Toast (+Undo, **restaurant le stock frigo le cas échéant**), « Enregistrer ce repas » (création de combo), `rebalanceSlot`/« Réadapter », sheet « De saison », AssistantBar (Frigo ET Bibliothèque), actions agentiques du chat `save_recipe/log_meal/add_to_pantry/update_recipe` (`App.jsx:725-757`) **en contexte nutrition uniquement**.

---

## Les 9 flux clés (taps depuis l'ouverture de l'app, onglet Jour)

| # | Flux | Chemin cible | Taps | Avant (PWA) |
|---|---|---|---|---|
| 1 | **Voir kcal/prot restantes** | héro Jour, mini-bandeau sticky au scroll ; restant du créneau visible dans AddSheet et IdeaSheet (placeholder budget) | **0** | 0 mais perdu au scroll ; absent du Deck et de QuickLog |
| 2a | **Logger — habituel** | chip express du créneau courant, directement sur Jour | **1** | 2 minimum (Deck) |
| 2b | **Logger — recherche** | « + » créneau → saisie → résultat → Ajouter (ServingPicker pré-rempli dernière portion) | **3-4** + clavier | 4 + clavier, scopes éclatés |
| 2c | **Logger — shake dernier** | « + » → zone « Ma dernière » de la tuile Shake (bouton visible, pas d'appui long) | **2** | 3 |
| 2d | **Logger — photo** | « + » → Photo → capture → « Ajouter » (slot déjà connu) | **4** + IA | ≈5 + re-choix du créneau |
| 2e | **Confirmer un planifié** | « J'ai bien mangé ça » (décrémente le frigo comme aujourd'hui, toast « · 🧊 » + Undo) | **1** | 1 (conservé, `DayScreen.jsx:420-424`) |
| 2f | **Ajuster/corriger un item loggé** | tap sur l'item → steppers ±, éditer, supprimer, remplacer, adapter ✨ | **2** | 2 (conservé, DayRow) |
| 3 | **Frigo : ajuster / rupture** | onglet Frigo → tap item → stepper (**2-3**) ; rupture : onglet + swipe ou chip « En stock » (**2**) | **2-3** | 4-5 (Cuisine → carte → PantrySheet p2 → sheet) |
| 4 | **Trouver une recette** | onglet Bibliothèque → recherche/filtres → fiche | **2-3** | 2-3 mais 6 barres à scopes disjoints |
| 5 | **Idée assistant** | ✨ du créneau → cartes locales « cuisinable » instantanées → « Ajouter » (**2**, 0 réseau) ; idée IA : chip d'intention ou texte → « Ajouter » (**3** + IA) | **2-3** | 2-3 dans une modale à 8 zones + PantrySheet en surcouche |
| 6 | **Poids** | morning card sur Jour (matin ou pas pesé) : tap champ → pavé pré-rempli → ✓ = **2 + saisie, zéro scroll** ; sinon héro Suivi : **3** ; **jour passé** : Suivi → jour → champ poids du Jour passé (**3-4**) | **2** | 2-3 + scroll complet de la page (`DayScreen.jsx:228-231`) |
| 7 | **Historique / graphiques** | onglet Suivi (période unique 7/30/90) ; jour passé : +1 tap, retour = back OS dans Suivi | **1-2** | 1 + long scroll derrière 4 blocs, périodes incohérentes |
| 8 | **Liste de courses** | onglet Frigo → segment Courses (mémorisé) | **1-2** | 2-3, chips horizontales écrasées (`PantrySheet.jsx:169-191`), invisible depuis Jour |
| 9 | **Scanner un produit** | pour **logger** : « + » créneau → icône scan de la barre → caméra = **3** ; pour **stocker** : onglet Frigo → scan header = **2** | **2-3** | 1 (scan header) mais l'ajout partait en en-cas quel que soit le repas |

> Coût assumé du flux 9 : le scan-pour-logger perd 1-2 taps vs le header actuel, en échange du routage correct vers le créneau (le bug « tout part en en-cas » disparaît) et d'une entrée mentale unique. L'app shortcut « Scanner » (phase 2) ramène le coût à 1 geste depuis l'écran d'accueil — c'est un accélérateur, pas la justification du design.

---

## Écran par écran

### Jour (onglet, défaut)
- **Zone 1 — Héro restant** : anneau kcal + barre prot restantes, réel + prévu en arc pâle (repris de `DayScreen.jsx:517-533`, `:141-163`), toggle training, **chip contexte saison/coach** (conservée de `DayScreen.jsx:130`) ouvrant la sheet « De saison » (produits de pleine saison + « Une idée de repas de saison » → prompt pré-rempli du chat coach, `DayScreen.jsx:263-270`). Au scroll, se réduit en mini-bandeau épinglé : le restant ne quitte jamais l'écran.
- **Zone 2 — Morning card** (conditionnelle : 5 h-11 h OU pas pesé aujourd'hui) : contenu du **brief du matin calculé 100 % localement** (extension de `coachOpening`, `core.js:530`) — saisie poids inline (pavé pré-rempli avec le dernier poids ; garde-fou « eau vs gras » `DayScreen.jsx:561-568` s'affiche ici), chip « Shake habituel ✓ » 1 tap, chip « Je saute le petit-déj ». C'est un **raccourci d'écriture pour AUJOURD'HUI** : la maison du poids (courbe, historique, analyse, backfill des jours passés) reste le Suivi.
- **Zone 3 — Bandeau contextuel UNIQUE priorisé** — un seul à la fois, jamais empilés, dans cet ordre : **1. « Réadapter »** quand un planifié ne rentre plus dans le budget (`planOverflow > 80`, `DayScreen.jsx:74`, `:106`) → `rebalanceSlot` (`App.jsx:692-701`) : retire les items planifiés du créneau **avec Undo** puis ouvre l'IdeaSheet sur le budget réduit — flux typique du soir après un extra plaisir, conservé tel quel ; **2. anti-gaspi** (`DayScreen.jsx:170-181`) ; **3. cible adaptative** (`DayScreen.jsx:93-96`) ; **4. rattrapage sport**.
- **Zone 4 — Rangée express du créneau courant** : 4-6 chips habituels 1-tap (données `App.jsx:323-358`, aujourd'hui enfouies dans `Deck.jsx:245-256`) + « comme hier » + 📷. Log direct + toast Undo.
- **Zone 5 — Cartes créneau** (pdj/déj/dîner/en-cas/extras) : items loggés/prévus, sous-total ET **restant du créneau** (nouveau), « + » (AddSheet) et « ✨ » (IdeaSheet), « J'ai bien mangé ça » sur les prévus. Le créneau de l'heure est mis en avant. **Actions conservées à l'identique** :
  - **par carte** : « **Enregistrer ce repas** » sur un créneau loggé (`DayScreen.jsx:318-325` → `saveCombo` `App.jsx:536`) — **seul chemin de création d'un repas enregistré (combo)**, contrainte dure ; toggle « je saute le petit-déj » sur la carte pdj (`onSkip`), disponible même hors des heures de la morning card ;
  - **par item** (DayRow, `DayScreen.jsx:204-207`, `:279+`) : steppers de quantité (`onQty`), édition (`onEditItem`), suppression (`onClear`, avec Undo), remplacement/re-pioche (`onReplace`), adaptation IA (`onAdaptItem` → RecipeAdaptSheet), fiche recette depuis l'item avec badge « déjà enregistrée » (`onViewRecipe`, `savedRecipeNames`, `DayScreen.jsx:235-244`). L'ajustement de portion après log est un geste quotidien : il reste à 2 taps.
- **Zone 6** : carte Sport (intacte), « Planifier » + « Modèles & copie » (visibles en permanence, plus seulement jour vide), **bande 7 jours conservée** — tap sur un jour ≠ aujourd'hui pousse le « Jour passé » (poids éditable inclus).
- **État vide** : chips « Copier hier » + 4 modèles (démarrage rapide conservé, `DayScreen.jsx:189-201`).

### AddSheet (remplace le Deck) — sheet native, « + » d'un créneau
Slot = créneau tapé (sinon créneau de l'heure), modifiable par segmented en tête, **jamais redemandé en fin de flux**. Trois zones fixes, zéro accordéon :
1. **Header budget** : « Reste ~X kcal · Y g pour ce repas » (le Deck n'affichait aucun restant).
2. **GlobalSearch** (contexte « log ») + icône scan intégrée. Sections : Habituels → Frigo → Repas enregistrés → Recettes → Base → « Chercher en ligne (OFF) ». Règles de tap conservées : aliment → ServingPicker (dernière portion pré-sélectionnée → « Ajouter » direct possible) ; recette/repas/frigo/habituel → ajout direct (`Deck.jsx:177-179`, `:250`, `:298`, `:334`, `:351`). Toggle « Dans le budget » conservé comme filtre (`Deck.jsx:234`). En pied de résultats : escalade « ✨ Demander au coach » (la requête devient un prompt IdeaSheet en 1 tap).
3. **Accès rapides** (recherche vide) : chips habituels 1-tap (max 6), puis 4 tuiles :
   - **Shake** — tuile **scindée en deux zones visibles** (pas d'appui long, conformément au principe 3) : zone principale « 🥤 Ma dernière » avec le résumé macros (reprend `Deck.jsx:570-575`) = log en 1 tap ; zone secondaire « Composer » = ShakeBuilder complet (verre dilué inclus, `Deck.jsx:598-616`). **État vide** (aucune « dernière » : premier usage, nouvelle install) : la tuile entière affiche « Composer un shake » et ouvre le ShakeBuilder — jamais de tap mort ;
   - **Photo/Décrire** (flux QuickLog inline : capture → estimation IA → carte éditable ½/1/1½/2 → « Ajouter » ; états offline/erreur : contrat IA standard — hors ligne, la tuile bascule sur « Décrire » avec saisie manuelle des macros, l'app ne meurt pas avec l'IA) ;
   - **Assistant** (bascule IdeaSheet) ;
   - **Manuel/Coller** regroupés (« Ajouter ET enregistrer en recette » conservé).
   Si créneau snack/extras : chips « Plaisirs » + « 🍺 Boisson » (ex-DrinkCalc).
- **Boucle Jour↔Frigo** : voir « Frigo : règle de décrément » ci-dessous. Sur ce chemin (recherche/aliment libre), le décrément est **opt-in** : chip « −120 g du frigo » proposée quand l'item matche le stock, jamais automatique. Stock à zéro → bascule auto en Courses.

### Frigo (onglet)
Segmented natif mémorisé **Stock | Courses**.
- **Stock** : recherche-filtre locale instantanée (couvrant AUSSI les ruptures — corrige `PantrySheet.jsx:127-130`), bloc « À finir vite » + CTA « Cuisiner avec ça ✨ », liste par rayons (`PantryList.jsx:12-58` conservé : badges péremption, densité kcal·prot/100, ProteinFlag). **Swipe gauche = rupture, swipe droit = +stock**, doublés des contrôles visibles actuels (chip « En stock », tap → sheet d'actions : stepper adaptatif, « Ranger dans… », modifier avec estimation macros IA `PantrySheet.jsx:21-26` — contrat IA standard : hors ligne, saisie manuelle des macros —, péremption +3 j/1 sem/2 sem, supprimer). Header : scan direct (ajout paquet en 1 flux, `PantrySheet.jsx:286-293`, `parsePkg` conservé) + « + » manuel.
- **Courses** : liste verticale cochable des ruptures (fin des chips écrasées) ; cocher = re-stock avec mini-stepper de quantité inline (rend actionnable le rappel `PantrySheet.jsx:186`) ; partage natif (share sheet Android) ; section repliée « Idées ✨ » (ex-ShoppingSheet : article + pourquoi + « + Frigo », régénérer ; contrat IA standard).
- Barre assistant « Qu'est-ce que je fais avec ça ? » conservée en pied.
- **États vides** : Stock vide → « Scanne ton premier produit » + bouton scan ; Courses vide → « Rien à racheter 👍 ».

#### Frigo : règle de décrément au log (arbitrage tracé)
L'app actuelle décrémente DÉJÀ automatiquement le stock sur 4 chemins structurés : log d'une idée assistant (`App.jsx:521`, `consumeFromPantry(consumablesOf(meal))`), log d'une recette (`App.jsx:640`), log via `App.jsx:659`, confirmation d'un planifié (`confirmMeal`, `App.jsx:680-687`, toast « · 🧊 »). Ce comportement alimente l'exactitude du stock, dont dépendent péremptions, anti-gaspi et bascule rupture→courses. **Décision** :
- **Automatique conservé** sur les chemins où les quantités sont structurées (`consumablesOf`) : idée IdeaSheet, recette, repas enregistré, planifié confirmé. Toast « · 🧊 » conservé, **Undo restaure le stock**.
- **Opt-in (chip « −N g du frigo »)** sur les chemins nouveaux ou non structurés : recherche GlobalSearch, aliment libre, Manuel/Coller — portions pas toujours en grammes, risque de corruption des quantités.
- **Jamais** sur Photo/Décrire (estimation IA trop imprécise pour toucher au stock).

### Bibliothèque (onglet)
- **GlobalSearch** en tête (contexte « browse ») : recettes + repas + aliments + frigo + OFF.
- Filtres chips (Tous/Recettes/Repas/Aliments/Favoris) + tri cyclique (Récents/A-Z/Protéines) conservés (`CuisineScreen.jsx:41-42`, `:178-180`) ; grille de Tiles conservée ; carrousel « Faisable maintenant » (`matchFrac ≥ 60 %`, `CuisineScreen.jsx:102-103`) avec deep-link vers Frigo.
- « + » header : menu Créer / Importer URL / Coller / Scanner — pipeline `prefillFrom` → RecipeForm pré-rempli inchangé (`CuisineScreen.jsx:72-77`, `:230-250`) : rien n'est enregistré sans relecture. Import URL/coller : contrat IA standard (hors ligne, message + le brouillon collé est conservé pour retenter). **Note de périmètre** : ce menu crée des **recettes** ; les **repas enregistrés (combos)** se créent depuis le Jour (« Enregistrer ce repas », Zone 5) — la Bibliothèque les affiche, les logge, les supprime, mais leur porte de création reste le créneau loggé, fidèle au modèle « j'enregistre ce que j'ai vraiment mangé ».
- Tap → fiche poussée (RecipeDetailSheet : variantes live, « Ajouter à » créneau du moment, Personnaliser IA, Modifier, règles d'accès `CuisineScreen.jsx:220-224` conservées).
- **AssistantBar conservée en pied** (« Une idée, une envie… demande au coach » → chat pré-rempli, `CuisineScreen.jsx:253`).
- **État vide** : proposition d'import URL/coller + lien vers les recettes du catalogue.

### Suivi (onglet)
1. **Héro poids** : gros champ « Poids ce matin » (saisie immédiate pour aujourd'hui, garde-fou eau/gras, « Pourquoi ce poids ? » → prompt du chat coach, plus une sheet orpheline).
2. **Carte Semaine** — fusion des 3 voix coach (`ProgressScreen` héro + `CoachPanel` + ReviewSheet) : verdict, anneau n/7 sous l'objectif, 3 chips moyennes (kcal/j, prot/j, séances), CTA « Bilan détaillé ✨ » (rendu IA, épinglage de conseils → consignes des Réglages ; contrat IA standard — hors ligne le CTA est grisé avec mention « mode local », le verdict local reste affiché).
3. **Graphiques** : courbe poids lissée + maintenance empirique (`ProgressScreen.jsx:178-190`) + **nouveau graphe kcal/j en barres** — tous pilotés par un **sélecteur de période unique 7/30/90 j**.
4. **Historique** : liste dense conservée (`JournalScreen.jsx:43-66`) **étendue à TOUS les jours de la période, y compris vides et non pesés** (l'actuelle ne liste que les jours notés/pesés/aujourd'hui — ce qui rendait le backfill impossible) ; les jours vides sont rendus en ligne discrète « — ». Pied « n jours notés · x/n sous l'objectif ». Tap sur n'importe quel jour → pousse « **Jour passé** » dans le stack (retour = back OS, on reste dans Suivi) ; **le Jour passé porte le champ poids de SA date** → noter ou corriger le poids d'avant-hier = Suivi → jour → champ. `weights` alimentant la tendance lissée et la maintenance empirique, ce chemin de correction est non négociable.
- **État vide** : « Note ton poids 2 jours pour voir ta trajectoire » avec le champ héro actif (l'invite actuelle `ProgressScreen.jsx:89` n'avait aucune action associée).

### Planifier (poussé depuis Jour)
PlanScreen conservé : modes Journée/Semaine, génération IA séquentielle créneau par créneau, OptionCards (variantes live, bookmark), « Autres idées » avec `excludeTitles`, bouton sticky « Planifier (n) » → items `planned`. Changements : résumé frigo = deep-link **avec état préservé au retour** (sélections d'OptionCards, options générées — plus de PantrySheet imbriquée `PlanScreen.jsx:319`) ; consignes = ligne « n consignes → » (plus d'édition sur place, `PlanScreen.jsx:191-209`) ; rendu progressif local→IA + contrat IA standard (bannière « mode local » si offline, carte erreur + retry par créneau en échec réseau).

### Réglages (poussé)
Structure actuelle (`Settings.jsx:38-93`) : carte cibles → TargetSheet (sliders + estimateur Mifflin **lisant le poids lissé automatiquement**), **maison unique des consignes**, Compte (login optionnel, sync), thème, « Méthode » (ex-Guide, contenu statique), **Données : sauvegarde/restauration JSON (DataSheet) — inclut « Importer depuis l'ancienne app »** (voir Migration).

### Chat coach (modal, une instance)
Ouverture proactive locale (`coachOpening`), streaming SSE, photo, scan intégré, actions agentiques à confirmer — inchangé (`ChatSheet.jsx`). Contexte injecté selon l'origine : **nutrition** (actions agentiques `save_recipe/log_meal/add_to_pantry/update_recipe` actives, `App.jsx:725-757`) ou **sport** (actions agentiques **désactivées**, iso avec l'actuel `onAction={() => {}}` `App.jsx:1001-1006` — le coach sport ne gagne AUCUNE capacité d'écriture nutrition, périmètre gelé). Reste éphémère : pas de thread persistant (voir « Ce qu'on ne fait pas »). Hors ligne : le chat affiche l'état « mode local » et reste consultable pour ses prompts locaux d'ouverture.

---

## Contrat d'états IA standard (toutes surfaces génératives)

Toute surface qui appelle l'Edge Function respecte les 3 états, sans exception :
1. **Chargement** : streaming ou squelette, le contenu local déjà rendu reste visible et actionnable.
2. **Erreur réseau/API** : carte d'erreur inline avec « Réessayer » (généralisation de `MealSuggestSheet.jsx:263-272`) ; jamais d'écran bloqué, jamais de perte de la saisie utilisateur.
3. **Hors ligne** : bannière discrète « mode local » + le chemin local reste complet (cartes locales de l'IdeaSheet, saisie manuelle des macros pour Photo/Décrire et l'estimation frigo, verdict local de la carte Semaine, brouillon conservé pour l'import URL/coller).

Surfaces couvertes : IdeaSheet, Planifier, Photo/Décrire (AddSheet), import URL/coller (Bibliothèque), « Bilan détaillé ✨ » (Suivi), « Idées ✨ » (Courses), estimation macros frigo (`PantrySheet.jsx:21-26`), chat coach, RecipeAdaptSheet, Personnaliser IA.

---

## Recherche globale (point d'audit n° 2)

**Un composant `GlobalSearch`, un index local unique** (recettes + repas enregistrés + aliments base + frigo avec stock/péremption/rupture + habituels + presets plaisirs), remplaçant les 6 barres : `CuisineScreen.jsx:117`, `PantrySheet.jsx:147`, `Deck.jsx:224`, `Deck.jsx:319`, `FrigoPick.jsx:59`, `OffSearch.jsx:177`.

- **Résultats typés** : chaque résultat porte son type (🥘 recette / 🍽️ repas / 🥚 aliment / 🧊 frigo avec stock-péremption / 🌐 OFF). Le type décide du rendu, **le contexte d'invocation décide du verbe** :
  - **Bibliothèque** (browse) → ouvre la fiche ;
  - **AddSheet** (créneau connu) → logge (ServingPicker si aliment) ;
  - **Frigo** → ajuste le stock / ajoute au garde-manger.
- **Dédoublonnage explicite** quand un même nom existe en plusieurs sources : **frigo > base perso > OFF** (règle pour l'ambiguïté « skyr existe 3 fois »).
- **Local d'abord, instantané, offline** ; sections strictes avec cap de résultats par section ; tri pertinence + récence (`usage`).
- **OFF = escalade en ligne explicite** en fin de liste (« Chercher “skyr” en ligne », généralisation du pont `Deck.jsx:239-241`) → flux OffSearch conservé (macros /100 éditables, verdict produit, « Enregistrer dans ma base »).
- **Escalade IA** en pied : « ✨ Demander au coach » — une requête sans résultat local devient un prompt en 1 tap (« idée avec du skyr ≤ 400 kcal » → IdeaSheet).
- **Le scan code-barres est une icône DE cette barre** : même routage contextuel (fiche / log / stock). Les 3-5 portes de scan actuelles → une seule entrée mentale, au coût en taps budgété et assumé au **flux 9** (2-3 taps ; le header Frigo garde son scan direct à 2 taps pour le cas « je range mes courses »).
- **Placeholder dynamique** en contexte log : « reste 620 kcal · 48 g — cherche… » (le restant visible à 0 tap hors de l'écran Jour).
- Seule survivante à part : la recherche-filtre instantanée de la liste Frigo (filtrage du stock, pas une recherche).

---

## Pioche/idées aplaties (point d'audit n° 1)

La MealSuggestSheet actuelle empile 8 zones (`MealSuggestSheet.jsx:179-287`) avec PantrySheet en surcouche. Nouvelle **IdeaSheet** en 3 zones fixes, zéro état replié :

1. **Header** : « Dîner · reste 620 kcal · 48 g » + rangée unique de toggles (😋 Plaisir · 🍽️ Resto · 🔒 Frigo strict) + ligne « n consignes → » (deep-link Réglages, remplace le bloc repliable `:205-223`). Le bouton « Frigo · N » devient un deep-link vers l'onglet Frigo — plus de PantrySheet par-dessus (`:287`) → **max 2 niveaux d'empilement** au lieu de 4. **L'état de la sheet (toggles, composer, résultats générés) est préservé au retour du deep-link** (voir Navigation) : vérifier son frigo avant « Frigo strict » ne détruit rien.
2. **Une seule liste de résultats, rendu progressif local→IA** : d'abord, **instantanément et offline**, les cartes locales — « cuisinable maintenant » en tête (badge 🧊 % frigo), puis « dans tes recettes » **dépliées par défaut** (fin du `localCollapsed = true`, `:48`). Après ✨, les cartes IA badgées « ✨ Nouvelle idée » s'insèrent au-dessus en streaming. Une carte = un « Ajouter » (log direct dans le créneau, **décrément frigo automatique conservé** — chemin structuré, cf. règle de décrément) + « Enregistrer en recette ». « Régénérer » conserve l'anti-répétition `excludeTitles` (`:93`, `:121`). **Erreur IA : carte d'erreur inline + retry** (équivalent de `MealSuggestSheet.jsx:263-272`, contrat IA standard). Hors ligne : cartes locales seules + bannière discrète « mode local ».
3. **Composer épinglé** : input libre + ✨ + **chips d'intention** (« avec mon frigo », « un truc sucré », « rapide », « surprends-moi ») qui pré-remplissent/envoient le prompt — la grille 2×2 d'ActionCards (`:226-231`) disparaît, un seul modèle mental. Le texte d'aide mensonger (`:174`, décrivait `WISH_CHIPS` mort) est supprimé.

Les contraintes dures (frigo strict / plafond kcal / max prot / menu) restent portées par `wishSignals` — non-régression à couvrir par tests avant refonte UI (cf. mémoire projet).

---

## Natif : notifications, widget, quick actions (phase 2, sobre)

**Règle de phasage** : rien de tout cela n'est une fondation. Les budgets de taps ci-dessus sont tenus par l'app seule ; le natif est un accélérateur. Dev builds requis (hors Expo Go) pour widget et RemoteInput.

- **App shortcuts d'icône (long-press)** — meilleur rapport valeur/effort, quasi zéro UI : Scanner / Noter mon poids / Idée pour maintenant ✨ / Liste de courses = 4 deep links expo-router. À livrer en premier (le shortcut Scanner compense le surcoût du flux 9).
- **Notification poids matinale** avec saisie inline RemoteInput (taper « 82,4 » dans la notif → loggé, 0 ouverture d'app). Déclenchée **seulement si absent 2 jours** ; sinon deep-link morning card.
- **Widget écran d'accueil « Reste aujourd'hui »** : anneau kcal restantes + prot + boutons « + Shake dernier » (log 1 tap avec confirmation haptique, sans ouvrir l'app — le grab-and-go voiture de Gaétan ; si aucune « dernière », le bouton deep-linke vers le ShakeBuilder) et « + Repas » (deep-link AddSheet du créneau de l'heure). Mise à jour à chaque log + tick horaire.
- **Notification péremption** (veille d'urgence frigo) : « 3 aliments à finir : tofu, épinards… » avec action « Cuisiner avec ça ✨ » (deep-link IdeaSheet anti-gaspi).
- **Politique anti-nag (non négociable)** : tout opt-in et silencieux par défaut, désactivable par canal ; **jamais plus d'une notification nutrition par créneau**, fusion si plusieurs ; les seuils lisent `skipBreakfast` (le petit-déj sauté est volontaire) ; aucune notification de « fin de journée » culpabilisante en v1.
- **Haptique** : tick léger sur log réussi, double-tick objectif protéines atteint, léger sur steppers — jamais décoratif.

---

## Ce qu'on ne fait PAS (et pourquoi)

1. **Pas d'Omnibar hybride recherche/prompt** (assistant-first) : modèle mental ambigu (filtre local ou requête réseau ?) et taper du texte est le geste le plus lent pour un utilisateur pressé. On garde recherche et IA séparées, reliées par l'escalade explicite « ✨ Demander au coach ».
2. **Pas de thread coach persistant par jour** : nouvelle entité de données absente du payload `croque-macro:v1` et du schéma Supabase (day_logs/weight_logs/app_state) — stockage, rétention et sync à inventer, risque sur le last-write-wins. Le chat reste éphémère avec contexte reconstruit (`buildChatSystem`), qui fonctionne.
3. **Pas de swipe pour logger un repas** sur l'écran Jour (zero-friction) : gestes invisibles + cartes scrollables = logs accidentels, et le swipe est déjà chargé sur Android (back gesture). Le 1-tap passe par des chips visibles ; les seuls swipes sont au Frigo, doublés de boutons. **Corollaire appliqué à nous-mêmes** : pas non plus d'appui long comme seul chemin d'une capacité — la tuile Shake expose « Ma dernière » et « Composer » comme deux zones visibles.
4. **Pas de fusion PlanScreen ↔ IdeaSheet** : la planification séquentielle multi-créneaux et l'idée ponctuelle par créneau partagent le moteur de prompts mais pas l'UX — enterrer les OptionCards dans une conversation ou une sheet dégraderait la re-consultation. Deux surfaces, un moteur.
5. **Pas de widget/notifications en fondation v1** : fiabilité OEM (Doze, batterie), modules hors Expo Go — si la phase native glisse, aucun flux quotidien ne doit être amputé. D'où la morning card in-app pour le poids, PAS une dépendance à la notification.
6. **Pas de 6ᵉ onglet ni de FAB à comportements multiples** : 5 onglets = plafond Android atteint ; le FAB speed-dial en appui long (natif-android) est un second niveau de geste caché.
7. **Pas de refonte Sport** : onglet intact, contrainte dure. Son coach reste fonctionnellement identique (servi par l'instance de chat unique, contexte sport injecté, **actions agentiques désactivées comme aujourd'hui**). Seuls changements invisibles : reprise de séance = route initiale conditionnelle, thème de châssis (`App.jsx:832-845`) → thème d'écran local.
8. **Pas de SUPPRESSION du décrément de stock automatique existant** — et pas de généralisation aveugle non plus : l'app décrémente déjà sur 4 chemins structurés (`App.jsx:521`, `:640`, `:659`, `:680-687`), comportement conservé car il garantit l'exactitude du stock (péremptions, anti-gaspi, rupture→courses). L'opt-in (chip) ne s'applique qu'aux chemins non structurés (recherche, saisie libre) ; jamais de décrément sur estimation photo. L'Undo restaure toujours le stock. Arbitrage tracé dans « Frigo : règle de décrément ».
9. **Pas de login forcé** : l'AuthGate obligatoire (`App.jsx:847-850`) est retiré ; sans compte, tout marche en local, login proposé dans Réglages — **d'où l'obligation d'un chemin de migration sans compte** (import JSON, étape 1 du plan).
10. **Pas de résurrection de `streakCount`** ni d'aucun code mort recensé : on supprime, on ne « valorise » pas.
11. **Pas de création de combo depuis la Bibliothèque** : le repas enregistré naît d'un repas réellement loggé (« Enregistrer ce repas » sur le créneau) — créer des combos abstraits depuis la Bibliothèque dupliquerait RecipeForm pour un objet plus pauvre et casserait le modèle mental « le combo = mon vécu ».

---

## Plan de migration écran par écran (ordre conseillé)

Chaque étape doit laisser une app qui build et passe les tests (`core.test.js`). Le modèle de données local (`{settings, days, weights, ...}`) et le schéma Supabase sont **inchangés** — c'est ce qui rend ce portage sûr.

1. **Socle technique + reprise des données** : projet Expo + expo-router (tabs + stack + modales natives, back OS gratuit, **route initiale conditionnelle sport** `loadLive`) ; stores Zustand par domaine (journal, pantry, bibliothèque, settings, sync) persistés MMKV ; **portage de `core.js` tel quel** (le `store` async est déjà abstrait `core.js:36-45` → adapter MMKV trivial) ; sync Supabase (pull→merge→push, débounce, re-push online) portée depuis `App.jsx:208-293`. AuthGate optionnel dès ce stade. **Migration PWA → native, explicite et testée avant tout écran** :
   - le localStorage PWA (clé `croque-macro:v1`) étant inaccessible depuis React Native, le premier lancement natif propose un écran d'accueil à 3 chemins : **(a) « Se connecter »** → `runInitialSync` pull Supabase (chemin nominal de Gaétan, qui a un compte) ; **(b) « Importer une sauvegarde »** → import du JSON exporté par la DataSheet de la PWA (chemin sans compte, cohérent avec le login optionnel) ; **(c) « Commencer à vide »** ;
   - côté PWA, ajouter si besoin un bouton « Exporter vers l'app » (export JSON existant, DataSheet) — trivial, avant la bascule ;
   - **porter les migrations d'hydratation** de `App.jsx:184-194` (seed combos, fusion customMeals→pantry, appropriation catalogue `recipesOwned`) : elles s'appliquent à toute donnée importée, quel que soit le chemin. Critère de sortie : un export de la PWA réelle de Gaétan ré-hydraté à l'identique dans l'app native.
2. **GlobalSearch** : index local fédéré + résultats typés + dédoublonnage + 3 contextes de verbe + escalades OFF et coach. Le chantier le plus risqué : le livrer tôt, seul, testable (le brancher d'abord en contexte « browse »).
3. **Onglet Jour + AddSheet** : héro sticky (+ chip saison → sheet De saison), morning card, bandeau contextuel unique **avec « Réadapter » en tête de priorité** (`rebalanceSlot` porté), rangée express, cartes créneau avec restant **et toutes les actions DayRow (qty/édition/suppression/remplacement/adaptation IA/fiche) + « Enregistrer ce repas » + toggle skip pdj**, AddSheet (avec tuile Shake scindée + état vide, Photo/Décrire avec fallback offline, Manuel-Coller, Plaisirs, Boisson), règle de décrément frigo (auto structuré / chip opt-in), Undo universel restaurant le stock. **Tracer chaque micro-capacité du Deck ET de DayScreen vers sa nouvelle surface avant suppression** (verre dilué, « Ajouter ET enregistrer », pont OFF, plaisirs snack, saveCombo, rebalanceSlot, onSkip, De saison).
4. **Onglet Frigo** : Stock|Courses, swipes + équivalents boutons, scan direct, idées courses IA. Une seule instance, tous les anciens points d'entrée deviennent des deep-links **avec préservation d'état côté appelant**.
5. **Onglet Bibliothèque** : grille + filtres + tri + faisable-maintenant + imports (URL/coller/scan → RecipeForm) + fiches + AssistantBar en pied.
6. **Onglet Suivi** : héro poids, carte Semaine (fusion des 3 voix + ReviewSheet), graphiques à période unique + graphe kcal, **historique étendu aux jours vides** → « Jour passé » poussé **avec champ poids de la date** (backfill/correction de `weights`).
7. **IdeaSheet + Planifier** : aplatissement 8→3 zones, rendu progressif local→IA, chips d'intention, carte d'erreur + retry, préservation d'état au deep-link ; Planifier avec deep-links. **Tests de non-régression `wishSignals` avant de toucher aux prompts.**
8. **Réglages + Méthode + Chat unique** : consignes (maison unique), TargetSheet avec poids lissé auto, DrinkCalc migré, DataSheet (export/import), instance de chat unique avec contextes **et actions agentiques neutralisées en contexte sport**.
9. **Phase 2 native** (dev builds) : app shortcuts d'abord (dont Scanner, qui rattrape le budget du flux 9), puis notification poids RemoteInput, widget « Reste aujourd'hui », notification péremption — avec la politique anti-nag. L'app doit déjà tenir tous ses budgets de taps sans cette phase.
10. **Sport, en dernier, porté tel quel** : SportScreen + composants + timers + logique (`src/sport/`) transplantés sans redesign dans leur onglet ; seuls changements invisibles : son coach passe par l'instance de chat unique (contexte sport, actions désactivées), son thème de châssis (`App.jsx:832-845`) devient un thème d'écran local, et la reprise de séance au boot est déjà assurée par la route initiale conditionnelle de l'étape 1.