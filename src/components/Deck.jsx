import React, { useState, useMemo } from "react";
import { ArrowLeft, Search, X, Plus, Trash2, GlassWater, UtensilsCrossed, ScanLine, Pencil, ChevronDown, ChevronRight, Sparkles, Clock, Flame, Soup, Refrigerator, Cookie, Camera, Wand2, RotateCcw } from "lucide-react";
import { SLOTS, C, SLOT_UI, newId, scoreProduct } from "../core.js";

// Petites prefs UI locales du shake (dernière prépa, dernier shake) — sync, non synchronisé.
const lsGet = (k) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
import OffSearch from "./OffSearch.jsx";
import { Sheet } from "./Sheet.jsx";
import { AddRecipeSheet } from "../sheets/RecipeForm.jsx";
import { ProductVerdict } from "./ProductVerdict.jsx";
import { FrigoPick } from "./FrigoPick.jsx";

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

// Calculateur de portions générique : l'input s'adapte à l'unité du produit.
// - mesuré (g/ml) : champ quantité (g/ml), raccourcis servings remplissent le champ.
// - compté (portion/dose) : raccourcis servings + stepper fractions (½, ¼…).
// Macros = base (food.kcal/p pour food.per) × facteur. Tout vient de la data.
function ServingPicker({ food, accent, onChoose, onClose }) {
  const unit = food.unit || "portion";
  const per = food.per || 1;
  const servings = Array.isArray(food.servings) ? food.servings : [];
  const measured = unit === "g" || unit === "ml";
  const [sel, setSel] = useState(servings.length ? 0 : -1);
  const [amount, setAmount] = useState(String(food.default_amount ?? per));
  const [qty, setQty] = useState(1);
  const numA = Math.max(0, parseFloat(String(amount).replace(",", ".")) || 0);
  const fmtQ = (v) => (v === 0.25 ? "¼" : v === 0.5 ? "½" : v === 0.75 ? "¾" : v === 1.5 ? "1½" : String(v).replace(".", ","));
  const svFactor = (sv) => (sv.factor != null ? sv.factor : sv.amount != null ? sv.amount / per : 1);

  let factor, label;
  if (measured) {
    factor = numA / per;
    label = `${food.name} (${numA} ${unit})`;
  } else if (servings.length && sel >= 0) {
    factor = svFactor(servings[sel]) * qty;
    label = `${food.name} · ${servings[sel].label}${qty !== 1 ? ` ×${fmtQ(qty)}` : ""}`;
  } else {
    factor = qty;
    label = `${food.name}${qty !== 1 ? ` ×${fmtQ(qty)}` : ""}`;
  }
  const kcal = Math.round(food.kcal * factor), p = Math.round(food.p * factor);
  const QO = [0.25, 0.5, 1, 1.5, 2, 3];
  const fld = { backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink };

  return (
    <Sheet open onClose={onClose} z={40} title={food.name}>
      {servings.length > 0 && !measured && (
        <>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: C.muted }}>Format</p>
          <div className="mb-3 flex flex-wrap gap-2">
            {servings.map((sv, i) => (
              <button key={i} onClick={() => setSel(i)} className="rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95" style={i === sel ? { backgroundColor: accent, color: "#fff" } : { backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.sub }}>{sv.label}</button>
            ))}
          </div>
        </>
      )}

      {measured ? (
        <>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: C.muted }}>Quantité</p>
          <div className="mb-2 flex items-center gap-2 rounded-xl px-3 py-2.5" style={fld}>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" autoFocus className="w-full bg-transparent text-sm outline-none" style={{ color: C.ink }} />
            <span className="shrink-0 text-sm" style={{ color: C.muted }}>{unit}</span>
          </div>
          {servings.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {servings.map((sv, i) => (
                <button key={i} onClick={() => setAmount(String(sv.amount ?? per))} className="rounded-full px-3 py-1.5 text-xs font-medium active:scale-95" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.sub }}>{sv.label}</button>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: C.muted }}>Quantité</p>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {QO.map((o) => (
              <button key={o} onClick={() => setQty(o)} className="rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95" style={o === qty ? { backgroundColor: accent, color: "#fff" } : { backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.sub }}>{fmtQ(o)}</button>
            ))}
          </div>
        </>
      )}

      <div className="mb-3 flex items-center justify-between rounded-2xl px-4 py-3" style={{ backgroundColor: C.paper }}>
        <div className="leading-tight" style={{ fontVariantNumeric: "tabular-nums" }}>
          <p className="text-2xl font-extrabold" style={{ color: C.ink }}>{kcal} <span className="text-sm font-medium" style={{ color: C.sub }}>kcal</span></p>
          <p className="text-xs font-semibold" style={{ color: C.protein }}>{p} g protéines</p>
        </div>
        <button onClick={() => onChoose({ id: `${food.id}-${Date.now()}`, name: label, kcal, p, qty: 1 })} disabled={factor <= 0} className="flex items-center gap-1.5 rounded-2xl px-5 py-2.5 text-sm font-bold text-white active:scale-95" style={{ backgroundColor: factor > 0 ? accent : C.line }}><Plus size={16} /> Ajouter</button>
      </div>
    </Sheet>
  );
}

function ChipBtn({ m, onChoose }) {
  return <button onClick={() => onChoose(m)} className="rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }}>{m.name} <span style={{ color: C.muted }}>{m.kcal}</span></button>;
}

// Moyen d'entrée compact (P2) : icône + petit label, au lieu d'un gros bouton plein.
function MethodBtn({ icon: Icon, color, label, onClick }) {
  // Carte pleine : toute la cellule est tappable (≥ 60px de haut), pas juste l'icône.
  return (
    <button onClick={onClick} className="flex flex-col items-center justify-center gap-1.5 rounded-2xl py-3.5 active:scale-95" style={{ backgroundColor: `${color}14`, border: `1px solid ${C.line}` }}>
      <Icon size={22} style={{ color }} />
      <span className="text-[10.5px] font-semibold leading-none" style={{ color: C.sub }}>{label}</span>
    </button>
  );
}

export function Deck({ slotKey, rankFor, fitOf, slotTarget, pool = [], usage = {}, combos = [], pantry = [], presets = [], onChoose, onAddExtra, onApplyCombo, onDeleteCombo, bases = [], liquids = [], recipes = [], onAddRecipe, shakeBases = [], shakeLiquids = [], onAddShakeBase, onDelShakeBase, onAddShakeLiquid, onDelShakeLiquid, onSave, onDeleteCustom, onClose, habituals = [], onQuickAdd, onPhotoLog, onAssist }) {
  const ui = SLOT_UI[slotKey];
  const [q, setQ] = useState("");
  const [panel, setPanel] = useState("main");          // main | shake | combos | off
  const [budgetOnly, setBudgetOnly] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [browseAll, setBrowseAll] = useState(false);
  const [cName, setCName] = useState(""); const [cKcal, setCKcal] = useState(""); const [cP, setCP] = useState("");
  const [cF, setCF] = useState(""); const [cS, setCS] = useState("");
  const [servingFor, setServingFor] = useState(null);
  const [creatingRecipe, setCreatingRecipe] = useState(false);
  const slotRecipes = useMemo(() => recipes.filter((r) => (Array.isArray(r.slots) && r.slots.includes(slotKey)) || r.cat === slotKey), [recipes, slotKey]);
  // Piocher un aliment ouvre toujours le calculateur de quantité (fractions par
  // défaut ; g/ml ou formats/servings selon ce que le produit déclare).
  const pickFood = (m) => setServingFor(m);

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
  const allForSlot = useMemo(() => rankFor(slotKey, pool.filter((m) => m.slots.includes(slotKey))), [pool, slotKey, rankFor]);

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
    onChoose({ id: newId("custom"), name: cName.trim(), kcal: k, p: parseInt(cP, 10) || 0, c: null, f: cF !== "" ? parseFloat(cF) : null, desc: "Mon repas", tags: [], slots: [slotKey], custom: true });
    setCName(""); setCKcal(""); setCP(""); setCF(""); setCS(""); setCustomOpen(false);
  };
  const customValid = cName.trim() && !isNaN(parseInt(cKcal, 10));
  // Habituels pertinents pour ce créneau (les plus probables d'abord) — ajout 1 tap.
  const slotHab = (habituals || []).filter(Boolean).slice().sort((a, b) => (a.slot === slotKey ? -1 : 0) - (b.slot === slotKey ? -1 : 0)).slice(0, 6);

  return (
    <>
    <Sheet open onClose={onClose}
      icon={React.createElement(SLOTS[slotKey].icon, { size: 18 })} iconColor={ui.color}
      title={panel === "main" ? `Ajouter · ${SLOTS[slotKey].label}` : ({ shake: "Composer un shake", recipes: "Recettes", combos: "Mes repas", off: "Scanner un produit", frigo: "Mon frigo", plaisirs: "Petits plaisirs" }[panel] || "Ajouter")}
      subtitle={panel === "main" ? ui.time : undefined}
      onBack={panel !== "main" ? () => setPanel("main") : undefined}>
        <div>

          {panel === "main" && (
            <>
              <div className="mb-3 flex items-center gap-2 rounded-2xl px-3 py-2.5" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
                <Search size={16} style={{ color: C.muted }} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un aliment, un plat…" className="w-full bg-transparent text-sm outline-none" style={{ color: C.ink }} />
                {q && <button onClick={() => setQ("")} className="shrink-0 active:scale-90" style={{ color: C.muted }} aria-label="Effacer"><X size={15} /></button>}
              </div>

              {q.trim() ? (
                <>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: C.muted }}>{results.length} résultat{results.length > 1 ? "s" : ""}</p>
                    <button onClick={() => setBudgetOnly((v) => !v)} className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium active:scale-95" style={budgetOnly ? { backgroundColor: C.ink, color: C.paper } : { backgroundColor: C.card, color: C.sub, border: `1px solid ${C.line}` }}><Flame size={12} /> Dans le budget</button>
                  </div>
                  <div className="space-y-2">
                    {results.map((m) => <FoodRow key={m.id} m={m} accent={ui.color} fitColor={fitMeta[fitOf(m)].fg} onChoose={pickFood} onDelete={onDeleteCustom} />)}
                  </div>
                  <button onClick={() => setPanel("off")} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold active:scale-95" style={{ border: `1px dashed ${C.muted}`, color: C.sub }}>
                    <Search size={15} /> Chercher « {q.trim()} » dans Open Food Facts
                  </button>
                </>
              ) : (
                <>
                  {onQuickAdd && slotHab.length > 0 && (
                    <div className="mb-4">
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest" style={{ color: C.muted }}><Plus size={13} /> Tes habituels · 1 tap</p>
                      <div className="flex flex-wrap gap-1.5">
                        {slotHab.map((h) => (
                          <button key={h.name} onClick={() => { onQuickAdd(slotKey, h); onClose(); }} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }}>
                            {h.name} <span style={{ color: C.muted }}>{h.kcal}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* « Parcourir ma base » : suggéré + tout, replié par défaut (réduit le mur). */}
                  <button onClick={() => setBrowseAll((v) => !v)} className="mb-3 flex w-full items-center justify-between rounded-2xl px-3.5 py-2.5 text-sm font-semibold active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }}>
                    <span className="flex items-center gap-1.5"><Sparkles size={14} style={{ color: ui.color }} /> {browseAll ? "Réduire" : `Parcourir ma base (${allForSlot.length})`}</span>
                    <ChevronDown size={15} style={{ transform: browseAll ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
                  </button>
                  {browseAll && (
                    <div className="mb-2 space-y-2">
                      {suggestions.length > 0 && <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest" style={{ color: C.muted }}><Sparkles size={13} /> Suggéré pour ce repas</p>}
                      {suggestions.map((m) => <FoodRow key={`s-${m.id}`} m={m} accent={ui.color} fitColor={fitMeta[fitOf(m)].fg} onChoose={pickFood} onDelete={onDeleteCustom} />)}
                      {suggestions.length > 0 && <div className="h-2" />}
                      {allForSlot.map((m) => <FoodRow key={m.id} m={m} accent={ui.color} fitColor={fitMeta[fitOf(m)].fg} onChoose={pickFood} onDelete={onDeleteCustom} />)}
                    </div>
                  )}
                </>
              )}

              {/* Méthodes d'ajout — grille compacte (toujours visible). */}
              <p className="mb-2 mt-1 text-xs font-semibold uppercase tracking-widest" style={{ color: C.muted }}>Autre moyen</p>
              <div className="grid grid-cols-3 gap-2.5">
                {onAssist && <MethodBtn icon={Wand2} color={C.accent} label="Assistant" onClick={() => onAssist(slotKey)} />}
                {onPhotoLog && <MethodBtn icon={Camera} color={C.accent} label="Photo" onClick={onPhotoLog} />}
                <MethodBtn icon={ScanLine} color={C.weight} label="Scanner" onClick={() => setPanel("off")} />
                <MethodBtn icon={Soup} color={C.green} label="Recettes" onClick={() => setPanel("recipes")} />
                <MethodBtn icon={UtensilsCrossed} color={ui.color} label="Repas" onClick={() => setPanel("combos")} />
                <MethodBtn icon={Refrigerator} color={C.weight} label="Frigo" onClick={() => setPanel("frigo")} />
                <MethodBtn icon={GlassWater} color={C.protein} label="Shake" onClick={() => setPanel("shake")} />
                {slotKey === "snack" && onAddExtra ? <MethodBtn icon={Cookie} color={C.extra} label="Plaisirs" onClick={() => setPanel("plaisirs")} /> : null}
                <MethodBtn icon={Pencil} color={C.extra} label="Manuel" onClick={() => setCustomOpen(true)} />
              </div>

            </>
          )}

          {panel === "shake" && (
            <div>
              <ShakeBuilder embedded onAdd={onChoose} bases={bases} liquids={liquids} customBases={shakeBases} customLiquids={shakeLiquids} onAddBase={onAddShakeBase} onDelBase={onDelShakeBase} onAddLiquid={onAddShakeLiquid} onDelLiquid={onDelShakeLiquid} />
            </div>
          )}

          {panel === "frigo" && (
            <div>
              <FrigoPick pantry={pantry} accent={ui.color} onPick={(it) => { onChoose({ name: it.name, kcal: it.kcal, p: it.p, qty: 1 }); }} />
            </div>
          )}

          {panel === "plaisirs" && (
            <div>
              <p className="mb-3 text-xs" style={{ color: C.muted }}>Glace, barre, gâteau, cidre… ajouté en « plaisir », le budget des repas s'ajuste tout seul.</p>
              {presets.flatMap((g) => g.items).length === 0 ? (
                <p className="py-6 text-center text-sm" style={{ color: C.muted }}>Aucun plaisir préchargé.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {presets.flatMap((g) => g.items).map((pr) => (
                    <button key={pr.name} onClick={() => { onAddExtra({ name: pr.name, kcal: pr.kcal, p: pr.p || 0 }); onClose(); }} className="rounded-full px-3 py-2 text-sm font-medium active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }}>+ {pr.name} <span style={{ color: C.muted }}>{pr.kcal}</span></button>
                  ))}
                </div>
              )}
            </div>
          )}

          {panel === "recipes" && (
            <div>
              <button onClick={() => setCreatingRecipe(true)} className="mb-3 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white active:scale-95" style={{ backgroundColor: C.green }}><Plus size={16} /> Créer une recette</button>
              {slotRecipes.length === 0 ? (
                <p className="py-6 text-center text-sm leading-relaxed" style={{ color: C.muted }}>Aucune recette pour ce créneau.<br />Crée-en une — elle s'enregistre dans Ma cuisine et s'ajoute à ce repas.</p>
              ) : (
                <div className="space-y-2">
                  {slotRecipes.map((r) => (
                    <button key={r.id} onClick={() => onChoose({ name: r.name, kcal: r.kcal, p: r.p, qty: 1 })} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold" style={{ color: C.ink }}>{r.emoji ? `${r.emoji} ` : ""}{r.name}{r.custom && <span style={{ color: C.protein }}> ·perso</span>}</span>
                        <span className="block text-xs" style={{ color: C.muted, fontVariantNumeric: "tabular-nums" }}>{r.kcal} kcal · {r.p} g prot.</span>
                      </span>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${C.green}14`, color: C.green }}><Plus size={16} /></span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {panel === "combos" && (
            <div>
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
    </Sheet>

      {/* Sous-sheet dédiée : saisie d'un aliment manuel (au lieu d'un accordion) */}
      <Sheet open={customOpen} onClose={() => setCustomOpen(false)} z={40} title="Saisir un aliment">
        <p className="mb-3 text-xs" style={{ color: C.muted }}>Pour un plat maison ou un produit hors base. Les macros s'ajoutent direct à ta journée.</p>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={{ color: C.sub }}>Nom</label>
        <input value={cName} onChange={(e) => setCName(e.target.value)} autoFocus placeholder="Ex. Mes 2 tacos œuf-fromage-avocat" className="mb-3 w-full rounded-xl px-3.5 py-3 text-sm outline-none" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink }} />
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={{ color: C.sub }}>Calories</label>
            <input value={cKcal} onChange={(e) => setCKcal(e.target.value)} inputMode="numeric" placeholder="kcal" className="w-full rounded-xl px-3.5 py-3 text-sm outline-none" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink }} />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={{ color: C.sub }}>Protéines</label>
            <input value={cP} onChange={(e) => setCP(e.target.value)} inputMode="numeric" placeholder="g" className="w-full rounded-xl px-3.5 py-3 text-sm outline-none" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink }} />
          </div>
        </div>
        <div className="mt-2 flex gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={{ color: C.sub }}>Gras <span style={{ textTransform: "none", color: C.muted }}>(opt.)</span></label>
            <input value={cF} onChange={(e) => setCF(e.target.value)} inputMode="decimal" placeholder="g" className="w-full rounded-xl px-3.5 py-3 text-sm outline-none" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink }} />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={{ color: C.sub }}>Sucre <span style={{ textTransform: "none", color: C.muted }}>(opt.)</span></label>
            <input value={cS} onChange={(e) => setCS(e.target.value)} inputMode="decimal" placeholder="g" className="w-full rounded-xl px-3.5 py-3 text-sm outline-none" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink }} />
          </div>
        </div>
        <p className="mt-1.5 text-[11px]" style={{ color: C.muted }}>Renseigne gras/sucre (mêmes proportions que sur l'étiquette) pour le feu courses.</p>
        {(() => { const v = scoreProduct({ kcal: parseFloat(cKcal), p: parseFloat(cP), fat: cF !== "" ? parseFloat(cF) : null, sugar: cS !== "" ? parseFloat(cS) : null }); return v ? <div className="mt-2"><ProductVerdict C={C} verdict={v} note="verdict · ratios" /></div> : null; })()}
        <button onClick={addCustom} disabled={!customValid} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white active:scale-95" style={{ backgroundColor: customValid ? ui.color : C.line }}><Plus size={16} /> Ajouter à ma journée</button>
      </Sheet>

      {/* Calculateur de portions générique (foods avec unité/servings) */}
      {servingFor && <ServingPicker food={servingFor} accent={ui.color} onChoose={(it) => { onChoose(it); setServingFor(null); }} onClose={() => setServingFor(null)} />}

      {/* Créer une recette depuis la pioche : enregistre dans Ma cuisine + ajoute au repas */}
      {creatingRecipe && <AddRecipeSheet defaultSlots={[slotKey]} onClose={() => setCreatingRecipe(false)} onAdd={(r) => { onAddRecipe && onAddRecipe(r); onChoose({ name: r.name, kcal: r.kcal, p: r.p, qty: 1 }); setCreatingRecipe(false); }} />}
    </>
  );
}

function ShakeRow({ label, options, sel, onSel, onAdd, onDel }) {
  const [adding, setAdding] = useState(false);
  const [n, setN] = useState(""); const [k, setK] = useState(""); const [p, setP] = useState("");
  const save = () => { const kc = parseInt(k, 10); if (!n.trim() || isNaN(kc)) return; onAdd({ name: n.trim(), kcal: kc, p: parseInt(p, 10) || 0 }); setN(""); setK(""); setP(""); setAdding(false); };
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest" style={{ color: C.muted }}>{label}</p>
      {/* Une seule ligne, scroll horizontal → hauteur fixe quels que soient les noms. */}
      <div className="-mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 pb-0.5" style={{ scrollbarWidth: "none" }}>
        {options.map((o, i) => {
          const on = i === sel;
          return (
            <span key={o.id || o.name} className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full" style={{ backgroundColor: on ? C.protein : C.paper, border: `1px solid ${on ? C.protein : C.line}` }}>
              <button onClick={() => onSel(i)} className={`py-1.5 text-xs font-semibold active:scale-95 ${o.id ? "pl-3 pr-1" : "px-3"}`} style={{ color: on ? "#fff" : C.sub }}>{o.name}</button>
              {o.id && onDel && <button onClick={() => onDel(o.id)} className="py-1.5 pl-0.5 pr-2 active:scale-90" style={{ color: on ? "#fff" : C.muted }}><X size={11} /></button>}
            </span>
          );
        })}
        {onAdd && <button onClick={() => setAdding((a) => !a)} className="shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95" style={{ backgroundColor: C.paper, border: `1px dashed ${C.line}`, color: C.muted }}>+ Autre</button>}
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

// Stepper numérique compact (doses / volume / verres).
function MiniStepper({ value, onChange, step = 1, min = 0, suffix }) {
  const r = (n) => Math.round(n * 100) / 100;
  return (
    <div className="inline-flex items-center rounded-lg p-0.5" style={{ border: `1px solid ${C.line}`, backgroundColor: C.paper }}>
      <button onClick={() => onChange(Math.max(min, r(value - step)))} className="flex h-7 w-7 items-center justify-center rounded text-base font-bold active:scale-90" style={{ color: C.ink }}>−</button>
      <span className="text-center text-xs font-bold tabular-nums" style={{ color: C.ink, minWidth: "2.6rem" }}>{value}{suffix && <span className="text-[9px] font-medium" style={{ color: C.muted }}> {suffix}</span>}</span>
      <button onClick={() => onChange(r(value + step))} className="flex h-7 w-7 items-center justify-center rounded text-base font-bold active:scale-90" style={{ color: C.protein }}>+</button>
    </div>
  );
}

const qLabel = (o) => (o === 0.5 ? "½" : o === 1.5 ? "1½" : String(o));
const GLASS_ML = 250; // verre standard (le détail technique sort de l'UI)

function ShakeBuilder({ onAdd, bases: catBases = [], liquids: catLiquids = [], customBases = [], customLiquids = [], onAddBase, onDelBase, onAddLiquid, onDelLiquid, embedded = false }) {
  const prep0 = lsGet("cm:shakePrep") || {};
  const [open, setOpen] = useState(embedded);
  const [bi, setBi] = useState(0); const [li, setLi] = useState(1);
  const [qty, setQty] = useState(1);
  const [mode, setMode] = useState("dose"); // dose | verre
  const [doses, setDoses] = useState(prep0.doses || 2);  // doses dans la préparation
  const [vol, setVol] = useState(prep0.vol || 750);      // volume total préparé (ml)
  const [glasses, setGlasses] = useState(1);             // verres bus
  const [last, setLast] = useState(() => lsGet("cm:lastShake"));
  const bases = [...catBases, ...customBases];
  const liquids = [...catLiquids, ...customLiquids];
  const sb = Math.min(bi, bases.length - 1), sl = Math.min(li, liquids.length - 1);
  const EMPTY = { name: "—", kcal: 0, p: 0 };
  const base = bases[sb] || bases[0] || EMPTY, liq = liquids[sl] || liquids[0] || EMPTY; // jamais undefined → pas de crash
  const isDose = mode === "dose";
  // Doses : (base + liquide) × n. Verre : poudre × doses × (verre / volume total) × nb de verres.
  const dz = Math.round((base.kcal + liq.kcal) * qty), dp = Math.round((base.p + liq.p) * qty);
  // Verre dilué : poudre bue = doses × (verre / volume total) × nb de verres. Le liquide
  // compte AUSSI — chaque verre de 250 ml ≈ une dose de liquide (sinon eau = 0).
  const pf = vol > 0 ? doses * (GLASS_ML / vol) * glasses : 0;
  const gz = Math.round(base.kcal * pf + liq.kcal * glasses), gp = Math.round(base.p * pf + liq.p * glasses);
  const kcal = isDose ? dz : gz, p = isDose ? dp : gp;
  const name = isDose
    ? `${base.name} + ${liq.name}${qty !== 1 ? ` (×${qLabel(qty)})` : ""}`
    : `${base.name} · verre ${GLASS_ML} ml${glasses !== 1 ? ` ×${glasses}` : ""}`;
  const disabled = !isDose && pf <= 0;
  const add = () => {
    const item = { name, kcal, p };
    lsSet("cm:lastShake", item);
    if (!isDose) lsSet("cm:shakePrep", { doses, vol });
    setLast(item);
    onAdd(item);
  };

  const body = (
    <div className="space-y-3">
      {bases.length === 0 && (
        <p className="rounded-xl p-2.5 text-xs" style={{ backgroundColor: C.paper, color: C.sub }}>Aucune base de shake pour l'instant — ajoute-en une plus bas (« + Autre »).</p>
      )}

      {/* Mémorisation : re-logger le dernier shake en 1 tap */}
      {last && (
        <button onClick={() => onAdd(last)} className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
          <span className="flex min-w-0 items-center gap-1.5 text-xs" style={{ color: C.sub }}><RotateCcw size={12} className="shrink-0" /> <span className="truncate">Ma dernière : <b style={{ color: C.ink }}>{last.name}</b></span></span>
          <span className="shrink-0 text-xs font-bold" style={{ color: C.protein }}>{last.p} g</span>
        </button>
      )}

      {/* Carte composition : base / liquide / quantité séparés par des filets */}
      <div className="overflow-hidden rounded-2xl" style={{ border: `1px solid ${C.line}`, backgroundColor: C.card }}>
        <div className="p-3"><ShakeRow label="Base · protéine" options={bases} sel={sb} onSel={setBi} onAdd={onAddBase} onDel={onDelBase} /></div>
        <div className="p-3" style={{ borderTop: `1px solid ${C.line}` }}><ShakeRow label="Liquide" options={liquids} sel={sl} onSel={setLi} onAdd={onAddLiquid} onDel={onDelLiquid} /></div>
        <div className="p-3" style={{ borderTop: `1px solid ${C.line}` }}>
          <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-widest" style={{ color: C.muted }}>Quantité</p>
          {isDose ? (
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold" style={{ color: C.ink }}>Nombre de doses</span>
              <MiniStepper value={qty} onChange={(v) => setQty(Math.max(0.5, v))} step={0.5} min={0.5} suffix="dose" />
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex gap-2.5">
                <label className="flex flex-1 flex-col gap-1.5"><span className="text-[11px] font-semibold" style={{ color: C.sub }}>Doses préparées</span><MiniStepper value={doses} onChange={(v) => setDoses(Math.max(1, Math.round(v)))} min={1} /></label>
                <label className="flex flex-1 flex-col gap-1.5"><span className="text-[11px] font-semibold" style={{ color: C.sub }}>Volume total</span><MiniStepper value={vol} onChange={(v) => setVol(Math.max(50, v))} step={50} min={50} suffix="ml" /></label>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold" style={{ color: C.ink }}>Verres bus <span style={{ fontWeight: 400, color: C.muted }}>(250 ml)</span></span>
                <MiniStepper value={glasses} onChange={(v) => setGlasses(Math.max(1, Math.round(v)))} suffix="verre" min={1} />
              </div>
            </div>
          )}
          {/* Divulgation progressive : le cas rare (dilution) ne s'impose pas au cas courant */}
          <button onClick={() => setMode(isDose ? "verre" : "dose")} className="mt-3 flex w-full items-center justify-between gap-2.5 pt-2.5" style={{ borderTop: `1px solid ${C.line}` }}>
            <span className="min-w-0 flex-1 truncate text-left text-[13px] font-semibold" style={{ color: isDose ? C.sub : C.ink }}>🥛 Bu dilué, au verre</span>
            <span className="relative h-[22px] w-[38px] shrink-0 rounded-full" style={{ backgroundColor: isDose ? C.line : C.protein, transition: "background .2s" }}>
              <span className="absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white" style={{ left: isDose ? 2 : 18, transition: "left .2s" }} />
            </span>
          </button>
        </div>
      </div>

      {/* Barre résultat : protéine accentuée + Ajouter (liseré protéine pour la distinguer) */}
      <div className="flex items-center justify-between rounded-2xl px-3.5 py-3" style={{ backgroundColor: C.card, border: `1px solid ${C.protein}55` }}>
        <p className="leading-tight"><span className="text-2xl font-extrabold" style={{ color: C.protein }}>{p} g</span><span className="text-xs font-semibold" style={{ color: C.sub }}> prot.</span><br /><span className="text-[11px]" style={{ color: C.muted }}>{kcal} kcal</span></p>
        <button onClick={add} disabled={disabled} className="rounded-xl px-5 py-3 text-sm font-bold active:scale-95" style={{ backgroundColor: disabled ? C.line : C.protein, color: disabled ? C.muted : "#1a1208" }}>+ Ajouter</button>
      </div>
    </div>
  );
  // Embarqué dans la pioche : pas de wrapper de fond (la carte composition porte déjà
  // l'élévation, sur le fond de la sheet → contraste correct).
  if (embedded) return body;
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
