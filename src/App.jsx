import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Coffee, Salad, UtensilsCrossed, Apple, Plus, X, Shuffle, RotateCcw,
  Settings2, Check, Search, Flame, Beef, Clock, Snowflake, Package,
  EggOff, Soup, Sparkles, ChevronRight, Trash2, Dumbbell, Cookie, Calculator, Pencil,
  ChevronLeft, CalendarDays, TrendingUp, Scale, CalendarCheck, Sun, Moon,
  BookOpen, ExternalLink, ScanLine, Beer, Wine, IceCream2, Layers, Copy, Dumbbell,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────
   PiocheRepas — planificateur de repas végétarien sans produits laitiers
   Objectif : perte de gras + reprise de la muscu. La protéine est la priorité.
   L'app adapte les créneaux restants au budget de la journée.
   ────────────────────────────────────────────────────────────────────────── */

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
  { id: "pw1", name: "Shake post-training Bulk + lait d'amande", slots: ["snack"], kcal: 250, p: 30, c: 22, f: 4, tags: ["rapide", "transportable", "sans-oeuf", "post-workout"], desc: "Bulk Vegan All-in-One (60 g) + lait d'amande. Créatine, BCAA, HMB inclus." },
  { id: "pw2", name: "Shake post-training Bulk + lait de soja", slots: ["snack"], kcal: 310, p: 37, c: 24, f: 6, tags: ["rapide", "transportable", "sans-oeuf", "post-workout"], desc: "Bulk Vegan All-in-One (60 g) + lait de soja (~250 ml). Le soja ajoute ~8 g de protéines." },
  { id: "vp1", name: "Shake protéine vegan Bulk + eau", slots: ["snack"], kcal: 115, p: 23, c: 2, f: 3, tags: ["rapide", "transportable", "sans-oeuf"], desc: "Vegan Protein Powder Bulk (30 g) à l'eau. Léger : ~115 kcal pour 23 g. Idéal perte de gras / jours de repos. Toutes saveurs ≈ mêmes macros." },
  { id: "vp2", name: "Shake protéine vegan Bulk + lait d'amande", slots: ["snack"], kcal: 150, p: 23, c: 4, f: 5, tags: ["rapide", "transportable", "sans-oeuf"], desc: "Vegan Protein Powder Bulk (30 g) + lait d'amande. Toutes saveurs ≈ mêmes macros." },
  { id: "lv1", name: "La Vie — Tofu teriyaki (½ boîte)", slots: ["dej", "diner", "snack"], kcal: 165, p: 14, c: 7, f: 8, tags: ["rapide", "sans-oeuf", "chaud"], desc: "Tofu fumé La Vie + sauce teriyaki. ~100 g tofu + sauce. Bonne base protéinée." },
  { id: "lv2", name: "La Vie — Jambon végétal (2 tranches)", slots: ["pdj", "dej", "snack"], kcal: 46, p: 8, c: 1, f: 1, tags: ["rapide", "froid", "transportable", "sans-oeuf"], desc: "Jambon végétal nature La Vie (pois + soja). À glisser dans un sandwich, un croque, une salade." },
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
  { id: "lv4", name: "La Vie — Jambon fumé (2 tranches)", slots: ["pdj", "dej", "snack"], kcal: 46, p: 8, c: 1, f: 1, tags: ["rapide", "froid", "transportable", "sans-oeuf"], desc: "Jambon végétal fumé (~40 g)." },
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
  return all.reduce((a, m) => ({ kcal: a.kcal + m.kcal, p: a.p + m.p }), { kcal: 0, p: 0 });
}
const hasData = (day) => day && dayTotals(day).kcal > 0;

export default function PiocheRepas() {
  const [settings, setSettings] = useState({ kcal: 1850, protein: 150 });
  const [days, setDays] = useState({});       // { iso: {picks, skipBreakfast} }
  const [weights, setWeights] = useState({});  // { iso: kg }
  const [templates, setTemplates] = useState([]); // [{id,name,picks,skipBreakfast}]
  const [activeDate, setActiveDate] = useState(TODAY);
  const [view, setView] = useState("jour");    // jour | journal | progres
  const [picker, setPicker] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    (async () => {
      const d = await store.get(STORE_KEY) || await store.get(LEGACY_KEY);
      if (d) {
        if (d.settings) setSettings(d.settings);
        if (d.days) setDays(normDays(d.days));
        if (d.weights) setWeights(d.weights);
        if (Array.isArray(d.templates)) setTemplates(d.templates.map((t) => ({ ...t, picks: normPicks(t.picks), skipBreakfast: !!t.skipBreakfast, training: !!t.training })));
        if (d.theme) { applyTheme(d.theme); setTheme(d.theme); }
      }
      setHydrated(true);
    })();
  }, []);
  useEffect(() => { if (hydrated) store.set(STORE_KEY, { settings, days, weights, theme, templates }); }, [settings, days, weights, theme, templates, hydrated]);

  const switchTheme = (t) => { applyTheme(t); setTheme(t); };

  useEffect(() => {
    try {
      if (document.getElementById("pioche-fonts")) return;
      const l = document.createElement("link");
      l.id = "pioche-fonts"; l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap";
      document.head.appendChild(l);
    } catch (_) {}
  }, []);

  const day = days[activeDate] || EMPTY_DAY();
  const picks = day.picks;
  const skipBreakfast = day.skipBreakfast;
  const training = day.training;

  const setDay = useCallback((updater) => {
    setDays((prev) => {
      const cur = prev[activeDate] || EMPTY_DAY();
      const next = typeof updater === "function" ? updater(cur) : updater;
      return { ...prev, [activeDate]: next };
    });
  }, [activeDate]);

  const totals = useMemo(() => dayTotals(day), [day]);
  const remKcal = settings.kcal - totals.kcal;
  const remP = settings.protein - totals.p;

  const emptyPlanned = useMemo(() => {
    const list = [];
    if (!skipBreakfast && picks.pdj.length === 0) list.push("pdj");
    if (picks.dej.length === 0) list.push("dej");
    if (picks.diner.length === 0) list.push("diner");
    if (picks.snacks.length === 0) list.push("snack");
    return list;
  }, [skipBreakfast, picks]);

  const slotTarget = useCallback((slotKey) => {
    const pool = emptyPlanned.reduce((s, k) => s + SLOTS[k].weight, 0) || SLOTS[slotKey].weight;
    const w = SLOTS[slotKey].weight / pool;
    return { kcal: Math.max(0, remKcal) * w, p: Math.max(0, remP) * w };
  }, [emptyPlanned, remKcal, remP]);

  const fitOf = useCallback((meal) => {
    const projected = totals.kcal + meal.kcal;
    if (projected <= settings.kcal * 1.04) return "ok";
    if (projected <= settings.kcal * 1.14) return "rich";
    return "over";
  }, [totals.kcal, settings.kcal]);

  const rankFor = useCallback((slotKey, list) => {
    const t = slotTarget(slotKey);
    const score = (m) => -Math.abs(m.kcal - t.kcal) + m.p * 6;
    return [...list].sort((a, b) => score(b) - score(a));
  }, [slotTarget]);

  // mutateurs (sur le jour actif) — chaque créneau est une liste
  const CAP = { pdj: 8, dej: 8, diner: 8, snack: 4 };
  const choose = (meal) => {
    if (!picker) return;
    const slot = picker.slot;
    setDay((d) => {
      const arr = [...(d.picks[slot] || [])];
      if (picker.index != null) arr[picker.index] = meal; else arr.push(meal);
      return { ...d, picks: { ...d.picks, [slot]: arr.slice(0, CAP[slot] || 8) } };
    });
    setPicker(null);
  };
  const clearSlot = (slot, index) => setDay((d) => ({ ...d, picks: { ...d.picks, [slot]: (d.picks[slot] || []).filter((_, i) => i !== index) } }));
  const addExtra = (extra) => setDay((d) => ({ ...d, picks: { ...d.picks, extras: [...(d.picks.extras || []), extra] } }));
  const removeExtra = (i) => setDay((d) => ({ ...d, picks: { ...d.picks, extras: (d.picks.extras || []).filter((_, idx) => idx !== i) } }));
  const toggleSkip = () => setDay((d) => ({ skipBreakfast: !d.skipBreakfast, picks: d.skipBreakfast ? d.picks : { ...d.picks, pdj: [] } }));
  const toggleTraining = () => setDay((d) => ({ ...d, training: !d.training }));
  const surprise = (slotKey) => {
    const pool = rankFor(slotKey, MEALS.filter((m) => m.slots.includes(slotKey)));
    const good = pool.filter((m) => fitOf(m) === "ok");
    const from = (good.length ? good : pool).slice(0, 6);
    const pick = from[Math.floor(Math.random() * from.length)];
    if (!pick) return;
    setDay((d) => ({ ...d, picks: { ...d.picks, [slotKey]: [...(d.picks[slotKey] || []), pick].slice(0, CAP[slotKey] || 8) } }));
  };
  const resetDay = () => setDay((d) => ({ ...EMPTY_DAY() }));

  const clone = (x) => JSON.parse(JSON.stringify(x));
  const copyPrevDay = () => {
    const prev = days[addDays(activeDate, -1)];
    if (prev) setDay(() => clone(prev));
  };
  const saveTemplate = (name) => {
    const cur = days[activeDate] || EMPTY_DAY();
    setTemplates((t) => [...t, { id: `tpl-${Date.now()}`, name: name.trim() || "Modèle", picks: clone(cur.picks), skipBreakfast: !!cur.skipBreakfast, training: !!cur.training }]);
  };
  const loadTemplate = (id) => {
    const t = templates.find((x) => x.id === id);
    if (t) setDay(() => ({ picks: clone(t.picks), skipBreakfast: !!t.skipBreakfast, training: !!t.training }));
  };
  const deleteTemplate = (id) => setTemplates((t) => t.filter((x) => x.id !== id));
  const setWeight = (iso, kg) => setWeights((w) => {
    const n = { ...w };
    if (kg == null || isNaN(kg)) delete n[iso]; else n[iso] = kg;
    return n;
  });

  const goToDay = (iso) => { setActiveDate(iso); setView("jour"); };

  const importData = (obj) => {
    if (obj.settings && typeof obj.settings === "object") setSettings(obj.settings);
    if (obj.days && typeof obj.days === "object") setDays((prev) => ({ ...prev, ...normDays(obj.days) }));
    if (obj.weights && typeof obj.weights === "object") setWeights((prev) => ({ ...prev, ...obj.weights }));
  };

  return (
    <div className="min-h-screen w-full" style={{ color: C.ink, fontFamily: "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif", backgroundColor: C.bg, backgroundImage: C.bgImage, backgroundAttachment: "fixed" }}>
      <div className="mx-auto w-full max-w-md px-4 pb-24 pt-6">
        {/* Marque */}
        <header className="mb-5 flex items-center justify-between">
          <span className="text-lg font-extrabold tracking-tight" style={{ fontFamily: "'Space Grotesk', ui-sans-serif, system-ui" }}>Croque<span style={{ color: C.green }}>·</span>Macro</span>
          <button onClick={() => setShowSettings(true)} className="flex h-10 w-10 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }}>
            <Settings2 size={18} />
          </button>
        </header>

        {view === "jour" && (
          <DayScreen
            activeDate={activeDate} setActiveDate={setActiveDate}
            settings={settings} totals={totals} remKcal={remKcal} remP={remP}
            picks={picks} skipBreakfast={skipBreakfast} slotTarget={slotTarget}
            training={training} onToggleTraining={toggleTraining}
            weight={weights[activeDate]} onWeight={(kg) => setWeight(activeDate, kg)}
            onPick={(slot, index) => setPicker({ slot, index })}
            onSurprise={surprise} onClear={clearSlot} onSkip={toggleSkip}
            onAddExtra={addExtra} onRemoveExtra={removeExtra} onReset={resetDay}
            templates={templates} hasPrevDay={!!days[addDays(activeDate, -1)]}
            onCopyPrev={copyPrevDay} onSaveTemplate={saveTemplate} onLoadTemplate={loadTemplate} onDeleteTemplate={deleteTemplate}
          />
        )}
        {view === "journal" && (
          <JournalScreen days={days} weights={weights} settings={settings} onOpen={goToDay} activeDate={activeDate} />
        )}
        {view === "progres" && (
          <ProgressScreen days={days} weights={weights} settings={settings} />
        )}
        {view === "guide" && (
          <GuideScreen onAddExtra={addExtra} dateLabel={fmtFull(activeDate)} />
        )}
      </div>

      {/* Navigation */}
      <TabBar view={view} setView={setView} />

      {picker && (
        <Deck slotKey={picker.slot} rankFor={rankFor} fitOf={fitOf} slotTarget={slotTarget(picker.slot)} onChoose={choose} onClose={() => setPicker(null)} />
      )}
      {showSettings && (
        <SettingsSheet settings={settings} setSettings={setSettings} theme={theme} onTheme={switchTheme} allData={{ settings, days, weights, theme }} onImport={importData} onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}

// ── Navigation par onglets ──────────────────────────────────────────────────
function TabBar({ view, setView }) {
  const tabs = [
    { k: "jour", l: "Jour", icon: Sun },
    { k: "journal", l: "Journal", icon: CalendarDays },
    { k: "progres", l: "Progrès", icon: TrendingUp },
    { k: "guide", l: "Guide", icon: BookOpen },
  ];
  return (
    <div className="fixed inset-x-0 bottom-0 z-20" style={{ backgroundColor: C.nav, backdropFilter: "blur(12px)", borderTop: `1px solid ${C.line}` }}>
      <div className="mx-auto flex max-w-md">
        {tabs.map((t) => {
          const Icon = t.icon, active = view === t.k;
          return (
            <button key={t.k} onClick={() => setView(t.k)} className="flex flex-1 flex-col items-center gap-0.5 py-2.5 active:scale-95" style={{ color: active ? C.ink : C.muted }}>
              <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
              <span className="text-xs font-semibold" style={{ opacity: active ? 1 : 0.8 }}>{t.l}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  ÉCRAN JOUR
// ════════════════════════════════════════════════════════════════════════════
function DayScreen({ activeDate, setActiveDate, settings, totals, remKcal, remP, picks, skipBreakfast, slotTarget, training, onToggleTraining, weight, onWeight, onPick, onSurprise, onClear, onSkip, onAddExtra, onRemoveExtra, onReset, templates, hasPrevDay, onCopyPrev, onSaveTemplate, onLoadTemplate, onDeleteTemplate }) {
  const [showTpl, setShowTpl] = useState(false);
  const over = remKcal < 0;
  const isToday = activeDate === TODAY;
  const ribbon = [
    ...picks.pdj.map((m) => ({ ...m, color: SLOT_UI.pdj.color })),
    ...picks.dej.map((m) => ({ ...m, color: SLOT_UI.dej.color })),
    ...picks.diner.map((m) => ({ ...m, color: SLOT_UI.diner.color })),
    ...picks.snacks.map((s) => s && { ...s, color: SLOT_UI.snack.color }),
    ...(picks.extras || []).map((e) => ({ ...e, color: C.extra })),
  ].filter(Boolean);

  return (
    <>
      {/* Sélecteur de date */}
      <div className="mb-4 flex items-center justify-between rounded-2xl px-2 py-2" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
        <button onClick={() => setActiveDate(addDays(activeDate, -1))} className="flex h-9 w-9 items-center justify-center rounded-xl active:scale-90" style={{ color: C.sub }}><ChevronLeft size={20} /></button>
        <div className="flex items-center gap-2 text-center">
          <span className="text-sm font-bold capitalize" style={{ color: C.ink }}>{fmtFull(activeDate)}</span>
          {!isToday && <button onClick={() => setActiveDate(TODAY)} className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: `${C.green}1a`, color: C.green }}>Aujourd'hui</button>}
        </div>
        <button onClick={() => !isToday && setActiveDate(addDays(activeDate, 1))} disabled={isToday} className="flex h-9 w-9 items-center justify-center rounded-xl active:scale-90" style={{ color: isToday ? C.line : C.sub }}><ChevronRight size={20} /></button>
      </div>

      {/* Marqueur jour d'entraînement */}
      <button onClick={onToggleTraining} className="mb-4 flex w-full items-center gap-2.5 rounded-2xl px-4 py-2.5 active:scale-95" style={training ? { backgroundColor: `${C.weight}1f`, border: `1px solid ${C.weight}55` } : { backgroundColor: C.card, border: `1px solid ${C.line}` }}>
        <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: training ? C.weight : C.paper, color: training ? "#fff" : C.muted }}><Dumbbell size={15} /></span>
        <span className="flex-1 text-left text-sm font-semibold" style={{ color: training ? C.ink : C.sub }}>Jour d'entraînement</span>
        <span className="text-xs font-semibold" style={{ color: training ? C.weight : C.muted }}>{training ? "Activé" : "Off"}</span>
      </button>

      {/* Jauge du jour — cadran */}
      <section className="mb-4 rounded-3xl p-5" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", boxShadow: `0 20px 50px -28px ${C.shadow}` }}>
        <Arc consumed={totals.kcal} target={settings.kcal}>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: C.muted }}>{over ? "Dépassé de" : "Restant"}</p>
          <p className="leading-none" style={{ fontFamily: "'Space Grotesk', system-ui", fontVariantNumeric: "tabular-nums" }}>
            <span className="text-5xl font-bold" style={{ color: over ? C.over : C.ink }}>{r0(Math.abs(remKcal))}</span>
          </p>
          <p className="mt-1 text-xs" style={{ color: C.sub }}>kcal · {r0(totals.kcal)} / {settings.kcal} pris</p>
        </Arc>

        <div className="mt-1">
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest" style={{ color: C.protein }}><Beef size={13} /> Protéines</span>
            <span className="text-sm font-semibold" style={{ fontVariantNumeric: "tabular-nums", color: C.ink }}>{r0(totals.p)}<span style={{ color: C.muted }}> / {settings.protein} g</span></span>
          </div>
          <Gauge value={totals.p} target={settings.protein} color={C.protein} />
          <p className="mt-1 text-xs" style={{ color: C.muted }}>{remP > 0 ? `Encore ${r0(remP)} g à viser` : "Objectif protéines atteint."}{training && remP > 0 ? " · jour d'entraînement : priorité aux protéines." : ""}</p>
        </div>

        <div className="mt-4">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest" style={{ color: C.muted }}>L'assiette</p>
          <PlateBar segments={ribbon} total={settings.kcal} />
        </div>
      </section>

      {/* Poids du jour */}
      <WeightCard date={activeDate} weight={weight} onWeight={onWeight} />

      {/* Timeline */}
      <div className="rounded-3xl" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, overflow: "hidden" }}>
        <div className="flex items-center justify-between px-5 pb-1 pt-4">
          <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: C.sub }}>Les repas</h2>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowTpl(true)} className="flex items-center gap-1 text-xs font-semibold active:scale-95" style={{ color: C.sub }}><Layers size={13} /> Modèles</button>
            {ribbon.length > 0 && <button onClick={onReset} className="text-xs font-semibold active:scale-95" style={{ color: C.muted }}>Vider</button>}
          </div>
        </div>
        <DayRow slotKey="pdj" meals={picks.pdj} skipped={skipBreakfast} target={slotTarget("pdj")} onAdd={() => onPick("pdj")} onReplace={(i) => onPick("pdj", i)} onSurprise={() => onSurprise("pdj")} onClear={(i) => onClear("pdj", i)} onSkip={onSkip} />
        <Divider />
        <DayRow slotKey="dej" meals={picks.dej} target={slotTarget("dej")} onAdd={() => onPick("dej")} onReplace={(i) => onPick("dej", i)} onSurprise={() => onSurprise("dej")} onClear={(i) => onClear("dej", i)} />
        <Divider />
        <DayRow slotKey="diner" meals={picks.diner} target={slotTarget("diner")} onAdd={() => onPick("diner")} onReplace={(i) => onPick("diner", i)} onSurprise={() => onSurprise("diner")} onClear={(i) => onClear("diner", i)} />
        <Divider />
        <ChipSection color={SLOT_UI.snack.color} time="En-cas" title="Snacks" icon={Apple} items={picks.snacks} canAdd={picks.snacks.length < 4} onAdd={() => onPick("snack")} onRemove={(i) => onClear("snack", i)} empty="Un en-cas protéiné si un repas est juste." />
        <Divider />
        <ExtrasSection extras={picks.extras || []} onAdd={onAddExtra} onRemove={onRemoveExtra} />
      </div>

      <p className="mt-6 px-2 text-center text-xs" style={{ color: C.muted }}>Valeurs estimées par portion. Un déficit léger et tenable bat un régime agressif.</p>

      {showTpl && (
        <TemplatesSheet
          templates={templates} hasContent={ribbon.length > 0} hasPrevDay={hasPrevDay}
          onCopyPrev={() => { onCopyPrev(); setShowTpl(false); }}
          onSave={(name) => onSaveTemplate(name)}
          onLoad={(id) => { onLoadTemplate(id); setShowTpl(false); }}
          onDelete={onDeleteTemplate}
          onClose={() => setShowTpl(false)}
        />
      )}
    </>
  );
}

function TemplatesSheet({ templates, hasContent, hasPrevDay, onCopyPrev, onSave, onLoad, onDelete, onClose }) {
  const [name, setName] = useState("");
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center" style={{ backgroundColor: C.overlay, backdropFilter: "blur(3px)" }} onClick={onClose}>
      <div className="w-full max-w-md overflow-y-auto rounded-t-3xl p-5" style={{ maxHeight: "92vh", backgroundColor: C.sheet }} onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ backgroundColor: C.line }} />
        <h2 className="mb-1 text-lg font-bold" style={{ color: C.ink }}>Modèles & copie</h2>
        <p className="mb-4 text-sm" style={{ color: C.sub }}>Réutilise une journée déjà construite au lieu de tout repiocher.</p>

        <button onClick={onCopyPrev} disabled={!hasPrevDay} className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold active:scale-95" style={{ backgroundColor: hasPrevDay ? C.card : "transparent", border: `1px solid ${C.line}`, color: hasPrevDay ? C.ink : C.muted }}>
          <Copy size={15} /> Copier la journée de la veille
        </button>

        <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: C.muted }}>Mes modèles</p>
        {templates.length === 0 ? (
          <p className="mb-4 text-sm" style={{ color: C.muted }}>Aucun modèle. Enregistre une journée type (ex. « jour de repos », « jour d'entraînement ») pour la recharger en un geste.</p>
        ) : (
          <div className="mb-4 space-y-2">
            {templates.map((t) => {
              const tot = dayTotals(t);
              return (
                <div key={t.id} className="flex items-center gap-2 rounded-2xl p-3" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
                  <button onClick={() => onLoad(t.id)} className="min-w-0 flex-1 text-left active:scale-95">
                    <p className="truncate text-sm font-semibold" style={{ color: C.ink }}>{t.name}</p>
                    <p className="text-xs" style={{ color: C.sub, fontVariantNumeric: "tabular-nums" }}>{tot.kcal} kcal · {tot.p} g prot.</p>
                  </button>
                  <button onClick={() => onLoad(t.id)} className="rounded-lg px-3 py-1.5 text-xs font-semibold active:scale-95" style={{ backgroundColor: C.green, color: "#fff" }}>Charger</button>
                  <button onClick={() => onDelete(t.id)} className="rounded-lg p-1.5 active:scale-90" style={{ color: C.muted }}><Trash2 size={15} /></button>
                </div>
              );
            })}
          </div>
        )}

        <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: C.muted }}>Enregistrer la journée actuelle</p>
        {hasContent ? (
          <div className="flex gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom (ex. Jour d'entraînement)" className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink }} />
            <button onClick={() => { if (name.trim()) { onSave(name); setName(""); } }} className="shrink-0 rounded-xl px-4 py-2 text-sm font-semibold active:scale-95" style={{ backgroundColor: C.ink, color: C.paper }}>Enregistrer</button>
          </div>
        ) : (
          <p className="text-sm" style={{ color: C.muted }}>Pioche d'abord quelques repas, puis reviens ici pour les enregistrer comme modèle.</p>
        )}
      </div>
    </div>
  );
}

function WeightCard({ date, weight, onWeight }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(weight != null ? String(weight) : "");
  useEffect(() => { setVal(weight != null ? String(weight) : ""); }, [weight, date]);
  const save = () => { const kg = parseFloat(val.replace(",", ".")); onWeight(isNaN(kg) ? null : kg); setEditing(false); };
  return (
    <div className="mb-4 flex items-center justify-between rounded-2xl px-4 py-3" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: `${C.weight}1a`, color: C.weight }}><Scale size={16} /></span>
        <div className="leading-tight">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.weight }}>Poids</p>
          <p className="text-sm font-semibold" style={{ color: weight != null ? C.ink : C.muted }}>{weight != null ? `${weight} kg` : "Non noté"}</p>
        </div>
      </div>
      {editing ? (
        <div className="flex items-center gap-2">
          <input autoFocus value={val} onChange={(e) => setVal(e.target.value)} inputMode="decimal" placeholder="kg" className="w-20 rounded-xl px-3 py-1.5 text-sm font-semibold outline-none" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink }} />
          <button onClick={save} className="rounded-xl px-3 py-1.5 text-sm font-semibold text-white active:scale-95" style={{ backgroundColor: C.weight }}><Check size={16} /></button>
        </div>
      ) : (
        <button onClick={() => setEditing(true)} className="rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95" style={{ backgroundColor: weight != null ? C.paper : C.ink, color: weight != null ? C.sub : C.paper, border: weight != null ? `1px solid ${C.line}` : "none" }}>
          {weight != null ? "Modifier" : "Noter"}
        </button>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  ÉCRAN JOURNAL
// ════════════════════════════════════════════════════════════════════════════
function JournalScreen({ days, weights, settings, onOpen, activeDate }) {
  const isoList = useMemo(() => {
    const set = new Set([...Object.keys(days), ...Object.keys(weights), TODAY]);
    return [...set].filter((iso) => hasData(days[iso]) || weights[iso] != null || iso === TODAY).sort().reverse();
  }, [days, weights]);

  return (
    <div>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: C.ink, fontFamily: "'Space Grotesk', system-ui", }}>Journal</h1>
          <p className="text-sm" style={{ color: C.sub }}>Touche un jour pour le revoir ou l'éditer.</p>
        </div>
      </div>
      <div className="space-y-2.5">
        {isoList.map((iso) => {
          const t = dayTotals(days[iso]);
          const w = weights[iso];
          const pct = Math.min(100, (t.kcal / settings.kcal) * 100);
          const under = t.kcal > 0 && t.kcal <= settings.kcal;
          return (
            <button key={iso} onClick={() => onOpen(iso)} className="flex w-full items-center gap-3 rounded-2xl p-4 text-left active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${iso === activeDate ? C.green : C.line}` }}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold capitalize" style={{ color: C.ink }}>{iso === TODAY ? "Aujourd'hui" : fmtShort(iso)}</p>
                  {days[iso]?.training && <span className="flex h-5 w-5 items-center justify-center rounded-md" style={{ backgroundColor: `${C.weight}22`, color: C.weight }}><Dumbbell size={11} /></span>}
                  {w != null && <span className="flex items-center gap-0.5 text-xs font-semibold" style={{ color: C.weight }}><Scale size={11} />{w} kg</span>}
                </div>
                {t.kcal > 0 ? (
                  <>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: C.track }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: under ? C.green : C.over }} />
                    </div>
                    <p className="mt-1.5 text-xs font-medium" style={{ color: C.sub, fontVariantNumeric: "tabular-nums" }}>{t.kcal} / {settings.kcal} kcal · <span style={{ color: C.protein }}>{t.p} g prot.</span></p>
                  </>
                ) : (
                  <p className="mt-1 text-xs" style={{ color: C.muted }}>Aucun repas noté</p>
                )}
              </div>
              <ChevronRight size={18} style={{ color: C.line }} />
            </button>
          );
        })}
        {isoList.length <= 1 && <p className="py-8 text-center text-sm" style={{ color: C.muted }}>L'historique se remplira au fil des jours.</p>}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  ÉCRAN PROGRÈS
// ════════════════════════════════════════════════════════════════════════════
function ProgressScreen({ days, weights, settings }) {
  const [period, setPeriod] = useState(30);
  const PERIODS = [{ v: 7, l: "7 j" }, { v: 30, l: "30 j" }, { v: 90, l: "90 j" }];

  const kcalSeries = useMemo(() => buildKcalSeries(days, period), [days, period]);
  const weightSeries = useMemo(() => buildWeightSeries(weights, period), [weights, period]);

  const logged = kcalSeries.filter((d) => d.logged);
  const avgKcal = logged.length ? r0(logged.reduce((a, d) => a + d.value, 0) / logged.length) : 0;
  const avgP = (() => {
    const ld = Object.keys(days).filter((iso) => withinPeriod(iso, period) && hasData(days[iso]));
    if (!ld.length) return 0;
    return r0(ld.reduce((a, iso) => a + dayTotals(days[iso]).p, 0) / ld.length);
  })();
  const onTarget = logged.filter((d) => d.value <= settings.kcal).length;
  const wDelta = weightSeries.length >= 2 ? +(weightSeries[weightSeries.length - 1].value - weightSeries[0].value).toFixed(1) : null;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold" style={{ color: C.ink, fontFamily: "'Space Grotesk', system-ui", }}>Progrès</h1>
        <SegToggle options={PERIODS} value={period} onChange={setPeriod} />
      </div>

      {/* Stats clés */}
      <div className="mb-4 grid grid-cols-3 gap-2.5">
        <KPI label="Moy. kcal" value={avgKcal || "—"} tint={C.ink} />
        <KPI label="Sous l'objectif" value={logged.length ? `${onTarget}/${logged.length}` : "—"} tint={C.green} />
        <KPI label="Moy. prot." value={avgP ? `${avgP} g` : "—"} tint={C.protein} />
      </div>

      {/* Calories */}
      <ChartCard title="Calories" subtitle={period > 30 ? "moyenne par semaine" : "par jour"} accent={C.green}>
        {logged.length === 0
          ? <Empty text="Pas encore de jours suivis sur cette période." />
          : <BarsChart data={kcalSeries} target={settings.kcal} />}
      </ChartCard>

      {/* Poids */}
      <ChartCard
        title="Poids"
        subtitle={wDelta != null ? `${wDelta > 0 ? "+" : ""}${wDelta} kg sur la période` : "note ton poids pour suivre la courbe"}
        accent={C.weight}
        deltaColor={wDelta != null ? (wDelta <= 0 ? C.green : C.over) : C.muted}
      >
        {weightSeries.length < 2
          ? <Empty text="Note ton poids sur au moins 2 jours pour voir la courbe." />
          : <WeightChart points={weightSeries} />}
      </ChartCard>

      <TrendCard days={days} weights={weights} period={period} />

      <p className="mt-2 px-2 text-center text-xs" style={{ color: C.muted }}>Le poids fluctue au jour le jour (eau, sel). Regarde la tendance sur 2-3 semaines, pas la valeur isolée.</p>
    </div>
  );
}

function TrendCard({ days, weights, period }) {
  const t = useMemo(() => {
    const wIso = Object.keys(weights).filter((iso) => withinPeriod(iso, period)).sort();
    if (wIso.length < 2) return null;
    const firstIso = wIso[0], lastIso = wIso[wIso.length - 1];
    const spanDays = Math.round((parseISO(lastIso) - parseISO(firstIso)) / 86400000);
    if (spanDays < 7) return null;
    const loggedKcal = Object.keys(days).filter((iso) => withinPeriod(iso, period) && dayTotals(days[iso]).kcal > 0).map((iso) => dayTotals(days[iso]).kcal);
    if (loggedKcal.length < 4) return null;
    const avg = Math.round(loggedKcal.reduce((a, b) => a + b, 0) / loggedKcal.length);
    const wDelta = +(weights[lastIso] - weights[firstIso]).toFixed(1);
    const ratePerWeek = +(wDelta / spanDays * 7).toFixed(2);
    // maintenance empirique : intake - (variation poids en kcal) / jours
    const maint = Math.round(avg - (wDelta * 7700) / spanDays);
    return { avg, wDelta, ratePerWeek, maint, spanDays, nKcal: loggedKcal.length, nW: wIso.length };
  }, [days, weights, period]);

  return (
    <div className="mb-3 rounded-3xl p-4" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
      <div className="mb-3 flex items-center gap-2">
        <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: C.protein }} />
        <h3 className="text-sm font-bold" style={{ color: C.ink }}>Tendance déficit</h3>
        <span className="ml-auto text-xs font-medium" style={{ color: C.muted }}>croisé poids × calories</span>
      </div>
      {!t ? (
        <p className="text-sm" style={{ color: C.muted }}>Note ton poids et tes repas régulièrement (≈ 2 semaines) pour estimer si ton déficit est sur la bonne pente.</p>
      ) : (() => {
        const losing = t.ratePerWeek < 0;
        const rateAbs = Math.abs(t.ratePerWeek);
        let verdict, vColor;
        if (!losing && t.ratePerWeek > 0.1) { verdict = "Tu es au-dessus de ta maintenance : pas de déficit sur la période."; vColor = C.over; }
        else if (rateAbs < 0.2) { verdict = "Poids quasi stable : tu es proche de ta maintenance."; vColor = C.sub; }
        else if (rateAbs <= 0.9) { verdict = "Bon rythme de perte, tenable sur la durée."; vColor = C.green; }
        else { verdict = "Perte rapide : surveille l'énergie et le muscle, ce rythme est dur à tenir."; vColor = C.protein; }
        return (
          <>
            <div className="mb-3 grid grid-cols-3 gap-2.5">
              <KPI label="Moy. kcal/j" value={t.avg} tint={C.ink} />
              <KPI label="Poids" value={`${t.wDelta > 0 ? "+" : ""}${t.wDelta} kg`} tint={t.wDelta <= 0 ? C.green : C.over} />
              <KPI label="Par semaine" value={`${t.ratePerWeek > 0 ? "+" : ""}${t.ratePerWeek}`} tint={t.ratePerWeek <= 0 ? C.green : C.over} />
            </div>
            <p className="mb-2 text-sm font-semibold" style={{ color: vColor }}>{verdict}</p>
            <p className="text-xs" style={{ color: C.sub }}>Ta maintenance estimée d'après <span style={{ fontWeight: 600, color: C.ink }}>tes</span> données est d'environ <span style={{ fontWeight: 700, color: C.ink, fontVariantNumeric: "tabular-nums" }}>{t.maint} kcal/j</span> (sur {t.spanDays} jours, {t.nKcal} jours de repas et {t.nW} pesées). C'est une estimation, pas une vérité — l'eau et le sel brouillent la lecture à court terme.</p>
          </>
        );
      })()}
    </div>
  );
}

function withinPeriod(iso, period) {
  const diff = (parseISO(TODAY) - parseISO(iso)) / 86400000;
  return diff >= 0 && diff < period;
}
function buildKcalSeries(days, period) {
  if (period <= 30) {
    const arr = [];
    for (let i = period - 1; i >= 0; i--) {
      const iso = addDays(TODAY, -i);
      const t = dayTotals(days[iso]);
      arr.push({ iso, label: parseISO(iso).getDate(), value: t.kcal, logged: t.kcal > 0 });
    }
    return arr;
  }
  const weeks = Math.ceil(period / 7), arr = [];
  for (let w = weeks - 1; w >= 0; w--) {
    let sum = 0, cnt = 0, lastIso = addDays(TODAY, -(w * 7));
    for (let k = 0; k < 7; k++) {
      const iso = addDays(TODAY, -(w * 7 + k));
      const t = dayTotals(days[iso]);
      if (t.kcal > 0) { sum += t.kcal; cnt++; }
    }
    arr.push({ iso: lastIso, label: `S${weeks - w}`, value: cnt ? Math.round(sum / cnt) : 0, logged: cnt > 0 });
  }
  return arr;
}
function buildWeightSeries(weights, period) {
  return Object.keys(weights)
    .filter((iso) => withinPeriod(iso, period))
    .sort()
    .map((iso) => ({ iso, label: parseISO(iso).getDate(), value: weights[iso] }));
}

// ════════════════════════════════════════════════════════════════════════════
//  ÉCRAN GUIDE — où trouver les calories
// ════════════════════════════════════════════════════════════════════════════
function GuideScreen({ onAddExtra, dateLabel }) {
  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-extrabold" style={{ color: C.ink, fontFamily: "'Space Grotesk', system-ui" }}>Guide</h1>
        <p className="text-sm" style={{ color: C.sub }}>Trouver les calories de ce que tu manges et bois, surtout en vacances.</p>
      </div>

      <DrinkCalc onAddExtra={onAddExtra} dateLabel={dateLabel} />

      {/* Scanner */}
      <GuideBlock icon={ScanLine} color={C.green} title="Scanner un produit emballé" desc="Pot de glace, bière en canette, barre… le code-barres donne les valeurs exactes.">
        <AppCard name="Open Food Facts" role="Gratuit, sans pub. Scanne et lit kcal + protéines." url="https://play.google.com/store/apps/details?id=org.openfoodfacts.scanner" tint={C.green} />
        <AppCard name="Yuka" role="Scanne aussi ; pratique mais orienté « score » plus que macros." url="https://play.google.com/store/apps/details?id=io.yuka.android" tint={C.protein} />
      </GuideBlock>

      {/* Rechercher */}
      <GuideBlock icon={Search} color={C.weight} title="Plats & boissons sans étiquette" desc="« Boule de glace vanille », « mojito », « galette complète »… cherche une entrée moyenne.">
        <AppCard name="MyFitnessPal" role="Énorme base de plats et boissons génériques." url="https://play.google.com/store/apps/details?id=com.myfitnesspal.android" tint={C.weight} />
        <AppCard name="FatSecret" role="Alternative gratuite, base bien fournie en français." url="https://play.google.com/store/apps/details?id=com.fatsecret.android" tint={C.extra} />
        <p className="px-1 pt-1 text-xs" style={{ color: C.muted }}>Astuce : si un lien n'ouvre rien, cherche simplement le nom dans le Play Store.</p>
      </GuideBlock>

      {/* Estimer */}
      <GuideBlock icon={Beer} color={C.protein} title="Estimer à la louche" desc="Aucune donnée sous la main ? Ces repères suffisent — et dans le doute, surestime un peu.">
        <RefRow icon={Beer} label="Bière" value="° × cl × 0,8" hint="demi 5° ≈ 100 · pinte ≈ 200 · IPA +15 %" />
        <RefRow icon={Wine} label="Cocktail" value="~90 kcal / dose" hint="+ le sucre : spritz ~150, mojito ~200, piña ~380" />
        <RefRow icon={IceCream2} label="Glace" value="boule ~130" hint="sorbet ~95 · cornet 2 boules ~320" />
        <RefRow icon={Wine} label="Vin" value="~125 kcal" hint="par verre de 15 cl" />
      </GuideBlock>

      <div className="rounded-2xl p-4" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
        <p className="text-sm font-semibold" style={{ color: C.ink }}>Le réflexe</p>
        <p className="mt-1 text-sm" style={{ color: C.sub }}>Quelle que soit la source, logge le résultat dans <span style={{ color: C.extra, fontWeight: 600 }}>Extras</span> (presets boissons inclus). L'alcool compte vraiment : 7 kcal/g et il met la combustion des graisses en pause le temps d'être éliminé.</p>
      </div>
    </div>
  );
}

function DrinkCalc({ onAddExtra, dateLabel }) {
  const [mode, setMode] = useState("biere");
  const [deg, setDeg] = useState(5);
  const [vol, setVol] = useState(33);
  const [ipa, setIpa] = useState(false);
  const [doses, setDoses] = useState(2);
  const [sweet, setSweet] = useState("moyen");
  const [added, setAdded] = useState(false);

  const SWEET = { sec: 0, moyen: 60, sucre: 140 };
  const kcal = mode === "biere"
    ? Math.round(deg * vol * 0.8 * (ipa ? 1.15 : 1))
    : Math.round(doses * 90 + SWEET[sweet]);
  const name = mode === "biere"
    ? `Bière ${deg}° · ${vol} cl${ipa ? " (IPA)" : ""}`
    : `Cocktail · ${doses} dose${doses > 1 ? "s" : ""}`;

  const add = () => { onAddExtra({ name, kcal, p: mode === "biere" ? Math.round(vol * 0.04) : 0 }); setAdded(true); setTimeout(() => setAdded(false), 2200); };

  const Stepper = ({ value, set, step, min, max, suffix }) => (
    <div className="flex items-center gap-2">
      <button onClick={() => set(Math.max(min, +(value - step).toFixed(1)))} className="flex h-8 w-8 items-center justify-center rounded-lg text-lg font-bold active:scale-90" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink }}>−</button>
      <span className="w-16 text-center text-sm font-bold" style={{ color: C.ink, fontVariantNumeric: "tabular-nums" }}>{value}{suffix}</span>
      <button onClick={() => set(Math.min(max, +(value + step).toFixed(1)))} className="flex h-8 w-8 items-center justify-center rounded-lg text-lg font-bold active:scale-90" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink }}>+</button>
    </div>
  );

  return (
    <div className="mb-4 rounded-3xl p-4" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${C.protein}22`, color: C.protein }}><Beer size={17} /></span>
        <h3 className="text-sm font-bold" style={{ color: C.ink }}>Calculateur boisson</h3>
        <div className="ml-auto flex gap-1 rounded-full p-1" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}` }}>
          {[{ v: "biere", l: "Bière" }, { v: "cocktail", l: "Cocktail" }].map((o) => (
            <button key={o.v} onClick={() => setMode(o.v)} className="rounded-full px-3 py-1 text-xs font-semibold active:scale-95" style={mode === o.v ? { backgroundColor: C.ink, color: C.paper } : { color: C.sub }}>{o.l}</button>
          ))}
        </div>
      </div>

      {mode === "biere" ? (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between"><span className="text-sm" style={{ color: C.sub }}>Degré</span><Stepper value={deg} set={setDeg} step={0.5} min={2} max={14} suffix="°" /></div>
          <div className="flex items-center justify-between"><span className="text-sm" style={{ color: C.sub }}>Volume</span><Stepper value={vol} set={setVol} step={1} min={10} max={100} suffix=" cl" /></div>
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: C.sub }}>Type IPA / maltée</span>
            <button onClick={() => setIpa((v) => !v)} className="rounded-full px-3 py-1 text-xs font-semibold active:scale-95" style={ipa ? { backgroundColor: C.protein, color: "#fff" } : { color: C.sub, border: `1px solid ${C.line}` }}>{ipa ? "Oui (+15 %)" : "Non"}</button>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between"><span className="text-sm" style={{ color: C.sub }}>Doses d'alcool (4 cl)</span><Stepper value={doses} set={setDoses} step={1} min={1} max={6} suffix="" /></div>
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: C.sub }}>Sucré</span>
            <div className="flex gap-1 rounded-full p-1" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}` }}>
              {[{ v: "sec", l: "Sec" }, { v: "moyen", l: "Moyen" }, { v: "sucre", l: "Sucré" }].map((o) => (
                <button key={o.v} onClick={() => setSweet(o.v)} className="rounded-full px-2.5 py-1 text-xs font-semibold active:scale-95" style={sweet === o.v ? { backgroundColor: C.ink, color: C.paper } : { color: C.sub }}>{o.l}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between rounded-2xl p-3" style={{ backgroundColor: C.paper }}>
        <div>
          <p className="text-xs uppercase tracking-wide" style={{ color: C.muted }}>Estimation</p>
          <p className="text-2xl font-extrabold leading-none" style={{ color: C.ink, fontFamily: "'Space Grotesk', system-ui", fontVariantNumeric: "tabular-nums" }}>{kcal} <span className="text-sm font-medium" style={{ color: C.sub }}>kcal</span></p>
        </div>
        <button onClick={add} className="flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-sm font-bold active:scale-95" style={{ backgroundColor: added ? C.green : C.protein, color: "#fff" }}>
          {added ? <><Check size={16} /> Ajouté</> : <><Plus size={16} /> En Extra</>}
        </button>
      </div>
      <p className="mt-2 text-xs" style={{ color: C.muted }}>{added ? `Ajouté à ${dateLabel.toLowerCase()}.` : "Ajoute l'estimation aux Extras du jour. Dans le doute, surestime un peu."}</p>
    </div>
  );
}

function GuideBlock({ icon: Icon, color, title, desc, children }) {
  return (
    <div className="mb-4 rounded-3xl p-4" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
      <div className="mb-3 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}22`, color }}><Icon size={17} /></span>
        <div>
          <h3 className="text-sm font-bold" style={{ color: C.ink }}>{title}</h3>
          <p className="mt-0.5 text-xs" style={{ color: C.sub }}>{desc}</p>
        </div>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function AppCard({ name, role, url, tint }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-2xl p-3 active:scale-95" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, textDecoration: "none" }}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold" style={{ backgroundColor: `${tint}26`, color: tint }}>{name[0]}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold" style={{ color: C.ink }}>{name}</p>
        <p className="text-xs" style={{ color: C.sub }}>{role}</p>
      </div>
      <span className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: `${tint}22`, color: tint }}>Play <ExternalLink size={12} /></span>
    </a>
  );
}

function RefRow({ icon: Icon, label, value, hint }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl p-3" style={{ backgroundColor: C.paper }}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: C.track, color: C.sub }}><Icon size={15} /></span>
      <div className="min-w-0 flex-1">
        <p className="text-sm" style={{ color: C.ink }}><span className="font-semibold">{label}</span> · <span style={{ color: C.protein, fontWeight: 600 }}>{value}</span></p>
        <p className="text-xs" style={{ color: C.muted }}>{hint}</p>
      </div>
    </div>
  );
}

// ── Graphiques (SVG maison) ─────────────────────────────────────────────────
function BarsChart({ data, target }) {
  const W = 320, H = 150, padT = 14, padB = 18, padX = 2;
  const max = Math.max(target * 1.12, ...data.map((d) => d.value), 1);
  const innerH = H - padT - padB, innerW = W - padX * 2;
  const bw = innerW / data.length;
  const y = (v) => padT + innerH * (1 - v / max);
  const ty = y(target);
  const step = data.length > 16 ? Math.ceil(data.length / 8) : (data.length > 8 ? 2 : 1);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
      <line x1={padX} y1={ty} x2={W - padX} y2={ty} stroke={C.ink} strokeWidth="1" strokeDasharray="3 3" opacity="0.45" />
      <text x={W - padX} y={ty - 4} textAnchor="end" fontSize="9" fill={C.sub}>objectif {target}</text>
      {data.map((d, i) => {
        const h = d.value > 0 ? Math.max(2, innerH * (d.value / max)) : 0;
        const x = padX + i * bw;
        const fill = d.value === 0 ? "rgba(255,255,255,0.14)" : (d.value <= target ? C.green : C.over);
        return (
          <g key={i}>
            <rect x={x + bw * 0.16} y={H - padB - h} width={bw * 0.68} height={h} rx="2" fill={fill} opacity={d.logged ? 1 : 0.5} />
            {i % step === 0 && <text x={x + bw / 2} y={H - 5} textAnchor="middle" fontSize="9" fill={C.muted}>{d.label}</text>}
          </g>
        );
      })}
    </svg>
  );
}

function WeightChart({ points }) {
  const W = 320, H = 150, padT = 14, padB = 18, padL = 26, padR = 8;
  const vals = points.map((p) => p.value);
  let min = Math.min(...vals), max = Math.max(...vals);
  if (max - min < 1) { min -= 0.6; max += 0.6; }
  const pad = (max - min) * 0.15; min -= pad; max += pad;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const x = (i) => padL + (points.length === 1 ? innerW / 2 : innerW * (i / (points.length - 1)));
  const y = (v) => padT + innerH * (1 - (v - min) / (max - min));
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const step = points.length > 10 ? Math.ceil(points.length / 6) : 1;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
      {[max, (max + min) / 2, min].map((v, i) => (
        <g key={i}>
          <line x1={padL} y1={y(v)} x2={W - padR} y2={y(v)} stroke={C.line} strokeWidth="1" />
          <text x={2} y={y(v) + 3} fontSize="9" fill={C.muted}>{v.toFixed(1)}</text>
        </g>
      ))}
      <path d={d} fill="none" stroke={C.weight} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.value)} r="3" fill={C.bg} stroke={C.weight} strokeWidth="2" />)}
      {points.map((p, i) => (i % step === 0 || i === points.length - 1) && <text key={`l${i}`} x={x(i)} y={H - 5} textAnchor="middle" fontSize="9" fill={C.muted}>{p.label}</text>)}
    </svg>
  );
}

function ChartCard({ title, subtitle, accent, deltaColor, children }) {
  return (
    <div className="mb-3 rounded-3xl p-4" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
      <div className="mb-3 flex items-center gap-2">
        <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: accent }} />
        <h3 className="text-sm font-bold" style={{ color: C.ink }}>{title}</h3>
        <span className="ml-auto text-xs font-medium" style={{ color: deltaColor || C.muted }}>{subtitle}</span>
      </div>
      {children}
    </div>
  );
}
function KPI({ label, value, tint }) {
  return (
    <div className="rounded-2xl p-3 text-center" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
      <p className="text-lg font-extrabold leading-tight" style={{ color: tint, fontVariantNumeric: "tabular-nums", fontFamily: "'Space Grotesk', system-ui" }}>{value}</p>
      <p className="mt-0.5 text-xs" style={{ color: C.muted }}>{label}</p>
    </div>
  );
}
function Empty({ text }) {
  return <div className="flex h-28 items-center justify-center px-4 text-center text-sm" style={{ color: C.muted }}>{text}</div>;
}
function SegToggle({ options, value, onChange }) {
  return (
    <div className="flex gap-1 rounded-full p-1" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
      {options.map((o) => (
        <button key={o.v} onClick={() => onChange(o.v)} className="rounded-full px-3 py-1 text-xs font-semibold active:scale-95" style={value === o.v ? { backgroundColor: C.ink, color: C.paper } : { color: C.sub }}>{o.l}</button>
      ))}
    </div>
  );
}

// ── Briques partagées ───────────────────────────────────────────────────────
function Divider() { return <div style={{ height: 1, backgroundColor: C.line }} />; }

function PlateBar({ segments, total }) {
  const sum = segments.reduce((a, s) => a + s.kcal, 0);
  return (
    <div className="relative h-3.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: C.track }}>
      <div className="flex h-full w-full">
        {segments.map((s, i) => (
          <div key={i} style={{ width: `${Math.max(0, (s.kcal / total) * 100)}%`, backgroundColor: s.color, borderRight: `1.5px solid ${C.paper}` }} />
        ))}
      </div>
      {sum > total && <div className="absolute inset-y-0 right-0 w-1" style={{ backgroundColor: C.over }} />}
    </div>
  );
}
function Gauge({ value, target, color }) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: C.track }}>
      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color, transition: "width 0.5s ease" }} />
    </div>
  );
}

function Arc({ consumed, target, children }) {
  const size = 208, stroke = 16, r = (size - stroke) / 2, cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r, sweep = 270;
  const arcLen = circ * (sweep / 360);
  const pct = target > 0 ? Math.min(1, consumed / target) : 0;
  const over = consumed > target;
  const color = over ? C.over : pct > 0.85 ? "#f0b341" : C.green;
  return (
    <div className="relative mx-auto mb-4" style={{ width: size, height: size * 0.82 }}>
      <svg width={size} height={size} style={{ display: "block" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.track} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${arcLen} ${circ}`} transform={`rotate(135 ${cx} ${cy})`} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${arcLen * pct} ${circ}`} transform={`rotate(135 ${cx} ${cy})`}
          style={{ transition: "stroke-dasharray 0.6s ease, stroke 0.4s ease", filter: `drop-shadow(0 0 7px ${color}80)` }} />
      </svg>
      <div className="absolute inset-x-0 flex flex-col items-center text-center" style={{ top: "30%" }}>{children}</div>
    </div>
  );
}

function DayRow({ slotKey, meals = [], skipped, target, onAdd, onReplace, onSurprise, onClear, onSkip }) {
  const ui = SLOT_UI[slotKey];
  const Icon = SLOTS[slotKey].icon;
  const sub = meals.reduce((a, m) => ({ kcal: a.kcal + m.kcal, p: a.p + m.p }), { kcal: 0, p: 0 });
  const has = meals.length > 0;
  return (
    <div className="px-5 py-4">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: `${ui.color}1a`, color: ui.color }}><Icon size={16} /></span>
          <div className="leading-tight">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: ui.color }}>{ui.time}</p>
            <p className="text-sm font-semibold" style={{ color: C.ink }}>{SLOTS[slotKey].label}{has && <span style={{ color: C.muted, fontWeight: 500 }}> · {sub.kcal} kcal · {sub.p} g</span>}</p>
          </div>
        </div>
        {onSkip && (
          <button onClick={onSkip} className="rounded-full px-2.5 py-1 text-xs font-medium active:scale-95" style={skipped ? { backgroundColor: C.ink, color: C.paper } : { color: C.muted, border: `1px solid ${C.line}` }}>{skipped ? "Sauté" : "Sauter"}</button>
        )}
      </div>

      {skipped ? (
        <p className="pl-1 text-sm" style={{ color: C.muted }}>Protéines reportées sur le déjeuner et le dîner.</p>
      ) : !has ? (
        <div className="flex items-center gap-2">
          <button onClick={onAdd} className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-white active:scale-95" style={{ backgroundColor: ui.color }}><Search size={15} /> Piocher · ~{r0(target.kcal)} kcal</button>
          <button onClick={onSurprise} title="Au hasard" className="flex h-11 w-11 items-center justify-center rounded-2xl active:scale-90" style={{ backgroundColor: `${ui.color}1a`, color: ui.color }}><Sparkles size={17} /></button>
        </div>
      ) : (
        <div className="space-y-2">
          {meals.map((m, i) => (
            <div key={i} className="flex items-start justify-between gap-3 rounded-2xl p-3" style={{ backgroundColor: C.paper }}>
              <div className="min-w-0">
                <p className="text-sm font-semibold" style={{ color: C.ink }}>{m.name}</p>
                <p className="mt-0.5 text-xs font-semibold" style={{ fontVariantNumeric: "tabular-nums" }}>
                  <span style={{ color: C.ink }}>{m.kcal} kcal</span><span style={{ color: C.protein }}> · {m.p} g prot.</span>
                  {m.c != null && <span style={{ color: C.muted }}> · {m.c} g gluc · {m.f} g lip</span>}
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button onClick={() => onReplace(i)} className="rounded-lg p-2 active:scale-90" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }}><Shuffle size={14} /></button>
                <button onClick={() => onClear(i)} className="rounded-lg p-2 active:scale-90" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.muted }}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
          <div className="flex items-center gap-2 pt-0.5">
            <button onClick={onAdd} className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-2.5 text-sm font-semibold active:scale-95" style={{ backgroundColor: `${ui.color}1a`, color: ui.color }}><Plus size={15} /> Ajouter</button>
            <button onClick={onSurprise} title="Au hasard" className="flex h-10 w-10 items-center justify-center rounded-2xl active:scale-90" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.sub }}><Sparkles size={16} /></button>
          </div>
        </div>
      )}
    </div>
  );
}

function ChipSection({ color, time, title, icon: Icon, items, canAdd, onAdd, onRemove, empty }) {
  return (
    <div className="px-5 py-4">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}1a`, color }}><Icon size={16} /></span>
          <div className="leading-tight">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color }}>{time}</p>
            <p className="text-sm font-semibold" style={{ color: C.ink }}>{title}</p>
          </div>
        </div>
        {canAdd && <button onClick={onAdd} className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95" style={{ backgroundColor: C.ink, color: C.paper }}><Plus size={13} /> Ajouter</button>}
      </div>
      {items.length === 0 ? (
        <p className="pl-1 text-sm" style={{ color: C.muted }}>{empty}</p>
      ) : (
        <div className="space-y-2">
          {items.map((s, i) => (
            <div key={i} className="flex items-center justify-between rounded-2xl p-3" style={{ backgroundColor: C.paper }}>
              <div className="min-w-0">
                <p className="text-sm font-semibold" style={{ color: C.ink }}>{s.name}</p>
                <p className="text-xs" style={{ color: C.sub, fontVariantNumeric: "tabular-nums" }}>{s.kcal} kcal · {s.p} g prot.</p>
              </div>
              <button onClick={() => onRemove(i)} className="rounded-full p-1.5 active:scale-90" style={{ color: C.muted }}><X size={16} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
    { name: "Shake vegan Bulk (eau)", kcal: 115, p: 23 },
    { name: "Barre gourmet vegane Bulk", kcal: 200, p: 17 },
  ] },
  { cat: "Sans alcool", items: [
    { name: "Jus / smoothie detox", kcal: 150, p: 2 },
    { name: "Soda (33 cl)", kcal: 140, p: 0 },
    { name: "Limonade / thé glacé", kcal: 120, p: 0 },
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
function ExtrasSection({ extras, onAdd, onRemove }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(""); const [kcal, setKcal] = useState(""); const [p, setP] = useState("");
  const addCustom = () => { const k = parseInt(kcal, 10); if (!name.trim() || isNaN(k)) return; onAdd({ name: name.trim(), kcal: k, p: parseInt(p, 10) || 0 }); setName(""); setKcal(""); setP(""); setOpen(false); };
  return (
    <div className="px-5 py-4">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: `${C.extra}24`, color: C.extra }}><Cookie size={16} /></span>
          <div className="leading-tight">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.extra }}>Hors base</p>
            <p className="text-sm font-semibold" style={{ color: C.ink }}>Extras</p>
          </div>
        </div>
        <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95" style={{ backgroundColor: C.ink, color: C.paper }}><Plus size={13} /> Ajouter</button>
      </div>
      {extras.length === 0 && !open && <p className="pl-1 text-sm" style={{ color: C.muted }}>Glace, barre, gâteau, cidre… le budget des repas s'ajuste tout seul.</p>}
      {extras.length > 0 && (
        <div className="mb-2 space-y-2">
          {extras.map((e, i) => (
            <div key={i} className="flex items-center justify-between rounded-2xl p-3" style={{ backgroundColor: `${C.extra}14` }}>
              <div className="min-w-0"><p className="text-sm font-semibold" style={{ color: C.ink }}>{e.name}</p><p className="text-xs" style={{ color: C.sub, fontVariantNumeric: "tabular-nums" }}>{e.kcal} kcal · {e.p} g prot.</p></div>
              <button onClick={() => onRemove(i)} className="rounded-full p-1.5 active:scale-90" style={{ color: C.muted }}><X size={16} /></button>
            </div>
          ))}
        </div>
      )}
      {open && (
        <div className="space-y-3 rounded-2xl p-3" style={{ backgroundColor: C.paper }}>
          <div className="space-y-2.5">
            {EXTRA_PRESETS.map((g) => (
              <div key={g.cat}>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider" style={{ color: C.muted }}>{g.cat}</p>
                <div className="flex flex-wrap gap-1.5">
                  {g.items.map((pr) => (
                    <button key={pr.name} onClick={() => onAdd(pr)} className="rounded-full px-2.5 py-1 text-xs font-medium active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }}>+ {pr.name} <span style={{ color: C.muted }}>{pr.kcal}</span></button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom (ex. glace vanille)" className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }} />
          <div className="flex gap-2">
            <input value={kcal} onChange={(e) => setKcal(e.target.value)} inputMode="numeric" placeholder="kcal" className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }} />
            <input value={p} onChange={(e) => setP(e.target.value)} inputMode="numeric" placeholder="prot. (g)" className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }} />
            <button onClick={addCustom} className="shrink-0 rounded-xl px-4 py-2 text-sm font-semibold text-white active:scale-95" style={{ backgroundColor: C.extra }}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── DECK : la pioche ────────────────────────────────────────────────────────
function Deck({ slotKey, rankFor, fitOf, slotTarget, onChoose, onClose }) {
  const ui = SLOT_UI[slotKey];
  const [q, setQ] = useState(""); const [tags, setTags] = useState([]); const [budgetOnly, setBudgetOnly] = useState(false);
  const [feat, setFeat] = useState(0); const [showList, setShowList] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [cName, setCName] = useState(""); const [cKcal, setCKcal] = useState(""); const [cP, setCP] = useState("");
  const toggleTag = (t) => setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  const list = useMemo(() => {
    let l = MEALS.filter((m) => m.slots.includes(slotKey));
    if (q.trim()) { const s = q.toLowerCase(); l = l.filter((m) => m.name.toLowerCase().includes(s) || m.desc.toLowerCase().includes(s)); }
    if (tags.length) l = l.filter((m) => tags.every((t) => m.tags.includes(t)));
    l = rankFor(slotKey, l);
    if (budgetOnly) l = l.filter((m) => fitOf(m) !== "over");
    return l;
  }, [slotKey, q, tags, budgetOnly, rankFor, fitOf]);
  useEffect(() => { setFeat(0); }, [q, tags, budgetOnly, slotKey]);

  const addCustom = () => { const k = parseInt(cKcal, 10); if (!cName.trim() || isNaN(k)) return; onChoose({ id: `custom-${Date.now()}`, name: cName.trim(), kcal: k, p: parseInt(cP, 10) || 0, c: null, f: null, desc: "Mon repas", tags: [], slots: [slotKey], custom: true }); };

  const fitMeta = {
    ok: { label: "rentre dans ton budget", bg: "#e3f3ea", fg: "#2f7d5b" },
    rich: { label: "un peu riche", bg: "#fbeede", fg: "#b3641f" },
    over: { label: "dépasse le budget", bg: "#f8e3df", fg: "#c0432f" },
  };
  const featured = list[feat % (list.length || 1)];

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center" style={{ backgroundColor: C.overlay, backdropFilter: "blur(3px)" }} onClick={onClose}>
      <div className="flex w-full max-w-md flex-col rounded-t-3xl" style={{ maxHeight: "92vh", backgroundColor: C.sheet }} onClick={(e) => e.stopPropagation()}>
        <div className="shrink-0 px-5 pb-3 pt-4">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full" style={{ backgroundColor: C.line }} />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${ui.color}1a`, color: ui.color }}>{React.createElement(SLOTS[slotKey].icon, { size: 17 })}</span>
              <div className="leading-tight"><p className="text-xs font-semibold uppercase tracking-wider" style={{ color: ui.color }}>{ui.time}</p><p className="text-base font-bold" style={{ color: C.ink }}>{SLOTS[slotKey].label} · pioche</p></div>
            </div>
            <button onClick={onClose} className="rounded-full p-2 active:scale-90" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }}><X size={18} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {featured && !showList && (
            <div className="mb-3 rounded-3xl p-5" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, boxShadow: `0 10px 30px -18px ${C.shadow}` }}>
              {(() => { const m = fitMeta[fitOf(featured)]; return <span className="inline-block rounded-full px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: m.bg, color: m.fg }}>{m.label}</span>; })()}
              <p className="mt-3 text-xl font-extrabold leading-tight" style={{ color: C.ink }}>{featured.name}</p>
              <p className="mt-1 text-sm" style={{ color: C.sub }}>{featured.desc}</p>
              <div className="mt-3 flex gap-4" style={{ fontVariantNumeric: "tabular-nums" }}>
                <Stat label="kcal" value={featured.kcal} color={C.ink} />
                <Stat label="protéines" value={`${featured.p} g`} color={C.protein} />
                {featured.c != null && <Stat label="gluc / lip" value={`${featured.c} / ${featured.f}`} color={C.muted} />}
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => onChoose(featured)} className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white active:scale-95" style={{ backgroundColor: ui.color }}><Check size={16} /> Prendre</button>
                <button onClick={() => setFeat((f) => f + 1)} className="flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold active:scale-95" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.sub }}><Shuffle size={15} /> Une autre</button>
              </div>
              <p className="mt-2 text-center text-xs" style={{ color: C.muted }}>{list.length} plats pour ce créneau</p>
            </div>
          )}
          <button onClick={() => setCustomOpen((v) => !v)} className="mb-3 flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold active:scale-95" style={{ border: `1px dashed ${C.muted}`, color: C.sub }}>
            <span className="flex items-center gap-2"><Pencil size={15} /> Saisir mon repas</span>
            <ChevronRight size={16} style={{ transform: customOpen ? "rotate(90deg)" : "none", transition: "transform .2s" }} />
          </button>
          {customOpen && (
            <div className="mb-3 space-y-2 rounded-2xl p-3" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
              <input value={cName} onChange={(e) => setCName(e.target.value)} placeholder="Ex. Mes 2 tacos œuf-fromage-avocat" className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}` }} />
              <div className="flex gap-2">
                <input value={cKcal} onChange={(e) => setCKcal(e.target.value)} inputMode="numeric" placeholder="kcal" className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}` }} />
                <input value={cP} onChange={(e) => setCP(e.target.value)} inputMode="numeric" placeholder="prot. (g)" className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}` }} />
                <button onClick={addCustom} className="shrink-0 rounded-xl px-4 py-2 text-sm font-semibold text-white active:scale-95" style={{ backgroundColor: C.ink }}>OK</button>
              </div>
            </div>
          )}
          <div className="mb-2 flex items-center gap-2 rounded-2xl px-3 py-2.5" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
            <Search size={16} style={{ color: C.muted }} />
            <input value={q} onChange={(e) => { setQ(e.target.value); setShowList(true); }} placeholder="Rechercher un plat, un ingrédient…" className="w-full bg-transparent text-sm outline-none" style={{ color: C.ink }} />
          </div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            <FilterChip active={budgetOnly} onClick={() => setBudgetOnly((v) => !v)} icon={<Flame size={12} />}>Dans le budget</FilterChip>
            {TAGS.map((t) => <FilterChip key={t.id} active={tags.includes(t.id)} onClick={() => toggleTag(t.id)} icon={<t.icon size={12} />}>{t.label}</FilterChip>)}
          </div>
          <button onClick={() => setShowList((v) => !v)} className="mb-2 flex w-full items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wider active:scale-95" style={{ color: C.muted }}>
            {showList ? "Masquer la liste" : "Voir tous les plats"}
            <ChevronRight size={13} style={{ transform: showList ? "rotate(90deg)" : "none", transition: "transform .2s" }} />
          </button>
          {showList && (
            <div className="space-y-2">
              {list.length === 0 && <p className="py-6 text-center text-sm" style={{ color: C.muted }}>Aucun plat. Allège les filtres ou saisis ton repas.</p>}
              {list.map((m) => {
                const meta = fitMeta[fitOf(m)];
                return (
                  <button key={m.id} onClick={() => onChoose(m)} className="flex w-full items-center gap-3 rounded-2xl p-3 text-left active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
                    <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: meta.fg }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold" style={{ color: C.ink }}>{m.name}</p>
                      <p className="text-xs font-medium" style={{ fontVariantNumeric: "tabular-nums" }}><span style={{ color: C.sub }}>{m.kcal} kcal</span> · <span style={{ color: C.protein }}>{m.p} g prot.</span></p>
                    </div>
                    <ChevronRight size={18} style={{ color: C.line }} />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
function Stat({ label, value, color }) {
  return <div><p className="text-lg font-extrabold leading-none" style={{ color }}>{value}</p><p className="mt-0.5 text-xs uppercase tracking-wide" style={{ color: C.muted }}>{label}</p></div>;
}
function FilterChip({ active, onClick, icon, children }) {
  return <button onClick={onClick} className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium active:scale-95" style={active ? { backgroundColor: C.ink, color: C.paper } : { backgroundColor: C.card, color: C.sub, border: `1px solid ${C.line}` }}>{icon} {children}</button>;
}

// ── Réglages + calculateur ──────────────────────────────────────────────────
function SettingsSheet({ settings, setSettings, theme, onTheme, allData, onImport, onClose }) {
  const [kcal, setKcal] = useState(settings.kcal);
  const [protein, setProtein] = useState(settings.protein);
  const [showCalc, setShowCalc] = useState(false);
  const [showData, setShowData] = useState(false);
  const [jsonOut, setJsonOut] = useState("");
  const [paste, setPaste] = useState("");
  const [msg, setMsg] = useState(null);
  const fileRef = React.useRef(null);
  const [profile, setProfile] = useState(settings.profile ?? { sex: "h", age: 35, weight: 78, height: 178, activity: 1.45, deficit: 0.18 });
  const setP = (k, v) => setProfile((p) => ({ ...p, [k]: v }));
  const save = () => { setSettings({ kcal, protein, profile }); onClose(); };

  const doExport = () => {
    const json = JSON.stringify(allData, null, 2);
    setJsonOut(json);
    try {
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `pioche-repas-${TODAY}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      setMsg({ ok: true, m: "Fichier téléchargé. (Tu peux aussi copier le texte ci-dessous.)" });
    } catch (e) { setMsg({ ok: true, m: "Copie le texte ci-dessous pour sauvegarder tes données." }); }
  };
  const applyImport = (text) => {
    try {
      const obj = JSON.parse(text);
      if (!obj || typeof obj !== "object") throw new Error();
      onImport(obj);
      const n = obj.days ? Object.keys(obj.days).length : 0;
      setMsg({ ok: true, m: `Import réussi — ${n} jour(s) fusionné(s).` });
      setPaste("");
    } catch (e) { setMsg({ ok: false, m: "JSON invalide, rien n'a été importé." }); }
  };
  const onFile = (e) => { const f = e.target.files && e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = (ev) => applyImport(String(ev.target.result)); rd.readAsText(f); e.target.value = ""; };
  const copyJson = () => { try { navigator.clipboard.writeText(jsonOut); setMsg({ ok: true, m: "Copié dans le presse-papier." }); } catch (e) { setMsg({ ok: true, m: "Sélectionne le texte et copie-le manuellement." }); } };

  const calc = useMemo(() => {
    const { sex, age, weight, height, activity, deficit } = profile;
    const w = +weight || 0, h = +height || 0, a = +age || 0;
    const bmr = 10 * w + 6.25 * h - 5 * a + (sex === "h" ? 5 : -161);
    const tdee = bmr * activity;
    const round50 = (x) => Math.round(x / 50) * 50, round5 = (x) => Math.round(x / 5) * 5;
    return { maintenance: round50(tdee), target: Math.max(1500, round50(tdee * (1 - deficit)), Math.round(bmr)), proteinReco: Math.min(220, Math.max(100, round5(w * 1.9))) };
  }, [profile]);
  const ACTIVITIES = [{ v: 1.2, l: "Sédentaire" }, { v: 1.375, l: "Léger" }, { v: 1.45, l: "Modéré" }, { v: 1.55, l: "Actif" }, { v: 1.725, l: "Très actif" }];
  const DEFICITS = [{ v: 0, l: "Maintien" }, { v: 0.12, l: "Perte douce" }, { v: 0.18, l: "Perte" }, { v: 0.25, l: "Perte rapide" }];
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center" style={{ backgroundColor: C.overlay, backdropFilter: "blur(3px)" }} onClick={onClose}>
      <div className="w-full max-w-md overflow-y-auto rounded-t-3xl p-5" style={{ maxHeight: "92vh", backgroundColor: C.sheet }} onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ backgroundColor: C.line }} />
        <h2 className="mb-1 text-lg font-bold" style={{ color: C.ink }}>Objectifs du jour</h2>
        <p className="mb-4 text-sm" style={{ color: C.sub }}>Règle tes cibles à la main, ou laisse le calculateur les estimer.</p>

        <div className="mb-4 flex items-center justify-between rounded-2xl px-4 py-3" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
          <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: C.ink }}>
            {theme === "dark" ? <Moon size={15} style={{ color: C.weight }} /> : <Sun size={15} style={{ color: C.protein }} />} Thème
          </span>
          <div className="flex gap-1 rounded-full p-1" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}` }}>
            {[{ v: "light", l: "Clair" }, { v: "dark", l: "Sombre" }].map((o) => (
              <button key={o.v} onClick={() => onTheme(o.v)} className="rounded-full px-3 py-1 text-xs font-semibold active:scale-95" style={theme === o.v ? { backgroundColor: C.ink, color: C.paper } : { color: C.sub }}>{o.l}</button>
            ))}
          </div>
        </div>
        <SliderRow label="Calories" icon={<Flame size={15} style={{ color: C.protein }} />} value={kcal} unit="kcal" min={1500} max={2600} step={50} onChange={setKcal} color={C.protein} />
        <SliderRow label="Protéines" icon={<Beef size={15} style={{ color: C.green }} />} value={protein} unit="g" min={100} max={220} step={5} onChange={setProtein} color={C.green} />
        <button onClick={() => setShowCalc((v) => !v)} className="mb-3 mt-1 flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }}>
          <span className="flex items-center gap-2"><Calculator size={16} /> Estimer depuis mes mesures</span>
          <ChevronRight size={16} style={{ transform: showCalc ? "rotate(90deg)" : "none", transition: "transform .2s" }} />
        </button>
        {showCalc && (
          <div className="mb-4 space-y-3 rounded-2xl p-4" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
            <div className="grid grid-cols-2 gap-2">
              <Seg label="Sexe" options={[{ v: "h", l: "Homme" }, { v: "f", l: "Femme" }]} value={profile.sex} onChange={(v) => setP("sex", v)} />
              <NumField label="Âge" value={profile.age} onChange={(v) => setP("age", v)} suffix="ans" />
              <NumField label="Poids" value={profile.weight} onChange={(v) => setP("weight", v)} suffix="kg" />
              <NumField label="Taille" value={profile.height} onChange={(v) => setP("height", v)} suffix="cm" />
            </div>
            <Picker2 label="Activité" options={ACTIVITIES} value={profile.activity} onChange={(v) => setP("activity", v)} />
            <Picker2 label="Objectif" options={DEFICITS} value={profile.deficit} onChange={(v) => setP("deficit", v)} />
            <div className="rounded-xl p-3" style={{ backgroundColor: C.paper }}>
              <div className="flex justify-between text-xs" style={{ color: C.sub }}><span>Maintien estimé</span><span className="font-semibold">{calc.maintenance} kcal</span></div>
              <div className="mt-1 flex justify-between text-sm"><span className="font-semibold" style={{ color: C.ink }}>Cible recommandée</span><span className="font-bold" style={{ color: C.ink }}>{calc.target} kcal · {calc.proteinReco} g</span></div>
            </div>
            <button onClick={() => { setKcal(calc.target); setProtein(calc.proteinReco); }} className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white active:scale-95" style={{ backgroundColor: C.green }}><Check size={16} /> Appliquer la reco</button>
            <p className="text-xs" style={{ color: C.muted }}>Mifflin-St Jeor · protéines ≈ 1,9 g/kg. Plancher de sécurité à 1500 kcal.</p>
          </div>
        )}
        <button onClick={() => setShowData((v) => !v)} className="mb-3 flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }}>
          <span className="flex items-center gap-2"><Package size={16} /> Sauvegarde & restauration</span>
          <ChevronRight size={16} style={{ transform: showData ? "rotate(90deg)" : "none", transition: "transform .2s" }} />
        </button>
        {showData && (
          <div className="mb-4 space-y-3 rounded-2xl p-4" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
            <p className="text-xs" style={{ color: C.sub }}>Exporte tes repas et ton poids dans un fichier, ou réimporte-les (les jours se fusionnent, l'import ne supprime rien).</p>
            <div className="flex gap-2">
              <button onClick={doExport} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold text-white active:scale-95" style={{ backgroundColor: C.green }}><TrendingUp size={15} /> Exporter</button>
              <button onClick={() => fileRef.current && fileRef.current.click()} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold active:scale-95" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink }}><CalendarCheck size={15} /> Importer un fichier</button>
              <input ref={fileRef} type="file" accept="application/json,.json" onChange={onFile} style={{ display: "none" }} />
            </div>

            {jsonOut && (
              <div className="space-y-1.5">
                <textarea readOnly value={jsonOut} rows={4} className="w-full rounded-xl p-2 text-xs outline-none" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.sub, fontFamily: "ui-monospace, monospace" }} />
                <button onClick={copyJson} className="w-full rounded-xl py-2 text-xs font-semibold active:scale-95" style={{ backgroundColor: C.ink, color: C.paper }}>Copier le texte</button>
              </div>
            )}

            <div className="space-y-1.5">
              <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={3} placeholder="…ou colle ici un JSON exporté" className="w-full rounded-xl p-2 text-xs outline-none" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink, fontFamily: "ui-monospace, monospace" }} />
              <button onClick={() => paste.trim() && applyImport(paste)} className="w-full rounded-xl py-2 text-xs font-semibold active:scale-95" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink }}>Importer ce texte</button>
            </div>

            {msg && <p className="text-xs font-medium" style={{ color: msg.ok ? C.green : C.over }}>{msg.m}</p>}
          </div>
        )}

        <button onClick={save} className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold text-white active:scale-95" style={{ backgroundColor: C.ink }}><Check size={18} /> Enregistrer</button>
      </div>
    </div>
  );
}
function SliderRow({ label, icon, value, unit, min, max, step, onChange, color }) {
  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: C.ink }}>{icon} {label}</span>
        <span className="text-sm font-bold" style={{ color: C.ink, fontVariantNumeric: "tabular-nums" }}>{value} {unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} className="w-full" style={{ accentColor: color }} />
    </div>
  );
}
function Seg({ label, options, value, onChange }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium" style={{ color: C.sub }}>{label}</p>
      <div className="flex gap-1 rounded-xl p-1" style={{ backgroundColor: C.paper }}>
        {options.map((o) => <button key={o.v} onClick={() => onChange(o.v)} className="flex-1 rounded-lg py-1.5 text-xs font-semibold active:scale-95" style={value === o.v ? { backgroundColor: C.ink, color: C.paper } : { color: C.sub }}>{o.l}</button>)}
      </div>
    </div>
  );
}
function NumField({ label, value, onChange, suffix }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium" style={{ color: C.sub }}>{label}</p>
      <div className="flex items-center rounded-xl px-3 py-1.5" style={{ backgroundColor: C.paper }}>
        <input value={value} onChange={(e) => onChange(+e.target.value || 0)} inputMode="numeric" className="w-full bg-transparent text-sm font-semibold outline-none" style={{ color: C.ink }} />
        <span className="text-xs" style={{ color: C.muted }}>{suffix}</span>
      </div>
    </div>
  );
}
function Picker2({ label, options, value, onChange }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium" style={{ color: C.sub }}>{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => <button key={o.v} onClick={() => onChange(o.v)} className="rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95" style={value === o.v ? { backgroundColor: C.ink, color: C.paper } : { backgroundColor: C.card, color: C.sub, border: `1px solid ${C.line}` }}>{o.l}</button>)}
      </div>
    </div>
  );
}
