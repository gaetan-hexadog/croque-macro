import React, { useState } from "react";
import { ArrowLeft, Plus, Refrigerator } from "lucide-react";
import { C } from "../core.js";

// Piocher une PORTION d'un aliment du frigo : on liste les aliments dispo qui ont
// une densité (kcal/100), on saisit une quantité (g/ml/…) → macros calculées → onPick.
export function FrigoPick({ pantry = [], accent = C.weight, onPick }) {
  const usable = pantry.filter((x) => !x.out && (x.kcal100 || x.p100));
  const [sel, setSel] = useState(null);
  const [qty, setQty] = useState("");

  if (sel) {
    const unit = sel.unit || "g";
    const q = Math.max(0, parseFloat(String(qty).replace(",", ".")) || 0);
    const kcal = Math.round((sel.kcal100 || 0) * q / 100);
    const p = Math.round((sel.p100 || 0) * q / 10) / 10;
    const add = () => { if (q > 0) onPick({ name: `${sel.name} (${q} ${unit})`, kcal, p }); };
    return (
      <div>
        <button onClick={() => setSel(null)} className="mb-3 flex items-center gap-1.5 text-sm font-semibold active:scale-95" style={{ color: C.sub }}><ArrowLeft size={16} /> Retour au frigo</button>
        <p className="text-base font-bold" style={{ color: C.ink }}>{sel.name}</p>
        <p className="mb-3 text-xs" style={{ color: C.muted }}>{sel.kcal100 || "?"} kcal · {sel.p100 || "?"} g prot. / 100 {unit}{sel.qty ? ` · ${sel.qty} ${unit} en stock` : ""}</p>
        <div className="mb-3 flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: C.sub }}>Quantité</span>
          <input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal" autoFocus className="w-24 rounded-xl px-3 py-2 text-center text-sm font-bold outline-none" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }} />
          <span className="text-sm" style={{ color: C.muted }}>{unit}</span>
        </div>
        <div className="flex items-center justify-between rounded-2xl cm-card" style={{ backgroundColor: C.card }}>
          <p className="leading-tight" style={{ fontVariantNumeric: "tabular-nums" }}>
            <span className="text-2xl font-extrabold" style={{ color: C.ink }}>{kcal} <span className="text-sm font-medium" style={{ color: C.sub }}>kcal</span></span>
            <span className="block text-xs font-semibold" style={{ color: C.protein }}>{p} g prot.</span>
          </p>
          <button onClick={add} disabled={q <= 0} className="flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-sm font-bold text-white active:scale-95" style={{ backgroundColor: q > 0 ? accent : C.line }}><Plus size={16} /> Ajouter</button>
        </div>
      </div>
    );
  }

  if (usable.length === 0) {
    return <p className="py-6 text-center text-sm leading-relaxed" style={{ color: C.muted }}>Aucun aliment de frigo avec des macros.<br />Ajoute-les (avec kcal/100) dans « Mon frigo » pour pouvoir en piocher des portions.</p>;
  }
  return (
    <div className="space-y-2">
      {usable.map((it) => (
        <button key={it.id} onClick={() => { setSel(it); setQty(it.qty ? String(Math.min(it.qty, 100)) : "100"); }} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${accent}1f`, color: accent }}><Refrigerator size={15} /></span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold" style={{ color: C.ink }}>{it.name}</span>
            <span className="block text-xs" style={{ color: C.muted }}>{it.kcal100 || "?"} kcal · {it.p100 || "?"} g / 100 {it.unit || "g"}{it.qty ? ` · ${it.qty} ${it.unit || "g"} dispo` : ""}</span>
          </span>
          <Plus size={16} style={{ color: C.muted }} />
        </button>
      ))}
    </div>
  );
}
