import React, { useState, useEffect, useRef } from "react";
import {
  Dumbbell, Play, Check, ChevronRight, ChevronLeft, Plus, Minus, Clock,
  Flame, Calendar, AlertTriangle, Info, TrendingUp, Sparkles, History as HistoryIcon, BookOpen,
} from "lucide-react";
import { C, cardStyle, TODAY } from "./core.js";
import {
  SESSIONS, SESSION_ORDER, PROGRESSION, RULES, ADAPT_TIPS,
  getCurrentBlock, calcCurrentWeekFromStart, getRowerResistance, getDiscPlan, formatTime,
  getExercisePrescription, getAdaptiveSuggestion, getGapWarning, getProlongedBreakDays,
  DIFFICULTY_OPTIONS, daysBetween,
} from "./sport.js";

const DEFAULT_SESSION_DAYS = { A: 2, B: 4, C: 6 }; // Mardi / Jeudi / Samedi

// Petit bip de fin de repos (Web Audio, pas de fichier).
function playBeep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = "sine"; o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
    o.start(); o.stop(ctx.currentTime + 0.32);
    o.onended = () => ctx.close();
  } catch (_) {}
}

// ── Écran Sport : accueil + lancement de séance ─────────────────────────────
export function SportScreen({ sport = {}, setSport, workouts = {}, setWorkouts, pushNav, showToast }) {
  const [active, setActive] = useState(null); // { sessionId } séance en cours

  const startDate = sport.startDate || null;
  const currentWeek = sport.weekManuallySet
    ? (sport.currentWeek || 1)
    : calcCurrentWeekFromStart(startDate);
  const block = getCurrentBlock(currentWeek);
  const sessionDays = sport.preferences?.sessionDays || DEFAULT_SESSION_DAYS;

  const startSession = (sessionId) => {
    if (pushNav) pushNav(() => setActive(null));
    setActive({ sessionId });
  };

  const finishSession = (sessionId, payload) => {
    const id = `W${currentWeek}-${sessionId}`;
    const entry = { id, date: new Date().toISOString(), completed: true, sessionId, week: currentWeek, ...payload };
    setWorkouts((prev) => ({ ...prev, [id]: entry }));
    // Avance la semaine courante automatiquement si calculée par date.
    setActive(null);
    if (showToast) showToast(`Séance ${sessionId} enregistrée 💪`);
  };

  if (!startDate) return <Onboarding onStart={(iso) => setSport((s) => ({ ...s, startDate: iso, currentWeek: 1, weekManuallySet: false }))} />;

  if (active) {
    const session = SESSIONS[active.sessionId];
    if (session.type === "cardio") {
      return <CardioWorkout session={session} week={currentWeek} onCancel={() => setActive(null)} onFinish={(d) => finishSession(active.sessionId, d)} />;
    }
    return <ForceWorkout session={session} week={currentWeek} workouts={workouts} sound={sport.soundEnabled !== false} onCancel={() => setActive(null)} onFinish={(d) => finishSession(active.sessionId, d)} />;
  }

  return (
    <SportHome
      sport={sport} setSport={setSport} workouts={workouts}
      currentWeek={currentWeek} block={block} sessionDays={sessionDays}
      onStart={startSession}
    />
  );
}

// ── Accueil ─────────────────────────────────────────────────────────────────
function SportHome({ sport, setSport, workouts, currentWeek, block, sessionDays, onStart }) {
  const today = new Date();
  const todayDow = today.getDay();
  const gapDays = getProlongedBreakDays(workouts);
  const gap = getGapWarning(workouts);

  // Quelle séance aujourd'hui / ensuite ?
  const todaysSession = SESSION_ORDER.find((sid) => sessionDays[sid] === todayDow);
  const doneThisWeek = (sid) => !!workouts[`W${currentWeek}-${sid}`];

  return (
    <div className="pb-2">
      {/* Bandeau semaine / bloc */}
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

      {/* Séances de la semaine */}
      <p className="mb-2 px-1 text-sm font-bold" style={{ color: C.ink }}>Cette semaine</p>
      <div className="mb-4 space-y-2">
        {SESSION_ORDER.map((sid) => {
          const s = SESSIONS[sid];
          const done = doneThisWeek(sid);
          const isToday = todaysSession === sid;
          const sugg = getAdaptiveSuggestion(workouts, sid);
          return (
            <button key={sid} onClick={() => onStart(sid)} className="flex w-full items-center gap-3 rounded-2xl p-4 text-left active:scale-[0.99]" style={cardStyle(isToday && !done ? { border: `1px solid ${C.green}`, borderTop: `1px solid ${C.green}` } : undefined)}>
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

      {/* Réglage semaine + date de début */}
      <WeekControl sport={sport} setSport={setSport} currentWeek={currentWeek} />

      {/* Historique récent */}
      <RecentHistory workouts={workouts} />

      {/* Antisèche adaptation */}
      <AdaptGuide />
    </div>
  );
}

function Banner({ level, title, message }) {
  const warn = level === "warning";
  const col = warn ? C.over : C.weight;
  const Icon = warn ? AlertTriangle : Info;
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
  const list = Object.values(workouts || {})
    .filter((e) => e?.completed)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 6);
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

// ── Onboarding ──────────────────────────────────────────────────────────────
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

// ── Séance de force ─────────────────────────────────────────────────────────
function ForceWorkout({ session, week, workouts, sound = true, onCancel, onFinish }) {
  // Minuteur de repos : démarre quand on note une série, bipe à 0.
  const [rest, setRest] = useState(null); // { left, total }
  useEffect(() => {
    if (!rest) return;
    if (rest.left <= 0) { if (sound) playBeep(); setRest(null); return; }
    const t = setTimeout(() => setRest((r) => (r ? { ...r, left: r.left - 1 } : null)), 1000);
    return () => clearTimeout(t);
  }, [rest, sound]);
  const startRest = (seconds) => { if (seconds > 0) setRest({ left: seconds, total: seconds }); };

  // Pré-calcule la prescription (charge/reps + raison) de chaque exercice.
  const [log, setLog] = useState(() => session.exercises.map((ex) => {
    const presc = getExercisePrescription(ex, week, workouts);
    const targetReps = presc.mode === "reps" ? presc.value : (typeof ex.reps === "number" ? ex.reps : ex.reps);
    return {
      exercise: ex.name,
      presc,
      sets: Array.from({ length: ex.sets }, () => ({
        weight: presc.mode === "charge" ? presc.value : (ex.load ?? null),
        repsTarget: typeof targetReps === "number" ? targetReps : null,
        repsDone: typeof targetReps === "number" ? targetReps : null,
        difficulty: null,
      })),
    };
  }));

  const rate = (exIdx, setIdx, difficulty) => {
    setLog((prev) => prev.map((e, i) => i !== exIdx ? e : {
      ...e, sets: e.sets.map((s, j) => j !== setIdx ? s : { ...s, difficulty }),
    }));
    // Lance le repos sauf si c'est la dernière série de l'exercice.
    const ex = session.exercises[exIdx];
    if (setIdx < ex.sets - 1) startRest(ex.rest);
  };
  const setReps = (exIdx, setIdx, delta) => setLog((prev) => prev.map((e, i) => i !== exIdx ? e : {
    ...e, sets: e.sets.map((s, j) => j !== setIdx ? s : { ...s, repsDone: Math.max(0, (s.repsDone ?? s.repsTarget ?? 0) + delta) }),
  }));

  const totalSets = log.reduce((a, e) => a + e.sets.length, 0);
  const doneSets = log.reduce((a, e) => a + e.sets.filter((s) => s.difficulty).length, 0);

  const finish = () => {
    onFinish({ data: log.map(({ exercise, sets }) => ({ exercise, sets })) });
  };

  return (
    <div className="pb-2">
      <WorkoutHeader title={`${session.name} · ${session.subtitle}`} subtitle={`${session.day} · ${session.duration}`} onCancel={onCancel} progress={`${doneSets}/${totalSets}`} />
      <PhaseCard label="Échauffement" detail={session.warmup.details} />

      {log.map((entry, exIdx) => {
        const ex = session.exercises[exIdx];
        return (
          <div key={ex.name} className="mb-3 rounded-2xl p-4" style={cardStyle()}>
            <div className="mb-1 flex items-start justify-between gap-2">
              <p className="text-sm font-bold" style={{ color: C.ink }}>{ex.name}</p>
              <PrescriptionBadge presc={entry.presc} ex={ex} />
            </div>
            <p className="mb-3 text-xs" style={{ color: C.muted }}>{ex.tech}</p>
            {entry.presc.note && <p className="mb-3 rounded-lg px-2.5 py-1.5 text-xs" style={{ backgroundColor: C.paper, color: entry.presc.direction === "down" ? C.over : entry.presc.direction === "up" ? C.green : C.sub }}>{entry.presc.note}</p>}
            <div className="space-y-2">
              {entry.sets.map((s, setIdx) => (
                <SetRow key={setIdx} idx={setIdx} set={s} ex={ex}
                  onReps={(d) => setReps(exIdx, setIdx, d)}
                  onRate={(diff) => rate(exIdx, setIdx, diff)} />
              ))}
            </div>
          </div>
        );
      })}

      {session.finishCardio && (
        <PhaseCard label={session.finishCardio.name} detail={`${session.finishCardio.intervals.count} × ${session.finishCardio.intervals.work}s effort / ${session.finishCardio.intervals.rest}s repos. ${session.finishCardio.tip}`} />
      )}
      <PhaseCard label="Retour au calme" detail={session.cooldown.details} />

      <button onClick={finish} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold text-white active:scale-95" style={{ backgroundColor: C.green }}>
        <Check size={18} /> Terminer la séance{doneSets < totalSets ? ` (${doneSets}/${totalSets})` : ""}
      </button>

      {rest && <RestTimer left={rest.left} total={rest.total} onSkip={() => setRest(null)} onAdd={() => setRest((r) => r ? { left: r.left + 15, total: Math.max(r.total, r.left + 15) } : null)} />}
    </div>
  );
}

// Barre de repos flottante (au-dessus de la TabBar) avec compte à rebours.
function RestTimer({ left, total, onSkip, onAdd }) {
  const pct = total ? Math.max(0, Math.min(1, left / total)) : 0;
  return (
    <div className="fixed inset-x-0 z-30 px-4" style={{ bottom: "calc(env(safe-area-inset-bottom) + 4.75rem)" }}>
      <div className="mx-auto max-w-md overflow-hidden rounded-2xl" style={{ backgroundColor: C.ink, boxShadow: `0 12px 30px -10px ${C.shadow}` }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <Clock size={18} style={{ color: C.paper }} />
          <span className="text-xl font-bold tabular-nums" style={{ color: C.paper }}>{formatTime(left)}</span>
          <span className="text-xs font-medium" style={{ color: `${C.paper}aa` }}>repos</span>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={onAdd} className="rounded-full px-3 py-1.5 text-xs font-bold active:scale-95" style={{ backgroundColor: `${C.paper}22`, color: C.paper }}>+15s</button>
            <button onClick={onSkip} className="rounded-full px-3 py-1.5 text-xs font-bold active:scale-95" style={{ backgroundColor: C.green, color: "#fff" }}>Passer</button>
          </div>
        </div>
        <div className="h-1 w-full" style={{ backgroundColor: `${C.paper}22` }}>
          <div className="h-full transition-all duration-1000 ease-linear" style={{ width: `${pct * 100}%`, backgroundColor: C.green }} />
        </div>
      </div>
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
  const isTime = ex.type === "bodyweight" && ex.repsSeconds; // gainage : pas de reps numériques
  return (
    <div className="rounded-xl p-2.5" style={{ backgroundColor: C.paper }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold" style={{ color: C.sub }}>Série {idx + 1}{ex.perSide ? " (par côté)" : ""}</span>
        {!isTime ? (
          <div className="flex items-center gap-2">
            <button onClick={() => onReps(-1)} className="flex h-6 w-6 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: C.card, color: C.sub }}><Minus size={13} /></button>
            <span className="min-w-[2.5rem] text-center text-sm font-bold tabular-nums" style={{ color: C.ink }}>{set.repsDone ?? "—"}<span className="text-xs font-normal" style={{ color: C.muted }}> rep</span></span>
            <button onClick={() => onReps(1)} className="flex h-6 w-6 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: C.card, color: C.sub }}><Plus size={13} /></button>
          </div>
        ) : <span className="text-sm font-bold" style={{ color: C.ink }}>{ex.reps}</span>}
      </div>
      <div className="mt-2 flex gap-1.5">
        {DIFFICULTY_OPTIONS.map((o) => {
          const on = set.difficulty === o.v;
          const col = o.hint === "down" ? C.over : o.hint === "up" ? C.green : C.sub;
          return (
            <button key={o.v} onClick={() => onRate(o.v)} className="flex-1 rounded-lg py-1.5 text-xs font-semibold active:scale-95" style={on ? { backgroundColor: col, color: "#fff" } : { backgroundColor: C.card, color: C.sub }}>{o.l}</button>
          );
        })}
      </div>
    </div>
  );
}

// ── Séance de cardio ────────────────────────────────────────────────────────
function CardioWorkout({ session, week, onCancel, onFinish }) {
  const [cardio, setCardio] = useState({ distance: "", rowerLevel: getRowerResistance(week), ropeJumps: "", rpe: "", notes: "" });
  const set = (k, v) => setCardio((c) => ({ ...c, [k]: v }));
  return (
    <div className="pb-2">
      <WorkoutHeader title={`${session.name} · ${session.subtitle}`} subtitle={`${session.day} · ${session.duration}`} onCancel={onCancel} />
      {session.blocks.map((b, i) => (
        <div key={i} className="mb-3 rounded-2xl p-4" style={cardStyle()}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold" style={{ color: C.ink }}>{b.name}</p>
            <span className="text-xs font-semibold" style={{ color: C.sub }}>{b.machine}</span>
          </div>
          <p className="mt-1 text-xs" style={{ color: C.sub }}>
            {b.format === "intervalles"
              ? `${b.intervals.count} × ${b.intervals.work}s effort / ${b.intervals.rest}s repos`
              : `${formatTime(b.duration)} en continu`}
          </p>
          <p className="mt-1 text-xs" style={{ color: C.muted }}>{b.tip}</p>
        </div>
      ))}
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
      <button onClick={() => onFinish({ cardioData: cardio })} className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold text-white active:scale-95" style={{ backgroundColor: C.green }}><Check size={18} /> Terminer la séance</button>
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
