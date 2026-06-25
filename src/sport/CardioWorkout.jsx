import React, { useState, useMemo } from "react";
import { Play, Check } from "lucide-react";
import { C } from "../core.js";
import { getRowerResistance } from "../lib/sport.js";
import { SlideButton } from "./components.jsx";
import { SessionShell, Stage, PhaseStage, IntervalStage } from "./SessionShell.jsx";

const FONT = "'Space Grotesk', system-ui";

// ════════════════════════════════════════════════════════════════════════════
// CardioWorkout — séance cardio PLEIN ÉCRAN : écran « prêt ? » avant chaque bloc
// (on change de machine), puis intervalles chronométrés auto-enchaînés (bips
// 3-2-1) ou bloc continu. Saisie des chiffres + slide pour enregistrer.
// ════════════════════════════════════════════════════════════════════════════
export function CardioWorkout({ session, week, sound = true, onCancel, onFinish }) {
  const steps = useMemo(() => [...session.blocks.map((_, i) => ({ kind: "block", i })), { kind: "numbers" }], [session]); // eslint-disable-line
  const [stepIdx, setStepIdx] = useState(0);
  const step = steps[stepIdx];
  const [phase, setPhase] = useState("prepare");
  const goNext = () => { setStepIdx((i) => Math.min(steps.length - 1, i + 1)); setPhase("prepare"); };
  const [cardio, setCardio] = useState({ distance: "", rowerLevel: getRowerResistance(week), ropeJumps: "", rpe: "", notes: "" });
  const set = (k, v) => setCardio((c) => ({ ...c, [k]: v }));

  const subtitleFor = () => (step.kind === "numbers" ? "Tes chiffres" : session.blocks[step.i].name);

  return (
    <SessionShell title={session.name} subtitle={subtitleFor()} onStop={onCancel}>
      {step.kind === "block" && (() => {
        const b = session.blocks[step.i];
        const intervals = b.format === "intervalles";
        if (phase === "prepare") {
          const lines = intervals
            ? [`${b.machine}`, `${b.intervals.count} × ${b.intervals.work}s effort / ${b.intervals.rest}s récup`, b.tip]
            : [`${b.machine}`, `${Math.round(b.duration / 60)} min en continu`, b.tip];
          return (
            <Stage actions={
              <button onClick={() => setPhase("run")} className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold text-white active:scale-95" style={{ backgroundColor: C.green }}><Play size={18} /> Je suis prêt</button>
            }>
              <p className="text-xl font-extrabold" style={{ color: C.ink, fontFamily: FONT }}>{b.name}</p>
              {lines.filter(Boolean).map((l, i) => <p key={i} className="mt-2 max-w-sm text-sm" style={{ color: C.sub }}>{l}</p>)}
            </Stage>
          );
        }
        return intervals
          ? <IntervalStage count={b.intervals.count} work={b.intervals.work} rest={b.intervals.rest} machine={b.machine} label={b.name} sound={sound} onDone={goNext} />
          : <PhaseStage title={`${b.name} · ${b.machine}`} detail={b.tip} seconds={b.duration} sound={sound} accent={C.weight} onDone={goNext} />;
      })()}

      {step.kind === "numbers" && (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto">
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
          <div className="shrink-0 pt-3">
            <SlideButton label="Glisser pour enregistrer" color={C.green} icon={Check} onConfirm={() => onFinish({ cardioData: cardio })} />
          </div>
        </div>
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
