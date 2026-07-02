import { C } from "../core.js";

// ════════════════════════════════════════════════════════════════════════════
// theme.js — thème visuel de la section Sport (issu du design-lab).
// Deux « variantes » de rendu :
//   • timer : chaleureux, aplats de couleur, accent bleu — dérivé du thème app `C`
//     (donc suit clair/sombre). Utilisé pour le HUB et, en thème « Timer vivant »,
//     aussi en séance (écrans colorés type ColorStage actuels).
//   • gym : noir profond + accent néon, typo massive, MAJUSCULES — ultra-lisible
//     sous l'effort. Utilisé en séance (hybride) et partout en thème « Contraste brut ».
//
// Réglage `sport.sportTheme` : "hybride" (défaut) | "timer" | "gym".
// `kind` = "hub" (accueil/aperçu/récap/coach/détail/réglages) | "session" (plein écran).
//   hybride → hub=timer, session=gym · timer → tout=timer · gym → tout=gym
// ════════════════════════════════════════════════════════════════════════════

export const SPORT_FONT = "'Space Grotesk', system-ui";
const NEON = "#c6ff3d";  // effort / accent (chaud)
const CYAN = "#59d3ff";  // phases calmes (froid) — jamais confondre avec l'effort
const GYM_BG = "#08070a";

export const SPORT_THEMES = [
  { id: "hybride", name: "Hybride", desc: "Chaud au repos, contrasté en séance", reco: true },
  { id: "timer", name: "Timer vivant", desc: "Aplats de couleur, chaleureux partout" },
  { id: "gym", name: "Contraste brut", desc: "Noir + néon, ultra-lisible en séance" },
];

// Variante de rendu effective pour (thème, type d'écran).
export function sportVariant(sportTheme = "hybride", kind = "hub") {
  if (sportTheme === "gym") return "gym";
  if (sportTheme === "timer") return "timer";
  return kind === "session" ? "gym" : "timer"; // hybride
}

// Jeu de tokens résolu. Lit `C` au moment de l'appel → suit le thème clair/sombre.
export function sportTokens(sportTheme = "hybride", kind = "hub") {
  const variant = sportVariant(sportTheme, kind);
  if (variant === "gym") {
    return {
      variant, kind, font: SPORT_FONT, uppercase: true,
      surface: GYM_BG, panel: "rgba(255,255,255,0.05)", line: "rgba(255,255,255,0.12)",
      ink: "#ffffff", sub: "rgba(255,255,255,0.6)", muted: "rgba(255,255,255,0.4)",
      accent: NEON, effort: NEON, rest: CYAN, warm: CYAN, good: NEON,
      onAccent: GYM_BG, onField: GYM_BG,
    };
  }
  // timer : dérivé du thème app (clair/sombre), accent bleu « sport ».
  return {
    variant, kind, font: SPORT_FONT, uppercase: false,
    surface: C.bg, panel: C.card, line: C.line,
    ink: C.ink, sub: C.sub, muted: C.muted,
    accent: C.weight, effort: C.protein, rest: C.weight, warm: C.weight, good: C.green,
    onAccent: "#ffffff", onField: "#ffffff",
  };
}

// Tokens pour les bottom-sheets (modales) de la section Sport. En "gym" → sombre/néon ;
// sinon dérivé de l'app `C` (aucun changement). Consommé par <Sheet tokens={...}>.
export function sheetTokens(sportTheme = "hybride") {
  if (sportVariant(sportTheme, "hub") === "gym") {
    return {
      variant: "gym", overlay: "rgba(0,0,0,0.72)", sheet: "#14121a", shadow: "rgba(0,0,0,0.85)",
      paper: "#0f0d14", card: "rgba(255,255,255,0.06)", line: "rgba(255,255,255,0.12)",
      ink: "#ffffff", sub: "rgba(255,255,255,0.62)", muted: "rgba(255,255,255,0.4)",
      accent: "#c6ff3d", good: "#c6ff3d", over: "#ff6a4d", onAccent: "#08070a",
    };
  }
  return {
    variant: "timer", overlay: C.overlay, sheet: C.sheet, shadow: C.shadow,
    paper: C.paper, card: C.card, line: C.line,
    ink: C.ink, sub: C.sub, muted: C.muted,
    accent: C.accent, good: C.green, over: C.over, onAccent: "#ffffff",
  };
}
