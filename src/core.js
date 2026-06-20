// ════════════════════════════════════════════════════════════════════════════
//  core.js — données, thème et helpers partagés (hors composants React)
//  Base de repas, presets, tokens de thème (C/SLOT_UI mutés par applyTheme),
//  helpers de date, de quantité et modèle de journée. Importé par App.jsx.
// ════════════════════════════════════════════════════════════════════════════
import {
  Coffee, Salad, UtensilsCrossed, Apple, Clock, Package, Soup, EggOff, Snowflake, Dumbbell,
} from "lucide-react";

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
  { id: "bv1", name: "Clear Vegan Bulk (1 verre)", slots: ["pdj", "dej", "snack"], kcal: 67, p: 15, c: 2, f: 1, tags: ["rapide", "transportable", "sans-oeuf", "bulk"], desc: "Un verre de Clear Vegan Bulk (1 dose ~20 g de poudre, à l'eau glacée) : 67 kcal / 15 g. Qté = nombre de doses. Le volume d'eau ne change pas les macros." },
  { id: "bv5", name: "Clear Protein Bulk (1 verre)", slots: ["pdj", "dej", "snack"], kcal: 75, p: 18, c: 2, f: 1, tags: ["rapide", "transportable", "sans-oeuf", "bulk"], desc: "Un verre de Clear Protein Bulk (whey clarifiée, 1 dose, à l'eau glacée) : 75 kcal / 18 g. Qté = nombre de doses. Pas vegan (lait), mais sans œuf." },
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

const THEMES = {
  dark: {
    bg: "#16120e", paper: "#16120e", sheet: "#211b15",
    card: "rgba(255,255,255,0.055)", cardSolid: "#241d16",
    ink: "#f4ede1", sub: "#b3a899", muted: "#7d7466",
    line: "rgba(255,255,255,0.10)", track: "rgba(255,255,255,0.09)",
    green: "#6cc38a", protein: "#f08a3e", over: "#ef6256", weight: "#8ea4e6", extra: "#b39ad6",
    nav: "rgba(20,16,12,0.72)", overlay: "rgba(0,0,0,0.62)", shadow: "rgba(0,0,0,0.7)",
    bgImage: "radial-gradient(1100px 480px at 12% -8%, rgba(108,195,138,0.16), transparent 60%), radial-gradient(900px 460px at 92% 4%, rgba(240,138,62,0.14), transparent 62%), radial-gradient(800px 600px at 50% 116%, rgba(142,164,230,0.12), transparent 60%)",
  },
  light: {
    bg: "#f3eee4", paper: "#f3eee4", sheet: "#fffdf9",
    card: "rgba(255,255,255,0.78)", cardSolid: "#fffdf9",
    ink: "#2b2530", sub: "#6f6577", muted: "#9b91a0",
    line: "rgba(43,37,48,0.12)", track: "rgba(43,37,48,0.10)",
    green: "#2f8d5f", protein: "#dd6f2f", over: "#cf4836", weight: "#4e6cae", extra: "#8a6fc0",
    nav: "rgba(243,238,228,0.82)", overlay: "rgba(43,37,48,0.34)", shadow: "rgba(43,37,48,0.22)",
    bgImage: "radial-gradient(1100px 480px at 12% -8%, rgba(47,141,95,0.12), transparent 60%), radial-gradient(900px 460px at 92% 4%, rgba(221,111,47,0.10), transparent 62%), radial-gradient(800px 600px at 50% 116%, rgba(78,108,174,0.10), transparent 60%)",
  },
};
const SLOT_THEMES = {
  dark:  { pdj: "#e7b24a", dej: "#6cc38a", diner: "#8ea4e6", snack: "#e06a9a" },
  light: { pdj: "#c5871d", dej: "#2f8d5f", diner: "#4e6cae", snack: "#c0567e" },
};
const C = { ...THEMES.dark };
const SLOT_UI = {
  pdj:   { time: "Matin",  color: SLOT_THEMES.dark.pdj },
  dej:   { time: "Midi",   color: SLOT_THEMES.dark.dej },
  diner: { time: "Soir",   color: SLOT_THEMES.dark.diner },
  snack: { time: "En-cas", color: SLOT_THEMES.dark.snack },
};
function applyTheme(t) {
  Object.assign(C, THEMES[t]);
  for (const k in SLOT_THEMES[t]) SLOT_UI[k].color = SLOT_THEMES[t][k];
  if (typeof document !== "undefined") {
    const root = document.documentElement, body = document.body;
    if (body) { body.style.backgroundColor = C.bg; body.style.backgroundImage = C.bgImage; body.style.backgroundAttachment = "fixed"; }
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

const EXTRA_PRESETS = [
  { cat: "Sucré", items: [
    { name: "Boule de glace", kcal: 130, p: 2 },
    { name: "Boule de sorbet", kcal: 95, p: 0 },
    { name: "Cornet 2 boules", kcal: 320, p: 4 },
    { name: "Glace italienne", kcal: 220, p: 4 },
    { name: "Part de gâteau", kcal: 350, p: 5 },
    { name: "Crêpe sucre", kcal: 150, p: 3 },
    { name: "Crêpe Nutella", kcal: 280, p: 5 },
    { name: "Carré de chocolat", kcal: 55, p: 1 },
    { name: "Barre protéinée", kcal: 200, p: 20 },
    { name: "Poignée de chips", kcal: 150, p: 2 },
  ] },
  { cat: "Protéiné", items: [
    { name: "Clear Protein Bulk", kcal: 75, p: 18 },
    { name: "Clear Vegan Bulk (eau)", kcal: 67, p: 15 },
    { name: "Shake Vegan Bulk (eau, 35 g)", kcal: 127, p: 24 },
    { name: "Barre gourmet vegane Bulk", kcal: 206, p: 17 },
    { name: "Brownie vegan Bulk", kcal: 227, p: 15 },
    { name: "Blondie vegan Bulk", kcal: 230, p: 14 },
  ] },
  { cat: "Sans alcool", items: [
    { name: "Jus / smoothie detox", kcal: 150, p: 2 },
    { name: "Soda (33 cl)", kcal: 140, p: 0 },
    { name: "Soda / thé glacé zéro", kcal: 5, p: 0 },
    { name: "Limonade / thé glacé", kcal: 120, p: 0 },
    { name: "Kombucha Foliz · Le Festif (≈25 cl)", kcal: 35, p: 0 },
    { name: "Kombucha Foliz · Le Passionné (≈25 cl)", kcal: 35, p: 0 },
  ] },
  { cat: "Bière & alcool", items: [
    { name: "Demi blonde (25 cl)", kcal: 100, p: 1 },
    { name: "Pinte blonde (50 cl)", kcal: 200, p: 2 },
    { name: "IPA (33 cl)", kcal: 215, p: 2 },
    { name: "Pinte IPA (50 cl)", kcal: 320, p: 3 },
    { name: "Bière forte (33 cl)", kcal: 270, p: 2 },
    { name: "Verre de vin (15 cl)", kcal: 125, p: 0 },
    { name: "Verre de cidre", kcal: 110, p: 0 },
    { name: "Spritz", kcal: 150, p: 0 },
    { name: "Gin tonic", kcal: 170, p: 0 },
    { name: "Mojito", kcal: 200, p: 0 },
    { name: "Margarita", kcal: 250, p: 0 },
    { name: "Piña colada", kcal: 380, p: 2 },
  ] },
];

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
  { name: "Clear Vegan", kcal: 67, p: 15 },
  { name: "Clear Protein", kcal: 75, p: 18 },
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
    { name: "Clear Protein (eau)", kcal: 75, p: 18, qty: 1 },
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

// Idées de plats & recettes — écran dédié. cat: pdj | dej | diner | snack
const MEAL_IDEAS = [
  // Petit-déj
  { id: "idea-oats", cat: "pdj", quick: true, name: "Overnight oats protéiné", emoji: "🥣", kcal: 390, p: 35, desc: "Se prépare la veille, se mange (ou se boit) en voiture.", ingredients: ["40 g de flocons d'avoine", "250 ml de lait d'amande", "1 dose de Vegan Protein", "une poignée de fruits rouges", "1 c. à café de graines de chia"], steps: ["La veille, mélange flocons + lait + protéine + chia dans un bocal.", "Laisse une nuit au frigo.", "Le matin, ajoute les fruits."] },
  { id: "idea-pancakes", cat: "pdj", quick: true, name: "Pancakes protéinés", emoji: "🥞", kcal: 400, p: 35, desc: "Sans huile, à la poêle antiadhésive.", ingredients: ["40 g de flocons mixés", "2 œufs", "1 banane écrasée", "1/2 dose de Vegan Protein", "cannelle"], steps: ["Mixe le tout en pâte.", "Cuis en petits pancakes, poêle antiadhésive sans huile.", "Garnis de fruits ou d'un filet de sirop léger."] },
  { id: "idea-tofuscramble", cat: "pdj", quick: true, name: "Tofu brouillé express", emoji: "🍳", kcal: 290, p: 22, desc: "L'alternative aux œufs, goût brouillé.", ingredients: ["150 g de tofu ferme", "curcuma, paprika, sel kala namak (goût œuf)", "1 tranche de pain complet"], steps: ["Écrase le tofu à la fourchette.", "Poêle antiadhésive + épices, 5 min.", "Sers avec le pain."] },
  { id: "idea-skyrmuesli", cat: "pdj", quick: true, name: "Skyr soja & muesli", emoji: "🥣", kcal: 320, p: 20, desc: "Rapide. Choisis un skyr SOJA (plus protéiné que l'amande) et un muesli sans sucre ajouté.", ingredients: ["150 g de skyr/yaourt soja protéiné", "40 g de muesli sans sucre ajouté", "fruits frais"], steps: ["Mélange skyr + muesli.", "Ajoute les fruits."] },
  // Déjeuner
  { id: "idea-buddha", cat: "dej", quick: true, name: "Buddha bowl tofu", emoji: "🥗", kcal: 470, p: 32, desc: "Protéiné, frais, sec en gras.", ingredients: ["150 g de tofu fumé ou teriyaki", "80 g de quinoa (cru) cuit", "80 g d'edamame", "crudités (carotte, chou, concombre)", "sauce soja + citron + gingembre"], steps: ["Cuis le quinoa.", "Poêle le tofu.", "Assemble avec edamame et crudités, nappe de sauce."] },
  { id: "idea-omelette", cat: "dej", name: "Omelette garnie", emoji: "🍳", kcal: 400, p: 24, desc: "Rapide et rassasiant.", ingredients: ["3 œufs", "champignons + épinards", "1 tranche de pain complet"], steps: ["Fais revenir champignons et épinards.", "Verse les œufs battus, cuis l'omelette.", "Sers avec le pain."] },
  { id: "idea-steak", cat: "dej", name: "Steak végétal & légumes rôtis", emoji: "🥩", kcal: 450, p: 30, desc: "Avec HappyVore ou Garden Gourmet.", ingredients: ["1 steak végétal", "grosse portion de légumes rôtis", "100 g de patate douce ou lentilles"], steps: ["Rôtis les légumes au four.", "Poêle le steak.", "Assemble."] },
  { id: "idea-wrap", cat: "dej", quick: true, name: "Wrap protéiné", emoji: "🌯", kcal: 400, p: 22, desc: "À emporter, se mange à une main.", ingredients: ["1 tortilla complète", "jambon La Vie ou tofu", "crudités", "1 c. à soupe de houmous"], steps: ["Tartine le houmous.", "Garnis de protéine + crudités.", "Roule serré."] },
  { id: "idea-medbowl", cat: "dej", quick: true, name: "Bowl méditerranéen", emoji: "🥙", kcal: 470, p: 26, desc: "Pois chiches + œuf, frais et complet.", ingredients: ["150 g de pois chiches", "1 œuf dur", "concombre + tomate", "60 g de boulgour (cru) cuit", "citron, herbes"], steps: ["Cuis le boulgour.", "Assemble pois chiches, œuf, légumes.", "Assaisonne citron + herbes."] },
  // Dîner
  { id: "idea-curry", cat: "diner", name: "Curry de pois chiches express", emoji: "🍛", kcal: 520, p: 22, desc: "Réconfortant, prêt en 15 min.", ingredients: ["150 g de pois chiches", "150 ml de lait de coco allégé", "épinards", "tomate concassée + pâte de curry", "100 g de riz basmati (cru) cuit"], steps: ["Fais mijoter tomate + curry + coco.", "Ajoute pois chiches et épinards, 10 min.", "Sers sur le riz."] },
  { id: "idea-wok", cat: "diner", name: "Poêlée tofu-légumes & soba", emoji: "🍜", kcal: 480, p: 28, desc: "Façon wok, vite fait.", ingredients: ["150 g de tofu teriyaki", "wok de légumes (poivron, brocoli, pousses)", "80 g de nouilles soba (crues) cuites", "sauce soja"], steps: ["Cuis les soba.", "Saute tofu + légumes au wok.", "Mélange, nappe de sauce."] },
  { id: "idea-galette", cat: "diner", name: "Galette de sarrasin garnie", emoji: "🫓", kcal: 420, p: 22, desc: "Œuf + champignons, format crêpe salée.", ingredients: ["1 galette de sarrasin", "1 œuf", "champignons", "un peu de fromage râpé"], steps: ["Réchauffe la galette.", "Casse l'œuf au centre, ajoute champignons + fromage.", "Replie et sers."] },
  { id: "idea-soupe", cat: "diner", quick: true, name: "Soupe + œufs durs", emoji: "🍲", kcal: 350, p: 18, desc: "Léger, parfait après une grosse journée.", ingredients: ["gros bol de soupe de légumes maison", "2 œufs durs", "1 tranche de pain complet"], steps: ["Réchauffe la soupe.", "Sers avec œufs durs + pain."] },
  // Snack
  { id: "idea-shakefruit", cat: "snack", quick: true, name: "Shake amande & fruit", emoji: "🥤", kcal: 330, p: 31, desc: "Le coup de fouet protéiné.", ingredients: ["1 dose d'All-in-One ou Vegan Protein", "250 ml de lait d'amande", "1 banane ou fruits rouges"], steps: ["Mets tout au shaker ou au blender.", "Mixe/secoue."] },
  { id: "idea-skyrnoix", cat: "snack", quick: true, name: "Skyr soja & noix", emoji: "🥜", kcal: 230, p: 16, desc: "Crémeux + croquant.", ingredients: ["150 g de skyr/yaourt soja protéiné", "une petite poignée de noix", "un filet de miel (option)"], steps: ["Mélange.", "Ajoute les noix au moment de manger."] },
  { id: "idea-houmous", cat: "snack", quick: true, name: "Houmous & crudités", emoji: "🥕", kcal: 180, p: 6, desc: "À grignoter, plein de fibres.", ingredients: ["2 c. à soupe de houmous", "bâtonnets de carotte, concombre, poivron"], steps: ["Coupe les crudités.", "Trempe."] },
  { id: "idea-houmous-rouge", cat: "snack", quick: true, name: "Houmous de haricots rouges maison", emoji: "🫘", kcal: 250, p: 8, desc: "Ta recette (fait ~4 portions). Riche en bon gras : pour alléger, descends l'huile d'olive à 1 c. à soupe et rallonge à l'eau/aquafaba (~190 kcal/portion).", ingredients: ["300 g de haricots rouges cuits", "3 c. à soupe de tahini", "3 c. à soupe d'huile d'olive (1 suffit pour alléger)", "1/2 citron pressé", "sel, poivre"], steps: ["Mixe tout jusqu'à consistance lisse.", "Ajoute un peu d'eau ou d'aquafaba (jus de la boîte) si trop épais.", "Rectifie sel et citron. Sers avec des crudités."] },
  { id: "idea-clearbarre", cat: "snack", quick: true, name: "Clear Vegan & barre", emoji: "🍫", kcal: 270, p: 32, desc: "Très protéiné, faible en gras.", ingredients: ["1 dose de Clear Vegan à l'eau glacée", "1 barre gourmet vegane Bulk"], steps: ["Prépare la Clear bien froide.", "Accompagne de la barre."] },
  // — Lot 2 —
  { id: "idea-porridge", cat: "pdj", name: "Porridge protéiné chaud", emoji: "🥣", kcal: 400, p: 35, desc: "Chaud et réconfortant les matins d'hiver.", ingredients: ["40 g de flocons d'avoine", "250 ml de lait d'amande", "1 dose de Vegan Protein", "1/2 banane en rondelles", "cannelle"], steps: ["Cuis flocons + lait 3-4 min en remuant.", "Hors du feu, incorpore la protéine.", "Garnis de banane et cannelle."] },
  { id: "idea-chia", cat: "pdj", quick: true, name: "Chia pudding amande", emoji: "🍮", kcal: 300, p: 20, desc: "Se prépare la veille, ultra rassasiant.", ingredients: ["30 g de graines de chia", "250 ml de lait d'amande", "1/2 dose de Vegan Protein", "fruits rouges"], steps: ["Mélange chia + lait + protéine.", "Repos une nuit au frigo.", "Ajoute les fruits au matin."] },
  { id: "idea-toastoeuf", cat: "pdj", quick: true, name: "Toast œuf-avocat", emoji: "🥑", kcal: 430, p: 20, desc: "Le brunch express, bon gras maîtrisé.", ingredients: ["2 tranches de pain complet", "1/2 avocat", "2 œufs pochés ou au plat", "citron, piment"], steps: ["Toaste le pain, écrase l'avocat dessus.", "Cuis les œufs.", "Pose-les sur le toast, citron + piment."] },
  { id: "idea-dahl", cat: "dej", name: "Dahl de lentilles corail", emoji: "🍛", kcal: 520, p: 22, desc: "Épicé, réconfortant, peu de gras.", ingredients: ["80 g de lentilles corail (crues)", "150 ml de lait de coco allégé", "tomate, oignon, épices (curcuma, cumin)", "60 g de riz basmati (cru) cuit"], steps: ["Fais revenir oignon + épices.", "Ajoute lentilles, tomate, coco, mijote 15 min.", "Sers sur le riz."] },
  { id: "idea-poke", cat: "dej", quick: true, name: "Poke bowl tofu", emoji: "🍣", kcal: 480, p: 28, desc: "Frais, façon hawaïen.", ingredients: ["80 g de riz (cru) cuit", "120 g de tofu fumé en dés", "edamame", "concombre, carotte, oignon rouge", "sauce soja + sésame"], steps: ["Dispose le riz tiède dans un bol.", "Ajoute tofu, edamame et crudités.", "Nappe de sauce, parsème de sésame."] },
  { id: "idea-chili", cat: "dej", name: "Chili sin carne", emoji: "🫘", kcal: 520, p: 32, desc: "Avec haché végétal et haricots rouges.", ingredients: ["150 g de haricots rouges", "100 g de haché végétal (Garden Gourmet)", "tomate concassée, poivron, épices chili", "60 g de riz (cru) cuit"], steps: ["Fais revenir haché + poivron.", "Ajoute tomate, haricots, épices, mijote 15 min.", "Sers avec le riz."] },
  { id: "idea-pates", cat: "diner", name: "Pâtes complètes & boulettes La Vie", emoji: "🍝", kcal: 520, p: 28, desc: "Le confort food protéiné.", ingredients: ["80 g de pâtes complètes (crues)", "boulettes La Vie", "sauce tomate basilic", "parmesan végétal (option)"], steps: ["Cuis les pâtes.", "Réchauffe boulettes dans la sauce tomate.", "Mélange et sers."] },
  { id: "idea-shakshuka", cat: "diner", name: "Shakshuka", emoji: "🥘", kcal: 400, p: 22, desc: "Œufs pochés dans une sauce tomate-poivron.", ingredients: ["3 œufs", "tomate concassée, poivron, oignon", "cumin, paprika", "1 tranche de pain complet"], steps: ["Mijote tomate + poivron + épices.", "Casse les œufs dedans, couvre 5-6 min.", "Sers avec le pain pour saucer."] },
  { id: "idea-tofuwok", cat: "diner", name: "Tofu teriyaki & riz sauté légumes", emoji: "🍚", kcal: 480, p: 24, desc: "Vite fait au wok.", ingredients: ["150 g de tofu teriyaki La Vie", "80 g de riz (cru) cuit", "wok de légumes (poivron, brocoli, petits pois)", "sauce soja"], steps: ["Saute les légumes au wok.", "Ajoute le riz cuit et le tofu, fais sauter.", "Déglace à la sauce soja."] },
  { id: "idea-edamame", cat: "snack", quick: true, name: "Edamame vapeur", emoji: "🫛", kcal: 190, p: 17, desc: "Le snack le plus protéiné qui soit.", ingredients: ["150 g d'edamame (dans la cosse)", "sel, ou un peu de piment"], steps: ["Cuis 5 min à la vapeur ou à l'eau bouillante.", "Sale et déguste en pressant les cosses."] },
  { id: "idea-mugcake", cat: "snack", quick: true, name: "Mug cake protéiné", emoji: "🧁", kcal: 220, p: 28, desc: "Dessert chaud en 1 min au micro-ondes.", ingredients: ["1 dose de Vegan Protein (chocolat)", "1 c. à soupe de cacao", "1/2 banane écrasée", "1 blanc d'œuf", "1/2 c. à café de levure"], steps: ["Mélange tout dans un mug.", "Micro-ondes 1 min.", "Laisse tiédir 1 min avant de manger."] },
  { id: "idea-pommePB", cat: "snack", quick: true, name: "Pomme & purée de cacahuète", emoji: "🍎", kcal: 180, p: 4, desc: "Sucré-salé, croquant.", ingredients: ["1 pomme en quartiers", "1 c. à soupe de purée de cacahuète"], steps: ["Coupe la pomme.", "Trempe dans la purée de cacahuète."] },
  // — Inspirées de The Conscious Plant Kitchen (réécrites, adaptées à tes produits) —
  { id: "idea-orangetofu", cat: "diner", name: "Tofu croustillant à l'orange", emoji: "🍊", kcal: 480, p: 26, desc: "Inspirée de The Conscious Plant Kitchen. Croustillant dehors, sauce orange acidulée.", ingredients: ["200 g de tofu ferme en cubes", "1 c. à soupe de maïzena", "le jus d'1 orange", "2 c. à soupe de sauce soja", "1 c. à café de sirop d'érable", "ail + gingembre râpés", "60 g de riz (cru) cuit"], steps: ["Presse le tofu, enrobe les cubes de maïzena.", "Dore-les à la poêle (peu d'huile) ou à l'airfryer jusqu'à croustillant.", "Fais réduire jus d'orange + soja + sirop + ail/gingembre 3 min.", "Enrobe le tofu de sauce, sers sur le riz."] },
  { id: "idea-szechuan", cat: "diner", name: "Tofu Szechuan", emoji: "🌶️", kcal: 500, p: 28, desc: "Inspirée de The Conscious Plant Kitchen. Relevé, vite fait au wok.", ingredients: ["200 g de tofu ferme en cubes", "1 poivron + oignon", "sauce : soja, vinaigre de riz, ail, piment, pointe de sucre", "60 g de riz (cru) cuit"], steps: ["Dore le tofu jusqu'à croustillant.", "Saute poivron + oignon au wok.", "Ajoute le tofu et la sauce, fais glacer 2 min.", "Sers sur le riz."] },
  { id: "idea-bolo", cat: "diner", name: "Bolognaise végétale aux lentilles", emoji: "🍝", kcal: 520, p: 24, desc: "Inspirée de The Conscious Plant Kitchen. La bolo réconfortante, sans viande.", ingredients: ["150 g de lentilles vertes cuites", "carotte + oignon + céleri hachés", "tomate concassée + herbes", "80 g de pâtes complètes (crues)"], steps: ["Fais revenir carotte, oignon, céleri.", "Ajoute lentilles, tomate, herbes, mijote 20 min.", "Cuis les pâtes, mélange."] },
  { id: "idea-hpsalad", cat: "dej", quick: true, name: "Salade vegan hyper-protéinée", emoji: "🥗", kcal: 450, p: 35, desc: "Inspirée de The Conscious Plant Kitchen. Le combo edamame + pois chiches + tofu.", ingredients: ["80 g d'edamame", "100 g de pois chiches", "80 g de tofu fumé en dés", "crudités + graines de courge", "sauce tahini + citron + eau"], steps: ["Assemble edamame, pois chiches, tofu et crudités.", "Émulsionne tahini + citron + un peu d'eau.", "Nappe, parsème de graines."] },
  { id: "idea-bbburger", cat: "dej", name: "Burger patate douce & haricots noirs", emoji: "🍔", kcal: 430, p: 18, desc: "Inspirée de The Conscious Plant Kitchen. Galette maison moelleuse.", ingredients: ["1 petite patate douce cuite écrasée", "150 g de haricots noirs écrasés", "3 c. à soupe de flocons d'avoine", "épices (cumin, paprika, ail)", "1 pain à burger complet + crudités"], steps: ["Mélange patate douce, haricots, flocons et épices.", "Forme une galette, cuis 5 min par face à la poêle.", "Sers dans le pain avec des crudités."] },
  { id: "idea-teriyaki", cat: "diner", name: "Nouilles teriyaki & edamame", emoji: "🍜", kcal: 480, p: 22, desc: "Inspirée de The Conscious Plant Kitchen. Rapide et gourmand.", ingredients: ["80 g de nouilles (crues) cuites", "80 g d'edamame", "tofu teriyaki La Vie", "légumes (poivron, carotte, oignon vert)", "sauce teriyaki (soja, sirop, ail, gingembre)"], steps: ["Cuis les nouilles.", "Saute légumes + tofu, ajoute edamame.", "Ajoute nouilles + sauce, fais glacer 2 min."] },
  { id: "idea-peanutnoodles", cat: "diner", name: "Nouilles crémeuses cacahuète & tofu", emoji: "🥜", kcal: 540, p: 26, desc: "Inspirée de The Conscious Plant Kitchen. Sauce satay onctueuse.", ingredients: ["80 g de nouilles (crues) cuites", "120 g de tofu fumé", "sauce : purée de cacahuète, soja, citron vert, ail, eau", "crudités râpées (carotte, chou)"], steps: ["Cuis les nouilles.", "Dore le tofu.", "Mélange nouilles + tofu + sauce cacahuète, parsème de crudités."] },
  { id: "idea-broccolipasta", cat: "diner", name: "Pâtes crémeuses au brocoli", emoji: "🥦", kcal: 470, p: 18, desc: "Inspirée de The Conscious Plant Kitchen. Sauce veloutée sans crème.", ingredients: ["80 g de pâtes complètes (crues)", "1 gros brocoli", "ail, levure maltée", "un peu de lait d'amande pour lier"], steps: ["Cuis pâtes + brocoli ensemble.", "Mixe une partie du brocoli avec ail, levure maltée et lait d'amande.", "Mélange la sauce aux pâtes."] },
  { id: "idea-enchiladas", cat: "diner", name: "Enchiladas haricots noirs", emoji: "🫔", kcal: 450, p: 18, desc: "Inspirée de The Conscious Plant Kitchen. Roulées et gratinées.", ingredients: ["2 tortillas complètes", "150 g de haricots noirs", "maïs + poivron", "sauce tomate épicée", "fromage râpé (option)"], steps: ["Garnis les tortillas de haricots, maïs, poivron.", "Roule-les dans un plat, nappe de sauce tomate.", "Gratine 15 min au four."] },
  { id: "idea-orangecauli", cat: "diner", name: "Chou-fleur croustillant à l'orange", emoji: "🍊", kcal: 380, p: 10, desc: "Inspirée de The Conscious Plant Kitchen. La version légumes du tofu à l'orange.", ingredients: ["1 chou-fleur en bouquets", "1 c. à soupe de maïzena", "sauce orange (jus d'orange, soja, ail, sirop)", "60 g de riz (cru) cuit"], steps: ["Enrobe le chou-fleur de maïzena, rôtis au four 25 min.", "Réduis la sauce orange.", "Enrobe et sers sur le riz."] },
  { id: "idea-oatrolls", cat: "pdj", name: "Petits pains à l'avoine", emoji: "🍞", kcal: 120, p: 6, desc: "Inspirée de The Conscious Plant Kitchen. 6 g de protéines, 12 g de fibres, sans œuf. (par petit pain)", ingredients: ["flocons d'avoine mixés", "yaourt soja", "levure + sel", "graines (option)"], steps: ["Mélange avoine + yaourt + levure en pâte.", "Forme des petits pains.", "Cuis 30 min au four à 180°C."] },
  { id: "idea-bananabars", cat: "snack", name: "Barres avoine, banane & yaourt soja", emoji: "🍌", kcal: 150, p: 5, desc: "Inspirée de The Conscious Plant Kitchen. 4 ingrédients, à emporter.", ingredients: ["2 bananes écrasées", "150 g de yaourt soja", "120 g de flocons d'avoine", "pépites ou fruits secs (option)"], steps: ["Mélange tout.", "Étale dans un moule.", "Cuis 30-35 min à 180°C, coupe en barres."] },
  { id: "idea-kombuchacake", cat: "snack", name: "Gâteau au kombucha (plaisir)", emoji: "🍰", kcal: 250, p: 3, desc: "Inspirée de The Conscious Plant Kitchen. 4 ingrédients. Plaisir occasionnel : c'est un gâteau, le kombucha ne sert qu'à lever la pâte. (par part)", ingredients: ["farine à levée incorporée (ou farine + levure)", "sucre", "kombucha (saveur fruits rouges ou citron)", "huile neutre ou margarine fondue"], steps: ["Mélange farine + sucre, verse kombucha + huile.", "Remue en pâte lisse, verse dans un moule.", "Cuis ~50 min à 180°C. Laisse refroidir avant de couper."] },
  // — Inspirées de Recettes de Julie (réécrites, adaptées à tes produits) —
  { id: "idea-taboule", cat: "dej", quick: true, name: "Taboulé sucré-salé tomates & abricots rôtis", emoji: "🍅", kcal: 400, p: 14, desc: "Inspirée de Recettes de Julie. Frais et original. J'ai ajouté des pois chiches pour les protéines.", ingredients: ["60 g de semoule ou boulgour (cru) cuit", "tomates + abricots rôtis", "100 g de pois chiches", "menthe, citron, filet d'huile d'olive"], steps: ["Cuis la semoule.", "Rôtis tomates et abricots 15 min.", "Mélange avec pois chiches, menthe et citron."] },
  { id: "idea-nicecream", cat: "snack", quick: true, name: "Nicecream banane-kiwi", emoji: "🍦", kcal: 150, p: 4, desc: "Inspirée de Recettes de Julie. Glace minute sans sucre ajouté. Une dose de protéine la transforme en dessert protéiné.", ingredients: ["2 bananes congelées en rondelles", "1 kiwi", "option : 1/2 dose de Vegan Protein", "un filet de lait d'amande"], steps: ["Mixe bananes congelées + kiwi (+ protéine si tu veux).", "Ajoute un peu de lait d'amande pour la texture.", "Sers aussitôt."] },
  { id: "idea-concoyaourt", cat: "snack", quick: true, name: "Salade concombre au yaourt soja", emoji: "🥒", kcal: 120, p: 8, desc: "Inspirée de Recettes de Julie (yaourt soja à la place du grec). Fraîche et protéinée pour quasi rien.", ingredients: ["1 concombre", "150 g de yaourt soja nature", "ail, menthe, citron", "sel, poivre"], steps: ["Coupe le concombre.", "Mélange yaourt soja + ail + menthe + citron.", "Assaisonne et sers bien frais."] },
  { id: "idea-epeautre", cat: "dej", name: "Salade de petit épeautre", emoji: "🌾", kcal: 450, p: 16, desc: "Inspirée de Recettes de Julie. Grains + légumes + fromage ou tofu.", ingredients: ["70 g de petit épeautre (cru) cuit", "tomates cerises, concombre, poivron", "feta ou tofu fumé en dés", "herbes, citron, filet d'huile d'olive"], steps: ["Cuis le petit épeautre.", "Mélange avec les légumes et le fromage/tofu.", "Assaisonne citron + herbes."] },
  { id: "idea-crepescitron", cat: "pdj", name: "Crêpes citron & graines de pavot", emoji: "🍋", kcal: 300, p: 10, desc: "Inspirée de Recettes de Julie. Au lait d'amande.", ingredients: ["80 g de farine", "250 ml de lait d'amande", "1 œuf", "zeste de citron + graines de pavot"], steps: ["Mélange farine, lait d'amande, œuf, citron, pavot.", "Cuis les crêpes à la poêle.", "Garnis léger : fruits ou filet de sirop."] },
  { id: "idea-pastapestoskyr", cat: "dej", name: "Pâtes pesto au skyr, asperges & brocolis", emoji: "🍝", kcal: 480, p: 22, desc: "Inspirée de Recettes de Julie. Le crémeux du pesto sans crème, grâce au skyr soja. Healthy et protéiné.", ingredients: ["80 g de pâtes (crues) cuites", "asperges + brocolis sautés", "2 c. à soupe de pesto", "150 g de skyr/yaourt soja épais", "citron"], steps: ["Cuis les pâtes, saute asperges et brocolis.", "Hors du feu, mélange pesto + skyr soja.", "Lie le tout, citron et poivre."] },
  { id: "idea-oeufscocotte", cat: "dej", name: "Œufs cocotte aux asperges", emoji: "🍳", kcal: 280, p: 16, desc: "Inspirée de Recettes de Julie. Au four, protéiné et rapide.", ingredients: ["2 œufs", "asperges vertes", "un peu de fromage", "sel, poivre"], steps: ["Dispose asperges + fromage dans un ramequin.", "Casse les œufs dessus.", "Cuis 12-15 min au four à 180°C."] },
  { id: "idea-orzopc", cat: "dej", name: "Orzo pesto, asperges & pois chiches", emoji: "🍲", kcal: 470, p: 18, desc: "Inspirée de Recettes de Julie. Prêt en 15 min.", ingredients: ["80 g d'orzo (cru) cuit", "100 g de pois chiches", "asperges vertes", "2 c. à soupe de pesto"], steps: ["Cuis l'orzo.", "Saute asperges + pois chiches.", "Mélange avec le pesto."] },
  { id: "idea-curryasperges", cat: "diner", name: "Curry d'asperges vertes & riz", emoji: "🍛", kcal: 430, p: 10, desc: "Inspirée de Recettes de Julie. Vegan, doux au lait de coco. Ajoute du tofu pour les protéines.", ingredients: ["asperges vertes", "150 ml de lait de coco allégé", "pâte de curry", "60 g de riz (cru) cuit", "option : tofu"], steps: ["Fais revenir la pâte de curry.", "Ajoute asperges + coco, mijote 10 min.", "Sers sur le riz."] },
  { id: "idea-quinoafraise", cat: "dej", name: "Salade quinoa, fraises & balsamique", emoji: "🍓", kcal: 400, p: 12, desc: "Inspirée de Recettes de Julie. Sucrée-salée, vegan.", ingredients: ["80 g de quinoa (cru) cuit", "fraises", "roquette", "réduction de balsamique", "graines"], steps: ["Cuis le quinoa, laisse refroidir.", "Mélange avec fraises et roquette.", "Arrose de balsamique, parsème de graines."] },
  { id: "idea-coleslaw", cat: "snack", quick: true, name: "Coleslaw au skyr", emoji: "🥗", kcal: 150, p: 8, desc: "Inspirée de Recettes de Julie. Sauce skyr soja au lieu de mayo : léger et protéiné.", ingredients: ["chou + carotte râpés", "150 g de skyr/yaourt soja", "moutarde, citron, sel", "ciboulette"], steps: ["Râpe chou et carotte.", "Mélange skyr soja + moutarde + citron.", "Lie et laisse reposer 10 min."] },
  { id: "idea-jusvert", cat: "snack", quick: true, name: "Jus vert concombre-kiwi-gingembre", emoji: "🥬", kcal: 90, p: 2, desc: "Inspirée de Recettes de Julie. Rafraîchissant et peu calorique — mais c'est un jus : peu de fibres, zéro protéine. Un plaisir hydratant, pas un repas.", ingredients: ["1 concombre", "1 kiwi", "un morceau de gingembre", "citron"], steps: ["Passe le tout à l'extracteur (ou mixe puis filtre).", "Sers bien frais."] },
];

export {
  MEALS, SLOTS, TAGS, store, THEMES, SLOT_THEMES, C, SLOT_UI, applyTheme, STORE_KEY, LEGACY_KEY, ISO, TODAY, parseISO, addDays, fmtShort, fmtFull, r0, EMPTY_DAY, toList, normPicks, normDay, normDays, dayTotals, hasData, picksKey, clampQty, fmtQty, EXTRA_PRESETS, KCAL_FLOOR, weekStats, weekCoach, weightTrendOver, DEFAULT_COMBOS, COMBOS_SEED_VERSION, SHAKE_BASES, SHAKE_LIQUIDS, MEAL_IDEAS,
};
