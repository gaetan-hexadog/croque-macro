import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Dumbbell, Play, Pause, Check, ChevronRight, ChevronLeft, Plus, Minus, Clock,
  Flame, Calendar, AlertTriangle, Info, TrendingUp, History as HistoryIcon, BookOpen, SkipForward,
} from "lucide-react";
import { C, cardStyle } from "./core.js";
import {
  SESSIONS, SESSION_ORDER, PROGRESSION, ADAPT_TIPS,
  getCurrentBlock, calcCurrentWeekFromStart, getRowerResistance, getDiscPlan, formatTime,
  getExercisePrescription, getAdaptiveSuggestion, getGapWarning, getProlongedBreakDays,
  DIFFICULTY_OPTIONS, daysBetween,
} from "./sport.js";

const DEFAULT_SESSION_DAYS = { A: 2, B: 4, C: 6 }; // Mardi / Jeudi / Samedi

// Petit bip (Web Audio, pas de fichier). freq: 880 fin de repos, 660 changement d'intervalle.
function playBeep(freq = 880) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = "sine"; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
    o.start(); o.stop(ctx.currentTime + 0.32);
    o.onended = () => ctx.close();
  } catch (_) {}
}

// ── Écran Sport : accueil + prévisualisation + lancement de séance ───────────
export function SportScreen({ sport = {}, setSport, workouts = {}, setWorkouts, pushNav, showToast }) {
  const [active, setActive] = useState(null);   // { sessionId } séance en cours
  const [preview, setPreview] = useState(null); // sessionId en consultation

  const startDate = sport.startDate || null;
  const currentWeek = sport.weekManuallySet ? (sport.currentWeek || 1) : calcCurrentWeekFromStart(startDate);
  const block = getCurrentBlock(currentWeek);
  const sessionDays = sport.preferences?.sessionDays || DEFAULT_SESSION_DAYS;

  const openPreview = (sessionId) => { if (pushNav) pushNav(() => setPreview(null)); setPreview(sessionId); };
  const startSession = (sessionId) => {
    setPreview(null);
    if (pushNav) pushNav(() => setActive(null));
    setActive({ sessionId });
  };
  const finishSession = (sessionId, payload) => {
    const id = `W${currentWeek}-${sessionId}`;
    const entry = { id, date: new Date().toISOString(), completed: true, sessionId, week: currentWeek, ...payload };
    setWorkouts((prev) => ({ ...prev, [id]: entry }));
    setActive(null);
    if (showToast) showToast(`Séance ${sessionId} enregistrée 💪`);
  };

  if (!startDate) return <Onboarding onStart={(iso) => setSport((s) => ({ ...s, startDate: iso, currentWeek: 1, weekManuallySet: false }))} />;

  if (active) {
    const session = SESSIONS[active.sessionId];
    const props = { session, week: currentWeek, sound: sport.soundEnabled !== false, onCancel: () => setActive(null), onFinish: (d) => finishSession(active.sessionId, d) };
    return session.type === "cardio" ? <CardioWorkout {...props} /> : <ForceWorkout {...props} workouts={workouts} />;
  }

  if (preview) {
    return <SessionPreview session={SESSIONS[preview]} week={currentWeek} workouts={workouts} done={!!workouts[`W${currentWeek}-${preview}`]} onBack={() => setPreview(null)} onStart={() => startSession(preview)} />;
  }

  return <SportHome sport={sport} setSport={setSport} workouts={workouts} currentWeek={currentWeek} block={block} sessionDays={sessionDays} onOpen={openPreview} />;
}

// ── Accueil ─────────────────────────────────────────────────────────────────
function SportHome({ sport, setSport, workouts, currentWeek, block, sessionDays, onOpen }) {
  const todayDow = new Date().getDay();
  const gap = getGapWarning(workouts);
  const todaysSession = SESSION_ORDER.find((sid) => sessionDays[sid] === todayDow);
  const doneThisWeek = (sid) => !!workouts[`W${currentWeek}-${sid}`];

  return (
    <div className="pb-2">
      <div className="mb-4 rounded-3xl p-5" style={cardStyle()}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.muted }}>Programme</p>
            <p className="text-2xl font-extrabold" style={{ color: C.ink, fontFamily: "'Space Grotesk', system-ui" }}>Semaine {currentWeek}<span style={{ color: C.muted }}>/14</span></p>
          </div>
          {block && (
            <div className="text-right">
              <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: block.phase === "Décharge" ? `${C.weight}22` : `${C.green}22`, color: block.phase === "Décharge" ? C.weight : C.green }}>{block.phase}</span>
              <p className="mt-1 text-xs" style={{ color: C.sub }}>Bloc {block.block} · {block.standard}/{block.heavy} kg</p>
            </div>
          )}
        </div>
      </div>

      {gap && <Banner level={gap.level} title={gap.title} message={gap.message} />}

      <p className="mb-2 px-1 text-sm font-bold" style={{ color: C.ink }}>Cette semaine</p>
      <div className="mb-4 space-y-2">
        {SESSION_ORDER.map((sid) => {
          const s = SESSIONS[sid];
          const done = doneThisWeek(sid);
          const isToday = todaysSession === sid;
          const sugg = getAdaptiveSuggestion(workouts, sid);
          return (
            <button key={sid} onClick={() => onOpen(sid)} className="flex w-full items-center gap-3 rounded-2xl p-4 text-left active:scale-[0.99]" style={cardStyle(isToday && !done ? { border: `1px solid ${C.green}`, borderTop: `1px solid ${C.green}` } : undefined)}>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: done ? `${C.green}22` : C.paper, color: done ? C.green : C.sub }}>
                {done ? <Check size={20} /> : <Dumbbell size={18} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-bold" style={{ color: C.ink }}>
                  {s.name} · {s.subtitle}
                  {isToday && !done && <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: C.green, color: "#fff" }}>Aujourd'hui</span>}
                </p>
                <p className="truncate text-xs" style={{ color: C.sub }}>{s.day} · {s.duration}{done ? " · fait ✓" : ""}{sugg ? " · ⚠︎ à retenter" : ""}</p>
              </div>
              <ChevronRight size={18} style={{ color: C.muted }} />
            </button>
          );
        })}
      </div>

      <WeekControl sport={sport} setSport={setSport} currentWeek={currentWeek} />
      <RecentHistory workouts={workouts} />
      <AdaptGuide />
    </div>
  );
}

function Banner({ level, title, message }) {
  const col = level === "warning" ? C.over : level === "good" ? C.green : C.weight;
  const Icon = level === "warning" ? AlertTriangle : Info;
  return (
    <div className="mb-4 flex gap-3 rounded-2xl p-4" style={{ backgroundColor: `${col}14`, border: `1px solid ${col}44` }}>
      <Icon size={18} style={{ color: col, flexShrink: 0, marginTop: 2 }} />
      <div>
        <p className="text-sm font-bold" style={{ color: C.ink }}>{title}</p>
        <p className="mt-0.5 text-xs" style={{ color: C.sub }}>{message}</p>
      </div>
    </div>
  );
}

function WeekControl({ sport, setSport, currentWeek }) {
  const [open, setOpen] = useState(false);
  const setWeek = (w) => setSport((s) => ({ ...s, currentWeek: Math.min(14, Math.max(1, w)), weekManuallySet: true }));
  const auto = () => setSport((s) => ({ ...s, weekManuallySet: false }));
  return (
    <div className="mb-4 rounded-2xl p-3" style={cardStyle()}>
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between active:scale-95">
        <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: C.ink }}><Calendar size={15} /> Régler la semaine</span>
        <ChevronRight size={16} style={{ color: C.muted, transform: open ? "rotate(90deg)" : "none", transition: "transform .2s" }} />
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <div className="flex items-center justify-center gap-4">
            <button onClick={() => setWeek(currentWeek - 1)} className="flex h-9 w-9 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: C.paper, color: C.sub }}><Minus size={16} /></button>
            <span className="text-xl font-extrabold tabular-nums" style={{ color: C.ink }}>S{currentWeek}</span>
            <button onClick={() => setWeek(currentWeek + 1)} className="flex h-9 w-9 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: C.paper, color: C.sub }}><Plus size={16} /></button>
          </div>
          <button onClick={auto} className="w-full rounded-xl py-2 text-xs font-semibold active:scale-95" style={{ backgroundColor: C.paper, color: C.sub }}>{sport.weekManuallySet ? "Revenir au calcul auto (date de début)" : "Semaine calculée automatiquement ✓"}</button>
        </div>
      )}
    </div>
  );
}

function RecentHistory({ workouts }) {
  const list = Object.values(workouts || {}).filter((e) => e?.completed).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);
  if (!list.length) return null;
  return (
    <div className="mb-4 rounded-2xl p-4" style={cardStyle()}>
      <p className="mb-2 flex items-center gap-2 text-sm font-bold" style={{ color: C.ink }}><HistoryIcon size={15} /> Dernières séances</p>
      <div className="space-y-1.5">
        {list.map((e) => {
          const d = daysBetween(new Date(e.date), new Date());
          const rel = d === 0 ? "aujourd'hui" : d === 1 ? "hier" : `il y a ${d} j`;
          const s = SESSIONS[e.sessionId];
          return (
            <div key={e.id} className="flex items-center justify-between text-xs">
              <span style={{ color: C.sub }}>S{e.week} · {s ? s.name : e.sessionId}</span>
              <span style={{ color: C.muted }}>{rel}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AdaptGuide() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-4 rounded-2xl p-4" style={cardStyle()}>
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between active:scale-95">
        <span className="flex items-center gap-2 text-sm font-bold" style={{ color: C.ink }}><BookOpen size={15} /> Si ça coince…</span>
        <ChevronRight size={16} style={{ color: C.muted, transform: open ? "rotate(90deg)" : "none", transition: "transform .2s" }} />
      </button>
      {open && (
        <div className="mt-3 space-y-2.5">
          {ADAPT_TIPS.map((t, i) => (
            <div key={i}>
              <p className="text-xs font-semibold" style={{ color: C.ink }}>{t.situation}</p>
              <p className="text-xs" style={{ color: C.sub }}>{t.response}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Onboarding({ onStart }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ backgroundColor: `${C.green}22`, color: C.green }}><Dumbbell size={28} /></div>
      <p className="text-xl font-extrabold" style={{ color: C.ink, fontFamily: "'Space Grotesk', system-ui" }}>Programme 14 semaines</p>
      <p className="mt-2 mb-6 text-sm" style={{ color: C.sub }}>Full-body + cardio, 3 séances/semaine. La charge progresse toute seule et s'adapte à tes retours.</p>
      <button onClick={() => onStart(new Date().toISOString())} className="w-full rounded-2xl py-3.5 font-semibold text-white active:scale-95" style={{ backgroundColor: C.green }}>Démarrer aujourd'hui</button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Détail d'une séance (consultation avant de démarrer)
// ════════════════════════════════════════════════════════════════
function SessionPreview({ session, week, workouts, done, onBack, onStart }) {
  const cardio = session.type === "cardio";
  return (
    <div className="pb-24">
      <WorkoutHeader title={`${session.name} · ${session.subtitle}`} subtitle={`${session.day} · ${session.duration} · S${week}`} onCancel={onBack} />
      {done && <Banner level="good" title="Séance déjà faite cette semaine" message="Tu peux la refaire ou la consulter — elle est marquée comme faite." />}

      {session.warmup && <PhaseCard label={`Échauffement · ${session.warmup.duration}`} detail={session.warmup.details} />}

      {cardio ? (
        <>
          {session.blocks.map((b, i) => (
            <div key={i} className="mb-3 rounded-2xl p-4" style={cardStyle()}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold" style={{ color: C.ink }}>{b.name}</p>
                <span className="text-xs font-semibold" style={{ color: C.sub }}>{b.machine}</span>
              </div>
              <p className="mt-1 text-xs" style={{ color: C.sub }}>{b.format === "intervalles" ? `${b.intervals.count} × ${b.intervals.work}s / ${b.intervals.rest}s repos` : `${formatTime(b.duration)} en continu`}</p>
              <p className="mt-1 text-xs" style={{ color: C.muted }}>{b.tip}</p>
            </div>
          ))}
          <div className="mb-3 rounded-2xl p-3" style={{ backgroundColor: C.paper, border: `1px dashed ${C.line}` }}>
            <p className="text-xs" style={{ color: C.sub }}>Résistance rameur suggérée cette semaine : <span className="font-bold" style={{ color: C.ink }}>{getRowerResistance(week)}/10</span></p>
          </div>
        </>
      ) : (
        session.exercises.map((ex) => {
          const presc = getExercisePrescription(ex, week, workouts);
          return (
            <div key={ex.name} className="mb-3 rounded-2xl p-4" style={cardStyle()}>
              <div className="mb-1 flex items-start justify-between gap-2">
                <p className="text-sm font-bold" style={{ color: C.ink }}>{ex.name}</p>
                <PrescriptionBadge presc={presc} ex={ex} />
              </div>
              <p className="text-xs font-semibold" style={{ color: C.sub }}>{ex.sets} × {ex.reps}{ex.perSide ? "" : ""} · repos {ex.rest}s{chargeHint(ex, presc)}</p>
              <p className="mt-1.5 text-xs" style={{ color: C.muted }}>{ex.tech}</p>
              {ex.tips?.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {ex.tips.map((t, i) => <li key={i} className="flex gap-1.5 text-xs" style={{ color: C.sub }}><span style={{ color: C.green }}>•</span>{t}</li>)}
                </ul>
              )}
            </div>
          );
        })
      )}

      {session.finishCardio && <PhaseCard label={session.finishCardio.name} detail={`${session.finishCardio.intervals.count} × ${session.finishCardio.intervals.work}s / ${session.finishCardio.intervals.rest}s repos. ${session.finishCardio.tip}`} />}
      {session.cooldown && <PhaseCard label={`Retour au calme · ${session.cooldown.duration}`} detail={session.cooldown.details} />}

      <div className="fixed inset-x-0 z-30 px-4" style={{ bottom: "calc(env(safe-area-inset-bottom) + 4.75rem)" }}>
        <button onClick={onStart} className="mx-auto flex max-w-md items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold text-white active:scale-95 w-full" style={{ backgroundColor: C.green, boxShadow: `0 12px 30px -10px ${C.shadow}` }}>
          <Play size={18} /> Démarrer la séance guidée
        </button>
      </div>
    </div>
  );
}

function chargeHint(ex, presc) {
  if (presc.mode === "charge" && presc.value != null) return ` · ${presc.value} kg (${getDiscPlan(presc.value)})`;
  if (ex.loadLabel) return ` · ${ex.loadLabel}`;
  return ex.type === "bodyweight" ? " · poids du corps" : "";
}

// ════════════════════════════════════════════════════════════════
// Minuteurs
// ════════════════════════════════════════════════════════════════
function useCountdown(seconds, running, sound, onDone) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => { setLeft(seconds); }, [seconds]);
  useEffect(() => {
    if (!running) return;
    if (left <= 0) { if (sound) playBeep(); onDone && onDone(); return; }
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left, running]); // eslint-disable-line
  return [left, setLeft];
}

// Minuteur plein écran-carte : échauffement / retour au calme.
function PhaseTimer({ seconds, title, detail, sound, accent = C.green, onDone }) {
  const [running, setRunning] = useState(true);
  const [left, setLeft] = useCountdown(seconds, running, sound, onDone);
  const pct = seconds ? Math.max(0, left / seconds) : 0;
  return (
    <div className="mb-3 rounded-3xl p-6 text-center" style={cardStyle()}>
      <p className="text-sm font-bold" style={{ color: C.ink }}>{title}</p>
      {detail && <p className="mx-auto mt-1 max-w-xs text-xs" style={{ color: C.sub }}>{detail}</p>}
      <p className="my-4 text-6xl font-bold tabular-nums" style={{ color: accent, fontFamily: "'Space Grotesk', system-ui" }}>{formatTime(Math.max(0, left))}</p>
      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: C.paper }}>
        <div className="h-full transition-all duration-1000 ease-linear" style={{ width: `${pct * 100}%`, backgroundColor: accent }} />
      </div>
      <div className="flex justify-center gap-2">
        <button onClick={() => setRunning((r) => !r)} className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold active:scale-95" style={{ backgroundColor: C.paper, color: C.ink }}>{running ? <><Pause size={15} /> Pause</> : <><Play size={15} /> Reprendre</>}</button>
        <button onClick={() => setLeft((l) => l + 30)} className="rounded-xl px-3 py-2 text-sm font-semibold active:scale-95" style={{ backgroundColor: C.paper, color: C.sub }}>+30s</button>
        <button onClick={onDone} className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white active:scale-95" style={{ backgroundColor: accent }}><SkipForward size={15} /> Passer</button>
      </div>
    </div>
  );
}

// Minuteur d'intervalles : effort/repos × N (cardio, finition corde).
function IntervalTimer({ count, work, rest, label, machine, sound, onDone }) {
  const [idx, setIdx] = useState(0);     // intervalle courant 0..count-1
  const [phase, setPhase] = useState("work"); // work | rest
  const [running, setRunning] = useState(true);
  const [left, setLeft] = useState(work);
  useEffect(() => {
    if (!running) return;
    if (left > 0) { const t = setTimeout(() => setLeft((l) => l - 1), 1000); return () => clearTimeout(t); }
    // transition
    if (phase === "work") {
      if (sound) playBeep(660);
      if (rest > 0) { setPhase("rest"); setLeft(rest); }
      else if (idx + 1 < count) { setIdx((i) => i + 1); setLeft(work); }
      else { if (sound) playBeep(); onDone && onDone(); }
    } else { // rest fini
      if (idx + 1 < count) { if (sound) playBeep(660); setIdx((i) => i + 1); setPhase("work"); setLeft(work); }
      else { if (sound) playBeep(); onDone && onDone(); }
    }
  }, [left, running, phase, idx]); // eslint-disable-line
  const effort = phase === "work";
  const accent = effort ? C.protein : C.weight;
  const total = effort ? work : rest;
  const pct = total ? Math.max(0, left / total) : 0;
  return (
    <div className="mb-3 rounded-3xl p-6 text-center" style={cardStyle()}>
      <p className="text-sm font-bold" style={{ color: C.ink }}>{label} · {machine}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide" style={{ color: accent }}>{effort ? "Effort" : "Repos"} · intervalle {idx + 1}/{count}</p>
      <p className="my-4 text-6xl font-bold tabular-nums" style={{ color: accent, fontFamily: "'Space Grotesk', system-ui" }}>{formatTime(Math.max(0, left))}</p>
      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: C.paper }}>
        <div className="h-full transition-all duration-1000 ease-linear" style={{ width: `${pct * 100}%`, backgroundColor: accent }} />
      </div>
      <div className="flex justify-center gap-2">
        <button onClick={() => setRunning((r) => !r)} className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold active:scale-95" style={{ backgroundColor: C.paper, color: C.ink }}>{running ? <><Pause size={15} /> Pause</> : <><Play size={15} /> Reprendre</>}</button>
        <button onClick={onDone} className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white active:scale-95" style={{ backgroundColor: accent }}><SkipForward size={15} /> Passer</button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Séance de FORCE — déroulé guidé pas à pas
// ════════════════════════════════════════════════════════════════
function ForceWorkout({ session, week, workouts, sound = true, onCancel, onFinish }) {
  const exs = session.exercises;
  // Étapes : échauffement → chaque exercice → (finition cardio) → retour au calme → récap
  const steps = useMemo(() => {
    const s = [{ kind: "warmup" }];
    exs.forEach((_, i) => s.push({ kind: "exercise", i }));
    if (session.finishCardio) s.push({ kind: "finishCardio" });
    s.push({ kind: "cooldown" });
    s.push({ kind: "recap" });
    return s;
  }, [session]); // eslint-disable-line
  const [stepIdx, setStepIdx] = useState(0);
  const step = steps[stepIdx];
  const goNext = () => setStepIdx((i) => Math.min(steps.length - 1, i + 1));
  const goPrev = () => setStepIdx((i) => Math.max(0, i - 1));

  // Journal des séries, charge ajustable en direct par exercice.
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

  const rate = (exIdx, setIdx, difficulty) => {
    setLog((prev) => prev.map((e, i) => i !== exIdx ? e : { ...e, sets: e.sets.map((s, j) => j !== setIdx ? s : { ...s, difficulty }) }));
    const ex = exs[exIdx];
    if (setIdx < ex.sets - 1) setRest({ left: ex.rest, total: ex.rest });
  };
  const setReps = (exIdx, setIdx, delta) => setLog((prev) => prev.map((e, i) => i !== exIdx ? e : { ...e, sets: e.sets.map((s, j) => j !== setIdx ? s : { ...s, repsDone: Math.max(0, (s.repsDone ?? s.repsTarget ?? 0) + delta) }) }));
  const adjustCharge = (exIdx, delta) => setLog((prev) => prev.map((e, i) => {
    if (i !== exIdx || e.charge == null) return e;
    const charge = Math.max(0, e.charge + delta);
    return { ...e, charge, sets: e.sets.map((s) => s.difficulty ? s : { ...s, weight: charge }) }; // n'affecte que les séries pas encore notées
  }));

  // Minuteur de repos inter-séries (flottant).
  const [rest, setRest] = useState(null);
  useEffect(() => {
    if (!rest) return;
    if (rest.left <= 0) { if (sound) playBeep(); setRest(null); return; }
    const t = setTimeout(() => setRest((r) => (r ? { ...r, left: r.left - 1 } : null)), 1000);
    return () => clearTimeout(t);
  }, [rest, sound]);

  const totalSets = log.reduce((a, e) => a + e.sets.length, 0);
  const doneSets = log.reduce((a, e) => a + e.sets.filter((s) => s.difficulty).length, 0);

  const finish = () => {
    const chargeAdjustments = {};
    log.forEach((e, idx) => {
      const ex = exs[idx];
      if ((ex.type === "standard" || ex.type === "heavy") && e.charge != null && e.charge < e.presc.value) {
        chargeAdjustments[ex.type] = Math.min(chargeAdjustments[ex.type] ?? Infinity, e.charge);
      }
    });
    const payload = { data: log.map(({ exercise, sets }) => ({ exercise, sets })) };
    if (Object.keys(chargeAdjustments).length) payload.chargeAdjustments = chargeAdjustments;
    onFinish(payload);
  };

  return (
    <div className="pb-2">
      <WorkoutHeader title={`${session.name} · ${session.subtitle}`} subtitle={`Étape ${stepIdx + 1}/${steps.length} · S${week}`} onCancel={onCancel} progress={`${doneSets}/${totalSets}`} />
      <StepDots count={steps.length} idx={stepIdx} />

      {step.kind === "warmup" && (
        <PhaseTimer seconds={session.warmup.seconds} title="Échauffement" detail={session.warmup.details} sound={sound} accent={C.weight} onDone={goNext} />
      )}

      {step.kind === "exercise" && (() => {
        const exIdx = step.i;
        const ex = exs[exIdx];
        const entry = log[exIdx];
        const allRated = entry.sets.every((s) => s.difficulty);
        return (
          <div>
            <div className="mb-3 rounded-2xl p-4" style={cardStyle()}>
              <div className="mb-1 flex items-start justify-between gap-2">
                <p className="text-sm font-bold" style={{ color: C.ink }}>{ex.name}</p>
                <PrescriptionBadge presc={entry.presc} ex={ex} />
              </div>
              {/* Charge + plan de disques, ajustable en direct (barre seulement) */}
              {entry.charge != null && (
                <div className="mt-2 flex items-center justify-between rounded-xl p-2.5" style={{ backgroundColor: C.paper }}>
                  <div>
                    <p className="text-sm font-bold tabular-nums" style={{ color: C.ink }}>{entry.charge} kg{ex.loadLabel ? ` · ${ex.loadLabel}` : ""}</p>
                    {ex.type !== "fixed" && <p className="text-xs" style={{ color: C.muted }}>{getDiscPlan(entry.charge)}</p>}
                  </div>
                  {ex.type !== "fixed" && (
                    <div className="flex items-center gap-2">
                      <button onClick={() => adjustCharge(exIdx, -1)} className="flex h-8 w-8 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: C.card, color: C.sub }}><Minus size={15} /></button>
                      <button onClick={() => adjustCharge(exIdx, 1)} className="flex h-8 w-8 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: C.card, color: C.sub }}><Plus size={15} /></button>
                    </div>
                  )}
                </div>
              )}
              {entry.presc.note && <p className="mt-2 rounded-lg px-2.5 py-1.5 text-xs" style={{ backgroundColor: C.paper, color: entry.presc.direction === "down" ? C.over : entry.presc.direction === "up" ? C.green : C.sub }}>{entry.presc.note}</p>}
              <p className="mt-2 text-xs" style={{ color: C.muted }}>{ex.tech}</p>
              {ex.tips?.length > 0 && <ul className="mt-2 space-y-1">{ex.tips.map((t, i) => <li key={i} className="flex gap-1.5 text-xs" style={{ color: C.sub }}><span style={{ color: C.green }}>•</span>{t}</li>)}</ul>}
            </div>

            <div className="mb-3 space-y-2">
              {entry.sets.map((s, setIdx) => (
                <SetRow key={setIdx} idx={setIdx} set={s} ex={ex} onReps={(d) => setReps(exIdx, setIdx, d)} onRate={(diff) => rate(exIdx, setIdx, diff)} />
              ))}
            </div>

            <div className="flex gap-2">
              {stepIdx > 0 && <button onClick={goPrev} className="rounded-2xl px-4 py-3 text-sm font-semibold active:scale-95" style={{ backgroundColor: C.paper, color: C.sub }}><ChevronLeft size={16} /></button>}
              <button onClick={goNext} className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-white active:scale-95" style={{ backgroundColor: allRated ? C.green : C.sub }}>
                {exIdx + 1 < exs.length ? "Exercice suivant" : "Continuer"} <ChevronRight size={16} />
              </button>
            </div>
          </div>
        );
      })()}

      {step.kind === "finishCardio" && (
        <IntervalTimer count={session.finishCardio.intervals.count} work={session.finishCardio.intervals.work} rest={session.finishCardio.intervals.rest} label={session.finishCardio.name} machine="Corde" sound={sound} onDone={goNext} />
      )}

      {step.kind === "cooldown" && (
        <PhaseTimer seconds={session.cooldown.seconds} title="Retour au calme" detail={session.cooldown.details} sound={sound} accent={C.weight} onDone={goNext} />
      )}

      {step.kind === "recap" && (
        <div>
          <div className="mb-3 rounded-2xl p-4" style={cardStyle()}>
            <p className="mb-2 text-sm font-bold" style={{ color: C.ink }}>Récap · {doneSets}/{totalSets} séries notées</p>
            {log.map((e) => (
              <div key={e.exercise} className="flex items-center justify-between border-t py-1.5 text-xs" style={{ borderColor: C.line }}>
                <span style={{ color: C.sub }}>{e.exercise}</span>
                <span className="font-semibold tabular-nums" style={{ color: C.ink }}>{e.charge != null ? `${e.charge} kg` : "PdC"} · {e.sets.filter((s) => s.difficulty).length}/{e.sets.length}</span>
              </div>
            ))}
          </div>
          <button onClick={finish} className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold text-white active:scale-95" style={{ backgroundColor: C.green }}><Check size={18} /> Enregistrer la séance</button>
        </div>
      )}

      {rest && (
        <div className="fixed inset-x-0 z-30 px-4" style={{ bottom: "calc(env(safe-area-inset-bottom) + 4.75rem)" }}>
          <div className="mx-auto max-w-md overflow-hidden rounded-2xl" style={{ backgroundColor: C.ink, boxShadow: `0 12px 30px -10px ${C.shadow}` }}>
            <div className="flex items-center gap-3 px-4 py-3">
              <Clock size={18} style={{ color: C.paper }} />
              <span className="text-xl font-bold tabular-nums" style={{ color: C.paper }}>{formatTime(rest.left)}</span>
              <span className="text-xs font-medium" style={{ color: `${C.paper}aa` }}>repos</span>
              <div className="ml-auto flex items-center gap-2">
                <button onClick={() => setRest((r) => r ? { left: r.left + 15, total: Math.max(r.total, r.left + 15) } : null)} className="rounded-full px-3 py-1.5 text-xs font-bold active:scale-95" style={{ backgroundColor: `${C.paper}22`, color: C.paper }}>+15s</button>
                <button onClick={() => setRest(null)} className="rounded-full px-3 py-1.5 text-xs font-bold active:scale-95" style={{ backgroundColor: C.green, color: "#fff" }}>Passer</button>
              </div>
            </div>
            <div className="h-1 w-full" style={{ backgroundColor: `${C.paper}22` }}>
              <div className="h-full transition-all duration-1000 ease-linear" style={{ width: `${rest.total ? (rest.left / rest.total) * 100 : 0}%`, backgroundColor: C.green }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StepDots({ count, idx }) {
  return (
    <div className="mb-4 flex gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-1 flex-1 rounded-full transition-colors" style={{ backgroundColor: i <= idx ? C.green : C.line }} />
      ))}
    </div>
  );
}

function PrescriptionBadge({ presc, ex }) {
  const label = presc.mode === "charge"
    ? (presc.value != null ? `${presc.value} kg` : "PdC")
    : `${presc.value} ${ex.perSide ? "reps/côté" : "reps"}${ex.loadLabel ? ` · ${ex.loadLabel}` : ""}`;
  const arrow = presc.direction === "up" ? "↑" : presc.direction === "down" ? "↓" : "";
  const col = presc.direction === "up" ? C.green : presc.direction === "down" ? C.over : C.sub;
  return <span className="shrink-0 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums" style={{ backgroundColor: `${col}1a`, color: col }}>{label} {arrow}</span>;
}

function SetRow({ idx, set, ex, onReps, onRate }) {
  const isTime = ex.type === "bodyweight" && ex.repsSeconds;
  return (
    <div className="rounded-xl p-2.5" style={{ backgroundColor: C.paper, border: set.difficulty ? `1px solid ${C.line}` : `1px solid transparent` }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold" style={{ color: C.sub }}>Série {idx + 1}{ex.perSide ? " (par côté)" : ""}</span>
        {!isTime ? (
          <div className="flex items-center gap-2">
            <button onClick={() => onReps(-1)} className="flex h-6 w-6 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: C.card, color: C.sub }}><Minus size={13} /></button>
            <span className="min-w-10 text-center text-sm font-bold tabular-nums" style={{ color: C.ink }}>{set.repsDone ?? "—"}<span className="text-xs font-normal" style={{ color: C.muted }}> rep</span></span>
            <button onClick={() => onReps(1)} className="flex h-6 w-6 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: C.card, color: C.sub }}><Plus size={13} /></button>
          </div>
        ) : <span className="text-sm font-bold" style={{ color: C.ink }}>{ex.reps}</span>}
      </div>
      <div className="mt-2 flex gap-1.5">
        {DIFFICULTY_OPTIONS.map((o) => {
          const on = set.difficulty === o.v;
          const col = o.hint === "down" ? C.over : o.hint === "up" ? C.green : C.sub;
          return <button key={o.v} onClick={() => onRate(o.v)} className="flex-1 rounded-lg py-1.5 text-xs font-semibold active:scale-95" style={on ? { backgroundColor: col, color: "#fff" } : { backgroundColor: C.card, color: C.sub }}>{o.l}</button>;
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Séance de CARDIO — déroulé guidé (échauffement, intervalles, retour au calme)
// ════════════════════════════════════════════════════════════════
function CardioWorkout({ session, week, sound = true, onCancel, onFinish }) {
  const steps = useMemo(() => [...session.blocks.map((_, i) => ({ kind: "block", i })), { kind: "numbers" }], [session]); // eslint-disable-line
  const [stepIdx, setStepIdx] = useState(0);
  const step = steps[stepIdx];
  const goNext = () => setStepIdx((i) => Math.min(steps.length - 1, i + 1));
  const [cardio, setCardio] = useState({ distance: "", rowerLevel: getRowerResistance(week), ropeJumps: "", rpe: "", notes: "" });
  const set = (k, v) => setCardio((c) => ({ ...c, [k]: v }));

  return (
    <div className="pb-2">
      <WorkoutHeader title={`${session.name} · ${session.subtitle}`} subtitle={`Étape ${stepIdx + 1}/${steps.length} · S${week}`} onCancel={onCancel} />
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
          <div className="mb-3 rounded-2xl p-4" style={cardStyle()}>
            <p className="mb-3 text-sm font-bold" style={{ color: C.ink }}>Tes chiffres (facultatif)</p>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Distance rameur (m)" value={cardio.distance} onChange={(v) => set("distance", v)} />
              <Field label="Résistance rameur" value={cardio.rowerLevel} onChange={(v) => set("rowerLevel", v)} />
              <Field label="Sauts à la corde" value={cardio.ropeJumps} onChange={(v) => set("ropeJumps", v)} />
              <Field label="Effort perçu /10" value={cardio.rpe} onChange={(v) => set("rpe", v)} />
            </div>
            <textarea value={cardio.notes} onChange={(e) => set("notes", e.target.value)} rows={2} placeholder="Notes…" className="mt-2 w-full rounded-xl p-2 text-sm outline-none" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink }} />
          </div>
          <button onClick={() => onFinish({ cardioData: cardio })} className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold text-white active:scale-95" style={{ backgroundColor: C.green }}><Check size={18} /> Enregistrer la séance</button>
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

function WorkoutHeader({ title, subtitle, onCancel, progress }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <button onClick={onCancel} aria-label="Retour" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }}><ChevronLeft size={20} /></button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-extrabold" style={{ color: C.ink, fontFamily: "'Space Grotesk', system-ui" }}>{title}</p>
        <p className="truncate text-xs" style={{ color: C.sub }}>{subtitle}</p>
      </div>
      {progress && <span className="shrink-0 rounded-full px-3 py-1 text-xs font-bold tabular-nums" style={{ backgroundColor: C.paper, color: C.sub }}>{progress}</span>}
    </div>
  );
}

function PhaseCard({ label, detail }) {
  return (
    <div className="mb-3 rounded-2xl p-3" style={{ backgroundColor: C.paper, border: `1px dashed ${C.line}` }}>
      <p className="text-xs font-bold" style={{ color: C.sub }}>{label}</p>
      <p className="mt-0.5 text-xs" style={{ color: C.muted }}>{detail}</p>
    </div>
  );
}

export default SportScreen;
