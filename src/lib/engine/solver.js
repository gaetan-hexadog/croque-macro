//  solver.js — étape B du moteur de repas (spec § 3.3) : ajustement des quantités.
//  GLOUTON EXACT PAR RATIO (sac à dos fractionnaire) — PAS un système 2×2 :
//  - montée des leviers ajustables par rendement p/k décroissant (kcal100 nul → rendement
//    infini, donc en premier) jusqu'au plancher protéines ;
//  - descente par k/p décroissant (la matière grasse, p≈0, part en premier) jusqu'au
//    plafond kcal, chaque levier clampé à ses bornes ;
//  - re-vérification du plancher → feasible:false PROUVÉ avec gap sinon (jamais de boucle).
//  Tolérances ASYMÉTRIQUES : kcal ±tolKcal (12 % par défaut), protéines −tolProt max (5 %).
//  Ingrédients discrets (œufs, tranches, doses) : énumération des pas entiers plausibles
//  × ajustement continu des autres, meilleure combinaison faisable conservée.
//  Arrondi final des grammages continus ajustés à 5 g PUIS recalcul des macros (jamais avant).
//  Cas à un levier : le glouton se réduit exactement à l'intersection d'intervalles
//  [(P−P0)/p, (K−K0)/k] ∩ [min, max] (vide = infaisable).
//
//  Module PUR : aucune dépendance, toutes les données injectées.

const EPS = 1e-9;

/** Macros totales (kcal, prot) d'une liste d'items { ing, qty } — linéaire en qty. */
export function computeMacros(items) {
  let kcal = 0;
  let prot = 0;
  for (const it of items) {
    kcal += ((it.ing.kcal100 || 0) * it.qty) / 100;
    prot += ((it.ing.p100 || 0) * it.qty) / 100;
  }
  return { kcal, prot };
}

//  Pas entier d'un ingrédient discret (g par pièce/tranche/dose). null → traité en continu.
function stepOf(ing) {
  const u = ing?.unites;
  if (!u) return null;
  return u.piece_g || u.tranche_g || u.dose_g || null;
}

//  Rendement de montée : protéines gagnées par kcal ajoutée. kcal100 nul → infini.
function ratioUp(ing) {
  if ((ing.kcal100 || 0) <= 0) return Infinity;
  return (ing.p100 || 0) / ing.kcal100;
}

//  Rendement de descente : kcal perdues par protéine sacrifiée. p100 nul → infini
//  (la matière grasse part en premier).
function ratioDown(ing) {
  if ((ing.p100 || 0) <= 0) return Infinity;
  return (ing.kcal100 || 0) / ing.p100;
}

//  Une passe de glouton : montée jusqu'à protTarget, puis descente jusqu'à kcalTarget.
//  Mutation en place des qty des leviers continus (lever:true). Terminaison ≤ 2×L étapes
//  (chaque étape sature un levier ou atteint la cible).
function greedyPass(work, protTarget, kcalTarget) {
  let { kcal, prot } = computeMacros(work);

  //  Montée : leviers utiles (p100 > 0) par p/k décroissant.
  if (prot < protTarget - EPS) {
    const ups = work
      .filter((it) => it.lever && (it.ing.p100 || 0) > 0)
      .sort((a, b) => ratioUp(b.ing) - ratioUp(a.ing) || a.idx - b.idx);
    for (const it of ups) {
      if (prot >= protTarget - EPS) break;
      const room = it.max - it.qty;
      if (room <= EPS) continue;
      const need = protTarget - prot;
      const dq = Math.min(room, (need * 100) / it.ing.p100);
      it.qty += dq;
      prot += (dq * it.ing.p100) / 100;
      kcal += (dq * (it.ing.kcal100 || 0)) / 100;
    }
  }

  //  Descente : leviers caloriques (kcal100 > 0) par k/p décroissant.
  if (kcal > kcalTarget + EPS) {
    const downs = work
      .filter((it) => it.lever && (it.ing.kcal100 || 0) > 0)
      .sort((a, b) => ratioDown(b.ing) - ratioDown(a.ing) || a.idx - b.idx);
    for (const it of downs) {
      if (kcal <= kcalTarget + EPS) break;
      const room = it.qty - it.min;
      if (room <= EPS) continue;
      const excess = kcal - kcalTarget;
      const dq = Math.min(room, (excess * 100) / it.ing.kcal100);
      it.qty -= dq;
      kcal -= (dq * it.ing.kcal100) / 100;
      prot -= (dq * (it.ing.p100 || 0)) / 100;
    }
  }

  return { kcal, prot };
}

//  Arrondi pratique : les leviers continus AJUSTÉS sont ramenés au multiple de 5 g le plus
//  proche dans [min, max] (les quantités de base non touchées restent telles quelles : elles
//  sont déjà « pratiques », les arrondir gratuitement dénaturerait la recette). Les discrets
//  sont déjà des pas entiers exacts. Le recalcul des macros vient APRÈS, jamais avant.
function roundWork(work) {
  for (const it of work) {
    if (!it.lever) continue;
    if (Math.abs(it.qty - it.baseQty) <= EPS) continue; // non ajusté → intact
    let r = Math.round(it.qty / 5) * 5;
    if (r < it.min) r += 5;
    if (r > it.max) r -= 5;
    //  Intervalle plus étroit que 5 g : on garde la valeur exacte clampée, au gramme.
    if (r < it.min || r > it.max) {
      r = Math.min(it.max, Math.max(it.min, Math.round(it.qty)));
    }
    it.qty = r;
  }
}

//  Produit cartésien des domaines discrets (domaines minuscules : 2-4 œufs…).
function cartesian(domains) {
  return domains.reduce(
    (acc, d) => acc.flatMap((combo) => d.map((v) => [...combo, v])),
    [[]]
  );
}

/**
 * Ajuste les quantités d'un repas instancié pour atteindre le plancher protéines sous le
 * plafond kcal (spec § 3.3).
 *
 * @param {object}   params
 * @param {object[]} params.items    [{ ing: Ingredient, qty, min, max, ajustable }]
 * @param {number}   params.protFloor  plancher protéines du repas (g)
 * @param {number}   params.kcalCap    plafond kcal du repas
 * @param {number}   [params.tolKcal=0.12]  tolérance kcal (symétrique, ±12 %)
 * @param {number}   [params.tolProt=0.05]  tolérance protéines (asymétrique, −5 % max)
 * @returns {{ items: object[], kcal: number, prot: number, feasible: boolean,
 *             gap: {kcal: number, prot: number} | null }}
 *   gap = écart de l'état le plus favorable atteignable aux cibles STRICTES
 *   (post-arrondi) ; null si faisable dans les tolérances.
 */
export function adjustQuantities({
  items,
  protFloor,
  kcalCap,
  tolKcal = 0.12,
  tolProt = 0.05,
}) {
  const PROT_MIN = protFloor * (1 - tolProt); // plancher toléré (−5 % max)
  const KCAL_MAX = kcalCap * (1 + tolKcal); // plafond toléré (+12 %)

  //  Leviers discrets : ajustables, marqués discret, avec un pas connu.
  const discrets = items
    .map((it, i) => ({ it, i }))
    .filter(({ it }) => it.ajustable && it.ing.discret && stepOf(it.ing));

  //  Domaine entier de chaque discret : n ∈ [⌈min/pas⌉, ⌊max/pas⌋] (2-4 œufs typiquement).
  const domains = discrets.map(({ it }) => {
    const step = stepOf(it.ing);
    const nMin = Math.max(0, Math.ceil((it.min - EPS) / step));
    const nMax = Math.floor((it.max + EPS) / step);
    const values = [];
    for (let n = nMin; n <= nMax; n++) values.push(n * step);
    //  Bornes plus étroites qu'un pas : rester au pas entier le plus proche de la base.
    if (!values.length) values.push(Math.max(1, Math.round(it.qty / step)) * step);
    return values;
  });

  //  État de travail : copie mutable, les discrets sont FIGÉS par combinaison (lever:false),
  //  seuls les continus ajustables sont lissés par le glouton.
  const makeWork = (combo) =>
    items.map((it, i) => {
      const j = discrets.findIndex((d) => d.i === i);
      const qty = j >= 0 ? combo[j] : it.qty;
      return {
        ing: it.ing,
        qty,
        min: it.min,
        max: it.max,
        baseQty: it.qty,
        lever: it.ajustable && j < 0,
        idx: i,
      };
    });

  let best = null;
  for (const combo of cartesian(domains)) {
    //  Passe stricte : montée au plancher, descente au plafond.
    let work = makeWork(combo);
    let m = greedyPass(work, protFloor, kcalCap);
    if (!(m.prot >= PROT_MIN - EPS && m.kcal <= KCAL_MAX + EPS)) {
      //  Passe relâchée depuis la base : montée au plancher STRICT, descente au plafond
      //  TOLÉRÉ seulement — maximise les protéines conservées ; si le plancher toléré
      //  casse encore, l'infaisabilité est PROUVÉE (la descente k/p décroissant est
      //  protéino-optimale pour cette structure linéaire).
      work = makeWork(combo);
      m = greedyPass(work, protFloor, KCAL_MAX);
    }

    //  Arrondi 5 g des continus ajustés PUIS recalcul exact des macros.
    roundWork(work);
    m = computeMacros(work);

    const feasible = m.prot >= PROT_MIN - 1e-6 && m.kcal <= KCAL_MAX + 1e-6;
    const cand = {
      work,
      kcal: m.kcal,
      prot: m.prot,
      feasible,
      gap: feasible
        ? null
        : {
            kcal: Math.max(0, m.kcal - kcalCap),
            prot: Math.max(0, protFloor - m.prot),
          },
      //  Distance aux quantités de base : critère de moindre surprise entre combinaisons.
      dist: work.reduce((s, it) => s + Math.abs(it.qty - it.baseQty), 0),
    };
    best = pickBetter(best, cand);
  }

  return {
    items: items.map((it, i) => ({ ...it, qty: best.work[i].qty })),
    kcal: best.kcal,
    prot: best.prot,
    feasible: best.feasible,
    gap: best.gap,
  };
}

//  Meilleure combinaison : faisable d'abord ; entre faisables, la plus proche de la base
//  (moindre surprise), puis la plus protéinée, puis la moins calorique ; entre infaisables,
//  le plus petit gap protéines, puis kcal, puis la distance.
function pickBetter(a, b) {
  if (!a) return b;
  if (a.feasible !== b.feasible) return a.feasible ? a : b;
  if (a.feasible) {
    if (Math.abs(a.dist - b.dist) > EPS) return a.dist < b.dist ? a : b;
    if (Math.abs(a.prot - b.prot) > EPS) return a.prot > b.prot ? a : b;
    return a.kcal <= b.kcal ? a : b;
  }
  if (Math.abs(a.gap.prot - b.gap.prot) > EPS) return a.gap.prot < b.gap.prot ? a : b;
  if (Math.abs(a.gap.kcal - b.gap.kcal) > EPS) return a.gap.kcal < b.gap.kcal ? a : b;
  return a.dist <= b.dist ? a : b;
}
