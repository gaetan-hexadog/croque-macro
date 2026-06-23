import React, { useMemo, useState } from "react";
import { Sparkles, Loader2, Refrigerator, AlertCircle, CalendarDays, Check, ChevronDown, BookmarkPlus, CalendarCheck } from "lucide-react";
import { C, cardStyle, buildAssistantPrompt, TODAY, addDays, fmtFull, dayTotals, EMPTY_DAY, picksKey } from "./core.js";
import { askAssistant, AssistantError } from "./assistant.js";
import { PantrySheet } from "./PantrySheet.jsx";

const MODES = [{ k: "day", l: "Une journée" }, { k: "week", l: "Une semaine" }];
const SLOT_ORDER = [["pdj", "Petit-déjeuner"], ["dej", "Déjeuner"], ["diner", "Dîner"], ["snack", "En-cas"]];
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const ingLine = (i) => `${i.qty ? `${i.qty} ` : ""}${i.unit ? `${i.unit} ` : ""}${i.name}`.trim();

// Carte d'OPTION sélectionnable (radio). Tap = choisir/désélectionner ce repas.
function OptionCard({ meal, selected, onSelect, onSave, saved }) {
  const [open, setOpen] = useState(false);
  const detail = meal.ingredients?.length || meal.steps?.length;
  return (
    <div onClick={onSelect} role="button" className="cursor-pointer rounded-2xl p-3" style={{ ...cardStyle(), outline: selected ? `2px solid ${C.green}` : `1px solid transparent`, outlineOffset: -1 }}>
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ border: `2px solid ${selected ? C.green : C.muted}`, backgroundColor: selected ? C.green : "transparent" }}>{selected && <Check size={12} className="text-white" />}</span>
        <span className="text-xl leading-none">{meal.emoji || "🍽️"}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-tight" style={{ color: C.ink }}>{meal.title}</p>
          <p className="mt-0.5 text-xs" style={{ color: C.sub }}><span className="font-semibold" style={{ color: C.ink }}>{Math.round(meal.kcal)}</span> kcal · <span className="font-semibold" style={{ color: C.protein }}>{Math.round(meal.protein)} g</span></p>
          {meal.note && <p className="mt-0.5 text-[11px] italic" style={{ color: C.muted }}>{meal.note}</p>}
        </div>
        <button onClick={(ev) => { ev.stopPropagation(); onSave(); }} disabled={saved} className="shrink-0 p-1" style={{ color: saved ? C.green : C.muted }} aria-label="Enregistrer dans ma cuisine">{saved ? <Check size={15} /> : <BookmarkPlus size={15} />}</button>
      </div>
      {detail ? (
        <button onClick={(ev) => { ev.stopPropagation(); setOpen((o) => !o); }} className="mt-1.5 flex items-center gap-1 pl-8 text-[11px] font-medium" style={{ color: C.sub }}>
          <ChevronDown size={12} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }} /> {open ? "Masquer" : "Recette"}
        </button>
      ) : null}
      {open && (
        <div className="mt-1.5 space-y-1 border-t pl-8 pt-1.5" style={{ borderColor: C.line }}>
          {meal.ingredients?.map((i, n) => <p key={`i${n}`} className="text-xs" style={{ color: C.sub }}>• {ingLine(i)}</p>)}
          {meal.steps?.map((s, n) => <p key={`s${n}`} className="text-xs" style={{ color: C.sub }}>{n + 1}. {s}</p>)}
        </div>
      )}
    </div>
  );
}

// Planification : propose des OPTIONS par repas (créneaux restants si jour en
// cours, tous sinon). On en sélectionne une par repas, puis « Planifier » valide tout.
export default function PlanScreen({
  targetKcal = 1850, targetP = 150, days = {},
  favorites = [], knownFoods = [],
  pantry = [], onAddPantry, onTogglePantry, onUpdatePantry, onRemovePantry,
  onLogToDate, onSaveRecipe,
}) {
  const [mode, setMode] = useState("day");
  const [date, setDate] = useState(TODAY);
  const [pantryOpen, setPantryOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [selected, setSelected] = useState({});   // `${di}-${slot}` → index (−1 = aucun)
  const [savedKeys, setSavedKeys] = useState(() => new Set());
  const [committed, setCommitted] = useState(false);

  const loggedOf = (iso) => dayTotals(days[iso] || EMPTY_DAY());
  const filledSlots = (iso) => SLOT_ORDER.map(([s]) => s).filter((s) => ((days[iso]?.picks?.[picksKey(s)]) || []).length > 0);
  const emptySlots = (iso) => SLOT_ORDER.map(([s]) => s).filter((s) => !filledSlots(iso).includes(s));
  const dayRem = useMemo(() => { const t = loggedOf(date); return { kcal: targetKcal - t.kcal, p: targetP - t.p }; }, [date, days, targetKcal, targetP]);

  const quick = mode === "day"
    ? [{ iso: TODAY, l: "Aujourd'hui" }, { iso: addDays(TODAY, 1), l: "Demain" }]
    : [{ iso: TODAY, l: "Dès aujourd'hui" }, { iso: addDays(TODAY, 1), l: "Dès demain" }];

  const have = pantry.filter((x) => !x.out).map((x) => ({ name: x.name, qty: x.qty, unit: x.unit, kcal100: x.kcal100, p100: x.p100 }));
  const avoid = pantry.filter((x) => x.out).map((x) => x.name);

  const ask = async () => {
    setBusy(true); setError(null); setResults(null); setSelected({}); setCommitted(false);
    try {
      let payload;
      if (mode === "day") {
        const sl = emptySlots(date);
        if (!sl.length) { setError(new AssistantError("Journée déjà complète — tous les repas sont loggés.")); setBusy(false); return; }
        payload = { mode: "day", remKcal: dayRem.kcal, remP: dayRem.p, targetKcal, targetP, dateLabel: fmtFull(date), slots: sl };
      } else {
        payload = { mode: "week", targetKcal, targetP, startLabel: fmtFull(date), filledByDay: Array.from({ length: 7 }, (_, i) => filledSlots(addDays(date, i))) };
      }
      const { system, prompt, mode: m } = buildAssistantPrompt({ ...payload, favorites, knownFoods, have, avoid });
      const { meals } = await askAssistant({ system, prompt, mode: m });
      setResults(meals);
    } catch (e) {
      setError(e instanceof AssistantError ? e : new AssistantError("Une erreur est survenue."));
    } finally { setBusy(false); }
  };

  const keyOf = (m, di, s, i) => `${di}-${s}-${i}-${m.title}`;
  const save = (m, di, s, i) => { onSaveRecipe?.(m); setSavedKeys((x) => new Set(x).add(keyOf(m, di, s, i))); };
  const selK = (di, s) => `${di}-${s}`;
  const selIdx = (di, s) => (selected[selK(di, s)] ?? 0);
  const toggleSel = (di, s, i) => { setCommitted(false); setSelected((m) => ({ ...m, [selK(di, s)]: (m[selK(di, s)] ?? 0) === i ? -1 : i })); };

  const plan = useMemo(() => {
    if (!results) return null;
    const byDay = {};
    results.forEach((m) => { const di = mode === "week" ? (m.dayIndex ?? 0) : 0; const s = m.slot || "dej"; ((byDay[di] ||= {})[s] ||= []).push(m); });
    return Object.entries(byDay).sort((a, b) => a[0] - b[0]).map(([di, slotsObj]) => ({ di: Number(di), slotsObj }));
  }, [results, mode]);

  const chosenCount = useMemo(() => {
    if (!plan) return 0;
    let n = 0;
    plan.forEach(({ di, slotsObj }) => SLOT_ORDER.forEach(([s]) => { if (slotsObj[s] && selIdx(di, s) >= 0) n++; }));
    return n;
  }, [plan, selected]);

  const commit = () => {
    plan.forEach(({ di, slotsObj }) => SLOT_ORDER.forEach(([s]) => {
      const opts = slotsObj[s]; if (!opts) return;
      const idx = selIdx(di, s); if (idx < 0) return;
      const m = opts[idx]; if (m) onLogToDate?.(mode === "week" ? addDays(date, di) : date, s, m);
    }));
    setCommitted(true);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: C.sub }}>Génère des options par repas, choisis celles qui te plaisent, puis planifie-les. Sur le jour en cours, seuls les repas pas encore faits sont proposés.</p>

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
      <button onClick={ask} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold active:scale-95" style={{ backgroundColor: results ? "transparent" : C.green, color: results ? C.green : "#fff", border: `1.5px solid ${C.green}` }}>
        {busy ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />}
        {busy ? "L'assistant réfléchit…" : results ? "Régénérer des options" : mode === "day" ? "Proposer des repas" : "Proposer ma semaine"}
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

      {/* Options par repas */}
      {plan && (
        <div className="space-y-4">
          {plan.map(({ di, slotsObj }) => (
            <div key={di} className="space-y-3">
              {mode === "week" && <h3 className="pt-1 text-sm font-extrabold" style={{ color: C.ink }}>{capitalize(fmtFull(addDays(date, di)))}</h3>}
              {SLOT_ORDER.filter(([s]) => slotsObj[s]?.length).map(([s, label]) => (
                <div key={s}>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: C.muted }}>{label}{selIdx(di, s) < 0 && " · ignoré"}</p>
                  <div className="space-y-2">
                    {slotsObj[s].map((m, i) => (
                      <OptionCard key={keyOf(m, di, s, i)} meal={m} selected={selIdx(di, s) === i} onSelect={() => toggleSel(di, s, i)} onSave={() => save(m, di, s, i)} saved={savedKeys.has(keyOf(m, di, s, i))} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}

          {/* Valider la sélection */}
          <button onClick={commit} disabled={chosenCount === 0} className="sticky bottom-24 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white active:scale-95" style={{ backgroundColor: committed ? C.green : (chosenCount ? C.accent : C.line), boxShadow: `0 8px 22px -8px ${C.accent}` }}>
            {committed ? <><Check size={17} /> Planifié ✓</> : <><CalendarCheck size={17} /> Planifier {mode === "day" ? "ma journée" : "ma semaine"} ({chosenCount})</>}
          </button>
        </div>
      )}

      {pantryOpen && <PantrySheet pantry={pantry} onAdd={onAddPantry} onToggle={onTogglePantry} onUpdate={onUpdatePantry} onRemove={onRemovePantry} onClose={() => setPantryOpen(false)} />}
    </div>
  );
}
