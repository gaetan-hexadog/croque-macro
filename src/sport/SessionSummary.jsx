import React, { useState } from "react";
import { Check, Timer, Dumbbell, Flame, Star, Trophy } from "lucide-react";
import { C, cardStyle } from "../core.js";
import { formatTime } from "../lib/sport.js";
import { SlideButton } from "./components.jsx";

const FONT = "'Space Grotesk', system-ui";

// ── Récap célébratoire (structuré, piste E) + ressenti ───────────────────────
export function SessionSummary({ sessionName, subtitle, stats, isPR, onSave }) {
  const [feel, setFeel] = useState(0);
  const { durationSec, doneSets, totalSets, exercises, volumeKg } = stats;
  const rows = [
    [Timer, C.weight, "Durée", formatTime(durationSec)],
    [Check, C.green, "Séries notées", `${doneSets}/${totalSets}`],
    [Dumbbell, C.accent, "Exercices", exercises],
    ...(volumeKg > 0 ? [[Flame, C.protein, "Volume total", `${volumeKg} kg`]] : []),
  ];

  return (
    <div className="pb-2">
      <div className="mb-3 flex items-center gap-3 rounded-2xl p-4" style={cardStyle()}>
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: `${C.green}22`, color: C.green }}><Check size={24} /></span>
        <div><p className="text-base font-extrabold" style={{ color: C.ink, fontFamily: FONT }}>Séance terminée 💪</p><p className="text-xs" style={{ color: C.sub }}>{sessionName} · {subtitle} · {formatTime(durationSec)}</p></div>
      </div>

      {isPR && volumeKg > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-2xl p-3" style={{ backgroundColor: `${C.accent}12`, border: `1px solid ${C.accent}44` }}>
          <Trophy size={18} style={{ color: C.accent }} />
          <span className="text-sm font-bold" style={{ color: C.ink }}>Record de volume · {volumeKg} kg 🎉</span>
        </div>
      )}

      <div className="mb-3 rounded-2xl p-1" style={cardStyle()}>
        {rows.map(([I, c, l, v], i) => (
          <div key={l} className="flex items-center gap-3 px-3 py-3" style={i ? { borderTop: `1px solid ${C.line}` } : undefined}>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: `${c}1a`, color: c }}><I size={16} /></span>
            <span className="text-sm" style={{ color: C.sub }}>{l}</span>
            <span className="ml-auto text-base font-extrabold tabular-nums" style={{ color: C.ink, fontFamily: FONT }}>{v}</span>
          </div>
        ))}
      </div>

      <div className="mb-3 rounded-2xl p-3 text-center" style={cardStyle()}>
        <p className="mb-2 text-sm font-bold" style={{ color: C.ink }}>Comment tu te sens ?</p>
        <div className="flex justify-center gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => <button key={n} onClick={() => setFeel(n)} aria-label={`${n} étoiles`} className="active:scale-90"><Star size={26} fill={n <= feel ? C.accent : "none"} color={n <= feel ? C.accent : C.muted} /></button>)}
        </div>
      </div>

      <SlideButton label="Glisser pour enregistrer" color={C.green} onConfirm={() => onSave(feel || null)} />
    </div>
  );
}

export default SessionSummary;
