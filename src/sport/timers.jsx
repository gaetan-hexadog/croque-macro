import { useEffect, useState } from "react";

// ════════════════════════════════════════════════════════════════════════════
// timers.jsx — logique pure des minuteurs de séance (sans UI).
// playBeep : Web Audio (pas de fichier). useCountdown : décompte avec bips
// d'avertissement sur les 3 dernières secondes (3-2-1) + bip final, pour que le
// sportif sache que ça arrive au bout SANS regarder l'écran.
// ════════════════════════════════════════════════════════════════════════════
export function playBeep(freq = 880, dur = 0.18) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = "sine"; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.start(); o.stop(ctx.currentTime + dur + 0.02);
    o.onended = () => ctx.close();
  } catch (_) {}
}

// Décompte 1 s. Bips 660 Hz à 3-2-1, bip final 880 Hz à 0 puis onDone().
// running=false met en pause. Renvoie [left, setLeft] (setLeft pour +15s/+30s).
export function useCountdown(seconds, running = true, { sound = true, onDone } = {}) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => { setLeft(seconds); }, [seconds]);
  useEffect(() => {
    if (!running) return;
    if (left <= 0) { if (sound) playBeep(880, 0.4); onDone && onDone(); return; }
    if (sound && left <= 3) playBeep(660, 0.12);
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left, running]); // eslint-disable-line
  return [left, setLeft];
}
