import React, { useState } from "react";
import { Wand2, Loader2, AlertCircle, Check, ChevronDown, RefreshCw, Plus } from "lucide-react";
import { C, cardStyle, buildAssistantPrompt } from "../core.js";
import { askAssistant, AssistantError } from "../lib/assistant.js";
import { Sheet } from "../components/Sheet.jsx";
import { useRotatingLine, THINKING } from "../components/useRotatingLine.js";

const ingLine = (i) => (typeof i === "string" ? i : `${i.qty ? `${i.qty} ` : ""}${i.unit ? `${i.unit} ` : ""}${i.name}`.trim());
const QUICK = ["Il me manque un ingrédient", "Sans …", "Plus de protéines", "Version plus légère", "Ajoute des légumes verts", "Plus rapide"];

// Adapter une recette via l'assistant : remplacer/retirer un ingrédient, compléter…
// → renvoie une version adaptée que l'on peut remplacer ou enregistrer comme nouvelle.
export function RecipeAdaptSheet({ recipe, favorites = [], knownFoods = [], pantry = [], onReplace, onSaveNew, onClose, z }) {
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState("");
  const thinking = useRotatingLine(THINKING.adapt, busy);

  const have = pantry.filter((x) => !x.out).map((x) => ({ name: x.name, qty: x.qty, unit: x.unit, kcal100: x.kcal100, p100: x.p100 }));
  const avoid = pantry.filter((x) => x.out).map((x) => x.name);

  const ask = async () => {
    if (!instruction.trim()) return;
    setBusy(true); setError(null); setResult(null); setSaved("");
    try {
      const { system, prompt, mode } = buildAssistantPrompt({ mode: "adapt", recipe, instruction: instruction.trim(), favorites, knownFoods, have, avoid });
      const { meals } = await askAssistant({ system, prompt, mode });
      if (!meals?.length) throw new AssistantError("Pas de proposition.");
      setResult(meals[0]);
    } catch (e) {
      setError(e instanceof AssistantError ? e : new AssistantError("Une erreur est survenue."));
    } finally { setBusy(false); }
  };

  const asRecipe = (m) => ({
    cat: recipe.cat || (recipe.slots && recipe.slots[0]) || "dej", name: m.title, emoji: m.emoji || recipe.emoji || "",
    kcal: Math.round(m.kcal), p: Math.round(m.protein),
    ingredients: (m.ingredients || []).map(ingLine),
    steps: m.steps || [], desc: m.note || "", variants: Array.isArray(m.variants) ? m.variants : [],
  });

  return (
    <Sheet open onClose={onClose} title="Adapter la recette" subtitle={recipe?.name} icon={<Wand2 size={18} />} iconColor={C.weight} z={z}>
      <p className="mb-2 text-xs" style={{ color: C.sub }}>Que veux-tu changer ? (ingrédient manquant, en retirer un, compléter, alléger…)</p>
      <input value={instruction} onChange={(e) => setInstruction(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") ask(); }} placeholder="Ex. remplace le tofu, je n'ai pas de fromage blanc…" className="mb-2 w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }} />
      <div className="mb-3 flex flex-wrap gap-1.5">
        {QUICK.map((q) => (
          <button key={q} onClick={() => setInstruction(q)} className="rounded-full px-2.5 py-1 text-[11px] font-semibold active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }}>{q}</button>
        ))}
      </div>
      <button onClick={ask} disabled={busy || !instruction.trim()} className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold active:scale-95 disabled:opacity-60" style={{ backgroundColor: result ? "transparent" : C.weight, color: result ? C.weight : "#fff", border: `1.5px solid ${C.weight}` }}>
        {busy ? <Loader2 size={16} className="animate-spin" /> : result ? <RefreshCw size={16} /> : <Wand2 size={16} />}
        {busy ? thinking : result ? "Reproposer" : "Adapter cette recette"}
      </button>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-2xl cm-card" style={{ backgroundColor: C.card, border: `1px solid ${C.over}` }}>
          <AlertCircle size={16} style={{ color: C.over, flexShrink: 0, marginTop: 1 }} />
          <p className="text-xs font-semibold" style={{ color: C.ink }}>{error.message}</p>
        </div>
      )}

      {result && (
        <div className="mt-3 rounded-2xl cm-card" style={cardStyle()}>
          <div className="flex items-start gap-2.5">
            <span className="text-2xl leading-none">{result.emoji || "🍽️"}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold leading-tight" style={{ color: C.ink }}>{result.title}</p>
              <p className="mt-0.5 text-xs" style={{ color: C.sub }}><span className="font-semibold" style={{ color: C.ink }}>{Math.round(result.kcal)}</span> kcal · <span className="font-semibold" style={{ color: C.protein }}>{Math.round(result.protein)} g</span> prot.</p>
              {result.note && <p className="mt-1 text-[11px] italic" style={{ color: C.muted }}>{result.note}</p>}
            </div>
          </div>
          {(result.ingredients?.length || result.steps?.length) ? (
            <button onClick={() => setOpen((o) => !o)} className="mt-2 flex items-center gap-1 text-[11px] font-medium" style={{ color: C.sub }}><ChevronDown size={13} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }} /> {open ? "Masquer" : "Détail"}</button>
          ) : null}
          {open && (
            <div className="mt-2 space-y-2 border-t pt-2" style={{ borderColor: C.line }}>
              {result.ingredients?.length ? <ul className="space-y-0.5">{result.ingredients.map((i, n) => <li key={n} className="text-xs" style={{ color: C.sub }}>• {ingLine(i)}</li>)}</ul> : null}
              {result.steps?.length ? <ol className="space-y-0.5">{result.steps.map((s, n) => <li key={n} className="text-xs" style={{ color: C.sub }}>{n + 1}. {s}</li>)}</ol> : null}
              {result.variants?.length ? <p className="text-[11px]" style={{ color: C.muted }}>Variantes : {result.variants.map((v) => v.label).join(" · ")}</p> : null}
            </div>
          )}
          <div className="mt-3 flex gap-2">
            {onReplace && <button onClick={() => { onReplace(asRecipe(result)); setSaved("replace"); }} disabled={saved === "replace"} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold text-white active:scale-95" style={{ backgroundColor: C.weight }}>{saved === "replace" ? <><Check size={14} /> Remplacée</> : "Remplacer la recette"}</button>}
            <button onClick={() => { onSaveNew(asRecipe(result)); setSaved("new"); }} disabled={saved === "new"} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold active:scale-95" style={{ backgroundColor: saved === "new" ? `${C.green}1f` : C.card, border: `1px solid ${C.line}`, color: saved === "new" ? C.green : C.ink }}>{saved === "new" ? <><Check size={14} /> Enregistrée</> : <><Plus size={14} /> Nouvelle recette</>}</button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
