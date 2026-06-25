import React, { useState } from "react";
import { Dumbbell } from "lucide-react";
import { C } from "../core.js";
import { SESSIONS, getCurrentBlock, calcCurrentWeekFromStart } from "../lib/sport.js";
import { SportHome } from "./SportHome.jsx";
import { SessionPreview } from "./SessionPreview.jsx";
import { ForceWorkout } from "./ForceWorkout.jsx";
import { CardioWorkout } from "./CardioWorkout.jsx";
import { SessionDetail } from "./SessionDetail.jsx";
import { ManualLogSheet } from "./ManualLogSheet.jsx";
import { SportSettings } from "./SportSettings.jsx";

const FONT = "'Space Grotesk', system-ui";
const DEFAULT_SESSION_DAYS = { A: 2, B: 4, C: 6 };

// ════════════════════════════════════════════════════════════════════════════
// SportScreen — orchestrateur de l'onglet Sport. Détient la navigation interne
// (accueil / preview / séance active / détail) + les sheets (manuel, réglages).
// La logique du programme vit dans ../sport.js ; la sync auto-pousse `workouts`.
// ════════════════════════════════════════════════════════════════════════════
export function SportScreen({ sport = {}, setSport, workouts = {}, setWorkouts, pushNav, showToast, onDeleteWorkout }) {
  const [active, setActive] = useState(null);     // { sessionId }
  const [preview, setPreview] = useState(null);   // sessionId
  const [detail, setDetail] = useState(null);     // entry
  const [manualOpen, setManualOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const startDate = sport.startDate || null;
  const currentWeek = sport.weekManuallySet ? (sport.currentWeek || 1) : calcCurrentWeekFromStart(startDate);
  const block = getCurrentBlock(currentWeek);
  const sessionDays = sport.preferences?.sessionDays || DEFAULT_SESSION_DAYS;

  const openPreview = (sessionId) => { if (pushNav) pushNav(() => setPreview(null)); setPreview(sessionId); };
  const startSession = (sessionId) => { setPreview(null); if (pushNav) pushNav(() => setActive(null)); setActive({ sessionId }); };
  const openDetail = (entry) => { if (pushNav) pushNav(() => setDetail(null)); setDetail(entry); };

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
    const session = SESSIONS[active.sessionId];
    const props = {
      session, week: currentWeek, sound: sport.soundEnabled !== false,
      onCancel: () => setActive(null), onFinish: (d) => finishSession(active.sessionId, d),
    };
    return session.type === "cardio"
      ? <CardioWorkout {...props} />
      : <ForceWorkout {...props} workouts={workouts} />;
  }

  if (preview) {
    return <SessionPreview session={SESSIONS[preview]} week={currentWeek} workouts={workouts} done={!!workouts[`W${currentWeek}-${preview}`]} onBack={() => setPreview(null)} onStart={() => startSession(preview)} />;
  }

  if (detail) {
    return <SessionDetail entry={detail} onBack={() => setDetail(null)} onSave={updateWorkout} onDelete={deleteWorkout} />;
  }

  return (
    <>
      <SportHome
        sport={sport} setSport={setSport} workouts={workouts}
        currentWeek={currentWeek} block={block} sessionDays={sessionDays}
        onOpen={openPreview} onOpenDetail={openDetail}
        onManualLog={() => setManualOpen(true)} onSettings={() => setSettingsOpen(true)}
      />
      <ManualLogSheet open={manualOpen} onClose={() => setManualOpen(false)} currentWeek={currentWeek} workouts={workouts} onSave={saveManual} showToast={showToast} />
      <SportSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} sport={sport} setSport={setSport} />
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
