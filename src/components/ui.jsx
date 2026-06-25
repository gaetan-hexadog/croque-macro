import React from "react";
import { C } from "../core.js";

// ─────────────────────────────────────────────────────────────────────────────
// Primitives d'UI partagées — garantissent un rendu uniforme d'un écran à l'autre
// (et évitent la dérive : un ajustement ici se propage partout).
// ─────────────────────────────────────────────────────────────────────────────

// Titre de section unifié : petite capitale espacée, sobre. `right` = action optionnelle
// alignée à droite (ex. « Modèles », « Tout voir »).
export function SectionTitle({ children, right, className = "" }) {
  return (
    <div className={`mb-2.5 flex items-end justify-between px-1 ${className}`}>
      <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: C.sub }}>{children}</h2>
      {right}
    </div>
  );
}
