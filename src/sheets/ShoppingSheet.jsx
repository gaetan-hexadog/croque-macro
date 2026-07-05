import React, { useState, useEffect, useRef } from "react";
import { ShoppingCart, Loader2, Plus, Check, Share2, Sparkles, AlertCircle } from "lucide-react";
import { C, cardStyle, buildShoppingPrompt } from "../core.js";
import { shoppingAdvice, AssistantError } from "../lib/assistant.js";
import { Sheet } from "../components/Sheet.jsx";
import { shareOrCopy } from "../lib/share.js";
import { useRotatingLine, THINKING } from "../components/useRotatingLine.js";

const CAT = { proteine: "protein", protéine: "protein", legume: "green", légume: "green", feculent: "warn", féculent: "warn", fruit: "green" };

// Conseil courses pour varier : génère une liste (frigo + variété + objectif), ajout au frigo, partage.
export function ShoppingSheet({ pantry = [], overused = [], favorites = [], knownFoods = [], settings = {}, recipes = [], onAddPantry, onClose }) {
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null); // { intro, items }
  const [progress, setProgress] = useState(0); // nb d'articles détectés en cours de stream
  const [added, setAdded] = useState(() => new Set());
  const [shared, setShared] = useState("");
  const mounted = useRef(true);
  const thinking = useRotatingLine(THINKING.shopping, busy);

  const run = async () => {
    setBusy(true); setError(null); setProgress(0);
    try {
      const out = await shoppingAdvice(buildShoppingPrompt({ pantry, overused, favorites, knownFoods, settings, recipes }), { onProgress: (n) => { if (mounted.current) setProgress(n); } });
      if (mounted.current) setData(out);
    } catch (e) { if (mounted.current) setError(e instanceof AssistantError ? e : new AssistantError("Une erreur est survenue.")); }
    finally { if (mounted.current) setBusy(false); }
  };
  useEffect(() => { mounted.current = true; run(); return () => { mounted.current = false; }; }, []);

  const add = (it) => { onAddPantry?.(it.name, {}); setAdded((s) => new Set(s).add(it.name)); };
  const share = async () => {
    if (!data) return;
    const txt = "🛒 Courses pour varier" + (data.intro ? `\n\n${data.intro}` : "") + "\n\n" + data.items.map((i) => `• ${i.name}${i.why ? ` — ${i.why}` : ""}`).join("\n");
    const r = await shareOrCopy(txt, "Liste de courses");
    if (r === "copied" || r === "shared") { setShared(r === "copied" ? "Copié" : "Partagé"); setTimeout(() => setShared(""), 2000); }
  };

  return (
    <Sheet open onClose={onClose} title="Courses pour varier" subtitle="Pour sortir de la routine" icon={<ShoppingCart size={18} />} iconColor={C.weight} z={50}>
      {busy ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm" style={{ color: C.muted }}><Loader2 size={18} className="animate-spin" style={{ color: C.weight }} /> {thinking}{progress > 0 ? ` · ${progress} article${progress > 1 ? "s" : ""}` : ""}</div>
      ) : error ? (
        <div className="flex items-start gap-2 rounded-2xl px-3 py-3" style={{ backgroundColor: C.card, border: `1px solid ${C.over}` }}>
          <AlertCircle size={16} style={{ color: C.over, flexShrink: 0, marginTop: 1 }} />
          <div className="text-xs" style={{ color: C.sub }}>
            <p className="font-semibold" style={{ color: C.ink }}>{error.message}</p>
            {error.kind === "offline" && <p className="mt-1">L'assistant ne marche que sur l'app déployée.</p>}
            <button onClick={run} className="mt-2 rounded-full px-3 py-1.5 text-xs font-bold active:scale-95" style={{ backgroundColor: `${C.weight}1f`, color: C.weight }}>Réessayer</button>
          </div>
        </div>
      ) : data ? (
        <div className="space-y-3">
          {data.intro && <p className="text-sm leading-relaxed" style={{ color: C.sub }}>{data.intro}</p>}
          <div className="space-y-2">
            {data.items.map((it, i) => {
              const c = C[CAT[(it.category || "").toLowerCase()] || "weight"];
              const isAdded = added.has(it.name);
              return (
                <div key={i} className="rounded-2xl px-3.5 py-3" style={cardStyle()}>
                  <div className="flex items-start gap-2">
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-bold" style={{ color: C.ink }}>{it.name}</span>
                        {it.category && <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase" style={{ backgroundColor: `${c}22`, color: c }}>{it.category}</span>}
                      </span>
                      {it.why && <span className="mt-0.5 block text-xs" style={{ color: C.sub }}>{it.why}</span>}
                      {it.unlocks && <span className="mt-0.5 block text-[11px] italic" style={{ color: C.muted }}>→ {it.unlocks}</span>}
                    </span>
                    <button onClick={() => add(it)} disabled={isAdded} className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-bold active:scale-95" style={isAdded ? { backgroundColor: `${C.green}1f`, color: C.green } : { backgroundColor: `${C.weight}1f`, color: C.weight }}>
                      {isAdded ? <><Check size={12} /> Ajouté</> : <><Plus size={12} /> Frigo</>}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={share} className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-2.5 text-sm font-bold active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: shared ? C.green : C.sub }}>{shared ? <Check size={15} /> : <Share2 size={15} />} {shared || "Partager la liste"}</button>
            <button onClick={run} className="flex items-center justify-center gap-1.5 rounded-2xl px-4 py-2.5 text-sm font-bold active:scale-95" style={{ backgroundColor: "transparent", color: C.weight, border: `1.5px solid ${C.weight}` }}><Sparkles size={15} /> Autre</button>
          </div>
        </div>
      ) : null}
    </Sheet>
  );
}
