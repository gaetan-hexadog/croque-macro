import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";
import { C, buildWeeklyReviewPrompt } from "../core.js";
import { explainWeight, AssistantError } from "../lib/assistant.js";
import { Sheet } from "../components/Sheet.jsx";

// Rendu léger : **gras** + puces, sauts de ligne conservés.
const rich = (t) => String(t || "").split("\n").map((line, i) => {
  const bullet = /^\s*[-•*]\s+/.test(line);
  const body = bullet ? line.replace(/^\s*[-•*]\s+/, "") : line;
  const parts = body.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((p, j) => (p.startsWith("**") && p.endsWith("**")
    ? <strong key={j} className="font-bold">{p.slice(2, -2)}</strong>
    : <React.Fragment key={j}>{p}</React.Fragment>));
  if (bullet) return <div key={i} className="flex gap-1.5"><span className="mt-px shrink-0" style={{ color: C.accent }}>•</span><span className="min-w-0">{parts}</span></div>;
  return <div key={i}>{parts.length ? parts : " "}</div>;
});

// Bilan nutrition de la semaine : analyse texte (au-delà des macros) + 2 conseils.
export function ReviewSheet({ days = {}, settings = {}, overused = [], refISO, onClose }) {
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(null);
  const [text, setText] = useState("");
  const mounted = useRef(true);
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
        <div className="flex items-center justify-center gap-2 py-10 text-sm" style={{ color: C.muted }}><Loader2 size={18} className="animate-spin" style={{ color: C.accent }} /> L'assistant analyse ta semaine…</div>
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
        <div className="space-y-1.5 text-sm leading-relaxed" style={{ color: C.ink }}>{rich(text)}</div>
      )}
    </Sheet>
  );
}
