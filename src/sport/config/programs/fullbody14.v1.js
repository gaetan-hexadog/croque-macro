// ════════════════════════════════════════════════════════════════
// fullbody14.v1 — DONNÉES du programme full-body 14 semaines (existant).
// Déplacé verbatim depuis lib/sport.js (Phase 0 : zéro changement de comportement).
// Shape « legacy » (PROGRESSION + SESSION_A/B/C) — la migration vers le schéma
// à slots/exId se fait dans les phases suivantes.
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
      name: "Curl kettlebell", sets: 3, reps: 8, rest: 60, type: "fixed", load: 12, loadLabel: "2×12 kg", superset: "bras",
      tech: "Debout, une kettlebell dans chaque main, coudes collés au corps. Les DEUX bras montent en même temps (pas en alternance). Monter en contractant les biceps, descendre lentement.",
      tips: ["Les deux bras simultanément, pas en alternance", "En superset avec l'extension triceps : enchaîne sans repos, repose après les deux", "Pas d'élan avec le dos", "Objectif 8 reps propres à 2×12 kg ; quand 3×8 passent facile, ajoute des reps"]
    },
    {
      name: "Extension triceps kettlebell", sets: 3, reps: 12, rest: 90, type: "fixed", load: 12, loadLabel: "1×12 kg", superset: "bras",
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
