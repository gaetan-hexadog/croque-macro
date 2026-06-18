import React, { useMemo } from "react";
import { ChevronRight, Dumbbell, Scale } from "lucide-react";
import {
  C, TODAY, fmtShort, dayTotals, hasData,
} from "./core.js";

export function JournalScreen({ days, weights, settings, onOpen, activeDate }) {
  const isoList = useMemo(() => {
    const set = new Set([...Object.keys(days), ...Object.keys(weights), TODAY]);
    return [...set].filter((iso) => hasData(days[iso]) || weights[iso] != null || iso === TODAY).sort().reverse();
  }, [days, weights]);

  return (
    <div>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: C.ink, fontFamily: "'Space Grotesk', system-ui", }}>Journal</h1>
          <p className="text-sm" style={{ color: C.sub }}>Touche un jour pour le revoir ou l'éditer.</p>
        </div>
      </div>
      <div className="space-y-2.5">
        {isoList.map((iso) => {
          const t = dayTotals(days[iso]);
          const w = weights[iso];
          const pct = Math.min(100, (t.kcal / settings.kcal) * 100);
          const under = t.kcal > 0 && t.kcal <= settings.kcal;
          return (
            <button key={iso} onClick={() => onOpen(iso)} className="flex w-full items-center gap-3 rounded-2xl p-4 text-left active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${iso === activeDate ? C.green : C.line}` }}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold capitalize" style={{ color: C.ink }}>{iso === TODAY ? "Aujourd'hui" : fmtShort(iso)}</p>
                  {days[iso]?.training && <span className="flex h-5 w-5 items-center justify-center rounded-md" style={{ backgroundColor: `${C.weight}22`, color: C.weight }}><Dumbbell size={11} /></span>}
                  {w != null && <span className="flex items-center gap-0.5 text-xs font-semibold" style={{ color: C.weight }}><Scale size={11} />{w} kg</span>}
                </div>
                {t.kcal > 0 ? (
                  <>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: C.track }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: under ? C.green : C.over }} />
                    </div>
                    <p className="mt-1.5 text-xs font-medium" style={{ color: C.sub, fontVariantNumeric: "tabular-nums" }}>{t.kcal} / {settings.kcal} kcal · <span style={{ color: C.protein }}>{t.p} g prot.</span></p>
                  </>
                ) : (
                  <p className="mt-1 text-xs" style={{ color: C.muted }}>Aucun repas noté</p>
                )}
              </div>
              <ChevronRight size={18} style={{ color: C.line }} />
            </button>
          );
        })}
        {isoList.length <= 1 && <p className="py-8 text-center text-sm" style={{ color: C.muted }}>L'historique se remplira au fil des jours.</p>}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  ÉCRAN PROGRÈS
// ════════════════════════════════════════════════════════════════════════════
