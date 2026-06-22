import { describe, it, expect } from "vitest";
import { dayTotals, computeTargets, smoothedWeight, weekStats, addDays, TODAY, EMPTY_DAY } from "./core.js";
import { mergeAppState } from "./sync.js";

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
