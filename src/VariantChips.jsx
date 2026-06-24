import React from "react";
import { C } from "./core.js";

// Applique les variantes sélectionnées (deltas additifs) à un repas.
// Lit la protéine sous .protein (flux assistant) OU .p (recettes cuisine).
export function applyVariants(meal, sel) {
  let k = meal.kcal || 0;
  let p = (meal.protein ?? meal.p) || 0;
  (meal.variants || []).forEach((v, i) => { if (sel.has(i)) { k += v.kcal || 0; p += v.protein || 0; } });
  return { kcal: Math.round(k), p: Math.round(p) };
}

// Libellés des variantes cochées (pour annoter le nom du repas loggé).
export function variantLabels(meal, sel) {
  return (meal.variants || []).filter((_, i) => sel.has(i)).map((v) => v.label);
}

const sign = (n) => { const r = Math.round(n || 0); return r > 0 ? `+${r}` : `${r}`; };

// Puces de variantes (cocher/décocher → recalcul live chez le parent).
export function VariantChips({ variants = [], sel, onToggle }) {
  if (!variants.length) return null;
  return (
    <div className="mt-2 border-t pt-2" style={{ borderColor: C.line }}>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color: C.muted }}>Variantes</p>
      <div className="flex flex-wrap gap-1.5">
        {variants.map((v, i) => {
          const on = sel.has(i);
          return (
            <button key={i} onClick={(e) => { e.stopPropagation(); onToggle(i); }} className="rounded-full px-2.5 py-1 text-[11px] font-semibold active:scale-95" style={on ? { backgroundColor: C.green, color: "#0c2417" } : { backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }}>
              {v.label} <span style={{ opacity: 0.72 }}>{sign(v.kcal)} kcal{v.protein ? ` · ${sign(v.protein)}g` : ""}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
