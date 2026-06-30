import React from "react";
import { C, scoreProduct } from "../core.js";

// Indicateur « densité protéique » adapté au contexte de l'app (perte de gras + haut protéines) :
// basé sur kcal par gramme de protéine (scoreProduct). 🟢 protéiné · 🟡 correct · 🔴 calorique.
// Renvoie null si pas de protéine (ex. huile, sucre) → on n'affiche RIEN (un staple n'est pas « mauvais »).
// kcal/p = macros d'une portion (recette/repas) OU densité /100 (frigo) — le ratio est le même.
const LABELS = { good: "protéiné", mid: "correct", bad: "calorique" };
export const flagColor = (flag) => (flag === "good" ? C.green : flag === "mid" ? C.warn : C.over);

export function proteinFlag({ kcal, p } = {}) {
  const v = scoreProduct({ kcal, p });
  if (!v) return null;
  return { flag: v.flag, color: flagColor(v.flag), label: LABELS[v.flag], ratio: v.ratio };
}

export function ProteinFlag({ kcal, p, className = "", dotOnly = false }) {
  const f = proteinFlag({ kcal, p });
  if (!f) return null;
  if (dotOnly) return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${className}`} style={{ backgroundColor: f.color }} title={`densité protéique : ${f.label}`} aria-label={`densité protéique : ${f.label}`} />;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${className}`} style={{ backgroundColor: `${f.color}1f`, color: f.color }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: f.color }} /> {f.label}
    </span>
  );
}
