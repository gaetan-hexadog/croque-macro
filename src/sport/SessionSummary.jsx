import React, { useState } from "react";
import { Check, Timer, Dumbbell, Flame, Star, Trophy } from "lucide-react";
import { C, cardStyle } from "../core.js";
import { formatTime } from "../lib/sport.js";
import { StatTile, SlideButton } from "./components.jsx";

const FONT = "'Space Grotesk', system-ui";

// ── Récap célébratoire d'une séance de force (piste D) ───────────────────────
export function SessionSummary({ sessionName, subtitle, stats, isPR, onSave }) {
  const [feel, setFeel] = useState(0);
  const { durationSec, doneSets, totalSets, exercises, volumeKg } = stats;

  return (
    <div className="pb-6">
      <div className="flex flex-col items-center pt-3 text-center">
        <span className="mb-2 flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: `${C.green}22`, color: C.green }}><Check size={32} /></span>
        <p className="text-2xl font-extrabold" style={{ color: C.ink, fontFamily: FONT }}>Séance terminée 💪</p>
        <p className="mt-1 text-sm" style={{ color: C.sub }}>{sessionName} · {subtitle}</p>
      </div>

      {isPR && volumeKg > 0 && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl p-3.5" style={{ background: `linear-gradient(120deg, ${C.accent}22, transparent)`, border: `1px solid ${C.accent}44` }}>
          <Trophy size={22} style={{ color: C.accent }} />
          <div>
            <p className="text-sm font-extrabold" style={{ color: C.ink }}>Record de volume ! 🎉</p>
            <p className="text-xs" style={{ color: C.sub }}>{volumeKg} kg soulevés — ta meilleure {sessionName} à ce jour.</p>
          </div>
        </div>
      )}

      <div className="my-4 grid grid-cols-2 gap-2.5">
        <StatTile icon={Timer} color={C.weight} value={formatTime(durationSec)} label="Durée" />
        <StatTile icon={Check} color={C.green} value={`${doneSets}/${totalSets}`} label="Séries notées" />
        <StatTile icon={Dumbbell} color={C.weight} value={exercises} label="Exercices" />
        {volumeKg > 0 && <StatTile icon={Flame} color={C.protein} value={volumeKg} unit="kg" label="Volume total" animate />}
      </div>

      <div className="mb-4 rounded-2xl p-4 text-center" style={cardStyle()}>
        <p className="mb-2 text-sm font-bold" style={{ color: C.ink }}>Comment tu te sens ?</p>
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setFeel(n)} aria-label={`${n} étoiles`} className="active:scale-90">
              <Star size={30} fill={n <= feel ? C.accent : "none"} color={n <= feel ? C.accent : C.muted} />
            </button>
          ))}
        </div>
      </div>

      <SlideButton label="Glisser pour enregistrer" color={C.green} onConfirm={() => onSave(feel || null)} />
    </div>
  );
}

export default SessionSummary;
