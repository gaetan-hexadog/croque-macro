import React, { useState, useEffect, useRef, useMemo } from "react";
import { Plus, Minus, Info, History as HistoryIcon, Dumbbell, Play, Flame } from "lucide-react";
import { C, cardStyle } from "../core.js";
import { getExercisePrescription, getDiscPlan, getLastPerformance, sessionVolume, isVolumePR } from "../lib/sport.js";
import { NumberFlow, PrescriptionBadge, DIFFS, diffColor } from "./components.jsx";
import { SessionShell, Stage, CountdownStage, PhaseStage, RestStage, IntervalStage } from "./SessionShell.jsx";
import { SessionSummary } from "./SessionSummary.jsx";
import { saveLive, clearLive } from "./liveSession.js";

const FONT = "'Space Grotesk', system-ui";
const PREP_SECONDS = 5; // « prépare-toi » avant chaque exercice / série (force)

// ════════════════════════════════════════════════════════════════════════════
// ForceWorkout — séance de force PLEIN ÉCRAN (synthèse F) :
//  prépare → compte à rebours 5s → série → repos (départ manuel) → …
//  Progression PERSISTÉE (reprise auto si la PWA est rechargée en arrière-plan).
// ════════════════════════════════════════════════════════════════════════════
export function ForceWorkout({ session, week, workouts, sound = true, onCancel, onFinish, resume }) {
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

  const isResume = resume && resume.kind === "force" && resume.sessionId === session.id && Array.isArray(resume.log);
  const [stepIdx, setStepIdx] = useState(isResume ? Math.min(resume.stepIdx, recapIdx) : 0);
  const [phase, setPhase] = useState(isResume ? (resume.phase === "countdown" || resume.phase === "rest" ? "set" : resume.phase) : "prepare");
  const [setIdx, setSetIdx] = useState(isResume ? resume.setIdx || 0 : 0);
  const [showTips, setShowTips] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startTsRef = useRef(isResume && resume.startTs ? resume.startTs : Date.now());
  const step = steps[stepIdx];

  const [log, setLog] = useState(() => (isResume ? resume.log : exs.map((ex) => {
    const presc = getExercisePrescription(ex, week, workouts);
    const targetReps = presc.mode === "reps" ? presc.value : (typeof ex.reps === "number" ? ex.reps : ex.reps);
    const charge = presc.mode === "charge" ? presc.value : (ex.load ?? null);
    return {
      exercise: ex.name, presc, charge,
      sets: Array.from({ length: ex.sets }, () => ({ weight: charge, repsTarget: typeof targetReps === "number" ? targetReps : null, repsDone: typeof targetReps === "number" ? targetReps : null, difficulty: null })),
    };
  })));

  // Chrono : recalculé depuis le timestamp de départ → exact même après arrière-plan.
  useEffect(() => {
    if (stepIdx >= recapIdx) return;
    const tick = () => setElapsed(Math.floor((Date.now() - startTsRef.current) / 1000));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [stepIdx, recapIdx]);

  // Persistance de la progression (sauf au récap).
  useEffect(() => {
    if (stepIdx >= recapIdx) { clearLive(); return; }
    saveLive({ kind: "force", sessionId: session.id, week, session, stepIdx, setIdx, phase, log, startTs: startTsRef.current });
  }, [stepIdx, setIdx, phase, log]); // eslint-disable-line

  const stop = () => { clearLive(); onCancel(); };
  const goNextStep = () => { setStepIdx((i) => Math.min(steps.length - 1, i + 1)); setPhase("prepare"); setSetIdx(0); setShowTips(false); };
  const setReps = (exIdx, delta) => setLog((prev) => prev.map((e, i) => i !== exIdx ? e : { ...e, sets: e.sets.map((s, j) => j !== setIdx ? s : { ...s, repsDone: Math.max(0, (s.repsDone ?? s.repsTarget ?? 0) + delta) }) }));
  const adjustCharge = (exIdx, delta) => setLog((prev) => prev.map((e, i) => {
    if (i !== exIdx || e.charge == null) return e;
    const charge = Math.max(0, e.charge + delta);
    return { ...e, charge, sets: e.sets.map((s) => s.difficulty ? s : { ...s, weight: charge }) };
  }));
  const rate = (exIdx, diff) => {
    const ex = exs[exIdx];
    setLog((prev) => prev.map((e, i) => i !== exIdx ? e : { ...e, sets: e.sets.map((s, j) => j !== setIdx ? s : { ...s, difficulty: diff }) }));
    if (setIdx < ex.sets - 1) setPhase("rest"); else goNextStep();
  };

  const totalSets = log.reduce((a, e) => a + e.sets.length, 0);
  const doneSets = log.reduce((a, e) => a + e.sets.filter((s) => s.difficulty).length, 0);

  const buildPayload = (feel) => {
    const chargeAdjustments = {};
    log.forEach((e, idx) => {
      const ex = exs[idx];
      if ((ex.type === "standard" || ex.type === "heavy") && e.charge != null && e.charge < e.presc.value) chargeAdjustments[ex.type] = Math.min(chargeAdjustments[ex.type] ?? Infinity, e.charge);
    });
    const payload = { data: log.map(({ exercise, sets }) => ({ exercise, sets })), durationSec: elapsed };
    if (Object.keys(chargeAdjustments).length) payload.chargeAdjustments = chargeAdjustments;
    if (feel) payload.feel = feel;
    return payload;
  };

  // ── Récap ────────────────────────────────────────────────────────────────────
  if (step.kind === "recap") {
    const data = log.map(({ exercise, sets }) => ({ exercise, sets }));
    const pr = isVolumePR({ sessionId: session.id, week, completed: true, data }, workouts);
    return (
      <SessionShell onStop={stop} onColor={false} statusColor={C.bg}>
        <Stage scroll>
          <SessionSummary
            sessionName={session.name} subtitle={`${session.subtitle} · S${week}`}
            stats={{ durationSec: elapsed, doneSets, totalSets, exercises: exs.length, volumeKg: sessionVolume({ data }) }}
            isPR={pr}
            onSave={(feel) => { clearLive(); onFinish(buildPayload(feel)); }}
          />
        </Stage>
      </SessionShell>
    );
  }

  const colored = step.kind === "warmup" || step.kind === "cooldown" || (step.kind === "finishCardio" && phase === "run") || (step.kind === "exercise" && (phase === "countdown" || phase === "rest"));
  const statusColor =
    step.kind === "warmup" || step.kind === "cooldown" ? C.weight
      : step.kind === "finishCardio" ? (phase === "run" ? null : C.bg)
        : step.kind === "exercise" ? (phase === "countdown" ? C.protein : phase === "rest" ? C.weight : C.bg)
          : C.bg;

  return (
    <SessionShell onStop={stop} onColor={colored} statusColor={statusColor}>
      {step.kind === "warmup" && <PhaseStage title="Échauffement" detail={session.warmup.details} seconds={session.warmup.seconds} sound={sound} onDone={goNextStep} />}
      {step.kind === "cooldown" && <PhaseStage title="Retour au calme" detail={session.cooldown.details} seconds={session.cooldown.seconds} sound={sound} onDone={goNextStep} />}

      {step.kind === "finishCardio" && (
        phase === "run"
          ? <IntervalStage count={session.finishCardio.intervals.count} work={session.finishCardio.intervals.work} rest={session.finishCardio.intervals.rest} machine="Corde" label="Finition" sound={sound} onDone={goNextStep} />
          : <PrepareGeneric title={session.finishCardio.name} lines={[`${session.finishCardio.intervals.count} × ${session.finishCardio.intervals.work}s effort / ${session.finishCardio.intervals.rest}s récup`, session.finishCardio.tip]} onReady={() => setPhase("run")} />
      )}

      {step.kind === "exercise" && (() => {
        const exIdx = step.i;
        const ex = exs[exIdx];
        const entry = log[exIdx];
        const last = getLastPerformance(workouts, ex.name);
        const isTime = ex.type === "bodyweight" && ex.repsSeconds;
        const canAdjust = ex.type === "standard" || ex.type === "heavy";
        const curSet = entry.sets[setIdx];

        if (phase === "prepare") {
          const chargeLine = entry.charge != null ? `${entry.charge} kg${ex.loadLabel ? ` · ${ex.loadLabel}` : ""}${canAdjust ? ` · ${getDiscPlan(entry.charge)}` : ""}` : (ex.type === "bodyweight" ? "Poids du corps" : "");
          return <PrepareExercise ex={ex} entry={entry} chargeLine={chargeLine} last={last} isTime={isTime} exIdx={exIdx} total={exs.length} onReady={() => { setSetIdx(0); setPhase("countdown"); }} />;
        }
        if (phase === "countdown") {
          return <CountdownStage seconds={PREP_SECONDS} what={`${ex.name} · Série ${setIdx + 1}/${ex.sets}`} sound={sound} onDone={() => setPhase("set")} />;
        }
        if (phase === "rest") {
          return <RestStage seconds={ex.rest} sound={sound} nextLabel={`Série ${setIdx + 2}/${ex.sets}${entry.charge != null ? ` · ${entry.charge} kg` : ""}`} onReady={() => { setSetIdx((i) => i + 1); setPhase("countdown"); }} />;
        }
        // phase === "set"
        return (
          <Stage>
            <div className="flex items-center justify-between">
              <span className="rounded-xl px-3 py-1.5 text-sm font-extrabold text-white" style={{ background: `linear-gradient(120deg, ${C.protein}, ${C.accent})` }}>SÉRIE {setIdx + 1}/{ex.sets}</span>
              <button onClick={() => setShowTips((v) => !v)} className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold active:scale-95" style={{ backgroundColor: showTips ? `${C.accent}1a` : C.paper, color: showTips ? C.accent : C.sub }}><Info size={13} /> Technique</button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: C.muted }}>{isTime ? "Durée" : "Répétitions"}</p>
              {isTime ? (
                <p className="text-6xl font-extrabold" style={{ color: C.ink, fontFamily: FONT }}>{ex.reps}</p>
              ) : (
                <>
                  <NumberFlow value={curSet.repsDone ?? curSet.repsTarget ?? 0} size={116} color={C.ink} />
                  <div className="mt-1 flex items-center gap-4">
                    <button onClick={() => setReps(exIdx, -1)} className="flex h-12 w-12 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: C.card, color: C.sub }}><Minus size={22} /></button>
                    <button onClick={() => setReps(exIdx, 1)} className="flex h-12 w-12 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: C.card, color: C.sub }}><Plus size={22} /></button>
                  </div>
                </>
              )}

              {entry.charge != null && (
                <div className="mt-5 flex items-center gap-4 rounded-2xl px-4 py-2.5" style={{ backgroundColor: C.ink }}>
                  {canAdjust && <button onClick={() => adjustCharge(exIdx, -1)} className="flex h-9 w-9 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: `${C.bg}33`, color: C.bg }}><Minus size={17} /></button>}
                  <span className="tabular-nums" style={{ color: C.bg, fontFamily: FONT }}><span className="text-xl font-extrabold">{entry.charge}</span><span className="text-sm font-bold"> kg{ex.loadLabel ? ` · ${ex.loadLabel}` : ""}</span></span>
                  {canAdjust && <button onClick={() => adjustCharge(exIdx, 1)} className="flex h-9 w-9 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: `${C.bg}33`, color: C.bg }}><Plus size={17} /></button>}
                </div>
              )}
              {canAdjust && entry.charge != null && <p className="mt-1.5 text-[11px]" style={{ color: C.muted }}>{getDiscPlan(entry.charge)}</p>}
              {last && <p className="mt-2 flex items-center gap-1.5 text-xs" style={{ color: C.muted }}><HistoryIcon size={12} style={{ color: C.weight }} /> Dernière fois : <b style={{ color: C.sub }}>{last.weight ? `${last.weight} kg · ` : ""}{last.reps.join("/")}</b></p>}
              {entry.presc.note && <p className="mt-2 max-w-xs rounded-lg px-2.5 py-1.5 text-xs" style={{ backgroundColor: C.paper, color: entry.presc.direction === "down" ? C.over : entry.presc.direction === "up" ? C.green : C.sub }}>{entry.presc.note}</p>}

              {showTips && (
                <div className="mt-3 max-w-sm rounded-2xl p-3 text-left" style={cardStyle()}>
                  <p className="text-xs" style={{ color: C.sub }}>{ex.tech}</p>
                  {ex.tips?.length > 0 && <ul className="mt-2 space-y-1">{ex.tips.map((t, i) => <li key={i} className="flex gap-1.5 text-xs" style={{ color: C.sub }}><span style={{ color: C.green }}>•</span>{t}</li>)}</ul>}
                </div>
              )}
            </div>

            <div>
              <p className="mb-2 text-center text-xs font-semibold" style={{ color: C.sub }}>C'était comment ?</p>
              <div className="flex gap-2">
                {DIFFS.map((o) => <button key={o.v} onClick={() => rate(exIdx, o.v)} className="flex-1 rounded-2xl py-4 text-sm font-bold active:scale-95" style={{ backgroundColor: "transparent", color: diffColor(o.hint), border: `1.5px solid ${diffColor(o.hint)}` }}>{o.l}</button>)}
              </div>
            </div>
          </Stage>
        );
      })()}
    </SessionShell>
  );
}

// Annonce d'un exercice (force) — hero énergique + infos + « Je suis prêt ».
function PrepareExercise({ ex, entry, chargeLine, last, isTime, exIdx, total, onReady }) {
  return (
    <Stage scroll>
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {/* Hero */}
        <div className="rounded-3xl p-5" style={cardStyle({ background: `radial-gradient(140% 110% at 0% 0%, ${C.accent}26, transparent 60%), ${C.cardGrad}` })}>
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide" style={{ backgroundColor: `${C.accent}1a`, color: C.accent }}><Dumbbell size={12} /> À suivre · {exIdx + 1}/{total}</span>
            <PrescriptionBadge presc={entry.presc} ex={ex} />
          </div>
          <p className="text-2xl font-extrabold leading-tight" style={{ color: C.ink, fontFamily: FONT }}>{ex.name}</p>
          <p className="mt-1 text-sm font-semibold" style={{ color: C.sub }}>{ex.sets} × {isTime ? ex.reps : `${entry.sets[0].repsTarget ?? ex.reps} reps`}{ex.perSide ? " / côté" : ""} · repos {ex.rest}s</p>
          {chargeLine && (
            <div className="mt-3 flex items-center gap-2.5 rounded-2xl px-3.5 py-3" style={{ backgroundColor: C.ink }}>
              <Dumbbell size={16} style={{ color: C.bg }} />
              <span className="text-sm font-bold" style={{ color: C.bg }}>{chargeLine}</span>
            </div>
          )}
        </div>

        {last && (
          <div className="flex items-center gap-2.5 rounded-2xl p-3.5" style={cardStyle()}>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${C.weight}1a`, color: C.weight }}><HistoryIcon size={15} /></span>
            <span className="text-sm" style={{ color: C.sub }}>Dernière fois : <b style={{ color: C.ink }}>{last.weight ? `${last.weight} kg · ` : ""}{last.reps.join("/")}</b></span>
          </div>
        )}

        <div className="rounded-2xl p-4" style={cardStyle()}>
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: C.muted }}><Info size={12} /> Comment faire</p>
          <p className="text-sm" style={{ color: C.sub }}>{ex.tech}</p>
          {ex.tips?.length > 0 && <ul className="mt-2 space-y-1.5">{ex.tips.map((t, i) => <li key={i} className="flex gap-1.5 text-sm" style={{ color: C.sub }}><span style={{ color: C.green }}>•</span>{t}</li>)}</ul>}
        </div>
      </div>
      <button onClick={onReady} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-extrabold text-white active:scale-95" style={{ backgroundColor: C.green, boxShadow: `0 12px 28px -12px ${C.green}` }}><Play size={18} /> Je suis prêt</button>
    </Stage>
  );
}

// Annonce de la finition cardio — hero énergique centré.
function PrepareGeneric({ title, lines, onReady }) {
  return (
    <Stage>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
        <div className="w-full rounded-3xl p-6 text-center" style={cardStyle({ background: `radial-gradient(140% 110% at 50% 0%, ${C.protein}26, transparent 60%), ${C.cardGrad}` })}>
          <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: `${C.protein}1a`, color: C.protein }}><Flame size={26} /></span>
          <p className="text-xl font-extrabold" style={{ color: C.ink, fontFamily: FONT }}>{title}</p>
          {lines.filter(Boolean).map((l, i) => <p key={i} className="mt-2 text-sm" style={{ color: C.sub }}>{l}</p>)}
        </div>
      </div>
      <button onClick={onReady} className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-extrabold text-white active:scale-95" style={{ backgroundColor: C.green, boxShadow: `0 12px 28px -12px ${C.green}` }}><Play size={18} /> Je suis prêt</button>
    </Stage>
  );
}

export default ForceWorkout;
