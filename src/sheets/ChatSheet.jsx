import React, { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Plus, Pencil, BookmarkPlus, Check } from "lucide-react";
import { C } from "../core.js";
import { Sheet } from "../components/Sheet.jsx";
import { chatAssistant, AssistantError } from "../lib/assistant.js";

const STARTERS = [
  "Que manger ce soir avec ce qu'il me reste ?",
  "Propose-moi une recette de déj et enregistre-la",
  "Il me reste combien de protéines aujourd'hui ?",
  "Mon poids a bougé, pourquoi à ton avis ?",
];

const SLOT_LABEL = { pdj: "petit-déj", dej: "déjeuner", diner: "dîner", snack: "en-cas" };
const META = {
  save_recipe: (a) => ({ icon: BookmarkPlus, chip: `Enregistrer${a.name ? ` « ${a.name} »` : " la recette"}` }),
  log_meal: (a) => ({ icon: Plus, chip: `Logger · ${SLOT_LABEL[a.slot] || a.slot}` }),
  add_to_pantry: (a) => ({ icon: Plus, chip: `Frigo${a.name ? ` · ${a.name}` : ""}` }),
  update_recipe: (a) => ({ icon: Pencil, chip: `Mettre à jour${a.target_name ? ` « ${a.target_name} »` : " la recette"}` }),
};

// Avatar de l'assistant (pastille dégradée, léger relief).
const Avatar = () => (
  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: `radial-gradient(circle at 32% 28%, ${C.warn}, ${C.accent})`, color: "#1a1208", boxShadow: `0 3px 10px -3px ${C.accent}80, inset 0 0 0 1px rgba(255,255,255,0.28)` }}><Sparkles size={15} /></span>
);

// Points animés « l'assistant écrit ».
const Dots = () => (
  <span className="flex items-center gap-1 px-1 py-1.5">
    {[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: C.muted, animation: "cmBounce 1s infinite ease-in-out", animationDelay: `${i * 0.16}s` }} />)}
  </span>
);

// Rendu léger : **gras** + lignes à puces, en gardant les sauts de ligne.
const renderRich = (text) => String(text || "").split("\n").map((line, i) => {
  const bullet = /^\s*[-•*]\s+/.test(line);
  const body = bullet ? line.replace(/^\s*[-•*]\s+/, "") : line;
  const parts = body.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((p, j) => (p.startsWith("**") && p.endsWith("**")
    ? <strong key={j} className="font-bold">{p.slice(2, -2)}</strong>
    : <React.Fragment key={j}>{p}</React.Fragment>));
  if (bullet) return <div key={i} className="flex gap-1.5"><span className="mt-px shrink-0" style={{ color: C.accent }}>•</span><span className="min-w-0">{parts}</span></div>;
  return <div key={i}>{parts.length ? parts : " "}</div>;
});

// Chat assistant agentique : conversation libre + cartes d'action à CONFIRMER (tool use).
// Le system porte le contexte d'app (relu à chaque envoi). onAction(action) exécute et
// renvoie un message de confirmation (ou throw). Éphémère (repart à zéro à la fermeture).
export function ChatSheet({ system, onAction, onClose }) {
  const [msgs, setMsgs] = useState([]); // { role, content, actions? }
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [acts, setActs] = useState({}); // `${i}-${ai}` → { done?: string, err?: string }
  const scrollRef = useRef(null);
  useEffect(() => { scrollRef.current && scrollRef.current.scrollTo({ top: 1e9, behavior: "smooth" }); }, [msgs, busy]);

  const send = async (text) => {
    const content = (text != null ? text : input).trim();
    if (!content || busy) return;
    setInput(""); setErr("");
    const next = [...msgs, { role: "user", content }];
    setMsgs(next); setBusy(true);
    try {
      const apiMsgs = next.map((m) => ({ role: m.role, content: m.content || "(proposition d'action)" }));
      const { text: reply, actions } = await chatAssistant({ system, messages: apiMsgs });
      setMsgs((m) => [...m, { role: "assistant", content: reply, actions }]);
    } catch (e) {
      setErr(e instanceof AssistantError ? e.message : "Réponse impossible — réessaie.");
    } finally { setBusy(false); }
  };

  const runAction = async (key, action) => {
    if (acts[key]?.done) return;
    try {
      const msg = await onAction(action);
      setActs((s) => ({ ...s, [key]: { done: msg || "Fait." } }));
    } catch (e) {
      setActs((s) => ({ ...s, [key]: { err: e?.message || "Action impossible." } }));
    }
  };

  return (
    <Sheet open onClose={onClose} title="Assistant" subtitle="Il connaît ton contexte et peut agir (tu confirmes)" icon={<Sparkles size={18} />} iconColor={C.accent}>
      <div className="flex flex-col" style={{ height: "min(68vh, 580px)" }}>
        <div ref={scrollRef} className="flex-1 space-y-2.5 overflow-y-auto pb-2" style={{ scrollbarWidth: "none" }}>
          {msgs.length === 0 && !busy && (
            <div className="space-y-3 py-2">
              <p className="text-sm leading-relaxed" style={{ color: C.sub }}>Pose-moi une question — je connais ton budget du jour, ta semaine, ton frigo et tes recettes, et je peux enregistrer/logger/modifier (tu valides toujours).</p>
              <div className="flex flex-col gap-1.5">
                {STARTERS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-semibold active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }}>
                    <Sparkles size={13} style={{ color: C.accent, flexShrink: 0 }} /> {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {msgs.map((m, i) => m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[82%] whitespace-pre-wrap rounded-2xl rounded-br-md px-3.5 py-2.5 text-sm leading-relaxed" style={{ backgroundColor: `${C.accent}22`, border: `1px solid ${C.accent}3a`, color: C.ink }}>{m.content}</div>
            </div>
          ) : (
            <div key={i} className="flex items-start gap-2">
              <Avatar />
              <div className="min-w-0 flex-1 space-y-1.5">
                {m.content && (
                  <div className="w-fit max-w-full rounded-2xl rounded-bl-md px-3.5 py-2.5 text-sm leading-relaxed" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }}>{renderRich(m.content)}</div>
                )}
                {m.actions?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {m.actions.map((action, ai) => {
                      const key = `${i}-${ai}`, st = acts[key], meta = (META[action.type] || (() => null))(action.input || {});
                      if (!meta) return null;
                      const Icon = meta.icon;
                      if (st?.done) return <span key={ai} className="inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold" style={{ backgroundColor: `${C.green}1f`, color: C.green }}><Check size={13} className="shrink-0" /> <span className="truncate">{st.done}</span></span>;
                      if (st?.err) return <span key={ai} className="inline-flex max-w-full items-center rounded-full px-3 py-1.5 text-xs font-semibold" style={{ backgroundColor: `${C.over}1f`, color: C.over }}><span className="truncate">{st.err}</span></span>;
                      return <button key={ai} onClick={() => runAction(key, action)} className="inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold active:scale-95" style={{ backgroundColor: C.accent, color: "#1a1208" }}><Icon size={13} className="shrink-0" /> <span className="truncate">{meta.chip}</span></button>;
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex items-start gap-2">
              <Avatar />
              <div className="rounded-2xl rounded-bl-md px-2 py-0.5" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}><Dots /></div>
            </div>
          )}
          {err && <p className="px-1 text-xs" style={{ color: C.over }}>{err}</p>}
        </div>

        <div className="flex shrink-0 items-end gap-2 pt-2" style={{ borderTop: `1px solid ${C.line}` }}>
          <textarea
            value={input} onChange={(e) => setInput(e.target.value)} rows={1}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Écris ta question…"
            className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl px-3.5 py-3 text-sm outline-none"
            style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink }} />
          <button onClick={() => send()} disabled={!input.trim() || busy} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl active:scale-95 disabled:opacity-40" style={{ backgroundColor: C.accent, color: "#1a1208" }} aria-label="Envoyer">
            <Send size={18} />
          </button>
        </div>
      </div>
    </Sheet>
  );
}
