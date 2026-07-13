//  feasibility.test.js — golden tests des étapes A et A' (spec § 3.1-3.2)
//  sur le jeu de données commun de fixtures.js.

import { describe, it, expect } from "vitest";
import { checkFeasibility, instantiate, etatEffectif } from "./feasibility.js";
import { REF, refBySlug, GABARITS, RECETTES, PANTRY, NOW } from "./fixtures.js";

const CURRY = RECETTES.find((r) => r.id === "curry-pois-chiches");
const OMELETTE = RECETTES.find((r) => r.id === "omelette-garnie");
const BOWL = GABARITS.find((g) => g.id === "bowl");
const BOL_SKYR = GABARITS.find((g) => g.id === "bol-skyr");

const OPTS = { now: NOW, referentiel: REF };
//  Matcher minimal (rôle de linking.js, injecté) : « Skyr nature » → skyr
const matcherSkyr = (name) => (/skyr/i.test(name) ? "skyr" : null);

describe("checkFeasibility — inventaire flou (§ 3.1)", () => {
  it("curry : pois chiches liés en stock couvrent, mais courgettes en rupture → missing (mode dégradé possible), écarté en mode strict", () => {
    const res = checkFeasibility(CURRY, PANTRY, OPTS);
    expect(res.feasible).toBe(false);
    expect(res.missing).toEqual(["courgette"]); // le mode dégradé § 7 le re-proposera « il te manque courgette »
    // pois chiches : couverture sûre par p2 (qty 400 g récente ≥ min 120)
    expect(res.coverage).toContainEqual({ ref: "pois-chiches-sec", pantryId: "p2", sure: true });
  });

  it("huile « entamé » à quantité inconnue couvre quand même (présence suffit)", () => {
    const res = checkFeasibility(CURRY, PANTRY, OPTS);
    expect(res.coverage).toContainEqual({ ref: "huile-olive", pantryId: "p6", sure: true });
  });

  it("curry redevient faisable quand la courgette revient en stock", () => {
    const pantry = PANTRY.map((p) =>
      p.id === "p5" ? { ...p, out: false, etat: "en_stock", qty: 300, qty_date: "2026-07-12" } : p
    );
    const res = checkFeasibility(CURRY, pantry, OPTS);
    expect(res.feasible).toBe(true);
    expect(res.probable).toBe(false); // toutes les couvertures sont liées (sûres)
    expect(res.missing).toEqual([]);
  });

  it("omelette faisable (emmental absent mais min 0 → omissible ; œufs convertis pc → g)", () => {
    const res = checkFeasibility(OMELETTE, PANTRY, OPTS);
    expect(res.feasible).toBe(true);
    expect(res.probable).toBe(false);
    expect(res.coverage).toContainEqual({ ref: "oeuf", pantryId: "p4", sure: true });
  });

  it("quantité connue ET récente : contraignante (50 g < min 120 → missing)", () => {
    const pantry = PANTRY.map((p) => (p.id === "p2" ? { ...p, qty: 50, qty_date: "2026-07-12" } : p));
    const res = checkFeasibility(CURRY, pantry, OPTS);
    expect(res.missing).toContain("pois-chiches-sec");
  });

  it("quantité connue mais PÉRIMÉE (≥ 7 j) : non contraignante, la présence suffit", () => {
    const pantry = PANTRY.map((p) => (p.id === "p2" ? { ...p, qty: 50, qty_date: "2026-07-01" } : p));
    const res = checkFeasibility(CURRY, pantry, OPTS);
    expect(res.missing).not.toContain("pois-chiches-sec");
  });

  it("skyr NON LIÉ : sans matcher il ne couvre pas (pas de match de catégorie), avec matcher → probable", () => {
    const sans = checkFeasibility(BOL_SKYR, PANTRY, OPTS);
    expect(sans.feasible).toBe(false);
    expect(sans.missing).toEqual(["laitage"]);

    const avec = checkFeasibility(BOL_SKYR, PANTRY, { ...OPTS, matcher: matcherSkyr });
    expect(avec.feasible).toBe(true);
    expect(avec.probable).toBe(true); // couverture non garantie
    expect(avec.coverage).toContainEqual({ slotIdx: 0, pantryId: "p7", sure: false });
  });

  it("out/fini ne couvre jamais ; etat déduit de out/qty s'il est absent", () => {
    expect(etatEffectif({ out: true })).toBe("fini");
    expect(etatEffectif({ out: false, qty: 0 })).toBe("fini");
    expect(etatEffectif({ out: false, qty: null })).toBe("en_stock");
    const pantry = [{ id: "x", name: "Courgettes", qty: 300, unit: "g", out: true, ref_id: "courgette" }];
    const res = checkFeasibility(CURRY, pantry, OPTS);
    expect(res.missing).toContain("courgette");
  });
});

describe("instantiate — top-5 par slot diversifié, budget-aware (§ 3.2)", () => {
  const BUDGET = { kcal: 650, prot: 45 };

  it("bowl : candidats non vides, jamais de courgette (finie), triés par pré-score", () => {
    const cands = instantiate(BOWL, PANTRY, BUDGET, OPTS);
    expect(cands.length).toBeGreaterThan(0);
    for (const c of cands) {
      expect(c.gabaritId).toBe("bowl");
      expect(c.items.some((it) => it.slug === "courgette")).toBe(false);
      expect(c.probable).toBe(false); // tout est lié dans ce pool
    }
    for (let i = 1; i < cands.length; i++) expect(cands[i - 1].prescore).toBeGreaterThanOrEqual(cands[i].prescore);
  });

  it("slot optionnel non couvert → omis (bowl sans huile reste instanciable)", () => {
    const pantry = PANTRY.filter((p) => p.id !== "p6");
    const cands = instantiate(BOWL, pantry, BUDGET, OPTS);
    expect(cands.length).toBeGreaterThan(0);
    for (const c of cands) expect(c.items.some((it) => it.ing.cat === "matiere_grasse")).toBe(false);
  });

  it("slot obligatoire non couvert → aucun candidat (gabarit écarté)", () => {
    const pantry = PANTRY.filter((p) => !["p1", "p4"].includes(p.id)); // ni tofu ni œufs
    expect(instantiate(BOWL, pantry, BUDGET, OPTS)).toEqual([]);
  });

  it("diversification garantie : ≥1 haute densité protéique et ≥1 basse densité kcal dans le top", () => {
    // Slot large avec topPerSlot serré : pool = tofu, œufs, épinards, huile
    const gab = {
      id: "test-div", type_de_piece: "plat",
      slots: [{ cats: ["proteine_vegetale", "oeuf", "legume", "matiere_grasse"], base: 100, min: 50, max: 200, ajustable: true, optionnel: false, choix_multiples: 1 }],
    };
    const cands = instantiate(gab, PANTRY, BUDGET, { ...OPTS, topPerSlot: 2 });
    const slugs = cands.map((c) => c.items[0].slug);
    expect(slugs).toContain("tofu-ferme"); // max p/kcal du pool (haute densité protéique)
    expect(slugs).toContain("epinards"); // min kcal100 du pool (basse densité kcal)
    expect(slugs).toHaveLength(2); // topPerSlot respecté
  });

  it("pré-score budget-aware : une densité kcal incompatible avec le budget est pénalisée", () => {
    const slotAmandes = { cats: ["oleagineux"], base: 100, min: 80, max: 150, ajustable: true, optionnel: false };
    const gab = { id: "test-budget", type_de_piece: "plat", slots: [slotAmandes] };
    const pantry = [{ id: "a1", name: "Amandes", qty: 500, unit: "g", out: false, ref_id: "amandes", etat: "en_stock" }];
    // 100 g d'amandes = 634 kcal : incompatible avec un budget de 300 kcal
    const serre = instantiate(gab, pantry, { kcal: 300, prot: 20 }, OPTS);
    const large = instantiate(gab, pantry, { kcal: 900, prot: 20 }, OPTS);
    expect(serre[0].prescore).toBeLessThan(large[0].prescore);
  });

  it("booster activé SEULEMENT si nécessaire, info exposée au solveur/scoring", () => {
    // Plancher atteignable sans booster → booster inactif mais options exposées
    const sans = instantiate(BOWL, PANTRY, { kcal: 650, prot: 45 }, OPTS);
    for (const c of sans) {
      expect(c.boosterNeeded).toBe(false);
      expect(c.boosterActive).toBe(false);
      expect(c.items.some((it) => it.booster)).toBe(false);
      expect(c.boosterOptions.length).toBeGreaterThan(0); // œuf + poudre disponibles
    }
    // Plancher inatteignable (70 g) → booster activé, meilleur booster = poudre
    const avec = instantiate(BOWL, PANTRY, { kcal: 700, prot: 70 }, OPTS);
    for (const c of avec) {
      expect(c.boosterNeeded).toBe(true);
      expect(c.boosterActive).toBe(true);
      const booster = c.items.find((it) => it.booster);
      expect(booster.slug).toBe("poudre-all-in-one"); // meilleure densité protéique du slot booster
    }
  });

  it("choix_multiples ≥ 2 : variante « paire » avec base et bornes partagées", () => {
    const pantry = PANTRY.map((p) =>
      p.id === "p5" ? { ...p, out: false, etat: "en_stock", qty: 300, qty_date: "2026-07-12" } : p
    );
    const cands = instantiate(BOWL, pantry, BUDGET, OPTS);
    const paire = cands.find((c) => c.items.filter((it) => it.ing.cat === "legume").length === 2);
    expect(paire).toBeTruthy();
    for (const it of paire.items.filter((i) => i.ing.cat === "legume")) {
      expect(it.qty).toBe(75); // base 150 partagée
      expect(it.max).toBe(150); // max 300 partagé
    }
  });

  it("item non lié + matcher : candidats « probables » ; sans matcher, gabarit écarté", () => {
    const sans = instantiate(BOL_SKYR, PANTRY, { kcal: 250, prot: 15 }, OPTS);
    expect(sans).toEqual([]); // slot laitage obligatoire non couvert
    const avec = instantiate(BOL_SKYR, PANTRY, { kcal: 250, prot: 15 }, { ...OPTS, matcher: matcherSkyr });
    expect(avec.length).toBeGreaterThan(0);
    expect(avec[0].probable).toBe(true);
    expect(avec[0].items[0].sure).toBe(false);
    expect(avec[0].ingredientPrincipal).toBe("skyr");
  });

  it("macros de base et ingrédient principal cohérents avec le référentiel", () => {
    const cands = instantiate(BOWL, PANTRY, BUDGET, OPTS);
    const c = cands.find((x) => x.items.some((it) => it.slug === "tofu-ferme"));
    expect(c.ingredientPrincipal).toBeTruthy();
    const kcalAttendu = c.items.reduce((s, it) => s + (refBySlug[it.slug].kcal100 * it.qty) / 100, 0);
    expect(c.kcal).toBeCloseTo(kcalAttendu, 6);
  });
});
