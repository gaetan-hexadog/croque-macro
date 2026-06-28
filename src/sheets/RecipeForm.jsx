import React, { useState } from "react";
import { X, Plus, Soup } from "lucide-react";
import { C } from "../core.js";
import { Sheet } from "../components/Sheet.jsx";

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
export function AddRecipeSheet({ onClose, onAdd, defaultSlots, initial, prefill }) {
  const editing = !!initial;            // édition d'une recette existante
  const src = initial || prefill;       // valeurs de départ (édition OU import pré-rempli)
  const [name, setName] = useState(src?.name || "");
  const [slots, setSlots] = useState(src?.slots?.length ? src.slots : src?.cat ? [src.cat] : (defaultSlots && defaultSlots.length ? defaultSlots : ["dej"]));
  const [kcal, setKcal] = useState(src != null ? String(src.kcal ?? "") : "");
  const [p, setP] = useState(src != null ? String(src.p ?? "") : "");
  const [ingRows, setIngRows] = useState(src?.ingredients?.length ? src.ingredients.map(parseIng) : [{ qty: "", unit: "", name: "" }]);
  const [steps, setSteps] = useState(src?.steps?.length ? src.steps.join("\n") : "");
  const [quick, setQuick] = useState(!!src?.quick);
  const [varRows, setVarRows] = useState(src?.variants?.length ? src.variants.map((v) => ({ label: v.label || "", kcal: String(v.kcal ?? ""), protein: String(v.protein ?? "") })) : []);
  const toggleSlot = (k) => setSlots((s) => s.includes(k) ? s.filter((x) => x !== k) : [...s, k]);
  const setIng = (i, key, v) => setIngRows((rows) => rows.map((r, idx) => idx === i ? { ...r, [key]: v } : r));
  const addIng = () => setIngRows((rows) => [...rows, { qty: "", unit: "", name: "" }]);
  const delIng = (i) => setIngRows((rows) => rows.length > 1 ? rows.filter((_, idx) => idx !== i) : rows);
  const setVar = (i, key, v) => setVarRows((rows) => rows.map((r, idx) => idx === i ? { ...r, [key]: v } : r));
  const addVar = () => setVarRows((rows) => [...rows, { label: "", kcal: "", protein: "" }]);
  const delVar = (i) => setVarRows((rows) => rows.filter((_, idx) => idx !== i));
  const valid = name.trim() && !isNaN(parseInt(kcal, 10)) && slots.length > 0;
  // Garde anti perte de saisie : si l'utilisateur a touché au form et ferme par
  // erreur (X / geste retour), on confirme avant d'abandonner.
  const initSlots = src?.slots?.length ? src.slots : src?.cat ? [src.cat] : (defaultSlots && defaultSlots.length ? defaultSlots : ["dej"]);
  const initIng = src?.ingredients?.length ? src.ingredients.map(parseIng) : [{ qty: "", unit: "", name: "" }];
  const initVar = src?.variants?.length ? src.variants.map((v) => ({ label: v.label || "", kcal: String(v.kcal ?? ""), protein: String(v.protein ?? "") })) : [];
  const dirty =
    name.trim() !== (src?.name || "").trim() ||
    kcal !== (src != null ? String(src.kcal ?? "") : "") ||
    p !== (src != null ? String(src.p ?? "") : "") ||
    steps !== (src?.steps?.length ? src.steps.join("\n") : "") ||
    JSON.stringify(ingRows) !== JSON.stringify(initIng) ||
    JSON.stringify(varRows) !== JSON.stringify(initVar) ||
    JSON.stringify(slots) !== JSON.stringify(initSlots);
  const guardedClose = () => { if (dirty && !window.confirm("Abandonner cette recette ? Tes saisies seront perdues.")) return; onClose(); };
  const submit = () => {
    if (!valid) return;
    onAdd({
      name: name.trim(), slots, cat: slots[0], kcal: parseInt(kcal, 10), p: parseInt(p, 10) || 0,
      ingredients: ingRows.map((r) => [r.qty, r.unit, r.name].map((x) => String(x).trim()).filter(Boolean).join(" ")).filter(Boolean),
      steps: steps.split("\n").map((s) => s.trim()).filter(Boolean),
      quick,
      variants: varRows.map((r) => ({ label: r.label.trim(), kcal: parseInt(r.kcal, 10) || 0, protein: parseInt(r.protein, 10) || 0 })).filter((v) => v.label),
    });
  };
  const field = { backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink };
  const lab = "mb-1 block text-xs font-semibold uppercase tracking-wide";
  return (
    <Sheet open onClose={guardedClose} title={editing ? "Modifier la recette" : "Nouvelle recette"} icon={<Soup size={18} />} iconColor={C.green}>
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

      <label className={lab} style={{ color: C.sub }}>Variantes <span style={{ textTransform: "none", color: C.muted }}>(optionnel — ajustent les macros, ex. « +1 dose protéine »)</span></label>
      <div className="mb-1.5 space-y-2">
        {varRows.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <input value={r.label} onChange={(e) => setVar(i, "label", e.target.value)} placeholder="Ex. + fromage blanc" className="min-w-0 flex-1 rounded-xl px-3 py-2.5 text-sm outline-none" style={field} />
            <input value={r.kcal} onChange={(e) => setVar(i, "kcal", e.target.value)} inputMode="numeric" placeholder="±kcal" className="w-16 shrink-0 rounded-xl px-2 py-2.5 text-center text-sm outline-none" style={field} />
            <input value={r.protein} onChange={(e) => setVar(i, "protein", e.target.value)} inputMode="numeric" placeholder="±g" className="w-14 shrink-0 rounded-xl px-2 py-2.5 text-center text-sm outline-none" style={field} />
            <button onClick={() => delVar(i)} className="shrink-0 rounded-lg p-2 active:scale-90" style={{ color: C.muted }} aria-label="Retirer"><X size={15} /></button>
          </div>
        ))}
      </div>
      <button onClick={addVar} className="mb-4 flex items-center gap-1 text-xs font-semibold active:scale-95" style={{ color: C.protein }}><Plus size={13} /> Ajouter une variante</button>

      <button onClick={() => setQuick((v) => !v)} className="mb-4 flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95" style={quick ? { backgroundColor: C.ink, color: C.bg } : { backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }}>⚡ Rapide {quick ? "· oui" : ""}</button>

      <button onClick={submit} disabled={!valid} className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white active:scale-95" style={{ backgroundColor: valid ? C.protein : C.line }}><Plus size={16} /> {editing ? "Enregistrer les modifications" : "Enregistrer la recette"}</button>
    </Sheet>
  );
}
