// engine/overrides.js — transformations d'exercice pilotées par des flags.
// (Phase 3 : cet applieur deviendra générique — flags déclaratifs en config.)
import { getAdaptedExerciseParams } from "./prescription.js";

// ── Correctif déséquilibre bras (Curl kettlebell) ────────────────────────────
// Tant que `sport.curlBalanced` n'est pas vrai (défaut), le Curl passe en UNILATÉRAL
// avec 1 série de plus pour le bras GAUCHE (faible) : séries 1-3 gauche+droite, série 4
// gauche seule → gauche 4×, droite 3×. Bob coupe le correctif via les réglages Sport
// quand ses deux bras sont au même niveau (retour au curl bilatéral d'origine).
// Le « superset bras » est conservé : il ne fait que retirer le repos avant le triceps,
// donc la 4e série ne pose aucun problème de flux.
export function applyArmCorrection(session, sport) {
  if (!session || !session.exercises || sport?.curlBalanced) return session;
  const exercises = session.exercises.map((ex) => {
    if (ex.name !== "Curl kettlebell") return ex;
    return {
      ...ex,
      sets: 4,
      loadLabel: "1×12 kg · unilatéral",
      tech: "Un bras à la fois (une seule KB de 12 kg), pas les deux ensemble. Commence TOUJOURS par le bras GAUCHE (le faible). Séries 1 à 3 : gauche puis droite, 8 reps chacun. Série 4 : GAUCHE seulement (rattrapage).",
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
