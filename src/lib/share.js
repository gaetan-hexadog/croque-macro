// Partage / export texte d'une recette. Sur Android (Chrome), navigator.share ouvre
// la feuille de partage native (SMS, WhatsApp, Mail…). Repli copie presse-papier ailleurs.
import { r0 } from "../core.js";

// Un ingrédient → ligne lisible. Accepte une string déjà formatée ou un objet {qty,unit,name}.
export const ingLine = (i) => (typeof i === "string" ? i : `${i.qty ? `${i.qty} ` : ""}${i.unit ? `${i.unit} ` : ""}${i.name || ""}`.trim());

// Recette/repas → texte propre, prêt à coller dans Messages.
export function formatRecipeText(m) {
  if (!m) return "";
  const L = [];
  L.push(`${m.emoji ? `${m.emoji} ` : ""}${m.name}`.trim());
  L.push(`${r0(m.kcal)} kcal · ${r0(m.p)} g protéines`);
  if (m.desc) L.push(`\n${m.desc}`);
  if (Array.isArray(m.items) && m.items.length) {
    L.push("\nComposé de :");
    m.items.forEach((it) => L.push(`- ${it.name}${it.qty > 1 ? ` ×${it.qty}` : ""}`));
  }
  if (Array.isArray(m.ingredients) && m.ingredients.length) {
    L.push("\nIngrédients :");
    m.ingredients.forEach((it) => L.push(`- ${ingLine(it)}`));
  }
  if (Array.isArray(m.steps) && m.steps.length) {
    L.push("\nPréparation :");
    m.steps.forEach((s, i) => L.push(`${i + 1}. ${s}`));
  }
  return L.join("\n");
}

// Frigo/placard → texte propre : ce que j'ai + ce qu'il faut réapprovisionner.
export function formatPantryText(pantry = []) {
  const dispo = (pantry || []).filter((x) => x && !x.out && x.name);
  const out = (pantry || []).filter((x) => x && x.out && x.name);
  const line = (x) => `- ${x.name}${x.qty ? ` (${x.qty} ${x.unit || "g"})` : ""}`;
  const L = ["🧊 Mon frigo / placard"];
  if (dispo.length) { L.push("", "Dispo :"); dispo.forEach((x) => L.push(line(x))); }
  if (out.length) { L.push("", "À réapprovisionner :"); out.forEach((x) => L.push(`- ${x.name}`)); }
  if (!dispo.length && !out.length) L.push("", "(vide)");
  return L.join("\n");
}

// Tente le partage natif, sinon copie. Retourne le mode effectif pour le feedback UI.
// "shared" | "copied" | "abort" (l'utilisateur a fermé la feuille) | "fail".
export async function shareOrCopy(text, title) {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title, text });
      return "shared";
    } catch (e) {
      if (e && e.name === "AbortError") return "abort";
      // sinon on tombe sur le repli copie
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "fail";
  }
}
