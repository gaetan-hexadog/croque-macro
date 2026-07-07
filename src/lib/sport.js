// ════════════════════════════════════════════════════════════════
// sport.js — données + logique PURE du programme de musculation.
//
// Source : app fitness-tracker (/Users/gaetan/Desktop/GitHub/fitness-tracker),
// portée le 2026-06-24. fitness-tracker reste la référence du programme ;
// toute évolution du programme se reporte ici à la main.
//
// Ce module ne contient AUCUN composant React ni icône : uniquement des
// constantes et des fonctions pures (calcul de charge, adaptation, dates).
// Les helpers de "suggestion" renvoient un `level` ("warning"|"info") que
// l'UI traduit en icône.
//
// Modèle d'une séance loggée (workout_logs.data) :
//   { date, completed, sessionId:"A"|"B"|"C", week, manual?,
//     data: [ { exercise, sets: [ { weight, repsTarget, repsDone, difficulty } ] } ],
//     cardioData?: { distance, rowerLevel, ropeJumps, rpe, notes },
//     chargeAdjustments?: { standard, heavy } }
//   difficulty ∈ "trop_lourd" | "parfait" | "trop_facile"  (cf. Phase 1b)
// ════════════════════════════════════════════════════════════════

// ── Données du programme : déplacées en config/ (Phase 0 — refonte). ─────────
// sport.js les ré-exporte pour que les consommateurs ne changent pas d'import.
import { PROGRESSION, SESSION_A, SESSION_B, SESSION_C, SESSIONS, SESSION_ORDER } from "../sport/config/programs/fullbody14.v1.js";
import { ADAPT_TIPS, RULES } from "../sport/config/coachProfile.js";
import { EQUIPMENT, DEFAULT_EQUIPMENT, ALTS } from "../sport/config/alternatives.js";
export { PROGRESSION, SESSION_A, SESSION_B, SESSION_C, SESSIONS, SESSION_ORDER, ADAPT_TIPS, RULES, EQUIPMENT, DEFAULT_EQUIPMENT };

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

// ADAPT_TIPS et RULES → config/coachProfile.js (importés/ré-exportés en tête).

// ── Dates (pures, sans dépendance) ──────────────────────────────────────────
export function daysBetween(d1, d2) {
  const a = new Date(d1); a.setHours(0, 0, 0, 0);
  const b = new Date(d2); b.setHours(0, 0, 0, 0);
  return Math.round((b - a) / 86400000);
}

export function calcCurrentWeekFromStart(startDate, today = new Date()) {
  if (!startDate) return 1;
  const days = daysBetween(startDate, today);
  if (days < 0) return 1;
  return Math.min(14, Math.floor(days / 7) + 1);
}

export function nextOccurrence(targetDayIndex, fromDate = new Date()) {
  const today = new Date(fromDate); today.setHours(0, 0, 0, 0);
  const todayDay = today.getDay();
  let diff = targetDayIndex - todayDay;
  if (diff < 0) diff += 7;
  const next = new Date(today);
  next.setDate(today.getDate() + diff);
  return next;
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ── Programme : blocs, charges, résistance rameur ───────────────────────────
export function getCurrentBlock(week) {
  return PROGRESSION.find((b) => b.weeks.includes(week));
}

export function getRowerResistance(week) {
  const block = getCurrentBlock(week);
  if (!block) return "3-4";
  if (block.phase === "Adaptation") return "3-4";
  if (block.phase === "Décharge") return "4";
  if (block.block <= 3) return "4-5";
  return "5-6";
}

// Plan de disques par côté pour une barre de 20 kg.
export function getDiscPlan(weight) {
  const perSide = (weight - 20) / 2;
  if (perSide < 0) return "Trop léger";
  if (perSide === 0) return "Barre à vide";
  const discs = [15, 10, 5, 2, 1.5, 0.5];
  let remaining = perSide;
  const used = [];
  for (const d of discs) {
    if (remaining >= d - 0.001) { used.push(d); remaining -= d; }
  }
  if (remaining > 0.01) return `≈ ${used.join("+")} kg/côté`;
  return used.join(" + ") + " kg/côté";
}

// Tous les exercices de force (A + C) — pour retrouver le type d'un exo loggé.
const FORCE_EXERCISES = [...SESSION_A.exercises, ...SESSION_C.exercises];
function findExerciseDef(name) {
  return FORCE_EXERCISES.find((e) => e.name === name) || null;
}

// Charge programme pour un type d'exercice à une semaine donnée.
// Pour les exercices à charge fixe (kettlebell) on renvoie la charge de l'exo.
function programChargeForType(week, type, exerciseDef = null) {
  if (type === "bodyweight") return null;
  if (type === "fixed") return exerciseDef ? exerciseDef.load : null;
  const block = getCurrentBlock(week);
  if (!block) return 20;
  return type === "heavy" ? block.heavy : block.standard;
}

// ── Analyse d'une séance loggée ─────────────────────────────────────────────
// Compatible ancien modèle (done/failed) ET nouveau (repsDone/difficulty).
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

// ── Adaptation de charge (Phase 1b enrichit ce socle) ───────────────────────
// Renvoie la charge prudente pour un type, en regardant les 3 dernières séances.
export function getChargeForExercise(week, type, history = null, exerciseDef = null) {
  const programCharge = programChargeForType(week, type, exerciseDef);
  if (type === "bodyweight") return null;
  if (!history) return programCharge;

  const recent = Object.values(history)
    .filter((e) => e?.completed && e?.data)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 3);

  let prudentCharge = programCharge;
  for (const entry of recent) {
    if (entry.chargeAdjustments && entry.chargeAdjustments[type] != null) {
      const adj = entry.chargeAdjustments[type];
      if (adj < prudentCharge) prudentCharge = adj;
      break;
    }
    if (entry.data) {
      let failedSetsForType = 0;
      for (const exData of entry.data) {
        const exDef = findExerciseDef(exData.exercise);
        if (!exDef || exDef.type !== type) continue;
        for (const s of exData.sets) if (setFailed(s, exDef)) failedSetsForType++;
      }
      if (failedSetsForType >= 2) {
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

// ── Suggestions / avertissements (renvoient un `level`, pas d'icône) ─────────
export function getAdaptiveSuggestion(history, sessionId, now = new Date()) {
  const list = Object.values(history)
    .filter((e) => e?.sessionId === sessionId && e?.completed && e?.data)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  if (list.length === 0) return null;
  const daysSince = daysBetween(new Date(list[0].date), now);
  if (daysSince > 14) return null;
  const a = analyzeSessionEntry(list[0]);
  if (a.allDone) return null;
  if (a.failedCount >= 2) return {
    level: "warning", title: "Dernière séance non complétée",
    message: `Tu as raté ${a.failedCount} séries la dernière fois. Refaire la séance au même poids cette semaine est prévu — pas un échec.`,
  };
  return {
    level: "info", title: "Une série ratée la dernière fois",
    message: "Tu peux retenter au même poids. Si ça repasse, on continuera la progression normalement.",
  };
}

export function getProlongedBreakDays(history) {
  const all = Object.values(history)
    .filter((e) => e?.completed)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  if (all.length === 0) return null;
  return daysBetween(new Date(all[0].date), new Date());
}

// Séances « à rattraper » : leur jour de cette semaine est déjà PASSÉ, la séance
// n'est pas faite, et ce jour tombe APRÈS le démarrage du programme (sinon elle
// n'a jamais eu lieu — ex. tu démarres samedi : mardi/jeudi d'avant ne comptent pas).
// Semaine lue lundi→dimanche. Renvoie les ids dans l'ordre du programme.
export function getCatchUp(history, sessionDays = {}, startDate = null, currentWeek = 1, today = new Date()) {
  const monIdx = (dow) => (dow + 6) % 7; // Lun=0 … Dim=6
  const d0 = new Date(today); d0.setHours(0, 0, 0, 0);
  const start = startDate ? new Date(startDate) : null;
  if (start) start.setHours(0, 0, 0, 0);
  const monday = new Date(d0); monday.setDate(d0.getDate() - monIdx(d0.getDay()));
  return SESSION_ORDER.filter((sid) => {
    const wd = sessionDays?.[sid] ?? SESSIONS[sid].dayIndex;
    const date = new Date(monday); date.setDate(monday.getDate() + monIdx(wd));
    if (date >= d0) return false;                 // aujourd'hui ou à venir → pas (encore) raté
    if (start && date < start) return false;      // avant le démarrage du programme
    const wk = start ? calcCurrentWeekFromStart(start, date) : currentWeek;
    return !history?.[`W${currentWeek}-${sid}`] && !history?.[`W${wk}-${sid}`]; // pas déjà faite
  });
}

export function getGapWarning(history) {
  const days = getProlongedBreakDays(history);
  if (days != null && days >= 10) return {
    level: "warning", title: `${days} jours sans séance`,
    message: "Pour une reprise en douceur, redescends d'un bloc en charge cette semaine. Tu reprendras la progression dès la semaine d'après.",
  };
  return null;
}

// ════════════════════════════════════════════════════════════════
// Phase 1b — Moteur d'adaptation par RETOURS (dans les deux sens).
// Le binaire done/failed ne suffit pas : on lit repsDone + difficulty
// pour proposer une cible (charge OU reps) ajustée à la prochaine séance.
// ════════════════════════════════════════════════════════════════

export const DIFFICULTY = { HEAVY: "trop_lourd", OK: "parfait", EASY: "trop_facile" };
export const DIFFICULTY_OPTIONS = [
  { v: "trop_lourd", l: "Trop lourd", hint: "down" },
  { v: "parfait", l: "Parfait", hint: "hold" },
  { v: "trop_facile", l: "Trop facile", hint: "up" },
];
const FIXED_REP_MIN = 8, FIXED_REP_MAX = 15, FIXED_REP_STEP = 1; // bornes de progression par reps

// Dernière séance loggée contenant cet exercice.
function lastEntryWithExercise(history, exerciseName) {
  return Object.values(history || {})
    .filter((e) => e?.completed && e?.data?.some((d) => d.exercise === exerciseName))
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0] || null;
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
  const charge = getChargeForExercise(week, exercise.type, history, exercise);
  let direction = "hold", note = null;
  if (fb?.anyHeavy) { direction = "down"; note = "Dernière fois trop lourd — charge prudente (bloc précédent)."; }
  else if (fb?.allEasy && shouldSuggestProgression(history, week, last?.sessionId)) {
    direction = "up"; note = "3 séances propres et jugées faciles — prêt pour le palier suivant.";
  } else if (fb?.allEasy) {
    note = "Jugé facile : continue à cette charge, le palier monte au prochain bloc.";
  }
  return { mode: "charge", value: charge, unit: "kg", direction, note };
}

// Tendance de FORCE — comparaison LIKE-FOR-LIKE : chaque exercice vs lui-même dans le temps.
// Les séances A/B/C ont des charges très différentes → une moyenne globale (choux+carottes)
// dirait n'importe quoi selon le mix de séances de la fenêtre. On compare donc exo par exo,
// et on EXCLUT les semaines de décharge (charges volontairement réduites = dip planifié).
// Renvoie { direction, pct, recent, older, exercises } ou null si trop peu de données.
export function strengthTrend(workouts, now = new Date()) {
  const byEx = {}; // nom d'exo → [{ t, charge }] (charge = max des séries de la séance)
  for (const e of Object.values(workouts || {})) {
    if (!e?.completed || !Array.isArray(e?.data)) continue;
    if (getCurrentBlock(e.week)?.phase === "Décharge") continue; // hors tendance
    const t = new Date(e.date);
    for (const ex of e.data) {
      let mx = 0;
      for (const s of ex.sets || []) if (s.weight != null && s.weight > 0) mx = Math.max(mx, s.weight);
      if (mx > 0) (byEx[ex.exercise] = byEx[ex.exercise] || []).push({ t, charge: mx });
    }
  }
  const avg = (a) => a.reduce((s, x) => s + x, 0) / a.length;
  const deltas = []; let rSum = 0, oSum = 0, k = 0;
  for (const name in byEx) {
    const arr = byEx[name];
    const recent = arr.filter((x) => daysBetween(x.t, now) <= 21).map((x) => x.charge);
    const older = arr.filter((x) => { const d = daysBetween(x.t, now); return d > 21 && d <= 56; }).map((x) => x.charge);
    if (!recent.length || !older.length) continue;
    const r = avg(recent), o = avg(older);
    if (o <= 0) continue;
    deltas.push((r - o) / o); rSum += r; oSum += o; k++;
  }
  if (deltas.length < 2) return null; // pas assez d'exercices comparables → pas de tendance
  const delta = avg(deltas);
  return {
    direction: delta > 0.02 ? "up" : delta < -0.02 ? "down" : "flat",
    pct: Math.round(delta * 100),
    recent: Math.round((rSum / k) * 10) / 10, older: Math.round((oSum / k) * 10) / 10, exercises: deltas.length,
  };
}

// Signal recomposition : croise tendance de force et rythme de perte (kg/sem, négatif=perte).
// observed = résultat de observedTrend(core) ou null. Renvoie { level, title, message } ou null.
export function recompSignal(workouts, observed, now = new Date()) {
  const st = strengthTrend(workouts, now);
  const rate = observed ? observed.ratePerWeek : null; // <0 = perte
  if (!st && rate == null) return null;
  // Priorité au garde-fou muscle : force qui chute = déficit trop agressif.
  if (st && st.direction === "down") return {
    level: "warning", title: "Ta force baisse",
    message: "Tes charges reculent : signe que le déficit est peut-être trop fort. Remonte un peu les kcal et soigne les protéines pour préserver le muscle.",
  };
  if (st && st.direction === "up" && rate != null && rate < -0.05) return {
    level: "good", title: "Recomposition réussie 💪",
    message: "Tu progresses en force ET tu perds du poids : tu fonds en gardant (voire gagnant) du muscle. Continue exactement comme ça.",
  };
  if (rate != null && rate > -0.05 && st && st.direction !== "down") return {
    level: "info", title: "Perte en pause",
    message: "Ton poids stagne mais ta force tient : c'est de la recomp. Si tu veux accélérer la perte de gras, creuse un peu le déficit côté nutrition.",
  };
  if (st && st.direction === "up") return {
    level: "good", title: "Tu gagnes en force",
    message: "Tes charges montent — bon signe pour redessiner le haut du corps. Garde les protéines hautes.",
  };
  return null;
}

// ════════════════════════════════════════════════════════════════
// Suivi & traçabilité — helpers purs alimentant l'UI refondue
// (« la dernière fois », volume, records, courbe de force, assiduité).
// ════════════════════════════════════════════════════════════════

// Dernière performance réelle sur un exercice : charge max travaillée + reps par
// série de la dernière séance qui le contenait. null si jamais fait.
export function getLastPerformance(history, exerciseName) {
  const entry = lastEntryWithExercise(history, exerciseName);
  if (!entry) return null;
  const ex = entry.data.find((d) => d.exercise === exerciseName);
  if (!ex || !ex.sets?.length) return null;
  const reps = ex.sets.map((s) => s.repsDone ?? s.repsTarget).filter((r) => r != null);
  const weights = ex.sets.map((s) => s.weight).filter((w) => w != null && w > 0);
  return { weight: weights.length ? Math.max(...weights) : null, reps, date: entry.date };
}

// Volume (tonnage) d'une séance de force = Σ poids × reps réellement faites.
export function sessionVolume(entry) {
  let v = 0;
  for (const ex of entry?.data || []) for (const s of ex.sets || []) {
    if (s.weight != null && s.weight > 0 && s.repsDone != null) v += s.weight * s.repsDone;
  }
  return Math.round(v);
}

// Record de volume : l'entrée bat-elle le meilleur volume des séances précédentes
// du même type (A/B/C) ? On exclut l'entrée elle-même (par id).
export function isVolumePR(entry, history) {
  const vol = sessionVolume(entry);
  if (vol <= 0) return false;
  const prev = Object.values(history || {})
    .filter((e) => e?.completed && Array.isArray(e?.data) && e?.sessionId === entry.sessionId && e?.id !== entry.id)
    .map(sessionVolume);
  const best = prev.length ? Math.max(...prev) : 0;
  return vol > best;
}

// Courbe de force par semaine — LIKE-FOR-LIKE : chaque exercice est normalisé par sa 1re
// charge (baseline), puis on moyenne les RATIOS de la semaine (1.00 = base, 1.20 = +20 %).
// Non confondu par le mix de séances (contrairement à une moyenne de kg bruts). Décharge exclue.
// Renvoie [{ week, value }] trié par semaine (pour une sparkline).
export function strengthSeries(workouts) {
  const entries = Object.values(workouts || {})
    .filter((e) => e?.completed && Array.isArray(e?.data) && e.week != null && getCurrentBlock(e.week)?.phase !== "Décharge")
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const byExWeek = {}; // nom → { semaine → charge max }
  const baseline = {}; // nom → 1re charge enregistrée
  for (const e of entries) {
    for (const ex of e.data) {
      let mx = 0;
      for (const s of ex.sets || []) if (s.weight != null && s.weight > 0) mx = Math.max(mx, s.weight);
      if (mx <= 0) continue;
      (byExWeek[ex.exercise] = byExWeek[ex.exercise] || {});
      byExWeek[ex.exercise][e.week] = Math.max(byExWeek[ex.exercise][e.week] || 0, mx);
      if (baseline[ex.exercise] == null) baseline[ex.exercise] = mx;
    }
  }
  const weeks = [...new Set(entries.map((e) => e.week))].sort((a, b) => a - b);
  const out = [];
  for (const w of weeks) {
    const ratios = [];
    for (const name in byExWeek) {
      const c = byExWeek[name][w];
      if (c != null && baseline[name] > 0) ratios.push(c / baseline[name]);
    }
    if (ratios.length) out.push({ week: w, value: Math.round((ratios.reduce((s, x) => s + x, 0) / ratios.length) * 100) / 100 });
  }
  return out;
}

// Assiduité : séances distinctes complétées par semaine, sur les `weeks` dernières
// semaines jusqu'à `currentWeek`. Renvoie [{ week, done }] (done ≤ 3).
export function assiduitySeries(workouts, currentWeek, weeks = 6) {
  const done = {};
  for (const e of Object.values(workouts || {})) {
    if (!e?.completed || e.week == null || e.free) continue; // le cardio libre ne compte pas dans l'assiduité A/B/C
    (done[e.week] = done[e.week] || new Set()).add(e.sessionId);
  }
  const start = Math.max(1, (currentWeek || 1) - weeks + 1);
  const out = [];
  for (let w = start; w <= (currentWeek || 1); w++) out.push({ week: w, done: done[w] ? done[w].size : 0 });
  return out;
}

// ════════════════════════════════════════════════════════════════
// Mode vacances — adaptation d'une séance au matériel disponible.
// Hybride : règles de substitution (hors-ligne, ici) + affinage IA (assistant).
// On garde sets/reps/repos ; on remplace le mouvement + la technique selon le
// matériel. Les exercices substitués ont un autre nom → ils ne polluent pas la
// progression du programme principal (clé = nom).
// ════════════════════════════════════════════════════════════════
// EQUIPMENT, DEFAULT_EQUIPMENT et ALTS → config/alternatives.js
// (importés en tête ; EQUIPMENT/DEFAULT_EQUIPMENT ré-exportés).

function exNeed(ex) {
  if (ex.type === "standard" || ex.type === "heavy") return "barre";
  if (ex.type === "fixed") return "kettlebells";
  return null; // poids du corps : toujours faisable
}

function adaptExercise(ex, eq) {
  const need = exNeed(ex);
  if (!need || eq[need]) return ex;
  const pick = (ALTS[ex.name] || []).find((a) => !a.need || eq[a.need]);
  if (!pick) return ex;
  return {
    ...ex,
    name: pick.name,
    type: pick.type || "bodyweight",
    load: pick.load, loadLabel: pick.loadLabel,
    perSide: pick.perSide ?? ex.perSide,
    reps: pick.reps ?? ex.reps,
    repsSeconds: pick.repsSeconds ?? ex.repsSeconds,
    tech: pick.tech || ex.tech,
    tips: pick.tips || ex.tips,
    adaptedFrom: ex.name,
  };
}

function adaptBlock(b, eq) {
  const m = (b.machine || "").toLowerCase();
  if (m.includes("rameur") && !eq.rameur) return { ...b, machine: "Poids du corps", tip: "Sans rameur : montées de genoux rapides ou burpees pendant l'effort.", adaptedFrom: b.machine };
  if (m.includes("corde") && !eq.corde) return { ...b, machine: "Poids du corps", tip: "Sans corde : jumping jacks ou montées de genoux pendant l'effort.", adaptedFrom: b.machine };
  return b;
}

// Adapte une séance au matériel dispo (règles). Renvoie une copie marquée `adapted`.
export function adaptSession(session, equipment) {
  const eq = { ...DEFAULT_EQUIPMENT, ...(equipment || {}) };
  if (session.type === "cardio") {
    return { ...session, blocks: session.blocks.map((b) => adaptBlock(b, eq)), adapted: true };
  }
  let finishCardio = session.finishCardio;
  if (finishCardio && !eq.corde) finishCardio = { ...finishCardio, name: `${finishCardio.name} (sans corde)`, tip: "Sans corde : jumping jacks ou montées de genoux.", adaptedFrom: "Corde" };
  return { ...session, exercises: session.exercises.map((ex) => adaptExercise(ex, eq)), finishCardio, adapted: true };
}

// Y a-t-il au moins une substitution à faire avec ce matériel ? (pour afficher un repère)
export function sessionNeedsAdapt(session, equipment) {
  const eq = { ...DEFAULT_EQUIPMENT, ...(equipment || {}) };
  if (session.type === "cardio") return session.blocks.some((b) => adaptBlock(b, eq) !== b);
  return session.exercises.some((ex) => adaptExercise(ex, eq) !== ex) || (session.finishCardio && !eq.corde);
}

// ── Cardio libre (rameur off-day) : entrées à part du programme A/B/C ─────────
// Flag `free: true`, sessionId "cardio-libre", pas de `data` (donc invisible pour
// force/PR/assiduité). Compte seulement pour la SÉRIE de semaines actives + l'histo.
export const FREE_CARDIO_ID = "cardio-libre";
export function makeFreeCardio({ week, minutes, distance = "", rowerLevel = "", rpe = "", notes = "" }) {
  return {
    id: `free-${Date.now()}`, date: new Date().toISOString(), completed: true, free: true,
    sessionId: FREE_CARDIO_ID, week, cardioData: { minutes, distance, rowerLevel, rpe, notes },
  };
}

// Série de semaines actives (≥1 activité, programme OU cardio libre). La semaine en
// cours ne casse pas la série si elle est encore vide (elle n'est pas finie).
export function activeWeekStreak(workouts, currentWeek) {
  const weeks = new Set();
  for (const e of Object.values(workouts || {})) if (e?.completed && e.week != null) weeks.add(e.week);
  let w = currentWeek || 1;
  if (!weeks.has(w)) w -= 1; // semaine en cours pas encore active → on compte jusqu'à la précédente
  let n = 0;
  for (; w >= 1; w--) { if (weeks.has(w)) n++; else break; }
  return n;
}

// ── Coach sportif (chat dédié) : prompt système + ouverture proactive ────────
// Réutilise l'infra assistant (ChatSheet + Edge Function). Le front compose le
// contexte sport (programme, semaine, force, matériel, historique) ; la function
// ajoute la clé API. Style calqué sur le coach nutrition mais orienté entraînement.
export function buildSportCoachSystem(sport = {}, workouts = {}, week = 1) {
  const block = getCurrentBlock(week) || {};
  const trend = strengthTrend(workouts);
  const done = Object.values(workouts || {}).filter((e) => e?.completed).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 4);
  const recent = done.map((e) => { const s = SESSIONS[e.sessionId]; return `S${e.week} ${s ? s.name : e.sessionId}${e.feel ? ` (ressenti ${e.feel}/5)` : ""}`; }).join(" · ") || "aucune récente";
  const trendTxt = trend ? (trend.direction === "up" ? "en hausse" : trend.direction === "down" ? "en baisse" : "stable") : "pas encore mesurée";
  const eq = { ...DEFAULT_EQUIPMENT, ...(sport.equipment || {}) };
  const kb = [eq.kb12 && "2×12", eq.kb16 && "1×16"].filter(Boolean).join(" + ") || "aucun";
  return [
    "Tu es le COACH SPORTIF de Bob dans l'app Croque·Macro. Réponds en FRANÇAIS, tutoiement, ton direct et concret, sans blabla ni flatterie. Réponses courtes (2-5 phrases), pratiques et actionnables.",
    "PROFIL : homme 42 ans, 1,86 m, ~91 kg. Objectif : perte de gras + renforcement du haut du corps. La nutrition (~1950 kcal / 175 g protéines) est gérée par un AUTRE coach — n'en parle pas sauf demande explicite, et renvoie-y le cas échéant.",
    `PROGRAMME : 14 semaines, full-body + cardio, 3 séances/sem. A = force full body (mardi), B = cardio intervalles (jeudi), C = force + cardio (samedi). Actuellement SEMAINE ${week}, phase « ${block.phase || "?"} ». Charges de référence : standard ${block.standard} kg, lourd ${block.heavy} kg (la charge progresse seule selon le programme et tes retours).`,
    `MATÉRIEL : barre + disques, kettlebells (${kb}), rameur, corde à sauter. Kettlebells 14 kg prévus plus tard.`,
    `FORCE récente : ${trendTxt}. Dernières séances : ${recent}.`,
    "TON RÔLE : plateaux, courbatures/récup, technique d'exercice, adaptation (peu de matériel / peu de temps / fatigue), motivation. Tu peux proposer d'alléger, raccourcir ou remplacer un exercice. Appuie-toi sur le programme et l'historique ci-dessus. Si un point est ambigu, pose UNE question de précision.",
  ].join("\n\n");
}

export function sportCoachOpening(sport = {}, workouts = {}, week = 1) {
  const trend = strengthTrend(workouts);
  const block = getCurrentBlock(week) || {};
  const tline = trend ? (trend.direction === "up" ? "Ta force monte 💪" : trend.direction === "down" ? "Ta force fatigue un peu ces temps-ci." : "Ta force est stable.") : "On manque encore de données pour ta courbe de force.";
  return {
    greeting: "Salut, c'est ton coach sport 👋",
    bubbles: [`Semaine ${week}, phase « ${block.phase || "?"} ». ${tline} Dis-moi ce qui coince ou ce que tu veux ajuster.`],
    chips: [
      "Je suis courbaturé, je fais quoi ?",
      "Adapte ma séance, j'ai peu de temps",
      "Un exercice me fait mal",
      "Comment casser mon plateau ?",
    ],
  };
}
