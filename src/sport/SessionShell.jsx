import React, { useEffect, useState } from "react";
import { X, Play, Pause, SkipForward } from "lucide-react";
import { C, setThemeColor } from "../core.js";
import { NumberFlow, DurationFlow } from "./components.jsx";
import { useCountdown } from "./timers.jsx";

const FONT = "'Space Grotesk', system-ui";

// Empêche la mise en veille de l'écran pendant la séance (Wake Lock API).
export function useWakeLock(active) {
  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !navigator.wakeLock) return;
    let lock = null, cancelled = false;
    const acquire = async () => { try { lock = await navigator.wakeLock.request("screen"); } catch (_) {} };
    acquire();
    const onVis = () => { if (document.visibilityState === "visible" && !cancelled) acquire(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { cancelled = true; document.removeEventListener("visibilitychange", onVis); try { lock && lock.release(); } catch (_) {} };
  }, [active]);
}

// ════════════════════════════════════════════════════════════════════════════
// SessionShell — séance PLEIN ÉCRAN (couvre header + tabbar). Bouton Stop flottant
// (avec confirmation) toujours accessible. `onColor` adapte le Stop sur fond coloré.
// ════════════════════════════════════════════════════════════════════════════
export function SessionShell({ onStop, onColor, statusColor, children }) {
  useWakeLock(true);
  const [confirm, setConfirm] = useState(false);
  // Status bar (theme-color) accordée à l'écran courant ; restaurée en sortie.
  useEffect(() => { if (statusColor) setThemeColor(statusColor); }, [statusColor]);
  useEffect(() => () => setThemeColor(C.bg), []);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 80, background: C.bg, backgroundImage: C.bgImage, color: C.ink, display: "flex", flexDirection: "column" }}>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>

      <button onClick={() => setConfirm(true)} aria-label="Arrêter la séance"
        style={{ position: "absolute", top: "calc(env(safe-area-inset-top) + 10px)", left: 12, zIndex: 6, width: 38, height: 38, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center",
          background: onColor ? "rgba(255,255,255,0.22)" : C.card, border: onColor ? "none" : `1px solid ${C.line}`, color: onColor ? "#fff" : C.sub, backdropFilter: "blur(6px)" }}>
        <X size={18} />
      </button>

      {confirm && (
        <div style={{ position: "absolute", inset: 0, zIndex: 10, background: C.overlay, backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={() => setConfirm(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-xs rounded-3xl p-5 text-center" style={{ backgroundColor: C.sheet, border: `1px solid ${C.line}` }}>
            <p className="text-base font-extrabold" style={{ color: C.ink, fontFamily: FONT }}>Arrêter la séance ?</p>
            <p className="mt-1 mb-4 text-sm" style={{ color: C.sub }}>Ta progression de cette séance sera perdue.</p>
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

// Scène NEUTRE (série, prépa, récap) : padding (avec safe-areas) + clearance Stop.
export function Stage({ children, scroll }) {
  return <div className="flex min-h-0 flex-1 flex-col px-5" style={{ paddingTop: "calc(env(safe-area-inset-top) + 56px)", paddingBottom: "calc(env(safe-area-inset-bottom) + 20px)", overflowY: scroll ? "auto" : "visible" }}>{children}</div>;
}

// Scène COLORÉE plein cadre (countdown, repos, cardio, échauffement) : dégradé
// EDGE-TO-EDGE (jusque sous la status bar + safe-areas), contenu centré géant.
export function ColorStage({ from, to, children, actions }) {
  return (
    <div style={{ height: "100%", background: `linear-gradient(160deg, ${from}, ${to})`, display: "flex", flexDirection: "column", padding: "calc(env(safe-area-inset-top) + 64px) 18px calc(env(safe-area-inset-bottom) + 18px)" }}>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center">{children}</div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}

// ── Compte à rebours « Prépare-toi » (NOUVEAU) — début d'exercice / de série ──
export function CountdownStage({ seconds = 5, what, sound, onDone }) {
  const [left] = useCountdown(seconds, true, { sound, onDone });
  return (
    <ColorStage from={C.protein} to={C.green}>
      <p className="text-sm font-extrabold uppercase tracking-[0.2em]" style={{ color: "rgba(255,255,255,0.9)" }}>Prépare-toi</p>
      <div style={{ margin: "6px 0" }}><NumberFlow value={Math.max(1, left)} size={150} color="#fff" /></div>
      {what && <p className="text-base font-bold" style={{ color: "#fff" }}>{what}</p>}
      <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.85)" }}>Mets-toi en place 💪</p>
    </ColorStage>
  );
}

// ── Échauffement / retour au calme (durée fixe, auto à 0) ────────────────────
export function PhaseStage({ title, detail, seconds, sound, onDone }) {
  const [running, setRunning] = useState(true);
  const [left, setLeft] = useCountdown(seconds, running, { sound, onDone });
  return (
    <ColorStage from={C.weight} to={`${C.weight}bb`} actions={
      <div className="flex justify-center gap-2">
        <button onClick={() => setRunning((r) => !r)} className="flex items-center gap-1.5 rounded-2xl px-5 py-3 text-sm font-bold active:scale-95" style={{ backgroundColor: "rgba(255,255,255,0.2)", color: "#fff" }}>{running ? <><Pause size={16} /> Pause</> : <><Play size={16} /> Reprendre</>}</button>
        <button onClick={() => setLeft((l) => l + 30)} className="rounded-2xl px-4 py-3 text-sm font-bold active:scale-95" style={{ backgroundColor: "rgba(255,255,255,0.2)", color: "#fff" }}>+30s</button>
        <button onClick={onDone} className="flex items-center gap-1.5 rounded-2xl px-5 py-3 text-sm font-bold active:scale-95" style={{ backgroundColor: "#fff", color: C.weight }}><SkipForward size={16} /> Passer</button>
      </div>
    }>
      <p className="text-sm font-extrabold uppercase tracking-[0.2em]" style={{ color: "rgba(255,255,255,0.9)" }}>{title}</p>
      <div style={{ margin: "8px 0" }}><DurationFlow seconds={Math.max(0, left)} size={120} color="#fff" /></div>
      {detail && <p className="mx-auto max-w-sm text-sm" style={{ color: "rgba(255,255,255,0.9)" }}>{detail}</p>}
    </ColorStage>
  );
}

// ── Repos inter-séries FORCE (chrono indicatif, départ MANUEL) ───────────────
export function RestStage({ seconds, sound, nextLabel, onReady }) {
  const [left, setLeft] = useCountdown(seconds, true, { sound });
  const over = left <= 0;
  return (
    <ColorStage from={C.weight} to={`${C.weight}bb`} actions={
      <div className="space-y-2">
        <button onClick={onReady} className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-extrabold active:scale-95" style={{ backgroundColor: "#fff", color: C.weight }}><Play size={18} /> {over ? "C'est parti 💪" : "Je suis prêt"}</button>
        <button onClick={() => setLeft((l) => l + 15)} className="w-full rounded-2xl py-2.5 text-sm font-bold" style={{ backgroundColor: "rgba(255,255,255,0.18)", color: "#fff" }}>+15 s</button>
      </div>
    }>
      <p className="text-sm font-extrabold uppercase tracking-[0.2em]" style={{ color: "rgba(255,255,255,0.9)" }}>{over ? "Repos terminé" : "Repos"}</p>
      <div style={{ margin: "6px 0" }}><DurationFlow seconds={Math.max(0, left)} size={120} color="#fff" /></div>
      {nextLabel && <p className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.9)" }}>Ensuite : {nextLabel}</p>}
    </ColorStage>
  );
}

// ── Intervalles CARDIO/tabata (repos chronométré, auto-enchaîné) ─────────────
function Segment({ seconds, label, hint, sound, onEnd }) {
  const [left] = useCountdown(seconds, true, { sound, onDone: onEnd });
  return (
    <>
      <p className="text-sm font-extrabold uppercase tracking-[0.2em]" style={{ color: "rgba(255,255,255,0.95)" }}>{label}</p>
      <div style={{ margin: "6px 0" }}><DurationFlow seconds={Math.max(0, left)} size={130} color="#fff" /></div>
      <p className="text-base font-bold" style={{ color: "#fff" }}>{hint}</p>
    </>
  );
}
export function IntervalStage({ count, work, rest, machine, label, sound, onDone }) {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState("work");
  const effort = phase === "work";
  const accent = effort ? C.protein : C.weight;
  useEffect(() => { setThemeColor(accent); }, [phase]); // eslint-disable-line
  const onEnd = () => {
    if (effort) { if (rest > 0) setPhase("rest"); else if (idx + 1 < count) setIdx((i) => i + 1); else onDone(); }
    else { if (idx + 1 < count) { setIdx((i) => i + 1); setPhase("work"); } else onDone(); }
  };
  return (
    <ColorStage from={accent} to={`${accent}bb`} actions={
      <button onClick={onDone} className="flex w-full items-center justify-center gap-1.5 rounded-2xl py-3.5 text-sm font-extrabold active:scale-95" style={{ backgroundColor: "rgba(255,255,255,0.18)", color: "#fff" }}><SkipForward size={16} /> Passer le bloc</button>
    }>
      <Segment key={`${idx}-${phase}`} seconds={effort ? work : rest} label={`${effort ? "Effort" : "Récup"} · ${idx + 1}/${count}`} hint={`${label} · ${machine}`} sound={sound} onEnd={onEnd} />
    </ColorStage>
  );
}
