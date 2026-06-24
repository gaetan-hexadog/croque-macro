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

// Projet Supabase (valeurs PUBLIQUES, déjà dans le bundle front — sert juste à
// vérifier que l'appelant est bien connecté).
const SUPABASE_URL = "https://zmilkvfzjwhzwstebigj.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptaWxrdmZ6andoendzdGViaWdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMDg2NDMsImV4cCI6MjA3Njc4NDY0M30.gW0DszeiFFt4i5m6ubGJ5d_FfayAtrT2xDw4zgzV4CQ";

const MODEL = process.env.ASSISTANT_MODEL || "claude-sonnet-4-6";
const MAX_TOKENS = { meal: 1600, day: 4096, week: 16000 };

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
              items: {
                type: "object",
                properties: {
                  qty: { type: "number" },
                  unit: { type: "string", description: "g, ml, dose, pièce, càs, càc…" },
                  name: { type: "string" },
                },
                required: ["name"],
              },
            },
            steps: { type: "array", items: { type: "string" }, description: "Étapes de préparation, courtes." },
            note: { type: "string", description: "Pourquoi ce repas colle au budget/contraintes. Optionnel." },
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

function extractRecipeText(html) {
  // Privilégie le JSON-LD schema.org/Recipe (présent sur la plupart des sites de cuisine).
  const blocks = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  for (const b of blocks) if (/"@type"\s*:\s*"?Recipe"?/i.test(b)) return b.replace(/\s+/g, " ").slice(0, 16000);
  // Sinon, texte nettoyé.
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim();
  return text.slice(0, 12000);
}

async function importRecipe(url, apiKey) {
  if (!/^https?:\/\//i.test(url)) return json(400, { error: "URL invalide (doit commencer par http)." });
  let html;
  try {
    const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (compatible; CroqueMacro/1.0)" }, redirect: "follow" });
    if (!r.ok) return json(502, { error: `Page inaccessible (${r.status}).` });
    html = await r.text();
  } catch (e) { return json(502, { error: "Impossible de charger la page.", detail: String(e).slice(0, 150) }); }
  const content = extractRecipeText(html);
  const sys = "Tu extrais une recette depuis le contenu d'une page web. Renseigne le nom, les ingrédients (quantité + unité + nom), les étapes, le nombre de portions, et ESTIME les macros (kcal et protéines) pour UNE portion, de façon réaliste et plutôt conservatrice (arrondis les kcal vers le haut). Choisis le slot le plus probable (pdj/dej/diner/snack). Si la page ne contient pas de recette identifiable, mets found=false. Réponds en français via l'outil import_recipe.";
  let data;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODEL, max_tokens: 1500, system: sys, messages: [{ role: "user", content: `Contenu de la page (${url}) :\n\n${content}` }], tools: [IMPORT_TOOL], tool_choice: { type: "tool", name: "import_recipe" } }),
    });
    if (!res.ok) { const t = await res.text().catch(() => ""); return json(res.status, { error: `Claude ${res.status}`, detail: t.slice(0, 300) }); }
    data = await res.json();
  } catch (e) { return json(502, { error: "Appel Claude impossible.", detail: String(e).slice(0, 150) }); }
  const tool = (data.content || []).find((c) => c.type === "tool_use" && c.name === "import_recipe");
  const recipe = tool?.input;
  if (!recipe || !recipe.found) return json(422, { error: "Aucune recette identifiable sur cette page." });
  return json(200, { recipe });
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
