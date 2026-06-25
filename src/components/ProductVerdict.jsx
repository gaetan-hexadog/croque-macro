import React from "react";

// Affiche le feu « courses » (vert/orange/rouge) + le détail des 3 règles.
// Reçoit le thème `C` en prop (utilisé dans des contextes variés : scan, pioche).
export function ProductVerdict({ C, verdict, note = "verdict · /100 g" }) {
  if (!verdict) return null;
  const FLAG = {
    good: { c: C.green, e: "🟢", l: "Bon choix" },
    mid: { c: C.protein, e: "🟠", l: "Moyen" },
    bad: { c: C.over, e: "🔴", l: "À surveiller" },
  };
  return (
    <div className="rounded-2xl cm-card" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}` }}>
      <div className="mb-2 flex items-center justify-between">
        <span className="rounded-full px-2.5 py-1 text-xs font-bold" style={{ backgroundColor: `${FLAG[verdict.flag].c}22`, color: FLAG[verdict.flag].c }}>{FLAG[verdict.flag].e} {FLAG[verdict.flag].l}</span>
        <span className="text-[11px]" style={{ color: C.muted }}>{note}</span>
      </div>
      <div className="space-y-1">
        {verdict.rules.map((r) => (
          <div key={r.key} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: FLAG[r.status].c }} />
            <span style={{ color: C.sub }}>{r.label}</span>
            <span className="ml-auto font-semibold tabular-nums" style={{ color: C.ink }}>{r.value}</span>
            <span className="w-20 text-right" style={{ color: FLAG[r.status].c }}>{r.hint}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
