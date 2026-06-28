// ════════════════════════════════════════════════════════════════════════════
//  Supabase Edge Function — Assistant repas (proxy sécurisé vers l'API Claude).
//
//  Pourquoi ICI et plus sur Netlify : les functions Netlify synchrones coupent à
//  10 s. Les appels Claude (15-30 s) dépassaient → 502/504. Les Edge Functions
//  Supabase ne plafonnent pas l'attente réseau (I/O), donc l'appel a le temps de finir.
//
//  Sécurité : la clé Anthropic est un SECRET (Deno.env, jamais dans le bundle front).
//  L'endpoint exige une session Supabase valide (verify_jwt par défaut + double-check ici).
//
//  Secrets requis : ANTHROPIC_API_KEY. Optionnel : ASSISTANT_MODEL.
//  Déploiement : supabase functions deploy assistant
// ════════════════════════════════════════════════════════════════════════════

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://zmilkvfzjwhzwstebigj.supabase.co";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptaWxrdmZ6andoendzdGViaWdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMDg2NDMsImV4cCI6MjA3Njc4NDY0M30.gW0DszeiFFt4i5m6ubGJ5d_FfayAtrT2xDw4zgzV4CQ";

const MODEL = Deno.env.get("ASSISTANT_MODEL") || "claude-sonnet-4-6";
const MAX_TOKENS: Record<string, number> = { meal: 1800, day: 2400, week: 4000 };
const ANTHROPIC = "https://api.anthropic.com/v1/messages";

const CORS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};
const json = (status: number, obj: unknown) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", ...CORS } });

const aHeaders = (apiKey: string) => ({ "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" });
// Prompt caching : le system (règles diététiques + format) est stable entre appels →
// on le marque cacheable (TTL ~5 min) pour couper latence + coût sur les appels répétés.
const sysCache = (s?: string) => (s ? [{ type: "text", text: s, cache_control: { type: "ephemeral" } }] : undefined);

// ── Outils (sortie structurée forcée) ────────────────────────────────────────
const PROPOSE_TOOL = {
  name: "propose",
  description: "Renvoie les repas proposés, prêts à logger.",
  input_schema: {
    type: "object",
    properties: {
      meals: {
        type: "array", description: "Repas proposés.",
        items: {
          type: "object",
          properties: {
            dayIndex: { type: "integer", description: "Jour 0..6 (planif semaine). 0 ou absent sinon." },
            slot: { type: "string", enum: ["pdj", "dej", "diner", "snack"], description: "Créneau du repas." },
            title: { type: "string", description: "Nom court du repas." },
            emoji: { type: "string", description: "Un emoji représentatif." },
            kcal: { type: "number", description: "Calories totales estimées." },
            protein: { type: "number", description: "Protéines totales en grammes." },
            ingredients: {
              type: "array",
              description: "CHAQUE ingrédient avec sa quantité chiffrée. Jamais d'ingrédient sans quantité.",
              items: { type: "object", properties: { qty: { type: "number", description: "Quantité chiffrée (obligatoire)." }, unit: { type: "string", description: "g, ml, dose/scoop (poudres), pièce, càs, càc, pincée… (obligatoire)." }, name: { type: "string" }, kcal: { type: "number", description: "kcal de CET ingrédient seul (sa contribution au total)." }, protein: { type: "number", description: "protéines (g) de CET ingrédient seul." } }, required: ["qty", "unit", "name"] },
            },
            steps: { type: "array", items: { type: "string" }, description: "Étapes de préparation, courtes." },
            note: { type: "string", description: "Pourquoi ce repas colle au budget/contraintes. Optionnel." },
            variants: {
              type: "array",
              description: "1 à 3 variantes possibles (remplacer/ajouter/retirer un ingrédient) avec leur impact macro.",
              items: { type: "object", properties: { label: { type: "string", description: "Court, ex. « tofu → tempeh », « + 30 g amandes », « sans fromage »." }, kcal: { type: "number", description: "Variation de kcal (peut être négative)." }, protein: { type: "number", description: "Variation de protéines en g (peut être négative)." } }, required: ["label", "kcal"] },
            },
          },
          required: ["slot", "title", "kcal", "protein", "ingredients", "steps"],
        },
      },
    },
    required: ["meals"],
  },
};

const ADAPT_TOOL = {
  name: "adapt_workout",
  description: "Renvoie la séance adaptée au matériel et au temps disponibles.",
  input_schema: {
    type: "object",
    properties: {
      exercises: {
        type: "array", description: "Exercices adaptés, dans l'ordre.",
        items: { type: "object", properties: { name: { type: "string", description: "Nom du mouvement adapté." }, sets: { type: "integer" }, reps: { type: "string", description: "Reps ou durée : « 10 », « 8/jambe », « 40s »." }, rest: { type: "integer", description: "Repos entre séries, en secondes." }, load: { type: "string", description: "Charge/lest. Optionnel." }, tech: { type: "string", description: "Comment l'exécuter, 1-2 phrases." }, tips: { type: "array", items: { type: "string" }, description: "1-3 conseils courts." } }, required: ["name", "sets", "reps", "rest", "tech"] },
      },
      note: { type: "string", description: "Résumé court de l'adaptation." },
    },
    required: ["exercises"],
  },
};

const IMPORT_TOOL = {
  name: "import_recipe",
  description: "Recette extraite d'une page web, avec macros estimées par portion.",
  input_schema: {
    type: "object",
    properties: {
      found: { type: "boolean", description: "true si une recette a bien été trouvée sur la page." },
      name: { type: "string" }, emoji: { type: "string" }, slot: { type: "string", enum: ["pdj", "dej", "diner", "snack"] },
      servings: { type: "number", description: "Nombre de portions de la recette." },
      kcal: { type: "number", description: "kcal pour UNE portion." },
      protein: { type: "number", description: "protéines (g) pour UNE portion." },
      ingredients: { type: "array", items: { type: "object", properties: { qty: { type: "number", description: "quantité POUR UNE portion (déjà divisée par le nombre de portions)" }, unit: { type: "string" }, name: { type: "string" } }, required: ["name"] } },
      steps: { type: "array", items: { type: "string" } },
    },
    required: ["found"],
  },
};

const CHAT_TOOLS = [
  { name: "save_recipe", description: "Proposer d'enregistrer une recette dans la cuisine de Bob (quand tu proposes une recette qu'il pourrait vouloir garder).", input_schema: { type: "object", properties: { name: { type: "string" }, emoji: { type: "string" }, cat: { type: "string", enum: ["pdj", "dej", "diner", "snack"] }, kcal: { type: "number" }, p: { type: "number", description: "protéines en g" }, ingredients: { type: "array", items: { type: "string" } }, steps: { type: "array", items: { type: "string" } }, desc: { type: "string" } }, required: ["name", "kcal", "p"] } },
  { name: "log_meal", description: "Proposer d'ajouter un repas/aliment au journal du JOUR de Bob, dans un créneau.", input_schema: { type: "object", properties: { slot: { type: "string", enum: ["pdj", "dej", "diner", "snack"] }, name: { type: "string" }, kcal: { type: "number" }, p: { type: "number" } }, required: ["slot", "name", "kcal", "p"] } },
  { name: "add_to_pantry", description: "Proposer d'ajouter un aliment au frigo/placard de Bob.", input_schema: { type: "object", properties: { name: { type: "string" }, unit: { type: "string", enum: ["g", "ml", "pièce"] }, qty: { type: "number" }, kcal100: { type: "number", description: "kcal pour 100 unités" }, p100: { type: "number", description: "protéines g pour 100 unités" } }, required: ["name"] } },
  { name: "update_recipe", description: "Proposer de METTRE À JOUR une recette EXISTANTE de Bob, identifiée par son nom EXACT tel que listé dans le contexte. Fournis les nouvelles valeurs complètes.", input_schema: { type: "object", properties: { target_name: { type: "string", description: "nom actuel exact de la recette à modifier" }, name: { type: "string" }, emoji: { type: "string" }, cat: { type: "string", enum: ["pdj", "dej", "diner", "snack"] }, kcal: { type: "number" }, p: { type: "number" }, ingredients: { type: "array", items: { type: "string" } }, steps: { type: "array", items: { type: "string" } }, desc: { type: "string" } }, required: ["target_name"] } },
];

// ── Anti-SSRF (résolution DNS via DNS-over-HTTPS, pas de Deno.resolveDns sur l'edge) ──
const isIPv4 = (s: string) => /^(\d{1,3}\.){3}\d{1,3}$/.test(s);
const isIP = (s: string) => isIPv4(s) || s.includes(":");
function isPrivateIp(ip: string): boolean {
  if (isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a >= 224) return true;
    return false;
  }
  const low = ip.toLowerCase();
  if (low === "::1" || low === "::") return true;
  if (/\d+\.\d+\.\d+\.\d+/.test(low)) return true;
  if (low.startsWith("fc") || low.startsWith("fd")) return true;
  const first = parseInt(low.split(":")[0] || "0", 16) || 0;
  if (first >= 0xfe80 && first <= 0xfebf) return true;
  if (first >= 0xfec0 && first <= 0xfeff) return true;
  if (first >= 0xff00) return true;
  if (low.startsWith("2001:db8") || low.startsWith("64:ff9b") || low.startsWith("100:")) return true;
  return false;
}
async function resolveAll(host: string): Promise<string[]> {
  const out: string[] = [];
  for (const type of ["A", "AAAA"]) {
    try {
      const r = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(host)}&type=${type}`, { signal: AbortSignal.timeout(4000) });
      if (r.ok) { const j = await r.json(); for (const a of (j.Answer || [])) if (a.data && (a.type === 1 || a.type === 28)) out.push(a.data); }
    } catch { /* ignore */ }
  }
  return out;
}
async function assertPublicHost(host: string) {
  if (isIP(host)) { if (isPrivateIp(host)) throw new Error("blocked"); return; }
  const recs = await resolveAll(host);
  if (!recs.length) throw new Error("blocked");
  for (const ip of recs) if (isPrivateIp(ip)) throw new Error("blocked");
}
async function fetchPageSafe(raw: string): Promise<string> {
  let url = raw;
  for (let hop = 0; hop < 4; hop++) {
    let u: URL;
    try { u = new URL(url); } catch { throw new Error("bad-url"); }
    if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("bad-url");
    if (u.username || u.password) throw new Error("bad-url");
    await assertPublicHost(u.hostname);
    const r = await fetch(u.toString(), { headers: { "user-agent": "Mozilla/5.0 (compatible; CroqueMacro/1.0)" }, redirect: "manual", signal: AbortSignal.timeout(8000) });
    if (r.status >= 300 && r.status < 400 && r.headers.get("location")) { url = new URL(r.headers.get("location")!, u).toString(); continue; }
    if (!r.ok) throw new Error("status");
    if (Number(r.headers.get("content-length") || 0) > 2_000_000) throw new Error("too-big");
    const reader = r.body!.getReader();
    const chunks: Uint8Array[] = []; let received = 0; const CAP = 2_000_000;
    while (true) { const { done, value } = await reader.read(); if (done) break; received += value.byteLength; if (received > CAP) { try { await reader.cancel(); } catch { /* */ } break; } chunks.push(value); }
    let total = 0; chunks.forEach((c) => (total += c.byteLength));
    const buf = new Uint8Array(total); let off = 0; chunks.forEach((c) => { buf.set(c, off); off += c.byteLength; });
    return new TextDecoder("utf-8").decode(buf);
  }
  throw new Error("redirects");
}
function extractRecipeText(html: string): string {
  const blocks = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  for (const b of blocks) if (/"@type"\s*:\s*"?Recipe"?/i.test(b)) return b.replace(/\s+/g, " ").slice(0, 16000);
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim();
  return text.slice(0, 12000);
}

// ── Handlers ─────────────────────────────────────────────────────────────────
async function adaptWorkoutAI(body: any, apiKey: string) {
  const w = body.workout, eq = body.equipment || {}, minutes = body.minutes;
  if (!w || !Array.isArray(w.exercises)) return json(400, { error: "Séance manquante." });
  const have = Object.entries(eq).filter(([, v]) => v).map(([k]) => k).join(", ") || "aucun matériel (poids du corps)";
  const sys = "Tu es coach de musculation. On te donne une séance prévue et le matériel réellement disponible (et parfois un temps limité). Adapte la séance pour qu'elle reste efficace et sûre AVEC CE MATÉRIEL et dans le temps imparti, en gardant l'esprit de la séance (groupes musculaires, intensité). Pour chaque exercice, donne un mouvement réalisable, ses sets/reps/repos et une technique courte en français. Réponds UNIQUEMENT via l'outil adapt_workout.";
  const prompt = `Séance prévue : ${JSON.stringify(w.exercises)}\nMatériel dispo : ${have}.${minutes ? ` Temps dispo : ${minutes} min.` : ""}`;
  let data: any;
  try {
    const res = await fetch(ANTHROPIC, { method: "POST", headers: aHeaders(apiKey), body: JSON.stringify({ model: MODEL, temperature: 0.2, max_tokens: 2000, system: sys, messages: [{ role: "user", content: prompt }], tools: [ADAPT_TOOL], tool_choice: { type: "tool", name: "adapt_workout" } }) });
    if (!res.ok) { const t = await res.text().catch(() => ""); return json(res.status, { error: `Claude ${res.status}`, detail: t.slice(0, 300) }); }
    data = await res.json();
  } catch (e) { return json(502, { error: "Appel Claude impossible.", detail: String(e).slice(0, 200) }); }
  const tool = (data.content || []).find((c: any) => c.type === "tool_use" && c.name === "adapt_workout");
  const exercises = tool?.input?.exercises;
  if (!Array.isArray(exercises)) return json(502, { error: "Réponse inattendue de Claude." });
  return json(200, { exercises, note: tool.input.note, model: MODEL });
}

async function importRecipe(url: string, apiKey: string) {
  let html: string;
  try { html = await fetchPageSafe(url); }
  catch (e: any) {
    if (e?.message === "bad-url" || e?.message === "blocked") return json(400, { error: "URL invalide ou non autorisée." });
    return json(502, { error: "Impossible de charger cette page (inaccessible ou trop volumineuse)." });
  }
  const content = extractRecipeText(html);
  const sys = "Tu extrais une recette depuis le contenu d'une page web. Détecte d'abord le NOMBRE DE PORTIONS de la recette d'origine (`servings`). Puis NORMALISE TOUT pour UNE SEULE portion (1 personne) : divise par ce nombre de portions À LA FOIS les QUANTITÉS de chaque ingrédient ET les kcal/protéines (ex. recette pour 4 → tout divisé par 4). Le résultat doit être COHÉRENT : ingrédients ET macros pour 1 personne. Renseigne le nom, les ingrédients NORMALISÉS (quantité + unité + nom), les étapes (texte inchangé), et estime les macros de façon réaliste et plutôt conservatrice (arrondis les kcal vers le haut). Choisis le slot le plus probable (pdj/dej/diner/snack). Si la page ne contient pas de recette identifiable, mets found=false. Réponds en français via l'outil import_recipe.";
  let data: any;
  try {
    const res = await fetch(ANTHROPIC, { method: "POST", headers: aHeaders(apiKey), body: JSON.stringify({ model: MODEL, temperature: 0.1, max_tokens: 1500, system: sys, messages: [{ role: "user", content: `Contenu de la page :\n\n${content}` }], tools: [IMPORT_TOOL], tool_choice: { type: "tool", name: "import_recipe" } }) });
    if (!res.ok) return json(502, { error: "Extraction impossible pour le moment." });
    data = await res.json();
  } catch { return json(502, { error: "Extraction impossible pour le moment." }); }
  const tool = (data.content || []).find((c: any) => c.type === "tool_use" && c.name === "import_recipe");
  const recipe = tool?.input;
  if (!recipe || !recipe.found) return json(422, { error: "Aucune recette identifiable sur cette page." });
  return json(200, { recipe });
}

async function analyzePhoto(dataB64: string, mediaType: string, apiKey: string) {
  if (typeof dataB64 !== "string" || dataB64.length > 7_000_000) return json(413, { error: "Image absente ou trop volumineuse." });
  const ok = ["image/jpeg", "image/png", "image/webp"].includes(mediaType);
  const sys = "Tu identifies un repas à partir d'une PHOTO et estimes ses macros de façon réaliste et plutôt conservatrice (arrondis les kcal vers le haut). Réponds en français via l'outil `propose` : UNE seule option = le repas photographié. Donne un titre court, liste les aliments visibles en `ingredients` (avec quantités estimées qty + unit), et les kcal + protéines TOTAUX du plat. Si la photo n'est pas de la nourriture, mets un titre vide et kcal 0.";
  let resp: Response;
  try {
    resp = await fetch(ANTHROPIC, { method: "POST", headers: aHeaders(apiKey), body: JSON.stringify({ model: MODEL, temperature: 0.1, max_tokens: 1200, system: sys, messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: ok ? mediaType : "image/jpeg", data: dataB64 } }, { type: "text", text: "Analyse ce repas et estime ses macros (kcal + protéines totales)." }] }], tools: [PROPOSE_TOOL], tool_choice: { type: "tool", name: "propose" } }) });
    if (!resp.ok) return json(502, { error: "Analyse impossible pour le moment." });
  } catch { return json(502, { error: "Analyse impossible pour le moment." }); }
  const data2 = await resp.json();
  const tool = (data2.content || []).find((c: any) => c.type === "tool_use" && c.name === "propose");
  const meals = tool?.input?.meals;
  if (!Array.isArray(meals) || !meals.length || !meals[0].title) return json(422, { error: "Aucun repas reconnu sur la photo." });
  return json(200, { meals });
}

async function explainText(body: any, apiKey: string) {
  const { system, prompt } = body;
  if (!prompt || typeof prompt !== "string") return json(400, { error: "Prompt manquant." });
  let data: any;
  try {
    const res = await fetch(ANTHROPIC, { method: "POST", headers: aHeaders(apiKey), body: JSON.stringify({ model: MODEL, temperature: 0.3, max_tokens: 700, system: sysCache(system), messages: [{ role: "user", content: prompt }] }) });
    if (!res.ok) { const t = await res.text().catch(() => ""); return json(res.status, { error: `Claude ${res.status}`, detail: t.slice(0, 300) }); }
    data = await res.json();
  } catch (e) { return json(502, { error: "Appel Claude impossible.", detail: String(e).slice(0, 200) }); }
  const text = (data.content || []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n").trim();
  if (!text) return json(502, { error: "Réponse vide de Claude." });
  return json(200, { text, model: MODEL });
}

async function chatText(body: any, apiKey: string) {
  const { system } = body;
  if (!Array.isArray(body.messages) || !body.messages.length) return json(400, { error: "Messages manquants." });
  const messages = body.messages.slice(-20).map((m: any) => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content || "").slice(0, 4000) })).filter((m: any) => m.content);
  if (!messages.length) return json(400, { error: "Messages vides." });
  let data: any;
  try {
    const res = await fetch(ANTHROPIC, { method: "POST", headers: aHeaders(apiKey), body: JSON.stringify({ model: MODEL, temperature: 0.4, max_tokens: 1200, system: sysCache(system), messages, tools: CHAT_TOOLS }) });
    if (!res.ok) { const t = await res.text().catch(() => ""); return json(res.status, { error: `Claude ${res.status}`, detail: t.slice(0, 300) }); }
    data = await res.json();
  } catch (e) { return json(502, { error: "Appel Claude impossible.", detail: String(e).slice(0, 200) }); }
  const blocks = data.content || [];
  const text = blocks.filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n").trim();
  const actions = blocks.filter((c: any) => c.type === "tool_use").map((c: any) => ({ type: c.name, input: c.input || {} }));
  if (!text && !actions.length) return json(502, { error: "Réponse vide de Claude." });
  return json(200, { text, actions, model: MODEL });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "Méthode non autorisée." });

  // 1) Auth : session Supabase valide (double sécurité même si verify_jwt est désactivé).
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return json(401, { error: "Connexion requise." });
  try {
    const u = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } });
    if (!u.ok) return json(401, { error: "Session invalide." });
  } catch { return json(502, { error: "Vérification de session impossible." }); }

  // 2) Clé API.
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json(503, { error: "Assistant non configuré (ANTHROPIC_API_KEY manquante)." });

  // 3) Corps.
  let body: any;
  try { body = await req.json(); } catch { return json(400, { error: "JSON invalide." }); }

  if (body && typeof body.url === "string" && body.url.trim()) return importRecipe(body.url.trim(), apiKey);
  if (body && typeof body.image === "string") return analyzePhoto(body.image, body.media_type, apiKey);
  if (body && body.workout) return adaptWorkoutAI(body, apiKey);
  if (body && body.explain) return explainText(body, apiKey);
  if (body && body.chat) return chatText(body, apiKey);

  const { system, prompt, mode = "meal" } = body || {};
  if (!prompt || typeof prompt !== "string") return json(400, { error: "Prompt manquant." });

  let data: any;
  try {
    const res = await fetch(ANTHROPIC, { method: "POST", headers: aHeaders(apiKey), body: JSON.stringify({ model: MODEL, temperature: 0.2, max_tokens: MAX_TOKENS[mode] || MAX_TOKENS.meal, system: sysCache(system), messages: [{ role: "user", content: prompt }], tools: [PROPOSE_TOOL], tool_choice: { type: "tool", name: "propose" } }) });
    if (!res.ok) { const t = await res.text().catch(() => ""); return json(res.status, { error: `Claude ${res.status}`, detail: t.slice(0, 400) }); }
    data = await res.json();
  } catch (e) { return json(502, { error: "Appel Claude impossible.", detail: String(e).slice(0, 200) }); }

  const tool = (data.content || []).find((c: any) => c.type === "tool_use" && c.name === "propose");
  const meals = tool?.input?.meals;
  if (!Array.isArray(meals)) return json(502, { error: "Réponse inattendue de Claude." });
  return json(200, { meals, model: MODEL });
});
