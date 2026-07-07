// engine/freeCardio.js — cardio libre (rameur off-day), à part du programme A/B/C.
// Flag `free: true`, sessionId "cardio-libre", pas de `data` (donc invisible pour
// force/PR/assiduité). Compte seulement pour la SÉRIE de semaines actives + l'histo.
export const FREE_CARDIO_ID = "cardio-libre";

export function makeFreeCardio({ week, minutes, distance = "", rowerLevel = "", rpe = "", notes = "" }) {
  return {
    id: `free-${Date.now()}`, date: new Date().toISOString(), completed: true, free: true,
    sessionId: FREE_CARDIO_ID, week, cardioData: { minutes, distance, rowerLevel, rpe, notes },
  };
}
