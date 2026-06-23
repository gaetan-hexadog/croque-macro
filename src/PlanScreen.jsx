import React, { useMemo, useState } from "react";
import { Sparkles, Loader2, Refrigerator, AlertCircle, CalendarDays, Check } from "lucide-react";
import { C, cardStyle, buildAssistantPrompt, TODAY, addDays, fmtFull, dayTotals, EMPTY_DAY } from "./core.js";
import { askAssistant, AssistantError } from "./assistant.js";
import MealCard from "./MealCard.jsx";
import { PantrySheet } from "./PantrySheet.jsx";

const MODES = [{ k: "day", l: "Une journée" }, { k: "week", l: "Une semaine" }];
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Planification anticipée : une journée ou une semaine, à partir d'une date choisie.
// Part du RESTANT réel (re-planif) et logge chaque repas dans la bonne date.
export default function PlanScreen({
  targetKcal = 1850, targetP = 150, days = {},
  favorites = [], knownFoods = [],
  pantry = [], onAddPantry, onTogglePantry, onUpdatePantry, onRemovePantry,
  onLogToDate, onSaveRecipe,
}) {
  const [mode, setMode] = useState("day");
  const [date, setDate] = useState(TODAY);   // jour mode : date cible ; semaine mode : date de départ
  const [pantryOpen, setPantryOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [savedKeys, setSavedKeys] = useState(() => new Set());
  const [doneDays, setDoneDays] = useState(() => new Set());

  // Restant réel pour la date (jour mode) et consommé par jour (semaine mode).
  const loggedOf = (iso) => dayTotals(days[iso] || EMPTY_DAY());
  const dayRem = useMemo(() => { const t = loggedOf(date); return { kcal: targetKcal - t.kcal, p: targetP - t.p }; }, [date, days, targetKcal, targetP]);
  const weekLogged = useMemo(() => Array.from({ length: 7 }, (_, i) => loggedOf(addDays(date, i))), [date, days]);

  const quick = mode === "day"
    ? [{ iso: TODAY, l: "Aujourd'hui" }, { iso: addDays(TODAY, 1), l: "Demain" }]
    : [{ iso: TODAY, l: "Dès aujourd'hui" }, { iso: addDays(TODAY, 1), l: "Dès demain" }];

  const ask = async () => {
    setBusy(true); setError(null); setResults(null);
    try {
      const payload = mode === "day"
        ? { mode: "day", remKcal: dayRem.kcal, remP: dayRem.p, targetKcal, targetP, dateLabel: fmtFull(date) }
        : { mode: "week", targetKcal, targetP, startLabel: fmtFull(date), loggedByDay: weekLogged };
      const { system, prompt, mode: m } = buildAssistantPrompt({
        ...payload, favorites, knownFoods,
        have: pantry.filter((x) => !x.out).map((x) => x.name),
        avoid: pantry.filter((x) => x.out).map((x) => x.name),
      });
      const { meals } = await askAssistant({ system, prompt, mode: m });
      setResults(meals);
    } catch (e) {
      setError(e instanceof AssistantError ? e : new AssistantError("Une erreur est survenue."));
    } finally { setBusy(false); }
  };

  const keyOf = (m, i) => `${m.dayIndex ?? 0}-${m.slot}-${m.title}-${i}`;
  const save = (m, i) => { onSaveRecipe?.(m); setSavedKeys((s) => new Set(s).add(keyOf(m, i))); };
  const isoFor = (m) => (mode === "week" ? addDays(date, m.dayIndex || 0) : date);
  const logOne = (m, i) => onLogToDate?.(isoFor(m), m.slot, m);
  const logDay = (meals, di) => { meals.forEach((m) => onLogToDate?.(addDays(date, di), m.slot, m)); setDoneDays((s) => new Set(s).add(di)); };

  const grouped = useMemo(() => {
    if (!results) return null;
    const by = {};
    results.forEach((m) => { const k = mode === "week" ? (m.dayIndex ?? 0) : 0; (by[k] ||= []).push(m); });
    return Object.entries(by).sort((a, b) => a[0] - b[0]);
  }, [results, mode]);

  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: C.sub }}>Anticipe tes repas. Je pars de ce que tu as déjà loggé pour ne proposer que le reste, et chaque repas s'ajoute à la bonne date.</p>

      {/* Mode */}
      <div className="flex gap-1.5 rounded-2xl p-1" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
        {MODES.map((m) => (
          <button key={m.k} onClick={() => { setMode(m.k); setResults(null); setError(null); }} className="flex-1 rounded-xl py-2 text-xs font-semibold active:scale-95" style={{ backgroundColor: mode === m.k ? C.green : "transparent", color: mode === m.k ? "#fff" : C.sub }}>{m.l}</button>
        ))}
      </div>

      {/* Date */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {quick.map((q) => (
            <button key={q.iso} onClick={() => { setDate(q.iso); setResults(null); }} className="rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95" style={{ backgroundColor: date === q.iso ? C.ink : C.card, color: date === q.iso ? C.bg : C.sub, border: `1px solid ${C.line}` }}>{q.l}</button>
          ))}
          <label className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold" style={{ backgroundColor: C.card, color: C.sub, border: `1px solid ${C.line}` }}>
            <CalendarDays size={13} />
            <input type="date" value={date} onChange={(e) => { if (e.target.value) { setDate(e.target.value); setResults(null); } }} className="bg-transparent outline-none" style={{ color: C.ink, colorScheme: "dark" }} />
          </label>
        </div>
        <p className="text-xs" style={{ color: C.muted }}>{mode === "day" ? capitalize(fmtFull(date)) : `Semaine du ${fmtFull(date)}`}</p>
      </div>

      {/* Budget + frigo */}
      <div className="flex items-center justify-between rounded-2xl px-3.5 py-2.5" style={cardStyle()}>
        <div className="text-xs" style={{ color: C.sub }}>
          {mode === "day" ? "Restant ce jour-là" : "Cible / jour"} :{" "}
          <span className="font-bold" style={{ color: C.ink }}>{Math.round(Math.max(0, mode === "day" ? dayRem.kcal : targetKcal))} kcal</span> · <span className="font-bold" style={{ color: C.protein }}>{Math.round(Math.max(0, mode === "day" ? dayRem.p : targetP))} g</span>
        </div>
        <button onClick={() => setPantryOpen(true)} className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }}>
          <Refrigerator size={13} /> Frigo{pantry.filter((x) => !x.out).length ? ` · ${pantry.filter((x) => !x.out).length}` : ""}
        </button>
      </div>

      {/* Générer */}
      <button onClick={ask} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white active:scale-95" style={{ backgroundColor: C.green }}>
        {busy ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />}
        {busy ? "L'assistant réfléchit…" : results ? "Régénérer" : mode === "day" ? "Planifier la journée" : "Planifier la semaine"}
      </button>

      {error && (
        <div className="flex items-start gap-2 rounded-2xl p-3" style={{ backgroundColor: C.card, border: `1px solid ${C.over}` }}>
          <AlertCircle size={16} style={{ color: C.over, flexShrink: 0, marginTop: 1 }} />
          <div className="text-xs" style={{ color: C.sub }}>
            <p className="font-semibold" style={{ color: C.ink }}>{error.message}</p>
            {error.kind === "unconfigured" && <p className="mt-1">Ajoute <code>ANTHROPIC_API_KEY</code> dans Netlify.</p>}
            {error.kind === "offline" && <p className="mt-1">L'assistant ne marche que sur l'app déployée.</p>}
          </div>
        </div>
      )}

      {grouped && (
        <div className="space-y-3">
          {grouped.map(([di, meals]) => (
            <div key={di} className="space-y-2">
              {mode === "week" && (
                <div className="flex items-center justify-between pt-1">
                  <p className="text-xs font-bold" style={{ color: C.ink }}>{capitalize(fmtFull(addDays(date, Number(di))))}</p>
                  <button onClick={() => logDay(meals, Number(di))} className="rounded-full px-2.5 py-1 text-[11px] font-semibold active:scale-95" style={{ backgroundColor: doneDays.has(Number(di)) ? C.green : C.card, color: doneDays.has(Number(di)) ? "#fff" : C.sub, border: `1px solid ${C.line}` }}>
                    {doneDays.has(Number(di)) ? <span className="flex items-center gap-1"><Check size={12} /> Ajouté</span> : "Ajouter le jour"}
                  </button>
                </div>
              )}
              {meals.map((m, i) => <MealCard key={keyOf(m, i)} meal={m} logLabel={mode === "day" ? "Ajouter" : "Ce repas"} onLog={() => logOne(m, i)} onSave={() => save(m, i)} saved={savedKeys.has(keyOf(m, i))} />)}
            </div>
          ))}
        </div>
      )}

      {pantryOpen && <PantrySheet pantry={pantry} onAdd={onAddPantry} onToggle={onTogglePantry} onUpdate={onUpdatePantry} onRemove={onRemovePantry} onClose={() => setPantryOpen(false)} />}
    </div>
  );
}
