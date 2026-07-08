// ════════════════════════════════════════════════════════════════
// exercises — catalogue global d'exercices à ID STABLE (clé de vérité).
// L'id ne change jamais → l'historique, la courbe de force et (Phase 2) la charge
// mémorisée suivent un exercice même s'il change de programme ou de libellé affiché.
// `legacyNames` mappe les anciens noms loggés (historique par nom) vers l'id.
// Les programmes (config/programs/*) référenceront les exos par `exId`.
// ════════════════════════════════════════════════════════════════

export const EXERCISES = {
  // ── Bas du corps / chaîne postérieure ──
  squat:          { id: "squat",          name: "Squat barre",                   muscles: ["quadriceps", "fessiers"],   pattern: "squat",           legacyNames: ["Squat barre"] },
  deadlift:       { id: "deadlift",        name: "Soulevé de terre",              muscles: ["chaîne postérieure"],       pattern: "hinge",           legacyNames: ["Soulevé de terre"] },
  sdt_roumain:    { id: "sdt_roumain",     name: "SDT roumain",                   muscles: ["ischios", "fessiers"],      pattern: "hinge",           legacyNames: ["SDT roumain"] },
  lunges:         { id: "lunges",          name: "Fentes barre",                  muscles: ["quadriceps", "fessiers"],   pattern: "lunge",           legacyNames: ["Fentes barre"] },
  hip_thrust:     { id: "hip_thrust",      name: "Hip thrust au sol",             muscles: ["fessiers"],                 pattern: "hinge",           legacyNames: ["Hip thrust au sol"] },

  // ── Poussée (haut) ──
  floor_press:    { id: "floor_press",     name: "Floor press kettlebells",       muscles: ["pectoraux", "triceps"],     pattern: "horizontal_push", legacyNames: ["Floor press kettlebells"], kbPer: 2 },
  ohp:            { id: "ohp",             name: "Développé militaire",           muscles: ["épaules", "triceps"],       pattern: "vertical_push",   legacyNames: ["Développé militaire"], supports: ["fallbackReps"] },
  triceps_ext_kb: { id: "triceps_ext_kb",  name: "Extension triceps kettlebell",  muscles: ["triceps"],                  pattern: "elbow_extension", legacyNames: ["Extension triceps kettlebell"], kbPer: 1 },

  // ── Tirage (haut) ──
  row_barbell:    { id: "row_barbell",     name: "Rowing barre",                  muscles: ["dos", "biceps"],            pattern: "horizontal_pull", legacyNames: ["Rowing penché", "Rowing barre"] },
  upright_row:    { id: "upright_row",     name: "Tirage menton",                 muscles: ["épaules", "trapèzes"],      pattern: "vertical_pull",   legacyNames: ["Tirage menton"] },
  row_kb_1arm:    { id: "row_kb_1arm",     name: "Rowing kettlebell 1 bras",      muscles: ["dos (largeur)", "biceps"],  pattern: "horizontal_pull", legacyNames: ["Rowing kettlebell 1 bras", "Rowing kettlebell (1 bras)"], kbPer: 1 },
  lateral_raise_kb:{ id: "lateral_raise_kb", name: "Élévations latérales kettlebell", muscles: ["épaules (moyen)"],       pattern: "lateral_raise",   legacyNames: ["Élévations latérales kettlebell"], kbPer: 2 },
  curl_kb:        { id: "curl_kb",         name: "Curl kettlebell",               muscles: ["biceps"],                   pattern: "elbow_flexion",   legacyNames: ["Curl kettlebell"], supports: ["unilateralCatchUp"], kbPer: 2 },

  // ── Tronc ──
  plank:          { id: "plank",           name: "Gainage planche",               muscles: ["tronc"],                    pattern: "core",            legacyNames: ["Gainage planche"] },
  side_plank:     { id: "side_plank",      name: "Gainage latéral",               muscles: ["tronc"],                    pattern: "core",            legacyNames: ["Gainage latéral"] },
};
