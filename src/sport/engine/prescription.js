// engine/prescription.js — charge/reps prescrites pour la prochaine séance + adaptation prudente.
// (Phase 2-3 : charge PAR exercice + montée réelle. Ici : comportement d'origine préservé.)
import { getCurrentBlock } from "./blocks.js";
import { findExerciseDef, lastEntryWithExercise, resolveExId } from "./resolve.js";
import { setFailed, exerciseFeedback } from "./feedback.js";
import { EXERCISES } from "../config/exercises.js";
import { DEFAULT_INVENTORY, nextBell, kbLabel, clampToOwned } from "./inventory.js";

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
export function getExercisePrescription(exercise, week, history, exerciseCharges = {}, inventory = {}) {
  const last = history ? lastEntryWithExercise(history, exercise.name) : null;
  const fb = last ? exerciseFeedback(last, exercise.name, exercise) : null;
  const exId = resolveExId(exercise.name) || exercise.name;

  // ── Charge fixe (kettlebells/disques) & poids du corps : progression par REPS puis PALIER de cloche (KB) ──
  // `equipment: "disques"` (ex. élévations latérales) : charge fixe HORS inventaire kettlebell —
  // jamais de clamp vers une cloche (sinon 2 kg serait « remonté » à 12 kg), progression par reps.
  if (exercise.type === "fixed" || exercise.type === "bodyweight") {
    const isKB = exercise.type === "fixed" && exercise.equipment !== "disques";
    const cat = EXERCISES[exId];
    const per = cat?.kbPer || (exercise.loadLabel?.trim().startsWith("1×") ? 1 : 2);
    const inv = inventory?.kb?.length ? inventory : DEFAULT_INVENTORY;
    const lane = exerciseCharges?.[exId];
    const rawCurKg = isKB && lane?.rungKg != null ? lane.rungKg : (exercise.load ?? null);
    const curKg = isKB ? clampToOwned(inv, rawCurKg, per) : rawCurKg;                     // jamais une cloche non possédée
    // « 10/bras », « 12/jambe » → 10, 12 (jamais le plancher par défaut pour un objectif écrit en toutes lettres)
    const baseReps = typeof exercise.reps === "number" ? exercise.reps
      : (exercise.repsTarget || parseInt(String(exercise.reps ?? "").match(/\d+/)?.[0] || "", 10) || FIXED_REP_MIN);
    const lastKg = lastWeightOf(history, exercise.name);
    const bumped = isKB && lane?.rungKg != null && lastKg != null && lastKg < curKg;      // vrai palier gagné (lane), pas un écart de base entre programmes
    const suffix = exercise.loadLabel?.match(/kg(.*)$/)?.[1] || "";                       // préserve « /bras »
    const loadLabel = isKB && curKg != null && curKg !== exercise.load ? kbLabel(curKg, per, suffix) : (exercise.loadLabel || null);
    let target = bumped ? baseReps : (fb?.maxReps ? Math.max(baseReps, fb.maxReps) : baseReps);
    let direction = "hold", note = null;
    if (bumped) {
      direction = "up"; note = `Nouvelle charge ${kbLabel(curKg, per, suffix)} — on repart à ${baseReps} reps propres, puis on remonte.`;
    } else if (fb?.anyHeavy) {
      target = Math.max(FIXED_REP_MIN, (fb.maxReps || baseReps) - FIXED_REP_STEP);
      direction = "down"; note = "Dernière fois jugé trop lourd — on réduit un peu les reps, on garde la charge.";
    } else if (fb?.allEasy) {
      if (target >= FIXED_REP_MAX) {
        direction = "up";
        if (isKB) {
          const nb = nextBell(inv, curKg, per);
          note = nb != null
            ? `Trop facile à ${FIXED_REP_MAX} reps — passe à ${kbLabel(nb, per, suffix)}.`
            : `Max de reps à ${kbLabel(curKg, per, suffix)} et pas de cloche plus lourde dispo — ajoute du tempo lent / des négatifs${per >= 2 ? "" : " ou une pause de 2 s en bas"}.`;
        } else if (exercise.type === "fixed") {
          note = `Trop facile à ${FIXED_REP_MAX} reps — ajoute un petit disque dans chaque main (ex. 2 + 1,5 kg) et repars à 12 reps.`;
        } else {
          note = `Trop facile à ${FIXED_REP_MAX} reps — ajoute une variante plus dure (lestée, surélevée).`;
        }
      } else {
        target = Math.min(FIXED_REP_MAX, target + 2);
        direction = "up"; note = `Trop facile la dernière fois — on monte à ${target} reps.`;
      }
    }
    return { mode: "reps", value: target, unit: "reps", direction, note, load: curKg, loadLabel };
  }

  // ── Barre (standard/heavy) : lane mémorisée > ta force ATTEINTE (historique) > amorce programme > bloc ──
  const lane = exerciseCharges?.[exId];
  const reached = maxWeightForExId(history, exId);          // poids max déjà soulevé (suit les renommages/programmes)
  const prev = lastWeightOf(history, exercise.name);         // dernier poids travaillé (sens de la flèche)
  const block = getCurrentBlock(week);
  // Une AMORCE (lane posée en semaine 1) ne redescend jamais SOUS ta force déjà atteinte.
  const laneKg = (lane?.kg != null && lane.week === 1 && reached != null) ? Math.max(lane.kg, reached) : (lane?.kg ?? null);
  let charge;
  if (laneKg != null) charge = laneKg;                       // charge mémorisée (adaptée séance après séance)
  else if (exercise.startKg != null) charge = Math.max(reached ?? 0, exercise.startKg); // reprend ta force, plancher = départ programme
  else charge = programChargeForType(week, exercise.type, exercise);                     // full-body : charge du bloc (parité)
  if (lane?.kg != null && block?.phase === "Décharge") charge = Math.max(20, Math.round((charge * 0.9) / 2.5) * 2.5);
  let direction = "hold", note = null;
  if (block?.phase === "Décharge" && lane?.kg != null) { direction = "down"; note = "Semaine de décharge — charge allégée volontairement, on récupère."; }
  else if (prev != null && charge > prev) { direction = "up"; note = "Charge en hausse — tu l'as méritée (séances propres)."; }
  else if (prev != null && charge < prev) { direction = "down"; note = "Charge allégée après une séance difficile — on repart proprement."; }
  else if (fb?.allEasy) { note = "Jugé facile — encore une séance propre et ça monte."; }
  return { mode: "charge", value: charge, unit: "kg", direction, note };
}

// Poids MAX déjà réellement soulevé pour un exId (tous noms/programmes confondus). null si jamais.
function maxWeightForExId(history, exId) {
  let mx = 0;
  for (const e of Object.values(history || {})) {
    if (!e?.completed || !Array.isArray(e?.data)) continue;
    for (const ex of e.data) {
      if ((resolveExId(ex.exercise) || ex.exercise) !== exId) continue;
      for (const s of ex.sets || []) if (s.weight != null && s.weight > 0) mx = Math.max(mx, s.weight);
    }
  }
  return mx > 0 ? mx : null;
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
  const inv = sport.inventory?.kb?.length ? sport.inventory : DEFAULT_INVENTORY;
  for (const exData of entry.data) {
    const def = findExerciseDef(exData.exercise);
    if (!def) continue;
    const exId = resolveExId(exData.exercise) || exData.exercise;
    const fb = exerciseFeedback(entry, exData.exercise, def);
    if (!fb) continue;
    if (def.type === "standard" || def.type === "heavy") {
      // ── Barre : descente immédiate si trop lourd, montée si facile ×N + ressenti ok (en kg) ──
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
    } else if (def.type === "fixed" && def.equipment !== "disques") {
      // ── Kettlebell : monte d'un PALIER de cloche quand 15 reps atteint + tout facile + cloche plus lourde possédée ──
      // (disques : progression par reps dans getExercisePrescription, jamais de palier de cloche)
      const per = EXERCISES[exId]?.kbPer || 2;
      const curKg = fb.lastWeight ?? charges[exId]?.rungKg ?? def.load ?? null; // poids réellement soulevé (comme la barre), pas le load dédupliqué
      if (curKg == null) continue;
      if (fb.allEasy && (fb.maxReps ?? 0) >= FIXED_REP_MAX) {
        const nb = nextBell(inv, curKg, per);
        if (nb != null) charges[exId] = { rungKg: nb, updatedAt: now, week: entry.week };
      }
    }
  }
  return charges;
}
