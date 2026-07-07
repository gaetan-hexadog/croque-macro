import React from "react";
import { Play, Info, Tent } from "lucide-react";
import { cardStyle } from "../core.js";
import { sportTokens, SPORT_FONT } from "./theme.js";
import { getExercisePrescription, getRowerResistance, getDiscPlan, formatTime } from "../lib/sport.js";
import { PrescriptionBadge } from "./components.jsx";

// ── Consultation d'une séance avant de la démarrer (skin HUB de theme.js) ─────
export function SessionPreview({ session, week, workouts, done, onBack, onStart, onAdapt, sportTheme, exerciseCharges = {} }) {
  const t = sportTokens(sportTheme, "hub");
  const isGym = t.variant === "gym";
  const panel = isGym ? { backgroundColor: t.panel, border: `1px solid ${t.line}` } : cardStyle();
  const dashed = { backgroundColor: t.panel, border: `1px dashed ${t.line}` };
  const cardio = session.type === "cardio";
  return (
    <div className="pb-24" style={{ fontFamily: SPORT_FONT }}>
      {done && <Banner t={t} title="Séance déjà faite cette semaine" message="Tu peux la refaire ou la consulter — elle reste marquée comme faite." />}

      {onAdapt && (
        <button onClick={onAdapt} className="mb-3 flex w-full items-center gap-3 rounded-2xl p-3 text-left active:scale-[0.99]" style={{ backgroundColor: session.adapted ? `${t.accent}14` : t.panel, border: `1px solid ${session.adapted ? t.accent + "55" : t.line}` }}>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${t.accent}1a`, color: t.accent }}><Tent size={17} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold" style={{ color: t.ink }}>{session.adapted ? "Séance adaptée ✓" : "Adapter (matériel / temps)"}</span>
            <span className="block text-xs" style={{ color: t.muted }}>{session.adapted ? "Touche pour ré-adapter" : "Pas tout le matériel ? Peu de temps ?"}</span>
          </span>
        </button>
      )}

      {session.warmup && <PhaseCard t={t} dashed={dashed} label={`Échauffement · ${session.warmup.duration}`} detail={session.warmup.details} />}

      {cardio ? (
        <>
          {session.blocks.map((b, i) => (
            <div key={i} className="mb-3 rounded-2xl p-4" style={panel}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold" style={{ color: t.ink }}>{b.name}</p>
                <span className="text-xs font-semibold" style={{ color: t.sub }}>{b.machine}</span>
              </div>
              <p className="mt-1 text-xs" style={{ color: t.sub }}>{b.format === "intervalles" ? `${b.intervals.count} × ${b.intervals.work}s / ${b.intervals.rest}s repos` : `${formatTime(b.duration)} en continu`}</p>
              <p className="mt-1 text-xs" style={{ color: t.muted }}>{b.tip}</p>
            </div>
          ))}
          <div className="mb-3 rounded-2xl p-4" style={dashed}>
            <p className="text-xs" style={{ color: t.sub }}>Résistance rameur suggérée cette semaine : <span className="font-bold" style={{ color: t.ink }}>{getRowerResistance(week)}/10</span></p>
          </div>
        </>
      ) : (
        session.exercises.map((ex) => {
          const presc = getExercisePrescription(ex, week, workouts, exerciseCharges);
          return (
            <div key={ex.name} className="mb-3 rounded-2xl p-4" style={panel}>
              <div className="mb-1 flex items-start justify-between gap-2">
                <p className="text-sm font-bold" style={{ color: t.ink }}>{ex.name}</p>
                <PrescriptionBadge presc={presc} ex={ex} />
              </div>
              <p className="text-xs font-semibold" style={{ color: t.sub }}>{ex.sets} × {ex.reps} · repos {ex.rest}s{chargeHint(ex, presc)}</p>
              <p className="mt-1.5 text-xs" style={{ color: t.muted }}>{ex.tech}</p>
              {ex.tips?.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {ex.tips.map((tp, i) => <li key={i} className="flex gap-1.5 text-xs" style={{ color: t.sub }}><span style={{ color: t.good }}>•</span>{tp}</li>)}
                </ul>
              )}
            </div>
          );
        })
      )}

      {session.finishCardio && <PhaseCard t={t} dashed={dashed} label={session.finishCardio.name} detail={`${session.finishCardio.intervals.count} × ${session.finishCardio.intervals.work}s / ${session.finishCardio.intervals.rest}s repos. ${session.finishCardio.tip}`} />}
      {session.cooldown && <PhaseCard t={t} dashed={dashed} label={`Retour au calme · ${session.cooldown.duration}`} detail={session.cooldown.details} />}

      <div className="fixed inset-x-0 z-30 px-4" style={{ bottom: "calc(env(safe-area-inset-bottom) + 4.75rem)" }}>
        <button onClick={onStart} className="mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold active:scale-95" style={{ backgroundColor: t.good, color: isGym ? t.onAccent : "#fff", boxShadow: `0 12px 30px -10px ${t.good}` }}>
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

function Banner({ t, title, message }) {
  return (
    <div className="mb-3 flex gap-3 rounded-2xl p-4" style={{ backgroundColor: `${t.good}14`, border: `1px solid ${t.good}44` }}>
      <Info size={18} style={{ color: t.good, flexShrink: 0, marginTop: 2 }} />
      <div>
        <p className="text-sm font-bold" style={{ color: t.ink }}>{title}</p>
        <p className="mt-0.5 text-xs" style={{ color: t.sub }}>{message}</p>
      </div>
    </div>
  );
}

function PhaseCard({ t, dashed, label, detail }) {
  return (
    <div className="mb-3 rounded-2xl p-4" style={dashed}>
      <p className="text-xs font-bold" style={{ color: t.sub }}>{label}</p>
      <p className="mt-0.5 text-xs" style={{ color: t.muted }}>{detail}</p>
    </div>
  );
}

export default SessionPreview;
