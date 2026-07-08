import React, { useState } from "react";
import { Sparkles, ArrowUp } from "lucide-react";
import { C } from "../core.js";

// Barre assistant persistante (direction F) : une pilule en bas d'écran qui envoie
// le texte au coach/chat. `fixed` la colle au-dessus de la tab bar (écrans à onglets) ;
// sinon elle s'insère comme pied de page (ex. plein écran Frigo).
export function AssistantBar({ onSend, placeholder = "Demande à l'assistant…", fixed = false }) {
  const [text, setText] = useState("");
  const send = () => { onSend?.(text.trim() || undefined); setText(""); };
  const pill = (
    <div className="flex items-center gap-2 rounded-full py-1 pl-4 pr-1"
      style={{ backgroundColor: C.sheet, border: `1px solid ${C.accent}55`, boxShadow: `0 10px 30px -14px ${C.accent}` }}>
      <Sparkles size={16} style={{ color: C.accent, flexShrink: 0 }} />
      <input
        value={text} onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") send(); }}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none" style={{ color: C.ink }} />
      <button onClick={send} aria-label="Envoyer à l'assistant" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full active:scale-95" style={{ background: `linear-gradient(150deg, ${C.protein}, ${C.accent})`, color: "#fff" }}>
        <ArrowUp size={16} />
      </button>
    </div>
  );
  if (!fixed) return <div className="pt-1">{pill}</div>;
  return (
    <div className="fixed inset-x-0 z-20 px-4" style={{ bottom: "calc(env(safe-area-inset-bottom) + 4.6rem)", pointerEvents: "none" }}>
      <div className="mx-auto w-full max-w-md" style={{ pointerEvents: "auto" }}>{pill}</div>
    </div>
  );
}
