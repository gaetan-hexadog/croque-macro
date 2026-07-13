//  scoring.test.js — golden tests de l'étape C (spec § 3.4) : malus absolus
//  anti-répétition, restes exemptés, exclusions de session, MMR.

import { describe, it, expect } from "vitest";
import {
  scoreCandidate,
  selectDiverse,
  applySessionExclusions,
  antiRepetitionMalus,
  similarity,
  MALUS_CAP,
} from "./scoring.js";
import { instantiate } from "./feasibility.js";
import { REF, refBySlug, GABARITS, RECETTES, PANTRY, HISTORY, NOW } from "./fixtures.js";

const JOUR_MS = 24 * 60 * 60 * 1000;
const BUDGET = { kcal: 620, prot: 48 };
const CURRY = RECETTES.find((r) => r.id === "curry-pois-chiches");
const OMELETTE = RECETTES.find((r) => r.id === "omelette-garnie");

//  Candidat construit depuis une recette des fixtures (macros aux qty de base).
function candidatRecette(recette, surcharges = {}) {
  const items = recette.components.map((c) => ({
    slug: c.ref, ing: refBySlug[c.ref], qty: c.qty, min: c.min, max: c.max, ajustable: c.ajustable,
  }));
  return {
    recetteId: recette.id,
    gabaritId: null,
    type_de_piece: recette.type_de_piece,
    ingredientPrincipal: recette.components.find((c) => c.principal)?.ref ?? null,
    items,
    kcal: items.reduce((s, it) => s + (it.ing.kcal100 * it.qty) / 100, 0),
    prot: items.reduce((s, it) => s + (it.ing.p100 * it.qty) / 100, 0),
    ...surcharges,
  };
}

const CTX = { budget: BUDGET, history: HISTORY, pantry: PANTRY, now: NOW };

describe("anti-répétition — malus absolus, fenêtres fractionnaires (§ 3.4)", () => {
  //  Curry mangé HIER 19:45 (fixtures), now 13/07 18:40 → Δ ≈ 0,955 j.
  const deltaJ = (new Date(NOW) - new Date("2026-07-12T19:45")) / JOUR_MS;

  it("recette mangée hier → malus ≈ 0,5 × (6/7), vérifié numériquement", () => {
    // Principal hors historique pour isoler le malus recette
    const c = candidatRecette(CURRY, { ingredientPrincipal: "tofu-ferme" });
    const attendu = 0.5 * ((7 - deltaJ) / 7); // décroissance linéaire 7 j
    expect(antiRepetitionMalus(c, HISTORY, NOW)).toBeCloseTo(attendu, 6);
    expect(Math.abs(attendu - 0.5 * (6 / 7))).toBeLessThan(0.01); // ≈ 0,5×(6/7)
    const { parts } = scoreCandidate(c, CTX);
    expect(1 - parts.fraicheur).toBeCloseTo(attendu, 6); // malus ABSOLU, lisible via fraicheur
  });

  it("cumul recette + ingrédient principal (fenêtre 3,5 j), sous le plafond", () => {
    const c = candidatRecette(CURRY); // principal = pois-chiches-sec, aussi dans l'historique
    const attendu = 0.5 * ((7 - deltaJ) / 7) + 0.3 * ((3.5 - deltaJ) / 3.5);
    expect(attendu).toBeLessThan(MALUS_CAP); // ≈ 0,65 : pas encore plafonné
    expect(antiRepetitionMalus(c, HISTORY, NOW)).toBeCloseTo(attendu, 6);
  });

  it("cumul plafonné à 0,7 : la triple peine n'est pas un filtre dur déguisé", () => {
    // Recette + principal (hier) + gabarit shake (ce matin) → somme ≈ 0,79 > 0,7
    const c = candidatRecette(CURRY, { gabaritId: "shake" });
    const deltaG = (new Date(NOW) - new Date("2026-07-13T07:40")) / JOUR_MS;
    const somme = 0.5 * ((7 - deltaJ) / 7) + 0.3 * ((3.5 - deltaJ) / 3.5) + 0.15 * ((7 - deltaG) / 7);
    expect(somme).toBeGreaterThan(MALUS_CAP);
    expect(antiRepetitionMalus(c, HISTORY, NOW)).toBeCloseTo(MALUS_CAP, 6);
    const { parts, score } = scoreCandidate(c, CTX);
    expect(parts.fraicheur).toBeCloseTo(1 - MALUS_CAP, 6); // = 0,3
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it("hors fenêtre : plus aucun malus (décroissance jusqu'à zéro)", () => {
    const c = candidatRecette(CURRY);
    const vieux = [{ date: "2026-07-01T19:45", recetteId: "curry-pois-chiches", gabaritId: null, ingredientPrincipal: "pois-chiches-sec" }];
    expect(antiRepetitionMalus(c, vieux, NOW)).toBe(0);
  });
});

describe("restes — exemptés d'anti-répétition et bonifiés (§ 3.1)", () => {
  //  Le reste de curry (p9, reste:true) : même recette que le curry d'hier.
  const resteCurry = {
    recetteId: "curry-pois-chiches",
    gabaritId: null,
    ingredientPrincipal: "pois-chiches-sec",
    items: [{ slug: "curry-pois-chiches", pantryId: "p9", qty: 1 }],
  };

  it("le reste de curry (p9) est exempté du malus malgré le curry d'hier", () => {
    const { parts, reste } = scoreCandidate(resteCurry, CTX);
    expect(reste).toBe(true); // détecté via reste:true du pantry utilisé
    expect(parts.fraicheur).toBe(1); // exemption totale
  });

  it("le reste est bonifié : il score au-dessus du même curry recuisiné", () => {
    const sReste = scoreCandidate(resteCurry, CTX);
    const sCurry = scoreCandidate(candidatRecette(CURRY), CTX);
    expect(sReste.score).toBeGreaterThan(sCurry.score);
    expect(sReste.parts.inventaire).toBeGreaterThan(sCurry.parts.inventaire); // bonus inventaire
  });
});

describe("composante budget — plafond kcal, plancher protéines", () => {
  it("protéines dépassées SANS exploser les kcal → bonus ; kcal explosées → pas de bonus", () => {
    const base = { recetteId: null, gabaritId: "g", ingredientPrincipal: "x", items: [] };
    const ok = scoreCandidate({ ...base, kcal: 600, prot: 52 }, { budget: BUDGET, now: NOW });
    const sousProt = scoreCandidate({ ...base, kcal: 600, prot: 40 }, { budget: BUDGET, now: NOW });
    const kcalExplose = scoreCandidate({ ...base, kcal: 900, prot: 52 }, { budget: BUDGET, now: NOW });
    expect(ok.parts.budget).toBeGreaterThan(sousProt.parts.budget);
    expect(ok.parts.budget).toBeGreaterThan(kcalExplose.parts.budget);
    for (const s of [ok, sousProt, kcalExplose]) {
      for (const v of Object.values(s.parts)) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1); // composantes normalisées [0,1]
      }
    }
  });
});

describe("exclusions de session — filtre dur éphémère AVANT scoring (§ 3.4)", () => {
  const cCurry = candidatRecette(CURRY);
  const cOmelette = candidatRecette(OMELETTE);

  it("« pois-chiches-sec » exclu → le curry sort du pool, l'omelette reste", () => {
    const { pool, ecartes, degraded } = applySessionExclusions([cCurry, cOmelette], ["pois-chiches-sec"]);
    expect(degraded).toBe(false);
    expect(pool).toEqual([cOmelette]);
    expect(ecartes).toEqual([cCurry]);
  });

  it("mode dégradé : pool vidé → les écartés sont re-proposés avec mention", () => {
    const { pool, degraded } = applySessionExclusions([cCurry], ["pois-chiches-sec"]);
    expect(degraded).toBe(true);
    expect(pool).toHaveLength(1); // ne JAMAIS répondre « rien »
    expect(pool[0].mention).toBe("exclusion-session");
    expect(pool[0].recetteId).toBe("curry-pois-chiches");
  });

  it("scoreCandidate court-circuite aussi un candidat exclu (défense en profondeur)", () => {
    const res = scoreCandidate(cCurry, { ...CTX, exclusions: ["pois-chiches-sec"] });
    expect(res.excluded).toBe(true);
    expect(res.score).toBe(0);
    // Exclusion par id de recette aussi
    expect(scoreCandidate(cCurry, { ...CTX, exclusions: ["curry-pois-chiches"] }).excluded).toBe(true);
  });

  it("sans exclusions : pool intact", () => {
    const { pool, degraded } = applySessionExclusions([cCurry, cOmelette], []);
    expect(pool).toHaveLength(2);
    expect(degraded).toBe(false);
  });
});

describe("selectDiverse — MMR λ=0,7, contrainte dure puis relâchement (§ 3.4)", () => {
  const mk = (id, gabaritId, principal, score, items = []) => ({
    id, recetteId: null, gabaritId, ingredientPrincipal: principal, score, items,
  });

  it("pool ≥ 2k : contrainte dure — gabarits ET principaux tous différents", () => {
    const c1 = mk("c1", "bowl", "tofu-ferme", 0.9);
    const c2 = mk("c2", "bowl", "oeuf", 0.85);
    const c3 = mk("c3", "bowl", "tofu-ferme", 0.8);
    const c4 = mk("c4", "shake", "poudre-all-in-one", 0.5);
    const sel = selectDiverse([c1, c2, c3, c4], 2); // pool 4 = 2k → contrainte dure
    expect(sel.map((c) => c.id)).toEqual(["c1", "c4"]); // c2/c3 bloqués (même gabarit)
  });

  it("pool < 2k : contrainte relâchée en pénalité, la diversité passe par le MMR", () => {
    // 3 candidats, MÊME gabarit → diversité forcée impossible, relâchement
    const cA = mk("cA", "bowl", "tofu-ferme", 0.9);
    const cB = mk("cB", "bowl", "tofu-ferme", 0.85);
    const cC = mk("cC", "bowl", "oeuf", 0.7);
    const sel = selectDiverse([cA, cB, cC], 2); // pool 3 < 4
    expect(sel).toHaveLength(2); // on répond quand même
    // cC (principal différent) bat cB (même gabarit + même principal) via la pénalité de similarité
    expect(sel.map((c) => c.id)).toEqual(["cA", "cC"]);
  });

  it("contrainte dure intenable en cours de route → relâchement automatique, jamais vide", () => {
    const clones = [1, 2, 3, 4].map((i) => mk(`c${i}`, "bowl", "tofu-ferme", 1 - i * 0.1));
    const sel = selectDiverse(clones, 2); // pool 4 = 2k mais tous identiques
    expect(sel).toHaveLength(2);
    // Ne renvoie jamais vide si des candidats existent
    expect(selectDiverse([clones[0]], 5)).toHaveLength(1);
    expect(selectDiverse([], 3)).toEqual([]);
  });

  it("similarité : même recette = 1 ; Jaccard pondéré kcal (le tofu pèse plus que les épinards)", () => {
    const r1 = { recetteId: "curry-pois-chiches", gabaritId: null, ingredientPrincipal: "a", items: [] };
    const r2 = { recetteId: "curry-pois-chiches", gabaritId: null, ingredientPrincipal: "b", items: [] };
    expect(similarity(r1, r2)).toBe(1);

    const it = (slug, qty) => ({ slug, ing: refBySlug[slug], qty });
    const A = { recetteId: null, gabaritId: null, ingredientPrincipal: "pA", items: [it("tofu-ferme", 200), it("epinards", 100)] };
    const B = { recetteId: null, gabaritId: null, ingredientPrincipal: "pB", items: [it("tofu-ferme", 200), it("courgette", 100)] };
    const C = { recetteId: null, gabaritId: null, ingredientPrincipal: "pC", items: [it("pates-seches", 100), it("epinards", 100)] };
    // A et B partagent le tofu (gros des kcal) ; A et C ne partagent que les épinards (négligeables)
    expect(similarity(A, B)).toBeGreaterThan(similarity(A, C));
  });

  it("intégration : instantiate → scoreCandidate → selectDiverse renvoie un top-k exploitable", () => {
    const bowl = GABARITS.find((g) => g.id === "bowl");
    const cands = instantiate(bowl, PANTRY, { kcal: 650, prot: 45 }, { now: NOW, referentiel: REF });
    const scores = cands.map((c) => ({ ...c, score: scoreCandidate(c, CTX).score }));
    const sel = selectDiverse(scores, 3);
    expect(sel.length).toBeGreaterThan(0);
    expect(sel.length).toBeLessThanOrEqual(3);
  });
});
