import React, { useState, useEffect, useMemo } from "react";
import { Play, Check } from "lucide-react";
import { C } from "../core.js";
import { getRowerResistance } from "../lib/sport.js";
import { SlideButton } from "./components.jsx";
import { SessionShell, Stage, PhaseStage, IntervalStage } from "./SessionShell.jsx";
import { saveLive, clearLive } from "./liveSession.js";

const FONT = "'Space Grotesk', system-ui";

// ════════════════════════════════════════════════════════════════════════════
// CardioWorkout — cardio PLEIN ÉCRAN : « prêt ? » avant chaque bloc (changement de
// machine) puis intervalles chronométrés (bips 3-2-1). Progression persistée.
// ════════════════════════════════════════════════════════════════════════════
export function CardioWorkout({ session, week, sound = true, onCancel, onFinish, resume }) {
  const steps = useMemo(() => [...session.blocks.map((_, i) => ({ kind: "block", i })), { kind: "numbers" }], [session]); // eslint-disable-line
  const isResume = resume && resume.kind === "cardio" && resume.sessionId === session.id;
  const [stepIdx, setStepIdx] = useState(isResume ? Math.min(resume.stepIdx, steps.length - 1) : 0);
  const [phase, setPhase] = useState(isResume ? (resume.phase === "run" ? "prepare" : resume.phase) : "prepare");
  const [cardio, setCardio] = useState(isResume && resume.cardio ? resume.cardio : { distance: "", rowerLevel: getRowerResistance(week), ropeJumps: "", rpe: "", notes: "" });
  const step = steps[stepIdx];
  const goNext = () => { setStepIdx((i) => Math.min(steps.length - 1, i + 1)); setPhase("prepare"); };
  const set = (k, v) => setCardio((c) => ({ ...c, [k]: v }));
  const stop = () => { clearLive(); onCancel(); };

  useEffect(() => {
    if (step.kind === "numbers") { clearLive(); return; }
    saveLive({ kind: "cardio", sessionId: session.id, week, session, stepIdx, phase, cardio });
  }, [stepIdx, phase, cardio]); // eslint-disable-line

  const colored = step.kind === "block" && phase === "run";

  return (
    <SessionShell onStop={stop} onColor={colored}>
      {step.kind === "block" && (() => {
        const b = session.blocks[step.i];
        const intervals = b.format === "intervalles";
        if (phase === "prepare") {
          const lines = intervals
            ? [b.machine, `${b.intervals.count} × ${b.intervals.work}s effort / ${b.intervals.rest}s récup`, b.tip]
            : [b.machine, `${Math.round(b.duration / 60)} min en continu`, b.tip];
          return (
            <Stage>
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center">
                <p className="text-xl font-extrabold" style={{ color: C.ink, fontFamily: FONT }}>{b.name}</p>
                {lines.filter(Boolean).map((l, i) => <p key={i} className="mt-2 max-w-sm text-sm" style={{ color: C.sub }}>{l}</p>)}
              </div>
              <button onClick={() => setPhase("run")} className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold text-white active:scale-95" style={{ backgroundColor: C.green }}><Play size={18} /> Je suis prêt</button>
            </Stage>
          );
        }
        return intervals
          ? <IntervalStage count={b.intervals.count} work={b.intervals.work} rest={b.intervals.rest} machine={b.machine} label={b.name} sound={sound} onDone={goNext} />
          : <PhaseStage title={`${b.name} · ${b.machine}`} detail={b.tip} seconds={b.duration} sound={sound} onDone={goNext} />;
      })()}

      {step.kind === "numbers" && (
        <Stage scroll>
          <div className="min-h-0 flex-1">
            <p className="mb-1 text-lg font-extrabold" style={{ color: C.ink, fontFamily: FONT }}>Séance bouclée 🔥</p>
            <p className="mb-3 text-sm" style={{ color: C.sub }}>Note tes chiffres (facultatif).</p>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Distance rameur (m)" value={cardio.distance} onChange={(v) => set("distance", v)} />
              <Field label="Résistance rameur" value={cardio.rowerLevel} onChange={(v) => set("rowerLevel", v)} />
              <Field label="Sauts à la corde" value={cardio.ropeJumps} onChange={(v) => set("ropeJumps", v)} />
              <Field label="Effort perçu /10" value={cardio.rpe} onChange={(v) => set("rpe", v)} />
            </div>
            <textarea value={cardio.notes} onChange={(e) => set("notes", e.target.value)} rows={2} placeholder="Notes…" className="mt-2 w-full rounded-xl p-2 text-sm outline-none" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink }} />
          </div>
          <div className="mt-3"><SlideButton label="Glisser pour enregistrer" color={C.green} icon={Check} onConfirm={() => { clearLive(); onFinish({ cardioData: cardio }); }} /></div>
        </Stage>
      )}
    </SessionShell>
  );
}

function Field({ label, value, onChange }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium" style={{ color: C.sub }}>{label}</p>
      <input value={value} onChange={(e) => onChange(e.target.value)} inputMode="numeric" className="w-full rounded-xl px-3 py-2 text-sm font-semibold outline-none" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink }} />
    </div>
  );
}

export default CardioWorkout;
