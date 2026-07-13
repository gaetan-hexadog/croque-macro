//  ════════════════════════════════════════════════════════════════
//  bank/index.js — BANQUE v1 du moteur de repas (docs/MOTEUR-REPAS.md).
//  Assemble le référentiel d'ingrédients, les gabarits + patrons et les
//  recettes signature. Consommée par les modules purs de src/lib/engine/
//  (toujours injectée en argument, jamais importée par le moteur).
//  ════════════════════════════════════════════════════════════════

import { INGREDIENTS } from "./ingredients.js";
import { GABARITS, PATRONS } from "./gabarits.js";
import { RECETTES } from "./recettes.js";

export const BANK = {
  version: 1,
  ingredients: INGREDIENTS,
  gabarits: GABARITS,
  patrons: PATRONS,
  recettes: RECETTES,
};
