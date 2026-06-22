// ════════════════════════════════════════════════════════════════════════════
//  core.js — données, thème et helpers partagés (hors composants React)
//  Base de repas, presets, tokens de thème (C/SLOT_UI mutés par applyTheme),
//  helpers de date, de quantité et modèle de journée. Importé par App.jsx.
// ════════════════════════════════════════════════════════════════════════════
import {
  Coffee, Salad, UtensilsCrossed, Apple, Clock, Package, Soup, EggOff, Snowflake, Dumbbell,
} from "lucide-react";

import { CLEAR_PROTEIN_DOSE, CLEAR_VEGAN_DOSE, CLEAR_PROTEIN_VERRE } from "./nutrition.js";
import { MEALS } from "./meals.js";

// Base de repas (MEALS) → ./meals.js · constantes Clear → ./nutrition.js

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

// Compositeur de shake : base (poudre) + liquide, additionnés.
const SHAKE_BASES = [
  { name: "Vegan All-in-One", kcal: 216, p: 29 },
  { name: "Vegan Protein", kcal: 127, p: 24 },
  { name: "Clear Vegan", kcal: CLEAR_VEGAN_DOSE.kcal, p: CLEAR_VEGAN_DOSE.p },
  { name: "Clear Protein", kcal: CLEAR_PROTEIN_DOSE.kcal, p: CLEAR_PROTEIN_DOSE.p },
];
const SHAKE_LIQUIDS = [
  { name: "eau", kcal: 0, p: 0 },
  { name: "lait amande", kcal: 25, p: 1 },
  { name: "lait soja", kcal: 90, p: 9 },
];

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
    { name: "Clear Protein (verre 150 ml)", kcal: CLEAR_PROTEIN_VERRE.kcal, p: CLEAR_PROTEIN_VERRE.p, qty: 1 },
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

// Idées de plats & recettes — écran dédié. cat: pdj | dej | diner | snack

export {
  MEALS, SLOTS, TAGS, store, THEMES, SLOT_THEMES, C, SLOT_UI, applyTheme, cardStyle, STORE_KEY, LEGACY_KEY, ISO, TODAY, parseISO, addDays, fmtShort, fmtFull, r0, EMPTY_DAY, toList, normPicks, normDay, normDays, dayTotals, hasData, picksKey, clampQty, fmtQty, KCAL_FLOOR, weekStats, weekCoach, weightTrendOver, DEFAULT_COMBOS, COMBOS_SEED_VERSION, SHAKE_BASES, SHAKE_LIQUIDS, DEFAULT_PROFILE, computeTargets, smoothedWeight, buildClaudePrompt,
};
