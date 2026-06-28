import React, { useState, useRef } from "react";
import { Camera, Type, Loader2, AlertCircle, Plus, Image as ImageIcon } from "lucide-react";
import { C, cardStyle, buildAssistantPrompt } from "../core.js";
import { askAssistant, AssistantError, analyzePhotoMeal } from "../lib/assistant.js";
import { Sheet } from "../components/Sheet.jsx";
import { compressImage } from "../lib/image.js";

const SLOTS = [["pdj", "Petit-déj"], ["dej", "Déj"], ["diner", "Dîner"], ["snack", "En-cas"]];
const ingLine = (i) => (typeof i === "string" ? i : `${i.qty ? `${i.qty} ` : ""}${i.unit ? `${i.unit} ` : ""}${i.name}`.trim());

// Log rapide d'un repas : par PHOTO (IA vision) ou DESCRIPTION (langage naturel).
export function QuickLogSheet({ onLog, onClose, favorites = [], knownFoods = [] }) {
  const [tab, setTab] = useState("photo");
  const [text, setText] = useState("");
  const [preview, setPreview] = useState(null);
  const [base64, setBase64] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null); // estimation IA brute (base de la portion)
  const [edit, setEdit] = useState(null);      // valeurs de travail (éditables)
  const fileRef = useRef(null);

  const onFile = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setError(null); setResult(null); setEdit(null);
    try { const { dataUrl, base64 } = await compressImage(f); setPreview(dataUrl); setBase64(base64); }
    catch { setError(new AssistantError("Image illisible.")); }
  };
  const run = async (fn) => {
    setBusy(true); setError(null); setResult(null); setEdit(null);
    try { const r = await fn(); setResult(r); setEdit({ title: r.title || "Repas", kcal: Math.round(r.kcal) || 0, protein: Math.round(r.protein) || 0 }); }
    catch (e) { setError(e instanceof AssistantError ? e : new AssistantError("Une erreur est survenue.")); }
    finally { setBusy(false); }
  };
  const setPortion = (f) => setEdit((e) => ({ ...e, kcal: Math.round((result.kcal || 0) * f), protein: Math.round((result.protein || 0) * f) }));
  const portionOn = (f) => edit && Math.round((result.kcal || 0) * f) === edit.kcal;
  const analyzePhoto = () => base64 && run(() => analyzePhotoMeal(base64));
  const analyzeText = () => text.trim() && run(async () => {
    const { system, prompt, mode } = buildAssistantPrompt({ mode: "parse", text: text.trim(), favorites, knownFoods });
    const { meals } = await askAssistant({ system, prompt, mode });
    if (!meals?.length) throw new AssistantError("Rien reconnu.");
    return meals[0];
  });

  const tabBtn = (k, label, Icon) => (
    <button onClick={() => { setTab(k); setError(null); }} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold active:scale-95" style={{ backgroundColor: tab === k ? C.protein : "transparent", color: tab === k ? "#fff" : C.sub }}><Icon size={14} /> {label}</button>
  );

  return (
    <Sheet open onClose={onClose} title="Logger un repas" subtitle="Photo ou description" icon={<Camera size={18} />} iconColor={C.protein}>
      <div className="mb-3 flex gap-1.5 rounded-2xl p-1" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
        {tabBtn("photo", "Photo", Camera)}
        {tabBtn("texte", "Décrire", Type)}
      </div>

      {tab === "photo" ? (
        <div className="mb-3">
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onFile} className="hidden" />
          {preview ? (
            <button onClick={() => fileRef.current?.click()} className="mb-2 block w-full overflow-hidden rounded-2xl" style={{ border: `1px solid ${C.line}` }}>
              <img src={preview} alt="repas" style={{ width: "100%", maxHeight: 220, objectFit: "cover", display: "block" }} />
            </button>
          ) : (
            <button onClick={() => fileRef.current?.click()} className="mb-2 flex w-full flex-col items-center justify-center gap-2 rounded-2xl py-8" style={{ border: `1px dashed ${C.muted}`, color: C.sub }}>
              <ImageIcon size={26} /> <span className="text-sm font-semibold">Prendre / choisir une photo</span>
            </button>
          )}
          <button onClick={analyzePhoto} disabled={!base64 || busy} className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white active:scale-95 disabled:opacity-50" style={{ backgroundColor: C.protein }}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />} {busy ? "Analyse…" : "Analyser la photo"}
          </button>
        </div>
      ) : (
        <div className="mb-3">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Ex. 150 g poulet grillé + un bol de riz + salade verte…" className="mb-2 w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }} />
          <button onClick={analyzeText} disabled={!text.trim() || busy} className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white active:scale-95 disabled:opacity-50" style={{ backgroundColor: C.protein }}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Type size={16} />} {busy ? "Analyse…" : "Estimer les macros"}
          </button>
        </div>
      )}

      {error && (
        <div className="mb-3 flex items-start gap-2 rounded-2xl cm-card" style={{ backgroundColor: C.card, border: `1px solid ${C.over}` }}>
          <AlertCircle size={16} style={{ color: C.over, flexShrink: 0, marginTop: 1 }} />
          <div className="text-xs" style={{ color: C.sub }}>
            <p className="font-semibold" style={{ color: C.ink }}>{error.message}</p>
            {error.kind === "unconfigured" && <p className="mt-1">Ajoute <code>ANTHROPIC_API_KEY</code> dans Supabase.</p>}
            {error.kind === "offline" && <p className="mt-1">L'assistant ne marche que sur l'app déployée.</p>}
          </div>
        </div>
      )}

      {result && edit && (
        <div className="rounded-2xl cm-card" style={cardStyle()}>
          <div className="flex items-start gap-2.5">
            <span className="text-2xl leading-none">{result.emoji || "🍽️"}</span>
            <input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} className="min-w-0 flex-1 bg-transparent text-sm font-bold leading-tight outline-none" style={{ color: C.ink }} />
          </div>
          {result.ingredients?.length ? <p className="mt-1.5 text-[11px]" style={{ color: C.muted }}>{result.ingredients.map(ingLine).join(" · ")}</p> : null}

          {/* Ajustement de la portion (l'estimation IA = ×1) */}
          <div className="mb-3 mt-3 flex gap-1.5">
            {[["½", 0.5], ["1", 1], ["1½", 1.5], ["2", 2]].map(([l, f]) => (
              <button key={f} onClick={() => setPortion(f)} className="flex-1 rounded-lg py-1.5 text-xs font-bold active:scale-95" style={portionOn(f) ? { backgroundColor: C.protein, color: "#fff" } : { backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.sub }}>{l}</button>
            ))}
          </div>

          {/* kcal + protéines éditables (l'IA se trompe → on corrige avant de logger) */}
          <div className="mb-3 flex gap-2">
            <label className="flex flex-1 items-center gap-1.5 rounded-xl px-3 py-2" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}` }}>
              <input type="number" inputMode="numeric" value={edit.kcal} onChange={(e) => setEdit({ ...edit, kcal: +e.target.value || 0 })} className="w-full bg-transparent text-sm font-bold outline-none" style={{ color: C.ink }} />
              <span className="text-xs font-semibold" style={{ color: C.muted }}>kcal</span>
            </label>
            <label className="flex flex-1 items-center gap-1.5 rounded-xl px-3 py-2" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}` }}>
              <input type="number" inputMode="numeric" value={edit.protein} onChange={(e) => setEdit({ ...edit, protein: +e.target.value || 0 })} className="w-full bg-transparent text-sm font-bold outline-none" style={{ color: C.protein }} />
              <span className="text-xs font-semibold" style={{ color: C.muted }}>g prot.</span>
            </label>
          </div>

          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: C.muted }}>Ajouter à</p>
          <div className="flex gap-1.5">
            {SLOTS.map(([k, l]) => (
              <button key={k} onClick={() => { onLog({ ...result, title: edit.title, kcal: edit.kcal, protein: edit.protein }, k); onClose(); }} className="flex-1 rounded-lg py-2 text-xs font-bold text-white active:scale-95" style={{ backgroundColor: C.green }}>{l}</button>
            ))}
          </div>
        </div>
      )}
    </Sheet>
  );
}
