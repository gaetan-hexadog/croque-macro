// engine/substitution.js — mode vacances : adapte une séance au matériel disponible.
// Hybride : règles de substitution (hors-ligne) + affinage IA (côté assistant).
// On garde sets/reps/repos ; on remplace le mouvement + la technique. Les exercices
// substitués ont un autre nom → ils ne polluent pas la progression (clé = nom).
import { ALTS, DEFAULT_EQUIPMENT } from "../config/alternatives.js";

function exNeed(ex) {
  if (ex.equipment === "disques") return "barre"; // petits disques = kit barre, pas les kettlebells
  if (ex.type === "standard" || ex.type === "heavy") return "barre";
  if (ex.type === "fixed") return "kettlebells";
  return null; // poids du corps : toujours faisable
}

function adaptExercise(ex, eq) {
  const need = exNeed(ex);
  if (!need || eq[need]) return ex;
  const pick = (ALTS[ex.name] || []).find((a) => !a.need || eq[a.need]);
  if (!pick) return ex;
  return {
    ...ex,
    name: pick.name,
    type: pick.type || "bodyweight",
    load: pick.load, loadLabel: pick.loadLabel,
    perSide: pick.perSide ?? ex.perSide,
    reps: pick.reps ?? ex.reps,
    repsSeconds: pick.repsSeconds ?? ex.repsSeconds,
    tech: pick.tech || ex.tech,
    tips: pick.tips || ex.tips,
    adaptedFrom: ex.name,
  };
}

function adaptBlock(b, eq) {
  const m = (b.machine || "").toLowerCase();
  if (m.includes("rameur") && !eq.rameur) return { ...b, machine: "Poids du corps", tip: "Sans rameur : montées de genoux rapides ou burpees pendant l'effort.", adaptedFrom: b.machine };
  if (m.includes("corde") && !eq.corde) return { ...b, machine: "Poids du corps", tip: "Sans corde : jumping jacks ou montées de genoux pendant l'effort.", adaptedFrom: b.machine };
  return b;
}

// Adapte une séance au matériel dispo (règles). Renvoie une copie marquée `adapted`.
export function adaptSession(session, equipment) {
  const eq = { ...DEFAULT_EQUIPMENT, ...(equipment || {}) };
  if (session.type === "cardio") {
    return { ...session, blocks: session.blocks.map((b) => adaptBlock(b, eq)), adapted: true };
  }
  let finishCardio = session.finishCardio;
  if (finishCardio && !eq.corde) finishCardio = { ...finishCardio, name: `${finishCardio.name} (sans corde)`, tip: "Sans corde : jumping jacks ou montées de genoux.", adaptedFrom: "Corde" };
  return { ...session, exercises: session.exercises.map((ex) => adaptExercise(ex, eq)), finishCardio, adapted: true };
}

// Y a-t-il au moins une substitution à faire avec ce matériel ? (pour afficher un repère)
export function sessionNeedsAdapt(session, equipment) {
  const eq = { ...DEFAULT_EQUIPMENT, ...(equipment || {}) };
  if (session.type === "cardio") return session.blocks.some((b) => adaptBlock(b, eq) !== b);
  return session.exercises.some((ex) => adaptExercise(ex, eq) !== ex) || (session.finishCardio && !eq.corde);
}
