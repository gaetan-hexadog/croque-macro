import React, { useState, useMemo } from "react";
import { Tent, Check, Sparkles, Loader2 } from "lucide-react";
import { Sheet } from "../components/Sheet.jsx";
import { EQUIPMENT, adaptSession } from "../lib/sport.js";
import { adaptWorkout, AssistantError } from "../lib/assistant.js";
import { sheetTokens } from "./theme.js";

// Normalise un exercice renvoyé par l'IA vers le modèle interne (player).
function normalizeAi(e) {
  const loadTxt = (e.load || "").toLowerCase();
  const isWeighted = /kg/.test(loadTxt);
  const secMatch = String(e.reps || "").match(/^(\d+)\s*s$/i);
  const repsNum = /^\d+$/.test(String(e.reps ?? "").trim()) ? Number(e.reps) : (e.reps ?? 10);
  return {
    name: e.name, sets: e.sets || 3, reps: secMatch ? e.reps : repsNum, rest: e.rest || 60,
    type: isWeighted ? "fixed" : "bodyweight",
    repsSeconds: secMatch ? +secMatch[1] : undefined,
    loadLabel: isWeighted ? e.load : undefined,
    tech: e.tech || "", tips: e.tips || [], adaptedFrom: "IA",
  };
}

// ── Adapter une séance au matériel / temps dispo (mode vacances) ─────────────
export function AdaptSheet({ open, onClose, session, equipment, onUse, showToast, sportTheme }) {
  const T = sheetTokens(sportTheme);
  const card = { backgroundColor: T.paper, border: `1px solid ${T.line}` };
  const [eq, setEq] = useState(() => ({ ...equipment }));
  const [minutes, setMinutes] = useState("");
  const [ai, setAi] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const isCardio = session?.type === "cardio";

  const toggle = (id) => { setEq((e) => ({ ...e, [id]: !e[id] })); setAi(null); };

  const ruleSession = useMemo(() => (session ? adaptSession(session, eq) : null), [session, eq]);
  const preview = useMemo(() => {
    if (ai && !isCardio) return { ...session, exercises: ai.exercises.map(normalizeAi), adapted: true, aiAdapted: true };
    return ruleSession;
  }, [ai, ruleSession, session, isCardio]);

  const refineAI = async () => {
    setBusy(true); setErr(null);
    try {
      const out = await adaptWorkout({
        workout: { name: session.name, type: session.type, exercises: session.exercises.map((x) => ({ name: x.name, sets: x.sets, reps: x.reps, rest: x.rest, loadLabel: x.loadLabel })) },
        equipment: eq,
        minutes: minutes ? Number(minutes) : undefined,
      });
      setAi(out);
    } catch (e) {
      setErr(e instanceof AssistantError ? e.message : "Adaptation impossible pour le moment.");
    } finally { setBusy(false); }
  };

  const use = () => {
    onUse(preview, eq);
    if (showToast) showToast(ai ? "Séance adaptée par l'IA ✨" : "Séance adaptée 🏖️");
    onClose();
  };

  if (!session) return null;
  return (
    <Sheet open={open} onClose={onClose} tokens={T} title="Adapter la séance" subtitle="Matériel & temps dispo" icon={<Tent size={18} />} iconColor={T.accent}>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: T.muted }}>Matériel disponible</p>
      <div className="mb-4 grid grid-cols-2 gap-2">
        {EQUIPMENT.map((it) => {
          const on = !!eq[it.id];
          return (
            <button key={it.id} onClick={() => toggle(it.id)} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-left active:scale-95" style={{ backgroundColor: on ? `${T.good}1a` : T.paper, border: `1px solid ${on ? T.good : T.line}` }}>
              <span className="flex h-5 w-5 items-center justify-center rounded-md" style={{ backgroundColor: on ? T.good : T.card, color: T.onAccent }}>{on && <Check size={13} />}</span>
              <span className="text-sm font-semibold" style={{ color: T.ink }}>{it.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mb-4 flex items-center justify-between rounded-xl px-3 py-2.5" style={card}>
        <span className="text-sm font-semibold" style={{ color: T.ink }}>Temps dispo (min)</span>
        <input value={minutes} onChange={(e) => { setMinutes(e.target.value); setAi(null); }} inputMode="numeric" placeholder="—" className="w-20 rounded-lg px-2 py-1 text-right text-sm font-semibold outline-none" style={{ backgroundColor: T.card, border: `1px solid ${T.line}`, color: T.ink }} />
      </div>

      {!isCardio && (
        <button onClick={refineAI} disabled={busy} className="mb-2 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold active:scale-95" style={{ backgroundColor: `${T.accent}1a`, color: T.accent, border: `1px solid ${T.accent}44`, opacity: busy ? 0.6 : 1 }}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} {busy ? "Adaptation…" : ai ? "Réaffiner avec l'IA" : "Affiner avec l'IA (temps & matériel)"}
        </button>
      )}
      {ai?.note && <p className="mb-2 rounded-lg px-3 py-2 text-xs" style={{ backgroundColor: `${T.accent}12`, color: T.sub }}>✨ {ai.note}</p>}
      {err && <p className="mb-2 rounded-lg px-3 py-2 text-xs" style={{ backgroundColor: `${T.over}14`, color: T.over }}>{err}</p>}

      <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: T.muted }}>Aperçu {ai ? "(IA)" : "(règles)"}</p>
      <div className="mb-4 space-y-1.5">
        {isCardio
          ? preview.blocks.map((b, i) => (
            <div key={i} className="rounded-xl p-3" style={card}>
              <p className="text-sm font-bold" style={{ color: T.ink }}>{b.name} · <span className="font-normal" style={{ color: T.sub }}>{b.machine}</span></p>
              <p className="text-xs" style={{ color: T.muted }}>{b.format === "intervalles" ? `${b.intervals.count} × ${b.intervals.work}s/${b.intervals.rest}s` : `${Math.round(b.duration / 60)} min`}{b.adaptedFrom ? " · adapté" : ""}</p>
            </div>
          ))
          : preview.exercises.map((ex, i) => (
            <div key={i} className="rounded-xl p-3" style={card}>
              <p className="text-sm font-bold" style={{ color: T.ink }}>{ex.name}{ex.adaptedFrom ? <span className="ml-1.5 rounded px-1.5 py-0.5 text-[9px] font-bold" style={{ backgroundColor: `${T.accent}22`, color: T.accent }}>adapté</span> : null}</p>
              <p className="text-xs" style={{ color: T.muted }}>{ex.sets} × {ex.reps} · repos {ex.rest}s{ex.loadLabel ? ` · ${ex.loadLabel}` : ex.type === "bodyweight" ? " · poids du corps" : ""}</p>
            </div>
          ))}
      </div>

      <button onClick={use} className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold active:scale-95" style={{ backgroundColor: T.good, color: T.onAccent }}><Check size={18} /> Utiliser cette séance</button>
    </Sheet>
  );
}

export default AdaptSheet;
