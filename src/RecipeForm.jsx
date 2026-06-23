import React, { useState } from "react";
import { X, Plus } from "lucide-react";
import { C } from "./core.js";
import { Sheet } from "./Sheet.jsx";

const CATS = [
  { k: "pdj", l: "Petit-déj" },
  { k: "dej", l: "Déjeuner" },
  { k: "diner", l: "Dîner" },
  { k: "snack", l: "Snack" },
];

// Reparse une ligne d'ingrédient texte ("200 g tofu ferme") en {qty, unit, name}.
const parseIng = (s) => {
  const t = String(s).trim();
  let m = t.match(/^([\d.,]+)\s+(\S+)\s+(.+)$/);
  if (m) return { qty: m[1], unit: m[2], name: m[3] };
  m = t.match(/^([\d.,]+)\s+(.+)$/);
  if (m) return { qty: m[1], unit: "", name: m[2] };
  return { qty: "", unit: "", name: t };
};

// Formulaire de recette (multi-créneaux + ingrédients structurés). Partagé par
// l'écran Idées, Ma cuisine et la pioche. defaultSlots pré-coche les créneaux ;
// `initial` passe en mode édition (pré-remplit tout).
export function AddRecipeSheet({ onClose, onAdd, defaultSlots, initial }) {
  const editing = !!initial;
  const [name, setName] = useState(initial?.name || "");
  const [slots, setSlots] = useState(initial?.slots?.length ? initial.slots : initial?.cat ? [initial.cat] : (defaultSlots && defaultSlots.length ? defaultSlots : ["dej"]));
  const [kcal, setKcal] = useState(initial != null ? String(initial.kcal ?? "") : "");
  const [p, setP] = useState(initial != null ? String(initial.p ?? "") : "");
  const [ingRows, setIngRows] = useState(initial?.ingredients?.length ? initial.ingredients.map(parseIng) : [{ qty: "", unit: "", name: "" }]);
  const [steps, setSteps] = useState(initial?.steps?.length ? initial.steps.join("\n") : "");
  const [quick, setQuick] = useState(!!initial?.quick);
  const toggleSlot = (k) => setSlots((s) => s.includes(k) ? s.filter((x) => x !== k) : [...s, k]);
  const setIng = (i, key, v) => setIngRows((rows) => rows.map((r, idx) => idx === i ? { ...r, [key]: v } : r));
  const addIng = () => setIngRows((rows) => [...rows, { qty: "", unit: "", name: "" }]);
  const delIng = (i) => setIngRows((rows) => rows.length > 1 ? rows.filter((_, idx) => idx !== i) : rows);
  const valid = name.trim() && !isNaN(parseInt(kcal, 10)) && slots.length > 0;
  const submit = () => {
    if (!valid) return;
    onAdd({
      name: name.trim(), slots, cat: slots[0], kcal: parseInt(kcal, 10), p: parseInt(p, 10) || 0,
      ingredients: ingRows.map((r) => [r.qty, r.unit, r.name].map((x) => String(x).trim()).filter(Boolean).join(" ")).filter(Boolean),
      steps: steps.split("\n").map((s) => s.trim()).filter(Boolean),
      quick,
    });
  };
  const field = { backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink };
  const lab = "mb-1 block text-xs font-semibold uppercase tracking-wide";
  return (
    <Sheet open onClose={onClose} title={editing ? "Modifier la recette" : "Nouvelle recette"}>
      <label className={lab} style={{ color: C.sub }}>Nom</label>
      <input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Ex. Bowl tofu cacahuète" className="mb-3 w-full rounded-xl px-3.5 py-3 text-sm outline-none" style={field} />

      <label className={lab} style={{ color: C.sub }}>Créneaux <span style={{ textTransform: "none", color: C.muted }}>(plusieurs possibles)</span></label>
      <div className="mb-3 flex gap-2">
        {CATS.map((c) => (
          <button key={c.k} onClick={() => toggleSlot(c.k)} className="flex-1 rounded-xl py-2 text-xs font-semibold active:scale-95" style={slots.includes(c.k) ? { backgroundColor: C.ink, color: C.bg } : { backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }}>{c.l}</button>
        ))}
      </div>

      <div className="mb-3 flex gap-2">
        <div className="flex-1">
          <label className={lab} style={{ color: C.sub }}>Calories</label>
          <input value={kcal} onChange={(e) => setKcal(e.target.value)} inputMode="numeric" placeholder="kcal" className="w-full rounded-xl px-3.5 py-3 text-sm outline-none" style={field} />
        </div>
        <div className="flex-1">
          <label className={lab} style={{ color: C.sub }}>Protéines</label>
          <input value={p} onChange={(e) => setP(e.target.value)} inputMode="numeric" placeholder="g" className="w-full rounded-xl px-3.5 py-3 text-sm outline-none" style={field} />
        </div>
      </div>

      <label className={lab} style={{ color: C.sub }}>Ingrédients</label>
      <datalist id="ing-units">
        <option value="g" /><option value="ml" /><option value="cl" /><option value="c.à.s" /><option value="c.à.c" /><option value="pièce" /><option value="dose" /><option value="tranche" /><option value="poignée" /><option value="gousse" />
      </datalist>
      <div className="mb-1.5 space-y-2">
        {ingRows.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <input value={r.qty} onChange={(e) => setIng(i, "qty", e.target.value)} inputMode="decimal" placeholder="200" className="w-14 shrink-0 rounded-xl px-2.5 py-2.5 text-center text-sm outline-none" style={field} />
            <input value={r.unit} onChange={(e) => setIng(i, "unit", e.target.value)} list="ing-units" placeholder="g" className="w-16 shrink-0 rounded-xl px-2.5 py-2.5 text-center text-sm outline-none" style={field} />
            <input value={r.name} onChange={(e) => setIng(i, "name", e.target.value)} placeholder="tofu ferme" className="min-w-0 flex-1 rounded-xl px-3 py-2.5 text-sm outline-none" style={field} />
            <button onClick={() => delIng(i)} disabled={ingRows.length <= 1} className="shrink-0 rounded-lg p-2 active:scale-90" style={{ color: ingRows.length > 1 ? C.muted : C.line }} aria-label="Retirer"><X size={15} /></button>
          </div>
        ))}
      </div>
      <button onClick={addIng} className="mb-3 flex items-center gap-1 text-xs font-semibold active:scale-95" style={{ color: C.protein }}><Plus size={13} /> Ajouter un ingrédient</button>

      <label className={lab} style={{ color: C.sub }}>Préparation <span style={{ textTransform: "none", color: C.muted }}>(optionnel, une étape par ligne)</span></label>
      <textarea value={steps} onChange={(e) => setSteps(e.target.value)} rows={3} placeholder={"Cuire le riz\nPoêler le tofu\nMélanger la sauce"} className="mb-3 w-full rounded-xl px-3.5 py-2.5 text-sm outline-none" style={field} />

      <button onClick={() => setQuick((v) => !v)} className="mb-4 flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95" style={quick ? { backgroundColor: C.ink, color: C.bg } : { backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }}>⚡ Rapide {quick ? "· oui" : ""}</button>

      <button onClick={submit} disabled={!valid} className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white active:scale-95" style={{ backgroundColor: valid ? C.protein : C.line }}><Plus size={16} /> {editing ? "Enregistrer les modifications" : "Enregistrer la recette"}</button>
    </Sheet>
  );
}
