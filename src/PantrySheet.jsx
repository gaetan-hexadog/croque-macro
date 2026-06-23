import React, { useState } from "react";
import { X } from "lucide-react";
import { C } from "./core.js";
import { Sheet } from "./Sheet.jsx";

// Gestion du frigo/placard : liste d'aliments habituels, chacun avec un
// interrupteur dispo (out=true → pas dispo aujourd'hui). Partagé.
export function PantrySheet({ pantry = [], onAdd, onToggle, onRemove, onClose }) {
  const [name, setName] = useState("");
  const add = () => { if (name.trim()) { onAdd(name.trim()); setName(""); } };
  return (
    <Sheet open onClose={onClose} title="Mon frigo / placard" z={40}>
      <p className="mb-3 text-xs leading-relaxed" style={{ color: C.sub }}>Liste les aliments que tu as d'habitude. Passe en <b style={{ color: C.over }}>rupture</b> ce qui te manque (temporairement) — l'assistant l'exclura des suggestions, recettes incluses.</p>
      <div className="mb-3 flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} placeholder="Ajouter un aliment…" className="min-w-0 flex-1 rounded-xl px-3 py-2.5 text-sm outline-none" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }} />
        <button onClick={add} className="rounded-xl px-4 text-sm font-bold text-white active:scale-95" style={{ backgroundColor: C.green }}>Ajouter</button>
      </div>
      {pantry.length === 0 ? (
        <p className="py-8 text-center text-xs" style={{ color: C.muted }}>Aucun aliment pour l'instant.</p>
      ) : (
        <div className="space-y-1.5 pb-2">
          {pantry.map((it) => (
            <div key={it.id} className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
              <span className="flex-1 text-sm" style={{ color: it.out ? C.muted : C.ink, textDecoration: it.out ? "line-through" : "none" }}>{it.name}</span>
              <button onClick={() => onToggle(it.id)} className="rounded-full px-2.5 py-1 text-[11px] font-bold active:scale-95" style={it.out ? { backgroundColor: `${C.over}1f`, color: C.over } : { backgroundColor: `${C.green}1f`, color: C.green }}>
                {it.out ? "En rupture" : "Dispo"}
              </button>
              <button onClick={() => onRemove(it.id)} className="p-1" style={{ color: C.muted }} aria-label="Retirer"><X size={15} /></button>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
}
