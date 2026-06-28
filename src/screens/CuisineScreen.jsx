import React, { useState, useEffect } from "react";
import { Plus, Search, X, Globe, Loader2, ChefHat, ScanLine, Star, Clock, BookOpen, ChevronRight, Refrigerator, Sparkles, PencilLine } from "lucide-react";
import { C, cardStyle, oneEmoji, protStock } from "../core.js";
import { AddRecipeSheet } from "../sheets/RecipeForm.jsx";
import { Sheet } from "../components/Sheet.jsx";
import { importRecipeFromUrl } from "../lib/assistant.js";
import { RecipeAdaptSheet } from "../sheets/RecipeAdaptSheet.jsx";
import { RecipeDetailSheet, kindMeta, kindColor, SLOT_CHOICES } from "../components/RecipeDetailSheet.jsx";

const deburr = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// Carte recette compacte (carrousel). Tap → fiche détail.
function MiniCard({ m, onOpen }) {
  const c = kindColor(m.kind);
  return (
    <button onClick={() => onOpen(m)} className="flex w-36 shrink-0 flex-col rounded-2xl px-3 py-3 text-left active:scale-95" style={cardStyle()}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl text-xl" style={{ backgroundColor: `${c}1a` }}>{oneEmoji(m.emoji) || "🍽️"}</span>
      <span className="mt-2 line-clamp-2 text-xs font-bold leading-tight" style={{ color: C.ink, minHeight: 28 }}>{m.name}</span>
      <span className="mt-1 text-[11px] tabular-nums" style={{ color: C.muted }}>{m.kcal} · {m.p} g</span>
    </button>
  );
}

// Section = en-tête (icône + label + count) + carrousel horizontal.
function Section({ icon: I, label, color, items, onOpen }) {
  if (!items.length) return null;
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 px-1">
        <I size={13} style={{ color }} />
        <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: C.sub }}>{label}</span>
        <span className="ml-auto text-[11px] font-semibold" style={{ color: C.muted }}>{items.length}</span>
      </div>
      <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {items.map((m) => <MiniCard key={`${m.kind}-${m.id}`} m={m} onOpen={onOpen} />)}
      </div>
    </div>
  );
}

// « Ma cuisine » — hub condensé (recherche + « + » → Créer/Importer/Scanner, Frigo en carte)
// + contenu rangé en carrousels par type. Recherche active → liste à plat tous types.
export function CuisineScreen({ meals = [], usage = {}, onUse, onDelete, onAddRecipe, onEditRecipe, autoAdd, onAutoAddDone, onOpenFrigo, onScan, onOpenGuide, pantry = [], favorites = [], knownFoods = [] }) {
  const [q, setQ] = useState("");
  const [addMenu, setAddMenu] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [adapting, setAdapting] = useState(null);
  const [detail, setDetail] = useState(null);
  const [slotPick, setSlotPick] = useState(null);
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
  const found = meals.filter(matches);
  // Carrousels par type (navigation par défaut)
  const recents = meals
    .map((m) => ({ m, last: usage[m.name]?.last || 0, fav: favSet.has(m.name) }))
    .filter((x) => x.last > 0 || x.fav)
    .sort((a, b) => (b.last - a.last) || (Number(b.fav) - Number(a.fav)))
    .slice(0, 10)
    .map((x) => x.m);
  const recettes = meals.filter((m) => m.kind === "recette");
  const repas = meals.filter((m) => m.kind === "combo");
  const aliments = meals.filter((m) => m.kind === "aliment");
  const empty = meals.length === 0;
  const dispo = pantry.filter((x) => !x.out);

  const ADD = [
    { i: Plus, l: "Créer une recette", d: "Saisir nom, ingrédients, macros", c: C.green, act: () => setAdding(true) },
    { i: Globe, l: "Importer depuis une URL", d: "L'assistant extrait la recette", c: C.protein, act: () => { setImportErr(""); setImportOpen(true); } },
    { i: ScanLine, l: "Scanner un produit", d: "Code-barres Open Food Facts", c: C.accent, act: onScan },
  ];

  return (
    <div className="space-y-5 px-1">
      {/* Hub condensé : recherche + « + » */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} style={{ color: C.muted, position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher une recette, un aliment…" className="w-full rounded-2xl py-3 pl-9 pr-9 text-sm outline-none" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }} />
          {q && <button onClick={() => setQ("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: C.muted }}><X size={16} /></button>}
        </div>
        <button onClick={() => setAddMenu(true)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl active:scale-95" style={{ background: `linear-gradient(150deg, ${C.protein}, ${C.accent})`, color: "#fff" }} aria-label="Ajouter"><Plus size={20} /></button>
      </div>

      {/* Frigo en carte d'état */}
      {onOpenFrigo && (
        <button onClick={onOpenFrigo} className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left active:scale-95" style={cardStyle()}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${C.weight}1a`, color: C.weight }}><Refrigerator size={19} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold" style={{ color: C.ink }}>Mon frigo</span>
            <span className="block text-[11px]" style={{ color: C.muted }}>{dispo.length ? `${dispo.length} aliments · ~${protStock(dispo)} g prot. dispo` : "Vide — ajoute ce que tu as"}</span>
          </span>
          <ChevronRight size={16} style={{ color: C.muted }} />
        </button>
      )}

      {empty ? (
        <div className="flex flex-col items-center px-6 py-10 text-center">
          <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: `${C.weight}1f`, color: C.weight }}><ChefHat size={26} /></span>
          <p className="text-sm font-bold" style={{ color: C.ink }}>Ta cuisine est vide</p>
          <p className="mt-1 mb-4 max-w-xs text-xs leading-relaxed" style={{ color: C.muted }}>Crée ta première recette, importe-la depuis une URL, ou enregistre un aliment via la pioche / un repas depuis une journée.</p>
          {onAddRecipe && <button onClick={() => setAdding(true)} className="flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white active:scale-95" style={{ backgroundColor: C.weight }}><Plus size={16} /> Ajouter une recette</button>}
        </div>
      ) : nq ? (
        /* Recherche active → liste à plat, tous types */
        found.length === 0 ? (
          <p className="py-10 text-center text-sm" style={{ color: C.muted }}>Rien ne correspond.</p>
        ) : (
          <div className="space-y-2.5">
            {found.map((m) => {
              const c = kindColor(m.kind);
              return (
                <div key={`${m.kind}-${m.id}`} className="flex items-center gap-3 rounded-2xl px-4 py-3" style={cardStyle()}>
                  <button onClick={() => setDetail(m)} className="flex min-w-0 flex-1 items-center gap-3 text-left active:opacity-70">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg" style={{ background: `${c}1a` }}>{oneEmoji(m.emoji) || "🍽️"}</span>
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
        )
      ) : (
        /* Navigation par défaut → carrousels par type */
        <div className="space-y-5">
          <Section icon={Clock} label="Récents & favoris" color={C.accent} items={recents} onOpen={setDetail} />
          <Section icon={Sparkles} label="Recettes" color={C.protein} items={recettes} onOpen={setDetail} />
          <Section icon={Refrigerator} label="Repas express" color={C.green} items={repas} onOpen={setDetail} />
          <Section icon={PencilLine} label="Aliments" color={C.weight} items={aliments} onOpen={setDetail} />
        </div>
      )}

      {/* Accès au guide nutritionnel */}
      {onOpenGuide && (
        <button onClick={onOpenGuide} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left active:scale-95" style={cardStyle()}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${C.accent}1a`, color: C.accent }}><BookOpen size={17} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold" style={{ color: C.ink }}>Guide & repères</span>
            <span className="block text-[11px]" style={{ color: C.muted }}>Règles diététiques, suppléments, cibles</span>
          </span>
          <ChevronRight size={16} style={{ color: C.muted }} />
        </button>
      )}

      {/* ── Sheets ── */}
      {addMenu && (
        <Sheet open onClose={() => setAddMenu(false)} title="Ajouter à ta cuisine" subtitle="Recette, import ou produit" icon={<Plus size={18} />} iconColor={C.green}>
          <div className="space-y-2">
            {ADD.map(({ i: Icon, l, d, c, act }) => act && (
              <button key={l} onClick={() => { setAddMenu(false); act(); }} className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3.5 text-left active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${c}1a`, color: c }}><Icon size={18} /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-bold" style={{ color: C.ink }}>{l}</span><span className="block text-[11px]" style={{ color: C.muted }}>{d}</span></span>
              </button>
            ))}
          </div>
        </Sheet>
      )}
      {detail && <RecipeDetailSheet m={detail} onClose={() => setDetail(null)} onUse={onUse}
        onAdapt={detail.kind === "recette" ? () => { const m = detail; setDetail(null); setAdapting(m); } : undefined}
        onEdit={(detail.kind === "recette" && onEditRecipe) ? () => { const m = detail; setDetail(null); setEditing(m); } : undefined}
        onDelete={detail.lib ? undefined : () => { onDelete(detail); setDetail(null); }} />}
      {slotPick && <SlotPickSheet m={slotPick} onClose={() => setSlotPick(null)} onUse={onUse} />}
      {adding && <AddRecipeSheet onClose={() => setAdding(false)} onAdd={(r) => { onAddRecipe(r); setAdding(false); }} />}
      {editing && <AddRecipeSheet initial={editing} onClose={() => setEditing(null)} onAdd={(r) => { onEditRecipe(editing.id, r); setEditing(null); }} />}
      {imported && <AddRecipeSheet prefill={imported} onClose={() => setImported(null)} onAdd={(r) => { onAddRecipe(r); setImported(null); }} />}
      {adapting && <RecipeAdaptSheet recipe={adapting} favorites={favorites} knownFoods={knownFoods} pantry={pantry} onReplace={onEditRecipe ? (r) => onEditRecipe(adapting.id, r) : undefined} onSaveNew={(r) => onAddRecipe(r)} onClose={() => setAdapting(null)} />}

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


// Ajout rapide depuis le « + » d'une ligne : choix direct du créneau.
function SlotPickSheet({ m, onClose, onUse }) {
  const c = kindColor(m.kind);
  return (
    <Sheet open onClose={onClose} title={`Ajouter ${m.name}`} subtitle={`${m.kcal} kcal · ${m.p} g · à quel repas ?`} icon={m.emoji ? <span className="text-lg leading-none">{oneEmoji(m.emoji)}</span> : <Plus size={18} />} iconColor={c}>
      <div className="grid grid-cols-2 gap-2">
        {SLOT_CHOICES.map(([k, l]) => <button key={k} onClick={() => { onUse(m, k); onClose(); }} className="rounded-2xl py-3.5 text-sm font-bold active:scale-95" style={{ backgroundColor: `${c}1a`, color: c }}>{l}</button>)}
      </div>
    </Sheet>
  );
}
