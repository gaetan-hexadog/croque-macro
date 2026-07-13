//  budget.test.js — golden tests de l'étage 0 (spec § 3.0) sur les fixtures communes.
import { describe, it, expect } from "vitest";
import { computeMealBudget } from "./budget.js";
import { TARGETS } from "./fixtures.js";

//  Journée type : déjeuner 0,45 / dîner 0,55 (poids de la spec), petit-déj optionnel.
const DEJ_DINER = [
  { slot: "dejeuner", weight: 0.45, remaining: true },
  { slot: "diner", weight: 0.55, remaining: true },
];

describe("computeMealBudget — étage 0", () => {
  it("répartit le reste du jour selon les poids 0,45/0,55 des créneaux restants", () => {
    const consumed = { kcal: 600, protein: 60 }; // reste : 1250 kcal / 90 g
    const dej = computeMealBudget({ targets: TARGETS, consumed, slots: DEJ_DINER, slot: "dejeuner" });
    expect(dej.kcal).toBe(563); // 1250 × 0,45
    expect(dej.prot).toBe(41); // 90 × 0,45
    expect(dej.protCapped).toBe(false);
    expect(dej.shakeRecommended).toBe(false);

    const diner = computeMealBudget({ targets: TARGETS, consumed, slots: DEJ_DINER, slot: "diner" });
    expect(diner.kcal).toBe(688); // 1250 × 0,55
    expect(diner.prot).toBe(50); // 90 × 0,55
  });

  it("skipBreakfast : le petit-déj pèse 0, la répartition retombe sur 0,45/0,55", () => {
    const slots = [
      { slot: "petit-dej", weight: 0.2, remaining: true },
      ...DEJ_DINER,
    ];
    const dej = computeMealBudget({
      targets: TARGETS,
      consumed: { kcal: 0, protein: 0 },
      slots,
      slot: "dejeuner",
      skipBreakfast: true,
    });
    //  Poids effectifs : 0 + 0,45 + 0,55 → part déjeuner = 0,45.
    expect(dej.kcal).toBe(833); // 1850 × 0,45
    //  67,5 g > 55 → plafonné (voir test dédié).
    expect(dej.prot).toBe(55);
    expect(dej.protCapped).toBe(true);
  });

  it("skipBreakfast : le créneau petit-déj lui-même reçoit un budget nul", () => {
    const slots = [
      { slot: "petit-dej", weight: 0.2, remaining: true },
      ...DEJ_DINER,
    ];
    const b = computeMealBudget({
      targets: TARGETS,
      consumed: { kcal: 0, protein: 0 },
      slots,
      slot: "petit-dej",
      skipBreakfast: true,
    });
    expect(b.kcal).toBe(0);
    expect(b.prot).toBe(0);
    expect(b.protCapped).toBe(false);
    expect(b.shakeRecommended).toBe(false);
  });

  it("petit-déj non sauté : il compte dans la somme des poids", () => {
    const slots = [
      { slot: "petit-dej", weight: 0.2, remaining: true },
      ...DEJ_DINER,
    ];
    const dej = computeMealBudget({
      targets: TARGETS,
      consumed: { kcal: 0, protein: 80 },
      slots,
      slot: "dejeuner",
    });
    //  Part déjeuner = 0,45 / 1,2 = 0,375.
    expect(dej.kcal).toBe(694); // 1850 × 0,375
    expect(dej.prot).toBe(26); // 70 × 0,375
  });

  it("plafonne le plancher protéines à ~55 g/repas et recommande un shake", () => {
    //  Dîner seul restant : tout le reste du jour tombe dessus.
    const slots = [
      { slot: "dejeuner", weight: 0.45, remaining: false },
      { slot: "diner", weight: 0.55, remaining: true },
    ];
    const b = computeMealBudget({
      targets: TARGETS,
      consumed: { kcal: 0, protein: 0 },
      slots,
      slot: "diner",
    });
    expect(b.kcal).toBe(1850);
    expect(b.prot).toBe(55); // 150 g irréalistes en un repas → plafond
    expect(b.protCapped).toBe(true);
    expect(b.shakeRecommended).toBe(true);
  });

  it("protMealCap est paramétrable", () => {
    const slots = [{ slot: "diner", weight: 0.55, remaining: true }];
    const b = computeMealBudget({
      targets: TARGETS,
      consumed: { kcal: 1400, protein: 105 }, // reste 45 g
      slots,
      slot: "diner",
      protMealCap: 40,
    });
    expect(b.prot).toBe(40);
    expect(b.protCapped).toBe(true);
    expect(b.shakeRecommended).toBe(true);
  });

  it("clampe le reste à 0 quand la journée a dépassé les cibles", () => {
    const b = computeMealBudget({
      targets: TARGETS,
      consumed: { kcal: 2000, protein: 160 },
      slots: DEJ_DINER,
      slot: "diner",
    });
    expect(b.kcal).toBe(0);
    expect(b.prot).toBe(0);
    expect(b.protCapped).toBe(false);
  });

  it("un créneau déjà passé (remaining:false) reçoit un budget nul", () => {
    const slots = [
      { slot: "dejeuner", weight: 0.45, remaining: false },
      { slot: "diner", weight: 0.55, remaining: true },
    ];
    const b = computeMealBudget({
      targets: TARGETS,
      consumed: { kcal: 0, protein: 0 },
      slots,
      slot: "dejeuner",
    });
    expect(b.kcal).toBe(0);
    expect(b.prot).toBe(0);
  });
});
