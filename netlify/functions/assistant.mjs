// ════════════════════════════════════════════════════════════════════════════
//  Netlify Function — Assistant repas (proxy sécurisé vers l'API Claude).
//
//  Pourquoi une function : la clé Anthropic est SECRÈTE. Elle vit uniquement
//  dans les variables d'environnement Netlify (ANTHROPIC_API_KEY), jamais dans
//  le bundle front ni sur GitHub. Le front construit le prompt (il a tout le
//  contexte) ; ici on ne fait qu'ajouter la clé et appeler Claude.
//
//  Sécurité : l'endpoint est public → on EXIGE une session Supabase valide
//  (sinon n'importe qui pourrait cramer le crédit API). On vérifie le token
//  auprès de Supabase avant tout appel payant.
//
//  Env requis : ANTHROPIC_API_KEY (secret). Optionnel : ASSISTANT_MODEL.
// ════════════════════════════════════════════════════════════════════════════
import net from "node:net";
import { lookup as dnsLookup } from "node:dns/promises";

// Projet Supabase (valeurs PUBLIQUES, déjà dans le bundle front — sert juste à
// vérifier que l'appelant est bien connecté).
const SUPABASE_URL = "https://zmilkvfzjwhzwstebigj.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptaWxrdmZ6andoendzdGViaWdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMDg2NDMsImV4cCI6MjA3Njc4NDY0M30.gW0DszeiFFt4i5m6ubGJ5d_FfayAtrT2xDw4zgzV4CQ";

const MODEL = process.env.ASSISTANT_MODEL || "claude-sonnet-4-6";
const MAX_TOKENS = { meal: 2600, day: 4096, week: 16000 };

// Schéma de sortie structurée : Claude DOIT appeler cet outil → JSON valide
// garanti (pas de parsing fragile de texte libre).
const PROPOSE_TOOL = {
  name: "propose",
  description: "Renvoie les repas proposés, prêts à logger.",
  input_schema: {
    type: "object",
    properties: {
      meals: {
        type: "array",
        description: "Repas proposés.",
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
              items: {
                type: "object",
                properties: {
                  qty: { type: "number", description: "Quantité chiffrée (obligatoire)." },
                  unit: { type: "string", description: "g, ml, dose/scoop (poudres), pièce, càs, càc, pincée… (obligatoire)." },
                  name: { type: "string" },
                },
                required: ["qty", "unit", "name"],
              },
            },
            steps: { type: "array", items: { type: "string" }, description: "Étapes de préparation, courtes." },
            note: { type: "string", description: "Pourquoi ce repas colle au budget/contraintes. Optionnel." },
            variants: {
              type: "array",
              description: "1 à 3 variantes possibles (remplacer/ajouter/retirer un ingrédient) avec leur impact macro.",
              items: {
                type: "object",
                properties: {
                  label: { type: "string", description: "Court, ex. « tofu → tempeh », « + 30 g amandes », « sans fromage »." },
                  kcal: { type: "number", description: "Variation de kcal (peut être négative)." },
                  protein: { type: "number", description: "Variation de protéines en g (peut être négative)." },
                },
                required: ["label", "kcal"],
              },
            },
          },
          required: ["slot", "title", "kcal", "protein", "ingredients", "steps"],
        },
      },
    },
    required: ["meals"],
  },
};

const json = (status, obj) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });

// ── Import d'une recette depuis une URL ──────────────────────────────────────
const IMPORT_TOOL = {
  name: "import_recipe",
  description: "Recette extraite d'une page web, avec macros estimées par portion.",
  input_schema: {
    type: "object",
    properties: {
      found: { type: "boolean", description: "true si une recette a bien été trouvée sur la page." },
      name: { type: "string" },
      emoji: { type: "string" },
      slot: { type: "string", enum: ["pdj", "dej", "diner", "snack"] },
      servings: { type: "number", description: "Nombre de portions de la recette." },
      kcal: { type: "number", description: "kcal pour UNE portion." },
      protein: { type: "number", description: "protéines (g) pour UNE portion." },
      ingredients: { type: "array", items: { type: "object", properties: { qty: { type: "number" }, unit: { type: "string" }, name: { type: "string" } }, required: ["name"] } },
      steps: { type: "array", items: { type: "string" } },
    },
    required: ["found"],
  },
};

// ── Anti-SSRF : on n'autorise que des URLs publiques (pas d'IP interne/metadata) ──
function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;        // link-local + metadata cloud
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a >= 224) return true;                        // multicast / réservé
    return false;
  }
  if (net.isIPv6(ip)) {
    const low = ip.toLowerCase();
    if (low === "::1" || low === "::") return true;
    if (/\d+\.\d+\.\d+\.\d+/.test(low)) return true;     // IPv4-mapped/-compatible (::ffff:x, ::x) → refus en bloc
    if (low.startsWith("fc") || low.startsWith("fd")) return true; // ULA fc00::/7
    const first = parseInt(low.split(":")[0] || "0", 16) || 0;
    if (first >= 0xfe80 && first <= 0xfebf) return true; // link-local fe80::/10
    if (first >= 0xfec0 && first <= 0xfeff) return true; // site-local (déprécié)
    if (first >= 0xff00) return true;                    // multicast ff00::/8
    if (low.startsWith("2001:db8") || low.startsWith("64:ff9b") || low.startsWith("100:")) return true; // doc / NAT64 / discard
    return false;
  }
  return true; // inconnu → on refuse
}
async function assertPublicHost(host) {
  if (net.isIP(host)) { if (isPrivateIp(host)) throw new Error("blocked"); return; }
  const recs = await dnsLookup(host, { all: true });
  if (!recs.length) throw new Error("blocked");
  for (const r of recs) if (isPrivateIp(r.address)) throw new Error("blocked");
}
// Fetch sûr : valide chaque URL/redirection, borne le temps et la taille.
async function fetchPageSafe(raw) {
  let url = raw;
  for (let hop = 0; hop < 4; hop++) {
    let u;
    try { u = new URL(url); } catch { throw new Error("bad-url"); }
    if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("bad-url");
    if (u.username || u.password) throw new Error("bad-url");
    await assertPublicHost(u.hostname);
    const r = await fetch(u.toString(), { headers: { "user-agent": "Mozilla/5.0 (compatible; CroqueMacro/1.0)" }, redirect: "manual", signal: AbortSignal.timeout(8000) });
    if (r.status >= 300 && r.status < 400 && r.headers.get("location")) { url = new URL(r.headers.get("location"), u).toString(); continue; }
    if (!r.ok) throw new Error("status");
    if (Number(r.headers.get("content-length") || 0) > 2_000_000) throw new Error("too-big");
    const reader = r.body.getReader();
    const chunks = []; let received = 0; const CAP = 2_000_000;
    while (true) { const { done, value } = await reader.read(); if (done) break; received += value.byteLength; if (received > CAP) { try { await reader.cancel(); } catch {} break; } chunks.push(value); }
    let total = 0; chunks.forEach((c) => (total += c.byteLength));
    const buf = new Uint8Array(total); let off = 0; chunks.forEach((c) => { buf.set(c, off); off += c.byteLength; });
    return new TextDecoder("utf-8").decode(buf);
  }
  throw new Error("redirects");
}

function extractRecipeText(html) {
  // Privilégie le JSON-LD schema.org/Recipe (présent sur la plupart des sites de cuisine).
  const blocks = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  for (const b of blocks) if (/"@type"\s*:\s*"?Recipe"?/i.test(b)) return b.replace(/\s+/g, " ").slice(0, 16000);
  // Sinon, texte nettoyé.
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim();
  return text.slice(0, 12000);
}

async function importRecipe(url, apiKey) {
  let html;
  try { html = await fetchPageSafe(url); }
  catch (e) {
    if (e?.message === "bad-url" || e?.message === "blocked") return json(400, { error: "URL invalide ou non autorisée." });
    return json(502, { error: "Impossible de charger cette page (inaccessible ou trop volumineuse)." });
  }
  const content = extractRecipeText(html);
  const sys = "Tu extrais une recette depuis le contenu d'une page web. Renseigne le nom, les ingrédients (quantité + unité + nom), les étapes, le nombre de portions, et ESTIME les macros (kcal et protéines) pour UNE portion, de façon réaliste et plutôt conservatrice (arrondis les kcal vers le haut). Choisis le slot le plus probable (pdj/dej/diner/snack). Si la page ne contient pas de recette identifiable, mets found=false. Réponds en français via l'outil import_recipe.";
  let data;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODEL, max_tokens: 1500, system: sys, messages: [{ role: "user", content: `Contenu de la page :\n\n${content}` }], tools: [IMPORT_TOOL], tool_choice: { type: "tool", name: "import_recipe" } }),
    });
    if (!res.ok) return json(502, { error: "Extraction impossible pour le moment." });
    data = await res.json();
  } catch { return json(502, { error: "Extraction impossible pour le moment." }); }
  const tool = (data.content || []).find((c) => c.type === "tool_use" && c.name === "import_recipe");
  const recipe = tool?.input;
  if (!recipe || !recipe.found) return json(422, { error: "Aucune recette identifiable sur cette page." });
  return json(200, { recipe });
}

// Analyse d'une photo de repas (Claude vision) → repas estimé via l'outil propose.
async function analyzePhoto(data, mediaType, apiKey) {
  if (typeof data !== "string" || data.length > 7_000_000) return json(413, { error: "Image absente ou trop volumineuse." });
  const ok = ["image/jpeg", "image/png", "image/webp"].includes(mediaType);
  const sys = "Tu identifies un repas à partir d'une PHOTO et estimes ses macros de façon réaliste et plutôt conservatrice (arrondis les kcal vers le haut). Réponds en français via l'outil `propose` : UNE seule option = le repas photographié. Donne un titre court, liste les aliments visibles en `ingredients` (avec quantités estimées qty + unit), et les kcal + protéines TOTAUX du plat. Si la photo n'est pas de la nourriture, mets un titre vide et kcal 0.";
  let resp;
  try {
    resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: MODEL, max_tokens: 1200, system: sys,
        messages: [{ role: "user", content: [
          { type: "image", source: { type: "base64", media_type: ok ? mediaType : "image/jpeg", data } },
          { type: "text", text: "Analyse ce repas et estime ses macros (kcal + protéines totales)." },
        ] }],
        tools: [PROPOSE_TOOL], tool_choice: { type: "tool", name: "propose" },
      }),
    });
    if (!resp.ok) return json(502, { error: "Analyse impossible pour le moment." });
  } catch { return json(502, { error: "Analyse impossible pour le moment." }); }
  const data2 = await resp.json();
  const tool = (data2.content || []).find((c) => c.type === "tool_use" && c.name === "propose");
  const meals = tool?.input?.meals;
  if (!Array.isArray(meals) || !meals.length || !meals[0].title) return json(422, { error: "Aucun repas reconnu sur la photo." });
  return json(200, { meals });
}

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "Méthode non autorisée." });

  // 1) Auth : la session Supabase de l'appelant doit être valide.
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return json(401, { error: "Connexion requise." });
  try {
    const u = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    });
    if (!u.ok) return json(401, { error: "Session invalide." });
  } catch {
    return json(502, { error: "Vérification de session impossible." });
  }

  // 2) Clé API présente ?
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json(503, { error: "Assistant non configuré (ANTHROPIC_API_KEY manquante)." });

  // 3) Corps.
  let body;
  try { body = await req.json(); } catch { return json(400, { error: "JSON invalide." }); }

  // 3bis) Import d'une recette depuis une URL.
  if (body && typeof body.url === "string" && body.url.trim()) return importRecipe(body.url.trim(), apiKey);
  if (body && typeof body.image === "string") return analyzePhoto(body.image, body.media_type, apiKey);

  const { system, prompt, mode = "meal" } = body || {};
  if (!prompt || typeof prompt !== "string") return json(400, { error: "Prompt manquant." });

  // 4) Appel Claude avec sortie structurée forcée.
  let data;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS[mode] || MAX_TOKENS.meal,
        system: system || undefined,
        messages: [{ role: "user", content: prompt }],
        tools: [PROPOSE_TOOL],
        tool_choice: { type: "tool", name: "propose" },
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return json(res.status, { error: `Claude ${res.status}`, detail: t.slice(0, 400) });
    }
    data = await res.json();
  } catch (e) {
    return json(502, { error: "Appel Claude impossible.", detail: String(e).slice(0, 200) });
  }

  const tool = (data.content || []).find((c) => c.type === "tool_use" && c.name === "propose");
  const meals = tool?.input?.meals;
  if (!Array.isArray(meals)) return json(502, { error: "Réponse inattendue de Claude." });
  return json(200, { meals, model: MODEL });
};
