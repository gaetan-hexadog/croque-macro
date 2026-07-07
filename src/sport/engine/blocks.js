// engine/blocks.js — blocs de périodisation, résistance rameur, plan de disques.
import { PROGRESSION } from "../config/programs/fullbody14.v1.js";

export function getCurrentBlock(week) {
  return PROGRESSION.find((b) => b.weeks.includes(week));
}

export function getRowerResistance(week) {
  const block = getCurrentBlock(week);
  if (!block) return "3-4";
  if (block.phase === "Adaptation") return "3-4";
  if (block.phase === "Décharge") return "4";
  if (block.block <= 3) return "4-5";
  return "5-6";
}

// Plan de disques par côté pour une barre de 20 kg.
export function getDiscPlan(weight) {
  const perSide = (weight - 20) / 2;
  if (perSide < 0) return "Trop léger";
  if (perSide === 0) return "Barre à vide";
  const discs = [15, 10, 5, 2, 1.5, 0.5];
  let remaining = perSide;
  const used = [];
  for (const d of discs) {
    if (remaining >= d - 0.001) { used.push(d); remaining -= d; }
  }
  if (remaining > 0.01) return `≈ ${used.join("+")} kg/côté`;
  return used.join(" + ") + " kg/côté";
}
