import React, { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from "react";
import { Settings2, CalendarDays, TrendingUp, Sun, BookOpen, ChefHat, Soup } from "lucide-react";
import {
  MEALS, SLOTS, store, C, applyTheme, STORE_KEY, LEGACY_KEY, TODAY, addDays, fmtFull, EMPTY_DAY, normPicks, normDays, dayTotals, picksKey, clampQty, DEFAULT_COMBOS, COMBOS_SEED_VERSION, computeTargets, smoothedWeight, buildClaudePrompt, computeAdaptiveTarget, fixClearProteinHistory, newId,
} from "./core.js";
import { getLibrarySync, refreshLibrary } from "./library.js";
import { supabase } from "./supabaseClient.js";
import { pullAll, pushDays, pushWeights, pushAppState, mergeAppState } from "./sync.js";
import { DayScreen, ExtrasSheet } from "./DayScreen.jsx";
import { Deck } from "./Deck.jsx";
// Écrans secondaires & modales lourdes : chargés à la demande (bundle initial allégé).
const JournalScreen = lazy(() => import("./JournalScreen.jsx").then((m) => ({ default: m.JournalScreen })));
const ProgressScreen = lazy(() => import("./ProgressScreen.jsx").then((m) => ({ default: m.ProgressScreen })));
const GuideScreen = lazy(() => import("./GuideScreen.jsx").then((m) => ({ default: m.GuideScreen })));
const IdeasScreen = lazy(() => import("./IdeasScreen.jsx").then((m) => ({ default: m.IdeasScreen })));
const CuisineScreen = lazy(() => import("./CuisineScreen.jsx").then((m) => ({ default: m.CuisineScreen })));
const SettingsSheet = lazy(() => import("./Settings.jsx").then((m) => ({ default: m.SettingsSheet })));
const AccountSheet = lazy(() => import("./AccountSheet.jsx").then((m) => ({ default: m.AccountSheet })));

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
  const [favs, setFavs] = useState([]);                 // ids des recettes favorites (écran Idées)
  const [customRecipes, setCustomRecipes] = useState([]); // recettes perso (écran Idées), fusionnées à la bibliothèque
  const [library, setLibrary] = useState(getLibrarySync); // { presets, recipes } — cache → Supabase
  const [activeDate, setActiveDate] = useState(TODAY);
  const [view, setView] = useState("jour");    // jour | journal | progres
  const [picker, setPicker] = useState(null);
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [session, setSession] = useState(null);          // session Supabase (null = pas connecté)
  const [accountOpen, setAccountOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState("idle");  // idle | syncing | synced | error
  const [syncReady, setSyncReady] = useState(false);     // sync initiale terminée → push autorisé
  const [targetDismissed, setTargetDismissed] = useState(null); // poids pour lequel la suggestion de cible a été masquée

  // Navigation par historique : le geste retour de l'OS remonte dans l'app au lieu de quitter.
  const undoStack = useRef([]);
  const viewRef = useRef("jour");
  useEffect(() => { viewRef.current = view; }, [view]);
  // Bibliothèque presets/recipes : on affiche le cache/snapshot tout de suite,
  // puis on tente un rafraîchissement depuis Supabase en arrière-plan.
  useEffect(() => { let on = true; refreshLibrary().then((lib) => { if (on) setLibrary(lib); }); return () => { on = false; }; }, []);
  const pushNav = useCallback((undo) => { undoStack.current.push(undo); try { window.history.pushState({ cm: undoStack.current.length }, ""); } catch (e) {} }, []);
  const navBack = useCallback(() => { if (undoStack.current.length) window.history.back(); }, []);
  useEffect(() => {
    const onPop = () => { const u = undoStack.current.pop(); if (u) u(); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const go = useCallback((v) => { if (v === viewRef.current) return; const prev = viewRef.current; pushNav(() => setView(prev)); setView(v); }, [pushNav]);
  const openPicker = useCallback((slot, index) => { pushNav(() => setPicker(null)); setPicker({ slot, index }); }, [pushNav]);
  const openSettings = useCallback(() => go("reglages"), [go]);
  const openExtras = useCallback(() => { pushNav(() => setExtrasOpen(false)); setExtrasOpen(true); }, [pushNav]);
  const openAccount = useCallback(() => { pushNav(() => setAccountOpen(false)); setAccountOpen(true); }, [pushNav]);
  // Transition Réglages → Compte : on réutilise l'entrée d'historique des réglages
  // (au lieu d'empiler back()+pushState dans le même tick, qui se télescopaient).
  // Sync : miroir de l'état courant (refs, pour lire des valeurs fraîches dans les callbacks async)
  const stateRef = useRef({});
  const lastSynced = useRef({ days: {}, weights: {}, appState: "" });
  const syncTimer = useRef(null);
  const appStateNow = useCallback(() => { const s = stateRef.current; return { settings: s.settings, templates: s.templates, customMeals: s.customMeals, usage: s.usage, combos: s.combos, shakeBases: s.shakeBases, shakeLiquids: s.shakeLiquids, comboSeed: s.comboSeed, favs: s.favs, customRecipes: s.customRecipes }; }, []);
  const [hydrated, setHydrated] = useState(false);
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    (async () => {
      const d = await store.get(STORE_KEY) || await store.get(LEGACY_KEY);
      if (d) {
        if (d.settings) setSettings(d.settings);
        if (d.days) setDays(fixClearProteinHistory(normDays(d.days)));
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
        if (Array.isArray(d.favs)) setFavs(d.favs);
        if (Array.isArray(d.customRecipes)) setCustomRecipes(d.customRecipes);
        if (d.theme) { applyTheme(d.theme); setTheme(d.theme); }
      } else {
        setCombos(DEFAULT_COMBOS);
      }
      setComboSeed(COMBOS_SEED_VERSION);
      setHydrated(true);
    })();
  }, []);
  useEffect(() => { if (hydrated) store.set(STORE_KEY, { settings, days, weights, theme, templates, customMeals, usage, combos, shakeBases, shakeLiquids, comboSeed, favs, customRecipes }); }, [settings, days, weights, theme, templates, customMeals, usage, combos, shakeBases, shakeLiquids, comboSeed, favs, customRecipes, hydrated]);

  // ── Synchronisation Supabase (offline-first, local-first) ──────────────────
  // Miroir de l'état courant pour lire des valeurs fraîches dans les callbacks async
  useEffect(() => { stateRef.current = { days, weights, settings, templates, customMeals, usage, combos, shakeBases, shakeLiquids, comboSeed, favs, customRecipes }; });

  // Abonnement à la session Supabase
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Sync initiale au login : pull → fusion (remote prioritaire sur recouvrement, on garde le local-only) → push du local-only
  const runInitialSync = useCallback(async (uid) => {
    setSyncStatus("syncing");
    try {
      const remote = await pullAll(uid);
      const localDays = stateRef.current.days || {};
      const localWeights = stateRef.current.weights || {};
      setDays((l) => ({ ...l, ...remote.days }));
      setWeights((l) => ({ ...l, ...remote.weights }));
      // Fusion sans perte : on unionne local + remote (collections par id), on applique, on repousse.
      const merged = mergeAppState(appStateNow(), remote.appState);
      if (merged.settings) setSettings(merged.settings);
      setTemplates(merged.templates);
      setCustomMeals(merged.customMeals);
      setCustomRecipes(merged.customRecipes);
      setUsage(merged.usage);
      setCombos(merged.combos);
      setShakeBases(merged.shakeBases);
      setShakeLiquids(merged.shakeLiquids);
      if (typeof merged.comboSeed === "number") setComboSeed(merged.comboSeed);
      setFavs(merged.favs);
      const onlyDays = {}; for (const k in localDays) if (!(k in remote.days)) onlyDays[k] = localDays[k];
      const onlyWeights = {}; for (const k in localWeights) if (!(k in remote.weights)) onlyWeights[k] = localWeights[k];
      await pushDays(uid, onlyDays);
      await pushWeights(uid, onlyWeights);
      await pushAppState(uid, merged); // repousse l'état fusionné → les ajouts des 2 appareils sont préservés
      lastSynced.current = { days: { ...localDays, ...remote.days }, weights: { ...localWeights, ...remote.weights }, appState: JSON.stringify(merged) };
      setSyncStatus("synced");
    } catch (e) { console.warn("[sync] initial:", e.message); setSyncStatus("error"); }
  }, [appStateNow]);

  // Déclenche la sync initiale une fois connecté + hydraté
  useEffect(() => {
    if (session && hydrated && !syncReady) runInitialSync(session.user.id).then(() => setSyncReady(true));
    if (!session && syncReady) setSyncReady(false);
  }, [session, hydrated, syncReady, runInitialSync]);

  // Push débouncé des changements (diff vs lastSynced)
  const pushChanges = useCallback(async (uid) => {
    const cur = stateRef.current;
    const changedDays = {};
    for (const iso in cur.days) if (JSON.stringify(cur.days[iso]) !== JSON.stringify(lastSynced.current.days[iso])) changedDays[iso] = cur.days[iso];
    const changedWeights = {};
    for (const iso in cur.weights) if (cur.weights[iso] !== lastSynced.current.weights[iso]) changedWeights[iso] = cur.weights[iso];
    const appState = appStateNow();
    const appChanged = JSON.stringify(appState) !== lastSynced.current.appState;
    if (!Object.keys(changedDays).length && !Object.keys(changedWeights).length && !appChanged) return;
    try {
      setSyncStatus("syncing");
      await pushDays(uid, changedDays);
      await pushWeights(uid, changedWeights);
      if (appChanged) await pushAppState(uid, appState);
      lastSynced.current = { days: { ...cur.days }, weights: { ...cur.weights }, appState: JSON.stringify(appState) };
      setSyncStatus("synced");
    } catch (e) { console.warn("[sync] push:", e.message); setSyncStatus("error"); }
  }, [appStateNow]);

  useEffect(() => {
    if (!session || !syncReady) return;
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => pushChanges(session.user.id), 2000);
    return () => clearTimeout(syncTimer.current);
  }, [days, weights, settings, templates, customMeals, usage, combos, shakeBases, shakeLiquids, comboSeed, favs, customRecipes, session, syncReady, pushChanges]);

  useEffect(() => {
    const onOnline = () => { if (session && syncReady) pushChanges(session.user.id); };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [session, syncReady, pushChanges]);

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

  // Ajustement adaptatif de la cible : ancré sur ta maintenance OBSERVÉE (pas une
  // formule figée), pour forcer la continuité de perte, avec garde-fous (BMI/BMR/rythme).
  // On PROPOSE, jamais en silence. Renvoie null tant qu'il n'y a pas assez de recul.
  const targetSuggestion = useMemo(() =>
    computeAdaptiveTarget({ profile: settings.profile, days, weights, currentTarget: settings.kcal, refISO: TODAY }),
    [settings.profile, settings.kcal, days, weights]);

  const applyTargetSuggestion = useCallback(() => {
    if (!targetSuggestion) return;
    setSettings((s) => ({ ...s, kcal: targetSuggestion.kcal, protein: targetSuggestion.protein, profile: { ...s.profile, weight: targetSuggestion.weightNow } }));
  }, [targetSuggestion]);
  const showTargetSuggestion = !!targetSuggestion && targetDismissed !== targetSuggestion.kcal;

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
    setCombos((c) => [{ id: newId("combo"), name: name.trim(), slot, items: clean, created: Date.now() }, ...c].slice(0, 60));
  };
  const deleteCombo = (id) => setCombos((c) => c.filter((x) => x.id !== id));
  const toggleFav = (id) => setFavs((f) => f.includes(id) ? f.filter((x) => x !== id) : [...f, id]);
  const addRecipe = (r) => setCustomRecipes((cur) => [{ ...r, id: newId("rec"), custom: true }, ...cur].slice(0, 200));
  const deleteRecipe = (id) => setCustomRecipes((cur) => cur.filter((x) => x.id !== id));
  // « Ma cuisine » : bibliothèque unifiée (vue dérivée des 3 listes, aucune donnée reshapée).
  const meals = useMemo(() => [
    ...customRecipes.map((r) => ({ ...r, kind: "recette" })),
    ...combos.map((c) => { const t = (c.items || []).reduce((a, i) => ({ k: a.k + i.kcal * (i.qty || 1), p: a.p + i.p * (i.qty || 1) }), { k: 0, p: 0 }); return { ...c, kind: "combo", kcal: Math.round(t.k), p: Math.round(t.p) }; }),
    ...customMeals.map((m) => ({ ...m, kind: "aliment" })),
  ], [customRecipes, combos, customMeals]);
  const deleteMeal = (m) => { if (m.kind === "recette") deleteRecipe(m.id); else if (m.kind === "combo") deleteCombo(m.id); else deleteCustomMeal(m.id); };
  const useMealEntry = (m) => {
    if (m.kind === "combo") { const slot = m.slot || "dej", key = picksKey(slot); setDay((d) => ({ ...d, picks: { ...d.picks, [key]: [...(d.picks[key] || []), ...(m.items || []).map((it) => ({ ...it, qty: it.qty || 1 }))].slice(0, 8) } })); (m.items || []).forEach((it) => bumpUsage(it.name)); return; }
    const slot = m.kind === "recette" ? (m.cat || "dej") : (m.slots && m.slots[0]) || "dej", key = picksKey(slot);
    setDay((d) => ({ ...d, picks: { ...d.picks, [key]: [...(d.picks[key] || []), { name: m.name, kcal: m.kcal, p: m.p, qty: 1 }].slice(0, 8) } }));
    bumpUsage(m.name);
  };
  const useIdea = (idea) => {
    const slot = idea.cat, key = picksKey(slot);
    const item = { name: idea.name, kcal: idea.kcal, p: idea.p, qty: 1 };
    setDay((d) => { const arr = [...(d.picks[key] || []), item]; return { ...d, picks: { ...d.picks, [key]: arr.slice(0, CAP[slot] || 8) } }; });
    bumpUsage(idea.name);
  };
  const addShakeBase = (it) => setShakeBases((a) => [...a, { id: newId("sb"), name: it.name, kcal: it.kcal, p: it.p }]);
  const delShakeBase = (id) => setShakeBases((a) => a.filter((x) => x.id !== id));
  const addShakeLiquid = (it) => setShakeLiquids((a) => [...a, { id: newId("sl"), name: it.name, kcal: it.kcal, p: it.p }]);
  const delShakeLiquid = (id) => setShakeLiquids((a) => a.filter((x) => x.id !== id));
  const setQty = (slot, index, value) => setDay((d) => { const key = picksKey(slot); return { ...d, picks: { ...d.picks, [key]: (d.picks[key] || []).map((m, i) => i === index ? { ...m, qty: clampQty(value) } : m) } }; });
  const editItem = (slot, index, patch) => setDay((d) => { const key = picksKey(slot); return { ...d, picks: { ...d.picks, [key]: (d.picks[key] || []).map((m, i) => i === index ? { ...m, ...patch } : m) } }; });
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
    setTemplates((t) => [...t, { id: newId("tpl"), name: name.trim() || "Modèle", picks: clone(cur.picks), skipBreakfast: !!cur.skipBreakfast, training: !!cur.training }]);
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
    if (Array.isArray(obj.favs)) setFavs((prev) => Array.from(new Set([...prev, ...obj.favs])));
    if (Array.isArray(obj.customRecipes)) setCustomRecipes((prev) => { const ids = new Set(prev.map((x) => x.id)); return [...prev, ...obj.customRecipes.filter((x) => !ids.has(x.id))]; });
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

        <Suspense fallback={<ScreenFallback />}>
        {view === "jour" && (
          <DayScreen
            activeDate={activeDate} setActiveDate={setActiveDate}
            settings={settings} totals={totals} remKcal={remKcal} remP={remP}
            days={days} weights={weights} onOpenWeek={() => go("progres")} onSaveCombo={saveCombo}
            picks={picks} skipBreakfast={skipBreakfast} slotTarget={slotTarget}
            training={training} onToggleTraining={toggleTraining}
            weight={weights[activeDate]} onWeight={(kg) => setWeight(activeDate, kg)}
            onPick={openPicker}
            onSurprise={surprise} onClear={clearSlot} onQty={setQty} onEditItem={editItem} onSkip={toggleSkip}
            onAddExtra={addExtra} onRemoveExtra={removeExtra} onOpenExtras={openExtras} onReset={resetDay}
            templates={templates} hasPrevDay={!!days[addDays(activeDate, -1)]}
            onCopyPrev={copyPrevDay} onSaveTemplate={saveTemplate} onLoadTemplate={loadTemplate} onDeleteTemplate={deleteTemplate}
            targetSuggestion={showTargetSuggestion ? targetSuggestion : null}
            onApplyTarget={applyTargetSuggestion} onDismissTarget={() => setTargetDismissed(targetSuggestion.kcal)}
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
        {view === "cuisine" && (
          <CuisineScreen meals={meals} onUse={useMealEntry} onDelete={deleteMeal} onAddRecipe={addRecipe} />
        )}
        {view === "reglages" && (
          <SettingsSheet settings={settings} setSettings={setSettings} theme={theme} onTheme={switchTheme} allData={{ settings, days, weights, theme, templates, customMeals, usage, combos, shakeBases, shakeLiquids, favs }} customMeals={customMeals} onDeleteCustom={deleteCustomMeal} onUpdateCustom={updateCustomMeal} onImport={importData} onOpenAccount={openAccount} onOpenGuide={() => go("guide")} onClose={navBack} />
        )}
        {view === "idees" && (
          <IdeasScreen ideas={[...customRecipes, ...library.recipes]} favs={favs} onToggleFav={toggleFav} onUse={useIdea} onSave={(idea) => saveCombo(idea.cat, [{ name: idea.name, kcal: idea.kcal, p: idea.p, qty: 1 }], idea.name)}
            onAddRecipe={addRecipe} onDeleteRecipe={deleteRecipe}
            remKcal={remKcal} remP={remP} dateLabel={fmtFull(activeDate)}
            claudePrompt={buildClaudePrompt({ customMeals, remKcal, remP, dateLabel: fmtFull(activeDate) })} />
        )}
        </Suspense>
      </div>

      {/* Navigation */}
      <TabBar view={view} setView={go} />

      {picker && (
        <Deck slotKey={picker.slot} rankFor={rankFor} fitOf={fitOf} slotTarget={slotTarget(picker.slot)} pool={[...MEALS, ...customMeals]} usage={usage} combos={combos} onChoose={choose} onApplyCombo={applyCombo} onDeleteCombo={deleteCombo} shakeBases={shakeBases} shakeLiquids={shakeLiquids} onAddShakeBase={addShakeBase} onDelShakeBase={delShakeBase} onAddShakeLiquid={addShakeLiquid} onDelShakeLiquid={delShakeLiquid} onSave={saveCustomMeal} onDeleteCustom={deleteCustomMeal} onClose={navBack} />
      )}
      {extrasOpen && (
        <ExtrasSheet presets={library.presets} onAdd={addExtra} onClose={navBack} />
      )}
      <Suspense fallback={null}>
        {accountOpen && (
          <AccountSheet session={session} status={syncStatus} onClose={navBack} />
        )}
      </Suspense>
    </div>
  );
}

// ── Navigation par onglets ──────────────────────────────────────────────────

function ScreenFallback() {
  return (
    <div className="flex justify-center py-24">
      <div className="h-6 w-6 animate-spin rounded-full" style={{ border: `2px solid ${C.line}`, borderTopColor: C.green }} />
    </div>
  );
}

function TabBar({ view, setView }) {
  const tabs = [
    { k: "jour", l: "Jour", icon: Sun },
    { k: "journal", l: "Journal", icon: CalendarDays },
    { k: "progres", l: "Progrès", icon: TrendingUp },
    { k: "cuisine", l: "Cuisine", icon: Soup },
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

