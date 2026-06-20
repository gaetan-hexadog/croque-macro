import React, { useState, useMemo } from "react";
import { ArrowLeft, Search, X, Plus, Trash2, GlassWater, UtensilsCrossed, ScanLine, Pencil, ChevronDown, Sparkles, Clock, Flame } from "lucide-react";
import { MEALS, SLOTS, C, SLOT_UI, SHAKE_BASES, SHAKE_LIQUIDS } from "./core.js";
import OffSearch from "./OffSearch.jsx";

// normalise pour la recherche : minuscules, sans accents, œ→oe, æ→ae
const deburr = (str) => (str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/œ/g, "oe").replace(/æ/g, "ae");

const fitMeta = {
  ok: { fg: "#2f7d5b" },
  rich: { fg: "#b3641f" },
  over: { fg: "#c0432f" },
};

function FoodRow({ m, accent, fitColor, onChoose, onDelete }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl p-2.5" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
      <button onClick={() => onChoose(m)} className="flex min-w-0 flex-1 items-center gap-3 text-left active:scale-95">
        <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: fitColor }} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold" style={{ color: C.ink }}>{m.name}{m.custom && <span style={{ color: accent }}> ·perso</span>}</span>
          <span className="block text-xs" style={{ color: C.muted, fontVariantNumeric: "tabular-nums" }}>{m.kcal} kcal · {m.p} g prot.</span>
        </span>
      </button>
      {m.custom && onDelete
        ? <button onClick={() => onDelete(m.id)} className="shrink-0 rounded-lg p-2 active:scale-90" style={{ color: C.muted }} aria-label="Supprimer"><Trash2 size={15} /></button>
        : <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${accent}14`, color: accent }}><Plus size={16} /></span>}
    </div>
  );
}

function ChipBtn({ m, onChoose }) {
  return <button onClick={() => onChoose(m)} className="rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }}>{m.name} <span style={{ color: C.muted }}>{m.kcal}</span></button>;
}

function ActionBtn({ icon, label, onClick }) {
  return (
    <button onClick={onClick} className="flex flex-1 flex-col items-center gap-1.5 rounded-2xl py-3 active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }}>
      {icon}
      <span className="text-xs font-semibold">{label}</span>
    </button>
  );
}

export function Deck({ slotKey, rankFor, fitOf, slotTarget, pool = MEALS, usage = {}, combos = [], onChoose, onApplyCombo, onDeleteCombo, shakeBases = [], shakeLiquids = [], onAddShakeBase, onDelShakeBase, onAddShakeLiquid, onDelShakeLiquid, onSave, onDeleteCustom, onClose }) {
  const ui = SLOT_UI[slotKey];
  const [q, setQ] = useState("");
  const [panel, setPanel] = useState("main");          // main | shake | combos | off
  const [budgetOnly, setBudgetOnly] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [cName, setCName] = useState(""); const [cKcal, setCKcal] = useState(""); const [cP, setCP] = useState("");

  const frequent = useMemo(() => pool
    .filter((m) => m.slots.includes(slotKey) && usage[m.name] && usage[m.name].count >= 2)
    .sort((a, b) => (usage[b.name].count - usage[a.name].count) || ((usage[b.name].last || 0) - (usage[a.name].last || 0)))
    .slice(0, 8), [pool, slotKey, usage]);
  const recent = useMemo(() => pool
    .filter((m) => m.slots.includes(slotKey) && usage[m.name])
    .sort((a, b) => (usage[b.name].last || 0) - (usage[a.name].last || 0))
    .slice(0, 8), [pool, slotKey, usage]);
  const slotCombos = useMemo(() => combos.filter((c) => c.slot === slotKey), [combos, slotKey]);

  const suggestions = useMemo(() => rankFor(slotKey, pool.filter((m) => m.slots.includes(slotKey))).slice(0, 4), [pool, slotKey, rankFor]);

  const results = useMemo(() => {
    if (!q.trim()) return [];
    const s = deburr(q);
    let l = pool.filter((m) => deburr(m.name).includes(s) || deburr(m.desc).includes(s));
    l = rankFor(slotKey, l);
    if (budgetOnly) l = l.filter((m) => fitOf(m) !== "over");
    return l;
  }, [q, budgetOnly, pool, rankFor, slotKey, fitOf]);

  const addCustom = () => {
    const k = parseInt(cKcal, 10);
    if (!cName.trim() || isNaN(k)) return;
    onChoose({ id: `custom-${Date.now()}`, name: cName.trim(), kcal: k, p: parseInt(cP, 10) || 0, c: null, f: null, desc: "Mon repas", tags: [], slots: [slotKey], custom: true });
  };

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center" style={{ backgroundColor: C.overlay, backdropFilter: "blur(3px)" }} onClick={onClose}>
      <div className="flex w-full max-w-md flex-col rounded-t-3xl" style={{ maxHeight: "92vh", backgroundColor: C.sheet }} onClick={(e) => e.stopPropagation()}>

        <div className="shrink-0 px-5 pb-3 pt-4">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full" style={{ backgroundColor: C.line }} />
          <div className="flex items-center justify-between">
            {panel === "main" ? (
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${ui.color}1a`, color: ui.color }}>{React.createElement(SLOTS[slotKey].icon, { size: 17 })}</span>
                <div className="leading-tight"><p className="text-xs font-semibold uppercase tracking-wider" style={{ color: ui.color }}>{ui.time}</p><p className="text-base font-bold" style={{ color: C.ink }}>Ajouter · {SLOTS[slotKey].label}</p></div>
              </div>
            ) : (
              <button onClick={() => setPanel("main")} className="flex items-center gap-1.5 text-sm font-semibold active:scale-95" style={{ color: C.sub }}><ArrowLeft size={18} /> Retour</button>
            )}
            <button onClick={onClose} className="rounded-full p-2 active:scale-90" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }} aria-label="Fermer"><X size={18} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5">

          {panel === "main" && (
            <>
              <div className="mb-3 flex items-center gap-2 rounded-2xl px-3 py-2.5" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
                <Search size={16} style={{ color: C.muted }} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un aliment, un plat…" className="w-full bg-transparent text-sm outline-none" style={{ color: C.ink }} />
                {q && <button onClick={() => setQ("")} className="shrink-0 active:scale-90" style={{ color: C.muted }} aria-label="Effacer"><X size={15} /></button>}
              </div>

              <div className="mb-4 flex gap-2">
                <ActionBtn icon={<GlassWater size={20} style={{ color: C.protein }} />} label="Shake" onClick={() => setPanel("shake")} />
                <ActionBtn icon={<UtensilsCrossed size={20} style={{ color: ui.color }} />} label="Mes repas" onClick={() => setPanel("combos")} />
                <ActionBtn icon={<ScanLine size={20} style={{ color: C.ink }} />} label="Scanner" onClick={() => setPanel("off")} />
              </div>

              {q.trim() ? (
                <>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: C.muted }}>{results.length} résultat{results.length > 1 ? "s" : ""}</p>
                    <button onClick={() => setBudgetOnly((v) => !v)} className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium active:scale-95" style={budgetOnly ? { backgroundColor: C.ink, color: C.paper } : { backgroundColor: C.card, color: C.sub, border: `1px solid ${C.line}` }}><Flame size={12} /> Dans le budget</button>
                  </div>
                  <div className="space-y-2">
                    {results.map((m) => <FoodRow key={m.id} m={m} accent={ui.color} fitColor={fitMeta[fitOf(m)].fg} onChoose={onChoose} onDelete={onDeleteCustom} />)}
                  </div>
                  <button onClick={() => setPanel("off")} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold active:scale-95" style={{ border: `1px dashed ${C.muted}`, color: C.sub }}>
                    <Search size={15} /> Chercher « {q.trim()} » dans Open Food Facts
                  </button>
                </>
              ) : (
                <>
                  {suggestions.length > 0 && (
                    <div className="mb-4">
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest" style={{ color: C.muted }}><Sparkles size={13} /> Suggéré pour ce repas</p>
                      <div className="space-y-2">{suggestions.map((m) => <FoodRow key={m.id} m={m} accent={ui.color} fitColor={fitMeta[fitOf(m)].fg} onChoose={onChoose} onDelete={onDeleteCustom} />)}</div>
                    </div>
                  )}
                  {recent.length > 0 && (
                    <div className="mb-4">
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest" style={{ color: C.muted }}><Clock size={13} /> Récents</p>
                      <div className="flex flex-wrap gap-1.5">{recent.map((m) => <ChipBtn key={m.name} m={m} onChoose={onChoose} />)}</div>
                    </div>
                  )}
                  {frequent.length > 0 && (
                    <div className="mb-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: C.muted }}>Fréquents</p>
                      <div className="flex flex-wrap gap-1.5">{frequent.map((m) => <ChipBtn key={m.name} m={m} onChoose={onChoose} />)}</div>
                    </div>
                  )}
                </>
              )}

              <button onClick={() => setCustomOpen((v) => !v)} className="mb-2 mt-2 flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold active:scale-95" style={{ border: `1px dashed ${C.muted}`, color: C.sub }}>
                <span className="flex items-center gap-2"><Pencil size={15} /> Saisir un aliment manuellement</span>
                <ChevronDown size={16} style={{ transform: customOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
              </button>
              {customOpen && (
                <div className="mb-2 space-y-2 rounded-2xl p-3" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
                  <input value={cName} onChange={(e) => setCName(e.target.value)} placeholder="Ex. Mes 2 tacos œuf-fromage-avocat" className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink }} />
                  <div className="flex gap-2">
                    <input value={cKcal} onChange={(e) => setCKcal(e.target.value)} inputMode="numeric" placeholder="kcal" className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink }} />
                    <input value={cP} onChange={(e) => setCP(e.target.value)} inputMode="numeric" placeholder="prot. (g)" className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink }} />
                    <button onClick={addCustom} className="shrink-0 rounded-xl px-4 py-2 text-sm font-semibold text-white active:scale-95" style={{ backgroundColor: C.ink }}>OK</button>
                  </div>
                </div>
              )}
            </>
          )}

          {panel === "shake" && (
            <div>
              <p className="mb-3 flex items-center gap-2 text-base font-bold" style={{ color: C.ink }}><GlassWater size={18} style={{ color: C.protein }} /> Composer un shake</p>
              <ShakeBuilder embedded onAdd={onChoose} customBases={shakeBases} customLiquids={shakeLiquids} onAddBase={onAddShakeBase} onDelBase={onDelShakeBase} onAddLiquid={onAddShakeLiquid} onDelLiquid={onDelShakeLiquid} />
            </div>
          )}

          {panel === "combos" && (
            <div>
              <p className="mb-3 flex items-center gap-2 text-base font-bold" style={{ color: C.ink }}><UtensilsCrossed size={18} style={{ color: ui.color }} /> Mes repas</p>
              {slotCombos.length === 0 ? (
                <p className="py-8 text-center text-sm leading-relaxed" style={{ color: C.muted }}>Aucun repas réutilisable pour ce créneau.<br />Crée-en un depuis un repas du jour, avec « Enregistrer comme repas réutilisable ».</p>
              ) : (
                <div className="space-y-2">
                  {slotCombos.map((c) => {
                    const tot = c.items.reduce((a, m) => ({ k: a.k + m.kcal * (m.qty || 1), p: a.p + m.p * (m.qty || 1) }), { k: 0, p: 0 });
                    return (
                      <div key={c.id} className="flex items-center gap-2 rounded-2xl px-3 py-2.5" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
                        <button onClick={() => onApplyCombo(c)} className="min-w-0 flex-1 text-left active:scale-95">
                          <p className="truncate text-sm font-semibold" style={{ color: C.ink }}>{c.name}</p>
                          <p className="text-xs" style={{ color: C.muted, fontVariantNumeric: "tabular-nums" }}>{c.items.length} aliment{c.items.length > 1 ? "s" : ""} · {Math.round(tot.k)} kcal · {Math.round(tot.p)} g</p>
                        </button>
                        <button onClick={() => onDeleteCombo(c.id)} className="shrink-0 rounded-lg p-2 active:scale-90" style={{ color: C.muted }} aria-label="Supprimer"><Trash2 size={14} /></button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {panel === "off" && (
            <OffSearch C={C} accent={ui.color} onChoose={onChoose} onSave={onSave} initialQuery={q} />
          )}

        </div>
      </div>
    </div>
  );
}

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

function ShakeBuilder({ onAdd, customBases = [], customLiquids = [], onAddBase, onDelBase, onAddLiquid, onDelLiquid, embedded = false }) {
  const [open, setOpen] = useState(embedded);
  const [bi, setBi] = useState(0); const [li, setLi] = useState(1);
  const bases = [...SHAKE_BASES, ...customBases];
  const liquids = [...SHAKE_LIQUIDS, ...customLiquids];
  const sb = Math.min(bi, bases.length - 1), sl = Math.min(li, liquids.length - 1);
  const base = bases[sb] || bases[0], liq = liquids[sl] || liquids[0];
  const kcal = base.kcal + liq.kcal, p = base.p + liq.p;
  const body = (
    <div className="space-y-2.5 p-3">
      <ShakeRow label="Base" options={bases} sel={sb} onSel={setBi} onAdd={onAddBase} onDel={onDelBase} />
      <ShakeRow label="Liquide" options={liquids} sel={sl} onSel={setLi} onAdd={onAddLiquid} onDel={onDelLiquid} />
      <div className="flex items-center justify-between pt-0.5">
        <Stat label={`${p} g prot.`} value={`${kcal} kcal`} color={C.ink} />
        <button onClick={() => onAdd({ name: `${base.name} + ${liq.name}`, kcal, p })} className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white active:scale-95" style={{ backgroundColor: C.protein }}>Ajouter</button>
      </div>
    </div>
  );
  if (embedded) return <div className="overflow-hidden rounded-2xl" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>{body}</div>;
  return (
    <div className="mb-3 overflow-hidden rounded-2xl" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 px-3 py-2.5 text-left active:opacity-70">
        <GlassWater size={16} style={{ color: C.protein }} />
        <span className="flex-1 text-sm font-semibold" style={{ color: C.ink }}>Composer un shake</span>
        <ChevronDown size={16} style={{ color: C.muted, transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
      </button>
      {open && body}
    </div>
  );
}
