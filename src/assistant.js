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

// payload = { system, prompt, mode }. Renvoie { meals: [...] }.
export async function askAssistant(payload, { signal } = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new AssistantError("Connecte-toi pour utiliser l'assistant.", { kind: "auth" });

  let res;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
      signal,
    });
  } catch (e) {
    // Function absente (dev local sans netlify) ou réseau coupé.
    throw new AssistantError("Assistant indisponible (hors-ligne ou non déployé).", { kind: "offline" });
  }

  if (res.status === 404) throw new AssistantError("Assistant non déployé sur cet environnement.", { status: 404, kind: "offline" });
  if (res.status === 503) throw new AssistantError("Assistant pas encore configuré (clé API à ajouter dans Netlify).", { status: 503, kind: "unconfigured" });
  if (res.status === 401) throw new AssistantError("Session expirée — reconnecte-toi.", { status: 401, kind: "auth" });

  let out;
  try { out = await res.json(); } catch { out = null; }
  if (!res.ok) throw new AssistantError((out?.error || `Erreur assistant (${res.status}).`) + (out?.detail ? ` — ${out.detail}` : ""), { status: res.status, kind: "server" });
  if (!out || !Array.isArray(out.meals)) throw new AssistantError("Réponse inattendue de l'assistant.", { kind: "server" });
  return out;
}
