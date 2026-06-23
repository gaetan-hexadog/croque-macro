import React, { useState } from "react";
import { Plus, BookmarkPlus, ChevronDown, Check } from "lucide-react";
import { C, cardStyle } from "./core.js";

const ingLine = (i) => `${i.qty ? `${i.qty} ` : ""}${i.unit ? `${i.unit} ` : ""}${i.name}`.trim();

// Carte d'une suggestion de repas (locale ou générée). Partagée par l'idée
// contextuelle (écran Jour) et la planification (PlanScreen).
export default function MealCard({ meal, onLog, onSave, saved, logLabel = "Ajouter" }) {
  const [open, setOpen] = useState(false);
  const hasDetail = (meal.ingredients?.length || meal.steps?.length);
  return (
    <div className="rounded-2xl p-3.5" style={cardStyle()}>
      <div className="flex items-start gap-2.5">
        <span className="text-2xl leading-none">{meal.emoji || "🍽️"}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-tight" style={{ color: C.ink }}>{meal.title}</p>
          <p className="mt-0.5 text-xs" style={{ color: C.sub }}>
            <span className="font-semibold" style={{ color: C.ink }}>{Math.round(meal.kcal)}</span> kcal · <span className="font-semibold" style={{ color: C.protein }}>{Math.round(meal.protein)} g</span> prot.
          </p>
          {meal.note && <p className="mt-1 text-[11px] italic" style={{ color: C.muted }}>{meal.note}</p>}
        </div>
      </div>
      {hasDetail ? (
        <button onClick={() => setOpen((o) => !o)} className="mt-2 flex items-center gap-1 text-[11px] font-medium" style={{ color: C.sub }}>
          <ChevronDown size={13} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }} /> {open ? "Masquer" : "Recette"}
        </button>
      ) : null}
      {open && (
        <div className="mt-2 space-y-2 border-t pt-2" style={{ borderColor: C.line }}>
          {meal.ingredients?.length ? (
            <ul className="space-y-0.5">
              {meal.ingredients.map((i, n) => <li key={n} className="text-xs" style={{ color: C.sub }}>• {ingLine(i)}</li>)}
            </ul>
          ) : null}
          {meal.steps?.length ? (
            <ol className="space-y-0.5">
              {meal.steps.map((s, n) => <li key={n} className="text-xs" style={{ color: C.sub }}>{n + 1}. {s}</li>)}
            </ol>
          ) : null}
        </div>
      )}
      <div className="mt-2.5 flex gap-2">
        <button onClick={onLog} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold text-white active:scale-95" style={{ backgroundColor: C.green }}><Plus size={14} /> {logLabel}</button>
        <button onClick={onSave} disabled={saved} className="flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: saved ? C.green : C.ink }}>
          {saved ? <><Check size={14} /> Enregistré</> : <><BookmarkPlus size={14} /> Cuisine</>}
        </button>
      </div>
    </div>
  );
}
