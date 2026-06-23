import React, { useState } from "react";
import { X, ScanLine, Plus, Pencil, Check, ArrowLeft } from "lucide-react";
import { C } from "./core.js";
import { Sheet } from "./Sheet.jsx";
import OffSearch from "./OffSearch.jsx";

const num = (v) => { const n = parseFloat(String(v ?? "").replace(",", ".")); return isFinite(n) ? n : 0; };
const stripQty = (s) => String(s || "").replace(/\s*\([^)]*\)\s*$/, "").trim(); // retire « (330 ml) »

// Gestion du frigo/placard : aliments habituels avec interrupteur dispo (out=true
// → en rupture). Ajout au clavier OU par scan code-barres (qui pré-remplit les
// macros, éditables). Macros optionnelles réutilisées comme valeurs exactes par
// l'assistant.
export function PantrySheet({ pantry = [], onAdd, onToggle, onUpdate, onRemove, onClose }) {
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState("");
  const [p, setP] = useState("");
  const [scanning, setScanning] = useState(false);
  const [editId, setEditId] = useState(null);
  const [eKcal, setEKcal] = useState("");
  const [eP, setEP] = useState("");

  const add = () => { if (!name.trim()) return; onAdd(name.trim(), { kcal: num(kcal), p: num(p) }); setName(""); setKcal(""); setP(""); };
  const startEdit = (it) => { setEditId(it.id); setEKcal(it.kcal ?? ""); setEP(it.p ?? ""); };
  const saveEdit = () => { onUpdate && onUpdate(editId, { kcal: Math.round(num(eKcal)) || undefined, p: Math.round(num(eP) * 10) / 10 || undefined }); setEditId(null); };

  const fld = { backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink };

  if (scanning) {
    return (
      <Sheet open onClose={onClose} title="Scanner un produit" z={40}>
        <button onClick={() => setScanning(false)} className="mb-3 flex items-center gap-1.5 text-sm font-semibold active:scale-95" style={{ color: C.sub }}><ArrowLeft size={16} /> Retour au frigo</button>
        <p className="mb-3 text-xs" style={{ color: C.sub }}>Scanne ou cherche un produit — son nom et ses macros pré-rempliront ton frigo (tu pourras ajuster).</p>
        <OffSearch C={C} accent={C.weight} onChoose={(it) => { setName(stripQty(it.name)); setKcal(it.kcal ? String(it.kcal) : ""); setP(it.p ? String(it.p) : ""); setScanning(false); }} />
      </Sheet>
    );
  }

  return (
    <Sheet open onClose={onClose} title="Mon frigo / placard" z={40}>
      <p className="mb-3 text-xs leading-relaxed" style={{ color: C.sub }}>Liste les aliments que tu as d'habitude. Passe en <b style={{ color: C.over }}>rupture</b> ce qui te manque — l'assistant l'exclura des suggestions, recettes incluses.</p>

      {/* Ajout : nom + scan, puis macros optionnelles */}
      <div className="mb-4 space-y-2">
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} placeholder="Nom de l'aliment…" className="min-w-0 flex-1 rounded-xl px-3 py-2.5 text-sm outline-none" style={fld} />
          <button onClick={() => setScanning(true)} className="flex items-center gap-1.5 rounded-xl px-3 text-sm font-semibold active:scale-95" style={{ backgroundColor: `${C.weight}1f`, color: C.weight }}><ScanLine size={16} /> Scan</button>
        </div>
        <div className="flex gap-2">
          <input value={kcal} onChange={(e) => setKcal(e.target.value)} inputMode="numeric" placeholder="kcal (option.)" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={fld} />
          <input value={p} onChange={(e) => setP(e.target.value)} inputMode="numeric" placeholder="prot. g (option.)" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={fld} />
          <button onClick={add} className="shrink-0 rounded-xl px-4 text-sm font-bold text-white active:scale-95" style={{ backgroundColor: C.green }}>Ajouter</button>
        </div>
      </div>

      {pantry.length === 0 ? (
        <p className="py-8 text-center text-xs" style={{ color: C.muted }}>Aucun aliment pour l'instant.</p>
      ) : (
        <div className="space-y-1.5 pb-2">
          {pantry.map((it) => (
            <div key={it.id} className="rounded-xl px-3 py-2" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm" style={{ color: it.out ? C.muted : C.ink, textDecoration: it.out ? "line-through" : "none" }}>{it.name}</span>
                  {(it.kcal || it.p) && editId !== it.id && <span className="text-[11px]" style={{ color: C.muted }}>{it.kcal ? `${it.kcal} kcal` : ""}{it.kcal && it.p ? " · " : ""}{it.p ? `${it.p} g prot.` : ""}</span>}
                </span>
                <button onClick={() => onToggle(it.id)} className="rounded-full px-2.5 py-1 text-[11px] font-bold active:scale-95" style={it.out ? { backgroundColor: `${C.over}1f`, color: C.over } : { backgroundColor: `${C.green}1f`, color: C.green }}>{it.out ? "En rupture" : "Dispo"}</button>
                {onUpdate && <button onClick={() => (editId === it.id ? setEditId(null) : startEdit(it))} className="p-1" style={{ color: C.muted }} aria-label="Éditer macros"><Pencil size={14} /></button>}
                <button onClick={() => onRemove(it.id)} className="p-1" style={{ color: C.muted }} aria-label="Retirer"><X size={15} /></button>
              </div>
              {editId === it.id && (
                <div className="mt-2 flex items-center gap-2">
                  <input value={eKcal} onChange={(e) => setEKcal(e.target.value)} inputMode="numeric" placeholder="kcal" className="w-full rounded-lg px-2 py-1.5 text-xs outline-none" style={fld} />
                  <input value={eP} onChange={(e) => setEP(e.target.value)} inputMode="numeric" placeholder="prot. g" className="w-full rounded-lg px-2 py-1.5 text-xs outline-none" style={fld} />
                  <button onClick={saveEdit} className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold text-white active:scale-95" style={{ backgroundColor: C.green }}><Check size={14} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
}
