import React, { useState } from "react";
import { Settings, Volume2, VolumeX, Minus, Plus, Tent, Check, Vibrate, Megaphone, Palette, Scale, Dumbbell, RotateCcw } from "lucide-react";
import { Sheet } from "../components/Sheet.jsx";
import { SESSIONS, SESSION_ORDER, EQUIPMENT, DEFAULT_EQUIPMENT } from "../lib/sport.js";
import { SPORT_THEMES, sheetTokens, SPORT_FONT } from "./theme.js";

const DAYS = [
  { i: 1, l: "Lun" }, { i: 2, l: "Mar" }, { i: 3, l: "Mer" }, { i: 4, l: "Jeu" },
  { i: 5, l: "Ven" }, { i: 6, l: "Sam" }, { i: 0, l: "Dim" },
];
const DEFAULT_DAYS = { A: 2, B: 4, C: 6 };

// ── Réglages Sport : thème · semaine · jours · vacances · signaux (skin sheet) ─
export function SportSettings({ open, onClose, sport, setSport, currentWeek, program, pid, programs = [], onSwitchProgram, onResetProgram }) {
  const T = sheetTokens(sport.sportTheme);
  const SESS = program?.sessions || SESSIONS;          // sessions du programme actif
  const ORDER = program?.sessionOrder || SESSION_ORDER;
  const weeks = program?.weeks || 14;
  const [confirmReset, setConfirmReset] = useState(null); // id du programme en attente de confirmation
  const days = sport.preferences?.sessionDays || DEFAULT_DAYS;
  const soundOn = sport.soundEnabled !== false;
  const hapticsOn = sport.hapticsEnabled !== false;
  const voiceOn = sport.voiceEnabled !== false;
  const setDay = (sid, i) => setSport((s) => ({ ...s, preferences: { ...(s.preferences || {}), sessionDays: { ...days, [sid]: i } } }));
  const toggleSound = () => setSport((s) => ({ ...s, soundEnabled: !(s.soundEnabled !== false) }));
  const toggleHaptics = () => setSport((s) => ({ ...s, hapticsEnabled: !(s.hapticsEnabled !== false) }));
  const toggleVoice = () => setSport((s) => ({ ...s, voiceEnabled: !(s.voiceEnabled !== false) }));
  const sportTheme = sport.sportTheme || "hybride";
  const setTheme = (id) => setSport((s) => ({ ...s, sportTheme: id }));
  // Semaine/position PAR programme (sport.programState[pid]).
  const weekManual = !!sport.programState?.[pid]?.weekManuallySet;
  const patchPS = (patch) => setSport((s) => { const st = { ...(s.programState || {}) }; st[pid] = { ...(st[pid] || {}), ...patch }; return { ...s, programState: st }; });
  const setWeek = (w) => patchPS({ currentWeek: Math.min(weeks, Math.max(1, w)), weekManuallySet: true });
  const autoWeek = () => patchPS({ weekManuallySet: false });
  const vacationMode = !!sport.vacationMode;
  const equipment = { ...DEFAULT_EQUIPMENT, ...(sport.equipment || {}) };
  const toggleVacation = () => setSport((s) => ({ ...s, vacationMode: !s.vacationMode }));
  const toggleEquip = (id) => setSport((s) => ({ ...s, equipment: { ...DEFAULT_EQUIPMENT, ...(s.equipment || {}), [id]: !({ ...DEFAULT_EQUIPMENT, ...(s.equipment || {}) }[id]) } }));
  const correctiveOn = sport.curlBalanced !== true; // correctif bras gauche actif par défaut
  const toggleCorrection = () => setSport((s) => ({ ...s, curlBalanced: !s.curlBalanced }));
  const Lbl = ({ children }) => <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: T.muted }}>{children}</p>;

  return (
    <Sheet open={open} onClose={onClose} tokens={T} title="Réglages Sport" subtitle="Programme · thème · semaine · signaux" icon={<Settings size={18} />} iconColor={T.accent}>
      {programs.length > 1 && (
        <>
          <Lbl>Programme</Lbl>
          <p className="mb-2 text-xs" style={{ color: T.muted }}>Chaque programme garde sa propre progression. Ta force (charges par exercice) te suit d'un programme à l'autre.</p>
          <div className="mb-5 space-y-2">
            {programs.map((p) => {
              const on = p.id === pid;
              return (
                <div key={p.id} className="rounded-2xl p-3.5" style={{ backgroundColor: T.paper, border: `1.5px solid ${on ? T.accent : T.line}` }}>
                  <button onClick={() => (on ? null : onSwitchProgram?.(p.id))} className="flex w-full items-center gap-3 text-left active:scale-[0.99]">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: on ? T.accent : T.card, color: on ? T.onAccent : T.muted }}>{on ? <Check size={18} /> : <Dumbbell size={16} />}</span>
                    <span className="flex-1">
                      <span className="text-sm font-bold" style={{ color: T.ink }}>{p.name}{on && <span className="ml-1.5 text-[10px] font-extrabold uppercase" style={{ color: T.good }}>actif</span>}</span>
                      <span className="mt-0.5 block text-xs leading-snug" style={{ color: T.sub }}>{p.description}</span>
                    </span>
                  </button>
                  {on && (
                    <div className="mt-3 border-t pt-2.5" style={{ borderColor: T.line }}>
                      {confirmReset === p.id ? (
                        <div className="flex items-center gap-2">
                          <span className="flex-1 text-xs font-semibold" style={{ color: T.effort }}>Effacer progression + séances de ce programme ?</span>
                          <button onClick={() => { onResetProgram?.(p.id); setConfirmReset(null); }} className="rounded-lg px-3 py-1.5 text-xs font-bold text-white active:scale-95" style={{ backgroundColor: T.effort }}>Oui</button>
                          <button onClick={() => setConfirmReset(null)} className="rounded-lg px-3 py-1.5 text-xs font-bold active:scale-95" style={{ backgroundColor: T.card, color: T.sub }}>Annuler</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmReset(p.id)} className="flex w-full items-center justify-center gap-1.5 py-1 text-xs font-semibold active:scale-95" style={{ color: T.muted }}><RotateCcw size={13} /> Réinitialiser la progression</button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      <Lbl>Thème de la section</Lbl>
      <div className="mb-5 space-y-2">
        {SPORT_THEMES.map((th) => {
          const on = sportTheme === th.id;
          return (
            <button key={th.id} onClick={() => setTheme(th.id)} className="flex w-full items-center gap-3 rounded-2xl p-3.5 text-left active:scale-[0.99]" style={{ backgroundColor: T.paper, border: `1.5px solid ${on ? T.accent : T.line}` }}>
              <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: on ? T.accent : T.card, color: on ? T.onAccent : T.muted }}>{on ? <Check size={18} /> : <Palette size={16} />}</span>
              <span className="flex-1">
                <span className="text-sm font-bold" style={{ color: T.ink }}>{th.name}{th.reco && <span className="ml-1.5 text-[10px] font-extrabold uppercase" style={{ color: T.good }}>conseillé</span>}</span>
                <span className="block text-xs" style={{ color: T.sub }}>{th.desc}</span>
              </span>
            </button>
          );
        })}
      </div>

      <Lbl>Semaine du programme</Lbl>
      <div className="mb-5 rounded-2xl p-3" style={{ backgroundColor: T.paper, border: `1px solid ${T.line}` }}>
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => setWeek((currentWeek || 1) - 1)} className="flex h-9 w-9 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: T.card, color: T.sub }}><Minus size={16} /></button>
          <span className="text-xl font-extrabold tabular-nums" style={{ color: T.ink, fontFamily: SPORT_FONT }}>S{currentWeek}<span className="text-sm font-bold" style={{ color: T.muted }}>/{weeks}</span></span>
          <button onClick={() => setWeek((currentWeek || 1) + 1)} className="flex h-9 w-9 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: T.card, color: T.sub }}><Plus size={16} /></button>
        </div>
        <button onClick={autoWeek} className="mt-3 w-full rounded-xl py-2 text-xs font-semibold active:scale-95" style={{ backgroundColor: T.card, color: T.sub }}>{weekManual ? "Revenir au calcul auto (date de début)" : "Semaine calculée automatiquement ✓"}</button>
      </div>

      <Lbl>Jours de séance</Lbl>
      <div className="mb-5 space-y-2.5">
        {ORDER.map((sid) => (
          <div key={sid} className="rounded-2xl p-3" style={{ backgroundColor: T.paper, border: `1px solid ${T.line}` }}>
            <p className="mb-2 text-sm font-bold" style={{ color: T.ink }}>{SESS[sid].name} · <span className="font-normal" style={{ color: T.sub }}>{SESS[sid].subtitle}</span></p>
            <div className="flex gap-1.5">
              {DAYS.map((d) => {
                const on = days[sid] === d.i;
                return (
                  <button key={d.i} onClick={() => setDay(sid, d.i)} className="flex-1 rounded-lg py-2 text-xs font-bold active:scale-95" style={on ? { backgroundColor: T.accent, color: T.onAccent } : { backgroundColor: T.card, color: T.sub }}>{d.l}</button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <Lbl>Mode vacances</Lbl>
      <div className="mb-5 rounded-2xl p-1" style={{ backgroundColor: T.paper, border: `1px solid ${T.line}` }}>
        <button onClick={toggleVacation} className="flex w-full items-center gap-3 rounded-xl p-2.5 active:scale-[0.99]">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: vacationMode ? `${T.accent}1a` : T.card, color: vacationMode ? T.accent : T.muted }}><Tent size={17} /></span>
          <span className="flex-1 text-left"><span className="block text-sm font-bold" style={{ color: T.ink }}>Adapter au matériel dispo</span><span className="block text-xs" style={{ color: T.muted }}>Toutes les séances utilisent le matériel coché</span></span>
          <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: vacationMode ? T.accent : T.card, color: vacationMode ? T.onAccent : T.sub }}>{vacationMode ? "Activé" : "Off"}</span>
        </button>
        {vacationMode && (
          <div className="grid grid-cols-2 gap-2 p-2 pt-1">
            {EQUIPMENT.map((it) => {
              const on = !!equipment[it.id];
              return (
                <button key={it.id} onClick={() => toggleEquip(it.id)} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-left active:scale-95" style={{ backgroundColor: on ? `${T.good}1a` : T.card, border: `1px solid ${on ? T.good : T.line}` }}>
                  <span className="flex h-5 w-5 items-center justify-center rounded-md" style={{ backgroundColor: on ? T.good : T.paper, color: T.onAccent }}>{on && <Check size={13} />}</span>
                  <span className="text-sm font-semibold" style={{ color: T.ink }}>{it.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Lbl>Correctif bras (curl)</Lbl>
      <div className="mb-5">
        <SignalToggle T={T} icon={Scale} label="Curl : correctif bras gauche"
          hint={correctiveOn ? "Unilatéral + 1 série de plus à gauche. Coupe-le quand tes 2 bras sont au même niveau." : "Off — curl bilatéral normal (2×12 kg)."}
          on={correctiveOn} onToggle={toggleCorrection} />
      </div>

      <Lbl>Signaux en séance</Lbl>
      <p className="mb-2 text-xs" style={{ color: T.muted }}>Fin de repos / d'intervalle. La vibration et la voix percent même avec la musique à fond.</p>
      <div className="space-y-2">
        <SignalToggle T={T} icon={soundOn ? Volume2 : VolumeX} label="Bips renforcés" on={soundOn} onToggle={toggleSound} />
        <SignalToggle T={T} icon={Vibrate} label="Vibration (poche)" hint="Marche même téléphone en poche" on={hapticsOn} onToggle={toggleHaptics} />
        <SignalToggle T={T} icon={Megaphone} label="Voix « 3 · 2 · 1 · go »" on={voiceOn} onToggle={toggleVoice} />
      </div>
    </Sheet>
  );
}

function SignalToggle({ T, icon: Icon, label, hint, on, onToggle }) {
  return (
    <button onClick={onToggle} className="flex w-full items-center gap-3 rounded-2xl p-3 active:scale-[0.99]" style={{ backgroundColor: T.paper, border: `1px solid ${T.line}` }}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: on ? `${T.good}1a` : T.card, color: on ? T.good : T.muted }}><Icon size={17} /></span>
      <span className="flex-1 text-left">
        <span className="block text-sm font-semibold" style={{ color: T.ink }}>{label}</span>
        {hint && <span className="block text-xs" style={{ color: T.muted }}>{hint}</span>}
      </span>
      <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: on ? T.good : T.card, color: on ? T.onAccent : T.sub }}>{on ? "On" : "Off"}</span>
    </button>
  );
}

export default SportSettings;
