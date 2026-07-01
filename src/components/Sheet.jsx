import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft } from "lucide-react";
import { C } from "../core.js";

const reduceMotion = () => typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Bottom-sheet partagée : slide-up, poignée, et SWIPE-VERS-LE-BAS pour fermer
// depuis n'importe où tant que le contenu est en haut (sinon on scrolle). Le tap
// sur le fond ferme aussi. overscroll-behavior empêche le pull-to-refresh.
export function Sheet({ open, onClose, children, title, subtitle, icon, iconColor, onBack, headerRight, stickyHeader, footer, maxHeight = "92vh", z = 30 }) {
  const [shown, setShown] = useState(false);
  const [dragY, setDragY] = useState(0);
  const startRef = useRef(null);
  const scrollRef = useRef(null);
  const reduce = reduceMotion();

  useEffect(() => {
    if (!open) { setShown(false); return; }
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  if (!open) return null;

  const onTouchStart = (e) => { startRef.current = e.touches[0].clientY; };
  const onTouchMove = (e) => {
    if (startRef.current == null) return;
    const dy = e.touches[0].clientY - startRef.current;
    if (dy > 0) setDragY(dy); else if (dragY !== 0) setDragY(0); // glisser vers le bas = fermer
  };
  const onTouchEnd = () => { if (dragY > 90) onClose(); setDragY(0); startRef.current = null; };

  const translate = shown ? dragY : (reduce ? 0 : 640);
  // Portal vers <body> : sinon `position: fixed` se cale sur un ancêtre transformé
  // (cartes, animations) au lieu du viewport → la sheet s'affiche dans la carte.
  const node = (
    <div
      className="fixed inset-0 flex items-end justify-center"
      style={{ zIndex: z, backgroundColor: C.overlay, backdropFilter: "blur(3px)", opacity: shown ? 1 : 0, transition: reduce ? "none" : "opacity .25s ease" }}
      onClick={(e) => { e.stopPropagation(); onClose(); }}
    >
      <div
        className="flex w-full max-w-md flex-col rounded-t-3xl"
        style={{ maxHeight, backgroundColor: C.sheet, transform: `translateY(${translate}px)`, transition: dragY || reduce ? "none" : "transform .34s cubic-bezier(.22,1,.36,1)", boxShadow: `0 -24px 64px -32px ${C.shadow}` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête unifié (icône · titre · sous-titre · retour · close). Le swipe-pour-
            fermer n'est armé QUE sur cette zone, pour ne pas voler les taps du contenu. */}
        <div className="shrink-0 px-5 pt-3" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
          <div className="mx-auto mb-2.5 h-1.5 w-10 rounded-full" style={{ backgroundColor: C.line }} />
          <div className="mb-2 flex items-center gap-2.5">
            {onBack && <button onClick={onBack} aria-label="Retour" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }}><ChevronLeft size={18} /></button>}
            {icon && <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${iconColor || C.accent}1f`, color: iconColor || C.accent }}>{icon}</span>}
            <div className="min-w-0 flex-1">
              {title && <h2 className="truncate text-base font-bold leading-tight" style={{ color: C.ink }}>{title}</h2>}
              {subtitle && <p className="truncate text-xs" style={{ color: C.muted }}>{subtitle}</p>}
            </div>
            {headerRight}
            <button onClick={onClose} aria-label="Fermer" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }}><X size={16} /></button>
          </div>
        </div>
        {stickyHeader && <div className="shrink-0 px-5 pb-2 pt-1">{stickyHeader}</div>}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 pb-5" style={{ overscrollBehavior: "contain" }}>{children}</div>
        {/* Footer épinglé hors du scroll (ex. composer d'« Une idée de repas ») */}
        {footer && <div className="shrink-0 border-t px-5 pb-4 pt-3" style={{ borderColor: C.line, backgroundColor: C.sheet }}>{footer}</div>}
      </div>
    </div>
  );
  return typeof document !== "undefined" ? createPortal(node, document.body) : node;
}
