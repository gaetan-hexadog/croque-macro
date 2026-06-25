import React, { useState } from "react";
import {
  Dumbbell, Check, ChevronRight, ChevronLeft, Plus, Minus, Calendar, TrendingUp, TrendingDown,
  Minus as Flat, AlertTriangle, Info, CalendarCheck, History as HistoryIcon, BookOpen, Settings, PenLine,
} from "lucide-react";
import { C, cardStyle } from "../core.js";
import { SectionTitle } from "../ui.jsx";
import {
  SESSIONS, SESSION_ORDER, ADAPT_TIPS, getAdaptiveSuggestion, getGapWarning, daysBetween,
  strengthTrend, strengthSeries, assiduitySeries,
} from "../sport.js";
import { StatTile, RadialStat, Sparkline } from "./components.jsx";

const FONT = "'Space Grotesk', system-ui";

// ── Accueil Sport (piste B : timeline + carte force/assiduité) ───────────────
export function SportHome({ sport, setSport, workouts, currentWeek, block, sessionDays, onOpen, onOpenDetail, onManualLog, onSettings }) {
  const todayDow = new Date().getDay();
  const gap = getGapWarning(workouts);
  const todaysSession = SESSION_ORDER.find((sid) => sessionDays[sid] === todayDow);
  const doneThisWeek = (sid) => !!workouts[`W${currentWeek}-${sid}`];

  return (
    <div className="pb-2">
      {/* En-tête : semaine + phase + réglages */}
      <div className="mb-3 flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.muted }}>Programme · {block?.phase}</p>
          <p style={{ color: C.ink, fontFamily: FONT }}>
            <span className="text-2xl font-extrabold">Semaine {currentWeek}</span>
            <span className="text-sm font-bold" style={{ color: C.muted }}> /14</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {block && <span className="rounded-full px-3 py-1.5 text-xs font-bold" style={{ backgroundColor: block.phase === "Décharge" ? `${C.weight}22` : `${C.green}1a`, color: block.phase === "Décharge" ? C.weight : C.green }}>{block.standard}/{block.heavy} kg</span>}
          <button onClick={onSettings} aria-label="Réglages Sport" className="flex h-9 w-9 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }}><Settings size={17} /></button>
        </div>
      </div>

      <ForceAssiduityCard workouts={workouts} currentWeek={currentWeek} />

      {gap && <Banner level={gap.level} title={gap.title} message={gap.message} />}

      {/* Timeline de la semaine */}
      <SectionTitle>Cette semaine</SectionTitle>
      <div className="relative mb-4 pl-7">
        <div className="absolute left-2.5 top-3 bottom-4" style={{ width: 2, backgroundColor: C.line }} />
        {SESSION_ORDER.map((sid) => {
          const s = SESSIONS[sid];
          const done = doneThisWeek(sid);
          const isToday = todaysSession === sid;
          const sugg = getAdaptiveSuggestion(workouts, sid);
          const dotCol = done ? C.green : isToday ? C.accent : C.muted;
          return (
            <div key={sid} className="relative mb-2.5">
              <span className="absolute -left-7 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full" style={{ backgroundColor: done || isToday ? dotCol : C.paper, border: `2px solid ${done || isToday ? dotCol : C.line}` }}>
                {done && <Check size={11} color="#fff" />}
              </span>
              <button onClick={() => onOpen(sid)} className="flex w-full items-center gap-3 rounded-2xl p-3.5 text-left active:scale-[0.99]" style={cardStyle(isToday && !done ? { border: `1px solid ${C.accent}`, borderTop: `1px solid ${C.accent}` } : undefined)}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: done ? `${C.green}22` : C.paper, color: done ? C.green : C.sub }}>
                  {done ? <Check size={18} /> : <Dumbbell size={17} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-bold" style={{ color: C.ink }}>
                    {s.name} · {s.subtitle}
                    {isToday && !done && <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: C.accent }}>Aujourd'hui</span>}
                  </p>
                  <p className="truncate text-xs" style={{ color: C.sub }}>{s.day} · {s.duration}{done ? " · fait ✓" : ""}{sugg ? " · ⚠︎ à retenter" : ""}</p>
                </div>
                <ChevronRight size={18} style={{ color: C.muted }} />
              </button>
            </div>
          );
        })}
      </div>

      <WeekControl sport={sport} setSport={setSport} currentWeek={currentWeek} />
      <RecentHistory workouts={workouts} onOpenDetail={onOpenDetail} onManualLog={onManualLog} />
      <AdaptGuide />
    </div>
  );
}

// Carte « courbe de force + assiduité » (NOUVEAU).
function ForceAssiduityCard({ workouts, currentWeek }) {
  const series = strengthSeries(workouts);
  const points = series.map((p) => p.value);
  const trend = strengthTrend(workouts);
  const ass = assiduitySeries(workouts, currentWeek, 6);
  const TrendIcon = trend?.direction === "up" ? TrendingUp : trend?.direction === "down" ? TrendingDown : Flat;
  const trendCol = trend?.direction === "up" ? C.green : trend?.direction === "down" ? C.over : C.sub;
  const trendLabel = trend?.direction === "up" ? "Force en hausse" : trend?.direction === "down" ? "Force en baisse" : "Force stable";

  return (
    <div className="mb-4 rounded-2xl p-4" style={cardStyle()}>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-bold" style={{ color: C.ink }}>
          <TrendIcon size={15} style={{ color: trendCol }} /> {trend ? trendLabel : "Courbe de force"}
        </span>
        {points.length >= 2
          ? <Sparkline points={points} color={trendCol} />
          : <span className="text-xs" style={{ color: C.muted }}>2 séances pour démarrer</span>}
      </div>
      <div className="mt-3 flex items-center justify-between border-t pt-3" style={{ borderColor: C.line }}>
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

function RecentHistory({ workouts, onOpenDetail, onManualLog }) {
  const list = Object.values(workouts || {}).filter((e) => e?.completed).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);
  return (
    <div className="mb-4 rounded-2xl p-4" style={cardStyle()}>
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

export default SportHome;
