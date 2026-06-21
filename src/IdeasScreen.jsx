import React, { useState } from "react";
import { ChevronDown, Plus, Bookmark, Check, ChefHat, Search, X, Star, Copy, Gauge } from "lucide-react";
import { C, r0, cardStyle } from "./core.js";

const deburr = (str) => (str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/œ/g, "oe").replace(/æ/g, "ae");

const CATS = [
  { k: "pdj", l: "Petit-déj" },
  { k: "dej", l: "Déjeuner" },
  { k: "diner", l: "Dîner" },
  { k: "snack", l: "Snack" },
];

function IdeaCard({ idea, isFav, onToggleFav, onUse, onSave }) {
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
          <span className="block text-sm font-bold" style={{ color: C.ink }}>{idea.name}</span>
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

          <p className="mb-1 text-xs font-semibold uppercase tracking-widest" style={{ color: C.muted }}>Ingrédients</p>
          <ul className="mb-3 space-y-1">
            {idea.ingredients.map((it, i) => (
              <li key={i} className="flex gap-2 text-sm" style={{ color: C.sub }}>
                <span style={{ color: C.protein }}>•</span><span>{it}</span>
              </li>
            ))}
          </ul>

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
          </div>
        </div>
      )}
    </div>
  );
}

export function IdeasScreen({ ideas = [], favs = [], onToggleFav, onUse, onSave, remKcal, remP, dateLabel, claudePrompt }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [protOnly, setProtOnly] = useState(false);
  const [quickOnly, setQuickOnly] = useState(false);
  const [favOnly, setFavOnly] = useState(false);
  const [budgetOnly, setBudgetOnly] = useState(false);
  const [copied, setCopied] = useState(false);

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

      {/* Copier ma base + budget pour Claude.ai */}
      {claudePrompt && (
        <button onClick={copyForClaude} className="mb-3 flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-semibold active:scale-95" style={{ backgroundColor: copied ? `${C.green}1a` : C.card, border: `1px solid ${copied ? C.green : C.line}`, color: copied ? C.green : C.ink }}>
          {copied ? <><Check size={15} /> Copié — colle-le dans Claude.ai</> : <><Copy size={15} /> Copier ma base + budget pour Claude</>}
        </button>
      )}

      {/* Filtres */}
      <div className="mb-2 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {hasBudget && <button onClick={() => setBudgetOnly((v) => !v)} className="flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95" style={chip(budgetOnly)}><Gauge size={13} /> Dans mon budget</button>}
        <button onClick={() => setFavOnly((v) => !v)} className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95" style={chip(favOnly)}>⭐ Favoris</button>
        <button onClick={() => setCat("all")} className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95" style={chip(cat === "all")}>Tout</button>
        {CATS.map((c) => (
          <button key={c.k} onClick={() => setCat(c.k)} className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95" style={chip(cat === c.k)}>{c.l}</button>
        ))}
        <button onClick={() => setProtOnly((v) => !v)} className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95" style={chip(protOnly)}>💪 Protéiné</button>
        <button onClick={() => setQuickOnly((v) => !v)} className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95" style={chip(quickOnly)}>⚡ Rapide</button>
      </div>

      {budgetOnly && (
        <p className="mb-4 px-1 text-xs" style={{ color: C.muted }}>
          Recettes qui tiennent dans ce qu'il te reste {dateLabel ? `(${dateLabel})` : ""} : <span className="font-semibold" style={{ color: C.weight }}>{r0(Math.max(0, remKcal))} kcal</span>{Number.isFinite(remP) && <> · <span className="font-semibold" style={{ color: C.protein }}>{r0(Math.max(0, remP))} g prot.</span></>}. Change de jour sur l'écran Jour pour anticiper.
        </p>
      )}
      {!budgetOnly && <div className="mb-3" />}

      {filtered.length === 0 && (
        <p className="py-10 text-center text-sm" style={{ color: C.muted }}>{favOnly ? "Aucun favori pour l'instant — touche l'étoile sur une recette." : "Aucune recette ne correspond."}</p>
      )}

      {CATS.map((c) => {
        let list = filtered.filter((i) => i.cat === c.k);
        if (budgetOnly && hasBudget) list = [...list].sort((a, b) => Math.abs(remKcal - a.kcal) - Math.abs(remKcal - b.kcal)); // au plus proche du budget d'abord
        if (!list.length) return null;
        return (
          <div key={c.k} className="mb-5">
            <h2 className="mb-2 px-1 text-sm font-bold uppercase tracking-widest" style={{ color: C.sub }}>{c.l}</h2>
            {list.map((idea) => <IdeaCard key={idea.id} idea={idea} isFav={favSet.has(idea.id)} onToggleFav={onToggleFav} onUse={onUse} onSave={onSave} />)}
          </div>
        );
      })}

      <div style={{ height: "0.5rem" }} />
    </div>
  );
}
