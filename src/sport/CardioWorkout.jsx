import React, { useState, useEffect, useMemo } from "react";
import { Play, Check, Activity } from "lucide-react";
import { C, cardStyle } from "../core.js";
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
  const runBlock = step.kind === "block" ? session.blocks[step.i] : null;
  const statusColor = colored ? (runBlock.format === "intervalles" ? null : C.weight) : C.bg;

  return (
    <SessionShell onStop={stop} onColor={colored} statusColor={statusColor}>
      {step.kind === "block" && (() => {
        const b = session.blocks[step.i];
        const intervals = b.format === "intervalles";
        if (phase === "prepare") {
          const formatLine = intervals ? `${b.intervals.count} × ${b.intervals.work}s effort / ${b.intervals.rest}s récup` : `${Math.round(b.duration / 60)} min en continu`;
          return (
            <Stage>
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
                <div className="w-full rounded-3xl p-6 text-center" style={cardStyle({ background: `radial-gradient(140% 110% at 50% 0%, ${C.weight}26, transparent 60%), ${C.cardGrad}` })}>
                  <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: `${C.weight}1a`, color: C.weight }}><Activity size={26} /></span>
                  <p className="text-[11px] font-extrabold uppercase tracking-wide" style={{ color: C.weight }}>Bloc {step.i + 1}/{session.blocks.length}</p>
                  <p className="mt-1 text-2xl font-extrabold" style={{ color: C.ink, fontFamily: FONT }}>{b.name}</p>
                  <span className="mt-2 inline-block rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: C.paper, color: C.sub }}>{b.machine}</span>
                  <p className="mt-2 text-sm font-semibold" style={{ color: C.sub }}>{formatLine}</p>
                  {b.tip && <p className="mt-2 text-sm" style={{ color: C.muted }}>{b.tip}</p>}
                </div>
              </div>
              <button onClick={() => setPhase("run")} className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-extrabold text-white active:scale-95" style={{ backgroundColor: C.green, boxShadow: `0 12px 28px -12px ${C.green}` }}><Play size={18} /> Je suis prêt</button>
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
