// ════════════════════════════════════════════════════════════════
// alternatives — matériel + catalogue d'exercices de substitution (mode vacances).
// Déplacé verbatim depuis lib/sport.js (Phase 0). `ALTS` était privé → exporté ici.
// ════════════════════════════════════════════════════════════════

export const EQUIPMENT = [
  { id: "barre", label: "Barre + disques" },
  { id: "kettlebells", label: "Kettlebells" },
  { id: "corde", label: "Corde à sauter" },
  { id: "rameur", label: "Rameur" },
  { id: "elastiques", label: "Élastiques" },
];
export const DEFAULT_EQUIPMENT = { barre: true, kettlebells: true, corde: true, rameur: true, elastiques: false };

// Alternatives par exercice, de la plus proche (kettlebell/élastique) au poids du
// corps. `need` = matériel requis pour l'alternative (null = poids du corps, toujours OK).
export const ALTS = {
  "Squat barre": [
    { need: "kettlebells", name: "Squat gobelet (kettlebell)", type: "fixed", load: 16, loadLabel: "1×16 kg", tech: "Kettlebell tenue contre la poitrine. Descendre cuisses parallèles, dos droit, talons au sol.", tips: ["Coudes à l'intérieur des genoux en bas", "Pousse dans les talons"] },
    { need: "elastiques", name: "Squat élastique", type: "bodyweight", tech: "Élastique sous les pieds, passé sur les épaules. Squat contrôlé.", tips: ["Garde la tension de l'élastique en haut", "Descente lente"] },
    { need: null, name: "Squat poids du corps (tempo 3s)", type: "bodyweight", tech: "Squat lent : 3 s à la descente, 1 s en bas, remontée contrôlée.", tips: ["Sans charge, ralentis pour garder l'intensité", "Bras tendus devant pour l'équilibre"] },
  ],
  "Rowing penché": [
    { need: "kettlebells", name: "Rowing kettlebell (1 bras)", type: "fixed", load: 16, loadLabel: "1×16 kg/bras", perSide: true, tech: "Buste penché, dos plat, une main en appui. Tirer la kettlebell vers la hanche.", tips: ["Coude près du corps", "Ne tourne pas le buste"] },
    { need: "elastiques", name: "Rowing élastique", type: "bodyweight", tech: "Élastique sous les pieds, buste penché. Tirer vers le bas du ventre.", tips: ["Serre les omoplates", "Garde le dos plat"] },
    { need: null, name: "Rowing serviette / superman", type: "bodyweight", tech: "À défaut de charge : superman au sol (extensions dos) en tenue 2 s.", tips: ["Contracte le haut du dos", "Mouvement contrôlé"] },
  ],
  "Développé militaire": [
    { need: "kettlebells", name: "Développé épaules kettlebell", type: "fixed", load: 12, loadLabel: "2×12 kg", tech: "Kettlebells aux épaules, pousser à la verticale, fessiers serrés.", tips: ["Pas de cambrure", "Gaine le tronc"] },
    { need: "elastiques", name: "Développé épaules élastique", type: "bodyweight", tech: "Élastique sous les pieds, pousser au-dessus de la tête.", tips: ["Garde le tronc gainé", "Contrôle la descente"] },
    { need: null, name: "Pompes piké (épaules)", type: "bodyweight", tech: "En V inversé, fléchir les coudes vers le sol, pousser. Sollicite les épaules.", tips: ["Hanches hautes", "Tête entre les bras"] },
  ],
  "SDT roumain": [
    { need: "kettlebells", name: "Soulevé roumain kettlebell", type: "fixed", load: 16, loadLabel: "2×16 kg", tech: "Jambes quasi tendues, pousser les fessiers en arrière, dos plat.", tips: ["Sens l'étirement des ischios", "Genoux peu fléchis"] },
    { need: "elastiques", name: "Good morning élastique", type: "bodyweight", tech: "Élastique sur la nuque, hinge des hanches dos plat.", tips: ["Mouvement aux hanches, pas au dos", "Contrôle"] },
    { need: null, name: "Hip hinge poids du corps", type: "bodyweight", tech: "Mains sur les hanches, hinge lent, dos plat, retour fessiers serrés.", tips: ["Tempo lent pour l'intensité", "Dos neutre"] },
  ],
  "Soulevé de terre": [
    { need: "kettlebells", name: "Soulevé de terre kettlebell", type: "fixed", load: 16, loadLabel: "2×16 kg", tech: "Kettlebells au sol entre les pieds, dos plat, pousser le sol avec les pieds.", tips: ["Barre/poids proche des tibias", "Dos jamais arrondi"] },
    { need: "elastiques", name: "Soulevé de terre élastique", type: "bodyweight", tech: "Pieds sur l'élastique, mains aux poignées, extension hanches/genoux.", tips: ["Tension maximale en haut", "Dos plat"] },
    { need: null, name: "Hip hinge unijambe", type: "bodyweight", tech: "Sur une jambe, hinge avant dos plat, l'autre jambe part en arrière.", tips: ["Équilibre : regarde un point fixe", "Hanches carrées"] },
  ],
  "Fentes barre": [
    { need: "kettlebells", name: "Fentes kettlebell", type: "fixed", load: 12, loadLabel: "2×12 kg", reps: "10/jambe", tech: "Une kettlebell dans chaque main, fente avant, genou arrière près du sol.", tips: ["Buste droit", "Genou avant dans l'axe"] },
    { need: null, name: "Fentes poids du corps", type: "bodyweight", reps: "12/jambe", tech: "Fentes alternées contrôlées, buste droit.", tips: ["Ajoute des reps sans charge", "Descends bien"] },
  ],
  "Élévations latérales disques": [
    { need: "elastiques", name: "Élévations latérales élastique", type: "bodyweight", tech: "Élastique sous les pieds, monte les bras sur les côtés jusqu'à l'horizontale, descente lente.", tips: ["Tempo lent", "Épaules basses"] },
    { need: null, name: "Élévations latérales (sans charge, tempo lent)", type: "bodyweight", reps: 15, tech: "Bras tendus, élévations lentes (3 s montée / 3 s descente) jusqu'à l'horizontale.", tips: ["Le tempo remplace la charge", "Épaules basses"] },
  ],
  "Tirage menton": [
    { need: "kettlebells", name: "Tirage menton kettlebell", type: "fixed", load: 12, loadLabel: "2×12 kg", tech: "Kettlebells devant les cuisses, tirer vers le menton, coudes hauts.", tips: ["Coudes au-dessus des poignets", "Pas de gêne d'épaule"] },
    { need: "elastiques", name: "Tirage menton élastique", type: "bodyweight", tech: "Élastique sous les pieds, tirer vers le menton.", tips: ["Coudes hauts", "Contrôle la descente"] },
    { need: null, name: "Élévations latérales (sans charge)", type: "bodyweight", reps: 15, tech: "Bras tendus, élévations latérales lentes jusqu'à l'horizontale.", tips: ["Tempo lent", "Épaules basses"] },
  ],
  "Hip thrust au sol": [
    { need: "kettlebells", name: "Hip thrust kettlebell", type: "fixed", load: 16, loadLabel: "1×16 kg", tech: "Dos contre un appui, kettlebell sur les hanches, pousser vers le haut.", tips: ["Pause 1 s en haut", "Fessiers serrés"] },
    { need: null, name: "Hip thrust 1 jambe (poids du corps)", type: "bodyweight", reps: "15/jambe", tech: "Une jambe au sol, pousser les hanches, l'autre jambe tendue.", tips: ["Pause en haut", "N'hyper-étends pas le bas du dos"] },
  ],
  "Floor press kettlebells": [
    { need: "elastiques", name: "Développé couché élastique", type: "bodyweight", tech: "Élastique dans le dos, pousser devant la poitrine.", tips: ["Tension constante", "Coudes à 45°"] },
    { need: null, name: "Pompes", type: "bodyweight", reps: 12, tech: "Pompes corps gainé, descente jusqu'à frôler le sol.", tips: ["Sur les genoux si besoin", "Coudes à 45°"] },
  ],
  "Curl kettlebell": [
    { need: "elastiques", name: "Curl élastique", type: "bodyweight", tech: "Élastique sous les pieds, curl des biceps contrôlé.", tips: ["Coudes fixes", "Descente lente"] },
    { need: null, name: "Tractions australiennes (sous une table)", type: "bodyweight", reps: 12, tech: "Sous une table solide, corps gainé, tirer la poitrine vers le bord.", tips: ["Plus tu es horizontal, plus c'est dur", "Serre les omoplates"] },
  ],
  "Extension triceps kettlebell": [
    { need: "elastiques", name: "Extension triceps élastique", type: "bodyweight", tech: "Élastique en hauteur, extension des coudes vers le bas.", tips: ["Coudes fixes", "Contrôle"] },
    { need: null, name: "Pompes diamant", type: "bodyweight", reps: 12, tech: "Mains rapprochées en losange, pompes ciblant les triceps.", tips: ["Sur les genoux si besoin", "Coudes près du corps"] },
  ],
};
