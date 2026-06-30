import React, { useState, useRef, useEffect } from "react";
import { Sprout, Send, Plus, Pencil, BookmarkPlus, Check, ImagePlus, X, ScanLine } from "lucide-react";
import { C } from "../core.js";
import { Sheet } from "../components/Sheet.jsx";
import { chatAssistant, AssistantError } from "../lib/assistant.js";
import { compressImage } from "../lib/image.js";
import { BarcodeScanner } from "../components/BarcodeScanner.jsx";
import { fetchProductByBarcode } from "../lib/openfoodfacts.js";

// Repli si pas d'ouverture proactive (rare) : quelques amorces.
const STARTERS = [
  "Que manger ce soir avec ce qu'il me reste ?",
  "Comment finir mes protéines sans poudre ?",
  "Une idée de repas de saison ?",
  "Mon poids a bougé, pourquoi à ton avis ?",
];

const SLOT_LABEL = { pdj: "petit-déj", dej: "déjeuner", diner: "dîner", snack: "en-cas" };
const META = {
  save_recipe: (a) => ({ icon: BookmarkPlus, chip: `Enregistrer${a.name ? ` « ${a.name} »` : " la recette"}` }),
  log_meal: (a) => ({ icon: Plus, chip: `Logger · ${SLOT_LABEL[a.slot] || a.slot}` }),
  add_to_pantry: (a) => ({ icon: Plus, chip: `Frigo${a.name ? ` · ${a.name}` : ""}` }),
  update_recipe: (a) => ({ icon: Pencil, chip: `Mettre à jour${a.target_name ? ` « ${a.target_name} »` : " la recette"}` }),
};

// Identité du coach : pastille « pousse » (croissance / saison / vivant), vert → bleu.
const Avatar = ({ size = 32 }) => (
  <span className="flex shrink-0 items-center justify-center rounded-full" style={{ width: size, height: size, background: `linear-gradient(140deg, ${C.green}, ${C.weight})`, color: "#0c0a08", boxShadow: `0 3px 10px -3px ${C.green}80, inset 0 0 0 1px rgba(255,255,255,0.25)` }}><Sprout size={Math.round(size * 0.5)} /></span>
);

// Points animés « le coach écrit ».
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
  if (bullet) return <div key={i} className="flex gap-1.5"><span className="mt-px shrink-0" style={{ color: C.green }}>•</span><span className="min-w-0">{parts}</span></div>;
  return <div key={i}>{parts.length ? parts : " "}</div>;
});

// Chat COACH agentique : le coach OUVRE la conversation (il a lu la semaine), propose
// des chips de réponse, et peut agir (cartes à confirmer). `system` porte le contexte
// d'app (relu à chaque envoi). `opening` = ouverture proactive composée par coachOpening
// ({ greeting, continuity, bubbles[], chips[] }). onAction(action) exécute et renvoie une
// confirmation (ou throw). Éphémère (repart à zéro à la fermeture).
export function ChatSheet({ system, opening, initialPrompt, onAction, onClose }) {
  const op = opening && Array.isArray(opening.bubbles) && opening.bubbles.length ? opening : null;
  // Le coach parle EN PREMIER : accueil + lecture du jour/semaine en 1-2 bulles.
  const seed = op
    ? [
        { role: "assistant", content: [op.greeting, op.bubbles[0]].filter(Boolean).join("\n\n"), actions: [], coach: true },
        ...(op.bubbles[1] ? [{ role: "assistant", content: op.bubbles[1], actions: [], coach: true }] : []),
      ]
    : [];
  const [msgs, setMsgs] = useState(seed); // { role, content, actions? }
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [acts, setActs] = useState({}); // `${i}-${ai}` → { done?: string, err?: string }
  const [img, setImg] = useState(null); // photo en attente : { dataUrl, base64, mediaType }
  const [scanning, setScanning] = useState(false);
  const [chipsHidden, setChipsHidden] = useState(false);
  const fileRef = useRef(null);
  const autoSent = useRef(false);
  const scrollRef = useRef(null);
  useEffect(() => { scrollRef.current && scrollRef.current.scrollTo({ top: 1e9, behavior: "smooth" }); }, [msgs, busy]);

  const hasUserMsg = msgs.some((m) => m.role === "user");
  const showChips = op && !hasUserMsg && !chipsHidden && !busy;

  const pickImg = async (e) => {
    const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
    setErr("");
    try { setImg(await compressImage(f)); } catch { setErr("Image illisible — réessaie."); }
  };

  // Code-barres scanné → valeurs OFF exactes pré-remplies dans la saisie (Bob complète/envoie).
  const onScan = async (code) => {
    setScanning(false); setErr("");
    try {
      const p = await fetchProductByBarcode(code);
      if (!p) { setErr(`Code ${code} introuvable dans Open Food Facts.`); return; }
      if (p.per100?.kcal == null) { setErr(`« ${p.name} » trouvé, mais sans valeurs nutritionnelles.`); return; }
      const u = p.liquid ? "ml" : "g";
      const parts = [`${Math.round(p.per100.kcal)} kcal`, p.per100.p != null ? `${Math.round(p.per100.p)} g prot.` : null, p.per100.f != null ? `${Math.round(p.per100.f)} g lipides` : null, p.per100.s != null ? `${Math.round(p.per100.s)} g sucres` : null].filter(Boolean);
      const summary = `J'ai scanné : ${p.name}${p.brand ? ` (${p.brand})` : ""}${p.quantity ? `, ${p.quantity}` : ""}. Pour 100 ${u} : ${parts.join(", ")}. Ton avis, et ajoute-le à mon frigo si pertinent.`;
      setInput((v) => (v.trim() ? `${v.trim()} ` : "") + summary);
    } catch { setErr("Lecture produit indisponible (réseau)."); }
  };

  // Met à jour le contenu de la bulle coach en cours de stream (la dernière flaggée).
  const patchStream = (fn) => setMsgs((m) => { const c = m.slice(); for (let k = c.length - 1; k >= 0; k--) { if (c[k].streaming) { c[k] = fn(c[k]); break; } } return c; });

  const send = async (text) => {
    const content = (text != null ? text : input).trim();
    if ((!content && !img) || busy) return;
    setInput(""); setErr("");
    // Avec une photo : message multimodal (texte + image base64) pour l'API ; on garde le
    // dataUrl à part pour l'afficher dans la bulle.
    const api = img
      ? [{ type: "text", text: content || "Analyse cette photo (repas ou produit) : estime les macros et dis-moi si ça colle à mes objectifs." }, { type: "image", source: { type: "base64", media_type: img.mediaType, data: img.base64 } }]
      : content;
    const next = [...msgs, { role: "user", content, img: img?.dataUrl || null, api }];
    setImg(null);
    setMsgs([...next, { role: "assistant", content: "", actions: [], streaming: true }]); // placeholder qui se remplit
    setBusy(true);
    try {
      // Les bulles d'OUVERTURE sont locales (pas envoyées au modèle) : on n'envoie que les
      // vrais échanges (tout sauf les messages coach d'accueil).
      const history = next.filter((m) => !m.coach);
      const apiMsgs = history.map((m) => ({ role: m.role, content: m.api != null ? m.api : (m.content || "(proposition d'action)") }));
      const { text: reply, actions } = await chatAssistant({ system, messages: apiMsgs }, { onToken: (t) => patchStream((x) => ({ ...x, content: t })) });
      patchStream(() => ({ role: "assistant", content: reply, actions }));
    } catch (e) {
      setMsgs((m) => m.filter((x) => !x.streaming));
      setErr(e instanceof AssistantError ? e.message : "Réponse impossible — réessaie.");
    } finally { setBusy(false); }
  };

  const onChip = (chip) => { if (chip.dismiss) { setChipsHidden(true); return; } send(chip.prompt || chip.label); };
  // Question pré-remplie (coach ouvert depuis une carte) → envoi auto, une seule fois.
  useEffect(() => { if (initialPrompt && !autoSent.current) { autoSent.current = true; send(initialPrompt); } }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    <Sheet open onClose={onClose} title="Ton coach" subtitle="Il a lu ta semaine · tu valides ses actions" icon={<Sprout size={18} />} iconColor={C.green}>
      <div className="flex flex-col" style={{ height: "min(68vh, 580px)" }}>
        {scanning ? (
          <div className="flex flex-1 flex-col justify-center">
            <BarcodeScanner onDetect={onScan} onClose={() => setScanning(false)} />
          </div>
        ) : (<>
        <div ref={scrollRef} className="flex-1 space-y-2.5 overflow-y-auto pb-2" style={{ scrollbarWidth: "none" }}>
          {msgs.length === 0 && !busy && (
            <div className="space-y-3 py-2">
              <p className="text-sm leading-relaxed" style={{ color: C.sub }}>Je connais ton budget du jour, ta semaine, ton frigo et la saison — et je peux enregistrer / logger / modifier (tu valides toujours). Tu peux aussi m'envoyer une <b style={{ color: C.ink }}>photo</b> d'un plat ou d'un produit.</p>
              <div className="flex flex-col gap-1.5">
                {STARTERS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-semibold active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }}>
                    <Sprout size={13} style={{ color: C.green, flexShrink: 0 }} /> {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {op?.continuity && !hasUserMsg && (
            <p className="px-1 text-center text-[11px]" style={{ color: C.muted }}>↩ {op.continuity}</p>
          )}
          {msgs.map((m, i) => m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[82%] overflow-hidden rounded-2xl rounded-br-md text-sm leading-relaxed" style={{ backgroundColor: `${C.green}22`, border: `1px solid ${C.green}3a`, color: C.ink }}>
                {m.img && <img src={m.img} alt="photo envoyée" className="block max-h-52 w-full object-cover" />}
                {m.content && <div className="whitespace-pre-wrap px-3.5 py-2.5">{m.content}</div>}
              </div>
            </div>
          ) : (
            <div key={i} className="flex items-start gap-2">
              <Avatar size={28} />
              <div className="min-w-0 flex-1 space-y-1.5">
                {m.streaming && !m.content ? (
                  <div className="w-fit rounded-2xl rounded-bl-md px-2 py-0.5" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}><Dots /></div>
                ) : m.content ? (
                  <div className="w-fit max-w-full rounded-2xl rounded-bl-md px-3.5 py-2.5 text-sm leading-relaxed" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }}>{renderRich(m.content)}{m.streaming && <span className="cm-caret" style={{ color: C.green }}>▍</span>}</div>
                ) : null}
                {!m.streaming && m.actions?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {m.actions.map((action, ai) => {
                      const key = `${i}-${ai}`, st = acts[key], meta = (META[action.type] || (() => null))(action.input || {});
                      if (!meta) return null;
                      const Icon = meta.icon;
                      if (st?.done) return <span key={ai} className="inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold" style={{ backgroundColor: `${C.green}1f`, color: C.green }}><Check size={13} className="shrink-0" /> <span className="truncate">{st.done}</span></span>;
                      if (st?.err) return <span key={ai} className="inline-flex max-w-full items-center rounded-full px-3 py-1.5 text-xs font-semibold" style={{ backgroundColor: `${C.over}1f`, color: C.over }}><span className="truncate">{st.err}</span></span>;
                      return <button key={ai} onClick={() => runAction(key, action)} className="inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold active:scale-95" style={{ backgroundColor: C.green, color: "#0c0a08" }}><Icon size={13} className="shrink-0" /> <span className="truncate">{meta.chip}</span></button>;
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
          {/* Réponses proposées PAR le coach (ouverture proactive) */}
          {showChips && (
            <div className="flex flex-wrap gap-1.5 pl-9 pt-0.5">
              {op.chips.map((chip, ci) => {
                const dismiss = !!chip.dismiss;
                const tone = dismiss ? C.muted : C.green;
                return (
                  <button key={ci} onClick={() => onChip(chip)} className="rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95" style={{ backgroundColor: `${tone}1f`, color: tone, border: `1px solid ${tone}40` }}>{chip.label}</button>
                );
              })}
            </div>
          )}
          {err && <p className="px-1 text-xs" style={{ color: C.over }}>{err}</p>}
        </div>

        <div className="shrink-0 pt-2" style={{ borderTop: `1px solid ${C.line}` }}>
          {img && (
            <div className="mb-2 flex items-center gap-2">
              <div className="relative">
                <img src={img.dataUrl} alt="à envoyer" className="h-14 w-14 rounded-xl object-cover" style={{ border: `1px solid ${C.line}` }} />
                <button onClick={() => setImg(null)} className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: C.over, color: "#fff" }} aria-label="Retirer la photo"><X size={12} /></button>
              </div>
              <span className="text-xs" style={{ color: C.sub }}>Photo prête — ajoute une question (ou envoie).</span>
            </div>
          )}
          <div className="flex items-end gap-2">
            <input ref={fileRef} type="file" accept="image/*" onChange={pickImg} className="hidden" />
            <button onClick={() => fileRef.current?.click()} disabled={busy} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl active:scale-95 disabled:opacity-40" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.sub }} aria-label="Ajouter une photo">
              <ImagePlus size={18} />
            </button>
            <button onClick={() => { setErr(""); setScanning(true); }} disabled={busy} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl active:scale-95 disabled:opacity-40" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.sub }} aria-label="Scanner un code-barres">
              <ScanLine size={18} />
            </button>
            <textarea
              value={input} onChange={(e) => setInput(e.target.value)} rows={1}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Réponds à ton coach…"
              className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl px-3.5 py-3 text-sm outline-none"
              style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink }} />
            <button onClick={() => send()} disabled={(!input.trim() && !img) || busy} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl active:scale-95 disabled:opacity-40" style={{ backgroundColor: C.green, color: "#0c0a08" }} aria-label="Envoyer">
              <Send size={18} />
            </button>
          </div>
        </div>
        </>)}
      </div>
    </Sheet>
  );
}
