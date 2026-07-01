import React, { useMemo, useState } from "react";
import { Sparkles, Loader2, Refrigerator, AlertCircle, CalendarDays, Check, ChevronDown, BookmarkPlus, CalendarCheck, RefreshCw, Pin, X } from "lucide-react";
import { C, cardStyle, buildAssistantPrompt, TODAY, addDays, fmtFull, fmtShort, dayTotals, EMPTY_DAY, picksKey, weekStats } from "../core.js";
import { askAssistant, AssistantError } from "../lib/assistant.js";
import { PantrySheet } from "../sheets/PantrySheet.jsx";
import { VariantChips, applyVariants, variantLabels } from "../components/VariantChips.jsx";

const MODES = [{ k: "day", l: "Une journée" }, { k: "week", l: "Une semaine" }];
const SLOT_ORDER = [["pdj", "Petit-déjeuner"], ["dej", "Déjeuner"], ["diner", "Dîner"], ["snack", "En-cas"]];
const SLOT_SHARE = { pdj: 0.25, dej: 0.32, diner: 0.30, snack: 0.13 }; // budget approx. par créneau (régén. d'un repas)
const SLOT_LABEL = Object.fromEntries(SLOT_ORDER);
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const ingLine = (i) => `${i.qty ? `${i.qty} ` : ""}${i.unit ? `${i.unit} ` : ""}${i.name}`.trim();

// Carte d'OPTION sélectionnable (radio) + variantes (recalcul live). Tap = choisir.
function OptionCard({ meal, selected, onSelect, onSave, saved, varSel, onToggleVar }) {
  const [open, setOpen] = useState(false);
  const detail = meal.ingredients?.length || meal.steps?.length;
  const eff = applyVariants(meal, varSel);
  return (
    <div onClick={onSelect} role="button" className="cursor-pointer rounded-2xl cm-card" style={{ ...cardStyle(), outline: selected ? `2px solid ${C.green}` : `1px solid transparent`, outlineOffset: -1 }}>
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ border: `2px solid ${selected ? C.green : C.muted}`, backgroundColor: selected ? C.green : "transparent" }}>{selected && <Check size={12} className="text-white" />}</span>
        <span className="text-xl leading-none">{meal.emoji || "🍽️"}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-tight" style={{ color: C.ink }}>{meal.title}</p>
          <p className="mt-0.5 text-xs" style={{ color: C.sub }}><span className="font-semibold" style={{ color: C.ink }}>{eff.kcal}</span> kcal · <span className="font-semibold" style={{ color: C.protein }}>{eff.p} g</span>{varSel.size > 0 && <span style={{ color: C.green }}> · ajusté</span>}</p>
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
      <div className="pl-8"><VariantChips variants={meal.variants} sel={varSel} onToggle={onToggleVar} /></div>
    </div>
  );
}

// Planification : propose des OPTIONS par repas (créneaux restants si jour en
// cours, tous sinon). On en sélectionne une par repas, puis « Planifier » valide tout.
export default function PlanScreen({
  targetKcal = 1850, targetP = 150, days = {},
  favorites = [], knownFoods = [], directives = [], onRemoveDirective,
  pantry = [], onAddPantry, onTogglePantry, onUpdatePantry, onRemovePantry,
  onPlanDay, onSaveRecipe,
}) {
  const [mode, setMode] = useState("day");
  const [date, setDate] = useState(TODAY);
  const [pantryOpen, setPantryOpen] = useState(false);
  const [genningDay, setGenningDay] = useState(null); // dayIndex en cours de génération (null = aucun)
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [selected, setSelected] = useState({});   // `${di}-${slot}` → index (−1 = aucun)
  const [varSel, setVarSel] = useState({});       // `${di}-${slot}-${optIdx}` → Set(variantes cochées)
  const [savedKeys, setSavedKeys] = useState(() => new Set());
  const [committedDays, setCommittedDays] = useState(() => new Set()); // dayIndex déjà planifiés
  const [dirOpen, setDirOpen] = useState(false); // consignes repliées par défaut
  const [activeDay, setActiveDay] = useState(0);  // jour affiché (mode semaine)
  const [regenKey, setRegenKey] = useState(null); // `${di}-${slot}` en cours de régénération

  const loggedOf = (iso) => dayTotals(days[iso] || EMPTY_DAY());
  const filledSlots = (iso) => SLOT_ORDER.map(([s]) => s).filter((s) => ((days[iso]?.picks?.[picksKey(s)]) || []).some((it) => !it.planned));
  const emptySlots = (iso) => SLOT_ORDER.map(([s]) => s).filter((s) => !filledSlots(iso).includes(s));
  const dayRem = useMemo(() => { const t = loggedOf(date); return { kcal: targetKcal - t.kcal, p: targetP - t.p }; }, [date, days, targetKcal, targetP]);

  const quick = mode === "day"
    ? [{ iso: TODAY, l: "Aujourd'hui" }, { iso: addDays(TODAY, 1), l: "Demain" }]
    : [{ iso: TODAY, l: "Dès aujourd'hui" }, { iso: addDays(TODAY, 1), l: "Dès demain" }];

  const have = pantry.filter((x) => !x.out).map((x) => ({ name: x.name, qty: x.qty, unit: x.unit, kcal100: x.kcal100, p100: x.p100 }));
  const avoid = pantry.filter((x) => x.out).map((x) => x.name);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => i).filter((di) => emptySlots(addDays(date, di)).length > 0), [date, days]);
  const hasDay = (di) => !!results?.some((m) => (m.dayIndex ?? 0) === di);

  // Génère UNE journée, créneau par créneau EN SÉQUENCE : chaque repas connaît les
  // précédents (déjà loggés + déjà générés) → cohérence ; chaque appel reste petit
  // (1 créneau, 2 options concises) → réponse rapide. Apparition progressive.
  const genDay = async (di) => {
    const iso = mode === "week" ? addDays(date, di) : date;
    const sl = emptySlots(iso);
    if (!sl.length) { setError(new AssistantError(mode === "week" ? "Ce jour est déjà complet." : "Journée déjà complète — tous les repas sont loggés.")); return; }
    setGenningDay(di); setError(null);
    // repart de zéro pour ce jour
    setResults((rs) => (rs || []).filter((mm) => (mm.dayIndex ?? 0) !== di));
    setSelected((sel) => { const n = { ...sel }; Object.keys(n).forEach((k) => { if (k.startsWith(`${di}-`)) delete n[k]; }); return n; });
    setVarSel((m) => { const n = { ...m }; Object.keys(n).forEach((k) => { if (k.startsWith(`${di}-`)) delete n[k]; }); return n; });
    setCommittedDays((x) => { if (!x.has(di)) return x; const n = new Set(x); n.delete(di); return n; });
    try {
      const weekBalance = Math.round(weekStats(days, { kcal: targetKcal }, TODAY, 7).balance);
      const t = loggedOf(iso);
      let remK = targetKcal - t.kcal, remP = targetP - t.p;
      // contexte initial = repas réellement loggés ce jour-là
      const ctx = SLOT_ORDER.flatMap(([s, label]) => ((days[iso]?.picks?.[picksKey(s)]) || []).filter((it) => !it.planned).map((it) => `${label} : ${it.name}`));
      for (const s of sl) {
        const remSlots = sl.slice(sl.indexOf(s));
        const shareSum = remSlots.reduce((a, x) => a + (SLOT_SHARE[x] || 0.25), 0) || 1;
        const sk = Math.max(0, Math.round(remK * (SLOT_SHARE[s] || 0.25) / shareSum));
        const sp = Math.max(0, Math.round(remP * (SLOT_SHARE[s] || 0.25) / shareSum));
        const { system, prompt, mode: m } = buildAssistantPrompt({ mode: "meal", slot: s, remKcal: sk, remP: sp, favorites, knownFoods, have, avoid, weekBalance, dayContext: ctx, directives, count: 2, concise: true });
        const { meals } = await askAssistant({ system, prompt, mode: m });
        const tagged = meals.map((mm) => ({ ...mm, slot: s, dayIndex: di }));
        setResults((rs) => [...(rs || []), ...tagged]); // apparition progressive
        const first = meals[0];
        if (first) { remK -= Math.round(first.kcal); remP -= Math.round(first.protein); ctx.push(`${SLOT_LABEL[s]} : ${first.title}`); }
      }
    } catch (e) {
      setError(e instanceof AssistantError ? e : new AssistantError("Une erreur est survenue."));
    } finally { setGenningDay(null); }
  };

  const keyOf = (m, di, s, i) => `${di}-${s}-${i}-${m.title}`;
  const save = (m, di, s, i) => { onSaveRecipe?.(m); setSavedKeys((x) => new Set(x).add(keyOf(m, di, s, i))); };
  const selK = (di, s) => `${di}-${s}`;
  const selIdx = (di, s) => (selected[selK(di, s)] ?? 0);
  const varKey = (di, s, i) => `${di}-${s}-${i}`;
  const varSelOf = (di, s, i) => varSel[varKey(di, s, i)] || new Set();
  const toggleVar = (di, s, i, vi) => setVarSel((m) => { const k = varKey(di, s, i); const cur = new Set(m[k] || []); cur.has(vi) ? cur.delete(vi) : cur.add(vi); return { ...m, [k]: cur }; });
  const toggleSel = (di, s, i) => {
    setCommittedDays((x) => { if (!x.has(di)) return x; const n = new Set(x); n.delete(di); return n; }); // choix modifié → jour à revalider
    setSelected((m) => ({ ...m, [selK(di, s)]: (m[selK(di, s)] ?? 0) === i ? -1 : i }));
  };

  // Régénère UNIQUEMENT un créneau, sans répéter les options déjà proposées.
  const regenSlot = async (di, s, slotsObj) => {
    const k = `${di}-${s}`;
    setRegenKey(k); setError(null);
    try {
      const prevTitles = (slotsObj[s] || []).map((m) => m.title);
      const weekBalance = Math.round(weekStats(days, { kcal: targetKcal }, TODAY, 7).balance);
      const { system, prompt, mode: m } = buildAssistantPrompt({
        mode: "meal", slot: s,
        remKcal: Math.round(targetKcal * (SLOT_SHARE[s] || 0.25)), remP: Math.round(targetP * (SLOT_SHARE[s] || 0.25)),
        favorites, knownFoods, have, avoid, weekBalance, excludeTitles: prevTitles, directives, count: 2, concise: true,
      });
      const { meals } = await askAssistant({ system, prompt, mode: m });
      setResults((rs) => {
        const keep = rs.filter((mm) => !((mode === "week" ? (mm.dayIndex ?? 0) === di : true) && (mm.slot || "dej") === s));
        const added = meals.map((mm) => ({ ...mm, slot: s, ...(mode === "week" ? { dayIndex: di } : {}) }));
        return [...keep, ...added];
      });
      setSelected((sel) => ({ ...sel, [k]: 0 }));
      setVarSel((m) => { const n = { ...m }; Object.keys(n).forEach((kk) => { if (kk.startsWith(`${di}-${s}-`)) delete n[kk]; }); return n; });
      setCommittedDays((x) => { if (!x.has(di)) return x; const n = new Set(x); n.delete(di); return n; });
    } catch (e) {
      setError(e instanceof AssistantError ? e : new AssistantError("Une erreur est survenue."));
    } finally { setRegenKey(null); }
  };

  const plan = useMemo(() => {
    if (!results) return null;
    const byDay = {};
    results.forEach((m) => { const di = mode === "week" ? (m.dayIndex ?? 0) : 0; const s = m.slot || "dej"; ((byDay[di] ||= {})[s] ||= []).push(m); });
    return Object.entries(byDay).sort((a, b) => a[0] - b[0]).map(([di, slotsObj]) => ({ di: Number(di), slotsObj }));
  }, [results, mode]);

  const slotsIn = (slotsObj) => SLOT_ORDER.filter(([s]) => slotsObj[s]?.length);
  const chosenDay = (di, slotsObj) => slotsIn(slotsObj).filter(([s]) => selIdx(di, s) >= 0).length;
  const commitDay = (di, slotsObj) => {
    const iso = mode === "week" ? addDays(date, di) : date;
    const entries = [];
    slotsIn(slotsObj).forEach(([s]) => {
      const idx = selIdx(di, s); if (idx < 0) return;
      const opt = slotsObj[s][idx]; if (!opt) return;
      const vs = varSelOf(di, s, idx);
      const eff = applyVariants(opt, vs), labels = variantLabels(opt, vs);
      entries.push({ slot: s, meal: { ...opt, kcal: eff.kcal, protein: eff.p, title: labels.length ? `${opt.title} · ${labels.join(", ")}` : opt.title } });
    });
    onPlanDay?.(iso, entries);
    setCommittedDays((x) => new Set(x).add(di));
    // mode semaine : avance au prochain jour non encore planifié
    if (mode === "week" && plan) { const next = plan.find((p) => p.di > di && !committedDays.has(p.di)); if (next) setActiveDay(next.di); }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: C.sub }}>Génère des options par repas, choisis celles qui te plaisent, puis planifie-les. Sur le jour en cours, seuls les repas pas encore faits sont proposés.</p>

      {/* Consignes actives — repliées par défaut : une ligne discrète (l'assistant en tient compte à la génération). */}
      {directives.length > 0 && (
        <div className="rounded-2xl px-3 py-2" style={{ backgroundColor: `${C.accent}10`, border: `1px solid ${C.accent}33` }}>
          <button onClick={() => setDirOpen((o) => !o)} className="flex w-full items-center gap-1.5 active:opacity-70">
            <Pin size={12} style={{ color: C.accent }} />
            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: C.accent }}>{directives.length} consigne{directives.length > 1 ? "s" : ""} · prise{directives.length > 1 ? "s" : ""} en compte</span>
            <ChevronDown size={13} style={{ color: C.accent, marginLeft: "auto", transform: dirOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
          </button>
          {dirOpen && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {directives.map((d) => (
                <span key={d.id} className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }}>
                  {d.text}
                  {onRemoveDirective && <button onClick={() => onRemoveDirective(d.id)} className="shrink-0 active:scale-90" style={{ color: C.muted }} aria-label="Retirer la consigne"><X size={12} /></button>}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

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

      {/* Générer le jour actif (séquentiel, apparition progressive) */}
      {(() => {
        const curDi = mode === "week" ? activeDay : 0;
        const generated = hasDay(curDi), genning = genningDay !== null;
        return (
          <button onClick={() => { if (mode === "week") setActiveDay(0); genDay(mode === "week" ? 0 : 0); }} disabled={genning} className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold active:scale-95 disabled:opacity-70" style={{ backgroundColor: generated ? "transparent" : C.green, color: generated ? C.green : "#fff", border: `1.5px solid ${C.green}` }}>
            {genning ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />}
            {genning ? "L'assistant prépare ta journée…" : generated ? "Régénérer ce jour" : (mode === "day" ? "Proposer ma journée" : "Proposer ma semaine")}
          </button>
        );
      })()}

      {error && (
        <div className="flex items-start gap-2 rounded-2xl cm-card" style={{ backgroundColor: C.card, border: `1px solid ${C.over}` }}>
          <AlertCircle size={16} style={{ color: C.over, flexShrink: 0, marginTop: 1 }} />
          <div className="text-xs" style={{ color: C.sub }}>
            <p className="font-semibold" style={{ color: C.ink }}>{error.message}</p>
            {error.kind === "unconfigured" && <p className="mt-1">Ajoute <code>ANTHROPIC_API_KEY</code> dans Supabase.</p>}
            {error.kind === "offline" && <p className="mt-1">L'assistant ne marche que sur l'app déployée.</p>}
          </div>
        </div>
      )}

      {/* Pager de jours (semaine) : génère à la demande */}
      {mode === "week" && (results || genningDay !== null) && (
        <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {weekDays.map((di) => {
            const on = activeDay === di, done = committedDays.has(di), gen = hasDay(di), busy = genningDay === di;
            return (
              <button key={di} onClick={() => { setActiveDay(di); if (!gen && genningDay === null) genDay(di); }} className="shrink-0 rounded-xl px-3 py-1.5 text-center active:scale-95" style={{ backgroundColor: on ? C.ink : C.card, border: `1px solid ${done ? C.green : C.line}` }}>
                <span className="block text-xs font-bold" style={{ color: on ? C.bg : C.ink }}>{capitalize(fmtShort(addDays(date, di)))}</span>
                <span className="block text-[10px] font-semibold" style={{ color: done ? C.green : (on ? C.bg : C.muted) }}>{busy ? "…" : done ? "✓ planifié" : gen ? "prêt" : "à générer"}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Jour actif */}
      {(() => {
        const curDi = mode === "week" ? activeDay : 0;
        const cur = plan?.find((p) => p.di === curDi);
        const genningCur = genningDay === curDi;
        if (!cur) {
          if (genningCur) return <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin" style={{ color: C.green }} /></div>;
          if (mode === "week" && results) return (
            <button onClick={() => genDay(curDi)} disabled={genningDay !== null} className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold active:scale-95 disabled:opacity-60" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }}>
              <Sparkles size={15} /> Générer le {capitalize(fmtShort(addDays(date, curDi)))}
            </button>
          );
          return null;
        }
        return (
          <div className="space-y-3">
            {slotsIn(cur.slotsObj).map(([s, label]) => (
              <div key={s}>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: C.muted }}>{label}{selIdx(cur.di, s) < 0 && " · ignoré"}</p>
                <div className="space-y-2">
                  {cur.slotsObj[s].map((m, i) => (
                    <OptionCard key={keyOf(m, cur.di, s, i)} meal={m} selected={selIdx(cur.di, s) === i} onSelect={() => toggleSel(cur.di, s, i)} onSave={() => save(m, cur.di, s, i)} saved={savedKeys.has(keyOf(m, cur.di, s, i))} varSel={varSelOf(cur.di, s, i)} onToggleVar={(vi) => toggleVar(cur.di, s, i, vi)} />
                  ))}
                </div>
                <button onClick={() => regenSlot(cur.di, s, cur.slotsObj)} disabled={regenKey === `${cur.di}-${s}` || genningCur} className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold active:scale-95 disabled:opacity-60" style={{ color: C.sub }}>
                  {regenKey === `${cur.di}-${s}` ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Autres idées pour ce repas
                </button>
              </div>
            ))}
            {genningCur && <div className="flex items-center justify-center gap-2 py-1 text-xs" style={{ color: C.muted }}><Loader2 size={14} className="animate-spin" /> Repas suivant…</div>}

            <button onClick={() => commitDay(cur.di, cur.slotsObj)} disabled={chosenDay(cur.di, cur.slotsObj) === 0 || genningCur} className="sticky bottom-24 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white active:scale-95 disabled:opacity-60" style={{ backgroundColor: committedDays.has(cur.di) ? C.green : (chosenDay(cur.di, cur.slotsObj) ? C.accent : C.line), boxShadow: `0 8px 22px -8px ${C.accent}` }}>
              {committedDays.has(cur.di) ? <><Check size={17} /> {mode === "week" ? "Jour planifié ✓" : "Planifié ✓"}</> : <><CalendarCheck size={17} /> Planifier {mode === "week" ? "ce jour" : "ma journée"} ({chosenDay(cur.di, cur.slotsObj)})</>}
            </button>
          </div>
        );
      })()}

      {pantryOpen && <PantrySheet pantry={pantry} onAdd={onAddPantry} onToggle={onTogglePantry} onUpdate={onUpdatePantry} onRemove={onRemovePantry} onClose={() => setPantryOpen(false)} />}
    </div>
  );
}
