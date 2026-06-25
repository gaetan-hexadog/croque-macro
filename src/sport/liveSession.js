// ════════════════════════════════════════════════════════════════════════════
// liveSession — persistance de la séance EN COURS (localStorage), pour survivre
// à un passage en arrière-plan / rechargement de la PWA (Android comme iOS
// déchargent les apps en arrière-plan sous pression mémoire). On y stocke un
// instantané (exercice/série/journal/chrono) → reprise auto au relancement.
// ════════════════════════════════════════════════════════════════════════════
const KEY = "croque-macro:liveSession";

const STALE_MS = 12 * 60 * 60 * 1000; // au-delà de 12 h, on ne reprend plus

// Renvoie le snapshot s'il existe ET n'est pas périmé, sinon null.
export function loadLive() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!s) return null;
    if (s.savedAt && Date.now() - s.savedAt > STALE_MS) { clearLive(); return null; }
    return s;
  } catch (_) { return null; }
}
export function saveLive(snapshot) {
  try { localStorage.setItem(KEY, JSON.stringify({ ...snapshot, savedAt: Date.now() })); } catch (_) {}
}
export function clearLive() {
  try { localStorage.removeItem(KEY); } catch (_) {}
}
