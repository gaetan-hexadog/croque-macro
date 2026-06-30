import React from "react";
import { Sprout, Target, MessageCircle, Salad } from "lucide-react";
import { C, cardStyle, TODAY, fmtFull, coachSignals, coachGreeting } from "../core.js";

// ════════════════════════════════════════════════════════════════════════════
//  PANNEAU COACH — fusionné EN HAUT de l'écran Suivi (plus d'onglet dédié).
//  Couche « voix du coach » qui complète ProgressScreen SANS le dupliquer ni
//  rivaliser avec son héro coloré : carte premium NEUTRE (cardStyle standard),
//  petits accents verts seulement (avatar, icône focus, chip). Le héro orange
//  juste en dessous reste le seul point focal coloré. Ton = compagnon.
// ════════════════════════════════════════════════════════════════════════════

const CoachHead = ({ size = 34 }) => (
  <span className="flex shrink-0 items-center justify-center rounded-full" style={{ width: size, height: size, background: `linear-gradient(140deg, ${C.green}, ${C.weight})`, color: C.bg }}><Sprout size={Math.round(size * 0.52)} /></span>
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
    <section className="rounded-3xl p-4 cm-card" style={cardStyle()}>
      <div className="flex items-center gap-2.5">
        <CoachHead />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-tight" style={{ color: C.ink }}>{greeting}</p>
          <p className="mt-0.5 text-[11px] font-medium capitalize" style={{ color: C.muted }}>Ton coach · {fmtFull(TODAY)}</p>
        </div>
      </div>

      <p className="mt-2.5 text-[13px] leading-snug" style={{ color: C.sub }}>{read}</p>

      <div className="mt-2.5 flex items-start gap-1.5">
        <Target size={14} color={C.green} className="mt-0.5 shrink-0" />
        <p className="text-[12.5px] leading-snug" style={{ color: C.ink }}><span className="font-bold">Focus :</span> {focus}.</p>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {variety && (
          <button onClick={() => onCoachPrompt(variety.chip.prompt)} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95" style={{ backgroundColor: `${C.green}1f`, color: C.green, border: `1px solid ${C.green}33` }}><Salad size={13} /> {variety.chip.label}</button>
        )}
        <button onClick={onOpenChat} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold active:scale-95" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink }}><MessageCircle size={13} style={{ color: C.green }} /> Parler à mon coach</button>
      </div>
    </section>
  );
}
