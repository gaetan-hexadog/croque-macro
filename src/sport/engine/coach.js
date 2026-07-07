// engine/coach.js — coach sportif (chat dédié) : prompt système + ouverture proactive.
// Réutilise l'infra assistant (ChatSheet + Edge Function). Le front compose le
// contexte sport (programme, semaine, force, matériel, historique) ; la function
// ajoute la clé API. Style calqué sur le coach nutrition mais orienté entraînement.
import { SESSIONS } from "../config/programs/fullbody14.v1.js";
import { DEFAULT_EQUIPMENT } from "../config/alternatives.js";
import { getCurrentBlock } from "./blocks.js";
import { strengthTrend } from "./analytics.js";

export function buildSportCoachSystem(sport = {}, workouts = {}, week = 1) {
  const block = getCurrentBlock(week) || {};
  const trend = strengthTrend(workouts);
  const done = Object.values(workouts || {}).filter((e) => e?.completed).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 4);
  const recent = done.map((e) => { const s = SESSIONS[e.sessionId]; return `S${e.week} ${s ? s.name : e.sessionId}${e.feel ? ` (ressenti ${e.feel}/5)` : ""}`; }).join(" · ") || "aucune récente";
  const trendTxt = trend ? (trend.direction === "up" ? "en hausse" : trend.direction === "down" ? "en baisse" : "stable") : "pas encore mesurée";
  const eq = { ...DEFAULT_EQUIPMENT, ...(sport.equipment || {}) };
  const kb = [eq.kb12 && "2×12", eq.kb16 && "1×16"].filter(Boolean).join(" + ") || "aucun";
  return [
    "Tu es le COACH SPORTIF de Bob dans l'app Croque·Macro. Réponds en FRANÇAIS, tutoiement, ton direct et concret, sans blabla ni flatterie. Réponses courtes (2-5 phrases), pratiques et actionnables.",
    "PROFIL : homme 42 ans, 1,86 m, ~91 kg. Objectif : perte de gras + renforcement du haut du corps. La nutrition (~1950 kcal / 175 g protéines) est gérée par un AUTRE coach — n'en parle pas sauf demande explicite, et renvoie-y le cas échéant.",
    `PROGRAMME : 14 semaines, full-body + cardio, 3 séances/sem. A = force full body (mardi), B = cardio intervalles (jeudi), C = force + cardio (samedi). Actuellement SEMAINE ${week}, phase « ${block.phase || "?"} ». Charges de référence : standard ${block.standard} kg, lourd ${block.heavy} kg (la charge progresse seule selon le programme et tes retours).`,
    `MATÉRIEL : barre + disques, kettlebells (${kb}), rameur, corde à sauter. Kettlebells 14 kg prévus plus tard.`,
    `FORCE récente : ${trendTxt}. Dernières séances : ${recent}.`,
    "TON RÔLE : plateaux, courbatures/récup, technique d'exercice, adaptation (peu de matériel / peu de temps / fatigue), motivation. Tu peux proposer d'alléger, raccourcir ou remplacer un exercice. Appuie-toi sur le programme et l'historique ci-dessus. Si un point est ambigu, pose UNE question de précision.",
  ].join("\n\n");
}

export function sportCoachOpening(sport = {}, workouts = {}, week = 1) {
  const trend = strengthTrend(workouts);
  const block = getCurrentBlock(week) || {};
  const tline = trend ? (trend.direction === "up" ? "Ta force monte 💪" : trend.direction === "down" ? "Ta force fatigue un peu ces temps-ci." : "Ta force est stable.") : "On manque encore de données pour ta courbe de force.";
  return {
    greeting: "Salut, c'est ton coach sport 👋",
    bubbles: [`Semaine ${week}, phase « ${block.phase || "?"} ». ${tline} Dis-moi ce qui coince ou ce que tu veux ajuster.`],
    chips: [
      "Je suis courbaturé, je fais quoi ?",
      "Adapte ma séance, j'ai peu de temps",
      "Un exercice me fait mal",
      "Comment casser mon plateau ?",
    ],
  };
}
