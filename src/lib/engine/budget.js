//  budget.js — étage 0 du moteur de repas (spec § 3.0) : budget du créneau.
//  Module PUR : aucune dépendance, toutes les données injectées, pas de Date.now().
//
//  budget_repas = (cible_jour − consommé) × poids_créneau / Σ poids des créneaux restants.
//  Le petit-déj pèse 0 si skipBreakfast. Garde-fou : si le plancher protéines du créneau
//  dépasse protMealCap (~55 g, irréaliste en un repas), on le plafonne et on recommande
//  explicitement un shake en complément (protCapped + shakeRecommended).

const EPS = 1e-9;

//  Détection du créneau petit-déj (le poids passe à 0 si skipBreakfast).
function isBreakfastSlot(name) {
  return /petit|matin|breakfast/i.test(String(name || ""));
}

/**
 * Calcule le budget (plafond kcal, plancher protéines) d'un créneau.
 *
 * @param {object}   params
 * @param {object}   params.targets      cibles du jour { kcal, protein }
 * @param {object}   params.consumed     déjà consommé { kcal, protein }
 * @param {object[]} params.slots        créneaux [{ slot, weight, remaining }]
 * @param {string}   params.slot         créneau visé (doit être « remaining »)
 * @param {number}   [params.protMealCap=55]     plafond du plancher protéines par repas
 * @param {boolean}  [params.skipBreakfast=false] petit-déj sauté → poids 0
 * @returns {{ kcal: number, prot: number, protCapped: boolean, shakeRecommended: boolean }}
 */
export function computeMealBudget({
  targets,
  consumed,
  slots,
  slot,
  protMealCap = 55,
  skipBreakfast = false,
}) {
  //  Reste du jour, clampé à 0 (on ne « rembourse » jamais un dépassement).
  const restKcal = Math.max(0, (targets?.kcal || 0) - (consumed?.kcal || 0));
  const restProt = Math.max(0, (targets?.protein || 0) - (consumed?.protein || 0));

  //  Poids effectif d'un créneau : 0 pour le petit-déj sauté.
  const effWeight = (s) =>
    skipBreakfast && isBreakfastSlot(s.slot) ? 0 : Math.max(0, s.weight || 0);

  //  Répartition sur les seuls créneaux restants.
  const remaining = (slots || []).filter((s) => s.remaining);
  const totalWeight = remaining.reduce((sum, s) => sum + effWeight(s), 0);
  const current = remaining.find((s) => s.slot === slot);
  const share =
    current && totalWeight > EPS ? effWeight(current) / totalWeight : 0;

  const kcal = restKcal * share;
  const protRaw = restProt * share;

  //  Garde-fou : plancher protéines irréaliste en un seul repas → plafonner + shake.
  const protCapped = protRaw > protMealCap + EPS;
  const prot = protCapped ? protMealCap : protRaw;

  return {
    kcal: Math.round(kcal),
    prot: Math.round(prot),
    protCapped,
    shakeRecommended: protCapped,
  };
}
