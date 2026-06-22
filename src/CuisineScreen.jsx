import React, { useState } from "react";
import { ChefHat, Plus, Trash2, Check, ChevronDown, Search, X, Soup, Layers, Apple } from "lucide-react";
import { C, cardStyle } from "./core.js";
import { AddRecipeSheet } from "./IdeasScreen.jsx";

const deburr = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// Bibliothèque unifiée « Ma cuisine » : aliments, repas (combos) et recettes au
// même endroit. Vue dérivée des 3 listes existantes (aucune donnée reshpée).
const KINDS = [
  { k: "all", l: "Tout" },
  { k: "aliment", l: "Aliments", icon: Apple },
  { k: "combo", l: "Repas", icon: Layers },
  { k: "recette", l: "Recettes", icon: Soup },
];
const kindMeta = {
  aliment: { label: "Aliment", color: C.green },
  combo: { label: "Repas", color: C.protein },
  recette: { label: "Recette", color: C.weight },
};

export function CuisineScreen({ meals = [], onUse, onDelete, onAddRecipe }) {
  const [kind, setKind] = useState("all");
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const nq = deburr(q);
  const list = meals.filter((m) =>
    (kind === "all" || m.kind === kind) &&
    (!nq || deburr(m.name + " " + (m.ingredients || []).join(" ") + " " + (m.items || []).map((i) => i.name).join(" ")).includes(nq))
  );
  const chip = (active) => ({ backgroundColor: active ? C.ink : C.card, color: active ? C.bg : C.sub, border: `1px solid ${active ? C.ink : C.line}` });

  return (
    <div className="px-1">
      <div className="mb-3 flex items-center gap-2">
        <ChefHat size={22} style={{ color: C.ink }} />
        <h1 className="text-2xl font-extrabold" style={{ color: C.ink, fontFamily: "'Space Grotesk', system-ui" }}>Ma cuisine</h1>
        <span className="ml-auto text-xs font-semibold" style={{ color: C.muted }}>{list.length}</span>
      </div>

      <div className="relative mb-3">
        <Search size={16} style={{ color: C.muted, position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher dans mes aliments, repas, recettes…" className="w-full rounded-2xl py-2.5 pl-9 pr-9 text-sm outline-none" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }} />
        {q && <button onClick={() => setQ("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: C.muted }}><X size={16} /></button>}
      </div>

      {onAddRecipe && (
        <button onClick={() => setAdding(true)} className="mb-3 flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-semibold text-white active:scale-95" style={{ backgroundColor: C.protein }}>
          <Plus size={15} /> Ajouter une recette
        </button>
      )}

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {KINDS.map((c) => (
          <button key={c.k} onClick={() => setKind(c.k)} className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95" style={chip(kind === c.k)}>{c.l}</button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="py-12 text-center text-sm" style={{ color: C.muted }}>
          {meals.length === 0
            ? "Ta cuisine est vide. Enregistre un aliment (via la pioche), un repas (depuis une journée), ou ajoute une recette ci-dessus."
            : "Rien ne correspond à ce filtre."}
        </p>
      ) : (
        <div className="space-y-2.5">
          {list.map((m) => <Card key={`${m.kind}-${m.id}`} m={m} onUse={onUse} onDelete={onDelete} />)}
        </div>
      )}

      <div style={{ height: "0.5rem" }} />

      {adding && <AddRecipeSheet onClose={() => setAdding(false)} onAdd={(r) => { onAddRecipe(r); setAdding(false); }} />}
    </div>
  );
}

function Card({ m, onUse, onDelete }) {
  const [open, setOpen] = useState(false);
  const [used, setUsed] = useState(false);
  const meta = kindMeta[m.kind] || kindMeta.aliment;
  const flash = () => { setUsed(true); setTimeout(() => setUsed(false), 1400); };
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
      <div className="flex gap-2 border-t px-4 py-2.5" style={{ borderColor: C.line }}>
        <button onClick={() => { onUse(m); flash(); }} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold text-white active:scale-95" style={{ backgroundColor: meta.color }}>
          {used ? <><Check size={15} /> Ajouté</> : <><Plus size={15} /> Aujourd'hui</>}
        </button>
        <button onClick={() => onDelete(m)} className="flex items-center justify-center rounded-xl px-3 py-2 active:scale-95" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.over }} aria-label="Supprimer"><Trash2 size={15} /></button>
      </div>
    </div>
  );
}
