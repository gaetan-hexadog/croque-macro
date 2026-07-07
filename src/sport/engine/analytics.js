// engine/analytics.js — suggestions/avertissements, tendance de force, volume,
// records, courbe de force, assiduité, signal de recomposition.
import { SESSIONS, SESSION_ORDER } from "../config/programs/fullbody14.v1.js";
import { daysBetween, calcCurrentWeekFromStart } from "./dates.js";
import { getCurrentBlock } from "./blocks.js";
import { analyzeSessionEntry } from "./feedback.js";
import { lastEntryWithExercise } from "./resolve.js";

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

// Tendance de FORCE — comparaison LIKE-FOR-LIKE : chaque exercice vs lui-même dans le temps.
// On compare exo par exo, et on EXCLUT les semaines de décharge (charges volontairement réduites).
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

// Courbe de force par semaine — LIKE-FOR-LIKE : chaque exercice normalisé par sa 1re charge.
// Renvoie [{ week, value }] trié par semaine (pour une sparkline). Décharge exclue.
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
