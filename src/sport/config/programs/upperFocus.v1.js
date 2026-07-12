// ════════════════════════════════════════════════════════════════
// upperFocus.v1 — programme ORIENTÉ HAUT DU CORPS (perte de gras + renforcement).
// 3 séances/sem : A (poussée) + C (tirage) → chaque muscle du haut ~2×/sem ;
// bas du corps en MAINTIEN LOURD (squat/soulevé 2×5) ; B = cardio conservé.
// Volume calibré ~40 min PORTE-À-PORTE (échauffement + retour au calme compris) :
// 3 séries par exo, repos 75 s (120 s sur le lourd), finition corde optionnelle.
// Charges barre : startKg PAR exercice = simple PLANCHER (exo jamais fait) — sinon on reprend la force atteinte.
// Élévations latérales : petits DISQUES (2 kg/main), jamais les kettlebells (12 kg = infaisable).
// Shape « legacy » (sessions A/B/C) — le catalogue d'ids stables suit via resolveExId.
// ════════════════════════════════════════════════════════════════
import { PROGRESSION, SESSION_B } from "./fullbody14.v1.js";

const SESSION_A = {
  id: "A", name: "Poussée + bas lourd", subtitle: "Pecs · épaules · triceps",
  day: "Mardi", dayIndex: 2, duration: "~40 min", type: "force",
  warmup: { duration: "5 min", seconds: 300, details: "Rameur progressif + 1 min de mobilité épaules." },
  cooldown: { duration: "4 min", seconds: 240, details: "Étirements pectoraux, épaules, dorsaux. 20-30 s par position." },
  exercises: [
    {
      name: "Floor press kettlebells", sets: 3, reps: 10, rest: 75, type: "fixed", load: 12, loadLabel: "2×12 kg",
      tech: "Allongé sur le dos au sol, une kettlebell dans chaque main. Coudes à ~45°, descendre jusqu'à ce que les triceps touchent le sol, puis pousser. Pecs + triceps.",
      tips: ["Pas de banc : le sol limite la descente et protège l'épaule", "Pousse fort, serre les pecs en haut", "Quand 3×12 passent facile → vise 15 reps, puis palier supérieur"]
    },
    {
      name: "Rowing barre", sets: 3, reps: 10, rest: 75, type: "standard", startKg: 30,
      tech: "Buste à 45°, dos plat, jambes légèrement fléchies. Tirer la barre vers le bas du ventre, coudes près du corps. Épaisseur du dos.",
      tips: ["Serre les omoplates en haut", "Tire avec le dos, pas les biceps", "Abdos gainés pour protéger le bas du dos"]
    },
    {
      name: "Développé militaire", sets: 3, reps: 8, rest: 75, type: "standard", startKg: 20,
      tech: "Debout, pieds largeur de hanches. Barre devant les épaules. Pousser à la verticale, fessiers serrés, pas de cambrure.",
      tips: ["Si c'est trop dur → 5 reps (le moteur s'en charge)", "Serrer les fessiers pour ne pas cambrer", "La barre passe juste devant le visage"]
    },
    {
      name: "Curl kettlebell", sets: 2, reps: 10, rest: 60, type: "fixed", load: 12, loadLabel: "2×12 kg", superset: "bras",
      tech: "Debout, une kettlebell dans chaque main, coudes collés au corps. Monter en contractant les biceps, descendre lentement.",
      tips: ["En superset avec l'extension triceps : enchaîne sans repos, repose après les deux", "Pas d'élan avec le dos", "Contrôle la descente"]
    },
    {
      name: "Extension triceps kettlebell", sets: 2, reps: 12, rest: 75, type: "fixed", load: 16, loadLabel: "1×16 kg", superset: "bras",
      tech: "Une kettlebell tenue à deux mains derrière la tête (ou pompes diamant si gêne). Tendre les bras vers le haut, coudes serrés.",
      tips: ["Alternative sans gêne d'épaule : pompes diamant 2×max", "Coudes pointés vers l'avant, fixes", "Contrôle la descente"]
    },
    {
      name: "Squat barre", sets: 2, reps: 5, rest: 120, type: "standard", startKg: 40,
      tech: "Barre haute sur les trapèzes. Descendre cuisses parallèles, genoux dans l'axe des pieds, dos gainé. Maintien lourd : peu de reps, lourd, focus force.",
      tips: ["2 séries lourdes suffisent (entretien, sans voler la récup du haut)", "Pieds largeur d'épaules, pointes légèrement vers l'extérieur", "Regard droit devant"]
    },
    {
      name: "Gainage planche", sets: 2, reps: "40s", repsSeconds: 40, rest: 30, type: "bodyweight",
      tech: "Coudes sous les épaules, corps parfaitement aligné. Fessiers serrés, ventre rentré.",
      tips: ["Si trop dur 40 s → commence à 20 s et ajoute 5 s/sem", "Respire pendant le gainage", "Du temps devant toi ? Ajoute une 3e série"]
    },
  ],
};

const SESSION_C = {
  id: "C", name: "Tirage + bas lourd + finition", subtitle: "Dos · épaules",
  day: "Samedi", dayIndex: 6, duration: "~40-45 min", type: "force",
  warmup: { duration: "5 min", seconds: 300, details: "Rameur progressif + mobilité hanches (avant le soulevé)." },
  finishCardio: {
    name: "Finition corde",
    intervals: { count: 4, work: 60, rest: 30 },
    tip: "4 blocs de 1 min de corde avec 30 s de repos. OPTIONNELLE : passe-la (ou réduis les blocs) si tu es à court de temps ou d'énergie.",
  },
  cooldown: { duration: "4 min", seconds: 240, details: "Étirements dorsaux, ischios, fessiers, lombaires. 20-30 s par position." },
  exercises: [
    {
      name: "Rowing barre", sets: 3, reps: 10, rest: 75, type: "standard", startKg: 30,
      tech: "Buste à 45°, dos plat. Tirer la barre vers le bas du ventre, coudes près du corps. Épaisseur du dos.",
      tips: ["Serre les omoplates", "Dos plat absolument", "Tire avec le dos, pas les biceps"]
    },
    {
      name: "Rowing kettlebell 1 bras", sets: 3, reps: "10/bras", rest: 60, type: "fixed", load: 16, loadLabel: "1×16 kg/bras", perSide: true,
      tech: "Buste penché, dos plat, une main en appui (banc/genou). Tire la kettlebell vers la hanche, coude près du corps. Cible la LARGEUR du dos. Bras gauche d'abord, puis le droit.",
      tips: ["Coude près du corps, tire vers la hanche", "Ne tourne pas le buste", "Contrôle la descente"]
    },
    {
      name: "Élévations latérales disques", sets: 3, reps: 12, rest: 45, type: "fixed", equipment: "disques", load: 2, loadLabel: "2×2 kg",
      tech: "Debout, un petit disque (2 kg) dans chaque main, bras le long du corps. Monte les bras sur les côtés jusqu'à l'horizontale, coudes légèrement fléchis, descente lente. Épaules moyennes (largeur).",
      tips: ["Petit muscle → petite charge : 2 kg par main suffisent largement au début", "Tempo lent, pas d'élan ; épaules basses, ne hausse pas", "Quand 15 reps passent facile → 2 + 1,5 kg par main, et repars à 12"]
    },
    {
      name: "Soulevé de terre", sets: 2, reps: 5, rest: 120, type: "heavy", startKg: 50,
      tech: "Pieds largeur hanches. Dos plat, fessiers en arrière. Barre proche des tibias. Pousser le sol avec les pieds. Maintien lourd : 2 séries lourdes.",
      tips: ["Ne JAMAIS arrondir le dos", "La barre reste collée aux jambes", "Si tes disques sont petits, surélève la barre à ~22 cm"]
    },
    {
      name: "Gainage latéral", sets: 2, reps: "30s/côté", repsSeconds: 30, perSide: true, rest: 30, type: "bodyweight",
      tech: "Coude sous l'épaule, corps aligné, hanches hautes.",
      tips: ["Garde la hanche du dessous bien haute", "Si trop dur → pose le genou inférieur au sol"]
    },
  ],
};

export const UPPER_FOCUS_V1 = {
  id: "upper-focus-v1",
  name: "Haut du corps — Cycle 1",
  description: "Orienté haut du corps : poussée (mardi) + tirage (samedi) → chaque muscle du haut ~2×/sem, bas du corps en maintien lourd, cardio conservé (jeudi). Séances calibrées ~40 min. Objectif perte de gras + renforcement du haut. 14 semaines, la charge monte selon tes retours.",
  weeks: 14,
  sessionOrder: ["A", "B", "C"],
  progression: PROGRESSION,
  // Charges de départ à la BARRE : portées PAR exercice (startKg). Ne servent que de PLANCHER
  // pour un exo jamais fait — sinon on reprend la force atteinte (historique). Voir getExercisePrescription.
  sessions: { A: SESSION_A, B: { ...SESSION_B, name: "Cardio intervalles" }, C: SESSION_C },
};
