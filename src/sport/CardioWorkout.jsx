import React, { useState, useMemo } from "react";
import { C, cardStyle } from "../core.js";
import { getRowerResistance } from "../lib/sport.js";
import { StepDots, SlideButton } from "./components.jsx";
import { PhaseTimer, IntervalTimer } from "./timers.jsx";

// ── Séance cardio guidée (titre dans le header global) ───────────────────────
export function CardioWorkout({ session, week, sound = true, onFinish }) {
  const steps = useMemo(() => [...session.blocks.map((_, i) => ({ kind: "block", i })), { kind: "numbers" }], [session]); // eslint-disable-line
  const [stepIdx, setStepIdx] = useState(0);
  const step = steps[stepIdx];
  const goNext = () => setStepIdx((i) => Math.min(steps.length - 1, i + 1));
  const [cardio, setCardio] = useState({ distance: "", rowerLevel: getRowerResistance(week), ropeJumps: "", rpe: "", notes: "" });
  const set = (k, v) => setCardio((c) => ({ ...c, [k]: v }));

  return (
    <div className="pb-2">
      <div className="mb-3 flex items-center justify-end">
        <span className="text-xs font-semibold" style={{ color: C.sub }}>Étape {stepIdx + 1}/{steps.length}</span>
      </div>
      <StepDots count={steps.length} idx={stepIdx} />

      {step.kind === "block" && (() => {
        const b = session.blocks[step.i];
        if (b.format === "intervalles") {
          return <IntervalTimer count={b.intervals.count} work={b.intervals.work} rest={b.intervals.rest} label={b.name} machine={b.machine} sound={sound} onDone={goNext} />;
        }
        return <PhaseTimer seconds={b.duration} title={`${b.name} · ${b.machine}`} detail={b.tip} sound={sound} accent={C.weight} onDone={goNext} />;
      })()}

      {step.kind === "numbers" && (
        <div>
          <div className="mb-4 rounded-2xl cm-card" style={cardStyle()}>
            <p className="mb-3 text-sm font-bold" style={{ color: C.ink }}>Tes chiffres (facultatif)</p>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Distance rameur (m)" value={cardio.distance} onChange={(v) => set("distance", v)} />
              <Field label="Résistance rameur" value={cardio.rowerLevel} onChange={(v) => set("rowerLevel", v)} />
              <Field label="Sauts à la corde" value={cardio.ropeJumps} onChange={(v) => set("ropeJumps", v)} />
              <Field label="Effort perçu /10" value={cardio.rpe} onChange={(v) => set("rpe", v)} />
            </div>
            <textarea value={cardio.notes} onChange={(e) => set("notes", e.target.value)} rows={2} placeholder="Notes…" className="mt-2 w-full rounded-xl p-2 text-sm outline-none" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink }} />
          </div>
          <SlideButton label="Glisser pour enregistrer" color={C.green} onConfirm={() => onFinish({ cardioData: cardio })} />
        </div>
      )}
    </div>
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
