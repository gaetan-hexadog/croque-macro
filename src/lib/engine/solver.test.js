//  solver.test.js — golden tests du glouton exact par ratio (spec § 3.3),
//  exclusivement sur les fixtures communes (bornes des gabarits/recettes de fixtures.js).
import { describe, it, expect } from "vitest";
import { adjustQuantities, computeMacros } from "./solver.js";
import { refBySlug, REF, GABARITS, RECETTES } from "./fixtures.js";

//  Item du solveur depuis un slot de gabarit + un ingrédient du référentiel.
function fromSlot(gabaritId, slotIdx, slug) {
  const slot = GABARITS.find((g) => g.id === gabaritId).slots[slotIdx];
  return {
    ing: refBySlug[slug],
    qty: slot.base,
    min: slot.min,
    max: slot.max,
    ajustable: slot.ajustable,
  };
}

//  Items du solveur depuis les components d'une recette signature.
function fromRecette(id) {
  return RECETTES.find((r) => r.id === id).components.map((c) => ({
    ing: refBySlug[c.ref],
    qty: c.qty,
    min: c.min,
    max: c.max,
    ajustable: c.ajustable,
  }));
}

const qtyOf = (res, slug) => res.items.find((it) => it.ing.slug === slug).qty;

//  Bowl instancié type : tofu + riz + courgette + huile + booster poudre.
function bowlItems() {
  return [
    fromSlot("bowl", 0, "tofu-ferme"), // 150 [100-250]
    fromSlot("bowl", 1, "riz-basmati-sec"), // 80 [40-120]
    fromSlot("bowl", 2, "courgette"), // 150 [80-300]
    fromSlot("bowl", 3, "huile-olive"), // 10 [5-25]
    fromSlot("bowl", 4, "poudre-all-in-one"), // 20 [10-40]
  ];
}

describe("adjustQuantities — montée au plancher (ordre p/k)", () => {
  it("monte le levier au meilleur rendement p/k en premier (poudre avant tofu)", () => {
    //  Base : 658,7 kcal / 37,4 g. Plancher 48 g, plafond 700 kcal.
    const res = adjustQuantities({ items: bowlItems(), protFloor: 48, kcalCap: 700 });

    //  p/k : poudre 0,134 > tofu 0,108 → la poudre sature à 40 g, le tofu ne bouge
    //  qu'à la marge (s'il était monté d'abord, il finirait vers 230 g).
    expect(qtyOf(res, "poudre-all-in-one")).toBe(40);
    expect(qtyOf(res, "tofu-ferme")).toBeLessThanOrEqual(160);
    //  Les leviers à faible rendement ne bougent pas à la montée.
    expect(qtyOf(res, "riz-basmati-sec")).toBe(80);
    expect(qtyOf(res, "courgette")).toBe(150);
    //  Le léger dépassement kcal est absorbé par l'huile (descente, p≈0).
    expect(qtyOf(res, "huile-olive")).toBeLessThan(10);

    expect(res.feasible).toBe(true);
    expect(res.gap).toBeNull();
    expect(res.prot).toBeGreaterThanOrEqual(48 * 0.95);
    expect(res.kcal).toBeLessThanOrEqual(700 * 1.12);
    //  Valeurs golden (post-arrondi 5 g) : tofu 155, huile 5.
    expect(qtyOf(res, "tofu-ferme")).toBe(155);
    expect(qtyOf(res, "huile-olive")).toBe(5);
    expect(res.kcal).toBeCloseTo(691.95, 1);
    expect(res.prot).toBeCloseTo(47.73, 1);
  });

  it("un levier sans kcal (kcal100 = 0) a un rendement infini et monte en premier", () => {
    //  Ingrédient SYNTHÉTIQUE pour cette branche : aucun équivalent dans les fixtures
    //  (poudre « idéale » à 0 kcal). Pas un mini-référentiel, un cas limite ciblé.
    const magique = { slug: "poudre-magique", nom: "Poudre magique", cat: "poudre_proteine", kcal100: 0, p100: 90, discret: false };
    const items = [
      fromSlot("bowl", 0, "tofu-ferme"),
      { ing: magique, qty: 0, min: 0, max: 20, ajustable: true },
    ];
    const res = adjustQuantities({ items, protFloor: 25, kcalCap: 400 });
    //  Le tofu (rendement fini) ne doit pas avoir bougé : tout vient du levier infini.
    expect(qtyOf(res, "tofu-ferme")).toBe(150);
    expect(qtyOf(res, "poudre-magique")).toBeGreaterThan(0);
    expect(res.feasible).toBe(true);
    expect(res.kcal).toBeCloseTo(187.5, 5); // kcal inchangées : le levier n'en apporte pas
  });
});

describe("adjustQuantities — descente sous le plafond (ordre k/p)", () => {
  it("réduit l'huile (p≈0, ratio infini) en premier, puis le levier au k/p suivant", () => {
    //  Curry complet (2 portions) : 1196,2 kcal / 42,5 g. Plafond 1000 kcal, plancher 40 g.
    const res = adjustQuantities({ items: fromRecette("curry-pois-chiches"), protFloor: 40, kcalCap: 1000 });

    //  k/p : huile ∞ > riz 49,2 > pois chiches 19,2 > courgette 16,7.
    //  Huile saturée à son min (8 g, arrondi pratique → 10 g), riz réduit ensuite,
    //  pois chiches et courgette intacts.
    expect(qtyOf(res, "huile-olive")).toBe(10);
    expect(qtyOf(res, "riz-basmati-sec")).toBe(80);
    expect(qtyOf(res, "pois-chiches-sec")).toBe(160);
    expect(qtyOf(res, "courgette")).toBe(300);

    //  Le plancher tient dans la tolérance (−5 %) malgré la descente.
    expect(res.feasible).toBe(true);
    expect(res.prot).toBeGreaterThanOrEqual(40 * 0.95);
    expect(res.kcal).toBeLessThanOrEqual(1000 * 1.12);
    expect(res.kcal).toBeCloseTo(1011.6, 1);
    expect(res.prot).toBeCloseTo(39.68, 1);
  });
});

describe("adjustQuantities — infaisabilité PROUVÉE avec gap", () => {
  it("plancher inatteignable (légume seul) : feasible:false et gap protéines correct", () => {
    const items = [fromSlot("bowl", 2, "courgette")]; // 150 [80-300]
    const res = adjustQuantities({ items, protFloor: 20, kcalCap: 500 });
    //  Monté à sa borne max (300 g → 3,6 g de protéines), toujours loin du plancher.
    expect(res.feasible).toBe(false);
    expect(qtyOf(res, "courgette")).toBe(300);
    expect(res.gap.prot).toBeCloseTo(20 - 3.6, 5);
    expect(res.gap.kcal).toBe(0);
  });

  it("bornes serrées : le levier sature avant le plancher → prouvé infaisable", () => {
    //  Bornes volontairement étroites autour de la base (tofu 140-160 g).
    const items = [{ ing: refBySlug["tofu-ferme"], qty: 150, min: 140, max: 160, ajustable: true }];
    const res = adjustQuantities({ items, protFloor: 40, kcalCap: 500 });
    expect(res.feasible).toBe(false);
    expect(qtyOf(res, "tofu-ferme")).toBe(160); // saturé à max, preuve par bornes
    expect(res.gap.prot).toBeCloseTo(40 - 21.6, 5);
    expect(res.gap.kcal).toBe(0);
  });

  it("plafond intenable : les min cumulés dépassent le plafond toléré → gap kcal", () => {
    const items = [fromSlot("bowl", 1, "riz-basmati-sec")]; // 80 [40-120]
    const res = adjustQuantities({ items, protFloor: 2, kcalCap: 120 });
    //  Réduit à min 40 g → 139,6 kcal > 120 × 1,12 = 134,4 → infaisable.
    expect(res.feasible).toBe(false);
    expect(qtyOf(res, "riz-basmati-sec")).toBe(40);
    expect(res.gap.kcal).toBeCloseTo(139.6 - 120, 5);
    expect(res.gap.prot).toBe(0);
  });
});

describe("adjustQuantities — tolérances asymétriques", () => {
  it("plancher raté de ~4 % → accepté ; raté de ~8 % → refusé", () => {
    //  Tofu seul, max 250 g → 33,75 g de protéines atteignables.
    const items = () => [fromSlot("bowl", 0, "tofu-ferme")];

    //  Plancher 35 g : écart −3,6 % ≥ −5 % → faisable dans la tolérance.
    const ok = adjustQuantities({ items: items(), protFloor: 35, kcalCap: 500 });
    expect(ok.feasible).toBe(true);
    expect(ok.prot).toBeCloseTo(33.75, 5);
    expect(ok.gap).toBeNull();

    //  Plancher 36,7 g : écart −8 % < −5 % → prouvé infaisable.
    const ko = adjustQuantities({ items: items(), protFloor: 36.7, kcalCap: 500 });
    expect(ko.feasible).toBe(false);
    expect(ko.gap.prot).toBeCloseTo(36.7 - 33.75, 5);
  });

  it("plafond kcal : +7 % toléré (≤ +12 %), au-delà refusé", () => {
    const items = () => [fromSlot("bowl", 1, "riz-basmati-sec")];
    //  Min 40 g → 139,6 kcal incompressibles.
    const ok = adjustQuantities({ items: items(), protFloor: 2, kcalCap: 130 }); // +7,4 %
    expect(ok.feasible).toBe(true);
    const ko = adjustQuantities({ items: items(), protFloor: 2, kcalCap: 120 }); // +16,3 %
    expect(ko.feasible).toBe(false);
  });

  it("les tolérances sont paramétrables (tolProt resserrée → même cas refusé)", () => {
    const items = [fromSlot("bowl", 0, "tofu-ferme")];
    const res = adjustQuantities({ items, protFloor: 35, kcalCap: 500, tolProt: 0.02 });
    expect(res.feasible).toBe(false); // −3,6 % < −2 %
  });
});

describe("adjustQuantities — ingrédients discrets (énumération des pas entiers)", () => {
  it("omelette-garnie : les œufs restent des pas de 50 g (2/3/4 œufs), jamais 1,37 œuf", () => {
    const res = adjustQuantities({ items: fromRecette("omelette-garnie"), protFloor: 35, kcalCap: 650 });
    const oeufs = qtyOf(res, "oeuf");
    expect(oeufs % 50).toBe(0); // toujours un nombre entier d'œufs
    expect([100, 150, 200]).toContain(oeufs); // domaine 2/3/4 œufs (bornes 100-200)
    expect(res.feasible).toBe(true);
    expect(res.prot).toBeGreaterThanOrEqual(35 * 0.95);
    expect(res.kcal).toBeLessThanOrEqual(650 * 1.12);
    //  Golden : la combinaison 4 œufs minimise la distance aux quantités de base
    //  (50 g d'œufs + 45 g d'épinards, contre 100 g d'épinards + 15 g d'emmental à 3 œufs).
    expect(oeufs).toBe(200);
  });

  it("œufs seuls : le continu voudrait ~2,7 œufs (135 g) → le discret retient 3 œufs pile", () => {
    const items = [fromRecette("omelette-garnie")[0]]; // œufs 150 [100-200], discret
    const res = adjustQuantities({ items, protFloor: 17, kcalCap: 600 });
    expect(qtyOf(res, "oeuf")).toBe(150); // 3 œufs, pas 134,9 g
    expect(res.feasible).toBe(true);
    expect(res.prot).toBeCloseTo(18.9, 5);
    expect(res.kcal).toBeCloseTo(210, 5);
  });

  it("tout le domaine 2/3/4 œufs est énuméré : plancher hors d'atteinte → meilleur gap à 4 œufs", () => {
    const items = [fromRecette("omelette-garnie")[0]];
    const res = adjustQuantities({ items, protFloor: 30, kcalCap: 600 });
    expect(res.feasible).toBe(false);
    expect(qtyOf(res, "oeuf")).toBe(200); // 4 œufs = le plus petit gap protéines
    expect(res.gap.prot).toBeCloseTo(30 - 25.2, 5);
    expect(res.gap.kcal).toBe(0);
  });
});

describe("adjustQuantities — cas à un levier = intersection d'intervalles", () => {
  //  Shake : poudre ajustable + lait d'amande FIXE (ajustable:false dans le gabarit).
  const shakeItems = () => [
    fromSlot("shake", 0, "poudre-all-in-one"), // 60 [30-90]
    fromSlot("shake", 1, "lait-amande"), // 250, non ajustable
  ];

  it("la base est déjà dans l'intervalle → quantités inchangées", () => {
    const res = adjustQuantities({ items: shakeItems(), protFloor: 30, kcalCap: 300 });
    expect(qtyOf(res, "poudre-all-in-one")).toBe(60);
    expect(qtyOf(res, "lait-amande")).toBe(250);
    expect(res.feasible).toBe(true);
  });

  it("intervalle non vide au-dessus de la base → montée au plancher puis arrondi 5 g", () => {
    const res = adjustQuantities({ items: shakeItems(), protFloor: 35, kcalCap: 320 });
    //  q ≥ (35 − 1,25) × 100 / 48,3 ≈ 69,9 → 69,9 g arrondi à 70 g.
    expect(qtyOf(res, "poudre-all-in-one")).toBe(70);
    expect(qtyOf(res, "lait-amande")).toBe(250); // jamais un levier (non ajustable)
    expect(res.feasible).toBe(true);
    expect(res.prot).toBeGreaterThanOrEqual(35 * 0.95);
  });

  it("intervalle vide (plancher et plafond incompatibles, tolérances comprises) → infaisable", () => {
    //  Plancher 40 g exige ~80 g de poudre (326 kcal) ; plafond 250 kcal en tolère ~67 g
    //  (33,8 g de protéines < 38 g tolérés) : l'intersection est vide.
    const res = adjustQuantities({ items: shakeItems(), protFloor: 40, kcalCap: 250 });
    expect(res.feasible).toBe(false);
    //  Le gap reflète l'état le plus favorable atteignable, rapporté aux cibles strictes.
    expect(res.gap.prot).toBeCloseTo(40 - res.prot, 6);
    expect(res.gap.kcal).toBeCloseTo(Math.max(0, res.kcal - 250), 6);
    expect(res.gap.prot).toBeGreaterThan(0);
  });
});

describe("computeMacros — propriété de linéarité", () => {
  it("macros(λ·qty) = λ·macros(qty) pour tout le référentiel et plusieurs λ", () => {
    const lambdas = [0.25, 0.5, 1.37, 2, 3.3];
    //  Panier composite : tout le référentiel, quantités arbitraires déterministes.
    const base = REF.map((ing, i) => ({ ing, qty: 37 + i * 13 }));
    const m0 = computeMacros(base);
    for (const l of lambdas) {
      const scaled = base.map((it) => ({ ...it, qty: it.qty * l }));
      const m = computeMacros(scaled);
      expect(m.kcal).toBeCloseTo(l * m0.kcal, 8);
      expect(m.prot).toBeCloseTo(l * m0.prot, 8);
    }
    //  Et ingrédient par ingrédient (aucune interaction croisée).
    for (const ing of REF) {
      const one = computeMacros([{ ing, qty: 80 }]);
      const twice = computeMacros([{ ing, qty: 160 }]);
      expect(twice.kcal).toBeCloseTo(2 * one.kcal, 8);
      expect(twice.prot).toBeCloseTo(2 * one.prot, 8);
    }
  });
});

describe("adjustQuantities — arrondi 5 g puis recalcul exact", () => {
  it("les grammages continus ajustés sont des multiples de 5 g", () => {
    const res = adjustQuantities({ items: bowlItems(), protFloor: 48, kcalCap: 700 });
    for (const it of res.items) {
      if (it.ajustable && !it.ing.discret) {
        expect(it.qty % 5).toBe(0);
      }
    }
  });

  it("les macros retournées sont EXACTEMENT recalculées depuis les quantités finales", () => {
    for (const args of [
      { items: bowlItems(), protFloor: 48, kcalCap: 700 },
      { items: fromRecette("curry-pois-chiches"), protFloor: 40, kcalCap: 1000 },
      { items: fromRecette("omelette-garnie"), protFloor: 35, kcalCap: 650 },
    ]) {
      const res = adjustQuantities(args);
      const m = computeMacros(res.items);
      expect(res.kcal).toBe(m.kcal); // égalité stricte : recalcul post-arrondi, pas d'état caché
      expect(res.prot).toBe(m.prot);
    }
  });

  it("un levier non modifié par le glouton garde sa quantité de base (pas d'arrondi gratuit)", () => {
    //  Base déjà conforme : rien ne bouge, l'huile à 8 g de l'omelette reste 8 g.
    const res = adjustQuantities({ items: fromRecette("omelette-garnie"), protFloor: 20, kcalCap: 600 });
    expect(qtyOf(res, "huile-olive")).toBe(8);
    expect(qtyOf(res, "oeuf")).toBe(150);
    expect(res.feasible).toBe(true);
  });
});
