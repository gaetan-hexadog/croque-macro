// ════════════════════════════════════════════════════════════════
// sync.js — moteur de synchronisation des données perso (offline-first).
//
//   day_logs    : une ligne par jour, data = { picks, skipBreakfast }  ← LE log de repas
//   weight_logs : une ligne par jour, kg
//   app_state   : un seul bloc { settings, theme, templates, customMeals,
//                 usage, combos, shakeBases, shakeLiquids, comboSeed, favs }
//
// Tout passe par RLS (auth.uid()) : on n'écrit/lit QUE les lignes du user connecté.
// Le local (localStorage) reste la copie de travail ; ces fonctions ne font que
// pousser/tirer. Aucune n'efface de données locales.
// ════════════════════════════════════════════════════════════════
import { supabase } from "./supabaseClient.js";

// ── Lecture : tout l'historique du user → structures de l'app ───────────────
export async function pullAll(userId) {
  const [d, w, s, wo] = await Promise.all([
    supabase.from("day_logs").select("iso,data").eq("user_id", userId),
    supabase.from("weight_logs").select("iso,kg").eq("user_id", userId),
    supabase.from("app_state").select("data").eq("user_id", userId).maybeSingle(),
    supabase.from("workout_logs").select("id,data").eq("user_id", userId),
  ]);
  if (d.error) throw d.error;
  if (w.error) throw w.error;
  if (s.error) throw s.error;
  if (wo.error) throw wo.error;
  const days = {};
  (d.data || []).forEach((r) => { days[r.iso] = r.data; });
  const weights = {};
  (w.data || []).forEach((r) => { weights[r.iso] = Number(r.kg); });
  const workouts = {};
  (wo.data || []).forEach((r) => { workouts[r.id] = r.data; });
  const appState = s.data ? s.data.data : null;
  return { days, weights, workouts, appState };
}

// ── Écritures (upsert) ──────────────────────────────────────────────────────
export async function pushDays(userId, daysObj) {
  const rows = Object.entries(daysObj).map(([iso, data]) => ({ user_id: userId, iso, data }));
  if (!rows.length) return;
  const { error } = await supabase.from("day_logs").upsert(rows, { onConflict: "user_id,iso" });
  if (error) throw error;
}
export async function pushWeights(userId, weightsObj) {
  const rows = Object.entries(weightsObj).map(([iso, kg]) => ({ user_id: userId, iso, kg }));
  if (!rows.length) return;
  const { error } = await supabase.from("weight_logs").upsert(rows, { onConflict: "user_id,iso" });
  if (error) throw error;
}
export async function pushAppState(userId, data) {
  const { error } = await supabase.from("app_state").upsert({ user_id: userId, data }, { onConflict: "user_id" });
  if (error) throw error;
}
export async function pushWorkouts(userId, workoutsObj) {
  const rows = Object.entries(workoutsObj).map(([id, data]) => ({ user_id: userId, id, data }));
  if (!rows.length) return;
  const { error } = await supabase.from("workout_logs").upsert(rows, { onConflict: "user_id,id" });
  if (error) throw error;
}
// Suppression d'une séance loggée (édition/correction côté UI).
export async function deleteWorkout(userId, id) {
  const { error } = await supabase.from("workout_logs").delete().eq("user_id", userId).eq("id", id);
  if (error) throw error;
}

// Fusionne local + remote app_state SANS rien perdre : les collections (recettes,
// repas, modèles, bases shake…) sont unionnées par id ; les scalaires (settings,
// comboSeed) prennent le plus récent/élevé. Évite qu'un appareil écrase les ajouts
// de l'autre (le bloc app_state était auparavant un simple last-write-wins).
export function mergeAppState(local = {}, remote) {
  if (!remote) return local;
  const byId = (a = [], b = []) => {
    const m = new Map();
    [...(a || []), ...(b || [])].forEach((x) => { const k = x && (x.id ?? x.name); if (k != null) m.set(k, x); });
    return [...m.values()];
  };
  // Consignes : clé = texte normalisé (la même consigne épinglée sur 2 appareils a 2 id → on dédoublonne par texte).
  const byText = (a = [], b = []) => {
    const m = new Map();
    [...(a || []), ...(b || [])].forEach((x) => { const k = x && String(x.text || "").trim().toLowerCase(); if (k) m.set(k, x); });
    return [...m.values()];
  };
  return {
    settings: remote.settings || local.settings,
    templates: byId(local.templates, remote.templates),
    customMeals: byId(local.customMeals, remote.customMeals),
    customRecipes: byId(local.customRecipes, remote.customRecipes),
    pantry: byId(local.pantry, remote.pantry),
    directives: byText(local.directives, remote.directives),
    combos: byId(local.combos, remote.combos),
    shakeBases: byId(local.shakeBases, remote.shakeBases),
    shakeLiquids: byId(local.shakeLiquids, remote.shakeLiquids),
    usage: { ...(local.usage || {}), ...(remote.usage || {}) },
    // Alias appris pantry → référentiel (moteur de repas) : union par clé, remote prioritaire.
    refAliases: { ...(local.refAliases || {}), ...(remote.refAliases || {}) },
    favs: Array.from(new Set([...(local.favs || []), ...(remote.favs || [])])),
    comboSeed: Math.max(local.comboSeed || 0, remote.comboSeed || 0),
    // Config sport : scalaires côté remote, sous-maps fusionnées par clé.
    sport: mergeSport(local.sport, remote.sport),
  };
}

// Fusionne la config sport (l'historique des séances vit dans workout_logs, PAS ici).
function mergeSport(local, remote) {
  if (!local && !remote) return undefined;
  const l = local || {}, r = remote || {};
  const map = (a = {}, b = {}) => ({ ...(a || {}), ...(b || {}) });
  // Charges par exercice : merge PAR CLÉ en gardant l'entrée au updatedAt le plus récent
  // (évite qu'un appareil en retard écrase une montée de charge récente).
  const byUpdatedAt = (a = {}, b = {}) => {
    const out = { ...(a || {}) };
    for (const k in (b || {})) if (!out[k] || (b[k]?.updatedAt || 0) >= (out[k]?.updatedAt || 0)) out[k] = b[k];
    return out;
  };
  return {
    ...l, ...r, // scalaires : remote prioritaire (activeProgramId, soundEnabled…)
    acknowledgedSuggestions: map(l.acknowledgedSuggestions, r.acknowledgedSuggestions),
    exerciseCharges: byUpdatedAt(l.exerciseCharges, r.exerciseCharges),
    programState: map(l.programState, r.programState), // position PAR programme : merge par id (pas de remplacement en bloc)
    vacationHistory: map(l.vacationHistory, r.vacationHistory),
    postponements: map(l.postponements, r.postponements),
    preferences: map(l.preferences, r.preferences),
  };
}
