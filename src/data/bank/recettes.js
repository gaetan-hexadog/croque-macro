//  ════════════════════════════════════════════════════════════════
//  bank/recettes.js — BANQUE v1 : recettes signature du moteur de repas.
//  Format = contrat `Recette` de src/lib/engine/README.md (spec docs/MOTEUR-REPAS.md § 2.3).
//  Converties depuis les recettes RÉELLES de src/data/library.snapshot.js
//  (champ `source` = id snapshot, pour la traçabilité et la liaison future).
//
//  Conventions :
//  - `components[].ref` = slug de bank/ingredients.js — JAMAIS un slug inventé.
//  - Quantités en GRAMMES ; céréales/légumineuses/pâtes en POIDS SEC : les
//    quantités « cuites » de la source sont converties via facteur_cuisson
//    (ex. 150 g de pois chiches cuits ≈ 60 g secs, facteur 2,6).
//  - `min`/`max` : bornes plausibles ±40-60 % (les discrets sur des pas entiers).
//  - `ajustable: true` = leviers du solveur (protéine principale, féculent,
//    matière grasse, légumes en volume) ; aromates/sauces d'appoint = false.
//  - `principal: true` sur LA protéine (ou l'ingrédient dominant) — un seul
//    par recette (anti-répétition § 3.4).
//  - Les kcal/p ne sont PAS stockés ici : une donnée = une source (spec § 1),
//    le moteur recalcule depuis le référentiel.
//  ════════════════════════════════════════════════════════════════

export const RECETTES = [
  // ── Petit-déjeuner ──────────────────────────────────────────────
  {
    id: "overnight-oats-proteine", source: "idea-oats",
    nom: "Overnight oats protéiné", type_de_piece: "plat", portions: 1,
    components: [
      { ref: "flocons-avoine", qty: 40, min: 25, max: 60, ajustable: true },
      { ref: "lait-amande", qty: 250, min: 150, max: 300, ajustable: false }, // jamais un levier prot
      { ref: "poudre-vegan-protein", qty: 35, min: 18, max: 53, ajustable: true, principal: true }, // 1 dose
      { ref: "fruits-rouges", qty: 60, min: 30, max: 100, ajustable: true },
      { ref: "graines-chia", qty: 4, min: 0, max: 10, ajustable: false }, // 1 c. à café
    ],
    slots: [],
    steps: [
      "La veille, mélange flocons + lait + protéine + chia dans un bocal.",
      "Laisse une nuit au frigo.",
      "Le matin, ajoute les fruits.",
    ],
  },
  {
    id: "pancakes-proteines", source: "idea-pancakes",
    nom: "Pancakes protéinés", type_de_piece: "plat", portions: 1,
    components: [
      { ref: "flocons-avoine", qty: 40, min: 25, max: 60, ajustable: true },
      { ref: "oeuf", qty: 100, min: 50, max: 150, ajustable: true, principal: true }, // 2 œufs — discret
      { ref: "banane", qty: 120, min: 60, max: 150, ajustable: true },
      { ref: "poudre-vegan-protein", qty: 18, min: 0, max: 35, ajustable: true }, // 1/2 dose
      { ref: "epices-moulues", qty: 2, min: 0, max: 4, ajustable: false }, // cannelle
    ],
    slots: [],
    steps: [
      "Mixe le tout en pâte.",
      "Cuis en petits pancakes, poêle antiadhésive sans huile.",
      "Garnis de fruits ou d'un filet de sirop léger.",
    ],
  },
  {
    id: "tofu-brouille-express", source: "idea-tofuscramble",
    nom: "Tofu brouillé express", type_de_piece: "plat", portions: 1,
    components: [
      { ref: "tofu-ferme", qty: 150, min: 100, max: 250, ajustable: true, principal: true },
      { ref: "epices-moulues", qty: 3, min: 0, max: 6, ajustable: false }, // curcuma, paprika (+ kala namak, non référencé)
      { ref: "pain-complet", qty: 35, min: 35, max: 70, ajustable: true }, // 1 tranche — discret
    ],
    slots: [],
    steps: [
      "Écrase le tofu à la fourchette.",
      "Poêle antiadhésive + épices, 5 min.",
      "Sers avec le pain.",
    ],
  },
  {
    id: "porridge-proteine", source: "idea-porridge",
    nom: "Porridge protéiné chaud", type_de_piece: "plat", portions: 1,
    components: [
      { ref: "flocons-avoine", qty: 40, min: 25, max: 60, ajustable: true },
      { ref: "lait-amande", qty: 250, min: 150, max: 300, ajustable: false },
      { ref: "poudre-vegan-protein", qty: 35, min: 18, max: 53, ajustable: true, principal: true },
      { ref: "banane", qty: 60, min: 0, max: 120, ajustable: true }, // 1/2 banane
      { ref: "epices-moulues", qty: 2, min: 0, max: 4, ajustable: false }, // cannelle
    ],
    slots: [],
    steps: [
      "Cuis flocons + lait 3-4 min en remuant.",
      "Hors du feu, incorpore la protéine.",
      "Garnis de banane et cannelle.",
    ],
  },
  {
    id: "toast-oeuf-avocat", source: "idea-toastoeuf",
    nom: "Toast œuf-avocat", type_de_piece: "plat", portions: 1,
    components: [
      { ref: "pain-complet", qty: 70, min: 35, max: 105, ajustable: true }, // 2 tranches — discret
      { ref: "avocat", qty: 70, min: 35, max: 140, ajustable: true }, // 1/2 avocat
      { ref: "oeuf", qty: 100, min: 50, max: 150, ajustable: true, principal: true }, // 2 œufs — discret
      { ref: "citron", qty: 10, min: 0, max: 20, ajustable: false },
    ],
    slots: [],
    steps: [
      "Toaste le pain, écrase l'avocat dessus.",
      "Cuis les œufs.",
      "Pose-les sur le toast, citron + piment.",
    ],
  },

  // ── Déjeuner ────────────────────────────────────────────────────
  {
    id: "buddha-bowl-tofu", source: "idea-buddha",
    nom: "Buddha bowl tofu", type_de_piece: "plat", portions: 1,
    components: [
      { ref: "tofu-fume", qty: 150, min: 100, max: 220, ajustable: true, principal: true },
      { ref: "quinoa-sec", qty: 80, min: 40, max: 120, ajustable: true },
      { ref: "edamame", qty: 80, min: 40, max: 120, ajustable: true },
      { ref: "carotte", qty: 80, min: 40, max: 150, ajustable: true },
      { ref: "chou-blanc", qty: 60, min: 30, max: 120, ajustable: true },
      { ref: "concombre", qty: 80, min: 40, max: 150, ajustable: true },
      { ref: "sauce-soja", qty: 15, min: 5, max: 25, ajustable: false },
      { ref: "citron", qty: 15, min: 0, max: 30, ajustable: false },
      { ref: "gingembre", qty: 5, min: 0, max: 10, ajustable: false },
    ],
    slots: [],
    steps: [
      "Cuis le quinoa.",
      "Poêle le tofu.",
      "Assemble avec edamame et crudités, nappe de sauce.",
    ],
  },
  {
    id: "omelette-garnie", source: "idea-omelette",
    nom: "Omelette garnie", type_de_piece: "plat", portions: 1,
    components: [
      { ref: "oeuf", qty: 150, min: 100, max: 200, ajustable: true, principal: true }, // 3 œufs — discret
      { ref: "champignon-paris", qty: 100, min: 50, max: 200, ajustable: true },
      { ref: "epinards", qty: 80, min: 40, max: 150, ajustable: true },
      { ref: "huile-olive", qty: 8, min: 5, max: 15, ajustable: true },
      { ref: "pain-complet", qty: 35, min: 35, max: 70, ajustable: true }, // 1 tranche — discret
    ],
    slots: [],
    steps: [
      "Fais revenir champignons et épinards.",
      "Verse les œufs battus, cuis l'omelette.",
      "Sers avec le pain.",
    ],
  },
  {
    id: "wrap-proteine", source: "idea-wrap",
    nom: "Wrap protéiné", type_de_piece: "plat", portions: 1,
    components: [
      { ref: "tortilla-complete", qty: 60, min: 60, max: 120, ajustable: true }, // 1 wrap — discret
      { ref: "jambon-vegetal", qty: 100, min: 50, max: 150, ajustable: true, principal: true }, // 4 tranches de 25 g (qty supposée, source sans quantité ; ≥ 80 g = portion protéique d'un plat)
      { ref: "carotte", qty: 50, min: 25, max: 100, ajustable: true },
      { ref: "concombre", qty: 60, min: 30, max: 100, ajustable: true },
      { ref: "salade-verte", qty: 20, min: 0, max: 40, ajustable: false },
      { ref: "houmous", qty: 15, min: 10, max: 30, ajustable: false }, // 1 c. à soupe
    ],
    slots: [],
    steps: [
      "Tartine le houmous.",
      "Garnis de protéine + crudités.",
      "Roule serré.",
    ],
  },
  {
    id: "bowl-mediterraneen", source: "idea-medbowl",
    nom: "Bowl méditerranéen", type_de_piece: "plat", portions: 1,
    components: [
      { ref: "pois-chiches-sec", qty: 60, min: 35, max: 90, ajustable: true, principal: true }, // 150 g cuits ≈ 60 g secs
      { ref: "oeuf", qty: 50, min: 50, max: 100, ajustable: true }, // 1 œuf dur — discret
      { ref: "concombre", qty: 100, min: 50, max: 200, ajustable: true },
      { ref: "tomate", qty: 120, min: 60, max: 200, ajustable: true },
      { ref: "boulgour-sec", qty: 60, min: 30, max: 90, ajustable: true },
      { ref: "citron", qty: 15, min: 0, max: 30, ajustable: false },
      { ref: "herbes-fraiches", qty: 3, min: 0, max: 6, ajustable: false },
    ],
    slots: [],
    steps: [
      "Cuis le boulgour.",
      "Assemble pois chiches, œuf, légumes.",
      "Assaisonne citron + herbes.",
    ],
  },
  {
    id: "dahl-lentilles-corail", source: "idea-dahl",
    nom: "Dahl de lentilles corail", type_de_piece: "plat", portions: 1,
    components: [
      { ref: "lentilles-corail-seches", qty: 80, min: 50, max: 120, ajustable: true, principal: true },
      { ref: "lait-coco-allege", qty: 150, min: 75, max: 200, ajustable: true }, // levier kcal (p≈0)
      { ref: "tomate", qty: 120, min: 60, max: 200, ajustable: true },
      { ref: "oignon", qty: 60, min: 30, max: 110, ajustable: true },
      { ref: "epices-moulues", qty: 4, min: 0, max: 8, ajustable: false }, // curcuma, cumin
      { ref: "riz-basmati-sec", qty: 60, min: 30, max: 90, ajustable: true },
    ],
    slots: [],
    steps: [
      "Fais revenir oignon + épices.",
      "Ajoute lentilles, tomate, coco, mijote 15 min.",
      "Sers sur le riz.",
    ],
  },
  {
    id: "poke-bowl-tofu", source: "idea-poke",
    nom: "Poke bowl tofu", type_de_piece: "plat", portions: 1,
    components: [
      { ref: "riz-basmati-sec", qty: 80, min: 40, max: 120, ajustable: true },
      { ref: "tofu-fume", qty: 120, min: 80, max: 180, ajustable: true, principal: true },
      { ref: "edamame", qty: 60, min: 30, max: 100, ajustable: true },
      { ref: "concombre", qty: 80, min: 40, max: 150, ajustable: true },
      { ref: "carotte", qty: 60, min: 30, max: 100, ajustable: true },
      { ref: "oignon", qty: 30, min: 0, max: 60, ajustable: false }, // oignon rouge dans la source
      { ref: "sauce-soja", qty: 15, min: 5, max: 25, ajustable: false },
      { ref: "graines-sesame", qty: 8, min: 0, max: 16, ajustable: false },
    ],
    slots: [],
    steps: [
      "Dispose le riz tiède dans un bol.",
      "Ajoute tofu, edamame et crudités.",
      "Nappe de sauce, parsème de sésame.",
    ],
  },
  {
    id: "chili-sin-carne", source: "idea-chili",
    nom: "Chili sin carne", type_de_piece: "plat", portions: 1,
    components: [
      { ref: "hache-vegetal", qty: 100, min: 60, max: 150, ajustable: true, principal: true },
      { ref: "haricots-rouges-secs", qty: 60, min: 35, max: 90, ajustable: true }, // 150 g cuits ≈ 60 g secs
      { ref: "tomates-concassees", qty: 200, min: 100, max: 300, ajustable: true },
      { ref: "poivron", qty: 100, min: 50, max: 150, ajustable: true },
      { ref: "epices-moulues", qty: 4, min: 0, max: 8, ajustable: false }, // épices chili
      { ref: "riz-basmati-sec", qty: 60, min: 30, max: 90, ajustable: true },
    ],
    slots: [],
    steps: [
      "Fais revenir haché + poivron.",
      "Ajoute tomate, haricots, épices, mijote 15 min.",
      "Sers avec le riz.",
    ],
  },
  {
    id: "salade-vegan-hyper-proteinee", source: "idea-hpsalad",
    nom: "Salade vegan hyper-protéinée", type_de_piece: "plat", portions: 1,
    components: [
      { ref: "tofu-fume", qty: 80, min: 50, max: 130, ajustable: true, principal: true },
      { ref: "edamame", qty: 80, min: 40, max: 120, ajustable: true },
      { ref: "pois-chiches-sec", qty: 40, min: 25, max: 60, ajustable: true }, // 100 g cuits ≈ 40 g secs
      { ref: "carotte", qty: 60, min: 30, max: 100, ajustable: true },
      { ref: "concombre", qty: 80, min: 40, max: 150, ajustable: true },
      { ref: "graines-courge", qty: 10, min: 0, max: 20, ajustable: false },
      { ref: "tahini", qty: 15, min: 8, max: 25, ajustable: true }, // matière grasse de la sauce
      { ref: "citron", qty: 15, min: 0, max: 30, ajustable: false },
    ],
    slots: [],
    steps: [
      "Assemble edamame, pois chiches, tofu et crudités.",
      "Émulsionne tahini + citron + un peu d'eau.",
      "Nappe, parsème de graines.",
    ],
  },

  // ── Dîner ───────────────────────────────────────────────────────
  {
    id: "curry-pois-chiches-express", source: "idea-curry",
    nom: "Curry de pois chiches express", type_de_piece: "plat", portions: 1,
    components: [
      { ref: "pois-chiches-sec", qty: 60, min: 35, max: 90, ajustable: true, principal: true }, // 150 g cuits ≈ 60 g secs
      { ref: "lait-coco-allege", qty: 150, min: 75, max: 200, ajustable: true }, // levier kcal (p≈0)
      { ref: "epinards", qty: 100, min: 50, max: 200, ajustable: true },
      { ref: "tomates-concassees", qty: 200, min: 100, max: 300, ajustable: true },
      { ref: "pate-de-curry", qty: 15, min: 8, max: 25, ajustable: false },
      { ref: "riz-basmati-sec", qty: 100, min: 50, max: 140, ajustable: true },
    ],
    slots: [],
    steps: [
      "Fais mijoter tomate + curry + coco.",
      "Ajoute pois chiches et épinards, 10 min.",
      "Sers sur le riz.",
    ],
  },
  {
    id: "poelee-tofu-legumes-soba", source: "idea-wok",
    nom: "Poêlée tofu-légumes & soba", type_de_piece: "plat", portions: 1,
    components: [
      { ref: "tofu-teriyaki", qty: 150, min: 100, max: 220, ajustable: true, principal: true },
      { ref: "poivron", qty: 100, min: 50, max: 150, ajustable: true },
      { ref: "brocoli", qty: 150, min: 80, max: 250, ajustable: true }, // « pousses » de la source omises (non référencées)
      { ref: "nouilles-soba-seches", qty: 80, min: 40, max: 120, ajustable: true },
      { ref: "sauce-soja", qty: 15, min: 5, max: 25, ajustable: false },
    ],
    slots: [],
    steps: [
      "Cuis les soba.",
      "Saute tofu + légumes au wok.",
      "Mélange, nappe de sauce.",
    ],
  },
  {
    id: "galette-sarrasin-garnie", source: "idea-galette",
    nom: "Galette de sarrasin garnie", type_de_piece: "plat", portions: 1,
    components: [
      { ref: "galette-sarrasin", qty: 65, min: 65, max: 130, ajustable: true }, // 1 galette — discret
      { ref: "oeuf", qty: 100, min: 50, max: 150, ajustable: true, principal: true }, // 2 œufs — discret (≥ 80 g = portion protéique d'un plat)
      { ref: "champignon-paris", qty: 80, min: 40, max: 150, ajustable: true },
      { ref: "emmental-rape", qty: 20, min: 10, max: 40, ajustable: true },
    ],
    slots: [],
    steps: [
      "Réchauffe la galette.",
      "Casse l'œuf au centre, ajoute champignons + fromage.",
      "Replie et sers.",
    ],
  },
  {
    id: "pates-completes-boulettes", source: "idea-pates",
    nom: "Pâtes complètes & boulettes végétales", type_de_piece: "plat", portions: 1,
    components: [
      { ref: "pates-completes-seches", qty: 80, min: 40, max: 120, ajustable: true },
      { ref: "boulettes-vegetales", qty: 100, min: 60, max: 160, ajustable: true, principal: true }, // 5 boulettes — discret
      { ref: "sauce-tomate-basilic", qty: 150, min: 75, max: 250, ajustable: true },
      { ref: "parmesan-vegetal", qty: 10, min: 0, max: 20, ajustable: false }, // option
    ],
    slots: [],
    steps: [
      "Cuis les pâtes.",
      "Réchauffe boulettes dans la sauce tomate.",
      "Mélange et sers.",
    ],
  },
  {
    id: "shakshuka", source: "idea-shakshuka",
    nom: "Shakshuka", type_de_piece: "plat", portions: 1,
    components: [
      { ref: "oeuf", qty: 150, min: 100, max: 200, ajustable: true, principal: true }, // 3 œufs — discret
      { ref: "tomates-concassees", qty: 300, min: 150, max: 400, ajustable: true },
      { ref: "poivron", qty: 150, min: 75, max: 225, ajustable: true },
      { ref: "oignon", qty: 60, min: 30, max: 110, ajustable: true },
      { ref: "epices-moulues", qty: 4, min: 0, max: 8, ajustable: false }, // cumin, paprika
      { ref: "pain-complet", qty: 35, min: 35, max: 70, ajustable: true }, // 1 tranche — discret
    ],
    slots: [],
    steps: [
      "Mijote tomate + poivron + épices.",
      "Casse les œufs dedans, couvre 5-6 min.",
      "Sers avec le pain pour saucer.",
    ],
  },
  {
    id: "tofu-croustillant-orange", source: "idea-orangetofu",
    nom: "Tofu croustillant à l'orange", type_de_piece: "plat", portions: 1,
    components: [
      { ref: "tofu-ferme", qty: 200, min: 120, max: 280, ajustable: true, principal: true },
      { ref: "maizena", qty: 10, min: 5, max: 15, ajustable: false }, // 1 c. à soupe
      { ref: "orange", qty: 100, min: 50, max: 130, ajustable: false }, // le jus d'1 orange
      { ref: "sauce-soja", qty: 30, min: 15, max: 45, ajustable: false }, // 2 c. à soupe
      { ref: "sirop-erable", qty: 7, min: 0, max: 15, ajustable: false }, // 1 c. à café
      { ref: "ail", qty: 5, min: 0, max: 10, ajustable: false },
      { ref: "gingembre", qty: 5, min: 0, max: 10, ajustable: false },
      { ref: "huile-olive", qty: 5, min: 0, max: 10, ajustable: true }, // « peu d'huile » (ou airfryer)
      { ref: "riz-basmati-sec", qty: 60, min: 30, max: 90, ajustable: true },
    ],
    slots: [],
    steps: [
      "Presse le tofu, enrobe les cubes de maïzena.",
      "Dore-les à la poêle (peu d'huile) ou à l'airfryer jusqu'à croustillant.",
      "Fais réduire jus d'orange + soja + sirop + ail/gingembre 3 min.",
      "Enrobe le tofu de sauce, sers sur le riz.",
    ],
  },
  {
    id: "bolognaise-vegetale-lentilles", source: "idea-bolo",
    nom: "Bolognaise végétale aux lentilles", type_de_piece: "plat", portions: 1,
    components: [
      { ref: "lentilles-vertes-seches", qty: 60, min: 35, max: 90, ajustable: true, principal: true }, // 150 g cuites ≈ 60 g sèches
      { ref: "carotte", qty: 80, min: 40, max: 150, ajustable: true },
      { ref: "oignon", qty: 60, min: 30, max: 110, ajustable: true },
      { ref: "celeri-branche", qty: 40, min: 0, max: 80, ajustable: false },
      { ref: "tomates-concassees", qty: 200, min: 100, max: 300, ajustable: true },
      { ref: "herbes-fraiches", qty: 3, min: 0, max: 6, ajustable: false },
      { ref: "pates-completes-seches", qty: 80, min: 40, max: 120, ajustable: true },
    ],
    slots: [],
    steps: [
      "Fais revenir carotte, oignon, céleri.",
      "Ajoute lentilles, tomate, herbes, mijote 20 min.",
      "Cuis les pâtes, mélange.",
    ],
  },

  // ── Entrées (dips & salades fraîches) ───────────────────────────
  {
    id: "houmous-haricots-rouges", source: "idea-houmous-rouge",
    nom: "Houmous de haricots rouges maison", type_de_piece: "entree", portions: 4,
    components: [
      { ref: "haricots-rouges-secs", qty: 125, min: 75, max: 190, ajustable: true, principal: true }, // 300 g cuits ≈ 125 g secs
      { ref: "tahini", qty: 45, min: 25, max: 70, ajustable: true }, // 3 c. à soupe
      { ref: "huile-olive", qty: 30, min: 10, max: 45, ajustable: true }, // 1 c. à soupe suffit pour alléger
      { ref: "citron", qty: 40, min: 20, max: 60, ajustable: false }, // 1/2 citron pressé
    ],
    slots: [],
    steps: [
      "Mixe tout jusqu'à consistance lisse.",
      "Ajoute un peu d'eau ou d'aquafaba (jus de la boîte) si trop épais.",
      "Rectifie sel et citron. Sers avec des crudités.",
    ],
  },
  {
    id: "houmous-crudites", source: "idea-houmous",
    nom: "Houmous & crudités", type_de_piece: "entree", portions: 1,
    components: [
      { ref: "houmous", qty: 30, min: 15, max: 50, ajustable: true, principal: true }, // 2 c. à soupe
      { ref: "carotte", qty: 80, min: 40, max: 150, ajustable: true },
      { ref: "concombre", qty: 100, min: 50, max: 150, ajustable: true },
      { ref: "poivron", qty: 75, min: 0, max: 150, ajustable: true },
    ],
    slots: [],
    steps: [
      "Coupe les crudités.",
      "Trempe.",
    ],
  },
  {
    id: "salade-concombre-yaourt-soja", source: "idea-concoyaourt",
    nom: "Salade concombre au yaourt soja", type_de_piece: "entree", portions: 1,
    components: [
      { ref: "concombre", qty: 300, min: 150, max: 450, ajustable: true },
      { ref: "yaourt-soja-nature", qty: 150, min: 100, max: 250, ajustable: true, principal: true },
      { ref: "ail", qty: 5, min: 0, max: 10, ajustable: false },
      { ref: "herbes-fraiches", qty: 5, min: 0, max: 10, ajustable: false }, // menthe
      { ref: "citron", qty: 10, min: 0, max: 20, ajustable: false },
    ],
    slots: [],
    steps: [
      "Coupe le concombre.",
      "Mélange yaourt soja + ail + menthe + citron.",
      "Assaisonne et sers bien frais.",
    ],
  },

  // ── Desserts protéinés ──────────────────────────────────────────
  {
    id: "mug-cake-proteine", source: "idea-mugcake",
    nom: "Mug cake protéiné", type_de_piece: "dessert", portions: 1,
    components: [
      { ref: "poudre-vegan-protein", qty: 35, min: 18, max: 53, ajustable: true, principal: true }, // 1 dose (chocolat)
      { ref: "cacao-poudre", qty: 7, min: 4, max: 12, ajustable: false }, // 1 c. à soupe
      { ref: "banane", qty: 60, min: 30, max: 90, ajustable: true }, // 1/2 banane écrasée
      { ref: "blanc-oeuf", qty: 33, min: 33, max: 66, ajustable: true }, // 1 blanc — discret
      { ref: "levure-chimique", qty: 2, min: 0, max: 4, ajustable: false }, // 1/2 c. à café
    ],
    slots: [],
    steps: [
      "Mélange tout dans un mug.",
      "Micro-ondes 1 min.",
      "Laisse tiédir 1 min avant de manger.",
    ],
  },
  {
    id: "skyr-soja-noix", source: "idea-skyrnoix",
    nom: "Skyr soja & noix", type_de_piece: "dessert", portions: 1,
    components: [
      { ref: "yaourt-soja-proteine", qty: 150, min: 100, max: 250, ajustable: true, principal: true },
      { ref: "noix", qty: 20, min: 10, max: 30, ajustable: true },
      { ref: "miel", qty: 7, min: 0, max: 15, ajustable: false }, // filet, option
    ],
    slots: [],
    steps: [
      "Mélange.",
      "Ajoute les noix au moment de manger.",
    ],
  },
];

export const recetteById = Object.fromEntries(RECETTES.map((r) => [r.id, r]));
