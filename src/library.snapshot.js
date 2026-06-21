// ════════════════════════════════════════════════════════════════
// library.snapshot.js — GÉNÉRÉ AUTOMATIQUEMENT, ne pas éditer à la main.
// Bootstrap hors-ligne : sert uniquement au tout premier lancement quand le
// cache localStorage est vide ET qu'il n'y a pas de réseau. Dès que Supabase
// répond, ces données sont remplacées. La SOURCE VIVANTE est Supabase.
// ════════════════════════════════════════════════════════════════
export const SNAPSHOT_PRESETS = [
  {
    "cat": "Sucré",
    "items": [
      {
        "name": "Boule de glace",
        "kcal": 130,
        "p": 2
      },
      {
        "name": "Boule de sorbet",
        "kcal": 95,
        "p": 0
      },
      {
        "name": "Cornet 1 boule",
        "kcal": 160,
        "p": 2
      },
      {
        "name": "Cornet 2 boules",
        "kcal": 320,
        "p": 4
      },
      {
        "name": "Mini cône sorbet (39 g)",
        "kcal": 94,
        "p": 1
      },
      {
        "name": "Snickers glacé (1 barre)",
        "kcal": 171,
        "p": 3
      },
      {
        "name": "Glace italienne",
        "kcal": 220,
        "p": 4
      },
      {
        "name": "Part de gâteau",
        "kcal": 350,
        "p": 5
      },
      {
        "name": "Crêpe sucre",
        "kcal": 150,
        "p": 3
      },
      {
        "name": "Crêpe Nutella",
        "kcal": 280,
        "p": 5
      },
      {
        "name": "Carré de chocolat",
        "kcal": 55,
        "p": 1
      },
      {
        "name": "Barre protéinée",
        "kcal": 200,
        "p": 20
      },
      {
        "name": "Poignée de chips",
        "kcal": 150,
        "p": 2
      }
    ]
  },
  {
    "cat": "Protéiné",
    "items": [
      {
        "name": "Clear Protein Bulk (verre 150 ml)",
        "kcal": 34,
        "p": 8
      },
      {
        "name": "Clear Vegan Bulk (1 dose)",
        "kcal": 67,
        "p": 15
      },
      {
        "name": "Shake Vegan Bulk (eau, 35 g)",
        "kcal": 127,
        "p": 24
      },
      {
        "name": "Barre gourmet vegane Bulk",
        "kcal": 206,
        "p": 17
      },
      {
        "name": "Brownie vegan Bulk",
        "kcal": 227,
        "p": 15
      },
      {
        "name": "Blondie vegan Bulk",
        "kcal": 230,
        "p": 14
      }
    ]
  },
  {
    "cat": "Sans alcool",
    "items": [
      {
        "name": "Jus / smoothie detox",
        "kcal": 150,
        "p": 2
      },
      {
        "name": "Soda (33 cl)",
        "kcal": 140,
        "p": 0
      },
      {
        "name": "Soda / thé glacé zéro",
        "kcal": 5,
        "p": 0
      },
      {
        "name": "Limonade / thé glacé",
        "kcal": 120,
        "p": 0
      },
      {
        "name": "Kombucha Foliz · Le Festif (≈25 cl)",
        "kcal": 35,
        "p": 0
      },
      {
        "name": "Kombucha Foliz · Le Passionné (≈25 cl)",
        "kcal": 35,
        "p": 0
      }
    ]
  },
  {
    "cat": "Bière & alcool",
    "items": [
      {
        "name": "Demi blonde (25 cl)",
        "kcal": 100,
        "p": 1
      },
      {
        "name": "Pinte blonde (50 cl)",
        "kcal": 200,
        "p": 2
      },
      {
        "name": "IPA (33 cl)",
        "kcal": 215,
        "p": 2
      },
      {
        "name": "Pinte IPA (50 cl)",
        "kcal": 320,
        "p": 3
      },
      {
        "name": "Bière forte (33 cl)",
        "kcal": 270,
        "p": 2
      },
      {
        "name": "Verre de vin (15 cl)",
        "kcal": 125,
        "p": 0
      },
      {
        "name": "Verre de cidre",
        "kcal": 110,
        "p": 0
      },
      {
        "name": "Spritz",
        "kcal": 150,
        "p": 0
      },
      {
        "name": "Gin tonic",
        "kcal": 170,
        "p": 0
      },
      {
        "name": "Mojito",
        "kcal": 200,
        "p": 0
      },
      {
        "name": "Margarita",
        "kcal": 250,
        "p": 0
      },
      {
        "name": "Piña colada",
        "kcal": 380,
        "p": 2
      }
    ]
  }
];

export const SNAPSHOT_RECIPES = [
  {
    "id": "idea-oats",
    "cat": "pdj",
    "quick": true,
    "name": "Overnight oats protéiné",
    "emoji": "🥣",
    "kcal": 390,
    "p": 35,
    "desc": "Se prépare la veille, se mange (ou se boit) en voiture.",
    "ingredients": [
      "40 g de flocons d'avoine",
      "250 ml de lait d'amande",
      "1 dose de Vegan Protein",
      "une poignée de fruits rouges",
      "1 c. à café de graines de chia"
    ],
    "steps": [
      "La veille, mélange flocons + lait + protéine + chia dans un bocal.",
      "Laisse une nuit au frigo.",
      "Le matin, ajoute les fruits."
    ]
  },
  {
    "id": "idea-pancakes",
    "cat": "pdj",
    "quick": true,
    "name": "Pancakes protéinés",
    "emoji": "🥞",
    "kcal": 400,
    "p": 35,
    "desc": "Sans huile, à la poêle antiadhésive.",
    "ingredients": [
      "40 g de flocons mixés",
      "2 œufs",
      "1 banane écrasée",
      "1/2 dose de Vegan Protein",
      "cannelle"
    ],
    "steps": [
      "Mixe le tout en pâte.",
      "Cuis en petits pancakes, poêle antiadhésive sans huile.",
      "Garnis de fruits ou d'un filet de sirop léger."
    ]
  },
  {
    "id": "idea-tofuscramble",
    "cat": "pdj",
    "quick": true,
    "name": "Tofu brouillé express",
    "emoji": "🍳",
    "kcal": 290,
    "p": 22,
    "desc": "L'alternative aux œufs, goût brouillé.",
    "ingredients": [
      "150 g de tofu ferme",
      "curcuma, paprika, sel kala namak (goût œuf)",
      "1 tranche de pain complet"
    ],
    "steps": [
      "Écrase le tofu à la fourchette.",
      "Poêle antiadhésive + épices, 5 min.",
      "Sers avec le pain."
    ]
  },
  {
    "id": "idea-skyrmuesli",
    "cat": "pdj",
    "quick": true,
    "name": "Skyr soja & muesli",
    "emoji": "🥣",
    "kcal": 320,
    "p": 20,
    "desc": "Rapide. Choisis un skyr SOJA (plus protéiné que l'amande) et un muesli sans sucre ajouté.",
    "ingredients": [
      "150 g de skyr/yaourt soja protéiné",
      "40 g de muesli sans sucre ajouté",
      "fruits frais"
    ],
    "steps": [
      "Mélange skyr + muesli.",
      "Ajoute les fruits."
    ]
  },
  {
    "id": "idea-buddha",
    "cat": "dej",
    "quick": true,
    "name": "Buddha bowl tofu",
    "emoji": "🥗",
    "kcal": 470,
    "p": 32,
    "desc": "Protéiné, frais, sec en gras.",
    "ingredients": [
      "150 g de tofu fumé ou teriyaki",
      "80 g de quinoa (cru) cuit",
      "80 g d'edamame",
      "crudités (carotte, chou, concombre)",
      "sauce soja + citron + gingembre"
    ],
    "steps": [
      "Cuis le quinoa.",
      "Poêle le tofu.",
      "Assemble avec edamame et crudités, nappe de sauce."
    ]
  },
  {
    "id": "idea-omelette",
    "cat": "dej",
    "name": "Omelette garnie",
    "emoji": "🍳",
    "kcal": 400,
    "p": 24,
    "desc": "Rapide et rassasiant.",
    "ingredients": [
      "3 œufs",
      "champignons + épinards",
      "1 tranche de pain complet"
    ],
    "steps": [
      "Fais revenir champignons et épinards.",
      "Verse les œufs battus, cuis l'omelette.",
      "Sers avec le pain."
    ]
  },
  {
    "id": "idea-steak",
    "cat": "dej",
    "name": "Steak végétal & légumes rôtis",
    "emoji": "🥩",
    "kcal": 450,
    "p": 30,
    "desc": "Avec HappyVore ou Garden Gourmet.",
    "ingredients": [
      "1 steak végétal",
      "grosse portion de légumes rôtis",
      "100 g de patate douce ou lentilles"
    ],
    "steps": [
      "Rôtis les légumes au four.",
      "Poêle le steak.",
      "Assemble."
    ]
  },
  {
    "id": "idea-wrap",
    "cat": "dej",
    "quick": true,
    "name": "Wrap protéiné",
    "emoji": "🌯",
    "kcal": 400,
    "p": 22,
    "desc": "À emporter, se mange à une main.",
    "ingredients": [
      "1 tortilla complète",
      "jambon La Vie ou tofu",
      "crudités",
      "1 c. à soupe de houmous"
    ],
    "steps": [
      "Tartine le houmous.",
      "Garnis de protéine + crudités.",
      "Roule serré."
    ]
  },
  {
    "id": "idea-medbowl",
    "cat": "dej",
    "quick": true,
    "name": "Bowl méditerranéen",
    "emoji": "🥙",
    "kcal": 470,
    "p": 26,
    "desc": "Pois chiches + œuf, frais et complet.",
    "ingredients": [
      "150 g de pois chiches",
      "1 œuf dur",
      "concombre + tomate",
      "60 g de boulgour (cru) cuit",
      "citron, herbes"
    ],
    "steps": [
      "Cuis le boulgour.",
      "Assemble pois chiches, œuf, légumes.",
      "Assaisonne citron + herbes."
    ]
  },
  {
    "id": "idea-curry",
    "cat": "diner",
    "name": "Curry de pois chiches express",
    "emoji": "🍛",
    "kcal": 520,
    "p": 22,
    "desc": "Réconfortant, prêt en 15 min.",
    "ingredients": [
      "150 g de pois chiches",
      "150 ml de lait de coco allégé",
      "épinards",
      "tomate concassée + pâte de curry",
      "100 g de riz basmati (cru) cuit"
    ],
    "steps": [
      "Fais mijoter tomate + curry + coco.",
      "Ajoute pois chiches et épinards, 10 min.",
      "Sers sur le riz."
    ]
  },
  {
    "id": "idea-wok",
    "cat": "diner",
    "name": "Poêlée tofu-légumes & soba",
    "emoji": "🍜",
    "kcal": 480,
    "p": 28,
    "desc": "Façon wok, vite fait.",
    "ingredients": [
      "150 g de tofu teriyaki",
      "wok de légumes (poivron, brocoli, pousses)",
      "80 g de nouilles soba (crues) cuites",
      "sauce soja"
    ],
    "steps": [
      "Cuis les soba.",
      "Saute tofu + légumes au wok.",
      "Mélange, nappe de sauce."
    ]
  },
  {
    "id": "idea-galette",
    "cat": "diner",
    "name": "Galette de sarrasin garnie",
    "emoji": "🫓",
    "kcal": 420,
    "p": 22,
    "desc": "Œuf + champignons, format crêpe salée.",
    "ingredients": [
      "1 galette de sarrasin",
      "1 œuf",
      "champignons",
      "un peu de fromage râpé"
    ],
    "steps": [
      "Réchauffe la galette.",
      "Casse l'œuf au centre, ajoute champignons + fromage.",
      "Replie et sers."
    ]
  },
  {
    "id": "idea-soupe",
    "cat": "diner",
    "quick": true,
    "name": "Soupe + œufs durs",
    "emoji": "🍲",
    "kcal": 350,
    "p": 18,
    "desc": "Léger, parfait après une grosse journée.",
    "ingredients": [
      "gros bol de soupe de légumes maison",
      "2 œufs durs",
      "1 tranche de pain complet"
    ],
    "steps": [
      "Réchauffe la soupe.",
      "Sers avec œufs durs + pain."
    ]
  },
  {
    "id": "idea-shakefruit",
    "cat": "snack",
    "quick": true,
    "name": "Shake amande & fruit",
    "emoji": "🥤",
    "kcal": 330,
    "p": 31,
    "desc": "Le coup de fouet protéiné.",
    "ingredients": [
      "1 dose d'All-in-One ou Vegan Protein",
      "250 ml de lait d'amande",
      "1 banane ou fruits rouges"
    ],
    "steps": [
      "Mets tout au shaker ou au blender.",
      "Mixe/secoue."
    ]
  },
  {
    "id": "idea-skyrnoix",
    "cat": "snack",
    "quick": true,
    "name": "Skyr soja & noix",
    "emoji": "🥜",
    "kcal": 230,
    "p": 16,
    "desc": "Crémeux + croquant.",
    "ingredients": [
      "150 g de skyr/yaourt soja protéiné",
      "une petite poignée de noix",
      "un filet de miel (option)"
    ],
    "steps": [
      "Mélange.",
      "Ajoute les noix au moment de manger."
    ]
  },
  {
    "id": "idea-houmous",
    "cat": "snack",
    "quick": true,
    "name": "Houmous & crudités",
    "emoji": "🥕",
    "kcal": 180,
    "p": 6,
    "desc": "À grignoter, plein de fibres.",
    "ingredients": [
      "2 c. à soupe de houmous",
      "bâtonnets de carotte, concombre, poivron"
    ],
    "steps": [
      "Coupe les crudités.",
      "Trempe."
    ]
  },
  {
    "id": "idea-houmous-rouge",
    "cat": "snack",
    "quick": true,
    "name": "Houmous de haricots rouges maison",
    "emoji": "🫘",
    "kcal": 250,
    "p": 8,
    "desc": "Ta recette (fait ~4 portions). Riche en bon gras : pour alléger, descends l'huile d'olive à 1 c. à soupe et rallonge à l'eau/aquafaba (~190 kcal/portion).",
    "ingredients": [
      "300 g de haricots rouges cuits",
      "3 c. à soupe de tahini",
      "3 c. à soupe d'huile d'olive (1 suffit pour alléger)",
      "1/2 citron pressé",
      "sel, poivre"
    ],
    "steps": [
      "Mixe tout jusqu'à consistance lisse.",
      "Ajoute un peu d'eau ou d'aquafaba (jus de la boîte) si trop épais.",
      "Rectifie sel et citron. Sers avec des crudités."
    ]
  },
  {
    "id": "idea-clearbarre",
    "cat": "snack",
    "quick": true,
    "name": "Clear Vegan & barre",
    "emoji": "🍫",
    "kcal": 270,
    "p": 32,
    "desc": "Très protéiné, faible en gras.",
    "ingredients": [
      "1 dose de Clear Vegan à l'eau glacée",
      "1 barre gourmet vegane Bulk"
    ],
    "steps": [
      "Prépare la Clear bien froide.",
      "Accompagne de la barre."
    ]
  },
  {
    "id": "idea-porridge",
    "cat": "pdj",
    "name": "Porridge protéiné chaud",
    "emoji": "🥣",
    "kcal": 400,
    "p": 35,
    "desc": "Chaud et réconfortant les matins d'hiver.",
    "ingredients": [
      "40 g de flocons d'avoine",
      "250 ml de lait d'amande",
      "1 dose de Vegan Protein",
      "1/2 banane en rondelles",
      "cannelle"
    ],
    "steps": [
      "Cuis flocons + lait 3-4 min en remuant.",
      "Hors du feu, incorpore la protéine.",
      "Garnis de banane et cannelle."
    ]
  },
  {
    "id": "idea-chia",
    "cat": "pdj",
    "quick": true,
    "name": "Chia pudding amande",
    "emoji": "🍮",
    "kcal": 300,
    "p": 20,
    "desc": "Se prépare la veille, ultra rassasiant.",
    "ingredients": [
      "30 g de graines de chia",
      "250 ml de lait d'amande",
      "1/2 dose de Vegan Protein",
      "fruits rouges"
    ],
    "steps": [
      "Mélange chia + lait + protéine.",
      "Repos une nuit au frigo.",
      "Ajoute les fruits au matin."
    ]
  },
  {
    "id": "idea-toastoeuf",
    "cat": "pdj",
    "quick": true,
    "name": "Toast œuf-avocat",
    "emoji": "🥑",
    "kcal": 430,
    "p": 20,
    "desc": "Le brunch express, bon gras maîtrisé.",
    "ingredients": [
      "2 tranches de pain complet",
      "1/2 avocat",
      "2 œufs pochés ou au plat",
      "citron, piment"
    ],
    "steps": [
      "Toaste le pain, écrase l'avocat dessus.",
      "Cuis les œufs.",
      "Pose-les sur le toast, citron + piment."
    ]
  },
  {
    "id": "idea-dahl",
    "cat": "dej",
    "name": "Dahl de lentilles corail",
    "emoji": "🍛",
    "kcal": 520,
    "p": 22,
    "desc": "Épicé, réconfortant, peu de gras.",
    "ingredients": [
      "80 g de lentilles corail (crues)",
      "150 ml de lait de coco allégé",
      "tomate, oignon, épices (curcuma, cumin)",
      "60 g de riz basmati (cru) cuit"
    ],
    "steps": [
      "Fais revenir oignon + épices.",
      "Ajoute lentilles, tomate, coco, mijote 15 min.",
      "Sers sur le riz."
    ]
  },
  {
    "id": "idea-poke",
    "cat": "dej",
    "quick": true,
    "name": "Poke bowl tofu",
    "emoji": "🍣",
    "kcal": 480,
    "p": 28,
    "desc": "Frais, façon hawaïen.",
    "ingredients": [
      "80 g de riz (cru) cuit",
      "120 g de tofu fumé en dés",
      "edamame",
      "concombre, carotte, oignon rouge",
      "sauce soja + sésame"
    ],
    "steps": [
      "Dispose le riz tiède dans un bol.",
      "Ajoute tofu, edamame et crudités.",
      "Nappe de sauce, parsème de sésame."
    ]
  },
  {
    "id": "idea-chili",
    "cat": "dej",
    "name": "Chili sin carne",
    "emoji": "🫘",
    "kcal": 520,
    "p": 32,
    "desc": "Avec haché végétal et haricots rouges.",
    "ingredients": [
      "150 g de haricots rouges",
      "100 g de haché végétal (Garden Gourmet)",
      "tomate concassée, poivron, épices chili",
      "60 g de riz (cru) cuit"
    ],
    "steps": [
      "Fais revenir haché + poivron.",
      "Ajoute tomate, haricots, épices, mijote 15 min.",
      "Sers avec le riz."
    ]
  },
  {
    "id": "idea-pates",
    "cat": "diner",
    "name": "Pâtes complètes & boulettes La Vie",
    "emoji": "🍝",
    "kcal": 520,
    "p": 28,
    "desc": "Le confort food protéiné.",
    "ingredients": [
      "80 g de pâtes complètes (crues)",
      "boulettes La Vie",
      "sauce tomate basilic",
      "parmesan végétal (option)"
    ],
    "steps": [
      "Cuis les pâtes.",
      "Réchauffe boulettes dans la sauce tomate.",
      "Mélange et sers."
    ]
  },
  {
    "id": "idea-shakshuka",
    "cat": "diner",
    "name": "Shakshuka",
    "emoji": "🥘",
    "kcal": 400,
    "p": 22,
    "desc": "Œufs pochés dans une sauce tomate-poivron.",
    "ingredients": [
      "3 œufs",
      "tomate concassée, poivron, oignon",
      "cumin, paprika",
      "1 tranche de pain complet"
    ],
    "steps": [
      "Mijote tomate + poivron + épices.",
      "Casse les œufs dedans, couvre 5-6 min.",
      "Sers avec le pain pour saucer."
    ]
  },
  {
    "id": "idea-tofuwok",
    "cat": "diner",
    "name": "Tofu teriyaki & riz sauté légumes",
    "emoji": "🍚",
    "kcal": 480,
    "p": 24,
    "desc": "Vite fait au wok.",
    "ingredients": [
      "150 g de tofu teriyaki La Vie",
      "80 g de riz (cru) cuit",
      "wok de légumes (poivron, brocoli, petits pois)",
      "sauce soja"
    ],
    "steps": [
      "Saute les légumes au wok.",
      "Ajoute le riz cuit et le tofu, fais sauter.",
      "Déglace à la sauce soja."
    ]
  },
  {
    "id": "idea-edamame",
    "cat": "snack",
    "quick": true,
    "name": "Edamame vapeur",
    "emoji": "🫛",
    "kcal": 190,
    "p": 17,
    "desc": "Le snack le plus protéiné qui soit.",
    "ingredients": [
      "150 g d'edamame (dans la cosse)",
      "sel, ou un peu de piment"
    ],
    "steps": [
      "Cuis 5 min à la vapeur ou à l'eau bouillante.",
      "Sale et déguste en pressant les cosses."
    ]
  },
  {
    "id": "idea-mugcake",
    "cat": "snack",
    "quick": true,
    "name": "Mug cake protéiné",
    "emoji": "🧁",
    "kcal": 220,
    "p": 28,
    "desc": "Dessert chaud en 1 min au micro-ondes.",
    "ingredients": [
      "1 dose de Vegan Protein (chocolat)",
      "1 c. à soupe de cacao",
      "1/2 banane écrasée",
      "1 blanc d'œuf",
      "1/2 c. à café de levure"
    ],
    "steps": [
      "Mélange tout dans un mug.",
      "Micro-ondes 1 min.",
      "Laisse tiédir 1 min avant de manger."
    ]
  },
  {
    "id": "idea-pommePB",
    "cat": "snack",
    "quick": true,
    "name": "Pomme & purée de cacahuète",
    "emoji": "🍎",
    "kcal": 180,
    "p": 4,
    "desc": "Sucré-salé, croquant.",
    "ingredients": [
      "1 pomme en quartiers",
      "1 c. à soupe de purée de cacahuète"
    ],
    "steps": [
      "Coupe la pomme.",
      "Trempe dans la purée de cacahuète."
    ]
  },
  {
    "id": "idea-orangetofu",
    "cat": "diner",
    "name": "Tofu croustillant à l'orange",
    "emoji": "🍊",
    "kcal": 480,
    "p": 26,
    "desc": "Inspirée de The Conscious Plant Kitchen. Croustillant dehors, sauce orange acidulée.",
    "ingredients": [
      "200 g de tofu ferme en cubes",
      "1 c. à soupe de maïzena",
      "le jus d'1 orange",
      "2 c. à soupe de sauce soja",
      "1 c. à café de sirop d'érable",
      "ail + gingembre râpés",
      "60 g de riz (cru) cuit"
    ],
    "steps": [
      "Presse le tofu, enrobe les cubes de maïzena.",
      "Dore-les à la poêle (peu d'huile) ou à l'airfryer jusqu'à croustillant.",
      "Fais réduire jus d'orange + soja + sirop + ail/gingembre 3 min.",
      "Enrobe le tofu de sauce, sers sur le riz."
    ]
  },
  {
    "id": "idea-szechuan",
    "cat": "diner",
    "name": "Tofu Szechuan",
    "emoji": "🌶️",
    "kcal": 500,
    "p": 28,
    "desc": "Inspirée de The Conscious Plant Kitchen. Relevé, vite fait au wok.",
    "ingredients": [
      "200 g de tofu ferme en cubes",
      "1 poivron + oignon",
      "sauce : soja, vinaigre de riz, ail, piment, pointe de sucre",
      "60 g de riz (cru) cuit"
    ],
    "steps": [
      "Dore le tofu jusqu'à croustillant.",
      "Saute poivron + oignon au wok.",
      "Ajoute le tofu et la sauce, fais glacer 2 min.",
      "Sers sur le riz."
    ]
  },
  {
    "id": "idea-bolo",
    "cat": "diner",
    "name": "Bolognaise végétale aux lentilles",
    "emoji": "🍝",
    "kcal": 520,
    "p": 24,
    "desc": "Inspirée de The Conscious Plant Kitchen. La bolo réconfortante, sans viande.",
    "ingredients": [
      "150 g de lentilles vertes cuites",
      "carotte + oignon + céleri hachés",
      "tomate concassée + herbes",
      "80 g de pâtes complètes (crues)"
    ],
    "steps": [
      "Fais revenir carotte, oignon, céleri.",
      "Ajoute lentilles, tomate, herbes, mijote 20 min.",
      "Cuis les pâtes, mélange."
    ]
  },
  {
    "id": "idea-hpsalad",
    "cat": "dej",
    "quick": true,
    "name": "Salade vegan hyper-protéinée",
    "emoji": "🥗",
    "kcal": 450,
    "p": 35,
    "desc": "Inspirée de The Conscious Plant Kitchen. Le combo edamame + pois chiches + tofu.",
    "ingredients": [
      "80 g d'edamame",
      "100 g de pois chiches",
      "80 g de tofu fumé en dés",
      "crudités + graines de courge",
      "sauce tahini + citron + eau"
    ],
    "steps": [
      "Assemble edamame, pois chiches, tofu et crudités.",
      "Émulsionne tahini + citron + un peu d'eau.",
      "Nappe, parsème de graines."
    ]
  },
  {
    "id": "idea-bbburger",
    "cat": "dej",
    "name": "Burger patate douce & haricots noirs",
    "emoji": "🍔",
    "kcal": 430,
    "p": 18,
    "desc": "Inspirée de The Conscious Plant Kitchen. Galette maison moelleuse.",
    "ingredients": [
      "1 petite patate douce cuite écrasée",
      "150 g de haricots noirs écrasés",
      "3 c. à soupe de flocons d'avoine",
      "épices (cumin, paprika, ail)",
      "1 pain à burger complet + crudités"
    ],
    "steps": [
      "Mélange patate douce, haricots, flocons et épices.",
      "Forme une galette, cuis 5 min par face à la poêle.",
      "Sers dans le pain avec des crudités."
    ]
  },
  {
    "id": "idea-teriyaki",
    "cat": "diner",
    "name": "Nouilles teriyaki & edamame",
    "emoji": "🍜",
    "kcal": 480,
    "p": 22,
    "desc": "Inspirée de The Conscious Plant Kitchen. Rapide et gourmand.",
    "ingredients": [
      "80 g de nouilles (crues) cuites",
      "80 g d'edamame",
      "tofu teriyaki La Vie",
      "légumes (poivron, carotte, oignon vert)",
      "sauce teriyaki (soja, sirop, ail, gingembre)"
    ],
    "steps": [
      "Cuis les nouilles.",
      "Saute légumes + tofu, ajoute edamame.",
      "Ajoute nouilles + sauce, fais glacer 2 min."
    ]
  },
  {
    "id": "idea-peanutnoodles",
    "cat": "diner",
    "name": "Nouilles crémeuses cacahuète & tofu",
    "emoji": "🥜",
    "kcal": 540,
    "p": 26,
    "desc": "Inspirée de The Conscious Plant Kitchen. Sauce satay onctueuse.",
    "ingredients": [
      "80 g de nouilles (crues) cuites",
      "120 g de tofu fumé",
      "sauce : purée de cacahuète, soja, citron vert, ail, eau",
      "crudités râpées (carotte, chou)"
    ],
    "steps": [
      "Cuis les nouilles.",
      "Dore le tofu.",
      "Mélange nouilles + tofu + sauce cacahuète, parsème de crudités."
    ]
  },
  {
    "id": "idea-broccolipasta",
    "cat": "diner",
    "name": "Pâtes crémeuses au brocoli",
    "emoji": "🥦",
    "kcal": 470,
    "p": 18,
    "desc": "Inspirée de The Conscious Plant Kitchen. Sauce veloutée sans crème.",
    "ingredients": [
      "80 g de pâtes complètes (crues)",
      "1 gros brocoli",
      "ail, levure maltée",
      "un peu de lait d'amande pour lier"
    ],
    "steps": [
      "Cuis pâtes + brocoli ensemble.",
      "Mixe une partie du brocoli avec ail, levure maltée et lait d'amande.",
      "Mélange la sauce aux pâtes."
    ]
  },
  {
    "id": "idea-enchiladas",
    "cat": "diner",
    "name": "Enchiladas haricots noirs",
    "emoji": "🫔",
    "kcal": 450,
    "p": 18,
    "desc": "Inspirée de The Conscious Plant Kitchen. Roulées et gratinées.",
    "ingredients": [
      "2 tortillas complètes",
      "150 g de haricots noirs",
      "maïs + poivron",
      "sauce tomate épicée",
      "fromage râpé (option)"
    ],
    "steps": [
      "Garnis les tortillas de haricots, maïs, poivron.",
      "Roule-les dans un plat, nappe de sauce tomate.",
      "Gratine 15 min au four."
    ]
  },
  {
    "id": "idea-orangecauli",
    "cat": "diner",
    "name": "Chou-fleur croustillant à l'orange",
    "emoji": "🍊",
    "kcal": 380,
    "p": 10,
    "desc": "Inspirée de The Conscious Plant Kitchen. La version légumes du tofu à l'orange.",
    "ingredients": [
      "1 chou-fleur en bouquets",
      "1 c. à soupe de maïzena",
      "sauce orange (jus d'orange, soja, ail, sirop)",
      "60 g de riz (cru) cuit"
    ],
    "steps": [
      "Enrobe le chou-fleur de maïzena, rôtis au four 25 min.",
      "Réduis la sauce orange.",
      "Enrobe et sers sur le riz."
    ]
  },
  {
    "id": "idea-oatrolls",
    "cat": "pdj",
    "name": "Petits pains à l'avoine",
    "emoji": "🍞",
    "kcal": 120,
    "p": 6,
    "desc": "Inspirée de The Conscious Plant Kitchen. 6 g de protéines, 12 g de fibres, sans œuf. (par petit pain)",
    "ingredients": [
      "flocons d'avoine mixés",
      "yaourt soja",
      "levure + sel",
      "graines (option)"
    ],
    "steps": [
      "Mélange avoine + yaourt + levure en pâte.",
      "Forme des petits pains.",
      "Cuis 30 min au four à 180°C."
    ]
  },
  {
    "id": "idea-bananabars",
    "cat": "snack",
    "name": "Barres avoine, banane & yaourt soja",
    "emoji": "🍌",
    "kcal": 150,
    "p": 5,
    "desc": "Inspirée de The Conscious Plant Kitchen. 4 ingrédients, à emporter.",
    "ingredients": [
      "2 bananes écrasées",
      "150 g de yaourt soja",
      "120 g de flocons d'avoine",
      "pépites ou fruits secs (option)"
    ],
    "steps": [
      "Mélange tout.",
      "Étale dans un moule.",
      "Cuis 30-35 min à 180°C, coupe en barres."
    ]
  },
  {
    "id": "idea-kombuchacake",
    "cat": "snack",
    "name": "Gâteau au kombucha (plaisir)",
    "emoji": "🍰",
    "kcal": 250,
    "p": 3,
    "desc": "Inspirée de The Conscious Plant Kitchen. 4 ingrédients. Plaisir occasionnel : c'est un gâteau, le kombucha ne sert qu'à lever la pâte. (par part)",
    "ingredients": [
      "farine à levée incorporée (ou farine + levure)",
      "sucre",
      "kombucha (saveur fruits rouges ou citron)",
      "huile neutre ou margarine fondue"
    ],
    "steps": [
      "Mélange farine + sucre, verse kombucha + huile.",
      "Remue en pâte lisse, verse dans un moule.",
      "Cuis ~50 min à 180°C. Laisse refroidir avant de couper."
    ]
  },
  {
    "id": "idea-taboule",
    "cat": "dej",
    "quick": true,
    "name": "Taboulé sucré-salé tomates & abricots rôtis",
    "emoji": "🍅",
    "kcal": 400,
    "p": 14,
    "desc": "Inspirée de Recettes de Julie. Frais et original. J'ai ajouté des pois chiches pour les protéines.",
    "ingredients": [
      "60 g de semoule ou boulgour (cru) cuit",
      "tomates + abricots rôtis",
      "100 g de pois chiches",
      "menthe, citron, filet d'huile d'olive"
    ],
    "steps": [
      "Cuis la semoule.",
      "Rôtis tomates et abricots 15 min.",
      "Mélange avec pois chiches, menthe et citron."
    ]
  },
  {
    "id": "idea-nicecream",
    "cat": "snack",
    "quick": true,
    "name": "Nicecream banane-kiwi",
    "emoji": "🍦",
    "kcal": 150,
    "p": 4,
    "desc": "Inspirée de Recettes de Julie. Glace minute sans sucre ajouté. Une dose de protéine la transforme en dessert protéiné.",
    "ingredients": [
      "2 bananes congelées en rondelles",
      "1 kiwi",
      "option : 1/2 dose de Vegan Protein",
      "un filet de lait d'amande"
    ],
    "steps": [
      "Mixe bananes congelées + kiwi (+ protéine si tu veux).",
      "Ajoute un peu de lait d'amande pour la texture.",
      "Sers aussitôt."
    ]
  },
  {
    "id": "idea-concoyaourt",
    "cat": "snack",
    "quick": true,
    "name": "Salade concombre au yaourt soja",
    "emoji": "🥒",
    "kcal": 120,
    "p": 8,
    "desc": "Inspirée de Recettes de Julie (yaourt soja à la place du grec). Fraîche et protéinée pour quasi rien.",
    "ingredients": [
      "1 concombre",
      "150 g de yaourt soja nature",
      "ail, menthe, citron",
      "sel, poivre"
    ],
    "steps": [
      "Coupe le concombre.",
      "Mélange yaourt soja + ail + menthe + citron.",
      "Assaisonne et sers bien frais."
    ]
  },
  {
    "id": "idea-epeautre",
    "cat": "dej",
    "name": "Salade de petit épeautre",
    "emoji": "🌾",
    "kcal": 450,
    "p": 16,
    "desc": "Inspirée de Recettes de Julie. Grains + légumes + fromage ou tofu.",
    "ingredients": [
      "70 g de petit épeautre (cru) cuit",
      "tomates cerises, concombre, poivron",
      "feta ou tofu fumé en dés",
      "herbes, citron, filet d'huile d'olive"
    ],
    "steps": [
      "Cuis le petit épeautre.",
      "Mélange avec les légumes et le fromage/tofu.",
      "Assaisonne citron + herbes."
    ]
  },
  {
    "id": "idea-crepescitron",
    "cat": "pdj",
    "name": "Crêpes citron & graines de pavot",
    "emoji": "🍋",
    "kcal": 300,
    "p": 10,
    "desc": "Inspirée de Recettes de Julie. Au lait d'amande.",
    "ingredients": [
      "80 g de farine",
      "250 ml de lait d'amande",
      "1 œuf",
      "zeste de citron + graines de pavot"
    ],
    "steps": [
      "Mélange farine, lait d'amande, œuf, citron, pavot.",
      "Cuis les crêpes à la poêle.",
      "Garnis léger : fruits ou filet de sirop."
    ]
  },
  {
    "id": "idea-pastapestoskyr",
    "cat": "dej",
    "name": "Pâtes pesto au skyr, asperges & brocolis",
    "emoji": "🍝",
    "kcal": 480,
    "p": 22,
    "desc": "Inspirée de Recettes de Julie. Le crémeux du pesto sans crème, grâce au skyr soja. Healthy et protéiné.",
    "ingredients": [
      "80 g de pâtes (crues) cuites",
      "asperges + brocolis sautés",
      "2 c. à soupe de pesto",
      "150 g de skyr/yaourt soja épais",
      "citron"
    ],
    "steps": [
      "Cuis les pâtes, saute asperges et brocolis.",
      "Hors du feu, mélange pesto + skyr soja.",
      "Lie le tout, citron et poivre."
    ]
  },
  {
    "id": "idea-oeufscocotte",
    "cat": "dej",
    "name": "Œufs cocotte aux asperges",
    "emoji": "🍳",
    "kcal": 280,
    "p": 16,
    "desc": "Inspirée de Recettes de Julie. Au four, protéiné et rapide.",
    "ingredients": [
      "2 œufs",
      "asperges vertes",
      "un peu de fromage",
      "sel, poivre"
    ],
    "steps": [
      "Dispose asperges + fromage dans un ramequin.",
      "Casse les œufs dessus.",
      "Cuis 12-15 min au four à 180°C."
    ]
  },
  {
    "id": "idea-orzopc",
    "cat": "dej",
    "name": "Orzo pesto, asperges & pois chiches",
    "emoji": "🍲",
    "kcal": 470,
    "p": 18,
    "desc": "Inspirée de Recettes de Julie. Prêt en 15 min.",
    "ingredients": [
      "80 g d'orzo (cru) cuit",
      "100 g de pois chiches",
      "asperges vertes",
      "2 c. à soupe de pesto"
    ],
    "steps": [
      "Cuis l'orzo.",
      "Saute asperges + pois chiches.",
      "Mélange avec le pesto."
    ]
  },
  {
    "id": "idea-curryasperges",
    "cat": "diner",
    "name": "Curry d'asperges vertes & riz",
    "emoji": "🍛",
    "kcal": 430,
    "p": 10,
    "desc": "Inspirée de Recettes de Julie. Vegan, doux au lait de coco. Ajoute du tofu pour les protéines.",
    "ingredients": [
      "asperges vertes",
      "150 ml de lait de coco allégé",
      "pâte de curry",
      "60 g de riz (cru) cuit",
      "option : tofu"
    ],
    "steps": [
      "Fais revenir la pâte de curry.",
      "Ajoute asperges + coco, mijote 10 min.",
      "Sers sur le riz."
    ]
  },
  {
    "id": "idea-quinoafraise",
    "cat": "dej",
    "name": "Salade quinoa, fraises & balsamique",
    "emoji": "🍓",
    "kcal": 400,
    "p": 12,
    "desc": "Inspirée de Recettes de Julie. Sucrée-salée, vegan.",
    "ingredients": [
      "80 g de quinoa (cru) cuit",
      "fraises",
      "roquette",
      "réduction de balsamique",
      "graines"
    ],
    "steps": [
      "Cuis le quinoa, laisse refroidir.",
      "Mélange avec fraises et roquette.",
      "Arrose de balsamique, parsème de graines."
    ]
  },
  {
    "id": "idea-coleslaw",
    "cat": "snack",
    "quick": true,
    "name": "Coleslaw au skyr",
    "emoji": "🥗",
    "kcal": 150,
    "p": 8,
    "desc": "Inspirée de Recettes de Julie. Sauce skyr soja au lieu de mayo : léger et protéiné.",
    "ingredients": [
      "chou + carotte râpés",
      "150 g de skyr/yaourt soja",
      "moutarde, citron, sel",
      "ciboulette"
    ],
    "steps": [
      "Râpe chou et carotte.",
      "Mélange skyr soja + moutarde + citron.",
      "Lie et laisse reposer 10 min."
    ]
  },
  {
    "id": "idea-jusvert",
    "cat": "snack",
    "quick": true,
    "name": "Jus vert concombre-kiwi-gingembre",
    "emoji": "🥬",
    "kcal": 90,
    "p": 2,
    "desc": "Inspirée de Recettes de Julie. Rafraîchissant et peu calorique — mais c'est un jus : peu de fibres, zéro protéine. Un plaisir hydratant, pas un repas.",
    "ingredients": [
      "1 concombre",
      "1 kiwi",
      "un morceau de gingembre",
      "citron"
    ],
    "steps": [
      "Passe le tout à l'extracteur (ou mixe puis filtre).",
      "Sers bien frais."
    ]
  }
];
