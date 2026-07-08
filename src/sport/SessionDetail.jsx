import React, { useState } from "react";
import { Timer, Dumbbell, Flame, Plus, Minus, Trash2, Pencil, Check, X, Repeat } from "lucide-react";
import { C, cardStyle } from "../core.js";
import { sportTokens, SPORT_FONT as FONT } from "./theme.js";
import { SESSIONS, getProgram, sessionVolume, formatTime } from "../lib/sport.js";
import { DIFFS, diffColorByValue } from "./components.jsx";

const copy = (o) => JSON.parse(JSON.stringify(o || []));
const relDate = (iso) => { try { return new Date(iso).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "long" }); } catch { return ""; } };

// ── Détail d'une séance passée : consulter, modifier, supprimer (skin hub) ────
export function SessionDetail({ entry, onBack, onSave, onDelete, onRedo, sportTheme }) {
  const t = sportTokens(sportTheme, "hub");
  const isGym = t.variant === "gym";
  const panel = isGym ? { backgroundColor: t.panel, border: `1px solid ${t.line}` } : cardStyle();
  const del = isGym ? "#ff6a4d" : C.over;
  const s = (entry.programId && getProgram(entry.programId)?.sessions?.[entry.sessionId]) || SESSIONS[entry.sessionId];
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

  const Tile = ({ icon: Ic, color, value, unit, label }) => (
    <div className="rounded-2xl p-3.5" style={panel}>
      <span className="mb-2 flex h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: `${color}22`, color }}><Ic size={16} /></span>
      <div className="flex items-baseline gap-1"><span className="text-2xl font-extrabold" style={{ color: t.ink, fontFamily: FONT }}>{value}</span>{unit && <span className="text-xs font-semibold" style={{ color: t.muted }}>{unit}</span>}</div>
      <p className="mt-0.5 text-[11px] font-medium" style={{ color: t.sub }}>{label}</p>
    </div>
  );

  return (
    <div className="pb-6" style={{ fontFamily: FONT }}>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: t.muted }}>{relDate(entry.date)}</span>
        {editing
          ? <button onClick={cancel} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95" style={{ backgroundColor: t.panel, border: `1px solid ${t.line}`, color: t.sub }}><X size={14} /> Annuler</button>
          : <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95" style={{ backgroundColor: `${t.accent}1a`, color: t.accent }}><Pencil size={14} /> Modifier</button>}
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2.5">
        {entry.durationSec ? <Tile icon={Timer} color={t.rest} value={formatTime(entry.durationSec)} label="Durée" /> : null}
        {entry.free && cd.minutes ? <Tile icon={Timer} color={t.rest} value={cd.minutes} unit="min" label="Durée" /> : null}
        {!cardio && <Tile icon={Dumbbell} color={t.rest} value={data.length} label="Exercices" />}
        {!cardio && vol > 0 && <Tile icon={Flame} color={t.effort} value={vol} unit="kg" label="Volume" />}
        {cardio && cd.rpe ? <Tile icon={Flame} color={t.effort} value={cd.rpe} unit="/10" label="Effort" /> : null}
      </div>

      {!cardio && data.map((ex, ei) => (
        <div key={ei} className="mb-2.5 rounded-2xl p-4" style={panel}>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-bold" style={{ color: t.ink }}>{ex.exercise}</p>
            {ex.sets[0]?.weight != null && <span className="text-xs font-bold" style={{ color: t.sub }}>{ex.sets[0].weight} kg</span>}
          </div>
          <div className="space-y-1.5">
            {ex.sets.map((st, si) => (
              <div key={si} className="flex items-center gap-2.5">
                <span className="text-xs font-semibold" style={{ color: t.muted }}>Série {si + 1}</span>
                {editing ? (
                  <div className="ml-auto flex items-center gap-2">
                    <button onClick={() => setRep(ei, si, -1)} className="flex h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: t.panel, color: t.sub, border: `1px solid ${t.line}` }}><Minus size={12} /></button>
                    <span className="min-w-8 text-center text-sm font-bold tabular-nums" style={{ color: t.ink }}>{st.repsDone ?? "—"}</span>
                    <button onClick={() => setRep(ei, si, 1)} className="flex h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: t.panel, color: t.sub, border: `1px solid ${t.line}` }}><Plus size={12} /></button>
                  </div>
                ) : (
                  <span className="ml-auto text-sm font-bold tabular-nums" style={{ color: t.ink }}>{st.repsDone ?? "—"} reps</span>
                )}
                {editing ? (
                  <div className="flex gap-1">
                    {DIFFS.map((o) => <button key={o.v} onClick={() => setDiff(ei, si, o.v)} className="h-6 w-6 rounded-full text-[10px] font-bold" style={st.difficulty === o.v ? { backgroundColor: diffColorByValue(o.v), color: "#fff" } : { backgroundColor: t.panel, color: diffColorByValue(o.v), border: `1px solid ${t.line}` }} aria-label={o.l}>{o.l[0]}</button>)}
                  </div>
                ) : (
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: diffColorByValue(st.difficulty) }} />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {cardio && (
        <div className="mb-2.5 rounded-2xl p-4" style={panel}>
          {(entry.free
            ? [["minutes", "Durée (min)"], ["distance", "Distance (m)"], ["rowerLevel", "Résistance"], ["rpe", "Effort /10"]]
            : [["distance", "Distance rameur (m)"], ["rowerLevel", "Résistance rameur"], ["ropeJumps", "Sauts à la corde"], ["rpe", "Effort perçu /10"]]).map(([k, label]) => (
            <div key={k} className="flex items-center justify-between py-1.5">
              <span className="text-sm" style={{ color: t.sub }}>{label}</span>
              {editing
                ? <input value={cd[k] ?? ""} onChange={(e) => setCdField(k, e.target.value)} inputMode="numeric" className="w-24 rounded-lg px-2 py-1 text-right text-sm font-semibold outline-none" style={{ backgroundColor: t.panel, border: `1px solid ${t.line}`, color: t.ink }} />
                : <span className="text-sm font-bold" style={{ color: t.ink }}>{cd[k] || "—"}</span>}
            </div>
          ))}
          {(editing || cd.notes) && (
            <div className="mt-1">
              <p className="mb-1 text-xs" style={{ color: t.muted }}>Notes</p>
              {editing
                ? <textarea value={cd.notes ?? ""} onChange={(e) => setCdField("notes", e.target.value)} rows={2} className="w-full rounded-lg p-2 text-sm outline-none" style={{ backgroundColor: t.panel, border: `1px solid ${t.line}`, color: t.ink }} />
                : <p className="text-sm" style={{ color: t.sub }}>{cd.notes}</p>}
            </div>
          )}
        </div>
      )}

      {entry.feel ? <p className="mb-3 text-center text-xs" style={{ color: t.muted }}>Ressenti : {"★".repeat(entry.feel)}{"☆".repeat(5 - entry.feel)}</p> : null}

      {editing ? (
        <button onClick={save} className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold active:scale-95" style={{ backgroundColor: t.good, color: isGym ? t.onAccent : "#fff" }}><Check size={18} /> Enregistrer les modifications</button>
      ) : confirmDel ? (
        <div className="rounded-2xl p-4" style={{ backgroundColor: `${del}12`, border: `1px solid ${del}44` }}>
          <p className="mb-3 text-center text-sm font-semibold" style={{ color: t.ink }}>Supprimer cette séance ? C'est définitif.</p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmDel(false)} className="flex-1 rounded-xl py-2.5 text-sm font-semibold active:scale-95" style={{ backgroundColor: t.panel, color: t.sub, border: `1px solid ${t.line}` }}>Annuler</button>
            <button onClick={() => { onDelete(entry.id); onBack(); }} className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white active:scale-95" style={{ backgroundColor: del }}>Supprimer</button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {onRedo && s && !entry.free && (
            <button onClick={() => onRedo(entry.sessionId)} className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold active:scale-95" style={{ backgroundColor: `${t.accent}1a`, color: t.accent, border: `1px solid ${t.accent}33` }}><Repeat size={16} /> Refaire cette séance</button>
          )}
          <button onClick={() => setConfirmDel(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold active:scale-95" style={{ backgroundColor: `${del}12`, color: del, border: `1px solid ${del}33` }}><Trash2 size={16} /> Supprimer la séance</button>
        </div>
      )}
    </div>
  );
}

export default SessionDetail;
