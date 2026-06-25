import React, { useState, useEffect } from "react";
import { Plus, Trash2, Check, Search, X, Pencil, Refrigerator, Globe, Loader2, Wand2, ChefHat, ScanLine, Star, Clock } from "lucide-react";
import { C, cardStyle } from "../core.js";
import { AddRecipeSheet } from "../sheets/RecipeForm.jsx";
import { Sheet } from "../components/Sheet.jsx";
import { importRecipeFromUrl } from "../lib/assistant.js";
import { VariantChips, applyVariants, variantLabels } from "../components/VariantChips.jsx";
import { RecipeAdaptSheet } from "../sheets/RecipeAdaptSheet.jsx";

const deburr = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const kindMeta = {
  recette: { label: "Recette", color: C.weight },
  combo: { label: "Repas", color: C.protein },
  aliment: { label: "Aliment", color: C.green },
};
const kindColor = (k) => (kindMeta[k] || kindMeta.aliment).color;
const SLOT_CHOICES = [["pdj", "Petit-déj"], ["dej", "Déj"], ["diner", "Dîner"], ["snack", "En-cas"]];
const FILTERS = [["all", "Tout"], ["fav", "⭐ Favoris"], ["recette", "Recettes"], ["combo", "Repas"], ["aliment", "Aliments"]];

// « Ma cuisine » — hub d'actions + accès rapide récents/favoris + bibliothèque
// cherchable/filtrable. Item → fiche (variantes, Adapter) → ajout à un créneau.
export function CuisineScreen({ meals = [], usage = {}, onUse, onDelete, onAddRecipe, onEditRecipe, autoAdd, onAutoAddDone, onOpenFrigo, onScan, pantry = [], favorites = [], knownFoods = [] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [adapting, setAdapting] = useState(null);
  const [detail, setDetail] = useState(null);   // item ouvert en fiche
  const [slotPick, setSlotPick] = useState(null); // ajout rapide à un créneau
  const [importOpen, setImportOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const [importErr, setImportErr] = useState("");
  const [imported, setImported] = useState(null);
  const nq = deburr(q);
  const favSet = new Set(favorites);

  useEffect(() => { if (autoAdd) { setAdding(true); onAutoAddDone && onAutoAddDone(); } }, [autoAdd]);

  const doImport = async () => {
    if (!url.trim()) return;
    setImportBusy(true); setImportErr("");
    try {
      const r = await importRecipeFromUrl(url.trim());
      setImported({
        name: r.name || "Recette importée", cat: r.slot || "dej", emoji: r.emoji || "",
        kcal: Math.round(r.kcal || 0), p: Math.round(r.protein || 0),
        ingredients: (r.ingredients || []).map((i) => `${i.qty ? `${i.qty} ` : ""}${i.unit ? `${i.unit} ` : ""}${i.name}`.trim()).filter(Boolean),
        steps: r.steps || [],
      });
      setImportOpen(false); setUrl("");
    } catch (e) { setImportErr(e?.message || "Import impossible."); } finally { setImportBusy(false); }
  };

  const matches = (m) => !nq || deburr(m.name + " " + (m.ingredients || []).join(" ") + " " + (m.items || []).map((i) => i.name).join(" ")).includes(nq);
  const passFilter = (m) => filter === "all" || (filter === "fav" ? favSet.has(m.name) : m.kind === filter);
  const list = meals.filter((m) => matches(m) && passFilter(m));
  // « Récents & favoris » : items réellement utilisés récemment (usage.last desc),
  // puis les favoris pas encore utilisés. Avant, on n'affichait QUE les favoris.
  const recents = meals
    .map((m) => ({ m, last: usage[m.name]?.last || 0, fav: favSet.has(m.name) }))
    .filter((x) => x.last > 0 || x.fav)
    .sort((a, b) => (b.last - a.last) || (Number(b.fav) - Number(a.fav)))
    .slice(0, 8)
    .map((x) => x.m);
  const empty = meals.length === 0;

  const HUB = [
    { i: Plus, l: "Créer", c: C.green, act: () => setAdding(true) },
    { i: Globe, l: "Importer", c: C.protein, act: () => { setImportErr(""); setImportOpen(true); } },
    { i: Refrigerator, l: "Frigo", c: C.weight, act: onOpenFrigo, badge: pantry.length ? pantry.filter((x) => !x.out).length : null },
    { i: ScanLine, l: "Scanner", c: C.accent, act: onScan },
  ];

  return (
    <div className="space-y-5 px-1">
      {/* Recherche */}
      <div className="relative">
        <Search size={16} style={{ color: C.muted, position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher une recette, un repas, un aliment…" className="w-full rounded-2xl py-3 pl-9 pr-9 text-sm outline-none" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }} />
        {q && <button onClick={() => setQ("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: C.muted }}><X size={16} /></button>}
      </div>

      {/* Hub d'actions */}
      <div className="grid grid-cols-4 gap-2.5">
        {HUB.map(({ i: Icon, l, c, act, badge }) => act && (
          <button key={l} onClick={act} className="relative flex flex-col items-center gap-2 rounded-2xl py-4 active:scale-95" style={cardStyle()}>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${c}1a`, color: c }}><Icon size={19} /></span>
            <span className="text-[11px] font-semibold" style={{ color: C.ink }}>{l}</span>
            {badge ? <span className="absolute right-1.5 top-1.5 rounded-full px-1.5 text-[9px] font-bold" style={{ backgroundColor: c, color: "#fff" }}>{badge}</span> : null}
          </button>
        ))}
      </div>

      {/* Récents & favoris */}
      {!nq && filter === "all" && recents.length > 0 && (
        <div>
          <div className="mb-2.5 flex items-center gap-1.5 px-1"><Clock size={13} style={{ color: C.accent }} /><span className="text-xs font-bold uppercase tracking-widest" style={{ color: C.sub }}>Récents & favoris</span></div>
          <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {recents.map((m) => (
              <button key={`r-${m.kind}-${m.id}`} onClick={() => setDetail(m)} className="flex w-40 shrink-0 flex-col rounded-2xl cm-card text-left active:scale-95" style={cardStyle()}>
                <span className="text-2xl">{m.emoji || "🍽️"}</span>
                <span className="mt-1.5 truncate text-xs font-bold" style={{ color: C.ink }}>{m.name}</span>
                <span className="mt-0.5 text-[11px] tabular-nums" style={{ color: C.muted }}>{m.kcal} · {m.p} g</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {empty ? (
        <div className="flex flex-col items-center px-6 py-10 text-center">
          <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: `${C.weight}1f`, color: C.weight }}><ChefHat size={26} /></span>
          <p className="text-sm font-bold" style={{ color: C.ink }}>Ta cuisine est vide</p>
          <p className="mt-1 mb-4 max-w-xs text-xs leading-relaxed" style={{ color: C.muted }}>Crée ta première recette, importe-la depuis une URL, ou enregistre un aliment via la pioche / un repas depuis une journée.</p>
          {onAddRecipe && <button onClick={() => setAdding(true)} className="flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white active:scale-95" style={{ backgroundColor: C.weight }}><Plus size={16} /> Ajouter une recette</button>}
        </div>
      ) : (
        <div>
          {/* Filtres */}
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {FILTERS.map(([k, l]) => (
              <button key={k} onClick={() => setFilter(k)} className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95" style={filter === k ? { backgroundColor: C.ink, color: C.bg } : { backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }}>{l}</button>
            ))}
          </div>
          {/* Liste */}
          {list.length === 0 ? (
            <p className="py-10 text-center text-sm" style={{ color: C.muted }}>Rien ne correspond.</p>
          ) : (
            <div className="space-y-2.5">
              {list.map((m) => {
                const c = kindColor(m.kind);
                return (
                  <div key={`${m.kind}-${m.id}`} className="flex items-center gap-3 rounded-2xl px-4 py-3" style={cardStyle()}>
                    <button onClick={() => setDetail(m)} className="flex min-w-0 flex-1 items-center gap-3 text-left active:opacity-70">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg" style={{ background: `${c}1a` }}>{m.emoji || "🍽️"}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5"><span className="truncate text-sm font-bold" style={{ color: C.ink }}>{m.name}</span>{favSet.has(m.name) && <Star size={11} fill={C.protein} color={C.protein} />}</span>
                        <span className="mt-0.5 flex items-center gap-1.5">
                          <span className="rounded px-1.5 py-0.5 text-[9px] font-bold" style={{ backgroundColor: `${c}22`, color: c }}>{kindMeta[m.kind].label}</span>
                          <span className="text-[11px] tabular-nums" style={{ color: C.muted }}>{m.kcal} · {m.p} g{m.variants?.length ? " · variantes" : ""}</span>
                        </span>
                      </span>
                    </button>
                    <button onClick={() => setSlotPick(m)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full active:scale-90" style={{ background: `linear-gradient(150deg, ${C.protein}, ${C.accent})`, color: "#fff" }} aria-label="Ajouter au jour"><Plus size={16} /></button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Sheets ── */}
      {detail && <DetailSheet m={detail} onClose={() => setDetail(null)} onUse={onUse}
        onAdapt={detail.kind === "recette" ? () => { const m = detail; setDetail(null); setAdapting(m); } : undefined}
        onEdit={(detail.kind === "recette" && detail.custom && onEditRecipe) ? () => { const m = detail; setDetail(null); setEditing(m); } : undefined}
        onDelete={() => { onDelete(detail); setDetail(null); }} />}
      {slotPick && <SlotPickSheet m={slotPick} onClose={() => setSlotPick(null)} onUse={onUse} />}
      {adding && <AddRecipeSheet onClose={() => setAdding(false)} onAdd={(r) => { onAddRecipe(r); setAdding(false); }} />}
      {editing && <AddRecipeSheet initial={editing} onClose={() => setEditing(null)} onAdd={(r) => { onEditRecipe(editing.id, r); setEditing(null); }} />}
      {imported && <AddRecipeSheet prefill={imported} onClose={() => setImported(null)} onAdd={(r) => { onAddRecipe(r); setImported(null); }} />}
      {adapting && <RecipeAdaptSheet recipe={adapting} favorites={favorites} knownFoods={knownFoods} pantry={pantry} onReplace={(adapting.custom && onEditRecipe) ? (r) => onEditRecipe(adapting.id, r) : undefined} onSaveNew={(r) => onAddRecipe(r)} onClose={() => setAdapting(null)} />}

      {importOpen && (
        <Sheet open onClose={() => setImportOpen(false)} title="Importer une recette" subtitle="Depuis une URL" icon={<Globe size={18} />} iconColor={C.protein}>
          <p className="mb-3 text-xs leading-relaxed" style={{ color: C.sub }}>Colle l'URL d'une recette trouvée sur le web — j'en extrais les ingrédients et j'estime les kcal/protéines par portion. Tu pourras tout ajuster avant d'enregistrer.</p>
          <input value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") doImport(); }} inputMode="url" autoCapitalize="none" placeholder="https://…" className="mb-2 w-full rounded-xl px-3.5 py-3 text-sm outline-none" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }} />
          {importErr && <p className="mb-2 text-xs" style={{ color: C.over }}>{importErr}</p>}
          <button onClick={doImport} disabled={importBusy || !url.trim()} className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white active:scale-95" style={{ backgroundColor: url.trim() ? C.protein : C.line }}>
            {importBusy ? <><Loader2 size={16} className="animate-spin" /> Lecture de la page…</> : <><Globe size={16} /> Importer</>}
          </button>
        </Sheet>
      )}
    </div>
  );
}

// Fiche d'un item : détail + variantes + ajout à un créneau + Adapter/Modifier/Supprimer.
function DetailSheet({ m, onClose, onUse, onAdapt, onEdit, onDelete }) {
  const [varSel, setVarSel] = useState(() => new Set());
  const [picking, setPicking] = useState(false);
  const meta = kindMeta[m.kind] || kindMeta.aliment;
  const hasVariants = Array.isArray(m.variants) && m.variants.length > 0;
  const eff = applyVariants(m, varSel);
  const toggleVar = (i) => setVarSel((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; });
  const add = (slot) => { const labels = variantLabels(m, varSel); onUse({ ...m, kcal: eff.kcal, p: eff.p, name: labels.length ? `${m.name} · ${labels.join(", ")}` : m.name }, slot); onClose(); };
  return (
    <Sheet open onClose={onClose} title={m.name} subtitle={`${eff.kcal} kcal · ${eff.p} g prot.${varSel.size ? " · ajusté" : ""}`} icon={m.emoji ? <span className="text-lg leading-none">{m.emoji}</span> : <ChefHat size={18} />} iconColor={meta.color}>
      <div className="space-y-5">
        {m.desc && <p className="text-sm leading-relaxed" style={{ color: C.sub }}>{m.desc}</p>}
        {m.items?.length > 0 && (
          <section>
            <p className="mb-2.5 text-[11px] font-bold uppercase tracking-widest" style={{ color: C.muted }}>Composé de</p>
            <ul className="space-y-2.5">{m.items.map((it, i) => <li key={i} className="flex items-baseline justify-between gap-3 text-sm" style={{ color: C.ink }}><span>{it.name}{it.qty > 1 ? ` ×${it.qty}` : ""}</span><span className="shrink-0 tabular-nums" style={{ color: C.muted }}>{it.kcal} kcal</span></li>)}</ul>
          </section>
        )}
        {m.ingredients?.length > 0 && (
          <section>
            <p className="mb-2.5 text-[11px] font-bold uppercase tracking-widest" style={{ color: C.muted }}>Ingrédients</p>
            <ul className="space-y-2.5">{m.ingredients.map((it, i) => <li key={i} className="flex gap-2.5 text-sm leading-relaxed" style={{ color: C.ink }}><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: meta.color }} /><span>{it}</span></li>)}</ul>
          </section>
        )}
        {m.steps?.length > 0 && (
          <section>
            <p className="mb-2.5 text-[11px] font-bold uppercase tracking-widest" style={{ color: C.muted }}>Préparation</p>
            <ol className="space-y-3.5">{m.steps.map((st, i) => <li key={i} className="flex gap-3 text-sm leading-relaxed" style={{ color: C.ink }}><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ backgroundColor: `${meta.color}1f`, color: meta.color }}>{i + 1}</span><span className="pt-0.5">{st}</span></li>)}</ol>
          </section>
        )}
        {hasVariants && (
          <section>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest" style={{ color: C.muted }}>Variantes</p>
            <VariantChips variants={m.variants} sel={varSel} onToggle={toggleVar} />
          </section>
        )}
      </div>

      <div className="mt-5">
      {picking ? (
        <div className="flex items-center gap-1.5">
          <span className="mr-1 text-xs font-semibold" style={{ color: C.muted }}>À quel repas ?</span>
          {SLOT_CHOICES.map(([k, l]) => <button key={k} onClick={() => add(k)} className="flex-1 rounded-lg py-2 text-xs font-bold active:scale-95" style={{ backgroundColor: `${meta.color}1a`, color: meta.color }}>{l}</button>)}
        </div>
      ) : (
        <div className="flex gap-2">
          <button onClick={() => setPicking(true)} className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-3 text-sm font-bold text-white active:scale-95" style={{ backgroundColor: C.green }}><Plus size={16} /> Ajouter à un créneau</button>
          {onAdapt && <button onClick={onAdapt} className="flex items-center justify-center rounded-2xl px-3.5 active:scale-95" style={{ backgroundColor: `${C.weight}1f`, color: C.weight }} aria-label="Adapter avec l'assistant"><Wand2 size={17} /></button>}
          {onEdit && <button onClick={onEdit} className="flex items-center justify-center rounded-2xl px-3.5 active:scale-95" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.sub }} aria-label="Modifier"><Pencil size={17} /></button>}
          <button onClick={onDelete} className="flex items-center justify-center rounded-2xl px-3.5 active:scale-95" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.over }} aria-label="Supprimer"><Trash2 size={17} /></button>
        </div>
      )}
      </div>
    </Sheet>
  );
}

// Ajout rapide depuis le « + » d'une ligne : choix direct du créneau.
function SlotPickSheet({ m, onClose, onUse }) {
  const c = kindColor(m.kind);
  return (
    <Sheet open onClose={onClose} title={`Ajouter ${m.name}`} subtitle={`${m.kcal} kcal · ${m.p} g · à quel repas ?`} icon={m.emoji ? <span className="text-lg leading-none">{m.emoji}</span> : <Plus size={18} />} iconColor={c}>
      <div className="grid grid-cols-2 gap-2">
        {SLOT_CHOICES.map(([k, l]) => <button key={k} onClick={() => { onUse(m, k); onClose(); }} className="rounded-2xl py-3.5 text-sm font-bold active:scale-95" style={{ backgroundColor: `${c}1a`, color: c }}>{l}</button>)}
      </div>
    </Sheet>
  );
}
