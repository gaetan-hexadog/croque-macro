import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Loader2, AlertCircle, Pin } from "lucide-react";
import { C, buildWeeklyReviewPrompt } from "../core.js";
import { explainWeight, AssistantError } from "../lib/assistant.js";
import { Sheet } from "../components/Sheet.jsx";
import { useRotatingLine, THINKING } from "../components/useRotatingLine.js";

// Découpe le rendu en lignes : **gras** + puces. Chaque puce expose son texte « plat »
// (sans markdown) pour pouvoir l'épingler en consigne.
const parseRich = (t) => String(t || "").split("\n").map((line) => {
  const bullet = /^\s*[-•*]\s+/.test(line);
  const body = bullet ? line.replace(/^\s*[-•*]\s+/, "") : line;
  const plain = body.replace(/\*\*/g, "").trim();
  const nodes = body.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((p, j) => (p.startsWith("**") && p.endsWith("**")
    ? <strong key={j} className="font-bold">{p.slice(2, -2)}</strong>
    : <React.Fragment key={j}>{p}</React.Fragment>));
  return { bullet, plain, nodes };
});

// Bilan nutrition de la semaine : analyse texte (au-delà des macros) + 2 conseils.
// onPin(text) épingle un conseil (puce) en consigne active ; directives = déjà épinglées.
export function ReviewSheet({ days = {}, settings = {}, overused = [], refISO, directives = [], onPin, onClose }) {
  const pinnedSet = React.useMemo(() => new Set((directives || []).map((d) => String(d.text || "").trim().toLowerCase())), [directives]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(null);
  const [text, setText] = useState("");
  const mounted = useRef(true);
  const thinking = useRotatingLine(THINKING.review, busy);
  const run = async () => {
    setBusy(true); setError(null);
    try { const t = await explainWeight(buildWeeklyReviewPrompt({ days, settings, refISO, overused })); if (mounted.current) setText(t); }
    catch (e) { if (mounted.current) setError(e instanceof AssistantError ? e : new AssistantError("Une erreur est survenue.")); }
    finally { if (mounted.current) setBusy(false); }
  };
  useEffect(() => { mounted.current = true; run(); return () => { mounted.current = false; }; }, []);

  return (
    <Sheet open onClose={onClose} title="Bilan de la semaine" subtitle="Au-delà des macros" icon={<Sparkles size={18} />} iconColor={C.accent}>
      {busy ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm" style={{ color: C.muted }}><Loader2 size={18} className="animate-spin" style={{ color: C.accent }} /> {thinking}</div>
      ) : error ? (
        <div className="flex items-start gap-2 rounded-2xl px-3 py-3" style={{ backgroundColor: C.card, border: `1px solid ${C.over}` }}>
          <AlertCircle size={16} style={{ color: C.over, flexShrink: 0, marginTop: 1 }} />
          <div className="text-xs" style={{ color: C.sub }}>
            <p className="font-semibold" style={{ color: C.ink }}>{error.message}</p>
            {error.kind === "offline" && <p className="mt-1">L'assistant ne marche que sur l'app déployée.</p>}
            <button onClick={run} className="mt-2 rounded-full px-3 py-1.5 text-xs font-bold active:scale-95" style={{ backgroundColor: `${C.accent}1f`, color: C.accent }}>Réessayer</button>
          </div>
        </div>
      ) : (
        <>
          {onPin && <p className="mb-2 flex items-center gap-1.5 text-[11px]" style={{ color: C.muted }}><Pin size={11} /> Épingle un conseil → l'assistant idées repas & planif en tiendra compte.</p>}
          <div className="space-y-1.5 text-sm leading-relaxed" style={{ color: C.ink }}>
            {parseRich(text).map((ln, i) => {
              if (!ln.bullet) return <div key={i}>{ln.nodes.length ? ln.nodes : " "}</div>;
              const pinned = ln.plain && pinnedSet.has(ln.plain.toLowerCase());
              return (
                <div key={i} className="flex items-start gap-1.5">
                  <span className="mt-px shrink-0" style={{ color: C.accent }}>•</span>
                  <span className="min-w-0 flex-1">{ln.nodes}</span>
                  {onPin && ln.plain && (
                    <button onClick={() => !pinned && onPin(ln.plain)} disabled={pinned} className="mt-0.5 shrink-0 active:scale-90 disabled:active:scale-100" style={{ color: pinned ? C.green : C.muted }} aria-label={pinned ? "Conseil épinglé" : "Épingler ce conseil"} title={pinned ? "Épinglé" : "Épingler"}>
                      <Pin size={14} fill={pinned ? C.green : "none"} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </Sheet>
  );
}
