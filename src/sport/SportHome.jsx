import React, { useState } from "react";
import {
  Dumbbell, Check, ChevronRight, TrendingUp, TrendingDown, Minus as Flat,
  AlertTriangle, Info, CalendarCheck, History as HistoryIcon, BookOpen, PenLine,
} from "lucide-react";
import { C, cardStyle } from "../core.js";
import { SectionTitle } from "../components/ui.jsx";
import {
  SESSIONS, SESSION_ORDER, ADAPT_TIPS, getAdaptiveSuggestion, getGapWarning, getCatchUp, daysBetween,
  strengthTrend, strengthSeries, assiduitySeries,
} from "../lib/sport.js";
import { Sparkline } from "./components.jsx";

// ── Accueil Sport (piste B : carte progression + timeline) ───────────────────
// Pas de header local : le header global de l'app porte titre « Sport », sous-titre
// (semaine/phase), badge (charge) et les actions (réglages). Ici, que du contenu.
export function SportHome({ workouts, currentWeek, sessionDays, startDate, onOpen, onOpenDetail, onManualLog }) {
  const todayDow = new Date().getDay();
  const gap = getGapWarning(workouts);
  const catchUp = getCatchUp(workouts, sessionDays, startDate, currentWeek);
  const todaysSession = SESSION_ORDER.find((sid) => sessionDays[sid] === todayDow);
  const doneThisWeek = (sid) => !!workouts[`W${currentWeek}-${sid}`];

  return (
    <div className="pb-2">
      <ProgressCard workouts={workouts} currentWeek={currentWeek} />

      {catchUp.length > 0 && <CatchUpBanner sessions={catchUp} onOpen={onOpen} />}
      {gap && <Banner level={gap.level} title={gap.title} message={gap.message} />}

      {/* Timeline de la semaine */}
      <SectionTitle>Cette semaine</SectionTitle>
      <div className="relative mb-5 pl-7">
        <div className="absolute left-2.5 top-3 bottom-4" style={{ width: 2, backgroundColor: C.line }} />
        {SESSION_ORDER.map((sid) => {
          const s = SESSIONS[sid];
          const done = doneThisWeek(sid);
          const isToday = todaysSession === sid;
          const missed = catchUp.includes(sid);
          const sugg = getAdaptiveSuggestion(workouts, sid);
          const dotCol = done ? C.green : isToday ? C.accent : missed ? C.over : C.muted;
          const filled = done || isToday || missed;
          const edge = isToday && !done ? C.accent : missed ? C.over : null;
          return (
            <div key={sid} className="relative mb-3">
              <span className="absolute -left-7 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full" style={{ backgroundColor: filled ? dotCol : C.paper, border: `2px solid ${filled ? dotCol : C.line}` }}>
                {done && <Check size={11} color="#fff" />}
                {missed && !done && <AlertTriangle size={11} color="#fff" />}
              </span>
              <button onClick={() => onOpen(sid)} className="flex w-full items-center gap-3 rounded-2xl cm-card text-left active:scale-[0.99]" style={cardStyle(edge ? { border: `1px solid ${edge}`, borderTop: `1px solid ${edge}` } : undefined)}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: done ? `${C.green}22` : missed ? `${C.over}1a` : C.paper, color: done ? C.green : missed ? C.over : C.sub }}>
                  {done ? <Check size={18} /> : <Dumbbell size={17} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-bold" style={{ color: C.ink }}>
                    {s.name} · {s.subtitle}
                    {isToday && !done && <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: C.accent }}>Aujourd'hui</span>}
                    {missed && <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: C.over }}>À rattraper</span>}
                  </p>
                  <p className="truncate text-xs" style={{ color: C.sub }}>{s.day} · {s.duration}{done ? " · fait ✓" : missed ? " · jour passé" : ""}{sugg ? " · ⚠︎ à retenter" : ""}</p>
                </div>
                <ChevronRight size={18} style={{ color: C.muted }} />
              </button>
            </div>
          );
        })}
      </div>

      <RecentHistory workouts={workouts} onOpenDetail={onOpenDetail} onManualLog={onManualLog} />
      <AdaptGuide />
    </div>
  );
}

// Carte progression : courbe de force + assiduité (le contexte semaine/phase/charge
// est dans le header global).
function ProgressCard({ workouts, currentWeek }) {
  const points = strengthSeries(workouts).map((p) => p.value);
  const trend = strengthTrend(workouts);
  const ass = assiduitySeries(workouts, currentWeek, 6);
  const TrendIcon = trend?.direction === "up" ? TrendingUp : trend?.direction === "down" ? TrendingDown : Flat;
  const trendCol = trend?.direction === "up" ? C.green : trend?.direction === "down" ? C.over : C.sub;
  const trendLabel = trend?.direction === "up" ? "Force en hausse" : trend?.direction === "down" ? "Force en baisse" : "Force stable";

  return (
    <div className="mb-5 rounded-2xl cm-card" style={cardStyle()}>
      {/* Force */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-bold" style={{ color: C.ink }}>
          <TrendIcon size={15} style={{ color: trendCol }} /> {trend ? trendLabel : "Courbe de force"}
        </span>
        {points.length >= 2
          ? <Sparkline points={points} color={trendCol} />
          : <span className="text-xs" style={{ color: C.muted }}>2 séances pour démarrer</span>}
      </div>

      {/* Assiduité */}
      <div className="mt-4 flex items-center justify-between border-t pt-4" style={{ borderColor: C.line }}>
        <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: C.sub }}><CalendarCheck size={13} /> Assiduité 6 sem.</span>
        <div className="flex items-end gap-1.5">
          {ass.map((a) => (
            <div key={a.week} className="flex flex-col items-center gap-1">
              <div className="flex gap-0.5">
                {[0, 1, 2].map((i) => <span key={i} className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: i < a.done ? C.green : C.track }} />)}
              </div>
              <span className="text-[9px]" style={{ color: C.muted }}>S{a.week}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Bannière de rattrapage : une ou plusieurs séances dont le jour est passé sans
// qu'elles soient faites. Le bouton ouvre la plus ancienne ; la faire la logge sur
// la semaine en cours (rien ne se décale, c'est juste un jour différent).
export function CatchUpBanner({ sessions, onOpen }) {
  const col = C.over;
  const first = sessions[0];
  const s = SESSIONS[first];
  const multi = sessions.length > 1;
  return (
    <div className="mb-4 rounded-2xl cm-card" style={{ backgroundColor: `${col}14`, border: `1px solid ${col}44` }}>
      <div className="flex gap-3">
        <AlertTriangle size={18} style={{ color: col, flexShrink: 0, marginTop: 2 }} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold" style={{ color: C.ink }}>
            {multi ? `${sessions.length} séances à rattraper` : `${s.name} pas encore faite`}
          </p>
          <p className="mt-0.5 text-xs" style={{ color: C.sub }}>
            {multi
              ? `${sessions.map((id) => SESSIONS[id].name).join(", ")} : leur jour est passé cette semaine. Rattrape-les aujourd'hui, ça compte pour la semaine en cours.`
              : `Son jour (${s.day.toLowerCase()}) est passé. Rattrape-la aujourd'hui — ça compte pour cette semaine, rien ne se décale.`}
          </p>
        </div>
      </div>
      <button onClick={() => onOpen(first)} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold text-white active:scale-95" style={{ backgroundColor: col }}>
        <Dumbbell size={15} /> Rattraper {s.name} maintenant
      </button>
    </div>
  );
}

function Banner({ level, title, message }) {
  const col = level === "warning" ? C.over : level === "good" ? C.green : C.weight;
  const Icon = level === "warning" ? AlertTriangle : Info;
  return (
    <div className="mb-4 flex gap-3 rounded-2xl cm-card" style={{ backgroundColor: `${col}14`, border: `1px solid ${col}44` }}>
      <Icon size={18} style={{ color: col, flexShrink: 0, marginTop: 2 }} />
      <div>
        <p className="text-sm font-bold" style={{ color: C.ink }}>{title}</p>
        <p className="mt-0.5 text-xs" style={{ color: C.sub }}>{message}</p>
      </div>
    </div>
  );
}

function RecentHistory({ workouts, onOpenDetail, onManualLog }) {
  const list = Object.values(workouts || {}).filter((e) => e?.completed).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);
  return (
    <div className="mb-5 rounded-2xl cm-card" style={cardStyle()}>
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-bold" style={{ color: C.ink }}><HistoryIcon size={15} /> Dernières séances</p>
        <button onClick={onManualLog} className="flex items-center gap-1 text-xs font-semibold active:scale-95" style={{ color: C.accent }}><PenLine size={13} /> Ajouter</button>
      </div>
      {list.length === 0 ? (
        <p className="py-2 text-xs" style={{ color: C.muted }}>Aucune séance enregistrée pour l'instant.</p>
      ) : (
        <div className="space-y-0.5">
          {list.map((e) => {
            const d = daysBetween(new Date(e.date), new Date());
            const rel = d === 0 ? "aujourd'hui" : d === 1 ? "hier" : `il y a ${d} j`;
            const s = SESSIONS[e.sessionId];
            const cardio = s?.type === "cardio";
            return (
              <button key={e.id} onClick={() => onOpenDetail(e)} className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left active:scale-[0.99]">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: cardio ? `${C.weight}1a` : `${C.green}1a`, color: cardio ? C.weight : C.green }}><Dumbbell size={14} /></span>
                <span className="flex-1 text-sm font-semibold" style={{ color: C.ink }}>S{e.week} · {s ? s.name : e.sessionId}{e.manual ? " · manuel" : ""}</span>
                <span className="text-xs" style={{ color: C.muted }}>{rel}</span>
                <ChevronRight size={15} style={{ color: C.muted }} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AdaptGuide() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-5 rounded-2xl cm-card" style={cardStyle()}>
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

export default SportHome;
