import React, { useState } from "react";
import { Plus, BookmarkPlus, ChevronDown, Check } from "lucide-react";
import { C, cardStyle } from "../core.js";
import { VariantChips, applyVariants, variantLabels } from "./VariantChips.jsx";

const ingLine = (i) => `${i.qty ? `${i.qty} ` : ""}${i.unit ? `${i.unit} ` : ""}${i.name}`.trim();

// Carte d'une suggestion de repas (locale ou générée). onLog/onSave reçoivent le
// repas EFFECTIF (variantes appliquées). Partagée par l'idée du jour et la planif.
export default function MealCard({ meal, onLog, onSave, saved, logLabel = "Ajouter" }) {
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(() => new Set());
  const eff = applyVariants(meal, sel);
  const toggle = (i) => setSel((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; });
  const custom = () => {
    const labels = variantLabels(meal, sel);
    return { ...meal, kcal: eff.kcal, protein: eff.p, title: labels.length ? `${meal.title} · ${labels.join(", ")}` : meal.title };
  };
  const hasDetail = (meal.ingredients?.length || meal.steps?.length);
  return (
    <div className="rounded-2xl cm-card" style={cardStyle()}>
      <div className="flex items-start gap-2.5">
        <span className="text-2xl leading-none">{meal.emoji || "🍽️"}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-tight" style={{ color: C.ink }}>{meal.title}</p>
          <p className="mt-0.5 text-xs" style={{ color: C.sub }}>
            <span className="font-semibold" style={{ color: C.ink }}>{eff.kcal}</span> kcal · <span className="font-semibold" style={{ color: C.protein }}>{eff.p} g</span> prot.{sel.size > 0 && <span style={{ color: C.green }}> · ajusté</span>}
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
      <VariantChips variants={meal.variants} sel={sel} onToggle={toggle} />
      <div className="mt-2.5 flex gap-2">
        <button onClick={() => onLog(custom())} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold text-white active:scale-95" style={{ backgroundColor: C.green }}><Plus size={14} /> {logLabel}</button>
        <button onClick={() => onSave(meal)} disabled={saved} className="flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: saved ? C.green : C.ink }}>
          {saved ? <><Check size={14} /> Enregistré</> : <><BookmarkPlus size={14} /> Cuisine</>}
        </button>
      </div>
    </div>
  );
}
