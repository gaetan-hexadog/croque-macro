import React from "react";
import { ChevronRight, TrendingDown, TrendingUp, Sparkles, Beef } from "lucide-react";
import { weekStats, weekCoach, C, r0, parseISO, cardStyle } from "../core.js";

// Système hebdomadaire : solde glissant 7 j, marge plaisir, pilotage doux.
// Cadrage sain : pas de dette, pas de calories gagnées au sport, ancrage poids.

const toneColor = (t) => ({ ahead: C.green, ontrack: C.green, behind: C.protein, low: C.weight, start: C.muted }[t] || C.ink);
const WD = ["di", "lu", "ma", "me", "je", "ve", "sa"];

// Bandeau compact sur l'écran Jour
export function WeekStrip({ days, weights, settings, refISO, freeTonight, onOpen }) {
  const stats = weekStats(days, settings, refISO, 7);
  const coach = weekCoach(stats, settings, weights, refISO);
  const tc = toneColor(coach.tone);
  const bal = Math.round(stats.balance);
  return (
    <button onClick={onOpen} className="mb-4 w-full rounded-2xl cm-card text-left active:scale-95" style={cardStyle()}>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: C.muted }}>Cette semaine</span>
        <ChevronRight size={15} style={{ color: C.muted }} />
      </div>
      <p className="text-sm font-bold" style={{ color: tc }}>{coach.headline}</p>
      <div className="mt-2 flex gap-5" style={{ fontVariantNumeric: "tabular-nums" }}>
        <div>
          <p className="text-xs" style={{ color: C.muted }}>{bal >= 0 ? "Marge 7 j" : "Au-dessus 7 j"}</p>
          <p className="text-base font-bold" style={{ color: bal >= 0 ? C.green : C.protein }}>{Math.abs(bal)} kcal</p>
        </div>
        <div>
          <p className="text-xs" style={{ color: C.muted }}>{freeTonight >= 0 ? "Libre ce soir" : "Dépassé"}</p>
          <p className="text-base font-bold" style={{ color: freeTonight >= 0 ? C.ink : C.over }}>{freeTonight >= 0 ? "" : "-"}{Math.abs(r0(freeTonight))} kcal</p>
        </div>
      </div>
    </button>
  );
}

// Carte complète sur l'écran Progrès
export function WeekCard({ days, weights, settings, refISO }) {
  const stats = weekStats(days, settings, refISO, 7);
  const coach = weekCoach(stats, settings, weights, refISO);
  const tc = toneColor(coach.tone);
  const bal = Math.round(stats.balance);
  const MAX = 1.25;

  return (
    <section className="mb-4 rounded-3xl p-5" style={cardStyle()}>
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: C.muted }}>Bilan de la semaine</span>
        <span className="text-xs" style={{ color: C.muted }}>{stats.logged} / 7 j</span>
      </div>

      <p className="mt-1 leading-none" style={{ fontFamily: "'Space Grotesk', system-ui", fontVariantNumeric: "tabular-nums" }}>
        <span className="text-4xl font-bold" style={{ color: bal >= 0 ? C.green : C.protein }}>{Math.abs(bal)}</span>
        <span className="ml-1 text-sm font-medium" style={{ color: C.sub }}>kcal {bal >= 0 ? "de marge cette semaine" : "au-dessus du plan"}</span>
      </p>

      <div className="relative mt-4" style={{ height: 64 }}>
        <div className="absolute inset-x-0" style={{ bottom: `${(1 / MAX) * 100}%`, borderTop: `1px dashed ${C.line}` }} />
        <div className="absolute inset-0 flex items-end gap-1.5">
          {stats.perDay.map((d, i) => {
            const today = i === stats.perDay.length - 1;
            const h = d.logged ? Math.min(MAX, d.kcal / stats.target) / MAX : 0;
            const over = d.logged && d.kcal > stats.target;
            return (
              <div key={d.iso} className="flex flex-1 flex-col items-center justify-end" style={{ height: "100%" }}>
                <div className="w-full rounded-t" style={{ height: `${Math.max(d.logged ? 6 : 3, h * 100)}%`, backgroundColor: d.logged ? (over ? C.over : C.green) : C.track, opacity: today ? 1 : 0.85, transition: "height .4s ease" }} />
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-1 flex gap-1.5">
        {stats.perDay.map((d, i) => {
          const today = i === stats.perDay.length - 1;
          return <span key={d.iso} className="flex-1 text-center" style={{ fontSize: "10px", color: today ? C.ink : C.muted, fontWeight: today ? 700 : 500 }}>{WD[parseISO(d.iso).getDay()]}</span>;
        })}
      </div>

      <p className="mt-3 text-sm" style={{ color: C.sub }}>{coach.detail}</p>

      {coach.suggestTomorrow != null && (
        <div className="mt-3 flex items-center gap-2 rounded-2xl cm-card" style={{ backgroundColor: `${tc}14`, border: `1px solid ${tc}33` }}>
          <Sparkles size={16} style={{ color: tc }} />
          <p className="text-sm font-semibold" style={{ color: C.ink }}>Cap de demain : ~{coach.suggestTomorrow} kcal</p>
        </div>
      )}

      {coach.weightTrend && (
        <div className="mt-2 flex items-center gap-2">
          {coach.weightTrend === "down"
            ? <><TrendingDown size={15} style={{ color: C.green }} /><p className="text-xs" style={{ color: C.sub }}>Ton poids baisse — la semaine fait son travail, peu importe un soir d'écart.</p></>
            : coach.weightTrend === "up"
              ? <><TrendingUp size={15} style={{ color: C.protein }} /><p className="text-xs" style={{ color: C.sub }}>Poids en légère hausse sur 2 semaines — regarde la tendance, pas un jour isolé.</p></>
              : <><TrendingDown size={15} style={{ color: C.muted }} /><p className="text-xs" style={{ color: C.sub }}>Poids stable — laisse 2-3 semaines à la tendance pour se dessiner.</p></>}
        </div>
      )}

      {coach.proteinRoom && (
        <div className="mt-2 flex items-start gap-2">
          <Beef size={15} style={{ color: C.protein, marginTop: 1 }} />
          <p className="text-xs" style={{ color: C.sub }}>Tu vises {settings.protein} g de protéines ; ~{coach.proteinRoom.reco} g (1,6 g/kg) suffisent à préserver le muscle et te rendraient ~{coach.proteinRoom.kcalBack} kcal de marge plaisir par jour.</p>
        </div>
      )}

      {stats.logged >= 2 && (
        <p className="mt-3 text-xs" style={{ color: C.muted, fontVariantNumeric: "tabular-nums" }}>Moyenne : {r0(stats.avgKcal)} kcal · {r0(stats.avgProt)} g prot. sur {stats.logged} j</p>
      )}
    </section>
  );
}
