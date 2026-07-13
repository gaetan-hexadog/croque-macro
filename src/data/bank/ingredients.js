//  ════════════════════════════════════════════════════════════════
//  bank/ingredients.js — BANQUE v1 : référentiel d'ingrédients du moteur de repas.
//  Format = contrat `Ingredient` de src/lib/engine/README.md (spec docs/MOTEUR-REPAS.md § 2.1).
//
//  Conventions :
//  - Valeurs /100 g, ordre CIQUAL. Céréales, légumineuses, pâtes, PST : POIDS SEC
//    (+ `facteur_cuisson` sec→cuit, UI seulement — le moteur reste en cru).
//    Pommes de terre / patate douce : poids CRU, pas de facteur (≈ poids cuit à l'eau).
//  - Liquides : valeurs /100 ml.
//  - `unites` : conversions vers grammes (piece_g, tranche_g, cas_g, cac_g, dose_g,
//    pot_g, boite_g, poignee_g, gousse_g). `poids_egoutte` : conserves uniquement.
//  - `discret` : ajustement par pas entiers (œufs, tranches, doses, cubes).
//  - `ciqual_code: null` PARTOUT — validation humaine à venir, jamais deviné.
//    `ciqual_recherche` = libellé de recherche proche CIQUAL ; null pour les produits
//    de marque sans équivalent générique (poudres Bulk, La Vie…) → macros étiquette.
//  - PROFIL DUR : végétarien (ni viande, ni poisson, ni gélatine/présure animale) ;
//    œufs et fromages AU LAIT DE VACHE uniquement (jamais chèvre/brebis — feta,
//    pecorino & co N'EXISTENT PAS ici) ; lait végétal par défaut = amande non sucrée
//    (~1 g prot/250 ml : jamais une source de protéines) ; suppléments Bulk réels.
//  - Tag `a_verifier` : présure animale possible (comté/parmesan AOP…), pâte de
//    crevette possible (pâte de curry), pecorino possible (pesto), ou macros
//    étiquette de marque à confirmer.
//  ════════════════════════════════════════════════════════════════

export const INGREDIENTS = [
  // ── Légumes (crus sauf mention) ─────────────────────────────────
  { slug: "carotte", nom: "Carottes", cat: "legume", tags: [], kcal100: 41, p100: 0.9, discret: false, unites: { piece_g: 80 }, ciqual_recherche: "Carotte, crue", ciqual_code: null },
  { slug: "courgette", nom: "Courgettes", cat: "legume", tags: [], kcal100: 20, p100: 1.2, discret: false, unites: { piece_g: 250 }, ciqual_recherche: "Courgette, pulpe et peau, crue", ciqual_code: null },
  { slug: "epinards", nom: "Épinards", cat: "legume", tags: [], kcal100: 28, p100: 2.9, discret: false, unites: { poignee_g: 40 }, ciqual_recherche: "Épinard, cru", ciqual_code: null },
  { slug: "brocoli", nom: "Brocoli", cat: "legume", tags: [], kcal100: 32, p100: 2.5, discret: false, unites: { piece_g: 350 }, ciqual_recherche: "Brocoli, cru", ciqual_code: null },
  { slug: "chou-fleur", nom: "Chou-fleur", cat: "legume", tags: [], kcal100: 25, p100: 1.9, discret: false, unites: { piece_g: 600 }, ciqual_recherche: "Chou-fleur, cru", ciqual_code: null },
  { slug: "poivron", nom: "Poivron", cat: "legume", tags: [], kcal100: 29, p100: 1.0, discret: false, unites: { piece_g: 150 }, ciqual_recherche: "Poivron rouge, cru", ciqual_code: null },
  { slug: "oignon", nom: "Oignon", cat: "legume", tags: [], kcal100: 40, p100: 1.2, discret: false, unites: { piece_g: 110 }, ciqual_recherche: "Oignon, cru", ciqual_code: null },
  { slug: "tomate", nom: "Tomates", cat: "legume", tags: [], kcal100: 17, p100: 0.8, discret: false, unites: { piece_g: 120 }, ciqual_recherche: "Tomate, crue", ciqual_code: null },
  { slug: "concombre", nom: "Concombre", cat: "legume", tags: [], kcal100: 13, p100: 0.7, discret: false, unites: { piece_g: 300 }, ciqual_recherche: "Concombre, pulpe et peau, cru", ciqual_code: null },
  { slug: "champignon-paris", nom: "Champignons de Paris", cat: "legume", tags: [], kcal100: 25, p100: 2.5, discret: false, unites: { poignee_g: 60 }, ciqual_recherche: "Champignon de Paris, cru", ciqual_code: null },
  { slug: "haricots-verts", nom: "Haricots verts", cat: "legume", tags: [], kcal100: 33, p100: 1.9, discret: false, ciqual_recherche: "Haricot vert, cru", ciqual_code: null },
  { slug: "petits-pois", nom: "Petits pois (surgelés)", cat: "legume", tags: ["surgele"], kcal100: 80, p100: 5.5, discret: false, poids_egoutte: 280, unites: { boite_g: 400, poignee_g: 40 }, ciqual_recherche: "Petits pois, crus", ciqual_code: null },
  { slug: "asperges", nom: "Asperges vertes", cat: "legume", tags: [], kcal100: 21, p100: 2.2, discret: false, unites: { piece_g: 20 }, ciqual_recherche: "Asperge, crue", ciqual_code: null },
  { slug: "celeri-branche", nom: "Céleri branche", cat: "legume", tags: [], kcal100: 15, p100: 0.8, discret: false, unites: { piece_g: 50 }, ciqual_recherche: "Céleri branche, cru", ciqual_code: null },
  { slug: "chou-blanc", nom: "Chou blanc", cat: "legume", tags: [], kcal100: 27, p100: 1.4, discret: false, ciqual_recherche: "Chou blanc, cru", ciqual_code: null },
  { slug: "roquette", nom: "Roquette", cat: "legume", tags: [], kcal100: 25, p100: 2.6, discret: false, unites: { poignee_g: 25 }, ciqual_recherche: "Roquette, crue", ciqual_code: null },
  { slug: "salade-verte", nom: "Salade verte (laitue)", cat: "legume", tags: [], kcal100: 15, p100: 1.2, discret: false, unites: { poignee_g: 30 }, ciqual_recherche: "Laitue, crue", ciqual_code: null },
  { slug: "avocat", nom: "Avocat", cat: "legume", tags: ["gras"], kcal100: 160, p100: 1.9, discret: false, unites: { piece_g: 140 }, ciqual_recherche: "Avocat, pulpe, cru", ciqual_code: null },
  { slug: "mais-doux", nom: "Maïs doux (conserve)", cat: "legume", tags: ["conserve"], kcal100: 100, p100: 2.9, discret: false, poids_egoutte: 285, unites: { boite_g: 300, cas_g: 20 }, ciqual_recherche: "Maïs doux, en épi ou en grains, appertisé, égoutté", ciqual_code: null },

  // ── Féculents · céréales · pains (POIDS SEC + facteur_cuisson, pains en pièce) ──
  { slug: "riz-basmati-sec", nom: "Riz basmati (sec)", cat: "cereale", tags: [], kcal100: 349, p100: 7.1, facteur_cuisson: 2.8, discret: false, ciqual_recherche: "Riz blanc, cru", ciqual_code: null },
  { slug: "pates-seches", nom: "Pâtes (sèches)", cat: "cereale", tags: [], kcal100: 359, p100: 12, facteur_cuisson: 2.3, discret: false, ciqual_recherche: "Pâtes alimentaires, crues", ciqual_code: null },
  { slug: "pates-completes-seches", nom: "Pâtes complètes (sèches)", cat: "cereale", tags: [], kcal100: 347, p100: 13, facteur_cuisson: 2.3, discret: false, ciqual_recherche: "Pâtes alimentaires complètes, crues", ciqual_code: null },
  { slug: "quinoa-sec", nom: "Quinoa (sec)", cat: "cereale", tags: [], kcal100: 364, p100: 13.5, facteur_cuisson: 2.8, discret: false, ciqual_recherche: "Quinoa, cru", ciqual_code: null },
  { slug: "boulgour-sec", nom: "Boulgour (sec)", cat: "cereale", tags: [], kcal100: 342, p100: 11.5, facteur_cuisson: 2.5, discret: false, ciqual_recherche: "Boulghour, cru", ciqual_code: null },
  { slug: "semoule-seche", nom: "Semoule de blé (sèche)", cat: "cereale", tags: [], kcal100: 360, p100: 12, facteur_cuisson: 2.5, discret: false, ciqual_recherche: "Semoule, crue", ciqual_code: null },
  { slug: "petit-epeautre-sec", nom: "Petit épeautre (sec)", cat: "cereale", tags: [], kcal100: 338, p100: 11, facteur_cuisson: 2.5, discret: false, ciqual_recherche: "Épeautre, cru", ciqual_code: null },
  { slug: "nouilles-soba-seches", nom: "Nouilles soba (sèches)", cat: "cereale", tags: [], kcal100: 350, p100: 11, facteur_cuisson: 2.4, discret: false, ciqual_recherche: "Nouille asiatique, au sarrasin (soba), crue", ciqual_code: null },
  { slug: "flocons-avoine", nom: "Flocons d'avoine", cat: "cereale", tags: [], kcal100: 370, p100: 13, discret: false, unites: { cas_g: 10 }, ciqual_recherche: "Flocons d'avoine", ciqual_code: null },
  { slug: "muesli-sans-sucre", nom: "Muesli sans sucre ajouté", cat: "cereale", tags: [], kcal100: 367, p100: 9.5, discret: false, unites: { cas_g: 12 }, ciqual_recherche: "Muesli floconneux, sans sucre ajouté", ciqual_code: null },
  { slug: "farine-ble", nom: "Farine de blé", cat: "cereale", tags: ["placard"], kcal100: 348, p100: 10.5, discret: false, unites: { cas_g: 10 }, ciqual_recherche: "Farine de blé tendre, T65", ciqual_code: null },
  { slug: "pain-complet", nom: "Pain complet", cat: "cereale", tags: [], kcal100: 265, p100: 9, discret: true, unites: { tranche_g: 35 }, ciqual_recherche: "Pain complet ou intégral", ciqual_code: null },
  { slug: "pain-burger-complet", nom: "Pain à burger complet", cat: "cereale", tags: [], kcal100: 270, p100: 9.5, discret: true, unites: { piece_g: 60 }, ciqual_recherche: "Pain pour hamburger, complet", ciqual_code: null },
  { slug: "tortilla-complete", nom: "Tortilla complète (wrap)", cat: "cereale", tags: [], kcal100: 300, p100: 9, discret: true, unites: { piece_g: 60 }, ciqual_recherche: "Tortilla de blé, wrap, nature", ciqual_code: null },
  { slug: "galette-sarrasin", nom: "Galette de sarrasin (cuite)", cat: "cereale", tags: [], kcal100: 160, p100: 5.5, discret: true, unites: { piece_g: 65 }, ciqual_recherche: "Galette ou crêpe de sarrasin, cuite", ciqual_code: null },
  { slug: "pomme-de-terre", nom: "Pommes de terre", cat: "cereale", tags: ["tubercule"], kcal100: 75, p100: 1.9, discret: false, unites: { piece_g: 150 }, ciqual_recherche: "Pomme de terre, crue", ciqual_code: null },
  { slug: "patate-douce", nom: "Patate douce", cat: "cereale", tags: ["tubercule"], kcal100: 79, p100: 1.4, discret: false, unites: { piece_g: 250 }, ciqual_recherche: "Patate douce, crue", ciqual_code: null },

  // ── Légumineuses (POIDS SEC ; conserve via boite_g + poids_egoutte) ──
  { slug: "pois-chiches-sec", nom: "Pois chiches (secs)", cat: "legumineuse", tags: ["haute_proteine"], kcal100: 364, p100: 19, facteur_cuisson: 2.6, discret: false, unites: { boite_g: 400 }, poids_egoutte: 265, ciqual_recherche: "Pois chiche, sec", ciqual_code: null },
  { slug: "lentilles-vertes-seches", nom: "Lentilles vertes (sèches)", cat: "legumineuse", tags: ["haute_proteine"], kcal100: 336, p100: 24.5, facteur_cuisson: 2.4, discret: false, ciqual_recherche: "Lentille verte, sèche", ciqual_code: null },
  { slug: "lentilles-corail-seches", nom: "Lentilles corail (sèches)", cat: "legumineuse", tags: ["haute_proteine", "cuisson_rapide"], kcal100: 352, p100: 24, facteur_cuisson: 2.4, discret: false, ciqual_recherche: "Lentille corail, sèche", ciqual_code: null },
  { slug: "haricots-rouges-secs", nom: "Haricots rouges (secs)", cat: "legumineuse", tags: ["haute_proteine"], kcal100: 333, p100: 22, facteur_cuisson: 2.4, discret: false, unites: { boite_g: 400 }, poids_egoutte: 255, ciqual_recherche: "Haricot rouge, sec", ciqual_code: null },
  { slug: "haricots-noirs-secs", nom: "Haricots noirs (secs)", cat: "legumineuse", tags: ["haute_proteine"], kcal100: 340, p100: 21.5, facteur_cuisson: 2.4, discret: false, unites: { boite_g: 400 }, poids_egoutte: 255, ciqual_recherche: "Haricot noir, sec", ciqual_code: null },
  { slug: "haricots-blancs-secs", nom: "Haricots blancs (secs)", cat: "legumineuse", tags: ["haute_proteine"], kcal100: 330, p100: 21, facteur_cuisson: 2.4, discret: false, unites: { boite_g: 400 }, poids_egoutte: 265, ciqual_recherche: "Haricot blanc, sec", ciqual_code: null },

  // ── Protéines végétales ─────────────────────────────────────────
  { slug: "tofu-ferme", nom: "Tofu ferme", cat: "proteine_vegetale", tags: ["haute_proteine"], kcal100: 125, p100: 13.5, discret: false, ciqual_recherche: "Tofu, nature", ciqual_code: null },
  { slug: "tofu-soyeux", nom: "Tofu soyeux", cat: "proteine_vegetale", tags: [], kcal100: 55, p100: 6, discret: false, ciqual_recherche: "Tofu soyeux, nature", ciqual_code: null },
  { slug: "tofu-fume", nom: "Tofu fumé", cat: "proteine_vegetale", tags: ["haute_proteine"], kcal100: 150, p100: 16.5, discret: false, ciqual_recherche: "Tofu, fumé", ciqual_code: null },
  { slug: "tofu-teriyaki", nom: "Tofu teriyaki (mariné)", cat: "proteine_vegetale", tags: ["haute_proteine", "a_verifier"], kcal100: 145, p100: 14, discret: false, ciqual_recherche: null, ciqual_code: null }, // macros étiquette (La Vie / Tossolia)
  { slug: "tempeh", nom: "Tempeh", cat: "proteine_vegetale", tags: ["haute_proteine"], kcal100: 166, p100: 19, discret: false, ciqual_recherche: "Tempeh, nature", ciqual_code: null },
  { slug: "seitan", nom: "Seitan", cat: "proteine_vegetale", tags: ["haute_proteine"], kcal100: 130, p100: 22, discret: false, ciqual_recherche: "Seitan", ciqual_code: null },
  { slug: "proteines-soja-texturees", nom: "Protéines de soja texturées (sèches)", cat: "proteine_vegetale", tags: ["haute_proteine", "placard"], kcal100: 340, p100: 50, facteur_cuisson: 2.5, discret: false, ciqual_recherche: "Protéines de soja texturées, crues", ciqual_code: null },
  { slug: "hache-vegetal", nom: "Haché végétal (soja)", cat: "proteine_vegetale", tags: ["haute_proteine", "a_verifier"], kcal100: 185, p100: 17, discret: false, ciqual_recherche: "Haché végétal au soja, préemballé", ciqual_code: null }, // étiquette Garden Gourmet
  { slug: "steak-vegetal", nom: "Steak végétal", cat: "proteine_vegetale", tags: ["haute_proteine", "a_verifier"], kcal100: 190, p100: 16, discret: true, unites: { piece_g: 100 }, ciqual_recherche: "Steak de soja, préemballé", ciqual_code: null },
  { slug: "boulettes-vegetales", nom: "Boulettes végétales", cat: "proteine_vegetale", tags: ["haute_proteine", "a_verifier"], kcal100: 200, p100: 15, discret: true, unites: { piece_g: 20 }, ciqual_recherche: "Boulettes au soja", ciqual_code: null }, // étiquette (La Vie…)
  { slug: "jambon-vegetal", nom: "Jambon végétal", cat: "proteine_vegetale", tags: ["haute_proteine", "a_verifier"], kcal100: 115, p100: 12, discret: true, unites: { tranche_g: 25 }, ciqual_recherche: null, ciqual_code: null }, // étiquette La Vie
  { slug: "falafels", nom: "Falafels", cat: "proteine_vegetale", tags: [], kcal100: 320, p100: 13, discret: true, unites: { piece_g: 17 }, ciqual_recherche: "Falafel", ciqual_code: null },
  { slug: "edamame", nom: "Edamame (écossé, surgelé)", cat: "proteine_vegetale", tags: ["haute_proteine", "surgele"], kcal100: 121, p100: 11.2, discret: false, unites: { poignee_g: 30 }, ciqual_recherche: "Fève de soja (edamame), crue", ciqual_code: null },

  // ── Œufs ────────────────────────────────────────────────────────
  { slug: "oeuf", nom: "Œuf", cat: "oeuf", tags: ["haute_proteine"], kcal100: 140, p100: 12.6, discret: true, unites: { piece_g: 50 }, ciqual_recherche: "Œuf, cru", ciqual_code: null },
  { slug: "blanc-oeuf", nom: "Blanc d'œuf", cat: "oeuf", tags: ["haute_proteine"], kcal100: 48, p100: 10.5, discret: true, unites: { piece_g: 33 }, ciqual_recherche: "Œuf, blanc, cru", ciqual_code: null },

  // ── Fromages (LAIT DE VACHE uniquement — jamais chèvre/brebis) ──
  { slug: "emmental-rape", nom: "Emmental râpé", cat: "fromage", tags: ["haute_proteine"], kcal100: 380, p100: 28, discret: false, unites: { cas_g: 10 }, ciqual_recherche: "Emmental râpé", ciqual_code: null },
  { slug: "mozzarella", nom: "Mozzarella (vache)", cat: "fromage", tags: ["haute_proteine"], kcal100: 240, p100: 18, discret: false, unites: { piece_g: 125 }, ciqual_recherche: "Mozzarella, au lait de vache", ciqual_code: null },
  { slug: "ricotta", nom: "Ricotta (vache)", cat: "fromage", tags: ["a_verifier"], kcal100: 170, p100: 8, discret: false, unites: { cas_g: 15 }, ciqual_recherche: "Ricotta", ciqual_code: null }, // lactosérum en théorie, présure possible selon marque
  { slug: "comte", nom: "Comté", cat: "fromage", tags: ["haute_proteine", "a_verifier"], kcal100: 410, p100: 27, discret: false, unites: { piece_g: 30 }, ciqual_recherche: "Comté", ciqual_code: null }, // AOP = présure animale obligatoire
  { slug: "parmesan", nom: "Parmesan", cat: "fromage", tags: ["haute_proteine", "a_verifier"], kcal100: 400, p100: 33, discret: false, unites: { cas_g: 10 }, ciqual_recherche: "Parmesan", ciqual_code: null }, // AOP = présure animale obligatoire
  { slug: "cheddar", nom: "Cheddar", cat: "fromage", tags: ["haute_proteine", "a_verifier"], kcal100: 405, p100: 25, discret: true, unites: { tranche_g: 20 }, ciqual_recherche: "Cheddar", ciqual_code: null }, // présure variable selon marque
  { slug: "fromage-frais-tartiner", nom: "Fromage frais à tartiner (vache)", cat: "fromage", tags: [], kcal100: 240, p100: 6.5, discret: false, unites: { cas_g: 15 }, ciqual_recherche: "Fromage frais à tartiner, nature", ciqual_code: null },
  { slug: "parmesan-vegetal", nom: "Parmesan végétal (levure-amandes)", cat: "fromage", tags: ["vegetal"], kcal100: 430, p100: 18, discret: false, unites: { cas_g: 10 }, ciqual_recherche: null, ciqual_code: null },

  // ── Laitages & alternatives ─────────────────────────────────────
  { slug: "skyr", nom: "Skyr", cat: "laitage", tags: ["haute_proteine"], kcal100: 63, p100: 10.6, discret: false, unites: { pot_g: 150 }, ciqual_recherche: "Skyr, nature", ciqual_code: null },
  { slug: "fromage-blanc-0", nom: "Fromage blanc 0 %", cat: "laitage", tags: ["haute_proteine"], kcal100: 47, p100: 7.5, discret: false, unites: { pot_g: 100 }, ciqual_recherche: "Fromage blanc, nature, 0 % MG", ciqual_code: null },
  { slug: "yaourt-soja-nature", nom: "Yaourt soja nature", cat: "laitage", tags: ["vegetal"], kcal100: 46, p100: 4, discret: false, unites: { pot_g: 100 }, ciqual_recherche: "Spécialité laitière au soja, nature", ciqual_code: null },
  { slug: "yaourt-soja-proteine", nom: "Yaourt soja protéiné", cat: "laitage", tags: ["vegetal", "haute_proteine", "a_verifier"], kcal100: 60, p100: 7, discret: false, unites: { pot_g: 150 }, ciqual_recherche: null, ciqual_code: null }, // macros étiquette selon marque

  // ── Poudres protéinées Bulk (doses réelles de foods.snapshot) ───
  { slug: "poudre-all-in-one", nom: "Vegan All-in-One (Bulk)", cat: "poudre_proteine", tags: ["haute_proteine", "vegetal"], kcal100: 360, p100: 48.3, discret: false, unites: { dose_g: 60 }, ciqual_recherche: null, ciqual_code: null }, // 1 dose 60 g = 216 kcal / 29 g
  { slug: "poudre-vegan-protein", nom: "Vegan Protein (Bulk)", cat: "poudre_proteine", tags: ["haute_proteine", "vegetal"], kcal100: 363, p100: 68.6, discret: false, unites: { dose_g: 35 }, ciqual_recherche: null, ciqual_code: null }, // 1 dose 35 g = 127 kcal / 24 g
  { slug: "clear-whey", nom: "Clear Protein (Bulk)", cat: "poudre_proteine", tags: ["haute_proteine"], kcal100: 375, p100: 90, discret: false, unites: { dose_g: 20 }, ciqual_recherche: null, ciqual_code: null }, // whey clarifiée (vache) — 1 dose 20 g = 75 kcal / 18 g
  { slug: "clear-vegan", nom: "Clear Vegan (Bulk)", cat: "poudre_proteine", tags: ["haute_proteine", "vegetal"], kcal100: 335, p100: 75, discret: false, unites: { dose_g: 20 }, ciqual_recherche: null, ciqual_code: null }, // 1 dose 20 g = 67 kcal / 15 g
  { slug: "barre-proteinee-vegane", nom: "Barre gourmet vegane (Bulk)", cat: "snack", tags: ["haute_proteine", "vegetal", "a_verifier"], kcal100: 343, p100: 28.3, discret: true, unites: { piece_g: 60 }, ciqual_recherche: null, ciqual_code: null }, // 1 barre = 206 kcal / 17 g ; poids supposé 60 g

  // ── Liquides (valeurs /100 ml) ──────────────────────────────────
  { slug: "eau", nom: "Eau", cat: "liquide", tags: [], kcal100: 0, p100: 0, discret: false, ciqual_recherche: "Eau du robinet", ciqual_code: null },
  { slug: "lait-amande", nom: "Lait d'amande (non sucré)", cat: "liquide", tags: ["vegetal"], kcal100: 15, p100: 0.5, discret: false, ciqual_recherche: "Boisson à l'amande, sans sucres ajoutés", ciqual_code: null }, // prot négligeable : jamais un levier
  { slug: "lait-soja", nom: "Lait de soja", cat: "liquide", tags: ["vegetal", "haute_proteine"], kcal100: 36, p100: 3.6, discret: false, ciqual_recherche: "Boisson au soja, nature", ciqual_code: null },
  { slug: "lait-avoine", nom: "Lait d'avoine", cat: "liquide", tags: ["vegetal"], kcal100: 45, p100: 0.8, discret: false, ciqual_recherche: "Boisson à l'avoine, nature", ciqual_code: null },
  { slug: "lait-coco-allege", nom: "Lait de coco allégé", cat: "liquide", tags: ["vegetal", "conserve", "placard"], kcal100: 72, p100: 0.5, discret: false, unites: { boite_g: 400 }, ciqual_recherche: "Lait de coco, allégé en matière grasse", ciqual_code: null },
  { slug: "kombucha", nom: "Kombucha", cat: "liquide", tags: ["a_verifier"], kcal100: 20, p100: 0, discret: false, ciqual_recherche: null, ciqual_code: null }, // macros étiquette selon marque/saveur

  // ── Matières grasses ────────────────────────────────────────────
  { slug: "huile-olive", nom: "Huile d'olive", cat: "matiere_grasse", tags: [], kcal100: 900, p100: 0, discret: false, unites: { cas_g: 10, cac_g: 4 }, ciqual_recherche: "Huile d'olive vierge extra", ciqual_code: null },
  { slug: "huile-colza", nom: "Huile neutre (colza)", cat: "matiere_grasse", tags: [], kcal100: 900, p100: 0, discret: false, unites: { cas_g: 10, cac_g: 4 }, ciqual_recherche: "Huile de colza", ciqual_code: null },
  { slug: "margarine", nom: "Margarine", cat: "matiere_grasse", tags: ["vegetal"], kcal100: 720, p100: 0.2, discret: false, unites: { cas_g: 12, cac_g: 5 }, ciqual_recherche: "Margarine, 80 % MG", ciqual_code: null },
  { slug: "beurre", nom: "Beurre", cat: "matiere_grasse", tags: [], kcal100: 745, p100: 0.7, discret: false, unites: { cas_g: 12, cac_g: 5 }, ciqual_recherche: "Beurre, doux", ciqual_code: null },

  // ── Oléagineux & graines ────────────────────────────────────────
  { slug: "amandes", nom: "Amandes", cat: "oleagineux", tags: [], kcal100: 634, p100: 21, discret: false, unites: { poignee_g: 30 }, ciqual_recherche: "Amande (avec peau)", ciqual_code: null },
  { slug: "noix", nom: "Noix", cat: "oleagineux", tags: [], kcal100: 698, p100: 15, discret: false, unites: { poignee_g: 30 }, ciqual_recherche: "Noix, séchée, cerneaux", ciqual_code: null },
  { slug: "noix-cajou", nom: "Noix de cajou", cat: "oleagineux", tags: [], kcal100: 580, p100: 18, discret: false, unites: { poignee_g: 30 }, ciqual_recherche: "Noix de cajou, grillée, non salée", ciqual_code: null },
  { slug: "puree-cacahuete", nom: "Purée de cacahuète", cat: "oleagineux", tags: [], kcal100: 600, p100: 26, discret: false, unites: { cas_g: 15, cac_g: 6 }, ciqual_recherche: "Beurre de cacahuète", ciqual_code: null },
  { slug: "tahini", nom: "Tahini (purée de sésame)", cat: "oleagineux", tags: [], kcal100: 620, p100: 24, discret: false, unites: { cas_g: 15, cac_g: 6 }, ciqual_recherche: "Pâte de sésame (tahin)", ciqual_code: null },
  { slug: "graines-chia", nom: "Graines de chia", cat: "oleagineux", tags: [], kcal100: 486, p100: 17, discret: false, unites: { cas_g: 10, cac_g: 4 }, ciqual_recherche: "Graine de chia", ciqual_code: null },
  { slug: "graines-courge", nom: "Graines de courge", cat: "oleagineux", tags: [], kcal100: 559, p100: 30, discret: false, unites: { cas_g: 10 }, ciqual_recherche: "Graine de courge", ciqual_code: null },
  { slug: "graines-sesame", nom: "Graines de sésame", cat: "oleagineux", tags: [], kcal100: 590, p100: 18, discret: false, unites: { cas_g: 8 }, ciqual_recherche: "Graine de sésame", ciqual_code: null },

  // ── Fruits ──────────────────────────────────────────────────────
  { slug: "banane", nom: "Banane", cat: "fruit", tags: [], kcal100: 90, p100: 1.1, discret: false, unites: { piece_g: 120 }, ciqual_recherche: "Banane, pulpe, crue", ciqual_code: null },
  { slug: "pomme", nom: "Pomme", cat: "fruit", tags: [], kcal100: 52, p100: 0.3, discret: true, unites: { piece_g: 150 }, ciqual_recherche: "Pomme, pulpe et peau, crue", ciqual_code: null },
  { slug: "poire", nom: "Poire", cat: "fruit", tags: [], kcal100: 53, p100: 0.4, discret: true, unites: { piece_g: 150 }, ciqual_recherche: "Poire, pulpe et peau, crue", ciqual_code: null },
  { slug: "kiwi", nom: "Kiwi", cat: "fruit", tags: [], kcal100: 58, p100: 1.1, discret: true, unites: { piece_g: 75 }, ciqual_recherche: "Kiwi, pulpe, cru", ciqual_code: null },
  { slug: "orange", nom: "Orange", cat: "fruit", tags: [], kcal100: 47, p100: 0.9, discret: true, unites: { piece_g: 130 }, ciqual_recherche: "Orange, pulpe, crue", ciqual_code: null },
  { slug: "citron", nom: "Citron", cat: "fruit", tags: ["condiment"], kcal100: 34, p100: 0.7, discret: false, unites: { piece_g: 80, cas_g: 15 }, ciqual_recherche: "Citron, pulpe, cru", ciqual_code: null }, // cas_g = jus
  { slug: "fraises", nom: "Fraises", cat: "fruit", tags: [], kcal100: 30, p100: 0.7, discret: false, unites: { poignee_g: 80 }, ciqual_recherche: "Fraise, crue", ciqual_code: null },
  { slug: "fruits-rouges", nom: "Fruits rouges (surgelés)", cat: "fruit", tags: ["surgele"], kcal100: 45, p100: 1, discret: false, unites: { poignee_g: 60 }, ciqual_recherche: "Mélange de fruits rouges, surgelé", ciqual_code: null },
  { slug: "abricot", nom: "Abricot", cat: "fruit", tags: [], kcal100: 48, p100: 0.9, discret: true, unites: { piece_g: 45 }, ciqual_recherche: "Abricot, pulpe et peau, cru", ciqual_code: null },
  { slug: "compote-sans-sucre", nom: "Compote sans sucre ajouté", cat: "fruit", tags: ["placard"], kcal100: 60, p100: 0.3, discret: false, unites: { pot_g: 100 }, ciqual_recherche: "Compote de pomme, sans sucres ajoutés", ciqual_code: null },

  // ── Sauces (macros PRUDENTES, arrondies vers le haut) ───────────
  { slug: "sauce-soja", nom: "Sauce soja", cat: "sauce", tags: [], kcal100: 55, p100: 5.5, discret: false, unites: { cas_g: 15, cac_g: 5 }, ciqual_recherche: "Sauce soja", ciqual_code: null },
  { slug: "sauce-teriyaki", nom: "Sauce teriyaki", cat: "sauce", tags: [], kcal100: 140, p100: 2, discret: false, unites: { cas_g: 15 }, ciqual_recherche: "Sauce teriyaki, préemballée", ciqual_code: null },
  { slug: "pesto-basilic", nom: "Pesto de basilic", cat: "sauce", tags: ["a_verifier"], kcal100: 480, p100: 5, discret: false, unites: { cas_g: 15 }, ciqual_recherche: "Pesto de basilic", ciqual_code: null }, // pecorino (brebis) / présure fréquents — choisir un pesto conforme
  { slug: "houmous", nom: "Houmous", cat: "sauce", tags: [], kcal100: 306, p100: 7.3, discret: false, unites: { cas_g: 15 }, ciqual_recherche: "Houmous", ciqual_code: null },
  { slug: "sauce-tomate-basilic", nom: "Sauce tomate basilic", cat: "sauce", tags: ["placard"], kcal100: 65, p100: 1.5, discret: false, unites: { cas_g: 15 }, ciqual_recherche: "Sauce tomate au basilic, préemballée", ciqual_code: null },
  { slug: "tomates-concassees", nom: "Tomates concassées (conserve)", cat: "sauce", tags: ["conserve", "placard"], kcal100: 25, p100: 1.2, discret: false, unites: { boite_g: 400 }, ciqual_recherche: "Tomate, concassée, appertisée", ciqual_code: null },
  { slug: "pate-de-curry", nom: "Pâte de curry", cat: "sauce", tags: ["a_verifier", "placard"], kcal100: 180, p100: 3, discret: false, unites: { cas_g: 15 }, ciqual_recherche: null, ciqual_code: null }, // pâte de crevette fréquente dans les pâtes thaï — vérifier l'étiquette

  // ── Condiments & placard (quantités faibles) ────────────────────
  { slug: "moutarde", nom: "Moutarde", cat: "condiment", tags: [], kcal100: 150, p100: 7, discret: false, unites: { cac_g: 5 }, ciqual_recherche: "Moutarde", ciqual_code: null },
  { slug: "levure-maltee", nom: "Levure maltée (paillettes)", cat: "condiment", tags: ["vegetal"], kcal100: 350, p100: 45, discret: false, unites: { cas_g: 5 }, ciqual_recherche: "Levure alimentaire", ciqual_code: null },
  { slug: "levure-chimique", nom: "Levure chimique", cat: "condiment", tags: ["placard"], kcal100: 80, p100: 0.4, discret: false, unites: { cac_g: 4 }, ciqual_recherche: "Levure chimique (poudre à lever)", ciqual_code: null },
  { slug: "maizena", nom: "Maïzena (fécule de maïs)", cat: "condiment", tags: ["placard"], kcal100: 357, p100: 0.3, discret: false, unites: { cas_g: 10 }, ciqual_recherche: "Fécule de maïs", ciqual_code: null },
  { slug: "sirop-erable", nom: "Sirop d'érable", cat: "condiment", tags: [], kcal100: 266, p100: 0, discret: false, unites: { cas_g: 20 }, ciqual_recherche: "Sirop d'érable", ciqual_code: null },
  { slug: "miel", nom: "Miel", cat: "condiment", tags: [], kcal100: 327, p100: 0.4, discret: false, unites: { cas_g: 20, cac_g: 7 }, ciqual_recherche: "Miel", ciqual_code: null },
  { slug: "sucre", nom: "Sucre", cat: "condiment", tags: ["placard"], kcal100: 400, p100: 0, discret: false, unites: { cas_g: 12, cac_g: 4 }, ciqual_recherche: "Sucre blanc", ciqual_code: null },
  { slug: "cacao-poudre", nom: "Cacao en poudre non sucré", cat: "condiment", tags: ["placard"], kcal100: 350, p100: 20, discret: false, unites: { cas_g: 7 }, ciqual_recherche: "Cacao, poudre, non sucré", ciqual_code: null },
  { slug: "bouillon-legumes-cube", nom: "Bouillon de légumes (cube)", cat: "condiment", tags: ["placard"], kcal100: 175, p100: 8, discret: true, unites: { piece_g: 10 }, ciqual_recherche: "Bouillon de légumes, déshydraté", ciqual_code: null },
  { slug: "vinaigre-balsamique", nom: "Vinaigre balsamique", cat: "condiment", tags: [], kcal100: 88, p100: 0.5, discret: false, unites: { cas_g: 15 }, ciqual_recherche: "Vinaigre balsamique", ciqual_code: null },
  { slug: "epices-moulues", nom: "Épices moulues (cumin, paprika, curcuma…)", cat: "condiment", tags: ["placard"], kcal100: 320, p100: 12, discret: false, unites: { cac_g: 2 }, ciqual_recherche: "Cumin, graine", ciqual_code: null }, // entrée générique, quantités négligeables
  { slug: "herbes-fraiches", nom: "Herbes fraîches (basilic, menthe, ciboulette…)", cat: "condiment", tags: [], kcal100: 40, p100: 3, discret: false, unites: { cas_g: 3 }, ciqual_recherche: "Basilic, frais", ciqual_code: null }, // entrée générique
  { slug: "ail", nom: "Ail", cat: "condiment", tags: [], kcal100: 131, p100: 6, discret: false, unites: { gousse_g: 5 }, ciqual_recherche: "Ail, cru", ciqual_code: null },
  { slug: "gingembre", nom: "Gingembre frais", cat: "condiment", tags: [], kcal100: 80, p100: 1.8, discret: false, unites: { cac_g: 5 }, ciqual_recherche: "Gingembre, racine, cru", ciqual_code: null },
];

export const ingredientBySlug = Object.fromEntries(INGREDIENTS.map((i) => [i.slug, i]));
