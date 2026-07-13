//  scoring.js — étape C du moteur de repas (spec § 3.4) : scoring composite
//  (composantes normalisées [0,1]) + sélection top-k dissimilaire (MMR).
//
//  Module PUR : aucun import hors du dossier engine, `now` toujours en paramètre.

import { etatEffectif } from "./feasibility.js";

const JOUR_MS = 24 * 60 * 60 * 1000;

//  Anti-répétition : malus ABSOLUS (soustraits du score, pas pondérés),
//  décroissance linéaire sur fenêtres en jours FRACTIONNAIRES, cumul plafonné.
export const MALUS = { recette: 0.5, principal: 0.3, gabarit: 0.15 };
export const FENETRES = { recette: 7, principal: 3.5, gabarit: 7 }; // jours
export const MALUS_CAP = 0.7; // la triple peine ne devient jamais un filtre dur déguisé

//  Catégories « périssables » (bonus de consommation d'inventaire § 3.4)
const PERISSABLES = new Set(["legume", "laitage", "fruit"]);

const clamp01 = (v) => Math.max(0, Math.min(1, v));

// ---------------------------------------------------------------------------
//  Anti-répétition

//  Malus anti-répétition d'un candidat vs l'historique, à l'instant `now`.
//  Par axe (recette / ingrédient principal / gabarit) : on prend l'occurrence la
//  plus récente (contribution max), puis on somme les axes et on plafonne à 0,7.
export function antiRepetitionMalus(candidat, history, now) {
  if (!history?.length || !now) return 0;
  const tNow = new Date(now).getTime();
  const contribution = (axe, correspond) => {
    let meilleur = 0;
    for (const h of history) {
      if (!correspond(h)) continue;
      const ageJours = (tNow - new Date(h.date).getTime()) / JOUR_MS; // fractionnaire
      if (ageJours < 0) continue; // entrée future : ignorée
      const decroissance = Math.max(0, (FENETRES[axe] - ageJours) / FENETRES[axe]);
      meilleur = Math.max(meilleur, MALUS[axe] * decroissance);
    }
    return meilleur;
  };
  const total =
    contribution("recette", (h) => h.recetteId != null && h.recetteId === candidat.recetteId) +
    contribution("principal", (h) => h.ingredientPrincipal != null && h.ingredientPrincipal === candidat.ingredientPrincipal) +
    contribution("gabarit", (h) => h.gabaritId != null && h.gabaritId === candidat.gabaritId);
  return Math.min(MALUS_CAP, total);
}

//  Restes multi-portions : exemptés d'anti-répétition et bonifiés (§ 3.1).
//  Détecté par candidat.reste, ou par un item pointant un pantry item reste:true.
function utiliseReste(candidat, pantry) {
  if (candidat.reste) return true;
  if (!pantry?.length) return false;
  const parId = new Map(pantry.map((p) => [p.id, p]));
  return (candidat.items ?? []).some((it) => parId.get(it.pantryId)?.reste === true);
}

// ---------------------------------------------------------------------------
//  Composantes du score

//  Macros du candidat : champs kcal/prot s'ils existent, sinon recalcul items.
function macrosDe(candidat) {
  if (candidat.kcal != null) return { kcal: candidat.kcal, prot: candidat.prot ?? 0 };
  const items = (candidat.items ?? []).filter((it) => it.ing?.kcal100 != null);
  if (!items.length) return { kcal: null, prot: null };
  return {
    kcal: items.reduce((s, it) => s + (it.ing.kcal100 * (it.qty ?? 0)) / 100, 0),
    prot: items.reduce((s, it) => s + ((it.ing.p100 ?? 0) * (it.qty ?? 0)) / 100, 0),
  };
}

//  Proximité budget ∈ [0,1] : kcal = plafond (dépasser coûte 2× plus cher que
//  sous-consommer), protéines = plancher ; bonus si protéines dépassées SANS
//  exploser les kcal (≤ 110 % du plafond).
function partBudget(candidat, budget) {
  const { kcal, prot } = macrosDe(candidat);
  if (!budget?.kcal || kcal == null) return 0.5; // macros inconnues (ex. reste) : neutre
  const ecartKcal = (kcal - budget.kcal) / budget.kcal;
  const penaliteKcal = ecartKcal > 0 ? Math.min(1, 2 * ecartKcal) : Math.min(1, -ecartKcal * 0.8);
  const ratioProt = budget.prot > 0 ? prot / budget.prot : 1;
  const penaliteProt = ratioProt >= 1 ? 0 : Math.min(1, 1.5 * (1 - ratioProt));
  let part = 1 - 0.5 * penaliteKcal - 0.5 * penaliteProt;
  if (ratioProt > 1 && kcal <= 1.1 * budget.kcal) part += Math.min(0.15, 0.6 * (ratioProt - 1));
  return clamp01(part);
}

//  Consommation d'inventaire ∈ [0,1] : neutre à 0,5 ; bonus restes (+0,5),
//  items entamés / fins de stock (+0,15) et périssables (+0,1).
function partInventaire(candidat, pantry, reste) {
  let part = 0.5;
  if (reste) part += 0.5;
  const parId = new Map((pantry ?? []).map((p) => [p.id, p]));
  for (const it of candidat.items ?? []) {
    const p = parId.get(it.pantryId);
    if (p && !p.reste && etatEffectif(p) === "entame") part += 0.15;
    if (it.ing?.cat && PERISSABLES.has(it.ing.cat)) part += 0.1;
  }
  return clamp01(part);
}

//  Préférences apprises ∈ [0,1] (optionnelles, § 3.4) : taux d'acceptation lissé
//  par un prior Beta(2,2) — pas de conclusion sur 2 observations. Neutre : 0,5.
//  prefs = { recettes: {id: {accept, reject}}, ingredients: {slug: {accept, reject}} }
function partPrefs(candidat, prefs) {
  if (!prefs) return 0.5;
  const beta = (s) => ((s.accept ?? 0) + 2) / ((s.accept ?? 0) + (s.reject ?? 0) + 4);
  const taux = [];
  const r = candidat.recetteId != null ? prefs.recettes?.[candidat.recetteId] : null;
  if (r) taux.push(beta(r));
  const i = candidat.ingredientPrincipal != null ? prefs.ingredients?.[candidat.ingredientPrincipal] : null;
  if (i) taux.push(beta(i));
  if (!taux.length) return 0.5;
  return clamp01(taux.reduce((s, v) => s + v, 0) / taux.length);
}

// ---------------------------------------------------------------------------
//  Exclusions de session (§ 3.4) — filtre dur ÉPHÉMÈRE, la seule exception
//  légitime au « jamais de filtre dur » (commande explicite de l'utilisateur).

//  Un candidat est exclu si sa recette, son gabarit, son ingrédient principal ou
//  l'un de ses ingrédients figure dans les exclusions.
export function estExclu(candidat, exclusions) {
  if (!exclusions?.length) return false;
  const ex = new Set(exclusions);
  if (candidat.recetteId != null && ex.has(candidat.recetteId)) return true;
  if (candidat.gabaritId != null && ex.has(candidat.gabaritId)) return true;
  if (candidat.ingredientPrincipal != null && ex.has(candidat.ingredientPrincipal)) return true;
  return (candidat.items ?? []).some((it) => {
    const slug = it.slug ?? it.ing?.slug ?? it.ref;
    return slug != null && ex.has(slug);
  });
}

//  Filtre dur AVANT scoring. Mode dégradé (« l'app répond toujours », § 1) : si
//  le pool devient vide, les écartés sont re-proposés avec mention d'écart.
export function applySessionExclusions(candidats, exclusions) {
  if (!exclusions?.length) return { pool: candidats ?? [], ecartes: [], degraded: false };
  const pool = [];
  const ecartes = [];
  for (const c of candidats ?? []) (estExclu(c, exclusions) ? ecartes : pool).push(c);
  if (!pool.length && ecartes.length) {
    return { pool: ecartes.map((c) => ({ ...c, mention: "exclusion-session" })), ecartes, degraded: true };
  }
  return { pool, ecartes, degraded: false };
}

// ---------------------------------------------------------------------------
//  scoreCandidate(candidat, { budget, history, pantry, prefs, exclusions, now })
//  → { score, excluded, reste, parts: { budget, fraicheur, inventaire, prefs } }
//
//  score = 0,5·budget + 0,3·inventaire + 0,2·prefs − malusAntiRépétition (+0,15
//  si reste), borné à [0,1]. Le malus est ABSOLU (soustrait tel quel) ; il est
//  lisible via parts.fraicheur = 1 − malus. Les restes sont exemptés du malus.
//  Les exclusions de session court-circuitent tout (score 0, excluded: true) —
//  le filtre de pool applySessionExclusions reste la voie normale, AVANT scoring.
export function scoreCandidate(candidat, ctx = {}) {
  const { budget, history = [], pantry = [], prefs, exclusions, now } = ctx;
  if (estExclu(candidat, exclusions)) {
    return { score: 0, excluded: true, reste: false, parts: { budget: 0, fraicheur: 0, inventaire: 0, prefs: 0 } };
  }
  const reste = utiliseReste(candidat, pantry);
  const malus = reste ? 0 : antiRepetitionMalus(candidat, history, now);
  const parts = {
    budget: partBudget(candidat, budget),
    fraicheur: 1 - malus,
    inventaire: partInventaire(candidat, pantry, reste),
    prefs: partPrefs(candidat, prefs),
  };
  const base = 0.5 * parts.budget + 0.3 * parts.inventaire + 0.2 * parts.prefs;
  const score = clamp01(base - malus + (reste ? 0.15 : 0));
  return { score, excluded: false, reste, parts };
}

// ---------------------------------------------------------------------------
//  Top-k dissimilaire — MMR (§ 3.4)

//  Poids kcal des ingrédients d'un candidat (part de chaque slug dans les kcal
//  totales) — « le persil ne compte pas comme le tofu ».
function poidsKcal(candidat) {
  const w = new Map();
  let total = 0;
  for (const it of candidat.items ?? []) {
    const slug = it.slug ?? it.ing?.slug ?? it.ref;
    if (slug == null) continue;
    const kcal = it.ing?.kcal100 != null ? (it.ing.kcal100 * (it.qty ?? 0)) / 100 : 1;
    w.set(slug, (w.get(slug) ?? 0) + kcal);
    total += kcal;
  }
  if (total > 0) for (const [slug, v] of w) w.set(slug, v / total);
  return w;
}

//  Jaccard pondéré par la part de kcal : Σ min(wA, wB) / Σ max(wA, wB).
function jaccardKcal(a, b) {
  const wa = poidsKcal(a);
  const wb = poidsKcal(b);
  if (!wa.size && !wb.size) return 0;
  let num = 0;
  let den = 0;
  const slugs = new Set([...wa.keys(), ...wb.keys()]);
  for (const slug of slugs) {
    const va = wa.get(slug) ?? 0;
    const vb = wb.get(slug) ?? 0;
    num += Math.min(va, vb);
    den += Math.max(va, vb);
  }
  return den > 0 ? num / den : 0;
}

//  sim ∈ [0,1] : 1 si même recette, sinon 0,4·[même gabarit] + 0,4·[même
//  ingrédient principal] + 0,2·Jaccard pondéré kcal des ingrédients.
export function similarity(a, b) {
  if (a.recetteId != null && a.recetteId === b.recetteId) return 1;
  let s = 0;
  if (a.gabaritId != null && a.gabaritId === b.gabaritId) s += 0.4;
  if (a.ingredientPrincipal != null && a.ingredientPrincipal === b.ingredientPrincipal) s += 0.4;
  s += 0.2 * jaccardKcal(a, b);
  return s;
}

//  selectDiverse(candidats, k, { lambda = 0.7 }) → [candidat]
//  Sélection itérative argmax[λ·score − (1−λ)·max sim(c, déjà choisis)].
//  Le score vient de candidat.score (candidats déjà passés par scoreCandidate).
//  Contrainte DURE (recettes, gabarits et ingrédients principaux tous différents)
//  tant que le pool ≥ 2k ; relâchée en pénalité sinon, ou dès qu'elle ne laisse
//  plus aucun candidat. Ne renvoie JAMAIS vide si des candidats existent.
export function selectDiverse(candidats, k, opts = {}) {
  const { lambda = 0.7 } = opts;
  const pool = [...(candidats ?? [])];
  if (!pool.length || k <= 0) return [];
  const contrainteDure = pool.length >= 2 * k;
  const selection = [];
  const restants = new Set(pool);

  const conflit = (c, s) =>
    (c.recetteId != null && c.recetteId === s.recetteId) ||
    (c.gabaritId != null && c.gabaritId === s.gabaritId) ||
    (c.ingredientPrincipal != null && c.ingredientPrincipal === s.ingredientPrincipal);

  while (selection.length < k && restants.size) {
    let eligibles = [...restants];
    if (contrainteDure && selection.length) {
      const filtres = eligibles.filter((c) => selection.every((s) => !conflit(c, s)));
      if (filtres.length) eligibles = filtres; // sinon : relâchement automatique
    }
    let meilleur = null;
    let meilleureVal = -Infinity;
    for (const c of eligibles) {
      const maxSim = selection.length ? Math.max(...selection.map((s) => similarity(c, s))) : 0;
      const val = lambda * (c.score ?? 0) - (1 - lambda) * maxSim;
      if (val > meilleureVal) {
        meilleureVal = val;
        meilleur = c;
      }
    }
    selection.push(meilleur);
    restants.delete(meilleur);
  }
  return selection;
}
