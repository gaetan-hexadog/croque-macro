import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Share2, Check, ScanLine, Plus, Pencil, Trash2, RotateCcw, ShoppingCart, Keyboard, Search, Sparkles, Loader2, X, ChefHat, AlertTriangle, CalendarClock } from "lucide-react";
import { C, cardStyle, itemCat, catMeta, CAT_ORDER, expiryMeta, daysUntil, protStock, addDays, TODAY, getRefAliases, learnRefAlias } from "../core.js";
import { Sheet } from "../components/Sheet.jsx";
import OffSearch from "../components/OffSearch.jsx";
import { BarcodeScanner } from "../components/BarcodeScanner.jsx";
import { fetchProductByBarcode } from "../lib/openfoodfacts.js";
import { estimateFoodMacros } from "../lib/assistant.js";
import { formatPantryText, shareOrCopy } from "../lib/share.js";
import { AssistantBar } from "../components/AssistantBar.jsx";
import { PantryList } from "../components/PantryList.jsx";
import { matchPantryItem, normalizeName } from "../lib/engine/linking.js";
import { getLibrarySync } from "../lib/library.js";

// Adaptateur LOCAL (pas dans engine/) : la base foods actuelle (pool de library.js)
// → format référentiel attendu par le moteur ({ slug, nom }). Provisoire, en
// attendant le vrai référentiel ingrédients (spec § 2.1) — la liaison, elle
// (ref_id + alias appris), est déjà la définitive.
const buildReferentiel = () => (getLibrarySync().pool || []).filter((f) => f && f.id && f.name).map((f) => ({ slug: f.id, nom: f.name }));

const deburr = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// Form partagé (ajout + édition) avec estimation auto des macros /100 + date de péremption.
function PantryFields({ v, on, onFill, onSubmit }) {
  const [est, setEst] = useState("idle");
  const fld = { backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink };
  const u = v.unit === "ml" ? "ml" : v.unit === "pièce" ? "pièce" : "g";
  const canEstimate = !!v.name.trim() && u !== "pièce";
  const estimate = async () => {
    if (!canEstimate) return;
    setEst("loading");
    try { const r = await estimateFoodMacros(v.name.trim(), u); onFill(r); setEst("idle"); }
    catch { setEst("error"); }
  };
  const setExp = (val) => on("exp")({ target: { value: val } });
  return (
    <>
      <input value={v.name} onChange={on("name")} onKeyDown={(ev) => { if (ev.key === "Enter" && onSubmit) onSubmit(); }} placeholder="Nom (ex. riz basmati, graines de courge)…" className="mb-2 w-full rounded-xl px-3.5 py-3 text-sm outline-none" style={fld} />
      <div className="mb-2 flex gap-2">
        <input value={v.qty} onChange={on("qty")} inputMode="decimal" placeholder="Quantité que j'ai" className="min-w-0 flex-1 rounded-xl px-3.5 py-3 text-sm outline-none" style={fld} />
        <select value={v.unit} onChange={on("unit")} className="rounded-xl px-2 py-2.5 text-sm outline-none" style={fld}>
          <option value="g">g</option><option value="ml">ml</option><option value="pièce">pièce</option>
        </select>
      </div>
      <button onClick={estimate} disabled={!canEstimate || est === "loading"} className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold active:scale-95 disabled:opacity-50" style={{ backgroundColor: `${C.accent}14`, color: C.accent, border: `1px solid ${C.accent}40` }}>
        {est === "loading" ? <><Loader2 size={14} className="animate-spin" /> Recherche des valeurs…</> : <><Sparkles size={14} /> Trouver les valeurs /100 {u}</>}
      </button>
      {est === "error" && <p className="mb-2 text-[11px]" style={{ color: C.over }}>Estimation indisponible — saisis les valeurs à la main.</p>}
      <div className="mb-3 flex gap-2">
        <input value={v.kcal100} onChange={on("kcal100")} inputMode="numeric" placeholder={`kcal /100${u}`} className="min-w-0 flex-1 rounded-xl px-3.5 py-3 text-sm outline-none" style={fld} />
        <input value={v.p100} onChange={on("p100")} inputMode="numeric" placeholder={`prot. /100${u}`} className="min-w-0 flex-1 rounded-xl px-3.5 py-3 text-sm outline-none" style={fld} />
      </div>
      {/* Péremption — anti-gaspi (facultatif) */}
      <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold" style={{ color: C.muted }}><CalendarClock size={13} /> Date de péremption (facultatif)</p>
      <div className="mb-3 flex gap-1.5">
        <input type="date" value={v.exp || ""} onChange={on("exp")} className="min-w-0 flex-1 rounded-xl px-3 py-2.5 text-sm outline-none" style={fld} />
        {[["+3 j", 3], ["1 sem", 7], ["2 sem", 15]].map(([l, n]) => <button key={l} onClick={() => setExp(addDays(TODAY, n))} className="rounded-xl px-2.5 text-xs font-bold active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }}>{l}</button>)}
        {v.exp && <button onClick={() => setExp("")} className="rounded-xl px-2 text-xs font-bold active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.muted }}><X size={13} /></button>}
      </div>
    </>
  );
}

// Stepper de stock à pas adaptatif : pièce → ±1 ; sinon ±10 (<100), ±25 (<500), ±50 au-delà.
function StockStepper({ it, onSet }) {
  const v = Number(it.qty) || 0;
  const u = it.unit === "ml" ? "ml" : it.unit === "pièce" ? "pièce" : "g";
  const inc = u === "pièce" ? 1 : v < 100 ? 10 : v < 500 ? 25 : 50;
  const dec = u === "pièce" ? 1 : v <= 100 ? 10 : v <= 500 ? 25 : 50;
  return (
    <div className="inline-flex items-center rounded-lg p-0.5" style={{ border: `1px solid ${C.line}`, backgroundColor: C.card }}>
      <button onClick={() => onSet(Math.max(0, Math.round((v - dec) * 10) / 10))} className="flex h-8 w-8 items-center justify-center rounded text-lg font-bold active:scale-90" style={{ color: v > 0 ? C.ink : C.line }}>−</button>
      <span className="text-center text-sm font-bold tabular-nums" style={{ color: C.ink, minWidth: "4.2rem" }}>{String(v).replace(".", ",")} <span className="text-[10px] font-medium" style={{ color: C.muted }}>{u}</span></span>
      <button onClick={() => onSet(Math.round((v + inc) * 10) / 10)} className="flex h-8 w-8 items-center justify-center rounded text-lg font-bold active:scale-90" style={{ color: C.green }}>+</button>
    </div>
  );
}

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

// Frigo/placard — PAGE plein écran (design lab F1) : recherche + « à consommer vite » (anti-gaspi
// avec CTA cuisiner) + filtres catégorie + LISTE À PLAT recherchable, badges de péremption.
export function PantrySheet({ pantry = [], onAdd, onToggle, onUpdate, onRemove, onClose, onShop, onCook, onAssistant }) {
  const blank = { name: "", unit: "g", qty: "", kcal100: "", p100: "", exp: "" };
  const [f, setF] = useState(blank);
  const [q, setQ] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanDirect, setScanDirect] = useState(false);
  const [flash, setFlash] = useState(null);
  const [adding, setAdding] = useState(false);
  const [shared, setShared] = useState("");
  const [action, setAction] = useState(null);
  const [editId, setEditId] = useState(null);
  const [e, setE] = useState(blank);

  const set = (k) => (ev) => setF((s) => ({ ...s, [k]: ev.target.value }));
  const setEd = (k) => (ev) => setE((s) => ({ ...s, [k]: ev.target.value }));
  const share = async () => { const r = await shareOrCopy(formatPantryText(pantry), "Mon frigo"); if (r === "copied" || r === "shared") { setShared(r === "copied" ? "Copié" : "Partagé"); setTimeout(() => setShared(""), 2000); } };
  const add = () => { if (!f.name.trim()) return; onAdd(f.name.trim(), { unit: f.unit, qty: num(f.qty), kcal100: num(f.kcal100), p100: num(f.p100), exp: f.exp || undefined }); setF(blank); setAdding(false); };
  const startEdit = (it) => { setEditId(it.id); setE({ name: it.name, unit: it.unit || "g", qty: it.qty ?? "", kcal100: it.kcal100 ?? "", p100: it.p100 ?? "", exp: it.exp || "" }); };
  const saveEdit = () => { onUpdate && onUpdate(editId, { name: e.name.trim() || undefined, unit: e.unit, qty: Math.round(num(e.qty) * 10) / 10 || undefined, kcal100: Math.round(num(e.kcal100)) || undefined, p100: Math.round(num(e.p100) * 10) / 10 || undefined, exp: e.exp || "" }); setEditId(null); setAction(null); };
  const closeAction = () => { setAction(null); setEditId(null); };
  const showFlash = (text, ok = true) => { setFlash({ text, ok }); setTimeout(() => setFlash(null), 2600); };
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

  const dens = (it) => {
    const q2 = it.qty ? `${it.qty} ${it.unit || "g"}` : "";
    const d = (it.kcal100 || it.p100) ? `${it.kcal100 || "?"}·${it.p100 ?? "?"} /100${it.unit || "g"}` : "";
    return [q2, d].filter(Boolean).join(" · ");
  };

  const dispo = pantry.filter((x) => !x.out), rupture = pantry.filter((x) => x.out);
  const urgent = dispo.filter((x) => expiryMeta(x.exp)?.urgent).sort((a, b) => (daysUntil(a.exp) ?? 9999) - (daysUntil(b.exp) ?? 9999));

  // ── Liaison pantry → référentiel (spec § 3.1) ──────────────────────────────
  const referentiel = useMemo(buildReferentiel, []);
  const refNames = useMemo(() => Object.fromEntries(referentiel.map((r) => [r.slug, r.nom])), [referentiel]);
  // Liaison SILENCIEUSE au fil de l'eau : exact/alias ≥ 0,9 uniquement — jamais
  // fuzzy (confirmation requise). Un ref_id existant n'est JAMAIS écrasé (l'édition
  // le conserve aussi : updatePantry patche sans toucher aux clés absentes).
  useEffect(() => {
    if (!onUpdate) return;
    for (const it of pantry) {
      if (!it || it.ref_id) continue;
      const m = matchPantryItem(it.name, referentiel, getRefAliases());
      if (m && m.kind !== "fuzzy" && m.confidence >= 0.9) onUpdate(it.id, { ref_id: m.refId });
    }
  }, [pantry, referentiel, onUpdate]);
  // Suggestions fuzzy (≥ 0,6) pour les items non reliés → chip « ≈ nom ? Lier ».
  const fuzzyFor = useMemo(() => {
    const out = {};
    for (const it of pantry) {
      if (!it || it.ref_id || it.out) continue;
      const m = matchPantryItem(it.name, referentiel, getRefAliases());
      if (m && m.kind === "fuzzy") out[it.id] = m;
    }
    return out;
  }, [pantry, referentiel]);
  // Confirmation en 1 tap = liaison + alias appris (la même saisie se liera seule).
  const confirmLink = (it, m) => {
    onUpdate && onUpdate(it.id, { ref_id: m.refId });
    learnRefAlias(normalizeName(it.name), m.refId);
    showFlash(`« ${it.name} » lié à ${refNames[m.refId] || m.refId} ✓`);
  };
  const unlinked = dispo.filter((x) => !x.ref_id).length;
  const nq = deburr(q);
  const filtered = dispo.filter((x) => (!nq || deburr(x.name).includes(nq)));

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 40, background: C.bg, backgroundImage: C.bgImage, display: "flex", flexDirection: "column" }}>
        <div className="flex items-center gap-3 px-4 pb-3" style={{ paddingTop: "calc(env(safe-area-inset-top) + 14px)", borderBottom: `1px solid ${C.line}` }}>
          <button onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }} aria-label="Retour"><ChevronLeft size={20} /></button>
          <div className="min-w-0 flex-1">
            <p className="text-base font-extrabold" style={{ color: C.ink, fontFamily: "'Space Grotesk', system-ui" }}>Mon frigo / placard</p>
            <p className="text-xs" style={{ color: C.muted }}>{dispo.length} dispo{dispo.length ? ` · ~${protStock(dispo)} g prot.` : ""}{rupture.length ? ` · ${rupture.length} à racheter` : ""}</p>
          </div>
          <button onClick={() => { setFlash(null); setScanDirect(true); }} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white active:scale-90" style={{ background: `linear-gradient(150deg, ${C.weight}, ${C.weight}cc)` }} aria-label="Scanner"><ScanLine size={18} /></button>
          <button onClick={() => setAddOpen(true)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }} aria-label="Ajouter"><Plus size={18} /></button>
        </div>

        <div className="mx-auto w-full max-w-md flex-1 space-y-3 overflow-y-auto px-4 pb-10 pt-3" style={{ scrollbarWidth: "none" }}>
          {/* Recherche */}
          <div className="relative">
            <Search size={16} style={{ color: C.muted, position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
            <input value={q} onChange={(ev) => setQ(ev.target.value)} placeholder="Chercher dans mon frigo…" className="w-full rounded-2xl py-3 pl-9 pr-9 text-sm outline-none" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }} />
            {q && <button onClick={() => setQ("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: C.muted }}><X size={16} /></button>}
          </div>

          {flash && <div className="rounded-2xl px-3 py-2.5 text-center text-sm font-semibold" style={{ backgroundColor: flash.ok ? `${C.green}1f` : `${C.over}1f`, color: flash.ok ? C.green : C.over }}>{flash.text}</div>}

          {/* Anti-gaspi : à consommer vite + cuisiner avec ça */}
          {urgent.length > 0 && !nq && (
            <div className="rounded-2xl p-3" style={{ backgroundColor: `${C.over}12`, border: `1px solid ${C.over}33` }}>
              <span className="flex items-center gap-1.5"><AlertTriangle size={13} style={{ color: C.over }} /><span className="text-[11px] font-extrabold uppercase tracking-widest" style={{ color: C.over }}>À consommer vite · {urgent.length}</span></span>
              <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
                {urgent.map((it) => { const b = expiryMeta(it.exp); return <button key={it.id} onClick={() => setAction(it)} className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold active:scale-95" style={{ backgroundColor: `${b.col}1a`, color: b.col, border: `1px solid ${b.col}44` }}>{it.name} · {b.txt}</button>; })}
              </div>
              {onCook && <button onClick={() => onCook(urgent.slice(0, 6).map((it) => it.name))} className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-extrabold text-white active:scale-95" style={{ backgroundColor: C.over }}><ChefHat size={15} /> Cuisiner avec ça ✨</button>}
            </div>
          )}

          {/* Courses & réappro — bloc slim : header 1 ligne, actions en petits icônes
              (idées courses + export texte), « à racheter » en rangée de chips qui scrolle
              → hauteur constante même à 30 produits. Tap un chip = ranger/remettre. */}
          {(rupture.length > 0 || onShop) && (
            <div className="rounded-2xl px-3 py-2.5" style={cardStyle()}>
              <div className="flex items-center gap-2">
                <ShoppingCart size={14} style={{ color: C.warn }} />
                <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: C.warn }}>{rupture.length ? `À racheter · ${rupture.length}` : "Courses & réappro"}</span>
                <div className="ml-auto flex items-center gap-1">
                  {onShop && <button onClick={onShop} title="Idées courses pour varier" aria-label="Idées courses" className="flex h-7 w-7 items-center justify-center rounded-lg active:scale-90" style={{ backgroundColor: `${C.green}1f`, border: `1px solid ${C.green}44`, color: C.green }}><Sparkles size={13} /></button>}
                  <button onClick={share} title="Exporter en texte" aria-label="Exporter le frigo en texte" className="flex h-7 w-7 items-center justify-center rounded-lg active:scale-90" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }}><Share2 size={13} /></button>
                </div>
              </div>
              {rupture.length > 0 && (
                <>
                  <div className="mt-1.5 flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
                    {rupture.map((it) => (
                      <button key={it.id} onClick={() => onToggle(it.id)} title="De retour au frigo" className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }}><RotateCcw size={10} style={{ color: C.green }} /> {it.name}</button>
                    ))}
                  </div>
                  <p className="mt-1 text-[10px]" style={{ color: C.muted }}>Racheté ? Tape le produit : il revient en stock (pense à ajuster sa quantité).</p>
                </>
              )}
              {shared && <p className="mt-1.5 text-[11px] font-semibold" style={{ color: C.green }}>{shared} ✓</p>}
            </div>
          )}

          {pantry.length === 0 ? (
            <p className="py-8 text-center text-sm" style={{ color: C.muted }}>Aucun aliment pour l'instant — scanne ou ajoute ce que tu as.</p>
          ) : (
            <>
              {/* Compteur discret de liaison au référentiel (moteur de repas, § 3.1). */}
              {unlinked > 0 && !nq && <p className="px-1 text-[11px]" style={{ color: C.muted }}>{unlinked} aliment{unlinked > 1 ? "s" : ""} non relié{unlinked > 1 ? "s" : ""}</p>}
              {/* LE rendu frigo unique (partagé avec la pioche) : rayons, péremption, tri urgent. */}
              <PantryList items={dispo} query={q} onTap={setAction} emptyText={nq ? "Rien ne correspond." : "Aucun aliment dispo."}
                chip={(it) => { const m = fuzzyFor[it.id]; return m ? (
                  <button onClick={(ev) => { ev.stopPropagation(); confirmLink(it, m); }} className="rounded-full px-2 py-0.5 text-[10px] font-bold active:scale-95" style={{ backgroundColor: `${C.weight}14`, color: C.weight, border: `1px solid ${C.weight}33` }} aria-label={`Lier à ${refNames[m.refId]}`}>≈ {refNames[m.refId]} ? Lier</button>
                ) : null; }}
                right={(it) => (
                  <button onClick={(ev) => { ev.stopPropagation(); onToggle(it.id); showFlash(`${it.name} → à racheter (tape-le en haut pour annuler)`); }} className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold active:scale-95" style={{ backgroundColor: `${C.green}1f`, color: C.green }} aria-label="Plus en stock ? Passe en rupture">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: C.green }} /> En stock
                  </button>
                )} />
              {filtered.length > 0 && <p className="px-1 text-[11px] leading-relaxed" style={{ color: C.muted }}>Tape un <b style={{ color: C.ink }}>aliment</b> pour ajuster son stock, le ranger ou lui donner une date. Le chip <b style={{ color: C.green }}>En stock</b> le passe en rupture (« à racheter »).</p>}
            </>
          )}
        </div>
        {/* Barre assistant persistante (direction F) */}
        {onAssistant && (
          <div className="mx-auto w-full max-w-md px-4" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}>
            <AssistantBar onSend={onAssistant} placeholder="Qu'est-ce que je fais avec ça ?" />
          </div>
        )}
      </div>

      {/* Sélecteur d'ajout */}
      {addOpen && (
        <Sheet open onClose={() => setAddOpen(false)} title="Ajouter au frigo" subtitle="Comment ?" icon={<Plus size={18} />} iconColor={C.green} z={50}>
          <div className="space-y-2">
            <button onClick={() => { setAddOpen(false); setScanning(true); }} className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3.5 text-left active:scale-95" style={{ backgroundColor: `${C.weight}14`, border: `1px solid ${C.weight}33` }}>
              <Search size={19} style={{ color: C.weight }} /><span><span className="block text-sm font-bold" style={{ color: C.ink }}>Chercher un produit</span><span className="block text-[11px]" style={{ color: C.muted }}>Par nom dans Open Food Facts (scan aussi dispo)</span></span>
            </button>
            <button onClick={() => { setAddOpen(false); setF(blank); setAdding(true); }} className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3.5 text-left active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
              <Keyboard size={19} style={{ color: C.sub }} /><span><span className="block text-sm font-bold" style={{ color: C.ink }}>À la main</span><span className="block text-[11px]" style={{ color: C.muted }}>Nom, quantité, densité, péremption</span></span>
            </button>
          </div>
        </Sheet>
      )}

      {/* Sheet d'actions d'un aliment */}
      {action && (() => { const b = expiryMeta(action.exp); return (
        <Sheet open onClose={closeAction} title={action.name} subtitle={[dens(action) || "sans densité", b && b.txt ? `périme : ${b.txt}` : null].filter(Boolean).join(" · ")} icon={<Pencil size={18} />} iconColor={C.weight} z={50}>
          {editId === action.id ? (
            <>
              <PantryFields v={e} on={setEd} onFill={(r) => setE((s) => ({ ...s, kcal100: String(r.kcal100), p100: String(r.p100) }))} onSubmit={saveEdit} />
              <button onClick={saveEdit} className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white active:scale-95" style={{ backgroundColor: C.green }}><Check size={16} /> Enregistrer</button>
            </>
          ) : (
            <div className="space-y-2">
              {/* Stock direct : ± sans passer par « Modifier » (2 taps au lieu de 4). */}
              <div className="flex items-center justify-between rounded-2xl px-3.5 py-3" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
                <span className="text-xs font-semibold" style={{ color: C.muted }}>Stock restant</span>
                <StockStepper it={action} onSet={(v) => { onUpdate && onUpdate(action.id, { qty: v, out: v > 0 ? false : action.out }); setAction((a) => (a ? { ...a, qty: v, out: v > 0 ? false : a.out } : a)); }} />
              </div>
              <div className="rounded-2xl px-3.5 py-3" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
                <p className="mb-2 text-xs font-semibold" style={{ color: C.muted }}>Ranger dans…</p>
                <div className="flex flex-wrap gap-1.5">
                  {CAT_ORDER.map((k) => { const m = catMeta(k), on = itemCat(action) === k; return (
                    <button key={k} onClick={() => { onUpdate && onUpdate(action.id, { cat: k }); closeAction(); }} className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-bold active:scale-95" style={on ? { backgroundColor: m.color, color: "#fff" } : { backgroundColor: `${m.color}1a`, color: m.color, border: `1px solid ${m.color}33` }}>
                      <span>{m.emoji}</span> {m.label}
                    </button>
                  ); })}
                </div>
              </div>
              <button onClick={() => startEdit(action)} className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
                <Pencil size={17} style={{ color: C.weight }} /><span className="text-sm font-bold" style={{ color: C.ink }}>Modifier (valeurs, date…)</span>
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
      ); })()}

      {/* Ajout à la main */}
      {adding && (
        <Sheet open onClose={() => setAdding(false)} title="Ajouter au frigo" subtitle="à la main" icon={<Plus size={18} />} iconColor={C.green} z={50}>
          <PantryFields v={f} on={set} onFill={(r) => setF((s) => ({ ...s, kcal100: String(r.kcal100), p100: String(r.p100) }))} onSubmit={add} />
          <button onClick={add} disabled={!f.name.trim()} className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white active:scale-95 disabled:opacity-50" style={{ backgroundColor: C.green }}><Plus size={16} /> Ajouter</button>
        </Sheet>
      )}

      {/* Scan / recherche OFF */}
      {scanning && (
        <Sheet open onClose={() => setScanning(false)} title="Ajouter au frigo" subtitle="Chercher ou scanner" icon={<ScanLine size={18} />} iconColor={C.weight} onBack={() => setScanning(false)} z={50}>
          <p className="mb-3 text-xs" style={{ color: C.sub }}>Cherche un produit ou scanne son code-barres, puis « Ajouter » — il rejoint directement ton frigo (nom, quantité et macros /100 repris, éditables ensuite).</p>
          <OffSearch C={C} accent={C.weight} onChoose={(it) => { onAdd(stripQty(it.name), { unit: it.unit || "g", qty: parsePkg(it.pkgQty, it.unit), kcal100: it.per100?.kcal, p100: it.per100?.p }); setScanning(false); }} />
        </Sheet>
      )}

      {/* Scan code-barres DIRECT */}
      {scanDirect && (
        <div style={{ position: "fixed", inset: 0, zIndex: 55, background: C.bg, backgroundImage: C.bgImage, display: "flex", flexDirection: "column", justifyContent: "center", padding: 16, paddingTop: "calc(env(safe-area-inset-top) + 16px)" }}>
          <div className="mx-auto w-full max-w-md">
            <p className="mb-3 text-center text-xs" style={{ color: C.sub }}>Scanne un produit — il rejoint ton frigo avec ses macros /100. Tu ajusteras quantité et date ensuite (tap sur l'aliment).</p>
            <BarcodeScanner onDetect={onScanCode} onClose={() => setScanDirect(false)} />
          </div>
        </div>
      )}
    </>
  );
}

export default PantrySheet;
