// engine/resolve.js — identité d'exercice (par nom pour l'instant) + dernière séance.
// (La Phase 1 ajoutera resolveExId via un catalogue d'ids stables.)
import { SESSION_A, SESSION_C } from "../config/programs/fullbody14.v1.js";

// Tous les exercices de force (A + C) — pour retrouver le type/def d'un exo loggé.
const FORCE_EXERCISES = [...SESSION_A.exercises, ...SESSION_C.exercises];

export function findExerciseDef(name) {
  return FORCE_EXERCISES.find((e) => e.name === name) || null;
}

// Dernière séance loggée contenant cet exercice.
export function lastEntryWithExercise(history, exerciseName) {
  return Object.values(history || {})
    .filter((e) => e?.completed && e?.data?.some((d) => d.exercise === exerciseName))
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0] || null;
}
