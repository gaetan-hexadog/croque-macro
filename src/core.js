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
    green: "#5fd08a", protein: "#ff8a3d", accent: "#ff8a3d", over: "#ef6256", weight: "#7aa2ff", extra: "#b39ad6",
    nav: "rgba(23,18,12,0.75)", overlay: "rgba(0,0,0,0.6)", shadow: "rgba(0,0,0,0.72)",
    bgImage: "radial-gradient(1000px 520px at 100% 0%, rgba(255,138,61,0.13), transparent 60%), radial-gradient(900px 520px at 0% 3%, rgba(95,208,138,0.08), transparent 62%)",
  },
  light: {
    bg: "#f4ece0", paper: "#f4ece0", sheet: "#fffaf2",
    card: "rgba(255,255,255,0.72)", cardSolid: "#fffaf2",
    cardGrad: "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,255,255,0.58))", cardTop: "rgba(255,255,255,0.95)",
    ink: "#2a221a", sub: "#6f6456", muted: "#9a8f7e",
    line: "rgba(60,45,25,0.12)", track: "rgba(60,45,25,0.10)",
    green: "#3a9d63", protein: "#e0712a", accent: "#e0712a", over: "#cf4836", weight: "#4e6cae", extra: "#8a6fc0",
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
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", C.bg);
  }
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

function dayTotals(day) {
  if (!day) return { kcal: 0, p: 0 };
  const pk = day.picks || {};
  const all = [...toList(pk.pdj), ...toList(pk.dej), ...toList(pk.diner), ...(pk.snacks || []), ...(pk.extras || [])].filter(Boolean);
  return all.reduce((a, m) => ({ kcal: a.kcal + m.kcal * (m.qty || 1), p: a.p + m.p * (m.qty || 1) }), { kcal: 0, p: 0 });
}
const hasData = (day) => day && dayTotals(day).kcal > 0;

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
    if (has) { consumedSum += t.kcal; protSum += t.p; logged++; deltaSum += target - t.kcal; }
    perDay.push({ iso, kcal: has ? t.kcal : null, p: has ? t.p : null, delta: has ? target - t.kcal : null, logged: has });
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
const DEFAULT_PROFILE = { sex: "h", age: 35, weight: 78, height: 178, activity: 1.45, deficit: 0.18 };

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

// ── Assistant repas (API Claude) ─────────────────────────────────────────────
// Construit { system, prompt, mode } pour la Netlify Function. Le system porte
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
  loggedByDay = [],          // semaine : [{kcal,p}] déjà consommés par jour (index = dayIndex) → re-planif du reste
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
    "Consignes de calcul :",
    "- Réutilise les MACROS EXACTES fournies pour les produits connus. Pour le reste, estime de façon CONSERVATRICE (arrondis les kcal vers le haut).",
    "- Utilise en priorité les aliments disponibles et les favoris fournis. N'utilise jamais un aliment listé comme à exclure.",
    "- Donne des quantités précises (g, ml, dose, pièce). Renvoie toujours via l'outil `propose`.",
  ].join("\n");

  const L = [];
  if (knownFoods.length) {
    L.push("Mes produits connus (macros exactes par portion, à réutiliser tels quels) :");
    knownFoods.slice(0, 40).forEach((m) => L.push(`- ${m.name} : ${r0(m.kcal)} kcal, ${r0(m.p)} g protéines${m.unit ? ` (${m.unit})` : ""}`));
    L.push("");
  }
  if (favorites.length) { L.push(`Mes favoris (à privilégier) : ${favorites.slice(0, 30).join(", ")}.`); L.push(""); }
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
    L.push(`Planifie 7 jours (dayIndex 0 à 6${startLabel ? `, jour 0 = ${startLabel}` : ""}). Chaque jour doit totaliser environ ${r0(targetKcal)} kcal et au moins ${r0(targetP)} g de protéines, répartis entre petit-déjeuner, déjeuner, dîner et un en-cas si pertinent.`);
    L.push("Varie les repas sur la semaine. Indique le slot et le dayIndex de chaque repas.");
    const logged = (loggedByDay || []).map((d, i) => ({ i, kcal: d?.kcal || 0, p: d?.p || 0 })).filter((d) => d.kcal > 0);
    if (logged.length) {
      L.push("");
      L.push("Certains jours ont DÉJÀ des repas loggés — ne les replanifie pas, complète seulement le reste pour atteindre la cible :");
      logged.forEach((d) => L.push(`- Jour ${d.i + 1} : déjà ${r0(d.kcal)} kcal / ${r0(d.p)} g consommés → propose seulement le complément.`));
    }
  } else if (mode === "day") {
    const k = budget ? Math.max(0, remKcal) : targetKcal;
    const p = budget ? Math.max(0, remP) : targetP;
    L.push(`Planifie ${budget ? "le reste de ma" : "une"} journée (petit-déjeuner, déjeuner, dîner, + en-cas si utile) totalisant environ ${r0(k)} kcal et au moins ${r0(p)} g de protéines. Indique le slot de chaque repas.`);
  } else {
    const slotTxt = SLOT_LABELS[slot] || "repas";
    L.push(budget
      ? `Propose-moi 3 options de ${slotTxt} qui rentrent dans mon budget restant${dateLabel ? ` (${dateLabel})` : ""} : ${r0(Math.max(0, remKcal))} kcal et ${r0(Math.max(0, remP))} g de protéines.`
      : `Propose-moi 3 options de ${slotTxt}, équilibrées et protéinées.`);
    L.push(`Toutes pour le slot "${slot || "dej"}".`);
  }

  return { mode, system: sys, prompt: L.join("\n") };
}

// Idées de plats & recettes — écran dédié. cat: pdj | dej | diner | snack

export {
  SLOTS, TAGS, store, THEMES, SLOT_THEMES, C, SLOT_UI, applyTheme, cardStyle, STORE_KEY, LEGACY_KEY, ISO, TODAY, parseISO, addDays, fmtShort, fmtFull, r0, EMPTY_DAY, toList, normPicks, normDay, normDays, dayTotals, hasData, picksKey, clampQty, fmtQty, KCAL_FLOOR, weekStats, weekCoach, weightTrendOver, DEFAULT_COMBOS, COMBOS_SEED_VERSION, DEFAULT_PROFILE, computeTargets, smoothedWeight, buildClaudePrompt, buildAssistantPrompt, mifflinBMR, observedTrend, computeAdaptiveTarget, fixClearProteinHistory, newId, scoreProduct,
};
