import React, { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef, lazy, Suspense } from "react";
import { Settings2, SlidersHorizontal, CalendarDays, TrendingUp, Sun, BookOpen, CalendarRange, Soup, ScanLine, ChevronLeft, ChevronRight, Plus, Lightbulb, Refrigerator, Dumbbell } from "lucide-react";
import {
  SLOTS, store, C, applyTheme, STORE_KEY, LEGACY_KEY, TODAY, addDays, fmtFull, parseISO, EMPTY_DAY, normPicks, normDays, dayTotals, plannedTotals, picksKey, clampQty, DEFAULT_COMBOS, COMBOS_SEED_VERSION, computeTargets, smoothedWeight, buildClaudePrompt, computeAdaptiveTarget, observedTrend, fixClearProteinHistory, newId, weekStats, weekCoach,
} from "./core.js";
import { calcCurrentWeekFromStart, SESSION_ORDER, SESSIONS, recompSignal } from "./lib/sport.js";
import { loadLive } from "./sport/liveSession.js";
import { getLibrarySync, refreshLibrary } from "./lib/library.js";
import { supabase } from "./lib/supabaseClient.js";
import { pullAll, pushDays, pushWeights, pushAppState, pushWorkouts, deleteWorkout as deleteWorkoutRow, mergeAppState } from "./lib/sync.js";
import { DayScreen } from "./screens/DayScreen.jsx";
import { Deck } from "./components/Deck.jsx";
import OffSearch from "./components/OffSearch.jsx";
import { Sheet } from "./components/Sheet.jsx";
import { Toast } from "./components/Toast.jsx";
import { AuthGate } from "./screens/AuthGate.jsx";
import { MealSuggestSheet } from "./sheets/MealSuggestSheet.jsx";
import { QuickLogSheet } from "./sheets/QuickLogSheet.jsx";
import { PantrySheet } from "./sheets/PantrySheet.jsx";
import { SectionTitle } from "./components/ui.jsx";
// Écrans secondaires & modales lourdes : chargés à la demande (bundle initial allégé).
const JournalScreen = lazy(() => import("./screens/JournalScreen.jsx").then((m) => ({ default: m.JournalScreen })));
const ProgressScreen = lazy(() => import("./screens/ProgressScreen.jsx").then((m) => ({ default: m.ProgressScreen })));
const GuideScreen = lazy(() => import("./screens/GuideScreen.jsx").then((m) => ({ default: m.GuideScreen })));
const PlanScreen = lazy(() => import("./screens/PlanScreen.jsx"));
const CuisineScreen = lazy(() => import("./screens/CuisineScreen.jsx").then((m) => ({ default: m.CuisineScreen })));
const SportScreen = lazy(() => import("./sport/SportScreen.jsx").then((m) => ({ default: m.SportScreen })));
const SettingsSheet = lazy(() => import("./screens/Settings.jsx").then((m) => ({ default: m.SettingsSheet })));
const AccountSheet = lazy(() => import("./sheets/AccountSheet.jsx").then((m) => ({ default: m.AccountSheet })));

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
  const [pantry, setPantry] = useState([]);             // frigo/placard : [{ id, name, out }] — out=true = pas dispo aujourd'hui
  const [workouts, setWorkouts] = useState({});         // séances loggées : { id: { date, sessionId, week, data… } } — table workout_logs
  const [sport, setSport] = useState({});               // config sport (blob app_state.sport) : { startDate, currentWeek, preferences… }
  const [ideaSlot, setIdeaSlot] = useState(null);       // créneau pour lequel l'idée contextuelle est ouverte (écran Jour)
  const [library, setLibrary] = useState(getLibrarySync); // { presets, recipes } — cache → Supabase
  const [activeDate, setActiveDate] = useState(TODAY);
  const [view, setView] = useState("jour");    // jour | journal | progres
  const [picker, setPicker] = useState(null);
  const [toolOpen, setToolOpen] = useState(false);
  const [toast, setToast] = useState(null);             // { msg, undo }
  const showToast = useCallback((msg, undo) => setToast({ msg, undo, id: Date.now() }), []);
  const [quickLogOpen, setQuickLogOpen] = useState(false); // log rapide photo / texte
  const [frigoOpen, setFrigoOpen] = useState(false);    // gestion du frigo/placard (accès global)
  const [cuisineAdd, setCuisineAdd] = useState(false);  // signal : ouvrir le formulaire « ajouter recette » en arrivant sur Cuisine
  const [session, setSession] = useState(null);          // session Supabase (null = pas connecté)
  const [sessionChecked, setSessionChecked] = useState(false); // getSession résolu → on peut décider gate vs app
  const [accountOpen, setAccountOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState("idle");  // idle | syncing | synced | error
  const [syncReady, setSyncReady] = useState(false);     // sync initiale terminée → push autorisé
  const [targetDismissed, setTargetDismissed] = useState(null); // poids pour lequel la suggestion de cible a été masquée
  const [screenHeader, setScreenHeader] = useState(null); // header dynamique fourni par l'écran courant : { title, subtitle, badge, onSettings, onBack }
  const headerRef = useRef(null);
  const [headerH, setHeaderH] = useState(60); // hauteur du header fixe (mesurée) → décalage du contenu

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
  // Au démarrage : si une séance était en cours (PWA tuée en arrière-plan), on ouvre
  // directement l'onglet Sport pour la reprendre.
  useEffect(() => { if (loadLive()) setView("sport"); }, []);
  // Hauteur du header fixe → décalage du contenu (re-mesure quand le header change).
  useLayoutEffect(() => { if (headerRef.current) setHeaderH(headerRef.current.offsetHeight); }, [view, screenHeader, session]);
  const go = useCallback((v) => { if (v === viewRef.current) return; const prev = viewRef.current; pushNav(() => setView(prev)); setView(v); }, [pushNav]);
  const openPicker = useCallback((slot, index) => { pushNav(() => setPicker(null)); setPicker({ slot, index }); }, [pushNav]);
  const openSettings = useCallback(() => go("reglages"), [go]);
  const openAccount = useCallback(() => { pushNav(() => setAccountOpen(false)); setAccountOpen(true); }, [pushNav]);
  const openTool = useCallback(() => { pushNav(() => setToolOpen(false)); setToolOpen(true); }, [pushNav]);
  const openFrigo = useCallback(() => { pushNav(() => setFrigoOpen(false)); setFrigoOpen(true); }, [pushNav]);
  // Transition Réglages → Compte : on réutilise l'entrée d'historique des réglages
  // (au lieu d'empiler back()+pushState dans le même tick, qui se télescopaient).
  // Sync : miroir de l'état courant (refs, pour lire des valeurs fraîches dans les callbacks async)
  const stateRef = useRef({});
  const lastSynced = useRef({ days: {}, weights: {}, workouts: {}, appState: "" });
  const syncTimer = useRef(null);
  const appStateNow = useCallback(() => { const s = stateRef.current; return { settings: s.settings, templates: s.templates, customMeals: s.customMeals, usage: s.usage, combos: s.combos, shakeBases: s.shakeBases, shakeLiquids: s.shakeLiquids, comboSeed: s.comboSeed, favs: s.favs, customRecipes: s.customRecipes, pantry: s.pantry, sport: s.sport }; }, []);
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
        if (Array.isArray(d.pantry)) setPantry(d.pantry);
        if (d.workouts && typeof d.workouts === "object") setWorkouts(d.workouts);
        if (d.sport && typeof d.sport === "object") setSport(d.sport);
        if (d.theme) { applyTheme(d.theme); setTheme(d.theme); }
      } else {
        setCombos(DEFAULT_COMBOS);
      }
      setComboSeed(COMBOS_SEED_VERSION);
      setHydrated(true);
    })();
  }, []);
  useEffect(() => { if (hydrated) store.set(STORE_KEY, { settings, days, weights, theme, templates, customMeals, usage, combos, shakeBases, shakeLiquids, comboSeed, favs, customRecipes, pantry, workouts, sport }); }, [settings, days, weights, theme, templates, customMeals, usage, combos, shakeBases, shakeLiquids, comboSeed, favs, customRecipes, pantry, workouts, sport, hydrated]);

  // ── Synchronisation Supabase (offline-first, local-first) ──────────────────
  // Miroir de l'état courant pour lire des valeurs fraîches dans les callbacks async
  useEffect(() => { stateRef.current = { days, weights, settings, templates, customMeals, usage, combos, shakeBases, shakeLiquids, comboSeed, favs, customRecipes, pantry, workouts, sport }; });

  // Abonnement à la session Supabase
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setSessionChecked(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { setSession(s); setSessionChecked(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Sync initiale au login : pull → fusion (remote prioritaire sur recouvrement, on garde le local-only) → push du local-only
  const runInitialSync = useCallback(async (uid) => {
    setSyncStatus("syncing");
    try {
      const remote = await pullAll(uid);
      const localDays = stateRef.current.days || {};
      const localWeights = stateRef.current.weights || {};
      const localWorkouts = stateRef.current.workouts || {};
      setDays((l) => ({ ...l, ...remote.days }));
      setWeights((l) => ({ ...l, ...remote.weights }));
      setWorkouts((l) => ({ ...l, ...remote.workouts }));
      // Fusion sans perte : on unionne local + remote (collections par id), on applique, on repousse.
      const merged = mergeAppState(appStateNow(), remote.appState);
      if (merged.settings) setSettings(merged.settings);
      setTemplates(merged.templates);
      setCustomMeals(merged.customMeals);
      setCustomRecipes(merged.customRecipes);
      setPantry(merged.pantry);
      setUsage(merged.usage);
      setCombos(merged.combos);
      setShakeBases(merged.shakeBases);
      setShakeLiquids(merged.shakeLiquids);
      if (typeof merged.comboSeed === "number") setComboSeed(merged.comboSeed);
      setFavs(merged.favs);
      if (merged.sport) setSport(merged.sport);
      const onlyDays = {}; for (const k in localDays) if (!(k in remote.days)) onlyDays[k] = localDays[k];
      const onlyWeights = {}; for (const k in localWeights) if (!(k in remote.weights)) onlyWeights[k] = localWeights[k];
      const onlyWorkouts = {}; for (const k in localWorkouts) if (!(k in remote.workouts)) onlyWorkouts[k] = localWorkouts[k];
      await pushDays(uid, onlyDays);
      await pushWeights(uid, onlyWeights);
      await pushWorkouts(uid, onlyWorkouts);
      await pushAppState(uid, merged); // repousse l'état fusionné → les ajouts des 2 appareils sont préservés
      lastSynced.current = { days: { ...localDays, ...remote.days }, weights: { ...localWeights, ...remote.weights }, workouts: { ...localWorkouts, ...remote.workouts }, appState: JSON.stringify(merged) };
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
    const changedWorkouts = {};
    for (const id in cur.workouts) if (JSON.stringify(cur.workouts[id]) !== JSON.stringify(lastSynced.current.workouts[id])) changedWorkouts[id] = cur.workouts[id];
    const appState = appStateNow();
    const appChanged = JSON.stringify(appState) !== lastSynced.current.appState;
    if (!Object.keys(changedDays).length && !Object.keys(changedWeights).length && !Object.keys(changedWorkouts).length && !appChanged) return;
    try {
      setSyncStatus("syncing");
      await pushDays(uid, changedDays);
      await pushWeights(uid, changedWeights);
      await pushWorkouts(uid, changedWorkouts);
      if (appChanged) await pushAppState(uid, appState);
      lastSynced.current = { days: { ...cur.days }, weights: { ...cur.weights }, workouts: { ...cur.workouts }, appState: JSON.stringify(appState) };
      setSyncStatus("synced");
    } catch (e) { console.warn("[sync] push:", e.message); setSyncStatus("error"); }
  }, [appStateNow]);

  useEffect(() => {
    if (!session || !syncReady) return;
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => pushChanges(session.user.id), 2000);
    return () => clearTimeout(syncTimer.current);
  }, [days, weights, settings, templates, customMeals, usage, combos, shakeBases, shakeLiquids, comboSeed, favs, customRecipes, pantry, workouts, sport, session, syncReady, pushChanges]);

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

  const totals = useMemo(() => dayTotals(day), [day]);        // réel consommé (hors planifié)
  const planned = useMemo(() => plannedTotals(day), [day]);   // forecast (repas planifiés)
  // Quick-log : par créneau, les aliments réellement loggés le plus souvent récemment.
  const quickPicks = useMemo(() => {
    const SK = [["pdj", "pdj"], ["dej", "dej"], ["diner", "diner"], ["snack", "snacks"]];
    const acc = { pdj: {}, dej: {}, diner: {}, snack: {} };
    const isos = Object.keys(days).sort().slice(-30);
    isos.forEach((iso, di) => {
      const pk = days[iso]?.picks || {};
      SK.forEach(([slot, key]) => (pk[key] || []).forEach((it) => {
        if (it.planned || !it.name) return;
        const m = acc[slot][it.name] || (acc[slot][it.name] = { name: it.name, kcal: it.kcal, p: it.p, n: 0, last: 0 });
        m.n++; m.last = Math.max(m.last, di); m.kcal = it.kcal; m.p = it.p;
      }));
    });
    const out = {};
    Object.keys(acc).forEach((slot) => { out[slot] = Object.values(acc[slot]).sort((a, b) => b.n - a.n || b.last - a.last).slice(0, 3); });
    return out;
  }, [days]);
  // « Mes habituels » : top des aliments les plus loggés (tous créneaux), chacun
  // gardant son créneau dominant → log en 1 tap vers le bon créneau (grab-and-go).
  const habituals = useMemo(() => {
    const SK = [["pdj", "pdj"], ["dej", "dej"], ["diner", "diner"], ["snack", "snacks"]];
    const acc = {};
    const isos = Object.keys(days).sort().slice(-30);
    isos.forEach((iso, di) => {
      const pk = days[iso]?.picks || {};
      SK.forEach(([slot, key]) => (pk[key] || []).forEach((it) => {
        if (it.planned || !it.name) return;
        const m = acc[it.name] || (acc[it.name] = { name: it.name, kcal: it.kcal, p: it.p, n: 0, last: 0, slots: {} });
        m.n++; m.last = Math.max(m.last, di); m.kcal = it.kcal; m.p = it.p; m.slots[slot] = (m.slots[slot] || 0) + 1;
      }));
    });
    return Object.values(acc)
      .filter((m) => m.n >= 2)
      .map((m) => ({ ...m, slot: Object.keys(m.slots).sort((a, b) => m.slots[b] - m.slots[a])[0] || "snack" }))
      .sort((a, b) => b.n - a.n || b.last - a.last)
      .slice(0, 6);
  }, [days]);
  // Pas de bonus kcal les jours d'entraînement : le déficit reste le déficit
  // (on évite le travers « je fais du sport donc je peux manger »).
  const remKcal = settings.kcal - totals.kcal;
  const remP = settings.protein - totals.p;
  // Toast d'ajout avec le budget RESTANT après l'ajout (renforcement immédiat).
  // remKcal/remP sont d'avant l'ajout → on soustrait ce qu'on vient d'ajouter.
  const restLabel = (k = 0, p = 0) => {
    const rk = Math.round(remKcal - k), rp = Math.round(remP - p);
    return rk < 0 ? `dépassé de ${-rk} kcal` : `reste ${rk} kcal · ${Math.max(0, rp)} g prot.`;
  };
  const toastAdd = (name, k = 0, p = 0, undo) => showToast(`${name} · ${restLabel(k, p)}`, undo);
  // Créneau probable selon l'heure (pour les actions « maintenant » : habituels, suggestion).
  const suggestSlotNow = () => { const h = new Date().getHours(); return h < 11 ? "pdj" : h < 15 ? "dej" : h < 18 ? "snack" : "diner"; };

  // ── Intelligence croisée sport ↔ nutrition ─────────────────────────────────
  // Séance prévue à la date affichée (selon les jours de séance du programme).
  const sportInfo = useMemo(() => {
    if (!sport.startDate) return null;
    const d = parseISO(activeDate);
    const week = sport.weekManuallySet ? (sport.currentWeek || 1) : calcCurrentWeekFromStart(sport.startDate, d);
    const sessionDays = sport.preferences?.sessionDays || { A: 2, B: 4, C: 6 };
    const sid = SESSION_ORDER.find((s) => sessionDays[s] === d.getDay());
    if (!sid) return null;
    return { sid, week, name: SESSIONS[sid]?.name, subtitle: SESSIONS[sid]?.subtitle, done: !!workouts[`W${week}-${sid}`] };
  }, [sport, activeDate, workouts]);
  // Coaching recomposition : croise tendance de force et tendance de poids (today).
  const recomp = useMemo(() => recompSignal(workouts, observedTrend(days, weights, TODAY)), [workouts, days, weights]);
  // Suppression d'une séance loggée (depuis le détail) : local + remote (la sync auto
  // ne pousse que les ajouts/modifs, jamais les suppressions → on supprime la ligne ici).
  const deleteWorkoutEntry = useCallback((id) => {
    setWorkouts((prev) => { const n = { ...prev }; delete n[id]; return n; });
    const uid = session?.user?.id;
    if (uid) deleteWorkoutRow(uid, id).catch(() => {});
  }, [session]);
  // Contexte pour l'assistant : favoris (fréquence d'usage + recettes favorites) et produits à macros exactes.
  const assistFavorites = useMemo(() => {
    const fromUsage = Object.entries(usage).sort((a, b) => (b[1]?.count || 0) - (a[1]?.count || 0)).slice(0, 20).map(([n]) => n);
    const favNames = favs.map((id) => (library.recipes.find((r) => r.id === id) || customRecipes.find((r) => r.id === id))?.name).filter(Boolean);
    return Array.from(new Set([...favNames, ...fromUsage]));
  }, [usage, favs, library.recipes, customRecipes]);
  const assistKnownFoods = useMemo(() => customMeals.map((m) => ({ name: m.name, kcal: m.kcal, p: m.p, unit: m.unit || m.qtyUnit })), [customMeals]);

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

  // Marge hebdo (kcal sous/au-dessus du budget) — pour moduler le plaisir dans les suggestions.
  const weekBalance = useMemo(() => { try { return weekCoach(weekStats(days, settings, activeDate, 7), settings, weights, activeDate).balance; } catch (e) { return null; } }, [days, settings, weights, activeDate]);

  // Marge RÉELLE pour un créneau : on réserve les repas planifiés (à leur valeur) ET
  // les repas indécis (part équitable du reste), puis on rend la part du créneau visé.
  const slotMargin = useCallback((S) => {
    const sumBy = (arr, planned, key) => (arr || []).filter((it) => !!it.planned === planned).reduce((a, it) => a + (it[key] || 0) * (it.qty || 1), 0);
    let resK = 0, resP = 0; const undecided = [];
    ["pdj", "dej", "diner", "snack"].forEach((s) => {
      if (s === S) return;
      if (s === "pdj" && skipBreakfast) return;
      const arr = picks[picksKey(s)] || [];
      if (sumBy(arr, false, "kcal") > 0) return;                 // déjà consommé → hors remKcal
      const pk = sumBy(arr, true, "kcal"), pp = sumBy(arr, true, "p");
      if (pk > 0 || pp > 0) { resK += pk; resP += pp; return; }  // planifié → réservé à sa valeur
      undecided.push(s);                                          // vide/indécis → à répartir
    });
    const availK = Math.max(0, remKcal - resK), availP = Math.max(0, remP - resP);
    const poolW = undecided.reduce((a, s) => a + SLOTS[s].weight, 0) + SLOTS[S].weight;
    const w = SLOTS[S].weight / (poolW || 1);
    return { kcal: availK * w, p: availP * w };
  }, [picks, skipBreakfast, remKcal, remP]);

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
      const item = { ...meal, qty: 1, id: newId("pk") };
      if (picker.index != null) arr[picker.index] = item; else arr.push(item);
      return { ...d, picks: { ...d.picks, [key]: arr.slice(0, CAP[raw] || 8) } };
    });
    bumpUsage(meal.name);
    if (picker.index == null) toastAdd(meal.name, meal.kcal, meal.p);
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
  const deleteCombo = (id) => { const it = combos.find((x) => x.id === id); setCombos((c) => c.filter((x) => x.id !== id)); if (it) showToast(`${it.name} supprimé`, () => setCombos((p) => p.some((x) => x.id === id) ? p : [...p, it])); };
  const toggleFav = (id) => setFavs((f) => f.includes(id) ? f.filter((x) => x !== id) : [...f, id]);
  const addRecipe = (r) => setCustomRecipes((cur) => [{ ...r, id: newId("rec"), custom: true }, ...cur].slice(0, 200));
  const deleteRecipe = (id) => { const it = customRecipes.find((x) => x.id === id); setCustomRecipes((cur) => cur.filter((x) => x.id !== id)); if (it) showToast(`${it.name} supprimée`, () => setCustomRecipes((p) => p.some((x) => x.id === id) ? p : [...p, it])); };
  const updateRecipe = (id, patch) => setCustomRecipes((cur) => cur.map((x) => x.id === id ? { ...x, ...patch } : x));
  // Frigo/placard : staples avec interrupteur dispo (out=true → pas dispo aujourd'hui)
  // + macros optionnelles (kcal/p) renseignables au scan, éditables.
  // data : { unit, qty (stock total), kcal100, p100 (densité /100 unité) }
  const addPantry = (name, data) => setPantry((cur) => {
    const n = String(name || "").trim();
    if (!n || cur.some((x) => x.name.toLowerCase() === n.toLowerCase())) return cur;
    const extra = {};
    if (data) {
      if (data.unit) extra.unit = data.unit;
      const q = Math.round((data.qty || 0) * 10) / 10; if (q > 0) extra.qty = q;
      const k = Math.round(data.kcal100 || 0); if (k > 0) extra.kcal100 = k;
      const p = Math.round((data.p100 || 0) * 10) / 10; if (p > 0) extra.p100 = p;
    }
    return [{ id: newId("pan"), name: n, out: false, ...extra }, ...cur].slice(0, 120);
  });
  const togglePantry = (id) => setPantry((cur) => cur.map((x) => x.id === id ? { ...x, out: !x.out } : x));
  const updatePantry = (id, patch) => setPantry((cur) => cur.map((x) => x.id === id ? { ...x, ...patch } : x));
  const removePantry = (id) => { const it = pantry.find((x) => x.id === id); setPantry((cur) => cur.filter((x) => x.id !== id)); if (it) showToast(`${it.name} retiré du frigo`, () => setPantry((p) => p.some((x) => x.id === id) ? p : [...p, it])); };
  // « Ma cuisine » : bibliothèque unifiée (vue dérivée des 3 listes, aucune donnée reshapée).
  const meals = useMemo(() => [
    ...customRecipes.map((r) => ({ ...r, kind: "recette" })),
    ...combos.map((c) => { const t = (c.items || []).reduce((a, i) => ({ k: a.k + i.kcal * (i.qty || 1), p: a.p + i.p * (i.qty || 1) }), { k: 0, p: 0 }); return { ...c, kind: "combo", kcal: Math.round(t.k), p: Math.round(t.p) }; }),
    ...customMeals.map((m) => ({ ...m, kind: "aliment" })),
  ], [customRecipes, combos, customMeals]);
  const deleteMeal = (m) => { if (m.kind === "recette") deleteRecipe(m.id); else if (m.kind === "combo") deleteCombo(m.id); else deleteCustomMeal(m.id); };
  const useMealEntry = (m, slotOverride) => {
    if (m.kind === "combo") { const slot = slotOverride || m.slot || "dej", key = picksKey(slot); const ck = (m.items || []).reduce((a, it) => a + (it.kcal || 0) * (it.qty || 1), 0), cp = (m.items || []).reduce((a, it) => a + (it.p || 0) * (it.qty || 1), 0); setDay((d) => ({ ...d, picks: { ...d.picks, [key]: [...(d.picks[key] || []), ...(m.items || []).map((it) => ({ ...it, qty: it.qty || 1, id: newId("pk") }))].slice(0, 8) } })); (m.items || []).forEach((it) => bumpUsage(it.name)); toastAdd(m.name, ck, cp); return; }
    const slot = slotOverride || (m.kind === "recette" ? (m.cat || "dej") : (m.slots && m.slots[0]) || "dej"), key = picksKey(slot);
    const item = { name: m.name, kcal: m.kcal, p: m.p, qty: 1, id: newId("pk") };
    if (m.kind === "recette") { if (m.ingredients?.length) item.ingredients = m.ingredients; if (m.steps?.length) item.steps = m.steps; if (m.emoji) item.emoji = m.emoji; }
    setDay((d) => ({ ...d, picks: { ...d.picks, [key]: [...(d.picks[key] || []), item].slice(0, 8) } }));
    bumpUsage(m.name);
    toastAdd(m.name, m.kcal, m.p);
  };
  const useIdea = (idea) => {
    const slot = idea.cat, key = picksKey(slot);
    const item = { name: idea.name, kcal: idea.kcal, p: idea.p, qty: 1, id: newId("pk") };
    setDay((d) => { const arr = [...(d.picks[key] || []), item]; return { ...d, picks: { ...d.picks, [key]: arr.slice(0, CAP[slot] || 8) } }; });
    bumpUsage(idea.name);
  };
  // Assistant : logguer une suggestion dans un créneau, ou l'enregistrer en recette.
  const logSuggestion = (m, slot) => {
    const s = slot || m.slot || "dej", key = picksKey(s);
    const item = { name: m.title, kcal: Math.round(m.kcal), p: Math.round(m.protein), qty: 1, id: newId("pk") };
    const ings = (m.ingredients || []).map((i) => (typeof i === "string" ? i : `${i.qty ? `${i.qty} ` : ""}${i.unit ? `${i.unit} ` : ""}${i.name}`.trim())).filter(Boolean);
    if (ings.length) item.ingredients = ings;
    if (Array.isArray(m.steps) && m.steps.length) item.steps = m.steps;
    if (m.emoji) item.emoji = m.emoji;
    setDay((d) => ({ ...d, picks: { ...d.picks, [key]: [...(d.picks[key] || []), item].slice(0, CAP[s] || 8) } }));
    bumpUsage(m.title);
    toastAdd(m.title, m.kcal, m.protein);
  };
  const saveSuggestion = (m) => addRecipe({
    cat: m.slot || "dej", name: m.title, emoji: m.emoji || "",
    kcal: Math.round(m.kcal), p: Math.round(m.protein),
    ingredients: (m.ingredients || []).map((i) => (typeof i === "string" ? i : `${i.qty ? `${i.qty} ` : ""}${i.unit ? `${i.unit} ` : ""}${i.name}`.trim())),
    steps: m.steps || [], desc: m.note || "",
    variants: Array.isArray(m.variants) ? m.variants : [],
  });
  // Planif : écrit les repas PLANIFIÉS d'un jour (forecast). Remplace les anciens
  // planifiés (re-planification) et garde les repas réellement consommés.
  const planDay = (iso, entries = []) => {
    setDays((prev) => {
      const d = prev[iso] || EMPTY_DAY();
      const picks = { ...(d.picks || {}) };
      for (const k of Object.keys(picks)) if (Array.isArray(picks[k])) picks[k] = picks[k].filter((it) => !it.planned);
      entries.forEach(({ slot, meal }) => { const key = picksKey(slot || meal.slot || "dej"); picks[key] = [...(picks[key] || []), { name: meal.title, kcal: Math.round(meal.kcal), p: Math.round(meal.protein), qty: 1, planned: true, id: newId("pk") }].slice(0, CAP[slot] || 8); });
      return { ...prev, [iso]: { ...d, picks } };
    });
  };
  // « J'ai mangé » : un repas planifié devient réellement consommé.
  const confirmMeal = (slot, index) => {
    const it = (day.picks?.[picksKey(slot)] || [])[index];
    setDay((d) => { const key = picksKey(slot); return { ...d, picks: { ...d.picks, [key]: (d.picks[key] || []).map((m, i) => i === index ? { ...m, planned: false } : m) } }; });
    if (it) toastAdd(`${it.name} validé`, (it.kcal || 0) * (it.qty || 1), (it.p || 0) * (it.qty || 1));
  };
  // Rééquilibrage : un repas planifié ne rentre plus (après un plaisir) → on retire
  // SES items planifiés (avec undo) puis on ouvre l'assistant sur ce créneau (budget
  // réduit → proposera plus léger). Un seul créneau à la fois (appel court, pas de 504).
  const rebalanceSlot = (slot) => {
    const key = picksKey(slot);
    const prevArr = day.picks?.[key] || [];
    const removed = prevArr.filter((it) => it.planned);
    if (removed.length) {
      setDay((d) => ({ ...d, picks: { ...d.picks, [key]: (d.picks[key] || []).filter((it) => !it.planned) } }));
      showToast(`${SLOTS[slot]?.label || "Repas"} prévu retiré`, () => setDay((d) => ({ ...d, picks: { ...d.picks, [key]: prevArr } })));
    }
    setIdeaSlot(slot);
  };
  const addShakeBase = (it) => setShakeBases((a) => [...a, { id: newId("sb"), name: it.name, kcal: it.kcal, p: it.p }]);
  const delShakeBase = (id) => setShakeBases((a) => a.filter((x) => x.id !== id));
  const addShakeLiquid = (it) => setShakeLiquids((a) => [...a, { id: newId("sl"), name: it.name, kcal: it.kcal, p: it.p }]);
  const delShakeLiquid = (id) => setShakeLiquids((a) => a.filter((x) => x.id !== id));
  const setQty = (slot, index, value) => setDay((d) => { const key = picksKey(slot); return { ...d, picks: { ...d.picks, [key]: (d.picks[key] || []).map((m, i) => i === index ? { ...m, qty: clampQty(value) } : m) } }; });
  const editItem = (slot, index, patch) => setDay((d) => { const key = picksKey(slot); return { ...d, picks: { ...d.picks, [key]: (d.picks[key] || []).map((m, i) => i === index ? { ...m, ...patch } : m) } }; });
  const clearSlot = (slot, index) => {
    const key = picksKey(slot);
    const removed = (day.picks?.[key] || [])[index];
    setDay((d) => ({ ...d, picks: { ...d.picks, [key]: (d.picks[key] || []).filter((_, i) => i !== index) } }));
    if (removed) showToast("Supprimé", () => setDay((d) => { const arr = [...(d.picks[key] || [])]; arr.splice(index, 0, removed); return { ...d, picks: { ...d.picks, [key]: arr } }; }));
  };
  // Quick-log : ajout direct d'un aliment fréquent/récent dans un créneau.
  const quickAdd = (slot, item) => {
    const key = picksKey(slot);
    const pk = { name: item.name, kcal: item.kcal, p: item.p, qty: 1, id: newId("pk") };
    setDay((d) => ({ ...d, picks: { ...d.picks, [key]: [...(d.picks[key] || []), pk].slice(0, CAP[slot] || 8) } }));
    bumpUsage(item.name);
    toastAdd(item.name, item.kcal, item.p, () => setDay((d) => ({ ...d, picks: { ...d.picks, [key]: (d.picks[key] || []).filter((x) => x.id !== pk.id) } })));
  };
  const addExtra = (extra) => { setDay((d) => ({ ...d, picks: { ...d.picks, extras: [...(d.picks.extras || []), { ...extra, qty: 1, id: newId("pk") }] } })); toastAdd(extra.name, extra.kcal, extra.p); };
  const toggleSkip = () => setDay((d) => ({ skipBreakfast: !d.skipBreakfast, picks: d.skipBreakfast ? d.picks : { ...d.picks, pdj: [] } }));
  const toggleTraining = () => setDay((d) => ({ ...d, training: !d.training }));
  const resetDay = () => { const prev = day; setDay(() => ({ ...EMPTY_DAY() })); showToast("Journée vidée", () => setDay(() => prev)); };

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
  const deleteTemplate = (id) => { const it = templates.find((x) => x.id === id); setTemplates((t) => t.filter((x) => x.id !== id)); if (it) showToast(`Modèle « ${it.name} » supprimé`, () => setTemplates((p) => p.some((x) => x.id === id) ? p : [...p, it])); };
  const saveCustomMeal = (meal) => setCustomMeals((cur) => {
    const m = { ...meal, slots: meal.slots || ["pdj", "dej", "diner", "snack"], tags: meal.tags || [], desc: meal.desc || "Enregistré", custom: true };
    const others = cur.filter((x) => x.id !== m.id);
    return [m, ...others].slice(0, 200);
  });
  const deleteCustomMeal = (id) => { const it = customMeals.find((x) => x.id === id); setCustomMeals((cur) => cur.filter((x) => x.id !== id)); if (it) showToast(`${it.name} supprimé`, () => setCustomMeals((p) => p.some((x) => x.id === id) ? p : [...p, it])); };
  const updateCustomMeal = (id, patch) => setCustomMeals((cur) => cur.map((x) => x.id === id ? { ...x, ...patch } : x));
  const setWeight = (iso, kg) => setWeights((w) => {
    const n = { ...w };
    if (kg == null || isNaN(kg)) delete n[iso]; else n[iso] = kg;
    return n;
  });

  const goToDay = (iso) => { setActiveDate(iso); go("jour"); };

  const importData = (obj) => {
    // Export fitness-tracker (app sport) : { version, state: { history, weightLog, preferences… } }
    // → on rapatrie les séances dans workouts, le poids dans weights, la config dans sport.
    if (obj && obj.state && obj.state.history && typeof obj.state.history === "object") {
      const st = obj.state;
      setWorkouts((prev) => ({ ...prev, ...st.history }));         // clé = id de séance ("W8-A"…), idempotent
      if (st.weightLog && typeof st.weightLog === "object") {
        const w = {}; for (const iso in st.weightLog) { const kg = Number(st.weightLog[iso]); if (!isNaN(kg)) w[iso] = kg; }
        setWeights((prev) => ({ ...w, ...prev }));                 // ne pas écraser une pesée déjà saisie côté nutrition
      }
      setSport((prev) => ({
        ...prev,
        startDate: st.startDate ?? prev.startDate,
        currentWeek: st.currentWeek ?? prev.currentWeek,
        weekManuallySet: st.weekManuallySet ?? prev.weekManuallySet,
        soundEnabled: st.soundEnabled ?? prev.soundEnabled,
        acknowledgedSuggestions: { ...(prev.acknowledgedSuggestions || {}), ...(st.acknowledgedSuggestions || {}) },
        preferences: { ...(prev.preferences || {}), ...(st.preferences || {}) },
        vacationMode: st.vacationMode ?? prev.vacationMode,
        vacationEquipment: st.vacationEquipment ?? prev.vacationEquipment,
        vacationLevel: st.vacationLevel ?? prev.vacationLevel,
        vacationHistory: { ...(prev.vacationHistory || {}), ...(st.vacationHistory || {}) },
        postponements: { ...(prev.postponements || {}), ...(st.postponements || {}) },
      }));
      return;
    }
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
    if (Array.isArray(obj.pantry)) setPantry((prev) => { const ids = new Set(prev.map((x) => x.id)); return [...prev, ...obj.pantry.filter((x) => !ids.has(x.id))]; });
    if (obj.workouts && typeof obj.workouts === "object") setWorkouts((prev) => ({ ...prev, ...obj.workouts }));
    if (obj.sport && typeof obj.sport === "object") setSport((prev) => ({ ...prev, ...obj.sport }));
  };

  // Multi-utilisateur : tant que la session n'est pas vérifiée, écran neutre ;
  // sans session → gate de connexion obligatoire (chacun accède à SES données).
  if (!sessionChecked) return <div className="min-h-screen w-full" style={{ backgroundColor: C.bg }} />;
  if (!session) return <AuthGate />;

  return (
    <div className="min-h-screen w-full" style={{ color: C.ink, fontFamily: "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif" }}>
      {/* Header global FIXE + blur (cohérent avec la tab bar du bas) — piloté par
          screenHeader { title, subtitle, badge, onSettings, onBack } selon l'écran. */}
      <div ref={headerRef} className="fixed inset-x-0 top-0 z-30" style={{ background: C.nav, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderBottom: `1px solid ${C.line}`, paddingTop: "env(safe-area-inset-top)" }}>
        {(() => {
          const TITLES = { journal: "Suivi", progres: "Suivi", cuisine: "Ma cuisine", idees: "Planifier", guide: "Guide", reglages: "Réglages", sport: "Sport" };
          const h = screenHeader;
          const onBack = h?.onBack || ((view === "guide" || view === "reglages") ? navBack : null);
          const badge = h?.badge;
          return (
            <header className="mx-auto flex max-w-md items-center gap-2.5 px-4 py-2.5">
              {onBack && (
                <button onClick={onBack} aria-label="Retour" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }}><ChevronLeft size={20} /></button>
              )}
              <div className="min-w-0 flex-1">
                {view === "jour" && !h
                  ? <span className="text-lg font-extrabold tracking-tight" style={{ fontFamily: "'Space Grotesk', ui-sans-serif, system-ui" }}>Croque<span style={{ color: C.green }}>·</span>Macro</span>
                  : <h1 className="truncate text-2xl font-extrabold leading-tight" style={{ color: C.ink, fontFamily: "'Space Grotesk', system-ui" }}>{h?.title || TITLES[view]}</h1>}
                {h?.subtitle && <p className="truncate text-xs" style={{ color: C.sub }}>{h.subtitle}</p>}
              </div>
              {badge && <span className="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold" style={{ backgroundColor: badge.tone === "weight" ? `${C.weight}22` : `${C.green}1a`, color: badge.tone === "weight" ? C.weight : C.green }}>{badge.text}</span>}
              <div className="flex shrink-0 items-center gap-2">
                {h?.onSettings && (
                  <button onClick={h.onSettings} aria-label="Réglages de la séance" className="flex h-10 w-10 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }}><SlidersHorizontal size={18} /></button>
                )}
                {!onBack && view !== "reglages" && (
                  <button onClick={openSettings} aria-label="Réglages de l'app" className="flex h-10 w-10 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }}><Settings2 size={18} /></button>
                )}
              </div>
            </header>
          );
        })()}
      </div>

      <div className="mx-auto w-full max-w-md px-4" style={{ paddingTop: headerH + 18, paddingBottom: "calc(env(safe-area-inset-bottom) + 6rem)" }}>
        <Suspense fallback={<ScreenFallback />}>
        {view === "jour" && (
          <DayScreen
            activeDate={activeDate} setActiveDate={setActiveDate}
            settings={settings} totals={totals} planned={planned} remKcal={remKcal} remP={remP}
            days={days} weights={weights} onOpenWeek={() => go("journal")} onSaveCombo={saveCombo}
            picks={picks} skipBreakfast={skipBreakfast} slotTarget={slotTarget}
            training={training} onToggleTraining={toggleTraining}
            sportInfo={sportInfo} recomp={recomp} onGoSport={() => go("sport")}
            onScan={openTool} onOpenCuisine={() => go("cuisine")} onPhotoLog={() => setQuickLogOpen(true)} onPlan={() => go("idees")} onRebalance={rebalanceSlot}
            weight={weights[activeDate]} onWeight={(kg) => setWeight(activeDate, kg)}
            onPick={openPicker} onIdea={(slot) => setIdeaSlot(slot)} onConfirm={confirmMeal} quickPicks={quickPicks} onQuick={quickAdd}
            habituals={habituals} onHabitual={(it) => quickAdd(it.slot, it)} onSuggestNow={() => setIdeaSlot(suggestSlotNow())}
            onClear={clearSlot} onQty={setQty} onEditItem={editItem} onSkip={toggleSkip} onReset={resetDay}
            templates={templates} hasPrevDay={!!days[addDays(activeDate, -1)]}
            onCopyPrev={copyPrevDay} onSaveTemplate={saveTemplate} onLoadTemplate={loadTemplate} onDeleteTemplate={deleteTemplate}
            targetSuggestion={showTargetSuggestion ? targetSuggestion : null}
            onApplyTarget={applyTargetSuggestion} onDismissTarget={() => setTargetDismissed(targetSuggestion.kcal)}
          />
        )}
        {(view === "journal" || view === "progres") && (
          <div className="space-y-6">
            <ProgressScreen days={days} weights={weights} settings={settings} />
            <div>
              <SectionTitle>Historique jour par jour</SectionTitle>
              <JournalScreen days={days} weights={weights} settings={settings} onOpen={goToDay} activeDate={activeDate} />
            </div>
          </div>
        )}
        {view === "guide" && (
          <GuideScreen onAddExtra={addExtra} dateLabel={fmtFull(activeDate)} settings={settings} />
        )}
        {view === "cuisine" && (
          <CuisineScreen meals={meals} onUse={useMealEntry} onDelete={deleteMeal} onAddRecipe={addRecipe} onEditRecipe={updateRecipe} autoAdd={cuisineAdd} onAutoAddDone={() => setCuisineAdd(false)} onOpenFrigo={openFrigo} onScan={openTool} pantry={pantry} favorites={assistFavorites} knownFoods={assistKnownFoods} />
        )}
        {view === "sport" && (
          <SportScreen sport={sport} setSport={setSport} workouts={workouts} setWorkouts={setWorkouts} pushNav={pushNav} showToast={showToast} onDeleteWorkout={deleteWorkoutEntry} setHeader={setScreenHeader} />
        )}
        {view === "reglages" && (
          <SettingsSheet settings={settings} setSettings={setSettings} theme={theme} onTheme={switchTheme} allData={{ settings, days, weights, theme, templates, customMeals, usage, combos, shakeBases, shakeLiquids, favs }} customMeals={customMeals} onDeleteCustom={deleteCustomMeal} onUpdateCustom={updateCustomMeal} onImport={importData} onOpenAccount={openAccount} onOpenGuide={() => go("guide")} onClose={navBack} />
        )}
        {view === "idees" && (
          <PlanScreen
            targetKcal={settings.kcal} targetP={settings.protein} days={days}
            favorites={assistFavorites} knownFoods={assistKnownFoods}
            pantry={pantry} onAddPantry={addPantry} onTogglePantry={togglePantry} onUpdatePantry={updatePantry} onRemovePantry={removePantry}
            onPlanDay={planDay} onSaveRecipe={saveSuggestion} />
        )}
        </Suspense>
      </div>

      {/* Navigation */}
      <TabBar view={view} setView={go} />

      {picker && (
        <Deck slotKey={picker.slot} rankFor={rankFor} fitOf={fitOf} slotTarget={slotTarget(picker.slot)} pool={[...library.pool, ...customMeals]} usage={usage} combos={combos} pantry={pantry} presets={library.presets} onAddExtra={addExtra} onChoose={choose} onApplyCombo={applyCombo} onDeleteCombo={deleteCombo}
          bases={library.pool.filter((m) => (m.tags || []).includes("shake-base"))} liquids={library.pool.filter((m) => (m.tags || []).includes("shake-liquid"))}
          recipes={[...customRecipes, ...library.recipes]} onAddRecipe={addRecipe}
          shakeBases={shakeBases} shakeLiquids={shakeLiquids} onAddShakeBase={addShakeBase} onDelShakeBase={delShakeBase} onAddShakeLiquid={addShakeLiquid} onDelShakeLiquid={delShakeLiquid} onSave={saveCustomMeal} onDeleteCustom={deleteCustomMeal} onClose={navBack} />
      )}
      {toolOpen && (
        <Sheet open onClose={navBack} title="Scanner un produit" subtitle="Feu nutritionnel & ajout" icon={<ScanLine size={18} />} iconColor={C.protein}>
          <p className="mb-3 text-xs" style={{ color: C.muted }}>Scanne ou cherche un produit pour voir son feu 🟢/🟠/🔴 et l'enregistrer dans ta base (« je consomme ça »).</p>
          <OffSearch C={C} accent={C.protein} onChoose={(it) => { addExtra(it); navBack(); }} onSave={saveCustomMeal} />
        </Sheet>
      )}
      {frigoOpen && (
        <PantrySheet pantry={pantry} onAdd={addPantry} onToggle={togglePantry} onUpdate={updatePantry} onRemove={removePantry} onClose={navBack} />
      )}
      {quickLogOpen && (
        <QuickLogSheet
          favorites={assistFavorites} knownFoods={assistKnownFoods}
          onLog={(m, slot) => logSuggestion(m, slot)}
          onClose={() => setQuickLogOpen(false)} />
      )}
      {ideaSlot && (
        <MealSuggestSheet
          slot={ideaSlot} remKcal={slotMargin(ideaSlot).kcal} remP={slotMargin(ideaSlot).p}
          dayRemKcal={remKcal} dayRemP={remP} reserveKcal={Math.max(0, remKcal - slotMargin(ideaSlot).kcal)} weekBalance={weekBalance}
          favorites={assistFavorites} knownFoods={assistKnownFoods}
          localIdeas={[...customRecipes, ...library.recipes]}
          pantry={pantry} onAddPantry={addPantry} onTogglePantry={togglePantry} onUpdatePantry={updatePantry} onRemovePantry={removePantry}
          onLog={logSuggestion} onSaveRecipe={saveSuggestion}
          dateLabel={fmtFull(activeDate)} onClose={() => setIdeaSlot(null)} />
      )}
      <Suspense fallback={null}>
        {accountOpen && (
          <AccountSheet session={session} status={syncStatus} onClose={navBack} />
        )}
      </Suspense>
      <Toast toast={toast} onClose={() => setToast(null)} />
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
  // 4 onglets + bouton central « + ». Progrès vit dans le header (icône en haut).
  const tabs = [
    { k: "jour", l: "Jour", icon: Sun },
    { k: "journal", l: "Suivi", icon: TrendingUp },
    { k: "cuisine", l: "Cuisine", icon: Soup },
    { k: "sport", l: "Sport", icon: Dumbbell },
  ];
  const Tab = ({ t }) => {
    const Icon = t.icon, active = view === t.k;
    return (
      <button onClick={() => setView(t.k)} className="flex flex-1 flex-col items-center gap-0.5 py-2.5 active:scale-95" style={{ color: active ? C.ink : C.muted }}>
        <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
        <span className="text-xs font-semibold" style={{ opacity: active ? 1 : 0.8 }}>{t.l}</span>
      </button>
    );
  };
  return (
    <div className="fixed inset-x-0 bottom-0 z-20" style={{ backgroundColor: C.nav, backdropFilter: "blur(12px)", borderTop: `1px solid ${C.line}`, paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="mx-auto flex max-w-md">
        <Tab t={tabs[0]} />
        <Tab t={tabs[1]} />
        <Tab t={tabs[2]} />
        <Tab t={tabs[3]} />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  ÉCRAN JOUR
// ════════════════════════════════════════════════════════════════════════════

