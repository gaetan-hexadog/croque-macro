import React, { useState, useEffect, useRef } from "react";
import { Apple, Plus, Shuffle, Check, Search, Beef, Flame, Sparkles, ChevronRight, Trash2, Dumbbell, Cookie, ChevronLeft, Scale, Layers, Copy, X, Pencil, TrendingDown, TrendingUp } from "lucide-react";
import {
  SLOTS, C, SLOT_UI, TODAY, addDays, fmtFull, r0, dayTotals, fmtQty, cardStyle, weekStats, weekCoach,
} from "./core.js";
import { Sheet } from "./Sheet.jsx";

const deburr = (str) => (str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/œ/g, "oe").replace(/æ/g, "ae");


export function DayScreen({ activeDate, setActiveDate, settings, totals, remKcal, remP, days, weights, onOpenWeek, onSaveCombo, picks, skipBreakfast, slotTarget, training, onToggleTraining, weight, onWeight, onPick, onSurprise, onClear, onQty, onEditItem, onSkip, onAddExtra, onRemoveExtra, onOpenExtras, onReset, templates, hasPrevDay, onCopyPrev, onSaveTemplate, onLoadTemplate, onDeleteTemplate, targetSuggestion, onApplyTarget, onDismissTarget }) {
  const [showTpl, setShowTpl] = useState(false);
  const over = remKcal < 0;
  const isToday = activeDate === TODAY;
  // Résumé hebdo compact, intégré à la carte jauge (visible sans scroller).
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
              <p className="text-sm font-bold" style={{ color: C.ink }}>Ta cible peut s'ajuster</p>
              <p className="mt-0.5 text-xs" style={{ color: C.sub }}>
                Poids de référence {String(targetSuggestion.oldWeight).replace(".", ",")} kg → tu es à ~{String(targetSuggestion.weightNow).replace(".", ",")} kg.
                Nouvelle cible suggérée : <span className="font-semibold" style={{ color: C.ink }}>{targetSuggestion.kcal} kcal · {targetSuggestion.protein} g</span>.
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

      {/* Sélecteur de date */}
      <div className="mb-4 flex items-center justify-between rounded-2xl px-2 py-2" style={cardStyle()}>
        <button onClick={() => setActiveDate(addDays(activeDate, -1))} className="flex h-9 w-9 items-center justify-center rounded-xl active:scale-90" style={{ color: C.sub }}><ChevronLeft size={20} /></button>
        <div className="flex items-center gap-2 text-center">
          <span className="text-sm font-bold capitalize" style={{ color: C.ink }}>{fmtFull(activeDate)}</span>
          {!isToday && <button onClick={() => setActiveDate(TODAY)} className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: `${C.green}1a`, color: C.green }}>Aujourd'hui</button>}
        </div>
        <button onClick={() => !isToday && setActiveDate(addDays(activeDate, 1))} disabled={isToday} className="flex h-9 w-9 items-center justify-center rounded-xl active:scale-90" style={{ color: isToday ? C.line : C.sub }}><ChevronRight size={20} /></button>
      </div>

      {/* Jauge du jour — double anneau (kcal + protéines). Training = chip discret en coin. */}
      <section className="relative mb-4 rounded-3xl p-5" style={cardStyle()}>
        <button onClick={onToggleTraining} aria-pressed={training} title="Jour d'entraînement" className="absolute right-3.5 top-3.5 z-10 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold active:scale-95" style={training ? { backgroundColor: `${C.weight}26`, color: C.weight } : { backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.muted }}><Dumbbell size={12} /> Training</button>
        <HeroRing kcal={totals.kcal} kcalTarget={settings.kcal} prot={totals.p} protTarget={settings.protein}>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: C.muted }}>{over ? "Dépassé de" : "Restant"}</p>
          <p className="leading-none" style={{ fontFamily: "'Space Grotesk', system-ui", fontVariantNumeric: "tabular-nums" }}>
            <span className="text-6xl font-bold tracking-tight" style={{ color: over ? C.over : C.ink }}>{r0(Math.abs(remKcal))}</span>
          </p>
          <p className="mt-1 text-xs" style={{ color: C.sub }}>kcal {over ? "au-dessus" : "restantes"}</p>
        </HeroRing>
        <p className="mt-2 text-center text-xs" style={{ color: C.muted }}>{remP > 0 ? `Encore ${r0(remP)} g de protéines à viser` : "Objectif protéines atteint."}{training && remP > 0 ? " · priorité protéines (jour d'entraînement)" : ""}</p>

        <div className="mt-3 flex justify-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold tabular-nums" style={{ backgroundColor: `${C.protein}1f`, color: C.protein }}><Flame size={12} /> {r0(totals.kcal)} / {settings.kcal}</span>
          <span className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold tabular-nums" style={{ backgroundColor: `${C.green}1f`, color: C.green }}><Beef size={12} /> {r0(totals.p)} / {settings.protein} g</span>
        </div>

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

      {/* Les repas — une carte distincte par repas */}
      <div className="mb-2.5 mt-1 flex items-center justify-between px-1">
        <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: C.sub }}>Les repas</h2>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowTpl(true)} className="flex items-center gap-1 text-xs font-semibold active:scale-95" style={{ color: C.sub }}><Layers size={13} /> Modèles</button>
          {ribbon.length > 0 && <button onClick={onReset} className="text-xs font-semibold active:scale-95" style={{ color: C.muted }}>Vider</button>}
        </div>
      </div>

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
        <DayRow slotKey="pdj" meals={picks.pdj} skipped={skipBreakfast} target={slotTarget("pdj")} onAdd={() => onPick("pdj")} onReplace={(i) => onPick("pdj", i)} onSurprise={() => onSurprise("pdj")} onClear={(i) => onClear("pdj", i)} onQty={(i, d) => onQty("pdj", i, d)} onEdit={(i, patch) => onEditItem("pdj", i, patch)} onSkip={onSkip} onSaveCombo={onSaveCombo} />
        <DayRow slotKey="dej" meals={picks.dej} target={slotTarget("dej")} onAdd={() => onPick("dej")} onReplace={(i) => onPick("dej", i)} onSurprise={() => onSurprise("dej")} onClear={(i) => onClear("dej", i)} onQty={(i, d) => onQty("dej", i, d)} onEdit={(i, patch) => onEditItem("dej", i, patch)} onSaveCombo={onSaveCombo} />
        <DayRow slotKey="diner" meals={picks.diner} target={slotTarget("diner")} onAdd={() => onPick("diner")} onReplace={(i) => onPick("diner", i)} onSurprise={() => onSurprise("diner")} onClear={(i) => onClear("diner", i)} onQty={(i, d) => onQty("diner", i, d)} onEdit={(i, patch) => onEditItem("diner", i, patch)} onSaveCombo={onSaveCombo} />
        <ChipSection color={SLOT_UI.snack.color} time="En-cas" title="Snacks" icon={Apple} items={picks.snacks} canAdd={picks.snacks.length < 4} onAdd={() => onPick("snack")} onRemove={(i) => onClear("snack", i)} onQty={(i, nv) => onQty("snack", i, nv)} onEdit={(i, patch) => onEditItem("snack", i, patch)} empty="Un en-cas protéiné si un repas est juste." />
        <ExtrasSection extras={picks.extras || []} onOpen={onOpenExtras} onRemove={onRemoveExtra} onQty={(i, nv) => onQty("extras", i, nv)} onEdit={(i, patch) => onEditItem("extras", i, patch)} />
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


function DayRow({ slotKey, meals = [], skipped, target, onAdd, onReplace, onSurprise, onClear, onQty, onEdit, onSkip, onSaveCombo }) {
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
        <div className="flex items-center gap-2">
          <button onClick={onAdd} className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-white active:scale-95" style={{ backgroundColor: ui.color }}><Search size={15} /> Piocher · ~{r0(target.kcal)} kcal</button>
          <button onClick={onSurprise} title="Au hasard" className="flex h-11 w-11 items-center justify-center rounded-2xl active:scale-90" style={{ backgroundColor: `${ui.color}1a`, color: ui.color }}><Sparkles size={17} /></button>
        </div>
      ) : (
        <div className="space-y-2">
          {meals.map((m, i) => (
            <MealItemRow key={i} m={m} accent={ui.color} onQty={(nv) => onQty(i, nv)} onReplace={() => onReplace(i)} onRemove={() => onClear(i)} onEdit={onEdit ? (patch) => onEdit(i, patch) : undefined} />
          ))}
          <div className="flex items-center gap-2 pt-0.5">
            <button onClick={onAdd} className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-2.5 text-sm font-semibold active:scale-95" style={{ backgroundColor: `${ui.color}1a`, color: ui.color }}><Plus size={15} /> Ajouter</button>
            <button onClick={onSurprise} title="Au hasard" className="flex h-10 w-10 items-center justify-center rounded-2xl active:scale-90" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.sub }}><Sparkles size={16} /></button>
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


function ChipSection({ color, time, title, icon: Icon, items, canAdd, onAdd, onRemove, onQty, onEdit, empty }) {
  return (
    <div className="rounded-3xl px-5 py-4" style={cardStyle()}>
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
          <Icon size={17} style={{ color }} />
          <div className="leading-tight">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color }}>{time}</p>
            <p className="text-sm font-semibold" style={{ color: C.ink }}>{title}</p>
          </div>
        </div>
        {canAdd && <button onClick={onAdd} className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95" style={{ backgroundColor: C.ink, color: C.paper }}><Plus size={13} /> Ajouter</button>}
      </div>
      {items.length === 0 ? (
        <p className="pl-1 text-sm" style={{ color: C.muted }}>{empty}</p>
      ) : (
        <div className="space-y-2">
          {items.map((s, i) => (
            <MealItemRow key={i} m={s} accent={color} onQty={onQty ? (nv) => onQty(i, nv) : undefined} onRemove={() => onRemove(i)} onEdit={onEdit ? (patch) => onEdit(i, patch) : undefined} />
          ))}
        </div>
      )}
    </div>
  );
}


function ExtrasSection({ extras, onOpen, onRemove, onQty, onEdit }) {
  return (
    <div className="rounded-3xl px-5 py-4" style={cardStyle()}>
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: C.extra }} />
          <Cookie size={17} style={{ color: C.extra }} />
          <div className="leading-tight">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.extra }}>Hors base</p>
            <p className="text-sm font-semibold" style={{ color: C.ink }}>Extras</p>
          </div>
        </div>
        <button onClick={onOpen} className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95" style={{ backgroundColor: C.ink, color: C.paper }}><Plus size={13} /> Ajouter</button>
      </div>
      {extras.length === 0 ? (
        <p className="pl-1 text-sm" style={{ color: C.muted }}>Glace, barre, gâteau, cidre… le budget des repas s'ajuste tout seul.</p>
      ) : (
        <div className="space-y-2">
          {extras.map((e, i) => (
            <MealItemRow key={i} m={e} accent={C.extra} onQty={onQty ? (nv) => onQty(i, nv) : undefined} onRemove={() => onRemove(i)} onEdit={onEdit ? (patch) => onEdit(i, patch) : undefined} bg={`${C.extra}14`} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ExtrasSheet({ presets = [], onAdd, onClose }) {
  const [cat, setCat] = useState(presets[0]?.cat || "");
  const [q, setQ] = useState("");
  const [name, setName] = useState(""); const [kcal, setKcal] = useState(""); const [p, setP] = useState("");
  const group = presets.find((g) => g.cat === cat) || presets[0] || { items: [] };
  const allItems = presets.flatMap((g) => g.items);
  const nq = deburr(q);
  const found = nq ? allItems.filter((it) => deburr(it.name).includes(nq)) : [];
  const addPreset = (pr) => { onAdd(pr); onClose(); };
  const addCustom = () => { const k = parseInt(kcal, 10); if (!name.trim() || isNaN(k)) return; onAdd({ name: name.trim(), kcal: k, p: parseInt(p, 10) || 0 }); onClose(); };
  const chip = (active, color) => active ? { backgroundColor: color, color: "#fff" } : { backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub };
  return (
    <Sheet open onClose={onClose}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${C.extra}1a`, color: C.extra }}><Cookie size={17} /></span>
          <div className="leading-tight"><p className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.extra }}>Hors base</p><p className="text-base font-bold" style={{ color: C.ink }}>Ajouter un extra</p></div>
        </div>
        <button onClick={onClose} className="rounded-full p-2 active:scale-90" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }} aria-label="Fermer"><X size={18} /></button>
      </div>
          <div className="mb-3 flex items-center gap-2 rounded-2xl px-3 py-2.5" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
            <Search size={16} style={{ color: C.muted }} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un extra…" className="w-full bg-transparent text-sm outline-none" style={{ color: C.ink }} />
            {q && <button onClick={() => setQ("")} className="shrink-0 active:scale-90" style={{ color: C.muted }} aria-label="Effacer"><X size={15} /></button>}
          </div>

          {q.trim() ? (
            found.length === 0 ? (
              <p className="py-6 text-center text-sm" style={{ color: C.muted }}>Aucun extra trouvé. Efface la recherche et utilise « ✏️ Manuel » pour le saisir.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {found.map((pr) => (
                  <button key={pr.name} onClick={() => addPreset(pr)} className="rounded-full px-3 py-2 text-sm font-medium active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }}>+ {pr.name} <span style={{ color: C.muted }}>{pr.kcal}</span></button>
                ))}
              </div>
            )
          ) : (
            <>
              <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                {presets.map((g) => (
                  <button key={g.cat} onClick={() => setCat(g.cat)} className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95" style={chip(cat === g.cat, C.extra)}>{g.cat}</button>
                ))}
                <button onClick={() => setCat("__manuel")} className="flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95" style={chip(cat === "__manuel", C.ink)}><Pencil size={12} /> Manuel</button>
              </div>

              {cat === "__manuel" ? (
                <div className="space-y-2.5">
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom (ex. glace vanille)" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }} />
                  <div className="flex gap-2">
                    <input value={kcal} onChange={(e) => setKcal(e.target.value)} inputMode="numeric" placeholder="kcal" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }} />
                    <input value={p} onChange={(e) => setP(e.target.value)} inputMode="numeric" placeholder="prot. (g)" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }} />
                    <button onClick={addCustom} className="shrink-0 rounded-xl px-5 py-2.5 text-sm font-semibold text-white active:scale-95" style={{ backgroundColor: C.extra }}>OK</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {group.items.map((pr) => (
                    <button key={pr.name} onClick={() => addPreset(pr)} className="rounded-full px-3 py-2 text-sm font-medium active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }}>+ {pr.name} <span style={{ color: C.muted }}>{pr.kcal}</span></button>
                  ))}
                </div>
              )}
            </>
          )}

          <p className="mt-4 text-center text-xs" style={{ color: C.muted }}>Touche un extra : il s'ajoute à la journée et la modale se ferme. La quantité s'ajuste ensuite sur la carte du jour.</p>
    </Sheet>
  );
}

// ── DECK : la pioche ────────────────────────────────────────────────────────


function MealItemRow({ m, accent, onQty, onReplace, onRemove, onEdit, bg }) {
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

  return (
    <div className="flex items-start justify-between gap-2 rounded-2xl p-3" style={{ backgroundColor: bg || C.paper }}>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold" style={{ color: C.ink }}>{m.name}{q !== 1 && <span style={{ color: accent }}> ×{fmtQty(q)}</span>}</p>
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
  );
}


function QtyStepper({ value, onChange, accent = C.ink }) {
  const v = value || 1;
  const [txt, setTxt] = useState(null);
  const shown = txt != null ? txt : fmtQty(v);
  const commit = () => { const n = parseFloat((txt || "").replace(",", ".")); onChange(isFinite(n) && n > 0 ? n : v); setTxt(null); };
  const step = (val) => (val <= 1.5 ? 0.25 : 0.5); // pas fin pour les fractions (¼/½/¾), plus large au-delà
  const dec = () => onChange(Math.max(0.1, Math.round((v - step(v)) * 100) / 100));
  const inc = () => onChange(Math.round((v + step(v)) * 100) / 100);
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


function HeroRing({ kcal, kcalTarget, prot, protTarget, children }) {
  const size = 220, cx = size / 2, cy = size / 2, sweep = 270, rot = 135;
  const s1 = 14, r1 = (size - s1) / 2;
  const s2 = 10, r2 = r1 - s1 / 2 - 7 - s2 / 2;
  const circ1 = 2 * Math.PI * r1, arc1 = circ1 * (sweep / 360);
  const circ2 = 2 * Math.PI * r2, arc2 = circ2 * (sweep / 360);
  const kp = kcalTarget > 0 ? Math.min(1, kcal / kcalTarget) : 0;
  const pp = protTarget > 0 ? Math.min(1, prot / protTarget) : 0;
  const over = kcal > kcalTarget;
  const kColor = over ? C.over : kp > 0.85 ? "#f0b341" : C.green;
  const pColor = C.protein;
  return (
    <div className="relative mx-auto mb-2" style={{ width: size, height: size * 0.84 }}>
      <svg width={size} height={size} style={{ display: "block" }}>
        <circle cx={cx} cy={cy} r={r1} fill="none" stroke={C.track} strokeWidth={s1} strokeLinecap="round" strokeDasharray={`${arc1} ${circ1}`} transform={`rotate(${rot} ${cx} ${cy})`} />
        <circle cx={cx} cy={cy} r={r2} fill="none" stroke={C.track} strokeWidth={s2} strokeLinecap="round" strokeDasharray={`${arc2} ${circ2}`} transform={`rotate(${rot} ${cx} ${cy})`} />
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
                <div key={t.id} className="flex items-center gap-2 rounded-2xl p-3" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
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
