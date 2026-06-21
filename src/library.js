// ════════════════════════════════════════════════════════════════
// library.js — chargement offline-first de la bibliothèque (presets + recettes).
//
// Stratégie :
//   1. getLibrarySync()  → renvoie immédiatement le cache localStorage s'il existe,
//                          sinon le snapshot bundlé. Jamais vide, jamais bloquant.
//   2. refreshLibrary()  → va chercher la version à jour sur Supabase (REST, lecture
//                          seule via clé anon), met le cache à jour, renvoie les données.
//
// Supabase est la SOURCE VIVANTE. Le snapshot n'est qu'un filet pour un premier
// lancement hors-ligne. On utilise fetch() natif (pas de dépendance supabase-js).
// ════════════════════════════════════════════════════════════════
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase.config.js";
import { SNAPSHOT_PRESETS, SNAPSHOT_RECIPES } from "./library.snapshot.js";

const CACHE_KEY = "croque-macro:library:v1";

// ── Mise en forme : lignes plates Supabase → shapes attendus par l'app ──────
// presets : lignes {cat,name,kcal,p,sort} → [{cat, items:[{name,kcal,p}]}]
function groupPresets(rows) {
  const order = [];
  const byCat = {};
  for (const r of rows) {
    if (!byCat[r.cat]) { byCat[r.cat] = []; order.push(r.cat); }
    byCat[r.cat].push({ name: r.name, kcal: r.kcal, p: r.p });
  }
  return order.map((cat) => ({ cat, items: byCat[cat] }));
}
// recipes : lignes {id,cat,name,emoji,kcal,p,quick,descr,ingredients,steps} → objets MEAL_IDEAS
function shapeRecipes(rows) {
  return rows.map((r) => ({
    id: r.id, cat: r.cat, name: r.name, emoji: r.emoji,
    kcal: r.kcal, p: r.p, quick: !!r.quick, desc: r.descr,
    ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
    steps: Array.isArray(r.steps) ? r.steps : [],
  }));
}

// ── Cache localStorage ──────────────────────────────────────────────────────
function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || !Array.isArray(obj.presets) || !Array.isArray(obj.recipes)) return null;
    return obj;
  } catch { return null; }
}
function writeCache(lib) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(lib)); } catch { /* quota / privé : tant pis */ }
}

// ── API publique ────────────────────────────────────────────────────────────
// Renvoie tout de suite quelque chose d'exploitable (cache, sinon snapshot).
export function getLibrarySync() {
  const cached = readCache();
  if (cached) return cached;
  return { presets: SNAPSHOT_PRESETS, recipes: SNAPSHOT_RECIPES };
}

// Va chercher la version à jour sur Supabase. Renvoie la lib (et met à jour le cache).
// En cas d'échec réseau, renvoie ce qu'on a déjà (cache/snapshot) sans planter.
export async function refreshLibrary() {
  const headers = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` };
  try {
    const [rRes, pRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/recipes?select=*&order=sort.asc`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/presets?select=*&order=sort.asc`, { headers }),
    ]);
    if (!rRes.ok || !pRes.ok) throw new Error(`HTTP ${rRes.status}/${pRes.status}`);
    const [recipesRows, presetsRows] = await Promise.all([rRes.json(), pRes.json()]);
    const lib = {
      presets: groupPresets(presetsRows),
      recipes: shapeRecipes(recipesRows),
    };
    // garde-fou : si la table est vide, on ne remplace pas par du vide
    if (lib.recipes.length === 0 && lib.presets.length === 0) return getLibrarySync();
    writeCache(lib);
    return lib;
  } catch (e) {
    console.warn("[library] refresh impossible, on garde le cache/snapshot :", e.message);
    return getLibrarySync();
  }
}
