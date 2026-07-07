// engine/resolve.js — identité d'exercice (par nom pour l'instant) + dernière séance.
// (La Phase 1 ajoutera resolveExId via un catalogue d'ids stables.)
import { SESSION_A, SESSION_C } from "../config/programs/fullbody14.v1.js";
import { EXERCISES } from "../config/exercises.js";

// Tous les exercices de force (A + C) — pour retrouver le type/def d'un exo loggé.
const FORCE_EXERCISES = [...SESSION_A.exercises, ...SESSION_C.exercises];

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
