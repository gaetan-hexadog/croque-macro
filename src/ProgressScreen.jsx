import React, { useState, useMemo } from "react";
import {
  C, TODAY, parseISO, addDays, r0, dayTotals, hasData, cardStyle,
} from "./core.js";
import { WeekCard } from "./Week.jsx";
import { SectionTitle } from "./ui.jsx";

export function ProgressScreen({ days, weights, settings }) {
  const [period, setPeriod] = useState(30);
  const PERIODS = [{ v: 7, l: "7 j" }, { v: 30, l: "30 j" }, { v: 90, l: "90 j" }];

  const kcalSeries = useMemo(() => buildKcalSeries(days, period), [days, period]);
  const weightSeries = useMemo(() => buildWeightSeries(weights, period), [weights, period]);

  const logged = kcalSeries.filter((d) => d.logged);
  const avgKcal = logged.length ? r0(logged.reduce((a, d) => a + d.value, 0) / logged.length) : 0;
  const avgP = (() => {
    const ld = Object.keys(days).filter((iso) => withinPeriod(iso, period) && hasData(days[iso]));
    if (!ld.length) return 0;
    return r0(ld.reduce((a, iso) => a + dayTotals(days[iso]).p, 0) / ld.length);
  })();
  const onTarget = logged.filter((d) => d.value <= settings.kcal).length;
  const wDelta = weightSeries.length >= 2 ? +(weightSeries[weightSeries.length - 1].value - weightSeries[0].value).toFixed(1) : null;

  return (
    <div>
      <SectionTitle className="mb-4" right={<SegToggle options={PERIODS} value={period} onChange={setPeriod} />}>Période</SectionTitle>

      <WeekCard days={days} weights={weights} settings={settings} refISO={TODAY} />

      {/* Stats clés */}
      <div className="mb-4 grid grid-cols-3 gap-2.5">
        <KPI label="Moy. kcal" value={avgKcal || "—"} tint={C.ink} />
        <KPI label="Sous l'objectif" value={logged.length ? `${onTarget}/${logged.length}` : "—"} tint={C.green} />
        <KPI label="Moy. prot." value={avgP ? `${avgP} g` : "—"} tint={C.protein} />
      </div>

      {/* Calories */}
      <ChartCard title="Calories" subtitle={period > 30 ? "moyenne par semaine" : "par jour"} accent={C.green}>
        {logged.length === 0
          ? <Empty text="Pas encore de jours suivis sur cette période." />
          : <BarsChart data={kcalSeries} target={settings.kcal} />}
      </ChartCard>

      {/* Poids */}
      <ChartCard
        title="Poids"
        subtitle={wDelta != null ? `${wDelta > 0 ? "+" : ""}${wDelta} kg sur la période` : "note ton poids pour suivre la courbe"}
        accent={C.weight}
        deltaColor={wDelta != null ? (wDelta <= 0 ? C.green : C.over) : C.muted}
      >
        {weightSeries.length < 2
          ? <Empty text="Note ton poids sur au moins 2 jours pour voir la courbe." />
          : <WeightChart points={weightSeries} />}
      </ChartCard>

      <TrendCard days={days} weights={weights} period={period} />

      <p className="mt-2 px-2 text-center text-xs" style={{ color: C.muted }}>Le poids fluctue au jour le jour (eau, sel). Regarde la tendance sur 2-3 semaines, pas la valeur isolée.</p>
    </div>
  );
}


function TrendCard({ days, weights, period }) {
  const t = useMemo(() => {
    const wIso = Object.keys(weights).filter((iso) => withinPeriod(iso, period)).sort();
    if (wIso.length < 2) return null;
    const firstIso = wIso[0], lastIso = wIso[wIso.length - 1];
    const spanDays = Math.round((parseISO(lastIso) - parseISO(firstIso)) / 86400000);
    if (spanDays < 7) return null;
    const loggedKcal = Object.keys(days).filter((iso) => withinPeriod(iso, period) && dayTotals(days[iso]).kcal > 0).map((iso) => dayTotals(days[iso]).kcal);
    if (loggedKcal.length < 4) return null;
    const avg = Math.round(loggedKcal.reduce((a, b) => a + b, 0) / loggedKcal.length);
    const wDelta = +(weights[lastIso] - weights[firstIso]).toFixed(1);
    const ratePerWeek = +(wDelta / spanDays * 7).toFixed(2);
    // maintenance empirique : intake - (variation poids en kcal) / jours
    const maint = Math.round(avg - (wDelta * 7700) / spanDays);
    return { avg, wDelta, ratePerWeek, maint, spanDays, nKcal: loggedKcal.length, nW: wIso.length };
  }, [days, weights, period]);

  return (
    <div className="mb-3 rounded-3xl p-4" style={cardStyle()}>
      <div className="mb-3 flex items-center gap-2">
        <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: C.protein }} />
        <h3 className="text-sm font-bold" style={{ color: C.ink }}>Tendance déficit</h3>
        <span className="ml-auto text-xs font-medium" style={{ color: C.muted }}>croisé poids × calories</span>
      </div>
      {!t ? (
        <p className="text-sm" style={{ color: C.muted }}>Note ton poids et tes repas régulièrement (≈ 2 semaines) pour estimer si ton déficit est sur la bonne pente.</p>
      ) : (() => {
        const losing = t.ratePerWeek < 0;
        const rateAbs = Math.abs(t.ratePerWeek);
        let verdict, vColor;
        if (!losing && t.ratePerWeek > 0.1) { verdict = "Tu es au-dessus de ta maintenance : pas de déficit sur la période."; vColor = C.over; }
        else if (rateAbs < 0.2) { verdict = "Poids quasi stable : tu es proche de ta maintenance."; vColor = C.sub; }
        else if (rateAbs <= 0.9) { verdict = "Bon rythme de perte, tenable sur la durée."; vColor = C.green; }
        else { verdict = "Perte rapide : surveille l'énergie et le muscle, ce rythme est dur à tenir."; vColor = C.protein; }
        return (
          <>
            <div className="mb-3 grid grid-cols-3 gap-2.5">
              <KPI label="Moy. kcal/j" value={t.avg} tint={C.ink} />
              <KPI label="Poids" value={`${t.wDelta > 0 ? "+" : ""}${t.wDelta} kg`} tint={t.wDelta <= 0 ? C.green : C.over} />
              <KPI label="Par semaine" value={`${t.ratePerWeek > 0 ? "+" : ""}${t.ratePerWeek}`} tint={t.ratePerWeek <= 0 ? C.green : C.over} />
            </div>
            <p className="mb-2 text-sm font-semibold" style={{ color: vColor }}>{verdict}</p>
            <p className="text-xs" style={{ color: C.sub }}>Ta maintenance estimée d'après <span style={{ fontWeight: 600, color: C.ink }}>tes</span> données est d'environ <span style={{ fontWeight: 700, color: C.ink, fontVariantNumeric: "tabular-nums" }}>{t.maint} kcal/j</span> (sur {t.spanDays} jours, {t.nKcal} jours de repas et {t.nW} pesées). C'est une estimation, pas une vérité — l'eau et le sel brouillent la lecture à court terme.</p>
          </>
        );
      })()}
    </div>
  );
}


function BarsChart({ data, target }) {
  const W = 320, H = 150, padT = 14, padB = 18, padX = 2;
  const max = Math.max(target * 1.12, ...data.map((d) => d.value), 1);
  const innerH = H - padT - padB, innerW = W - padX * 2;
  const bw = innerW / data.length;
  const y = (v) => padT + innerH * (1 - v / max);
  const ty = y(target);
  const step = data.length > 16 ? Math.ceil(data.length / 8) : (data.length > 8 ? 2 : 1);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
      <line x1={padX} y1={ty} x2={W - padX} y2={ty} stroke={C.ink} strokeWidth="1" strokeDasharray="3 3" opacity="0.45" />
      <text x={W - padX} y={ty - 4} textAnchor="end" fontSize="9" fill={C.sub}>objectif {target}</text>
      {data.map((d, i) => {
        const h = d.value > 0 ? Math.max(2, innerH * (d.value / max)) : 0;
        const x = padX + i * bw;
        const fill = d.value === 0 ? "rgba(255,255,255,0.14)" : (d.value <= target ? C.green : C.over);
        return (
          <g key={i}>
            <rect x={x + bw * 0.16} y={H - padB - h} width={bw * 0.68} height={h} rx="2" fill={fill} opacity={d.logged ? 1 : 0.5} />
            {i % step === 0 && <text x={x + bw / 2} y={H - 5} textAnchor="middle" fontSize="9" fill={C.muted}>{d.label}</text>}
          </g>
        );
      })}
    </svg>
  );
}


function WeightChart({ points }) {
  const W = 320, H = 150, padT = 14, padB = 18, padL = 26, padR = 8;
  const vals = points.map((p) => p.value);
  let min = Math.min(...vals), max = Math.max(...vals);
  if (max - min < 1) { min -= 0.6; max += 0.6; }
  const pad = (max - min) * 0.15; min -= pad; max += pad;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const x = (i) => padL + (points.length === 1 ? innerW / 2 : innerW * (i / (points.length - 1)));
  const y = (v) => padT + innerH * (1 - (v - min) / (max - min));
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const step = points.length > 10 ? Math.ceil(points.length / 6) : 1;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
      {[max, (max + min) / 2, min].map((v, i) => (
        <g key={i}>
          <line x1={padL} y1={y(v)} x2={W - padR} y2={y(v)} stroke={C.line} strokeWidth="1" />
          <text x={2} y={y(v) + 3} fontSize="9" fill={C.muted}>{v.toFixed(1)}</text>
        </g>
      ))}
      <path d={d} fill="none" stroke={C.weight} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.value)} r="3" fill={C.bg} stroke={C.weight} strokeWidth="2" />)}
      {points.map((p, i) => (i % step === 0 || i === points.length - 1) && <text key={`l${i}`} x={x(i)} y={H - 5} textAnchor="middle" fontSize="9" fill={C.muted}>{p.label}</text>)}
    </svg>
  );
}


function ChartCard({ title, subtitle, accent, deltaColor, children }) {
  return (
    <div className="mb-3 rounded-3xl p-4" style={cardStyle()}>
      <div className="mb-3 flex items-center gap-2">
        <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: accent }} />
        <h3 className="text-sm font-bold" style={{ color: C.ink }}>{title}</h3>
        <span className="ml-auto text-xs font-medium" style={{ color: deltaColor || C.muted }}>{subtitle}</span>
      </div>
      {children}
    </div>
  );
}


function KPI({ label, value, tint }) {
  return (
    <div className="rounded-2xl p-3 text-center" style={cardStyle()}>
      <p className="text-lg font-extrabold leading-tight" style={{ color: tint, fontVariantNumeric: "tabular-nums", fontFamily: "'Space Grotesk', system-ui" }}>{value}</p>
      <p className="mt-0.5 text-xs" style={{ color: C.muted }}>{label}</p>
    </div>
  );
}


function Empty({ text }) {
  return <div className="flex h-28 items-center justify-center px-4 text-center text-sm" style={{ color: C.muted }}>{text}</div>;
}


function SegToggle({ options, value, onChange }) {
  return (
    <div className="flex gap-1 rounded-full p-1" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
      {options.map((o) => (
        <button key={o.v} onClick={() => onChange(o.v)} className="rounded-full px-3 py-1 text-xs font-semibold active:scale-95" style={value === o.v ? { backgroundColor: C.ink, color: C.paper } : { color: C.sub }}>{o.l}</button>
      ))}
    </div>
  );
}

// ── Briques partagées ───────────────────────────────────────────────────────


function buildKcalSeries(days, period) {
  if (period <= 30) {
    const arr = [];
    for (let i = period - 1; i >= 0; i--) {
      const iso = addDays(TODAY, -i);
      const t = dayTotals(days[iso]);
      arr.push({ iso, label: parseISO(iso).getDate(), value: t.kcal, logged: t.kcal > 0 });
    }
    return arr;
  }
  const weeks = Math.ceil(period / 7), arr = [];
  for (let w = weeks - 1; w >= 0; w--) {
    let sum = 0, cnt = 0, lastIso = addDays(TODAY, -(w * 7));
    for (let k = 0; k < 7; k++) {
      const iso = addDays(TODAY, -(w * 7 + k));
      const t = dayTotals(days[iso]);
      if (t.kcal > 0) { sum += t.kcal; cnt++; }
    }
    arr.push({ iso: lastIso, label: `S${weeks - w}`, value: cnt ? Math.round(sum / cnt) : 0, logged: cnt > 0 });
  }
  return arr;
}


function buildWeightSeries(weights, period) {
  return Object.keys(weights)
    .filter((iso) => withinPeriod(iso, period))
    .sort()
    .map((iso) => ({ iso, label: parseISO(iso).getDate(), value: weights[iso] }));
}

// ════════════════════════════════════════════════════════════════════════════
//  ÉCRAN GUIDE — où trouver les calories
// ════════════════════════════════════════════════════════════════════════════


function withinPeriod(iso, period) {
  const diff = (parseISO(TODAY) - parseISO(iso)) / 86400000;
  return diff >= 0 && diff < period;
}
