import React, { useState, useEffect } from "react";
import { Plus, Search, X, Globe, Loader2, ChefHat, ScanLine, Star, BookOpen, ChevronRight, Refrigerator, ClipboardPaste, Sprout, ArrowDownUp } from "lucide-react";
import { C, cardStyle, oneEmoji, protStock, expiryMeta } from "../core.js";
import { AddRecipeSheet } from "../sheets/RecipeForm.jsx";
import { Sheet } from "../components/Sheet.jsx";
import { importRecipeFromUrl, importRecipeFromText } from "../lib/assistant.js";
import { RecipeAdaptSheet } from "../sheets/RecipeAdaptSheet.jsx";
import { RecipeDetailSheet, kindMeta, kindColor } from "../components/RecipeDetailSheet.jsx";
import { ProteinFlag } from "../components/ProteinFlag.jsx";
import { AssistantBar } from "../components/AssistantBar.jsx";

const deburr = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// Carte recette (grille 2 colonnes) — titre LISIBLE en entier, badge type, macros, ⭐ favori.
function Tile({ m, fav, onToggleFav, onOpen }) {
  const c = kindColor(m.kind);
  return (
    <div className="relative h-full">
      <button onClick={() => onOpen(m)} className="flex h-full w-full flex-col rounded-2xl p-3 text-left active:scale-95" style={cardStyle()}>
        {/* Rangée du haut : emoji + badge type (l'espace avant était vide) ; l'étoile flotte à droite (pr-8) */}
        <div className="mb-2 flex items-center gap-2 pr-8">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xl" style={{ backgroundColor: `${c}1a` }}>{oneEmoji(m.emoji) || "🍽️"}</span>
          <span className="truncate rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: `${c}22`, color: c }}>{kindMeta[m.kind].label}</span>
        </div>
        <span className="line-clamp-2 text-sm font-bold leading-tight" style={{ color: C.ink }}>{m.name}</span>
        {/* Bloc bas poussé en pied (mt-auto) → cartes d'une même ligne alignées et de même hauteur */}
        <span className="mt-auto flex items-center gap-1.5 pt-2">
          <ProteinFlag kcal={m.kcal} p={m.p} dotOnly />
          <span className="text-[11px] tabular-nums" style={{ color: C.muted }}>{m.kcal} kcal · {m.p} g</span>
        </span>
      </button>
      {onToggleFav && (
        <button onClick={() => onToggleFav(m.id)} className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }} aria-label={fav ? "Retirer des favoris" : "Ajouter aux favoris"}>
          <Star size={13} fill={fav ? C.protein : "none"} color={fav ? C.protein : C.muted} />
        </button>
      )}
    </div>
  );
}

const FILTERS = [{ k: "all", l: "Tous" }, { k: "recette", l: "Recettes" }, { k: "combo", l: "Repas" }, { k: "aliment", l: "Aliments" }, { k: "fav", l: "Favoris", icon: Star }];
const SORTS = [{ k: "recent", l: "Récents" }, { k: "az", l: "A→Z" }, { k: "prot", l: "Protéines" }];

// « Ma cuisine » — hub condensé (recherche + « + » → Créer/Importer/Scanner, Frigo en carte)
// + contenu rangé en carrousels par type. Recherche active → liste à plat tous types.
export function CuisineScreen({ meals = [], usage = {}, onUse, onDelete, onAddRecipe, onEditRecipe, autoAdd, onAutoAddDone, onOpenFrigo, onScan, onOpenGuide, pantry = [], favorites = [], favs = [], onToggleFav, knownFoods = [], onCoachPrompt, onCook, addSignal = 0 }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("recent");
  const [addMenu, setAddMenu] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [adapting, setAdapting] = useState(null);
  const [detail, setDetail] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const [importErr, setImportErr] = useState("");
  const [imported, setImported] = useState(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteBusy, setPasteBusy] = useState(false);
  const [pasteErr, setPasteErr] = useState("");
  const nq = deburr(q);
  const favSet = new Set(favs); // favoris par id (toggle UI)

  useEffect(() => { if (autoAdd) { setAdding(true); onAutoAddDone && onAutoAddDone(); } }, [autoAdd]);
  // Le « + » du header d'app (hors écran) ouvre le menu d'ajout via un signal incrémenté.
  useEffect(() => { if (addSignal) setAddMenu(true); }, [addSignal]);

  // Mappe une recette extraite (URL ou texte) vers le préremplissage de AddRecipeSheet.
  const prefillFrom = (r) => ({
    name: r.name || "Recette importée", cat: r.slot || "dej", emoji: r.emoji || "",
    kcal: Math.round(r.kcal || 0), p: Math.round(r.protein || 0),
    ingredients: (r.ingredients || []).map((i) => `${i.qty ? `${i.qty} ` : ""}${i.unit ? `${i.unit} ` : ""}${i.name}`.trim()).filter(Boolean),
    steps: r.steps || [],
  });
  const doImport = async () => {
    if (!url.trim()) return;
    setImportBusy(true); setImportErr("");
    try { setImported(prefillFrom(await importRecipeFromUrl(url.trim()))); setImportOpen(false); setUrl(""); }
    catch (e) { setImportErr(e?.message || "Import impossible."); } finally { setImportBusy(false); }
  };
  const doPaste = async () => {
    if (pasteText.trim().length < 20) { setPasteErr("Colle une recette (ingrédients + étapes)."); return; }
    setPasteBusy(true); setPasteErr("");
    try { setImported(prefillFrom(await importRecipeFromText(pasteText.trim()))); setPasteOpen(false); setPasteText(""); }
    catch (e) { setPasteErr(e?.message || "Extraction impossible."); } finally { setPasteBusy(false); }
  };

  const matches = (m) => !nq || deburr(m.name + " " + (m.ingredients || []).join(" ") + " " + (m.items || []).map((i) => i.name).join(" ")).includes(nq);
  // Liste UNIFIÉE (fini les carrousels horizontaux) : recherche + filtre (chip) + tri.
  const items = meals.filter(matches)
    .filter((m) => filter === "all" || (filter === "fav" ? favSet.has(m.id) : m.kind === filter))
    .sort((a, b) => sort === "az" ? a.name.localeCompare(b.name) : sort === "prot" ? (b.p || 0) - (a.p || 0) : (usage[b.name]?.last || 0) - (usage[a.name]?.last || 0));
  const empty = meals.length === 0;
  const dispo = pantry.filter((x) => !x.out);
  // Pont Frigo → Cuisine : recettes faisables avec ce que j'ai (≥60 % des ingrédients au frigo),
  // + aliments qui périment (priorité anti-gaspi passée à l'assistant).
  const pantryNames = dispo.map((x) => deburr(x.name)).filter(Boolean);
  const expiringNames = dispo.filter((x) => expiryMeta(x.exp)?.urgent).map((x) => x.name);
  const matchFrac = (m) => { const ings = (m.ingredients || []).map((i) => deburr(typeof i === "string" ? i : i.name)).filter(Boolean); if (!ings.length) return 0; return ings.filter((ing) => pantryNames.some((pn) => pn.length > 2 && (ing.includes(pn) || pn.includes(ing)))).length / ings.length; };
  const doable = meals.filter((m) => (m.kind === "recette" || m.kind === "combo") && matchFrac(m) >= 0.6).map((m) => ({ m, f: matchFrac(m) })).sort((a, b) => b.f - a.f).slice(0, 6).map((x) => x.m);
  const cookNames = expiringNames.length ? expiringNames : dispo.slice(0, 6).map((x) => x.name);

  const ADD = [
    { i: Plus, l: "Créer une recette", d: "Saisir nom, ingrédients, macros", c: C.green, act: () => setAdding(true) },
    { i: Globe, l: "Importer depuis une URL", d: "L'assistant extrait la recette", c: C.protein, act: () => { setImportErr(""); setImportOpen(true); } },
    { i: ClipboardPaste, l: "Coller une recette", d: "Texte brut → recette structurée", c: C.weight, act: () => { setPasteErr(""); setPasteOpen(true); } },
    { i: ScanLine, l: "Scanner un produit", d: "Code-barres Open Food Facts", c: C.accent, act: onScan },
  ];

  return (
    <>
    <div className="space-y-5 px-1">
      {/* Recherche pleine largeur — scan & « + » vivent dans la zone d'actions du header d'app. */}
      <div className="relative">
        <Search size={16} style={{ color: C.muted, position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher une recette, un aliment…" className="w-full rounded-2xl py-3 pl-9 pr-9 text-sm outline-none" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }} />
        {q && <button onClick={() => setQ("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: C.muted }}><X size={16} /></button>}
      </div>

      {/* Frigo → Cuisine : UN seul bloc (fini les 3 cartes empilées). Hero anti-gaspi
          « cuisinable maintenant » + accès direct au frigo. Le coach passe dans la barre
          assistant en bas. */}
      {onOpenFrigo && !nq && (
        <div className="rounded-2xl p-3.5" style={cardStyle(dispo.length ? { background: `radial-gradient(130% 120% at 0% 0%, ${C.green}1c, transparent 60%), ${C.cardGrad}` } : undefined)}>
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${C.green}1a`, color: C.green }}><Refrigerator size={18} /></span>
            <button onClick={onOpenFrigo} className="min-w-0 flex-1 text-left active:opacity-70">
              <span className="block text-sm font-bold" style={{ color: C.ink }}>Mon frigo{dispo.length ? "" : " est vide"}</span>
              <span className="block text-[11px]" style={{ color: C.muted }}>{dispo.length ? `${dispo.length} aliments · ~${protStock(dispo)} g prot.${expiringNames.length ? ` · ${expiringNames.length} à finir vite` : ""}` : "Ajoute ce que tu as pour des idées anti-gaspi"}</span>
            </button>
            {onCook && dispo.length > 0
              ? <button onClick={() => onCook(cookNames)} className="flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold text-white active:scale-95" style={{ background: `linear-gradient(150deg, ${C.green}, ${C.weight})` }}><Sprout size={13} /> Idées ✨</button>
              : <ChevronRight size={16} style={{ color: C.muted }} />}
          </div>
          {doable.length > 0 && (
            <div className="mt-2.5 flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
              {doable.map((m) => <button key={`${m.kind}-${m.id}`} onClick={() => setDetail(m)} className="w-32 shrink-0 rounded-2xl p-2.5 text-left active:scale-95" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}` }}><span className="text-lg">{oneEmoji(m.emoji) || "🍽️"}</span><p className="mt-1 line-clamp-2 text-xs font-bold leading-tight" style={{ color: C.ink }}>{m.name}</p><p className="mt-1 text-[10px] font-semibold" style={{ color: C.green }}>✓ tu as le nécessaire</p></button>)}
            </div>
          )}
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
        /* Liste unifiée : une SEULE ligne filtres + tri compact (fini le gros bloc central), puis grille */
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex flex-1 gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
              {FILTERS.map(({ k, l, icon: I }) => {
                const on = filter === k;
                return <button key={k} onClick={() => setFilter(k)} className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold active:scale-95" style={on ? { backgroundColor: C.ink, color: C.paper } : { backgroundColor: C.card, color: C.sub, border: `1px solid ${C.line}` }}>{I && <I size={11} />} {l}</button>;
              })}
            </div>
            <button onClick={() => setSort((s) => SORTS[(SORTS.findIndex((x) => x.k === s) + 1) % SORTS.length].k)} className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold active:scale-95" style={{ backgroundColor: `${C.accent}1a`, color: C.accent, border: `1px solid ${C.accent}44` }} aria-label="Changer le tri">
              <ArrowDownUp size={11} /> {SORTS.find((x) => x.k === sort).l}
            </button>
          </div>
          {items.length === 0 ? (
            <p className="py-10 text-center text-sm" style={{ color: C.muted }}>{nq ? "Rien ne correspond." : "Aucun élément dans ce filtre."}</p>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {items.map((m) => <Tile key={`${m.kind}-${m.id}`} m={m} fav={favSet.has(m.id)} onToggleFav={onToggleFav} onOpen={setDetail} />)}
            </div>
          )}
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

      {/* Espace pour dégager la barre assistant fixe */}
      <div aria-hidden style={{ height: "3.25rem" }} />

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
        isFav={favSet.has(detail.id)} onToggleFav={onToggleFav ? () => onToggleFav(detail.id) : undefined}
        onAdapt={detail.kind === "recette" ? () => { const m = detail; setDetail(null); setAdapting(m); } : undefined}
        onEdit={(detail.kind === "recette" && onEditRecipe) ? () => { const m = detail; setDetail(null); setEditing(m); } : undefined}
        onDelete={detail.lib ? undefined : () => { onDelete(detail); setDetail(null); }} />}
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

      {pasteOpen && (
        <Sheet open onClose={() => setPasteOpen(false)} title="Coller une recette" subtitle="Texte → recette structurée" icon={<ClipboardPaste size={18} />} iconColor={C.weight}>
          <p className="mb-3 text-xs leading-relaxed" style={{ color: C.sub }}>Colle une recette (ingrédients, quantités, étapes — n'importe quel format). L'assistant en extrait les ingrédients normalisés pour 1 portion et estime kcal/protéines. Tu pourras tout ajuster avant d'enregistrer.</p>
          <textarea value={pasteText} onChange={(e) => setPasteText(e.target.value)} rows={7} placeholder={"Ex.\nPancakes protéinés (2 pers.)\n- 2 œufs\n- 60 g flocons d'avoine\n- 1 banane\n1. Mixer. 2. Cuire à la poêle…"} className="mb-2 w-full resize-none rounded-xl px-3.5 py-3 text-sm outline-none" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }} />
          {pasteErr && <p className="mb-2 text-xs" style={{ color: C.over }}>{pasteErr}</p>}
          <button onClick={doPaste} disabled={pasteBusy || pasteText.trim().length < 20} className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white active:scale-95 disabled:opacity-50" style={{ backgroundColor: C.weight }}>
            {pasteBusy ? <><Loader2 size={16} className="animate-spin" /> Extraction…</> : <><ClipboardPaste size={16} /> Extraire la recette</>}
          </button>
        </Sheet>
      )}
    </div>
    {/* Barre assistant persistante (direction F) — coach en bas, comme l'option C */}
    {onCoachPrompt && <AssistantBar onSend={onCoachPrompt} placeholder="Une idée, une envie… demande au coach" fixed />}
    </>
  );
}
