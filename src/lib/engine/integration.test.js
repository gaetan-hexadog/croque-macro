//  integration.test.js — smoke E2E : BANQUE v1 (src/data/bank) × moteur pur.
//
//  Chaîne testée : feasibility.instantiate → solver.adjustQuantities →
//  scoring.scoreCandidate + selectDiverse (composition.js hors périmètre).
//  Inventaire réaliste ~20 items, mode STRICT : pas de `matcher`, donc seuls les
//  items LIÉS (ref_id) peuvent couvrir — les non-liés ne doivent jamais apparaître.
//
//  Ce test importe la banque (données injectées au moteur) : c'est le point
//  d'intégration voulu — les modules du moteur, eux, restent purs.

import { describe, expect, it } from "vitest";
import { INGREDIENTS, ingredientBySlug } from "../../data/bank/ingredients.js";
import { GABARITS } from "../../data/bank/gabarits.js";
import { instantiate } from "./feasibility.js";
import { adjustQuantities } from "./solver.js";
import { scoreCandidate, selectDiverse } from "./scoring.js";

const NOW = "2026-07-13T18:40";

//  ── Inventaire réaliste (~20 items) ─────────────────────────────────
//  Liés (ref_id) + 2 non liés ; quantités mixtes (récentes = contraignantes,
//  vieilles > 7 j = présence seule) ; huile entamée sans quantité ; courgettes J-2.
const PANTRY = [
  { id: "i01", name: "Tofu ferme", qty: 400, unit: "g", kcal100: 125, p100: 13.5, out: false, ref_id: "tofu-ferme", etat: "en_stock", qty_date: "2026-07-12" },
  { id: "i02", name: "Œufs", qty: 6, unit: "pc", kcal100: 140, p100: 12.6, out: false, ref_id: "oeuf", etat: "en_stock", qty_date: "2026-07-12" },
  { id: "i03", name: "Riz basmati", qty: 500, unit: "g", kcal100: 349, p100: 7.1, out: false, ref_id: "riz-basmati-sec", etat: "en_stock", qty_date: "2026-07-08" },
  { id: "i04", name: "Pâtes", qty: 400, unit: "g", kcal100: 359, p100: 12, out: false, ref_id: "pates-seches", etat: "en_stock", qty_date: "2026-07-01" }, // quantité vieille > 7 j : non contraignante
  { id: "i05", name: "Pois chiches en boîte", qty: 2, unit: "boite", kcal100: 364, p100: 19, out: false, ref_id: "pois-chiches-sec", etat: "en_stock", qty_date: "2026-07-10" },
  { id: "i06", name: "Courgettes", qty: 400, unit: "g", kcal100: 20, p100: 1.2, out: false, ref_id: "courgette", etat: "en_stock", qty_date: "2026-07-11" }, // achetées J-2
  { id: "i07", name: "Brocoli", qty: 350, unit: "g", kcal100: 32, p100: 2.5, out: false, ref_id: "brocoli", etat: "en_stock", qty_date: "2026-07-12" },
  { id: "i08", name: "Épinards frais", qty: 150, unit: "g", kcal100: 28, p100: 2.9, out: false, ref_id: "epinards", etat: "en_stock", qty_date: "2026-07-12" },
  { id: "i09", name: "Poivrons", qty: 300, unit: "g", kcal100: 29, p100: 1.0, out: false, ref_id: "poivron", etat: "en_stock", qty_date: "2026-07-11" },
  { id: "i10", name: "Tomates", qty: 360, unit: "g", kcal100: 17, p100: 0.8, out: false, ref_id: "tomate", etat: "en_stock", qty_date: "2026-07-12" },
  { id: "i11", name: "Oignons", qty: 220, unit: "g", kcal100: 40, p100: 1.2, out: false, ref_id: "oignon", etat: "en_stock", qty_date: "2026-07-06" },
  { id: "i12", name: "Skyr", qty: 450, unit: "g", kcal100: 63, p100: 10.6, out: false, ref_id: "skyr", etat: "en_stock", qty_date: "2026-07-13" },
  { id: "i13", name: "Vegan All-in-One", qty: 540, unit: "g", kcal100: 360, p100: 48.3, out: false, ref_id: "poudre-all-in-one", etat: "entame", qty_date: "2026-07-08" },
  { id: "i14", name: "Lait d'amande", qty: 700, unit: "ml", kcal100: 15, p100: 0.5, out: false, ref_id: "lait-amande", etat: "en_stock", qty_date: "2026-07-11" },
  { id: "i15", name: "Huile d'olive", qty: null, unit: "g", kcal100: 900, p100: 0, out: false, ref_id: "huile-olive", etat: "entame" }, // présence seule
  { id: "i16", name: "Emmental râpé", qty: 100, unit: "g", kcal100: 380, p100: 28, out: false, ref_id: "emmental-rape", etat: "en_stock", qty_date: "2026-07-10" },
  { id: "i17", name: "Sauce tomate basilic", qty: 350, unit: "g", kcal100: 65, p100: 1.5, out: false, ref_id: "sauce-tomate-basilic", etat: "en_stock", qty_date: "2026-07-05" },
  { id: "i18", name: "Amandes", qty: 120, unit: "g", kcal100: 634, p100: 21, out: false, ref_id: "amandes", etat: "en_stock", qty_date: "2026-07-01" },
  //  Non liés : ne doivent JAMAIS couvrir en mode strict (pas de matcher).
  { id: "i19", name: "Yaourt grec du marché", qty: 300, unit: "g", kcal100: 97, p100: 9, out: false, ref_id: null, etat: "en_stock", qty_date: "2026-07-12" },
  { id: "i20", name: "Granola maison", qty: 250, unit: "g", kcal100: 450, p100: 10, out: false, ref_id: null, etat: "en_stock", qty_date: "2026-07-09" },
];

const pantryById = new Map(PANTRY.map((p) => [p.id, p]));

//  Historique léger (réalisme scoring) : curry hier soir.
const HISTORY = [
  { date: "2026-07-12T19:45", recetteId: null, gabaritId: "curry", ingredientPrincipal: "tofu-ferme" },
];

//  Tolérances du solveur (défauts spec § 3.3) : kcal +12 %, protéines −5 %.
const TOL_KCAL = 0.12;
const TOL_PROT = 0.05;
const EPS = 1e-6;

//  ── Pipeline complet instantiate → adjust → score → selectDiverse ───
function proposer({ gabarits, budget, k }) {
  //  A' — instanciation de chaque gabarit sur l'inventaire (mode strict : pas de matcher)
  const candidats = gabarits.flatMap((g) =>
    instantiate(g, PANTRY, budget, { now: NOW, referentiel: INGREDIENTS })
  );
  //  B — ajustement des quantités ; on ne garde que les faisables dans les tolérances
  const faisables = [];
  for (const cand of candidats) {
    const adj = adjustQuantities({ items: cand.items, protFloor: budget.prot, kcalCap: budget.kcal });
    if (!adj.feasible) continue;
    faisables.push({ ...cand, items: adj.items, kcal: adj.kcal, prot: adj.prot });
  }
  //  C — scoring puis top-k dissimilaire
  const scores = faisables.map((c) => ({
    ...c,
    ...scoreCandidate(c, { budget, history: HISTORY, pantry: PANTRY, now: NOW }),
  }));
  return { pool: scores, selection: selectDiverse(scores, k) };
}

//  Vérifications communes de tolérance sur une proposition ajustée.
function verifieTolerances(prop, budget) {
  expect(prop.kcal, `${prop.gabaritId} : plafond kcal dépassé`).toBeLessThanOrEqual(budget.kcal * (1 + TOL_KCAL) + EPS);
  expect(prop.prot, `${prop.gabaritId} : plancher protéines cassé`).toBeGreaterThanOrEqual(budget.prot * (1 - TOL_PROT) - EPS);
  for (const item of prop.items) {
    expect(item.qty, `${prop.gabaritId}/${item.slug} : qty sous min`).toBeGreaterThanOrEqual(item.min - EPS);
    expect(item.qty, `${prop.gabaritId}/${item.slug} : qty sur max`).toBeLessThanOrEqual(item.max + EPS);
  }
}

//  ── Scénarios ───────────────────────────────────────────────────────
const BUDGET_DINER = { kcal: 620, prot: 48, protCapped: false, shakeRecommended: false };
const BUDGET_SNACK = { kcal: 250, prot: 25, protCapped: false, shakeRecommended: false };

const plats = GABARITS.filter((g) => g.type_de_piece === "plat");
const diner = proposer({ gabarits: plats, budget: BUDGET_DINER, k: 3 });
const snack = proposer({ gabarits: GABARITS, budget: BUDGET_SNACK, k: 3 });

describe("smoke E2E banque v1 × moteur (instantiate → adjust → score → MMR)", () => {
  it("(a) dîner 620 kcal / 48 g : ≥ 3 propositions faisables et ajustées", () => {
    expect(diner.pool.length, "pool faisable trop pauvre pour un dîner").toBeGreaterThanOrEqual(3);
    expect(diner.selection.length).toBe(3);
    for (const prop of diner.selection) verifieTolerances(prop, BUDGET_DINER);
  });

  it("(a) dîner : propositions diversifiées (gabarits tous différents, ≥ 2 principaux)", () => {
    const gabarits = diner.selection.map((p) => p.gabaritId);
    const principaux = diner.selection.map((p) => p.ingredientPrincipal);
    expect(new Set(gabarits).size, `gabarits répétés : ${gabarits.join(", ")}`).toBe(3);
    expect(new Set(principaux).size, `principaux : ${principaux.join(", ")}`).toBeGreaterThanOrEqual(2);
  });

  it("(b) snack 250 kcal / 25 g : ≥ 2 propositions dont le shake", () => {
    expect(snack.pool.length, "pool faisable trop pauvre pour un snack").toBeGreaterThanOrEqual(2);
    expect(snack.selection.length).toBeGreaterThanOrEqual(2);
    const gabarits = snack.selection.map((p) => p.gabaritId);
    expect(gabarits, `le shake manque : ${gabarits.join(", ")}`).toContain("shake");
    for (const prop of snack.selection) verifieTolerances(prop, BUDGET_SNACK);
  });

  it("(c) mode strict : chaque item vient d'un item d'inventaire LIÉ, jamais d'un non-lié", () => {
    const propositions = [...diner.selection, ...snack.selection];
    expect(propositions.length).toBeGreaterThan(0);
    for (const prop of propositions) {
      for (const item of prop.items) {
        const source = pantryById.get(item.pantryId);
        expect(source, `${item.slug} sans source d'inventaire`).toBeTruthy();
        expect(source.ref_id, `${item.slug} servi par un item non lié (${source?.name})`).toBe(item.slug);
        expect(source.out).not.toBe(true);
        expect(item.sure, `${item.slug} : couverture non sûre en mode strict`).toBe(true);
      }
    }
  });

  it("(c) profil végétarien : aucune viande/poisson, jamais de chèvre/brebis", () => {
    const CATS_INTERDITES = new Set(["viande", "volaille", "poisson", "fruits_de_mer", "charcuterie"]);
    const INTERDIT = /poulet|b(œ|oe)uf|porc|lardon|thon|saumon|poisson|crevette|g[ée]latine|ch[èe]vre|brebis|feta|pecorino/i;
    for (const prop of [...diner.selection, ...snack.selection]) {
      for (const item of prop.items) {
        const ing = ingredientBySlug[item.slug];
        expect(ing, `${item.slug} absent de la banque`).toBeTruthy();
        expect(CATS_INTERDITES.has(ing.cat), `${ing.nom} : catégorie interdite ${ing.cat}`).toBe(false);
        expect(INTERDIT.test(ing.nom), `${ing.nom} : nom suspect pour le profil`).toBe(false);
      }
    }
  });
});
