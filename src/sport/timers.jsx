import React, { useEffect, useState } from "react";
import { Play, Pause, SkipForward } from "lucide-react";
import { C, cardStyle } from "../core.js";
import { DurationFlow } from "./components.jsx";

// ════════════════════════════════════════════════════════════════════════════
// timers.jsx — minuteurs guidés (échauffement / retour au calme / intervalles).
// playBeep + useCountdown portés de l'ancien SportScreen ; gros chiffres animés.
// ════════════════════════════════════════════════════════════════════════════

// Petit bip (Web Audio, pas de fichier). 880 = fin de repos, 660 = changement d'intervalle.
export function playBeep(freq = 880) {
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

export function useCountdown(seconds, running, sound, onDone) {
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

// Minuteur plein cadre : échauffement / retour au calme.
export function PhaseTimer({ seconds, title, detail, sound, accent = C.weight, onDone }) {
  const [running, setRunning] = useState(true);
  const [left, setLeft] = useCountdown(seconds, running, sound, onDone);
  const pct = seconds ? Math.max(0, left / seconds) : 0;
  return (
    <div className="mb-3 rounded-3xl p-6 text-center" style={cardStyle()}>
      <p className="text-sm font-bold" style={{ color: C.ink }}>{title}</p>
      {detail && <p className="mx-auto mt-1 max-w-xs text-xs" style={{ color: C.sub }}>{detail}</p>}
      <div className="my-4 flex justify-center"><DurationFlow seconds={Math.max(0, left)} size={60} color={accent} /></div>
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
export function IntervalTimer({ count, work, rest, label, machine, sound, onDone }) {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState("work");
  const [running, setRunning] = useState(true);
  const [left, setLeft] = useState(work);
  useEffect(() => {
    if (!running) return;
    if (left > 0) { const t = setTimeout(() => setLeft((l) => l - 1), 1000); return () => clearTimeout(t); }
    if (phase === "work") {
      if (sound) playBeep(660);
      if (rest > 0) { setPhase("rest"); setLeft(rest); }
      else if (idx + 1 < count) { setIdx((i) => i + 1); setLeft(work); }
      else { if (sound) playBeep(); onDone && onDone(); }
    } else {
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
      <div className="my-4 flex justify-center"><DurationFlow seconds={Math.max(0, left)} size={60} color={accent} /></div>
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
