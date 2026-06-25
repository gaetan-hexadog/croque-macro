import React, { useState, useEffect, useRef } from "react";
import { Apple, Plus, Shuffle, Check, Search, Beef, Flame, ChevronRight, Trash2, Dumbbell, ChevronLeft, Scale, Layers, Copy, X, Pencil, TrendingDown, TrendingUp, Lightbulb, Sparkles, Wand2, BookOpen, Camera, ScanLine, Soup, ListPlus } from "lucide-react";
import {
  SLOTS, C, SLOT_UI, TODAY, addDays, parseISO, fmtFull, r0, dayTotals, plannedTotals, fmtQty, cardStyle, weekStats, weekCoach, streakCount,
} from "./core.js";
import { Sheet } from "./Sheet.jsx";
import { SectionTitle } from "./ui.jsx";

// Raccourcis 1-tap : aliments fréquents/récents du créneau → ajout direct.
function QuickChips({ items = [], onQuick, color }) {
  if (!items.length || !onQuick) return null;
  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      {items.map((it) => (
        <button key={it.name} onClick={() => onQuick(it)} className="flex items-center gap-1 rounded-full py-1.5 pl-2 pr-2.5 text-xs font-semibold active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }}>
          <Plus size={12} style={{ color }} /> <span className="max-w-36 truncate">{it.name}</span> <span style={{ color: C.muted }}>{it.kcal}</span>
        </button>
      ))}
    </div>
  );
}

const deburr = (str) => (str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/œ/g, "oe").replace(/æ/g, "ae");


export function DayScreen({ activeDate, setActiveDate, settings, totals, planned = { kcal: 0, p: 0 }, remKcal, remP, days, weights, onOpenWeek, onSaveCombo, picks, skipBreakfast, slotTarget, training, onToggleTraining, weight, onWeight, onPick, onIdea, onConfirm, quickPicks = {}, onQuick, habituals = [], onHabitual, onSuggestNow, onClear, onQty, onEditItem, onSkip, onReset, templates, hasPrevDay, onCopyPrev, onSaveTemplate, onLoadTemplate, onDeleteTemplate, targetSuggestion, onApplyTarget, onDismissTarget, sportInfo, recomp, onGoSport, onScan, onOpenCuisine, onPhotoLog, onPlan }) {
  const [showTpl, setShowTpl] = useState(false);
  const [viewRecipe, setViewRecipe] = useState(null);
  // Bottom-sheets « + » (Logger) et « Assistant » — false = fermé, null = global, "<slot>" = ciblé.
  const [addSlot, setAddSlot] = useState(false);
  const [assistSlot, setAssistSlot] = useState(false);
  const openAdd = (slot = null) => setAddSlot(slot);
  const openAssist = (slot = null) => setAssistSlot(slot);
  const over = remKcal < 0;
  const isToday = activeDate === TODAY;
  const canFwd = activeDate < addDays(TODAY, 14); // on peut avancer jusqu'à +14 j (voir les repas planifiés)
  // Bande de semaine (lundi → dimanche) avec pastille de statut par jour
  const weekStart = addDays(activeDate, -((parseISO(activeDate).getDay() + 6) % 7));
  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const dayStatus = (iso) => {
    const real = dayTotals(days[iso]), plan = plannedTotals(days[iso]);
    if (!real.kcal && !plan.kcal) return null;            // rien
    if (!real.kcal && plan.kcal) return C.weight;         // seulement prévu
    const ratio = real.kcal / (settings.kcal || 1);
    if (ratio > 1.05) return C.over;                      // dépassé
    if (ratio >= 0.85) return C.green;                    // dans la cible
    return C.protein;                                     // sous la cible
  };
  const wdLetter = (iso) => parseISO(iso).toLocaleDateString("fr-FR", { weekday: "narrow" }).toUpperCase();
  // Résumé hebdo compact, intégré à la carte jauge (visible sans scroller).
  const streak = streakCount(days, TODAY);
  const wstats = weekStats(days, settings, activeDate, 7);
  const wcoach = weekCoach(wstats, settings, weights, activeDate);
  const wBal = Math.round(wcoach.balance);
  const wBalColor = wBal >= 0 ? C.green : C.protein;
  const WTrend = wcoach.weightTrend === "down" ? TrendingDown : wcoach.weightTrend === "up" ? TrendingUp : null;
  const seg = (m, color) => ({ ...m, kcal: m.kcal * (m.qty || 1), p: m.p * (m.qty || 1), color });
  const ribbon = [
    ...picks.pdj.map((m) => seg(m, SLOT_UI.pdj.color)),
    ...picks.dej.map((m) => seg(m, SLOT_UI.dej.color)),
    ...picks.diner.map((m) => seg(m, SLOT_UI.diner.color)),
    ...picks.snacks.map((s) => s && seg(s, SLOT_UI.snack.color)),
    ...(picks.extras || []).map((e) => seg(e, C.extra)),
  ].filter(Boolean);

  const touchRef = useRef(null);
  const onTouchStart = (e) => { const t = e.touches[0]; touchRef.current = { x: t.clientX, y: t.clientY }; };
  const onTouchEnd = (e) => {
    const s0 = touchRef.current; touchRef.current = null;
    if (!s0) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s0.x, dy = t.clientY - s0.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.8) {
      if (dx < 0) { if (activeDate !== TODAY) setActiveDate(addDays(activeDate, 1)); } // swipe gauche → jour suivant
      else { setActiveDate(addDays(activeDate, -1)); }                                  // swipe droite → jour précédent
    }
  };

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{ touchAction: "pan-y" }}>
      {/* Ajustement de la cible selon le poids réel (proposé, jamais imposé) */}
      {targetSuggestion && (
        <div className="mb-4 rounded-2xl p-4" style={{ backgroundColor: `${C.weight}14`, border: `1px solid ${C.weight}55` }}>
          <div className="mb-2 flex items-start gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: C.weight, color: "#fff" }}><Scale size={16} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold" style={{ color: C.ink }}>{targetSuggestion.headline}</p>
              <p className="mt-0.5 text-xs" style={{ color: C.sub }}>
                Sur ~3 semaines : maintenance réelle estimée ~<span className="font-semibold" style={{ color: C.ink }}>{targetSuggestion.maintenance} kcal</span>, {targetSuggestion.ratePerWeek <= 0 ? `perte ${String(Math.abs(targetSuggestion.ratePerWeek)).replace(".", ",")}` : `prise ${String(targetSuggestion.ratePerWeek).replace(".", ",")}`} kg/sem.
                {" "}Nouvelle cible : <span className="font-semibold" style={{ color: C.ink }}>{targetSuggestion.kcal} kcal · {targetSuggestion.protein} g</span>.
              </p>
            </div>
            <button onClick={onDismissTarget} className="shrink-0 rounded-full p-1 active:scale-90" style={{ color: C.muted }} aria-label="Plus tard"><X size={16} /></button>
          </div>
          <div className="flex gap-2">
            <button onClick={onApplyTarget} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold text-white active:scale-95" style={{ backgroundColor: C.weight }}><Check size={15} /> Ajuster ma cible</button>
            <button onClick={onDismissTarget} className="rounded-xl px-4 py-2.5 text-sm font-semibold active:scale-95" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.sub }}>Plus tard</button>
          </div>
        </div>
      )}

      {/* Bande de semaine : navigation + statut de chaque jour — intégrée (hors card) */}
      <div className="mb-4 pb-3" style={{ borderBottom: `1px solid ${C.line}` }}>
        <div className="mb-1 flex items-center justify-between px-1">
          <button onClick={() => setActiveDate(addDays(activeDate, -7))} className="flex h-7 w-7 items-center justify-center rounded-lg active:scale-90" style={{ color: C.sub }} aria-label="Semaine précédente"><ChevronLeft size={18} /></button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold capitalize" style={{ color: C.ink }}>{fmtFull(activeDate)}</span>
            {activeDate > TODAY && <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: `${C.weight}1a`, color: C.weight }}>à venir</span>}
            {!isToday && <button onClick={() => setActiveDate(TODAY)} className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: `${C.green}1a`, color: C.green }}>Auj.</button>}
            {streak >= 2 && <span className="flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ backgroundColor: `${C.over}1a`, color: C.over }} title={`${streak} jours d'affilée`}>🔥 {streak}</span>}
          </div>
          <button onClick={() => canFwd && setActiveDate(addDays(activeDate, 7))} disabled={!canFwd} className="flex h-7 w-7 items-center justify-center rounded-lg active:scale-90" style={{ color: canFwd ? C.sub : C.line }} aria-label="Semaine suivante"><ChevronRight size={18} /></button>
        </div>
        <div className="flex gap-1">
          {week.map((iso) => {
            const on = iso === activeDate, today = iso === TODAY, st = dayStatus(iso);
            return (
              <button key={iso} onClick={() => setActiveDate(iso)} className="flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 active:scale-95" style={on ? { backgroundColor: C.ink } : {}}>
                <span className="text-[10px] font-bold" style={{ color: on ? C.bg : C.muted }}>{wdLetter(iso)}</span>
                <span className="text-sm font-bold" style={{ color: on ? C.bg : today ? C.green : C.ink }}>{parseISO(iso).getDate()}</span>
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: st || "transparent", border: st ? "none" : `1px solid ${on ? "rgba(255,255,255,0.3)" : C.line}` }} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Séance du jour (programme sport) — lien vers l'onglet Sport */}
      {sportInfo && (
        <button onClick={onGoSport} className="mb-4 flex w-full items-center gap-3 rounded-2xl p-3.5 text-left active:scale-[0.99]" style={cardStyle(sportInfo.done ? undefined : { border: `1px solid ${C.green}`, borderTop: `1px solid ${C.green}` })}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: sportInfo.done ? `${C.green}22` : C.paper, color: sportInfo.done ? C.green : C.sub }}>{sportInfo.done ? <Check size={18} /> : <Dumbbell size={18} />}</span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold" style={{ color: C.ink }}>Séance du jour · {sportInfo.name}</span>
            <span className="block text-xs" style={{ color: C.sub }}>{sportInfo.subtitle} · S{sportInfo.week}{sportInfo.done ? " · faite ✓" : " — c'est aujourd'hui"}</span>
          </span>
          <ChevronRight size={18} style={{ color: C.muted }} />
        </button>
      )}

      {/* Coaching recomposition : force ↔ poids */}
      {recomp && (
        <div className="mb-4 flex gap-3 rounded-2xl p-4" style={{ backgroundColor: `${recomp.level === "warning" ? C.over : recomp.level === "good" ? C.green : C.weight}14`, border: `1px solid ${recomp.level === "warning" ? C.over : recomp.level === "good" ? C.green : C.weight}44` }}>
          <Dumbbell size={18} style={{ color: recomp.level === "warning" ? C.over : recomp.level === "good" ? C.green : C.weight, flexShrink: 0, marginTop: 2 }} />
          <div>
            <p className="text-sm font-bold" style={{ color: C.ink }}>{recomp.title}</p>
            <p className="mt-0.5 text-xs" style={{ color: C.sub }}>{recomp.message}</p>
          </div>
        </div>
      )}

      {/* Dashboard compact : petit anneau + jauges linéaires + log rapide intégré */}
      <section className="mb-4 rounded-3xl p-4" style={cardStyle()}>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: C.muted }}>{over ? "Dépassé" : "Restant aujourd'hui"}</span>
          <button onClick={onToggleTraining} aria-pressed={training} className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold active:scale-95" style={training ? { backgroundColor: `${C.weight}26`, color: C.weight } : { backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.muted }}><Dumbbell size={12} /> Training</button>
        </div>
        <div className="flex items-center gap-4">
          <MiniRing over={over}
            kcalPct={totals.kcal / settings.kcal} protPct={totals.p / settings.protein}
            kcalPlanPct={(totals.kcal + planned.kcal) / settings.kcal} protPlanPct={(totals.p + planned.p) / settings.protein}>
            <span className="leading-none text-3xl font-bold" style={{ color: over ? C.over : C.ink, fontFamily: "'Space Grotesk', system-ui", fontVariantNumeric: "tabular-nums" }}>{r0(Math.abs(remKcal))}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: C.muted }}>{over ? "au-dessus" : "restant"}</span>
          </MiniRing>
          <div className="min-w-0 flex-1 space-y-2.5">
            <div>
              <div className="mb-1 flex items-center justify-between text-xs font-bold tabular-nums">
                <span className="flex items-center gap-1" style={{ color: C.protein }}><Flame size={12} /> kcal</span>
                <span style={{ color: C.sub }}>{r0(totals.kcal)} / {settings.kcal}</span>
              </div>
              <Meter value={totals.kcal} planned={planned.kcal} target={settings.kcal} color={over ? C.over : C.protein} />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-xs font-bold tabular-nums">
                <span className="flex items-center gap-1" style={{ color: C.green }}><Beef size={12} /> prot.</span>
                <span style={{ color: C.sub }}>{r0(totals.p)} / {settings.protein} g</span>
              </div>
              <Meter value={totals.p} planned={planned.p} target={settings.protein} color={C.green} />
            </div>
            <p className="text-[11px]" style={{ color: C.muted }}>
              reste <b style={{ color: C.ink }}>{r0(Math.max(0, remKcal))} kcal · {r0(Math.max(0, remP))} g</b>
              {planned.kcal > 0 && <> · projeté {r0(totals.kcal + planned.kcal)}</>}
              {training && remP > 0 && <> · priorité protéines</>}
            </p>
          </div>
        </div>

        {/* Log rapide intégré au dashboard : habituels en 1 tap + entrée « Logger » */}
        {isToday && (
          <div className="mt-4 border-t pt-3" style={{ borderColor: C.line }}>
            <span className="mb-2 block px-0.5 text-[11px] font-bold uppercase tracking-widest" style={{ color: C.muted }}>Log rapide</span>
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {habituals.map((it) => (
                <button key={it.name} onClick={() => onHabitual(it)} className="flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-left active:scale-95" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}` }}>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${SLOT_UI[it.slot].color}1f`, color: SLOT_UI[it.slot].color }}><Plus size={15} /></span>
                  <span className="min-w-0">
                    <span className="block max-w-34 truncate text-xs font-bold" style={{ color: C.ink }}>{it.name}</span>
                    <span className="block text-[11px]" style={{ color: C.muted, fontVariantNumeric: "tabular-nums" }}>{it.kcal} kcal · {it.p} g</span>
                  </span>
                </button>
              ))}
              <button onClick={() => openAdd(null)} className="flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 active:scale-95" style={{ background: `linear-gradient(150deg, ${C.protein}, ${C.accent})`, color: "#fff" }}>
                <Plus size={16} /> <span className="text-xs font-bold">Logger</span>
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Les repas — une carte distincte par repas */}
      <SectionTitle className="mt-1" right={
        <button onClick={() => openAssist(null)} className="flex items-center gap-1 text-xs font-semibold active:scale-95" style={{ color: C.accent }}><Wand2 size={13} /> Assistant</button>
      }>Les repas</SectionTitle>

      {/* Démarrage rapide sur jour vide : reprendre une journée type en 1 tap */}
      {ribbon.length === 0 && (hasPrevDay || templates.length > 0) && (
        <div className="mb-3 rounded-2xl p-3" style={cardStyle()}>
          <p className="mb-2 px-0.5 text-xs font-semibold uppercase tracking-wide" style={{ color: C.muted }}>Démarrage rapide</p>
          <div className="flex flex-wrap gap-2">
            {hasPrevDay && (
              <button onClick={onCopyPrev} className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold active:scale-95" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink }}><Copy size={13} /> Copier hier</button>
            )}
            {templates.slice(0, 4).map((t) => (
              <button key={t.id} onClick={() => onLoadTemplate(t.id)} className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold active:scale-95" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink }}><Layers size={13} style={{ color: C.sub }} /> {t.name}</button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <DayRow slotKey="pdj" meals={picks.pdj} skipped={skipBreakfast} target={slotTarget("pdj")} onAdd={() => openAdd("pdj")} onIdea={() => openAssist("pdj")} onConfirm={onConfirm ? (i) => onConfirm("pdj", i) : undefined} onReplace={(i) => onPick("pdj", i)} onClear={(i) => onClear("pdj", i)} onQty={(i, d) => onQty("pdj", i, d)} onEdit={(i, patch) => onEditItem("pdj", i, patch)} onSkip={onSkip} onSaveCombo={onSaveCombo} onViewRecipe={setViewRecipe} />
        <DayRow slotKey="dej" meals={picks.dej} target={slotTarget("dej")} onAdd={() => openAdd("dej")} onIdea={() => openAssist("dej")} onConfirm={onConfirm ? (i) => onConfirm("dej", i) : undefined} onReplace={(i) => onPick("dej", i)} onClear={(i) => onClear("dej", i)} onQty={(i, d) => onQty("dej", i, d)} onEdit={(i, patch) => onEditItem("dej", i, patch)} onSaveCombo={onSaveCombo} onViewRecipe={setViewRecipe} />
        <DayRow slotKey="diner" meals={picks.diner} target={slotTarget("diner")} onAdd={() => openAdd("diner")} onIdea={() => openAssist("diner")} onConfirm={onConfirm ? (i) => onConfirm("diner", i) : undefined} onReplace={(i) => onPick("diner", i)} onClear={(i) => onClear("diner", i)} onQty={(i, d) => onQty("diner", i, d)} onEdit={(i, patch) => onEditItem("diner", i, patch)} onSaveCombo={onSaveCombo} onViewRecipe={setViewRecipe} />
        <SideSection snacks={picks.snacks} extras={picks.extras || []} onAdd={() => openAdd("snack")} onIdea={() => openAssist("snack")} onConfirm={onConfirm} onClear={onClear} onQty={onQty} onEdit={onEditItem} onViewRecipe={setViewRecipe} />
      </div>

      {/* Modèles & copie de journée — accès discret */}
      <div className="mt-3 flex items-center justify-center gap-4">
        <button onClick={() => setShowTpl(true)} className="flex items-center gap-1 text-xs font-semibold active:scale-95" style={{ color: C.sub }}><Layers size={13} /> Modèles & copie</button>
        {ribbon.length > 0 && <button onClick={onReset} className="text-xs font-semibold active:scale-95" style={{ color: C.muted }}>Vider la journée</button>}
      </div>

      {/* Poids du jour */}
      <div className="mt-4">
        <WeightCard date={activeDate} weight={weight} onWeight={onWeight} />
      </div>

      <p className="mt-6 px-2 text-center text-xs" style={{ color: C.muted }}>Valeurs estimées par portion. Un déficit léger et tenable bat un régime agressif.</p>

      {viewRecipe && <RecipeViewSheet m={viewRecipe} onClose={() => setViewRecipe(null)} />}

      {addSlot !== false && (
        <AddSheet slot={addSlot} habituals={habituals} onClose={() => setAddSlot(false)}
          onQuickAdd={(slot, it) => onQuick && onQuick(slot, it)}
          onPick={(slot) => onPick(slot)} onPhotoLog={onPhotoLog} onScan={onScan}
          onAssist={(slot) => openAssist(slot)} onOpenCuisine={onOpenCuisine} />
      )}
      {assistSlot !== false && (
        <AssistantSheet slot={assistSlot} remKcal={r0(Math.max(0, remKcal))} remP={r0(Math.max(0, remP))} onClose={() => setAssistSlot(false)}
          onIdea={(slot) => onIdea && onIdea(slot)} onSuggestNow={onSuggestNow} onPlan={onPlan} onOpenCuisine={onOpenCuisine} />
      )}

      {showTpl && (
        <TemplatesSheet
          templates={templates} hasContent={ribbon.length > 0} hasPrevDay={hasPrevDay}
          onCopyPrev={() => { onCopyPrev(); setShowTpl(false); }}
          onSave={(name) => onSaveTemplate(name)}
          onLoad={(id) => { onLoadTemplate(id); setShowTpl(false); }}
          onDelete={onDeleteTemplate}
          onClose={() => setShowTpl(false)}
        />
      )}
    </div>
  );
}


function DayRow({ slotKey, meals = [], skipped, target, onAdd, onIdea, onConfirm, onReplace, onClear, onQty, onEdit, onSkip, onSaveCombo, onViewRecipe }) {
  const ui = SLOT_UI[slotKey];
  const [naming, setNaming] = useState(false);
  const [comboName, setComboName] = useState("");
  const sub = meals.reduce((a, m) => ({ kcal: a.kcal + m.kcal * (m.qty || 1), p: a.p + m.p * (m.qty || 1) }), { kcal: 0, p: 0 });
  const has = meals.length > 0;
  const planned = meals.some((m) => m.planned);
  return (
    <div className="rounded-2xl px-3.5 py-3" style={cardStyle(planned ? { borderStyle: "dashed" } : undefined)}>
      {/* En-tête compact : label · nb items · total · sauter · assistant · + */}
      <div className="flex items-center gap-2.5">
        <span className="h-8 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: has || skipped ? ui.color : C.line }} />
        <div className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: ui.color }}>{SLOTS[slotKey].label}</span>
            {planned && <span className="rounded px-1.5 py-0.5 text-[9px] font-bold" style={{ backgroundColor: `${C.accent}26`, color: C.accent }}>PRÉVU</span>}
            {has && <span className="text-[11px]" style={{ color: C.muted }}>· {meals.length} item{meals.length > 1 ? "s" : ""}</span>}
          </span>
        </div>
        {has && <span className="shrink-0 text-xs font-bold tabular-nums" style={{ color: planned ? C.muted : C.sub }}>{sub.kcal} · {sub.p} g</span>}
        {onSkip && <button onClick={onSkip} className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold active:scale-95" style={skipped ? { backgroundColor: C.ink, color: C.bg } : { backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.muted }}>{skipped ? "Sauté" : "Sauter"}</button>}
        {!skipped && onIdea && <button onClick={onIdea} aria-label="Assistant pour ce repas" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: `${C.accent}1a`, color: C.accent }}><Wand2 size={14} /></button>}
        {!skipped && <button onClick={onAdd} aria-label="Ajouter / piocher" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: ui.color }}><Plus size={15} /></button>}
      </div>

      {skipped ? (
        <p className="mt-2 pl-4 text-sm" style={{ color: C.muted }}>Sauté · protéines reportées sur les autres repas.</p>
      ) : !has ? (
        <button onClick={onAdd} className="mt-2 ml-4 flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold active:scale-95" style={{ backgroundColor: `${ui.color}1a`, color: ui.color }}><Plus size={13} /> Ajouter un repas</button>
      ) : (
        <>
          <ul className="mt-1.5">
            {meals.map((m, i) => (
              <MealItemRow key={i} m={m} accent={ui.color} first={i === 0} onQty={(nv) => onQty(i, nv)} onReplace={() => onReplace(i)} onRemove={() => onClear(i)} onEdit={onEdit ? (patch) => onEdit(i, patch) : undefined} onConfirm={onConfirm ? () => onConfirm(i) : undefined} onViewRecipe={onViewRecipe} />
            ))}
          </ul>
          {onSaveCombo && (naming ? (
            <div className="mt-2 flex items-center gap-2">
              <input value={comboName} onChange={(e) => setComboName(e.target.value)} placeholder="Nom du repas" autoFocus className="min-w-0 flex-1 rounded-xl px-3 py-2 text-sm outline-none" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink }} onKeyDown={(e) => { if (e.key === "Enter" && comboName.trim()) { onSaveCombo(slotKey, meals, comboName.trim()); setComboName(""); setNaming(false); } }} />
              <button onClick={() => { if (comboName.trim()) { onSaveCombo(slotKey, meals, comboName.trim()); setComboName(""); setNaming(false); } }} className="shrink-0 rounded-xl px-3 py-2 text-sm font-semibold text-white active:scale-95" style={{ backgroundColor: ui.color }}>OK</button>
              <button onClick={() => { setNaming(false); setComboName(""); }} className="shrink-0 rounded-xl px-2 py-2 text-sm active:scale-95" style={{ color: C.muted }}>Annuler</button>
            </div>
          ) : (
            <button onClick={() => setNaming(true)} className="mt-1.5 ml-4 text-xs font-semibold active:scale-95" style={{ color: C.muted }}>+ Enregistrer comme repas réutilisable</button>
          ))}
        </>
      )}
    </div>
  );
}


// « À-côtés » : fusion En-cas + Plaisirs en une section. Les items « plaisir »
// (ex-extras) portent un tag. Routage par slot ("snack" | "extras").
function SideSection({ snacks = [], extras = [], onAdd, onIdea, onQty, onClear, onEdit, onConfirm, onViewRecipe }) {
  const color = SLOT_UI.snack.color;
  const items = [
    ...snacks.map((m, i) => ({ m, slot: "snack", i, plaisir: false })),
    ...extras.map((m, i) => ({ m, slot: "extras", i, plaisir: true })),
  ];
  const has = items.length > 0;
  const sub = items.reduce((a, { m }) => ({ kcal: a.kcal + m.kcal * (m.qty || 1), p: a.p + m.p * (m.qty || 1) }), { kcal: 0, p: 0 });
  return (
    <div className="rounded-2xl px-3.5 py-3" style={cardStyle()}>
      <div className="flex items-center gap-2.5">
        <span className="h-8 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: has ? color : C.line }} />
        <div className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color }}>À-côtés</span>
            {has && <span className="text-[11px]" style={{ color: C.muted }}>· {items.length} item{items.length > 1 ? "s" : ""}</span>}
          </span>
        </div>
        {has && <span className="shrink-0 text-xs font-bold tabular-nums" style={{ color: C.sub }}>{sub.kcal} · {sub.p} g</span>}
        {onIdea && <button onClick={onIdea} aria-label="Assistant" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: `${C.accent}1a`, color: C.accent }}><Wand2 size={14} /></button>}
        <button onClick={onAdd} aria-label="Ajouter" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color }}><Plus size={15} /></button>
      </div>
      {!has ? (
        <p className="mt-2 pl-4 text-sm" style={{ color: C.muted }}>Un en-cas protéiné si un repas est juste, ou un petit plaisir — le budget s'ajuste.</p>
      ) : (
        <ul className="mt-1.5">
          {items.map(({ m, slot, i, plaisir }, idx) => (
            <MealItemRow key={`${slot}-${i}`} m={m} accent={plaisir ? C.extra : color} plaisir={plaisir} first={idx === 0}
              onQty={onQty ? (nv) => onQty(slot, i, nv) : undefined}
              onRemove={() => onClear(slot, i)}
              onEdit={onEdit ? (patch) => onEdit(slot, i, patch) : undefined}
              onConfirm={onConfirm ? () => onConfirm(slot, i) : undefined}
              onViewRecipe={onViewRecipe} />
          ))}
        </ul>
      )}
    </div>
  );
}

function MealItemRow({ m, accent, onQty, onReplace, onRemove, onEdit, onConfirm, onViewRecipe, plaisir, first }) {
  const q = m.qty || 1;
  const hasRecipe = !!(m.ingredients?.length || m.steps?.length);
  const planned = !!m.planned;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(m.name);
  const [kcal, setKcal] = useState(String(m.kcal));
  const [p, setP] = useState(String(m.p));
  useEffect(() => { setName(m.name); setKcal(String(m.kcal)); setP(String(m.p)); }, [m.name, m.kcal, m.p]);
  const save = () => {
    const k = parseFloat(String(kcal).replace(",", ".")), pp = parseFloat(String(p).replace(",", "."));
    onEdit({ name: name.trim() || m.name, kcal: isFinite(k) && k >= 0 ? k : m.kcal, p: isFinite(pp) && pp >= 0 ? pp : m.p });
    setEditing(false);
  };
  const cancel = () => { setName(m.name); setKcal(String(m.kcal)); setP(String(m.p)); setEditing(false); };
  const fld = { backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink };
  const topBorder = first ? "none" : `1px solid ${C.line}`;

  if (editing) {
    return (
      <li className="py-2.5" style={{ borderTop: topBorder }}>
        <input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Nom" className="mb-2 w-full rounded-xl px-3 py-2 text-sm outline-none" style={fld} />
        <div className="mb-2 flex gap-2">
          <input value={kcal} onChange={(e) => setKcal(e.target.value)} inputMode="decimal" placeholder="kcal" className="w-full min-w-0 rounded-xl px-3 py-2 text-sm outline-none" style={fld} />
          <input value={p} onChange={(e) => setP(e.target.value)} inputMode="decimal" placeholder="prot. (g)" className="w-full min-w-0 rounded-xl px-3 py-2 text-sm outline-none" style={fld} />
        </div>
        <div className="flex gap-2">
          <button onClick={save} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold text-white active:scale-95" style={{ backgroundColor: accent }}><Check size={15} /> Enregistrer</button>
          <button onClick={cancel} className="rounded-xl px-3 py-2 active:scale-90" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.muted }} aria-label="Annuler"><X size={16} /></button>
        </div>
      </li>
    );
  }

  return (
    <li style={{ borderTop: topBorder }}>
      <div className="flex items-center gap-2.5 py-2.5">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: plaisir ? C.extra : accent, opacity: planned ? 0.5 : 1 }} />
        <button onClick={() => setOpen((o) => !o)} className="flex min-w-0 flex-1 items-center gap-1.5 text-left active:opacity-70">
          {plaisir && <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold" style={{ backgroundColor: `${C.extra}26`, color: C.extra }}>PLAISIR</span>}
          <span className="truncate text-sm font-semibold" style={{ color: C.ink }}>{m.name}{q !== 1 && <span style={{ color: accent }}> ×{fmtQty(q)}</span>}</span>
          {hasRecipe && <span role="button" onClick={(e) => { e.stopPropagation(); onViewRecipe && onViewRecipe(m); }} className="flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[9px] font-bold active:scale-95" style={{ backgroundColor: `${C.weight}22`, color: C.weight }}><BookOpen size={9} /> RECETTE</span>}
        </button>
        <span className="shrink-0 text-[11px] tabular-nums" style={{ color: C.muted }}>{r0(m.kcal * q)} · {r0(m.p * q)} g</span>
        <button onClick={() => setOpen((o) => !o)} className="flex h-6 w-6 shrink-0 items-center justify-center rounded active:scale-90" style={{ color: C.muted }} aria-label="Actions"><ChevronRight size={15} style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform .2s" }} /></button>
      </div>

      {open && (
        <div className="flex items-center justify-between gap-2 pb-2.5 pl-4">
          <QtyStepper value={q} onChange={onQty} accent={accent} />
          <div className="flex gap-1.5">
            {onEdit && <button onClick={() => setEditing(true)} className="rounded-lg p-2 active:scale-90" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }} aria-label="Modifier"><Pencil size={14} /></button>}
            {onReplace && <button onClick={onReplace} className="rounded-lg p-2 active:scale-90" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }} aria-label="Remplacer"><Shuffle size={14} /></button>}
            <button onClick={onRemove} className="rounded-lg p-2 active:scale-90" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.muted }} aria-label="Supprimer"><Trash2 size={14} /></button>
          </div>
        </div>
      )}

      {planned && onConfirm && (
        <button onClick={onConfirm} className="mb-2 ml-4 flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold active:scale-95" style={{ backgroundColor: `${C.green}1f`, color: C.green }}>
          <Check size={13} /> J'ai bien mangé ça
        </button>
      )}
    </li>
  );
}


function QtyStepper({ value, onChange, accent = C.ink }) {
  const v = value || 1;
  const [txt, setTxt] = useState(null);
  const shown = txt != null ? txt : fmtQty(v);
  const commit = () => { const n = parseFloat((txt || "").replace(",", ".")); onChange(isFinite(n) && n > 0 ? n : v); setTxt(null); };
  // Pas fin (¼) jusqu'à 2, puis ½ jusqu'à 5, puis 1. On snappe sur la grille du pas
  // pour toujours retomber sur des valeurs propres (1,75 +¼ → 2, et non 2,25).
  const step = (val) => (val < 1.99 ? 0.25 : val < 4.99 ? 0.5 : 1);
  const inc = () => { const s = step(v); onChange(Math.round((Math.round(v / s) * s + s) * 100) / 100); };
  const dec = () => { const s = step(v); onChange(Math.max(0.1, Math.round((Math.round(v / s) * s - s) * 100) / 100)); };
  return (
    <div className="flex items-center gap-1 rounded-lg px-1 py-0.5" style={{ border: `1px solid ${C.line}` }}>
      <button onClick={dec} className="flex h-6 w-6 items-center justify-center rounded text-base font-bold active:scale-90" style={{ color: v > 0.1 ? C.ink : C.line }}>−</button>
      <input
        value={shown}
        inputMode="decimal"
        onFocus={() => setTxt(fmtQty(v))}
        onChange={(e) => setTxt(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
        className="bg-transparent text-center text-xs font-bold outline-none"
        style={{ color: C.ink, width: "2.2rem", fontVariantNumeric: "tabular-nums" }}
      />
      <button onClick={inc} className="flex h-6 w-6 items-center justify-center rounded text-base font-bold active:scale-90" style={{ color: accent }}>+</button>
    </div>
  );
}


// Petit anneau double (kcal + protéines) + arc « prévu » pâle — pour le dashboard compact.
function MiniRing({ kcalPct, protPct, kcalPlanPct = 0, protPlanPct = 0, over, size = 108, children }) {
  const sw = 11, gap = 4, r1 = size / 2 - sw / 2, r2 = r1 - sw - gap;
  const c1 = 2 * Math.PI * r1, c2 = 2 * Math.PI * r2, cl = (v) => Math.max(0, Math.min(1, v));
  const kc = over ? C.over : C.green, pc = C.protein;
  const arc = (r, c, pct, color, op = 1) => <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw} strokeDasharray={`${c * cl(pct)} ${c}`} strokeLinecap="round" opacity={op} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dasharray .6s ease" }} />;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ display: "block" }}>
        <circle cx={size / 2} cy={size / 2} r={r1} fill="none" stroke={C.track} strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r2} fill="none" stroke={C.track} strokeWidth={sw} />
        {kcalPlanPct > 0 && arc(r1, c1, kcalPlanPct, kc, 0.28)}
        {protPlanPct > 0 && arc(r2, c2, protPlanPct, pc, 0.28)}
        {arc(r1, c1, kcalPct, kc)}
        {arc(r2, c2, protPct, pc)}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}
// Jauge linéaire avec segment « prévu » plus pâle.
function Meter({ value, planned = 0, target, color, height = 7 }) {
  const cl = (v) => Math.max(0, Math.min(1, v));
  const v = cl(target ? value / target : 0), pl = cl(target ? (value + planned) / target : 0);
  return (
    <div className="w-full overflow-hidden rounded-full" style={{ height, backgroundColor: C.track }}>
      <div className="relative h-full">
        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pl * 100}%`, backgroundColor: color, opacity: 0.3 }} />
        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${v * 100}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function HeroRing({ kcal, kcalTarget, prot, protTarget, kcalPlanned = 0, protPlanned = 0, children }) {
  const size = 220, cx = size / 2, cy = size / 2, sweep = 270, rot = 135;
  const s1 = 14, r1 = (size - s1) / 2;
  const s2 = 10, r2 = r1 - s1 / 2 - 7 - s2 / 2;
  const circ1 = 2 * Math.PI * r1, arc1 = circ1 * (sweep / 360);
  const circ2 = 2 * Math.PI * r2, arc2 = circ2 * (sweep / 360);
  const kp = kcalTarget > 0 ? Math.min(1, kcal / kcalTarget) : 0;
  const pp = protTarget > 0 ? Math.min(1, prot / protTarget) : 0;
  const kpAll = kcalTarget > 0 ? Math.min(1, (kcal + kcalPlanned) / kcalTarget) : 0; // réel + planifié
  const ppAll = protTarget > 0 ? Math.min(1, (prot + protPlanned) / protTarget) : 0;
  const over = kcal > kcalTarget;
  const kColor = over ? C.over : kp > 0.85 ? C.warn : C.green;
  const pColor = C.protein;
  return (
    <div className="relative mx-auto mb-2" style={{ width: size, height: size * 0.84 }}>
      <svg width={size} height={size} style={{ display: "block" }}>
        <circle cx={cx} cy={cy} r={r1} fill="none" stroke={C.track} strokeWidth={s1} strokeLinecap="round" strokeDasharray={`${arc1} ${circ1}`} transform={`rotate(${rot} ${cx} ${cy})`} />
        <circle cx={cx} cy={cy} r={r2} fill="none" stroke={C.track} strokeWidth={s2} strokeLinecap="round" strokeDasharray={`${arc2} ${circ2}`} transform={`rotate(${rot} ${cx} ${cy})`} />
        {/* projection planifiée (pâle, sous le réel) */}
        {kcalPlanned > 0 && <circle cx={cx} cy={cy} r={r1} fill="none" stroke={kColor} strokeOpacity={0.3} strokeWidth={s1} strokeLinecap="round" strokeDasharray={`${arc1 * kpAll} ${circ1}`} transform={`rotate(${rot} ${cx} ${cy})`} style={{ transition: "stroke-dasharray 0.6s ease" }} />}
        {protPlanned > 0 && <circle cx={cx} cy={cy} r={r2} fill="none" stroke={pColor} strokeOpacity={0.3} strokeWidth={s2} strokeLinecap="round" strokeDasharray={`${arc2 * ppAll} ${circ2}`} transform={`rotate(${rot} ${cx} ${cy})`} style={{ transition: "stroke-dasharray 0.6s ease" }} />}
        {/* réel consommé (solide) */}
        <circle cx={cx} cy={cy} r={r1} fill="none" stroke={kColor} strokeWidth={s1} strokeLinecap="round" strokeDasharray={`${arc1 * kp} ${circ1}`} transform={`rotate(${rot} ${cx} ${cy})`} style={{ transition: "stroke-dasharray 0.6s ease, stroke 0.4s ease", filter: `drop-shadow(0 0 7px ${kColor}80)` }} />
        <circle cx={cx} cy={cy} r={r2} fill="none" stroke={pColor} strokeWidth={s2} strokeLinecap="round" strokeDasharray={`${arc2 * pp} ${circ2}`} transform={`rotate(${rot} ${cx} ${cy})`} style={{ transition: "stroke-dasharray 0.6s ease", filter: `drop-shadow(0 0 6px ${pColor}70)` }} />
      </svg>
      <div className="absolute inset-x-0 flex flex-col items-center text-center" style={{ top: "25%" }}>{children}</div>
    </div>
  );
}


function PlateBar({ segments, total }) {
  const sum = segments.reduce((a, s) => a + s.kcal, 0);
  return (
    <div className="relative h-3.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: C.track }}>
      <div className="flex h-full w-full">
        {segments.map((s, i) => (
          <div key={i} style={{ width: `${Math.max(0, (s.kcal / total) * 100)}%`, backgroundColor: s.color, borderRight: `1.5px solid ${C.paper}` }} />
        ))}
      </div>
      {sum > total && <div className="absolute inset-y-0 right-0 w-1" style={{ backgroundColor: C.over }} />}
    </div>
  );
}


function WeightCard({ date, weight, onWeight }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(weight != null ? String(weight) : "");
  useEffect(() => { setVal(weight != null ? String(weight) : ""); }, [weight, date]);
  const save = () => { const kg = parseFloat(val.replace(",", ".")); onWeight(isNaN(kg) ? null : kg); setEditing(false); };
  return (
    <div className="mb-4 flex items-center justify-between rounded-2xl px-4 py-3" style={cardStyle()}>
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: `${C.weight}1a`, color: C.weight }}><Scale size={16} /></span>
        <div className="leading-tight">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.weight }}>Poids</p>
          <p className="text-sm font-semibold" style={{ color: weight != null ? C.ink : C.muted }}>{weight != null ? `${weight} kg` : "Non noté"}</p>
        </div>
      </div>
      {editing ? (
        <div className="flex items-center gap-2">
          <input autoFocus value={val} onChange={(e) => setVal(e.target.value)} inputMode="decimal" placeholder="kg" className="w-20 rounded-xl px-3 py-1.5 text-sm font-semibold outline-none" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink }} />
          <button onClick={save} className="rounded-xl px-3 py-1.5 text-sm font-semibold text-white active:scale-95" style={{ backgroundColor: C.weight }}><Check size={16} /></button>
        </div>
      ) : (
        <button onClick={() => setEditing(true)} className="rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95" style={{ backgroundColor: weight != null ? C.paper : C.ink, color: weight != null ? C.sub : C.paper, border: weight != null ? `1px solid ${C.line}` : "none" }}>
          {weight != null ? "Modifier" : "Noter"}
        </button>
      )}
    </div>
  );
}

const SLOT_NAMES = { pdj: "petit-déj", dej: "déjeuner", diner: "dîner", snack: "en-cas" };

// Bottom-sheet « Logger un repas » (validé design-lab) : habituels 1-tap + méthodes.
// `slot` = créneau ciblé, ou null pour un log global (l'habituel garde son créneau).
function AddSheet({ slot, habituals = [], onClose, onQuickAdd, onPick, onPhotoLog, onScan, onAssist, onOpenCuisine }) {
  const title = slot ? `Ajouter · ${SLOT_NAMES[slot]}` : "Logger un repas";
  const hab = slot ? [...habituals].sort((a, b) => (a.slot === slot ? -1 : 0) - (b.slot === slot ? -1 : 0)) : habituals;
  const methods = [
    slot && onPick && { i: Search, l: "Piocher", d: "Suggestions adaptées au créneau", c: SLOT_UI[slot].color, act: () => onPick(slot) },
    onPhotoLog && { i: Camera, l: "Photo / décrire", d: "IA vision ou langage naturel", c: C.accent, act: onPhotoLog },
    onScan && { i: ScanLine, l: "Scanner", d: "Code-barres → macros", c: C.protein, act: onScan },
    onAssist && { i: Wand2, l: "Assistant", d: "Proposer / compléter", c: C.accent, act: () => onAssist(slot || null) },
    onOpenCuisine && { i: Soup, l: "Ma cuisine", d: "Recettes, repas, aliments", c: C.weight, act: onOpenCuisine },
  ].filter(Boolean);
  return (
    <Sheet open onClose={onClose} title={title} subtitle="Tout part d'ici" icon={<Plus size={18} />} iconColor={C.accent}>
      {hab.length > 0 && (<>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: C.muted }}>Tes habituels · 1 tap</p>
        <div className="mb-4 space-y-1.5">
          {hab.map((h) => (
            <button key={h.name} onClick={() => { onQuickAdd(slot || h.slot, h); onClose(); }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left active:scale-95" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}` }}>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${SLOT_UI[h.slot].color}1f`, color: SLOT_UI[h.slot].color }}><Plus size={14} /></span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold" style={{ color: C.ink }}>{h.name}</span>
              <span className="text-xs tabular-nums" style={{ color: C.muted }}>{h.kcal} · {h.p} g</span>
            </button>
          ))}
        </div>
      </>)}
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: C.muted }}>Autres méthodes</p>
      <div className="grid grid-cols-2 gap-2">
        {methods.map(({ i: Icon, l, d, c, act }) => (
          <button key={l} onClick={() => { onClose(); act(); }} className="flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left active:scale-95" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}` }}>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${c}1a`, color: c }}><Icon size={16} /></span>
            <span className="min-w-0"><span className="block text-xs font-bold" style={{ color: C.ink }}>{l}</span><span className="block text-[10px]" style={{ color: C.muted }}>{d}</span></span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}

// Bottom-sheet « Assistant » (validé design-lab) : menu d'actions, global ou ciblé créneau.
function AssistantSheet({ slot, remKcal, remP, onClose, onIdea, onSuggestNow, onPlan, onOpenCuisine }) {
  const scoped = slot ? SLOT_NAMES[slot] : null;
  const opts = scoped ? [
    { i: Wand2, l: `Propose un ${scoped}`, d: "Une idée qui rentre dans le budget", c: C.accent, act: () => onIdea && onIdea(slot) },
    { i: ListPlus, l: "Complète ce repas", d: "Ce qu'il manque (protéines, équilibre)", c: C.green, act: () => onIdea && onIdea(slot) },
    { i: Shuffle, l: "D'autres idées", d: "De nouvelles propositions", c: C.weight, act: () => onIdea && onIdea(slot) },
    { i: Soup, l: "Depuis ma cuisine", d: `Mes recettes pour le ${scoped}`, c: C.protein, act: onOpenCuisine },
  ] : [
    { i: Wand2, l: "Propose-moi un repas", d: "Un repas complet dans le budget", c: C.accent, act: () => onSuggestNow && onSuggestNow() },
    { i: ListPlus, l: "Complète ma journée", d: `Pour finir : ${remKcal} kcal · ${remP} g`, c: C.green, act: () => onSuggestNow && onSuggestNow() },
    { i: Sparkles, l: "Planifier (jour / semaine)", d: "Remplir les créneaux à venir", c: C.protein, act: onPlan },
    { i: Soup, l: "Depuis ma cuisine", d: "Mes recettes & repas", c: C.weight, act: onOpenCuisine },
  ];
  return (
    <Sheet open onClose={onClose} title={scoped ? `Assistant · ${scoped}` : "Assistant repas"} subtitle={`Budget : ${remKcal} kcal · ${remP} g restants`} icon={<Wand2 size={18} />} iconColor={C.accent}>
      {opts.filter((o) => o.act).map(({ i: Icon, l, d, c, act }) => (
        <button key={l} onClick={() => { onClose(); act(); }} className="mb-2 flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left active:scale-95" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}` }}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${c}1a`, color: c }}><Icon size={17} /></span>
          <span className="min-w-0 flex-1"><span className="block text-sm font-bold" style={{ color: C.ink }}>{l}</span><span className="block text-[11px]" style={{ color: C.muted }}>{d}</span></span>
          <ChevronRight size={16} style={{ color: C.muted }} />
        </button>
      ))}
    </Sheet>
  );
}

// Fiche recette consultable depuis un repas loggé (si l'item porte ingrédients/étapes).
function RecipeViewSheet({ m, onClose }) {
  const ings = m.ingredients || [], steps = m.steps || [];
  return (
    <Sheet open onClose={onClose} title={m.name} subtitle={`${r0(m.kcal)} kcal · ${r0(m.p)} g prot.`} icon={m.emoji ? <span className="text-lg leading-none">{m.emoji}</span> : <BookOpen size={18} />} iconColor={C.weight}>
      {ings.length > 0 && (<>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest" style={{ color: C.muted }}>Ingrédients</p>
        <ul className="mb-4 space-y-1">{ings.map((it, i) => <li key={i} className="flex gap-2 text-sm" style={{ color: C.sub }}><span style={{ color: C.green }}>•</span><span>{it}</span></li>)}</ul>
      </>)}
      {steps.length > 0 && (<>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest" style={{ color: C.muted }}>Préparation</p>
        <ol className="space-y-2">{steps.map((st, i) => <li key={i} className="flex gap-2 text-sm" style={{ color: C.sub }}><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ backgroundColor: `${C.protein}1f`, color: C.protein }}>{i + 1}</span><span>{st}</span></li>)}</ol>
      </>)}
      {ings.length === 0 && steps.length === 0 && <p className="text-sm" style={{ color: C.muted }}>Pas de détail de recette pour cet item.</p>}
    </Sheet>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  ÉCRAN JOURNAL
// ════════════════════════════════════════════════════════════════════════════


function Divider() { return <div style={{ height: 1, backgroundColor: C.line }} />; }


function TemplatesSheet({ templates, hasContent, hasPrevDay, onCopyPrev, onSave, onLoad, onDelete, onClose }) {
  const [name, setName] = useState("");
  return (
    <Sheet open onClose={onClose} title="Modèles & copie">
        <p className="mb-4 text-sm" style={{ color: C.sub }}>Réutilise une journée déjà construite au lieu de tout repiocher.</p>

        <button onClick={onCopyPrev} disabled={!hasPrevDay} className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold active:scale-95" style={{ backgroundColor: hasPrevDay ? C.card : "transparent", border: `1px solid ${C.line}`, color: hasPrevDay ? C.ink : C.muted }}>
          <Copy size={15} /> Copier la journée de la veille
        </button>

        <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: C.muted }}>Mes modèles</p>
        {templates.length === 0 ? (
          <p className="mb-4 text-sm" style={{ color: C.muted }}>Aucun modèle. Enregistre une journée type (ex. « jour de repos », « jour d'entraînement ») pour la recharger en un geste.</p>
        ) : (
          <div className="mb-4 space-y-2">
            {templates.map((t) => {
              const tot = dayTotals(t);
              return (
                <div key={t.id} className="flex items-center gap-2 rounded-2xl p-3" style={cardStyle()}>
                  <button onClick={() => onLoad(t.id)} className="min-w-0 flex-1 text-left active:scale-95">
                    <p className="truncate text-sm font-semibold" style={{ color: C.ink }}>{t.name}</p>
                    <p className="text-xs" style={{ color: C.sub, fontVariantNumeric: "tabular-nums" }}>{tot.kcal} kcal · {tot.p} g prot.</p>
                  </button>
                  <button onClick={() => onLoad(t.id)} className="rounded-lg px-3 py-1.5 text-xs font-semibold active:scale-95" style={{ backgroundColor: C.green, color: "#fff" }}>Charger</button>
                  <button onClick={() => onDelete(t.id)} className="rounded-lg p-1.5 active:scale-90" style={{ color: C.muted }}><Trash2 size={15} /></button>
                </div>
              );
            })}
          </div>
        )}

        <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: C.muted }}>Enregistrer la journée actuelle</p>
        {hasContent ? (
          <div className="flex gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom (ex. Jour d'entraînement)" className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink }} />
            <button onClick={() => { if (name.trim()) { onSave(name); setName(""); } }} className="shrink-0 rounded-xl px-4 py-2 text-sm font-semibold active:scale-95" style={{ backgroundColor: C.ink, color: C.paper }}>Enregistrer</button>
          </div>
        ) : (
          <p className="text-sm" style={{ color: C.muted }}>Pioche d'abord quelques repas, puis reviens ici pour les enregistrer comme modèle.</p>
        )}
    </Sheet>
  );
}
