import React, { useState } from "react";
import {
  Dumbbell, Check, ChevronRight, ChevronDown, TrendingUp, TrendingDown, Minus as Flat, Play,
  AlertTriangle, Flame, PenLine, Sprout, CalendarCheck, LineChart, History as HistoryIcon, Activity,
} from "lucide-react";
import { sportTokens, SPORT_FONT } from "./theme.js";
import {
  SESSIONS, SESSION_ORDER, getAdaptiveSuggestion, getCatchUp, daysBetween,
  strengthTrend, strengthSeries, assiduitySeries, activeWeekStreak,
} from "../lib/sport.js";
import { Sparkline } from "./components.jsx";

// ════════════════════════════════════════════════════════════════════════════
// SportHome — accueil « Launchpad » (design-lab, validé) : focus radical sur la
// séance du jour (héros dominant + coach intégré + Démarrer), une ligne momentum
// glanceable, PUIS le reste (semaine, progression, historique) replié à un tap.
// ════════════════════════════════════════════════════════════════════════════
export function SportHome({ sport = {}, workouts, currentWeek, sessionDays, startDate, onOpen, onOpenDetail, onManualLog, onCoach }) {
  const t = sportTokens(sport.sportTheme, "hub");
  const isGym = t.variant === "gym";
  const [open, setOpen] = useState({});
  const toggle = (k) => setOpen((o) => ({ ...o, [k]: !o[k] }));

  const todayDow = new Date().getDay();
  const catchUp = getCatchUp(workouts, sessionDays, startDate, currentWeek);
  const todayId = SESSION_ORDER.find((sid) => sessionDays[sid] === todayDow);
  const today = todayId ? SESSIONS[todayId] : null;
  const doneThisWeek = (sid) => !!workouts[`W${currentWeek}-${sid}`];
  const todayDone = todayId && doneThisWeek(todayId);
  const weekDone = SESSION_ORDER.filter(doneThisWeek).length;

  const trend = strengthTrend(workouts);
  const trendPct = trend && typeof trend.pct === "number" ? trend.pct : null;
  const pts = strengthSeries(workouts).map((p) => p.value);
  const ass = assiduitySeries(workouts, currentWeek, 6);
  const streak = activeWeekStreak(workouts, currentWeek);
  const TrendIcon = trend?.direction === "up" ? TrendingUp : trend?.direction === "down" ? TrendingDown : Flat;
  const trendCol = trend?.direction === "up" ? t.good : trend?.direction === "down" ? t.effort : t.sub;
  const trendLabel = trend?.direction === "up" ? "Force en hausse" : trend?.direction === "down" ? "Force en baisse" : "Force stable";

  const nextId = SESSION_ORDER.find((sid) => !doneThisWeek(sid) && sid !== todayId) || SESSION_ORDER.find((sid) => !doneThisWeek(sid));
  const next = nextId ? SESSIONS[nextId] : null;

  // Briefing du coach, dérivé des données réelles.
  const brief = (() => {
    if (catchUp.length) {
      const names = catchUp.map((id) => SESSIONS[id].name).join(", ");
      return `${catchUp.length > 1 ? `${catchUp.length} séances` : names} à rattraper — leur jour est passé. Fais-la aujourd'hui, ça compte pour la semaine.`;
    }
    if (today && !todayDone) {
      const sugg = getAdaptiveSuggestion(workouts, todayId);
      const base = trend?.direction === "up" ? "Ta force monte" : trend?.direction === "down" ? "Ta force fatigue un peu" : "Tu tiens le rythme";
      if (today.type === "cardio") return `${base}. Aujourd'hui c'est cardio — garde le déficit sans toucher au muscle.`;
      return `${base}. Aujourd'hui ${today.subtitle.toLowerCase()}${sugg ? " — une charge à retenter, vas-y franco" : " — soigne l'exécution"}.`;
    }
    if (todayDone) return `Séance du jour bouclée 💪 ${next ? `Prochaine : ${next.name}, ${next.day.toLowerCase()}.` : "Belle semaine."}`;
    return `Repos aujourd'hui. ${next ? `Prochaine séance : ${next.name}, ${next.day.toLowerCase()}.` : "Récupère bien."}`;
  })();

  const heroSession = today || next;
  const heroLabel = today ? (todayDone ? "Aujourd'hui · fait ✓" : "Aujourd'hui") : "Prochaine séance";

  return (
    <div className="pb-3" style={{ fontFamily: SPORT_FONT }}>
      {/* ── Héros dominant : la séance à faire, coach intégré, Démarrer ──
          timer/hybride → aplat de couleur (bleu) · gym → sombre + accents néon. */}
      {heroSession && (
        <div className="relative mb-3 overflow-hidden rounded-3xl p-5" style={isGym ? { backgroundColor: t.panel, border: `1px solid ${t.line}` } : { background: `linear-gradient(165deg, ${t.accent}, ${t.accent}d0)` }}>
          {isGym && <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: t.accent }} />}
          <span className="pointer-events-none absolute -bottom-10 -right-3 select-none text-[170px] font-extrabold leading-none" style={{ color: isGym ? `${t.accent}14` : "rgba(255,255,255,0.10)" }}>{heroSession.id}</span>
          <div className="relative">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: isGym ? t.accent : "rgba(255,255,255,0.85)" }}>{heroLabel} · {heroSession.day}</p>
            <p className="mt-1 text-[40px] font-extrabold leading-none text-white">{heroSession.name}</p>
            <p className="mt-1.5 text-sm font-semibold" style={{ color: isGym ? t.sub : "rgba(255,255,255,0.92)" }}>{heroSession.subtitle} · {heroSession.duration}</p>

            <Coach t={t} isGym={isGym} brief={brief} onCoach={onCoach} />

            <button onClick={() => onOpen(heroSession.id)} className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-extrabold active:scale-95" style={isGym ? { backgroundColor: t.accent, color: t.onAccent } : { backgroundColor: "#fff", color: t.accent }}>
              {todayDone ? <><Check size={17} /> Refaire / consulter</> : <><Play size={17} /> Démarrer la séance</>}
            </button>
          </div>
        </div>
      )}

      {/* ── Momentum : une ligne glanceable ── */}
      <div className="mb-4 flex items-stretch gap-2">
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl py-2.5" style={{ backgroundColor: t.panel, border: `1px solid ${t.line}` }}>
          <div className="flex gap-1">{SESSION_ORDER.map((sid) => <span key={sid} className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: doneThisWeek(sid) ? t.good : t.line }} />)}</div>
          <span className="mt-1 text-[11px] font-semibold" style={{ color: t.sub }}>{weekDone}/3 semaine</span>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl py-2.5" style={{ backgroundColor: t.panel, border: `1px solid ${t.line}` }}>
          <span className="flex items-center gap-1 text-sm font-extrabold" style={{ color: streak > 0 ? t.effort : t.muted }}><Flame size={14} /> {streak}</span>
          <span className="mt-0.5 text-[11px] font-semibold" style={{ color: t.sub }}>{streak > 1 ? "semaines" : "semaine"}</span>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl py-2.5" style={{ backgroundColor: t.panel, border: `1px solid ${t.line}` }}>
          <span className="flex items-center gap-1 text-sm font-extrabold" style={{ color: trendCol }}><TrendIcon size={13} /> {trendPct != null ? `${trendPct > 0 ? "+" : ""}${trendPct}%` : "—"}</span>
          <span className="mt-0.5 text-[11px] font-semibold" style={{ color: t.sub }}>force</span>
        </div>
      </div>

      {/* ── Le reste, replié : un tap ── */}
      <div className="space-y-2">
        <QuietSection t={t} icon={CalendarCheck} label="Cette semaine" open={open.semaine} onToggle={() => toggle("semaine")} badge={catchUp.length ? { text: `${catchUp.length} à rattraper`, col: t.effort } : null}>
          <div className="space-y-2">
            {SESSION_ORDER.map((sid) => {
              const s = SESSIONS[sid];
              const done = doneThisWeek(sid);
              const isToday = todayId === sid;
              const missed = catchUp.includes(sid);
              const col = done ? t.good : isToday ? t.accent : missed ? t.effort : t.muted;
              return (
                <button key={sid} onClick={() => onOpen(sid)} className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left active:scale-[0.99]" style={{ backgroundColor: t.surface, border: `1px solid ${isToday ? t.accent + "55" : missed ? t.effort + "55" : t.line}` }}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${col}1a`, color: col }}>{done ? <Check size={16} /> : missed ? <AlertTriangle size={15} /> : <Dumbbell size={15} />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-sm font-bold" style={{ color: t.ink }}>{s.name}
                      {isToday && !done && <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: t.accent }}>Auj.</span>}
                      {missed && <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: t.effort }}>Rattraper</span>}
                    </span>
                    <span className="block truncate text-xs" style={{ color: t.sub }}>{s.subtitle} · {s.day}{done ? " · fait ✓" : ""}</span>
                  </span>
                  <ChevronRight size={16} style={{ color: t.muted }} />
                </button>
              );
            })}
          </div>
        </QuietSection>

        <QuietSection t={t} icon={LineChart} label="Ma progression" open={open.progression} onToggle={() => toggle("progression")}>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm font-bold" style={{ color: t.ink }}><TrendIcon size={15} style={{ color: trendCol }} /> {trend ? trendLabel : "Courbe de force"}</span>
            {pts.length >= 2 ? <Sparkline points={pts} color={trendCol} /> : <span className="text-xs" style={{ color: t.muted }}>2 séances pour démarrer</span>}
          </div>
          <div className="mt-3 flex items-center justify-between border-t pt-3" style={{ borderColor: t.line }}>
            <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: t.sub }}><CalendarCheck size={13} /> Assiduité 6 sem.</span>
            <div className="flex items-end gap-1.5">
              {ass.map((a) => (
                <div key={a.week} className="flex flex-col items-center gap-1">
                  <div className="flex gap-0.5">{[0, 1, 2].map((i) => <span key={i} className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: i < a.done ? t.good : t.line }} />)}</div>
                  <span className="text-[9px]" style={{ color: t.muted }}>S{a.week}</span>
                </div>
              ))}
            </div>
          </div>
        </QuietSection>

        <QuietSection t={t} icon={HistoryIcon} label="Historique" open={open.historique} onToggle={() => toggle("historique")}
          action={<span onClick={(e) => { e.stopPropagation(); onManualLog(); }} className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold active:scale-95" style={{ backgroundColor: `${t.accent}1a`, color: t.accent }}><PenLine size={13} /> Loguer</span>}>
          <RecentHistory t={t} workouts={workouts} onOpenDetail={onOpenDetail} />
        </QuietSection>
      </div>
    </div>
  );
}

// Coach intégré au héros : avatar + briefing motivant, tappable → chat sport (si dispo).
function Coach({ t, isGym, brief, onCoach }) {
  const style = isGym
    ? { backgroundColor: "rgba(255,255,255,0.05)", border: `1px solid ${t.accent}33` }
    : { backgroundColor: "rgba(255,255,255,0.16)", border: "1px solid rgba(255,255,255,0.22)" };
  const avatarBg = isGym ? `${t.accent}22` : "rgba(255,255,255,0.22)";
  const avatarCol = isGym ? t.accent : "#fff";
  const labelCol = isGym ? t.accent : "rgba(255,255,255,0.8)";
  const textCol = isGym ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.95)";
  const inner = (
    <>
      <div className="mb-1.5 flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: avatarBg, color: avatarCol }}><Sprout size={14} /></span>
        <span className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: labelCol }}>Coach · aujourd'hui</span>
        {onCoach && <ChevronRight size={15} className="ml-auto" style={{ color: labelCol }} />}
      </div>
      <p className="text-xs leading-snug" style={{ color: textCol }}>{brief}</p>
    </>
  );
  return onCoach
    ? <button onClick={onCoach} className="mb-4 mt-4 block w-full rounded-2xl p-3 text-left active:scale-95" style={style}>{inner}</button>
    : <div className="mb-4 mt-4 rounded-2xl p-3" style={style}>{inner}</div>;
}

// Section repliable « quiet » : titre à un tap, contenu déroulé en dessous.
function QuietSection({ t, icon: Icon, label, open, onToggle, badge, action, children }) {
  return (
    <div className="rounded-2xl" style={{ backgroundColor: t.panel, border: `1px solid ${t.line}` }}>
      <button onClick={onToggle} className="flex w-full items-center gap-2.5 p-3.5 text-left active:scale-[0.99]">
        <Icon size={16} style={{ color: t.accent }} />
        <span className="text-sm font-bold" style={{ color: t.ink }}>{label}</span>
        {badge && <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: badge.col }}>{badge.text}</span>}
        <span className="ml-auto flex items-center gap-2">
          {action}
          <ChevronDown size={16} style={{ color: t.muted, transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
        </span>
      </button>
      {open && <div className="px-3.5 pb-3.5">{children}</div>}
    </div>
  );
}

function RecentHistory({ t, workouts, onOpenDetail }) {
  const list = Object.values(workouts || {}).filter((e) => e?.completed).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);
  if (list.length === 0) return <p className="text-xs" style={{ color: t.muted }}>Aucune séance enregistrée pour l'instant.</p>;
  return (
    <div className="space-y-0.5">
      {list.map((e) => {
        const d = daysBetween(new Date(e.date), new Date());
        const rel = d === 0 ? "aujourd'hui" : d === 1 ? "hier" : `il y a ${d} j`;
        const isFree = e.free;
        const s = SESSIONS[e.sessionId];
        const cardio = isFree || s?.type === "cardio";
        const label = isFree ? `Cardio libre${e.cardioData?.minutes ? ` · ${e.cardioData.minutes} min` : ""}` : `S${e.week} · ${s ? s.name : e.sessionId}${e.manual ? " · manuel" : ""}`;
        return (
          <button key={e.id} onClick={() => onOpenDetail(e)} className="flex w-full items-center gap-2.5 rounded-xl px-1 py-2 text-left active:scale-[0.99]">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: cardio ? `${t.rest}1a` : `${t.good}1a`, color: cardio ? t.rest : t.good }}>{isFree ? <Activity size={14} /> : <Dumbbell size={14} />}</span>
            <span className="flex-1 text-sm font-semibold" style={{ color: t.ink }}>{label}</span>
            <span className="text-xs" style={{ color: t.muted }}>{rel}</span>
            <ChevronRight size={15} style={{ color: t.muted }} />
          </button>
        );
      })}
    </div>
  );
}

export default SportHome;
