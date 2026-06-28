import React, { useRef, useEffect, useState } from "react";
import { C } from "../core.js";

// Caméra dispo ? (utilisé pour décider d'afficher le bouton « Scanner » ailleurs).
export const scanSupported = typeof navigator !== "undefined" && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
const hasNativeDetector = typeof window !== "undefined" && "BarcodeDetector" in window;

// Scanner de code-barres autonome. Démarre la caméra au montage (API BarcodeDetector native
// sur Android/Chrome, sinon fallback ZXing chargé à la demande pour iOS), appelle onDetect(code)
// au PREMIER code lu, onClose() sur annulation. Nettoie la caméra au démontage.
// Partagé par OffSearch (frigo) et le chat assistant.
export function BarcodeScanner({ onDetect, onClose, title = "Vise le code-barres…" }) {
  const videoRef = useRef(null);
  const rafRef = useRef(0);
  const zxingRef = useRef(null); // controls du lecteur ZXing
  const doneRef = useRef(false); // garde-fou anti double-lecture
  const [error, setError] = useState("");

  function stop() {
    cancelAnimationFrame(rafRef.current);
    if (zxingRef.current) { try { zxingRef.current.stop(); } catch (_) {} zxingRef.current = null; }
    const v = videoRef.current;
    if (v && v.srcObject) { v.srcObject.getTracks().forEach((t) => t.stop()); v.srcObject = null; }
  }
  function hit(code) { if (doneRef.current || !code) return; doneRef.current = true; stop(); onDetect(code); }

  useEffect(() => {
    let cancelled = false;
    // Voie rapide : BarcodeDetector natif (Android / Chrome).
    async function startNative() {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (cancelled || !videoRef.current) { stream.getTracks().forEach((t) => t.stop()); return; }
      const v = videoRef.current;
      v.srcObject = stream; await v.play();
      const det = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"] });
      const tick = async () => {
        if (!videoRef.current || doneRef.current) return;
        try { const codes = await det.detect(videoRef.current); if (codes && codes.length) return hit(codes[0].rawValue); } catch (_) {}
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }
    // Fallback iOS / navigateurs sans BarcodeDetector : décodage JS via ZXing.
    async function startZXing() {
      if (!videoRef.current) return;
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => { if (result) hit(result.getText()); });
      if (cancelled) { try { controls.stop(); } catch (_) {} return; }
      zxingRef.current = controls;
    }
    (async () => {
      if (!scanSupported) { setError("Caméra indisponible sur cet appareil."); return; }
      try { await (hasNativeDetector ? startNative() : startZXing()); }
      catch (_) { if (!cancelled) setError("Caméra indisponible ou autorisation refusée."); }
    })();
    return () => { cancelled = true; stop(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="rounded-3xl cm-card" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
      <p className="mb-2 text-sm font-semibold" style={{ color: C.ink }}>{title}</p>
      <div className="overflow-hidden rounded-2xl" style={{ backgroundColor: "#000", aspectRatio: "4 / 3" }}>
        <video ref={videoRef} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      {error && <p className="mt-2 text-xs" style={{ color: C.over }}>{error}</p>}
      <button onClick={onClose} className="mt-3 w-full rounded-2xl py-2.5 text-sm font-semibold active:scale-95" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.sub }}>Annuler le scan</button>
    </div>
  );
}
