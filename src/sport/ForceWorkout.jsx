import React, { useState, useEffect, useMemo } from "react";
import { Plus, Minus, Info, History as HistoryIcon, Dumbbell, Play } from "lucide-react";
import { C, cardStyle } from "../core.js";
import { getExercisePrescription, getDiscPlan, getLastPerformance, sessionVolume, isVolumePR } from "../lib/sport.js";
import { NumberFlow, PrescriptionBadge, DIFFS, diffColor } from "./components.jsx";
import { SessionShell, Stage, PhaseStage, RestStage, IntervalStage } from "./SessionShell.jsx";
import { SessionSummary } from "./SessionSummary.jsx";

const FONT = "'Space Grotesk', system-ui";

// ════════════════════════════════════════════════════════════════════════════
// ForceWorkout — séance de force PLEIN ÉCRAN, pensée pour le sportif :
// • écran « prêt ? » avant chaque exercice (quoi/comment) puis avant chaque série
// • on démarre quand on est prêt (le repos est un guide, pas un enchaînement auto)
// • gros chiffres lisibles à distance, bips 3-2-1, écran maintenu allumé
// Produit le MÊME payload que le moteur (data + chargeAdjustments).
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

  const [phase, setPhase] = useState("prepare"); // exercise/finishCardio : prepare | run
  const [setIdx, setSetIdx] = useState(0);
  const [resting, setResting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showTips, setShowTips] = useState(false);

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

  useEffect(() => {
    if (stepIdx >= recapIdx) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [stepIdx, recapIdx]);

  const goNextStep = () => { setStepIdx((i) => Math.min(steps.length - 1, i + 1)); setPhase("prepare"); setSetIdx(0); setResting(false); setShowTips(false); };
  const setReps = (exIdx, delta) => setLog((prev) => prev.map((e, i) => i !== exIdx ? e : { ...e, sets: e.sets.map((s, j) => j !== setIdx ? s : { ...s, repsDone: Math.max(0, (s.repsDone ?? s.repsTarget ?? 0) + delta) }) }));
  const adjustCharge = (exIdx, delta) => setLog((prev) => prev.map((e, i) => {
    if (i !== exIdx || e.charge == null) return e;
    const charge = Math.max(0, e.charge + delta);
    return { ...e, charge, sets: e.sets.map((s) => s.difficulty ? s : { ...s, weight: charge }) };
  }));
  const rate = (exIdx, diff) => {
    const ex = exs[exIdx];
    setLog((prev) => prev.map((e, i) => i !== exIdx ? e : { ...e, sets: e.sets.map((s, j) => j !== setIdx ? s : { ...s, difficulty: diff }) }));
    if (setIdx < ex.sets - 1) setResting(true);
    else goNextStep();
  };

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

  // ── Récap (plein écran aussi) ────────────────────────────────────────────────
  if (step.kind === "recap") {
    const data = log.map(({ exercise, sets }) => ({ exercise, sets }));
    const pr = isVolumePR({ sessionId: session.id, week, completed: true, data }, workouts);
    return (
      <SessionShell title={session.name} subtitle="Récap" onStop={onCancel}>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <SessionSummary
            sessionName={session.name} subtitle={`${session.subtitle} · S${week}`}
            stats={{ durationSec: elapsed, doneSets, totalSets, exercises: exs.length, volumeKg: sessionVolume({ data }) }}
            isPR={pr}
            onSave={(feel) => onFinish(buildPayload(feel))}
          />
        </div>
      </SessionShell>
    );
  }

  const subtitleFor = () => {
    if (step.kind === "warmup") return "Échauffement";
    if (step.kind === "cooldown") return "Retour au calme";
    if (step.kind === "finishCardio") return "Finition cardio";
    const ex = exs[step.i];
    return `${ex.name} · ${step.i + 1}/${exs.length}`;
  };

  return (
    <SessionShell title={session.name} subtitle={subtitleFor()} onStop={onCancel}>
      {step.kind === "warmup" && (
        <PhaseStage title="Échauffement" detail={session.warmup.details} seconds={session.warmup.seconds} sound={sound} accent={C.weight} onDone={goNextStep} />
      )}

      {step.kind === "cooldown" && (
        <PhaseStage title="Retour au calme" detail={session.cooldown.details} seconds={session.cooldown.seconds} sound={sound} accent={C.weight} onDone={goNextStep} />
      )}

      {step.kind === "finishCardio" && (
        phase === "prepare"
          ? <PrepareCard title={session.finishCardio.name} lines={[`${session.finishCardio.intervals.count} × ${session.finishCardio.intervals.work}s effort / ${session.finishCardio.intervals.rest}s récup`, session.finishCardio.tip]} onReady={() => setPhase("run")} />
          : <IntervalStage count={session.finishCardio.intervals.count} work={session.finishCardio.intervals.work} rest={session.finishCardio.intervals.rest} machine="Corde" label="Finition" sound={sound} onDone={goNextStep} />
      )}

      {step.kind === "exercise" && (() => {
        const exIdx = step.i;
        const ex = exs[exIdx];
        const entry = log[exIdx];
        const last = getLastPerformance(workouts, ex.name);
        const isTime = ex.type === "bodyweight" && ex.repsSeconds;
        const canAdjust = ex.type === "standard" || ex.type === "heavy";
        const curSet = entry.sets[setIdx];

        // 1) Écran de préparation : quoi / comment, avant de commencer
        if (phase === "prepare") {
          const chargeLine = entry.charge != null
            ? `${entry.charge} kg${ex.loadLabel ? ` · ${ex.loadLabel}` : ""}${canAdjust ? ` · ${getDiscPlan(entry.charge)}` : ""}`
            : (ex.type === "bodyweight" ? "Poids du corps" : "");
          return (
            <PrepareExercise
              ex={ex} entry={entry} chargeLine={chargeLine} last={last} isTime={isTime}
              onReady={() => { setPhase("run"); setSetIdx(0); }}
            />
          );
        }

        // 2) Repos entre séries (départ manuel)
        if (resting) {
          return <RestStage seconds={ex.rest} sound={sound} nextLabel={`Série ${setIdx + 2}/${ex.sets}${entry.charge != null ? ` · ${entry.charge} kg` : ""}`} onReady={() => { setResting(false); setSetIdx((i) => i + 1); }} />;
        }

        // 3) Série en cours
        return (
          <Stage actions={
            <div>
              <p className="mb-2 text-center text-xs font-semibold" style={{ color: C.sub }}>Série faite ? Note la difficulté</p>
              <div className="flex gap-2">
                {DIFFS.map((o) => <button key={o.v} onClick={() => rate(exIdx, o.v)} className="flex-1 rounded-2xl py-4 text-sm font-bold active:scale-95" style={{ backgroundColor: `${diffColor(o.hint)}1a`, color: diffColor(o.hint), border: `1px solid ${diffColor(o.hint)}55` }}>{o.l}</button>)}
              </div>
            </div>
          }>
            <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: `${C.accent}1a`, color: C.accent }}>Série {setIdx + 1} / {ex.sets}</span>

            {entry.charge != null && (
              <div className="mt-4 flex items-center gap-4">
                {canAdjust && <button onClick={() => adjustCharge(exIdx, -1)} className="flex h-10 w-10 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: C.card, color: C.sub }}><Minus size={18} /></button>}
                <div className="text-center">
                  <span style={{ color: C.ink, fontFamily: FONT }}><span className="text-2xl font-extrabold tabular-nums">{entry.charge}</span><span className="text-sm font-bold" style={{ color: C.muted }}> kg{ex.loadLabel ? ` · ${ex.loadLabel}` : ""}</span></span>
                  {canAdjust && <p className="text-[11px]" style={{ color: C.muted }}>{getDiscPlan(entry.charge)}</p>}
                </div>
                {canAdjust && <button onClick={() => adjustCharge(exIdx, 1)} className="flex h-10 w-10 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: C.card, color: C.sub }}><Plus size={18} /></button>}
              </div>
            )}

            {isTime ? (
              <p className="my-6 text-6xl font-extrabold" style={{ color: C.ink, fontFamily: FONT }}>{ex.reps}</p>
            ) : (
              <>
                <p className="mt-6 text-xs font-semibold uppercase tracking-widest" style={{ color: C.muted }}>Répétitions{ex.perSide ? " / côté" : ""}</p>
                <div className="mt-1 flex items-center gap-6">
                  <button onClick={() => setReps(exIdx, -1)} className="flex h-12 w-12 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: C.card, color: C.sub }}><Minus size={22} /></button>
                  <NumberFlow value={curSet.repsDone ?? curSet.repsTarget ?? 0} size={96} color={C.ink} />
                  <button onClick={() => setReps(exIdx, 1)} className="flex h-12 w-12 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: C.card, color: C.sub }}><Plus size={22} /></button>
                </div>
              </>
            )}

            {last && <p className="mt-5 flex items-center gap-1.5 text-xs" style={{ color: C.muted }}><HistoryIcon size={12} style={{ color: C.weight }} /> Dernière fois : <b style={{ color: C.sub }}>{last.weight ? `${last.weight} kg · ` : ""}{(last.reps[setIdx] ?? last.reps[0]) ?? "—"}{last.weight || !isTime ? " reps" : ""}</b></p>}
            {entry.presc.note && <p className="mt-3 max-w-xs rounded-lg px-2.5 py-1.5 text-xs" style={{ backgroundColor: C.paper, color: entry.presc.direction === "down" ? C.over : entry.presc.direction === "up" ? C.green : C.sub }}>{entry.presc.note}</p>}

            <button onClick={() => setShowTips((v) => !v)} className="mt-4 flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95" style={{ backgroundColor: showTips ? `${C.accent}1a` : C.paper, color: showTips ? C.accent : C.sub }}><Info size={13} /> {showTips ? "Masquer" : "Technique"}</button>
            {showTips && (
              <div className="mt-2 max-w-sm rounded-2xl p-3 text-left" style={cardStyle()}>
                <p className="text-xs" style={{ color: C.sub }}>{ex.tech}</p>
                {ex.tips?.length > 0 && <ul className="mt-2 space-y-1">{ex.tips.map((t, i) => <li key={i} className="flex gap-1.5 text-xs" style={{ color: C.sub }}><span style={{ color: C.green }}>•</span>{t}</li>)}</ul>}
              </div>
            )}
          </Stage>
        );
      })()}
    </SessionShell>
  );
}

// Écran de préparation d'un exercice : tout ce qu'il faut savoir avant de s'y mettre.
function PrepareExercise({ ex, entry, chargeLine, last, isTime, onReady }) {
  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between">
          <p className="text-xl font-extrabold" style={{ color: C.ink, fontFamily: FONT }}>{ex.name}</p>
          <PrescriptionBadge presc={entry.presc} ex={ex} />
        </div>
        <p className="mt-1 text-sm font-semibold" style={{ color: C.sub }}>
          {ex.sets} × {isTime ? ex.reps : `${entry.sets[0].repsTarget ?? ex.reps} reps`}{ex.perSide ? " / côté" : ""} · repos {ex.rest}s
        </p>
        {chargeLine && (
          <div className="mt-3 flex items-center gap-2 rounded-2xl p-3" style={{ backgroundColor: C.paper }}>
            <Dumbbell size={16} style={{ color: C.accent }} />
            <span className="text-sm font-bold" style={{ color: C.ink }}>{chargeLine}</span>
          </div>
        )}
        {last && <p className="mt-3 flex items-center gap-1.5 text-xs" style={{ color: C.muted }}><HistoryIcon size={12} style={{ color: C.weight }} /> Dernière fois : <b style={{ color: C.sub }}>{last.weight ? `${last.weight} kg · ` : ""}{last.reps.join("/")}</b></p>}

        <div className="mt-4 rounded-2xl p-3.5" style={cardStyle()}>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wide" style={{ color: C.muted }}>Comment faire</p>
          <p className="text-sm" style={{ color: C.sub }}>{ex.tech}</p>
          {ex.tips?.length > 0 && <ul className="mt-2 space-y-1.5">{ex.tips.map((t, i) => <li key={i} className="flex gap-1.5 text-sm" style={{ color: C.sub }}><span style={{ color: C.green }}>•</span>{t}</li>)}</ul>}
        </div>
      </div>
      <div className="shrink-0 pt-3">
        <button onClick={onReady} className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold text-white active:scale-95" style={{ backgroundColor: C.green }}><Play size={18} /> Je suis prêt</button>
      </div>
    </>
  );
}

// Écran de préparation générique (finition cardio, etc.).
function PrepareCard({ title, lines, onReady }) {
  return (
    <Stage actions={
      <button onClick={onReady} className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold text-white active:scale-95" style={{ backgroundColor: C.green }}><Play size={18} /> Je suis prêt</button>
    }>
      <p className="text-xl font-extrabold" style={{ color: C.ink, fontFamily: FONT }}>{title}</p>
      {lines.filter(Boolean).map((l, i) => <p key={i} className="mt-2 max-w-sm text-sm" style={{ color: C.sub }}>{l}</p>)}
    </Stage>
  );
}

export default ForceWorkout;
