import React, { useState, useEffect, useMemo } from "react";
import { Play, Check, Activity } from "lucide-react";
import { cardStyle } from "../core.js";
import { sportTokens, SPORT_FONT as FONT } from "./theme.js";
import { getRowerResistance } from "../lib/sport.js";
import { SlideButton } from "./components.jsx";
import { SessionShell, Stage, PhaseStage, IntervalStage } from "./SessionShell.jsx";
import { saveLive, clearLive } from "./liveSession.js";

// ════════════════════════════════════════════════════════════════════════════
// CardioWorkout — cardio PLEIN ÉCRAN. Rendu via le skin de séance `ss` (theme.js) ;
// l'écran final « chiffres » utilise le skin HUB (comme un récap).
// ════════════════════════════════════════════════════════════════════════════
export function CardioWorkout({ session, week, sound = true, onCancel, onFinish, resume, sportTheme }) {
  const ss = sportTokens(sportTheme, "session");
  const hub = sportTokens(sportTheme, "hub");
  const isGym = ss.variant === "gym";
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

  // Écran final « chiffres » — skin HUB (comme un récap).
  if (step.kind === "numbers") {
    return (
      <SessionShell ss={hub} onStop={stop} onColor={false} statusColor={hub.surface}>
        <Stage scroll>
          <div className="min-h-0 flex-1">
            <p className="mb-1 text-lg font-extrabold" style={{ color: hub.ink, fontFamily: FONT }}>Séance bouclée 🔥</p>
            <p className="mb-3 text-sm" style={{ color: hub.sub }}>Note tes chiffres (facultatif).</p>
            <div className="grid grid-cols-2 gap-2">
              <Field t={hub} label="Distance rameur (m)" value={cardio.distance} onChange={(v) => set("distance", v)} />
              <Field t={hub} label="Résistance rameur" value={cardio.rowerLevel} onChange={(v) => set("rowerLevel", v)} />
              <Field t={hub} label="Sauts à la corde" value={cardio.ropeJumps} onChange={(v) => set("ropeJumps", v)} />
              <Field t={hub} label="Effort perçu /10" value={cardio.rpe} onChange={(v) => set("rpe", v)} />
            </div>
            <textarea value={cardio.notes} onChange={(e) => set("notes", e.target.value)} rows={2} placeholder="Notes…" className="mt-2 w-full rounded-xl p-2 text-sm outline-none" style={{ backgroundColor: hub.panel, border: `1px solid ${hub.line}`, color: hub.ink }} />
          </div>
          <div className="mt-3"><SlideButton label="Glisser pour enregistrer" color={hub.good} icon={Check} onConfirm={() => { clearLive(); onFinish({ cardioData: cardio }); }} /></div>
        </Stage>
      </SessionShell>
    );
  }

  const b = session.blocks[step.i];
  const intervals = b.format === "intervalles";
  const colored = !isGym && phase === "run";
  const statusColor = isGym ? ss.surface : (phase === "run" ? (intervals ? ss.effort : ss.rest) : ss.surface);

  return (
    <SessionShell ss={ss} onStop={stop} onColor={colored} statusColor={statusColor}>
      {phase === "prepare" ? (() => {
        const formatLine = intervals ? `${b.intervals.count} × ${b.intervals.work}s effort / ${b.intervals.rest}s récup` : `${Math.round(b.duration / 60)} min en continu`;
        return (
          <Stage>
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
              <div className="relative w-full overflow-hidden rounded-3xl p-6 text-center" style={isGym ? { backgroundColor: ss.panel, border: `1px solid ${ss.line}` } : cardStyle({ background: `radial-gradient(140% 110% at 50% 0%, ${ss.rest}26, transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.065), rgba(255,255,255,0.018))` })}>
                {isGym && <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: ss.rest }} />}
                <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: `${ss.rest}1a`, color: ss.rest }}><Activity size={26} /></span>
                <p className="text-[11px] font-extrabold uppercase tracking-wide" style={{ color: ss.rest }}>Bloc {step.i + 1}/{session.blocks.length}</p>
                <p className="mt-1 text-2xl font-extrabold" style={{ color: ss.ink, fontFamily: FONT }}>{b.name}</p>
                <span className="mt-2 inline-block rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: ss.panel, color: ss.sub }}>{b.machine}</span>
                <p className="mt-2 text-sm font-semibold" style={{ color: ss.sub }}>{formatLine}</p>
                {b.tip && <p className="mt-2 text-sm" style={{ color: ss.muted }}>{b.tip}</p>}
              </div>
            </div>
            <button onClick={() => setPhase("run")} className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-extrabold active:scale-95" style={{ backgroundColor: ss.good, color: isGym ? ss.onAccent : "#fff" }}><Play size={18} /> Je suis prêt</button>
          </Stage>
        );
      })() : (
        intervals
          ? <IntervalStage ss={ss} count={b.intervals.count} work={b.intervals.work} rest={b.intervals.rest} machine={b.machine} label={b.name} sound={sound} onDone={goNext} />
          : <PhaseStage ss={ss} title={`${b.name} · ${b.machine}`} detail={b.tip} seconds={b.duration} sound={sound} onDone={goNext} />
      )}
    </SessionShell>
  );
}

function Field({ t, label, value, onChange }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium" style={{ color: t.sub }}>{label}</p>
      <input value={value} onChange={(e) => onChange(e.target.value)} inputMode="numeric" className="w-full rounded-xl px-3 py-2 text-sm font-semibold outline-none" style={{ backgroundColor: t.panel, border: `1px solid ${t.line}`, color: t.ink }} />
    </div>
  );
}

export default CardioWorkout;
