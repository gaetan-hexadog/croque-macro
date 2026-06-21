// ════════════════════════════════════════════════════════════════════════════
//  core.js — données, thème et helpers partagés (hors composants React)
//  Base de repas, presets, tokens de thème (C/SLOT_UI mutés par applyTheme),
//  helpers de date, de quantité et modèle de journée. Importé par App.jsx.
// ════════════════════════════════════════════════════════════════════════════
import {
  Coffee, Salad, UtensilsCrossed, Apple, Clock, Package, Soup, EggOff, Snowflake, Dumbbell,
} from "lucide-react";

// ── Source unique de vérité — produits réutilisés à plusieurs endroits ───────
// Une seule définition par produit. Tout le reste (pioche, extras, compositeur,
// combos) référence ces constantes, donc une correction se fait ICI et nulle part ailleurs.
const CLEAR_PROTEIN_DOSE = { kcal: 86, p: 20 }; // 1 dose officielle Bulk (Clear Whey Isolate)
const CLEAR_VEGAN_DOSE   = { kcal: 67, p: 15 }; // 1 dose officielle Bulk (Clear Vegan, ~20 g de poudre)
// Un « verre 150 ml » = 150 g d'un mélange [1 dose + 350 ml d'eau] (~375 g total) → 40 % de la dose.
const GLASS_FRACTION = 150 / 375;
const glassOf = (dose) => ({ kcal: Math.round(dose.kcal * GLASS_FRACTION), p: Math.round(dose.p * GLASS_FRACTION) });
const CLEAR_PROTEIN_VERRE = glassOf(CLEAR_PROTEIN_DOSE); // → 34 / 8

// ── Base de repas (macros réalistes, par portion) ───────────────────────────
// slots : où le plat a du sens — 'pdj' | 'dej' | 'diner' | 'snack'
// tags  : 'rapide' | 'veille' | 'transportable' | 'batch' | 'sans-oeuf' |
//         'sans-cuisson' | 'chaud' | 'froid'
const MEALS = [
  // ── Petit-déj ──
  { id: "pdj1", name: "Overnight oats protéinés", slots: ["pdj"], kcal: 420, p: 32, c: 52, f: 11, tags: ["veille", "transportable", "sans-oeuf", "froid"], desc: "Avoine, lait de soja, protéine végétale, chia, fruits rouges." },
  { id: "pdj2", name: "Smoothie soja · banane · PB", slots: ["pdj", "snack"], kcal: 380, p: 30, c: 40, f: 12, tags: ["rapide", "transportable", "sans-oeuf"], desc: "Lait de soja, protéine, banane, beurre de cacahuète." },
  { id: "pdj3", name: "3 œufs durs + une pomme", slots: ["pdj"], kcal: 300, p: 20, c: 22, f: 15, tags: ["veille", "transportable", "rapide"], desc: "Œufs cuits à l'avance, à attraper le matin." },
  { id: "pdj4", name: "Yaourt soja · granola · fruits rouges", slots: ["pdj"], kcal: 360, p: 18, c: 48, f: 11, tags: ["rapide", "sans-oeuf", "froid"], desc: "Yaourt de soja, granola peu sucré, baies, graines de courge." },
  { id: "pdj5", name: "Tofu brouillé + pain complet", slots: ["pdj"], kcal: 410, p: 28, c: 38, f: 16, tags: ["chaud", "sans-oeuf"], desc: "Tofu ferme émietté, curcuma, légumes, 1 tranche de pain." },
  { id: "pdj6", name: "Chia pudding soja-cacao", slots: ["pdj", "snack"], kcal: 340, p: 20, c: 36, f: 14, tags: ["veille", "transportable", "sans-oeuf", "froid"], desc: "Chia, lait de soja, protéine cacao, fruits." },
  { id: "pdj7", name: "Tartines houmous + œuf poché", slots: ["pdj"], kcal: 380, p: 22, c: 40, f: 15, tags: ["rapide"], desc: "Pain complet, houmous, œuf poché." },
  { id: "pdj8", name: "Porridge soja · beurre de cacahuète", slots: ["pdj"], kcal: 430, p: 24, c: 54, f: 14, tags: ["chaud", "sans-oeuf"], desc: "Avoine cuite au lait de soja, PB, banane." },
  { id: "pdj9", name: "Bol skyr végétal · graines · kiwi", slots: ["pdj", "snack"], kcal: 280, p: 14, c: 28, f: 12, tags: ["rapide", "sans-oeuf", "froid"], desc: "Skyr Morice (amande/riz), graines de courge, kiwi. Pense à le charger en protéines." },
  { id: "pdj10", name: "Smoothie vert protéiné", slots: ["pdj", "snack"], kcal: 350, p: 30, c: 34, f: 10, tags: ["rapide", "transportable", "sans-oeuf"], desc: "Lait de soja, protéine, épinards, mangue." },
  { id: "pdj11", name: "Pancakes flocons · banane", slots: ["pdj"], kcal: 400, p: 26, c: 48, f: 12, tags: ["chaud"], desc: "Flocons d'avoine, banane, œufs, protéine." },
  { id: "pdj12", name: "Tartine avocat + œuf", slots: ["pdj"], kcal: 360, p: 18, c: 28, f: 20, tags: ["rapide"], desc: "Pain complet, avocat écrasé, œuf." },

  // ── Déjeuner (beaucoup marchent aussi le soir) ──
  { id: "dej1", name: "Buddha bowl tofu · quinoa", slots: ["dej", "diner"], kcal: 520, p: 34, c: 52, f: 18, tags: ["batch", "transportable", "sans-oeuf"], desc: "Quinoa, légumes rôtis, tofu mariné, sauce tahini-citron." },
  { id: "dej2", name: "Salade lentilles · œuf · tofu fumé", slots: ["dej"], kcal: 480, p: 34, c: 40, f: 18, tags: ["transportable", "froid"], desc: "Lentilles, œuf, crudités, dés de tofu fumé." },
  { id: "dej3", name: "Wrap tempeh grillé + houmous", slots: ["dej"], kcal: 500, p: 30, c: 50, f: 18, tags: ["transportable", "sans-oeuf"], desc: "Tempeh grillé, houmous, crudités, galette complète." },
  { id: "dej4", name: "Chili sin carne + riz complet", slots: ["dej", "diner"], kcal: 560, p: 28, c: 78, f: 12, tags: ["batch", "chaud", "sans-oeuf"], desc: "Haricots rouges, légumes, épices, riz complet." },
  { id: "dej5", name: "Curry pois chiches + riz", slots: ["dej", "diner"], kcal: 540, p: 22, c: 76, f: 14, tags: ["batch", "chaud", "sans-oeuf"], desc: "Pois chiches mijotés, riz complet, légumes." },
  { id: "dej6", name: "Poke bowl tofu · edamame", slots: ["dej", "diner"], kcal: 500, p: 32, c: 54, f: 16, tags: ["froid", "transportable", "sans-oeuf"], desc: "Riz, tofu mariné, edamame, légumes croquants." },
  { id: "dej7", name: "Salade pois chiches · feta de soja", slots: ["dej"], kcal: 460, p: 24, c: 44, f: 20, tags: ["froid", "transportable", "sans-oeuf"], desc: "Pois chiches, feta de soja, concombre, herbes." },
  { id: "dej8", name: "Dahl lentilles corail + riz", slots: ["dej", "diner"], kcal: 520, p: 24, c: 72, f: 12, tags: ["batch", "chaud", "sans-oeuf"], desc: "Lentilles corail au lait de coco léger, riz." },
  { id: "dej9", name: "Galette de lentilles + salade", slots: ["dej"], kcal: 470, p: 26, c: 48, f: 16, tags: ["batch", "transportable"], desc: "Galettes de lentilles, grande salade." },
  { id: "dej10", name: "Bowl riz · haricots noirs · avocat", slots: ["dej", "diner"], kcal: 540, p: 22, c: 70, f: 18, tags: ["sans-oeuf", "batch"], desc: "Riz, haricots noirs épicés, avocat, maïs." },
  { id: "dej11", name: "Soupe miso · tofu · soba", slots: ["dej", "diner"], kcal: 430, p: 26, c: 56, f: 9, tags: ["chaud", "sans-oeuf"], desc: "Bouillon miso, tofu soyeux, nouilles soba, algues." },
  { id: "dej12", name: "Wrap falafel + crudités", slots: ["dej"], kcal: 520, p: 20, c: 60, f: 22, tags: ["transportable", "sans-oeuf"], desc: "Falafels, houmous, crudités, galette complète." },
  { id: "dej13", name: "Salade quinoa · edamame · menthe", slots: ["dej", "diner"], kcal: 460, p: 26, c: 50, f: 16, tags: ["froid", "transportable", "sans-oeuf"], desc: "Quinoa, edamame, menthe, citron." },
  { id: "dej14", name: "Tofu mariné + patate douce rôtie", slots: ["dej", "diner"], kcal: 510, p: 32, c: 52, f: 16, tags: ["batch", "sans-oeuf"], desc: "Tofu ferme, patate douce, légumes verts." },
  { id: "dej15", name: "Buddha bowl tempeh · riz complet", slots: ["dej", "diner"], kcal: 540, p: 34, c: 54, f: 18, tags: ["batch", "sans-oeuf"], desc: "Tempeh, riz complet, brocoli, sauce cacahuète." },

  // ── Dîner ──
  { id: "din1", name: "Tofu sauté légumes + riz", slots: ["diner", "dej"], kcal: 480, p: 32, c: 50, f: 16, tags: ["chaud", "sans-oeuf"], desc: "Tofu ferme, poêlée de légumes, riz." },
  { id: "din2", name: "Dahl + légumes verts (sans riz)", slots: ["diner"], kcal: 380, p: 22, c: 40, f: 12, tags: ["chaud", "sans-oeuf", "batch"], desc: "Lentilles corail, épinards, version légère le soir." },
  { id: "din3", name: "Seitan poêlé + brocoli + quinoa", slots: ["diner"], kcal: 500, p: 40, c: 42, f: 16, tags: ["chaud", "sans-oeuf"], desc: "Seitan, brocoli, quinoa — gros apport protéiné." },
  { id: "din4", name: "Wok edamame · légumes · soba", slots: ["diner"], kcal: 470, p: 26, c: 60, f: 12, tags: ["chaud", "sans-oeuf"], desc: "Edamame, légumes croquants, nouilles soba." },
  { id: "din5", name: "Minestrone enrichi haricots blancs", slots: ["diner", "dej"], kcal: 400, p: 22, c: 52, f: 10, tags: ["batch", "chaud", "sans-oeuf"], desc: "Soupe-repas de légumes + haricots blancs." },
  { id: "din6", name: "Tempeh teriyaki + légumes", slots: ["diner"], kcal: 460, p: 30, c: 44, f: 16, tags: ["chaud", "sans-oeuf"], desc: "Tempeh laqué, légumes sautés, un peu de riz." },
  { id: "din7", name: "Curry tofu · épinards (sans riz)", slots: ["diner"], kcal: 390, p: 28, c: 24, f: 20, tags: ["chaud", "sans-oeuf", "batch"], desc: "Tofu, épinards, sauce épicée, soir léger en féculents." },
  { id: "din8", name: "Poêlée haricots rouges · poivrons · œuf", slots: ["diner"], kcal: 420, p: 26, c: 44, f: 15, tags: ["chaud"], desc: "Haricots rouges, poivrons, œuf sur le dessus." },
  { id: "din9", name: "Soupe-repas lentilles · légumes", slots: ["diner", "dej"], kcal: 380, p: 24, c: 48, f: 8, tags: ["batch", "chaud", "sans-oeuf"], desc: "Lentilles, légumes, bouillon, version copieuse." },
  { id: "din10", name: "Steak de soja + ratatouille", slots: ["diner"], kcal: 430, p: 32, c: 30, f: 18, tags: ["chaud", "sans-oeuf"], desc: "Steak de soja, ratatouille maison." },
  { id: "din11", name: "Nouilles soba sautées tofu · sésame", slots: ["diner"], kcal: 490, p: 28, c: 58, f: 16, tags: ["chaud", "sans-oeuf"], desc: "Soba, tofu, sauce sésame, légumes." },
  { id: "din12", name: "Galettes de pois chiches + salade", slots: ["diner"], kcal: 440, p: 24, c: 42, f: 18, tags: ["chaud", "sans-oeuf"], desc: "Galettes de pois chiches, grande salade." },
  { id: "din13", name: "Omelette légumes + salade verte", slots: ["diner"], kcal: 360, p: 24, c: 12, f: 22, tags: ["rapide", "chaud"], desc: "Omelette aux légumes, salade verte — soir très léger." },
  { id: "din14", name: "Tofu grillé + haricots verts + boulgour", slots: ["diner"], kcal: 460, p: 30, c: 44, f: 15, tags: ["chaud", "sans-oeuf"], desc: "Tofu grillé, haricots verts, boulgour." },

  // ── Snacks ──
  { id: "sn1", name: "Edamame nature (150 g)", slots: ["snack"], kcal: 170, p: 16, c: 12, f: 7, tags: ["rapide", "sans-oeuf", "sans-cuisson"], desc: "Très rassasiant et bien protéiné." },
  { id: "sn2", name: "Yaourt soja + fruits rouges", slots: ["snack"], kcal: 150, p: 9, c: 18, f: 5, tags: ["rapide", "froid", "sans-oeuf"], desc: "Yaourt de soja nature, baies." },
  { id: "sn3", name: "Houmous + bâtonnets de légumes", slots: ["snack"], kcal: 190, p: 7, c: 18, f: 11, tags: ["sans-cuisson", "transportable", "sans-oeuf"], desc: "Houmous, carotte, concombre, poivron." },
  { id: "sn4", name: "Shake protéine + lait de soja", slots: ["snack"], kcal: 180, p: 28, c: 10, f: 4, tags: ["rapide", "transportable", "sans-oeuf"], desc: "Le filet de secours quand un repas est juste en protéines." },
  { id: "sn5", name: "Pomme + amandes (20 g)", slots: ["snack"], kcal: 180, p: 5, c: 24, f: 10, tags: ["sans-cuisson", "transportable", "sans-oeuf"], desc: "À doser sur les amandes." },
  { id: "sn6", name: "2 œufs durs", slots: ["snack"], kcal: 140, p: 12, c: 1, f: 10, tags: ["veille", "transportable"], desc: "Préparés à l'avance." },
  { id: "sn7", name: "Galette de riz + beurre de cacahuète", slots: ["snack"], kcal: 200, p: 7, c: 22, f: 10, tags: ["rapide", "transportable", "sans-oeuf"], desc: "Galette de riz complète, PB." },
  { id: "sn8", name: "Skyr végétal amande + graines", slots: ["snack"], kcal: 175, p: 11, c: 16, f: 9, tags: ["rapide", "sans-oeuf"], desc: "Skyr Morice (5,3 g prot/100 g), graines de courge." },
  { id: "sn9", name: "Pois chiches grillés", slots: ["snack"], kcal: 160, p: 8, c: 22, f: 5, tags: ["transportable", "sans-cuisson", "sans-oeuf"], desc: "Croquants et épicés." },
  { id: "sn10", name: "Smoothie soja · fruits rouges", slots: ["snack"], kcal: 160, p: 10, c: 24, f: 3, tags: ["rapide", "sans-oeuf"], desc: "Lait de soja, baies." },
  { id: "sn11", name: "Chocolat noir + noix", slots: ["snack"], kcal: 190, p: 4, c: 14, f: 14, tags: ["sans-cuisson", "transportable", "sans-oeuf"], desc: "Le petit plaisir, à doser." },
  { id: "sn12", name: "Edamame · sauce soja-sésame", slots: ["snack"], kcal: 190, p: 17, c: 13, f: 8, tags: ["rapide", "sans-oeuf"], desc: "Edamame, sauce soja, graines de sésame." },

  // ── Post-workout & options fromage ──
  { id: "pw1", name: "Shake post-training Bulk + lait d'amande", slots: ["pdj", "dej", "snack"], kcal: 250, p: 30, c: 22, f: 4, tags: ["rapide", "transportable", "sans-oeuf", "post-workout"], desc: "Bulk Vegan All-in-One (60 g) + lait d'amande. Créatine, BCAA, HMB inclus." },
  { id: "pw2", name: "Shake post-training Bulk + lait de soja", slots: ["pdj", "dej", "snack"], kcal: 310, p: 37, c: 24, f: 6, tags: ["rapide", "transportable", "sans-oeuf", "post-workout"], desc: "Bulk Vegan All-in-One (60 g) + lait de soja (~250 ml). Le soja ajoute ~8 g de protéines." },
  { id: "vp1", name: "Shake protéine vegan Bulk + eau", slots: ["pdj", "dej", "snack"], kcal: 127, p: 24, c: 4, f: 1, tags: ["rapide", "transportable", "sans-oeuf"], desc: "Vegan Protein Powder Bulk (35 g) à l'eau. Léger : 127 kcal pour 24 g. Idéal perte de gras / jours de repos. Toutes saveurs ≈ mêmes macros." },
  { id: "vp2", name: "Shake protéine vegan Bulk + lait d'amande", slots: ["pdj", "dej", "snack"], kcal: 152, p: 25, c: 5, f: 2, tags: ["rapide", "transportable", "sans-oeuf"], desc: "Vegan Protein Powder Bulk (35 g) + lait d'amande. Toutes saveurs ≈ mêmes macros." },
  { id: "bv1", name: "Clear Vegan Bulk (1 dose)", slots: ["pdj", "dej", "snack"], kcal: CLEAR_VEGAN_DOSE.kcal, p: CLEAR_VEGAN_DOSE.p, c: 2, f: 1, tags: ["rapide", "transportable", "sans-oeuf", "bulk"], desc: "Un verre de Clear Vegan Bulk (1 dose ~20 g de poudre, à l'eau glacée) : 67 kcal / 15 g. Qté = nombre de doses. Le volume d'eau ne change pas les macros." },
  { id: "bv5", name: "Clear Protein Bulk (verre 150 ml)", slots: ["pdj", "dej", "snack"], kcal: CLEAR_PROTEIN_VERRE.kcal, p: CLEAR_PROTEIN_VERRE.p, c: 0, f: 0, tags: ["rapide", "transportable", "sans-oeuf", "bulk"], desc: "Un verre de 150 ml préparé à 1 dose + 350 ml d'eau (whey clarifiée) : ~34 kcal / 8 g. Qté = nombre de verres. Pas vegan (lait), mais sans œuf. Pour 1 dose entière, prends le compositeur." },
  { id: "bv2", name: "Barre gourmet vegane Bulk", slots: ["snack"], kcal: 206, p: 17, c: 18, f: 7, tags: ["rapide", "transportable", "sans-oeuf", "bulk"], desc: "Barre gourmet vegane Bulk (~55 g). 17 g de protéines, 3 couches moelleuses." },
  { id: "bv3", name: "Brownie vegan Bulk", slots: ["snack"], kcal: 227, p: 15, c: 25, f: 7, tags: ["rapide", "transportable", "sans-oeuf", "bulk", "plaisir"], desc: "Brownie protéiné vegan Bulk (60 g). 15 g de protéines, vrai chocolat noir. Plaisir compté." },
  { id: "bv4", name: "Blondie vegan Bulk", slots: ["snack"], kcal: 230, p: 14, c: 26, f: 7, tags: ["rapide", "transportable", "sans-oeuf", "bulk", "plaisir"], desc: "Blondie protéiné vegan Bulk (60 g). ~14 g de protéines. Valeurs approchées (proche du brownie)." },
  // Basiques — ingrédients bruts à loguer à la carte (le pas de quantité permet d'ajuster)
  { id: "egg1", name: "Œuf au plat", slots: ["pdj", "dej", "diner", "snack"], kcal: 95, p: 6, c: 0, f: 7, tags: ["rapide", "basique"], desc: "Un œuf au plat (avec un filet d'huile). Mets la quantité voulue." },
  { id: "egg2", name: "Œuf dur", slots: ["pdj", "dej", "diner", "snack"], kcal: 78, p: 6, c: 1, f: 5, tags: ["rapide", "transportable", "basique"], desc: "Un œuf dur. Ajuste la quantité." },
  { id: "egg3", name: "Œuf brouillé", slots: ["pdj", "dej", "diner", "snack"], kcal: 80, p: 6, c: 1, f: 5, tags: ["rapide", "basique"], desc: "Un œuf brouillé nature. Mets le nombre d'œufs en quantité (ex. 3)." },
  { id: "egg4", name: "Omelette nature (3 œufs)", slots: ["pdj", "dej", "diner"], kcal: 270, p: 19, c: 1, f: 21, tags: ["basique"], desc: "Omelette 3 œufs. Ajoute fromage/légumes à part si besoin." },
  { id: "bas1", name: "Pain complet (1 tranche)", slots: ["pdj", "dej", "diner", "snack"], kcal: 80, p: 3, c: 14, f: 1, tags: ["rapide", "basique"], desc: "Une tranche de pain complet (~35 g)." },
  { id: "bas2", name: "Flocons d'avoine (40 g)", slots: ["pdj", "snack"], kcal: 150, p: 5, c: 27, f: 3, tags: ["basique"], desc: "Portion de flocons d'avoine (40 g, à sec)." },
  { id: "bas3", name: "Banane", slots: ["pdj", "dej", "snack"], kcal: 90, p: 1, c: 23, f: 0, tags: ["rapide", "transportable", "basique"], desc: "Une banane moyenne." },
  { id: "bas4", name: "Riz blanc cuit (100 g)", slots: ["dej", "diner"], kcal: 130, p: 3, c: 28, f: 0, tags: ["basique"], desc: "Riz cuit, 100 g." },
  { id: "bas5", name: "Pâtes cuites (100 g)", slots: ["dej", "diner"], kcal: 158, p: 6, c: 31, f: 1, tags: ["basique"], desc: "Pâtes cuites, 100 g." },
  { id: "bas6", name: "Lentilles cuites (100 g)", slots: ["dej", "diner"], kcal: 116, p: 9, c: 20, f: 0, tags: ["basique", "sans-oeuf"], desc: "Lentilles cuites, 100 g." },
  { id: "bas7", name: "Pommes de terre vapeur (150 g)", slots: ["dej", "diner"], kcal: 130, p: 3, c: 30, f: 0, tags: ["basique", "sans-oeuf"], desc: "Pommes de terre vapeur, 150 g." },
  { id: "bas8", name: "Yaourt soja nature (125 g)", slots: ["pdj", "snack"], kcal: 70, p: 6, c: 3, f: 4, tags: ["rapide", "basique", "sans-oeuf"], desc: "Un yaourt soja nature non sucré." },
  { id: "bas9", name: "Fromage (30 g)", slots: ["pdj", "dej", "diner", "snack"], kcal: 110, p: 7, c: 0, f: 9, tags: ["rapide", "basique"], desc: "Un morceau de fromage (~30 g)." },
  // Fruits classiques — à l'unité ou portion repère
  { id: "fr1", name: "Abricot (1)", slots: ["pdj", "dej", "diner", "snack"], kcal: 17, p: 0, c: 4, f: 0, tags: ["rapide", "transportable", "basique", "sans-oeuf"], desc: "Un abricot frais. Ajuste la quantité." },
  { id: "fr2", name: "Pomme (1)", slots: ["pdj", "dej", "diner", "snack"], kcal: 90, p: 0, c: 24, f: 0, tags: ["rapide", "transportable", "basique", "sans-oeuf"], desc: "Une pomme moyenne." },
  { id: "fr3", name: "Poire (1)", slots: ["pdj", "dej", "diner", "snack"], kcal: 100, p: 1, c: 25, f: 0, tags: ["rapide", "transportable", "basique", "sans-oeuf"], desc: "Une poire moyenne." },
  { id: "fr4", name: "Orange (1)", slots: ["pdj", "dej", "diner", "snack"], kcal: 60, p: 1, c: 14, f: 0, tags: ["rapide", "transportable", "basique", "sans-oeuf"], desc: "Une orange." },
  { id: "fr5", name: "Clémentine (1)", slots: ["pdj", "dej", "diner", "snack"], kcal: 35, p: 1, c: 8, f: 0, tags: ["rapide", "transportable", "basique", "sans-oeuf"], desc: "Une clémentine." },
  { id: "fr6", name: "Kiwi (1)", slots: ["pdj", "dej", "diner", "snack"], kcal: 45, p: 1, c: 10, f: 0, tags: ["rapide", "transportable", "basique", "sans-oeuf"], desc: "Un kiwi." },
  { id: "fr7", name: "Fraises (100 g)", slots: ["pdj", "dej", "diner", "snack"], kcal: 33, p: 1, c: 6, f: 0, tags: ["transportable", "basique", "sans-oeuf"], desc: "Une portion de fraises (100 g)." },
  { id: "fr8", name: "Framboises (100 g)", slots: ["pdj", "dej", "diner", "snack"], kcal: 52, p: 1, c: 5, f: 1, tags: ["transportable", "basique", "sans-oeuf"], desc: "Une portion de framboises (100 g)." },
  { id: "fr9", name: "Myrtilles (100 g)", slots: ["pdj", "dej", "diner", "snack"], kcal: 57, p: 1, c: 12, f: 0, tags: ["transportable", "basique", "sans-oeuf"], desc: "Une portion de myrtilles (100 g)." },
  { id: "fr10", name: "Raisin (100 g)", slots: ["pdj", "dej", "diner", "snack"], kcal: 70, p: 1, c: 16, f: 0, tags: ["transportable", "basique", "sans-oeuf"], desc: "Une portion de raisin (100 g)." },
  { id: "fr11", name: "Pêche / nectarine (1)", slots: ["pdj", "dej", "diner", "snack"], kcal: 60, p: 1, c: 13, f: 0, tags: ["rapide", "transportable", "basique", "sans-oeuf"], desc: "Une pêche ou nectarine." },
  { id: "fr12", name: "Mangue (100 g)", slots: ["pdj", "dej", "diner", "snack"], kcal: 60, p: 1, c: 15, f: 0, tags: ["transportable", "basique", "sans-oeuf"], desc: "Une portion de mangue (100 g)." },
  { id: "fr13", name: "Ananas (100 g)", slots: ["pdj", "dej", "diner", "snack"], kcal: 50, p: 1, c: 12, f: 0, tags: ["transportable", "basique", "sans-oeuf"], desc: "Une portion d'ananas (100 g)." },
  { id: "fr14", name: "Melon (150 g)", slots: ["pdj", "dej", "diner", "snack"], kcal: 50, p: 1, c: 12, f: 0, tags: ["transportable", "basique", "sans-oeuf"], desc: "Une portion de melon (150 g)." },
  { id: "fr15", name: "Compote sans sucre (100 g)", slots: ["pdj", "dej", "diner", "snack"], kcal: 50, p: 0, c: 12, f: 0, tags: ["rapide", "transportable", "basique", "sans-oeuf"], desc: "Une gourde/compote de pomme sans sucre ajouté." },
  // Légumes classiques — portion repère, à l'œil
  { id: "lg1", name: "Concombre (150 g)", slots: ["dej", "diner", "snack"], kcal: 18, p: 1, c: 3, f: 0, tags: ["froid", "basique", "sans-oeuf"], desc: "Environ un demi-concombre. À l'œil, pas besoin de peser." },
  { id: "lg2", name: "Tomate (1)", slots: ["dej", "diner", "snack"], kcal: 20, p: 1, c: 4, f: 0, tags: ["froid", "basique", "sans-oeuf"], desc: "Une tomate moyenne." },
  { id: "lg3", name: "Tomates cerises (100 g)", slots: ["dej", "diner", "snack"], kcal: 18, p: 1, c: 4, f: 0, tags: ["froid", "transportable", "basique", "sans-oeuf"], desc: "Une poignée de tomates cerises." },
  { id: "lg4", name: "Carotte (1)", slots: ["dej", "diner", "snack"], kcal: 35, p: 1, c: 8, f: 0, tags: ["froid", "transportable", "basique", "sans-oeuf"], desc: "Une carotte (crue ou cuite)." },
  { id: "lg5", name: "Courgette (150 g)", slots: ["dej", "diner"], kcal: 25, p: 2, c: 4, f: 0, tags: ["basique", "sans-oeuf"], desc: "Une demi-courgette." },
  { id: "lg6", name: "Poivron (1)", slots: ["dej", "diner", "snack"], kcal: 30, p: 1, c: 6, f: 0, tags: ["froid", "basique", "sans-oeuf"], desc: "Un poivron." },
  { id: "lg7", name: "Salade verte (bol)", slots: ["dej", "diner"], kcal: 15, p: 1, c: 2, f: 0, tags: ["froid", "basique", "sans-oeuf"], desc: "Un bol de salade verte." },
  { id: "lg8", name: "Brocoli (150 g)", slots: ["dej", "diner"], kcal: 50, p: 4, c: 7, f: 1, tags: ["basique", "sans-oeuf"], desc: "Une portion de brocoli." },
  { id: "lg9", name: "Haricots verts (150 g)", slots: ["dej", "diner"], kcal: 45, p: 3, c: 7, f: 0, tags: ["basique", "sans-oeuf"], desc: "Une portion de haricots verts." },
  { id: "lg10", name: "Épinards cuits (150 g)", slots: ["dej", "diner"], kcal: 35, p: 4, c: 4, f: 1, tags: ["basique", "sans-oeuf"], desc: "Une portion d'épinards." },
  { id: "lg11", name: "Champignons (100 g)", slots: ["dej", "diner"], kcal: 22, p: 3, c: 3, f: 0, tags: ["basique", "sans-oeuf"], desc: "Une portion de champignons." },
  { id: "lg12", name: "Aubergine (150 g)", slots: ["dej", "diner"], kcal: 35, p: 2, c: 6, f: 0, tags: ["basique", "sans-oeuf"], desc: "Une demi-aubergine." },
  { id: "lg13", name: "Chou-fleur (150 g)", slots: ["dej", "diner"], kcal: 38, p: 3, c: 5, f: 0, tags: ["basique", "sans-oeuf"], desc: "Une portion de chou-fleur." },
  { id: "lg14", name: "Petits pois (100 g)", slots: ["dej", "diner"], kcal: 80, p: 5, c: 14, f: 0, tags: ["basique", "sans-oeuf"], desc: "Une portion de petits pois." },
  { id: "lg15", name: "Avocat (1/2)", slots: ["pdj", "dej", "diner", "snack"], kcal: 120, p: 2, c: 2, f: 11, tags: ["froid", "basique", "sans-oeuf"], desc: "Un demi-avocat. Bon gras, mais dense : compte-le." },
  { id: "lg16", name: "Cornichons (30 g)", slots: ["dej", "diner", "snack"], kcal: 5, p: 0, c: 1, f: 0, tags: ["froid", "basique", "sans-oeuf"], desc: "4-5 cornichons. Acidulé, quasi zéro calorie." },
  // Sojade & yaourts soja
  { id: "sj1", name: "Sojade nature (100 g)", slots: ["pdj", "dej", "diner", "snack"], kcal: 55, p: 4, c: 2, f: 3, tags: ["rapide", "basique", "sans-oeuf"], desc: "Yaourt soja Sojade nature non sucré (100 g)." },
  { id: "sj2", name: "Sojade fruits (100 g)", slots: ["pdj", "dej", "diner", "snack"], kcal: 100, p: 4, c: 14, f: 2, tags: ["rapide", "basique", "sans-oeuf"], desc: "Yaourt soja Sojade aux fruits (framboise-passion, etc.), 100 g." },
  { id: "sj3", name: "Sojade nature sans sucre (125 g)", slots: ["pdj", "dej", "diner", "snack"], kcal: 70, p: 5, c: 3, f: 4, tags: ["rapide", "basique", "sans-oeuf"], desc: "Un pot Sojade nature non sucré (125 g)." },
  // Restos / plats commandés (estimations — arrondi haut)
  { id: "rst1", name: "Pad thaï tofu (resto) — Botna", slots: ["dej", "diner"], kcal: 800, p: 22, c: 95, f: 33, tags: ["chaud", "plaisir", "resto"], desc: "Estimation portion resto : nouilles de riz + huile (invisible) + sauce tamarin + tofu + cacahuètes + œuf. ~700-950 kcal selon la portion. Plat glucides/gras, peu protéiné. Demande extra tofu pour monter les protéines." },
  { id: "lv1", name: "La Vie — Tofu teriyaki (½ boîte)", slots: ["dej", "diner", "snack"], kcal: 165, p: 14, c: 7, f: 8, tags: ["rapide", "sans-oeuf", "chaud"], desc: "Tofu fumé La Vie + sauce teriyaki. ~100 g tofu + sauce. Bonne base protéinée." },
  { id: "lv2", name: "La Vie — Jambon végétal (1 tranche)", slots: ["pdj", "dej", "snack"], kcal: 35, p: 5, c: 1, f: 1, tags: ["rapide", "froid", "transportable", "sans-oeuf", "basique"], desc: "Une tranche (~20 g) de jambon végétal nature La Vie (pois + soja). Mets le nombre de tranches en quantité." },
  { id: "lv3", name: "La Vie — Lardons végétaux (~50 g)", slots: ["dej", "diner"], kcal: 125, p: 9, c: 0, f: 10, tags: ["chaud", "sans-oeuf"], desc: "½ barquette de lardons fumés La Vie (soja). Pour carbonara, quiche, poêlée — riche en lipides, à doser." },
  // ── Garden Gourmet ──
  { id: "gg1", name: "Garden Gourmet — Sensational burger", slots: ["dej", "diner"], kcal: 250, p: 19, c: 8, f: 16, tags: ["chaud", "sans-oeuf"], desc: "1 steak végétal (~113 g), soja. Valeurs approchées." },
  { id: "gg2", name: "Garden Gourmet — Sensational saucisse", slots: ["dej", "diner"], kcal: 155, p: 10, c: 4, f: 11, tags: ["chaud", "sans-oeuf"], desc: "1 saucisse végétale (~67 g). Valeurs approchées." },
  { id: "gg3", name: "Garden Gourmet — Haché végétal (100 g)", slots: ["dej", "diner"], kcal: 180, p: 17, c: 6, f: 9, tags: ["chaud", "sans-oeuf"], desc: "Sensational haché (soja). Bolo, chili, tacos." },
  { id: "gg4", name: "Garden Gourmet — Nuggets (100 g)", slots: ["dej", "diner", "snack"], kcal: 216, p: 14, c: 15, f: 10, tags: ["chaud", "sans-oeuf"], desc: "~5 nuggets soja & blé." },
  { id: "gg5", name: "Garden Gourmet — Filets / émincés (100 g)", slots: ["dej", "diner"], kcal: 170, p: 20, c: 4, f: 7, tags: ["chaud", "sans-oeuf"], desc: "Émincés végétaux riches en protéines. Valeurs approchées." },
  // ── HappyVore ──
  { id: "hv1", name: "HappyVore — Le Steak (100 g)", slots: ["dej", "diner"], kcal: 219, p: 18, c: 6, f: 13, tags: ["chaud", "sans-oeuf"], desc: "Steak végétal gourmand (soja)." },
  { id: "hv2", name: "HappyVore — Nuggets (100 g)", slots: ["dej", "diner", "snack"], kcal: 241, p: 15, c: 16, f: 13, tags: ["chaud", "sans-oeuf"], desc: "~5 nuggets végétaux." },
  { id: "hv3", name: "HappyVore — Aiguillettes (100 g)", slots: ["dej", "diner"], kcal: 170, p: 20, c: 4, f: 6, tags: ["chaud", "sans-oeuf"], desc: "Aiguillettes végétales, riches en protéines (>18 g). Valeurs approchées." },
  { id: "hv4", name: "HappyVore — Saucisse / chipo", slots: ["dej", "diner"], kcal: 125, p: 7, c: 2, f: 10, tags: ["chaud", "sans-oeuf"], desc: "1 saucisse (~50 g). Valeurs approchées." },
  { id: "hv5", name: "HappyVore — Lardons fumés (~50 g)", slots: ["dej", "diner"], kcal: 125, p: 9, c: 1, f: 9, tags: ["chaud", "sans-oeuf"], desc: "½ barquette. Poêlée, quiche, carbonara." },
  // ── La Vie (suite) ──
  { id: "lv4", name: "La Vie — Jambon fumé (1 tranche)", slots: ["pdj", "dej", "snack"], kcal: 35, p: 5, c: 1, f: 1, tags: ["rapide", "froid", "transportable", "sans-oeuf", "basique"], desc: "Une tranche (~20 g) de jambon végétal fumé La Vie." },
  { id: "lv5", name: "La Vie — Tofu fumé (bloc, 100 g)", slots: ["dej", "diner", "snack"], kcal: 140, p: 14, c: 2, f: 8, tags: ["sans-oeuf"], desc: "Tofu fumé La Vie, soja français. Salades, bowls, poêlées." },
  { id: "lv6", name: "La Vie — Boulettes (100 g)", slots: ["dej", "diner"], kcal: 230, p: 16, c: 8, f: 14, tags: ["chaud", "sans-oeuf"], desc: "Boulettes végétales. Valeurs approchées." },
  // ── Sojami (tofu lactofermenté) ──
  { id: "soj1", name: "Sojami — Tofu lactofermenté pesto (100 g)", slots: ["dej", "diner", "snack"], kcal: 220, p: 19, c: 1, f: 16, tags: ["froid", "sans-oeuf"], desc: "Tofu lactofermenté façon feta, pesto. Riche en protéines, source d'oméga 3." },
  { id: "soj2", name: "Sojami — Tofu lactofermenté ail des ours (100 g)", slots: ["dej", "diner", "snack"], kcal: 225, p: 20, c: 1, f: 16, tags: ["froid", "sans-oeuf"], desc: "Tofu lactofermenté façon feta, ail des ours. Riche en protéines." },
  { id: "pdj13", name: "Tacos œufs · fromage · avocat", slots: ["pdj"], kcal: 680, p: 32, c: 42, f: 40, tags: ["chaud"], desc: "Tortillas de blé, œufs brouillés, cheddar/emmental, avocat, tomates cerises." },
  { id: "dej16", name: "Salade lentilles · fromage · noix", slots: ["dej"], kcal: 490, p: 28, c: 36, f: 24, tags: ["froid", "transportable"], desc: "Lentilles, dés de fromage, noix, crudités." },
  { id: "din15", name: "Galette complète œuf · fromage · champignons", slots: ["diner"], kcal: 470, p: 26, c: 44, f: 22, tags: ["chaud"], desc: "Galette de sarrasin, œuf, fromage, champignons — option crêperie." },

  // ── Ajouts ──
  { id: "pdj14", name: "Smoothie bowl soja · myrtilles · granola", slots: ["pdj"], kcal: 400, p: 26, c: 50, f: 12, tags: ["rapide", "sans-oeuf", "froid"], desc: "Base soja-protéine, myrtilles, granola, graines." },
  { id: "pdj15", name: "Burrito tofu brouillé", slots: ["pdj"], kcal: 450, p: 28, c: 44, f: 18, tags: ["chaud", "transportable", "sans-oeuf"], desc: "Tortilla, tofu brouillé, haricots, légumes." },
  { id: "pdj16", name: "Pain perdu protéiné (lait de soja)", slots: ["pdj"], kcal: 420, p: 24, c: 50, f: 14, tags: ["chaud"], desc: "Pain complet, lait de soja, œuf, cannelle, fruits." },
  { id: "pdj17", name: "Muesli bio fruits rouges + lait de soja", slots: ["pdj"], kcal: 350, p: 15, c: 54, f: 9, tags: ["rapide", "sans-oeuf", "froid"], desc: "Muesli fruits rouges, lait de soja (le soja apporte la protéine)." },
  { id: "pdj18", name: "Wrap œuf · fromage · épinards", slots: ["pdj"], kcal: 430, p: 26, c: 34, f: 22, tags: ["rapide", "transportable"], desc: "Galette, œuf, fromage fondu, épinards." },
  { id: "pdj19", name: "Skyr végétal + muesli fruits rouges", slots: ["pdj", "snack"], kcal: 320, p: 14, c: 44, f: 11, tags: ["rapide", "sans-oeuf", "froid"], desc: "Skyr Morice amande, muesli bio fruits rouges, graines." },

  { id: "dej17", name: "Lasagnes lentilles · légumes", slots: ["dej", "diner"], kcal: 540, p: 28, c: 58, f: 20, tags: ["batch", "chaud"], desc: "Lentilles, béchamel végétale, fromage, légumes." },
  { id: "dej18", name: "Riz sauté tofu · petits pois · œuf", slots: ["dej", "diner"], kcal: 520, p: 30, c: 60, f: 16, tags: ["chaud", "batch"], desc: "Riz, tofu, petits pois, œuf, sauce soja." },
  { id: "dej19", name: "Burger végé + frites au four", slots: ["dej"], kcal: 580, p: 28, c: 64, f: 22, tags: ["chaud"], desc: "Steak de haricots, pain complet, frites de patate au four." },
  { id: "dej20", name: "Taboulé pois chiches · feta de soja", slots: ["dej"], kcal: 470, p: 22, c: 52, f: 18, tags: ["froid", "transportable", "sans-oeuf"], desc: "Boulgour, pois chiches, feta de soja, herbes." },
  { id: "dej21", name: "Bowl tofu teriyaki · riz · edamame", slots: ["dej", "diner"], kcal: 540, p: 34, c: 60, f: 14, tags: ["batch", "sans-oeuf"], desc: "Tofu laqué, riz, edamame, sésame." },
  { id: "dej22", name: "Quiche sans pâte courgette · fromage", slots: ["dej", "diner"], kcal: 420, p: 26, c: 18, f: 26, tags: ["batch", "chaud"], desc: "Œufs, courgette, fromage râpé, version légère en glucides." },
  { id: "dej23", name: "Soupe de pois cassés + pain complet", slots: ["dej", "diner"], kcal: 430, p: 24, c: 60, f: 8, tags: ["batch", "chaud", "sans-oeuf"], desc: "Pois cassés, légumes, tranche de pain." },

  { id: "din16", name: "Chili butternut · haricots noirs", slots: ["diner", "dej"], kcal: 420, p: 22, c: 54, f: 10, tags: ["batch", "chaud", "sans-oeuf"], desc: "Courge rôtie, haricots noirs, épices." },
  { id: "din17", name: "Gratin brocoli · tofu · fromage", slots: ["diner"], kcal: 460, p: 30, c: 28, f: 24, tags: ["chaud"], desc: "Brocoli, tofu, fromage gratiné, béchamel légère." },
  { id: "din18", name: "Galette sarrasin tofu · champignons", slots: ["diner"], kcal: 420, p: 26, c: 44, f: 16, tags: ["chaud", "sans-oeuf"], desc: "Galette de sarrasin, tofu, champignons, oignons — option crêperie." },
  { id: "din19", name: "Bowl falafel · houmous · quinoa", slots: ["diner", "dej"], kcal: 510, p: 22, c: 56, f: 22, tags: ["froid", "transportable", "sans-oeuf"], desc: "Falafels, houmous, quinoa, crudités." },
  { id: "din20", name: "Gnocchis tomate · mozzarella · roquette", slots: ["diner"], kcal: 500, p: 22, c: 62, f: 18, tags: ["chaud"], desc: "Gnocchis, sauce tomate, mozzarella, roquette." },
  { id: "din21", name: "Curry coco tofu · légumes (sans riz)", slots: ["diner"], kcal: 410, p: 26, c: 26, f: 22, tags: ["chaud", "sans-oeuf", "batch"], desc: "Tofu, légumes, lait de coco, soir léger en féculents." },
  { id: "din22", name: "Tortilla espagnole + salade", slots: ["diner"], kcal: 420, p: 22, c: 36, f: 20, tags: ["chaud", "batch"], desc: "Omelette pommes de terre-oignons, salade verte." },

  { id: "sn13", name: "Pain complet + fromage frais", slots: ["snack"], kcal: 180, p: 9, c: 18, f: 8, tags: ["rapide", "sans-oeuf"], desc: "Tranche de pain complet, fromage frais." },
  { id: "sn14", name: "Barre maison avoine · cacahuète", slots: ["snack"], kcal: 200, p: 8, c: 22, f: 10, tags: ["veille", "transportable", "sans-oeuf"], desc: "Avoine, beurre de cacahuète, dattes." },
  { id: "sn15", name: "Fromage (30 g) + crackers complets", slots: ["snack"], kcal: 200, p: 10, c: 14, f: 12, tags: ["rapide", "transportable", "sans-oeuf"], desc: "Un morceau de fromage, crackers complets." },
  { id: "sn16", name: "Smoothie soja · mangue · curcuma", slots: ["snack"], kcal: 170, p: 9, c: 28, f: 3, tags: ["rapide", "sans-oeuf"], desc: "Lait de soja, mangue, curcuma, gingembre." },
];

// ── Métadonnées des créneaux ────────────────────────────────────────────────
const SLOTS = {
  pdj:   { key: "pdj",   label: "Petit-déj", icon: Coffee,          weight: 0.22, color: "#d97706" },
  dej:   { key: "dej",   label: "Déjeuner",  icon: Salad,           weight: 0.34, color: "#059669" },
  diner: { key: "diner", label: "Dîner",     icon: UtensilsCrossed, weight: 0.34, color: "#0d9488" },
  snack: { key: "snack", label: "Snack",     icon: Apple,           weight: 0.10, color: "# db2777".trim() },
};
SLOTS.snack.color = "#db2777";

const TAGS = [
  { id: "rapide", label: "Rapide", icon: Clock },
  { id: "veille", label: "Préparé la veille", icon: Clock },
  { id: "transportable", label: "Transportable", icon: Package },
  { id: "batch", label: "Batch cooking", icon: Soup },
  { id: "sans-oeuf", label: "Sans œuf", icon: EggOff },
  { id: "sans-cuisson", label: "Sans cuisson", icon: Snowflake },
  { id: "post-workout", label: "Post-training", icon: Dumbbell },
];

const todayISO = () => new Date().toISOString().slice(0, 10);
const PLAN_KEY = `pioche-repas:plan:${todayISO()}`;
const SETTINGS_KEY = "pioche-repas:settings";

// Persistance locale réelle (localStorage). Interface async conservée.
const store = {
  async get(k) {
    try {
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v) : null;
    } catch (_) { return null; }
  },
  async set(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {}
  },
};

// ════════════════════════════════════════════════════════════════════════════
//  PIOCHE-REPAS — application multi-écrans
//  Jour (pioche + jauge) · Journal (historique éditable) · Progrès (graphiques)
//  Suivi du poids en parallèle des calories.
// ════════════════════════════════════════════════════════════════════════════

// Direction visuelle « Vivant maîtrisé » (variante E du design lab) :
// base chaude, accent corail affirmé, créneaux saturés, profondeur sobre.
const THEMES = {
  dark: {
    bg: "#17120c", paper: "#17120c", sheet: "#221a12",
    card: "rgba(255,255,255,0.05)", cardSolid: "#241c14",
    cardGrad: "linear-gradient(180deg, rgba(255,255,255,0.065), rgba(255,255,255,0.018))", cardTop: "rgba(255,255,255,0.15)",
    ink: "#f7efe4", sub: "#b1a596", muted: "#776c5d",
    line: "rgba(255,255,255,0.10)", track: "rgba(255,255,255,0.08)",
    green: "#5fd08a", protein: "#ff8a3d", accent: "#ff8a3d", over: "#ef6256", weight: "#7aa2ff", extra: "#b39ad6",
    nav: "rgba(23,18,12,0.75)", overlay: "rgba(0,0,0,0.6)", shadow: "rgba(0,0,0,0.72)",
    bgImage: "radial-gradient(1000px 520px at 100% 0%, rgba(255,138,61,0.13), transparent 60%), radial-gradient(900px 520px at 0% 3%, rgba(95,208,138,0.08), transparent 62%)",
  },
  light: {
    bg: "#f4ece0", paper: "#f4ece0", sheet: "#fffaf2",
    card: "rgba(255,255,255,0.72)", cardSolid: "#fffaf2",
    cardGrad: "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,255,255,0.58))", cardTop: "rgba(255,255,255,0.95)",
    ink: "#2a221a", sub: "#6f6456", muted: "#9a8f7e",
    line: "rgba(60,45,25,0.12)", track: "rgba(60,45,25,0.10)",
    green: "#3a9d63", protein: "#e0712a", accent: "#e0712a", over: "#cf4836", weight: "#4e6cae", extra: "#8a6fc0",
    nav: "rgba(244,236,224,0.82)", overlay: "rgba(43,34,26,0.34)", shadow: "rgba(43,34,26,0.2)",
    bgImage: "radial-gradient(1000px 520px at 100% 0%, rgba(224,113,42,0.10), transparent 60%), radial-gradient(900px 520px at 0% 3%, rgba(58,157,99,0.06), transparent 62%)",
  },
};
const SLOT_THEMES = {
  dark:  { pdj: "#ffb24d", dej: "#5fd08a", diner: "#7aa2ff", snack: "#ff6fae" },
  light: { pdj: "#c5871d", dej: "#3a9d63", diner: "#4e6cae", snack: "#c0567e" },
};
const C = { ...THEMES.dark };
const SLOT_UI = {
  pdj:   { time: "Matin",  color: SLOT_THEMES.dark.pdj },
  dej:   { time: "Midi",   color: SLOT_THEMES.dark.dej },
  diner: { time: "Soir",   color: SLOT_THEMES.dark.diner },
  snack: { time: "En-cas", color: SLOT_THEMES.dark.snack },
};
// Style « carte premium » (variante C du lab) : dégradé top-lit + liseré clair en
// haut + ombre douce + flou. Centralisé → un ajustement ici se propage à toutes les
// cartes-conteneurs qui l'utilisent. Lit C au moment du rendu (donc suit le thème).
function cardStyle(extra) {
  return {
    background: C.cardGrad,
    border: `1px solid ${C.line}`,
    borderTop: `1px solid ${C.cardTop}`,
    boxShadow: `0 18px 42px -30px ${C.shadow}`,
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    ...extra,
  };
}

function applyTheme(t) {
  Object.assign(C, THEMES[t]);
  for (const k in SLOT_THEMES[t]) SLOT_UI[k].color = SLOT_THEMES[t][k];
  if (typeof document !== "undefined") {
    const root = document.documentElement, body = document.body;
    if (body) { body.style.backgroundColor = C.bg; body.style.backgroundImage = C.bgImage; body.style.backgroundAttachment = "scroll"; body.style.backgroundRepeat = "no-repeat"; }
    if (root) root.style.backgroundColor = C.bg;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", C.bg);
  }
}
const STORE_KEY = "croque-macro:v1";
const LEGACY_KEY = "pioche-repas:v2";

// ── Dates ───────────────────────────────────────────────────────────────────
const ISO = (d) => {
  const x = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return x.toISOString().slice(0, 10);
};
const TODAY = ISO(new Date());
const parseISO = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (iso, n) => { const d = parseISO(iso); d.setDate(d.getDate() + n); return ISO(d); };
const fmtShort = (iso) => parseISO(iso).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
const fmtFull = (iso) => iso === TODAY ? "Aujourd'hui" : parseISO(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const r0 = (x) => Math.round(x);

const EMPTY_DAY = () => ({ picks: { pdj: [], dej: [], diner: [], snacks: [], extras: [] }, skipBreakfast: false, training: false });

// normalise un repas (ancien format = objet unique) vers une liste
const toList = (x) => [].concat(x || []).filter(Boolean);
const normPicks = (p = {}) => ({ pdj: toList(p.pdj), dej: toList(p.dej), diner: toList(p.diner), snacks: p.snacks || [], extras: p.extras || [] });
const normDay = (d = {}) => ({ picks: normPicks(d.picks), skipBreakfast: !!d.skipBreakfast, training: !!d.training });
const normDays = (obj = {}) => { const o = {}; for (const k in obj) o[k] = normDay(obj[k]); return o; };

function dayTotals(day) {
  if (!day) return { kcal: 0, p: 0 };
  const pk = day.picks || {};
  const all = [...toList(pk.pdj), ...toList(pk.dej), ...toList(pk.diner), ...(pk.snacks || []), ...(pk.extras || [])].filter(Boolean);
  return all.reduce((a, m) => ({ kcal: a.kcal + m.kcal * (m.qty || 1), p: a.p + m.p * (m.qty || 1) }), { kcal: 0, p: 0 });
}
const hasData = (day) => day && dayTotals(day).kcal > 0;

// portions : clé picks (snack→snacks), bornage et affichage des quantités
const picksKey = (slot) => (slot === "snack" ? "snacks" : slot);
const clampQty = (v) => { v = Number(v); if (!isFinite(v) || v <= 0) return 1; return Math.min(20, Math.round(v * 100) / 100); };
const fmtQty = (v) => (Number.isInteger(v) ? String(v) : String(v).replace(".", ","));


// ── Moteur hebdomadaire « intelligent » ─────────────────────────────────────
// Solde glissant sur la semaine + budget plaisir + pilotage doux.
// Garde-fous : pas de dette, pas de calories « gagnées » au sport,
// plancher de sécurité, et détection du sous-mange (ne jamais pousser à serrer plus).
const KCAL_FLOOR = 1500;

function weekStats(days, settings, refISO, span = 7) {
  const target = settings.kcal;
  let consumedSum = 0, protSum = 0, logged = 0, deltaSum = 0;
  const perDay = [];
  for (let i = span - 1; i >= 0; i--) {
    const iso = addDays(refISO, -i);
    const d = days[iso];
    const has = d && hasData(d);
    const t = has ? dayTotals(d) : null;
    if (has) { consumedSum += t.kcal; protSum += t.p; logged++; deltaSum += target - t.kcal; }
    perDay.push({ iso, kcal: has ? t.kcal : null, p: has ? t.p : null, delta: has ? target - t.kcal : null, logged: has });
  }
  return {
    target, span, logged,
    avgKcal: logged ? consumedSum / logged : 0,
    avgProt: logged ? protSum / logged : 0,
    balance: deltaSum, // + = avance sur le plan · − = retard
    perDay,
  };
}

function weightTrendOver(weights, refISO, span = 14) {
  const ws = [];
  for (let i = 0; i < span; i++) { const iso = addDays(refISO, -i); if (weights[iso] != null) ws.push(weights[iso]); }
  if (ws.length < 2) return null;
  const d = ws[0] - ws[ws.length - 1]; // récent − ancien
  return d <= -0.2 ? "down" : d >= 0.3 ? "up" : "flat";
}

function weekCoach(stats, settings, weights, refISO) {
  const { balance, avgKcal, target, span, logged } = stats;
  const weightTrend = weightTrendOver(weights || {}, refISO);
  const w = settings.profile && settings.profile.weight;
  const protReco = w ? Math.round(1.6 * w) : null;
  const proteinRoom = (protReco && settings.protein - protReco >= 15)
    ? { reco: protReco, kcalBack: Math.round((settings.protein - protReco) * 4) }
    : null;

  if (logged < 2) {
    return { tone: "start", headline: "Bilan en préparation", detail: "Logue 2-3 journées et le bilan hebdomadaire s'affiche : solde, marge plaisir et conseil du lendemain.", balance, suggestTomorrow: null, weightTrend, proteinRoom: null };
  }
  if (avgKcal > 0 && avgKcal < target - 350) {
    return { tone: "low", headline: "Déficit déjà marqué", detail: `Tu manges en moyenne ${Math.round(target - avgKcal)} kcal sous ta cible. Pas besoin de serrer plus : vise au moins ta cible, c'est ce qui préserve le muscle et rend la sèche tenable.`, balance, suggestTomorrow: null, weightTrend, proteinRoom };
  }
  if (balance >= 300) {
    return { tone: "ahead", headline: `Marge plaisir : +${Math.round(balance)} kcal`, detail: "Tu es en avance sur ton plan de la semaine. C'est ta marge pour un vrai plaisir — ou tu la gardes, au choix.", balance, suggestTomorrow: null, weightTrend, proteinRoom };
  }
  if (balance <= -400) {
    const suggest = Math.max(KCAL_FLOOR, Math.round((target + balance / span) / 10) * 10);
    return { tone: "behind", headline: `Semaine chargée : ${Math.abs(Math.round(balance))} kcal au-dessus du plan`, detail: `Pas de panique, ça se lisse sur 7 jours. Pour rester dans ton plan, tu peux viser ~${suggest} kcal demain — jamais sous ${KCAL_FLOOR}. Ce n'est pas une dette à rembourser, juste un cap.`, balance, suggestTomorrow: suggest, weightTrend, proteinRoom };
  }
  return { tone: "ontrack", headline: "Pile dans ton plan", detail: "Ta moyenne colle à ta cible. C'est la régularité qui fait avancer, pas la perfection sur quelques jours.", balance, suggestTomorrow: null, weightTrend, proteinRoom };
}

// Compositeur de shake : base (poudre) + liquide, additionnés.
const SHAKE_BASES = [
  { name: "Vegan All-in-One", kcal: 216, p: 29 },
  { name: "Vegan Protein", kcal: 127, p: 24 },
  { name: "Clear Vegan", kcal: CLEAR_VEGAN_DOSE.kcal, p: CLEAR_VEGAN_DOSE.p },
  { name: "Clear Protein", kcal: CLEAR_PROTEIN_DOSE.kcal, p: CLEAR_PROTEIN_DOSE.p },
];
const SHAKE_LIQUIDS = [
  { name: "eau", kcal: 0, p: 0 },
  { name: "lait amande", kcal: 25, p: 1 },
  { name: "lait soja", kcal: 90, p: 9 },
];

// Repas réutilisables de départ. Bump COMBOS_SEED_VERSION pour pousser une mise à jour.
const COMBOS_SEED_VERSION = 2;
const DEFAULT_COMBOS = [
  // Petit-déj express à emporter — lait amande, protéines = poudre/yaourt
  { id: "cdef-pdj-shaker", slot: "pdj", name: "Express · shaker amande", created: 1, items: [
    { name: "Shake All-in-One + lait amande", kcal: 240, p: 30, qty: 1 },
  ] },
  { id: "cdef-pdj-barre", slot: "pdj", name: "Express · shake & barre vegane", created: 2, items: [
    { name: "Shake All-in-One + lait amande", kcal: 240, p: 30, qty: 1 },
    { name: "Barre gourmet vegane Bulk", kcal: 200, p: 17, qty: 1 },
  ] },
  { id: "cdef-pdj-oats", slot: "pdj", name: "Express · overnight oats amande", created: 3, items: [
    { name: "Flocons d'avoine (40 g)", kcal: 150, p: 5, qty: 1 },
    { name: "Lait amande (250 ml)", kcal: 25, p: 1, qty: 1 },
    { name: "All-in-One (1 dose)", kcal: 216, p: 29, qty: 1 },
  ] },
  { id: "cdef-pdj-smoothie", slot: "pdj", name: "Express · smoothie amande", created: 4, items: [
    { name: "Lait amande (250 ml)", kcal: 25, p: 1, qty: 1 },
    { name: "Banane", kcal: 90, p: 1, qty: 1 },
    { name: "Shake All-in-One (1 dose)", kcal: 216, p: 29, qty: 1 },
    { name: "Purée de cacahuète (1 c.à.s)", kcal: 90, p: 3, qty: 1 },
  ] },
  { id: "cdef-pdj-yaourt", slot: "pdj", name: "Express · yaourt soja protéiné & flocons", created: 5, items: [
    { name: "Yaourt soja protéiné", kcal: 160, p: 18, qty: 1 },
    { name: "Flocons d'avoine (30 g)", kcal: 115, p: 4, qty: 1 },
  ] },
  { id: "cdef-pdj-leger", slot: "pdj", name: "Express léger · Clear & banane", created: 6, items: [
    { name: "Clear Protein (verre 150 ml)", kcal: CLEAR_PROTEIN_VERRE.kcal, p: CLEAR_PROTEIN_VERRE.p, qty: 1 },
    { name: "Banane", kcal: 90, p: 1, qty: 1 },
  ] },
  // Déj protéinés — adaptés au stock
  { id: "cdef-dej-jambon", slot: "dej", name: "Déj protéiné · jambon La Vie & lentilles", created: 7, items: [
    { name: "Jambon La Vie (≈120 g)", kcal: 145, p: 19, qty: 1 },
    { name: "Lentilles cuites (150 g)", kcal: 175, p: 12, qty: 1 },
    { name: "Légumes citron & épices", kcal: 55, p: 4, qty: 1 },
  ] },
  { id: "cdef-dej-teriyaki", slot: "dej", name: "Déj protéiné · jambon & tofu teriyaki", created: 8, items: [
    { name: "Jambon La Vie (≈80 g)", kcal: 95, p: 13, qty: 1 },
    { name: "Tofu teriyaki La Vie", kcal: 230, p: 18, qty: 1 },
    { name: "Crudités sans huile", kcal: 50, p: 3, qty: 1 },
  ] },
];

// ── Cible kcal/protéines : calcul + ajustement selon le poids réel ───────────
// Profil par défaut (doit rester identique à celui de Settings.jsx).
const DEFAULT_PROFILE = { sex: "h", age: 35, weight: 78, height: 178, activity: 1.45, deficit: 0.18 };

// Calcule maintenance / cible / protéines reco à partir d'un profil (Mifflin-St Jeor).
// Source unique : Settings (calculatrice) ET l'ajustement auto réutilisent CE calcul.
function computeTargets(profile) {
  const { sex, age, weight, height, activity, deficit } = { ...DEFAULT_PROFILE, ...(profile || {}) };
  const w = +weight || 0, h = +height || 0, a = +age || 0;
  const bmr = 10 * w + 6.25 * h - 5 * a + (sex === "h" ? 5 : -161);
  const tdee = bmr * activity;
  const round50 = (x) => Math.round(x / 50) * 50, round5 = (x) => Math.round(x / 5) * 5;
  return {
    maintenance: round50(tdee),
    target: Math.max(1500, round50(tdee * (1 - deficit)), Math.round(bmr)),
    proteinReco: Math.min(220, Math.max(100, round5(w * 1.9))),
  };
}

// Poids « lissé » : moyenne pondérée des dernières pesées (récent = plus de poids),
// pour gommer le bruit quotidien (eau, sel…). Renvoie { kg, n } ou null.
function smoothedWeight(weights, refISO = TODAY, { span = 30, min = 1 } = {}) {
  const pts = [];
  for (let i = 0; i < span && pts.length < 10; i++) {
    const iso = addDays(refISO, -i);
    if (weights && weights[iso] != null && !isNaN(weights[iso])) pts.push(Number(weights[iso]));
  }
  if (pts.length < min) return null;
  let wsum = 0, vsum = 0;
  pts.forEach((kg, idx) => { const wt = 1 / (idx + 1); wsum += wt; vsum += wt * kg; });
  return { kg: Math.round((vsum / wsum) * 10) / 10, n: pts.length };
}

// Construit un prompt prêt à coller dans Claude.ai à partir de la base perso + budget du jour.
function buildClaudePrompt({ customMeals = [], remKcal, remP, dateLabel } = {}) {
  const L = [];
  L.push("Tu es mon assistant nutrition. Règles strictes à respecter :");
  L.push("- Végétarien : œufs et fromages au lait de vache uniquement (jamais chèvre ni brebis).");
  L.push("- Je ne bois pas de lait de vache. Lait végétal par défaut = lait d'amande non sucré.");
  L.push("- La protéine vient surtout des aliments protéinés / de la poudre, pas du lait.");
  L.push("");
  if (customMeals.length) {
    L.push("Mes ingrédients & produits habituels (macros par portion indiquée) :");
    customMeals.forEach((m) => L.push(`- ${m.name} : ${r0(m.kcal)} kcal, ${m.p} g de protéines`));
    L.push("");
  }
  const hasBudget = Number.isFinite(remKcal) && Number.isFinite(remP);
  if (hasBudget) {
    L.push(`Budget restant${dateLabel ? ` (${dateLabel})` : ""} : ${r0(Math.max(0, remKcal))} kcal et ${r0(Math.max(0, remP))} g de protéines.`);
    L.push("");
  }
  L.push(`Propose-moi 3 recettes ${hasBudget ? "qui rentrent dans ce budget" : "équilibrées et protéinées"}, utilisant en priorité mes produits ci-dessus. Donne pour chacune les ingrédients, les étapes et les macros estimées (kcal + protéines).`);
  return L.join("\n");
}

// Idées de plats & recettes — écran dédié. cat: pdj | dej | diner | snack

export {
  MEALS, SLOTS, TAGS, store, THEMES, SLOT_THEMES, C, SLOT_UI, applyTheme, cardStyle, STORE_KEY, LEGACY_KEY, ISO, TODAY, parseISO, addDays, fmtShort, fmtFull, r0, EMPTY_DAY, toList, normPicks, normDay, normDays, dayTotals, hasData, picksKey, clampQty, fmtQty, KCAL_FLOOR, weekStats, weekCoach, weightTrendOver, DEFAULT_COMBOS, COMBOS_SEED_VERSION, SHAKE_BASES, SHAKE_LIQUIDS, DEFAULT_PROFILE, computeTargets, smoothedWeight, buildClaudePrompt,
};
