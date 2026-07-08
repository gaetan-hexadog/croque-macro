// ════════════════════════════════════════════════════════════════
// programs/index — REGISTRE des programmes (extensible : 1 fichier + 1 entrée).
// Chaque programme : { id, name, description, weeks, sessionOrder, progression,
//                      startCharges, sessions:{A,B,C} }.
// ════════════════════════════════════════════════════════════════
import { PROGRESSION, SESSIONS } from "./fullbody14.v1.js";
import { UPPER_FOCUS_V1 } from "./upperFocus.v1.js";

// Programme d'origine (full-body) enveloppé en objet-programme.
export const FULLBODY_14 = {
  id: "fullbody-14",
  name: "Full-body 14 semaines",
  description: "Full-body + cardio, 3 séances/sem (mardi/jeudi/samedi). Équilibré haut/bas. La charge progresse selon tes retours. Le programme d'origine.",
  weeks: 14,
  sessionOrder: ["A", "B", "C"],
  progression: PROGRESSION,
  startCharges: {},
  sessions: SESSIONS,
};

export const PROGRAMS = { "fullbody-14": FULLBODY_14, "upper-focus-v1": UPPER_FOCUS_V1 };
export const PROGRAM_LIST = [UPPER_FOCUS_V1, FULLBODY_14]; // ordre d'affichage dans le sélecteur
export const DEFAULT_PROGRAM_ID = "upper-focus-v1";        // haut-du-corps par défaut (choix Bob)

export const getProgram = (id) => PROGRAMS[id] || PROGRAMS[DEFAULT_PROGRAM_ID];
export const getActiveProgram = (sport = {}) => getProgram(sport?.activeProgramId);
