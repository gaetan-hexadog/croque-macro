import React, { useEffect } from "react";
import { C, cardStyle } from "./core.js";

// Toast léger avec action « Annuler ». Auto-dismiss après 5 s.
export function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [toast, onClose]);
  if (!toast) return null;
  return (
    <div className="fixed inset-x-0 z-40 flex justify-center px-4" style={{ bottom: "calc(env(safe-area-inset-bottom) + 5.5rem)" }}>
      <div className="flex items-center gap-3 rounded-full py-2.5 pl-4 pr-2" style={cardStyle({ boxShadow: `0 14px 34px -12px ${C.shadow}` })}>
        <span className="text-sm font-medium" style={{ color: C.ink }}>{toast.msg}</span>
        {toast.undo && (
          <button onClick={() => { toast.undo(); onClose(); }} className="rounded-full px-3 py-1 text-sm font-bold active:scale-95" style={{ backgroundColor: `${C.green}1f`, color: C.green }}>Annuler</button>
        )}
      </div>
    </div>
  );
}
