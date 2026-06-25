import React, { useRef, useState } from "react";
import { Check, ChevronsRight, ChevronLeft } from "lucide-react";
import { C, cardStyle } from "../core.js";
import { DIFFICULTY_OPTIONS } from "../lib/sport.js";

// ════════════════════════════════════════════════════════════════════════════
// components.jsx — briques visuelles de l'onglet Sport (toutes pures CSS/JS, sans
// dépendance). Couleurs via les tokens C ; cartes via cardStyle(). Respecte
// prefers-reduced-motion. Issues du design lab (synthèse F).
// ════════════════════════════════════════════════════════════════════════════
const FONT = "'Space Grotesk', system-ui";
const clamp = (v) => Math.max(0, Math.min(1, v));
const reduceMotion = () => typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const DIFFS = DIFFICULTY_OPTIONS;
export const diffColor = (hint) => (hint === "down" ? C.over : hint === "up" ? C.green : C.sub);
export const diffColorByValue = (v) => (v === "trop_lourd" ? C.over : v === "trop_facile" ? C.green : C.sub);

// ── NumberFlow : chiffres à défilement vertical (roue mécanique) ─────────────
function Digit({ d, h }) {
  return (
    <span style={{ display: "inline-block", height: h, overflow: "hidden", verticalAlign: "top" }}>
      <span style={{ display: "flex", flexDirection: "column", transform: `translateY(-${d * h}px)`, transition: reduceMotion() ? "none" : "transform .55s cubic-bezier(.22,1,.36,1)" }}>
        {Array.from({ length: 10 }, (_, i) => <span key={i} style={{ height: h, lineHeight: `${h}px` }}>{i}</span>)}
      </span>
    </span>
  );
}

export function NumberFlow({ value, size = 40, color = C.ink, weight = 800, fontFamily = FONT }) {
  const str = String(value);
  const h = Math.round(size * 1.12);
  return (
    <span style={{ display: "inline-flex", alignItems: "flex-start", fontSize: size, fontWeight: weight, color, fontFamily, lineHeight: `${h}px`, fontVariantNumeric: "tabular-nums" }}>
      {str.split("").map((ch, i) => (/\d/.test(ch)
        ? <Digit key={i} d={+ch} h={h} />
        : <span key={i} style={{ height: h, lineHeight: `${h}px` }}>{ch}</span>))}
    </span>
  );
}

// ── DurationFlow : M:SS animé ────────────────────────────────────────────────
export function DurationFlow({ seconds, size = 40, color = C.ink }) {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60), ss = String(s % 60).padStart(2, "0");
  return <NumberFlow value={`${m}:${ss}`} size={size} color={color} />;
}

// ── StatTile : tuile à dégradé radial teinté ─────────────────────────────────
export function StatTile({ icon: Icon, color = C.accent, value, unit, label, animate = false, size = 24 }) {
  return (
    <div className="rounded-2xl p-3.5" style={cardStyle({ background: `radial-gradient(130% 130% at 0% 0%, ${color}24, transparent 58%), ${C.cardGrad}` })}>
      {Icon && <span className="mb-2 flex h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: `${color}26`, color }}><Icon size={16} /></span>}
      <div className="flex items-baseline gap-1">
        {animate
          ? <NumberFlow value={value} size={size} color={C.ink} />
          : <span style={{ fontSize: size, fontWeight: 800, color: C.ink, fontFamily: FONT, lineHeight: 1 }}>{value}</span>}
        {unit && <span className="text-xs font-semibold" style={{ color: C.muted }}>{unit}</span>}
      </div>
      <p className="mt-1 text-[11px] font-medium" style={{ color: C.sub }}>{label}</p>
    </div>
  );
}

// ── RadialStat : anneau simple avec contenu centré ───────────────────────────
export function RadialStat({ pct, size = 88, stroke = 9, color = C.green, track, children }) {
  const r = size / 2 - stroke / 2, c = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ display: "block" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track || C.track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${c * clamp(pct)} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: reduceMotion() ? "none" : "stroke-dasharray .6s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

// ── SessionProgress : barre de progression de séance ─────────────────────────
export function SessionProgress({ done, total, color = C.green, showCount = true }) {
  const pct = total ? done / total : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: C.track }}>
        <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, background: `linear-gradient(90deg, ${color}, ${C.accent})`, transition: reduceMotion() ? "none" : "width .45s ease" }} />
      </div>
      {showCount && <span className="text-xs font-bold tabular-nums" style={{ color: C.sub }}>{done}/{total}</span>}
    </div>
  );
}

// ── Sparkline : mini-courbe SVG ──────────────────────────────────────────────
export function Sparkline({ points = [], color = C.green, w = 76, h = 26, strokeW = 2 }) {
  if (points.length < 2) return null;
  const max = Math.max(...points), min = Math.min(...points), span = max - min || 1;
  const step = w / (points.length - 1);
  const xy = (p, i) => [i * step, h - ((p - min) / span) * (h - 5) - 2.5];
  const d = points.map((p, i) => xy(p, i).join(",")).join(" ");
  const [lx, ly] = xy(points[points.length - 1], points.length - 1);
  return (
    <svg width={w} height={h} style={{ display: "block", overflow: "visible" }}>
      <polyline points={d} fill="none" stroke={color} strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r={2.6} fill={color} />
    </svg>
  );
}

// ── SlideButton : glisser-pour-valider (Pointer Events, fallback tap) ─────────
export function SlideButton({ label = "Glisser pour valider", color = C.green, icon: Icon = ChevronsRight, onConfirm }) {
  const trackRef = useRef(null);
  const dragging = useRef(false);
  const [x, setX] = useState(0);
  const [done, setDone] = useState(false);
  const KNOB = 48;
  const maxX = () => Math.max(0, (trackRef.current?.offsetWidth || 320) - KNOB - 8);

  if (reduceMotion()) {
    return (
      <button onClick={() => { setDone(true); onConfirm && onConfirm(); }} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold text-white active:scale-95" style={{ backgroundColor: color }}>
        <Check size={18} /> {label}
      </button>
    );
  }

  const onDown = (e) => { dragging.current = true; try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {} };
  const onMove = (e) => {
    if (!dragging.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    setX(Math.max(0, Math.min(maxX(), e.clientX - rect.left - KNOB / 2)));
  };
  const onUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (x >= maxX() * 0.82) { setX(maxX()); setDone(true); onConfirm && onConfirm(); }
    else setX(0);
  };

  const pct = maxX() ? x / maxX() : 0;
  return (
    <div ref={trackRef} className="relative h-14 w-full select-none overflow-hidden rounded-2xl" style={{ backgroundColor: `${color}1f`, border: `1px solid ${color}44`, touchAction: "none" }}>
      <div className="absolute inset-y-0 left-0 rounded-2xl" style={{ width: x + KNOB + 8, background: `${color}33`, transition: dragging.current ? "none" : "width .25s" }} />
      <div className="absolute inset-0 flex items-center justify-center text-sm font-bold" style={{ color, opacity: done ? 0 : 1 - pct * 0.9 }}>{label}</div>
      {done && <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm font-bold" style={{ color }}><Check size={18} /> Validé</div>}
      <div onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        className="absolute top-1 left-1 flex h-12 w-12 items-center justify-center rounded-xl"
        style={{ transform: `translateX(${x}px)`, transition: dragging.current ? "none" : "transform .25s", backgroundColor: color, color: "#fff", cursor: "grab", boxShadow: `0 6px 16px -4px ${color}` }}>
        {done ? <Check size={22} /> : <Icon size={22} />}
      </div>
    </div>
  );
}

// ── PrescriptionBadge : charge/reps cible + direction (↑/↓) ───────────────────
export function PrescriptionBadge({ presc, ex }) {
  const label = presc.mode === "charge"
    ? (presc.value != null ? `${presc.value} kg` : "PdC")
    : `${presc.value} ${ex.perSide ? "reps/côté" : "reps"}${ex.loadLabel ? ` · ${ex.loadLabel}` : ""}`;
  const arrow = presc.direction === "up" ? "↑" : presc.direction === "down" ? "↓" : "";
  const col = presc.direction === "up" ? C.green : presc.direction === "down" ? C.over : C.sub;
  return <span className="shrink-0 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums" style={{ backgroundColor: `${col}1a`, color: col }}>{label} {arrow}</span>;
}

// ── StepDots : progression d'étapes (échauffement → exos → récap) ────────────
export function StepDots({ count, idx }) {
  return (
    <div className="mb-4 flex gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-1 flex-1 rounded-full transition-colors" style={{ backgroundColor: i <= idx ? C.green : C.line }} />
      ))}
    </div>
  );
}

// ── WorkoutHeader : en-tête commun des écrans de séance ──────────────────────
export function WorkoutHeader({ title, subtitle, onCancel, right }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <button onClick={onCancel} aria-label="Retour" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }}>
        <ChevronLeft size={20} />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-extrabold" style={{ color: C.ink, fontFamily: FONT }}>{title}</p>
        {subtitle && <p className="truncate text-xs" style={{ color: C.sub }}>{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
