import React, { useMemo, useState } from "react";
import { Dumbbell } from "lucide-react";
import {
  C, TODAY, fmtShort, parseISO, dayTotals, hasData, cardStyle,
} from "../core.js";

const grotesk = { fontFamily: "'Space Grotesk', ui-sans-serif, system-ui", fontVariantNumeric: "tabular-nums" };
const PERIODS = [7, 30, 90];

// ════════════════════════════════════════════════════════════════════════════
//  ÉCRAN SUIVI — historique jour par jour (tableau de bord dense)
//  Sélecteur de période 7/30/90 j → liste serrée des jours notés/pesés.
// ════════════════════════════════════════════════════════════════════════════
export function JournalScreen({ days, weights, settings, onOpen, activeDate }) {
  const [period, setPeriod] = useState(30);

  const { rows, nLogged, nUnder } = useMemo(() => {
    const set = new Set([...Object.keys(days), ...Object.keys(weights), TODAY]);
    const list = [...set]
      .filter((iso) => withinPeriod(iso, period) && (hasData(days[iso]) || weights[iso] != null || iso === TODAY))
      .sort().reverse();
    const logged = list.filter((iso) => hasData(days[iso]));
    const under = logged.filter((iso) => dayTotals(days[iso]).kcal <= settings.kcal).length;
    return { rows: list, nLogged: logged.length, nUnder: under };
  }, [days, weights, settings, period]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: C.sub }}>Historique</h2>
        <div className="flex gap-1 rounded-full p-0.5" style={{ backgroundColor: C.track }}>
          {PERIODS.map((p) => (
            <button key={p} onClick={() => setPeriod(p)} className="rounded-full px-3 py-1 text-xs font-bold active:scale-95"
              style={period === p ? { backgroundColor: C.ink, color: C.paper } : { color: C.sub }}>{p} j</button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm" style={{ color: C.muted }}>Aucun jour noté sur cette période.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl" style={cardStyle({ padding: 0 })}>
          {rows.map((iso, i) => {
            const t = dayTotals(days[iso]);
            const w = weights[iso];
            const logged = t.kcal > 0;
            const pct = logged ? Math.min(100, (t.kcal / settings.kcal) * 100) : 0;
            const under = logged && t.kcal <= settings.kcal;
            const active = iso === activeDate;
            return (
              <button key={iso} onClick={() => onOpen(iso)} className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left active:opacity-70"
                style={{ borderTop: i ? `1px solid ${C.line}` : "none", backgroundColor: active ? `${C.green}14` : "transparent" }}>
                <div className="w-20 shrink-0">
                  <p className="text-xs font-bold capitalize leading-tight" style={{ color: C.ink }}>{iso === TODAY ? "Aujourd'hui" : fmtShort(iso)}</p>
                  {days[iso]?.training && <Dumbbell size={11} style={{ color: C.weight }} className="mt-0.5" />}
                </div>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: C.track }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: logged ? (under ? C.green : C.over) : C.track }} />
                </div>
                <div className="w-24 shrink-0 text-right" style={grotesk}>
                  <p className="text-xs font-bold" style={{ color: C.ink }}>{logged ? t.kcal : "—"} <span className="text-[10px] font-medium" style={{ color: C.muted }}>kcal</span></p>
                  <p className="text-[10px]" style={{ color: w != null ? C.weight : C.muted }}>{w != null ? `${w} kg` : `${logged ? t.p : "—"} g`}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {nLogged > 0 && (
        <p className="mt-2 px-1 text-[11px]" style={{ color: C.muted, fontVariantNumeric: "tabular-nums" }}>
          {nLogged} jour{nLogged > 1 ? "s" : ""} noté{nLogged > 1 ? "s" : ""} · {nUnder}/{nLogged} sous l'objectif
        </p>
      )}
    </div>
  );
}

function withinPeriod(iso, period) {
  const diff = (parseISO(TODAY) - parseISO(iso)) / 86400000;
  return diff >= 0 && diff < period;
}
