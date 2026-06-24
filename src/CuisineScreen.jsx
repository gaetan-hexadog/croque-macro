import React, { useState, useEffect } from "react";
import { Plus, Trash2, Check, ChevronDown, Search, X, Pencil, Refrigerator, ChevronRight, Globe, Loader2, Wand2, ChefHat } from "lucide-react";
import { C, cardStyle } from "./core.js";
import { SectionTitle } from "./ui.jsx";
import { AddRecipeSheet } from "./RecipeForm.jsx";
import { Sheet } from "./Sheet.jsx";
import { importRecipeFromUrl } from "./assistant.js";
import { VariantChips, applyVariants, variantLabels } from "./VariantChips.jsx";
import { RecipeAdaptSheet } from "./RecipeAdaptSheet.jsx";

const deburr = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// Bibliothèque unifiée « Ma cuisine » — réorganisée en SECTIONS claires
// (Recettes / Repas / Aliments) avec recherche en tête. Hiérarchie typographique.
const SECTIONS = [
  { kind: "recette", title: "Recettes" },
  { kind: "combo", title: "Repas composés" },
  { kind: "aliment", title: "Aliments" },
];
const kindMeta = {
  aliment: { label: "Aliment", color: C.green },
  combo: { label: "Repas", color: C.protein },
  recette: { label: "Recette", color: C.weight },
};
const SLOT_CHOICES = [
  { k: "pdj", l: "Petit-déj" },
  { k: "dej", l: "Déj" },
  { k: "diner", l: "Dîner" },
  { k: "snack", l: "En-cas" },
];

export function CuisineScreen({ meals = [], onUse, onDelete, onAddRecipe, onEditRecipe, autoAdd, onAutoAddDone, onOpenFrigo, pantry = [], favorites = [], knownFoods = [] }) {
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [adapting, setAdapting] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const [importErr, setImportErr] = useState("");
  const [imported, setImported] = useState(null); // recette pré-remplie à valider
  const nq = deburr(q);

  // Signal externe (bouton « + » → Ajouter une recette) : ouvre le formulaire.
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
  const filtered = meals.filter(matches);

  return (
    <div className="px-1">
      <div className="relative mb-3">
        <Search size={16} style={{ color: C.muted, position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher une recette, un repas, un aliment…" className="w-full rounded-2xl py-3 pl-9 pr-9 text-sm outline-none" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }} />
        {q && <button onClick={() => setQ("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: C.muted }}><X size={16} /></button>}
      </div>

      {onOpenFrigo && (
        <button onClick={onOpenFrigo} className="mb-4 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left active:scale-95" style={cardStyle()}>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${C.weight}1f`, color: C.weight }}><Refrigerator size={20} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold" style={{ color: C.ink }}>Mon frigo / placard</span>
            <span className="block text-xs" style={{ color: C.muted }}>
              {pantry.length === 0 ? "Dis ce que tu as sous la main" : `${pantry.filter((x) => !x.out).length} dispo${pantry.some((x) => x.out) ? ` · ${pantry.filter((x) => x.out).length} en rupture` : ""}`}
            </span>
          </span>
          <ChevronRight size={18} style={{ color: C.muted }} />
        </button>
      )}

      <button onClick={() => { setImportErr(""); setImportOpen(true); }} className="mb-4 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left active:scale-95" style={cardStyle()}>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${C.protein}1f`, color: C.protein }}><Globe size={20} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold" style={{ color: C.ink }}>Importer depuis une URL</span>
          <span className="block text-xs" style={{ color: C.muted }}>Une recette trouvée sur le web → kcal/prot estimées</span>
        </span>
        <ChevronRight size={18} style={{ color: C.muted }} />
      </button>

      {filtered.length === 0 ? (
        meals.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: `${C.weight}1f`, color: C.weight }}><ChefHat size={26} /></span>
            <p className="text-sm font-bold" style={{ color: C.ink }}>Ta cuisine est vide</p>
            <p className="mt-1 mb-4 max-w-xs text-xs leading-relaxed" style={{ color: C.muted }}>Crée ta première recette, importe-la depuis une URL, ou enregistre un aliment via la pioche / un repas depuis une journée.</p>
            {onAddRecipe && (
              <button onClick={() => setAdding(true)} className="flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white active:scale-95" style={{ backgroundColor: C.weight }}><Plus size={16} /> Ajouter une recette</button>
            )}
          </div>
        ) : (
          <p className="py-12 text-center text-sm" style={{ color: C.muted }}>Rien ne correspond à ta recherche.</p>
        )
      ) : (
        SECTIONS.map((s) => {
          const items = filtered.filter((m) => m.kind === s.kind);
          if (items.length === 0) return null;
          const meta = kindMeta[s.kind];
          return (
            <div key={s.kind} className="mb-5">
              <SectionTitle right={s.kind === "recette" && onAddRecipe && (
                <button onClick={() => setAdding(true)} className="flex items-center gap-1 text-xs font-semibold active:scale-95" style={{ color: meta.color }}><Plus size={13} /> Ajouter</button>
              )}>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />
                  {s.title}
                  <span className="font-semibold" style={{ color: C.muted }}>{items.length}</span>
                </span>
              </SectionTitle>
              <div className="space-y-2.5">
                {items.map((m) => <Card key={`${m.kind}-${m.id}`} m={m} onUse={onUse} onDelete={onDelete} onEdit={(m.kind === "recette" && m.custom && onEditRecipe) ? () => setEditing(m) : undefined} onAdapt={m.kind === "recette" ? () => setAdapting(m) : undefined} />)}
              </div>
            </div>
          );
        })
      )}

      <div style={{ height: "0.5rem" }} />

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

function Card({ m, onUse, onDelete, onEdit, onAdapt }) {
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const [used, setUsed] = useState(false);
  const [varSel, setVarSel] = useState(() => new Set());
  const meta = kindMeta[m.kind] || kindMeta.aliment;
  const hasVariants = Array.isArray(m.variants) && m.variants.length > 0;
  const eff = applyVariants(m, varSel);
  const toggleVar = (i) => setVarSel((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; });
  const add = (slot) => { const labels = variantLabels(m, varSel); onUse({ ...m, kcal: eff.kcal, p: eff.p, name: labels.length ? `${m.name} · ${labels.join(", ")}` : m.name }, slot); setPicking(false); setUsed(true); setTimeout(() => setUsed(false), 1400); };
  const hasDetail = (m.items && m.items.length) || (m.ingredients && m.ingredients.length) || (m.steps && m.steps.length) || m.desc;
  return (
    <div className="overflow-hidden rounded-2xl" style={cardStyle()}>
      <button onClick={() => hasDetail && setOpen((o) => !o)} className="flex w-full items-center gap-3 px-4 py-3 text-left active:opacity-80">
        <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: meta.color }} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold" style={{ color: C.ink }}>{m.name}</span>
          <span className="mt-0.5 flex items-center gap-1.5 text-xs" style={{ color: C.muted, fontVariantNumeric: "tabular-nums" }}>
            <span className="rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ backgroundColor: `${meta.color}22`, color: meta.color }}>{meta.label}</span>
            {eff.kcal} kcal · {eff.p} g prot.{varSel.size > 0 && <span style={{ color: C.green }}> · ajusté</span>}
          </span>
        </span>
        {hasDetail && <ChevronDown size={16} style={{ color: C.muted, flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }} />}
      </button>
      {open && (
        <div className="px-4 pb-3 pt-0.5">
          {m.desc && <p className="mb-2 text-sm" style={{ color: C.sub }}>{m.desc}</p>}
          {m.items && m.items.length > 0 && (
            <ul className="mb-2 space-y-1">
              {m.items.map((it, i) => <li key={i} className="flex justify-between text-sm" style={{ color: C.sub }}><span>{it.name}{it.qty > 1 ? ` ×${it.qty}` : ""}</span><span style={{ color: C.muted }}>{it.kcal} kcal</span></li>)}
            </ul>
          )}
          {m.ingredients && m.ingredients.length > 0 && (
            <ul className="mb-2 space-y-1">
              {m.ingredients.map((it, i) => <li key={i} className="flex gap-2 text-sm" style={{ color: C.sub }}><span style={{ color: meta.color }}>•</span><span>{it}</span></li>)}
            </ul>
          )}
          {m.steps && m.steps.length > 0 && (
            <ol className="mb-2 space-y-1.5">
              {m.steps.map((st, i) => <li key={i} className="flex gap-2 text-sm" style={{ color: C.sub }}><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ backgroundColor: `${meta.color}1f`, color: meta.color }}>{i + 1}</span><span>{st}</span></li>)}
            </ol>
          )}
        </div>
      )}
      <div className="border-t px-4 py-2.5" style={{ borderColor: C.line }}>
        {hasVariants && <div className="mb-2"><VariantChips variants={m.variants} sel={varSel} onToggle={toggleVar} /></div>}
        {picking ? (
          <div className="flex items-center gap-1.5">
            <span className="mr-1 text-xs font-semibold" style={{ color: C.muted }}>Ajouter à</span>
            {SLOT_CHOICES.map((s) => (
              <button key={s.k} onClick={() => add(s.k)} className="flex-1 rounded-lg py-1.5 text-xs font-semibold active:scale-95" style={{ backgroundColor: `${meta.color}1a`, color: meta.color }}>{s.l}</button>
            ))}
            <button onClick={() => setPicking(false)} className="rounded-lg px-2 py-1.5" style={{ color: C.muted }}><X size={14} /></button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setPicking(true)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold text-white active:scale-95" style={{ backgroundColor: meta.color }}>
              {used ? <><Check size={15} /> Ajouté</> : <><Plus size={15} /> Ajouter au repas</>}
            </button>
            {onAdapt && <button onClick={onAdapt} className="flex items-center justify-center rounded-xl px-3 py-2 active:scale-95" style={{ backgroundColor: `${C.weight}1f`, color: C.weight }} aria-label="Adapter avec l'assistant"><Wand2 size={15} /></button>}
            {onEdit && <button onClick={onEdit} className="flex items-center justify-center rounded-xl px-3 py-2 active:scale-95" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.sub }} aria-label="Modifier"><Pencil size={15} /></button>}
            <button onClick={() => onDelete(m)} className="flex items-center justify-center rounded-xl px-3 py-2 active:scale-95" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.over }} aria-label="Supprimer"><Trash2 size={15} /></button>
          </div>
        )}
      </div>
    </div>
  );
}
