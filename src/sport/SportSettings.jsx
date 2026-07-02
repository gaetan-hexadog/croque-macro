import React from "react";
import { Settings, Volume2, VolumeX, Minus, Plus, Tent, Check, Vibrate, Megaphone } from "lucide-react";
import { C } from "../core.js";
import { Sheet } from "../components/Sheet.jsx";
import { SESSIONS, SESSION_ORDER, EQUIPMENT, DEFAULT_EQUIPMENT } from "../lib/sport.js";

const DAYS = [
  { i: 1, l: "Lun" }, { i: 2, l: "Mar" }, { i: 3, l: "Mer" }, { i: 4, l: "Jeu" },
  { i: 5, l: "Ven" }, { i: 6, l: "Sam" }, { i: 0, l: "Dim" },
];
const DEFAULT_DAYS = { A: 2, B: 4, C: 6 };

// ── Réglages Sport : semaine du programme + jours de séance + son ────────────
export function SportSettings({ open, onClose, sport, setSport, currentWeek }) {
  const days = sport.preferences?.sessionDays || DEFAULT_DAYS;
  const soundOn = sport.soundEnabled !== false;
  const hapticsOn = sport.hapticsEnabled !== false;
  const voiceOn = sport.voiceEnabled !== false;
  const setDay = (sid, i) => setSport((s) => ({ ...s, preferences: { ...(s.preferences || {}), sessionDays: { ...days, [sid]: i } } }));
  const toggleSound = () => setSport((s) => ({ ...s, soundEnabled: !(s.soundEnabled !== false) }));
  const toggleHaptics = () => setSport((s) => ({ ...s, hapticsEnabled: !(s.hapticsEnabled !== false) }));
  const toggleVoice = () => setSport((s) => ({ ...s, voiceEnabled: !(s.voiceEnabled !== false) }));
  const setWeek = (w) => setSport((s) => ({ ...s, currentWeek: Math.min(14, Math.max(1, w)), weekManuallySet: true }));
  const autoWeek = () => setSport((s) => ({ ...s, weekManuallySet: false }));
  const vacationMode = !!sport.vacationMode;
  const equipment = { ...DEFAULT_EQUIPMENT, ...(sport.equipment || {}) };
  const toggleVacation = () => setSport((s) => ({ ...s, vacationMode: !s.vacationMode }));
  const toggleEquip = (id) => setSport((s) => ({ ...s, equipment: { ...DEFAULT_EQUIPMENT, ...(s.equipment || {}), [id]: !({ ...DEFAULT_EQUIPMENT, ...(s.equipment || {}) }[id]) } }));

  return (
    <Sheet open={open} onClose={onClose} title="Réglages Sport" subtitle="Semaine · jours · minuteurs" icon={<Settings size={18} />} iconColor={C.accent}>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: C.muted }}>Semaine du programme</p>
      <div className="mb-5 rounded-2xl cm-card" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}` }}>
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
          <div key={sid} className="rounded-2xl cm-card" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}` }}>
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

      <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: C.muted }}>Mode vacances</p>
      <div className="mb-5 rounded-2xl p-1" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}` }}>
        <button onClick={toggleVacation} className="flex w-full items-center gap-3 rounded-xl p-2.5 active:scale-[0.99]">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: vacationMode ? `${C.accent}1a` : C.card, color: vacationMode ? C.accent : C.muted }}><Tent size={17} /></span>
          <span className="flex-1 text-left"><span className="block text-sm font-bold" style={{ color: C.ink }}>Adapter au matériel dispo</span><span className="block text-xs" style={{ color: C.muted }}>Toutes les séances utilisent le matériel coché</span></span>
          <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: vacationMode ? C.accent : C.card, color: vacationMode ? "#fff" : C.sub }}>{vacationMode ? "Activé" : "Off"}</span>
        </button>
        {vacationMode && (
          <div className="grid grid-cols-2 gap-2 p-2 pt-1">
            {EQUIPMENT.map((it) => {
              const on = !!equipment[it.id];
              return (
                <button key={it.id} onClick={() => toggleEquip(it.id)} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-left active:scale-95" style={{ backgroundColor: on ? `${C.green}1a` : C.card, border: `1px solid ${on ? C.green : C.line}` }}>
                  <span className="flex h-5 w-5 items-center justify-center rounded-md" style={{ backgroundColor: on ? C.green : C.paper, color: "#fff" }}>{on && <Check size={13} />}</span>
                  <span className="text-sm font-semibold" style={{ color: C.ink }}>{it.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: C.muted }}>Signaux en séance</p>
      <p className="mb-2 text-xs" style={{ color: C.muted }}>Fin de repos / d'intervalle. La vibration et la voix percent même avec la musique à fond.</p>
      <div className="space-y-2">
        <SignalToggle icon={soundOn ? Volume2 : VolumeX} label="Bips renforcés" on={soundOn} onToggle={toggleSound} />
        <SignalToggle icon={Vibrate} label="Vibration (poche)" hint="Marche même téléphone en poche" on={hapticsOn} onToggle={toggleHaptics} />
        <SignalToggle icon={Megaphone} label="Voix « 3 · 2 · 1 · go »" on={voiceOn} onToggle={toggleVoice} />
      </div>
    </Sheet>
  );
}

// Ligne toggle d'un canal de signal (bip / vibration / voix).
function SignalToggle({ icon: Icon, label, hint, on, onToggle }) {
  return (
    <button onClick={onToggle} className="flex w-full items-center gap-3 rounded-2xl cm-card active:scale-[0.99]" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}` }}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: on ? `${C.green}1a` : C.card, color: on ? C.green : C.muted }}><Icon size={17} /></span>
      <span className="flex-1 text-left">
        <span className="block text-sm font-semibold" style={{ color: C.ink }}>{label}</span>
        {hint && <span className="block text-xs" style={{ color: C.muted }}>{hint}</span>}
      </span>
      <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: on ? C.green : C.card, color: on ? "#fff" : C.sub }}>{on ? "On" : "Off"}</span>
    </button>
  );
}

export default SportSettings;
