import { useEffect, useState } from "react";

// ════════════════════════════════════════════════════════════════════════════
// timers.jsx — logique pure des minuteurs de séance (sans UI).
// Signaux de fin/avertissement sur 3 canaux parallèles, pour percer MÊME avec de la
// musique à fond ou le téléphone en poche :
//   • bips renforcés (Web Audio, onde carrée perçante + gain élevé)
//   • vibration haptique (navigator.vibrate) — marche téléphone en poche
//   • voix de synthèse (speechSynthesis) « 3 · 2 · 1 · c'est parti »
// L'audio est gouverné par le paramètre `sound` (réglage « bips »). La vibration et la
// voix sont gouvernées par setCueConfig(), poussé depuis SportScreen d'après les réglages.
// ════════════════════════════════════════════════════════════════════════════

let cueConfig = { haptics: true, voice: true };
export function setCueConfig(c) { cueConfig = { ...cueConfig, ...c }; }

// Bip Web Audio. `strong` = onde carrée + gain élevé (perce la musique) ; sinon sinus doux.
export function playBeep(freq = 880, dur = 0.18, { strong = false } = {}) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = strong ? "square" : "sine"; o.frequency.value = freq;
    const peak = strong ? 0.7 : 0.4;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(peak, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.start(); o.stop(ctx.currentTime + dur + 0.02);
    o.onended = () => ctx.close();
  } catch (_) {}
}

// Vibration (self-gated par les réglages). Ex : 55 ms pour un avertissement, motif pour la fin.
export function vibrate(pattern) {
  if (!cueConfig.haptics) return;
  try { if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(pattern); } catch (_) {}
}

// Annonce vocale courte (fr-FR), coupe la précédente pour rester synchro au décompte.
export function speak(text) {
  if (!cueConfig.voice) return;
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "fr-FR"; u.rate = 1.15; u.volume = 1;
    synth.speak(u);
  } catch (_) {}
}

// Carillon de FIN (triple bip montant, renforcé) — signal franc « c'est terminé ».
export function playEndChime() {
  playBeep(680, 0.12, { strong: true });
  setTimeout(() => playBeep(680, 0.12, { strong: true }), 150);
  setTimeout(() => playBeep(1020, 0.28, { strong: true }), 320);
}

// Avertissement d'un tick (3-2-1) : bip (si audio) + petite vibration + voix du chiffre.
function warnCue(n, audio) { if (audio) playBeep(680, 0.12, { strong: true }); vibrate(55); speak(String(n)); }
// Fin du décompte : carillon (si audio) + vibration franche + voix « c'est parti ».
function endCue(audio) { if (audio) playEndChime(); vibrate([90, 50, 130]); speak("c'est parti"); }

// Décompte 1 s. Avertissements à 3-2-1, signal de fin à 0 puis onDone().
// running=false met en pause. Renvoie [left, setLeft] (setLeft pour +15s/+30s).
export function useCountdown(seconds, running = true, { sound = true, onDone } = {}) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => { setLeft(seconds); }, [seconds]);
  useEffect(() => {
    if (!running) return;
    if (left <= 0) { endCue(sound !== false); onDone && onDone(); return; }
    if (left <= 3) warnCue(left, sound !== false);
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left, running]); // eslint-disable-line
  return [left, setLeft];
}
