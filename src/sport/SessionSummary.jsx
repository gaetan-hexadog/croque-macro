import React, { useState } from "react";
import { Check, Timer, Dumbbell, Flame, Star, Trophy } from "lucide-react";
import { C, cardStyle } from "../core.js";
import { formatTime } from "../lib/sport.js";
import { SlideButton } from "./components.jsx";

const FONT = "'Space Grotesk', system-ui";

// ── Récap célébratoire (structuré) + ressenti. Tokens `t` (hub) ; fallback C. ──
export function SessionSummary({ t, sessionName, subtitle, stats, isPR, onSave }) {
  const tk = t || { variant: "timer", ink: C.ink, sub: C.sub, muted: C.muted, line: C.line, panel: C.card, accent: C.accent, good: C.green, rest: C.weight, effort: C.protein };
  const isGym = tk.variant === "gym";
  const card = isGym ? { backgroundColor: tk.panel, border: `1px solid ${tk.line}` } : cardStyle();
  const [feel, setFeel] = useState(0);
  const { durationSec, doneSets, totalSets, exercises, volumeKg } = stats;
  const rows = [
    [Timer, tk.rest, "Durée", formatTime(durationSec)],
    [Check, tk.good, "Séries notées", `${doneSets}/${totalSets}`],
    [Dumbbell, tk.accent, "Exercices", exercises],
    ...(volumeKg > 0 ? [[Flame, tk.effort, "Volume total", `${volumeKg} kg`]] : []),
  ];

  return (
    <div className="pb-2">
      <div className="mb-3 flex items-center gap-3 rounded-2xl p-4" style={card}>
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: `${tk.good}22`, color: tk.good }}><Check size={24} /></span>
        <div><p className="text-base font-extrabold" style={{ color: tk.ink, fontFamily: FONT }}>Séance terminée 💪</p><p className="text-xs" style={{ color: tk.sub }}>{sessionName} · {subtitle} · {formatTime(durationSec)}</p></div>
      </div>

      {isPR && volumeKg > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-2xl p-3" style={{ backgroundColor: `${tk.accent}12`, border: `1px solid ${tk.accent}44` }}>
          <Trophy size={18} style={{ color: tk.accent }} />
          <span className="text-sm font-bold" style={{ color: tk.ink }}>Record de volume · {volumeKg} kg 🎉</span>
        </div>
      )}

      <div className="mb-3 rounded-2xl p-1" style={card}>
        {rows.map(([I, c, l, v], i) => (
          <div key={l} className="flex items-center gap-3 px-3 py-3" style={i ? { borderTop: `1px solid ${tk.line}` } : undefined}>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: `${c}1a`, color: c }}><I size={16} /></span>
            <span className="text-sm" style={{ color: tk.sub }}>{l}</span>
            <span className="ml-auto text-base font-extrabold tabular-nums" style={{ color: tk.ink, fontFamily: FONT }}>{v}</span>
          </div>
        ))}
      </div>

      <div className="mb-3 rounded-2xl p-3 text-center" style={card}>
        <p className="mb-2 text-sm font-bold" style={{ color: tk.ink }}>Comment tu te sens ?</p>
        <div className="flex justify-center gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => <button key={n} onClick={() => setFeel(n)} aria-label={`${n} étoiles`} className="active:scale-90"><Star size={26} fill={n <= feel ? tk.accent : "none"} color={n <= feel ? tk.accent : tk.muted} /></button>)}
        </div>
      </div>

      <SlideButton label="Glisser pour enregistrer" color={tk.good} onConfirm={() => onSave(feel || null)} />
    </div>
  );
}

export default SessionSummary;
