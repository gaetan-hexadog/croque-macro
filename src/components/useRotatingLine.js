import { useState, useEffect } from "react";

// ════════════════════════════════════════════════════════════════════════════
//  Messages d'attente de l'assistant — CENTRALISÉS ici (un seul endroit pour
//  ajuster le ton et le wording). Ton NEUTRE, messages d'ACTION impersonnels
//  (formes nominales : « Composition du repas… », « Recherche d'idées… »), qui
//  défilent pour montrer que ça avance (pas figé).
// ════════════════════════════════════════════════════════════════════════════
export const THINKING = {
  meal: [
    "Composition du repas…",
    "Recherche d'idées…",
    "Optimisation des protéines…",
    "Équilibrage calories / plaisir…",
    "Calcul des macros…",
  ],
  plan: [
    "Composition de la journée…",
    "Répartition des protéines…",
    "Recherche de variété…",
    "Calcul des macros…",
  ],
  shopping: [
    "Inspection des placards…",
    "Repérage de la routine…",
    "Recherche de nouveautés…",
    "Composition de la liste…",
  ],
  review: [
    "Relecture de la semaine…",
    "Bilan légumes & protéines…",
    "Repérage des points clés…",
    "Préparation des conseils…",
  ],
  weight: [
    "Relecture des derniers jours…",
    "Distinction eau / gras…",
    "Comparaison repas / balance…",
    "Préparation de l'explication…",
  ],
  adapt: [
    "Adaptation de la recette…",
    "Recalcul des macros…",
    "Respect de l'esprit du plat…",
  ],
};

// Fait défiler une liste de messages tant que `active` est vrai → rassure pendant l'attente
// (« ça avance », pas « c'est figé »). Départ aléatoire (varie à chaque appel), boucle si ça
// traîne. N'installe l'intervalle QUE quand active → pas de re-render à vide sur les écrans
// toujours montés (Jour, Planif). Renvoie le message courant (string).
export function useRotatingLine(messages, active = true, interval = 2200) {
  const n = messages.length;
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!active || n <= 1) return undefined;
    setI(Math.floor(Math.random() * n)); // repart d'un message au hasard à chaque nouvelle attente
    const id = setInterval(() => setI((k) => k + 1), interval);
    return () => clearInterval(id);
  }, [active, n, interval]);
  return n ? messages[i % n] : "";
}
