import React, { useState, useMemo } from "react";
import { Tent, Check, Sparkles, Loader2 } from "lucide-react";
import { C, cardStyle } from "../core.js";
import { Sheet } from "../components/Sheet.jsx";
import { EQUIPMENT, adaptSession } from "../lib/sport.js";
import { adaptWorkout, AssistantError } from "../lib/assistant.js";

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
export function AdaptSheet({ open, onClose, session, equipment, onUse, showToast }) {
  const [eq, setEq] = useState(() => ({ ...equipment }));
  const [minutes, setMinutes] = useState("");
  const [ai, setAi] = useState(null);       // { exercises, note } si affiné par IA
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const isCardio = session?.type === "cardio";

  const toggle = (id) => { setEq((e) => ({ ...e, [id]: !e[id] })); setAi(null); };

  // Aperçu par règles (recalculé à chaque changement de matériel).
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
    <Sheet open={open} onClose={onClose} title="Adapter la séance" subtitle="Matériel & temps dispo" icon={<Tent size={18} />} iconColor={C.accent}>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: C.muted }}>Matériel disponible</p>
      <div className="mb-4 grid grid-cols-2 gap-2">
        {EQUIPMENT.map((it) => {
          const on = !!eq[it.id];
          return (
            <button key={it.id} onClick={() => toggle(it.id)} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-left active:scale-95" style={{ backgroundColor: on ? `${C.green}1a` : C.paper, border: `1px solid ${on ? C.green : C.line}` }}>
              <span className="flex h-5 w-5 items-center justify-center rounded-md" style={{ backgroundColor: on ? C.green : C.card, color: "#fff" }}>{on && <Check size={13} />}</span>
              <span className="text-sm font-semibold" style={{ color: C.ink }}>{it.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mb-4 flex items-center justify-between rounded-xl px-3 py-2.5" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}` }}>
        <span className="text-sm font-semibold" style={{ color: C.ink }}>Temps dispo (min)</span>
        <input value={minutes} onChange={(e) => { setMinutes(e.target.value); setAi(null); }} inputMode="numeric" placeholder="—" className="w-20 rounded-lg px-2 py-1 text-right text-sm font-semibold outline-none" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }} />
      </div>

      {/* Affiner avec l'IA (force uniquement) */}
      {!isCardio && (
        <button onClick={refineAI} disabled={busy} className="mb-2 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold active:scale-95" style={{ backgroundColor: `${C.accent}1a`, color: C.accent, border: `1px solid ${C.accent}44`, opacity: busy ? 0.6 : 1 }}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} {busy ? "Adaptation…" : ai ? "Réaffiner avec l'IA" : "Affiner avec l'IA (temps & matériel)"}
        </button>
      )}
      {ai?.note && <p className="mb-2 rounded-lg px-3 py-2 text-xs" style={{ backgroundColor: `${C.accent}12`, color: C.sub }}>✨ {ai.note}</p>}
      {err && <p className="mb-2 rounded-lg px-3 py-2 text-xs" style={{ backgroundColor: `${C.over}14`, color: C.over }}>{err}</p>}

      {/* Aperçu */}
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: C.muted }}>Aperçu {ai ? "(IA)" : "(règles)"}</p>
      <div className="mb-4 space-y-1.5">
        {isCardio
          ? preview.blocks.map((b, i) => (
            <div key={i} className="rounded-xl p-3" style={cardStyle()}>
              <p className="text-sm font-bold" style={{ color: C.ink }}>{b.name} · <span className="font-normal" style={{ color: C.sub }}>{b.machine}</span></p>
              <p className="text-xs" style={{ color: C.muted }}>{b.format === "intervalles" ? `${b.intervals.count} × ${b.intervals.work}s/${b.intervals.rest}s` : `${Math.round(b.duration / 60)} min`}{b.adaptedFrom ? " · adapté" : ""}</p>
            </div>
          ))
          : preview.exercises.map((ex, i) => (
            <div key={i} className="rounded-xl p-3" style={cardStyle()}>
              <p className="text-sm font-bold" style={{ color: C.ink }}>{ex.name}{ex.adaptedFrom ? <span className="ml-1.5 rounded px-1.5 py-0.5 text-[9px] font-bold" style={{ backgroundColor: `${C.accent}22`, color: C.accent }}>adapté</span> : null}</p>
              <p className="text-xs" style={{ color: C.muted }}>{ex.sets} × {ex.reps} · repos {ex.rest}s{ex.loadLabel ? ` · ${ex.loadLabel}` : ex.type === "bodyweight" ? " · poids du corps" : ""}</p>
            </div>
          ))}
      </div>

      <button onClick={use} className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white active:scale-95" style={{ backgroundColor: C.green }}><Check size={18} /> Utiliser cette séance</button>
    </Sheet>
  );
}

export default AdaptSheet;
