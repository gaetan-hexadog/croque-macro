import React, { useState } from "react";
import { X, ScanLine, Pencil, Check, Refrigerator, ChevronLeft, RotateCcw, Trash2, Plus } from "lucide-react";
import { C } from "../core.js";
import { Sheet } from "../components/Sheet.jsx";
import OffSearch from "../components/OffSearch.jsx";

const num = (v) => { const n = parseFloat(String(v ?? "").replace(",", ".")); return isFinite(n) ? n : 0; };
const stripQty = (s) => String(s || "").replace(/\s*\([^)]*\)\s*$/, "").trim();

function parsePkg(s, baseUnit) {
  const str = String(s || "").toLowerCase().replace(",", ".");
  if (!str) return 0;
  const mult = str.match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/);
  let q = mult ? parseFloat(mult[1]) * parseFloat(mult[2]) : (str.match(/(\d+(?:\.\d+)?)/) ? parseFloat(str.match(/(\d+(?:\.\d+)?)/)[1]) : 0);
  if (/\bkg\b/.test(str)) q *= 1000;
  else if (/\bcl\b/.test(str)) q *= 10;
  else if (/(\d|\s)l\b|litre/.test(str) && !/ml/.test(str)) q *= 1000;
  return Math.round(q);
}

// Frigo/placard — PAGE plein écran : ce que j'ai (nom + quantité + densité /100),
// avec interrupteur dispo/rupture, sections séparées, édition et suppression.
// Ajout clavier OU scan (qui pré-remplit nom, unité, quantité du paquet, macros /100).
export function PantrySheet({ pantry = [], onAdd, onToggle, onUpdate, onRemove, onClose }) {
  const blank = { name: "", unit: "g", qty: "", kcal100: "", p100: "" };
  const [f, setF] = useState(blank);
  const [scanning, setScanning] = useState(false);
  const [editId, setEditId] = useState(null);
  const [e, setE] = useState(blank);
  const set = (k) => (ev) => setF((s) => ({ ...s, [k]: ev.target.value }));
  const setEd = (k) => (ev) => setE((s) => ({ ...s, [k]: ev.target.value }));

  const add = () => { if (!f.name.trim()) return; onAdd(f.name.trim(), { unit: f.unit, qty: num(f.qty), kcal100: num(f.kcal100), p100: num(f.p100) }); setF(blank); };
  const startEdit = (it) => { setEditId(it.id); setE({ name: it.name, unit: it.unit || "g", qty: it.qty ?? "", kcal100: it.kcal100 ?? "", p100: it.p100 ?? "" }); };
  const saveEdit = () => { onUpdate && onUpdate(editId, { unit: e.unit, qty: Math.round(num(e.qty) * 10) / 10 || undefined, kcal100: Math.round(num(e.kcal100)) || undefined, p100: Math.round(num(e.p100) * 10) / 10 || undefined }); setEditId(null); };

  const fld = { backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink };
  const UnitSelect = ({ value, onChange }) => (
    <select value={value} onChange={onChange} className="rounded-xl px-2 py-2.5 text-sm outline-none" style={fld}>
      <option value="g">g</option><option value="ml">ml</option><option value="pièce">pièce</option>
    </select>
  );
  const describe = (it) => {
    const parts = [];
    if (it.qty) parts.push(`${it.qty} ${it.unit || "g"} dispo`);
    if (it.kcal100 || it.p100) parts.push(`${it.kcal100 || "?"} kcal · ${it.p100 || "?"} g /100${it.unit || "g"}`);
    return parts.join(" · ");
  };

  const dispo = pantry.filter((x) => !x.out), rupture = pantry.filter((x) => x.out);
  const Row = (it) => (
    <div key={it.id} className="rounded-xl px-3 py-2" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: it.out ? C.muted : C.green }} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm" style={{ color: it.out ? C.muted : C.ink, textDecoration: it.out ? "line-through" : "none" }}>{it.name}</span>
          {editId !== it.id && describe(it) && <span className="text-[11px]" style={{ color: C.muted }}>{describe(it)}</span>}
        </span>
        <button onClick={() => onToggle(it.id)} className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold active:scale-95" style={it.out ? { backgroundColor: `${C.green}1f`, color: C.green } : { backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.muted }}>{it.out ? <><RotateCcw size={11} /> Remettre</> : "Rupture"}</button>
        {onUpdate && <button onClick={() => (editId === it.id ? setEditId(null) : startEdit(it))} className="shrink-0 p-1.5 active:scale-90" style={{ color: C.muted }} aria-label="Éditer"><Pencil size={14} /></button>}
        <button onClick={() => onRemove(it.id)} className="shrink-0 p-1.5 active:scale-90" style={{ color: C.muted }} aria-label="Supprimer"><Trash2 size={15} /></button>
      </div>
      {editId === it.id && (
        <div className="mt-2 space-y-2">
          <div className="flex gap-2">
            <input value={e.qty} onChange={setEd("qty")} inputMode="decimal" placeholder="Quantité" className="min-w-0 flex-1 rounded-lg px-2 py-1.5 text-xs outline-none" style={fld} />
            <UnitSelect value={e.unit} onChange={setEd("unit")} />
          </div>
          <div className="flex gap-2">
            <input value={e.kcal100} onChange={setEd("kcal100")} inputMode="numeric" placeholder={`kcal /100${e.unit}`} className="min-w-0 flex-1 rounded-lg px-2 py-1.5 text-xs outline-none" style={fld} />
            <input value={e.p100} onChange={setEd("p100")} inputMode="numeric" placeholder={`prot. /100${e.unit}`} className="min-w-0 flex-1 rounded-lg px-2 py-1.5 text-xs outline-none" style={fld} />
            <button onClick={saveEdit} className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold text-white active:scale-95" style={{ backgroundColor: C.green }}><Check size={14} /></button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
    <div style={{ position: "fixed", inset: 0, zIndex: 40, background: C.bg, backgroundImage: C.bgImage, display: "flex", flexDirection: "column" }}>
      <div className="flex items-center gap-3 px-4 pb-3" style={{ paddingTop: "calc(env(safe-area-inset-top) + 14px)", borderBottom: `1px solid ${C.line}` }}>
        <button onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }} aria-label="Retour"><ChevronLeft size={20} /></button>
        <div className="min-w-0 flex-1">
          <p className="text-base font-extrabold" style={{ color: C.ink, fontFamily: "'Space Grotesk', system-ui" }}>Mon frigo / placard</p>
          <p className="text-xs" style={{ color: C.muted }}>{dispo.length} dispo{rupture.length ? ` · ${rupture.length} en rupture` : ""}</p>
        </div>
        <Refrigerator size={20} style={{ color: C.weight }} />
      </div>

      <div className="mx-auto w-full max-w-md flex-1 space-y-4 overflow-y-auto px-4 pb-8 pt-4" style={{ scrollbarWidth: "none" }}>
        {/* Ajout : scan/recherche OFF + à la main */}
        <button onClick={() => setScanning(true)} className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold active:scale-95" style={{ backgroundColor: `${C.weight}1f`, color: C.weight }}><ScanLine size={17} /> Chercher ou scanner un produit</button>
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: C.muted }}>ou ajoute à la main</p>
          <div className="space-y-2">
            <input value={f.name} onChange={set("name")} onKeyDown={(ev) => { if (ev.key === "Enter") add(); }} placeholder="Nom (ex. compote pomme)…" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={fld} />
            <div className="flex gap-2">
              <input value={f.qty} onChange={set("qty")} inputMode="decimal" placeholder="Quantité que j'ai" className="min-w-0 flex-1 rounded-xl px-3 py-2.5 text-sm outline-none" style={fld} />
              <UnitSelect value={f.unit} onChange={set("unit")} />
            </div>
            <div className="flex gap-2">
              <input value={f.kcal100} onChange={set("kcal100")} inputMode="numeric" placeholder={`kcal /100${f.unit}`} className="min-w-0 flex-1 rounded-xl px-3 py-2.5 text-sm outline-none" style={fld} />
              <input value={f.p100} onChange={set("p100")} inputMode="numeric" placeholder={`prot. /100${f.unit}`} className="min-w-0 flex-1 rounded-xl px-3 py-2.5 text-sm outline-none" style={fld} />
              <button onClick={add} className="flex shrink-0 items-center gap-1 rounded-xl px-4 text-sm font-bold text-white active:scale-95" style={{ backgroundColor: C.green }}><Plus size={16} /></button>
            </div>
          </div>
        </div>

        {pantry.length === 0 ? (
          <p className="py-10 text-center text-sm" style={{ color: C.muted }}>Aucun aliment pour l'instant — ajoute ce que tu as sous la main.</p>
        ) : (
          <>
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-widest" style={{ color: C.green }}>Disponible · {dispo.length}</p>
              <div className="space-y-1.5">{dispo.length ? dispo.map(Row) : <p className="text-xs" style={{ color: C.muted }}>Rien de dispo.</p>}</div>
            </div>
            {rupture.length > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-widest" style={{ color: C.muted }}>En rupture · {rupture.length}</p>
                <div className="space-y-1.5">{rupture.map(Row)}</div>
              </div>
            )}
          </>
        )}
        <p className="px-1 text-xs leading-relaxed" style={{ color: C.muted }}>Passe en <b style={{ color: C.over }}>rupture</b> ce qui te manque. L'assistant peut n'utiliser qu'une <b style={{ color: C.ink }}>partie</b> d'un aliment (chocolat, compote, yaourt…) grâce à la densité /100.</p>
      </div>
    </div>

    {/* Scan/recherche OFF — bottom-sheet PAR-DESSUS le frigo (le frigo reste monté). */}
    {scanning && (
      <Sheet open onClose={() => setScanning(false)} title="Ajouter au frigo" subtitle="Chercher ou scanner" icon={<ScanLine size={18} />} iconColor={C.weight} onBack={() => setScanning(false)} z={50}>
        <p className="mb-3 text-xs" style={{ color: C.sub }}>Cherche un produit ou scanne son code-barres, puis « Ajouter » — il rejoint directement ton frigo (nom, quantité du paquet et macros /100 repris automatiquement, éditables ensuite).</p>
        <OffSearch C={C} accent={C.weight} onChoose={(it) => { onAdd(stripQty(it.name), { unit: it.unit || "g", qty: parsePkg(it.pkgQty, it.unit), kcal100: it.per100?.kcal, p100: it.per100?.p }); setScanning(false); }} />
      </Sheet>
    )}
    </>
  );
}
