import React, { useState } from "react";
import { ArrowLeft, Plus, Search, X } from "lucide-react";
import { C } from "../core.js";
import { PantryList } from "./PantryList.jsx";

const deburr = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// Piocher une PORTION d'un aliment du frigo. MÊME rendu que la page « Mon frigo »
// (PantryList : rayons, péremption, tri urgent) — le frigo a un seul visage dans l'app.
// Le nom loggé « Nom (150 g) » permet le décompte automatique du stock.
export function FrigoPick({ pantry = [], accent = C.weight, onPick }) {
  const usable = pantry.filter((x) => !x.out && (x.kcal100 || x.p100));
  const [sel, setSel] = useState(null);
  const [qty, setQty] = useState("");
  const [q, setQ] = useState("");

  if (sel) {
    const unit = sel.unit || "g";
    const qv = Math.max(0, parseFloat(String(qty).replace(",", ".")) || 0);
    const kcal = Math.round((sel.kcal100 || 0) * qv / 100);
    const p = Math.round((sel.p100 || 0) * qv / 100);
    const add = () => { if (qv > 0) onPick({ name: `${sel.name} (${qv} ${unit})`, kcal, p }); };
    const QUICK = [50, 100, 150, 200, 250];
    return (
      <div>
        <button onClick={() => setSel(null)} className="mb-3 flex items-center gap-1.5 text-sm font-semibold active:scale-95" style={{ color: C.sub }}><ArrowLeft size={16} /> Retour au frigo</button>
        <p className="text-base font-bold" style={{ color: C.ink }}>{sel.name}</p>
        <p className="mb-3 text-xs" style={{ color: C.muted }}>{sel.kcal100 || "?"} kcal · {sel.p100 || "?"} g prot. / 100 {unit}{sel.qty ? ` · ${sel.qty} ${unit} en stock` : ""}</p>
        <div className="mb-2 flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: C.sub }}>Quantité</span>
          <input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal" autoFocus className="w-24 rounded-xl px-3 py-2 text-center text-sm font-bold outline-none" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }} onKeyDown={(e) => e.key === "Enter" && add()} />
          <span className="text-sm" style={{ color: C.muted }}>{unit}</span>
        </div>
        {/* Portions courantes en 1 tap (moins de saisie au pouce) */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          {QUICK.map((v) => (
            <button key={v} onClick={() => setQty(String(v))} className="rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95" style={String(qv) === String(v) ? { backgroundColor: accent, color: "#fff" } : { backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }}>{v} {unit}</button>
          ))}
          {sel.qty > 0 && <button onClick={() => setQty(String(sel.qty))} className="rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95" style={{ backgroundColor: C.card, border: `1px dashed ${C.line}`, color: C.sub }}>tout ({sel.qty} {unit})</button>}
        </div>
        <div className="flex items-center justify-between rounded-2xl cm-card" style={{ backgroundColor: C.card }}>
          <p className="leading-tight" style={{ fontVariantNumeric: "tabular-nums" }}>
            <span className="text-2xl font-extrabold" style={{ color: C.ink }}>{kcal} <span className="text-sm font-medium" style={{ color: C.sub }}>kcal</span></span>
            <span className="block text-xs font-semibold" style={{ color: C.protein }}>{p} g prot.</span>
          </p>
          <button onClick={add} disabled={qv <= 0} className="flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-sm font-bold text-white active:scale-95" style={{ backgroundColor: qv > 0 ? accent : C.line }}><Plus size={16} /> Ajouter</button>
        </div>
      </div>
    );
  }

  if (usable.length === 0) {
    return <p className="py-6 text-center text-sm leading-relaxed" style={{ color: C.muted }}>Aucun aliment de frigo avec des macros.<br />Ajoute-les (avec kcal/100) dans « Mon frigo » pour pouvoir en piocher des portions.</p>;
  }
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 rounded-2xl px-3 py-2.5" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
        <Search size={15} style={{ color: C.muted }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher dans mon frigo…" className="w-full bg-transparent text-sm outline-none" style={{ color: C.ink }} />
        {q && <button onClick={() => setQ("")} className="shrink-0 active:scale-90" style={{ color: C.muted }} aria-label="Effacer"><X size={15} /></button>}
      </div>
      <PantryList items={usable} query={q} emptyText="Aucun aliment ne correspond."
        onTap={(it) => { setSel(it); setQty(it.qty ? String(Math.min(it.qty, 100)) : "100"); }}
        right={() => <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${accent}14`, color: accent }}><Plus size={16} /></span>} />
    </div>
  );
}
