//  fixtures.js — jeu de données de référence des tests du moteur.
//  Valeurs réalistes (ordre CIQUAL), céréales/légumineuses en POIDS SEC (spec § 2.1).
//  Commun à tous les modules : ne pas dupliquer de mini-référentiels dans les tests.

export const REF = [
  { slug: "tofu-ferme", nom: "Tofu ferme", cat: "proteine_vegetale", tags: ["haute_proteine"], kcal100: 125, p100: 13.5, discret: false },
  { slug: "pois-chiches-sec", nom: "Pois chiches (secs)", cat: "legumineuse", tags: ["haute_proteine"], kcal100: 364, p100: 19, facteur_cuisson: 2.6, discret: false, unites: { boite_g: 400 }, poids_egoutte: 265 },
  { slug: "riz-basmati-sec", nom: "Riz basmati (sec)", cat: "cereale", tags: [], kcal100: 349, p100: 7.1, facteur_cuisson: 2.8, discret: false },
  { slug: "pates-seches", nom: "Pâtes (sèches)", cat: "cereale", tags: [], kcal100: 359, p100: 12, facteur_cuisson: 2.3, discret: false },
  { slug: "oeuf", nom: "Œuf", cat: "oeuf", tags: ["haute_proteine"], kcal100: 140, p100: 12.6, discret: true, unites: { piece_g: 50 } },
  { slug: "skyr", nom: "Skyr", cat: "laitage", tags: ["haute_proteine"], kcal100: 63, p100: 10.6, discret: false, unites: { pot_g: 150 } },
  { slug: "emmental-rape", nom: "Emmental râpé", cat: "fromage", tags: ["haute_proteine"], kcal100: 380, p100: 28, discret: false, unites: { cas_g: 10 } },
  { slug: "huile-olive", nom: "Huile d'olive", cat: "matiere_grasse", tags: [], kcal100: 900, p100: 0, discret: false, unites: { cas_g: 10, cac_g: 4 } },
  { slug: "carotte", nom: "Carottes", cat: "legume", tags: [], kcal100: 41, p100: 0.9, discret: false },
  { slug: "epinards", nom: "Épinards", cat: "legume", tags: [], kcal100: 28, p100: 2.9, discret: false },
  { slug: "courgette", nom: "Courgettes", cat: "legume", tags: [], kcal100: 20, p100: 1.2, discret: false },
  { slug: "lait-amande", nom: "Lait d'amande (non sucré)", cat: "liquide", tags: [], kcal100: 15, p100: 0.5, discret: false }, // prot négligeable : jamais un levier
  { slug: "poudre-all-in-one", nom: "Vegan All-in-One", cat: "poudre_proteine", tags: ["haute_proteine"], kcal100: 360, p100: 48.3, discret: false, unites: { dose_g: 60 } },
  { slug: "pain-complet", nom: "Pain complet", cat: "cereale", tags: [], kcal100: 265, p100: 9, discret: true, unites: { tranche_g: 35 } },
  { slug: "amandes", nom: "Amandes", cat: "oleagineux", tags: [], kcal100: 634, p100: 21, discret: false, unites: { poignee_g: 30 } },
];

export const refBySlug = Object.fromEntries(REF.map((r) => [r.slug, r]));

export const GABARITS = [
  {
    id: "bowl", type_de_piece: "plat",
    slots: [
      { cats: ["proteine_vegetale", "oeuf"], base: 150, min: 100, max: 250, ajustable: true, optionnel: false, choix_multiples: 1 },
      { cats: ["cereale", "legumineuse"], base: 80, min: 40, max: 120, ajustable: true, optionnel: false, choix_multiples: 1 },
      { cats: ["legume"], base: 150, min: 80, max: 300, ajustable: true, optionnel: false, choix_multiples: 2 },
      { cats: ["matiere_grasse"], base: 10, min: 5, max: 25, ajustable: true, optionnel: true, choix_multiples: 1 },
      { cats: ["fromage", "oeuf", "poudre_proteine"], base: 20, min: 10, max: 40, ajustable: true, optionnel: true, choix_multiples: 1, booster: true },
    ],
  },
  {
    id: "shake", type_de_piece: "plat",
    slots: [
      { cats: ["poudre_proteine"], base: 60, min: 30, max: 90, ajustable: true, optionnel: false, choix_multiples: 1 },
      { cats: ["liquide"], base: 250, min: 200, max: 350, ajustable: false, optionnel: false, choix_multiples: 1 },
    ],
  },
  {
    id: "bol-skyr", type_de_piece: "dessert",
    slots: [
      { cats: ["laitage"], base: 150, min: 100, max: 300, ajustable: true, optionnel: false, choix_multiples: 1 },
      { cats: ["oleagineux"], base: 15, min: 0, max: 30, ajustable: true, optionnel: true, choix_multiples: 1 },
    ],
  },
];

export const RECETTES = [
  {
    id: "curry-pois-chiches", type_de_piece: "plat", portions: 2,
    components: [
      { ref: "pois-chiches-sec", qty: 160, min: 120, max: 220, ajustable: true, principal: true },
      { ref: "courgette", qty: 300, min: 150, max: 450, ajustable: true },
      { ref: "huile-olive", qty: 15, min: 8, max: 30, ajustable: true },
      { ref: "riz-basmati-sec", qty: 120, min: 60, max: 160, ajustable: true },
    ],
    slots: [],
  },
  {
    id: "omelette-garnie", type_de_piece: "plat", portions: 1,
    components: [
      { ref: "oeuf", qty: 150, min: 100, max: 200, ajustable: true, principal: true }, // 3 œufs — levier DISCRET (pas de 50 g)
      { ref: "emmental-rape", qty: 20, min: 0, max: 40, ajustable: true },
      { ref: "epinards", qty: 100, min: 50, max: 200, ajustable: true },
      { ref: "huile-olive", qty: 8, min: 5, max: 15, ajustable: true },
    ],
    slots: [],
  },
];

//  Inventaire type : mélange lié / non lié / entamé / rupture / restes.
export const PANTRY = [
  { id: "p1", name: "Tofu ferme", qty: 200, unit: "g", kcal100: 125, p100: 13.5, out: false, ref_id: "tofu-ferme", etat: "en_stock", qty_date: "2026-07-13" },
  { id: "p2", name: "Pois chiches secs bio", qty: 400, unit: "g", kcal100: 364, p100: 19, out: false, ref_id: "pois-chiches-sec", etat: "en_stock", qty_date: "2026-07-10" },
  { id: "p3", name: "Riz", qty: 500, unit: "g", kcal100: 349, p100: 7.1, out: false, ref_id: "riz-basmati-sec", etat: "en_stock", qty_date: "2026-07-01" },
  { id: "p4", name: "Oeufs", qty: 6, unit: "pc", kcal100: 140, p100: 12.6, out: false, ref_id: "oeuf", etat: "en_stock", qty_date: "2026-07-12" },
  { id: "p5", name: "Courgettes du marché", qty: 0, unit: "g", kcal100: 20, p100: 1.2, out: true, ref_id: "courgette", etat: "fini" },
  { id: "p6", name: "Huile d'olive", qty: null, unit: "g", kcal100: 900, p100: 0, out: false, ref_id: "huile-olive", etat: "entame" }, // quantité inconnue : présence seulement
  { id: "p7", name: "Skyr nature", qty: 300, unit: "g", kcal100: 63, p100: 10.6, out: false, ref_id: null, etat: "en_stock", qty_date: "2026-07-13" }, // NON LIÉ → couverture « probable »
  { id: "p8", name: "Épinards", qty: 150, unit: "g", kcal100: 28, p100: 2.9, out: false, ref_id: "epinards", etat: "en_stock", qty_date: "2026-07-12" },
  { id: "p9", name: "Reste de curry (1 portion)", qty: 1, unit: "part", kcal100: null, p100: null, out: false, ref_id: null, etat: "en_stock", reste: true, recetteId: "curry-pois-chiches" },
  { id: "p10", name: "Vegan All-in-One", qty: 540, unit: "g", kcal100: 360, p100: 48.3, out: false, ref_id: "poudre-all-in-one", etat: "en_stock", qty_date: "2026-07-08" },
  { id: "p11", name: "Lait amande", qty: 700, unit: "ml", kcal100: 15, p100: 0.5, out: false, ref_id: "lait-amande", etat: "en_stock", qty_date: "2026-07-11" },
];

//  Historique : curry mangé hier soir, omelette il y a 3 jours, shake ce matin.
export const HISTORY = [
  { date: "2026-07-12T19:45", recetteId: "curry-pois-chiches", gabaritId: null, ingredientPrincipal: "pois-chiches-sec" },
  { date: "2026-07-10T12:30", recetteId: "omelette-garnie", gabaritId: null, ingredientPrincipal: "oeuf" },
  { date: "2026-07-13T07:40", recetteId: null, gabaritId: "shake", ingredientPrincipal: "poudre-all-in-one" },
];

//  Patrons de repas (spec § 2.4) : pièces par type, part indicative du budget.
export const PATRONS = [
  { id: "plat_seul", pieces: [{ type: "plat", part: 1, optionnel: false }], contexte: ["dejeuner", "diner"] },
  { id: "plat_dessert", pieces: [{ type: "plat", part: 0.75, optionnel: false }, { type: "dessert", part: 0.25, optionnel: true }], contexte: ["dejeuner", "diner"] },
  { id: "entree_plat", pieces: [{ type: "entree", part: 0.2, optionnel: true }, { type: "plat", part: 0.8, optionnel: false }], contexte: ["diner"] },
  { id: "shake_seul", pieces: [{ type: "plat", part: 1, optionnel: false, gabarits: ["shake"] }], contexte: ["pdj", "snack"] },
];

export const NOW = "2026-07-13T18:40";

export const TARGETS = { kcal: 1850, protein: 150 };
