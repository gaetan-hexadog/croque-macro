// ════════════════════════════════════════════════════════════════
// sport.js — données + logique PURE du programme de musculation.
//
// Source : app fitness-tracker (/Users/gaetan/Desktop/GitHub/fitness-tracker),
// portée le 2026-06-24. fitness-tracker reste la référence du programme ;
// toute évolution du programme se reporte ici à la main.
//
// Ce module ne contient AUCUN composant React ni icône : uniquement des
// constantes et des fonctions pures (calcul de charge, adaptation, dates).
// Les helpers de "suggestion" renvoient un `level` ("warning"|"info") que
// l'UI traduit en icône.
//
// Modèle d'une séance loggée (workout_logs.data) :
//   { date, completed, sessionId:"A"|"B"|"C", week, manual?,
//     data: [ { exercise, sets: [ { weight, repsTarget, repsDone, difficulty } ] } ],
//     cardioData?: { distance, rowerLevel, ropeJumps, rpe, notes },
//     chargeAdjustments?: { standard, heavy } }
//   difficulty ∈ "trop_lourd" | "parfait" | "trop_facile"  (cf. Phase 1b)
// ════════════════════════════════════════════════════════════════

// ── Programme : périodisation 14 semaines, 8 blocs ──────────────────────────
export const PROGRESSION = [
  { block: 1, weeks: [1, 2], phase: "Adaptation", standard: 20, heavy: 20 },
  { block: 2, weeks: [3, 4], phase: "Progression", standard: 21, heavy: 23 },
  { block: 3, weeks: [5, 6], phase: "Progression", standard: 23, heavy: 25 },
  { block: 4, weeks: [7], phase: "Décharge", standard: 21, heavy: 23 },
  { block: 5, weeks: [8, 9], phase: "Progression", standard: 24, heavy: 27 },
  { block: 6, weeks: [10, 11], phase: "Progression", standard: 25, heavy: 28 },
  { block: 7, weeks: [12, 13], phase: "Progression", standard: 27, heavy: 30 },
  { block: 8, weeks: [14], phase: "Décharge", standard: 25, heavy: 28 },
];

export const SESSION_A = {
  id: "A", name: "Séance A", subtitle: "Force full body",
  day: "Mardi", dayIndex: 2, duration: "~45 min", type: "force",
  warmup: { duration: "5 min", seconds: 300, details: "Rameur progressif (allure tranquille → modérée) + 1 min de mobilité épaules/hanches." },
  cooldown: { duration: "5 min", seconds: 300, details: "Étirements doux : mollets, ischio-jambiers, fessiers, dos, épaules. Tenir chaque position 20-30 sec." },
  exercises: [
    {
      name: "Squat barre", sets: 3, reps: 10, rest: 90, type: "standard",
      tech: "Barre haute sur les trapèzes. Descendre cuisses parallèles au sol. Genoux dans l'axe des pieds. Dos gainé.",
      tips: ["Pieds largeur d'épaules, pointes légèrement vers l'extérieur", "Regard droit devant, pas vers le sol", "Si difficulté avec la mobilité de cheville : surélever les talons sur 2 cm"]
    },
    {
      name: "Rowing penché", sets: 3, reps: 10, rest: 90, type: "standard",
      tech: "Buste à 45°, dos plat, jambes légèrement fléchies. Tirer la barre vers le bas du ventre, coudes près du corps.",
      tips: ["Garder les abdos contractés pour protéger le bas du dos", "Ne pas tirer avec les biceps, mais avec le dos", "Coudes près du corps, pas écartés"]
    },
    {
      name: "Développé militaire", sets: 3, reps: 10, rest: 90, type: "standard",
      tech: "Debout, pieds largeur de hanches. Barre devant les épaules. Pousser à la verticale, fessiers serrés, pas de cambrure.",
      tips: ["Si la barre à vide est trop dure → faire 5 reps au lieu de 10", "Serrer les fessiers pour éviter de cambrer le bas du dos", "La barre doit passer juste devant le visage"]
    },
    {
      name: "SDT roumain", sets: 3, reps: 10, rest: 90, type: "standard",
      tech: "Jambes quasi tendues. Pousser les fessiers vers l'arrière, dos plat. Descendre la barre le long des cuisses jusqu'à mi-tibia.",
      tips: ["Ce n'est pas un squat : les genoux bougent peu", "On sent l'étirement à l'arrière des cuisses", "Dos plat absolument"]
    },
    {
      name: "Floor press kettlebells", sets: 3, reps: 10, rest: 90, type: "fixed", load: 12, loadLabel: "2×12 kg",
      tech: "Allongé sur le dos au sol, une kettlebell dans chaque main. Coudes à ~45°, descendre jusqu'à ce que les triceps touchent le sol, puis pousser. Pecs + triceps.",
      tips: ["Pas de banc : le sol limite la descente et protège l'épaule", "Pousse fort, serre les pecs en haut", "Quand 3×12 passent facile → vise 3×15, puis ajoute du tempo"]
    },
    {
      name: "Gainage planche", sets: 3, reps: "40s", repsSeconds: 40, rest: 30, type: "bodyweight",
      tech: "Coudes sous les épaules, corps parfaitement aligné. Fessiers serrés, ventre rentré.",
      tips: ["Si trop dur 40s → commencer par 20s et augmenter de 5s par semaine", "Respirer pendant le gainage"]
    },
  ]
};

export const SESSION_C = {
  id: "C", name: "Séance C", subtitle: "Force + cardio",
  day: "Samedi", dayIndex: 6, duration: "~50 min", type: "force",
  warmup: { duration: "5 min", seconds: 300, details: "Rameur progressif + mobilité hanches (essentielle avant le soulevé de terre)." },
  finishCardio: {
    name: "Finition corde",
    intervals: { count: 6, work: 60, rest: 30 },
    tip: "6 blocs de 1 min de corde avec 30s de repos. Ajuste le nombre de blocs selon ton énergie restante.",
  },
  cooldown: { duration: "5 min", seconds: 300, details: "Étirements ciblés sur les zones très sollicitées : ischios, fessiers, lombaires, mollets." },
  exercises: [
    {
      name: "Soulevé de terre", sets: 3, reps: 8, rest: 120, type: "heavy",
      tech: "Pieds largeur hanches. Dos plat, fessiers en arrière. Barre proche des tibias. Pousser le sol avec les pieds.",
      tips: ["Si tes disques sont petits, surélève la barre à ~22 cm", "La barre reste collée aux jambes", "Ne JAMAIS arrondir le dos"]
    },
    {
      name: "Fentes barre", sets: 3, reps: "8/jambe", rest: 90, type: "standard",
      tech: "Barre sur les trapèzes. Pas en avant, descendre genou arrière près du sol. Buste droit.",
      tips: ["Si l'équilibre est difficile → faire des fentes statiques", "Genou avant ne doit pas dépasser le pied", "Pas trop court"]
    },
    {
      name: "Tirage menton", sets: 3, reps: 10, rest: 90, type: "standard",
      tech: "Prise serrée (mains à 20 cm). Tirer la barre vers le menton, coudes au-dessus des poignets.",
      tips: ["Si gêne aux épaules → ne pas dépasser le niveau des pectoraux", "Coudes plus haut que les mains", "Mouvement contrôlé"]
    },
    {
      name: "Hip thrust au sol", sets: 3, reps: 12, rest: 90, type: "heavy",
      tech: "Allongé sur le dos, genoux pliés, barre sur les hanches (avec serviette). Pousser les hanches vers le haut.",
      tips: ["Mettre une serviette pliée sous la barre", "Pause de 1 sec en haut", "Ne pas hyper-étendre le bas du dos"]
    },
    {
      name: "Curl kettlebell", sets: 3, reps: 12, rest: 60, type: "fixed", load: 12, loadLabel: "2×12 kg", superset: "bras",
      tech: "Debout, une kettlebell dans chaque main, coudes collés au corps. Monter en contractant les biceps, descendre lentement.",
      tips: ["En superset avec l'extension triceps : enchaîne sans repos, repose après les deux", "Pas d'élan avec le dos", "Quand 3×12 passent → 3×15"]
    },
    {
      name: "Extension triceps kettlebell", sets: 3, reps: 12, rest: 90, type: "fixed", load: 16, loadLabel: "1×16 kg", superset: "bras",
      tech: "Une kettlebell tenue à deux mains derrière la tête (ou pompes diamant si gêne). Tendre les bras vers le haut, coudes serrés.",
      tips: ["Alternative sans gêne d'épaule : pompes diamant 3×max", "Coudes pointés vers l'avant, fixes", "Contrôle la descente"]
    },
    {
      name: "Gainage latéral", sets: 3, reps: "30s/côté", repsSeconds: 30, perSide: true, rest: 30, type: "bodyweight",
      tech: "Coude sous l'épaule, corps aligné, hanches hautes.",
      tips: ["Garder la hanche du dessous bien haute", "Si trop dur → poser le genou inférieur au sol"]
    },
  ]
};

export const SESSION_B = {
  id: "B", name: "Séance B", subtitle: "Cardio intervalles",
  day: "Jeudi", dayIndex: 4, duration: "~30 min", type: "cardio",
  intensityGuide: [
    { phase: "Phase forte (effort)", desc: "Tu peux dire 2-3 mots, mais pas une phrase. Effort soutenu mais soutenable." },
    { phase: "Phase lente (repos)", desc: "Récupération vraie. Allure où tu pourrais tenir une conversation." },
    { phase: "Si trop dur", desc: "Les 2 premières semaines, raccourcis à 30s fort / 1min30 lent au rameur." },
  ],
  blocks: [
    { name: "Échauffement", machine: "Corde", duration: 180, format: "continu", intervals: null, tip: "Allure tranquille pour activer le système cardio." },
    { name: "Bloc rameur", machine: "Rameur", format: "intervalles", intervals: { count: 8, work: 40, rest: 80 }, tip: "Tu dois être essoufflé pendant les 40s." },
    { name: "Bloc corde", machine: "Corde", format: "intervalles", intervals: { count: 5, work: 60, rest: 30 }, tip: "Rythme soutenu pendant 1 min." },
    { name: "Retour au calme", machine: "Étirements", duration: 300, format: "continu", intervals: null, tip: "Mollets, ischios, hanches, épaules." },
  ]
};

export const SESSIONS = { A: SESSION_A, B: SESSION_B, C: SESSION_C };
export const SESSION_ORDER = ["A", "B", "C"];

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

// ── Dates (pures, sans dépendance) ──────────────────────────────────────────
export function daysBetween(d1, d2) {
  const a = new Date(d1); a.setHours(0, 0, 0, 0);
  const b = new Date(d2); b.setHours(0, 0, 0, 0);
  return Math.round((b - a) / 86400000);
}

export function calcCurrentWeekFromStart(startDate, today = new Date()) {
  if (!startDate) return 1;
  const days = daysBetween(startDate, today);
  if (days < 0) return 1;
  return Math.min(14, Math.floor(days / 7) + 1);
}

export function nextOccurrence(targetDayIndex, fromDate = new Date()) {
  const today = new Date(fromDate); today.setHours(0, 0, 0, 0);
  const todayDay = today.getDay();
  let diff = targetDayIndex - todayDay;
  if (diff < 0) diff += 7;
  const next = new Date(today);
  next.setDate(today.getDate() + diff);
  return next;
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ── Programme : blocs, charges, résistance rameur ───────────────────────────
export function getCurrentBlock(week) {
  return PROGRESSION.find((b) => b.weeks.includes(week));
}

export function getRowerResistance(week) {
  const block = getCurrentBlock(week);
  if (!block) return "3-4";
  if (block.phase === "Adaptation") return "3-4";
  if (block.phase === "Décharge") return "4";
  if (block.block <= 3) return "4-5";
  return "5-6";
}

// Plan de disques par côté pour une barre de 20 kg.
export function getDiscPlan(weight) {
  const perSide = (weight - 20) / 2;
  if (perSide < 0) return "Trop léger";
  if (perSide === 0) return "Barre à vide";
  const discs = [15, 10, 5, 2, 1.5, 0.5];
  let remaining = perSide;
  const used = [];
  for (const d of discs) {
    if (remaining >= d - 0.001) { used.push(d); remaining -= d; }
  }
  if (remaining > 0.01) return `≈ ${used.join("+")} kg/côté`;
  return used.join(" + ") + " kg/côté";
}

// Tous les exercices de force (A + C) — pour retrouver le type d'un exo loggé.
const FORCE_EXERCISES = [...SESSION_A.exercises, ...SESSION_C.exercises];
function findExerciseDef(name) {
  return FORCE_EXERCISES.find((e) => e.name === name) || null;
}

// Charge programme pour un type d'exercice à une semaine donnée.
// Pour les exercices à charge fixe (kettlebell) on renvoie la charge de l'exo.
function programChargeForType(week, type, exerciseDef = null) {
  if (type === "bodyweight") return null;
  if (type === "fixed") return exerciseDef ? exerciseDef.load : null;
  const block = getCurrentBlock(week);
  if (!block) return 20;
  return type === "heavy" ? block.heavy : block.standard;
}

// ── Analyse d'une séance loggée ─────────────────────────────────────────────
// Compatible ancien modèle (done/failed) ET nouveau (repsDone/difficulty).
export function setFailed(s, exerciseDef = null) {
  if (!s) return false;
  if (s.difficulty === "trop_lourd") return true;
  if (s.failed === true) return true;
  if (s.done === false) return true;
  const target = s.repsTarget ?? (exerciseDef && typeof exerciseDef.reps === "number" ? exerciseDef.reps : null);
  if (target != null && s.repsDone != null && s.repsDone < target) return true;
  return false;
}

export function analyzeSessionEntry(entry) {
  if (!entry || !entry.data) return { allDone: true, failedCount: 0, totalSets: 0 };
  let totalSets = 0, failedCount = 0;
  for (const ex of entry.data) {
    const def = findExerciseDef(ex.exercise);
    for (const s of ex.sets) { totalSets++; if (setFailed(s, def)) failedCount++; }
  }
  return { allDone: failedCount === 0, failedCount, totalSets };
}

// ── Adaptation de charge (Phase 1b enrichit ce socle) ───────────────────────
// Renvoie la charge prudente pour un type, en regardant les 3 dernières séances.
export function getChargeForExercise(week, type, history = null, exerciseDef = null) {
  const programCharge = programChargeForType(week, type, exerciseDef);
  if (type === "bodyweight") return null;
  if (!history) return programCharge;

  const recent = Object.values(history)
    .filter((e) => e?.completed && e?.data)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 3);

  let prudentCharge = programCharge;
  for (const entry of recent) {
    if (entry.chargeAdjustments && entry.chargeAdjustments[type] != null) {
      const adj = entry.chargeAdjustments[type];
      if (adj < prudentCharge) prudentCharge = adj;
      break;
    }
    if (entry.data) {
      let failedSetsForType = 0;
      for (const exData of entry.data) {
        const exDef = findExerciseDef(exData.exercise);
        if (!exDef || exDef.type !== type) continue;
        for (const s of exData.sets) if (setFailed(s, exDef)) failedSetsForType++;
      }
      if (failedSetsForType >= 2) {
        const block = getCurrentBlock(week);
        const blockIdx = PROGRESSION.indexOf(block);
        if (blockIdx > 0) {
          const prev = PROGRESSION[blockIdx - 1];
          const prevCharge = type === "heavy" ? prev.heavy : prev.standard;
          if (prevCharge < prudentCharge) prudentCharge = prevCharge;
        }
        break;
      }
    }
  }
  return prudentCharge;
}

// Paramètres adaptés d'un exercice (décharge, fallback militaire).
export function getAdaptedExerciseParams(exercise, week, history) {
  const block = getCurrentBlock(week);
  let sets = exercise.sets;
  let reps = exercise.reps;
  let repsTarget = exercise.repsTarget || (typeof exercise.reps === "number" ? exercise.reps : null);
  const notes = [];

  if (block && block.phase === "Décharge" && exercise.sets === 3 && exercise.type !== "bodyweight") {
    sets = 2;
    notes.push("Semaine de décharge : 2 séries au lieu de 3.");
  }

  if (exercise.name === "Développé militaire" && history) {
    const recent = Object.values(history)
      .filter((e) => e?.completed && e?.data)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 3);
    let hasFailed = false;
    for (const entry of recent) {
      const exData = entry.data?.find((d) => d.exercise === "Développé militaire");
      if (!exData) continue;
      if (exData.sets.some((s) => setFailed(s, exercise))) { hasFailed = true; break; }
    }
    if (hasFailed && typeof reps === "number" && reps === 10) {
      reps = 5; repsTarget = 5;
      notes.push("Tu as eu du mal récemment sur le développé militaire — on passe à 5 reps. On reviendra à 10 quand 3 × 5 passent proprement.");
    }
  }

  return { sets, reps, repsTarget, notes };
}

// 3 séances propres de suite au même poids → proposer la progression.
export function shouldSuggestProgression(history, week, sessionId) {
  const same = Object.values(history)
    .filter((e) => e?.completed && e?.data && e?.sessionId === sessionId)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 3);
  if (same.length < 3) return false;
  for (const e of same) {
    if (e.week !== week) return false;
    if (e.chargeAdjustments) return false;
    for (const ex of e.data) {
      const def = findExerciseDef(ex.exercise);
      for (const s of ex.sets) if (setFailed(s, def)) return false;
    }
  }
  const block = getCurrentBlock(week);
  if (!block || block.block === PROGRESSION.length) return false;
  return true;
}

// ── Suggestions / avertissements (renvoient un `level`, pas d'icône) ─────────
export function getAdaptiveSuggestion(history, sessionId, now = new Date()) {
  const list = Object.values(history)
    .filter((e) => e?.sessionId === sessionId && e?.completed && e?.data)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  if (list.length === 0) return null;
  const daysSince = daysBetween(new Date(list[0].date), now);
  if (daysSince > 14) return null;
  const a = analyzeSessionEntry(list[0]);
  if (a.allDone) return null;
  if (a.failedCount >= 2) return {
    level: "warning", title: "Dernière séance non complétée",
    message: `Tu as raté ${a.failedCount} séries la dernière fois. Refaire la séance au même poids cette semaine est prévu — pas un échec.`,
  };
  return {
    level: "info", title: "Une série ratée la dernière fois",
    message: "Tu peux retenter au même poids. Si ça repasse, on continuera la progression normalement.",
  };
}

export function getProlongedBreakDays(history) {
  const all = Object.values(history)
    .filter((e) => e?.completed)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  if (all.length === 0) return null;
  return daysBetween(new Date(all[0].date), new Date());
}

export function getGapWarning(history) {
  const days = getProlongedBreakDays(history);
  if (days != null && days >= 10) return {
    level: "warning", title: `${days} jours sans séance`,
    message: "Pour une reprise en douceur, redescends d'un bloc en charge cette semaine. Tu reprendras la progression dès la semaine d'après.",
  };
  return null;
}

// ════════════════════════════════════════════════════════════════
// Phase 1b — Moteur d'adaptation par RETOURS (dans les deux sens).
// Le binaire done/failed ne suffit pas : on lit repsDone + difficulty
// pour proposer une cible (charge OU reps) ajustée à la prochaine séance.
// ════════════════════════════════════════════════════════════════

export const DIFFICULTY = { HEAVY: "trop_lourd", OK: "parfait", EASY: "trop_facile" };
export const DIFFICULTY_OPTIONS = [
  { v: "trop_lourd", l: "Trop lourd", hint: "down" },
  { v: "parfait", l: "Parfait", hint: "hold" },
  { v: "trop_facile", l: "Trop facile", hint: "up" },
];
const FIXED_REP_MIN = 8, FIXED_REP_MAX = 15, FIXED_REP_STEP = 1; // bornes de progression par reps

// Dernière séance loggée contenant cet exercice.
function lastEntryWithExercise(history, exerciseName) {
  return Object.values(history || {})
    .filter((e) => e?.completed && e?.data?.some((d) => d.exercise === exerciseName))
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0] || null;
}

// Résumé des retours d'un exercice sur une séance : tendance globale.
export function exerciseFeedback(entry, exerciseName, def = null) {
  const ex = entry?.data?.find((d) => d.exercise === exerciseName);
  if (!ex || !ex.sets?.length) return null;
  let heavy = 0, easy = 0, failed = 0, rated = 0, maxReps = 0, lastWeight = null;
  for (const s of ex.sets) {
    if (s.weight != null) lastWeight = s.weight;
    if (s.repsDone != null) maxReps = Math.max(maxReps, s.repsDone);
    if (setFailed(s, def)) failed++;
    if (s.difficulty === DIFFICULTY.HEAVY) heavy++;
    else if (s.difficulty === DIFFICULTY.EASY) easy++;
    if (s.difficulty) rated++;
  }
  const n = ex.sets.length;
  return {
    n, heavy, easy, failed, rated, maxReps, lastWeight,
    allEasy: rated > 0 && easy === rated && failed === 0,   // tous les retours = trop facile
    anyHeavy: heavy > 0 || failed >= 1,                     // au moins un trop lourd / raté
  };
}

// Prescription pour la prochaine séance d'un exercice : charge ou reps + raison.
//   { mode:"charge"|"reps", value, unit, direction:"up"|"down"|"hold", note }
export function getExercisePrescription(exercise, week, history) {
  const last = history ? lastEntryWithExercise(history, exercise.name) : null;
  const fb = last ? exerciseFeedback(last, exercise.name, exercise) : null;

  // ── Charge fixe (kettlebells) & poids du corps : progression par REPS ──
  if (exercise.type === "fixed" || exercise.type === "bodyweight") {
    const baseReps = typeof exercise.reps === "number" ? exercise.reps : (exercise.repsTarget || FIXED_REP_MIN);
    let target = fb?.maxReps ? Math.max(baseReps, fb.maxReps) : baseReps;
    let direction = "hold", note = null;
    if (fb?.anyHeavy) {
      target = Math.max(FIXED_REP_MIN, (fb.maxReps || baseReps) - FIXED_REP_STEP);
      direction = "down"; note = "Dernière fois jugé trop lourd — on réduit un peu les reps, on garde la charge.";
    } else if (fb?.allEasy) {
      if (target >= FIXED_REP_MAX) {
        direction = "up";
        note = exercise.type === "fixed"
          ? `Trop facile à ${FIXED_REP_MAX} reps — passe au palier supérieur (kettlebell plus lourde ou tempo plus lent).`
          : `Trop facile à ${FIXED_REP_MAX} reps — ajoute une variante plus dure (lestée, surélevée).`;
      } else {
        target = Math.min(FIXED_REP_MAX, target + 2);
        direction = "up"; note = `Trop facile la dernière fois — on monte à ${target} reps.`;
      }
    }
    return { mode: "reps", value: target, unit: "reps", direction, note, load: exercise.load ?? null, loadLabel: exercise.loadLabel || null };
  }

  // ── Barre (standard/heavy) : progression par CHARGE ──
  const charge = getChargeForExercise(week, exercise.type, history, exercise);
  let direction = "hold", note = null;
  if (fb?.anyHeavy) { direction = "down"; note = "Dernière fois trop lourd — charge prudente (bloc précédent)."; }
  else if (fb?.allEasy && shouldSuggestProgression(history, week, last?.sessionId)) {
    direction = "up"; note = "3 séances propres et jugées faciles — prêt pour le palier suivant.";
  } else if (fb?.allEasy) {
    note = "Jugé facile : continue à cette charge, le palier monte au prochain bloc.";
  }
  return { mode: "charge", value: charge, unit: "kg", direction, note };
}

// Charge représentative d'une séance de force = moyenne des poids travaillés (hors PdC).
function sessionLoad(entry) {
  let sum = 0, n = 0;
  for (const ex of entry?.data || []) for (const s of ex.sets || []) {
    if (s.weight != null && !isNaN(s.weight) && s.weight > 0) { sum += s.weight; n++; }
  }
  return n ? sum / n : null;
}

// Tendance de FORCE sur ~4 semaines : compare charge moyenne récente vs précédente.
// Renvoie { direction:"up"|"down"|"flat", recent, older } ou null si trop peu de données.
export function strengthTrend(workouts, now = new Date()) {
  const force = Object.values(workouts || {})
    .filter((e) => e?.completed && Array.isArray(e?.data))
    .map((e) => ({ t: new Date(e.date), load: sessionLoad(e) }))
    .filter((e) => e.load != null)
    .sort((a, b) => b.t - a.t);
  if (force.length < 4) return null;
  const recent = force.filter((e) => daysBetween(e.t, now) <= 14);
  const older = force.filter((e) => { const d = daysBetween(e.t, now); return d > 14 && d <= 35; });
  if (!recent.length || !older.length) return null;
  const avg = (a) => a.reduce((s, x) => s + x.load, 0) / a.length;
  const r = avg(recent), o = avg(older);
  const delta = (r - o) / o;
  return { direction: delta > 0.02 ? "up" : delta < -0.02 ? "down" : "flat", recent: Math.round(r * 10) / 10, older: Math.round(o * 10) / 10 };
}

// Signal recomposition : croise tendance de force et rythme de perte (kg/sem, négatif=perte).
// observed = résultat de observedTrend(core) ou null. Renvoie { level, title, message } ou null.
export function recompSignal(workouts, observed, now = new Date()) {
  const st = strengthTrend(workouts, now);
  const rate = observed ? observed.ratePerWeek : null; // <0 = perte
  if (!st && rate == null) return null;
  // Priorité au garde-fou muscle : force qui chute = déficit trop agressif.
  if (st && st.direction === "down") return {
    level: "warning", title: "Ta force baisse",
    message: "Tes charges reculent : signe que le déficit est peut-être trop fort. Remonte un peu les kcal et soigne les protéines pour préserver le muscle.",
  };
  if (st && st.direction === "up" && rate != null && rate < -0.05) return {
    level: "good", title: "Recomposition réussie 💪",
    message: "Tu progresses en force ET tu perds du poids : tu fonds en gardant (voire gagnant) du muscle. Continue exactement comme ça.",
  };
  if (rate != null && rate > -0.05 && st && st.direction !== "down") return {
    level: "info", title: "Perte en pause",
    message: "Ton poids stagne mais ta force tient : c'est de la recomp. Si tu veux accélérer la perte de gras, creuse un peu le déficit côté nutrition.",
  };
  if (st && st.direction === "up") return {
    level: "good", title: "Tu gagnes en force",
    message: "Tes charges montent — bon signe pour redessiner le haut du corps. Garde les protéines hautes.",
  };
  return null;
}
