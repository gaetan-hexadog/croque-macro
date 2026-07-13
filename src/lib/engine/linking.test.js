//  linking.test.js — golden tests de la liaison pantry → référentiel (spec § 3.1).
import { describe, it, expect } from "vitest";
import { matchPantryItem, normalizeName, SUGGEST_THRESHOLD } from "./linking.js";
import { REF } from "./fixtures.js";

describe("normalizeName", () => {
  it("minuscules, accents, ligatures, ponctuation, pluriels simples", () => {
    expect(normalizeName("Œufs")).toBe("oeuf");
    expect(normalizeName("ÉPINARDS")).toBe("epinard");
    expect(normalizeName("Pois chiches (secs)")).toBe("poi chiche sec");
    expect(normalizeName("  Tofu   bio, du marché ! ")).toBe("tofu bio du marche");
    expect(normalizeName("")).toBe("");
  });
});

describe("matchPantryItem — exact via normalisation", () => {
  it("« Oeufs » → oeuf (casse/pluriel/ligature)", () => {
    const m = matchPantryItem("Oeufs", REF);
    expect(m).toEqual({ refId: "oeuf", confidence: 1, kind: "exact" });
  });

  it("« ÉPINARDS » et « epinards » → epinards (accents/casse)", () => {
    expect(matchPantryItem("ÉPINARDS", REF)).toEqual({ refId: "epinards", confidence: 1, kind: "exact" });
    expect(matchPantryItem("epinards", REF)).toEqual({ refId: "epinards", confidence: 1, kind: "exact" });
  });

  it("« Pois chiches secs bio » → pois-chiches-sec (qualificatif ignoré) — liaison silencieuse possible (≥ 0,9)", () => {
    const m = matchPantryItem("Pois chiches secs bio", REF);
    expect(m.refId).toBe("pois-chiches-sec");
    expect(m.confidence).toBeGreaterThanOrEqual(0.9);
    expect(m.kind).not.toBe("fuzzy");
  });

  it("« Courgette » → courgette (le référentiel est au pluriel)", () => {
    expect(matchPantryItem("Courgette", REF)).toEqual({ refId: "courgette", confidence: 1, kind: "exact" });
  });

  it("l'ordre des mots ne compte pas (« basmati riz sec » → riz-basmati-sec)", () => {
    expect(matchPantryItem("basmati riz sec", REF)).toEqual({ refId: "riz-basmati-sec", confidence: 1, kind: "exact" });
  });
});

describe("matchPantryItem — fuzzy (suggestion, jamais auto-appliqué)", () => {
  it("« Tofu bio du marché » → tofu-ferme, fuzzy ≥ 0,6", () => {
    const m = matchPantryItem("Tofu bio du marché", REF);
    expect(m.refId).toBe("tofu-ferme");
    expect(m.kind).toBe("fuzzy"); // ⇒ confirmation requise côté UI, quel que soit le score
    expect(m.confidence).toBeGreaterThanOrEqual(SUGGEST_THRESHOLD);
  });

  it("« Sauce mystère » → null (aucun recouvrement)", () => {
    expect(matchPantryItem("Sauce mystère", REF)).toBeNull();
  });

  it("sous le seuil 0,6 → null (« Riz » seul ne recouvre pas assez « riz-basmati-sec »)", () => {
    expect(matchPantryItem("Riz", REF)).toBeNull();
  });

  it("nom vide ou fait uniquement de mots-outils → null", () => {
    expect(matchPantryItem("", REF)).toBeNull();
    expect(matchPantryItem("de la du", REF)).toBeNull();
  });
});

describe("matchPantryItem — alias appris", () => {
  it("prioritaire sur le fuzzy (une confirmation humaine passée l'emporte)", () => {
    // Sans alias, « Tofu bio du marché » fuzze vers tofu-ferme ; l'alias redirige.
    const aliases = { [normalizeName("Tofu bio du marché")]: "pois-chiches-sec" };
    expect(matchPantryItem("Tofu bio du marché", REF, aliases))
      .toEqual({ refId: "pois-chiches-sec", confidence: 1, kind: "alias" });
  });

  it("relie une saisie autrement introuvable", () => {
    const aliases = { [normalizeName("Sauce mystère")]: "huile-olive" };
    expect(matchPantryItem("Sauce mystère", REF, aliases))
      .toEqual({ refId: "huile-olive", confidence: 1, kind: "alias" });
  });

  it("alias vers un slug disparu du référentiel → ignoré (retombe sur exact/fuzzy)", () => {
    const aliases = { [normalizeName("Oeufs")]: "slug-fantome" };
    expect(matchPantryItem("Oeufs", REF, aliases)).toEqual({ refId: "oeuf", confidence: 1, kind: "exact" });
  });
});
