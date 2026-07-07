// engine/dates.js — helpers de dates purs (sans dépendance).
export function daysBetween(d1, d2) {
  const a = new Date(d1); a.setHours(0, 0, 0, 0);
  const b = new Date(d2); b.setHours(0, 0, 0, 0);
  return Math.round((b - a) / 86400000);
}

export function calcCurrentWeekFromStart(startDate, today = new Date()) {
  if (!startDate) return 1;
  const days = daysBetween(startDate, today);
  if (days < 0) return 1;
  return Math.min(14, Math.floor(days / 7) + 1);
}

export function nextOccurrence(targetDayIndex, fromDate = new Date()) {
  const today = new Date(fromDate); today.setHours(0, 0, 0, 0);
  const todayDay = today.getDay();
  let diff = targetDayIndex - todayDay;
  if (diff < 0) diff += 7;
  const next = new Date(today);
  next.setDate(today.getDate() + diff);
  return next;
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
