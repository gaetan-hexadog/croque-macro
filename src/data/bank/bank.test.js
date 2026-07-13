//  ════════════════════════════════════════════════════════════════
//  bank.test.js — protocole qualité de la banque (docs/MOTEUR-REPAS.md § 4).
//  Passes 1-3 EN CODE (la passe 4 = revue humaine, hors scope) :
//    1. Lint schéma      — ids uniques, refs/cats existants, min ≤ base/qty ≤ max,
//                          patrons cohérents, garde-fous végétariens (liste noire).
//    2. Lint plausibilité — bornes de grammage par catégorie, PAR PORTION :
//                          huile 5-30 g, féculent sec 40-120 g (plats),
//                          protéine principale 80-250 g (plats), épices/aromates < 15 g.
//    3. Recalcul         — kcal/portion à quantités de base ∈ [250, 900] (plats)
//                          ou [80, 450] (entrées/desserts/snacks/laitages/fruits) ;
//                          aux bornes max, un plat peut atteindre ≥ 25 g de protéines.
//
//  Conventions d'instanciation des GABARITS (les recettes sont exactes, les
//  gabarits sont des intervalles — le choix d'ingrédient est libre par slot) :
//  - base : intervalle atteignable [slots obligatoires × ingrédient le moins
//    dense ; tous les slots × ingrédient le plus dense] — violation si cet
//    intervalle ne CROISE PAS la fenêtre cible (spec § 4.3 : « rejet si la
//    recette ne peut atteindre aucun couple (kcal, prot) utile »).
//  - protéines : tous les slots (boosters compris) aux bornes max avec le
//    meilleur p100 de leurs catégories.
//  En cas d'échec : c'est la BANQUE qu'on corrige, jamais ce test.
//  ════════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import { BANK } from "./index.js";

const { ingredients, gabarits, patrons, recettes } = BANK;
const bySlug = new Map(ingredients.map((i) => [i.slug, i]));
const CATS = new Set(ingredients.map((i) => i.cat));

const PIECE_TYPES = ["entree", "plat", "accompagnement", "dessert", "laitage", "fruit"];
const TEMPERATURES = ["chaud", "froid", "les_deux"];
const CRENEAUX = ["pdj", "dejeuner", "diner", "snack"];
const PROT_CATS = new Set(["proteine_vegetale", "oeuf"]);
const FECULENT_CATS = new Set(["cereale", "legumineuse"]);

//  Fenêtres kcal/portion par type de pièce (spec § 4.3)
const kcalRange = (type) => (type === "plat" ? [250, 900] : [80, 450]);
const PROT_MAX_PLAT = 25; // g de protéines atteignables aux bornes max d'un plat

//  ── Garde-fous végétariens / profil (spec § 4 + § 5) ─────────────
//  Liste noire de mots — jamais de viande/poisson/gélatine, jamais de
//  chèvre/brebis (feta, pecorino & co n'existent pas dans la banque).
const BLACKLIST = [
  "poulet", "boeuf", "veau", "porc", "lardon", "bacon", "dinde", "canard",
  "agneau", "mouton", "gibier", "viande",
  "thon", "saumon", "cabillaud", "colin", "crevette", "anchois", "poisson",
  "gelatine", "chevre", "brebis", "feta", "pecorino",
];
const norm = (s) =>
  String(s).toLowerCase().replace(/œ/g, "oe").normalize("NFD").replace(/[̀-ͯ]/g, "");
const blacklisted = (text) =>
  BLACKLIST.filter((w) => new RegExp(`\\b${w}s?\\b`).test(norm(text)));

//  ── Helpers macros ────────────────────────────────────────────────
const ofCats = (cats) => ingredients.filter((i) => cats.includes(i.cat));
const minKcal100 = (cats) => Math.min(...ofCats(cats).map((i) => i.kcal100));
const maxKcal100 = (cats) => Math.max(...ofCats(cats).map((i) => i.kcal100));
const maxP100 = (cats) => Math.max(...ofCats(cats).map((i) => i.p100));

//  Macros d'une recette par portion, quantité choisie par `pick(component)`
function recetteMacros(r, pick) {
  let kcal = 0;
  let prot = 0;
  for (const c of r.components) {
    const ing = bySlug.get(c.ref);
    if (!ing) continue; // le ref manquant est déjà une violation de la passe 1
    const q = pick(c);
    kcal += (ing.kcal100 * q) / 100;
    prot += (ing.p100 * q) / 100;
  }
  const portions = r.portions || 1;
  return { kcal: kcal / portions, prot: prot / portions };
}

const fmt = (n) => Math.round(n * 10) / 10;

//  ══ PASSE 1 — lint schéma ═══════════════════════════════════════

describe("passe 1 — lint schéma", () => {
  it("slugs / ids uniques (ingrédients, gabarits, recettes, patrons)", () => {
    const dupes = [];
    for (const [label, list, key] of [
      ["ingredient", ingredients, "slug"],
      ["gabarit", gabarits, "id"],
      ["recette", recettes, "id"],
      ["patron", patrons, "id"],
    ]) {
      const seen = new Set();
      for (const x of list) {
        const id = x[key];
        if (seen.has(id)) dupes.push(`${label} en double : ${id}`);
        seen.add(id);
      }
    }
    expect(dupes).toEqual([]);
  });

  it("ingrédients : champs de base valides", () => {
    const violations = [];
    for (const ing of ingredients) {
      if (!ing.slug) violations.push(`ingrédient sans slug : ${ing.nom}`);
      if (!ing.cat) violations.push(`${ing.slug} : cat manquante`);
      if (!(Number.isFinite(ing.kcal100) && ing.kcal100 >= 0))
        violations.push(`${ing.slug} : kcal100 invalide (${ing.kcal100})`);
      if (!(Number.isFinite(ing.p100) && ing.p100 >= 0))
        violations.push(`${ing.slug} : p100 invalide (${ing.p100})`);
      if (!("ciqual_recherche" in ing))
        violations.push(`${ing.slug} : ciqual_recherche absent`);
      if (ing.ciqual_code !== null)
        violations.push(`${ing.slug} : ciqual_code doit rester null (validation humaine), trouvé ${ing.ciqual_code}`);
    }
    expect(violations).toEqual([]);
  });

  it("gabarits : slots → catégories du référentiel, min ≤ base ≤ max", () => {
    const violations = [];
    for (const g of gabarits) {
      if (!PIECE_TYPES.includes(g.type_de_piece))
        violations.push(`gabarit ${g.id} : type_de_piece inconnu (${g.type_de_piece})`);
      if (!TEMPERATURES.includes(g.temperature))
        violations.push(`gabarit ${g.id} : temperature inconnue (${g.temperature})`);
      if (!g.slots?.length) violations.push(`gabarit ${g.id} : aucun slot`);
      (g.slots || []).forEach((s, idx) => {
        const tag = `gabarit ${g.id}, slot ${idx} [${(s.cats || []).join("+")}]`;
        for (const cat of s.cats || [])
          if (!CATS.has(cat)) violations.push(`${tag} : catégorie inconnue au référentiel (${cat})`);
        if (!s.cats?.length) violations.push(`${tag} : cats vide`);
        if (!(s.min >= 0 && s.min <= s.base && s.base <= s.max))
          violations.push(`${tag} : bornes incohérentes (min ${s.min} ≤ base ${s.base} ≤ max ${s.max} attendu)`);
        if (!(Number.isInteger(s.choix_multiples) && s.choix_multiples >= 1))
          violations.push(`${tag} : choix_multiples invalide (${s.choix_multiples})`);
      });
    }
    expect(violations).toEqual([]);
  });

  it("recettes : refs au référentiel, min ≤ qty ≤ max, un seul principal", () => {
    const violations = [];
    for (const r of recettes) {
      if (!PIECE_TYPES.includes(r.type_de_piece))
        violations.push(`recette ${r.id} : type_de_piece inconnu (${r.type_de_piece})`);
      if (!(Number.isInteger(r.portions) && r.portions >= 1))
        violations.push(`recette ${r.id} : portions invalide (${r.portions})`);
      if (!r.components?.length) violations.push(`recette ${r.id} : aucun component`);
      const principaux = (r.components || []).filter((c) => c.principal);
      if (principaux.length !== 1)
        violations.push(`recette ${r.id} : ${principaux.length} components principal (exactement 1 attendu)`);
      for (const c of r.components || []) {
        const tag = `recette ${r.id}, component ${c.ref}`;
        if (!bySlug.has(c.ref)) {
          violations.push(`${tag} : ref inexistant au référentiel`);
          continue;
        }
        if (!(c.min >= 0 && c.min <= c.qty && c.qty <= c.max))
          violations.push(`${tag} : bornes incohérentes (min ${c.min} ≤ qty ${c.qty} ≤ max ${c.max} attendu)`);
      }
    }
    expect(violations).toEqual([]);
  });

  it("patrons : parts ∈ ]0,1], types connus, contextes et gabarits valides", () => {
    const violations = [];
    const gabaritById = new Map(gabarits.map((g) => [g.id, g]));
    for (const p of patrons) {
      if (!p.pieces?.length) violations.push(`patron ${p.id} : aucune pièce`);
      if (!p.contexte?.length) violations.push(`patron ${p.id} : contexte vide`);
      for (const c of p.contexte || [])
        if (!CRENEAUX.includes(c)) violations.push(`patron ${p.id} : créneau inconnu (${c})`);
      (p.pieces || []).forEach((piece, idx) => {
        const tag = `patron ${p.id}, pièce ${idx} (${piece.type})`;
        if (!PIECE_TYPES.includes(piece.type)) violations.push(`${tag} : type de pièce inconnu`);
        if (!(piece.part > 0 && piece.part <= 1))
          violations.push(`${tag} : part hors ]0,1] (${piece.part})`);
        for (const gid of piece.gabarits || []) {
          const g = gabaritById.get(gid);
          if (!g) violations.push(`${tag} : gabarit inexistant (${gid})`);
          else if (g.type_de_piece !== piece.type)
            violations.push(`${tag} : gabarit ${gid} de type ${g.type_de_piece} ≠ ${piece.type}`);
        }
      });
    }
    expect(violations).toEqual([]);
  });

  it("garde-fous végétariens : aucun mot de la liste noire (viande/poisson/gélatine/chèvre/brebis)", () => {
    const violations = [];
    for (const ing of ingredients) {
      const hay = [ing.slug, ing.nom, ing.ciqual_recherche || "", ...(ing.tags || [])].join(" | ");
      for (const w of blacklisted(hay))
        violations.push(`ingrédient ${ing.slug} : mot interdit « ${w} » (${hay})`);
    }
    for (const r of recettes) {
      const hay = [r.id, r.nom, ...(r.steps || [])].join(" | ");
      for (const w of blacklisted(hay)) violations.push(`recette ${r.id} : mot interdit « ${w} »`);
    }
    for (const g of gabarits)
      for (const w of blacklisted(g.id)) violations.push(`gabarit ${g.id} : mot interdit « ${w} »`);
    expect(violations).toEqual([]);
  });
});

//  ══ PASSE 2 — lint plausibilité (bornes de grammage par catégorie) ═

//  Bornes PAR PORTION à quantité de base. Champ d'application :
//  - matière grasse : partout (slot mono-catégorie / component).
//  - féculent SEC : slots dont toutes les cats ∈ {cereale, legumineuse} ;
//    components à facteur_cuisson (sec) de ces cats — PLATS uniquement
//    (une entrée type houmous utilise légitimement moins de 40 g secs).
//  - protéine : LE slot protéique obligatoire d'un plat (cats ∩ {proteine_vegetale,
//    oeuf}, non optionnel) / le component `principal` de ces cats d'un plat.
//  - épices/aromates : catégorie condiment, partout.
describe("passe 2 — lint plausibilité", () => {
  const HUILE = [5, 30];
  const FECULENT_SEC = [40, 120];
  const PROTEINE = [80, 250];
  const EPICES_MAX = 15;

  it("gabarits : grammages de base plausibles par catégorie", () => {
    const violations = [];
    for (const g of gabarits) {
      (g.slots || []).forEach((s, idx) => {
        const cats = s.cats || [];
        const tag = `gabarit ${g.id}, slot ${idx} [${cats.join("+")}]`;
        if (cats.every((c) => c === "matiere_grasse")) {
          if (s.base < HUILE[0] || s.base > HUILE[1])
            violations.push(`${tag} : matière grasse base ${s.base} g hors [${HUILE}] g`);
        } else if (g.type_de_piece === "plat" && cats.every((c) => FECULENT_CATS.has(c))) {
          if (s.base < FECULENT_SEC[0] || s.base > FECULENT_SEC[1])
            violations.push(`${tag} : féculent base ${s.base} g hors [${FECULENT_SEC}] g/portion`);
        } else if (cats.every((c) => c === "condiment")) {
          if (s.base >= EPICES_MAX)
            violations.push(`${tag} : épices/aromates base ${s.base} g ≥ ${EPICES_MAX} g`);
        }
        if (
          g.type_de_piece === "plat" && !s.optionnel &&
          cats.some((c) => PROT_CATS.has(c))
        ) {
          if (s.base < PROTEINE[0] || s.base > PROTEINE[1])
            violations.push(`${tag} : protéine (slot obligatoire) base ${s.base} g hors [${PROTEINE}] g`);
        }
      });
    }
    expect(violations).toEqual([]);
  });

  it("recettes : grammages par portion plausibles par catégorie", () => {
    const violations = [];
    for (const r of recettes) {
      const portions = r.portions || 1;
      for (const c of r.components || []) {
        const ing = bySlug.get(c.ref);
        if (!ing) continue; // passe 1
        const q = c.qty / portions;
        const tag = `recette ${r.id}, ${c.ref}`;
        if (ing.cat === "matiere_grasse" && (q < HUILE[0] || q > HUILE[1]))
          violations.push(`${tag} : matière grasse ${fmt(q)} g/portion hors [${HUILE}] g`);
        if (
          r.type_de_piece === "plat" && FECULENT_CATS.has(ing.cat) && ing.facteur_cuisson &&
          (q < FECULENT_SEC[0] || q > FECULENT_SEC[1])
        )
          violations.push(`${tag} : féculent sec ${fmt(q)} g/portion hors [${FECULENT_SEC}] g`);
        if (ing.cat === "condiment" && q >= EPICES_MAX)
          violations.push(`${tag} : épices/aromates ${fmt(q)} g/portion ≥ ${EPICES_MAX} g`);
        if (
          r.type_de_piece === "plat" && c.principal && PROT_CATS.has(ing.cat) &&
          (q < PROTEINE[0] || q > PROTEINE[1])
        )
          violations.push(`${tag} : protéine principale ${fmt(q)} g/portion hors [${PROTEINE}] g`);
      }
    }
    expect(violations).toEqual([]);
  });
});

//  ══ PASSE 3 — recalcul des macros ═══════════════════════════════

describe("passe 3 — recalcul kcal/protéines", () => {
  it("recettes : kcal/portion à quantités de base dans la fenêtre du type", () => {
    const violations = [];
    for (const r of recettes) {
      const [lo, hi] = kcalRange(r.type_de_piece);
      const { kcal } = recetteMacros(r, (c) => c.qty);
      if (kcal < lo || kcal > hi)
        violations.push(
          `recette ${r.id} (${r.type_de_piece}) : ${fmt(kcal)} kcal/portion hors [${lo}, ${hi}]`
        );
    }
    expect(violations).toEqual([]);
  });

  it("recettes (plats) : ≥ 25 g de protéines atteignables aux bornes max", () => {
    const violations = [];
    for (const r of recettes) {
      if (r.type_de_piece !== "plat") continue;
      const { prot } = recetteMacros(r, (c) => c.max);
      if (prot < PROT_MAX_PLAT)
        violations.push(
          `recette ${r.id} : plafonne à ${fmt(prot)} g de protéines aux bornes max (< ${PROT_MAX_PLAT} g)`
        );
    }
    expect(violations).toEqual([]);
  });

  it("gabarits : la fenêtre kcal du type est atteignable à quantités de base", () => {
    const violations = [];
    for (const g of gabarits) {
      const [lo, hi] = kcalRange(g.type_de_piece);
      //  Config la plus légère : slots obligatoires, ingrédient le moins calorique.
      const baseLo = (g.slots || [])
        .filter((s) => !s.optionnel)
        .reduce((sum, s) => sum + (minKcal100(s.cats) * s.base) / 100, 0);
      //  Config la plus riche : tous les slots, ingrédient le plus calorique.
      const baseHi = (g.slots || [])
        .reduce((sum, s) => sum + (maxKcal100(s.cats) * s.base) / 100, 0);
      if (baseLo > hi)
        violations.push(
          `gabarit ${g.id} (${g.type_de_piece}) : minimum obligatoire ${fmt(baseLo)} kcal > ${hi} à quantités de base`
        );
      if (baseHi < lo)
        violations.push(
          `gabarit ${g.id} (${g.type_de_piece}) : maximum ${fmt(baseHi)} kcal < ${lo} à quantités de base`
        );
    }
    expect(violations).toEqual([]);
  });

  it("gabarits (plats) : ≥ 25 g de protéines atteignables aux bornes max (boosters compris)", () => {
    const violations = [];
    for (const g of gabarits) {
      if (g.type_de_piece !== "plat") continue;
      const protMax = (g.slots || []).reduce(
        (sum, s) => sum + (maxP100(s.cats) * s.max) / 100,
        0
      );
      if (protMax < PROT_MAX_PLAT)
        violations.push(
          `gabarit ${g.id} : plafonne à ${fmt(protMax)} g de protéines aux bornes max (< ${PROT_MAX_PLAT} g)`
        );
    }
    expect(violations).toEqual([]);
  });
});
