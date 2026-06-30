import React, { useState } from "react";
import { Wand2, Pencil, Trash2, ChefHat, Share2, Check, BookmarkPlus, SlidersHorizontal, Star } from "lucide-react";
import { C, oneEmoji } from "../core.js";
import { Sheet } from "./Sheet.jsx";
import { VariantChips, applyVariants, variantLabels } from "./VariantChips.jsx";
import { formatRecipeText, shareOrCopy } from "../lib/share.js";

export const kindMeta = {
  recette: { label: "Recette", color: C.weight },
  combo: { label: "Repas", color: C.protein },
  aliment: { label: "Aliment", color: C.green },
};
export const kindColor = (k) => (kindMeta[k] || kindMeta.aliment).color;
export const SLOT_CHOICES = [["pdj", "Petit-déj"], ["dej", "Déj"], ["diner", "Dîner"], ["snack", "En-cas"]];
// Créneau du moment (heure locale) → mis en avant dans la fiche.
const nowSlot = () => { const h = new Date().getHours(); return h < 11 ? "pdj" : h < 15 ? "dej" : h < 18 ? "snack" : "diner"; };

// Fiche recette/repas UNIFIÉE (Cuisine + Suivi journalier). Actions optionnelles selon le
// contexte : onUse → « Ajouter à un créneau » (+ variantes) ; onAdapt → assistant ;
// onEdit / onDelete → gestion. Bouton « Partager » dispo partout (texte propre → feuille Android).
export function RecipeDetailSheet({ m, onClose, onUse, onAdapt, onEdit, onDelete, onSave, saved, onApplyVariant, isFav, onToggleFav }) {
  const [varSel, setVarSel] = useState(() => new Set());
  const [shared, setShared] = useState(null); // "shared" | "copied" | "fail"
  const [savedLocal, setSavedLocal] = useState(false);
  const now = nowSlot();
  const meta = kindMeta[m.kind] || kindMeta.aliment;
  const canAdd = !!onUse;
  const canVary = !!onApplyVariant; // consultation depuis le suivi : ajuster un repas (planifié) loggé
  // Base des variantes : depuis le suivi, un item loggé porte m.base (macros/nom d'origine) ;
  // en cuisine, la recette ELLE-MÊME est la base.
  const variants = Array.isArray(m.variants) ? m.variants : [];
  const varBase = { name: m.base?.name ?? m.name, kcal: m.base?.kcal ?? m.kcal, p: m.base?.p ?? m.p, variants };
  const hasVariants = (canAdd || canVary) && variants.length > 0;
  const eff = applyVariants(varBase, varSel);
  const isSaved = saved || savedLocal;
  const toggleVar = (i) => setVarSel((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; });
  const varName = () => { const labels = variantLabels(varBase, varSel); return labels.length ? `${varBase.name} · ${labels.join(", ")}` : varBase.name; };
  const add = (slot) => { onUse({ ...m, kcal: eff.kcal, p: eff.p, name: varName(), base: { name: varBase.name, kcal: varBase.kcal, p: varBase.p }, variants }, slot); onClose(); };
  const applyVar = () => { onApplyVariant({ kcal: eff.kcal, p: eff.p, name: varName() }); onClose(); };
  const share = async () => { const r = await shareOrCopy(formatRecipeText(m), m.name); if (r !== "abort") { setShared(r); setTimeout(() => setShared(null), 2000); } };
  const shareLabel = shared === "copied" ? "Copié !" : shared === "fail" ? "Échec — réessaie" : shared === "shared" ? "Partagé" : "Partager la recette";

  return (
    <Sheet open onClose={onClose} title={m.name} subtitle={`${eff.kcal} kcal · ${eff.p} g prot.${varSel.size ? " · ajusté" : ""}`} icon={m.emoji ? <span className="text-lg leading-none">{oneEmoji(m.emoji)}</span> : <ChefHat size={18} />} iconColor={meta.color}
      headerRight={onToggleFav && (
        <button onClick={onToggleFav} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }} aria-label={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}>
          <Star size={16} fill={isFav ? C.protein : "none"} color={isFav ? C.protein : C.muted} />
        </button>
      )}>
      <button onClick={share} className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-bold active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: shared && shared !== "fail" ? C.green : C.sub }}>
        {shared && shared !== "fail" ? <Check size={16} /> : <Share2 size={16} />} {shareLabel}
      </button>

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
            <VariantChips variants={variants} sel={varSel} onToggle={toggleVar} />
            {canVary && <p className="mt-1.5 text-[11px]" style={{ color: C.muted }}>Coche des variantes pour ajuster ce repas{m.planned ? " planifié" : ""}.</p>}
          </section>
        )}
      </div>

      {(canAdd || canVary || onAdapt || onEdit || onDelete || onSave) && (
        <div className="mt-5 space-y-3">
          {canAdd && (
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-widest" style={{ color: C.muted }}>Ajouter à</p>
              <div className="grid grid-cols-4 gap-2">
                {SLOT_CHOICES.map(([k, l]) => {
                  const hot = k === now;
                  return <button key={k} onClick={() => add(k)} className="flex flex-col items-center gap-0.5 rounded-xl py-2.5 text-xs font-bold active:scale-95" style={hot ? { backgroundColor: C.green, color: "#fff" } : { backgroundColor: `${meta.color}14`, color: meta.color }}>{l}{hot && <span className="text-[8px] font-semibold opacity-90">maintenant</span>}</button>;
                })}
              </div>
            </div>
          )}
          {canVary && hasVariants && (
            <button onClick={applyVar} disabled={varSel.size === 0} className="flex w-full items-center justify-center gap-1.5 rounded-2xl py-2.5 text-xs font-bold text-white active:scale-95 disabled:opacity-50" style={{ backgroundColor: C.green }}>
              <SlidersHorizontal size={15} /> {varSel.size ? `Mettre à jour ce repas · ${eff.kcal} kcal · ${eff.p} g` : "Choisis une variante pour ajuster"}
            </button>
          )}
          {onSave && (isSaved ? (
            <p className="flex items-center justify-center gap-1.5 rounded-2xl py-2.5 text-xs font-bold" style={{ backgroundColor: `${C.green}14`, color: C.green }}><Check size={15} /> Déjà dans ta cuisine</p>
          ) : (
            <button onClick={() => { onSave(); setSavedLocal(true); }} className="flex w-full items-center justify-center gap-1.5 rounded-2xl py-2.5 text-xs font-bold active:scale-95" style={{ backgroundColor: `${C.weight}1f`, color: C.weight, border: `1px solid ${C.weight}55` }}><BookmarkPlus size={15} /> Enregistrer dans ma cuisine</button>
          ))}
          {(onAdapt || onEdit) && (
            <div className="flex gap-2">
              {onAdapt && <button onClick={onAdapt} className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-2.5 text-xs font-bold active:scale-95" style={{ backgroundColor: `${C.weight}1f`, color: C.weight }}><Wand2 size={15} /> Personnaliser</button>}
              {onEdit && <button onClick={onEdit} className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-2.5 text-xs font-bold active:scale-95" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.sub }}><Pencil size={15} /> Modifier</button>}
              {onDelete && <button onClick={onDelete} className="flex items-center justify-center rounded-2xl px-3.5 active:scale-95" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.over }} aria-label="Supprimer"><Trash2 size={16} /></button>}
            </div>
          )}
          {!onAdapt && !onEdit && onDelete && (
            <button onClick={onDelete} className="flex w-full items-center justify-center gap-1.5 rounded-2xl py-2.5 text-xs font-bold active:scale-95" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.over }}><Trash2 size={15} /> Supprimer</button>
          )}
        </div>
      )}
    </Sheet>
  );
}
