//  feasibility.js — étapes A et A' du moteur de repas (spec § 3.1-3.2).
//
//  Faisabilité sur inventaire FLOU : la PRÉSENCE suffit (etat en_stock/entame) ;
//  la quantité n'est contraignante que si elle est connue, convertible en grammes
//  ET récente (qty_date < 7 jours). Un item « fini »/out ne couvre jamais.
//  Un item non lié (ref_id null) ne peut pas couvrir par catégorie (on ignore sa
//  catégorie) : seul un `matcher` optionnel (name → refId) permet une couverture
//  « probable » (sure: false) — sans matcher, l'item ne couvre pas.
//
//  Module PUR : aucun import hors du dossier engine, `now` toujours en paramètre.

const JOUR_MS = 24 * 60 * 60 * 1000;
const FRAICHEUR_QTY_JOURS = 7; // au-delà, la quantité saisie n'est plus contraignante

// ---------------------------------------------------------------------------
//  Helpers inventaire

//  État effectif d'un item pantry (déduit de out/qty si `etat` absent).
export function etatEffectif(item) {
  if (item.etat) return item.etat;
  if (item.out) return "fini";
  if (item.qty === 0) return "fini";
  return "en_stock";
}

//  Référentiel : accepte un tableau d'ingrédients ou une map slug → ingrédient.
function toRefMap(referentiel) {
  if (!referentiel) return {};
  if (Array.isArray(referentiel)) return Object.fromEntries(referentiel.map((r) => [r.slug, r]));
  return referentiel;
}

//  Lien d'un item pantry vers le référentiel : ref_id direct (sûr), sinon via le
//  matcher optionnel (probable). Retourne null si aucun lien possible.
function refDeItem(item, matcher) {
  if (item.ref_id) return { refId: item.ref_id, sure: true };
  if (typeof matcher === "function") {
    const m = matcher(item.name, item);
    const refId = typeof m === "string" ? m : m?.refId ?? null;
    if (refId) return { refId, sure: false };
  }
  return null;
}

//  Quantité pantry convertie en grammes via les unités du référentiel.
//  Retourne null si inconvertible (elle est alors non contraignante).
function qtyEnGrammes(item, ing) {
  if (item.qty == null) return null;
  const u = String(item.unit || "g").toLowerCase();
  if (u === "g" || u === "ml") return item.qty; // liquides : densité ≈ 1
  const unites = ing?.unites || {};
  if ((u === "pc" || u === "piece" || u === "pièce") && unites.piece_g) return item.qty * unites.piece_g;
  if (u === "tranche" && unites.tranche_g) return item.qty * unites.tranche_g;
  if (u === "dose" && unites.dose_g) return item.qty * unites.dose_g;
  if (u === "pot" && unites.pot_g) return item.qty * unites.pot_g;
  if ((u === "boite" || u === "boîte") && unites.boite_g) {
    // Conserves : c'est le poids ÉGOUTTÉ qui compte pour la faisabilité (§ 2.1)
    return item.qty * (ing?.poids_egoutte ?? unites.boite_g);
  }
  return null;
}

//  Quantité contraignante : connue, convertible ET récente (< 7 jours), sinon null
//  (= la présence suffit, principe de l'inventaire flou § 3.1).
function quantiteContraignante(item, ing, now) {
  const g = qtyEnGrammes(item, ing);
  if (g == null || !item.qty_date || !now) return null;
  const age = (new Date(now).getTime() - new Date(item.qty_date).getTime()) / JOUR_MS;
  if (age >= FRAICHEUR_QTY_JOURS) return null; // quantité périmée : non contraignante
  return g;
}

// ---------------------------------------------------------------------------
//  Étape A — checkFeasibility(recetteOuGabarit, pantry, { now, referentiel, matcher })
//
//  - Recette : chaque composant fixe présent (≥ min si quantité contraignante) ;
//    un composant à min 0 est omissible (son absence ne bloque pas).
//  - Gabarit : chaque slot obligatoire couvert par ≥ 1 item dont la catégorie du
//    référentiel matche `cats`. Les slots optionnels (dont boosters) sont omis.
//  - `probable` : faisable, mais au moins une couverture OBLIGATOIRE repose sur
//    un item non lié (matcher) — proposable, pas garanti.

export function checkFeasibility(cible, pantry, opts = {}) {
  const { now, referentiel, matcher } = opts;
  const refMap = toRefMap(referentiel);
  const missing = [];
  const coverage = [];
  const suretesObligatoires = []; // sûretés des couvertures obligatoires uniquement

  // Composants fixes d'une recette liée (§ 2.3)
  for (const comp of cible.components ?? []) {
    const obligatoire = (comp.min ?? 0) > 0;
    let meilleur = null;
    for (const item of pantry) {
      if (etatEffectif(item) === "fini") continue; // out/fini ne couvre jamais
      const lien = refDeItem(item, matcher);
      if (!lien || lien.refId !== comp.ref) continue;
      const g = quantiteContraignante(item, refMap[comp.ref], now);
      if (g != null && g < (comp.min ?? 0)) continue; // quantité connue, récente, insuffisante
      if (!meilleur || (lien.sure && !meilleur.sure)) meilleur = { ref: comp.ref, pantryId: item.id, sure: lien.sure };
      if (meilleur.sure) break; // une couverture sûre suffit
    }
    if (meilleur) {
      coverage.push(meilleur);
      if (obligatoire) suretesObligatoires.push(meilleur.sure);
    } else if (obligatoire) missing.push(comp.ref);
  }

  // Slots (gabarit, ou slots flexibles d'une recette)
  (cible.slots ?? []).forEach((slot, slotIdx) => {
    const couvrants = [];
    for (const item of pantry) {
      if (etatEffectif(item) === "fini") continue;
      const lien = refDeItem(item, matcher);
      if (!lien) continue; // non lié sans matcher : pas de match de catégorie possible
      const ing = refMap[lien.refId];
      if (!ing || !slot.cats.includes(ing.cat)) continue;
      const g = quantiteContraignante(item, ing, now);
      if (g != null && g < (slot.min ?? 0)) continue;
      couvrants.push({ slotIdx, pantryId: item.id, sure: lien.sure });
    }
    couvrants.sort((a, b) => Number(b.sure) - Number(a.sure)); // les couvertures sûres d'abord
    const retenus = couvrants.slice(0, Math.max(1, slot.choix_multiples ?? 1));
    if (retenus.length) {
      coverage.push(...retenus);
      if (!slot.optionnel) suretesObligatoires.push(retenus[0].sure);
    } else if (!slot.optionnel) {
      missing.push(slot.cats.join("|")); // catégorie(s) manquante(s)
    }
  });

  const feasible = missing.length === 0;
  const probable = feasible && suretesObligatoires.some((s) => !s);
  return { feasible, probable, missing, coverage };
}

// ---------------------------------------------------------------------------
//  Étape A' — instanciation bornée mais pas aveugle (§ 3.2)

//  Pré-score budget-aware d'un ingrédient pour un slot : récompense la densité
//  protéique (p/kcal) et pénalise les densités kcal incompatibles avec le budget
//  du repas (un ingrédient qui, à sa base, mange > 60 % du budget est pénalisé ;
//  infaisable même au min → pénalité maximale).
function prescoreSlot(ing, slot, budget) {
  const ppk = ing.p100 / Math.max(ing.kcal100, 1); // protéines par kcal
  const densiteProt = Math.min(1, ppk / 0.15); // 0,15 g/kcal ≈ excellent (skyr)
  let penalite = 0;
  const capKcal = budget?.kcal > 0 ? budget.kcal : null;
  if (capKcal != null) {
    const kcalBase = (ing.kcal100 * (slot.base ?? 0)) / 100;
    const kcalMin = (ing.kcal100 * (slot.min ?? 0)) / 100;
    if (kcalMin > capKcal) penalite = 1; // ne rentre pas dans le budget, même au min
    else if (kcalBase > 0.6 * capKcal) penalite = Math.min(1, (kcalBase - 0.6 * capKcal) / (0.6 * capKcal));
  }
  return 0.6 * densiteProt + 0.4 * (1 - penalite);
}

//  Top-n par slot DIVERSIFIÉ par profil macro (§ 3.2) : garantit ≥ 1 candidat
//  haute densité protéique (max p/kcal), ≥ 1 basse densité kcal (min kcal100),
//  et le meilleur au pré-score ; complète ensuite par pré-score décroissant.
//  Si n < 3, les garanties de diversité priment sur le meilleur pré-score.
function topDiversifie(pool, n) {
  const tri = [...pool].sort((a, b) => b.prescore - a.prescore);
  if (tri.length <= n) return tri;
  const hauteProt = pool.reduce((m, e) => (e.ing.p100 / Math.max(e.ing.kcal100, 1) > m.ing.p100 / Math.max(m.ing.kcal100, 1) ? e : m));
  const basseKcal = pool.reduce((m, e) => (e.ing.kcal100 < m.ing.kcal100 ? e : m));
  const retenus = [];
  for (const garanti of [hauteProt, basseKcal, tri[0]]) {
    if (retenus.length < n && !retenus.includes(garanti)) retenus.push(garanti);
  }
  for (const e of tri) {
    if (retenus.length >= n) break;
    if (!retenus.includes(e)) retenus.push(e);
  }
  return retenus.sort((a, b) => b.prescore - a.prescore);
}

//  instantiate(gabarit, pantry, budget, { now, topPerSlot = 5, referentiel, matcher })
//  → [candidat], triés par pré-score décroissant. Candidat :
//  { gabaritId, recetteId: null, type_de_piece, items, ingredientPrincipal,
//    kcal, prot, prescore, probable, boosterNeeded, boosterActive, boosterOptions }
//  - items : { slotIdx, slug, ing, qty (= base), min, max, ajustable, booster,
//    pantryId, sure } — quantités de BASE, l'ajustement est l'affaire du solveur.
//  - choix_multiples ≥ 2 : en plus des choix simples, une variante « paire » des
//    2 meilleurs items du slot, base et bornes partagées équitablement.
//  - slots optionnels non couverts : omis. Slot obligatoire non couvert : aucun
//    candidat (gabarit écarté — le mode dégradé vit au-dessus, § 7).
//  - slots booster : activés SEULEMENT si nécessaire (protéines max du candidat
//    sans booster < plancher du budget) ; l'info est exposée au solveur/scoring
//    via boosterNeeded/boosterActive/boosterOptions.
export function instantiate(gabarit, pantry, budget, opts = {}) {
  const { now, topPerSlot = 5, referentiel, matcher } = opts;
  const refMap = toRefMap(referentiel);

  // 1. Pool couvrant par slot (mêmes règles de couverture que checkFeasibility)
  const slots = gabarit.slots ?? [];
  const pools = slots.map((slot) => {
    const pool = [];
    for (const item of pantry) {
      if (etatEffectif(item) === "fini") continue;
      const lien = refDeItem(item, matcher);
      if (!lien) continue;
      const ing = refMap[lien.refId];
      if (!ing || !slot.cats.includes(ing.cat)) continue;
      const g = quantiteContraignante(item, ing, now);
      if (g != null && g < (slot.min ?? 0)) continue;
      if (pool.some((e) => e.ing.slug === ing.slug)) continue; // dédoublonnage par slug
      pool.push({ ing, pantryId: item.id, sure: lien.sure, prescore: prescoreSlot(ing, slot, budget) });
    }
    return topDiversifie(pool, topPerSlot);
  });

  // 2. Sélections par slot (chaque sélection = 1 ou 2 items qui remplissent le slot)
  const fabriqueItem = (slot, slotIdx, entree, part = 1) => ({
    slotIdx,
    slug: entree.ing.slug,
    ing: entree.ing,
    qty: (slot.base ?? 0) * part,
    min: (slot.min ?? 0) * part,
    max: (slot.max ?? 0) * part,
    ajustable: slot.ajustable !== false,
    booster: !!slot.booster,
    pantryId: entree.pantryId,
    sure: entree.sure,
  });

  const selectionsParSlot = []; // slots non-booster inclus dans le produit cartésien
  const boosterSlots = []; // { slot, slotIdx, pool }
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const pool = pools[i];
    if (slot.booster) {
      if (pool.length) boosterSlots.push({ slot, slotIdx: i, pool });
      continue; // jamais dans le produit : activé seulement si nécessaire
    }
    if (!pool.length) {
      if (slot.optionnel) continue; // optionnel non couvert : omis
      return []; // slot obligatoire non couvert : gabarit écarté
    }
    const sels = pool.map((e) => [fabriqueItem(slot, i, e)]);
    if ((slot.choix_multiples ?? 1) >= 2 && pool.length >= 2) {
      // Variante « paire » : les 2 meilleurs items se partagent le slot
      sels.push([fabriqueItem(slot, i, pool[0], 0.5), fabriqueItem(slot, i, pool[1], 0.5)]);
    }
    selectionsParSlot.push(sels);
  }
  if (!selectionsParSlot.length) return [];

  // 3. Produit cartésien (dimension bornée par topPerSlot : millisecondes, § 3.2)
  let combos = [[]];
  for (const sels of selectionsParSlot) {
    const suivant = [];
    for (const combo of combos) for (const sel of sels) suivant.push([...combo, ...sel]);
    combos = suivant;
  }

  // 4. Candidats : macros de base, principal, booster si nécessaire
  const kcalDe = (items) => items.reduce((s, it) => s + (it.ing.kcal100 * it.qty) / 100, 0);
  const protDe = (items) => items.reduce((s, it) => s + (it.ing.p100 * it.qty) / 100, 0);

  const candidats = combos.map((itemsBase) => {
    const items = [...itemsBase];
    // Protéines maximales atteignables sans booster (tous les leviers au max)
    const protMax = items.reduce((s, it) => s + (it.ing.p100 * (it.ajustable ? it.max : it.qty)) / 100, 0);
    const boosterNeeded = budget?.prot != null && protMax < budget.prot;
    const boosterOptions = boosterSlots.flatMap(({ slot, slotIdx, pool }) =>
      pool.map((e) => fabriqueItem(slot, slotIdx, e))
    );
    let boosterActive = false;
    if (boosterNeeded && boosterOptions.length) {
      items.push(boosterOptions[0]); // meilleur booster au pré-score
      boosterActive = true;
    }
    // Ingrédient principal : plus fort apport protéique à la base (hors booster)
    const principal = itemsBase.reduce((m, it) =>
      (it.ing.p100 * it.qty) / 100 > (m.ing.p100 * m.qty) / 100 ? it : m
    );
    // Pré-score du candidat : moyenne des pré-scores de slot, pénalisée si les
    // kcal de base dépassent déjà le budget du repas
    const scores = itemsBase.map((it) => prescoreSlot(it.ing, { base: it.qty, min: it.min }, budget));
    let prescore = scores.reduce((s, v) => s + v, 0) / scores.length;
    const kcal = kcalDe(items);
    if (budget?.kcal > 0 && kcal > budget.kcal) {
      prescore -= 0.3 * Math.min(1, (kcal - budget.kcal) / budget.kcal);
    }
    return {
      gabaritId: gabarit.id,
      recetteId: null,
      type_de_piece: gabarit.type_de_piece,
      items,
      ingredientPrincipal: principal.slug,
      kcal,
      prot: protDe(items),
      prescore,
      probable: items.some((it) => !it.sure),
      boosterNeeded,
      boosterActive,
      boosterOptions,
    };
  });

  return candidats.sort((a, b) => b.prescore - a.prescore);
}
