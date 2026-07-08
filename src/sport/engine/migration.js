// engine/migration.js — RÉTRO-COMPAT du modèle Sport.
// Avant le multi-programmes : un seul programme (full-body), état GLOBAL
// (sport.startDate / currentWeek / weekManuallySet) et ids de séance NON scopés
// (`W${week}-${sid}`). Ici on mappe cet ancien monde sur le nouveau SANS muter l'état :
// tout est résolu à la lecture. L'ancien programme = "fullbody-14".
export const LEGACY_PID = "fullbody-14";

// État (semaine/position) d'un programme, avec repli sur l'ancien état global pour fullbody-14.
// → un utilisateur d'avant garde sa semaine et n'est PAS renvoyé à l'onboarding.
export function programStateOf(sport = {}, pid) {
  const ps = sport?.programState?.[pid];
  if (ps) return ps;
  if (pid === LEGACY_PID && sport?.startDate)
    return { startDate: sport.startDate, currentWeek: sport.currentWeek || 1, weekManuallySet: !!sport.weekManuallySet };
  return {};
}

// Id de la séance loggée SI elle est faite (scopé programme, avec repli legacy non-scopé
// pour fullbody-14). Renvoie l'id trouvé (pour ouvrir le détail) ou null. → une séance
// faite AVANT la refonte (ex. `W3-A`) compte toujours comme faite sous fullbody-14.
export function doneWorkoutId(workouts = {}, pid, week, sid) {
  if (pid) {
    const scoped = `${pid}:W${week}-${sid}`;
    if (workouts[scoped]) return scoped;
    if (pid === LEGACY_PID && workouts[`W${week}-${sid}`]) return `W${week}-${sid}`;
    return null;
  }
  return workouts[`W${week}-${sid}`] ? `W${week}-${sid}` : null; // pas de programme → ancien schéma
}
