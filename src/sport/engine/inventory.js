// engine/inventory.js — paliers kettlebell d'après le MATÉRIEL possédé (config/inventory.js).
// Une KB ne « monte » que vers une cloche réellement possédée (jamais une cloche fantôme).
import { DEFAULT_INVENTORY } from "../config/inventory.js";

export { DEFAULT_INVENTORY };

// Poids (kg, triés croissant) dont on possède AU MOINS `per` exemplaires.
// per = 2 → exo bilatéral (une paire) ; per = 1 → exo à une main.
export function ownedBells(inventory, per = 1) {
  const kb = inventory?.kb || [];
  return kb
    .filter((b) => (Number(b.count) || 0) >= per)
    .map((b) => Number(b.kg))
    .filter((n) => n > 0)
    .sort((a, b) => a - b);
}

// Prochaine cloche possédée STRICTEMENT plus lourde que `currentKg` pour ce `per` (ou null si plafond).
export function nextBell(inventory, currentKg, per = 1) {
  return ownedBells(inventory, per).find((w) => w > (Number(currentKg) || 0)) ?? null;
}

// Libellé d'un palier KB (« 2×14 kg », « 1×16 kg »). `suffix` préserve un « /bras » de l'original.
export function kbLabel(kg, per = 2, suffix = "") {
  return `${per >= 2 ? "2×" : "1×"}${kg} kg${suffix || ""}`;
}
