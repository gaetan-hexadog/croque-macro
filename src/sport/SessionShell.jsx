import React, { useEffect, useState } from "react";
import { X, Play, Pause, SkipForward } from "lucide-react";
import { C, setThemeColor } from "../core.js";
import { NumberFlow, DurationFlow } from "./components.jsx";
import { useCountdown } from "./timers.jsx";

const FONT = "'Space Grotesk', system-ui";
const up = (ss, s) => (ss.uppercase ? String(s).toUpperCase() : s);

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
// SessionShell — séance PLEIN ÉCRAN (couvre header + tabbar). Rendu piloté par le
// « skin de séance » `ss` (theme.js) : variant "timer" = aplats de couleur (look
// d'origine) · variant "gym" = noir profond + accent néon/cyan, typo massive.
// ════════════════════════════════════════════════════════════════════════════
export function SessionShell({ ss, onStop, onColor, statusColor, children }) {
  useWakeLock(true);
  const [confirm, setConfirm] = useState(false);
  const isGym = ss.variant === "gym";
  useEffect(() => { if (statusColor) setThemeColor(statusColor); }, [statusColor]);
  useEffect(() => () => setThemeColor(C.bg), []);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 80, background: isGym ? ss.surface : C.bg, backgroundImage: isGym ? "none" : C.bgImage, color: ss.ink, display: "flex", flexDirection: "column" }}>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>

      <button onClick={() => setConfirm(true)} aria-label="Arrêter la séance"
        style={{ position: "absolute", top: "calc(env(safe-area-inset-top) + 10px)", left: 12, zIndex: 6, width: 38, height: 38, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center",
          background: onColor ? "rgba(255,255,255,0.22)" : ss.panel, border: onColor ? "none" : `1px solid ${ss.line}`, color: onColor ? "#fff" : ss.sub, backdropFilter: "blur(6px)" }}>
        <X size={18} />
      </button>

      {confirm && (
        <div style={{ position: "absolute", inset: 0, zIndex: 10, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={() => setConfirm(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-xs rounded-3xl p-5 text-center" style={{ backgroundColor: isGym ? "#15131b" : C.sheet, border: `1px solid ${ss.line}` }}>
            <p className="text-base font-extrabold" style={{ color: ss.ink, fontFamily: FONT }}>Arrêter la séance ?</p>
            <p className="mt-1 mb-4 text-sm" style={{ color: ss.sub }}>Ta progression de cette séance sera perdue.</p>
            <div className="flex flex-col gap-2">
              <button onClick={() => setConfirm(false)} className="rounded-2xl py-3 text-sm font-bold active:scale-95" style={{ backgroundColor: ss.good, color: isGym ? ss.onAccent : "#fff" }}>Reprendre</button>
              <button onClick={onStop} className="rounded-2xl py-3 text-sm font-semibold active:scale-95" style={{ backgroundColor: `${ss.effort}1f`, color: ss.effort, border: `1px solid ${ss.effort}44` }}>Arrêter</button>
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

// Scène COLORÉE plein cadre. timer → aplat de couleur (dégradé même teinte).
// gym → noir + barre/halo/ghost teintés (effort=néon, calme=cyan).
export function ColorStage({ ss, hue, ghost, children, actions }) {
  const isGym = ss.variant === "gym";
  const background = isGym ? ss.surface : `linear-gradient(160deg, ${hue}, ${hue}bb)`;
  return (
    <div style={{ height: "100%", background, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", padding: "calc(env(safe-area-inset-top) + 64px) 18px calc(env(safe-area-inset-bottom) + 18px)" }}>
      {isGym && <>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: hue }} />
        <div style={{ position: "absolute", left: "50%", top: "30%", width: 300, height: 300, transform: "translateX(-50%)", background: `radial-gradient(circle, ${hue}22, transparent 70%)`, pointerEvents: "none" }} />
        {ghost && <span style={{ position: "absolute", right: -14, bottom: -46, fontSize: 230, fontWeight: 800, lineHeight: 1, color: `${hue}14`, fontFamily: FONT, pointerEvents: "none" }}>{ghost}</span>}
      </>}
      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center text-center">{children}</div>
      {actions && <div className="relative shrink-0">{actions}</div>}
    </div>
  );
}

// Bouton d'action sur une scène colorée (adapté timer/gym).
function StageBtn({ ss, hue, children, primary, onClick }) {
  const isGym = ss.variant === "gym";
  const style = isGym
    ? (primary ? { backgroundColor: hue, color: ss.onAccent } : { backgroundColor: "rgba(255,255,255,0.10)", color: "#fff", border: `1px solid ${hue}55` })
    : { backgroundColor: primary ? "#fff" : "rgba(255,255,255,0.2)", color: primary ? hue : "#fff" };
  return <button onClick={onClick} className="flex items-center justify-center gap-1.5 rounded-2xl px-5 py-3 text-sm font-extrabold active:scale-95" style={{ ...style, fontFamily: FONT }}>{children}</button>;
}

const bigColor = (ss, hue) => (ss.variant === "gym" ? hue : "#fff");
const labelColor = (ss, hue) => (ss.variant === "gym" ? hue : "rgba(255,255,255,0.9)");
const SUBW = "rgba(255,255,255,0.85)";

// ── Compte à rebours « Prépare-toi » — début d'exercice / de série ───────────
export function CountdownStage({ ss, seconds = 5, what, sound, onDone }) {
  const [left] = useCountdown(seconds, true, { sound, onDone });
  const hue = ss.effort;
  return (
    <ColorStage ss={ss} hue={hue}>
      <p className="text-sm font-extrabold uppercase tracking-[0.2em]" style={{ color: labelColor(ss, hue) }}>Prépare-toi</p>
      <div style={{ margin: "6px 0" }}><NumberFlow value={Math.max(1, left)} size={150} color={bigColor(ss, hue)} /></div>
      {what && <p className="text-base font-bold text-white">{up(ss, what)}</p>}
      <p className="mt-1 text-sm" style={{ color: SUBW }}>Mets-toi en place 💪</p>
    </ColorStage>
  );
}

// ── Échauffement / retour au calme (durée fixe, auto à 0) ────────────────────
export function PhaseStage({ ss, title, detail, seconds, sound, onDone }) {
  const [running, setRunning] = useState(true);
  const [left, setLeft] = useCountdown(seconds, running, { sound, onDone });
  const hue = ss.warm;
  return (
    <ColorStage ss={ss} hue={hue} actions={
      <div className="flex justify-center gap-2">
        <StageBtn ss={ss} hue={hue} onClick={() => setRunning((r) => !r)}>{running ? <><Pause size={16} /> Pause</> : <><Play size={16} /> Reprendre</>}</StageBtn>
        <StageBtn ss={ss} hue={hue} onClick={() => setLeft((l) => l + 30)}>+30s</StageBtn>
        <StageBtn ss={ss} hue={hue} primary onClick={onDone}><SkipForward size={16} /> Passer</StageBtn>
      </div>
    }>
      <p className="text-sm font-extrabold uppercase tracking-[0.2em]" style={{ color: labelColor(ss, hue) }}>{up(ss, title)}</p>
      <div style={{ margin: "8px 0" }}><DurationFlow seconds={Math.max(0, left)} size={120} color={bigColor(ss, hue)} /></div>
      {detail && <p className="mx-auto max-w-sm text-sm" style={{ color: SUBW }}>{detail}</p>}
    </ColorStage>
  );
}

// ── Repos inter-séries FORCE (chrono qui s'enchaîne TOUT SEUL à 0) ───────────
export function RestStage({ ss, seconds, sound, nextLabel, next, onReady }) {
  const [left, setLeft] = useCountdown(seconds, true, { sound, onDone: onReady });
  const hue = ss.rest;
  const isGym = ss.variant === "gym";
  return (
    <ColorStage ss={ss} hue={hue} actions={
      <div className="space-y-2">
        <button onClick={onReady} className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-extrabold active:scale-95" style={isGym ? { backgroundColor: hue, color: ss.onAccent } : { backgroundColor: "rgba(255,255,255,0.22)", color: "#fff" }}><SkipForward size={17} /> Passer le repos</button>
        <button onClick={() => setLeft((l) => l + 15)} className="w-full rounded-2xl py-2.5 text-sm font-bold" style={isGym ? { backgroundColor: "rgba(255,255,255,0.08)", color: "#fff", border: `1px solid ${hue}44` } : { backgroundColor: "rgba(255,255,255,0.14)", color: "#fff" }}>+15 s</button>
      </div>
    }>
      <p className="text-sm font-extrabold uppercase tracking-[0.2em]" style={{ color: labelColor(ss, hue) }}>Repos</p>
      <div style={{ margin: "6px 0" }}><DurationFlow seconds={Math.max(0, left)} size={next ? 100 : 120} color={bigColor(ss, hue)} /></div>
      {next ? (
        <div className="mt-2 w-full max-w-sm rounded-2xl px-4 py-3 text-left" style={{ backgroundColor: isGym ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.16)", border: isGym ? `1px solid ${hue}33` : "none" }}>
          <p className="text-[11px] font-extrabold uppercase tracking-wide" style={{ color: labelColor(ss, hue) }}>Ensuite</p>
          <p className="mt-0.5 text-base font-extrabold leading-tight text-white">{up(ss, next.name)}</p>
          <p className="mt-0.5 text-sm font-semibold" style={{ color: SUBW }}>{next.target}{next.charge ? ` · ${next.charge}` : ""}</p>
          {next.tech && <p className="mt-1.5 text-xs leading-snug" style={{ color: isGym ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.82)" }}>{next.tech}</p>}
        </div>
      ) : nextLabel ? (
        <p className="text-sm font-bold" style={{ color: SUBW }}>Ensuite : {nextLabel}</p>
      ) : null}
    </ColorStage>
  );
}

// ── Intervalles CARDIO/tabata (repos chronométré, auto-enchaîné) ─────────────
function Segment({ ss, seconds, label, hint, sound, onEnd, hue }) {
  const [left] = useCountdown(seconds, true, { sound, onDone: onEnd });
  return (
    <>
      <p className="text-sm font-extrabold uppercase tracking-[0.2em]" style={{ color: labelColor(ss, hue) }}>{label}</p>
      <div style={{ margin: "6px 0" }}><DurationFlow seconds={Math.max(0, left)} size={130} color={bigColor(ss, hue)} /></div>
      <p className="text-base font-bold text-white">{up(ss, hint)}</p>
    </>
  );
}
// ── Gainage / maintien chronométré : prépa 5s → tenue → (côté 2) → fin ───────
// Flow : (prêt via l'écran d'annonce ou le repos) → 5s pour se positionner → tenue
// chronométrée → si perSide, gate « change de côté » → 5s → tenue → onDone().
// Pas de notation « trop lourd » (ça n'a aucun sens sur un gainage).
function PrepSeg({ ss, seconds, side, what, sound, onDone }) {
  const [left] = useCountdown(seconds, true, { sound, onDone });
  const hue = ss.rest;
  return (
    <ColorStage ss={ss} hue={hue}>
      <p className="text-sm font-extrabold uppercase tracking-[0.2em]" style={{ color: labelColor(ss, hue) }}>Prépare-toi{side ? ` · Côté ${side}/2` : ""}</p>
      <div style={{ margin: "6px 0" }}><NumberFlow value={Math.max(1, left)} size={140} color={bigColor(ss, hue)} /></div>
      {what && <p className="text-base font-bold text-white">{up(ss, what)}</p>}
      <p className="mt-1 text-sm" style={{ color: SUBW }}>En position 🧍</p>
    </ColorStage>
  );
}
function HoldSeg({ ss, seconds, side, setIdx, totalSets, sound, onDone }) {
  const [left] = useCountdown(seconds, true, { sound, onDone });
  const hue = ss.effort;
  return (
    <ColorStage ss={ss} hue={hue} actions={
      <button onClick={onDone} className="flex w-full items-center justify-center gap-1.5 rounded-2xl py-3 text-sm font-bold active:scale-95" style={ss.variant === "gym" ? { backgroundColor: "rgba(255,255,255,0.08)", color: "#fff", border: `1px solid ${hue}44` } : { backgroundColor: "rgba(255,255,255,0.18)", color: "#fff" }}><SkipForward size={16} /> Terminer la position</button>
    }>
      <p className="text-sm font-extrabold uppercase tracking-[0.2em]" style={{ color: labelColor(ss, hue) }}>Tiens la position !{side ? ` · Côté ${side}/2` : ""}</p>
      <div style={{ margin: "6px 0" }}><DurationFlow seconds={Math.max(0, left)} size={140} color={bigColor(ss, hue)} /></div>
      <p className="text-base font-bold text-white">Série {setIdx + 1}/{totalSets}</p>
    </ColorStage>
  );
}
export function HoldStage({ ss, seconds, perSide, what, setIdx, totalSets, sound, onDone }) {
  const totalSides = perSide ? 2 : 1;
  const [side, setSide] = useState(1);
  const [sub, setSub] = useState("prep"); // "prep" (5s) | "hold" (tenue) | "switch" (gate côté 2)
  if (sub === "switch") {
    return (
      <ColorStage ss={ss} hue={ss.rest} actions={
        <button onClick={() => { setSide(2); setSub("prep"); }} className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-extrabold active:scale-95" style={ss.variant === "gym" ? { backgroundColor: ss.rest, color: ss.onAccent } : { backgroundColor: "#fff", color: ss.rest }}><Play size={17} /> Démarrer le côté 2</button>
      }>
        <p className="text-sm font-extrabold uppercase tracking-[0.2em]" style={{ color: labelColor(ss, ss.rest) }}>Côté 1 terminé ✓</p>
        <p className="mt-1 text-3xl font-extrabold text-white" style={{ fontFamily: FONT }}>Change de côté</p>
        <p className="mt-2 text-sm" style={{ color: SUBW }}>Mets-toi en place, puis démarre.</p>
      </ColorStage>
    );
  }
  if (sub === "prep") return <PrepSeg ss={ss} seconds={5} side={perSide ? side : 0} what={what} sound={sound} onDone={() => setSub("hold")} />;
  return <HoldSeg ss={ss} seconds={seconds} side={perSide ? side : 0} setIdx={setIdx} totalSets={totalSets} sound={sound} onDone={() => { if (side < totalSides) setSub("switch"); else onDone(); }} />;
}

export function IntervalStage({ ss, count, work, rest, machine, label, sound, onDone }) {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState("work");
  const effort = phase === "work";
  const hue = effort ? ss.effort : ss.rest;
  useEffect(() => { setThemeColor(ss.variant === "gym" ? ss.surface : hue); }, [phase]); // eslint-disable-line
  const onEnd = () => {
    if (effort) { if (rest > 0) setPhase("rest"); else if (idx + 1 < count) setIdx((i) => i + 1); else onDone(); }
    else { if (idx + 1 < count) { setIdx((i) => i + 1); setPhase("work"); } else onDone(); }
  };
  return (
    <ColorStage ss={ss} hue={hue} actions={
      <button onClick={onDone} className="flex w-full items-center justify-center gap-1.5 rounded-2xl py-3.5 text-sm font-extrabold active:scale-95" style={ss.variant === "gym" ? { backgroundColor: "rgba(255,255,255,0.08)", color: "#fff", border: `1px solid ${hue}44` } : { backgroundColor: "rgba(255,255,255,0.18)", color: "#fff" }}><SkipForward size={16} /> Passer le bloc</button>
    }>
      <Segment key={`${idx}-${phase}`} ss={ss} hue={hue} seconds={effort ? work : rest} label={`${effort ? "Effort" : "Récup"} · ${idx + 1}/${count}`} hint={`${label} · ${machine}`} sound={sound} onEnd={onEnd} />
    </ColorStage>
  );
}
