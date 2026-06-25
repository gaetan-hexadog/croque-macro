import React from "react";
import { Settings, Volume2, VolumeX, Minus, Plus } from "lucide-react";
import { C } from "../core.js";
import { Sheet } from "../components/Sheet.jsx";
import { SESSIONS, SESSION_ORDER } from "../lib/sport.js";

const DAYS = [
  { i: 1, l: "Lun" }, { i: 2, l: "Mar" }, { i: 3, l: "Mer" }, { i: 4, l: "Jeu" },
  { i: 5, l: "Ven" }, { i: 6, l: "Sam" }, { i: 0, l: "Dim" },
];
const DEFAULT_DAYS = { A: 2, B: 4, C: 6 };

// ── Réglages Sport : semaine du programme + jours de séance + son ────────────
export function SportSettings({ open, onClose, sport, setSport, currentWeek }) {
  const days = sport.preferences?.sessionDays || DEFAULT_DAYS;
  const soundOn = sport.soundEnabled !== false;
  const setDay = (sid, i) => setSport((s) => ({ ...s, preferences: { ...(s.preferences || {}), sessionDays: { ...days, [sid]: i } } }));
  const toggleSound = () => setSport((s) => ({ ...s, soundEnabled: !(s.soundEnabled !== false) }));
  const setWeek = (w) => setSport((s) => ({ ...s, currentWeek: Math.min(14, Math.max(1, w)), weekManuallySet: true }));
  const autoWeek = () => setSport((s) => ({ ...s, weekManuallySet: false }));

  return (
    <Sheet open={open} onClose={onClose} title="Réglages Sport" subtitle="Semaine · jours · minuteurs" icon={<Settings size={18} />} iconColor={C.accent}>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: C.muted }}>Semaine du programme</p>
      <div className="mb-5 rounded-2xl p-3" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}` }}>
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => setWeek((currentWeek || 1) - 1)} className="flex h-9 w-9 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: C.card, color: C.sub }}><Minus size={16} /></button>
          <span className="text-xl font-extrabold tabular-nums" style={{ color: C.ink, fontFamily: "'Space Grotesk', system-ui" }}>S{currentWeek}<span className="text-sm font-bold" style={{ color: C.muted }}>/14</span></span>
          <button onClick={() => setWeek((currentWeek || 1) + 1)} className="flex h-9 w-9 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: C.card, color: C.sub }}><Plus size={16} /></button>
        </div>
        <button onClick={autoWeek} className="mt-3 w-full rounded-xl py-2 text-xs font-semibold active:scale-95" style={{ backgroundColor: C.card, color: C.sub }}>{sport.weekManuallySet ? "Revenir au calcul auto (date de début)" : "Semaine calculée automatiquement ✓"}</button>
      </div>

      <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: C.muted }}>Jours de séance</p>
      <div className="mb-5 space-y-2.5">
        {SESSION_ORDER.map((sid) => (
          <div key={sid} className="rounded-2xl p-3" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}` }}>
            <p className="mb-2 text-sm font-bold" style={{ color: C.ink }}>{SESSIONS[sid].name} · <span className="font-normal" style={{ color: C.sub }}>{SESSIONS[sid].subtitle}</span></p>
            <div className="flex gap-1.5">
              {DAYS.map((d) => {
                const on = days[sid] === d.i;
                return (
                  <button key={d.i} onClick={() => setDay(sid, d.i)} className="flex-1 rounded-lg py-2 text-xs font-bold active:scale-95" style={on ? { backgroundColor: C.accent, color: "#fff" } : { backgroundColor: C.card, color: C.sub }}>{d.l}</button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: C.muted }}>Minuteurs</p>
      <button onClick={toggleSound} className="flex w-full items-center gap-3 rounded-2xl p-3.5 active:scale-[0.99]" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}` }}>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: soundOn ? `${C.green}1a` : C.card, color: soundOn ? C.green : C.muted }}>{soundOn ? <Volume2 size={17} /> : <VolumeX size={17} />}</span>
        <span className="flex-1 text-left text-sm font-semibold" style={{ color: C.ink }}>Bips de fin de repos / d'intervalle</span>
        <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: soundOn ? C.green : C.card, color: soundOn ? "#fff" : C.sub }}>{soundOn ? "Activés" : "Coupés"}</span>
      </button>
    </Sheet>
  );
}

export default SportSettings;
