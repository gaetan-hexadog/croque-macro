//  composition.js — couche composition du moteur de repas (spec § 3.6) :
//  assembler des repas COMPLETS (patron → pièces) ou PARTIELS (mode compléter)
//  AU-DESSUS du pipeline pièce (étapes 3.1→3.4 inchangées, appliquées par pièce).
//
//  Principes :
//  - choix du patron selon le contexte (slot) et le budget du créneau : à budget
//    serré (< ~450 kcal) on privilégie moins de pièces ; un patron est écarté si
//    une pièce obligatoire n'a aucun candidat couvrable ;
//  - LE PLAT D'ABORD : il porte le plancher protéines, ajusté sur SA part de
//    budget ; les compléments (dessert/entrée/laitage…) sont choisis ensuite sur
//    le budget RÉSIDUEL et les protéines MANQUANTES (un skyr = bouche-trou
//    protéique arithmétiquement idéal) ;
//  - anti-myopie : jusqu'à 3 plats × 3 compléments développés, le meilleur
//    assemblage GLOBAL gagne (pas de glouton strict aveugle) ;
//  - mode COMPLÉTER : `already` (pièces déjà loggées/prévues, avec leurs macros)
//    = état initial compté dans les totaux, seules les pièces manquantes d'un
//    patron compatible avec l'existant sont proposées ;
//  - diversité intra-assemblage : pas deux pièces dominées par le même
//    ingrédient principal, ni deux pièces à féculent ;
//  - jamais vide : si au moins un plat est couvrable, on dégrade en plat seul
//    avec mention d'écart (gap) plutôt que de ne rien répondre.
//
//  Module PUR : imports intra-engine uniquement, `now` toujours injecté,
//  zéro Date.now() caché.

import { checkFeasibility, instantiate } from "./feasibility.js";
import { adjustQuantities, computeMacros } from "./solver.js";
import { scoreCandidate, applySessionExclusions, selectDiverse } from "./scoring.js";

//  Mêmes tolérances que le solveur (§ 3.3) : le verdict de faisabilité de
//  l'assemblage doit être cohérent avec celui des pièces.
const TOL_KCAL = 0.12;
const TOL_PROT = 0.05;
const EPS = 1e-6;

//  Seuils de contexte budget (§ 3.6.1) : « 620 kcal le soir → 2-3 pièces ;
//  400 → plat seul ». Le prior de patron reste DOUX (jamais un filtre dur) ;
//  seul le budget serré déclenche en plus une préférence ferme pour le patron
//  le plus court parmi les assemblages faisables.
export const SEUIL_BUDGET_SERRE = 450;
const SEUIL_BUDGET_LARGE = 550;
const PRIOR_PATRON = 0.08;

//  Anti-myopie : largeur d'exploration (≤ 3 × 3 = une douzaine d'assemblages,
//  toujours instantané).
const N_PLATS = 3;
const N_COMPLEMENTS = 3;
const MAX_CANDIDATS_PIECE = 24; // garde-fou perf avant ajustement/scoring

//  Catégories « féculent » pour la diversité intra-assemblage (§ 3.6.5).
const FECULENTS = new Set(["cereale", "legumineuse"]);

const clamp01 = (v) => Math.max(0, Math.min(1, v));

// ---------------------------------------------------------------------------
//  Candidats d'une pièce : gabarits instanciés + recettes faisables, filtrés
//  par exclusions de session, AJUSTÉS par le solveur sur le budget de la pièce
//  puis scorés (pipeline pièce complet 3.1→3.4).

//  Référentiel : tableau ou map slug → ingrédient (même souplesse que feasibility).
function toRefMap(referentiel) {
  if (!referentiel) return {};
  if (Array.isArray(referentiel)) return Object.fromEntries(referentiel.map((r) => [r.slug, r]));
  return referentiel;
}

//  Recette faisable → candidat au format commun (items ajustables, macros de
//  base PAR PORTION : le moteur raisonne par portion, la recette peut en servir
//  plusieurs). Les composants optionnels (min 0) non couverts sont omis.
function candidatDeRecette(recette, pantry, opts) {
  const feas = checkFeasibility(recette, pantry, opts);
  if (!feas.feasible) return null;
  const refMap = toRefMap(opts.referentiel);
  const portions = recette.portions > 0 ? recette.portions : 1;
  const couverture = new Map(feas.coverage.filter((c) => c.ref).map((c) => [c.ref, c]));
  const items = [];
  for (const comp of recette.components ?? []) {
    const cov = couverture.get(comp.ref);
    if (!cov && !((comp.min ?? 0) > 0)) continue; // optionnel non couvert : omis
    const ing = refMap[comp.ref];
    if (!ing) return null; // référentiel incomplet : recette inutilisable
    items.push({
      slug: comp.ref,
      ing,
      qty: comp.qty / portions,
      min: (comp.min ?? 0) / portions,
      max: (comp.max ?? comp.qty) / portions,
      ajustable: comp.ajustable !== false,
      pantryId: cov?.pantryId,
      sure: cov ? cov.sure : true,
    });
  }
  if (!items.length) return null;
  const { kcal, prot } = computeMacros(items);
  return {
    recetteId: recette.id,
    gabaritId: null,
    type_de_piece: recette.type_de_piece,
    items,
    ingredientPrincipal: recette.components.find((c) => c.principal)?.ref ?? items[0].slug,
    kcal,
    prot,
    probable: feas.probable,
  };
}

//  Candidats d'une pièce de patron sur SON budget : générés (gabarits du bon
//  type — restreints à piece.gabarits si le patron l'impose — + recettes),
//  filtrés (exclusions de session, mode dégradé conservé), ajustés (solveur :
//  protFloor/kcalCap = budget de la pièce) puis scorés. Tri : faisables
//  d'abord, puis meilleur score.
function candidatsDePiece(piece, budgetPiece, ctx) {
  const { gabarits = [], recettes = [], referentiel, pantry, history, prefs, exclusions, now, matcher, topPerSlot } = ctx;
  const opts = { now, referentiel, matcher, ...(topPerSlot ? { topPerSlot } : {}) };
  const allow = piece.gabarits ? new Set(piece.gabarits) : null;

  const bruts = [];
  for (const g of gabarits) {
    if (g.type_de_piece !== piece.type) continue;
    if (allow && !allow.has(g.id)) continue;
    bruts.push(...instantiate(g, pantry, budgetPiece, opts));
  }
  //  Une liste blanche de gabarits (ex. shake_seul) exclut les recettes libres.
  if (!allow) {
    for (const r of recettes) {
      if (r.type_de_piece !== piece.type) continue;
      const c = candidatDeRecette(r, pantry, opts);
      if (c) bruts.push(c);
    }
  }

  //  Exclusions de session : filtre dur éphémère AVANT ajustement ; si le pool
  //  se vide, applySessionExclusions re-propose les écartés avec mention.
  const { pool } = applySessionExclusions(bruts, exclusions);

  const ajustes = [];
  for (const cand of pool.slice(0, MAX_CANDIDATS_PIECE)) {
    const adj = adjustQuantities({
      items: cand.items,
      protFloor: Math.max(0, budgetPiece.prot ?? 0),
      kcalCap: Math.max(0, budgetPiece.kcal ?? 0),
    });
    const ajuste = { ...cand, items: adj.items, kcal: adj.kcal, prot: adj.prot, feasible: adj.feasible, gap: adj.gap };
    //  Scoring pièce (§ 3.4) sur le budget de la pièce — sans re-passer les
    //  exclusions : le pool est déjà filtré (un pool dégradé serait annulé).
    const note = scoreCandidate(ajuste, { budget: budgetPiece, history, pantry, prefs, now });
    ajuste.score = note.score;
    ajuste.parts = note.parts;
    ajustes.push(ajuste);
  }
  return ajustes.sort((a, b) => Number(b.feasible) - Number(a.feasible) || b.score - a.score);
}

// ---------------------------------------------------------------------------
//  Diversité intra-assemblage (§ 3.6.5) : pas deux pièces dominées par le même
//  ingrédient principal, ni deux pièces portant un féculent.

const aFeculent = (piece) => (piece?.items ?? []).some((it) => it.ing?.cat && FECULENTS.has(it.ing.cat));

function compatibleDiversite(candidat, presents) {
  for (const p of presents) {
    if (p.ingredientPrincipal != null && p.ingredientPrincipal === candidat.ingredientPrincipal) return false;
    if (p.feculent && aFeculent(candidat)) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
//  État initial (mode COMPLÉTER) : les pièces déjà loggées/prévues comptent
//  dans les macros, occupent une pièce du patron et contraignent la diversité.

function etatInitial(already) {
  const pieces = already ?? [];
  let kcal = 0;
  let prot = 0;
  const types = [];
  const descripteurs = [];
  for (const p of pieces) {
    kcal += p.kcal ?? 0;
    prot += p.prot ?? 0;
    types.push(p.type_de_piece ?? p.type ?? "plat");
    descripteurs.push({
      ingredientPrincipal: p.ingredientPrincipal ?? null,
      feculent: p.feculent ?? aFeculent(p),
    });
  }
  return { kcal, prot, types, descripteurs, count: pieces.length };
}

// ---------------------------------------------------------------------------
//  Score d'assemblage : proximité budget des TOTAUX (même forme que la
//  composante budget du scoring pièce : dépasser les kcal coûte 2× plus cher
//  que sous-consommer, le plancher protéines pèse 1,5×, bonus protéines si les
//  kcal restent tenues) + moyenne des scores de pièces + prior de patron.

function fitBudget(kcal, prot, budget) {
  if (!budget?.kcal || kcal == null) return 0.5; // budget inconnu : neutre
  const ecartKcal = (kcal - budget.kcal) / budget.kcal;
  const penaliteKcal = ecartKcal > 0 ? Math.min(1, 2 * ecartKcal) : Math.min(1, -ecartKcal * 0.8);
  const ratioProt = budget.prot > 0 ? prot / budget.prot : 1;
  const penaliteProt = ratioProt >= 1 ? 0 : Math.min(1, 1.5 * (1 - ratioProt));
  let part = 1 - 0.5 * penaliteKcal - 0.5 * penaliteProt;
  if (ratioProt > 1 && kcal <= 1.1 * budget.kcal) part += Math.min(0.15, 0.6 * (ratioProt - 1));
  return clamp01(part);
}

function scoreAssemblage({ kcal, prot, scoresPieces, nbPieces, budget }) {
  const fit = fitBudget(kcal, prot, budget);
  const moyenne = scoresPieces.length
    ? scoresPieces.reduce((s, v) => s + v, 0) / scoresPieces.length
    : 0.5; // rien à proposer (compléter déjà complet) : neutre
  //  Prior de contexte budget (§ 3.6.1) : gros créneau → repas 2-3 pièces ;
  //  budget serré → une seule pièce. Doux : ± 0,08, jamais éliminatoire.
  let prior = 0;
  const cap = budget?.kcal ?? 0;
  if (cap >= SEUIL_BUDGET_LARGE && nbPieces >= 2) prior = PRIOR_PATRON;
  if (cap > 0 && cap < SEUIL_BUDGET_SERRE && nbPieces === 1) prior = PRIOR_PATRON;
  return 0.6 * fit + 0.4 * moyenne + prior;
}

//  Verdict global : les TOTAUX (état initial + pièces proposées) doivent tenir
//  le plancher protéines et le plafond kcal du créneau, dans les tolérances du
//  solveur. gap = écart aux cibles STRICTES sinon.
function finalise({ patronId, pieces, kcal, prot, budget, scoresPieces, nbPiecesTotal }) {
  const feasible =
    prot >= (budget?.prot ?? 0) * (1 - TOL_PROT) - EPS &&
    kcal <= (budget?.kcal ?? Infinity) * (1 + TOL_KCAL) + EPS;
  const gap = feasible
    ? null
    : { kcal: Math.max(0, kcal - (budget?.kcal ?? 0)), prot: Math.max(0, (budget?.prot ?? 0) - prot) };
  const score = scoreAssemblage({ kcal, prot, scoresPieces, nbPieces: nbPiecesTotal, budget });
  const mention = pieces.find((p) => p.candidat?.mention)?.candidat.mention;
  const res = { pieces, kcal, prot, feasible, patron: patronId, gap, score };
  if (mention) res.mention = mention; // ex. « exclusion-session » (pool dégradé)
  return res;
}

// ---------------------------------------------------------------------------
//  Assemblage d'UN patron : plat d'abord (top N_PLATS), puis compléments
//  séquentiels sur budget résiduel, chaque option jugée au score d'assemblage
//  PROSPECTIF (anti-myopie). Retourne { best, tous } ou null (patron écarté :
//  incompatible avec l'existant, ou pièce obligatoire sans candidat).

function assemblerPatron(patron, etat, ctx) {
  const { budget } = ctx;

  //  1. Compatibilité avec l'existant : chaque pièce déjà présente consomme
  //  une pièce du patron de même type — sinon le patron est écarté.
  const libres = [...(patron.pieces ?? [])];
  for (const type of etat.types) {
    const i = libres.findIndex((p) => p.type === type);
    if (i < 0) return null;
    libres.splice(i, 1);
  }

  //  2. Budget résiduel après l'existant, réparti au prorata des parts des
  //  pièces restantes (mode frais : parts nominales du patron ; mode compléter
  //  avec plat déjà loggé : tout le résiduel va aux compléments).
  const residuel = {
    kcal: Math.max(0, (budget?.kcal ?? 0) - etat.kcal),
    prot: Math.max(0, (budget?.prot ?? 0) - etat.prot),
  };
  const totalPart = libres.reduce((s, p) => s + (p.part ?? 1), 0);
  const platPiece = libres.find((p) => p.type === "plat") ?? null;
  const complements = libres.filter((p) => p !== platPiece);

  //  3. LE PLAT D'ABORD : ajusté sur sa part de budget, il porte le plancher.
  let choixPlats = [null]; // null = pas de plat à proposer (déjà présent, ou patron sans plat)
  if (platPiece) {
    const part = totalPart > 0 ? (platPiece.part ?? 1) / totalPart : 1;
    const budgetPlat = { kcal: residuel.kcal * part, prot: residuel.prot * part };
    //  Diversité vis-à-vis de l'existant (§ 3.6.5) : un plat en conflit avec une
    //  pièce déjà posée (même ingrédient principal, deuxième féculent) est écarté
    //  — la règle vaut pour TOUTES les pièces, pas seulement les compléments.
    const plats = candidatsDePiece(platPiece, budgetPlat, ctx)
      .filter((c) => compatibleDiversite(c, etat.descripteurs))
      .slice(0, N_PLATS);
    if (!plats.length) {
      if (!platPiece.optionnel) return null; // pièce obligatoire sans candidat : écarté
    } else {
      choixPlats = plats;
    }
  }

  //  4. Anti-myopie : chaque plat du top est développé avec ses compléments,
  //  le meilleur assemblage GLOBAL l'emporte (≤ N_PLATS × N_COMPLEMENTS).
  const assemblages = [];
  for (const plat of choixPlats) {
    const pieces = [];
    const scores = [];
    let kcal = etat.kcal;
    let prot = etat.prot;
    const presents = [...etat.descripteurs]; // contraintes de diversité déjà posées
    if (plat) {
      pieces.push({ candidat: plat, type_de_piece: platPiece.type });
      scores.push(plat.score ?? 0);
      kcal += plat.kcal;
      prot += plat.prot;
      presents.push({ ingredientPrincipal: plat.ingredientPrincipal ?? null, feculent: aFeculent(plat) });
    }

    let echec = false;
    for (const piece of complements) {
      //  Compléments sur budget RÉSIDUEL et protéines MANQUANTES (§ 3.6.3).
      const budgetPiece = {
        kcal: Math.max(0, (budget?.kcal ?? 0) - kcal),
        prot: Math.max(0, (budget?.prot ?? 0) - prot),
      };
      const options = candidatsDePiece(piece, budgetPiece, ctx)
        .filter((c) => compatibleDiversite(c, presents))
        .slice(0, N_COMPLEMENTS);

      //  Chaque option — et l'omission si la pièce est optionnelle — est jugée
      //  au score de l'assemblage PROSPECTIF, pas au score de pièce isolée.
      let meilleur = null; // { cand: candidat | null, val }
      if (piece.optionnel) {
        meilleur = {
          cand: null,
          val: scoreAssemblage({ kcal, prot, scoresPieces: scores, nbPieces: pieces.length + etat.count, budget }),
        };
      }
      for (const cand of options) {
        const val = scoreAssemblage({
          kcal: kcal + cand.kcal,
          prot: prot + cand.prot,
          scoresPieces: [...scores, cand.score ?? 0],
          nbPieces: pieces.length + etat.count + 1,
          budget,
        });
        if (!meilleur || val > meilleur.val) meilleur = { cand, val };
      }
      if (!meilleur) {
        echec = true; // pièce OBLIGATOIRE sans candidat compatible : branche morte
        break;
      }
      if (meilleur.cand) {
        pieces.push({ candidat: meilleur.cand, type_de_piece: piece.type });
        scores.push(meilleur.cand.score ?? 0);
        kcal += meilleur.cand.kcal;
        prot += meilleur.cand.prot;
        presents.push({
          ingredientPrincipal: meilleur.cand.ingredientPrincipal ?? null,
          feculent: aFeculent(meilleur.cand),
        });
      }
    }
    if (echec) continue;

    assemblages.push(
      finalise({ patronId: patron.id, pieces, kcal, prot, budget, scoresPieces: scores, nbPiecesTotal: pieces.length + etat.count })
    );
  }
  if (!assemblages.length) return null;
  assemblages.sort((a, b) => Number(b.feasible) - Number(a.feasible) || b.score - a.score);
  return { best: assemblages[0], tous: assemblages };
}

//  Mode dégradé (§ 3.6, « jamais vide ») : aucun patron ne passe → plat seul
//  sur tout le budget résiduel, mention explicite. Null SEULEMENT si aucun
//  plat n'est couvrable par l'inventaire.
function fallbackPlatSeul(etat, ctx) {
  const { budget } = ctx;
  const residuel = {
    kcal: Math.max(0, (budget?.kcal ?? 0) - etat.kcal),
    prot: Math.max(0, (budget?.prot ?? 0) - etat.prot),
  };
  const candidats = candidatsDePiece({ type: "plat", part: 1, optionnel: false }, residuel, ctx);
  if (!candidats.length) return null;
  //  Diversité vis-à-vis de l'existant (§ 3.6.5), appliquée aussi en dégradé ;
  //  relâchée si elle vide le pool — « jamais vide » prime (null signifierait
  //  « aucun plat couvrable », ce qui serait faux), même précédent que le mode
  //  dégradé du MMR de scoring.js.
  const compatibles = candidats.filter((c) => compatibleDiversite(c, etat.descripteurs));
  const plat = (compatibles.length ? compatibles : candidats)[0];
  const res = finalise({
    patronId: "plat_seul",
    pieces: [{ candidat: plat, type_de_piece: "plat" }],
    kcal: etat.kcal + plat.kcal,
    prot: etat.prot + plat.prot,
    budget,
    scoresPieces: [plat.score ?? 0],
    nbPiecesTotal: 1 + etat.count,
  });
  res.mention = "degrade";
  return res;
}

//  Patrons éligibles au contexte : le slot doit figurer dans patron.contexte
//  (un patron sans contexte est universel).
const eligiblesAuSlot = (patrons, slot) =>
  (patrons ?? []).filter((p) => !p.contexte || !p.contexte.length || p.contexte.includes(slot));

// ---------------------------------------------------------------------------
//  API publique

/**
 * Assemble le meilleur repas (complet ou partiel) du créneau.
 *
 * @param {object}   params — voir README (contrat § 3.6) :
 *   { patrons, gabarits, recettes, referentiel, pantry, budget: Budget,
 *     history, prefs, exclusions, now, slot, already = [] }
 *   `matcher` (optionnel) est relayé à la faisabilité pour la couverture
 *   « probable » des items pantry non liés.
 * @returns {{ pieces: [{candidat, type_de_piece}], kcal, prot, feasible,
 *             patron, gap } | null}  null si aucun plat n'est couvrable.
 */
export function assembleMeal(params) {
  const { patrons = [], slot, budget, already = [] } = params;
  const etat = etatInitial(already);

  const resultats = [];
  for (const patron of eligiblesAuSlot(patrons, slot)) {
    const r = assemblerPatron(patron, etat, params);
    if (r) resultats.push(r.best);
  }
  if (!resultats.length) return fallbackPlatSeul(etat, params);

  //  Budget serré : préférence FERME pour le patron le plus court parmi les
  //  assemblages faisables (« 400 kcal → plat seul », § 3.6.1).
  const serre = (budget?.kcal ?? 0) > 0 && budget.kcal < SEUIL_BUDGET_SERRE;
  if (serre) {
    const faisables = resultats.filter((r) => r.feasible);
    if (faisables.length) {
      faisables.sort((a, b) => a.pieces.length - b.pieces.length || b.score - a.score);
      return faisables[0];
    }
  }

  //  Cas général : faisable d'abord, puis meilleur score ; les égalités vont
  //  au premier patron déclaré (ordre stable, déterministe).
  let best = resultats[0];
  for (const r of resultats.slice(1)) {
    const gagne =
      Number(r.feasible) - Number(best.feasible) > 0 ||
      (r.feasible === best.feasible && r.score > best.score);
    if (gagne) best = r;
  }
  return best;
}

/**
 * Top-k d'assemblages DISSIMILAIRES (MMR au niveau assemblage, § 3.6) :
 * le pool réunit toutes les variantes développées par patron (anti-myopie),
 * dédoublonnées par signature, puis selectDiverse arbitre score vs similarité
 * (la similarité d'un assemblage est portée par son plat : recette, gabarit,
 * ingrédient principal, plus le Jaccard kcal de TOUS ses items).
 *
 * @param {object} params — mêmes paramètres qu'assembleMeal + { k = 3 }
 * @returns {object[]} [assemblage] (≤ k, jamais vide si un plat est couvrable)
 */
export function suggestMeals(params) {
  const { patrons = [], slot, already = [], k = 3 } = params;
  const etat = etatInitial(already);

  const pool = [];
  for (const patron of eligiblesAuSlot(patrons, slot)) {
    const r = assemblerPatron(patron, etat, params);
    if (r) pool.push(...r.tous);
  }
  if (!pool.length) {
    const fb = fallbackPlatSeul(etat, params);
    return fb ? [fb] : [];
  }

  //  Dédoublonnage par signature (patron + identité des pièces) : deux branches
  //  d'exploration peuvent converger vers le même assemblage.
  const parSignature = new Map();
  for (const a of pool) {
    const sig =
      a.patron +
      "::" +
      a.pieces
        .map((p) => `${p.type_de_piece}:${p.candidat.recetteId ?? p.candidat.gabaritId}:${p.candidat.ingredientPrincipal}`)
        .join("|");
    const prev = parSignature.get(sig);
    if (!prev || a.score > prev.score) parSignature.set(sig, a);
  }

  //  Pseudo-candidat MMR : l'assemblage vu comme une pièce (le plat donne
  //  recette/gabarit/principal, les items agrégés donnent le Jaccard kcal).
  const pseudos = [...parSignature.values()].map((a) => {
    const plat = a.pieces.find((p) => p.type_de_piece === "plat")?.candidat ?? a.pieces[0]?.candidat ?? {};
    return {
      assemblage: a,
      score: a.score,
      recetteId: plat.recetteId ?? null,
      gabaritId: plat.gabaritId ?? null,
      ingredientPrincipal: plat.ingredientPrincipal ?? null,
      items: a.pieces.flatMap((p) => p.candidat.items ?? []),
    };
  });
  return selectDiverse(pseudos, k).map((p) => p.assemblage);
}
