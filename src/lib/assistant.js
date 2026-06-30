// ════════════════════════════════════════════════════════════════════════════
//  assistant.js — client de l'assistant repas (appelle la Supabase Edge Function).
//  Le front construit le prompt (core.buildAssistantPrompt), la function ajoute
//  la clé API. On envoie le token de session → la function vérifie qu'on est
//  bien connecté avant tout appel payant. (Migré de Netlify : timeout 10 s → 502/504.)
// ════════════════════════════════════════════════════════════════════════════
import { supabase } from "./supabaseClient.js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase.config.js";
import { buildAssistantPrompt } from "../core.js";

// Assistant hébergé en Supabase Edge Function (Netlify coupait à 10 s → 502/504).
const ENDPOINT = `${SUPABASE_URL}/functions/v1/assistant`;

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

// POST vers l'Edge Function, avec session + offline + TIMEOUT/abort (filet anti-blocage réseau).
// L'Edge enveloppe les appels longs dans un flux keepAlive (heartbeats) pour ne pas se faire
// couper à ~30 s par le gateway Supabase → on le draine ici de façon TRANSPARENTE (les appelants
// continuent d'utiliser res.status / res.json()). 120 s de garde-fou (le heartbeat tient la ligne).
async function postAssistant(body, { signal, timeoutMs = 120000, authMsg } = {}) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) throw new AssistantError("Hors-ligne — l'assistant a besoin d'une connexion.", { kind: "offline" });
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new AssistantError(authMsg || "Connecte-toi pour utiliser l'assistant.", { kind: "auth" });
  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort();
  if (signal) { if (signal.aborted) ctrl.abort(); else signal.addEventListener("abort", onAbort); }
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(ENDPOINT, { method: "POST", headers: { "content-type": "application/json", apikey: SUPABASE_ANON_KEY, authorization: `Bearer ${token}` }, body: JSON.stringify(body), signal: ctrl.signal });
    // Flux keepAlive (heartbeats + JSON final) → on le draine et on reconstruit une réponse
    // « classique » pour que les appelants restent inchangés. Le chat (event-stream) passe tel quel.
    if ((res.headers.get("content-type") || "").toLowerCase().includes("text/plain")) {
      const txt = await res.text();
      let parsed = null; try { parsed = JSON.parse(txt); } catch (_) {}
      if (parsed && typeof parsed === "object") {
        const status = parsed.__status || 200;
        return { ok: status >= 200 && status < 300, status, headers: res.headers, json: async () => parsed };
      }
    }
    return res;
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
  if (res.status === 503) throw new AssistantError("Assistant pas encore configuré (secret ANTHROPIC_API_KEY à ajouter dans Supabase).", { status: 503, kind: "unconfigured" });
  if (res.status === 401) throw new AssistantError("Session expirée — reconnecte-toi.", { status: 401, kind: "auth" });
  if (res.status === 502 || res.status === 504) throw new AssistantError("L'assistant a mis trop de temps — réessaie (le serveur a coupé la réponse).", { status: res.status, kind: "offline" });
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
  if (res.status === 503) throw new AssistantError("Assistant pas encore configuré (secret ANTHROPIC_API_KEY à ajouter dans Supabase).", { status: 503, kind: "unconfigured" });
  if (res.status === 401) throw new AssistantError("Session expirée — reconnecte-toi.", { status: 401, kind: "auth" });
  if (res.status === 502 || res.status === 504) throw new AssistantError("L'assistant a mis trop de temps — réessaie (le serveur a coupé la réponse).", { status: res.status, kind: "offline" });
  let out;
  try { out = await res.json(); } catch { out = null; }
  if (!res.ok) throw new AssistantError(out?.error || `Analyse impossible (${res.status}).`, { status: res.status, kind: "server" });
  if (!out || !out.text) throw new AssistantError("Réponse inattendue de l'assistant.", { kind: "server" });
  return out.text;
}

// Chat multi-tours avec contexte d'app. payload = { system, messages:[{role,content}] }.
// La function relaie le flux SSE d'Anthropic : on lit les deltas de texte au fil de l'eau
// (onToken(textPartiel)) et on reconstitue les tool_use (actions) à la fin.
// Renvoie { text, actions } — actions = propositions d'action à confirmer côté UI.
export async function chatAssistant({ system, messages }, { onToken, ...opts } = {}) {
  const res = await postAssistant({ chat: true, system, messages }, { ...opts, authMsg: "Connecte-toi pour discuter avec l'assistant." });
  if (res.status === 404) throw new AssistantError("Assistant non déployé sur cet environnement.", { status: 404, kind: "offline" });
  if (res.status === 503) throw new AssistantError("Assistant pas encore configuré (secret ANTHROPIC_API_KEY à ajouter dans Supabase).", { status: 503, kind: "unconfigured" });
  if (res.status === 401) throw new AssistantError("Session expirée — reconnecte-toi.", { status: 401, kind: "auth" });
  if (res.status === 502 || res.status === 504) throw new AssistantError("L'assistant a mis trop de temps — réessaie (le serveur a coupé la réponse).", { status: res.status, kind: "offline" });
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  // Pas de flux (erreur applicative renvoyée en JSON, ou environnement sans streaming) → repli.
  if (!ct.includes("event-stream") || !res.body || !res.body.getReader) {
    let out; try { out = await res.json(); } catch { out = null; }
    if (!res.ok) throw new AssistantError(out?.error || `Réponse impossible (${res.status}).`, { status: res.status, kind: "server" });
    return { text: out?.text || "", actions: Array.isArray(out?.actions) ? out.actions : [] };
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "", text = "", tool = null, toolJson = "";
  const actions = [];
  // Timeout d'INACTIVITÉ : le timeout global de postAssistant est levé dès les headers reçus ;
  // sans ça, un flux figé laisserait l'UI bloquée (busy) indéfiniment. 60 s : si Supabase
  // bufferise le SSE (pas de streaming temps réel), le 1er morceau peut arriver tard.
  const readNext = () => { let t; return Promise.race([
    reader.read(),
    new Promise((_, rej) => { t = setTimeout(() => rej(new AssistantError("L'assistant s'est interrompu — réessaie.", { kind: "offline" })), 60000); }),
  ]).finally(() => clearTimeout(t)); };
  try {
    for (;;) {
      const { done, value } = await readNext();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let nl;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        let ev; try { ev = JSON.parse(payload); } catch { continue; }
        if (ev.type === "content_block_start") {
          if (ev.content_block?.type === "tool_use") { tool = { type: ev.content_block.name, input: {} }; toolJson = ""; }
        } else if (ev.type === "content_block_delta") {
          if (ev.delta?.type === "text_delta") { text += ev.delta.text || ""; onToken && onToken(text); }
          else if (ev.delta?.type === "input_json_delta") { toolJson += ev.delta.partial_json || ""; }
        } else if (ev.type === "content_block_stop") {
          if (tool) { try { tool.input = toolJson ? JSON.parse(toolJson) : {}; } catch { tool.input = {}; } actions.push(tool); tool = null; toolJson = ""; }
        } else if (ev.type === "error") {
          throw new AssistantError(ev.error?.message || "Erreur de l'assistant.", { kind: "server" });
        }
      }
    }
  } catch (e) {
    try { reader.cancel(); } catch (_) {}
    if (e instanceof AssistantError) throw e;
    throw new AssistantError("Flux interrompu — réessaie.", { kind: "offline" });
  }
  if (!text && !actions.length) throw new AssistantError("Réponse vide de l'assistant.", { kind: "server" });
  return { text: text.trim(), actions };
}

// Importe une recette depuis une URL (la function fetch la page + extrait + macros).
export async function importRecipeFromUrl(url, opts = {}) {
  const res = await postAssistant({ url }, { ...opts, authMsg: "Connecte-toi pour importer." });
  if (res.status === 404) throw new AssistantError("Assistant non déployé sur cet environnement.", { status: 404, kind: "offline" });
  if (res.status === 503) throw new AssistantError("Assistant pas encore configuré (secret ANTHROPIC_API_KEY à ajouter dans Supabase).", { status: 503, kind: "unconfigured" });
  let out;
  try { out = await res.json(); } catch { out = null; }
  if (!res.ok) throw new AssistantError((out?.error || `Import impossible (${res.status}).`) + (out?.detail ? ` — ${out.detail}` : ""), { status: res.status, kind: "server" });
  if (!out || !out.recipe) throw new AssistantError("Aucune recette trouvée.", { kind: "server" });
  return out.recipe;
}

// Extrait une recette structurée depuis un TEXTE collé (ingrédients, quantités, macros, étapes).
export async function importRecipeFromText(text, opts = {}) {
  const res = await postAssistant({ recipeText: text }, { ...opts, authMsg: "Connecte-toi pour importer." });
  if (res.status === 404) throw new AssistantError("Assistant non déployé sur cet environnement.", { status: 404, kind: "offline" });
  if (res.status === 503) throw new AssistantError("Assistant pas encore configuré (secret ANTHROPIC_API_KEY à ajouter dans Supabase).", { status: 503, kind: "unconfigured" });
  let out;
  try { out = await res.json(); } catch { out = null; }
  if (!res.ok) throw new AssistantError((out?.error || `Extraction impossible (${res.status}).`) + (out?.detail ? ` — ${out.detail}` : ""), { status: res.status, kind: "server" });
  if (!out || !out.recipe) throw new AssistantError("Aucune recette trouvée dans ce texte.", { kind: "server" });
  return out.recipe;
}

// Conseil COURSES pour varier. payload = { system, prompt }. Renvoie { intro, items:[{name,category,why,unlocks}] }.
export async function shoppingAdvice({ system, prompt }, opts = {}) {
  const res = await postAssistant({ shopping: true, system, prompt }, { ...opts, authMsg: "Connecte-toi pour les idées courses." });
  if (res.status === 404) throw new AssistantError("Assistant non déployé sur cet environnement.", { status: 404, kind: "offline" });
  if (res.status === 503) throw new AssistantError("Assistant pas encore configuré (secret ANTHROPIC_API_KEY à ajouter dans Supabase).", { status: 503, kind: "unconfigured" });
  if (res.status === 401) throw new AssistantError("Session expirée — reconnecte-toi.", { status: 401, kind: "auth" });
  if (res.status === 502 || res.status === 504) throw new AssistantError("L'assistant a mis trop de temps — réessaie.", { status: res.status, kind: "offline" });
  let out;
  try { out = await res.json(); } catch { out = null; }
  if (!res.ok) throw new AssistantError(out?.error || `Idées courses impossibles (${res.status}).`, { status: res.status, kind: "server" });
  if (!out || !Array.isArray(out.items)) throw new AssistantError("Réponse inattendue de l'assistant.", { kind: "server" });
  return { intro: out.intro || "", items: out.items };
}

// Analyse une photo de repas (base64 sans préfixe data:) → repas estimé (meals[0]).
export async function analyzePhotoMeal(base64, mediaType = "image/jpeg", opts = {}) {
  const res = await postAssistant({ image: base64, media_type: mediaType }, { ...opts, authMsg: "Connecte-toi pour analyser une photo." });
  if (res.status === 404) throw new AssistantError("Assistant non déployé sur cet environnement.", { status: 404, kind: "offline" });
  if (res.status === 503) throw new AssistantError("Assistant pas encore configuré (secret ANTHROPIC_API_KEY à ajouter dans Supabase).", { status: 503, kind: "unconfigured" });
  let out;
  try { out = await res.json(); } catch { out = null; }
  if (!res.ok) throw new AssistantError(out?.error || `Analyse impossible (${res.status}).`, { status: res.status, kind: "server" });
  if (!out || !Array.isArray(out.meals) || !out.meals.length) throw new AssistantError("Aucun repas reconnu.", { kind: "server" });
  return out.meals[0];
}

// Estime kcal/protéines POUR 100 g/ml d'un aliment brut depuis son NOM (vrac sans
// code-barres : « riz basmati », « graines de courge »…). Réutilise le mode "parse"
// existant de l'Edge Function (aucun déploiement requis) : on lui décrit 100 unités de
// l'aliment cru/sec → meals[0].kcal/protein = les valeurs /100. Renvoie { kcal100, p100 }.
export async function estimateFoodMacros(name, unit = "g", opts = {}) {
  const n = String(name || "").trim();
  if (!n) throw new AssistantError("Donne un nom d'aliment.", { kind: "server" });
  const u = unit === "ml" ? "ml" : "g";
  const { system, prompt, mode } = buildAssistantPrompt({
    mode: "parse",
    text: `100 ${u} de « ${n} », aliment BRUT cru/sec tel qu'acheté en vrac (riz/pâtes/légumineuses = à sec, oléagineux/graines = nature). Donne des valeurs nutritionnelles STANDARD réalistes (type Ciqual/USDA), kcal et protéines POUR 100 ${u}, conservateur.`,
  });
  const { meals } = await askAssistant({ system, prompt, mode }, opts);
  const m = meals && meals[0];
  if (!m || m.kcal == null) throw new AssistantError("Estimation indisponible — saisis à la main.", { kind: "server" });
  return { kcal100: Math.round(m.kcal), p100: Math.round((m.protein ?? m.p ?? 0) * 10) / 10 };
}

// Affine une séance de sport selon le matériel/temps dispo (mode vacances).
// payload = { workout:{name,type,exercises:[{name,sets,reps,rest,loadLabel}]}, equipment:{...}, minutes? }
// Renvoie { exercises:[{name,sets,reps,rest,load,tech,tips}], note }.
export async function adaptWorkout({ workout, equipment, minutes }, opts = {}) {
  const res = await postAssistant({ workout, equipment, minutes }, { ...opts, authMsg: "Connecte-toi pour utiliser l'assistant." });
  if (res.status === 404) throw new AssistantError("Assistant non déployé sur cet environnement.", { status: 404, kind: "offline" });
  if (res.status === 503) throw new AssistantError("Assistant pas encore configuré (secret ANTHROPIC_API_KEY à ajouter dans Supabase).", { status: 503, kind: "unconfigured" });
  if (res.status === 401) throw new AssistantError("Session expirée — reconnecte-toi.", { status: 401, kind: "auth" });
  if (res.status === 502 || res.status === 504) throw new AssistantError("L'assistant a mis trop de temps — réessaie (le serveur a coupé la réponse).", { status: res.status, kind: "offline" });
  let out;
  try { out = await res.json(); } catch { out = null; }
  if (!res.ok) throw new AssistantError(out?.error || `Adaptation impossible (${res.status}).`, { status: res.status, kind: "server" });
  if (!out || !Array.isArray(out.exercises) || !out.exercises.length) throw new AssistantError("Réponse inattendue de l'assistant.", { kind: "server" });
  return out;
}
