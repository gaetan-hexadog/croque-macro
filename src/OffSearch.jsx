import React, { useState, useRef, useEffect } from "react";
import { Search, ScanLine, X, Check, Plus, Loader, Bookmark } from "lucide-react";
import { searchProducts, fetchProductByBarcode } from "./openfoodfacts.js";

// Recherche Open Food Facts : texte + scan code-barres, puis saisie au gramme.
// Reçoit le thème `C` et `accent` en props pour éviter tout couplage avec App.
export default function OffSearch({ C, accent, onChoose, onSave, initialQuery = "" }) {
  const [q, setQ] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [grams, setGrams] = useState("100");
  const [scanning, setScanning] = useState(false);
  const [saved, setSaved] = useState(false);
  const videoRef = useRef(null);
  const rafRef = useRef(0);
  const abortRef = useRef(null);

  useEffect(() => { if (initialQuery && initialQuery.trim()) runSearch(); /* lance la recherche en ligne avec la requête héritée */ }, []);

  const fmt = (v) => (v == null ? "—" : Number.isInteger(v) ? String(v) : String(Math.round(v * 10) / 10).replace(".", ","));
  const supported = typeof window !== "undefined" && "BarcodeDetector" in window;

  async function runSearch() {
    const term = q.trim();
    if (!term) return;
    setLoading(true); setError(""); setSelected(null); setResults([]);
    try {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();
      const list = await searchProducts(term, { signal: abortRef.current.signal });
      setResults(list);
      if (list.length === 0) setError("Aucun produit trouvé.");
    } catch (e) {
      if (e.name !== "AbortError") setError("Recherche indisponible — le réseau ne fonctionne que dans l'app déployée.");
    } finally {
      setLoading(false);
    }
  }

  async function startScan() {
    setError("");
    if (!supported) { setError("Le scan nécessite Chrome sur Android."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      setScanning(true);
      await new Promise((r) => setTimeout(r, 0));
      const v = videoRef.current;
      if (!v) { stream.getTracks().forEach((t) => t.stop()); setScanning(false); return; }
      v.srcObject = stream;
      await v.play();
      const det = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"] });
      const tick = async () => {
        if (!videoRef.current) return;
        try {
          const codes = await det.detect(videoRef.current);
          if (codes && codes.length) { const code = codes[0].rawValue; stopScan(); lookupBarcode(code); return; }
        } catch (_) {}
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (e) {
      setScanning(false);
      setError("Caméra indisponible ou autorisation refusée.");
    }
  }

  function stopScan() {
    cancelAnimationFrame(rafRef.current);
    const v = videoRef.current;
    if (v && v.srcObject) { v.srcObject.getTracks().forEach((t) => t.stop()); v.srcObject = null; }
    setScanning(false);
  }

  async function lookupBarcode(code) {
    setLoading(true); setError(""); setResults([]); setSelected(null);
    try {
      const p = await fetchProductByBarcode(code);
      if (!p) setError(`Code ${code} introuvable dans Open Food Facts.`);
      else if (p.per100.kcal == null) setError("Produit trouvé mais sans valeurs nutritionnelles.");
      else { setSelected(p); setGrams("100"); }
    } catch (e) {
      setError("Lecture indisponible (réseau).");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => () => { stopScan(); if (abortRef.current) abortRef.current.abort(); }, []);

  const g = Math.max(0, parseFloat((grams || "").replace(",", ".")) || 0);
  const calc = selected
    ? {
        kcal: Math.round((selected.per100.kcal || 0) * g / 100),
        p: Math.round((selected.per100.p || 0) * g / 10) / 10,
        c: selected.per100.c != null ? Math.round(selected.per100.c * g / 10) / 10 : null,
        f: selected.per100.f != null ? Math.round(selected.per100.f * g / 10) / 10 : null,
      }
    : null;

  function add() {
    if (!selected || !calc || g <= 0) return;
    onChoose({
      id: `off-${selected.code}-${Date.now()}`,
      name: `${selected.name}${selected.brand ? ` · ${selected.brand}` : ""} (${fmt(g)} g)`,
      kcal: calc.kcal, p: calc.p, c: calc.c, f: calc.f,
      qty: 1, off: true, code: selected.code,
    });
  }

  function save() {
    if (!selected || !calc || g <= 0 || !onSave) return;
    onSave({
      id: `off-${selected.code}`,
      name: `${selected.name}${selected.brand ? ` · ${selected.brand}` : ""} (${fmt(g)} g)`,
      kcal: calc.kcal, p: calc.p, c: calc.c, f: calc.f,
      slots: ["pdj", "dej", "diner", "snack"], tags: [],
      desc: `${fmt(g)} g · Open Food Facts`, custom: true, off: true, code: selected.code,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  // ── Vue scan ──
  if (scanning) {
    return (
      <div className="rounded-3xl p-4" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
        <p className="mb-2 text-sm font-semibold" style={{ color: C.ink }}>Vise le code-barres…</p>
        <div className="overflow-hidden rounded-2xl" style={{ backgroundColor: "#000", aspectRatio: "4 / 3" }}>
          <video ref={videoRef} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
        <button onClick={stopScan} className="mt-3 w-full rounded-2xl py-2.5 text-sm font-semibold active:scale-95" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.sub }}>Annuler le scan</button>
      </div>
    );
  }

  // ── Vue produit sélectionné (saisie grammes) ──
  if (selected) {
    return (
      <div className="rounded-3xl p-4" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
        <div className="mb-1 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-base font-bold" style={{ color: C.ink }}>{selected.name}</p>
            {selected.brand && <p className="text-xs" style={{ color: C.sub }}>{selected.brand}{selected.quantity ? ` · ${selected.quantity}` : ""}</p>}
          </div>
          <button onClick={() => setSelected(null)} className="shrink-0 rounded-full p-1.5 active:scale-90" style={{ color: C.muted }}><X size={16} /></button>
        </div>
        <p className="mb-3 text-xs" style={{ color: C.muted }}>Pour 100 g : {fmt(selected.per100.kcal)} kcal · {fmt(selected.per100.p)} g prot.</p>

        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: C.sub }}>Quantité</span>
          <input value={grams} onChange={(e) => setGrams(e.target.value)} inputMode="decimal" className="w-24 rounded-xl px-3 py-2 text-center text-sm font-bold outline-none" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink }} />
          <span className="text-sm" style={{ color: C.muted }}>g</span>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-2xl p-3" style={{ backgroundColor: C.paper }}>
          <div className="leading-tight" style={{ fontVariantNumeric: "tabular-nums" }}>
            <p className="text-2xl font-extrabold" style={{ color: C.ink }}>{calc.kcal} <span className="text-sm font-medium" style={{ color: C.sub }}>kcal</span></p>
            <p className="text-xs font-semibold" style={{ color: C.protein }}>{fmt(calc.p)} g prot.{calc.c != null ? <span style={{ color: C.muted }}> · {fmt(calc.c)} g gluc · {fmt(calc.f)} g lip</span> : null}</p>
          </div>
          <button onClick={add} disabled={g <= 0} className="flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-sm font-bold text-white active:scale-95" style={{ backgroundColor: g > 0 ? accent : C.line }}><Plus size={16} /> Ajouter</button>
        </div>

        {onSave && (
          <button onClick={save} disabled={g <= 0} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-semibold active:scale-95" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: saved ? accent : C.sub }}>
            {saved ? <><Check size={15} /> Enregistré dans ta base</> : <><Bookmark size={15} /> Enregistrer dans ma base</>}
          </button>
        )}
      </div>
    );
  }

  // ── Vue recherche ──
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 rounded-2xl px-3 py-2.5" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
        <Search size={16} style={{ color: C.muted }} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") runSearch(); }}
          placeholder="Rechercher un produit (skyr, pain…)"
          className="w-full bg-transparent text-sm outline-none"
          style={{ color: C.ink }}
        />
        <button onClick={runSearch} className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold text-white active:scale-95" style={{ backgroundColor: accent }}>OK</button>
      </div>

      <button onClick={startScan} className="mb-3 flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-semibold active:scale-95" style={{ backgroundColor: `${accent}1a`, color: accent }}>
        <ScanLine size={16} /> Scanner un code-barres
      </button>

      {loading && <div className="flex items-center justify-center gap-2 py-6 text-sm" style={{ color: C.muted }}><Loader size={15} className="animate-spin" /> Recherche…</div>}
      {error && !loading && <p className="rounded-2xl p-3 text-sm" style={{ backgroundColor: C.paper, color: C.sub }}>{error}</p>}

      {!loading && results.length > 0 && (
        <div className="space-y-2">
          {results.map((p) => (
            <button key={p.code} onClick={() => { setSelected(p); setGrams("100"); }} className="flex w-full items-center gap-3 rounded-2xl p-3 text-left active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold" style={{ color: C.ink }}>{p.name}</p>
                <p className="truncate text-xs" style={{ color: C.sub }}>{p.brand || "—"} · <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(p.per100.kcal)} kcal / 100 g</span></p>
              </div>
              <Check size={16} style={{ color: C.line }} />
            </button>
          ))}
        </div>
      )}

      {!loading && !error && results.length === 0 && (
        <p className="px-1 py-4 text-center text-xs" style={{ color: C.muted }}>Tape un produit puis « OK », ou scanne un code-barres. Données Open Food Facts (app déployée uniquement).</p>
      )}
    </div>
  );
}
