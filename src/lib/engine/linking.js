//  linking.js — liaison pantry → référentiel (spec § 3.1, chantier 1).
//  Module PUR : aucune dépendance, aucune I/O, toutes les données en arguments.
//
//  matchPantryItem(name, referentiel, aliases) cherche l'ingrédient du référentiel
//  qui correspond à un nom saisi librement (« Tofu bio du marché » → tofu-ferme) :
//    1. alias appris (confirmations humaines passées) — prioritaires sur tout ;
//    2. exact sur le nom OU le slug normalisés (accents, casse, pluriels, ponctuation,
//       mots-outils/qualificatifs ignorés) → liaison silencieuse possible (confiance 1) ;
//    3. fuzzy = recouvrement de tokens pondéré par leur longueur (Dice) — JAMAIS
//       auto-appliqué : kind 'fuzzy' exige une confirmation utilisateur, quel que
//       soit le score. Sous le seuil de suggestion (0,6) : null (pas de bruit).

//  Seuil sous lequel on ne suggère rien — spec § 3.1.
export const SUGGEST_THRESHOLD = 0.6;

//  Mots-outils (grammaire) : ne disent rien de l'identité de l'aliment.
//  Comparés APRÈS normalisation/singulier (« des » fait 3 lettres → pas de strip).
const STOP = new Set([
  "de", "du", "des", "le", "la", "les", "un", "une", "au", "aux",
  "en", "et", "ou", "avec", "sans", "pour", "mon", "ma", "mes", "d", "l", "a",
]);
//  Qualificatifs commerciaux : « bio », « du marché »… décrivent la provenance,
//  pas l'aliment — ignorés par le matching (sinon « Tofu bio du marché » ne
//  recouperait jamais « Tofu ferme »).
const QUALIF = new Set([
  "bio", "frais", "fraiche", "nature", "marche", "maison", "surgele", "congele",
  "entier", "classique", "tradition",
]);

//  Accents + ligatures (NFD ne décompose PAS œ/æ), casse.
const deburr = (s) => String(s || "")
  .toLowerCase()
  .replace(/œ/g, "oe").replace(/æ/g, "ae")
  .normalize("NFD").replace(/[̀-ͯ]/g, "");

//  Pluriels simples : s/x final retiré (mots ≥ 4 lettres — « pois » → « poi » des
//  deux côtés : la normalisation est cohérente, pas linguistique).
const singulier = (t) => (t.length >= 4 && /[sx]$/.test(t) ? t.slice(0, -1) : t);

//  Normalisation d'un nom libre : minuscules, accents, ponctuation → espace,
//  pluriels simples. C'est LA forme canonique — les alias appris sont indexés
//  dessus (l'UI doit passer par cette fonction pour écrire/lire refAliases).
export function normalizeName(s) {
  return deburr(s)
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(singulier)
    .join(" ");
}

//  Tokens significatifs : mots courts (≤ 2), mots-outils et qualificatifs ignorés.
const significant = (norm) => norm.split(" ").filter((t) => t.length > 2 && !STOP.has(t) && !QUALIF.has(t));

//  Clé d'égalité exacte : tokens significatifs, ordre ignoré.
const sigKey = (tokens) => [...tokens].sort().join(" ");

//  Recouvrement pondéré (Dice) : 2·Σ poids(communs) / (Σ poids(a) + Σ poids(b)),
//  poids = longueur du token (un mot long est plus discriminant qu'un court).
function dice(a, b) {
  const A = new Set(a), B = new Set(b);
  let wa = 0, wb = 0, com = 0;
  for (const t of A) wa += t.length;
  for (const t of B) { wb += t.length; if (A.has(t)) com += t.length; }
  return wa && wb ? (2 * com) / (wa + wb) : 0;
}

//  Matche un nom libre contre le référentiel.
//    name        : texte saisi (item pantry)
//    referentiel : [{ slug, nom, … }] (contrat README)
//    aliases     : { nom_normalisé → refId } appris des confirmations
//  → { refId, confidence: 0..1, kind: 'exact' | 'alias' | 'fuzzy' } | null
export function matchPantryItem(name, referentiel = [], aliases = {}) {
  const norm = normalizeName(name);
  if (!norm) return null;

  //  1. Alias appris — prioritaire même sur un fuzzy à meilleur score : c'est une
  //  décision humaine passée. Ignoré si le slug visé a disparu du référentiel.
  const aliasRef = aliases && aliases[norm];
  if (aliasRef && referentiel.some((r) => r && r.slug === aliasRef)) {
    return { refId: aliasRef, confidence: 1, kind: "alias" };
  }

  const tokens = significant(norm);
  if (!tokens.length) return null;
  const key = sigKey(tokens);

  let best = null;
  for (const r of referentiel) {
    if (!r || !r.slug) continue;
    const nomToks = significant(normalizeName(r.nom ?? r.name));
    const slugToks = significant(normalizeName(String(r.slug).replace(/-/g, " ")));
    //  2. Exact : mêmes tokens significatifs (ordre ignoré) sur le nom OU le slug.
    if ((nomToks.length && key === sigKey(nomToks)) || (slugToks.length && key === sigKey(slugToks))) {
      return { refId: r.slug, confidence: 1, kind: "exact" };
    }
    //  3. Fuzzy : meilleur recouvrement des deux faces (nom, slug).
    const score = Math.max(dice(tokens, nomToks), dice(tokens, slugToks));
    if (score > 0 && (!best || score > best.confidence)) {
      best = { refId: r.slug, confidence: score, kind: "fuzzy" };
    }
  }
  return best && best.confidence >= SUGGEST_THRESHOLD ? best : null;
}
