import React, { useEffect } from "react";
import { C } from "./core.js";

// Toast léger avec action « Annuler ». Auto-dismiss après 4 s.
// Fond OPAQUE (cardSolid) — un fond translucide le rendait invisible sur le thème sombre.
export function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
    // dépend de l'id du toast uniquement → le timer ne se réarme pas à chaque re-render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast?.id]);
  if (!toast) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4" style={{ bottom: "calc(env(safe-area-inset-bottom) + 5.5rem)" }}>
      <div
        className="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl py-2.5 pl-4 pr-2"
        style={{
          backgroundColor: C.cardSolid || C.sheet,
          border: `1px solid ${C.line}`,
          borderTop: `1px solid ${C.cardTop}`,
          boxShadow: `0 16px 40px -10px ${C.shadow}, 0 4px 12px rgba(0,0,0,0.28)`,
        }}
        role="status"
        aria-live="polite"
      >
        <span className="text-sm font-semibold" style={{ color: C.ink }}>{toast.msg}</span>
        {toast.undo && (
          <button onClick={() => { toast.undo(); onClose(); }} className="rounded-full px-3 py-1.5 text-sm font-bold active:scale-95" style={{ backgroundColor: `${C.green}22`, color: C.green }}>Annuler</button>
        )}
      </div>
    </div>
  );
}
