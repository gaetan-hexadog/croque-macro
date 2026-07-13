//  ════════════════════════════════════════════════════════════════
//  bank/gabarits.js — BANQUE v1 : gabarits (templates à slots) + patrons de repas.
//  Formats = contrats `Gabarit` / `Slot` / `Patron` de src/lib/engine/README.md
//  (spec docs/MOTEUR-REPAS.md § 2.2 et § 2.4).
//
//  Conventions :
//  - Les `cats` d'un slot ne référencent QUE des catégories présentes dans
//    bank/ingredients.js. Un slot regroupe des catégories de densité kcal
//    COMPARABLE (jamais légumineuse sèche ~350 kcal avec tofu ~125 kcal) :
//    le solveur ajuste la quantité dans [min, max] quel que soit l'ingrédient
//    choisi, les bornes doivent donc rester plausibles pour toutes les cats.
//  - Quantités par PORTION, en grammes CRUS/SECS (céréales & légumineuses en
//    poids sec — l'UI convertit via facteur_cuisson). Ordres de grandeur :
//    féculent sec 60-90 g, protéine 120-180 g, légumes 150-300 g, huile 8-15 g.
//  - `booster: true` = slot protéique optionnel injectable (spec § 2.2) :
//    activé quand le plancher protéines est inatteignable, jamais en silence.
//  - `temperature` : 'chaud' | 'froid' | 'les_deux' (spec § 2.2) — préférence
//    de session au scoring (± 0,35), JAMAIS un filtre dur.
//  - Slots à ingrédients discrets (œufs 50 g, tranches 35 g, tortillas 60 g) :
//    bornes alignées sur des multiples de l'unité.
//  ════════════════════════════════════════════════════════════════

export const GABARITS = [
  // ══ PLATS ═════════════════════════════════════════════════════

  {
    id: "bowl", type_de_piece: "plat", temperature: "les_deux",
    slots: [
      { cats: ["proteine_vegetale", "oeuf"], base: 150, min: 100, max: 250, ajustable: true, optionnel: false, choix_multiples: 1 },
      { cats: ["cereale", "legumineuse"], base: 70, min: 40, max: 110, ajustable: true, optionnel: false, choix_multiples: 1 },
      { cats: ["legume"], base: 200, min: 100, max: 350, ajustable: true, optionnel: false, choix_multiples: 2 },
      { cats: ["sauce"], base: 20, min: 10, max: 40, ajustable: true, optionnel: true, choix_multiples: 1 },
      { cats: ["matiere_grasse"], base: 10, min: 5, max: 20, ajustable: true, optionnel: true, choix_multiples: 1 },
      { cats: ["fromage", "oeuf", "oleagineux"], base: 20, min: 10, max: 50, ajustable: true, optionnel: true, choix_multiples: 1, booster: true },
    ],
  },

  {
    id: "curry", type_de_piece: "plat", temperature: "chaud",
    slots: [
      { cats: ["proteine_vegetale"], base: 150, min: 100, max: 220, ajustable: true, optionnel: false, choix_multiples: 1 },
      { cats: ["legume"], base: 250, min: 150, max: 400, ajustable: true, optionnel: false, choix_multiples: 2 },
      { cats: ["cereale"], base: 70, min: 50, max: 100, ajustable: true, optionnel: false, choix_multiples: 1 }, // riz sec
      { cats: ["sauce"], base: 30, min: 15, max: 50, ajustable: true, optionnel: false, choix_multiples: 1 }, // pâte de curry / tomates concassées
      { cats: ["liquide"], base: 100, min: 60, max: 200, ajustable: true, optionnel: false, choix_multiples: 1 }, // lait de coco allégé
      { cats: ["matiere_grasse"], base: 10, min: 5, max: 15, ajustable: true, optionnel: true, choix_multiples: 1 },
      { cats: ["laitage", "oeuf"], base: 80, min: 50, max: 150, ajustable: true, optionnel: true, choix_multiples: 1, booster: true }, // skyr en raïta / œuf
    ],
  },

  {
    id: "wok", type_de_piece: "plat", temperature: "chaud",
    slots: [
      { cats: ["proteine_vegetale"], base: 150, min: 100, max: 220, ajustable: true, optionnel: false, choix_multiples: 1 },
      { cats: ["legume"], base: 250, min: 150, max: 400, ajustable: true, optionnel: false, choix_multiples: 3 },
      { cats: ["cereale"], base: 70, min: 50, max: 100, ajustable: true, optionnel: false, choix_multiples: 1 }, // riz / soba sec
      { cats: ["sauce"], base: 25, min: 10, max: 45, ajustable: true, optionnel: false, choix_multiples: 1 }, // soja / teriyaki
      { cats: ["matiere_grasse"], base: 10, min: 5, max: 15, ajustable: true, optionnel: true, choix_multiples: 1 },
      { cats: ["oeuf", "oleagineux"], base: 30, min: 15, max: 60, ajustable: true, optionnel: true, choix_multiples: 1, booster: true }, // œuf brouillé / cajou
    ],
  },

  {
    id: "gratin", type_de_piece: "plat", temperature: "chaud",
    slots: [
      { cats: ["legume"], base: 300, min: 200, max: 450, ajustable: true, optionnel: false, choix_multiples: 2 },
      { cats: ["cereale"], base: 90, min: 60, max: 180, ajustable: true, optionnel: false, choix_multiples: 1 }, // pâtes sèches 60-90 g ; max haut pour les tubercules crus (~75 kcal/100 g)
      { cats: ["proteine_vegetale", "oeuf"], base: 120, min: 80, max: 180, ajustable: true, optionnel: false, choix_multiples: 1 },
      { cats: ["fromage"], base: 40, min: 20, max: 70, ajustable: true, optionnel: false, choix_multiples: 1 }, // liant + gratiné
      { cats: ["liquide"], base: 100, min: 50, max: 150, ajustable: true, optionnel: true, choix_multiples: 1 }, // lait soja façon béchamel
      { cats: ["matiere_grasse"], base: 10, min: 5, max: 15, ajustable: true, optionnel: true, choix_multiples: 1 },
    ],
  },

  {
    id: "omelette", type_de_piece: "plat", temperature: "chaud",
    slots: [
      { cats: ["oeuf"], base: 150, min: 100, max: 250, ajustable: true, optionnel: false, choix_multiples: 1 }, // 2-5 œufs — levier DISCRET (pas de 50 g)
      { cats: ["legume"], base: 150, min: 80, max: 300, ajustable: true, optionnel: false, choix_multiples: 2 },
      { cats: ["fromage"], base: 25, min: 10, max: 50, ajustable: true, optionnel: true, choix_multiples: 1, booster: true },
      { cats: ["matiere_grasse"], base: 8, min: 5, max: 15, ajustable: true, optionnel: false, choix_multiples: 1 },
      { cats: ["cereale"], base: 70, min: 35, max: 105, ajustable: true, optionnel: true, choix_multiples: 1 }, // pain en accompagnement (tranches de 35 g)
    ],
  },

  {
    id: "salade-repas", type_de_piece: "plat", temperature: "froid",
    slots: [
      { cats: ["legume"], base: 200, min: 120, max: 350, ajustable: true, optionnel: false, choix_multiples: 3 },
      { cats: ["proteine_vegetale", "oeuf", "fromage"], base: 130, min: 80, max: 200, ajustable: true, optionnel: false, choix_multiples: 1 }, // tofu / œufs durs / mozzarella
      { cats: ["cereale", "legumineuse"], base: 60, min: 40, max: 90, ajustable: true, optionnel: false, choix_multiples: 1 }, // quinoa, boulgour, pois chiches (sec)
      { cats: ["oleagineux"], base: 15, min: 5, max: 30, ajustable: true, optionnel: true, choix_multiples: 1 },
      { cats: ["matiere_grasse"], base: 12, min: 8, max: 20, ajustable: true, optionnel: false, choix_multiples: 1 }, // vinaigrette
      { cats: ["oeuf", "fromage"], base: 30, min: 15, max: 50, ajustable: true, optionnel: true, choix_multiples: 1, booster: true },
    ],
  },

  {
    id: "pates-proteinees", type_de_piece: "plat", temperature: "chaud",
    slots: [
      { cats: ["cereale"], base: 80, min: 60, max: 110, ajustable: true, optionnel: false, choix_multiples: 1 }, // pâtes sèches
      { cats: ["proteine_vegetale"], base: 130, min: 80, max: 200, ajustable: true, optionnel: false, choix_multiples: 1 }, // haché végétal, PST réhydratées…
      { cats: ["sauce"], base: 80, min: 25, max: 150, ajustable: true, optionnel: false, choix_multiples: 1 }, // sauce tomate ~100 g / pesto ~25 g : le pré-score budget-aware arbitre la densité
      { cats: ["legume"], base: 150, min: 80, max: 300, ajustable: true, optionnel: true, choix_multiples: 2 },
      { cats: ["fromage"], base: 15, min: 10, max: 30, ajustable: true, optionnel: true, choix_multiples: 1, booster: true },
      { cats: ["matiere_grasse"], base: 8, min: 5, max: 15, ajustable: true, optionnel: true, choix_multiples: 1 },
    ],
  },

  {
    id: "risotto", type_de_piece: "plat", temperature: "chaud",
    slots: [
      { cats: ["cereale"], base: 80, min: 60, max: 100, ajustable: true, optionnel: false, choix_multiples: 1 }, // riz sec
      { cats: ["legume"], base: 200, min: 100, max: 350, ajustable: true, optionnel: false, choix_multiples: 2 }, // champignons, courgette, asperges
      { cats: ["proteine_vegetale"], base: 120, min: 80, max: 180, ajustable: true, optionnel: false, choix_multiples: 1 }, // tofu fumé poêlé
      { cats: ["fromage"], base: 20, min: 10, max: 40, ajustable: true, optionnel: false, choix_multiples: 1 },
      { cats: ["condiment"], base: 10, min: 5, max: 15, ajustable: false, optionnel: true, choix_multiples: 1 }, // cube de bouillon
      { cats: ["matiere_grasse"], base: 12, min: 8, max: 20, ajustable: true, optionnel: false, choix_multiples: 1 },
    ],
  },

  {
    id: "soupe-repas", type_de_piece: "plat", temperature: "chaud",
    slots: [
      { cats: ["legumineuse"], base: 70, min: 40, max: 100, ajustable: true, optionnel: false, choix_multiples: 1 }, // lentilles (sec)
      { cats: ["legume"], base: 300, min: 200, max: 450, ajustable: true, optionnel: false, choix_multiples: 3 },
      { cats: ["cereale"], base: 40, min: 30, max: 70, ajustable: true, optionnel: true, choix_multiples: 1 }, // petites pâtes / boulgour (sec)
      { cats: ["condiment"], base: 10, min: 5, max: 15, ajustable: false, optionnel: true, choix_multiples: 1 }, // cube de bouillon
      { cats: ["matiere_grasse"], base: 10, min: 5, max: 15, ajustable: true, optionnel: true, choix_multiples: 1 },
      { cats: ["fromage", "oeuf", "laitage"], base: 40, min: 20, max: 100, ajustable: true, optionnel: true, choix_multiples: 1, booster: true }, // râpé, œuf poché, skyr en topping
    ],
  },

  {
    id: "chili-sin-carne", type_de_piece: "plat", temperature: "chaud",
    slots: [
      { cats: ["legumineuse"], base: 80, min: 60, max: 120, ajustable: true, optionnel: false, choix_multiples: 1 }, // haricots rouges/noirs (sec)
      { cats: ["proteine_vegetale"], base: 80, min: 50, max: 120, ajustable: true, optionnel: false, choix_multiples: 1 }, // haché végétal / PST
      { cats: ["sauce"], base: 200, min: 100, max: 300, ajustable: true, optionnel: false, choix_multiples: 1 }, // tomates concassées
      { cats: ["legume"], base: 150, min: 80, max: 250, ajustable: true, optionnel: false, choix_multiples: 2 }, // poivron, oignon, maïs
      { cats: ["cereale"], base: 60, min: 40, max: 90, ajustable: true, optionnel: true, choix_multiples: 1 }, // riz sec
      { cats: ["matiere_grasse"], base: 10, min: 5, max: 15, ajustable: true, optionnel: true, choix_multiples: 1 },
      { cats: ["fromage"], base: 20, min: 10, max: 40, ajustable: true, optionnel: true, choix_multiples: 1, booster: true }, // cheddar râpé
    ],
  },

  {
    id: "dahl", type_de_piece: "plat", temperature: "chaud",
    slots: [
      { cats: ["legumineuse"], base: 90, min: 60, max: 130, ajustable: true, optionnel: false, choix_multiples: 1 }, // lentilles corail (sec)
      { cats: ["legume"], base: 200, min: 100, max: 350, ajustable: true, optionnel: false, choix_multiples: 2 },
      { cats: ["liquide"], base: 100, min: 50, max: 150, ajustable: true, optionnel: true, choix_multiples: 1 }, // lait de coco allégé
      { cats: ["sauce"], base: 100, min: 50, max: 200, ajustable: true, optionnel: true, choix_multiples: 1 }, // tomates concassées
      { cats: ["cereale"], base: 60, min: 40, max: 90, ajustable: true, optionnel: true, choix_multiples: 1 }, // riz sec
      { cats: ["matiere_grasse"], base: 10, min: 5, max: 15, ajustable: true, optionnel: true, choix_multiples: 1 },
      { cats: ["laitage", "oeuf"], base: 80, min: 50, max: 150, ajustable: true, optionnel: true, choix_multiples: 1, booster: true },
    ],
  },

  {
    id: "tacos-wrap", type_de_piece: "plat", temperature: "les_deux",
    slots: [
      { cats: ["cereale"], base: 120, min: 60, max: 180, ajustable: true, optionnel: false, choix_multiples: 1 }, // 1-3 tortillas de 60 g (discret)
      { cats: ["proteine_vegetale"], base: 120, min: 80, max: 180, ajustable: true, optionnel: false, choix_multiples: 1 },
      { cats: ["legumineuse"], base: 50, min: 30, max: 80, ajustable: true, optionnel: true, choix_multiples: 1 }, // haricots noirs (sec)
      { cats: ["legume"], base: 120, min: 60, max: 200, ajustable: true, optionnel: false, choix_multiples: 2 }, // crudités, avocat
      { cats: ["sauce"], base: 40, min: 20, max: 70, ajustable: true, optionnel: true, choix_multiples: 1 }, // houmous, salsa
      { cats: ["fromage"], base: 25, min: 10, max: 40, ajustable: true, optionnel: true, choix_multiples: 1, booster: true },
    ],
  },

  {
    id: "poelee-complete", type_de_piece: "plat", temperature: "chaud",
    slots: [
      { cats: ["proteine_vegetale", "oeuf"], base: 150, min: 100, max: 220, ajustable: true, optionnel: false, choix_multiples: 1 },
      { cats: ["legume"], base: 250, min: 150, max: 400, ajustable: true, optionnel: false, choix_multiples: 2 },
      { cats: ["cereale"], base: 90, min: 50, max: 200, ajustable: true, optionnel: false, choix_multiples: 1 }, // sec 50-100 g ; max haut pour pommes de terre crues
      { cats: ["matiere_grasse"], base: 12, min: 8, max: 20, ajustable: true, optionnel: false, choix_multiples: 1 },
      { cats: ["sauce"], base: 15, min: 10, max: 30, ajustable: true, optionnel: true, choix_multiples: 1 }, // sauce soja
      { cats: ["fromage", "oleagineux"], base: 20, min: 10, max: 40, ajustable: true, optionnel: true, choix_multiples: 1, booster: true },
    ],
  },

  {
    id: "croque-tartine", type_de_piece: "plat", temperature: "chaud",
    slots: [
      { cats: ["cereale"], base: 105, min: 70, max: 140, ajustable: true, optionnel: false, choix_multiples: 1 }, // 2-4 tranches de pain (35 g, discret)
      { cats: ["fromage"], base: 40, min: 20, max: 60, ajustable: true, optionnel: false, choix_multiples: 1 },
      { cats: ["proteine_vegetale"], base: 100, min: 50, max: 150, ajustable: true, optionnel: false, choix_multiples: 1 }, // jambon végétal 4 tranches de 25 g (discret) — slot protéique obligatoire d'un plat : base ≥ 80 g
      { cats: ["legume"], base: 80, min: 40, max: 150, ajustable: true, optionnel: true, choix_multiples: 2 }, // tomate, épinards + salade à côté
      { cats: ["matiere_grasse"], base: 10, min: 5, max: 15, ajustable: true, optionnel: true, choix_multiples: 1 },
      { cats: ["oeuf"], base: 50, min: 50, max: 100, ajustable: true, optionnel: true, choix_multiples: 1, booster: true }, // façon croque-madame
    ],
  },

  // ══ ASSEMBLAGES (petit-déj / snacks / desserts — spec § 2.2) ═══
  //  Le trou 40-60 g de protéines quotidiennes : sans eux, la cible 150 g
  //  est mathématiquement hors d'atteinte.

  {
    //  Calqué sur le ShakeBuilder (bases Bulk réelles : All-in-One dose 60 g,
    //  Vegan Protein 35 g, Clear Protein/Vegan 20 g ; liquides eau / amande / soja).
    id: "shake", type_de_piece: "plat", temperature: "froid",
    slots: [
      { cats: ["poudre_proteine"], base: 40, min: 20, max: 90, ajustable: true, optionnel: false, choix_multiples: 1 }, // bornes = de 1 dose Clear (20 g) à 1,5 dose All-in-One (90 g)
      { cats: ["liquide"], base: 250, min: 200, max: 350, ajustable: false, optionnel: false, choix_multiples: 1 }, // amande non sucrée par défaut (prot ≈ 0 : jamais un levier)
      { cats: ["fruit"], base: 100, min: 50, max: 150, ajustable: true, optionnel: true, choix_multiples: 1 }, // banane, fruits rouges
      { cats: ["oleagineux"], base: 15, min: 5, max: 30, ajustable: true, optionnel: true, choix_multiples: 1 }, // purée de cacahuète
    ],
  },

  {
    id: "bol-skyr", type_de_piece: "laitage", temperature: "froid",
    slots: [
      { cats: ["laitage"], base: 200, min: 100, max: 350, ajustable: true, optionnel: false, choix_multiples: 1 }, // skyr / fromage blanc
      { cats: ["fruit"], base: 100, min: 50, max: 200, ajustable: true, optionnel: true, choix_multiples: 1 },
      { cats: ["oleagineux"], base: 15, min: 5, max: 30, ajustable: true, optionnel: true, choix_multiples: 1 },
      { cats: ["condiment"], base: 10, min: 5, max: 20, ajustable: true, optionnel: true, choix_multiples: 1 }, // miel, sirop d'érable
      { cats: ["poudre_proteine"], base: 20, min: 10, max: 40, ajustable: true, optionnel: true, choix_multiples: 1, booster: true },
    ],
  },

  {
    id: "tartines-pdj", type_de_piece: "plat", temperature: "les_deux",
    slots: [
      { cats: ["cereale"], base: 70, min: 35, max: 140, ajustable: true, optionnel: false, choix_multiples: 1 }, // 1-4 tranches (35 g, discret)
      { cats: ["fromage", "oleagineux", "sauce"], base: 25, min: 10, max: 40, ajustable: true, optionnel: false, choix_multiples: 1 }, // tartinable : fromage frais, purée de cacahuète, houmous
      { cats: ["oeuf"], base: 100, min: 50, max: 150, ajustable: true, optionnel: true, choix_multiples: 1, booster: true }, // œufs brouillés / au plat
      { cats: ["legume"], base: 80, min: 40, max: 150, ajustable: true, optionnel: true, choix_multiples: 1 }, // avocat, tomate
      { cats: ["fruit"], base: 100, min: 50, max: 150, ajustable: true, optionnel: true, choix_multiples: 1 },
    ],
  },

  {
    id: "porridge", type_de_piece: "plat", temperature: "les_deux", // chaud (porridge) ou froid (overnight oats)
    slots: [
      { cats: ["cereale"], base: 60, min: 40, max: 90, ajustable: true, optionnel: false, choix_multiples: 1 }, // flocons d'avoine / muesli
      { cats: ["liquide"], base: 200, min: 150, max: 300, ajustable: false, optionnel: false, choix_multiples: 1 }, // lait d'amande non sucré par défaut
      { cats: ["poudre_proteine"], base: 30, min: 15, max: 60, ajustable: true, optionnel: true, choix_multiples: 1, booster: true }, // LA source de protéines du bol
      { cats: ["fruit"], base: 100, min: 50, max: 150, ajustable: true, optionnel: true, choix_multiples: 1 },
      { cats: ["oleagineux"], base: 15, min: 5, max: 30, ajustable: true, optionnel: true, choix_multiples: 1 }, // graines de chia, amandes
    ],
  },

  {
    id: "snack-froid", type_de_piece: "plat", temperature: "froid", // pièce de créneau snack (via plat_seul)
    slots: [
      { cats: ["laitage", "oeuf"], base: 150, min: 100, max: 300, ajustable: true, optionnel: false, choix_multiples: 1 }, // skyr, fromage blanc, œufs durs
      { cats: ["fruit"], base: 100, min: 50, max: 150, ajustable: true, optionnel: true, choix_multiples: 1 },
      { cats: ["oleagineux"], base: 20, min: 10, max: 40, ajustable: true, optionnel: true, choix_multiples: 1 },
      { cats: ["snack"], base: 60, min: 60, max: 120, ajustable: true, optionnel: true, choix_multiples: 1 }, // barre protéinée (pièce de 60 g, discret)
    ],
  },

  {
    id: "dessert-proteine", type_de_piece: "dessert", temperature: "froid",
    slots: [
      { cats: ["laitage"], base: 150, min: 100, max: 250, ajustable: true, optionnel: false, choix_multiples: 1 },
      { cats: ["poudre_proteine"], base: 20, min: 10, max: 40, ajustable: true, optionnel: true, choix_multiples: 1, booster: true },
      { cats: ["condiment"], base: 8, min: 4, max: 15, ajustable: true, optionnel: true, choix_multiples: 1 }, // cacao, miel
      { cats: ["fruit"], base: 80, min: 40, max: 150, ajustable: true, optionnel: true, choix_multiples: 1 },
      { cats: ["oleagineux"], base: 10, min: 5, max: 20, ajustable: true, optionnel: true, choix_multiples: 1 },
    ],
  },

  // ══ PIÈCES LÉGÈRES (spec § 3.6.7 : sans entrées/fruits, les patrons
  //  multi-pièces n'ont rien à assembler) ══════════════════════════

  {
    id: "fruit-frais", type_de_piece: "fruit", temperature: "froid",
    slots: [
      { cats: ["fruit"], base: 130, min: 80, max: 250, ajustable: true, optionnel: false, choix_multiples: 1 },
    ],
  },

  {
    id: "salade-crudites", type_de_piece: "entree", temperature: "froid",
    slots: [
      { cats: ["legume"], base: 120, min: 80, max: 200, ajustable: true, optionnel: false, choix_multiples: 2 },
      { cats: ["matiere_grasse"], base: 8, min: 5, max: 12, ajustable: true, optionnel: true, choix_multiples: 1 }, // vinaigrette
      { cats: ["oleagineux"], base: 10, min: 5, max: 15, ajustable: true, optionnel: true, choix_multiples: 1 },
    ],
  },

  {
    id: "soupe-legumes", type_de_piece: "entree", temperature: "chaud",
    slots: [
      { cats: ["legume"], base: 250, min: 150, max: 350, ajustable: true, optionnel: false, choix_multiples: 2 },
      { cats: ["condiment"], base: 5, min: 5, max: 10, ajustable: false, optionnel: true, choix_multiples: 1 }, // 1/2 cube de bouillon
      { cats: ["matiere_grasse"], base: 5, min: 3, max: 10, ajustable: true, optionnel: true, choix_multiples: 1 },
    ],
  },
];

export const gabaritById = Object.fromEntries(GABARITS.map((g) => [g.id, g]));

//  ── Patrons de repas (spec § 2.4) ─────────────────────────────────
//  Parts indicatives du budget du créneau : plat 60-75 %, dessert 15-25 %,
//  entrée 10-20 %. `gabarits` (optionnel) restreint la pièce à des gabarits
//  précis. Contexte = créneaux où le patron est candidat.

export const PATRONS = [
  //  « snack » inclus : à ce créneau le budget (étage 0) écarte de lui-même
  //  les gros plats — snack-froid et les restes y deviennent les candidats naturels.
  { id: "plat_seul", pieces: [{ type: "plat", part: 1, optionnel: false }], contexte: ["dejeuner", "diner", "snack"] },

  { id: "plat_dessert", pieces: [
    { type: "plat", part: 0.75, optionnel: false },
    { type: "dessert", part: 0.25, optionnel: true },
  ], contexte: ["dejeuner", "diner"] },

  { id: "entree_plat", pieces: [
    { type: "entree", part: 0.2, optionnel: true },
    { type: "plat", part: 0.8, optionnel: false },
  ], contexte: ["diner"] },

  { id: "entree_plat_dessert", pieces: [
    { type: "entree", part: 0.15, optionnel: true },
    { type: "plat", part: 0.65, optionnel: false },
    { type: "dessert", part: 0.2, optionnel: true },
  ], contexte: ["diner"] },

  { id: "plat_laitage_fruit", pieces: [
    { type: "plat", part: 0.7, optionnel: false },
    { type: "laitage", part: 0.2, optionnel: true },
    { type: "fruit", part: 0.1, optionnel: true },
  ], contexte: ["dejeuner", "diner"] },

  //  Grab-and-go : shaker en voiture — le réflexe petit-déj de Bob.
  { id: "shake_seul", pieces: [
    { type: "plat", part: 1, optionnel: false, gabarits: ["shake"] },
  ], contexte: ["pdj", "snack"] },

  { id: "petit_dej", pieces: [
    { type: "plat", part: 0.85, optionnel: false, gabarits: ["tartines-pdj", "porridge", "shake"] },
    { type: "fruit", part: 0.15, optionnel: true },
  ], contexte: ["pdj"] },
];

export const patronById = Object.fromEntries(PATRONS.map((p) => [p.id, p]));
