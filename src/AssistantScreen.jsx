import React, { useMemo, useState } from "react";
import { Sparkles, Plus, BookmarkPlus, ChevronDown, Loader2, Refrigerator, X, AlertCircle, Check } from "lucide-react";
import { C, cardStyle, buildAssistantPrompt } from "./core.js";
import { askAssistant, AssistantError } from "./assistant.js";
import { Sheet } from "./Sheet.jsx";

const SLOTS = [
  { k: "pdj", l: "Petit-déj" },
  { k: "dej", l: "Déjeuner" },
  { k: "diner", l: "Dîner" },
  { k: "snack", l: "En-cas" },
];
const MODES = [
  { k: "meal", l: "Un repas" },
  { k: "day", l: "Ma journée" },
  { k: "week", l: "Ma semaine" },
];

const ingLine = (i) => `${i.qty ? `${i.qty} ` : ""}${i.unit ? `${i.unit} ` : ""}${i.name}`.trim();

// ── Carte d'une suggestion (locale ou générée) ───────────────────────────────
function MealCard({ meal, onLog, onSave, saved }) {
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
        <button onClick={onLog} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold text-white active:scale-95" style={{ backgroundColor: C.green }}><Plus size={14} /> Ajouter</button>
        <button onClick={onSave} disabled={saved} className="flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: saved ? C.green : C.ink }}>
          {saved ? <><Check size={14} /> Enregistré</> : <><BookmarkPlus size={14} /> Cuisine</>}
        </button>
      </div>
    </div>
  );
}

// ── Gestion du frigo/placard ─────────────────────────────────────────────────
function PantrySheet({ pantry, onAdd, onToggle, onRemove, onClose }) {
  const [name, setName] = useState("");
  const add = () => { if (name.trim()) { onAdd(name.trim()); setName(""); } };
  return (
    <Sheet open onClose={onClose} title="Mon frigo / placard">
      <p className="mb-3 text-xs" style={{ color: C.sub }}>Liste tes aliments habituels. Décoche ce que tu n'as pas aujourd'hui — l'assistant en tiendra compte.</p>
      <div className="mb-3 flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} placeholder="Ajouter un aliment…" className="min-w-0 flex-1 rounded-xl px-3 py-2.5 text-sm outline-none" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }} />
        <button onClick={add} className="rounded-xl px-4 text-sm font-bold text-white active:scale-95" style={{ backgroundColor: C.green }}>Ajouter</button>
      </div>
      {pantry.length === 0 ? (
        <p className="py-8 text-center text-xs" style={{ color: C.muted }}>Aucun aliment pour l'instant.</p>
      ) : (
        <div className="space-y-1.5 pb-2">
          {pantry.map((it) => (
            <div key={it.id} className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, opacity: it.out ? 0.5 : 1 }}>
              <button onClick={() => onToggle(it.id)} className="flex h-5 w-5 items-center justify-center rounded-md" style={{ border: `1.5px solid ${it.out ? C.muted : C.green}`, backgroundColor: it.out ? "transparent" : C.green }}>
                {!it.out && <Check size={13} className="text-white" />}
              </button>
              <span className="flex-1 text-sm" style={{ color: C.ink, textDecoration: it.out ? "line-through" : "none" }}>{it.name}</span>
              <button onClick={() => onRemove(it.id)} className="p-1" style={{ color: C.muted }}><X size={15} /></button>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
}

export default function AssistantScreen({
  remKcal = 0, remP = 0, targetKcal = 1850, targetP = 150,
  favorites = [], knownFoods = [], localIdeas = [],
  pantry = [], onAddPantry, onTogglePantry, onRemovePantry,
  onLog, onSaveRecipe, dateLabel,
}) {
  const [mode, setMode] = useState("meal");
  const [slot, setSlot] = useState("dej");
  const [exclude, setExclude] = useState("");
  const [pantryOpen, setPantryOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null); // null = pas encore demandé
  const [savedKeys, setSavedKeys] = useState(() => new Set());

  // Matchs locaux (gratuits, instantanés) : idées du bon créneau qui rentrent dans le budget.
  const local = useMemo(() => {
    if (mode !== "meal") return [];
    const cap = remKcal > 0 ? remKcal * 1.1 : Infinity;
    return localIdeas
      .filter((r) => (r.cat || r.slot) === slot && (r.kcal || 0) <= cap)
      .sort((a, b) => (b.p || 0) - (a.p || 0))
      .slice(0, 4)
      .map((r) => ({ title: r.name, emoji: r.emoji, kcal: r.kcal, protein: r.p, slot, ingredients: r.ingredients?.map((s) => (typeof s === "string" ? { name: s } : s)) || [], steps: r.steps || [], _local: true }));
  }, [mode, slot, remKcal, localIdeas]);

  const thin = local.length < 3; // peu de matchs → on met en avant Claude

  const ask = async () => {
    setBusy(true); setError(null);
    try {
      const { system, prompt, mode: m } = buildAssistantPrompt({
        mode, slot, remKcal, remP, targetKcal, targetP,
        favorites, knownFoods,
        have: pantry.filter((x) => !x.out).map((x) => x.name),
        avoid: [...pantry.filter((x) => x.out).map((x) => x.name), ...exclude.split(",").map((s) => s.trim()).filter(Boolean)],
        dateLabel,
      });
      const { meals } = await askAssistant({ system, prompt, mode: m });
      setResults(meals);
    } catch (e) {
      setError(e instanceof AssistantError ? e : new AssistantError("Une erreur est survenue."));
    } finally { setBusy(false); }
  };

  const keyOf = (m, i) => `${m.dayIndex ?? 0}-${m.slot}-${m.title}-${i}`;
  const save = (m, i) => { onSaveRecipe?.(m); setSavedKeys((s) => new Set(s).add(keyOf(m, i))); };

  // Regroupement des résultats (par jour pour la semaine, par slot pour la journée).
  const grouped = useMemo(() => {
    if (!results) return null;
    if (mode === "week") {
      const days = {};
      results.forEach((m) => { (days[m.dayIndex ?? 0] ||= []).push(m); });
      return Object.entries(days).sort((a, b) => a[0] - b[0]);
    }
    return null;
  }, [results, mode]);

  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: C.sub }}>Dis-moi ce que tu cherches — je pioche d'abord dans tes idées, et Claude complète à la demande.</p>

      {/* Mode */}
      <div className="flex gap-1.5 rounded-2xl p-1" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
        {MODES.map((m) => (
          <button key={m.k} onClick={() => { setMode(m.k); setResults(null); setError(null); }} className="flex-1 rounded-xl py-2 text-xs font-semibold active:scale-95" style={{ backgroundColor: mode === m.k ? C.green : "transparent", color: mode === m.k ? "#fff" : C.sub }}>{m.l}</button>
        ))}
      </div>

      {/* Créneau (mode repas) */}
      {mode === "meal" && (
        <div className="flex flex-wrap gap-1.5">
          {SLOTS.map((s) => (
            <button key={s.k} onClick={() => { setSlot(s.k); setResults(null); }} className="rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95" style={{ backgroundColor: slot === s.k ? C.ink : C.card, color: slot === s.k ? C.bg : C.sub, border: `1px solid ${C.line}` }}>{s.l}</button>
          ))}
        </div>
      )}

      {/* Budget + frigo */}
      <div className="flex items-center justify-between rounded-2xl px-3.5 py-2.5" style={cardStyle()}>
        <div className="text-xs" style={{ color: C.sub }}>
          {mode === "meal" ? "Budget restant" : mode === "day" ? "Cible / restant du jour" : "Cible / jour"} :{" "}
          <span className="font-bold" style={{ color: C.ink }}>{Math.round(Math.max(0, mode === "week" ? targetKcal : remKcal))} kcal</span> · <span className="font-bold" style={{ color: C.protein }}>{Math.round(Math.max(0, mode === "week" ? targetP : remP))} g</span>
        </div>
        <button onClick={() => setPantryOpen(true)} className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }}>
          <Refrigerator size={13} /> Frigo{pantry.filter((x) => !x.out).length ? ` · ${pantry.filter((x) => !x.out).length}` : ""}
        </button>
      </div>

      {/* Exclusion ponctuelle */}
      <input value={exclude} onChange={(e) => setExclude(e.target.value)} placeholder="Exclure aujourd'hui (ex. tofu, courgette)…" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }} />

      {/* Matchs locaux (mode repas) */}
      {mode === "meal" && local.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.muted }}>Dans tes idées</p>
          {local.map((m, i) => (
            <MealCard key={`l-${i}`} meal={m} onLog={() => onLog?.(m, m.slot)} onSave={() => save(m, `l${i}`)} saved={savedKeys.has(keyOf(m, `l${i}`))} />
          ))}
        </div>
      )}

      {/* Bouton Claude */}
      <button onClick={ask} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold active:scale-95"
        style={{ backgroundColor: thin || results ? C.green : "transparent", color: thin || results ? "#fff" : C.green, border: `1.5px solid ${C.green}` }}>
        {busy ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />}
        {busy ? "Claude réfléchit…" : results ? "Régénérer" : mode === "meal" ? (thin ? "Peu d'idées ici — demander à Claude" : "Demander à Claude") : mode === "day" ? "Planifier ma journée" : "Planifier ma semaine"}
      </button>

      {/* Erreur */}
      {error && (
        <div className="flex items-start gap-2 rounded-2xl p-3" style={{ backgroundColor: C.card, border: `1px solid ${C.over}` }}>
          <AlertCircle size={16} style={{ color: C.over, flexShrink: 0, marginTop: 1 }} />
          <div className="text-xs" style={{ color: C.sub }}>
            <p className="font-semibold" style={{ color: C.ink }}>{error.message}</p>
            {error.kind === "unconfigured" && <p className="mt-1">Ajoute <code>ANTHROPIC_API_KEY</code> dans les variables d'environnement Netlify.</p>}
            {error.kind === "offline" && <p className="mt-1">L'assistant ne marche que sur l'app déployée (pas en aperçu local).</p>}
          </div>
        </div>
      )}

      {/* Résultats générés */}
      {results && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.muted }}>Proposé par Claude</p>
          {grouped ? (
            grouped.map(([di, meals]) => (
              <div key={di} className="space-y-2">
                <p className="pt-1 text-xs font-bold" style={{ color: C.ink }}>Jour {Number(di) + 1}</p>
                {meals.map((m, i) => <MealCard key={keyOf(m, i)} meal={m} onLog={() => onLog?.(m, m.slot)} onSave={() => save(m, i)} saved={savedKeys.has(keyOf(m, i))} />)}
              </div>
            ))
          ) : (
            results.map((m, i) => <MealCard key={keyOf(m, i)} meal={m} onLog={() => onLog?.(m, m.slot)} onSave={() => save(m, i)} saved={savedKeys.has(keyOf(m, i))} />)
          )}
        </div>
      )}

      {pantryOpen && <PantrySheet pantry={pantry} onAdd={onAddPantry} onToggle={onTogglePantry} onRemove={onRemovePantry} onClose={() => setPantryOpen(false)} />}
    </div>
  );
}
