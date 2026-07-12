// engine/overrides.js — transformations d'exercice pilotées par des flags.
// (Phase 3 : cet applieur deviendra générique — flags déclaratifs en config.)
import { getAdaptedExerciseParams } from "./prescription.js";

// ── Correctif déséquilibre bras (Curl kettlebell) ────────────────────────────
// Tant que `sport.curlBalanced` n'est pas vrai (défaut), le Curl passe en UNILATÉRAL
// avec 1 série EN PLUS pour le bras GAUCHE (faible) : chaque série = gauche puis droite,
// dernière série = gauche seule (rattrapage). Bob coupe le correctif via les réglages
// Sport quand ses deux bras sont au même niveau (retour au curl bilatéral d'origine).
// Les flags perSide/sideWord/lastSetSingleSide pilotent le guide gauche/droite en séance
// (ForceWorkout). Le « superset bras » est conservé : il ne fait que retirer le repos
// avant le triceps, donc la série de rattrapage ne pose aucun problème de flux.
export function applyArmCorrection(session, sport) {
  if (!session || !session.exercises || sport?.curlBalanced) return session;
  const exercises = session.exercises.map((ex) => {
    if (ex.name !== "Curl kettlebell") return ex;
    return {
      ...ex,
      sets: ex.sets + 1, // +1 série gauche, quel que soit le volume du programme
      perSide: true, sideWord: "bras", lastSetSingleSide: true,
      loadLabel: "1×12 kg · unilatéral",
      tech: "Un bras à la fois (une seule KB de 12 kg), pas les deux ensemble. Commence TOUJOURS par le bras GAUCHE (le faible), puis le droit. Dernière série : GAUCHE seulement (rattrapage).",
      tips: [
        "Correctif déséquilibre : +1 série pour le gauche, le temps qu'il rattrape le droit.",
        "Toujours démarrer par le gauche (il arrive frais).",
        "Même charge des deux côtés ; si le gauche cale, baisse les reps du GAUCHE, pas le poids.",
        "Quand tes deux bras sont au même niveau → coupe le correctif dans les réglages Sport (retour au curl bilatéral).",
      ],
    };
  });
  return { ...session, exercises };
}

// ── Adaptation de programme : décharge → −1 série, développé militaire → 5 reps ──
// Rebranche le comportement dormant getAdaptedExerciseParams (décision validée par Bob).
// Fait au niveau SÉANCE (pas du log) → ex.sets/ex.reps restent cohérents dans tout le flux.
export function applyProgramAdaptation(session, week, workouts) {
  if (!session?.exercises) return session;
  const exercises = session.exercises.map((ex) => {
    const a = getAdaptedExerciseParams(ex, week, workouts);
    if (a.sets === ex.sets && a.reps === ex.reps) return ex;
    return { ...ex, sets: a.sets, reps: a.reps, repsTarget: a.repsTarget, adaptNotes: a.notes };
  });
  return { ...session, exercises };
}
