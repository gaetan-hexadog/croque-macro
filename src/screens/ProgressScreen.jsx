import React, { useMemo } from "react";
import { Dumbbell, Flame, Beef, Sparkles } from "lucide-react";
import {
  C, TODAY, parseISO, addDays, r0, dayTotals, hasData, cardStyle, weekStats, weekCoach,
} from "../core.js";

const grotesk = { fontFamily: "'Space Grotesk', ui-sans-serif, system-ui", fontVariantNumeric: "tabular-nums" };

// ════════════════════════════════════════════════════════════════════════════
//  ÉCRAN SUIVI — vue d'ensemble (design « Vivant maîtrisé »)
//  Héro trajectoire poids + verdict semaine · chips macro · courbe de poids.
//  L'historique jour par jour est rendu par JournalScreen, juste en dessous.
// ════════════════════════════════════════════════════════════════════════════
export function ProgressScreen({ days, weights, settings, onReview }) {
  const stats = useMemo(() => weekStats(days, settings, TODAY, 7), [days, settings]);
  const coach = useMemo(() => weekCoach(stats, settings, weights, TODAY), [stats, settings, weights]);

  const daysUnder = stats.perDay.filter((d) => d.logged && d.kcal <= stats.target).length;
  const sessions = useMemo(
    () => Array.from({ length: 7 }, (_, k) => addDays(TODAY, -k)).filter((iso) => days[iso]?.training).length,
    [days],
  );

  // Poids : courbe sur 90 j + Δ total depuis le début + maintenance empirique.
  const wSeries = useMemo(() => buildWeightSeries(weights, 90), [weights]);
  const allW = useMemo(() => Object.keys(weights).sort(), [weights]);
  const totalDelta = allW.length >= 2 ? +(weights[allW[allW.length - 1]] - weights[allW[0]]).toFixed(1) : null;
  const wDelta = wSeries.length >= 2 ? +(wSeries[wSeries.length - 1].value - wSeries[0].value).toFixed(1) : null;
  const trend = useMemo(() => trendStats(days, weights, 90), [days, weights]);

  const onTrack = daysUnder >= 4;
  const bal = Math.round(stats.balance);

  return (
    <div className="space-y-4">
      {/* HÉRO — trajectoire + verdict de la semaine */}
      <section className="relative overflow-hidden rounded-3xl p-5" style={{ background: `linear-gradient(150deg, ${C.accent}, ${C.protein})`, boxShadow: `0 22px 50px -28px ${C.accent}` }}>
        <div className="absolute -right-8 -top-10 h-40 w-40 rounded-full" style={{ background: "rgba(255,255,255,0.16)" }} />
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.85)" }}>Ta trajectoire</p>
        {totalDelta != null ? (
          <>
            <div className="mt-2 flex items-end gap-2">
              <p className="text-6xl font-extrabold leading-none text-white" style={grotesk}>{totalDelta > 0 ? "+" : ""}{totalDelta}</p>
              <p className="mb-1.5 text-2xl font-bold text-white/90" style={grotesk}>kg</p>
            </div>
            <p className="mt-1 text-sm font-medium text-white/90">depuis le début · {totalDelta <= 0 ? "perte de gras en cours 🔥" : "à recadrer 💪"}</p>
          </>
        ) : (
          <p className="mt-2 text-lg font-bold text-white">Pèse-toi pour voir ta trajectoire 📈</p>
        )}

        <div className="mt-4 flex items-center gap-3 rounded-2xl px-3.5 py-2.5" style={{ backgroundColor: "rgba(0,0,0,0.18)" }}>
          <Ring value={daysUnder} max={7} size={48} stroke={6} color="#fff" track="rgba(255,255,255,0.3)">
            <span className="text-[13px] font-extrabold text-white" style={grotesk}>{daysUnder}</span>
          </Ring>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white">{coach.headline}</p>
            <p className="mt-0.5 text-xs font-medium text-white/85">
              {daysUnder}/7 jours sous l'objectif{stats.logged >= 2 ? ` · ${bal >= 0 ? "+" : "−"}${Math.abs(bal)} kcal de marge` : ""}
            </p>
          </div>
        </div>
      </section>

      {/* Chips macro de la semaine */}
      <div className="flex gap-2.5">
        <Chip icon={Flame} value={stats.logged ? r0(stats.avgKcal) : "—"} unit="" label="kcal / jour" tint={C.green} />
        <Chip icon={Beef} value={stats.logged ? r0(stats.avgProt) : "—"} unit={stats.logged ? " g" : ""} label="protéines / j" tint={C.protein} />
        <Chip icon={Dumbbell} value={sessions} unit="" label="séances / 7 j" tint={C.weight} />
      </div>

      {onReview && (
        <button onClick={onReview} className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold active:scale-95" style={{ backgroundColor: `${C.accent}14`, color: C.accent, border: `1px solid ${C.accent}33` }}><Sparkles size={16} /> Bilan nutrition de la semaine</button>
      )}

      {/* Trajectoire du poids */}
      <section className="rounded-3xl p-4" style={cardStyle()}>
        <div className="mb-1 flex items-baseline justify-between">
          <p className="text-sm font-bold" style={{ color: C.ink }}>Trajectoire du poids</p>
          {wDelta != null && <p className="text-lg font-extrabold" style={{ ...grotesk, color: wDelta <= 0 ? C.green : C.over }}>{wDelta > 0 ? "+" : ""}{wDelta} kg</p>}
        </div>
        <p className="mb-2 text-[11px]" style={{ color: C.muted }}>
          {wSeries.length >= 2 ? "90 derniers jours" : "à compléter"}
          {trend ? ` · maintenance ≈ ${trend.maint} kcal/j` : ""}
        </p>
        {wSeries.length < 2
          ? <div className="flex h-28 items-center justify-center px-4 text-center text-sm" style={{ color: C.muted }}>Note ton poids sur au moins 2 jours pour voir la courbe.</div>
          : <WeightArea points={wSeries} />}
        <p className="mt-2 text-xs" style={{ color: C.muted }}>Le poids fluctue au jour le jour (eau, sel). Regarde la tendance sur 2-3 semaines, pas la valeur isolée.</p>
      </section>
    </div>
  );
}

// ── Chip macro ───────────────────────────────────────────────────────────────
function Chip({ icon: Icon, value, unit, label, tint }) {
  return (
    <div className="flex-1 rounded-2xl p-3" style={{ background: `linear-gradient(160deg, ${tint}22, ${tint}08)`, border: `1px solid ${tint}33` }}>
      <Icon size={16} style={{ color: tint }} />
      <p className="mt-2 text-xl font-extrabold leading-none" style={{ ...grotesk, color: C.ink }}>{value}<span className="text-xs font-bold" style={{ color: C.muted }}>{unit}</span></p>
      <p className="mt-0.5 text-[11px] font-medium" style={{ color: C.sub }}>{label}</p>
    </div>
  );
}

// ── Anneau de progression (arc 270°) ────────────────────────────────────────
function Ring({ value, max, size = 48, stroke = 6, color = C.green, track = C.track, children }) {
  const r = (size - stroke) / 2, cx = size / 2, cy = size / 2, start = 135, sweep = 270;
  const frac = Math.max(0, Math.min(1, max ? value / max : 0));
  const arc = (a) => { const rad = (a * Math.PI) / 180; return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]; };
  const path = (f0, f1) => {
    const a0 = start + sweep * f0, a1 = start + sweep * f1;
    const [x0, y0] = arc(a0), [x1, y1] = arc(a1);
    return `M ${x0} ${y0} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`;
  };
  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <path d={path(0, 1)} fill="none" stroke={track} strokeWidth={stroke} strokeLinecap="round" />
        {frac > 0 && <path d={path(0, frac)} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" />}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

// ── Courbe de poids lissée + aire dégradée ──────────────────────────────────
function WeightArea({ points }) {
  const W = 320, H = 132, padX = 8, padT = 16, padB = 16;
  const vals = points.map((p) => p.value);
  let min = Math.min(...vals), max = Math.max(...vals);
  if (max - min < 1) { min -= 0.6; max += 0.6; }
  const span = W - padX * 2, innerH = H - padT - padB;
  const pts = points.map((p, i) => ({
    x: padX + (points.length === 1 ? span / 2 : (span * i) / (points.length - 1)),
    y: padT + innerH * (1 - (p.value - min) / (max - min)),
  }));
  const d = smoothPath(pts);
  const step = points.length > 8 ? Math.ceil(points.length / 5) : 1;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="none" style={{ display: "block" }}>
      <defs>
        <linearGradient id="suivi-wgrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.weight} stopOpacity="0.28" />
          <stop offset="100%" stopColor={C.weight} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((g) => <line key={g} x1={padX} y1={padT + innerH * g} x2={W - padX} y2={padT + innerH * g} stroke={C.line} strokeWidth="1" opacity="0.5" />)}
      <text x={padX} y={padT - 5} fontSize="9" fill={C.muted}>{max.toFixed(1)}</text>
      <text x={padX} y={H - 4} fontSize="9" fill={C.muted}>{min.toFixed(1)}</text>
      <path d={`${d} L ${pts[pts.length - 1].x} ${H} L ${pts[0].x} ${H} Z`} fill="url(#suivi-wgrad)" />
      <path d={d} fill="none" stroke={C.weight} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (i % step === 0 || i === pts.length - 1) && <circle key={i} cx={p.x} cy={p.y} r="2.6" fill={C.weight} />)}
    </svg>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function smoothPath(pts) {
  if (pts.length < 2) return "";
  const d = [`M ${pts[0].x} ${pts[0].y}`];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    d.push(`C ${p1.x + (p2.x - p0.x) / 6} ${p1.y + (p2.y - p0.y) / 6} ${p2.x - (p3.x - p1.x) / 6} ${p2.y - (p3.y - p1.y) / 6} ${p2.x} ${p2.y}`);
  }
  return d.join(" ");
}

function buildWeightSeries(weights, period) {
  return Object.keys(weights)
    .filter((iso) => withinPeriod(iso, period))
    .sort()
    .map((iso) => ({ iso, label: parseISO(iso).getDate(), value: weights[iso] }));
}

// Maintenance empirique : intake moyen − (variation poids en kcal) / jours.
function trendStats(days, weights, period) {
  const wIso = Object.keys(weights).filter((iso) => withinPeriod(iso, period)).sort();
  if (wIso.length < 2) return null;
  const firstIso = wIso[0], lastIso = wIso[wIso.length - 1];
  const spanDays = Math.round((parseISO(lastIso) - parseISO(firstIso)) / 86400000);
  if (spanDays < 7) return null;
  const loggedKcal = Object.keys(days).filter((iso) => withinPeriod(iso, period) && dayTotals(days[iso]).kcal > 0).map((iso) => dayTotals(days[iso]).kcal);
  if (loggedKcal.length < 4) return null;
  const avg = Math.round(loggedKcal.reduce((a, b) => a + b, 0) / loggedKcal.length);
  const wDelta = +(weights[lastIso] - weights[firstIso]).toFixed(1);
  return { maint: Math.round(avg - (wDelta * 7700) / spanDays), wDelta, spanDays };
}

function withinPeriod(iso, period) {
  const diff = (parseISO(TODAY) - parseISO(iso)) / 86400000;
  return diff >= 0 && diff < period;
}
