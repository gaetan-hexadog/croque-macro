// ════════════════════════════════════════════════════════════════════════════
//  Open Food Facts — accès API (recherche texte + produit par code-barres)
//  Aucune dépendance, aucune clé. CORS autorisé → utilisable côté navigateur.
//  NB : ne fonctionne que dans l'app déployée (réseau). Pas dans l'aperçu.
// ════════════════════════════════════════════════════════════════════════════

const BASE = "https://world.openfoodfacts.org";
const FIELDS = "code,product_name,product_name_fr,brands,nutriments,quantity,image_small_url";

const num = (v) => {
  const n = parseFloat(v);
  return isFinite(n) ? n : null;
};

// Valeurs nutritionnelles pour 100 g/ml à partir du bloc `nutriments`.
export function nutriPer100(nutriments = {}) {
  let kcal = num(nutriments["energy-kcal_100g"]);
  if (kcal == null) {
    const kj = num(nutriments["energy_100g"]);
    if (kj != null) kcal = kj / 4.184; // conversion kJ → kcal
  }
  return {
    kcal: kcal != null ? Math.round(kcal) : null,
    p: num(nutriments["proteins_100g"]),
    c: num(nutriments["carbohydrates_100g"]),
    f: num(nutriments["fat_100g"]),
  };
}

function toProduct(p) {
  if (!p) return null;
  const name = (p.product_name_fr || p.product_name || "").trim();
  if (!name) return null;
  return {
    code: p.code,
    name,
    brand: (p.brands || "").split(",")[0].trim(),
    quantity: p.quantity || "",
    image: p.image_small_url || "",
    per100: nutriPer100(p.nutriments),
  };
}

// Recherche texte. Renvoie une liste de produits (avec macros /100 g).
export async function searchProducts(query, { signal } = {}) {
  const url =
    `${BASE}/cgi/search.pl?search_terms=${encodeURIComponent(query)}` +
    `&search_simple=1&action=process&json=1&page_size=24&fields=${FIELDS}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`OFF ${res.status}`);
  const data = await res.json();
  return (data.products || [])
    .map(toProduct)
    .filter((p) => p && p.per100.kcal != null);
}

// Produit unique via code-barres (EAN/UPC). Renvoie le produit ou null.
export async function fetchProductByBarcode(code, { signal } = {}) {
  const url = `${BASE}/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`OFF ${res.status}`);
  const data = await res.json();
  if (!data || data.status !== 1) return null;
  return toProduct(data.product);
}
