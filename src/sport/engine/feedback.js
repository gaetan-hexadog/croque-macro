// engine/feedback.js — lecture des retours d'une séance loggée.
// Compatible ancien modèle (done/failed) ET nouveau (repsDone/difficulty).
import { findExerciseDef } from "./resolve.js";

export const DIFFICULTY = { HEAVY: "trop_lourd", OK: "parfait", EASY: "trop_facile" };
export const DIFFICULTY_OPTIONS = [
  { v: "trop_lourd", l: "Trop lourd", hint: "down" },
  { v: "parfait", l: "Parfait", hint: "hold" },
  { v: "trop_facile", l: "Trop facile", hint: "up" },
];

export function setFailed(s, exerciseDef = null) {
  if (!s) return false;
  if (s.difficulty === "trop_lourd") return true;
  if (s.failed === true) return true;
  if (s.done === false) return true;
  const target = s.repsTarget ?? (exerciseDef && typeof exerciseDef.reps === "number" ? exerciseDef.reps : null);
  if (target != null && s.repsDone != null && s.repsDone < target) return true;
  return false;
}

export function analyzeSessionEntry(entry) {
  if (!entry || !entry.data) return { allDone: true, failedCount: 0, totalSets: 0 };
  let totalSets = 0, failedCount = 0;
  for (const ex of entry.data) {
    const def = findExerciseDef(ex.exercise);
    for (const s of ex.sets) { totalSets++; if (setFailed(s, def)) failedCount++; }
  }
  return { allDone: failedCount === 0, failedCount, totalSets };
}

// Résumé des retours d'un exercice sur une séance : tendance globale.
export function exerciseFeedback(entry, exerciseName, def = null) {
  const ex = entry?.data?.find((d) => d.exercise === exerciseName);
  if (!ex || !ex.sets?.length) return null;
  let heavy = 0, easy = 0, failed = 0, rated = 0, maxReps = 0, lastWeight = null;
  for (const s of ex.sets) {
    if (s.weight != null) lastWeight = s.weight;
    if (s.repsDone != null) maxReps = Math.max(maxReps, s.repsDone);
    if (setFailed(s, def)) failed++;
    if (s.difficulty === DIFFICULTY.HEAVY) heavy++;
    else if (s.difficulty === DIFFICULTY.EASY) easy++;
    if (s.difficulty) rated++;
  }
  const n = ex.sets.length;
  return {
    n, heavy, easy, failed, rated, maxReps, lastWeight,
    allEasy: rated > 0 && easy === rated && failed === 0,   // tous les retours = trop facile
    anyHeavy: heavy > 0 || failed >= 1,                     // au moins un trop lourd / raté
  };
}
