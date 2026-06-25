import React, { useState, useEffect, useMemo } from "react";
import { Clock, Plus, Minus, SkipForward, Info, History as HistoryIcon, ChevronRight } from "lucide-react";
import { C, cardStyle } from "../core.js";
import { getExercisePrescription, getDiscPlan, getLastPerformance, sessionVolume, isVolumePR } from "../lib/sport.js";
import { NumberFlow, DurationFlow, SessionProgress, PrescriptionBadge, StepDots, DIFFS, diffColor } from "./components.jsx";
import { PhaseTimer, IntervalTimer, playBeep } from "./timers.jsx";
import { SessionSummary } from "./SessionSummary.jsx";

const FONT = "'Space Grotesk', system-ui";

// ════════════════════════════════════════════════════════════════════════════
// ForceWorkout — séance de force guidée en MODE FOCUS (piste C) : une seule série
// à la fois, plein cadre, repos animé entre les séries. Produit le MÊME payload
// que l'ancien moteur (data + chargeAdjustments) → l'adaptation reste intacte.
// ════════════════════════════════════════════════════════════════════════════
export function ForceWorkout({ session, week, workouts, sound = true, onCancel, onFinish }) {
  const exs = session.exercises;

  const steps = useMemo(() => {
    const s = [{ kind: "warmup" }];
    exs.forEach((_, i) => s.push({ kind: "exercise", i }));
    if (session.finishCardio) s.push({ kind: "finishCardio" });
    s.push({ kind: "cooldown" });
    s.push({ kind: "recap" });
    return s;
  }, [session]); // eslint-disable-line
  const recapIdx = steps.length - 1;
  const [stepIdx, setStepIdx] = useState(0);
  const step = steps[stepIdx];

  // Journal des séries (init identique à l'ancien écran : compat moteur).
  const [log, setLog] = useState(() => exs.map((ex) => {
    const presc = getExercisePrescription(ex, week, workouts);
    const targetReps = presc.mode === "reps" ? presc.value : (typeof ex.reps === "number" ? ex.reps : ex.reps);
    const charge = presc.mode === "charge" ? presc.value : (ex.load ?? null);
    return {
      exercise: ex.name, presc, charge,
      sets: Array.from({ length: ex.sets }, () => ({
        weight: charge,
        repsTarget: typeof targetReps === "number" ? targetReps : null,
        repsDone: typeof targetReps === "number" ? targetReps : null,
        difficulty: null,
      })),
    };
  }));

  // Focus : série courante + repos + chrono + tech/tips.
  const [setIdx, setSetIdx] = useState(0);
  const [resting, setResting] = useState(false);
  const [restLeft, setRestLeft] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [showTips, setShowTips] = useState(false);

  // Chrono global (figé au récap).
  useEffect(() => {
    if (stepIdx >= recapIdx) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [stepIdx, recapIdx]);

  // Décompte du repos inter-séries → série suivante automatique.
  useEffect(() => {
    if (!resting) return;
    if (restLeft <= 0) { if (sound) playBeep(); setResting(false); setSetIdx((i) => i + 1); return; }
    const t = setTimeout(() => setRestLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [resting, restLeft, sound]);

  const goNextStep = () => { setStepIdx((i) => Math.min(steps.length - 1, i + 1)); setSetIdx(0); setResting(false); setShowTips(false); };
  const setReps = (exIdx, delta) => setLog((prev) => prev.map((e, i) => i !== exIdx ? e : { ...e, sets: e.sets.map((s, j) => j !== setIdx ? s : { ...s, repsDone: Math.max(0, (s.repsDone ?? s.repsTarget ?? 0) + delta) }) }));
  const adjustCharge = (exIdx, delta) => setLog((prev) => prev.map((e, i) => {
    if (i !== exIdx || e.charge == null) return e;
    const charge = Math.max(0, e.charge + delta);
    return { ...e, charge, sets: e.sets.map((s) => s.difficulty ? s : { ...s, weight: charge }) };
  }));
  const rate = (exIdx, diff) => {
    const ex = exs[exIdx];
    setLog((prev) => prev.map((e, i) => i !== exIdx ? e : { ...e, sets: e.sets.map((s, j) => j !== setIdx ? s : { ...s, difficulty: diff }) }));
    if (setIdx < ex.sets - 1) { setRestLeft(ex.rest); setResting(ex.rest > 0); if (ex.rest <= 0) setSetIdx((i) => i + 1); }
    else goNextStep();
  };
  const skipRest = () => { setResting(false); setSetIdx((i) => i + 1); };

  const totalSets = log.reduce((a, e) => a + e.sets.length, 0);
  const doneSets = log.reduce((a, e) => a + e.sets.filter((s) => s.difficulty).length, 0);

  const buildPayload = (feel) => {
    const chargeAdjustments = {};
    log.forEach((e, idx) => {
      const ex = exs[idx];
      if ((ex.type === "standard" || ex.type === "heavy") && e.charge != null && e.charge < e.presc.value) {
        chargeAdjustments[ex.type] = Math.min(chargeAdjustments[ex.type] ?? Infinity, e.charge);
      }
    });
    const payload = { data: log.map(({ exercise, sets }) => ({ exercise, sets })), durationSec: elapsed };
    if (Object.keys(chargeAdjustments).length) payload.chargeAdjustments = chargeAdjustments;
    if (feel) payload.feel = feel;
    return payload;
  };

  // ── Rendu ──────────────────────────────────────────────────────────────────
  if (step.kind === "recap") {
    const data = log.map(({ exercise, sets }) => ({ exercise, sets }));
    const entry = { sessionId: session.id, week, completed: true, data };
    const pr = isVolumePR(entry, workouts);
    return (
      <SessionSummary
        sessionName={session.name} subtitle={`${session.subtitle} · S${week}`}
        stats={{ durationSec: elapsed, doneSets, totalSets, exercises: exs.length, volumeKg: sessionVolume({ data }) }}
        isPR={pr}
        onSave={(feel) => onFinish(buildPayload(feel))}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "70vh" }}>
      {/* Bandeau de séance : étape + chrono (le titre est dans le header global) */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold" style={{ color: C.sub }}>Étape {stepIdx + 1}/{steps.length}</span>
        <span className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold" style={{ backgroundColor: C.paper, color: C.sub }}><Clock size={12} /> <DurationFlow seconds={elapsed} size={13} color={C.sub} /></span>
      </div>
      <StepDots count={steps.length} idx={stepIdx} />

      {step.kind === "warmup" && (
        <PhaseTimer seconds={session.warmup.seconds} title="Échauffement" detail={session.warmup.details} sound={sound} accent={C.weight} onDone={goNextStep} />
      )}

      {step.kind === "exercise" && (() => {
        const exIdx = step.i;
        const ex = exs[exIdx];
        const entry = log[exIdx];
        const last = getLastPerformance(workouts, ex.name);
        const isTime = ex.type === "bodyweight" && ex.repsSeconds;
        const canAdjust = ex.type === "standard" || ex.type === "heavy";
        const curSet = entry.sets[setIdx];

        return (
          <div className="flex flex-1 flex-col">
            {/* Repère exercice + progression + accès tech/tips */}
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-bold" style={{ color: C.ink }}>{ex.name} <span className="font-normal" style={{ color: C.muted }}>· {exIdx + 1}/{exs.length}</span></p>
              <button onClick={() => setShowTips((v) => !v)} className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold active:scale-95" style={{ backgroundColor: showTips ? `${C.accent}1a` : C.paper, color: showTips ? C.accent : C.sub }}><Info size={13} /> Technique</button>
            </div>
            <div className="mb-3"><SessionProgress done={doneSets} total={totalSets} showCount={false} /></div>

            {showTips && (
              <div className="mb-3 rounded-2xl p-3.5" style={cardStyle()}>
                <p className="text-xs" style={{ color: C.sub }}>{ex.tech}</p>
                {ex.tips?.length > 0 && <ul className="mt-2 space-y-1">{ex.tips.map((t, i) => <li key={i} className="flex gap-1.5 text-xs" style={{ color: C.sub }}><span style={{ color: C.green }}>•</span>{t}</li>)}</ul>}
              </div>
            )}

            {resting ? (
              <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: C.muted }}>Repos</p>
                <div className="my-2"><DurationFlow seconds={restLeft} size={72} color={C.weight} /></div>
                <p className="mb-6 text-sm" style={{ color: C.sub }}>Prochaine : série {setIdx + 2}/{ex.sets}</p>
                <div className="flex gap-2">
                  <button onClick={() => setRestLeft((r) => r + 15)} className="rounded-full px-5 py-2.5 text-sm font-bold active:scale-95" style={{ backgroundColor: C.paper, color: C.sub, border: `1px solid ${C.line}` }}>+15s</button>
                  <button onClick={skipRest} className="flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-bold text-white active:scale-95" style={{ backgroundColor: C.green }}><SkipForward size={15} /> Passer</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
                <div className="flex items-center gap-2">
                  <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: `${C.accent}1a`, color: C.accent }}>Série {setIdx + 1} / {ex.sets}</span>
                  <PrescriptionBadge presc={entry.presc} ex={ex} />
                </div>

                {/* Charge + plan de disques (barre ajustable en direct) */}
                {entry.charge != null && (
                  <div className="mt-3 flex items-center gap-3 rounded-2xl px-4 py-2.5" style={{ backgroundColor: C.paper }}>
                    {canAdjust && <button onClick={() => adjustCharge(exIdx, -1)} className="flex h-8 w-8 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: C.card, color: C.sub }}><Minus size={15} /></button>}
                    <div className="text-center">
                      <p className="text-sm font-bold tabular-nums" style={{ color: C.ink }}>{entry.charge} kg{ex.loadLabel ? ` · ${ex.loadLabel}` : ""}</p>
                      {canAdjust && <p className="text-[10px]" style={{ color: C.muted }}>{getDiscPlan(entry.charge)}</p>}
                    </div>
                    {canAdjust && <button onClick={() => adjustCharge(exIdx, 1)} className="flex h-8 w-8 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: C.card, color: C.sub }}><Plus size={15} /></button>}
                  </div>
                )}

                {last && (
                  <p className="mt-3 flex items-center gap-1.5 text-xs" style={{ color: C.muted }}>
                    <HistoryIcon size={12} style={{ color: C.weight }} /> Dernière fois : <b style={{ color: C.sub }}>{last.weight ? `${last.weight} kg · ` : ""}{(last.reps[setIdx] ?? last.reps[0]) ?? "—"} {last.weight ? "reps" : (isTime ? "" : "reps")}</b>
                  </p>
                )}

                {/* Reps (ou durée pour le gainage) */}
                {isTime ? (
                  <p className="my-5 text-5xl font-extrabold" style={{ color: C.ink, fontFamily: FONT }}>{ex.reps}</p>
                ) : (
                  <>
                    <p className="mt-5 text-xs font-semibold uppercase tracking-widest" style={{ color: C.muted }}>Répétitions{ex.perSide ? " / côté" : ""}</p>
                    <div className="mt-1 flex items-center gap-5">
                      <button onClick={() => setReps(exIdx, -1)} className="flex h-11 w-11 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: C.card, color: C.sub }}><Minus size={20} /></button>
                      <NumberFlow value={curSet.repsDone ?? curSet.repsTarget ?? 0} size={68} color={C.ink} />
                      <button onClick={() => setReps(exIdx, 1)} className="flex h-11 w-11 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: C.card, color: C.sub }}><Plus size={20} /></button>
                    </div>
                  </>
                )}

                {entry.presc.note && <p className="mt-3 max-w-xs rounded-lg px-2.5 py-1.5 text-xs" style={{ backgroundColor: C.paper, color: entry.presc.direction === "down" ? C.over : entry.presc.direction === "up" ? C.green : C.sub }}>{entry.presc.note}</p>}

                <p className="mt-6 mb-2 text-xs font-semibold" style={{ color: C.sub }}>C'était comment ?</p>
                <div className="flex w-full max-w-xs flex-col gap-2">
                  {DIFFS.map((o) => <button key={o.v} onClick={() => rate(exIdx, o.v)} className="rounded-2xl py-3.5 text-sm font-bold active:scale-95" style={{ backgroundColor: `${diffColor(o.hint)}1a`, color: diffColor(o.hint), border: `1px solid ${diffColor(o.hint)}44` }}>{o.l}</button>)}
                </div>

                <button onClick={goNextStep} className="mt-4 flex items-center gap-1 text-xs font-semibold active:scale-95" style={{ color: C.muted }}>Passer l'exercice <ChevronRight size={13} /></button>
              </div>
            )}
          </div>
        );
      })()}

      {step.kind === "finishCardio" && (
        <IntervalTimer count={session.finishCardio.intervals.count} work={session.finishCardio.intervals.work} rest={session.finishCardio.intervals.rest} label={session.finishCardio.name} machine="Corde" sound={sound} onDone={goNextStep} />
      )}

      {step.kind === "cooldown" && (
        <PhaseTimer seconds={session.cooldown.seconds} title="Retour au calme" detail={session.cooldown.details} sound={sound} accent={C.weight} onDone={goNextStep} />
      )}
    </div>
  );
}

export default ForceWorkout;
