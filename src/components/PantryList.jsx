import React from "react";
import { C, itemCat, catMeta, CAT_ORDER, expiryMeta, daysUntil } from "../core.js";
import { ProteinFlag } from "./ProteinFlag.jsx";

const deburr = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// LE rendu unique du contenu du frigo — partagé entre la page « Mon frigo » (gestion)
// et le panneau « Frigo » de la pioche (piocher une portion). Même regroupement par
// rayon, mêmes badges de péremption, même tri (urgent d'abord) partout : le frigo a
// UN visage dans toute l'app. `right(it)` = l'action propre au contexte (chip stock
// côté gestion, + côté pioche) ; `sub(it)` = la ligne d'infos (défaut : stock + densité).
export function PantryList({ items = [], query = "", onTap, right, sub, emptyText = "Aucun aliment." }) {
  const nq = deburr(query);
  const filtered = items
    .filter((x) => x && (!nq || deburr(x.name).includes(nq)))
    .sort((a, b) => ((daysUntil(a.exp) ?? 9999) - (daysUntil(b.exp) ?? 9999)) || a.name.localeCompare(b.name));
  const groups = CAT_ORDER.map((k) => ({ k, meta: catMeta(k), items: filtered.filter((x) => itemCat(x) === k) })).filter((g) => g.items.length);
  const dens = (it) => {
    const q = it.qty ? `${it.qty} ${it.unit || "g"}` : "";
    const d = (it.kcal100 || it.p100) ? `${it.kcal100 || "?"}·${it.p100 ?? "?"} /100${it.unit || "g"}` : "";
    return [q, d].filter(Boolean).join(" · ");
  };
  if (!filtered.length) return <p className="py-8 text-center text-sm" style={{ color: C.muted }}>{emptyText}</p>;
  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g.k}>
          <p className="mb-1.5 flex items-center gap-1.5 px-1 text-[11px] font-bold uppercase tracking-widest" style={{ color: C.muted }}>
            <span>{g.meta.emoji}</span> {g.meta.label} <span style={{ color: C.line }}>·</span> <span style={{ color: g.meta.color }}>{g.items.length}</span>
          </p>
          <div className="space-y-1.5">
            {g.items.map((it) => {
              const b = expiryMeta(it.exp);
              return (
                <div key={it.id} onClick={() => onTap && onTap(it)} className="flex cursor-pointer items-center gap-2.5 rounded-2xl px-3 py-2.5" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base" style={{ backgroundColor: `${g.meta.color}18` }}>{g.meta.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold" style={{ color: C.ink }}>{it.name}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      {sub ? sub(it) : (
                        <>
                          {dens(it) && <span className="text-[11px] tabular-nums" style={{ color: C.muted }}>{dens(it)}</span>}
                          <ProteinFlag kcal={it.kcal100} p={it.p100} />
                        </>
                      )}
                    </span>
                  </span>
                  {b && b.txt && <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: `${b.col}1a`, color: b.col }}>{b.txt}</span>}
                  {right && right(it)}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default PantryList;
