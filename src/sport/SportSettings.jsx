import React from "react";
import { Settings, Volume2, VolumeX } from "lucide-react";
import { C } from "../core.js";
import { Sheet } from "../components/Sheet.jsx";
import { SESSIONS, SESSION_ORDER } from "../lib/sport.js";

const DAYS = [
  { i: 1, l: "Lun" }, { i: 2, l: "Mar" }, { i: 3, l: "Mer" }, { i: 4, l: "Jeu" },
  { i: 5, l: "Ven" }, { i: 6, l: "Sam" }, { i: 0, l: "Dim" },
];
const DEFAULT_DAYS = { A: 2, B: 4, C: 6 };

// ── Réglages Sport : jours de séance + son des minuteurs ─────────────────────
export function SportSettings({ open, onClose, sport, setSport }) {
  const days = sport.preferences?.sessionDays || DEFAULT_DAYS;
  const soundOn = sport.soundEnabled !== false;
  const setDay = (sid, i) => setSport((s) => ({ ...s, preferences: { ...(s.preferences || {}), sessionDays: { ...days, [sid]: i } } }));
  const toggleSound = () => setSport((s) => ({ ...s, soundEnabled: !(s.soundEnabled !== false) }));

  return (
    <Sheet open={open} onClose={onClose} title="Réglages Sport" subtitle="Jours de séance & minuteurs" icon={<Settings size={18} />} iconColor={C.accent}>
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
