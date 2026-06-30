import { describe, it, expect } from "vitest";
import { dayTotals, computeTargets, smoothedWeight, weekStats, observedTrend, computeAdaptiveTarget, fixClearProteinHistory, scoreProduct, addDays, TODAY, EMPTY_DAY, streakCount, correctMacros, catOf, protStock, varietyProfile, mergePantryStore } from "./core.js";
import { mergeAppState } from "./lib/sync.js";

const PROFILE = { sex: "h", age: 35, height: 178, weight: 78, activity: 1.45, deficit: 0.18 };
// Construit un historique : poids sur nWeights jours + apports loggés sur nDays.
function buildHistory({ weightFn, intake, nWeights = 14, nDays = 8 }) {
  const weights = {}, days = {};
  for (let i = nWeights - 1; i >= 0; i--) weights[addDays(TODAY, -i)] = weightFn(i);
  for (let i = nDays - 1; i >= 0; i--) days[addDays(TODAY, -i)] = { picks: { pdj: [{ kcal: intake, p: 30 }], dej: [], diner: [], snacks: [], extras: [] } };
  return { weights, days };
}

describe("dayTotals", () => {
  it("somme kcal et protéines en tenant compte des quantités", () => {
    const day = { picks: { pdj: [{ kcal: 100, p: 10, qty: 2 }], dej: [{ kcal: 200, p: 20 }], diner: [], snacks: [{ kcal: 50, p: 5 }], extras: [{ kcal: 30, p: 0 }] } };
    expect(dayTotals(day)).toEqual({ kcal: 100 * 2 + 200 + 50 + 30, p: 10 * 2 + 20 + 5 });
  });
  it("gère les jours vides / nuls", () => {
    expect(dayTotals(null)).toEqual({ kcal: 0, p: 0 });
    expect(dayTotals(EMPTY_DAY())).toEqual({ kcal: 0, p: 0 });
  });
});

describe("streakCount", () => {
  const logged = () => ({ picks: { pdj: [{ kcal: 300, p: 20 }], dej: [], diner: [], snacks: [], extras: [] } });
  it("compte les jours consécutifs réellement loggés depuis aujourd'hui", () => {
    const days = { [TODAY]: logged(), [addDays(TODAY, -1)]: logged(), [addDays(TODAY, -2)]: logged() };
    expect(streakCount(days, TODAY)).toBe(3);
  });
  it("tolère un aujourd'hui vide si la veille est loggée (série démarre hier)", () => {
    const days = { [addDays(TODAY, -1)]: logged(), [addDays(TODAY, -2)]: logged() };
    expect(streakCount(days, TODAY)).toBe(2);
  });
  it("s'arrête au premier trou", () => {
    const days = { [TODAY]: logged(), [addDays(TODAY, -2)]: logged() }; // hier manquant
    expect(streakCount(days, TODAY)).toBe(1);
  });
  it("renvoie 0 sans données récentes", () => {
    expect(streakCount({}, TODAY)).toBe(0);
    expect(streakCount(null, TODAY)).toBe(0);
  });
  it("ignore les repas seulement planifiés (planned)", () => {
    const days = { [TODAY]: { picks: { pdj: [{ kcal: 300, p: 20, planned: true }], dej: [], diner: [], snacks: [], extras: [] } } };
    expect(streakCount(days, TODAY)).toBe(0);
  });
});

describe("computeTargets", () => {
  it("cible sous la maintenance, avec protéines dans une fourchette saine", () => {
    const t = computeTargets({ sex: "h", age: 35, weight: 78, height: 178, activity: 1.45, deficit: 0.18 });
    expect(t.maintenance).toBeGreaterThan(t.target);
    expect(t.target).toBeGreaterThanOrEqual(1500);
    expect(t.proteinReco).toBeGreaterThanOrEqual(100);
    expect(t.proteinReco).toBeLessThanOrEqual(220);
  });
  it("respecte le plancher de 1500 kcal", () => {
    const t = computeTargets({ sex: "f", age: 60, weight: 50, height: 155, activity: 1.2, deficit: 0.25 });
    expect(t.target).toBeGreaterThanOrEqual(1500);
  });
  it("retombe sur le profil par défaut si non renseigné", () => {
    expect(computeTargets().target).toBeGreaterThan(0);
  });
});

describe("smoothedWeight", () => {
  it("renvoie null sous le minimum de pesées", () => {
    expect(smoothedWeight({}, TODAY, { min: 3 })).toBeNull();
  });
  it("pondère davantage les pesées récentes", () => {
    const w = { [addDays(TODAY, -1)]: 80, [TODAY]: 78 };
    const r = smoothedWeight(w, TODAY, { min: 1 });
    expect(r.n).toBe(2);
    expect(r.kg).toBeGreaterThan(78);
    expect(r.kg).toBeLessThan(79); // tiré vers la pesée la plus récente (78)
  });
});

describe("weekStats", () => {
  it("moyenne sur les jours loggés uniquement", () => {
    const days = { [TODAY]: { picks: { pdj: [{ kcal: 500, p: 30 }], dej: [], diner: [], snacks: [], extras: [] } } };
    const s = weekStats(days, { kcal: 1850, protein: 150 }, TODAY, 7);
    expect(s.logged).toBe(1);
    expect(s.avgKcal).toBe(500);
  });
});

describe("observedTrend", () => {
  it("null si pas assez de recul/données", () => {
    expect(observedTrend({}, {}, TODAY)).toBeNull();
  });
  it("estime maintenance et rythme sur un plateau", () => {
    const { weights, days } = buildHistory({ weightFn: () => 78, intake: 2000 });
    const t = observedTrend(days, weights, TODAY);
    expect(t).not.toBeNull();
    expect(Math.abs(t.ratePerWeek)).toBeLessThan(0.05); // plateau
    expect(t.maintenance).toBeGreaterThan(1900);         // ~ apport moyen
    expect(t.maintenance).toBeLessThan(2100);
  });
});

describe("computeAdaptiveTarget", () => {
  it("null tant qu'il n'y a pas assez de données (pas de réaction au bruit)", () => {
    expect(computeAdaptiveTarget({ profile: PROFILE, days: {}, weights: {}, currentTarget: 1850 })).toBeNull();
  });
  it("plateau : recale vers le bas mais jamais sous le plancher (1500/BMR)", () => {
    const { weights, days } = buildHistory({ weightFn: () => 78, intake: 2000 });
    const r = computeAdaptiveTarget({ profile: PROFILE, days, weights, currentTarget: 1850 });
    expect(r).not.toBeNull();
    expect(r.kcal).toBeLessThanOrEqual(1850);
    expect(r.kcal).toBeGreaterThanOrEqual(1500);
    expect(r.tone).toBe("stall");
  });
  it("limite de poids saine (BMI ~20) : arrête le déficit", () => {
    const { weights, days } = buildHistory({ weightFn: () => 63, intake: 1700 }); // BMI ~20 pour 178 cm
    const r = computeAdaptiveTarget({ profile: PROFILE, days, weights, currentTarget: 1500 });
    expect(r).not.toBeNull();
    expect(r.tone).toBe("floor");
    expect(r.kcal).toBeGreaterThanOrEqual(1500);
  });
  it("perte trop rapide (>1 %/sem) : adoucit", () => {
    const { weights, days } = buildHistory({ weightFn: (i) => 78 + (i / 13) * 2, intake: 1600 });
    const r = computeAdaptiveTarget({ profile: PROFILE, days, weights, currentTarget: 1500 });
    expect(r).not.toBeNull();
    expect(r.tone).toBe("tooFast");
  });
  it("null sans âge/taille (a besoin du profil)", () => {
    const { weights, days } = buildHistory({ weightFn: () => 78, intake: 2000 });
    expect(computeAdaptiveTarget({ profile: { weight: 78 }, days, weights, currentTarget: 1850 })).toBeNull();
  });
});

describe("fixClearProteinHistory", () => {
  it("corrige le verre (34/8→30/7) et la dose (86/20→75/18), idempotent", () => {
    const days = { "2026-06-01": { picks: { pdj: [{ name: "Clear Protein Bulk (verre 150 ml)", kcal: 34, p: 8, qty: 2 }], dej: [{ name: "Banane", kcal: 90, p: 1 }], diner: [], snacks: [], extras: [] } } };
    const fixed = fixClearProteinHistory(days);
    expect(fixed["2026-06-01"].picks.pdj[0]).toMatchObject({ kcal: 30, p: 7, qty: 2 });
    expect(fixed["2026-06-01"].picks.dej[0]).toMatchObject({ kcal: 90 }); // intact
    expect(fixClearProteinHistory(fixed)).toBe(fixed); // idempotent → renvoie l'objet tel quel
  });
});

describe("scoreProduct", () => {
  it("null sans protéines (règle non applicable)", () => {
    expect(scoreProduct({ kcal: 200, p: 0 })).toBeNull();
  });
  it("feu vert pour un protéiné maigre (ratio 8, gras bas, peu de sucre)", () => {
    expect(scoreProduct({ kcal: 160, p: 20, fat: 4, sugar: 2 }).flag).toBe("good");
  });
  it("feu rouge si trop calorique (ratio > 15)", () => {
    expect(scoreProduct({ kcal: 400, p: 20, fat: 5, sugar: 2 }).flag).toBe("bad");
  });
  it("feu rouge si gras > prot (le piège fromage)", () => {
    expect(scoreProduct({ kcal: 200, p: 15, fat: 18, sugar: 1 }).flag).toBe("bad");
  });
  it("orange si ratio moyen mais gras/sucre ok", () => {
    expect(scoreProduct({ kcal: 200, p: 14, fat: 5, sugar: 10 }).flag).toBe("mid");
  });
});

describe("correctMacros", () => {
  const meal = (ingredients) => ({ title: "x", kcal: 999, protein: 99, ingredients });
  it("recalcule un ingrédient g/ml qui matche le frigo depuis la densité /100", () => {
    const m = correctMacros(meal([{ qty: 150, unit: "g", name: "skyr nature", kcal: 80, protein: 12 }]), [], [{ name: "Skyr", kcal100: 60, p100: 10 }]);
    expect(m.ingredients[0]).toMatchObject({ kcal: 90, protein: 15 }); // 60×1,5 / 10×1,5
    expect(m).toMatchObject({ kcal: 90, protein: 15 });                // total resommé
  });
  it("NE confond PAS « amande » (frigo) avec « lait d'amande » (têtes différentes)", () => {
    const m = correctMacros(meal([{ qty: 250, unit: "ml", name: "lait d'amande", kcal: 38, protein: 1 }]), [], [{ name: "amandes", kcal100: 600, p100: 21 }]);
    expect(m.ingredients[0].kcal).toBe(38); // inchangé — pas de faux match catastrophique (sinon 1500)
  });
  it("laisse le repas intact sans macros par ingrédient", () => {
    const before = { kcal: 300, protein: 20, ingredients: [{ qty: 100, unit: "g", name: "skyr" }] };
    expect(correctMacros(before, [], [{ name: "skyr", kcal100: 60, p100: 10 }])).toBe(before);
  });
});

describe("catOf", () => {
  it("classe par mots-clés", () => {
    expect(catOf("Skyr nature")).toBe("proteine");
    expect(catOf("Tofu ferme")).toBe("proteine");
    expect(catOf("Fromage blanc 0%")).toBe("proteine");
    expect(catOf("Flocons d'avoine")).toBe("placard");
    expect(catOf("Épinards frais")).toBe("frais");
    expect(catOf("Banane")).toBe("frais");
  });
  it("« lait d'amande » → boissons, pas laitiers (Bob ne boit pas de lait de vache)", () => {
    expect(catOf("Lait d'amande")).toBe("boisson");
  });
  it("« amandes » → placard (≠ lait d'amande)", () => {
    expect(catOf("Amandes")).toBe("placard");
  });
  it("inconnu → autre", () => {
    expect(catOf("Bidule mystère")).toBe("autre");
  });
});

describe("protStock", () => {
  it("somme p100·qty/100, ignore pièce et sans-densité", () => {
    const items = [
      { p100: 10, qty: 500, unit: "g" },  // 50
      { p100: 75, qty: 900, unit: "g" },  // 675
      { p100: 6, qty: 5, unit: "pièce" }, // ignoré (pièce)
      { qty: 200, unit: "g" },            // ignoré (pas de densité)
    ];
    expect(protStock(items)).toBe(725);
  });
  it("0 sur liste vide ou nulle", () => {
    expect(protStock([])).toBe(0);
    expect(protStock()).toBe(0);
  });
});

describe("varietyProfile", () => {
  const meal = (name) => ({ name, kcal: 300, p: 20 });
  it("compte les aliments récurrents (1×/repas) et garde ceux vus ≥ 2 fois", () => {
    const days = {
      [TODAY]: { picks: { pdj: [meal("Bowl skyr amande")], dej: [meal("Tofu sauté")], diner: [], snacks: [], extras: [] } },
      [addDays(TODAY, -1)]: { picks: { pdj: [meal("Skyr fruits")], dej: [meal("Curry tofu")], diner: [], snacks: [], extras: [] } },
      [addDays(TODAY, -2)]: { picks: { pdj: [], dej: [meal("Tofu grillé")], diner: [], snacks: [], extras: [] } },
    };
    const map = Object.fromEntries(varietyProfile(days, TODAY, 10).map((x) => [x.name, x.n]));
    expect(map["tofu"]).toBe(3);
    expect(map["skyr"]).toBe(2);
  });
  it("ignore les repas seulement planifiés", () => {
    const days = { [TODAY]: { picks: { pdj: [{ name: "Tofu", kcal: 1, p: 1, planned: true }], dej: [], diner: [], snacks: [], extras: [] } } };
    expect(varietyProfile(days, TODAY)).toEqual([]);
  });
});

describe("mergePantryStore", () => {
  it("fusionne par nom et garde les DEUX faces (portion + densité)", () => {
    const pantry = [{ id: "p1", name: "Skyr", out: false, unit: "g", kcal100: 63, p100: 11 }];
    const customMeals = [{ id: "c1", name: "skyr", kcal: 95, p: 17, unit: "g" }];
    const out = mergePantryStore(pantry, customMeals);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ name: "Skyr", out: false, kcal100: 63, p100: 11, kcal: 95, p: 17 });
    expect(Array.isArray(out[0].slots)).toBe(true);
  });
  it("ex-customMeal → out:false (dispo) + slots par défaut", () => {
    const out = mergePantryStore([], [{ id: "c1", name: "Tofu", kcal: 145, p: 16 }]);
    expect(out[0].out).toBe(false);
    expect(out[0].slots).toEqual(["pdj", "dej", "diner", "snack"]);
  });
  it("est idempotent : re-fusionner le résultat ne change rien", () => {
    const merged = mergePantryStore(
      [{ id: "p1", name: "Skyr", out: true, kcal100: 63, p100: 11, slots: ["pdj"] }],
      [{ id: "c1", name: "Pain", kcal: 240, p: 20 }],
    );
    const again = mergePantryStore(merged, []);
    expect(again).toBe(merged); // pas de churn → même référence
  });
  it("déduplique insensible à la casse / espaces", () => {
    const out = mergePantryStore([{ id: "p1", name: " Tofu " }, { id: "p2", name: "TOFU" }], []);
    expect(out).toHaveLength(1);
  });
  it("ignore un item sans nom", () => {
    const out = mergePantryStore([{ id: "p1", name: "" }, { id: "p2", name: "Œufs" }], []);
    expect(out.map((x) => x.name)).toEqual(["Œufs"]);
  });
  it("un doublon dispo l'emporte sur rupture", () => {
    const out = mergePantryStore([{ id: "p1", name: "Tofu", out: true }], [{ id: "c1", name: "tofu", kcal: 145, p: 16 }]);
    expect(out[0].out).toBe(false);
  });
});

describe("mergeAppState", () => {
  it("renvoie le local quand il n'y a pas de remote", () => {
    const local = { customRecipes: [{ id: 1 }] };
    expect(mergeAppState(local, null)).toBe(local);
  });
  it("unionne les collections par id sans rien perdre", () => {
    const local = { customRecipes: [{ id: "a" }], favs: ["x"], settings: { kcal: 1800 } };
    const remote = { customRecipes: [{ id: "b" }], favs: ["y"], settings: { kcal: 1900 } };
    const m = mergeAppState(local, remote);
    expect(m.customRecipes.map((r) => r.id).sort()).toEqual(["a", "b"]);
    expect(m.favs.sort()).toEqual(["x", "y"]);
    expect(m.settings.kcal).toBe(1900); // scalaire : le remote gagne
  });
  it("déduplique les collisions d'id (le remote gagne)", () => {
    const m = mergeAppState({ combos: [{ id: "a", name: "old" }] }, { combos: [{ id: "a", name: "new" }] });
    expect(m.combos).toHaveLength(1);
    expect(m.combos[0].name).toBe("new");
  });
});
