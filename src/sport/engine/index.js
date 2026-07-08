// engine/index.js — barrel du moteur Sport. Point d'entrée unique : ré-exporte
// tous les modules moteur + les données du programme (config). lib/sport.js le
// ré-exporte pour la compat des imports consommateurs (supprimée en Phase 6).
export * from "./dates.js";
export * from "./blocks.js";
export * from "./resolve.js";
export * from "./feedback.js";
export * from "./prescription.js";
export * from "./analytics.js";
export * from "./substitution.js";
export * from "./freeCardio.js";
export * from "./coach.js";
export * from "./overrides.js";
export * from "./inventory.js";

// Données du programme (ré-export pour un point d'entrée unique).
export * from "../config/programs/fullbody14.v1.js";
export * from "../config/programs/index.js";
export * from "../config/coachProfile.js";
export { EQUIPMENT, DEFAULT_EQUIPMENT } from "../config/alternatives.js";
