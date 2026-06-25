import React, { useState } from "react";
import { Timer, Dumbbell, Flame, Plus, Minus, Trash2, Pencil, Check, X } from "lucide-react";
import { C, cardStyle } from "../core.js";
import { SESSIONS, sessionVolume, formatTime } from "../sport.js";
import { StatTile, WorkoutHeader, DIFFS, diffColorByValue } from "./components.jsx";

const FONT = "'Space Grotesk', system-ui";
const copy = (o) => JSON.parse(JSON.stringify(o || []));
const relDate = (iso) => { try { return new Date(iso).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "long" }); } catch { return ""; } };

// ── Détail d'une séance passée : consulter, modifier, supprimer ──────────────
export function SessionDetail({ entry, onBack, onSave, onDelete }) {
  const s = SESSIONS[entry.sessionId];
  const cardio = (s?.type === "cardio") || (!!entry.cardioData && !entry.data?.length);
  const [editing, setEditing] = useState(false);
  const [data, setData] = useState(() => copy(entry.data));
  const [cd, setCd] = useState(() => ({ ...(entry.cardioData || {}) }));
  const [confirmDel, setConfirmDel] = useState(false);

  const setRep = (ei, si, delta) => setData((d) => d.map((ex, i) => i !== ei ? ex : { ...ex, sets: ex.sets.map((st, j) => j !== si ? st : { ...st, repsDone: Math.max(0, (st.repsDone ?? st.repsTarget ?? 0) + delta) }) }));
  const setDiff = (ei, si, v) => setData((d) => d.map((ex, i) => i !== ei ? ex : { ...ex, sets: ex.sets.map((st, j) => j !== si ? st : { ...st, difficulty: v }) }));
  const setCdField = (k, v) => setCd((c) => ({ ...c, [k]: v }));

  const save = () => { onSave(entry.id, cardio ? { cardioData: cd } : { data }); setEditing(false); };
  const cancel = () => { setData(copy(entry.data)); setCd({ ...(entry.cardioData || {}) }); setEditing(false); };

  const vol = sessionVolume({ data });

  return (
    <div className="pb-6">
      <WorkoutHeader
        title={`${s ? s.name : entry.sessionId}${entry.manual ? " · manuel" : ""}`}
        subtitle={`${s ? s.subtitle : ""} · S${entry.week} · ${relDate(entry.date)}`}
        onCancel={onBack}
        right={editing
          ? <button onClick={cancel} className="flex h-9 w-9 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }}><X size={18} /></button>
          : <button onClick={() => setEditing(true)} aria-label="Modifier" className="flex h-9 w-9 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: `${C.accent}1a`, color: C.accent }}><Pencil size={16} /></button>}
      />

      {/* Tuiles récap */}
      <div className="mb-4 grid grid-cols-3 gap-2.5">
        {entry.durationSec ? <StatTile icon={Timer} color={C.weight} value={formatTime(entry.durationSec)} label="Durée" /> : null}
        {!cardio && <StatTile icon={Dumbbell} color={C.weight} value={data.length} label="Exercices" />}
        {!cardio && vol > 0 && <StatTile icon={Flame} color={C.protein} value={vol} unit="kg" label="Volume" />}
        {cardio && cd.rpe ? <StatTile icon={Flame} color={C.protein} value={cd.rpe} unit="/10" label="Effort" /> : null}
      </div>

      {/* Force : exercices + séries */}
      {!cardio && data.map((ex, ei) => (
        <div key={ei} className="mb-2.5 rounded-2xl p-3.5" style={cardStyle()}>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-bold" style={{ color: C.ink }}>{ex.exercise}</p>
            {ex.sets[0]?.weight != null && <span className="text-xs font-bold" style={{ color: C.sub }}>{ex.sets[0].weight} kg</span>}
          </div>
          <div className="space-y-1.5">
            {ex.sets.map((st, si) => (
              <div key={si} className="flex items-center gap-2.5">
                <span className="text-xs font-semibold" style={{ color: C.muted }}>Série {si + 1}</span>
                {editing ? (
                  <div className="ml-auto flex items-center gap-2">
                    <button onClick={() => setRep(ei, si, -1)} className="flex h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: C.card, color: C.sub }}><Minus size={12} /></button>
                    <span className="min-w-8 text-center text-sm font-bold tabular-nums" style={{ color: C.ink }}>{st.repsDone ?? "—"}</span>
                    <button onClick={() => setRep(ei, si, 1)} className="flex h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: C.card, color: C.sub }}><Plus size={12} /></button>
                  </div>
                ) : (
                  <span className="ml-auto text-sm font-bold tabular-nums" style={{ color: C.ink }}>{st.repsDone ?? "—"} reps</span>
                )}
                {editing ? (
                  <div className="flex gap-1">
                    {DIFFS.map((o) => <button key={o.v} onClick={() => setDiff(ei, si, o.v)} className="h-6 w-6 rounded-full text-[10px] font-bold" style={st.difficulty === o.v ? { backgroundColor: diffColorByValue(o.v), color: "#fff" } : { backgroundColor: C.card, color: diffColorByValue(o.v) }} aria-label={o.l}>{o.l[0]}</button>)}
                  </div>
                ) : (
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: diffColorByValue(st.difficulty) }} />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Cardio : chiffres */}
      {cardio && (
        <div className="mb-2.5 rounded-2xl p-4" style={cardStyle()}>
          {[["distance", "Distance rameur (m)"], ["rowerLevel", "Résistance rameur"], ["ropeJumps", "Sauts à la corde"], ["rpe", "Effort perçu /10"]].map(([k, label]) => (
            <div key={k} className="flex items-center justify-between py-1.5">
              <span className="text-sm" style={{ color: C.sub }}>{label}</span>
              {editing
                ? <input value={cd[k] ?? ""} onChange={(e) => setCdField(k, e.target.value)} inputMode="numeric" className="w-24 rounded-lg px-2 py-1 text-right text-sm font-semibold outline-none" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink }} />
                : <span className="text-sm font-bold" style={{ color: C.ink }}>{cd[k] || "—"}</span>}
            </div>
          ))}
          {(editing || cd.notes) && (
            <div className="mt-1">
              <p className="mb-1 text-xs" style={{ color: C.muted }}>Notes</p>
              {editing
                ? <textarea value={cd.notes ?? ""} onChange={(e) => setCdField("notes", e.target.value)} rows={2} className="w-full rounded-lg p-2 text-sm outline-none" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink }} />
                : <p className="text-sm" style={{ color: C.sub }}>{cd.notes}</p>}
            </div>
          )}
        </div>
      )}

      {/* Ressenti global éventuel */}
      {entry.feel ? <p className="mb-3 text-center text-xs" style={{ color: C.muted }}>Ressenti : {"★".repeat(entry.feel)}{"☆".repeat(5 - entry.feel)}</p> : null}

      {/* Actions */}
      {editing ? (
        <button onClick={save} className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white active:scale-95" style={{ backgroundColor: C.green }}><Check size={18} /> Enregistrer les modifications</button>
      ) : confirmDel ? (
        <div className="rounded-2xl p-4" style={{ backgroundColor: `${C.over}12`, border: `1px solid ${C.over}44` }}>
          <p className="mb-3 text-center text-sm font-semibold" style={{ color: C.ink }}>Supprimer cette séance ? C'est définitif.</p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmDel(false)} className="flex-1 rounded-xl py-2.5 text-sm font-semibold active:scale-95" style={{ backgroundColor: C.paper, color: C.sub, border: `1px solid ${C.line}` }}>Annuler</button>
            <button onClick={() => { onDelete(entry.id); onBack(); }} className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white active:scale-95" style={{ backgroundColor: C.over }}>Supprimer</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setConfirmDel(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold active:scale-95" style={{ backgroundColor: `${C.over}12`, color: C.over, border: `1px solid ${C.over}33` }}><Trash2 size={16} /> Supprimer la séance</button>
      )}
    </div>
  );
}

export default SessionDetail;
