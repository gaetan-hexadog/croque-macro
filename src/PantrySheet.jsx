import React, { useState } from "react";
import { X, Check } from "lucide-react";
import { C } from "./core.js";
import { Sheet } from "./Sheet.jsx";

// Gestion du frigo/placard : liste d'aliments habituels, chacun avec un
// interrupteur dispo (out=true → pas dispo aujourd'hui). Partagé.
export function PantrySheet({ pantry = [], onAdd, onToggle, onRemove, onClose }) {
  const [name, setName] = useState("");
  const add = () => { if (name.trim()) { onAdd(name.trim()); setName(""); } };
  return (
    <Sheet open onClose={onClose} title="Mon frigo / placard" z={40}>
      <p className="mb-3 text-xs" style={{ color: C.sub }}>Liste tes aliments habituels. Décoche ce que tu n'as pas aujourd'hui — l'assistant en tiendra compte.</p>
      <div className="mb-3 flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} placeholder="Ajouter un aliment…" className="min-w-0 flex-1 rounded-xl px-3 py-2.5 text-sm outline-none" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }} />
        <button onClick={add} className="rounded-xl px-4 text-sm font-bold text-white active:scale-95" style={{ backgroundColor: C.green }}>Ajouter</button>
      </div>
      {pantry.length === 0 ? (
        <p className="py-8 text-center text-xs" style={{ color: C.muted }}>Aucun aliment pour l'instant.</p>
      ) : (
        <div className="space-y-1.5 pb-2">
          {pantry.map((it) => (
            <div key={it.id} className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, opacity: it.out ? 0.5 : 1 }}>
              <button onClick={() => onToggle(it.id)} className="flex h-5 w-5 items-center justify-center rounded-md" style={{ border: `1.5px solid ${it.out ? C.muted : C.green}`, backgroundColor: it.out ? "transparent" : C.green }}>
                {!it.out && <Check size={13} className="text-white" />}
              </button>
              <span className="flex-1 text-sm" style={{ color: C.ink, textDecoration: it.out ? "line-through" : "none" }}>{it.name}</span>
              <button onClick={() => onRemove(it.id)} className="p-1" style={{ color: C.muted }}><X size={15} /></button>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
}
