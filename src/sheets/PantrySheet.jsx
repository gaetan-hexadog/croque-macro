import React, { useState } from "react";
import { ChevronLeft, Share2, Check, ScanLine, Plus, Pencil, Trash2, RotateCcw, ChevronDown, ShoppingCart, Keyboard, Search } from "lucide-react";
import { C, cardStyle, catOf, catMeta, CAT_ORDER, protStock } from "../core.js";
import { Sheet } from "../components/Sheet.jsx";
import OffSearch from "../components/OffSearch.jsx";
import { BarcodeScanner } from "../components/BarcodeScanner.jsx";
import { fetchProductByBarcode } from "../lib/openfoodfacts.js";
import { formatPantryText, shareOrCopy } from "../lib/share.js";

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

// Frigo/placard — PAGE plein écran, façon « tableau de bord stock » (design lab, variante C) :
// hero (protéines en stock + barre dispo/rupture), « à racheter » en avant, aliments rangés
// en CATÉGORIES repliables. Rupture en 1 tap (chip), édition/suppression au tap → bottom-sheet.
export function PantrySheet({ pantry = [], onAdd, onToggle, onUpdate, onRemove, onClose }) {
  const blank = { name: "", unit: "g", qty: "", kcal100: "", p100: "" };
  const [f, setF] = useState(blank);
  const [addOpen, setAddOpen] = useState(false);   // sélecteur d'ajout (chercher vs main)
  const [scanning, setScanning] = useState(false); // recherche OFF (texte) avec scan intégré
  const [scanDirect, setScanDirect] = useState(false); // scan code-barres DIRECT (1 tap)
  const [flash, setFlash] = useState(null);        // feedback transitoire après scan
  const [adding, setAdding] = useState(false);      // form « à la main »
  const [shared, setShared] = useState("");
  const [action, setAction] = useState(null);       // aliment dont la sheet d'actions est ouverte
  const [editId, setEditId] = useState(null);       // édition en cours (dans la sheet d'actions)
  const [e, setE] = useState(blank);
  const [collapsed, setCollapsed] = useState(() => new Set()); // catégories repliées (déf. toutes ouvertes)

  const set = (k) => (ev) => setF((s) => ({ ...s, [k]: ev.target.value }));
  const setEd = (k) => (ev) => setE((s) => ({ ...s, [k]: ev.target.value }));
  const share = async () => { const r = await shareOrCopy(formatPantryText(pantry), "Mon frigo"); if (r === "copied" || r === "shared") { setShared(r === "copied" ? "Copié" : "Partagé"); setTimeout(() => setShared(""), 2000); } };
  const add = () => { if (!f.name.trim()) return; onAdd(f.name.trim(), { unit: f.unit, qty: num(f.qty), kcal100: num(f.kcal100), p100: num(f.p100) }); setF(blank); setAdding(false); };
  const startEdit = (it) => { setEditId(it.id); setE({ name: it.name, unit: it.unit || "g", qty: it.qty ?? "", kcal100: it.kcal100 ?? "", p100: it.p100 ?? "" }); };
  const saveEdit = () => { onUpdate && onUpdate(editId, { name: e.name.trim() || undefined, unit: e.unit, qty: Math.round(num(e.qty) * 10) / 10 || undefined, kcal100: Math.round(num(e.kcal100)) || undefined, p100: Math.round(num(e.p100) * 10) / 10 || undefined }); setEditId(null); setAction(null); };
  const closeAction = () => { setAction(null); setEditId(null); };
  const showFlash = (text, ok = true) => { setFlash({ text, ok }); setTimeout(() => setFlash(null), 2600); };
  // Scan DIRECT : code → produit OFF → ajout immédiat au frigo (éditable ensuite via tap).
  const onScanCode = async (code) => {
    setScanDirect(false);
    try {
      const p = await fetchProductByBarcode(code);
      if (!p) { showFlash(`Code ${code} introuvable dans Open Food Facts.`, false); return; }
      if (p.per100?.kcal == null) { setF({ ...blank, name: stripQty(p.name), unit: p.liquid ? "ml" : "g" }); setAdding(true); return; }
      const u = p.liquid ? "ml" : "g";
      onAdd(stripQty(p.name), { unit: u, qty: parsePkg(p.quantity, u), kcal100: p.per100.kcal, p100: p.per100.p });
      showFlash(`« ${stripQty(p.name)} » ajouté ✓`);
    } catch { showFlash("Lecture indisponible (réseau).", false); }
  };
  const toggleCat = (k) => setCollapsed((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });

  const fld = { backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink };
  const UnitSelect = ({ value, onChange }) => (
    <select value={value} onChange={onChange} className="rounded-xl px-2 py-2.5 text-sm outline-none" style={fld}>
      <option value="g">g</option><option value="ml">ml</option><option value="pièce">pièce</option>
    </select>
  );
  const dens = (it) => {
    const q = it.qty ? `${it.qty} ${it.unit || "g"}` : "";
    const d = (it.kcal100 || it.p100) ? `${it.kcal100 || "?"}·${it.p100 ?? "?"} /100${it.unit || "g"}` : "";
    return [q, d].filter(Boolean).join(" · ");
  };

  const dispo = pantry.filter((x) => !x.out), rupture = pantry.filter((x) => x.out);
  const groups = CAT_ORDER.map((k) => ({ k, items: dispo.filter((it) => catOf(it.name) === k) })).filter((g) => g.items.length);
  const pct = pantry.length ? Math.round((dispo.length / pantry.length) * 100) : 0;

  // Form partagé (ajout « à la main » et édition)
  const Fields = ({ v, on }) => (
    <>
      <input value={v.name} onChange={on("name")} onKeyDown={(ev) => { if (ev.key === "Enter" && v === f) add(); }} placeholder="Nom (ex. compote pomme)…" className="mb-2 w-full rounded-xl px-3.5 py-3 text-sm outline-none" style={fld} />
      <div className="mb-2 flex gap-2">
        <input value={v.qty} onChange={on("qty")} inputMode="decimal" placeholder="Quantité que j'ai" className="min-w-0 flex-1 rounded-xl px-3.5 py-3 text-sm outline-none" style={fld} />
        <UnitSelect value={v.unit} onChange={on("unit")} />
      </div>
      <div className="mb-3 flex gap-2">
        <input value={v.kcal100} onChange={on("kcal100")} inputMode="numeric" placeholder={`kcal /100${v.unit}`} className="min-w-0 flex-1 rounded-xl px-3.5 py-3 text-sm outline-none" style={fld} />
        <input value={v.p100} onChange={on("p100")} inputMode="numeric" placeholder={`prot. /100${v.unit}`} className="min-w-0 flex-1 rounded-xl px-3.5 py-3 text-sm outline-none" style={fld} />
      </div>
    </>
  );

  return (
    <>
    <div style={{ position: "fixed", inset: 0, zIndex: 40, background: C.bg, backgroundImage: C.bgImage, display: "flex", flexDirection: "column" }}>
      <div className="flex items-center gap-3 px-4 pb-3" style={{ paddingTop: "calc(env(safe-area-inset-top) + 14px)", borderBottom: `1px solid ${C.line}` }}>
        <button onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }} aria-label="Retour"><ChevronLeft size={20} /></button>
        <div className="min-w-0 flex-1">
          <p className="text-base font-extrabold" style={{ color: C.ink, fontFamily: "'Space Grotesk', system-ui" }}>Mon frigo / placard</p>
          <p className="text-xs" style={{ color: C.muted }}>{dispo.length} dispo{rupture.length ? ` · ${rupture.length} à racheter` : ""}</p>
        </div>
        <button onClick={share} className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold active:scale-95" style={{ backgroundColor: shared ? `${C.green}1f` : C.card, border: `1px solid ${C.line}`, color: shared ? C.green : C.sub }} aria-label="Partager ma liste">
          {shared ? <Check size={14} /> : <Share2 size={14} />} {shared || "Partager"}
        </button>
      </div>

      <div className="mx-auto w-full max-w-md flex-1 space-y-4 overflow-y-auto px-4 pb-10 pt-4" style={{ scrollbarWidth: "none" }}>
        {/* Hero stock */}
        <div className="rounded-3xl px-4 py-4" style={cardStyle()}>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: C.muted }}>Protéines en stock</div>
              <div className="text-3xl font-extrabold tabular-nums" style={{ color: C.protein }}>{protStock(dispo)} <span className="text-lg" style={{ color: C.sub }}>g</span></div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-extrabold tabular-nums" style={{ color: C.ink }}>{dispo.length}</div>
              <div className="text-[10px]" style={{ color: C.muted }}>articles dispo</div>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full" style={{ backgroundColor: C.track }}>
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${C.green}, ${C.protein})`, transition: "width .25s" }} />
          </div>
          <div className="mt-1.5 flex justify-between text-[10px]" style={{ color: C.muted }}><span>{dispo.length} dispo</span><span>{rupture.length} à racheter</span></div>
        </div>

        {flash && <div className="rounded-2xl px-3 py-2.5 text-center text-sm font-semibold" style={{ backgroundColor: flash.ok ? `${C.green}1f` : `${C.over}1f`, color: flash.ok ? C.green : C.over }}>{flash.text}</div>}

        {/* Ajout : scan DIRECT (1 tap) ou sélecteur (chercher / à la main) — toujours visible */}
        <div className="flex gap-2">
          <button onClick={() => { setFlash(null); setScanDirect(true); }} className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white active:scale-95" style={{ background: `linear-gradient(150deg, ${C.weight}, ${C.weight}cc)` }}><ScanLine size={17} /> Scanner</button>
          <button onClick={() => setAddOpen(true)} className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }}><Plus size={17} /> Ajouter</button>
        </div>

        {pantry.length === 0 ? (
          <p className="py-8 text-center text-sm" style={{ color: C.muted }}>Aucun aliment pour l'instant — ajoute ce que tu as sous la main.</p>
        ) : (
          <>
            {/* À racheter en avant */}
            {rupture.length > 0 && (
              <div className="rounded-2xl px-3.5 py-3" style={cardStyle({ background: `linear-gradient(150deg, ${C.over}1f, transparent)` })}>
                <div className="mb-2 flex items-center gap-1.5"><ShoppingCart size={13} style={{ color: C.over }} /><span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: C.over }}>À racheter · {rupture.length}</span></div>
                <div className="space-y-1">
                  {rupture.map((it) => (
                    <div key={it.id} className="flex items-center gap-2">
                      <button onClick={() => setAction(it)} className="min-w-0 flex-1 truncate text-left text-sm active:opacity-70" style={{ color: C.sub }}>{it.name}</button>
                      <button onClick={() => onToggle(it.id)} className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold active:scale-95" style={{ backgroundColor: `${C.green}1f`, color: C.green }}><RotateCcw size={11} /> Remettre</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Catégories repliables */}
            {groups.map((g) => {
              const meta = catMeta(g.k), isOpen = !collapsed.has(g.k);
              return (
                <div key={g.k} className="overflow-hidden rounded-2xl" style={cardStyle()}>
                  <button onClick={() => toggleCat(g.k)} className="flex w-full items-center gap-2 px-3.5 py-3 active:opacity-80">
                    <span>{meta.emoji}</span>
                    <span className="text-sm font-bold" style={{ color: C.ink }}>{meta.label}</span>
                    <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={{ backgroundColor: `${meta.color}1f`, color: meta.color }}>{g.items.length}</span>
                    <ChevronDown size={16} style={{ color: C.muted, marginLeft: "auto", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
                  </button>
                  {isOpen && (
                    <div className="px-3.5 pb-2" style={{ borderTop: `1px solid ${C.line}` }}>
                      {g.items.map((it) => (
                        <div key={it.id} onClick={() => setAction(it)} className="flex cursor-pointer items-center gap-2 py-2" style={{ borderBottom: `1px solid ${C.line}` }}>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm" style={{ color: C.ink }}>{it.name}</span>
                            {dens(it) && <span className="block text-[11px] tabular-nums" style={{ color: C.muted }}>{dens(it)}</span>}
                          </span>
                          <button onClick={(ev) => { ev.stopPropagation(); onToggle(it.id); }} className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold active:scale-95" style={{ backgroundColor: `${C.green}1f`, color: C.green }} aria-label="Passer en rupture">
                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: C.green }} /> Dispo
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <p className="px-1 text-[11px] leading-relaxed" style={{ color: C.muted }}>Tape le chip <b style={{ color: C.green }}>Dispo</b> pour passer en rupture (1 tap). Tape un <b style={{ color: C.ink }}>aliment</b> pour le modifier ou le supprimer. L'assistant peut n'utiliser qu'une <b style={{ color: C.ink }}>partie</b> d'un aliment grâce à la densité /100.</p>
          </>
        )}
      </div>
    </div>

    {/* Sélecteur d'ajout : scan/recherche ou à la main */}
    {addOpen && (
      <Sheet open onClose={() => setAddOpen(false)} title="Ajouter au frigo" subtitle="Comment ?" icon={<Plus size={18} />} iconColor={C.green} z={50}>
        <div className="space-y-2">
          <button onClick={() => { setAddOpen(false); setScanning(true); }} className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3.5 text-left active:scale-95" style={{ backgroundColor: `${C.weight}14`, border: `1px solid ${C.weight}33` }}>
            <Search size={19} style={{ color: C.weight }} /><span><span className="block text-sm font-bold" style={{ color: C.ink }}>Chercher un produit</span><span className="block text-[11px]" style={{ color: C.muted }}>Par nom dans Open Food Facts (scan aussi dispo)</span></span>
          </button>
          <button onClick={() => { setAddOpen(false); setF(blank); setAdding(true); }} className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3.5 text-left active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
            <Keyboard size={19} style={{ color: C.sub }} /><span><span className="block text-sm font-bold" style={{ color: C.ink }}>À la main</span><span className="block text-[11px]" style={{ color: C.muted }}>Nom, quantité, densité /100</span></span>
          </button>
        </div>
      </Sheet>
    )}

    {/* Sheet d'actions d'un aliment (tap sur la ligne) */}
    {action && (
      <Sheet open onClose={closeAction} title={action.name} subtitle={dens(action) || "sans densité"} icon={<Pencil size={18} />} iconColor={C.weight} z={50}>
        {editId === action.id ? (
          <>
            {Fields({ v: e, on: setEd })}
            <button onClick={saveEdit} className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white active:scale-95" style={{ backgroundColor: C.green }}><Check size={16} /> Enregistrer</button>
          </>
        ) : (
          <div className="space-y-2">
            <button onClick={() => startEdit(action)} className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
              <Pencil size={17} style={{ color: C.weight }} /><span className="text-sm font-bold" style={{ color: C.ink }}>Modifier les valeurs</span>
            </button>
            <button onClick={() => { onToggle(action.id); closeAction(); }} className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
              {action.out ? <><RotateCcw size={17} style={{ color: C.green }} /><span className="text-sm font-bold" style={{ color: C.ink }}>Remettre en dispo</span></> : <><span className="h-3.5 w-3.5 rounded-full" style={{ border: `2px solid ${C.muted}` }} /><span className="text-sm font-bold" style={{ color: C.ink }}>Mettre en rupture</span></>}
            </button>
            <button onClick={() => { onRemove(action.id); closeAction(); }} className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left active:scale-95" style={{ backgroundColor: `${C.over}14`, border: `1px solid ${C.over}33` }}>
              <Trash2 size={17} style={{ color: C.over }} /><span className="text-sm font-bold" style={{ color: C.over }}>Supprimer</span>
            </button>
          </div>
        )}
      </Sheet>
    )}

    {/* Ajout à la main */}
    {adding && (
      <Sheet open onClose={() => setAdding(false)} title="Ajouter au frigo" subtitle="à la main" icon={<Plus size={18} />} iconColor={C.green} z={50}>
        {Fields({ v: f, on: set })}
        <button onClick={add} disabled={!f.name.trim()} className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white active:scale-95 disabled:opacity-50" style={{ backgroundColor: C.green }}><Plus size={16} /> Ajouter</button>
      </Sheet>
    )}

    {/* Scan / recherche OFF */}
    {scanning && (
      <Sheet open onClose={() => setScanning(false)} title="Ajouter au frigo" subtitle="Chercher ou scanner" icon={<ScanLine size={18} />} iconColor={C.weight} onBack={() => setScanning(false)} z={50}>
        <p className="mb-3 text-xs" style={{ color: C.sub }}>Cherche un produit ou scanne son code-barres, puis « Ajouter » — il rejoint directement ton frigo (nom, quantité du paquet et macros /100 repris automatiquement, éditables ensuite).</p>
        <OffSearch C={C} accent={C.weight} onChoose={(it) => { onAdd(stripQty(it.name), { unit: it.unit || "g", qty: parsePkg(it.pkgQty, it.unit), kcal100: it.per100?.kcal, p100: it.per100?.p }); setScanning(false); }} />
      </Sheet>
    )}

    {/* Scan code-barres DIRECT (1 tap depuis le frigo → ajout auto) */}
    {scanDirect && (
      <div style={{ position: "fixed", inset: 0, zIndex: 55, background: C.bg, backgroundImage: C.bgImage, display: "flex", flexDirection: "column", justifyContent: "center", padding: 16, paddingTop: "calc(env(safe-area-inset-top) + 16px)" }}>
        <div className="mx-auto w-full max-w-md">
          <p className="mb-3 text-center text-xs" style={{ color: C.sub }}>Scanne un produit — il rejoint ton frigo avec ses macros /100. Tu ajusteras la quantité ensuite (tap sur l'aliment).</p>
          <BarcodeScanner onDetect={onScanCode} onClose={() => setScanDirect(false)} />
        </div>
      </div>
    )}
    </>
  );
}
