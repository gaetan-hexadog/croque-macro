import React, { useState } from "react";
import { ChevronDown, Plus, Bookmark, Check, ChefHat } from "lucide-react";
import { C } from "./core.js";

const CATS = [
  { k: "pdj", l: "Petit-déj" },
  { k: "dej", l: "Déjeuner" },
  { k: "diner", l: "Dîner" },
  { k: "snack", l: "Snack" },
];

function IdeaCard({ idea, onUse, onSave }) {
  const [open, setOpen] = useState(false);
  const [used, setUsed] = useState(false);
  const [saved, setSaved] = useState(false);
  const flash = (set) => { set(true); setTimeout(() => set(false), 1500); };
  return (
    <div className="mb-2.5 overflow-hidden rounded-2xl" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:opacity-70">
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold" style={{ color: C.ink }}>{idea.name}</span>
          <span className="mt-0.5 block text-xs" style={{ color: C.muted, fontVariantNumeric: "tabular-nums" }}>{idea.kcal} kcal · {idea.p} g de protéines</span>
        </span>
        <ChevronDown size={18} style={{ color: C.muted, flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-0.5">
          {idea.desc && <p className="mb-3 text-sm" style={{ color: C.sub }}>{idea.desc}</p>}

          <p className="mb-1 text-xs font-semibold uppercase tracking-widest" style={{ color: C.muted }}>Ingrédients</p>
          <ul className="mb-3 space-y-1">
            {idea.ingredients.map((it, i) => (
              <li key={i} className="flex gap-2 text-sm" style={{ color: C.sub }}>
                <span style={{ color: C.protein }}>•</span><span>{it}</span>
              </li>
            ))}
          </ul>

          {idea.steps && idea.steps.length > 0 && (
            <>
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest" style={{ color: C.muted }}>Préparation</p>
              <ol className="mb-3 space-y-1.5">
                {idea.steps.map((st, i) => (
                  <li key={i} className="flex gap-2 text-sm" style={{ color: C.sub }}>
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ backgroundColor: `${C.protein}1f`, color: C.protein }}>{i + 1}</span>
                    <span>{st}</span>
                  </li>
                ))}
              </ol>
            </>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={() => { onUse(idea); flash(setUsed); }} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold text-white active:scale-95" style={{ backgroundColor: C.protein }}>
              {used ? <><Check size={15} /> Ajouté</> : <><Plus size={15} /> Ajouter aujourd'hui</>}
            </button>
            <button onClick={() => { onSave(idea); flash(setSaved); }} className="flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold active:scale-95" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.sub }}>
              {saved ? <><Check size={15} /> Enregistré</> : <><Bookmark size={15} /> Enregistrer</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function IdeasScreen({ ideas = [], onUse, onSave }) {
  return (
    <div className="px-1">
      <div className="mb-4 flex items-center gap-2">
        <ChefHat size={22} style={{ color: C.ink }} />
        <h1 className="text-2xl font-extrabold" style={{ color: C.ink, fontFamily: "'Space Grotesk', system-ui" }}>Idées</h1>
      </div>
      <p className="mb-5 text-sm" style={{ color: C.sub }}>Des plats et recettes par moment de la journée. « Ajouter aujourd'hui » l'ajoute à ton repas, « Enregistrer » le garde en repas réutilisable.</p>

      {CATS.map((cat) => {
        const list = ideas.filter((i) => i.cat === cat.k);
        if (!list.length) return null;
        return (
          <div key={cat.k} className="mb-5">
            <h2 className="mb-2 px-1 text-sm font-bold uppercase tracking-widest" style={{ color: C.sub }}>{cat.l}</h2>
            {list.map((idea) => <IdeaCard key={idea.id} idea={idea} onUse={onUse} onSave={onSave} />)}
          </div>
        );
      })}
    </div>
  );
}
