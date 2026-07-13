//  composition.test.js — golden tests de la couche composition (spec § 3.6)
//  sur le jeu de données commun de fixtures.js : plat d'abord, compléments sur
//  budget résiduel, anti-myopie, mode compléter, budget serré, jamais vide.

import { describe, it, expect } from "vitest";
import { assembleMeal, suggestMeals } from "./composition.js";
import { REF, GABARITS, RECETTES, PATRONS, PANTRY, HISTORY, NOW } from "./fixtures.js";

//  Matcher minimal (rôle de linking.js, injecté) : « Skyr nature » (p7, non
//  lié) → skyr, pour la couverture « probable » du dessert.
const matcherSkyr = (name) => (/skyr/i.test(name) ? "skyr" : null);

//  Item pantry amandes (absent des fixtures) : rend le slot oléagineux du
//  bol-skyr couvrable quand un test en a besoin.
const AMANDES_PANTRY = {
  id: "p-amandes", name: "Amandes", qty: 200, unit: "g",
  kcal100: 634, p100: 21, out: false, ref_id: "amandes", etat: "en_stock", qty_date: "2026-07-12",
};

//  Recette construite : plat DOMINÉ par le skyr — sert aux tests d'anti-myopie
//  et de diversité (conflit d'ingrédient principal avec un dessert au skyr).
const ASSIETTE_SKYR = {
  id: "assiette-skyr", type_de_piece: "plat", portions: 1,
  components: [
    { ref: "skyr", qty: 300, min: 200, max: 450, ajustable: true, principal: true },
    { ref: "amandes", qty: 15, min: 0, max: 30, ajustable: true },
  ],
  slots: [],
};

const CTX = {
  patrons: PATRONS,
  gabarits: GABARITS,
  recettes: RECETTES,
  referentiel: REF,
  pantry: PANTRY,
  history: HISTORY,
  prefs: null,
  exclusions: [],
  now: NOW,
  matcher: matcherSkyr,
};

describe("assembleMeal — le plat d'abord, compléments sur budget résiduel (§ 3.6.2-3)", () => {
  it("dîner 620/48 → plat + dessert, le skyr comble les protéines résiduelles", () => {
    const res = assembleMeal({ ...CTX, slot: "diner", budget: { kcal: 620, prot: 48 } });

    expect(res).not.toBeNull();
    expect(res.patron).toBe("plat_dessert");
    expect(res.pieces).toHaveLength(2);

    //  Le plat porte sa part du budget mais ne suffit PAS seul au plancher…
    const plat = res.pieces.find((p) => p.type_de_piece === "plat");
    expect(plat).toBeTruthy();
    expect(plat.candidat.prot).toBeLessThan(48 * (1 - 0.05));

    //  …c'est le skyr (dessert) qui bouche les protéines manquantes.
    const dessert = res.pieces.find((p) => p.type_de_piece === "dessert");
    expect(dessert).toBeTruthy();
    expect(dessert.candidat.items.some((it) => it.slug === "skyr")).toBe(true);

    //  Totaux dans les tolérances du créneau → assemblage faisable, sans gap.
    expect(res.prot).toBeGreaterThanOrEqual(48 * (1 - 0.05));
    expect(res.kcal).toBeLessThanOrEqual(620 * (1 + 0.12));
    expect(res.feasible).toBe(true);
    expect(res.gap).toBeNull();
  });

  it("diversité intra-assemblage : dessert jamais dominé par le principal du plat, jamais deux féculents", () => {
    const res = assembleMeal({ ...CTX, slot: "diner", budget: { kcal: 620, prot: 48 } });
    const [a, b] = res.pieces.map((p) => p.candidat);
    expect(a.ingredientPrincipal).not.toBe(b.ingredientPrincipal);
    const feculent = (c) => c.items.some((it) => ["cereale", "legumineuse"].includes(it.ing.cat));
    expect(feculent(a) && feculent(b)).toBe(false);
  });
});

describe("assembleMeal — choix du patron selon le budget (§ 3.6.1)", () => {
  it("budget serré (400 kcal) → plat_seul, une seule pièce", () => {
    const res = assembleMeal({ ...CTX, slot: "diner", budget: { kcal: 400, prot: 30 } });

    expect(res.patron).toBe("plat_seul");
    expect(res.pieces).toHaveLength(1);
    expect(res.pieces[0].type_de_piece).toBe("plat");
    expect(res.feasible).toBe(true);
    expect(res.kcal).toBeLessThanOrEqual(400 * (1 + 0.12));
    expect(res.prot).toBeGreaterThanOrEqual(30 * (1 - 0.05));
  });

  it("patron shake_seul sur slot pdj : liste blanche de gabarits respectée", () => {
    const res = assembleMeal({ ...CTX, slot: "pdj", budget: { kcal: 400, prot: 35 } });

    expect(res.patron).toBe("shake_seul");
    expect(res.pieces).toHaveLength(1);
    expect(res.pieces[0].candidat.gabaritId).toBe("shake");
    expect(res.pieces[0].candidat.items.some((it) => it.slug === "poudre-all-in-one")).toBe(true);
    //  La protéine vient de la poudre (le lait d'amande n'est jamais un levier).
    expect(res.prot).toBeGreaterThanOrEqual(35 * (1 - 0.05));
    expect(res.feasible).toBe(true);
  });
});

describe("assembleMeal — mode COMPLÉTER (§ 3.6.4)", () => {
  it("plat 420 kcal / 32 g déjà loggé, créneau 620/48 → UN complément ~150-200 kcal qui rapproche des 48 g", () => {
    const pantry = [...PANTRY, AMANDES_PANTRY];
    const already = [{ type_de_piece: "plat", kcal: 420, prot: 32 }];
    const res = assembleMeal({ ...CTX, pantry, slot: "diner", budget: { kcal: 620, prot: 48 }, already });

    //  Patron compatible avec l'existant (le plat consomme la pièce plat) ;
    //  SEULE la pièce manquante est proposée.
    expect(res.patron).toBe("plat_dessert");
    expect(res.pieces).toHaveLength(1);
    expect(res.pieces[0].type_de_piece).toBe("dessert");

    const complement = res.pieces[0].candidat;
    expect(complement.kcal).toBeGreaterThanOrEqual(140);
    expect(complement.kcal).toBeLessThanOrEqual(210);

    //  L'état initial COMPTE dans les totaux de l'assemblage.
    expect(res.kcal).toBeCloseTo(420 + complement.kcal, 6);
    expect(res.prot).toBeGreaterThanOrEqual(48 * (1 - 0.05)); // on rapproche des 48 g
    expect(res.feasible).toBe(true);
  });

  it("patron incompatible avec l'existant écarté : un dessert déjà loggé exclut shake_seul", () => {
    const already = [{ type_de_piece: "dessert", kcal: 150, prot: 12 }];
    const res = assembleMeal({ ...CTX, slot: "pdj", budget: { kcal: 500, prot: 40 }, already });
    //  shake_seul (seul patron du pdj) n'a pas de pièce dessert → dégradation
    //  plat seul plutôt que silence.
    expect(res).not.toBeNull();
    expect(res.mention).toBe("degrade");
  });
});

describe("assembleMeal — anti-myopie (§ 3.6.3) : le 2e meilleur plat gagne l'assemblage", () => {
  //  Cas construit : le plat A (assiette de skyr) est le MEILLEUR plat isolé
  //  (il atteint seul le plancher 48 g), mais son ingrédient principal (skyr)
  //  bloque le seul dessert disponible (bol-skyr, diversité intra-assemblage).
  //  Le plat B (omelette, 2e meilleur : plafonne à ~31 g) + skyr en dessert
  //  donne le meilleur assemblage GLOBAL. Un glouton strict rendrait A seul.
  const base = {
    gabarits: [GABARITS.find((g) => g.id === "bol-skyr")], // pas de gabarit plat : plats = recettes
    recettes: [ASSIETTE_SKYR, RECETTES.find((r) => r.id === "omelette-garnie")],
    referentiel: REF,
    pantry: [...PANTRY.map((p) => (p.id === "p7" ? { ...p, ref_id: "skyr" } : p)), AMANDES_PANTRY],
    history: [],
    prefs: null,
    exclusions: [],
    now: NOW,
    slot: "diner",
    budget: { kcal: 620, prot: 48 },
  };

  it("en plat seul, A (assiette-skyr) est bien le meilleur plat isolé", () => {
    const seul = assembleMeal({ ...base, patrons: [PATRONS.find((p) => p.id === "plat_seul")] });
    expect(seul.pieces[0].candidat.recetteId).toBe("assiette-skyr");
    expect(seul.feasible).toBe(true); // il atteint seul le plancher 48 g
  });

  it("en plat+dessert, c'est B (omelette) + skyr qui gagne l'assemblage global", () => {
    const compose = assembleMeal({ ...base, patrons: [PATRONS.find((p) => p.id === "plat_dessert")] });
    expect(compose.pieces.map((p) => p.type_de_piece)).toEqual(["plat", "dessert"]);
    expect(compose.pieces[0].candidat.recetteId).toBe("omelette-garnie"); // le 2e meilleur plat
    expect(compose.pieces[1].candidat.items.some((it) => it.slug === "skyr")).toBe(true);
    expect(compose.feasible).toBe(true);
    //  A + bol-skyr aurait violé la diversité (même principal) : A serait resté
    //  seul, sous le plancher — l'exploration 3 plats × 3 compléments l'évite.
    expect(compose.prot).toBeGreaterThanOrEqual(48 * (1 - 0.05));
  });
});

describe("assembleMeal — diversité intra-assemblage vs l'existant (§ 3.6.5, mode compléter)", () => {
  //  La règle « pas deux pièces au même principal, pas deux féculents » doit
  //  contraindre AUSSI le plat proposé face aux pièces `already`, y compris en
  //  mode dégradé — pas seulement les compléments entre eux.
  const base = {
    patrons: [PATRONS.find((p) => p.id === "plat_dessert")],
    gabarits: [GABARITS.find((g) => g.id === "bol-skyr")], // aucun gabarit plat : plats = recettes
    recettes: [ASSIETTE_SKYR, RECETTES.find((r) => r.id === "omelette-garnie")],
    referentiel: REF,
    pantry: [...PANTRY.map((p) => (p.id === "p7" ? { ...p, ref_id: "skyr" } : p)), AMANDES_PANTRY],
    history: [],
    prefs: null,
    exclusions: [],
    now: NOW,
    slot: "diner",
    budget: { kcal: 620, prot: 48 },
  };
  const feculent = (c) => c.items.some((it) => ["cereale", "legumineuse"].includes(it.ing.cat));

  it("dessert au skyr déjà loggé → le plat dominé par le skyr est écarté (omelette proposée)", () => {
    const already = [{ type_de_piece: "dessert", kcal: 120, prot: 13, ingredientPrincipal: "skyr" }];
    const res = assembleMeal({ ...base, already });

    expect(res).not.toBeNull();
    expect(res.pieces).toHaveLength(1);
    expect(res.pieces[0].type_de_piece).toBe("plat");
    //  Sans le filtre, assiette-skyr (meilleur plat isolé) serait proposée :
    //  deux pièces dominées par le même ingrédient principal.
    expect(res.pieces[0].candidat.recetteId).toBe("omelette-garnie");
    expect(res.pieces[0].candidat.ingredientPrincipal).not.toBe("skyr");
  });

  it("pièce à féculent déjà loggée → aucun plat à féculent proposé (jamais deux féculents)", () => {
    //  Fixtures complètes : sans le filtre, le bowl (slot céréale obligatoire)
    //  ou le curry (pois chiches + riz) peuvent gagner la pièce plat.
    const already = [{ type_de_piece: "dessert", kcal: 180, prot: 10, feculent: true }];
    const res = assembleMeal({ ...CTX, slot: "diner", budget: { kcal: 620, prot: 48 }, already });

    expect(res).not.toBeNull();
    for (const p of res.pieces) expect(feculent(p.candidat)).toBe(false);
  });

  it("mode dégradé : le fallback plat seul respecte aussi la diversité vs l'existant", () => {
    //  pdj + dessert déjà loggé : shake_seul (seul patron) est incompatible et
    //  son gabarit est absent → fallback plat seul. Il doit écarter le plat au
    //  skyr, pas le proposer parce qu'il score mieux.
    const already = [{ type_de_piece: "dessert", kcal: 120, prot: 13, ingredientPrincipal: "skyr" }];
    const res = assembleMeal({
      ...base,
      patrons: [PATRONS.find((p) => p.id === "shake_seul")],
      slot: "pdj",
      budget: { kcal: 500, prot: 40 },
      already,
    });

    expect(res).not.toBeNull();
    expect(res.mention).toBe("degrade");
    expect(res.pieces[0].candidat.ingredientPrincipal).not.toBe("skyr");
  });

  it("mode dégradé : la diversité est relâchée plutôt que de ne rien répondre (jamais vide)", () => {
    //  Le SEUL plat couvrable est en conflit avec l'existant : « jamais vide »
    //  prime (null signifierait « aucun plat couvrable », faux) — même
    //  précédent que le mode dégradé du MMR de scoring.js.
    const already = [{ type_de_piece: "dessert", kcal: 120, prot: 13, ingredientPrincipal: "skyr" }];
    const res = assembleMeal({
      ...base,
      recettes: [ASSIETTE_SKYR],
      patrons: [PATRONS.find((p) => p.id === "shake_seul")],
      slot: "pdj",
      budget: { kcal: 500, prot: 40 },
      already,
    });

    expect(res).not.toBeNull();
    expect(res.mention).toBe("degrade");
    expect(res.pieces[0].candidat.recetteId).toBe("assiette-skyr");
  });
});

describe("assembleMeal — jamais vide (§ 3.6, mode dégradé)", () => {
  it("exclusions massives + inventaire pauvre → dégradation plat_seul avec gap protéines", () => {
    //  Pantry réduit (riz, œufs, huile, épinards) + exclusions de session sur
    //  toutes les autres sources de protéines : aucun assemblage ne peut tenir
    //  55 g — on répond quand même, plat seul, avec l'écart affiché.
    const pantryPauvre = PANTRY.filter((p) => ["p3", "p4", "p6", "p8"].includes(p.id));
    const res = assembleMeal({
      ...CTX,
      pantry: pantryPauvre,
      exclusions: ["tofu-ferme", "pois-chiches-sec", "poudre-all-in-one", "curry-pois-chiches", "omelette-garnie"],
      slot: "diner",
      budget: { kcal: 620, prot: 55 },
    });

    expect(res).not.toBeNull();
    expect(res.patron).toBe("plat_seul");
    expect(res.pieces.length).toBeGreaterThanOrEqual(1);
    expect(res.feasible).toBe(false);
    expect(res.gap).not.toBeNull();
    expect(res.gap.prot).toBeGreaterThan(0); // mention d'écart : « il manque X g »
  });

  it("aucun plat couvrable du tout → null (le seul cas où l'on ne répond rien)", () => {
    const res = assembleMeal({ ...CTX, pantry: [], slot: "diner", budget: { kcal: 620, prot: 48 } });
    expect(res).toBeNull();
  });
});

describe("suggestMeals — diversité MMR au niveau assemblage (§ 3.6)", () => {
  it("k=3 : plusieurs assemblages, plats principaux diversifiés", () => {
    const res = suggestMeals({ ...CTX, slot: "diner", budget: { kcal: 620, prot: 48 }, k: 3 });

    expect(res.length).toBeGreaterThanOrEqual(2);
    expect(res.length).toBeLessThanOrEqual(3);
    for (const a of res) {
      expect(a.pieces.length).toBeGreaterThanOrEqual(1);
      expect(a.kcal).toBeGreaterThan(0);
      expect(a.patron).toBeTruthy();
    }
    //  Diversité ENTRE assemblages : pas k fois le même plat principal.
    const principaux = res.map(
      (a) => a.pieces.find((p) => p.type_de_piece === "plat")?.candidat.ingredientPrincipal
    );
    expect(new Set(principaux).size).toBeGreaterThanOrEqual(2);
  });

  it("le meilleur assemblage arrive en tête (argmax score au premier tour du MMR)", () => {
    const res = suggestMeals({ ...CTX, slot: "diner", budget: { kcal: 620, prot: 48 }, k: 3 });
    for (let i = 1; i < res.length; i++) {
      expect(res[0].score).toBeGreaterThanOrEqual(res[i].score);
    }
  });
});
