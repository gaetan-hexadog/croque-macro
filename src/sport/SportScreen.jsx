import React, { useState, useEffect, useRef } from "react";
import { Dumbbell } from "lucide-react";
import { C } from "../core.js";
import { getCurrentBlock, calcCurrentWeekFromStart, adaptSession, DEFAULT_EQUIPMENT, applyArmCorrection, applyFeedback, applyProgramAdaptation, getActiveProgram, getProgram, PROGRAM_LIST } from "../lib/sport.js";
import { SportHome } from "./SportHome.jsx";
import { SessionPreview } from "./SessionPreview.jsx";
import { ForceWorkout } from "./ForceWorkout.jsx";
import { CardioWorkout } from "./CardioWorkout.jsx";
import { SessionDetail } from "./SessionDetail.jsx";
import { ManualLogSheet } from "./ManualLogSheet.jsx";
import { SportSettings } from "./SportSettings.jsx";
import { AdaptSheet } from "./AdaptSheet.jsx";
import { loadLive } from "./liveSession.js";
import { setCueConfig } from "./timers.jsx";

const FONT = "'Space Grotesk', system-ui";
const DEFAULT_SESSION_DAYS = { A: 2, B: 4, C: 6 };

// ════════════════════════════════════════════════════════════════════════════
// SportScreen — orchestrateur de l'onglet Sport. Détient la navigation interne
// (accueil / preview / séance active / détail) + les sheets (manuel, réglages).
// MULTI-PROGRAMMES : le programme actif vit dans sport.activeProgramId ; la
// position (semaine) est PAR programme (sport.programState[pid]) ; les logs sont
// scopés par programme (id = `${pid}:W{week}-{sid}`). Les charges sont GLOBALES
// (partagées entre programmes — ta force te suit). La logique vit dans engine/.
// ════════════════════════════════════════════════════════════════════════════
export function SportScreen({ sport = {}, setSport, workouts = {}, setWorkouts, pushNav, showToast, onDeleteWorkout, setHeader, onCoach }) {
  const [active, setActive] = useState(null);     // { sessionId, session, resume }
  const [preview, setPreview] = useState(null);   // sessionId
  const [detail, setDetail] = useState(null);     // entry
  const [manualOpen, setManualOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [adaptFor, setAdaptFor] = useState(null); // sessionId pour la sheet d'adaptation
  const [overrides, setOverrides] = useState({}); // { sessionId: séance adaptée ponctuelle }

  // Signaux en séance (vibration/voix) pilotés par les réglages ; l'audio suit `soundEnabled`.
  useEffect(() => {
    setCueConfig({ haptics: sport.hapticsEnabled !== false, voice: sport.voiceEnabled !== false });
  }, [sport.hapticsEnabled, sport.voiceEnabled]);

  // ── Programme ACTIF + état PAR programme (semaine/position). ────────────────
  const program = getActiveProgram(sport);
  const pid = program.id;
  const SESS = program.sessions;
  const ps = sport.programState?.[pid] || {};
  const startDate = ps.startDate || null;
  const currentWeek = ps.weekManuallySet ? (ps.currentWeek || 1) : calcCurrentWeekFromStart(startDate);
  const block = getCurrentBlock(currentWeek);
  const sessionDays = sport.preferences?.sessionDays || DEFAULT_SESSION_DAYS;
  const wid = (sid, w = currentWeek) => `${pid}:W${w}-${sid}`; // id de séance scopé programme

  // Séance effective : override ponctuel > mode vacances (adaptation auto) > programme actif.
  const effectiveSession = (sid) => {
    const base = overrides[sid]
      ? overrides[sid]
      : sport.vacationMode
        ? adaptSession(SESS[sid], { ...DEFAULT_EQUIPMENT, ...(sport.equipment || {}) })
        : SESS[sid];
    return applyProgramAdaptation(applyArmCorrection(base, sport), currentWeek, workouts);
  };

  // Reprise auto d'une séance interrompue (PWA rechargée en arrière-plan).
  const resumedRef = useRef(false);
  useEffect(() => {
    if (resumedRef.current || !startDate) return;
    resumedRef.current = true;
    const live = loadLive();
    if (live && live.sessionId && live.session) setActive({ sessionId: live.sessionId, session: live.session, resume: live });
  }, [startDate]);

  // Pilote le header global (title / subtitle / badge / actions / retour) selon le sous-écran.
  useEffect(() => {
    if (!setHeader) return;
    if (active) {
      setHeader(null); // séance = plein écran (SessionShell couvre header + tabbar)
    } else if (preview) {
      const s = SESS[preview];
      setHeader({ title: s.name, subtitle: `${s.subtitle} · ${s.day} · ${s.duration}`, onBack: () => setPreview(null) });
    } else if (detail) {
      const s = SESS[detail.sessionId];
      const title = detail.free ? "Cardio libre" : (s ? s.name : detail.sessionId);
      const subtitle = detail.free ? `Rameur · S${detail.week}` : `${s ? s.subtitle + " · " : ""}S${detail.week}${detail.manual ? " · manuel" : ""}`;
      setHeader({ title, subtitle, onBack: () => setDetail(null) });
    } else {
      setHeader({
        title: "Sport",
        subtitle: `${program.name} · S${currentWeek}`,
        badge: block ? { text: block.phase, tone: block.phase === "Décharge" ? "weight" : "green" } : null,
        onSettings: () => setSettingsOpen(true),
      });
    }
    return () => setHeader(null);
  }, [active, preview, detail, currentWeek, block, program, setHeader]);

  const openPreview = (sessionId) => { if (pushNav) pushNav(() => setPreview(null)); setPreview(sessionId); };
  const startSession = (sessionId) => { setPreview(null); if (pushNav) pushNav(() => setActive(null)); setActive({ sessionId, session: effectiveSession(sessionId) }); };
  const openDetail = (entry) => { if (pushNav) pushNav(() => setDetail(null)); setDetail(entry); };
  const useAdapted = (adapted, eq) => {
    setOverrides((o) => ({ ...o, [adaptFor]: adapted }));
    setSport((s) => ({ ...s, equipment: { ...DEFAULT_EQUIPMENT, ...(s.equipment || {}), ...eq } }));
    setAdaptFor(null);
  };

  const finishSession = (sessionId, payload) => {
    const id = wid(sessionId);
    const entry = { id, date: new Date().toISOString(), completed: true, sessionId, week: currentWeek, programId: pid, ...payload };
    setWorkouts((prev) => ({ ...prev, [id]: entry }));
    // Charges par exercice (montée/descente selon les retours). Globales → partagées entre programmes.
    setSport((s) => ({ ...s, exerciseCharges: applyFeedback(entry, s, { ...workouts, [id]: entry }) }));
    setActive(null);
    if (showToast) showToast(`Séance ${sessionId} enregistrée 💪`);
  };
  const updateWorkout = (id, patch) => { setWorkouts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } })); if (showToast) showToast("Séance mise à jour ✓"); };
  const deleteWorkout = (id) => { if (onDeleteWorkout) onDeleteWorkout(id); else setWorkouts((prev) => { const n = { ...prev }; delete n[id]; return n; }); if (showToast) showToast("Séance supprimée"); };
  const saveManual = (entry) => setWorkouts((prev) => ({ ...prev, [entry.id]: entry }));

  // Amorce les charges de départ (lanes barre) d'un programme SI absentes — la force est
  // partagée, on ne touche jamais une charge déjà mémorisée.
  const seedCharges = (charges, prog) => {
    const out = { ...(charges || {}) }; const now = Date.now();
    for (const [exId, kg] of Object.entries(prog.startCharges || {})) if (out[exId]?.kg == null) out[exId] = { kg, updatedAt: now, week: 1 };
    return out;
  };
  const switchProgram = (newId) => {
    setSport((s) => ({ ...s, activeProgramId: newId, exerciseCharges: seedCharges(s.exerciseCharges, getProgram(newId)) }));
    setSettingsOpen(false);
    if (showToast) showToast(`Programme : ${getProgram(newId).name}`);
  };
  const resetProgram = (id) => {
    // Réinitialise la POSITION + supprime les séances loggées de CE programme.
    // Les charges (globales, partagées) sont conservées — ta force ne se remet pas à zéro.
    setSport((s) => { const st = { ...(s.programState || {}) }; delete st[id]; return { ...s, programState: st }; });
    const toDelete = Object.keys(workouts).filter((k) => k.startsWith(`${id}:`));
    toDelete.forEach((k) => { if (onDeleteWorkout) onDeleteWorkout(k); });
    setWorkouts((prev) => { const n = { ...prev }; toDelete.forEach((k) => delete n[k]); return n; });
    if (showToast) showToast("Progression réinitialisée");
  };
  const startProgram = (iso) => setSport((s) => ({
    ...s,
    programState: { ...(s.programState || {}), [pid]: { startDate: iso, currentWeek: 1, weekManuallySet: false } },
    exerciseCharges: seedCharges(s.exerciseCharges, program),
  }));

  if (!startDate) {
    return <Onboarding program={program} onStart={() => startProgram(new Date().toISOString())} />;
  }

  if (active) {
    const session = active.session;
    const props = {
      session, week: currentWeek, sound: sport.soundEnabled !== false, resume: active.resume,
      sportTheme: sport.sportTheme, exerciseCharges: sport.exerciseCharges || {},
      onCancel: () => setActive(null), onFinish: (d) => finishSession(active.sessionId, d),
    };
    return session.type === "cardio"
      ? <CardioWorkout {...props} />
      : <ForceWorkout {...props} workouts={workouts} />;
  }

  if (preview) {
    return (
      <>
        <SessionPreview session={effectiveSession(preview)} week={currentWeek} workouts={workouts} exerciseCharges={sport.exerciseCharges || {}} done={!!workouts[wid(preview)]} onBack={() => setPreview(null)} onStart={() => startSession(preview)} onAdapt={() => setAdaptFor(preview)} sportTheme={sport.sportTheme} />
        <AdaptSheet open={!!adaptFor} onClose={() => setAdaptFor(null)} session={adaptFor ? SESS[adaptFor] : null} equipment={{ ...DEFAULT_EQUIPMENT, ...(sport.equipment || {}) }} onUse={useAdapted} showToast={showToast} sportTheme={sport.sportTheme} />
      </>
    );
  }

  if (detail) {
    return <SessionDetail entry={detail} onBack={() => setDetail(null)} onSave={updateWorkout} onDelete={deleteWorkout} onRedo={(sid) => { setDetail(null); startSession(sid); }} sportTheme={sport.sportTheme} />;
  }

  return (
    <>
      <SportHome
        sport={sport} workouts={workouts} program={program}
        currentWeek={currentWeek} sessionDays={sessionDays} startDate={startDate}
        onOpen={openPreview} onOpenDetail={openDetail}
        onManualLog={() => setManualOpen(true)} onCoach={onCoach}
      />
      <ManualLogSheet open={manualOpen} onClose={() => setManualOpen(false)} currentWeek={currentWeek} workouts={workouts} program={program} exerciseCharges={sport.exerciseCharges || {}} onSave={saveManual} showToast={showToast} sportTheme={sport.sportTheme} />
      <SportSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} sport={sport} setSport={setSport} currentWeek={currentWeek} program={program} pid={pid} programs={PROGRAM_LIST} onSwitchProgram={switchProgram} onResetProgram={resetProgram} />
    </>
  );
}

function Onboarding({ program, onStart }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ backgroundColor: `${C.green}22`, color: C.green }}><Dumbbell size={28} /></div>
      <p className="text-xl font-extrabold" style={{ color: C.ink, fontFamily: FONT }}>{program?.name || "Programme 14 semaines"}</p>
      <p className="mt-2 mb-6 text-sm" style={{ color: C.sub }}>{program?.description || "Full-body + cardio, 3 séances/semaine. La charge progresse toute seule et s'adapte à tes retours."}</p>
      <button onClick={() => onStart(new Date().toISOString())} className="w-full rounded-2xl py-3.5 font-semibold text-white active:scale-95" style={{ backgroundColor: C.green }}>Démarrer aujourd'hui</button>
    </div>
  );
}

export default SportScreen;
