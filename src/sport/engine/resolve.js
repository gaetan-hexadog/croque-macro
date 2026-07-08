// engine/resolve.js — identité d'exercice (nom → exId stable) + dernière séance.
import { PROGRAMS } from "../config/programs/index.js";
import { EXERCISES } from "../config/exercises.js";

// Tous les exercices de force de TOUS les programmes — pour retrouver le type/def d'un exo
// loggé (nom affiché OU legacy). Dédupliqué par nom (1er gagnant : type cohérent entre programmes).
// IMPORTANT : couvre l'upper-focus aussi (ex. « Rowing barre »), sinon applyFeedback le sauterait.
const FORCE_EXERCISES = (() => {
  const out = [], seen = new Set();
  for (const p of Object.values(PROGRAMS)) for (const s of Object.values(p.sessions || {})) {
    if (s.type === "cardio") continue;
    for (const ex of s.exercises || []) if (!seen.has(ex.name)) { seen.add(ex.name); out.push(ex); }
  }
  return out;
})();

// Nom (affiché OU legacy) → id stable d'exercice. Fait suivre historique + (Phase 2)
// charge mémorisée à un exo même s'il change de libellé ou de programme.
const NAME_TO_EXID = {};
for (const ex of Object.values(EXERCISES)) {
  NAME_TO_EXID[ex.name] = ex.id;
  for (const ln of ex.legacyNames || []) NAME_TO_EXID[ln] = ex.id;
}
export function resolveExId(name) {
  return NAME_TO_EXID[name] || null;
}

export function findExerciseDef(name) {
  return FORCE_EXERCISES.find((e) => e.name === name) || null;
}

// Dernière séance loggée contenant cet exercice.
export function lastEntryWithExercise(history, exerciseName) {
  return Object.values(history || {})
    .filter((e) => e?.completed && e?.data?.some((d) => d.exercise === exerciseName))
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0] || null;
}
