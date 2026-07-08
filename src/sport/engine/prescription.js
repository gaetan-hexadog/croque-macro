// engine/prescription.js — charge/reps prescrites pour la prochaine séance + adaptation prudente.
// (Phase 2-3 : charge PAR exercice + montée réelle. Ici : comportement d'origine préservé.)
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

const FIXED_REP_MIN = 8, FIXED_REP_MAX = 15, FIXED_REP_STEP = 1; // bornes de progression par reps

// Prescription pour la prochaine séance d'un exercice : charge ou reps + raison.
//   { mode:"charge"|"reps", value, unit, direction:"up"|"down"|"hold", note }
export function getExercisePrescription(exercise, week, history, exerciseCharges = {}) {
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

  // ── Barre (standard/heavy) : charge = cible MÉMORISÉE (montée/descente réelle, Phase 3) ──
  const exId = resolveExId(exercise.name) || exercise.name;
  const prev = lastWeightOf(history, exercise.name);
  const lane = exerciseCharges?.[exId];
  const block = getCurrentBlock(week);
  // Charge = cible mémorisée ; sinon la charge du bloc (PARITÉ). En décharge : allègement
  // d'affichage seulement (la cible mémorisée n'est jamais écrasée par la décharge).
  let charge = lane?.kg != null ? lane.kg : programChargeForType(week, exercise.type, exercise);
  if (lane?.kg != null && block?.phase === "Décharge") charge = Math.max(20, Math.round((charge * 0.9) / 2.5) * 2.5);
  let direction = "hold", note = null;
  if (block?.phase === "Décharge" && lane?.kg != null) { direction = "down"; note = "Semaine de décharge — charge allégée volontairement, on récupère."; }
  else if (prev != null && charge > prev) { direction = "up"; note = "Charge en hausse — tu l'as méritée (séances propres)."; }
  else if (prev != null && charge < prev) { direction = "down"; note = "Charge allégée après une séance difficile — on repart proprement."; }
  else if (fb?.allEasy) { note = "Jugé facile — encore une séance propre et ça monte."; }
  return { mode: "charge", value: charge, unit: "kg", direction, note };
}

// Dernière charge réellement travaillée sur un exercice (max des séries loggées). null si jamais.
function lastWeightOf(history, name) {
  const entry = lastEntryWithExercise(history, name);
  const ex = entry?.data?.find((d) => d.exercise === name);
  if (!ex) return null;
  const ws = ex.sets.map((s) => s.weight).filter((w) => w != null && w > 0);
  return ws.length ? Math.max(...ws) : null;
}

// Nb de séances CONSÉCUTIVES (récentes, hors décharge) où cet exo a été jugé « tout facile ».
function consecutiveEasy(workouts, name, def) {
  const entries = Object.values(workouts || {})
    .filter((e) => e?.completed && e?.data?.some((d) => d.exercise === name))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  let n = 0;
  for (const e of entries) {
    if (getCurrentBlock(e.week)?.phase === "Décharge") continue;
    const f = exerciseFeedback(e, name, def);
    if (f && f.allEasy) n++; else break;
  }
  return n;
}

// ── Moteur d'adaptation BIDIRECTIONNEL (Phase 3) ─────────────────────────────
// Après une séance, met à jour la charge mémorisée de chaque exercice à la BARRE
// (montée ET descente, par exercice). Appelé dans SportScreen.finishSession.
//   • trop lourd / raté             → −step, borné à la barre (descente immédiate)
//   • tout facile + N séances propres + ressenti ok + hors décharge → +step (LA vraie montée)
// KB / poids du corps : progression par reps (getExercisePrescription) — paliers = Phase 4.
const ADAPT = { barbellUpStreak: 2, step: 2.5, minKg: 20, feelHardThreshold: 2 };
export function applyFeedback(entry, sport = {}, workouts = {}) {
  const charges = { ...(sport.exerciseCharges || {}) };
  if (!entry?.data || getCurrentBlock(entry.week)?.phase === "Décharge") return charges; // pas de MàJ en décharge
  const now = Date.now();
  for (const exData of entry.data) {
    const def = findExerciseDef(exData.exercise);
    if (!def || (def.type !== "standard" && def.type !== "heavy")) continue; // barre uniquement
    const exId = resolveExId(exData.exercise) || exData.exercise;
    const fb = exerciseFeedback(entry, exData.exercise, def);
    if (!fb) continue;
    const current = fb.lastWeight ?? charges[exId]?.kg ?? programChargeForType(entry.week, def.type, def);
    if (current == null) continue;
    let next = current;
    if (fb.anyHeavy) {
      next = Math.max(ADAPT.minKg, current - ADAPT.step);
    } else if (fb.allEasy) {
      const streak = consecutiveEasy(workouts, exData.exercise, def);
      const feelOk = entry.feel == null || entry.feel > ADAPT.feelHardThreshold;
      if (streak >= ADAPT.barbellUpStreak && feelOk) next = current + ADAPT.step;
    }
    if (next !== current || charges[exId]?.kg == null) charges[exId] = { kg: next, updatedAt: now, week: entry.week };
  }
  return charges;
}
