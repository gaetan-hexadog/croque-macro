import React, { useState, useEffect, useMemo } from "react";
import { X, Shuffle, Check, Search, Flame, ChevronRight, ChevronDown, Trash2, Pencil, GlassWater } from "lucide-react";
import {
  MEALS, SLOTS, TAGS, C, SLOT_UI, SHAKE_BASES, SHAKE_LIQUIDS,
} from "./core.js";
import OffSearch from "./OffSearch.jsx";

export function Deck({ slotKey, rankFor, fitOf, slotTarget, pool = MEALS, usage = {}, combos = [], onChoose, onApplyCombo, onDeleteCombo, shakeBases = [], shakeLiquids = [], onAddShakeBase, onDelShakeBase, onAddShakeLiquid, onDelShakeLiquid, onSave, onDeleteCustom, onClose }) {
  const ui = SLOT_UI[slotKey];
  const [q, setQ] = useState(""); const [tags, setTags] = useState([]); const [budgetOnly, setBudgetOnly] = useState(false);
  const [feat, setFeat] = useState(0); const [showList, setShowList] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [source, setSource] = useState("base");
  const [cName, setCName] = useState(""); const [cKcal, setCKcal] = useState(""); const [cP, setCP] = useState("");
  const toggleTag = (t) => setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  const frequent = useMemo(() => pool
    .filter((m) => m.slots.includes(slotKey) && usage[m.name] && usage[m.name].count >= 2)
    .sort((a, b) => (usage[b.name].count - usage[a.name].count) || ((usage[b.name].last || 0) - (usage[a.name].last || 0)))
    .slice(0, 6), [pool, slotKey, usage]);
  const recent = useMemo(() => pool
    .filter((m) => m.slots.includes(slotKey) && usage[m.name])
    .sort((a, b) => (usage[b.name].last || 0) - (usage[a.name].last || 0))
    .slice(0, 6), [pool, slotKey, usage]);
  const slotCombos = useMemo(() => combos.filter((c) => c.slot === slotKey), [combos, slotKey]);

  const list = useMemo(() => {
    let l = pool.filter((m) => m.slots.includes(slotKey));
    if (q.trim()) { const s = q.toLowerCase(); l = l.filter((m) => m.name.toLowerCase().includes(s) || (m.desc || "").toLowerCase().includes(s)); }
    if (tags.length) l = l.filter((m) => tags.every((t) => m.tags.includes(t)));
    l = rankFor(slotKey, l);
    if (budgetOnly) l = l.filter((m) => fitOf(m) !== "over");
    return l;
  }, [slotKey, q, tags, budgetOnly, rankFor, fitOf, pool]);
  useEffect(() => { setFeat(0); }, [q, tags, budgetOnly, slotKey]);

  const addCustom = () => { const k = parseInt(cKcal, 10); if (!cName.trim() || isNaN(k)) return; onChoose({ id: `custom-${Date.now()}`, name: cName.trim(), kcal: k, p: parseInt(cP, 10) || 0, c: null, f: null, desc: "Mon repas", tags: [], slots: [slotKey], custom: true }); };

  const fitMeta = {
    ok: { label: "rentre dans ton budget", bg: "#e3f3ea", fg: "#2f7d5b" },
    rich: { label: "un peu riche", bg: "#fbeede", fg: "#b3641f" },
    over: { label: "dépasse le budget", bg: "#f8e3df", fg: "#c0432f" },
  };
  const featured = list[feat % (list.length || 1)];

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center" style={{ backgroundColor: C.overlay, backdropFilter: "blur(3px)" }} onClick={onClose}>
      <div className="flex w-full max-w-md flex-col rounded-t-3xl" style={{ maxHeight: "92vh", backgroundColor: C.sheet }} onClick={(e) => e.stopPropagation()}>
        <div className="shrink-0 px-5 pb-3 pt-4">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full" style={{ backgroundColor: C.line }} />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${ui.color}1a`, color: ui.color }}>{React.createElement(SLOTS[slotKey].icon, { size: 17 })}</span>
              <div className="leading-tight"><p className="text-xs font-semibold uppercase tracking-wider" style={{ color: ui.color }}>{ui.time}</p><p className="text-base font-bold" style={{ color: C.ink }}>{SLOTS[slotKey].label} · pioche</p></div>
            </div>
            <button onClick={onClose} className="rounded-full p-2 active:scale-90" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }}><X size={18} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-5">
          <div className="mb-3 flex gap-1 rounded-full p-1" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}` }}>
            {[{ v: "base", l: "Ma base" }, { v: "off", l: "Open Food Facts" }].map((o) => (
              <button key={o.v} onClick={() => setSource(o.v)} className="flex-1 rounded-full py-1.5 text-xs font-semibold active:scale-95" style={source === o.v ? { backgroundColor: ui.color, color: "#fff" } : { color: C.sub }}>{o.l}</button>
            ))}
          </div>
          {source === "off" ? (
            <OffSearch C={C} accent={ui.color} onChoose={onChoose} onSave={onSave} />
          ) : (
          <>
          <ShakeBuilder onAdd={onChoose} customBases={shakeBases} customLiquids={shakeLiquids} onAddBase={onAddShakeBase} onDelBase={onDelShakeBase} onAddLiquid={onAddShakeLiquid} onDelLiquid={onDelShakeLiquid} />
          {frequent.length > 0 && (
            <div className="mb-3">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest" style={{ color: C.muted }}>Fréquents</p>
              <div className="flex flex-wrap gap-1.5">
                {frequent.map((m) => (
                  <button key={m.name} onClick={() => onChoose(m)} className="rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }}>{m.name} <span style={{ color: C.muted }}>{m.kcal}</span></button>
                ))}
              </div>
            </div>
          )}
          {recent.length > 0 && (
            <div className="mb-3">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest" style={{ color: C.muted }}>Récents</p>
              <div className="flex flex-wrap gap-1.5">
                {recent.map((m) => (
                  <button key={m.name} onClick={() => onChoose(m)} className="rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }}>{m.name} <span style={{ color: C.muted }}>{m.kcal}</span></button>
                ))}
              </div>
            </div>
          )}
          {slotCombos.length > 0 && (
            <div className="mb-3">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest" style={{ color: C.muted }}>Mes repas</p>
              <div className="space-y-1.5">
                {slotCombos.map((c) => {
                  const tot = c.items.reduce((a, m) => ({ k: a.k + m.kcal * (m.qty || 1), p: a.p + m.p * (m.qty || 1) }), { k: 0, p: 0 });
                  return (
                    <div key={c.id} className="flex items-center gap-2 rounded-2xl px-3 py-2" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
                      <button onClick={() => onApplyCombo(c)} className="min-w-0 flex-1 text-left active:scale-95">
                        <p className="truncate text-sm font-semibold" style={{ color: C.ink }}>{c.name}</p>
                        <p className="text-xs" style={{ color: C.muted, fontVariantNumeric: "tabular-nums" }}>{c.items.length} aliment{c.items.length > 1 ? "s" : ""} · {Math.round(tot.k)} kcal · {Math.round(tot.p)} g</p>
                      </button>
                      <button onClick={() => onDeleteCombo(c.id)} className="shrink-0 rounded-lg p-2 active:scale-90" style={{ color: C.muted }}><Trash2 size={14} /></button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div className="mb-2 flex items-center gap-2 rounded-2xl px-3 py-2.5" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
            <Search size={16} style={{ color: C.muted }} />
            <input value={q} onChange={(e) => { setQ(e.target.value); setShowList(true); }} placeholder="Rechercher un plat, un ingrédient…" className="w-full bg-transparent text-sm outline-none" style={{ color: C.ink }} />
            {q && <button onClick={() => { setQ(""); setShowList(false); }} className="shrink-0 active:scale-90" style={{ color: C.muted }}><X size={15} /></button>}
          </div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            <FilterChip active={budgetOnly} onClick={() => setBudgetOnly((v) => !v)} icon={<Flame size={12} />}>Dans le budget</FilterChip>
            {TAGS.map((t) => <FilterChip key={t.id} active={tags.includes(t.id)} onClick={() => toggleTag(t.id)} icon={<t.icon size={12} />}>{t.label}</FilterChip>)}
          </div>

          <button onClick={() => setShowList((v) => !v)} className="mb-3 flex w-full items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wider active:scale-95" style={{ color: C.muted }}>
            {showList ? "Voir la suggestion" : `Voir tous les plats (${list.length})`}
            <ChevronRight size={13} style={{ transform: showList ? "rotate(90deg)" : "none", transition: "transform .2s" }} />
          </button>

          {!showList && featured && (
            <div className="mb-3 rounded-3xl p-4" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, boxShadow: `0 10px 30px -20px ${C.shadow}` }}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: C.muted }}>Suggestion</p>
                {(() => { const m = fitMeta[fitOf(featured)]; return <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: m.bg, color: m.fg }}>{m.label}</span>; })()}
              </div>
              <p className="mt-2 text-lg font-extrabold leading-tight" style={{ color: C.ink }}>{featured.name}</p>
              <p className="mt-1 text-sm" style={{ color: C.sub }}>{featured.desc}</p>
              <div className="mt-3 flex gap-4" style={{ fontVariantNumeric: "tabular-nums" }}>
                <Stat label="kcal" value={featured.kcal} color={C.ink} />
                <Stat label="protéines" value={`${featured.p} g`} color={C.protein} />
                {featured.c != null && <Stat label="gluc / lip" value={`${featured.c} / ${featured.f}`} color={C.muted} />}
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => onChoose(featured)} className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white active:scale-95" style={{ backgroundColor: ui.color }}><Check size={16} /> Prendre</button>
                <button onClick={() => setFeat((f) => f + 1)} className="flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold active:scale-95" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.sub }}><Shuffle size={15} /> Une autre</button>
              </div>
            </div>
          )}

          {showList && (
            <div className="space-y-2">
              {list.length === 0 && <p className="py-6 text-center text-sm" style={{ color: C.muted }}>Aucun plat. Allège les filtres ou saisis ton repas.</p>}
              {list.map((m) => {
                const meta = fitMeta[fitOf(m)];
                return (
                  <div key={m.id} className="flex items-center gap-2 rounded-2xl p-3" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
                    <button onClick={() => onChoose(m)} className="flex min-w-0 flex-1 items-center gap-3 text-left active:scale-95">
                      <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: meta.fg }} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold" style={{ color: C.ink }}>{m.name}{m.custom && <span style={{ color: ui.color }}> ·perso</span>}</p>
                        <p className="text-xs font-medium" style={{ fontVariantNumeric: "tabular-nums" }}><span style={{ color: C.sub }}>{m.kcal} kcal</span> · <span style={{ color: C.protein }}>{m.p} g prot.</span></p>
                      </div>
                    </button>
                    {m.custom && onDeleteCustom
                      ? <button onClick={() => onDeleteCustom(m.id)} className="shrink-0 rounded-lg p-1.5 active:scale-90" style={{ color: C.muted }}><Trash2 size={15} /></button>
                      : <ChevronRight size={18} style={{ color: C.line }} />}
                  </div>
                );
              })}
            </div>
          )}

          <button onClick={() => setCustomOpen((v) => !v)} className="mb-2 mt-3 flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold active:scale-95" style={{ border: `1px dashed ${C.muted}`, color: C.sub }}>
            <span className="flex items-center gap-2"><Pencil size={15} /> Saisir mon repas</span>
            <ChevronRight size={16} style={{ transform: customOpen ? "rotate(90deg)" : "none", transition: "transform .2s" }} />
          </button>
          {customOpen && (
            <div className="mb-2 space-y-2 rounded-2xl p-3" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
              <input value={cName} onChange={(e) => setCName(e.target.value)} placeholder="Ex. Mes 2 tacos œuf-fromage-avocat" className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}` }} />
              <div className="flex gap-2">
                <input value={cKcal} onChange={(e) => setCKcal(e.target.value)} inputMode="numeric" placeholder="kcal" className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}` }} />
                <input value={cP} onChange={(e) => setCP(e.target.value)} inputMode="numeric" placeholder="prot. (g)" className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}` }} />
                <button onClick={addCustom} className="shrink-0 rounded-xl px-4 py-2 text-sm font-semibold text-white active:scale-95" style={{ backgroundColor: C.ink }}>OK</button>
              </div>
            </div>
          )}
          </>
          )}
        </div>
      </div>
    </div>
  );
}


function FilterChip({ active, onClick, icon, children }) {
  return <button onClick={onClick} className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium active:scale-95" style={active ? { backgroundColor: C.ink, color: C.paper } : { backgroundColor: C.card, color: C.sub, border: `1px solid ${C.line}` }}>{icon} {children}</button>;
}

// ── Réglages + calculateur ──────────────────────────────────────────────────


function Stat({ label, value, color }) {
  return <div><p className="text-lg font-extrabold leading-none" style={{ color }}>{value}</p><p className="mt-0.5 text-xs uppercase tracking-wide" style={{ color: C.muted }}>{label}</p></div>;
}

function ShakeRow({ label, options, sel, onSel, onAdd, onDel }) {
  const [adding, setAdding] = useState(false);
  const [n, setN] = useState(""); const [k, setK] = useState(""); const [p, setP] = useState("");
  const save = () => { const kc = parseInt(k, 10); if (!n.trim() || isNaN(kc)) return; onAdd({ name: n.trim(), kcal: kc, p: parseInt(p, 10) || 0 }); setN(""); setK(""); setP(""); setAdding(false); };
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-widest" style={{ color: C.muted }}>{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o, i) => {
          const on = i === sel;
          return (
            <span key={o.id || o.name} className="inline-flex items-center rounded-full" style={{ backgroundColor: on ? C.protein : C.paper, border: `1px solid ${on ? C.protein : C.line}` }}>
              <button onClick={() => onSel(i)} className={`py-1.5 text-xs font-semibold active:scale-95 ${o.id ? "pl-3 pr-1" : "px-3"}`} style={{ color: on ? "#fff" : C.sub }}>{o.name}</button>
              {o.id && onDel && <button onClick={() => onDel(o.id)} className="py-1.5 pl-0.5 pr-2 active:scale-90" style={{ color: on ? "#fff" : C.muted }}><X size={11} /></button>}
            </span>
          );
        })}
        {onAdd && <button onClick={() => setAdding((a) => !a)} className="rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95" style={{ backgroundColor: C.paper, border: `1px dashed ${C.line}`, color: C.muted }}>+ Autre</button>}
      </div>
      {adding && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <input value={n} onChange={(e) => setN(e.target.value)} placeholder="Nom" autoFocus className="min-w-0 flex-1 rounded-lg px-2 py-1.5 text-xs outline-none" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink }} />
          <input value={k} onChange={(e) => setK(e.target.value)} inputMode="numeric" placeholder="kcal" className="w-14 rounded-lg px-2 py-1.5 text-xs outline-none" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink }} />
          <input value={p} onChange={(e) => setP(e.target.value)} inputMode="numeric" placeholder="prot" className="w-14 rounded-lg px-2 py-1.5 text-xs outline-none" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink }} />
          <button onClick={save} className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white active:scale-95" style={{ backgroundColor: C.protein }}>OK</button>
        </div>
      )}
    </div>
  );
}

function ShakeBuilder({ onAdd, customBases = [], customLiquids = [], onAddBase, onDelBase, onAddLiquid, onDelLiquid }) {
  const [open, setOpen] = useState(false);
  const [bi, setBi] = useState(0); const [li, setLi] = useState(1);
  const bases = [...SHAKE_BASES, ...customBases];
  const liquids = [...SHAKE_LIQUIDS, ...customLiquids];
  const sb = Math.min(bi, bases.length - 1), sl = Math.min(li, liquids.length - 1);
  const base = bases[sb] || bases[0], liq = liquids[sl] || liquids[0];
  const kcal = base.kcal + liq.kcal, p = base.p + liq.p;
  return (
    <div className="mb-3 overflow-hidden rounded-2xl" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 px-3 py-2.5 text-left active:opacity-70">
        <GlassWater size={16} style={{ color: C.protein }} />
        <span className="flex-1 text-sm font-semibold" style={{ color: C.ink }}>Composer un shake</span>
        <ChevronDown size={16} style={{ color: C.muted, transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
      </button>
      {open && (
        <div className="space-y-2.5 px-3 pb-3">
          <ShakeRow label="Base" options={bases} sel={sb} onSel={setBi} onAdd={onAddBase} onDel={onDelBase} />
          <ShakeRow label="Liquide" options={liquids} sel={sl} onSel={setLi} onAdd={onAddLiquid} onDel={onDelLiquid} />
          <div className="flex items-center justify-between pt-0.5">
            <span className="text-sm font-bold" style={{ color: C.ink, fontVariantNumeric: "tabular-nums" }}>{kcal} kcal · {p} g</span>
            <button onClick={() => onAdd({ name: `${base.name} + ${liq.name}`, kcal, p })} className="rounded-xl px-4 py-2 text-sm font-semibold text-white active:scale-95" style={{ backgroundColor: C.protein }}>Ajouter</button>
          </div>
        </div>
      )}
    </div>
  );
}
