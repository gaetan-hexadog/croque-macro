import React, { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { C } from "../core.js";
import { Sheet } from "../components/Sheet.jsx";
import { chatAssistant, AssistantError } from "../lib/assistant.js";

const STARTERS = [
  "Que manger ce soir avec ce qu'il me reste ?",
  "Il me reste combien de protéines aujourd'hui ?",
  "Une idée de petit-déj rapide et protéiné ?",
  "Mon poids a bougé, pourquoi à ton avis ?",
];

// Chat assistant : conversation libre, le system porte le contexte d'app (passé en prop).
// Éphémère (repart à zéro à la fermeture). Le system est relu à CHAQUE envoi → contexte frais.
export function ChatSheet({ system, onClose }) {
  const [msgs, setMsgs] = useState([]); // { role: "user"|"assistant", content }
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const scrollRef = useRef(null);
  useEffect(() => { scrollRef.current && scrollRef.current.scrollTo({ top: 1e9, behavior: "smooth" }); }, [msgs, busy]);

  const send = async (text) => {
    const content = (text != null ? text : input).trim();
    if (!content || busy) return;
    setInput(""); setErr("");
    const next = [...msgs, { role: "user", content }];
    setMsgs(next); setBusy(true);
    try {
      const reply = await chatAssistant({ system, messages: next });
      setMsgs((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e) {
      setErr(e instanceof AssistantError ? e.message : "Réponse impossible — réessaie.");
    } finally { setBusy(false); }
  };

  return (
    <Sheet open onClose={onClose} title="Assistant" subtitle="Il connaît ton contexte (budget, frigo, recettes…)" icon={<Sparkles size={18} />} iconColor={C.accent}>
      <div className="flex flex-col" style={{ height: "min(68vh, 580px)" }}>
        <div ref={scrollRef} className="flex-1 space-y-2.5 overflow-y-auto pb-2" style={{ scrollbarWidth: "none" }}>
          {msgs.length === 0 && !busy && (
            <div className="space-y-3 py-2">
              <p className="text-sm leading-relaxed" style={{ color: C.sub }}>Pose-moi une question — je connais ton budget du jour, ta semaine, ton frigo et tes recettes.</p>
              <div className="flex flex-col gap-1.5">
                {STARTERS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-semibold active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }}>
                    <Sparkles size={13} style={{ color: C.accent, flexShrink: 0 }} /> {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed" style={m.role === "user"
                ? { backgroundColor: C.accent, color: "#1a1208", borderBottomRightRadius: 6 }
                : { backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink, borderBottomLeftRadius: 6 }}>{m.content}</div>
            </div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-sm" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.muted, borderBottomLeftRadius: 6 }}>
                <Loader2 size={15} className="animate-spin" /> réfléchit…
              </div>
            </div>
          )}
          {err && <p className="px-1 text-xs" style={{ color: C.over }}>{err}</p>}
        </div>

        <div className="flex shrink-0 items-end gap-2 pt-2" style={{ borderTop: `1px solid ${C.line}` }}>
          <textarea
            value={input} onChange={(e) => setInput(e.target.value)} rows={1}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Écris ta question…"
            className="max-h-28 min-h-[2.75rem] flex-1 resize-none rounded-2xl px-3.5 py-3 text-sm outline-none"
            style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink }} />
          <button onClick={() => send()} disabled={!input.trim() || busy} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white active:scale-95 disabled:opacity-40" style={{ backgroundColor: C.accent, color: "#1a1208" }} aria-label="Envoyer">
            <Send size={18} />
          </button>
        </div>
      </div>
    </Sheet>
  );
}
