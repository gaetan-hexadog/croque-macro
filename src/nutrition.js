// ════════════════════════════════════════════════════════════════════════════
//  nutrition.js — constantes nutritionnelles centralisées (suppléments Bulk).
//  Source unique de vérité, importée par meals.js ET core.js. Un chiffre se
//  change ICI et nulle part ailleurs.
// ════════════════════════════════════════════════════════════════════════════
export const CLEAR_PROTEIN_DOSE = { kcal: 75, p: 18 }; // 1 dose Bulk Clear Whey Isolate (20 g) — fiche produit 2026
export const CLEAR_VEGAN_DOSE   = { kcal: 67, p: 15 }; // 1 dose officielle Bulk (Clear Vegan, ~20 g de poudre)
// Un « verre 150 ml » = 150 g d'un mélange [1 dose + 350 ml d'eau] (~375 g total) → 40 % de la dose.
export const GLASS_FRACTION = 150 / 375;
export const glassOf = (dose) => ({ kcal: Math.round(dose.kcal * GLASS_FRACTION), p: Math.round(dose.p * GLASS_FRACTION) });
export const CLEAR_PROTEIN_VERRE = glassOf(CLEAR_PROTEIN_DOSE); // → 30 / 7
