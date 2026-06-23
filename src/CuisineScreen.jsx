import React, { useState, useEffect } from "react";
import { Plus, Trash2, Check, ChevronDown, Search, X, Pencil } from "lucide-react";
import { C, cardStyle } from "./core.js";
import { AddRecipeSheet } from "./RecipeForm.jsx";

const deburr = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// Bibliothèque unifiée « Ma cuisine » — réorganisée en SECTIONS claires
// (Recettes / Repas / Aliments) avec recherche en tête. Hiérarchie typographique.
const SECTIONS = [
  { kind: "recette", title: "Recettes" },
  { kind: "combo", title: "Repas composés" },
  { kind: "aliment", title: "Aliments" },
];
const kindMeta = {
  aliment: { label: "Aliment", color: C.green },
  combo: { label: "Repas", color: C.protein },
  recette: { label: "Recette", color: C.weight },
};
const SLOT_CHOICES = [
  { k: "pdj", l: "Petit-déj" },
  { k: "dej", l: "Déj" },
  { k: "diner", l: "Dîner" },
  { k: "snack", l: "En-cas" },
];

export function CuisineScreen({ meals = [], onUse, onDelete, onAddRecipe, onEditRecipe, autoAdd, onAutoAddDone }) {
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const nq = deburr(q);

  // Signal externe (bouton « + » → Ajouter une recette) : ouvre le formulaire.
  useEffect(() => { if (autoAdd) { setAdding(true); onAutoAddDone && onAutoAddDone(); } }, [autoAdd]);

  const matches = (m) => !nq || deburr(m.name + " " + (m.ingredients || []).join(" ") + " " + (m.items || []).map((i) => i.name).join(" ")).includes(nq);
  const filtered = meals.filter(matches);

  return (
    <div className="px-1">
      <div className="relative mb-3">
        <Search size={16} style={{ color: C.muted, position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher une recette, un repas, un aliment…" className="w-full rounded-2xl py-3 pl-9 pr-9 text-sm outline-none" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }} />
        {q && <button onClick={() => setQ("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: C.muted }}><X size={16} /></button>}
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm" style={{ color: C.muted }}>
          {meals.length === 0
            ? "Ta cuisine est vide. Ajoute une recette ci-dessous, enregistre un aliment (via la pioche) ou un repas (depuis une journée)."
            : "Rien ne correspond à ta recherche."}
        </p>
      ) : (
        SECTIONS.map((s) => {
          const items = filtered.filter((m) => m.kind === s.kind);
          if (items.length === 0) return null;
          const meta = kindMeta[s.kind];
          return (
            <div key={s.kind} className="mb-5">
              <div className="mb-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />
                <span className="text-[15px] font-bold" style={{ color: C.ink }}>{s.title}</span>
                <span className="text-xs" style={{ color: C.muted }}>{items.length}</span>
                {s.kind === "recette" && onAddRecipe && (
                  <button onClick={() => setAdding(true)} className="ml-auto flex items-center gap-1 text-xs font-semibold active:scale-95" style={{ color: meta.color }}><Plus size={13} /> Ajouter</button>
                )}
              </div>
              <div className="space-y-2.5">
                {items.map((m) => <Card key={`${m.kind}-${m.id}`} m={m} onUse={onUse} onDelete={onDelete} onEdit={(m.kind === "recette" && m.custom && onEditRecipe) ? () => setEditing(m) : undefined} />)}
              </div>
            </div>
          );
        })
      )}

      <div style={{ height: "0.5rem" }} />

      {adding && <AddRecipeSheet onClose={() => setAdding(false)} onAdd={(r) => { onAddRecipe(r); setAdding(false); }} />}
      {editing && <AddRecipeSheet initial={editing} onClose={() => setEditing(null)} onAdd={(r) => { onEditRecipe(editing.id, r); setEditing(null); }} />}
    </div>
  );
}

function Card({ m, onUse, onDelete, onEdit }) {
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const [used, setUsed] = useState(false);
  const meta = kindMeta[m.kind] || kindMeta.aliment;
  const add = (slot) => { onUse(m, slot); setPicking(false); setUsed(true); setTimeout(() => setUsed(false), 1400); };
  const hasDetail = (m.items && m.items.length) || (m.ingredients && m.ingredients.length) || (m.steps && m.steps.length) || m.desc;
  return (
    <div className="overflow-hidden rounded-2xl" style={cardStyle()}>
      <button onClick={() => hasDetail && setOpen((o) => !o)} className="flex w-full items-center gap-3 px-4 py-3 text-left active:opacity-80">
        <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: meta.color }} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold" style={{ color: C.ink }}>{m.name}</span>
          <span className="mt-0.5 flex items-center gap-1.5 text-xs" style={{ color: C.muted, fontVariantNumeric: "tabular-nums" }}>
            <span className="rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ backgroundColor: `${meta.color}22`, color: meta.color }}>{meta.label}</span>
            {m.kcal} kcal · {m.p} g prot.
          </span>
        </span>
        {hasDetail && <ChevronDown size={16} style={{ color: C.muted, flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }} />}
      </button>
      {open && (
        <div className="px-4 pb-3 pt-0.5">
          {m.desc && <p className="mb-2 text-sm" style={{ color: C.sub }}>{m.desc}</p>}
          {m.items && m.items.length > 0 && (
            <ul className="mb-2 space-y-1">
              {m.items.map((it, i) => <li key={i} className="flex justify-between text-sm" style={{ color: C.sub }}><span>{it.name}{it.qty > 1 ? ` ×${it.qty}` : ""}</span><span style={{ color: C.muted }}>{it.kcal} kcal</span></li>)}
            </ul>
          )}
          {m.ingredients && m.ingredients.length > 0 && (
            <ul className="mb-2 space-y-1">
              {m.ingredients.map((it, i) => <li key={i} className="flex gap-2 text-sm" style={{ color: C.sub }}><span style={{ color: meta.color }}>•</span><span>{it}</span></li>)}
            </ul>
          )}
          {m.steps && m.steps.length > 0 && (
            <ol className="mb-2 space-y-1.5">
              {m.steps.map((st, i) => <li key={i} className="flex gap-2 text-sm" style={{ color: C.sub }}><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ backgroundColor: `${meta.color}1f`, color: meta.color }}>{i + 1}</span><span>{st}</span></li>)}
            </ol>
          )}
        </div>
      )}
      <div className="border-t px-4 py-2.5" style={{ borderColor: C.line }}>
        {picking ? (
          <div className="flex items-center gap-1.5">
            <span className="mr-1 text-xs font-semibold" style={{ color: C.muted }}>Ajouter à</span>
            {SLOT_CHOICES.map((s) => (
              <button key={s.k} onClick={() => add(s.k)} className="flex-1 rounded-lg py-1.5 text-xs font-semibold active:scale-95" style={{ backgroundColor: `${meta.color}1a`, color: meta.color }}>{s.l}</button>
            ))}
            <button onClick={() => setPicking(false)} className="rounded-lg px-2 py-1.5" style={{ color: C.muted }}><X size={14} /></button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setPicking(true)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold text-white active:scale-95" style={{ backgroundColor: meta.color }}>
              {used ? <><Check size={15} /> Ajouté</> : <><Plus size={15} /> Ajouter au repas</>}
            </button>
            {onEdit && <button onClick={onEdit} className="flex items-center justify-center rounded-xl px-3 py-2 active:scale-95" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.sub }} aria-label="Modifier"><Pencil size={15} /></button>}
            <button onClick={() => onDelete(m)} className="flex items-center justify-center rounded-xl px-3 py-2 active:scale-95" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.over }} aria-label="Supprimer"><Trash2 size={15} /></button>
          </div>
        )}
      </div>
    </div>
  );
}
