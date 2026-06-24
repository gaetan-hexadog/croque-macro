import React, { useState, useEffect, useRef } from "react";
import { Apple, Plus, Shuffle, Check, Search, Beef, Flame, ChevronRight, Trash2, Dumbbell, ChevronLeft, Scale, Layers, Copy, X, Pencil, TrendingDown, TrendingUp, Lightbulb, Sparkles } from "lucide-react";
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


export function DayScreen({ activeDate, setActiveDate, settings, totals, planned = { kcal: 0, p: 0 }, remKcal, remP, days, weights, onOpenWeek, onSaveCombo, picks, skipBreakfast, slotTarget, training, onToggleTraining, weight, onWeight, onPick, onIdea, onConfirm, quickPicks = {}, onQuick, habituals = [], onHabitual, onSuggestNow, onClear, onQty, onEditItem, onSkip, onReset, templates, hasPrevDay, onCopyPrev, onSaveTemplate, onLoadTemplate, onDeleteTemplate, targetSuggestion, onApplyTarget, onDismissTarget, sportInfo, recomp, onGoSport }) {
  const [showTpl, setShowTpl] = useState(false);
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
      {/* Barre « restant » collante : le budget reste visible pendant le scroll */}
      <div className="sticky top-0 z-20 -mx-4 mb-3 px-4 pt-1 pb-1">
        <div className="flex items-center justify-between rounded-full px-4 py-2" style={{ backgroundColor: C.nav, backdropFilter: "blur(12px)", border: `1px solid ${C.line}`, boxShadow: `0 6px 20px -12px ${C.shadow}` }}>
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.muted }}>{over ? "Dépassé" : "Restant"}</span>
          <span className="text-sm font-bold tabular-nums">
            <span style={{ color: over ? C.over : C.ink }}>{r0(Math.abs(remKcal))} kcal</span>
            <span style={{ color: C.muted }}> · </span>
            <span style={{ color: C.protein }}>{r0(Math.max(0, remP))} g</span>
            {planned.kcal > 0 && <span className="font-medium" style={{ color: C.muted }}> · +{r0(planned.kcal)} prévu</span>}
          </span>
        </div>
      </div>
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

      {/* Bande de semaine : navigation + statut de chaque jour (pastille colorée) */}
      <div className="mb-4 rounded-2xl px-2 py-2" style={cardStyle()}>
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

      {/* Jauge du jour — double anneau (kcal + protéines). Training = chip discret en coin. */}
      <section className="relative mb-4 rounded-3xl p-5" style={cardStyle()}>
        <button onClick={onToggleTraining} aria-pressed={training} title="Jour d'entraînement" className="absolute right-3.5 top-3.5 z-10 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold active:scale-95" style={training ? { backgroundColor: `${C.weight}26`, color: C.weight } : { backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.muted }}><Dumbbell size={12} /> Training</button>
        <HeroRing kcal={totals.kcal} kcalTarget={settings.kcal} prot={totals.p} protTarget={settings.protein} kcalPlanned={planned.kcal} protPlanned={planned.p}>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: C.muted }}>{over ? "Dépassé de" : "Restant"}</p>
          <p className="leading-none" style={{ fontFamily: "'Space Grotesk', system-ui", fontVariantNumeric: "tabular-nums" }}>
            <span className="text-6xl font-bold tracking-tight" style={{ color: over ? C.over : C.ink }}>{r0(Math.abs(remKcal))}</span>
          </p>
          <p className="mt-1 text-xs" style={{ color: C.sub }}>kcal {over ? "au-dessus" : "restantes"}</p>
        </HeroRing>
        {/* Lecture principale « consommé / cible » — la ligne forte sous l'anneau. */}
        <div className="mt-3 flex justify-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold tabular-nums" style={{ backgroundColor: `${C.protein}1f`, color: C.protein }}><Flame size={12} /> {r0(totals.kcal)} / {settings.kcal}</span>
          <span className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold tabular-nums" style={{ backgroundColor: `${C.green}1f`, color: C.green }}><Beef size={12} /> {r0(totals.p)} / {settings.protein} g</span>
        </div>
        {/* Une seule ligne de contexte (protéines + training + prévu) au lieu de trois. */}
        <p className="mt-2 text-center text-xs" style={{ color: C.muted }}>
          {remP > 0 ? <>Encore <span className="font-semibold" style={{ color: C.green }}>{r0(remP)} g</span> de protéines{training ? " · priorité training" : ""}</> : "Protéines au but ✓"}
          {(planned.kcal > 0) && <> · +<span className="font-semibold" style={{ color: C.sub }}>{r0(planned.kcal)}</span> prévu → projeté {r0(totals.kcal + planned.kcal)}</>}
        </p>

        <div className="mt-4">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest" style={{ color: C.muted }}>L'assiette</p>
          <PlateBar segments={ribbon} total={settings.kcal} />
        </div>

        {/* Bilan de la semaine, fusionné dans la jauge — tap → Progrès */}
        <button onClick={onOpenWeek} className="mt-4 flex w-full items-center justify-between rounded-2xl px-3.5 py-2.5 active:scale-95" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}` }}>
          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide" style={{ color: C.muted }}>
            Cette semaine
            {WTrend && <span className="flex items-center gap-0.5 normal-case" style={{ color: C.weight }}><WTrend size={13} /> poids</span>}
          </span>
          <span className="flex items-center gap-2">
            {wstats.logged >= 2
              ? <span className="text-sm font-bold tabular-nums" style={{ color: wBalColor }}>{wBal >= 0 ? `+${wBal}` : wBal} kcal</span>
              : <span className="text-xs" style={{ color: C.muted }}>bilan en cours</span>}
            <ChevronRight size={15} style={{ color: C.muted }} />
          </span>
        </button>
      </section>

      {/* Log rapide : habituels en 1 tap + suggestion contextuelle (parcours « je viens de manger ») */}
      {isToday && (habituals.length > 0 || onSuggestNow) && (
        <div className="mb-4">
          <SectionTitle right={onSuggestNow && (
            <button onClick={onSuggestNow} className="flex items-center gap-1 text-xs font-semibold active:scale-95" style={{ color: C.accent }}><Sparkles size={13} /> Propose-moi</button>
          )}>Log rapide</SectionTitle>
          {habituals.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {habituals.map((it) => (
                <button key={it.name} onClick={() => onHabitual(it)} className="flex shrink-0 items-center gap-2 rounded-2xl px-3 py-2 text-left active:scale-95" style={cardStyle()}>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${SLOT_UI[it.slot].color}1f`, color: SLOT_UI[it.slot].color }}><Plus size={15} /></span>
                  <span className="min-w-0">
                    <span className="block max-w-34 truncate text-xs font-bold" style={{ color: C.ink }}>{it.name}</span>
                    <span className="block text-[11px]" style={{ color: C.muted, fontVariantNumeric: "tabular-nums" }}>{it.kcal} kcal · {it.p} g</span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="px-1 text-xs" style={{ color: C.muted }}>Tes aliments récurrents s'afficheront ici pour un ajout en 1 tap.</p>
          )}
        </div>
      )}

      {/* Les repas — une carte distincte par repas */}
      <SectionTitle className="mt-1" right={
        <div className="flex items-center gap-3">
          <button onClick={() => setShowTpl(true)} className="flex items-center gap-1 text-xs font-semibold active:scale-95" style={{ color: C.sub }}><Layers size={13} /> Modèles</button>
          {ribbon.length > 0 && <button onClick={onReset} className="text-xs font-semibold active:scale-95" style={{ color: C.muted }}>Vider</button>}
        </div>
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
        <DayRow slotKey="pdj" meals={picks.pdj} skipped={skipBreakfast} target={slotTarget("pdj")} onAdd={() => onPick("pdj")} onIdea={onIdea ? () => onIdea("pdj") : undefined} onConfirm={onConfirm ? (i) => onConfirm("pdj", i) : undefined} onReplace={(i) => onPick("pdj", i)} onClear={(i) => onClear("pdj", i)} onQty={(i, d) => onQty("pdj", i, d)} onEdit={(i, patch) => onEditItem("pdj", i, patch)} quick={quickPicks.pdj} onQuick={onQuick ? (it) => onQuick("pdj", it) : undefined} onSkip={onSkip} onSaveCombo={onSaveCombo} />
        <DayRow slotKey="dej" meals={picks.dej} target={slotTarget("dej")} onAdd={() => onPick("dej")} onIdea={onIdea ? () => onIdea("dej") : undefined} onConfirm={onConfirm ? (i) => onConfirm("dej", i) : undefined} onReplace={(i) => onPick("dej", i)} onClear={(i) => onClear("dej", i)} onQty={(i, d) => onQty("dej", i, d)} onEdit={(i, patch) => onEditItem("dej", i, patch)} quick={quickPicks.dej} onQuick={onQuick ? (it) => onQuick("dej", it) : undefined} onSaveCombo={onSaveCombo} />
        <DayRow slotKey="diner" meals={picks.diner} target={slotTarget("diner")} onAdd={() => onPick("diner")} onIdea={onIdea ? () => onIdea("diner") : undefined} onConfirm={onConfirm ? (i) => onConfirm("diner", i) : undefined} onReplace={(i) => onPick("diner", i)} onClear={(i) => onClear("diner", i)} onQty={(i, d) => onQty("diner", i, d)} onEdit={(i, patch) => onEditItem("diner", i, patch)} quick={quickPicks.diner} onQuick={onQuick ? (it) => onQuick("diner", it) : undefined} onSaveCombo={onSaveCombo} />
        <SideSection snacks={picks.snacks} extras={picks.extras || []} onAdd={() => onPick("snack")} onIdea={onIdea ? () => onIdea("snack") : undefined} onConfirm={onConfirm} onClear={onClear} onQty={onQty} onEdit={onEditItem} quick={quickPicks.snack} onQuick={onQuick ? (it) => onQuick("snack", it) : undefined} />
      </div>

      {/* Poids du jour */}
      <div className="mt-4">
        <WeightCard date={activeDate} weight={weight} onWeight={onWeight} />
      </div>

      <p className="mt-6 px-2 text-center text-xs" style={{ color: C.muted }}>Valeurs estimées par portion. Un déficit léger et tenable bat un régime agressif.</p>

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


function DayRow({ slotKey, meals = [], skipped, target, onAdd, onIdea, onConfirm, onReplace, onClear, onQty, onEdit, onSkip, onSaveCombo, quick, onQuick }) {
  const ui = SLOT_UI[slotKey];
  const Icon = SLOTS[slotKey].icon;
  const [naming, setNaming] = useState(false);
  const [comboName, setComboName] = useState("");
  const sub = meals.reduce((a, m) => ({ kcal: a.kcal + m.kcal * (m.qty || 1), p: a.p + m.p * (m.qty || 1) }), { kcal: 0, p: 0 });
  const has = meals.length > 0;
  return (
    <div className="rounded-3xl px-5 py-4" style={cardStyle()}>
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: ui.color }} />
          <Icon size={17} style={{ color: ui.color }} />
          <div className="leading-tight">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: ui.color }}>{ui.time}</p>
            <p className="text-sm font-semibold" style={{ color: C.ink }}>{SLOTS[slotKey].label}{has && <span style={{ color: C.muted, fontWeight: 500 }}> · {sub.kcal} kcal · {sub.p} g</span>}</p>
          </div>
        </div>
        {onSkip && (
          <button onClick={onSkip} className="rounded-full px-2.5 py-1 text-xs font-medium active:scale-95" style={skipped ? { backgroundColor: C.ink, color: C.paper } : { color: C.muted, border: `1px solid ${C.line}` }}>{skipped ? "Sauté" : "Sauter"}</button>
        )}
      </div>

      {skipped ? (
        <p className="pl-1 text-sm" style={{ color: C.muted }}>Protéines reportées sur le déjeuner et le dîner.</p>
      ) : !has ? (
        <>
          <QuickChips items={quick} onQuick={onQuick} color={ui.color} />
          <div className="flex items-center gap-2">
            <button onClick={onAdd} className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-white active:scale-95" style={{ backgroundColor: ui.color }}><Search size={15} /> Piocher · ~{r0(target.kcal)} kcal</button>
            {onIdea && <button onClick={onIdea} title="Une idée (assistant)" className="flex h-11 items-center justify-center gap-1.5 rounded-2xl px-4 active:scale-90" style={{ backgroundColor: `${C.green}1a`, color: C.green }}><Lightbulb size={17} /> Idée</button>}
          </div>
        </>
      ) : (
        <div className="space-y-2">
          <QuickChips items={quick} onQuick={onQuick} color={ui.color} />
          {meals.map((m, i) => (
            <MealItemRow key={i} m={m} accent={ui.color} onQty={(nv) => onQty(i, nv)} onReplace={() => onReplace(i)} onRemove={() => onClear(i)} onEdit={onEdit ? (patch) => onEdit(i, patch) : undefined} onConfirm={onConfirm ? () => onConfirm(i) : undefined} />
          ))}
          <div className="flex items-center gap-2 pt-0.5">
            <button onClick={onAdd} className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-2.5 text-sm font-semibold active:scale-95" style={{ backgroundColor: `${ui.color}1a`, color: ui.color }}><Plus size={15} /> Ajouter</button>
            {onIdea && <button onClick={onIdea} title="Une idée (assistant)" className="flex h-10 items-center justify-center gap-1.5 rounded-2xl px-3.5 active:scale-90" style={{ backgroundColor: `${C.green}1a`, color: C.green }}><Lightbulb size={16} /> Idée</button>}
          </div>
          {onSaveCombo && (naming ? (
            <div className="flex items-center gap-2 pt-1">
              <input value={comboName} onChange={(e) => setComboName(e.target.value)} placeholder="Nom du repas" autoFocus className="min-w-0 flex-1 rounded-xl px-3 py-2 text-sm outline-none" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink }} onKeyDown={(e) => { if (e.key === "Enter" && comboName.trim()) { onSaveCombo(slotKey, meals, comboName.trim()); setComboName(""); setNaming(false); } }} />
              <button onClick={() => { if (comboName.trim()) { onSaveCombo(slotKey, meals, comboName.trim()); setComboName(""); setNaming(false); } }} className="shrink-0 rounded-xl px-3 py-2 text-sm font-semibold text-white active:scale-95" style={{ backgroundColor: ui.color }}>OK</button>
              <button onClick={() => { setNaming(false); setComboName(""); }} className="shrink-0 rounded-xl px-2 py-2 text-sm active:scale-95" style={{ color: C.muted }}>Annuler</button>
            </div>
          ) : (
            <button onClick={() => setNaming(true)} className="pt-1.5 text-xs font-semibold active:scale-95" style={{ color: C.muted }}>+ Enregistrer comme repas réutilisable</button>
          ))}
        </div>
      )}
    </div>
  );
}


// « À-côtés » : fusion En-cas + Plaisirs en une section. Les items « plaisir »
// (ex-extras) portent un tag. Routage par slot ("snack" | "extras").
function SideSection({ snacks = [], extras = [], onAdd, onIdea, onQty, onClear, onEdit, onConfirm, quick, onQuick }) {
  const color = SLOT_UI.snack.color;
  const items = [
    ...snacks.map((m, i) => ({ m, slot: "snack", i, plaisir: false })),
    ...extras.map((m, i) => ({ m, slot: "extras", i, plaisir: true })),
  ];
  return (
    <div className="rounded-3xl px-5 py-4" style={cardStyle()}>
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
          <Apple size={17} style={{ color }} />
          <div className="leading-tight">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color }}>À-côtés</p>
            <p className="text-sm font-semibold" style={{ color: C.ink }}>En-cas & plaisirs</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {onIdea && <button onClick={onIdea} aria-label="Une idée (assistant)" className="flex h-8 w-8 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: `${C.green}1a`, color: C.green }}><Lightbulb size={15} /></button>}
          <button onClick={onAdd} className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95" style={{ backgroundColor: C.ink, color: C.paper }}><Plus size={13} /> Ajouter</button>
        </div>
      </div>
      <QuickChips items={quick} onQuick={onQuick} color={color} />
      {items.length === 0 ? (
        <p className="pl-1 text-sm" style={{ color: C.muted }}>Un en-cas protéiné si un repas est juste, ou un petit plaisir — le budget s'ajuste tout seul.</p>
      ) : (
        <div className="space-y-2">
          {items.map(({ m, slot, i, plaisir }) => (
            <MealItemRow key={`${slot}-${i}`} m={m} accent={plaisir ? C.extra : color} plaisir={plaisir}
              onQty={onQty ? (nv) => onQty(slot, i, nv) : undefined}
              onRemove={() => onClear(slot, i)}
              onEdit={onEdit ? (patch) => onEdit(slot, i, patch) : undefined}
              onConfirm={onConfirm ? () => onConfirm(slot, i) : undefined}
              bg={plaisir ? `${C.extra}14` : undefined} />
          ))}
        </div>
      )}
    </div>
  );
}

function MealItemRow({ m, accent, onQty, onReplace, onRemove, onEdit, onConfirm, plaisir, bg }) {
  const q = m.qty || 1;
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

  if (editing) {
    return (
      <div className="rounded-2xl p-3" style={{ backgroundColor: bg || C.paper, border: `1px solid ${accent}66` }}>
        <input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Nom" className="mb-2 w-full rounded-xl px-3 py-2 text-sm outline-none" style={fld} />
        <div className="mb-2 flex gap-2">
          <input value={kcal} onChange={(e) => setKcal(e.target.value)} inputMode="decimal" placeholder="kcal" className="w-full min-w-0 rounded-xl px-3 py-2 text-sm outline-none" style={fld} />
          <input value={p} onChange={(e) => setP(e.target.value)} inputMode="decimal" placeholder="prot. (g)" className="w-full min-w-0 rounded-xl px-3 py-2 text-sm outline-none" style={fld} />
        </div>
        <div className="flex gap-2">
          <button onClick={save} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold text-white active:scale-95" style={{ backgroundColor: accent }}><Check size={15} /> Enregistrer</button>
          <button onClick={cancel} className="rounded-xl px-3 py-2 active:scale-90" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.muted }} aria-label="Annuler"><X size={16} /></button>
        </div>
        {q !== 1 && <p className="mt-1.5 px-1 text-xs" style={{ color: C.muted }}>Valeurs par portion · quantité ×{fmtQty(q)} appliquée à part.</p>}
      </div>
    );
  }

  const planned = !!m.planned;
  return (
    <div className="rounded-2xl p-3" style={{ backgroundColor: bg || C.paper, border: planned ? `1px dashed ${accent}99` : "1px solid transparent", opacity: planned ? 0.92 : 1 }}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold" style={{ color: C.ink }}>
            {planned && <span className="mr-1.5 rounded px-1.5 py-0.5 text-[10px] font-bold align-middle" style={{ backgroundColor: `${accent}26`, color: accent }}>PRÉVU</span>}
            {plaisir && <span className="mr-1.5 rounded px-1.5 py-0.5 text-[10px] font-bold align-middle" style={{ backgroundColor: `${C.extra}26`, color: C.extra }}>PLAISIR</span>}
            {m.name}{q !== 1 && <span style={{ color: accent }}> ×{fmtQty(q)}</span>}
          </p>
          <p className="mt-0.5 text-xs font-semibold" style={{ fontVariantNumeric: "tabular-nums" }}>
            <span style={{ color: C.ink }}>{r0(m.kcal * q)} kcal</span><span style={{ color: C.protein }}> · {r0(m.p * q)} g prot.</span>
            {q !== 1 && <span style={{ color: C.muted }}> · {m.kcal}×{fmtQty(q)}</span>}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <QtyStepper value={q} onChange={onQty} accent={accent} />
          <div className="flex gap-1.5">
            {onEdit && <button onClick={() => setEditing(true)} className="rounded-lg p-2 active:scale-90" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }} aria-label="Modifier"><Pencil size={14} /></button>}
            {onReplace && <button onClick={onReplace} className="rounded-lg p-2 active:scale-90" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }}><Shuffle size={14} /></button>}
            <button onClick={onRemove} className="rounded-lg p-2 active:scale-90" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.muted }}><Trash2 size={14} /></button>
          </div>
        </div>
      </div>
      {planned && onConfirm && (
        <button onClick={onConfirm} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold active:scale-95" style={{ backgroundColor: `${C.green}1f`, color: C.green }}>
          <Check size={14} /> J'ai bien mangé ça
        </button>
      )}
    </div>
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
