// ════════════════════════════════════════════════════════════════
// library.js — chargement offline-first du catalogue unifié `foods`.
//
//   1. getLibrarySync()  → cache localStorage, sinon snapshot bundlé. Jamais vide.
//   2. refreshLibrary()  → fetch Supabase (table `foods`, lecture anon REST),
//                          met le cache à jour. En cas d'échec réseau : on garde
//                          le cache/snapshot sans planter.
//
// Une seule table `foods` (source vivante Supabase) → reshapée par `kind` en :
//   pool    (food | supplement)  → la pioche
//   presets (extra)              → groupés par cat pour ExtrasSheet
//   recipes (recipe)             → l'écran Idées
// ════════════════════════════════════════════════════════════════
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase.config.js";
import { SNAPSHOT_FOODS } from "./foods.snapshot.js";

const CACHE_KEY = "croque-macro:library:v2"; // v2 : shape étendu (pool inclus)

// Lignes `foods` plates → shapes attendus par l'app, partitionnés par kind.
function shapeFromFoods(foods) {
  const pool = [], recipes = [];
  const byCat = {}, catOrder = [];
  for (const r of foods || []) {
    if (r.kind === "extra") {
      if (!byCat[r.cat]) { byCat[r.cat] = []; catOrder.push(r.cat); }
      byCat[r.cat].push({ name: r.name, kcal: r.kcal, p: r.p });
    } else if (r.kind === "recipe") {
      recipes.push({ id: r.id, cat: r.cat, name: r.name, emoji: r.emoji, kcal: r.kcal, p: r.p, quick: !!r.quick, desc: r.desc, ingredients: Array.isArray(r.ingredients) ? r.ingredients : [], steps: Array.isArray(r.steps) ? r.steps : [] });
    } else {
      pool.push({ id: r.id, name: r.name, slots: r.slots || [], kcal: r.kcal, p: r.p, c: r.c, f: r.f, tags: r.tags || [], desc: r.desc, kind: r.kind, unit: r.unit, per: r.per, servings: r.servings || [] });
    }
  }
  return { pool, presets: catOrder.map((cat) => ({ cat, items: byCat[cat] })), recipes };
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || !Array.isArray(obj.pool) || !Array.isArray(obj.presets) || !Array.isArray(obj.recipes)) return null;
    return obj;
  } catch { return null; }
}
function writeCache(lib) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(lib)); } catch { /* quota / privé : tant pis */ }
}

// Renvoie tout de suite quelque chose d'exploitable (cache, sinon snapshot).
export function getLibrarySync() {
  return readCache() || shapeFromFoods(SNAPSHOT_FOODS);
}

// Va chercher la version à jour sur Supabase (table foods). Met à jour le cache.
export async function refreshLibrary() {
  const headers = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` };
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/foods?select=*&order=sort.asc`, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows = await res.json();
    const lib = shapeFromFoods(rows);
    if (lib.pool.length === 0 && lib.recipes.length === 0) return getLibrarySync(); // garde-fou table vide
    writeCache(lib);
    return lib;
  } catch (e) {
    console.warn("[library] refresh impossible, on garde le cache/snapshot :", e.message);
    return getLibrarySync();
  }
}
