// engine/prescription.js — charge/reps prescrites pour la prochaine séance + adaptation prudente.
// (Phase 2-3 : charge PAR exercice + montée réelle. Ici : comportement d'origine préservé.)
import { PROGRESSION } from "../config/programs/fullbody14.v1.js";
import { getCurrentBlock } from "./blocks.js";
import { findExerciseDef, lastEntryWithExercise, resolveExId } from "./resolve.js";
import { setFailed, exerciseFeedback } from "./feedback.js";

// Charge programme pour un type d'exercice à une semaine donnée.
// Pour les exercices à charge fixe (kettlebell) on renvoie la charge de l'exo.
function programChargeForType(week, type, exerciseDef = null) {
  if (type === "bodyweight") return null;
  if (type === "fixed") return exerciseDef ? exerciseDef.load : null;
  const block = getCurrentBlock(week);
  if (!block) return 20;
  return type === "heavy" ? block.heavy : block.standard;
}

// Renvoie la charge prudente d'UN EXERCICE (clé = exId), d'après les 3 dernières séances.
// Phase 2 : fin du partage par « type » — baisser un exo ne touche plus ses voisins.
// Parité : historique vide → charge du bloc (identique à avant).
export function getChargeForExercise(week, exercise, history = null) {
  const type = exercise?.type;
  const programCharge = programChargeForType(week, type, exercise);
  if (type === "bodyweight") return null;
  if (!history) return programCharge;

  const exId = resolveExId(exercise.name) || exercise.name;
  const recent = Object.values(history)
    .filter((e) => e?.completed && e?.data)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 3);

  let prudentCharge = programCharge;
  for (const entry of recent) {
    // Ajustement mémorisé PAR EXERCICE (exId) ; fallback sur l'ancien par TYPE (logs d'avant Phase 2).
    const adj = entry.chargeAdjustments?.[exId] ?? entry.chargeAdjustments?.[type];
    if (adj != null) {
      if (adj < prudentCharge) prudentCharge = adj;
      break;
    }
    // ≥2 séries ratées SUR CET EXERCICE → charge du bloc précédent (pour cet exo seulement).
    const exData = (entry.data || []).find((d) => (resolveExId(d.exercise) || d.exercise) === exId);
    if (exData) {
      let failed = 0;
      for (const s of exData.sets) if (setFailed(s, exercise)) failed++;
      if (failed >= 2) {
        const block = getCurrentBlock(week);
        const blockIdx = PROGRESSION.indexOf(block);
        if (blockIdx > 0) {
          const prev = PROGRESSION[blockIdx - 1];
          const prevCharge = type === "heavy" ? prev.heavy : prev.standard;
          if (prevCharge < prudentCharge) prudentCharge = prevCharge;
        }
        break;
      }
    }
  }
  return prudentCharge;
}

// Paramètres adaptés d'un exercice (décharge, fallback militaire).
export function getAdaptedExerciseParams(exercise, week, history) {
  const block = getCurrentBlock(week);
  let sets = exercise.sets;
  let reps = exercise.reps;
  let repsTarget = exercise.repsTarget || (typeof exercise.reps === "number" ? exercise.reps : null);
  const notes = [];

  if (block && block.phase === "Décharge" && exercise.sets === 3 && exercise.type !== "bodyweight") {
    sets = 2;
    notes.push("Semaine de décharge : 2 séries au lieu de 3.");
  }

  if (exercise.name === "Développé militaire" && history) {
    const recent = Object.values(history)
      .filter((e) => e?.completed && e?.data)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 3);
    let hasFailed = false;
    for (const entry of recent) {
      const exData = entry.data?.find((d) => d.exercise === "Développé militaire");
      if (!exData) continue;
      if (exData.sets.some((s) => setFailed(s, exercise))) { hasFailed = true; break; }
    }
    if (hasFailed && typeof reps === "number" && reps === 10) {
      reps = 5; repsTarget = 5;
      notes.push("Tu as eu du mal récemment sur le développé militaire — on passe à 5 reps. On reviendra à 10 quand 3 × 5 passent proprement.");
    }
  }

  return { sets, reps, repsTarget, notes };
}

// 3 séances propres de suite au même poids → proposer la progression.
export function shouldSuggestProgression(history, week, sessionId) {
  const same = Object.values(history)
    .filter((e) => e?.completed && e?.data && e?.sessionId === sessionId)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 3);
  if (same.length < 3) return false;
  for (const e of same) {
    if (e.week !== week) return false;
    if (e.chargeAdjustments) return false;
    for (const ex of e.data) {
      const def = findExerciseDef(ex.exercise);
      for (const s of ex.sets) if (setFailed(s, def)) return false;
    }
  }
  const block = getCurrentBlock(week);
  if (!block || block.block === PROGRESSION.length) return false;
  return true;
}

const FIXED_REP_MIN = 8, FIXED_REP_MAX = 15, FIXED_REP_STEP = 1; // bornes de progression par reps

// Prescription pour la prochaine séance d'un exercice : charge ou reps + raison.
//   { mode:"charge"|"reps", value, unit, direction:"up"|"down"|"hold", note }
export function getExercisePrescription(exercise, week, history) {
  const last = history ? lastEntryWithExercise(history, exercise.name) : null;
  const fb = last ? exerciseFeedback(last, exercise.name, exercise) : null;

  // ── Charge fixe (kettlebells) & poids du corps : progression par REPS ──
  if (exercise.type === "fixed" || exercise.type === "bodyweight") {
    const baseReps = typeof exercise.reps === "number" ? exercise.reps : (exercise.repsTarget || FIXED_REP_MIN);
    let target = fb?.maxReps ? Math.max(baseReps, fb.maxReps) : baseReps;
    let direction = "hold", note = null;
    if (fb?.anyHeavy) {
      target = Math.max(FIXED_REP_MIN, (fb.maxReps || baseReps) - FIXED_REP_STEP);
      direction = "down"; note = "Dernière fois jugé trop lourd — on réduit un peu les reps, on garde la charge.";
    } else if (fb?.allEasy) {
      if (target >= FIXED_REP_MAX) {
        direction = "up";
        note = exercise.type === "fixed"
          ? `Trop facile à ${FIXED_REP_MAX} reps — passe au palier supérieur (kettlebell plus lourde ou tempo plus lent).`
          : `Trop facile à ${FIXED_REP_MAX} reps — ajoute une variante plus dure (lestée, surélevée).`;
      } else {
        target = Math.min(FIXED_REP_MAX, target + 2);
        direction = "up"; note = `Trop facile la dernière fois — on monte à ${target} reps.`;
      }
    }
    return { mode: "reps", value: target, unit: "reps", direction, note, load: exercise.load ?? null, loadLabel: exercise.loadLabel || null };
  }

  // ── Barre (standard/heavy) : progression par CHARGE ──
  const charge = getChargeForExercise(week, exercise, history);
  let direction = "hold", note = null;
  if (fb?.anyHeavy) { direction = "down"; note = "Dernière fois trop lourd — charge prudente (bloc précédent)."; }
  else if (fb?.allEasy && shouldSuggestProgression(history, week, last?.sessionId)) {
    direction = "up"; note = "3 séances propres et jugées faciles — prêt pour le palier suivant.";
  } else if (fb?.allEasy) {
    note = "Jugé facile : continue à cette charge, le palier monte au prochain bloc.";
  }
  return { mode: "charge", value: charge, unit: "kg", direction, note };
}
