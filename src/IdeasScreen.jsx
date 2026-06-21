import React, { useState } from "react";
import { ChevronDown, Plus, Bookmark, Check, ChefHat, Search, X, Star, Copy, Gauge, Trash2 } from "lucide-react";
import { C, r0, cardStyle } from "./core.js";
import { Sheet } from "./Sheet.jsx";

const deburr = (str) => (str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/œ/g, "oe").replace(/æ/g, "ae");

const CATS = [
  { k: "pdj", l: "Petit-déj" },
  { k: "dej", l: "Déjeuner" },
  { k: "diner", l: "Dîner" },
  { k: "snack", l: "Snack" },
];

function IdeaCard({ idea, isFav, onToggleFav, onUse, onSave, onDelete }) {
  const [open, setOpen] = useState(false);
  const [used, setUsed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [imgErr, setImgErr] = useState(false);
  const flash = (set) => { set(true); setTimeout(() => set(false), 1500); };
  const catEmoji = { pdj: "🥣", dej: "🥗", diner: "🍲", snack: "🍎" }[idea.cat] || "🍽️";
  const accent = { pdj: C.weight, dej: C.green, diner: C.protein, snack: C.extra }[idea.cat] || C.protein;
  const hasImg = idea.image && !imgErr;
  return (
    <div className="mb-2.5 overflow-hidden rounded-2xl" style={cardStyle()}>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 px-3 py-3 text-left active:opacity-70">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl" style={{ background: `linear-gradient(135deg, ${accent}26, ${accent}0d)`, border: `1px solid ${C.line}` }}>
          {hasImg
            ? <img src={idea.image} alt="" className="h-full w-full object-cover" onError={() => setImgErr(true)} />
            : <span className="text-2xl" aria-hidden="true">{idea.emoji || catEmoji}</span>}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold" style={{ color: C.ink }}>{idea.name}{idea.custom && <span className="ml-1.5 rounded px-1.5 py-0.5 align-middle text-[10px] font-bold" style={{ backgroundColor: `${C.protein}22`, color: C.protein }}>perso</span>}</span>
          <span className="mt-0.5 block text-xs" style={{ color: C.muted, fontVariantNumeric: "tabular-nums" }}>{idea.kcal} kcal · {idea.p} g de protéines</span>
        </span>
        <span onClick={(e) => { e.stopPropagation(); onToggleFav(idea.id); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full active:scale-90" style={{ color: isFav ? C.protein : C.muted }} role="button" aria-label="Favori">
          <Star size={17} fill={isFav ? C.protein : "none"} />
        </span>
        <ChevronDown size={18} style={{ color: C.muted, flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-0.5">
          {hasImg && <img src={idea.image} alt="" className="mb-3 h-40 w-full rounded-xl object-cover" style={{ border: `1px solid ${C.line}` }} onError={() => setImgErr(true)} />}
          {idea.desc && <p className="mb-3 text-sm" style={{ color: C.sub }}>{idea.desc}</p>}

          {idea.ingredients?.length > 0 && (<>
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest" style={{ color: C.muted }}>Ingrédients</p>
            <ul className="mb-3 space-y-1">
              {idea.ingredients.map((it, i) => (
                <li key={i} className="flex gap-2 text-sm" style={{ color: C.sub }}>
                  <span style={{ color: C.protein }}>•</span><span>{it}</span>
                </li>
              ))}
            </ul>
          </>)}

          {idea.steps && idea.steps.length > 0 && (
            <>
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest" style={{ color: C.muted }}>Préparation</p>
              <ol className="mb-3 space-y-1.5">
                {idea.steps.map((st, i) => (
                  <li key={i} className="flex gap-2 text-sm" style={{ color: C.sub }}>
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ backgroundColor: `${C.protein}1f`, color: C.protein }}>{i + 1}</span>
                    <span>{st}</span>
                  </li>
                ))}
              </ol>
            </>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={() => { onUse(idea); flash(setUsed); }} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold text-white active:scale-95" style={{ backgroundColor: C.protein }}>
              {used ? <><Check size={15} /> Ajouté</> : <><Plus size={15} /> Ajouter aujourd'hui</>}
            </button>
            <button onClick={() => { onSave(idea); flash(setSaved); }} className="flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold active:scale-95" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.sub }}>
              {saved ? <><Check size={15} /> Enregistré</> : <><Bookmark size={15} /> Enregistrer</>}
            </button>
            {idea.custom && onDelete && (
              <button onClick={() => onDelete(idea.id)} className="flex items-center justify-center rounded-xl px-3 py-2.5 active:scale-95" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.over }} aria-label="Supprimer la recette"><Trash2 size={15} /></button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function IdeasScreen({ ideas = [], favs = [], onToggleFav, onUse, onSave, onAddRecipe, onDeleteRecipe, remKcal, remP, dateLabel, claudePrompt }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [protOnly, setProtOnly] = useState(false);
  const [quickOnly, setQuickOnly] = useState(false);
  const [favOnly, setFavOnly] = useState(false);
  const [budgetOnly, setBudgetOnly] = useState(false);
  const [copied, setCopied] = useState(false);
  const [adding, setAdding] = useState(false);

  const hasBudget = Number.isFinite(remKcal);
  const budgetCap = hasBudget ? Math.max(0, remKcal) * 1.1 : Infinity; // 10 % de tolérance
  const favSet = new Set(favs);
  const nq = deburr(q);
  const filtered = ideas.filter((i) =>
    (cat === "all" || i.cat === cat) &&
    (!protOnly || i.p >= 20) &&
    (!quickOnly || i.quick) &&
    (!favOnly || favSet.has(i.id)) &&
    (!budgetOnly || i.kcal <= budgetCap) &&
    (!nq || deburr(i.name + " " + (i.ingredients || []).join(" ")).includes(nq))
  );

  const copyForClaude = async () => {
    if (!claudePrompt) return;
    try { await navigator.clipboard.writeText(claudePrompt); } catch (_) {}
    setCopied(true); setTimeout(() => setCopied(false), 1800);
  };

  const chip = (active) => ({
    backgroundColor: active ? C.ink : C.card,
    color: active ? C.bg : C.sub,
    border: `1px solid ${active ? C.ink : C.line}`,
  });

  return (
    <div className="px-1">
      <div className="mb-3 flex items-center gap-2">
        <ChefHat size={22} style={{ color: C.ink }} />
        <h1 className="text-2xl font-extrabold" style={{ color: C.ink, fontFamily: "'Space Grotesk', system-ui" }}>Idées</h1>
        <span className="ml-auto text-xs font-semibold" style={{ color: C.muted }}>{filtered.length} recette{filtered.length > 1 ? "s" : ""}</span>
      </div>

      {/* Recherche */}
      <div className="relative mb-3">
        <Search size={16} style={{ color: C.muted, position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher une recette, un ingrédient…"
          className="w-full rounded-2xl py-2.5 pl-9 pr-9 text-sm outline-none"
          style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }}
        />
        {q && (
          <button onClick={() => setQ("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: C.muted }}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* Actions : ajouter ma recette + copier pour Claude */}
      <div className="mb-3 flex gap-2">
        {onAddRecipe && (
          <button onClick={() => setAdding(true)} className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-semibold text-white active:scale-95" style={{ backgroundColor: C.protein }}>
            <Plus size={15} /> Ajouter une recette
          </button>
        )}
        {claudePrompt && (
          <button onClick={copyForClaude} title="Copier ma base + budget pour Claude" className="flex shrink-0 items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold active:scale-95" style={{ backgroundColor: copied ? `${C.green}1a` : C.card, border: `1px solid ${copied ? C.green : C.line}`, color: copied ? C.green : C.ink }}>
            {copied ? <><Check size={15} /> Copié</> : <><Copy size={15} /> Claude</>}
          </button>
        )}
      </div>

      {/* Catégorie — axe principal */}
      <div className="mb-2 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        <button onClick={() => setCat("all")} className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95" style={chip(cat === "all")}>Tout</button>
        {CATS.map((c) => (
          <button key={c.k} onClick={() => setCat(c.k)} className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95" style={chip(cat === c.k)}>{c.l}</button>
        ))}
      </div>

      {/* Affiner — axe secondaire (toggles indépendants) */}
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {hasBudget && <button onClick={() => setBudgetOnly((v) => !v)} className="flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95" style={chip(budgetOnly)}><Gauge size={13} /> Dans mon budget</button>}
        <button onClick={() => setFavOnly((v) => !v)} className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95" style={chip(favOnly)}>⭐ Favoris</button>
        <button onClick={() => setProtOnly((v) => !v)} className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95" style={chip(protOnly)}>💪 Protéiné</button>
        <button onClick={() => setQuickOnly((v) => !v)} className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95" style={chip(quickOnly)}>⚡ Rapide</button>
      </div>

      {budgetOnly && (
        <p className="mb-4 px-1 text-xs" style={{ color: C.muted }}>
          Recettes qui tiennent dans ce qu'il te reste {dateLabel ? `(${dateLabel})` : ""} : <span className="font-semibold" style={{ color: C.weight }}>{r0(Math.max(0, remKcal))} kcal</span>{Number.isFinite(remP) && <> · <span className="font-semibold" style={{ color: C.protein }}>{r0(Math.max(0, remP))} g prot.</span></>}. Change de jour sur l'écran Jour pour anticiper.
        </p>
      )}

      {filtered.length === 0 && (
        <p className="py-10 text-center text-sm" style={{ color: C.muted }}>{favOnly ? "Aucun favori pour l'instant — touche l'étoile sur une recette." : "Aucune recette ne correspond."}</p>
      )}

      {cat === "all" ? (
        // Mode « Tout » : groupé par créneau (les en-têtes aident à se repérer)
        CATS.map((c) => {
          let list = filtered.filter((i) => i.cat === c.k);
          if (budgetOnly && hasBudget) list = [...list].sort((a, b) => Math.abs(remKcal - a.kcal) - Math.abs(remKcal - b.kcal));
          if (!list.length) return null;
          return (
            <div key={c.k} className="mb-5">
              <h2 className="mb-2 px-1 text-sm font-bold uppercase tracking-widest" style={{ color: C.sub }}>{c.l}</h2>
              {list.map((idea) => <IdeaCard key={idea.id} idea={idea} isFav={favSet.has(idea.id)} onToggleFav={onToggleFav} onUse={onUse} onSave={onSave} onDelete={onDeleteRecipe} />)}
            </div>
          );
        })
      ) : (
        // Catégorie sélectionnée : liste à plat (pas d'en-tête redondant)
        <div className="mb-5">
          {(budgetOnly && hasBudget ? [...filtered].sort((a, b) => Math.abs(remKcal - a.kcal) - Math.abs(remKcal - b.kcal)) : filtered)
            .map((idea) => <IdeaCard key={idea.id} idea={idea} isFav={favSet.has(idea.id)} onToggleFav={onToggleFav} onUse={onUse} onSave={onSave} onDelete={onDeleteRecipe} />)}
        </div>
      )}

      <div style={{ height: "0.5rem" }} />

      {adding && <AddRecipeSheet onClose={() => setAdding(false)} onAdd={(r) => { onAddRecipe(r); setAdding(false); }} />}
    </div>
  );
}

function AddRecipeSheet({ onClose, onAdd }) {
  const [name, setName] = useState("");
  const [cat, setCat] = useState("dej");
  const [kcal, setKcal] = useState("");
  const [p, setP] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [steps, setSteps] = useState("");
  const [quick, setQuick] = useState(false);
  const valid = name.trim() && !isNaN(parseInt(kcal, 10));
  const submit = () => {
    if (!valid) return;
    onAdd({
      name: name.trim(), cat, kcal: parseInt(kcal, 10), p: parseInt(p, 10) || 0,
      ingredients: ingredients.split("\n").map((s) => s.trim()).filter(Boolean),
      steps: steps.split("\n").map((s) => s.trim()).filter(Boolean),
      quick,
    });
  };
  const field = { backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink };
  const lab = "mb-1 block text-xs font-semibold uppercase tracking-wide";
  return (
    <Sheet open onClose={onClose} title="Nouvelle recette"
      headerRight={<button onClick={onClose} className="rounded-full p-1.5 active:scale-90" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }} aria-label="Fermer"><X size={16} /></button>}>
      <label className={lab} style={{ color: C.sub }}>Nom</label>
      <input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Ex. Bowl tofu cacahuète" className="mb-3 w-full rounded-xl px-3.5 py-3 text-sm outline-none" style={field} />

      <label className={lab} style={{ color: C.sub }}>Créneau</label>
      <div className="mb-3 flex gap-2">
        {CATS.map((c) => (
          <button key={c.k} onClick={() => setCat(c.k)} className="flex-1 rounded-xl py-2 text-xs font-semibold active:scale-95" style={cat === c.k ? { backgroundColor: C.ink, color: C.bg } : { backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }}>{c.l}</button>
        ))}
      </div>

      <div className="mb-3 flex gap-2">
        <div className="flex-1">
          <label className={lab} style={{ color: C.sub }}>Calories</label>
          <input value={kcal} onChange={(e) => setKcal(e.target.value)} inputMode="numeric" placeholder="kcal" className="w-full rounded-xl px-3.5 py-3 text-sm outline-none" style={field} />
        </div>
        <div className="flex-1">
          <label className={lab} style={{ color: C.sub }}>Protéines</label>
          <input value={p} onChange={(e) => setP(e.target.value)} inputMode="numeric" placeholder="g" className="w-full rounded-xl px-3.5 py-3 text-sm outline-none" style={field} />
        </div>
      </div>

      <label className={lab} style={{ color: C.sub }}>Ingrédients <span style={{ textTransform: "none", color: C.muted }}>(un par ligne)</span></label>
      <textarea value={ingredients} onChange={(e) => setIngredients(e.target.value)} rows={4} placeholder={"200 g tofu ferme\n1 c.à.s beurre de cacahuète\n100 g riz"} className="mb-3 w-full rounded-xl px-3.5 py-2.5 text-sm outline-none" style={field} />

      <label className={lab} style={{ color: C.sub }}>Préparation <span style={{ textTransform: "none", color: C.muted }}>(optionnel, une étape par ligne)</span></label>
      <textarea value={steps} onChange={(e) => setSteps(e.target.value)} rows={3} placeholder={"Cuire le riz\nPoêler le tofu\nMélanger la sauce"} className="mb-3 w-full rounded-xl px-3.5 py-2.5 text-sm outline-none" style={field} />

      <button onClick={() => setQuick((v) => !v)} className="mb-4 flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95" style={quick ? { backgroundColor: C.ink, color: C.bg } : { backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }}>⚡ Rapide {quick ? "· oui" : ""}</button>

      <button onClick={submit} disabled={!valid} className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white active:scale-95" style={{ backgroundColor: valid ? C.protein : C.line }}><Plus size={16} /> Enregistrer la recette</button>
    </Sheet>
  );
}
