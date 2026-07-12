import React, { useState, useEffect, useRef, useMemo } from "react";
import { Plus, Minus, Info, History as HistoryIcon, Dumbbell, Play, Flame, Target, Repeat, Clock, Timer, Feather, Check, ArrowLeftRight } from "lucide-react";
import { cardStyle } from "../core.js";
import { sportTokens, SPORT_FONT as FONT } from "./theme.js";
import { getExercisePrescription, getDiscPlan, getLastPerformance, sessionVolume, isVolumePR, resolveExId } from "../lib/sport.js";
import { NumberFlow, PrescriptionBadge, DIFFS } from "./components.jsx";
import { SessionShell, Stage, CountdownStage, PhaseStage, RestStage, IntervalStage, HoldStage } from "./SessionShell.jsx";
import { SessionSummary } from "./SessionSummary.jsx";
import { saveLive, clearLive } from "./liveSession.js";

const PREP_SECONDS = 5; // « prépare-toi » avant chaque exercice / série (force)

const repsNum = (r) => {
  if (typeof r === "number") return r;
  if (typeof r === "string") { const m = r.match(/\d+/); if (m) return parseInt(m[0], 10); }
  return null;
};

// Exercice unilatéral à répétitions (rowing 1 bras « 10/bras », fentes « 8/jambe »,
// curl en correctif bras) : mot du côté + accord du « droit(e) ».
const sideWordOf = (ex) => ex.sideWord || (typeof ex.reps === "string" && ex.reps.split("/")[1]?.trim()) || "côté";
const rightOf = (w) => (w === "jambe" ? "droite" : "droit");
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Icône + couleur d'un bouton de ressenti selon la direction. Couleurs distinctes
// garanties (en gym, good/effort/accent sont tous néon → on force vert/rouge/neutre).
const diffMeta = (ss, hint) => {
  const gym = ss.variant === "gym";
  if (hint === "up") return { col: gym ? "#6ee787" : ss.good, Ic: Feather };   // trop facile
  if (hint === "down") return { col: gym ? "#ff6a4d" : ss.effort, Ic: Flame }; // trop dur
  return { col: ss.sub, Ic: Check };                                            // bien
};

// ════════════════════════════════════════════════════════════════════════════
// ForceWorkout — séance de force PLEIN ÉCRAN. Rendu via le skin de séance `ss`
// (theme.js) : "timer" = aplats de couleur · "gym" = noir + néon/cyan. Le récap
// utilise le skin HUB (chaleureux en hybride).
// ════════════════════════════════════════════════════════════════════════════
export function ForceWorkout({ session, week, workouts, sound = true, onCancel, onFinish, resume, sportTheme, exerciseCharges = {}, inventory = {} }) {
  const ss = sportTokens(sportTheme, "session");
  const hub = sportTokens(sportTheme, "hub");
  const isGym = ss.variant === "gym";
  const panel = isGym ? { backgroundColor: ss.panel, border: `1px solid ${ss.line}` } : cardStyle();

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
  const [side, setSide] = useState(1); // exercices unilatéraux à reps : 1 = gauche, 2 = droit(e)
  const [showTips, setShowTips] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startTsRef = useRef(isResume && resume.startTs ? resume.startTs : Date.now());
  const step = steps[stepIdx];

  const [log, setLog] = useState(() => (isResume ? resume.log : exs.map((ex) => {
    const presc = getExercisePrescription(ex, week, workouts, exerciseCharges, inventory);
    const targetReps = presc.mode === "reps" ? presc.value : repsNum(ex.reps);
    const charge = presc.mode === "charge" ? presc.value : (presc.load ?? ex.load ?? null);
    return {
      exercise: ex.name, presc, charge, loadLabel: presc.loadLabel ?? ex.loadLabel ?? null,
      sets: Array.from({ length: ex.sets }, () => ({ weight: charge, repsTarget: targetReps, repsDone: targetReps, difficulty: null })),
    };
  })));

  useEffect(() => { setSide(1); }, [stepIdx, setIdx]); // chaque nouvelle série repart du côté gauche

  useEffect(() => {
    if (stepIdx >= recapIdx) return;
    const tick = () => setElapsed(Math.floor((Date.now() - startTsRef.current) / 1000));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [stepIdx, recapIdx]);

  useEffect(() => {
    if (stepIdx >= recapIdx) { clearLive(); return; }
    saveLive({ kind: "force", sessionId: session.id, week, session, stepIdx, setIdx, phase, log, startTs: startTsRef.current });
  }, [stepIdx, setIdx, phase, log]); // eslint-disable-line

  const stop = () => { clearLive(); onCancel(); };
  const goNextStep = () => { setStepIdx((i) => Math.min(steps.length - 1, i + 1)); setPhase("prepare"); setSetIdx(0); setShowTips(false); };
  // Enchaînement direct en phase « set » : RÉSERVÉ au superset (pas de repos entre les deux exos).
  // Tout autre nouvel exercice passe par goNextStep → écran d'annonce + bouton « Je suis prêt ».
  const goNextExerciseSet = () => { setStepIdx((i) => Math.min(steps.length - 1, i + 1)); setSetIdx(0); setPhase("set"); setShowTips(false); };
  const setReps = (exIdx, delta) => setLog((prev) => prev.map((e, i) => i !== exIdx ? e : { ...e, sets: e.sets.map((s, j) => j !== setIdx ? s : { ...s, repsDone: Math.max(0, (s.repsDone ?? s.repsTarget ?? 0) + delta) }) }));
  const adjustCharge = (exIdx, delta) => setLog((prev) => prev.map((e, i) => {
    if (i !== exIdx || e.charge == null) return e;
    const charge = Math.max(0, e.charge + delta);
    return { ...e, charge, sets: e.sets.map((s) => s.difficulty ? s : { ...s, weight: charge }) };
  }));
  const rate = (exIdx, diff) => {
    const ex = exs[exIdx];
    setLog((prev) => prev.map((e, i) => i !== exIdx ? e : { ...e, sets: e.sets.map((s, j) => j !== setIdx ? s : { ...s, difficulty: diff }) }));
    const next = exs[exIdx + 1];
    if (setIdx < ex.sets - 1) setPhase("rest");
    else if (next && ex.superset && next.superset === ex.superset) goNextExerciseSet();
    else if (next) setPhase("restNext");
    else goNextStep();
  };

  const totalSets = log.reduce((a, e) => a + e.sets.length, 0);
  const doneSets = log.reduce((a, e) => a + e.sets.filter((s) => s.difficulty).length, 0);

  const buildPayload = (feel) => {
    const chargeAdjustments = {};
    log.forEach((e, idx) => {
      const ex = exs[idx];
      if ((ex.type === "standard" || ex.type === "heavy") && e.charge != null && e.charge < e.presc.value) { const exId = resolveExId(ex.name) || ex.name; chargeAdjustments[exId] = Math.min(chargeAdjustments[exId] ?? Infinity, e.charge); }
    });
    const payload = { data: log.map(({ exercise, sets }) => ({ exercise, sets })), durationSec: elapsed };
    if (Object.keys(chargeAdjustments).length) payload.chargeAdjustments = chargeAdjustments;
    if (feel) payload.feel = feel;
    return payload;
  };

  // ── Récap (skin HUB) ─────────────────────────────────────────────────────────
  if (step.kind === "recap") {
    const data = log.map(({ exercise, sets }) => ({ exercise, sets }));
    const pr = isVolumePR({ sessionId: session.id, week, completed: true, data }, workouts);
    return (
      <SessionShell ss={hub} onStop={stop} onColor={false} statusColor={hub.surface}>
        <Stage scroll>
          <SessionSummary
            t={hub}
            sessionName={session.name} subtitle={`${session.subtitle} · S${week}`}
            stats={{ durationSec: elapsed, doneSets, totalSets, exercises: exs.length, volumeKg: sessionVolume({ data }) }}
            isPR={pr}
            onSave={(feel) => { clearLive(); onFinish(buildPayload(feel)); }}
          />
        </Stage>
      </SessionShell>
    );
  }

  const isRest = phase === "rest" || phase === "restNext";
  const colored = !isGym && (step.kind === "warmup" || step.kind === "cooldown" || (step.kind === "finishCardio" && phase === "run") || (step.kind === "exercise" && (phase === "countdown" || isRest)));
  const statusColor = isGym ? ss.surface : (
    step.kind === "warmup" || step.kind === "cooldown" ? ss.warm
      : step.kind === "finishCardio" ? (phase === "run" ? ss.effort : ss.surface)
        : step.kind === "exercise" ? (phase === "countdown" ? ss.effort : isRest ? ss.rest : ss.surface)
          : ss.surface);

  return (
    <SessionShell ss={ss} onStop={stop} onColor={colored} statusColor={statusColor}>
      {step.kind === "warmup" && <PhaseStage ss={ss} title="Échauffement" detail={session.warmup.details} seconds={session.warmup.seconds} sound={sound} onDone={goNextStep} />}
      {step.kind === "cooldown" && <PhaseStage ss={ss} title="Retour au calme" detail={session.cooldown.details} seconds={session.cooldown.seconds} sound={sound} onDone={goNextStep} />}

      {step.kind === "finishCardio" && (
        phase === "run"
          ? <IntervalStage ss={ss} count={session.finishCardio.intervals.count} work={session.finishCardio.intervals.work} rest={session.finishCardio.intervals.rest} machine="Corde" label="Finition" sound={sound} onDone={goNextStep} />
          : <PrepareGeneric ss={ss} panel={panel} title={session.finishCardio.name} lines={[`${session.finishCardio.intervals.count} × ${session.finishCardio.intervals.work}s effort / ${session.finishCardio.intervals.rest}s récup`, session.finishCardio.tip]} onReady={() => setPhase("run")} />
      )}

      {step.kind === "exercise" && (() => {
        const exIdx = step.i;
        const ex = exs[exIdx];
        const entry = log[exIdx];
        const last = getLastPerformance(workouts, ex.name);
        const isTime = ex.type === "bodyweight" && ex.repsSeconds;
        const canAdjust = ex.type === "standard" || ex.type === "heavy";
        const curSet = entry.sets[setIdx];
        // Unilatéral à répétitions : chaque série = côté GAUCHE d'abord, gate, puis côté droit.
        // (Le gainage/maintien chronométré a son propre flow par côté dans HoldStage.)
        const perSideReps = !isTime && (ex.perSide || (typeof ex.reps === "string" && ex.reps.includes("/")));
        const sideWord = perSideReps ? sideWordOf(ex) : null;
        const singleSide = perSideReps && ex.lastSetSingleSide && setIdx === ex.sets - 1; // série de rattrapage : gauche seul
        const sideName = side === 1 || singleSide ? "gauche" : rightOf(sideWord);

        if (phase === "prepare") {
          const chargeLine = entry.charge != null ? `${entry.charge} kg${entry.loadLabel ? ` · ${entry.loadLabel}` : ""}${canAdjust ? ` · ${getDiscPlan(entry.charge)}` : ""}` : (ex.type === "bodyweight" ? "Poids du corps" : "");
          return <PrepareExercise ss={ss} panel={panel} ex={ex} entry={entry} chargeLine={chargeLine} last={last} isTime={isTime} exIdx={exIdx} total={exs.length} onReady={() => { setSetIdx(0); setPhase(isTime ? "set" : "countdown"); }} />;
        }
        if (phase === "countdown") {
          return <CountdownStage ss={ss} seconds={PREP_SECONDS} what={`${ex.name} · Série ${setIdx + 1}/${ex.sets}${perSideReps ? ` · ${sideWord} gauche d'abord` : ""}`} sound={sound} onDone={() => setPhase("set")} />;
        }
        if (phase === "rest") {
          return <RestStage ss={ss} seconds={ex.rest} sound={sound} nextLabel={`Série ${setIdx + 2}/${ex.sets}${entry.charge != null ? ` · ${entry.charge} kg${entry.loadLabel ? ` · ${entry.loadLabel}` : ""}` : ""}`} onReady={() => { setSetIdx((i) => i + 1); setPhase("set"); }} />;
        }
        if (phase === "restNext") {
          // Repos après le DERNIER set d'un exercice → à 0 (ou skip) on retombe sur l'écran
          // d'annonce du prochain exo (« Je suis prêt ») : JAMAIS d'enchaînement direct sur un timer.
          const nx = exs[exIdx + 1];
          const nxEntry = log[exIdx + 1];
          const nxIsTime = nx.type === "bodyweight" && nx.repsSeconds;
          const nxCharge = nxEntry.charge != null ? `${nxEntry.charge} kg${nxEntry.loadLabel ? ` · ${nxEntry.loadLabel}` : ""}` : (nx.type === "bodyweight" ? "Poids du corps" : "");
          const nxReps = nxIsTime ? nx.reps : (typeof nx.reps === "string" ? nx.reps : `${nxEntry.sets[0].repsTarget ?? nx.reps} reps${nx.perSide ? `/${nx.sideWord || "côté"}` : ""}`);
          return <RestStage ss={ss} seconds={ex.rest} sound={sound} end="done" next={{ name: nx.name, target: `${nx.sets} × ${nxReps}`, charge: nxCharge, tech: nx.tech }} onReady={goNextStep} />;
        }
        // phase === "set"
        // Gainage / maintien → flow dédié plein écran (5s prépa → tenue → côté 2 → …).
        if (isTime) return <HoldStage key={`hold-${exIdx}-${setIdx}`} ss={ss} seconds={ex.repsSeconds || repsNum(ex.reps) || 30} perSide={ex.perSide} what={ex.name} setIdx={setIdx} totalSets={ex.sets} sound={sound} onDone={() => rate(exIdx, "parfait")} />;
        return (
          <Stage>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-lg font-extrabold leading-tight" style={{ color: ss.ink, fontFamily: FONT }}>{ex.name}</p>
                <span className="text-xs font-extrabold uppercase tracking-wide" style={{ color: ss.accent }}>Série {setIdx + 1}/{ex.sets}</span>
                {perSideReps && (
                  <span className="mt-1.5 flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide" style={{ backgroundColor: `${ss.warm}1f`, color: ss.warm }}>
                    <ArrowLeftRight size={12} /> {sideWord} {sideName}{singleSide ? " · rattrapage" : ` · ${side}/2`}
                  </span>
                )}
              </div>
              <button onClick={() => setShowTips((v) => !v)} className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold active:scale-95" style={{ backgroundColor: showTips ? `${ss.accent}1a` : ss.panel, color: showTips ? ss.accent : ss.sub }}><Info size={13} /> Technique</button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: ss.muted }}>Répétitions{perSideReps ? ` · ${sideWord} ${sideName}` : ""}</p>
              <NumberFlow value={curSet.repsDone ?? curSet.repsTarget ?? 0} size={116} color={ss.ink} />
              <div className="mt-1 flex items-center gap-4">
                <button onClick={() => setReps(exIdx, -1)} className="flex h-12 w-12 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: ss.panel, color: ss.sub }}><Minus size={22} /></button>
                <button onClick={() => setReps(exIdx, 1)} className="flex h-12 w-12 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: ss.panel, color: ss.sub }}><Plus size={22} /></button>
              </div>

              {entry.charge != null && (
                <div className="mt-5 flex items-center gap-4 rounded-2xl px-4 py-2.5" style={{ backgroundColor: isGym ? "rgba(255,255,255,0.08)" : ss.ink }}>
                  {canAdjust && <button onClick={() => adjustCharge(exIdx, -1)} className="flex h-9 w-9 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: isGym ? `${ss.accent}22` : `${ss.surface}33`, color: isGym ? ss.accent : ss.surface }}><Minus size={17} /></button>}
                  <span className="tabular-nums" style={{ color: isGym ? "#fff" : ss.surface, fontFamily: FONT }}><span className="text-xl font-extrabold">{entry.charge}</span><span className="text-sm font-bold"> kg{entry.loadLabel ? ` · ${entry.loadLabel}` : ""}</span></span>
                  {canAdjust && <button onClick={() => adjustCharge(exIdx, 1)} className="flex h-9 w-9 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: isGym ? `${ss.accent}22` : `${ss.surface}33`, color: isGym ? ss.accent : ss.surface }}><Plus size={17} /></button>}
                </div>
              )}
              {canAdjust && entry.charge != null && <p className="mt-1.5 text-[11px]" style={{ color: ss.muted }}>{getDiscPlan(entry.charge)}</p>}
              {last && <p className="mt-2 flex items-center gap-1.5 text-xs" style={{ color: ss.muted }}><HistoryIcon size={12} style={{ color: ss.rest }} /> Dernière fois : <b style={{ color: ss.sub }}>{last.weight ? `${last.weight} kg · ` : ""}{last.reps.join("/")}</b></p>}
              {entry.presc.note && <p className="mt-2 max-w-xs rounded-lg px-2.5 py-1.5 text-xs" style={{ backgroundColor: ss.panel, color: entry.presc.direction === "down" ? ss.effort : entry.presc.direction === "up" ? ss.good : ss.sub }}>{entry.presc.note}</p>}

              {showTips && (
                <div className="mt-3 max-w-sm rounded-2xl p-3 text-left" style={panel}>
                  <p className="text-xs" style={{ color: ss.sub }}>{ex.tech}</p>
                  {ex.tips?.length > 0 && <ul className="mt-2 space-y-1">{ex.tips.map((tp, i) => <li key={i} className="flex gap-1.5 text-xs" style={{ color: ss.sub }}><span style={{ color: ss.good }}>•</span>{tp}</li>)}</ul>}
                </div>
              )}
            </div>

            {perSideReps && !singleSide && side === 1 ? (
              // Côté gauche en cours : pas de notation tant que le droit n'est pas fait.
              <div>
                <p className="mb-2 text-center text-xs font-semibold" style={{ color: ss.sub }}>Fais tes {curSet.repsTarget ?? ""} reps du {sideWord} gauche, puis enchaîne.</p>
                <button onClick={() => setSide(2)} className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-extrabold active:scale-95" style={{ backgroundColor: ss.accent, color: isGym ? ss.onAccent : "#fff" }}>
                  <ArrowLeftRight size={18} /> {cap(sideWord)} gauche fait → {sideWord} {rightOf(sideWord)}
                </button>
              </div>
            ) : (
              // Notation : « Parfait » (le cas ultra-majoritaire) = GRAND bouton isolé en bas,
              // trop lourd / trop facile = petits boutons au-dessus, bien séparés — fini les
              // trois cibles identiques collées où le pouce se trompe en pleine séance.
              <div>
                <p className="mb-2 text-center text-xs font-semibold" style={{ color: ss.sub }}>C'était comment ?</p>
                <div className="mb-2.5 flex gap-3">
                  {DIFFS.filter((o) => o.v !== "parfait").map((o) => { const { col, Ic } = diffMeta(ss, o.hint); return (
                    <button key={o.v} onClick={() => rate(exIdx, o.v)} className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-2.5 active:scale-95" style={{ backgroundColor: `${col}1a`, border: `1px solid ${col}3a` }}>
                      <Ic size={15} style={{ color: col }} />
                      <span className="text-xs font-bold" style={{ color: col }}>{o.l}</span>
                    </button>
                  ); })}
                </div>
                <button onClick={() => rate(exIdx, "parfait")} className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-extrabold active:scale-95" style={{ backgroundColor: isGym ? "#fff" : ss.ink, color: isGym ? ss.onAccent : ss.surface }}>
                  <Check size={19} /> Parfait
                </button>
              </div>
            )}
          </Stage>
        );
      })()}
    </SessionShell>
  );
}

// Annonce d'un exercice (force) — écran « hero » harmonisé au skin de séance.
function PrepareExercise({ ss, panel, ex, entry, chargeLine, last, isTime, exIdx, total, onReady }) {
  const isGym = ss.variant === "gym";
  const presc = entry.presc;
  const heroCol = isGym ? ss.effort : (ex.type === "heavy" ? ss.effort : ex.type === "bodyweight" ? ss.good : ex.type === "fixed" ? ss.warm : ss.accent);
  const noteCol = presc.direction === "down" ? ss.effort : presc.direction === "up" ? ss.good : ss.sub;
  const perSideLike = ex.perSide || (typeof ex.reps === "string" && /\//.test(ex.reps));
  const repsVal = isTime ? `${ex.repsSeconds || repsNum(ex.reps)}s` : `${entry.sets[0].repsTarget ?? repsNum(ex.reps) ?? ex.reps}`;
  const repsLab = isTime ? (perSideLike ? "Tenir/côté" : "Tenir") : (perSideLike ? "Reps/côté" : "Reps");
  const Tile = ({ icon: Ic, col, value, label }) => (
    <div className="rounded-2xl p-3 text-center" style={panel}>
      <span className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: `${col}22`, color: col }}><Ic size={16} /></span>
      <p className="text-xl font-extrabold" style={{ color: ss.ink, fontFamily: FONT }}>{value}</p>
      <p className="text-[11px] font-medium" style={{ color: ss.sub }}>{label}</p>
    </div>
  );
  return (
    <Stage scroll>
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="relative overflow-hidden rounded-3xl p-5" style={isGym ? { backgroundColor: ss.panel, border: `1px solid ${ss.line}` } : cardStyle({ background: `radial-gradient(135% 120% at 0% 0%, ${heroCol}2e, transparent 62%), ${ssCardGrad(ss)}` })}>
          {isGym && <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: heroCol }} />}
          <div className="relative mb-2.5 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <span className="rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide" style={{ backgroundColor: `${heroCol}1f`, color: heroCol }}>Exo {exIdx + 1}/{total}</span>
              {ex.superset && <span className="rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide" style={{ backgroundColor: `${ss.warm}1a`, color: ss.warm }}>Superset</span>}
            </span>
            <PrescriptionBadge presc={presc} ex={ex} />
          </div>
          <p className="relative text-[28px] font-extrabold leading-[1.05]" style={{ color: ss.ink, fontFamily: FONT }}>{ex.name}</p>
          {chargeLine && (
            <div className="relative mt-3.5 flex items-center gap-2.5 rounded-2xl px-3.5 py-3" style={{ backgroundColor: isGym ? "rgba(255,255,255,0.08)" : ss.ink }}>
              <Dumbbell size={16} style={{ color: isGym ? ss.accent : ss.surface }} />
              <span className="text-sm font-extrabold" style={{ color: isGym ? "#fff" : ss.surface, fontFamily: FONT }}>{chargeLine}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Tile icon={Target} col={ss.accent} value={ex.sets} label="Séries" />
          <Tile icon={isTime ? Timer : Repeat} col={ss.good} value={repsVal} label={repsLab} />
          <Tile icon={Clock} col={ss.rest} value={`${ex.rest}s`} label="Repos" />
        </div>

        {presc.note && <p className="rounded-xl px-3 py-2 text-xs font-medium" style={{ backgroundColor: ss.panel, color: noteCol }}>{presc.note}</p>}

        {last && (
          <div className="flex items-center gap-2.5 rounded-2xl p-3.5" style={panel}>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${ss.rest}1a`, color: ss.rest }}><HistoryIcon size={15} /></span>
            <span className="text-sm" style={{ color: ss.sub }}>Dernière fois : <b style={{ color: ss.ink }}>{last.weight ? `${last.weight} kg · ` : ""}{last.reps.join("/")}</b></span>
          </div>
        )}

        <div className="rounded-2xl p-4" style={panel}>
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: ss.muted }}><Info size={12} /> Comment faire</p>
          <p className="text-sm" style={{ color: ss.sub }}>{ex.tech}</p>
          {ex.tips?.length > 0 && <ul className="mt-2 space-y-1.5">{ex.tips.map((tp, i) => <li key={i} className="flex gap-1.5 text-sm" style={{ color: ss.sub }}><span style={{ color: ss.good }}>•</span>{tp}</li>)}</ul>}
        </div>
      </div>
      <button onClick={onReady} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-extrabold active:scale-95" style={{ backgroundColor: ss.good, color: isGym ? ss.onAccent : "#fff" }}><Play size={18} /> Je suis prêt</button>
    </Stage>
  );
}

// Dégradé de carte pour la variante timer (proche de l'app).
const ssCardGrad = (ss) => (ss.variant === "gym" ? ss.panel : "linear-gradient(180deg, rgba(255,255,255,0.065), rgba(255,255,255,0.018))");

// Annonce de la finition cardio — hero énergique centré.
function PrepareGeneric({ ss, panel, title, lines, onReady }) {
  const isGym = ss.variant === "gym";
  return (
    <Stage>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
        <div className="w-full overflow-hidden rounded-3xl p-6 text-center" style={isGym ? { backgroundColor: ss.panel, border: `1px solid ${ss.line}` } : cardStyle({ background: `radial-gradient(140% 110% at 50% 0%, ${ss.effort}26, transparent 60%), ${ssCardGrad(ss)}` })}>
          <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: `${ss.effort}1a`, color: ss.effort }}><Flame size={26} /></span>
          <p className="text-xl font-extrabold" style={{ color: ss.ink, fontFamily: FONT }}>{title}</p>
          {lines.filter(Boolean).map((l, i) => <p key={i} className="mt-2 text-sm" style={{ color: ss.sub }}>{l}</p>)}
        </div>
      </div>
      <button onClick={onReady} className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-extrabold active:scale-95" style={{ backgroundColor: ss.good, color: isGym ? ss.onAccent : "#fff" }}><Play size={18} /> Je suis prêt</button>
    </Stage>
  );
}

export default ForceWorkout;
