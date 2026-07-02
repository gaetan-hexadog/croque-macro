import React, { useState, useEffect, useRef } from "react";
import { Dumbbell } from "lucide-react";
import { C } from "../core.js";
import { SESSIONS, getCurrentBlock, calcCurrentWeekFromStart, adaptSession, DEFAULT_EQUIPMENT } from "../lib/sport.js";
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
// La logique du programme vit dans ../sport.js ; la sync auto-pousse `workouts`.
// ════════════════════════════════════════════════════════════════════════════
export function SportScreen({ sport = {}, setSport, workouts = {}, setWorkouts, pushNav, showToast, onDeleteWorkout, setHeader }) {
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

  const startDate = sport.startDate || null;
  const currentWeek = sport.weekManuallySet ? (sport.currentWeek || 1) : calcCurrentWeekFromStart(startDate);
  const block = getCurrentBlock(currentWeek);
  const sessionDays = sport.preferences?.sessionDays || DEFAULT_SESSION_DAYS;

  // Séance effective : override ponctuel > mode vacances (adaptation auto) > programme.
  const effectiveSession = (sid) => {
    if (overrides[sid]) return overrides[sid];
    if (sport.vacationMode) return adaptSession(SESSIONS[sid], { ...DEFAULT_EQUIPMENT, ...(sport.equipment || {}) });
    return SESSIONS[sid];
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
      const s = SESSIONS[preview];
      setHeader({ title: s.name, subtitle: `${s.subtitle} · ${s.day} · ${s.duration}`, onBack: () => setPreview(null) });
    } else if (detail) {
      const s = SESSIONS[detail.sessionId];
      setHeader({ title: s ? s.name : detail.sessionId, subtitle: `${s ? s.subtitle + " · " : ""}S${detail.week}${detail.manual ? " · manuel" : ""}`, onBack: () => setDetail(null) });
    } else {
      setHeader({
        title: "Sport",
        subtitle: `Semaine ${currentWeek} · ${block?.phase || ""}`,
        badge: block ? { text: `${block.standard}/${block.heavy} kg`, tone: block.phase === "Décharge" ? "weight" : "green" } : null,
        onSettings: () => setSettingsOpen(true),
      });
    }
    return () => setHeader(null);
  }, [active, preview, detail, currentWeek, block, setHeader]);

  const openPreview = (sessionId) => { if (pushNav) pushNav(() => setPreview(null)); setPreview(sessionId); };
  const startSession = (sessionId) => { setPreview(null); if (pushNav) pushNav(() => setActive(null)); setActive({ sessionId, session: effectiveSession(sessionId) }); };
  const openDetail = (entry) => { if (pushNav) pushNav(() => setDetail(null)); setDetail(entry); };
  const useAdapted = (adapted, eq) => {
    setOverrides((o) => ({ ...o, [adaptFor]: adapted }));
    setSport((s) => ({ ...s, equipment: { ...DEFAULT_EQUIPMENT, ...(s.equipment || {}), ...eq } }));
    setAdaptFor(null);
  };

  const finishSession = (sessionId, payload) => {
    const id = `W${currentWeek}-${sessionId}`;
    const entry = { id, date: new Date().toISOString(), completed: true, sessionId, week: currentWeek, ...payload };
    setWorkouts((prev) => ({ ...prev, [id]: entry }));
    setActive(null);
    if (showToast) showToast(`Séance ${sessionId} enregistrée 💪`);
  };
  const updateWorkout = (id, patch) => { setWorkouts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } })); if (showToast) showToast("Séance mise à jour ✓"); };
  const deleteWorkout = (id) => { if (onDeleteWorkout) onDeleteWorkout(id); else setWorkouts((prev) => { const n = { ...prev }; delete n[id]; return n; }); if (showToast) showToast("Séance supprimée"); };
  const saveManual = (entry) => setWorkouts((prev) => ({ ...prev, [entry.id]: entry }));

  if (!startDate) {
    return <Onboarding onStart={(iso) => setSport((s) => ({ ...s, startDate: iso, currentWeek: 1, weekManuallySet: false }))} />;
  }

  if (active) {
    const session = active.session;
    const props = {
      session, week: currentWeek, sound: sport.soundEnabled !== false, resume: active.resume,
      sportTheme: sport.sportTheme,
      onCancel: () => setActive(null), onFinish: (d) => finishSession(active.sessionId, d),
    };
    return session.type === "cardio"
      ? <CardioWorkout {...props} />
      : <ForceWorkout {...props} workouts={workouts} />;
  }

  if (preview) {
    return (
      <>
        <SessionPreview session={effectiveSession(preview)} week={currentWeek} workouts={workouts} done={!!workouts[`W${currentWeek}-${preview}`]} onBack={() => setPreview(null)} onStart={() => startSession(preview)} onAdapt={() => setAdaptFor(preview)} />
        <AdaptSheet open={!!adaptFor} onClose={() => setAdaptFor(null)} session={adaptFor ? SESSIONS[adaptFor] : null} equipment={{ ...DEFAULT_EQUIPMENT, ...(sport.equipment || {}) }} onUse={useAdapted} showToast={showToast} />
      </>
    );
  }

  if (detail) {
    return <SessionDetail entry={detail} onBack={() => setDetail(null)} onSave={updateWorkout} onDelete={deleteWorkout} />;
  }

  return (
    <>
      <SportHome
        sport={sport} workouts={workouts}
        currentWeek={currentWeek} sessionDays={sessionDays} startDate={startDate}
        onOpen={openPreview} onOpenDetail={openDetail}
        onManualLog={() => setManualOpen(true)}
      />
      <ManualLogSheet open={manualOpen} onClose={() => setManualOpen(false)} currentWeek={currentWeek} workouts={workouts} onSave={saveManual} showToast={showToast} />
      <SportSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} sport={sport} setSport={setSport} currentWeek={currentWeek} />
    </>
  );
}

function Onboarding({ onStart }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ backgroundColor: `${C.green}22`, color: C.green }}><Dumbbell size={28} /></div>
      <p className="text-xl font-extrabold" style={{ color: C.ink, fontFamily: FONT }}>Programme 14 semaines</p>
      <p className="mt-2 mb-6 text-sm" style={{ color: C.sub }}>Full-body + cardio, 3 séances/semaine. La charge progresse toute seule et s'adapte à tes retours.</p>
      <button onClick={() => onStart(new Date().toISOString())} className="w-full rounded-2xl py-3.5 font-semibold text-white active:scale-95" style={{ backgroundColor: C.green }}>Démarrer aujourd'hui</button>
    </div>
  );
}

export default SportScreen;
