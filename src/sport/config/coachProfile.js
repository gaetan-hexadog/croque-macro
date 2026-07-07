// ════════════════════════════════════════════════════════════════
// coachProfile — textes statiques (FAQ d'adaptation + règles d'or).
// Déplacé verbatim depuis lib/sport.js (Phase 0).
// ════════════════════════════════════════════════════════════════

export const ADAPT_TIPS = [
  { situation: "Je n'ai pas pu finir toutes les séries proprement", response: "Refaire le bloc la semaine suivante au même poids. Pas de honte, c'est prévu. On ne progresse que quand 3 séances complètes passent en forme parfaite." },
  { situation: "J'ai sauté une ou deux séances", response: "Reprendre exactement où on en était, au même poids. Si on a sauté plus d'une semaine entière, redescendre d'un bloc." },
  { situation: "Une charge me semble trop facile", response: "Sur la barre, ne pas accélérer (la progression lente protège tendons et articulations). Sur les kettlebells/poids du corps : ajoute des reps, puis monte de palier." },
  { situation: "Douleur articulaire (pas une simple courbature)", response: "Repos 3-5 jours. Reprise au poids du bloc précédent. Si ça persiste sur le même mouvement, revoir la technique ou consulter un kiné." },
  { situation: "Le développé militaire à 20 kg est trop dur", response: "Faire 5 reps au lieu de 10, et progresser uniquement quand 3 × 10 passent à 20 kg. Les autres mouvements continuent normalement." },
  { situation: "Je n'arrive pas à faire 10 min de corde après la séance", response: "La corde après la séance C est un bonus, pas une obligation. Mieux vaut 5 min bien faites que 10 min épuisantes." },
  { situation: "Je ne maigris pas", response: "L'entraînement crée le déficit musculaire. C'est l'alimentation qui crée le déficit calorique. Vérifier : déficit raisonnable, 1,6-2 g de protéines / kg, sommeil 7-9 h." },
  { situation: "Après les 14 semaines ?", response: "Repartir sur un nouveau cycle de 14 semaines, en démarrant le bloc 1 aux poids du bloc 7-8. La progression ralentira naturellement." },
];

export const RULES = [
  { title: "Technique avant charge", body: "Barre à vide les 2 premières semaines. On augmente le poids seulement quand toutes les séries passent en forme parfaite." },
  { title: "Nutrition = levier n°1", body: "Déficit raisonnable. Protéines : 1,6-2 g/kg. Objectif réaliste : 0,5-1 % du poids/semaine. (Tout ça se suit dans l'onglet Jour.)" },
  { title: "Écouter son corps", body: "Vraie fatigue ou douleur articulaire = on saute la séance. Mieux vaut 2 séances qu'une blessure à 6." },
  { title: "Sommeil & hydratation", body: "7-9 h de sommeil, 2-3 L d'eau/jour. La récupération fait autant que l'entraînement." },
];
