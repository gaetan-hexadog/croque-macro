import React, { useMemo } from "react";
import { ChevronRight, Dumbbell, Scale } from "lucide-react";
import {
  C, TODAY, fmtShort, parseISO, dayTotals, hasData, cardStyle,
} from "./core.js";
import { SectionTitle } from "./ui.jsx";

const capit = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export function JournalScreen({ days, weights, settings, onOpen, activeDate }) {
  const isoList = useMemo(() => {
    const set = new Set([...Object.keys(days), ...Object.keys(weights), TODAY]);
    return [...set].filter((iso) => hasData(days[iso]) || weights[iso] != null || iso === TODAY).sort().reverse();
  }, [days, weights]);

  // Synthèse (contexte en tête) + regroupement par mois (repères de lecture).
  const { nLogged, avgK, avgP, groups } = useMemo(() => {
    const logged = isoList.filter((iso) => hasData(days[iso]));
    const tot = logged.reduce((a, iso) => { const t = dayTotals(days[iso]); return { k: a.k + t.kcal, p: a.p + t.p }; }, { k: 0, p: 0 });
    const g = [];
    let cur = null;
    isoList.forEach((iso) => {
      const d = parseISO(iso), key = `${d.getFullYear()}-${d.getMonth()}`;
      if (key !== cur) { g.push({ key, label: capit(d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })), items: [] }); cur = key; }
      g[g.length - 1].items.push(iso);
    });
    return { nLogged: logged.length, avgK: logged.length ? Math.round(tot.k / logged.length) : 0, avgP: logged.length ? Math.round(tot.p / logged.length) : 0, groups: g };
  }, [isoList, days]);

  return (
    <div>
      <p className="mb-4 text-sm" style={{ color: C.sub, fontVariantNumeric: "tabular-nums" }}>
        {nLogged > 0
          ? <>{nLogged} jour{nLogged > 1 ? "s" : ""} noté{nLogged > 1 ? "s" : ""} · moy. <span style={{ color: C.ink, fontWeight: 600 }}>{avgK} kcal</span> · <span style={{ color: C.protein, fontWeight: 600 }}>{avgP} g prot.</span></>
          : "Touche un jour pour le noter ou l'éditer."}
      </p>

      {groups.map((g) => (
        <div key={g.key} className="mb-5">
          <SectionTitle>{g.label}</SectionTitle>
          <div className="space-y-2.5">
            {g.items.map((iso) => {
              const t = dayTotals(days[iso]);
              const w = weights[iso];
              const pct = Math.min(100, (t.kcal / settings.kcal) * 100);
              const under = t.kcal > 0 && t.kcal <= settings.kcal;
              return (
                <button key={iso} onClick={() => onOpen(iso)} className="flex w-full items-center gap-3 rounded-2xl p-4 text-left active:scale-95" style={cardStyle({ border: `1px solid ${iso === activeDate ? C.green : C.line}` })}>
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
          </div>
        </div>
      ))}
      {isoList.length <= 1 && <p className="py-8 text-center text-sm" style={{ color: C.muted }}>L'historique se remplira au fil des jours.</p>}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  ÉCRAN PROGRÈS
// ════════════════════════════════════════════════════════════════════════════
