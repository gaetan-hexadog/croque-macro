import React from "react";
import { Sprout, Target, MessageCircle, Salad } from "lucide-react";
import { C, cardStyle, TODAY, fmtFull, coachSignals, coachGreeting } from "../core.js";

// ════════════════════════════════════════════════════════════════════════════
//  PANNEAU COACH — fusionné EN HAUT de l'écran Suivi (plus d'onglet dédié).
//  Couche « voix du coach » qui complète ProgressScreen SANS le dupliquer :
//  ProgressScreen montre la donnée (Δ poids, X/7, chips macro, courbe, bilan) ;
//  ce panneau ajoute le DÉTAIL coaché + le focus de la semaine + l'anti-routine
//  + l'entrée conversationnelle. Ton = compagnon bienveillant.
// ════════════════════════════════════════════════════════════════════════════

const CoachHead = ({ size = 40 }) => (
  <span className="flex shrink-0 items-center justify-center rounded-full" style={{ width: size, height: size, background: `linear-gradient(140deg, ${C.green}, ${C.weight})`, color: "#0c0a08" }}><Sprout size={Math.round(size * 0.52)} /></span>
);

export function CoachPanel({ days = {}, weights = {}, settings = {}, onCoachPrompt, onOpenChat }) {
  const cs = coachSignals({ days, weights, settings, refISO: TODAY });
  const greeting = coachGreeting(cs.hour);
  const wc = cs.week;
  const rank = { alert: 0, nudge: 1, reassure: 2, win: 3, info: 4 };
  const sorted = cs.signals.slice().sort((a, b) => (rank[a.tone] ?? 5) - (rank[b.tone] ?? 5));
  const variety = sorted.find((s) => s.kind === "variety");
  const protLate = sorted.find((s) => s.id === "prot-late");
  const focus = variety ? "Varier les protéines végétales & tenir le déficit en douceur"
    : protLate ? "Soigner les protéines chaque jour, sans forcer la poudre"
      : wc?.tone === "behind" ? "Revenir tranquillement dans ton plan cette semaine"
        : "Tenir le cap en douceur — la régularité, pas la perfection";
  const read = wc?.detail || "Logue quelques jours et je te fais un vrai point sur ta semaine.";

  return (
    <section className="rounded-3xl p-4 cm-card" style={cardStyle({ background: `linear-gradient(160deg, ${C.green}22, ${C.weight}10)` })}>
      <div className="flex items-center gap-3">
        <CoachHead />
        <div className="min-w-0">
          <p className="text-base font-bold leading-tight" style={{ color: C.ink }}>{greeting}</p>
          <p className="mt-0.5 text-[12px] capitalize" style={{ color: C.sub }}>{fmtFull(TODAY)}</p>
        </div>
      </div>

      <p className="mt-3 text-[13px] leading-snug" style={{ color: C.ink }}>{read}</p>

      <div className="mt-3 flex items-start gap-2 rounded-2xl p-3" style={{ backgroundColor: `${C.green}14`, border: `1px solid ${C.green}33` }}>
        <Target size={15} color={C.green} className="mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: C.green }}>Focus de la semaine</p>
          <p className="mt-0.5 text-[13px] leading-snug" style={{ color: C.ink }}>{focus}.</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {variety && (
          <button onClick={() => onCoachPrompt(variety.chip.prompt)} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95" style={{ backgroundColor: `${C.extra}1f`, color: C.extra, border: `1px solid ${C.extra}40` }}><Salad size={13} /> {variety.chip.label}</button>
        )}
        <button onClick={onOpenChat} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold active:scale-95" style={{ background: `linear-gradient(140deg, ${C.green}, ${C.weight})`, color: "#0c0a08" }}><MessageCircle size={13} /> Parler à mon coach</button>
      </div>
    </section>
  );
}
