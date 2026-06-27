// ════════════════════════════════════════════════════════════════════════════
//  assistant.js — client de l'assistant repas (appelle la Netlify Function).
//  Le front construit le prompt (core.buildAssistantPrompt), la function ajoute
//  la clé API. On envoie le token de session → la function vérifie qu'on est
//  bien connecté avant tout appel payant.
// ════════════════════════════════════════════════════════════════════════════
import { supabase } from "./supabaseClient.js";

const ENDPOINT = "/.netlify/functions/assistant";

// Erreur typée pour distinguer « assistant pas déployé/configuré » du reste,
// et afficher un message adapté dans l'UI (mode dev local, clé manquante…).
export class AssistantError extends Error {
  constructor(message, { status, kind } = {}) {
    super(message);
    this.name = "AssistantError";
    this.status = status;
    this.kind = kind; // "offline" | "unconfigured" | "auth" | "server"
  }
}

// POST vers la function, avec session + offline + TIMEOUT/abort (filet anti-blocage :
// la function Netlify peut timeouter silencieusement ~10-26 s). Renvoie la Response.
async function postAssistant(body, { signal, timeoutMs = 45000, authMsg } = {}) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) throw new AssistantError("Hors-ligne — l'assistant a besoin d'une connexion.", { kind: "offline" });
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new AssistantError(authMsg || "Connecte-toi pour utiliser l'assistant.", { kind: "auth" });
  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort();
  if (signal) { if (signal.aborted) ctrl.abort(); else signal.addEventListener("abort", onAbort); }
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(ENDPOINT, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify(body), signal: ctrl.signal });
  } catch (e) {
    if (ctrl.signal.aborted && !(signal && signal.aborted)) throw new AssistantError("L'assistant a mis trop de temps — réessaie (ou simplifie la demande).", { kind: "offline" });
    throw new AssistantError("Assistant indisponible (hors-ligne ou non déployé).", { kind: "offline" });
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", onAbort);
  }
}

// payload = { system, prompt, mode }. Renvoie { meals: [...] }.
export async function askAssistant(payload, opts = {}) {
  const res = await postAssistant(payload, { ...opts, authMsg: "Connecte-toi pour utiliser l'assistant." });
  if (res.status === 404) throw new AssistantError("Assistant non déployé sur cet environnement.", { status: 404, kind: "offline" });
  if (res.status === 503) throw new AssistantError("Assistant pas encore configuré (clé API à ajouter dans Netlify).", { status: 503, kind: "unconfigured" });
  if (res.status === 401) throw new AssistantError("Session expirée — reconnecte-toi.", { status: 401, kind: "auth" });
  let out;
  try { out = await res.json(); } catch { out = null; }
  if (!res.ok) throw new AssistantError((out?.error || `Erreur assistant (${res.status}).`) + (out?.detail ? ` — ${out.detail}` : ""), { status: res.status, kind: "server" });
  if (!out || !Array.isArray(out.meals)) throw new AssistantError("Réponse inattendue de l'assistant.", { kind: "server" });
  return out;
}

// Explique une variation de poids (texte libre) à partir des repas/pesées récents.
// payload = { system, prompt }. Renvoie une string (l'explication).
export async function explainWeight({ system, prompt }, opts = {}) {
  const res = await postAssistant({ explain: true, system, prompt }, { ...opts, authMsg: "Connecte-toi pour l'analyse." });
  if (res.status === 404) throw new AssistantError("Assistant non déployé sur cet environnement.", { status: 404, kind: "offline" });
  if (res.status === 503) throw new AssistantError("Assistant pas encore configuré (clé API à ajouter dans Netlify).", { status: 503, kind: "unconfigured" });
  if (res.status === 401) throw new AssistantError("Session expirée — reconnecte-toi.", { status: 401, kind: "auth" });
  let out;
  try { out = await res.json(); } catch { out = null; }
  if (!res.ok) throw new AssistantError(out?.error || `Analyse impossible (${res.status}).`, { status: res.status, kind: "server" });
  if (!out || !out.text) throw new AssistantError("Réponse inattendue de l'assistant.", { kind: "server" });
  return out.text;
}

// Chat multi-tours avec contexte d'app. payload = { system, messages:[{role,content}] }.
// Renvoie une string (la réponse de l'assistant).
export async function chatAssistant({ system, messages }, opts = {}) {
  const res = await postAssistant({ chat: true, system, messages }, { ...opts, authMsg: "Connecte-toi pour discuter avec l'assistant." });
  if (res.status === 404) throw new AssistantError("Assistant non déployé sur cet environnement.", { status: 404, kind: "offline" });
  if (res.status === 503) throw new AssistantError("Assistant pas encore configuré (clé API à ajouter dans Netlify).", { status: 503, kind: "unconfigured" });
  if (res.status === 401) throw new AssistantError("Session expirée — reconnecte-toi.", { status: 401, kind: "auth" });
  let out;
  try { out = await res.json(); } catch { out = null; }
  if (!res.ok) throw new AssistantError(out?.error || `Réponse impossible (${res.status}).`, { status: res.status, kind: "server" });
  if (!out || !out.text) throw new AssistantError("Réponse inattendue de l'assistant.", { kind: "server" });
  return out.text;
}

// Importe une recette depuis une URL (la function fetch la page + extrait + macros).
export async function importRecipeFromUrl(url, opts = {}) {
  const res = await postAssistant({ url }, { ...opts, authMsg: "Connecte-toi pour importer." });
  if (res.status === 404) throw new AssistantError("Assistant non déployé sur cet environnement.", { status: 404, kind: "offline" });
  if (res.status === 503) throw new AssistantError("Assistant pas encore configuré (clé API à ajouter dans Netlify).", { status: 503, kind: "unconfigured" });
  let out;
  try { out = await res.json(); } catch { out = null; }
  if (!res.ok) throw new AssistantError((out?.error || `Import impossible (${res.status}).`) + (out?.detail ? ` — ${out.detail}` : ""), { status: res.status, kind: "server" });
  if (!out || !out.recipe) throw new AssistantError("Aucune recette trouvée.", { kind: "server" });
  return out.recipe;
}

// Analyse une photo de repas (base64 sans préfixe data:) → repas estimé (meals[0]).
export async function analyzePhotoMeal(base64, mediaType = "image/jpeg", opts = {}) {
  const res = await postAssistant({ image: base64, media_type: mediaType }, { ...opts, authMsg: "Connecte-toi pour analyser une photo." });
  if (res.status === 404) throw new AssistantError("Assistant non déployé sur cet environnement.", { status: 404, kind: "offline" });
  if (res.status === 503) throw new AssistantError("Assistant pas encore configuré (clé API à ajouter dans Netlify).", { status: 503, kind: "unconfigured" });
  let out;
  try { out = await res.json(); } catch { out = null; }
  if (!res.ok) throw new AssistantError(out?.error || `Analyse impossible (${res.status}).`, { status: res.status, kind: "server" });
  if (!out || !Array.isArray(out.meals) || !out.meals.length) throw new AssistantError("Aucun repas reconnu.", { kind: "server" });
  return out.meals[0];
}

// Affine une séance de sport selon le matériel/temps dispo (mode vacances).
// payload = { workout:{name,type,exercises:[{name,sets,reps,rest,loadLabel}]}, equipment:{...}, minutes? }
// Renvoie { exercises:[{name,sets,reps,rest,load,tech,tips}], note }.
export async function adaptWorkout({ workout, equipment, minutes }, { signal } = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new AssistantError("Connecte-toi pour utiliser l'assistant.", { kind: "auth" });
  let res;
  try {
    res = await fetch(ENDPOINT, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ workout, equipment, minutes }), signal });
  } catch { throw new AssistantError("Assistant indisponible (hors-ligne ou non déployé).", { kind: "offline" }); }
  if (res.status === 404) throw new AssistantError("Assistant non déployé sur cet environnement.", { status: 404, kind: "offline" });
  if (res.status === 503) throw new AssistantError("Assistant pas encore configuré (clé API à ajouter dans Netlify).", { status: 503, kind: "unconfigured" });
  if (res.status === 401) throw new AssistantError("Session expirée — reconnecte-toi.", { status: 401, kind: "auth" });
  let out;
  try { out = await res.json(); } catch { out = null; }
  if (!res.ok) throw new AssistantError(out?.error || `Adaptation impossible (${res.status}).`, { status: res.status, kind: "server" });
  if (!out || !Array.isArray(out.exercises) || !out.exercises.length) throw new AssistantError("Réponse inattendue de l'assistant.", { kind: "server" });
  return out;
}
