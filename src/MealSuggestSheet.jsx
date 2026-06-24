import React, { useMemo, useState } from "react";
import { Sparkles, Loader2, Refrigerator, AlertCircle, Lightbulb } from "lucide-react";
import { C, buildAssistantPrompt } from "./core.js";
import { askAssistant, AssistantError } from "./assistant.js";
import { Sheet } from "./Sheet.jsx";
import MealCard from "./MealCard.jsx";
import { PantrySheet } from "./PantrySheet.jsx";

const SLOT_LABELS = { pdj: "petit-déjeuner", dej: "déjeuner", diner: "dîner", snack: "en-cas" };

// Idée de repas contextuelle : ouverte depuis un créneau de l'écran Jour.
// Matchs locaux d'abord (gratuit), puis assistant à la demande. Logge dans CE créneau.
export function MealSuggestSheet({
  slot = "dej", remKcal = 0, remP = 0,
  favorites = [], knownFoods = [], localIdeas = [],
  pantry = [], onAddPantry, onTogglePantry, onUpdatePantry, onRemovePantry,
  onLog, onSaveRecipe, dateLabel, onClose,
}) {
  const [exclude, setExclude] = useState("");
  const [pantryOpen, setPantryOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [savedKeys, setSavedKeys] = useState(() => new Set());

  const local = useMemo(() => {
    const cap = remKcal > 0 ? remKcal * 1.1 : Infinity;
    const deburr = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const out = pantry.filter((x) => x.out).map((x) => deburr(x.name)).filter(Boolean);
    const hasRupture = (r) => { const hay = deburr(r.name + " " + (r.ingredients || []).map((i) => (typeof i === "string" ? i : i.name)).join(" ")); return out.some((o) => hay.includes(o)); };
    return localIdeas
      .filter((r) => (r.cat || r.slot) === slot && (r.kcal || 0) <= cap && !hasRupture(r))
      .sort((a, b) => (b.p || 0) - (a.p || 0))
      .slice(0, 4)
      .map((r) => ({ title: r.name, emoji: r.emoji, kcal: r.kcal, protein: r.p, slot, ingredients: r.ingredients?.map((s) => (typeof s === "string" ? { name: s } : s)) || [], steps: r.steps || [] }));
  }, [slot, remKcal, localIdeas, pantry]);
  const thin = local.length < 3;

  const ask = async () => {
    setBusy(true); setError(null);
    try {
      const { system, prompt, mode } = buildAssistantPrompt({
        mode: "meal", slot, remKcal, remP, favorites, knownFoods,
        have: pantry.filter((x) => !x.out).map((x) => ({ name: x.name, qty: x.qty, unit: x.unit, kcal100: x.kcal100, p100: x.p100 })),
        avoid: [...pantry.filter((x) => x.out).map((x) => x.name), ...exclude.split(",").map((s) => s.trim()).filter(Boolean)],
        dateLabel,
      });
      const { meals } = await askAssistant({ system, prompt, mode });
      setResults(meals);
    } catch (e) {
      setError(e instanceof AssistantError ? e : new AssistantError("Une erreur est survenue."));
    } finally { setBusy(false); }
  };

  const keyOf = (m, i) => `${m.title}-${i}`;
  const save = (cust, i) => { onSaveRecipe?.(cust); setSavedKeys((s) => new Set(s).add(i)); };

  return (
    <Sheet open onClose={onClose} title="Une idée de repas" subtitle={`Pour le ${SLOT_LABELS[slot] || "repas"}`} icon={<Lightbulb size={18} />} iconColor={C.green}>
      <div className="flex items-center justify-between pb-3">
        <p className="text-xs" style={{ color: C.sub }}>Budget restant : <span className="font-bold" style={{ color: C.ink }}>{Math.round(Math.max(0, remKcal))} kcal</span> · <span className="font-bold" style={{ color: C.protein }}>{Math.round(Math.max(0, remP))} g</span></p>
        <button onClick={() => setPantryOpen(true)} className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }}>
          <Refrigerator size={13} /> Frigo{pantry.filter((x) => !x.out).length ? ` · ${pantry.filter((x) => !x.out).length}` : ""}
        </button>
      </div>

      <input value={exclude} onChange={(e) => setExclude(e.target.value)} placeholder="Exclure aujourd'hui (ex. tofu)…" className="mb-3 w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }} />

      {local.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.muted }}>Dans tes idées</p>
          {local.map((m, i) => <MealCard key={`l-${i}`} meal={m} onLog={(cust) => { onLog?.(cust, slot); onClose(); }} onSave={(cust) => save(cust, `l${i}`)} saved={savedKeys.has(`l${i}`)} />)}
        </div>
      )}

      <button onClick={ask} disabled={busy} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold active:scale-95"
        style={{ backgroundColor: thin || results ? C.green : "transparent", color: thin || results ? "#fff" : C.green, border: `1.5px solid ${C.green}` }}>
        {busy ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />}
        {busy ? "L'assistant réfléchit…" : results ? "Régénérer" : thin ? "Peu d'idées ici — demander à l'assistant" : "Demander à l'assistant"}
      </button>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-2xl p-3" style={{ backgroundColor: C.card, border: `1px solid ${C.over}` }}>
          <AlertCircle size={16} style={{ color: C.over, flexShrink: 0, marginTop: 1 }} />
          <div className="text-xs" style={{ color: C.sub }}>
            <p className="font-semibold" style={{ color: C.ink }}>{error.message}</p>
            {error.kind === "unconfigured" && <p className="mt-1">Ajoute <code>ANTHROPIC_API_KEY</code> dans Netlify.</p>}
            {error.kind === "offline" && <p className="mt-1">L'assistant ne marche que sur l'app déployée.</p>}
          </div>
        </div>
      )}

      {results && (
        <div className="mt-3 space-y-2 pb-2">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.muted }}>Proposé par l'assistant</p>
          {results.map((m, i) => <MealCard key={keyOf(m, i)} meal={m} onLog={(cust) => { onLog?.(cust, slot); onClose(); }} onSave={(cust) => save(cust, `r${i}`)} saved={savedKeys.has(`r${i}`)} />)}
        </div>
      )}

      {pantryOpen && <PantrySheet pantry={pantry} onAdd={onAddPantry} onToggle={onTogglePantry} onUpdate={onUpdatePantry} onRemove={onRemovePantry} onClose={() => setPantryOpen(false)} />}
    </Sheet>
  );
}
