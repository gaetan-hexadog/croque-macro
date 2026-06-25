import React, { useEffect, useState } from "react";
import { X, Play, Pause, SkipForward } from "lucide-react";
import { C } from "../core.js";
import { DurationFlow } from "./components.jsx";
import { useCountdown } from "./timers.jsx";

const FONT = "'Space Grotesk', system-ui";

// Empêche la mise en veille de l'écran pendant la séance (Wake Lock API, iOS 16.4+).
// Re-demande le verrou quand l'app repasse au premier plan.
export function useWakeLock(active) {
  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !navigator.wakeLock) return;
    let lock = null, cancelled = false;
    const acquire = async () => {
      try { lock = await navigator.wakeLock.request("screen"); } catch (_) {}
    };
    acquire();
    const onVis = () => { if (document.visibilityState === "visible" && !cancelled) acquire(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
      try { lock && lock.release(); } catch (_) {}
    };
  }, [active]);
}

// ════════════════════════════════════════════════════════════════════════════
// SessionShell — coquille PLEIN ÉCRAN d'une séance : couvre header + tabbar,
// garde l'écran allumé, et offre un Stop (avec confirmation) toujours accessible.
// `top` = barre fine (titre/étape) ; `children` = la scène (remplit la hauteur).
// ════════════════════════════════════════════════════════════════════════════
export function SessionShell({ title, subtitle, onStop, children }) {
  useWakeLock(true);
  const [confirm, setConfirm] = useState(false);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 80, background: C.bg, backgroundImage: C.bgImage, color: C.ink, display: "flex", flexDirection: "column", paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="flex items-center gap-3 px-4 pb-2 pt-3">
        <button onClick={() => setConfirm(true)} aria-label="Arrêter la séance" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }}><X size={18} /></button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-extrabold" style={{ color: C.ink, fontFamily: FONT }}>{title}</p>
          {subtitle && <p className="truncate text-[11px]" style={{ color: C.muted }}>{subtitle}</p>}
        </div>
        <div className="h-9 w-9 shrink-0" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-5 pb-4">{children}</div>

      {confirm && (
        <div style={{ position: "absolute", inset: 0, zIndex: 5, background: C.overlay, backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={() => setConfirm(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-xs rounded-3xl p-5 text-center" style={{ backgroundColor: C.sheet, border: `1px solid ${C.line}` }}>
            <p className="text-base font-extrabold" style={{ color: C.ink, fontFamily: FONT }}>Arrêter la séance ?</p>
            <p className="mt-1 mb-4 text-sm" style={{ color: C.sub }}>Ta progression de cette séance ne sera pas enregistrée.</p>
            <div className="flex flex-col gap-2">
              <button onClick={() => setConfirm(false)} className="rounded-2xl py-3 text-sm font-bold text-white active:scale-95" style={{ backgroundColor: C.green }}>Reprendre</button>
              <button onClick={onStop} className="rounded-2xl py-3 text-sm font-semibold active:scale-95" style={{ backgroundColor: `${C.over}14`, color: C.over, border: `1px solid ${C.over}33` }}>Arrêter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Scène générique : zone centrale (flex-1, centrée) + barre d'actions en bas.
// Exploite toute la hauteur dispo.
export function Stage({ children, actions }) {
  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center">{children}</div>
      {actions && <div className="shrink-0 pt-3">{actions}</div>}
    </>
  );
}

// Décompte géant : grand chiffre + anneau de progression. Visuel pur (le décompte
// est piloté par useCountdown dans le parent).
export function BigCountdown({ left, total, accent = C.weight, label, hint }) {
  const pct = total ? Math.max(0, left / total) : 0;
  const size = 260, stroke = 12, r = size / 2 - stroke / 2, c = 2 * Math.PI * r;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ display: "block", position: "absolute" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={accent} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dasharray 1s linear" }} />
      </svg>
      <div className="flex flex-col items-center">
        {label && <span className="mb-1 text-xs font-bold uppercase tracking-widest" style={{ color: accent }}>{label}</span>}
        <DurationFlow seconds={Math.max(0, left)} size={68} color={C.ink} />
        {hint && <span className="mt-1 text-xs" style={{ color: C.sub }}>{hint}</span>}
      </div>
    </div>
  );
}

// ── Scène : échauffement / retour au calme (durée fixe, auto-passe à 0) ───────
export function PhaseStage({ title, detail, seconds, sound, accent = C.weight, onDone }) {
  const [running, setRunning] = useState(true);
  const [left, setLeft] = useCountdown(seconds, running, { sound, onDone });
  return (
    <Stage actions={
      <div className="flex justify-center gap-2">
        <button onClick={() => setRunning((r) => !r)} className="flex items-center gap-1.5 rounded-2xl px-5 py-3 text-sm font-semibold active:scale-95" style={{ backgroundColor: C.card, color: C.ink }}>{running ? <><Pause size={16} /> Pause</> : <><Play size={16} /> Reprendre</>}</button>
        <button onClick={() => setLeft((l) => l + 30)} className="rounded-2xl px-4 py-3 text-sm font-semibold active:scale-95" style={{ backgroundColor: C.card, color: C.sub }}>+30s</button>
        <button onClick={onDone} className="flex items-center gap-1.5 rounded-2xl px-5 py-3 text-sm font-bold text-white active:scale-95" style={{ backgroundColor: accent }}><SkipForward size={16} /> Passer</button>
      </div>
    }>
      <p className="mb-4 text-lg font-extrabold" style={{ color: C.ink, fontFamily: FONT }}>{title}</p>
      <BigCountdown left={left} total={seconds} accent={accent} />
      {detail && <p className="mx-auto mt-5 max-w-sm text-sm" style={{ color: C.sub }}>{detail}</p>}
    </Stage>
  );
}

// ── Scène : repos inter-séries FORCE (chrono indicatif, départ MANUEL) ───────
// Le sportif souffle et démarre quand il est prêt ; les bips signalent la fin du
// repos conseillé mais on n'enchaîne pas tout seul.
export function RestStage({ seconds, sound, nextLabel, onReady }) {
  const [left, setLeft] = useCountdown(seconds, true, { sound });
  const over = left <= 0;
  return (
    <Stage actions={
      <div className="space-y-2">
        <button onClick={onReady} className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold text-white active:scale-95" style={{ backgroundColor: C.green, boxShadow: over ? `0 0 0 4px ${C.green}33` : "none" }}>{over ? "C'est parti 💪" : "Je suis prêt"}</button>
        <button onClick={() => setLeft((l) => l + 15)} className="w-full rounded-2xl py-2.5 text-sm font-semibold active:scale-95" style={{ backgroundColor: C.card, color: C.sub }}>+15 s de repos</button>
      </div>
    }>
      <BigCountdown left={left} total={seconds} accent={C.weight} label={over ? "Repos terminé" : "Repos"} />
      {nextLabel && <p className="mt-5 text-sm" style={{ color: C.sub }}>Ensuite : <b style={{ color: C.ink }}>{nextLabel}</b></p>}
    </Stage>
  );
}

// ── Scène : intervalles CARDIO/tabata (repos chronométré, auto-enchaîné) ──────
function Segment({ seconds, accent, label, hint, sound, onEnd }) {
  const [left] = useCountdown(seconds, true, { sound, onDone: onEnd });
  return <BigCountdown left={left} total={seconds} accent={accent} label={label} hint={hint} />;
}
export function IntervalStage({ count, work, rest, machine, label, sound, onDone }) {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState("work");
  const effort = phase === "work";
  const onEnd = () => {
    if (effort) {
      if (rest > 0) setPhase("rest");
      else if (idx + 1 < count) setIdx((i) => i + 1);
      else onDone();
    } else {
      if (idx + 1 < count) { setIdx((i) => i + 1); setPhase("work"); }
      else onDone();
    }
  };
  return (
    <Stage actions={
      <button onClick={onDone} className="flex w-full items-center justify-center gap-1.5 rounded-2xl py-3 text-sm font-bold text-white active:scale-95" style={{ backgroundColor: C.sub }}><SkipForward size={16} /> Passer le bloc</button>
    }>
      <Segment key={`${idx}-${phase}`} seconds={effort ? work : rest} accent={effort ? C.protein : C.weight} label={`${effort ? "Effort" : "Récup"} · ${idx + 1}/${count}`} hint={`${label} · ${machine}`} sound={sound} onEnd={onEnd} />
    </Stage>
  );
}
