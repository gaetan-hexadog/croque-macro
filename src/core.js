// ════════════════════════════════════════════════════════════════════════════
//  core.js — données, thème et helpers partagés (hors composants React)
//  Base de repas, presets, tokens de thème (C/SLOT_UI mutés par applyTheme),
//  helpers de date, de quantité et modèle de journée. Importé par App.jsx.
// ════════════════════════════════════════════════════════════════════════════
import {
  Coffee, Salad, UtensilsCrossed, Apple, Clock, Package, Soup, EggOff, Snowflake, Dumbbell,
} from "lucide-react";

// Catalogue d'aliments → table Supabase `foods` (via src/library.js).
// Bases/liquides du compositeur de shake → foods (tags shake-base / shake-liquid).

// ── Métadonnées des créneaux ────────────────────────────────────────────────
const SLOTS = {
  pdj:   { key: "pdj",   label: "Petit-déj", icon: Coffee,          weight: 0.22, color: "#d97706" },
  dej:   { key: "dej",   label: "Déjeuner",  icon: Salad,           weight: 0.34, color: "#059669" },
  diner: { key: "diner", label: "Dîner",     icon: UtensilsCrossed, weight: 0.34, color: "#0d9488" },
  snack: { key: "snack", label: "Snack",     icon: Apple,           weight: 0.10, color: "# db2777".trim() },
};
SLOTS.snack.color = "#db2777";

const TAGS = [
  { id: "rapide", label: "Rapide", icon: Clock },
  { id: "veille", label: "Préparé la veille", icon: Clock },
  { id: "transportable", label: "Transportable", icon: Package },
  { id: "batch", label: "Batch cooking", icon: Soup },
  { id: "sans-oeuf", label: "Sans œuf", icon: EggOff },
  { id: "sans-cuisson", label: "Sans cuisson", icon: Snowflake },
  { id: "post-workout", label: "Post-training", icon: Dumbbell },
];

const todayISO = () => new Date().toISOString().slice(0, 10);
const PLAN_KEY = `pioche-repas:plan:${todayISO()}`;
const SETTINGS_KEY = "pioche-repas:settings";

// Persistance locale réelle (localStorage). Interface async conservée.
const store = {
  async get(k) {
    try {
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v) : null;
    } catch (_) { return null; }
  },
  async set(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {}
  },
};

// ════════════════════════════════════════════════════════════════════════════
//  PIOCHE-REPAS — application multi-écrans
//  Jour (pioche + jauge) · Journal (historique éditable) · Progrès (graphiques)
//  Suivi du poids en parallèle des calories.
// ════════════════════════════════════════════════════════════════════════════

// Direction visuelle « Vivant maîtrisé » (variante E du design lab) :
// base chaude, accent corail affirmé, créneaux saturés, profondeur sobre.
const THEMES = {
  dark: {
    bg: "#17120c", paper: "#17120c", sheet: "#221a12",
    card: "rgba(255,255,255,0.05)", cardSolid: "#241c14",
    cardGrad: "linear-gradient(180deg, rgba(255,255,255,0.065), rgba(255,255,255,0.018))", cardTop: "rgba(255,255,255,0.15)",
    ink: "#f7efe4", sub: "#b1a596", muted: "#776c5d",
    line: "rgba(255,255,255,0.10)", track: "rgba(255,255,255,0.08)",
    green: "#5fd08a", protein: "#ff8a3d", accent: "#ff8a3d", over: "#ef6256", warn: "#f0b341", weight: "#7aa2ff", extra: "#b39ad6",
    nav: "rgba(23,18,12,0.75)", overlay: "rgba(0,0,0,0.6)", shadow: "rgba(0,0,0,0.72)",
    bgImage: "radial-gradient(1000px 520px at 100% 0%, rgba(255,138,61,0.13), transparent 60%), radial-gradient(900px 520px at 0% 3%, rgba(95,208,138,0.08), transparent 62%)",
  },
  light: {
    bg: "#f4ece0", paper: "#f4ece0", sheet: "#fffaf2",
    card: "rgba(255,255,255,0.72)", cardSolid: "#fffaf2",
    cardGrad: "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,255,255,0.58))", cardTop: "rgba(255,255,255,0.95)",
    ink: "#2a221a", sub: "#6f6456", muted: "#9a8f7e",
    line: "rgba(60,45,25,0.12)", track: "rgba(60,45,25,0.10)",
    green: "#3a9d63", protein: "#e0712a", accent: "#e0712a", over: "#cf4836", warn: "#c98a17", weight: "#4e6cae", extra: "#8a6fc0",
    nav: "rgba(244,236,224,0.82)", overlay: "rgba(43,34,26,0.34)", shadow: "rgba(43,34,26,0.2)",
    bgImage: "radial-gradient(1000px 520px at 100% 0%, rgba(224,113,42,0.10), transparent 60%), radial-gradient(900px 520px at 0% 3%, rgba(58,157,99,0.06), transparent 62%)",
  },
};
const SLOT_THEMES = {
  dark:  { pdj: "#ffb24d", dej: "#5fd08a", diner: "#7aa2ff", snack: "#ff6fae" },
  light: { pdj: "#c5871d", dej: "#3a9d63", diner: "#4e6cae", snack: "#c0567e" },
};
const C = { ...THEMES.dark };
const SLOT_UI = {
  pdj:   { time: "Matin",  color: SLOT_THEMES.dark.pdj },
  dej:   { time: "Midi",   color: SLOT_THEMES.dark.dej },
  diner: { time: "Soir",   color: SLOT_THEMES.dark.diner },
  snack: { time: "En-cas", color: SLOT_THEMES.dark.snack },
};
// Style « carte premium » (variante C du lab) : dégradé top-lit + liseré clair en
// haut + ombre douce + flou. Centralisé → un ajustement ici se propage à toutes les
// cartes-conteneurs qui l'utilisent. Lit C au moment du rendu (donc suit le thème).
function cardStyle(extra) {
  return {
    background: C.cardGrad,
    border: `1px solid ${C.line}`,
    borderTop: `1px solid ${C.cardTop}`,
    boxShadow: `0 18px 42px -30px ${C.shadow}`,
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    ...extra,
  };
}

function applyTheme(t) {
  Object.assign(C, THEMES[t]);
  for (const k in SLOT_THEMES[t]) SLOT_UI[k].color = SLOT_THEMES[t][k];
  if (typeof document !== "undefined") {
    const root = document.documentElement, body = document.body;
    if (body) { body.style.backgroundColor = C.bg; body.style.backgroundImage = C.bgImage; body.style.backgroundAttachment = "scroll"; body.style.backgroundRepeat = "no-repeat"; }
    if (root) root.style.backgroundColor = C.bg;
    setThemeColor(C.bg);
  }
}

// Couleur de la status bar (PWA Android) — à piloter dynamiquement (ex. séance
// plein écran colorée). Passer null/undefined remet le fond de page courant.
function setThemeColor(color) {
  if (typeof document === "undefined") return;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", color || C.bg);
}
const STORE_KEY = "croque-macro:v1";
const LEGACY_KEY = "pioche-repas:v2";

// ── Dates ───────────────────────────────────────────────────────────────────
const ISO = (d) => {
  const x = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return x.toISOString().slice(0, 10);
};
const TODAY = ISO(new Date());
const parseISO = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (iso, n) => { const d = parseISO(iso); d.setDate(d.getDate() + n); return ISO(d); };
const fmtShort = (iso) => parseISO(iso).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
const fmtFull = (iso) => iso === TODAY ? "Aujourd'hui" : parseISO(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const r0 = (x) => Math.round(x);

// Id unique pour le contenu perso synchronisé (évite les collisions Date.now()
// entre appareils dans le merge sync). UUID si dispo, repli sinon.
const newId = (prefix = "id") => `${prefix}-${(typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.round(Math.random() * 1e9)}`}`;

const EMPTY_DAY = () => ({ picks: { pdj: [], dej: [], diner: [], snacks: [], extras: [] }, skipBreakfast: false, training: false });

// normalise un repas (ancien format = objet unique) vers une liste
const toList = (x) => [].concat(x || []).filter(Boolean);
const normPicks = (p = {}) => ({ pdj: toList(p.pdj), dej: toList(p.dej), diner: toList(p.diner), snacks: p.snacks || [], extras: p.extras || [] });
const normDay = (d = {}) => ({ picks: normPicks(d.picks), skipBreakfast: !!d.skipBreakfast, training: !!d.training });
const normDays = (obj = {}) => { const o = {}; for (const k in obj) o[k] = normDay(obj[k]); return o; };

const sumItems = (arr) => { const t = arr.reduce((a, m) => ({ kcal: a.kcal + m.kcal * (m.qty || 1), p: a.p + m.p * (m.qty || 1) }), { kcal: 0, p: 0 }); return { kcal: Math.round(t.kcal), p: Math.round(t.p) }; };
const allItems = (day) => { const pk = (day && day.picks) || {}; return [...toList(pk.pdj), ...toList(pk.dej), ...toList(pk.diner), ...(pk.snacks || []), ...(pk.extras || [])].filter(Boolean); };
// Totaux RÉELS (consommés) : on exclut les repas seulement PLANIFIÉS (forecast).
function dayTotals(day) {
  if (!day) return { kcal: 0, p: 0 };
  return sumItems(allItems(day).filter((m) => !m.planned));
}
// Totaux des repas PLANIFIÉS uniquement (pour l'affichage prévisionnel de la jauge).
function plannedTotals(day) {
  if (!day) return { kcal: 0, p: 0 };
  return sumItems(allItems(day).filter((m) => m.planned));
}
const hasData = (day) => day && dayTotals(day).kcal > 0;
// Streak : nb de jours consécutifs réellement loggés (≥1 repas non planifié),
// en remontant depuis aujourd'hui. Tolère qu'aujourd'hui soit encore vide
// (la série démarre la veille) pour ne pas afficher 0 le matin.
function streakCount(days, refISO = TODAY) {
  if (!days) return 0;
  let start = refISO;
  if (!hasData(days[refISO])) { const y = addDays(refISO, -1); if (!hasData(days[y])) return 0; start = y; }
  let n = 0;
  for (let i = 0; i < 366; i++) { if (hasData(days[addDays(start, -i)])) n++; else break; }
  return n;
}

// portions : clé picks (snack→snacks), bornage et affichage des quantités
const picksKey = (slot) => (slot === "snack" ? "snacks" : slot);
const clampQty = (v) => { v = Number(v); if (!isFinite(v) || v <= 0) return 1; return Math.min(20, Math.round(v * 100) / 100); };
const fmtQty = (v) => (Number.isInteger(v) ? String(v) : String(v).replace(".", ","));


// ── Moteur hebdomadaire « intelligent » ─────────────────────────────────────
// Solde glissant sur la semaine + budget plaisir + pilotage doux.
// Garde-fous : pas de dette, pas de calories « gagnées » au sport,
// plancher de sécurité, et détection du sous-mange (ne jamais pousser à serrer plus).
const KCAL_FLOOR = 1500;

function weekStats(days, settings, refISO, span = 7) {
  const target = settings.kcal;
  let consumedSum = 0, protSum = 0, logged = 0, deltaSum = 0;
  const perDay = [];
  for (let i = span - 1; i >= 0; i--) {
    const iso = addDays(refISO, -i);
    const d = days[iso];
    const has = d && hasData(d);
    const t = has ? dayTotals(d) : null;
    // Le jour EN COURS (aujourd'hui) n'est pas terminé : ses repas pas encore passés ne
    // sont PAS une « marge ». On l'exclut du SOLDE (deltaSum) — mais il compte dans la
    // moyenne/le nb de jours loggés.
    const isToday = iso === TODAY;
    if (has) { consumedSum += t.kcal; protSum += t.p; logged++; if (!isToday) deltaSum += target - t.kcal; }
    perDay.push({ iso, kcal: has ? t.kcal : null, p: has ? t.p : null, delta: has ? target - t.kcal : null, logged: has, today: isToday });
  }
  return {
    target, span, logged,
    avgKcal: logged ? consumedSum / logged : 0,
    avgProt: logged ? protSum / logged : 0,
    balance: deltaSum, // + = avance sur le plan · − = retard
    perDay,
  };
}

function weightTrendOver(weights, refISO, span = 14) {
  const ws = [];
  for (let i = 0; i < span; i++) { const iso = addDays(refISO, -i); if (weights[iso] != null) ws.push(weights[iso]); }
  if (ws.length < 2) return null;
  const d = ws[0] - ws[ws.length - 1]; // récent − ancien
  return d <= -0.2 ? "down" : d >= 0.3 ? "up" : "flat";
}

function weekCoach(stats, settings, weights, refISO) {
  const { balance, avgKcal, target, span, logged } = stats;
  const weightTrend = weightTrendOver(weights || {}, refISO);
  const w = settings.profile && settings.profile.weight;
  const protReco = w ? Math.round(1.6 * w) : null;
  const proteinRoom = (protReco && settings.protein - protReco >= 15)
    ? { reco: protReco, kcalBack: Math.round((settings.protein - protReco) * 4) }
    : null;

  if (logged < 2) {
    return { tone: "start", headline: "Bilan en préparation", detail: "Logue 2-3 journées et le bilan hebdomadaire s'affiche : solde, marge plaisir et conseil du lendemain.", balance, suggestTomorrow: null, weightTrend, proteinRoom: null };
  }
  if (avgKcal > 0 && avgKcal < target - 350) {
    return { tone: "low", headline: "Déficit déjà marqué", detail: `Tu manges en moyenne ${Math.round(target - avgKcal)} kcal sous ta cible. Pas besoin de serrer plus : vise au moins ta cible, c'est ce qui préserve le muscle et rend la sèche tenable.`, balance, suggestTomorrow: null, weightTrend, proteinRoom };
  }
  if (balance >= 300) {
    return { tone: "ahead", headline: `Marge plaisir : +${Math.round(balance)} kcal`, detail: "Tu es en avance sur ton plan de la semaine. C'est ta marge pour un vrai plaisir — ou tu la gardes, au choix.", balance, suggestTomorrow: null, weightTrend, proteinRoom };
  }
  if (balance <= -400) {
    const suggest = Math.max(KCAL_FLOOR, Math.round((target + balance / span) / 10) * 10);
    return { tone: "behind", headline: `Semaine chargée : ${Math.abs(Math.round(balance))} kcal au-dessus du plan`, detail: `Pas de panique, ça se lisse sur 7 jours. Pour rester dans ton plan, tu peux viser ~${suggest} kcal demain — jamais sous ${KCAL_FLOOR}. Ce n'est pas une dette à rembourser, juste un cap.`, balance, suggestTomorrow: suggest, weightTrend, proteinRoom };
  }
  return { tone: "ontrack", headline: "Pile dans ton plan", detail: "Ta moyenne colle à ta cible. C'est la régularité qui fait avancer, pas la perfection sur quelques jours.", balance, suggestTomorrow: null, weightTrend, proteinRoom };
}

// Repas réutilisables de départ. Bump COMBOS_SEED_VERSION pour pousser une mise à jour.
const COMBOS_SEED_VERSION = 2;
const DEFAULT_COMBOS = [
  // Petit-déj express à emporter — lait amande, protéines = poudre/yaourt
  { id: "cdef-pdj-shaker", slot: "pdj", name: "Express · shaker amande", created: 1, items: [
    { name: "Shake All-in-One + lait amande", kcal: 240, p: 30, qty: 1 },
  ] },
  { id: "cdef-pdj-barre", slot: "pdj", name: "Express · shake & barre vegane", created: 2, items: [
    { name: "Shake All-in-One + lait amande", kcal: 240, p: 30, qty: 1 },
    { name: "Barre gourmet vegane Bulk", kcal: 200, p: 17, qty: 1 },
  ] },
  { id: "cdef-pdj-oats", slot: "pdj", name: "Express · overnight oats amande", created: 3, items: [
    { name: "Flocons d'avoine (40 g)", kcal: 150, p: 5, qty: 1 },
    { name: "Lait amande (250 ml)", kcal: 25, p: 1, qty: 1 },
    { name: "All-in-One (1 dose)", kcal: 216, p: 29, qty: 1 },
  ] },
  { id: "cdef-pdj-smoothie", slot: "pdj", name: "Express · smoothie amande", created: 4, items: [
    { name: "Lait amande (250 ml)", kcal: 25, p: 1, qty: 1 },
    { name: "Banane", kcal: 90, p: 1, qty: 1 },
    { name: "Shake All-in-One (1 dose)", kcal: 216, p: 29, qty: 1 },
    { name: "Purée de cacahuète (1 c.à.s)", kcal: 90, p: 3, qty: 1 },
  ] },
  { id: "cdef-pdj-yaourt", slot: "pdj", name: "Express · yaourt soja protéiné & flocons", created: 5, items: [
    { name: "Yaourt soja protéiné", kcal: 160, p: 18, qty: 1 },
    { name: "Flocons d'avoine (30 g)", kcal: 115, p: 4, qty: 1 },
  ] },
  { id: "cdef-pdj-leger", slot: "pdj", name: "Express léger · Clear & banane", created: 6, items: [
    { name: "Clear Protein (verre 150 ml)", kcal: 30, p: 7, qty: 1 },
    { name: "Banane", kcal: 90, p: 1, qty: 1 },
  ] },
  // Déj protéinés — adaptés au stock
  { id: "cdef-dej-jambon", slot: "dej", name: "Déj protéiné · jambon La Vie & lentilles", created: 7, items: [
    { name: "Jambon La Vie (≈120 g)", kcal: 145, p: 19, qty: 1 },
    { name: "Lentilles cuites (150 g)", kcal: 175, p: 12, qty: 1 },
    { name: "Légumes citron & épices", kcal: 55, p: 4, qty: 1 },
  ] },
  { id: "cdef-dej-teriyaki", slot: "dej", name: "Déj protéiné · jambon & tofu teriyaki", created: 8, items: [
    { name: "Jambon La Vie (≈80 g)", kcal: 95, p: 13, qty: 1 },
    { name: "Tofu teriyaki La Vie", kcal: 230, p: 18, qty: 1 },
    { name: "Crudités sans huile", kcal: 50, p: 3, qty: 1 },
  ] },
];

// ── Cible kcal/protéines : calcul + ajustement selon le poids réel ───────────
// Profil par défaut (doit rester identique à celui de Settings.jsx).
// goalRate = rythme de perte visé (kg/sem) pour le moteur adaptatif (computeAdaptiveTarget).
const DEFAULT_PROFILE = { sex: "h", age: 42, weight: 91, height: 186, activity: 1.45, deficit: 0.25, goalRate: 0.7 };

// Calcule maintenance / cible / protéines reco à partir d'un profil (Mifflin-St Jeor).
// Source unique : Settings (calculatrice) ET l'ajustement auto réutilisent CE calcul.
function computeTargets(profile) {
  const { sex, age, weight, height, activity, deficit } = { ...DEFAULT_PROFILE, ...(profile || {}) };
  const w = +weight || 0, h = +height || 0, a = +age || 0;
  const bmr = 10 * w + 6.25 * h - 5 * a + (sex === "h" ? 5 : -161);
  const tdee = bmr * activity;
  const round50 = (x) => Math.round(x / 50) * 50, round5 = (x) => Math.round(x / 5) * 5;
  return {
    maintenance: round50(tdee),
    target: Math.max(1500, round50(tdee * (1 - deficit)), Math.round(bmr)),
    proteinReco: Math.min(220, Math.max(100, round5(w * 1.9))),
  };
}

// Poids « lissé » : moyenne pondérée des dernières pesées (récent = plus de poids),
// pour gommer le bruit quotidien (eau, sel…). Renvoie { kg, n } ou null.
function smoothedWeight(weights, refISO = TODAY, { span = 30, min = 1 } = {}) {
  const pts = [];
  for (let i = 0; i < span && pts.length < 10; i++) {
    const iso = addDays(refISO, -i);
    if (weights && weights[iso] != null && !isNaN(weights[iso])) pts.push(Number(weights[iso]));
  }
  if (pts.length < min) return null;
  let wsum = 0, vsum = 0;
  pts.forEach((kg, idx) => { const wt = 1 / (idx + 1); wsum += wt; vsum += wt * kg; });
  return { kg: Math.round((vsum / wsum) * 10) / 10, n: pts.length };
}

// Métabolisme de base (Mifflin-St Jeor) — plancher physiologique des calculs.
function mifflinBMR(profile) {
  const { sex, age, weight, height } = { ...DEFAULT_PROFILE, ...(profile || {}) };
  const w = +weight || 0, h = +height || 0, a = +age || 0;
  return 10 * w + 6.25 * h - 5 * a + (sex === "h" ? 5 : -161);
}

// ── Tendance OBSERVÉE (faits, pas formule) ──────────────────────────────────
// Sur une fenêtre, à partir de tes vraies pesées + apports : rythme réel (kg/sem)
// et maintenance empirique (apport − énergie de la variation de poids). Renvoie
// null si pas assez de recul/données → on n'agit jamais sur du bruit court terme.
function observedTrend(days, weights, refISO = TODAY, span = 21) {
  const inWin = (iso) => { const d = (parseISO(refISO) - parseISO(iso)) / 86400000; return d >= 0 && d < span; };
  const wIso = Object.keys(weights || {}).filter((iso) => weights[iso] != null && !isNaN(weights[iso]) && inWin(iso)).sort();
  if (wIso.length < 3) return null;
  const spanDays = Math.round((parseISO(wIso[wIso.length - 1]) - parseISO(wIso[0])) / 86400000);
  if (spanDays < 10) return null; // moins de 10 j de recul = bruit (eau, sel, 2-3 jours off)
  const avg = (a) => a.reduce((s, x) => s + x, 0) / a.length;
  const wEarly = avg(wIso.slice(0, 3).map((i) => Number(weights[i]))); // moyenne des 3 plus anciennes
  const wLate = avg(wIso.slice(-3).map((i) => Number(weights[i])));     // moyenne des 3 plus récentes
  const deltaKg = wLate - wEarly;
  const loggedK = Object.keys(days || {}).filter((iso) => inWin(iso) && dayTotals(days[iso]).kcal > 0).map((i) => dayTotals(days[i]).kcal);
  if (loggedK.length < 5) return null; // moins de 5 jours de repas loggés = pas fiable
  const avgIntake = Math.round(avg(loggedK));
  const ratePerWeek = Math.round((deltaKg / spanDays * 7) * 100) / 100;
  const maintenance = Math.round(avgIntake - (deltaKg * 7700) / spanDays); // 7700 kcal ≈ 1 kg
  return { ratePerWeek, avgIntake, maintenance, spanDays, nW: wIso.length, nK: loggedK.length };
}

// ── Cible adaptative « intelligente » ───────────────────────────────────────
// Ancrée sur la maintenance OBSERVÉE (pas une formule figée) pour FORCER la
// continuité de perte même en plateau, avec garde-fous : plancher BMI ~20,
// jamais sous le BMR ni 1500 kcal, et plafond de perte à ~1 %/semaine.
function computeAdaptiveTarget({ profile, days, weights, currentTarget, refISO = TODAY } = {}) {
  if (!profile || profile.height == null) return null; // a besoin d'âge/taille
  const t = observedTrend(days, weights, refISO);
  if (!t) return null;
  const sw = smoothedWeight(weights, refISO, { min: 2 });
  const wNow = sw ? sw.kg : (+profile.weight || 0);
  const proteinReco = computeTargets({ ...profile, weight: wNow }).proteinReco;
  const bmr = Math.round(mifflinBMR({ ...profile, weight: wNow }));
  const hardFloor = Math.max(1500, bmr);                  // jamais sous BMR ni 1500
  const targetRate = Math.min(Math.max(profile.goalRate || 0.5, 0.2), 1.0); // kg/sem visé (sain)
  const maxRateKg = wNow * 0.01;                          // 1 %/sem = limite de sécurité haute
  const floorW = 20 * (profile.height / 100) ** 2;        // plancher de poids ~ BMI 20
  const round10 = (x) => Math.round(x / 10) * 10;
  const mk = (kcal, tone, headline) => {
    const k = Math.max(hardFloor, round10(kcal));
    if (Math.abs(k - currentTarget) < 60) return null;    // écart trop faible → on ne dérange pas
    return { kcal: k, protein: proteinReco, weightNow: wNow, oldWeight: +profile.weight || wNow, tone, headline, maintenance: t.maintenance, ratePerWeek: t.ratePerWeek };
  };

  // 1) Limite de poids saine atteinte → on arrête le déficit (passage en maintien)
  if (wNow <= floorW + 0.4) return mk(t.maintenance, "floor", "Tu approches une limite de poids saine");
  // 2) Perte trop rapide (> ~1 %/sem) → on remonte vers un déficit doux
  if (t.ratePerWeek < -maxRateKg) return mk(t.maintenance - (0.4 * 7700) / 7, "tooFast", "Perte trop rapide — on adoucit pour préserver le muscle");
  // 3) Normal / plateau : ancrer sur la maintenance observée + viser le rythme cible
  const kcal = t.maintenance - (targetRate * 7700) / 7;
  const tone = t.ratePerWeek > -0.1 ? "stall" : "tune";
  return mk(kcal, tone, tone === "stall" ? "Ta perte stagne — on recale sur tes données" : "Cible recalée sur ta maintenance réelle");
}

// Correction rétroactive des macros Clear Protein dans l'historique (verre 34/8→30/7,
// dose 86/20→75/18). CIBLÉE (nom + anciennes valeurs exactes) et IDEMPOTENTE : une
// fois corrigé, ça ne matche plus → safe à relancer à chaque démarrage.
function fixClearProteinHistory(days = {}) {
  let changed = false;
  const fixItem = (m) => {
    if (m && typeof m.name === "string" && m.name.includes("Clear Protein")) {
      if (m.kcal === 34 && m.p === 8) { changed = true; return { ...m, kcal: 30, p: 7 }; }
      if (m.kcal === 86 && m.p === 20) { changed = true; return { ...m, kcal: 75, p: 18 }; }
    }
    return m;
  };
  const fixArr = (a) => (a || []).map(fixItem);
  const out = {};
  for (const iso in days) {
    const d = days[iso], pk = d.picks || {};
    out[iso] = { ...d, picks: { pdj: fixArr(pk.pdj), dej: fixArr(pk.dej), diner: fixArr(pk.diner), snacks: fixArr(pk.snacks), extras: fixArr(pk.extras) } };
  }
  return changed ? out : days;
}

// ── Verdict « courses » (feu vert/orange/rouge) ─────────────────────────────
// 3 règles sur la grille /100 g : kcal÷prot (règle reine), gras vs prot, sucre vs
// prot. Statut par règle (good|mid|bad) + feu global = le pire des trois.
// Renvoie null si pas de protéines (règle non applicable).
function scoreProduct({ kcal, p, fat, sugar } = {}) {
  const P = +p || 0;
  if (P <= 0) return null;
  const ratio = (+kcal || 0) / P;
  const ORDER = { good: 0, mid: 1, bad: 2 };
  const rules = [{
    key: "kcalp", label: "kcal / prot",
    status: ratio <= 12 ? "good" : ratio <= 15 ? "mid" : "bad",
    value: ratio.toFixed(1),
    hint: ratio <= 8 ? "excellent" : ratio <= 12 ? "correct" : ratio <= 15 ? "moyen" : "trop calorique",
  }];
  if (fat != null && !isNaN(fat)) {
    const F = +fat;
    rules.push({ key: "fatp", label: "gras vs prot", status: F <= P / 2 ? "good" : F <= P ? "mid" : "bad", value: `${r0(F)} / ${r0(P)} g`, hint: F <= P / 2 ? "maigre" : F <= P ? "mixte" : "gras" });
  }
  if (sugar != null && !isNaN(sugar)) {
    const S = +sugar;
    rules.push({ key: "sugp", label: "sucre vs prot", status: S <= P ? "good" : "bad", value: `${r0(S)} / ${r0(P)} g`, hint: S <= P ? "ok" : "sucré" });
  }
  const flag = rules.reduce((w, r) => (ORDER[r.status] > ORDER[w] ? r.status : w), "good");
  return { flag, ratio, rules };
}

// Construit un prompt prêt à coller dans Claude.ai à partir de la base perso + budget du jour.
function buildClaudePrompt({ customMeals = [], remKcal, remP, dateLabel } = {}) {
  const L = [];
  L.push("Tu es mon assistant nutrition. Règles strictes à respecter :");
  L.push("- Végétarien : œufs et fromages au lait de vache uniquement (jamais chèvre ni brebis).");
  L.push("- Je ne bois pas de lait de vache. Lait végétal par défaut = lait d'amande non sucré.");
  L.push("- La protéine vient surtout des aliments protéinés / de la poudre, pas du lait.");
  L.push("");
  if (customMeals.length) {
    L.push("Mes ingrédients & produits habituels (macros par portion indiquée) :");
    customMeals.forEach((m) => L.push(`- ${m.name} : ${r0(m.kcal)} kcal, ${m.p} g de protéines`));
    L.push("");
  }
  const hasBudget = Number.isFinite(remKcal) && Number.isFinite(remP);
  if (hasBudget) {
    L.push(`Budget restant${dateLabel ? ` (${dateLabel})` : ""} : ${r0(Math.max(0, remKcal))} kcal et ${r0(Math.max(0, remP))} g de protéines.`);
    L.push("");
  }
  L.push(`Propose-moi 3 recettes ${hasBudget ? "qui rentrent dans ce budget" : "équilibrées et protéinées"}, utilisant en priorité mes produits ci-dessus. Donne pour chacune les ingrédients, les étapes et les macros estimées (kcal + protéines).`);
  return L.join("\n");
}

// Garde-fou « une seule icône » : garde le 1er grapheme emoji (gère les emojis
// multi-codepoints : ZWJ, teintes…), ignore le reste. Une recette = un emoji.
function oneEmoji(s) {
  const str = String(s || "").trim();
  if (!str) return "";
  try { const it = new Intl.Segmenter().segment(str)[Symbol.iterator]().next(); return it.value ? it.value.segment : str; }
  catch { return Array.from(str)[0] || str; }
}

// Garde-fou diététique : scanne les ingrédients d'un repas proposé et renvoie la liste
// des ingrédients NON CONFORMES (viande/poisson, fromage chèvre/brebis, lait de vache bu).
// Conservateur : « jambon végétal », « saucisse végé »… ne sont PAS flaggés.
const VEG_OK = /v[ée]g[ée]|vegan|tofu|soja|seitan|tempeh|pois\s?chiche|lentille|haricot/i;
const MEAT_FISH = /\b(poulet|poule|b[œo]uf|veau|porc|agneau|mouton|dinde|canard|lapin|gibier|merguez|chorizo|charcuterie|foie\s?gras|anchois|thon|saumon|cabillaud|colin|merlu|truite|sardine|maquereau|bar|dorade|crevette|gambas|moule|hu[îi]tre|calamar|poulpe|poisson|fruits\s?de\s?mer|g[ée]latine|lardons?\s?fum)\b/i;
const AMBIG_MEAT = /\b(jambon|bacon|lardons?|saucisses?|steak|nuggets?|escalope|boulettes?|hach[ée]|cordon\s?bleu)\b/i;
const NONCOW_DAIRY = /\b(ch[èe]vre|brebis|feta|roquefort|pecorino|manchego|crottin|ossau|rocamadour)\b/i;
const COW_MILK_DRINK = /\blait\s+(de\s+vache|entier|demi[\s-]?[ée]cr[ée]m[ée]|[ée]cr[ée]m[ée])\b/i;
function dietaryWarnings(meal) {
  const out = [];
  const ings = (meal?.ingredients || []).map((i) => (typeof i === "string" ? i : i?.name || "")).filter(Boolean);
  const hay = (meal?.title || "") + " " + ings.join(" ");
  for (const s of ings.length ? ings : [hay]) {
    const t = s.toLowerCase();
    if (MEAT_FISH.test(t) || NONCOW_DAIRY.test(t) || COW_MILK_DRINK.test(t) || (AMBIG_MEAT.test(t) && !VEG_OK.test(t))) out.push(s);
  }
  return out;
}

// Recale les macros EXACTES : pour chaque ingrédient en g/ml qui matche un aliment du
// frigo (densité /100 connue), on remplace l'estimation du modèle par le calcul réel,
// puis on resomme le total. Nécessite des macros par ingrédient (sinon repas inchangé).
function correctMacros(meal, knownFoods = [], pantry = []) {
  const ings = meal && meal.ingredients;
  if (!Array.isArray(ings) || !ings.length || ings.some((i) => typeof i.kcal !== "number")) return meal;
  // Mots significatifs (≥3 lettres, dé-accentués, singularisés grossièrement).
  const words = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/[^a-z0-9]+/).map((w) => w.replace(/s$/, "")).filter((w) => w.length >= 3);
  const pan = (pantry || []).filter((x) => x && !x.out && (x.kcal100 || x.p100)).map((x) => ({ w: words(x.name), kcal100: x.kcal100 || 0, p100: x.p100 || 0 })).filter((x) => x.w.length);
  if (!pan.length) return meal;
  let changed = false;
  const fixed = ings.map((i) => {
    const unit = String(i.unit || "").toLowerCase(), qty = Number(i.qty) || 0;
    if (unit !== "g" && unit !== "ml") return i;
    if (qty <= 0) return i;
    const iw = words(i.name);
    if (!iw.length) return i;
    // Match SÛR : même mot de tête + tous les mots du produit frigo présents dans l'ingrédient.
    // (Empêche « amande » du frigo de capturer « lait d'amande » → densités opposées.)
    const m = pan.find((x) => x.w[0] === iw[0] && x.w.every((w) => iw.includes(w)));
    if (!m) return i;
    changed = true;
    return { ...i, kcal: Math.round(m.kcal100 * qty / 100), protein: Math.round(m.p100 * qty / 100) };
  });
  if (!changed) return meal;
  const kcal = Math.round(fixed.reduce((a, i) => a + (Number(i.kcal) || 0), 0));
  const protein = Math.round(fixed.reduce((a, i) => a + (Number(i.protein) || 0), 0));
  return { ...meal, ingredients: fixed, kcal, protein };
}

// ── Assistant repas (API Claude) ─────────────────────────────────────────────
// Construit { system, prompt, mode } pour l'Edge Function (Supabase). Le system porte
// les règles diététiques NON négociables ; le prompt porte le contexte du jour
// (budget réel, frigo, favoris, macros exactes des produits connus).
const SLOT_LABELS = { pdj: "petit-déjeuner", dej: "déjeuner", diner: "dîner", snack: "en-cas" };

function buildAssistantPrompt({
  mode = "meal",            // "meal" | "day" | "week"
  slot,                      // créneau visé (mode meal)
  remKcal, remP,             // budget RESTANT réel (mode meal/day) — déjà calculé depuis le log
  targetKcal = 1850, targetP = 150, // cibles journalières (mode day/week)
  favorites = [],            // noms d'aliments/plats préférés
  knownFoods = [],           // [{name, kcal, p, unit}] macros EXACTES à réutiliser
  have = [],                 // aliments disponibles (frigo/placard)
  avoid = [],                // aliments à exclure (pas dispo / pas envie aujourd'hui)
  loggedByDay = [],          // semaine : [{kcal,p}] déjà consommés par jour (index = dayIndex)
  slots = [],                // jour : créneaux RESTANT à planifier (les autres sont déjà loggés)
  filledByDay = [],          // semaine : [[slots déjà faits]] par jour
  weekBalance,               // marge hebdo en kcal (+ = sous le budget → marge plaisir ; − = au-dessus)
  excludeTitles = [],        // mode meal : plats déjà proposés à NE PAS reproposer (régénérer un repas)
  dayContext = [],           // mode meal : repas DÉJÀ prévus/mangés ce jour-là (cohérence : compléter sans répéter)
  recentMeals = [],          // mode meal : repas des JOURS PRÉCÉDENTS (éviter de répéter d'un jour à l'autre)
  count, concise = false,    // mode meal : nb d'options (déf. 3) ; concise = sans étapes (planif séquentielle rapide)
  recipe, instruction,       // mode adapt : recette de départ + consigne d'adaptation
  text,                      // mode parse : description en langage naturel d'un repas mangé
  userWish, dining,          // mode meal : consigne libre de l'utilisateur + flag « au restaurant »
  reserveKcal,               // mode meal : budget réservé aux repas pas encore décidés (le budget ci-dessus = marge réelle)
  indulge,                   // mode meal : « je me fais plaisir » → budget = restant du jour entier, prévenir de l'impact
  dateLabel, startLabel,
} = {}) {
  const sys = [
    "Tu es l'assistant nutrition personnel de Bob. Tu proposes des repas végétariens, simples et réalistes. Réponds en français.",
    "Règles diététiques STRICTES, non négociables :",
    "- Végétarien. Œufs et fromages au lait de VACHE uniquement (jamais chèvre ni brebis).",
    "- Bob ne boit pas de lait de vache. Lait végétal par défaut = lait d'AMANDE non sucré (~1 g de protéines/250 ml).",
    "- La protéine vient des aliments protéinés et de la poudre de protéine, pas du lait.",
    "- Objectif : perte de gras. Cibles ~1850 kcal / ~150 g de protéines par jour. Repas protéinés.",
    "- Au petit-déjeuner, Bob est souvent pressé : privilégie le grab-and-go (shaker, portable).",
    "- Bob suit son poids et n'aime pas que la balance soit brouillée par la rétention d'eau. Pour limiter ça : VARIE les sources de protéines et évite d'EMPILER au même repas / sur la même journée un fort SODIUM (aliments transformés type jambon ou lardons végétaux, charcuterie veggie, condiments salés, sauce soja, cornichons, miso, feta) ET de TRÈS grosses charges de fibres/légumineuses (lentilles + pois chiches + edamame + maïs au même repas). Ce n'est PAS une interdiction — ces aliments sont bons ; juste ne pas tout cumuler, et équilibrer avec des options plus légères en sel/fibres dans la journée.",
    "VARIÉTÉ (important) : sois créatif et propose des repas VARIÉS et appétissants — explore différentes cuisines (méditerranéenne, indienne, mexicaine, asiatique, levantine…), légumineuses, céréales, façons de cuisiner. NE te limite PAS aux mêmes plats classiques ni à ce que Bob mange déjà d'habitude. Si on régénère, propose autre chose.",
    "Consignes de calcul :",
    "- CALCULE les kcal/protéines TOTAUX en ADDITIONNANT la contribution de CHAQUE ingrédient (quantité × valeur), jamais une estimation globale « à la louche ». Le total DOIT être cohérent avec les quantités listées.",
    "- Pour un ingrédient présent dans mon frigo ou mes produits connus, calcule sa contribution à partir des valeurs /100 EXACTES données plus bas (quantité ÷ 100 × valeur) — NE ré-estime PAS, ne les arrondis pas. Pour les autres ingrédients, estime à partir de valeurs standard réalistes (conservateur, arrondis kcal vers le haut).",
    "- Le frigo est une PRÉFÉRENCE, pas une contrainte : utilise en priorité ce qui est disponible (et indique la portion en g/ml d'après la densité /100, tu peux n'en prendre qu'une partie), MAIS complète et varie librement avec d'autres aliments courants. Ne te bride pas à ce que j'ai déjà loggé.",
    "- N'utilise JAMAIS un aliment listé comme à exclure.",
    "- CHAQUE ingrédient DOIT avoir une quantité CHIFFRÉE (qty + unit) — jamais d'ingrédient sans quantité. Pour les poudres/suppléments (protéine, all-in-one, Bulk…), exprime en DOSE/scoop (≈30 g), JAMAIS en grammes. Renvoie toujours via l'outil `propose`.",
    "- Pour CHAQUE ingrédient, indique AUSSI sa contribution `kcal` et `protein`. La somme des ingrédients doit coller au total `kcal`/`protein` du repas (sinon corrige). Ça permet à l'app de recalculer exactement les ingrédients que j'ai au frigo.",
    "- Pour CHAQUE repas, ajoute 1 à 3 VARIANTES (remplacer/ajouter/retirer un ingrédient) avec leur impact macro signé (kcal + protéines, ex. « tofu → tempeh » +30/+4 ; « +30 g amandes » +180/+6 ; « +1 dose protéine » +110/+22 ; « sans fromage » −90/−6) et un label court avec la quantité dans la bonne unité (dose pour les poudres).",
    "FORMAT ATTENDU pour chaque option (respecte-le exactement, même style de quantités/unités) :",
    JSON.stringify({
      title: "Bowl skyr amande & fruits rouges", emoji: "🫐", slot: "snack", kcal: 355, protein: 42,
      ingredients: [{ qty: 150, unit: "g", name: "skyr nature", kcal: 90, protein: 15 }, { qty: 80, unit: "g", name: "fruits rouges", kcal: 35, protein: 1 }, { qty: 20, unit: "g", name: "amandes", kcal: 120, protein: 4 }, { qty: 1, unit: "dose", name: "protéine vanille en poudre", kcal: 110, protein: 22 }],
      note: "Grab-and-go, riche en protéines.",
      variants: [{ label: "+1 dose protéine", kcal: 110, protein: 22 }, { label: "sans amandes", kcal: -120, protein: -4 }],
    }),
  ].join("\n");

  const L = [];
  if (knownFoods.length) {
    L.push("Mes produits avec macros exactes (utilise ces chiffres SI tu emploies ces produits — facultatif) :");
    knownFoods.slice(0, 24).forEach((m) => L.push(`- ${m.name} : ${r0(m.kcal)} kcal, ${r0(m.p)} g protéines${m.unit ? ` (${m.unit})` : ""}`));
    L.push("");
  }
  if (favorites.length) { L.push(`Quelques aliments que j'aime (simple inspiration, ne t'y limite pas, varie) : ${favorites.slice(0, 8).join(", ")}.`); L.push(""); }
  if (have.length) {
    L.push("Disponible dans mon frigo/placard (tu peux n'en utiliser qu'une PARTIE — ne consomme pas forcément tout le paquet) :");
    have.slice(0, 60).forEach((h) => {
      if (typeof h === "string") { L.push(`- ${h}`); return; }
      const u = h.unit || "g";
      const stock = h.qty ? ` (${h.qty} ${u} dispo)` : "";
      const macro = (h.kcal100 || h.p100) ? ` — ${r0(h.kcal100 || 0)} kcal, ${h.p100 ?? "?"} g prot. pour 100 ${u}` : "";
      L.push(`- ${h.name}${stock}${macro}`);
    });
    L.push("");
  }
  if (avoid.length) { L.push(`À NE PAS utiliser aujourd'hui : ${avoid.slice(0, 40).join(", ")}.`); L.push(""); }

  const budget = Number.isFinite(remKcal) && Number.isFinite(remP);
  if (mode === "week") {
    const SLOT_CODES = [["pdj", "petit-déjeuner"], ["dej", "déjeuner"], ["diner", "dîner"], ["snack", "en-cas"]];
    L.push(`Planifie 7 jours complets (dayIndex 0 à 6${startLabel ? `, jour 0 = ${startLabel}` : ""}).`);
    L.push(`Pour CHAQUE jour, propose les 4 repas : ${SLOT_CODES.map(([c, l]) => `${l} (slot="${c}")`).join(", ")}.`);
    L.push(`Pour CHACUN de ces repas, donne 2 OPTIONS au choix. → Chaque jour = 8 repas (4 slots × 2 options), donc 56 repas au total sur la semaine. Renseigne le bon \`slot\` ET le bon \`dayIndex\` sur chaque option.`);
    L.push(`Cible par jour : ~${r0(targetKcal)} kcal et au moins ${r0(targetP)} g de protéines (réparties sur les repas). Varie d'un jour à l'autre.`);
    const fb = (filledByDay || []).map((arr, i) => ({ i, arr: arr || [] })).filter((x) => x.arr.length);
    if (fb.length) {
      L.push("Repas DÉJÀ faits (ne les propose PAS, saute-les) :");
      fb.forEach((x) => L.push(`- Jour ${x.i + 1} : ${x.arr.map((s) => SLOT_LABELS[s] || s).join(", ")} déjà fait${x.arr.length > 1 ? "s" : ""}.`));
    }
  } else if (mode === "day") {
    const sl = slots.length ? slots : ["pdj", "dej", "diner", "snack"];
    L.push(`Planifie ces repas pour ${dateLabel || "la journée"}${sl.length < 4 ? " (les autres sont déjà faits)" : ""} : ${sl.map((s) => `${SLOT_LABELS[s]} (slot="${s}")`).join(", ")}.`);
    L.push(`Budget total à répartir sur l'ENSEMBLE de ces ${sl.length} repas : ${r0(Math.max(0, remKcal))} kcal et au moins ${r0(Math.max(0, remP))} g de protéines.`);
    L.push(`Pour CHACUN de ces ${sl.length} repas, donne 3 OPTIONS au choix. → Tu dois renvoyer ${sl.length * 3} repas au total (3 par slot). Renseigne le bon \`slot\` sur chaque option.`);
  } else if (mode === "parse") {
    L.push(`J'ai mangé ceci, identifie-le et estime ses macros : « ${text || ""} ».`);
    L.push("Renvoie UNE seule option : titre court du repas, les aliments en `ingredients` (quantités qty+unit quand c'est possible), et les kcal + protéines TOTAUX estimés (réaliste, plutôt conservateur).");
  } else if (mode === "adapt") {
    const r = recipe || {};
    L.push(`Voici ma recette « ${r.name || "sans nom"} » (${r0(r.kcal || 0)} kcal, ${r0(r.p || 0)} g protéines) :`);
    (r.ingredients || []).forEach((i) => L.push(`- ${typeof i === "string" ? i : `${i.qty ?? ""} ${i.unit ?? ""} ${i.name}`.trim()}`));
    if ((r.steps || []).length) { L.push("Préparation :"); r.steps.forEach((s, n) => L.push(`${n + 1}. ${s}`)); }
    L.push("");
    L.push(`Adapte cette recette selon ma demande : « ${instruction || "améliore-la"} ». RÈGLE IMPORTANTE : si je demande de RETIRER / ENLEVER / « sans » un ingrédient SANS proposer de remplacement, garde EXACTEMENT la même recette en supprimant SEULEMENT cet ingrédient (et recalcule juste les macros en conséquence) — n'invente PAS un nouveau plat et ne remplace PAS par autre chose. Ne change que ce que je demande, garde tout le reste à l'identique. Renvoie UNE seule option (la version adaptée) avec tous les ingrédients chiffrés (qty + unit), les macros recalculées, et 1-2 variantes.`);
  } else {
    const n = count || 3;
    const slotTxt = SLOT_LABELS[slot] || "repas";
    L.push(budget
      ? `Propose-moi ${n} options de ${slotTxt} qui rentrent dans mon budget restant${dateLabel ? ` (${dateLabel})` : ""} : ${r0(Math.max(0, remKcal))} kcal et ${r0(Math.max(0, remP))} g de protéines.`
      : `Propose-moi ${n} options de ${slotTxt}, équilibrées et protéinées.`);
    if (slot === "snack") L.push("Un EN-CAS = simple et rapide, SANS cuisson ni recette élaborée (yaourt/fromage blanc, fruit, oléagineux, fromage, compote, barre ou shake protéiné…).");
    if (dining) L.push("CONTEXTE : je mange AU RESTAURANT (pas de cuisine maison) — IGNORE mon frigo. Propose des PLATS À COMMANDER réalistes (pas de recette à cuisiner) ; `ingredients` = composantes principales du plat. Estime les macros de façon CONSERVATRICE (portions resto généreuses, arrondis kcal vers le haut). Dans `note`, glisse 1 conseil de commande (ex. sauce à part, doubler la protéine, pain en moins).");
    if (userWish && userWish.trim()) L.push(`MA DEMANDE (à respecter en PRIORITÉ) : « ${userWish.trim()} ». Respecte-la même si ça sort de mes habitudes, tout en gardant le budget et les règles diététiques.`);
    if (indulge) L.push("Je veux me FAIRE PLAISIR sur ce repas : le budget ci-dessus est mon restant du jour ENTIER (j'assume de rééquilibrer ensuite). Propose quelque chose de satisfaisant dans ce budget, et PRÉVIENS-moi dans la `note` que mes repas suivants devront être plus légers (donne un ordre de grandeur, ex. « dîner ~450 kcal du coup »).");
    else if (reserveKcal > 50) L.push(`IMPORTANT — le budget ci-dessus est ma MARGE pour CE repas : j'ai d'autres repas pas encore décidés aujourd'hui (≈${r0(reserveKcal)} kcal leur sont réservés). Ne dépasse PAS cette marge. Si elle est quasi nulle, propose l'option la plus légère et protéinée possible et dis-le franchement dans la note.`);
    if (Number.isFinite(weekBalance)) {
      if (weekBalance > 300) L.push(`Sur la semaine je suis SOUS mon budget (+${r0(weekBalance)} kcal de marge) → un petit plaisir gourmand raisonnable est OK s'il rentre dans la marge.`);
      else if (weekBalance < -300) L.push("Sur la semaine je suis AU-DESSUS de mon budget → reste sobre et protéiné.");
    }
    if (dayContext.length) L.push(`Repas DÉJÀ prévus/mangés aujourd'hui : ${dayContext.join(" ; ")}. IMPORTANT — propose pour ce créneau quelque chose de DIFFÉRENT : ne RÉUTILISE PAS les ingrédients principaux déjà mangés aujourd'hui (même source de protéine, même légume, même féculent). Ex. : si courgettes + saucisse végé au déjeuner, choisis un AUTRE légume et une AUTRE protéine le soir. Complète la journée en variant, et équilibre les macros restantes.`);
    if (recentMeals.length) L.push(`Ces DERNIERS JOURS j'ai déjà mangé : ${recentMeals.slice(0, 18).join(" ; ")}. ÉVITE de me reproposer ces plats ou des plats très proches — fais VARIER d'un jour à l'autre (autres sources de protéine, autres légumes/féculents, autres cuisines). Ne me fais pas manger deux fois la même chose à 1-2 jours d'intervalle.`);
    if (excludeTitles.length) L.push(`NE repropose AUCUN de ces plats déjà proposés : ${excludeTitles.slice(0, 12).join(" ; ")}. Donne des plats DIFFÉRENTS et nouveaux.`);
    if (concise) L.push("Reste CONCIS, mais chaque ingrédient AVEC sa quantité (qty + unit) ; 1-2 variantes. N'inclus PAS les étapes de préparation.");
    L.push(`Toutes pour le slot "${slot || "dej"}".`);
  }
  if (mode === "day" || mode === "week") {
    L.push("Garde chaque option CONCISE : titre, macros, courte description (ingrédients principaux) ; étapes facultatives.");
    // Petits plaisirs : durabilité. Module selon la marge hebdo.
    let treat;
    if (Number.isFinite(weekBalance) && weekBalance > 300) treat = `Marge plaisir cette semaine : +${r0(weekBalance)} kcal sous le budget → intègre un petit PLAISIR gourmand raisonnable (carré de chocolat noir, boule de glace, fruit gourmand, verre de vin, biscuit…), dans la cible du jour. C'est important pour tenir sur la durée.`;
    else if (Number.isFinite(weekBalance) && weekBalance < -300) treat = "Semaine déjà au-dessus du plan : reste sobre, évite les extras gourmands.";
    else treat = "Glisse de temps en temps un petit plaisir gourmand raisonnable (pas tous les jours), dans la cible — c'est important pour la tenue sur la durée.";
    if (mode === "week") treat += " Sur la semaine, répartis 1 à 2 plaisirs maximum, pas chaque jour.";
    L.push(treat);
  }
  if (!dining) L.push("UTILISE EN PRIORITÉ les aliments listés dans mon frigo/placard ci-dessus : base au moins une PARTIE de chaque repas dessus quand c'est pertinent (indique la portion en g/ml). Tu PEUX compléter avec d'autres aliments courants pour varier et atteindre les cibles, mais ne fais pas comme si mon frigo n'existait pas.");

  return { mode, system: sys, prompt: L.join("\n") };
}

// Prompt « explique mon poids » : repas + pesées des ~10 derniers jours → texte libre
// qui distingue l'eau (sel/fibres/glucides/transit) du gras réel, en citant ses repas.
function buildWeightExplainPrompt({ days = {}, weights = {}, settings = {}, refISO = TODAY }) {
  const lines = [];
  for (let i = 9; i >= 0; i--) {
    const iso = addDays(refISO, -i);
    const d = days[iso], w = weights[iso];
    const names = [];
    if (d && d.picks) for (const k of ["pdj", "dej", "diner", "snacks", "extras"]) (d.picks[k] || []).forEach((it) => { if (it && it.name && !it.planned) names.push(it.name); });
    const tot = dayTotals(d);
    if (!names.length && w == null) continue;
    lines.push(`${fmtShort(iso)} : ${w != null ? `${w} kg · ` : ""}${tot.kcal} kcal · ${tot.p} g prot.${names.length ? ` — ${names.join(", ")}` : ""}`);
  }
  const system = "Tu es l'assistant nutrition de Bob (objectif perte de gras, cibles ~1850 kcal / 150 g protéines). On te donne ses repas et pesées des derniers jours. Explique en français, en 4 à 6 phrases MAXIMUM et en texte fluide (pas de listes à puces), ce que reflète sa variation de poids récente : distingue clairement ce qui est de l'EAU (sodium des aliments transformés et condiments, grosses charges de fibres/légumineuses, glucides, transit, cycle) de ce qui pourrait être du GRAS réel. Sois CONCRET en citant SES propres repas. Reste rassurant mais HONNÊTE : si ses apports ont été en vrai surplus calorique, dis-le franchement. Termine par UN repère actionnable simple.";
  const prompt = `Mes cibles : ${settings.kcal || 1850} kcal / ${settings.protein || 150} g de protéines par jour.\n\nMes derniers jours (date · poids si pesé · kcal/protéines · repas) :\n${lines.join("\n") || "(peu de données)"}\n\nExplique ma variation de poids récente.`;
  return { system, prompt };
}

// System prompt du CHAT assistant : injecte le contexte d'app (budget jour, repas,
// semaine, frigo, recettes) pour qu'il réponde sans qu'on lui réexplique tout.
function buildChatSystem({ days = {}, weights = {}, settings = {}, pantry = [], recipes = [], refISO = TODAY }) {
  const d = days[refISO], tot = dayTotals(d);
  const remK = Math.max(0, (settings.kcal || 1850) - tot.kcal), remP = Math.max(0, (settings.protein || 150) - tot.p);
  const todayItems = [];
  if (d && d.picks) for (const k of ["pdj", "dej", "diner", "snacks", "extras"]) (d.picks[k] || []).forEach((it) => { if (it && it.name) todayItems.push(`${it.name}${it.planned ? " (prévu)" : ""}`); });
  const recent = [];
  for (let i = 1; i <= 3; i++) { const iso = addDays(refISO, -i); const t = dayTotals(days[iso]); const w = weights[iso]; if (t.kcal || w != null) recent.push(`${fmtShort(iso)} ${w != null ? `${w} kg ` : ""}${t.kcal} kcal/${t.p} g`); }
  let week = "";
  try { const wc = weekCoach(weekStats(days, settings, refISO, 7), settings, weights, refISO); if (wc?.headline) week = `${wc.headline}${wc.detail ? ` — ${wc.detail}` : ""}`; } catch {}
  const have = pantry.filter((x) => !x.out && x.name).slice(0, 40).map((x) => `${x.name}${x.kcal100 ? ` (${x.kcal100} kcal/${x.p100 ?? "?"} g par 100${x.unit || "g"})` : ""}`);
  const recNames = (recipes || []).map((r) => r && r.name).filter(Boolean).slice(0, 60);
  return [
    "Tu es l'assistant nutrition personnel de Bob, en mode CONVERSATION. Réponds en français, de façon concise, concrète et chaleureuse. Tu CONNAIS son contexte ci-dessous — utilise-le, ne redemande jamais ce que tu sais déjà.",
    "Règles diététiques NON négociables : végétarien (œufs/fromages au lait de VACHE uniquement, jamais chèvre/brebis) ; Bob ne boit pas de lait de vache, lait végétal par défaut = AMANDE non sucré ; la protéine vient des aliments protéinés et de la poudre. Objectif : perte de gras.",
    `Cibles : ${settings.kcal || 1850} kcal / ${settings.protein || 150} g protéines par jour.`,
    `AUJOURD'HUI (${fmtFull(refISO)}) : ${tot.kcal} kcal · ${tot.p} g prot. consommés → IL RESTE ${remK} kcal · ${remP} g prot.${todayItems.length ? ` Déjà mangé/prévu : ${todayItems.join(", ")}.` : " Rien loggé pour l'instant."}`,
    recent.length ? `Jours précédents : ${recent.join(" | ")}.` : "",
    week ? `Bilan semaine : ${week}` : "",
    have.length ? `Frigo/placard dispo : ${have.join(", ")}.` : "Frigo : (vide ou non renseigné).",
    recNames.length ? `Recettes enregistrées de Bob : ${recNames.join(", ")}.` : "",
    "Quand tu proposes un repas/une recette, respecte les règles et le budget restant, et privilégie ce qu'il a au frigo. Pour les macros, additionne ingrédient par ingrédient depuis les valeurs connues ; si une valeur manque, estime de façon conservatrice et dis-le. Évite d'empiler sel (transformés/condiments) et grosses charges de fibres/légumineuses (rétention d'eau).",
    "Bob peut t'envoyer une PHOTO (assiette/plat, ou emballage/étiquette d'un produit). Décris brièvement ce que tu vois, estime les macros (conservateur, dis quand tu estimes), et déclenche l'action utile : un repas qu'il vient de manger → log_meal ; un produit intéressant → add_to_pantry (reprends les valeurs /100 g de l'étiquette si lisibles) avec un avis « feu vert / orange / rouge » selon le ratio protéines÷kcal et le gras. Si l'image est illisible ou ambiguë, dis-le et demande une précision.",
    "Tu peux DÉCLENCHER des actions via tes outils : save_recipe (enregistrer une recette), log_meal (logger un repas du jour), add_to_pantry (ajouter au frigo), update_recipe (modifier une recette existante). RÈGLE ABSOLUE : dès qu'une action est pertinente, APPELLE l'outil IMMÉDIATEMENT dans CE message — ne demande JAMAIS la permission avant. C'est l'app qui affiche un bouton de confirmation que Bob valide d'un tap ; toi, ton rôle est juste de déclencher l'outil. Ceci vaut pour TOUTES les actions, y compris MODIFIER : si tu repères qu'une recette existante gagnerait à être mise à jour, appelle update_recipe TOUT DE SUITE — n'écris JAMAIS « je peux la mettre à jour si tu veux », « veux-tu que… », ni aucune question de permission. Accompagne d'un texte court et affirmatif (« Voici une idée de déj : … », « Je mets à jour ta recette X : … »), jamais d'une question. Pour update_recipe, n'utilise que les noms EXACTS de recettes listés ci-dessus.",
  ].filter(Boolean).join("\n");
}

// Idées de plats & recettes — écran dédié. cat: pdj | dej | diner | snack

export {
  SLOTS, TAGS, store, THEMES, SLOT_THEMES, C, SLOT_UI, applyTheme, setThemeColor, cardStyle, STORE_KEY, LEGACY_KEY, ISO, TODAY, parseISO, addDays, fmtShort, fmtFull, r0, EMPTY_DAY, toList, normPicks, normDay, normDays, dayTotals, plannedTotals, hasData, streakCount, picksKey, clampQty, fmtQty, KCAL_FLOOR, weekStats, weekCoach, weightTrendOver, DEFAULT_COMBOS, COMBOS_SEED_VERSION, DEFAULT_PROFILE, computeTargets, smoothedWeight, buildClaudePrompt, buildAssistantPrompt, buildWeightExplainPrompt, buildChatSystem, oneEmoji, dietaryWarnings, correctMacros, mifflinBMR, observedTrend, computeAdaptiveTarget, fixClearProteinHistory, newId, scoreProduct,
};
