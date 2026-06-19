import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Settings2, CalendarDays, TrendingUp, Sun, BookOpen, ChefHat } from "lucide-react";
import {
  MEALS, SLOTS, store, C, applyTheme, STORE_KEY, LEGACY_KEY, TODAY, addDays, fmtFull, EMPTY_DAY, normPicks, normDays, dayTotals, picksKey, clampQty, DEFAULT_COMBOS, COMBOS_SEED_VERSION, MEAL_IDEAS,
} from "./core.js";
import { DayScreen } from "./DayScreen.jsx";
import { JournalScreen } from "./JournalScreen.jsx";
import { ProgressScreen } from "./ProgressScreen.jsx";
import { GuideScreen } from "./GuideScreen.jsx";
import { Deck } from "./Deck.jsx";
import { IdeasScreen } from "./IdeasScreen.jsx";
import { SettingsSheet } from "./Settings.jsx";

export default function PiocheRepas() {
  const [settings, setSettings] = useState({ kcal: 1850, protein: 150 });
  const [days, setDays] = useState({});       // { iso: {picks, skipBreakfast} }
  const [weights, setWeights] = useState({});  // { iso: kg }
  const [templates, setTemplates] = useState([]); // [{id,name,picks,skipBreakfast}]
  const [customMeals, setCustomMeals] = useState([]); // produits enregistrés (Open Food Facts / manuels)
  const [usage, setUsage] = useState({});      // { name: { count, last } } — fréquents/récents
  const [combos, setCombos] = useState([]);    // [{ id, name, slot, items:[{name,kcal,p,qty}], created }]
  const [shakeBases, setShakeBases] = useState([]);     // bases shake perso
  const [shakeLiquids, setShakeLiquids] = useState([]); // liquides shake perso
  const [comboSeed, setComboSeed] = useState(0);        // version des presets installés
  const [activeDate, setActiveDate] = useState(TODAY);
  const [view, setView] = useState("jour");    // jour | journal | progres
  const [picker, setPicker] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  // Navigation par historique : le geste retour de l'OS remonte dans l'app au lieu de quitter.
  const undoStack = useRef([]);
  const viewRef = useRef("jour");
  useEffect(() => { viewRef.current = view; }, [view]);
  const pushNav = useCallback((undo) => { undoStack.current.push(undo); try { window.history.pushState({ cm: undoStack.current.length }, ""); } catch (e) {} }, []);
  const navBack = useCallback(() => { if (undoStack.current.length) window.history.back(); }, []);
  useEffect(() => {
    const onPop = () => { const u = undoStack.current.pop(); if (u) u(); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const go = useCallback((v) => { if (v === viewRef.current) return; const prev = viewRef.current; pushNav(() => setView(prev)); setView(v); }, [pushNav]);
  const openPicker = useCallback((slot, index) => { pushNav(() => setPicker(null)); setPicker({ slot, index }); }, [pushNav]);
  const openSettings = useCallback(() => { pushNav(() => setShowSettings(false)); setShowSettings(true); }, [pushNav]);
  const [hydrated, setHydrated] = useState(false);
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    (async () => {
      const d = await store.get(STORE_KEY) || await store.get(LEGACY_KEY);
      if (d) {
        if (d.settings) setSettings(d.settings);
        if (d.days) setDays(normDays(d.days));
        if (d.weights) setWeights(d.weights);
        if (Array.isArray(d.templates)) setTemplates(d.templates.map((t) => ({ ...t, picks: normPicks(t.picks), skipBreakfast: !!t.skipBreakfast, training: !!t.training })));
        if (Array.isArray(d.customMeals)) setCustomMeals(d.customMeals);
        if (d.usage && typeof d.usage === "object") setUsage(d.usage);
        if (Array.isArray(d.combos)) {
          let cs = d.combos;
          if ((d.comboSeed || 0) < COMBOS_SEED_VERSION) {
            cs = cs.filter((c) => !String(c.id).startsWith("combo-def-")); // retire les anciens presets
            const have = new Set(cs.map((c) => c.id));
            cs = [...DEFAULT_COMBOS.filter((c) => !have.has(c.id)), ...cs]; // ajoute les nouveaux
          }
          setCombos(cs);
        } else { setCombos(DEFAULT_COMBOS); }
        if (Array.isArray(d.shakeBases)) setShakeBases(d.shakeBases);
        if (Array.isArray(d.shakeLiquids)) setShakeLiquids(d.shakeLiquids);
        if (d.theme) { applyTheme(d.theme); setTheme(d.theme); }
      } else {
        setCombos(DEFAULT_COMBOS);
      }
      setComboSeed(COMBOS_SEED_VERSION);
      setHydrated(true);
    })();
  }, []);
  useEffect(() => { if (hydrated) store.set(STORE_KEY, { settings, days, weights, theme, templates, customMeals, usage, combos, shakeBases, shakeLiquids, comboSeed }); }, [settings, days, weights, theme, templates, customMeals, usage, combos, shakeBases, shakeLiquids, comboSeed, hydrated]);

  const switchTheme = (t) => { applyTheme(t); setTheme(t); };

  useEffect(() => {
    try {
      if (document.getElementById("pioche-fonts")) return;
      const l = document.createElement("link");
      l.id = "pioche-fonts"; l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap";
      document.head.appendChild(l);
    } catch (_) {}
  }, []);

  const day = days[activeDate] || EMPTY_DAY();
  const picks = day.picks;
  const skipBreakfast = day.skipBreakfast;
  const training = day.training;

  const setDay = useCallback((updater) => {
    setDays((prev) => {
      const cur = prev[activeDate] || EMPTY_DAY();
      const next = typeof updater === "function" ? updater(cur) : updater;
      return { ...prev, [activeDate]: next };
    });
  }, [activeDate]);

  const totals = useMemo(() => dayTotals(day), [day]);
  const remKcal = settings.kcal - totals.kcal;
  const remP = settings.protein - totals.p;

  const emptyPlanned = useMemo(() => {
    const list = [];
    if (!skipBreakfast && picks.pdj.length === 0) list.push("pdj");
    if (picks.dej.length === 0) list.push("dej");
    if (picks.diner.length === 0) list.push("diner");
    if (picks.snacks.length === 0) list.push("snack");
    return list;
  }, [skipBreakfast, picks]);

  const slotTarget = useCallback((slotKey) => {
    const pool = emptyPlanned.reduce((s, k) => s + SLOTS[k].weight, 0) || SLOTS[slotKey].weight;
    const w = SLOTS[slotKey].weight / pool;
    return { kcal: Math.max(0, remKcal) * w, p: Math.max(0, remP) * w };
  }, [emptyPlanned, remKcal, remP]);

  const fitOf = useCallback((meal) => {
    const projected = totals.kcal + meal.kcal;
    if (projected <= settings.kcal * 1.04) return "ok";
    if (projected <= settings.kcal * 1.14) return "rich";
    return "over";
  }, [totals.kcal, settings.kcal]);

  const rankFor = useCallback((slotKey, list) => {
    const t = slotTarget(slotKey);
    const score = (m) => -Math.abs(m.kcal - t.kcal) + m.p * 6;
    return [...list].sort((a, b) => score(b) - score(a));
  }, [slotTarget]);

  // mutateurs (sur le jour actif) — chaque créneau est une liste
  const CAP = { pdj: 8, dej: 8, diner: 8, snack: 4 };
  const bumpUsage = (name) => { if (!name) return; setUsage((u) => ({ ...u, [name]: { count: (u[name]?.count || 0) + 1, last: Date.now() } })); };
  const choose = (meal) => {
    if (!picker) return;
    const raw = picker.slot, key = picksKey(raw);
    setDay((d) => {
      const arr = [...(d.picks[key] || [])];
      const item = { ...meal, qty: 1 };
      if (picker.index != null) arr[picker.index] = item; else arr.push(item);
      return { ...d, picks: { ...d.picks, [key]: arr.slice(0, CAP[raw] || 8) } };
    });
    bumpUsage(meal.name);
    navBack();
  };
  const applyCombo = (combo) => {
    if (!picker || !combo || !combo.items || !combo.items.length) return;
    const raw = picker.slot, key = picksKey(raw);
    setDay((d) => {
      const arr = [...(d.picks[key] || []), ...combo.items.map((m) => ({ ...m, qty: m.qty || 1 }))];
      return { ...d, picks: { ...d.picks, [key]: arr.slice(0, CAP[raw] || 8) } };
    });
    combo.items.forEach((m) => bumpUsage(m.name));
    navBack();
  };
  const saveCombo = (slot, items, name) => {
    const clean = (items || []).map((m) => ({ name: m.name, kcal: m.kcal, p: m.p, qty: m.qty || 1 }));
    if (!clean.length || !name || !name.trim()) return;
    setCombos((c) => [{ id: `combo-${Date.now()}`, name: name.trim(), slot, items: clean, created: Date.now() }, ...c].slice(0, 60));
  };
  const deleteCombo = (id) => setCombos((c) => c.filter((x) => x.id !== id));
  const useIdea = (idea) => {
    const slot = idea.cat, key = picksKey(slot);
    const item = { name: idea.name, kcal: idea.kcal, p: idea.p, qty: 1 };
    setDay((d) => { const arr = [...(d.picks[key] || []), item]; return { ...d, picks: { ...d.picks, [key]: arr.slice(0, CAP[slot] || 8) } }; });
    bumpUsage(idea.name);
  };
  const addShakeBase = (it) => setShakeBases((a) => [...a, { id: `sb-${Date.now()}`, name: it.name, kcal: it.kcal, p: it.p }]);
  const delShakeBase = (id) => setShakeBases((a) => a.filter((x) => x.id !== id));
  const addShakeLiquid = (it) => setShakeLiquids((a) => [...a, { id: `sl-${Date.now()}`, name: it.name, kcal: it.kcal, p: it.p }]);
  const delShakeLiquid = (id) => setShakeLiquids((a) => a.filter((x) => x.id !== id));
  const setQty = (slot, index, value) => setDay((d) => { const key = picksKey(slot); return { ...d, picks: { ...d.picks, [key]: (d.picks[key] || []).map((m, i) => i === index ? { ...m, qty: clampQty(value) } : m) } }; });
  const clearSlot = (slot, index) => setDay((d) => { const key = picksKey(slot); return { ...d, picks: { ...d.picks, [key]: (d.picks[key] || []).filter((_, i) => i !== index) } }; });
  const addExtra = (extra) => setDay((d) => ({ ...d, picks: { ...d.picks, extras: [...(d.picks.extras || []), { ...extra, qty: 1 }] } }));
  const removeExtra = (i) => setDay((d) => ({ ...d, picks: { ...d.picks, extras: (d.picks.extras || []).filter((_, idx) => idx !== i) } }));
  const toggleSkip = () => setDay((d) => ({ skipBreakfast: !d.skipBreakfast, picks: d.skipBreakfast ? d.picks : { ...d.picks, pdj: [] } }));
  const toggleTraining = () => setDay((d) => ({ ...d, training: !d.training }));
  const surprise = (slotKey) => {
    const pool = rankFor(slotKey, MEALS.filter((m) => m.slots.includes(slotKey)));
    const good = pool.filter((m) => fitOf(m) === "ok");
    const from = (good.length ? good : pool).slice(0, 6);
    const pick = from[Math.floor(Math.random() * from.length)];
    if (!pick) return;
    const key = picksKey(slotKey);
    setDay((d) => ({ ...d, picks: { ...d.picks, [key]: [...(d.picks[key] || []), { ...pick, qty: 1 }].slice(0, CAP[slotKey] || 8) } }));
  };
  const resetDay = () => setDay((d) => ({ ...EMPTY_DAY() }));

  const clone = (x) => JSON.parse(JSON.stringify(x));
  const copyPrevDay = () => {
    const prev = days[addDays(activeDate, -1)];
    if (prev) setDay(() => clone(prev));
  };
  const saveTemplate = (name) => {
    const cur = days[activeDate] || EMPTY_DAY();
    setTemplates((t) => [...t, { id: `tpl-${Date.now()}`, name: name.trim() || "Modèle", picks: clone(cur.picks), skipBreakfast: !!cur.skipBreakfast, training: !!cur.training }]);
  };
  const loadTemplate = (id) => {
    const t = templates.find((x) => x.id === id);
    if (t) setDay(() => ({ picks: clone(t.picks), skipBreakfast: !!t.skipBreakfast, training: !!t.training }));
  };
  const deleteTemplate = (id) => setTemplates((t) => t.filter((x) => x.id !== id));
  const saveCustomMeal = (meal) => setCustomMeals((cur) => {
    const m = { ...meal, slots: meal.slots || ["pdj", "dej", "diner", "snack"], tags: meal.tags || [], desc: meal.desc || "Enregistré", custom: true };
    const others = cur.filter((x) => x.id !== m.id);
    return [m, ...others].slice(0, 200);
  });
  const deleteCustomMeal = (id) => setCustomMeals((cur) => cur.filter((x) => x.id !== id));
  const updateCustomMeal = (id, patch) => setCustomMeals((cur) => cur.map((x) => x.id === id ? { ...x, ...patch } : x));
  const setWeight = (iso, kg) => setWeights((w) => {
    const n = { ...w };
    if (kg == null || isNaN(kg)) delete n[iso]; else n[iso] = kg;
    return n;
  });

  const goToDay = (iso) => { setActiveDate(iso); go("jour"); };

  const importData = (obj) => {
    if (obj.settings && typeof obj.settings === "object") setSettings(obj.settings);
    if (obj.days && typeof obj.days === "object") setDays((prev) => ({ ...prev, ...normDays(obj.days) }));
    if (obj.weights && typeof obj.weights === "object") setWeights((prev) => ({ ...prev, ...obj.weights }));
    if (Array.isArray(obj.customMeals)) setCustomMeals((prev) => { const ids = new Set(prev.map((x) => x.id)); return [...prev, ...obj.customMeals.filter((x) => !ids.has(x.id))]; });
    if (Array.isArray(obj.combos)) setCombos((prev) => { const ids = new Set(prev.map((x) => x.id)); return [...prev, ...obj.combos.filter((x) => !ids.has(x.id))]; });
    if (Array.isArray(obj.shakeBases)) setShakeBases((prev) => { const ids = new Set(prev.map((x) => x.id)); return [...prev, ...obj.shakeBases.filter((x) => !ids.has(x.id))]; });
    if (Array.isArray(obj.shakeLiquids)) setShakeLiquids((prev) => { const ids = new Set(prev.map((x) => x.id)); return [...prev, ...obj.shakeLiquids.filter((x) => !ids.has(x.id))]; });
    if (obj.usage && typeof obj.usage === "object") setUsage((prev) => ({ ...prev, ...obj.usage }));
  };

  return (
    <div className="min-h-screen w-full" style={{ color: C.ink, fontFamily: "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif" }}>
      <div className="mx-auto w-full max-w-md px-4 pt-6" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 6rem)" }}>
        {/* Marque */}
        <header className="mb-5 flex items-center justify-between">
          <span className="text-lg font-extrabold tracking-tight" style={{ fontFamily: "'Space Grotesk', ui-sans-serif, system-ui" }}>Croque<span style={{ color: C.green }}>·</span>Macro</span>
          <button onClick={openSettings} className="flex h-10 w-10 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }}>
            <Settings2 size={18} />
          </button>
        </header>

        {view === "jour" && (
          <DayScreen
            activeDate={activeDate} setActiveDate={setActiveDate}
            settings={settings} totals={totals} remKcal={remKcal} remP={remP}
            days={days} weights={weights} onOpenWeek={() => go("progres")} onSaveCombo={saveCombo}
            picks={picks} skipBreakfast={skipBreakfast} slotTarget={slotTarget}
            training={training} onToggleTraining={toggleTraining}
            weight={weights[activeDate]} onWeight={(kg) => setWeight(activeDate, kg)}
            onPick={openPicker}
            onSurprise={surprise} onClear={clearSlot} onQty={setQty} onSkip={toggleSkip}
            onAddExtra={addExtra} onRemoveExtra={removeExtra} onReset={resetDay}
            templates={templates} hasPrevDay={!!days[addDays(activeDate, -1)]}
            onCopyPrev={copyPrevDay} onSaveTemplate={saveTemplate} onLoadTemplate={loadTemplate} onDeleteTemplate={deleteTemplate}
          />
        )}
        {view === "journal" && (
          <JournalScreen days={days} weights={weights} settings={settings} onOpen={goToDay} activeDate={activeDate} />
        )}
        {view === "progres" && (
          <ProgressScreen days={days} weights={weights} settings={settings} />
        )}
        {view === "guide" && (
          <GuideScreen onAddExtra={addExtra} dateLabel={fmtFull(activeDate)} settings={settings} />
        )}
      </div>

      {/* Navigation */}
        {view === "idees" && (
          <IdeasScreen ideas={MEAL_IDEAS} onUse={useIdea} onSave={(idea) => saveCombo(idea.cat, [{ name: idea.name, kcal: idea.kcal, p: idea.p, qty: 1 }], idea.name)} />
        )}
      <TabBar view={view} setView={go} />

      {picker && (
        <Deck slotKey={picker.slot} rankFor={rankFor} fitOf={fitOf} slotTarget={slotTarget(picker.slot)} pool={[...MEALS, ...customMeals]} usage={usage} combos={combos} onChoose={choose} onApplyCombo={applyCombo} onDeleteCombo={deleteCombo} shakeBases={shakeBases} shakeLiquids={shakeLiquids} onAddShakeBase={addShakeBase} onDelShakeBase={delShakeBase} onAddShakeLiquid={addShakeLiquid} onDelShakeLiquid={delShakeLiquid} onSave={saveCustomMeal} onDeleteCustom={deleteCustomMeal} onClose={navBack} />
      )}
      {showSettings && (
        <SettingsSheet settings={settings} setSettings={setSettings} theme={theme} onTheme={switchTheme} allData={{ settings, days, weights, theme, templates, customMeals, usage, combos, shakeBases, shakeLiquids }} customMeals={customMeals} onDeleteCustom={deleteCustomMeal} onUpdateCustom={updateCustomMeal} onImport={importData} onClose={navBack} />
      )}
    </div>
  );
}

// ── Navigation par onglets ──────────────────────────────────────────────────


function TabBar({ view, setView }) {
  const tabs = [
    { k: "jour", l: "Jour", icon: Sun },
    { k: "journal", l: "Journal", icon: CalendarDays },
    { k: "progres", l: "Progrès", icon: TrendingUp },
    { k: "guide", l: "Guide", icon: BookOpen },
    { k: "idees", l: "Idées", icon: ChefHat },
  ];
  return (
    <div className="fixed inset-x-0 bottom-0 z-20" style={{ backgroundColor: C.nav, backdropFilter: "blur(12px)", borderTop: `1px solid ${C.line}`, paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="mx-auto flex max-w-md">
        {tabs.map((t) => {
          const Icon = t.icon, active = view === t.k;
          return (
            <button key={t.k} onClick={() => setView(t.k)} className="flex flex-1 flex-col items-center gap-0.5 py-2.5 active:scale-95" style={{ color: active ? C.ink : C.muted }}>
              <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
              <span className="text-xs font-semibold" style={{ opacity: active ? 1 : 0.8 }}>{t.l}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  ÉCRAN JOUR
// ════════════════════════════════════════════════════════════════════════════

