import React, { useState } from "react";
import { PenLine, Check, Dumbbell, Activity } from "lucide-react";
import { Sheet } from "../components/Sheet.jsx";
import { SESSIONS, SESSION_ORDER, getExercisePrescription, makeFreeCardio } from "../lib/sport.js";
import { sheetTokens } from "./theme.js";

const MIN_PRESETS = [20, 30, 45];

// ── Logging manuel a posteriori : séance du programme OU cardio libre (rameur) ─
export function ManualLogSheet({ open, onClose, currentWeek, workouts, onSave, showToast, sportTheme, exerciseCharges = {} }) {
  const T = sheetTokens(sportTheme);
  const [type, setType] = useState("session"); // "session" (programme) | "free" (cardio libre)
  const [sid, setSid] = useState("A");
  const [week, setWeek] = useState(currentWeek || 1);
  // cardio libre
  const [minutes, setMinutes] = useState(30);
  const [distance, setDistance] = useState("");
  const [rowerLevel, setRowerLevel] = useState("");
  const [rpe, setRpe] = useState("");
  const session = SESSIONS[sid];

  const submitSession = () => {
    const id = `manual-${sid}-${Date.now()}`;
    const base = { id, date: new Date().toISOString(), completed: true, sessionId: sid, week, manual: true };
    let entry;
    if (session.type === "cardio") {
      entry = { ...base, cardioData: { distance: "", rowerLevel: "", ropeJumps: "", rpe: "", notes: "Ajout manuel" } };
    } else {
      const data = session.exercises.map((ex) => {
        const presc = getExercisePrescription(ex, week, workouts, exerciseCharges);
        const target = presc.mode === "reps" ? presc.value : (typeof ex.reps === "number" ? ex.reps : null);
        const charge = presc.mode === "charge" ? presc.value : (ex.load ?? null);
        return { exercise: ex.name, sets: Array.from({ length: ex.sets }, () => ({ weight: charge, repsTarget: target, repsDone: target, difficulty: "parfait" })) };
      });
      entry = { ...base, data };
    }
    onSave(entry);
    if (showToast) showToast(`${session.name} ajoutée (manuel) ✓`);
    onClose();
  };

  const submitFree = () => {
    onSave(makeFreeCardio({ week: currentWeek || 1, minutes: Number(minutes) || null, distance, rowerLevel, rpe }));
    if (showToast) showToast(`Cardio libre ajouté 🚣 (${minutes} min)`);
    onClose();
  };

  const Seg = ({ id, icon: Icon, label }) => {
    const on = type === id;
    return (
      <button onClick={() => setType(id)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold active:scale-95" style={on ? { backgroundColor: T.accent, color: T.onAccent } : { backgroundColor: T.card, color: T.sub }}><Icon size={15} /> {label}</button>
    );
  };
  const Field = ({ label, value, onChange, ph }) => (
    <div>
      <p className="mb-1 text-xs font-medium" style={{ color: T.sub }}>{label}</p>
      <input value={value} onChange={(e) => onChange(e.target.value)} inputMode="numeric" placeholder={ph} className="w-full rounded-xl px-3 py-2 text-sm font-semibold outline-none" style={{ backgroundColor: T.card, border: `1px solid ${T.line}`, color: T.ink }} />
    </div>
  );

  return (
    <Sheet open={open} onClose={onClose} tokens={T} title="Ajouter au journal" subtitle="Séance programme ou cardio libre" icon={<PenLine size={18} />} iconColor={T.accent}>
      <div className="mb-4 flex gap-2 rounded-2xl p-1" style={{ backgroundColor: T.paper, border: `1px solid ${T.line}` }}>
        <Seg id="session" icon={Dumbbell} label="Séance programme" />
        <Seg id="free" icon={Activity} label="Cardio libre" />
      </div>

      {type === "session" ? (
        <>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: T.muted }}>Quelle séance ?</p>
          <div className="mb-4 space-y-2">
            {SESSION_ORDER.map((k) => {
              const on = sid === k;
              return (
                <button key={k} onClick={() => setSid(k)} className="flex w-full items-center gap-3 rounded-2xl p-3 text-left active:scale-[0.99]" style={{ backgroundColor: T.paper, border: `1px solid ${on ? T.accent : T.line}` }}>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold" style={{ backgroundColor: on ? T.accent : T.card, color: on ? T.onAccent : T.sub }}>{k}</span>
                  <span className="flex-1"><span className="block text-sm font-bold" style={{ color: T.ink }}>{SESSIONS[k].name}</span><span className="block text-xs" style={{ color: T.muted }}>{SESSIONS[k].subtitle}</span></span>
                  {on && <Check size={18} style={{ color: T.accent }} />}
                </button>
              );
            })}
          </div>

          <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: T.muted }}>Semaine de programme</p>
          <div className="mb-5 flex flex-wrap gap-1.5">
            {Array.from({ length: 14 }, (_, i) => i + 1).map((w) => {
              const on = week === w;
              return <button key={w} onClick={() => setWeek(w)} className="h-9 w-9 rounded-lg text-xs font-bold active:scale-95" style={on ? { backgroundColor: T.accent, color: T.onAccent } : { backgroundColor: T.paper, color: T.sub, border: `1px solid ${T.line}` }}>{w}</button>;
            })}
          </div>

          <p className="mb-3 text-xs" style={{ color: T.muted }}>La séance sera préremplie selon le programme. Tu pourras ajuster reps/charges ensuite depuis l'historique.</p>
          <button onClick={submitSession} className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold active:scale-95" style={{ backgroundColor: T.good, color: T.onAccent }}><Check size={18} /> Enregistrer la séance</button>
        </>
      ) : (
        <>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: T.muted }}>Durée</p>
          <div className="mb-3 flex gap-2">
            {MIN_PRESETS.map((m) => {
              const on = Number(minutes) === m;
              return <button key={m} onClick={() => setMinutes(m)} className="flex-1 rounded-xl py-2.5 text-sm font-bold active:scale-95" style={on ? { backgroundColor: T.accent, color: T.onAccent } : { backgroundColor: T.paper, color: T.sub, border: `1px solid ${T.line}` }}>{m} min</button>;
            })}
            <input value={minutes} onChange={(e) => setMinutes(e.target.value)} inputMode="numeric" aria-label="Durée en minutes" className="w-16 rounded-xl px-2 py-2 text-center text-sm font-bold outline-none" style={{ backgroundColor: T.card, border: `1px solid ${T.line}`, color: T.ink }} />
          </div>

          <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: T.muted }}>Optionnel</p>
          <div className="mb-4 grid grid-cols-3 gap-2">
            <Field label="Distance (m)" value={distance} onChange={setDistance} ph="—" />
            <Field label="Résistance" value={rowerLevel} onChange={setRowerLevel} ph="/10" />
            <Field label="Effort" value={rpe} onChange={setRpe} ph="/10" />
          </div>

          <p className="mb-3 text-xs" style={{ color: T.muted }}>Le cardio libre garde ta <b style={{ color: T.sub }}>série de semaines actives</b> et apparaît dans l'historique. Il n'entre PAS dans l'assiduité A/B/C et ne change RIEN à tes cibles kcal.</p>
          <button onClick={submitFree} className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold active:scale-95" style={{ backgroundColor: T.good, color: T.onAccent }}><Check size={18} /> Enregistrer le cardio</button>
        </>
      )}
    </Sheet>
  );
}

export default ManualLogSheet;
