import React, { useState } from "react";
import { PenLine, Check } from "lucide-react";
import { C } from "../core.js";
import { Sheet } from "../components/Sheet.jsx";
import { SESSIONS, SESSION_ORDER, getExercisePrescription } from "../lib/sport.js";

// ── Logging manuel a posteriori : enregistrer une séance déjà faite ──────────
// On préremplit les séries d'après le programme (charge prescrite, reps cibles,
// jugées « parfait ») ; ajustable ensuite via le détail de la séance.
export function ManualLogSheet({ open, onClose, currentWeek, workouts, onSave, showToast }) {
  const [sid, setSid] = useState("A");
  const [week, setWeek] = useState(currentWeek || 1);
  const session = SESSIONS[sid];

  const submit = () => {
    const id = `manual-${sid}-${Date.now()}`;
    const base = { id, date: new Date().toISOString(), completed: true, sessionId: sid, week, manual: true };
    let entry;
    if (session.type === "cardio") {
      entry = { ...base, cardioData: { distance: "", rowerLevel: "", ropeJumps: "", rpe: "", notes: "Ajout manuel" } };
    } else {
      const data = session.exercises.map((ex) => {
        const presc = getExercisePrescription(ex, week, workouts);
        const target = presc.mode === "reps" ? presc.value : (typeof ex.reps === "number" ? ex.reps : null);
        const charge = presc.mode === "charge" ? presc.value : (ex.load ?? null);
        return {
          exercise: ex.name,
          sets: Array.from({ length: ex.sets }, () => ({ weight: charge, repsTarget: target, repsDone: target, difficulty: "parfait" })),
        };
      });
      entry = { ...base, data };
    }
    onSave(entry);
    if (showToast) showToast(`${session.name} ajoutée (manuel) ✓`);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Logger une séance" subtitle="Ajout manuel a posteriori" icon={<PenLine size={18} />} iconColor={C.accent}>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: C.muted }}>Quelle séance ?</p>
      <div className="mb-4 space-y-2">
        {SESSION_ORDER.map((k) => {
          const on = sid === k;
          return (
            <button key={k} onClick={() => setSid(k)} className="flex w-full items-center gap-3 rounded-2xl p-3.5 text-left active:scale-[0.99]" style={{ backgroundColor: C.paper, border: `1px solid ${on ? C.accent : C.line}` }}>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold" style={{ backgroundColor: on ? C.accent : C.card, color: on ? "#fff" : C.sub }}>{k}</span>
              <span className="flex-1"><span className="block text-sm font-bold" style={{ color: C.ink }}>{SESSIONS[k].name}</span><span className="block text-xs" style={{ color: C.muted }}>{SESSIONS[k].subtitle}</span></span>
              {on && <Check size={18} style={{ color: C.accent }} />}
            </button>
          );
        })}
      </div>

      <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: C.muted }}>Semaine de programme</p>
      <div className="mb-5 flex flex-wrap gap-1.5">
        {Array.from({ length: 14 }, (_, i) => i + 1).map((w) => {
          const on = week === w;
          return <button key={w} onClick={() => setWeek(w)} className="h-9 w-9 rounded-lg text-xs font-bold active:scale-95" style={on ? { backgroundColor: C.accent, color: "#fff" } : { backgroundColor: C.paper, color: C.sub, border: `1px solid ${C.line}` }}>{w}</button>;
        })}
      </div>

      <p className="mb-3 text-xs" style={{ color: C.muted }}>La séance sera préremplie selon le programme (charges prescrites). Tu pourras ajuster les reps/charges ensuite en l'ouvrant depuis l'historique.</p>
      <button onClick={submit} className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white active:scale-95" style={{ backgroundColor: C.green }}><Check size={18} /> Enregistrer la séance</button>
    </Sheet>
  );
}

export default ManualLogSheet;
