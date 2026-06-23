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
const MAX_TOKENS = { meal: 1600, day: 4096, week: 8192 };

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

  // 3) Corps : prompt construit côté front.
  let body;
  try { body = await req.json(); } catch { return json(400, { error: "JSON invalide." }); }
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
