import React, { useState, useMemo, useRef } from "react";
import { X, Check, Flame, Beef, Package, ChevronRight, ChevronLeft, Trash2, Calculator, Pencil, TrendingUp, CalendarCheck, Sun, Moon, Bookmark, Cloud, BookOpen } from "lucide-react";
import {
  C, TODAY, computeTargets, smoothedWeight,
} from "./core.js";

export function SettingsSheet({ settings, setSettings, theme, onTheme, allData, customMeals = [], onDeleteCustom, onUpdateCustom, onImport, onOpenAccount, onOpenGuide, onClose }) {
  const [kcal, setKcal] = useState(settings.kcal);
  const [protein, setProtein] = useState(settings.protein);
  const [showCalc, setShowCalc] = useState(false);
  const [showData, setShowData] = useState(false);
  const [showBase, setShowBase] = useState(false);
  const [jsonOut, setJsonOut] = useState("");
  const [paste, setPaste] = useState("");
  const [msg, setMsg] = useState(null);
  const fileRef = React.useRef(null);
  const [profile, setProfile] = useState(settings.profile ?? { sex: "h", age: 35, weight: 78, height: 178, activity: 1.45, deficit: 0.18 });
  const setP = (k, v) => setProfile((p) => ({ ...p, [k]: v }));
  const save = () => { setSettings({ kcal, protein, profile }); onClose(); };

  const doExport = () => {
    const json = JSON.stringify(allData, null, 2);
    setJsonOut(json);
    try {
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `pioche-repas-${TODAY}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      setMsg({ ok: true, m: "Fichier téléchargé. (Tu peux aussi copier le texte ci-dessous.)" });
    } catch (e) { setMsg({ ok: true, m: "Copie le texte ci-dessous pour sauvegarder tes données." }); }
  };
  const applyImport = (text) => {
    try {
      const obj = JSON.parse(text);
      if (!obj || typeof obj !== "object") throw new Error();
      onImport(obj);
      const n = obj.days ? Object.keys(obj.days).length : 0;
      setMsg({ ok: true, m: `Import réussi — ${n} jour(s) fusionné(s).` });
      setPaste("");
    } catch (e) { setMsg({ ok: false, m: "JSON invalide, rien n'a été importé." }); }
  };
  const onFile = (e) => { const f = e.target.files && e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = (ev) => applyImport(String(ev.target.result)); rd.readAsText(f); e.target.value = ""; };
  const copyJson = () => { try { navigator.clipboard.writeText(jsonOut); setMsg({ ok: true, m: "Copié dans le presse-papier." }); } catch (e) { setMsg({ ok: true, m: "Sélectionne le texte et copie-le manuellement." }); } };

  const calc = useMemo(() => computeTargets(profile), [profile]);
  // Poids réel lissé (dernières pesées) — pour caler le calcul sur ton poids du moment.
  const realWeight = useMemo(() => smoothedWeight(allData?.weights || {}, TODAY, { min: 1 }), [allData]);
  const weightStale = realWeight && Math.abs(realWeight.kg - (+profile.weight || 0)) >= 0.5;
  const ACTIVITIES = [{ v: 1.2, l: "Sédentaire" }, { v: 1.375, l: "Léger" }, { v: 1.45, l: "Modéré" }, { v: 1.55, l: "Actif" }, { v: 1.725, l: "Très actif" }];
  const DEFICITS = [{ v: 0, l: "Maintien" }, { v: 0.12, l: "Perte douce" }, { v: 0.18, l: "Perte" }, { v: 0.25, l: "Perte rapide" }];
  return (
    <div className="px-1">
        <p className="mb-4 text-sm" style={{ color: C.sub }}>Règle tes cibles à la main, ou laisse le calculateur les estimer.</p>

        <div className="mb-4 flex items-center justify-between rounded-2xl px-4 py-3" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
          <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: C.ink }}>
            {theme === "dark" ? <Moon size={15} style={{ color: C.weight }} /> : <Sun size={15} style={{ color: C.protein }} />} Thème
          </span>
          <div className="flex gap-1 rounded-full p-1" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}` }}>
            {[{ v: "light", l: "Clair" }, { v: "dark", l: "Sombre" }].map((o) => (
              <button key={o.v} onClick={() => onTheme(o.v)} className="rounded-full px-3 py-1 text-xs font-semibold active:scale-95" style={theme === o.v ? { backgroundColor: C.ink, color: C.paper } : { color: C.sub }}>{o.l}</button>
            ))}
          </div>
        </div>
        <SliderRow label="Calories" icon={<Flame size={15} style={{ color: C.protein }} />} value={kcal} unit="kcal" min={1500} max={2600} step={50} onChange={setKcal} color={C.protein} />
        <SliderRow label="Protéines" icon={<Beef size={15} style={{ color: C.green }} />} value={protein} unit="g" min={100} max={220} step={5} onChange={setProtein} color={C.green} />
        <button onClick={() => setShowCalc((v) => !v)} className="mb-3 mt-1 flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }}>
          <span className="flex items-center gap-2"><Calculator size={16} /> Estimer depuis mes mesures</span>
          <ChevronRight size={16} style={{ transform: showCalc ? "rotate(90deg)" : "none", transition: "transform .2s" }} />
        </button>
        {showCalc && (
          <div className="mb-4 space-y-3 rounded-2xl p-4" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
            <div className="grid grid-cols-2 gap-2">
              <Seg label="Sexe" options={[{ v: "h", l: "Homme" }, { v: "f", l: "Femme" }]} value={profile.sex} onChange={(v) => setP("sex", v)} />
              <NumField label="Âge" value={profile.age} onChange={(v) => setP("age", v)} suffix="ans" />
              <NumField label="Poids" value={profile.weight} onChange={(v) => setP("weight", v)} suffix="kg" />
              <NumField label="Taille" value={profile.height} onChange={(v) => setP("height", v)} suffix="cm" />
            </div>
            {weightStale && (
              <button onClick={() => setP("weight", realWeight.kg)} className="flex w-full items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold active:scale-95" style={{ backgroundColor: C.paper, border: `1px solid ${C.weight}55`, color: C.weight }}>
                Utiliser mon poids actuel ({String(realWeight.kg).replace(".", ",")} kg)
              </button>
            )}
            <Picker2 label="Activité" options={ACTIVITIES} value={profile.activity} onChange={(v) => setP("activity", v)} />
            <Picker2 label="Objectif" options={DEFICITS} value={profile.deficit} onChange={(v) => setP("deficit", v)} />
            <div className="rounded-xl p-3" style={{ backgroundColor: C.paper }}>
              <div className="flex justify-between text-xs" style={{ color: C.sub }}><span>Maintien estimé</span><span className="font-semibold">{calc.maintenance} kcal</span></div>
              <div className="mt-1 flex justify-between text-sm"><span className="font-semibold" style={{ color: C.ink }}>Cible recommandée</span><span className="font-bold" style={{ color: C.ink }}>{calc.target} kcal · {calc.proteinReco} g</span></div>
            </div>
            <button onClick={() => { setKcal(calc.target); setProtein(calc.proteinReco); }} className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white active:scale-95" style={{ backgroundColor: C.green }}><Check size={16} /> Appliquer la reco</button>
            <p className="text-xs" style={{ color: C.muted }}>Mifflin-St Jeor · protéines ≈ 1,9 g/kg. Plancher de sécurité à 1500 kcal.</p>
          </div>
        )}
        <button onClick={() => setShowBase((v) => !v)} className="mb-3 flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }}>
          <span className="flex items-center gap-2"><Bookmark size={16} /> Ma base perso{customMeals.length > 0 && <span style={{ color: C.muted, fontWeight: 500 }}> · {customMeals.length}</span>}</span>
          <ChevronRight size={16} style={{ transform: showBase ? "rotate(90deg)" : "none", transition: "transform .2s" }} />
        </button>
        {showBase && (
          <div className="mb-3 rounded-2xl p-3" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
            <CustomBaseManager items={customMeals} onUpdate={onUpdateCustom} onDelete={onDeleteCustom} />
          </div>
        )}
        {onOpenGuide && (
          <button onClick={onOpenGuide} className="mb-3 flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }}>
            <span className="flex items-center gap-2"><BookOpen size={16} /> Guide & méthode</span>
            <ChevronRight size={16} />
          </button>
        )}
        {onOpenAccount && (
          <button onClick={onOpenAccount} className="mb-3 flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }}>
            <span className="flex items-center gap-2"><Cloud size={16} /> Compte & synchronisation</span>
            <ChevronRight size={16} />
          </button>
        )}
        <button onClick={() => setShowData((v) => !v)} className="mb-3 flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }}>
          <span className="flex items-center gap-2"><Package size={16} /> Sauvegarde & restauration</span>
          <ChevronRight size={16} style={{ transform: showData ? "rotate(90deg)" : "none", transition: "transform .2s" }} />
        </button>
        {showData && (
          <div className="mb-4 space-y-3 rounded-2xl p-4" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
            <p className="text-xs" style={{ color: C.sub }}>Exporte tes repas et ton poids dans un fichier, ou réimporte-les (les jours se fusionnent, l'import ne supprime rien).</p>
            <div className="flex gap-2">
              <button onClick={doExport} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold text-white active:scale-95" style={{ backgroundColor: C.green }}><TrendingUp size={15} /> Exporter</button>
              <button onClick={() => fileRef.current && fileRef.current.click()} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold active:scale-95" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink }}><CalendarCheck size={15} /> Importer un fichier</button>
              <input ref={fileRef} type="file" accept="application/json,.json" onChange={onFile} style={{ display: "none" }} />
            </div>

            {jsonOut && (
              <div className="space-y-1.5">
                <textarea readOnly value={jsonOut} rows={4} className="w-full rounded-xl p-2 text-xs outline-none" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.sub, fontFamily: "ui-monospace, monospace" }} />
                <button onClick={copyJson} className="w-full rounded-xl py-2 text-xs font-semibold active:scale-95" style={{ backgroundColor: C.ink, color: C.paper }}>Copier le texte</button>
              </div>
            )}

            <div className="space-y-1.5">
              <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={3} placeholder="…ou colle ici un JSON exporté" className="w-full rounded-xl p-2 text-xs outline-none" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink, fontFamily: "ui-monospace, monospace" }} />
              <button onClick={() => paste.trim() && applyImport(paste)} className="w-full rounded-xl py-2 text-xs font-semibold active:scale-95" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink }}>Importer ce texte</button>
            </div>

            {msg && <p className="text-xs font-medium" style={{ color: msg.ok ? C.green : C.over }}>{msg.m}</p>}
          </div>
        )}

        <button onClick={save} className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold text-white active:scale-95" style={{ backgroundColor: C.ink }}><Check size={18} /> Enregistrer</button>
      <div style={{ height: "1rem" }} />
    </div>
  );
}


function CustomBaseManager({ items, onUpdate, onDelete }) {
  const [editId, setEditId] = useState(null);
  const [f, setF] = useState({ name: "", kcal: "", p: "" });
  const startEdit = (m) => { setEditId(m.id); setF({ name: m.name, kcal: String(m.kcal), p: String(m.p) }); };
  const commit = () => {
    if (!f.name.trim()) { setEditId(null); return; }
    const kcal = parseInt(f.kcal, 10), p = parseInt(f.p, 10);
    onUpdate(editId, { name: f.name.trim(), kcal: isNaN(kcal) ? 0 : kcal, p: isNaN(p) ? 0 : p });
    setEditId(null);
  };
  if (!items.length) {
    return <p className="px-1 py-2 text-sm" style={{ color: C.muted }}>Aucun produit enregistré. Depuis la pioche → <span style={{ color: C.sub }}>Open Food Facts</span> → « Enregistrer dans ma base ».</p>;
  }
  return (
    <div className="space-y-2">
      {items.map((m) => editId === m.id ? (
        <div key={m.id} className="space-y-2 rounded-xl p-3" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}` }}>
          <input value={f.name} onChange={(e) => setF((s) => ({ ...s, name: e.target.value }))} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ backgroundColor: C.sheet, border: `1px solid ${C.line}`, color: C.ink }} />
          <div className="flex gap-2">
            <input value={f.kcal} onChange={(e) => setF((s) => ({ ...s, kcal: e.target.value }))} inputMode="numeric" placeholder="kcal" className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ backgroundColor: C.sheet, border: `1px solid ${C.line}`, color: C.ink }} />
            <input value={f.p} onChange={(e) => setF((s) => ({ ...s, p: e.target.value }))} inputMode="numeric" placeholder="prot. (g)" className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ backgroundColor: C.sheet, border: `1px solid ${C.line}`, color: C.ink }} />
            <button onClick={commit} className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-white active:scale-95" style={{ backgroundColor: C.green }}><Check size={15} /></button>
            <button onClick={() => setEditId(null)} className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold active:scale-95" style={{ backgroundColor: C.sheet, border: `1px solid ${C.line}`, color: C.sub }}><X size={15} /></button>
          </div>
        </div>
      ) : (
        <div key={m.id} className="flex items-center justify-between gap-2 rounded-xl p-3" style={{ backgroundColor: C.paper }}>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold" style={{ color: C.ink }}>{m.name}</p>
            <p className="text-xs font-medium" style={{ fontVariantNumeric: "tabular-nums" }}><span style={{ color: C.sub }}>{m.kcal} kcal</span> · <span style={{ color: C.protein }}>{m.p} g prot.</span></p>
          </div>
          <button onClick={() => startEdit(m)} className="shrink-0 rounded-lg p-2 active:scale-90" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }}><Pencil size={14} /></button>
          <button onClick={() => onDelete(m.id)} className="shrink-0 rounded-lg p-2 active:scale-90" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.muted }}><Trash2 size={14} /></button>
        </div>
      ))}
    </div>
  );
}


function NumField({ label, value, onChange, suffix }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium" style={{ color: C.sub }}>{label}</p>
      <div className="flex items-center rounded-xl px-3 py-1.5" style={{ backgroundColor: C.paper }}>
        <input value={value} onChange={(e) => onChange(+e.target.value || 0)} inputMode="numeric" className="w-full bg-transparent text-sm font-semibold outline-none" style={{ color: C.ink }} />
        <span className="text-xs" style={{ color: C.muted }}>{suffix}</span>
      </div>
    </div>
  );
}


function Picker2({ label, options, value, onChange }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium" style={{ color: C.sub }}>{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => <button key={o.v} onClick={() => onChange(o.v)} className="rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95" style={value === o.v ? { backgroundColor: C.ink, color: C.paper } : { backgroundColor: C.card, color: C.sub, border: `1px solid ${C.line}` }}>{o.l}</button>)}
      </div>
    </div>
  );
}


function Seg({ label, options, value, onChange }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium" style={{ color: C.sub }}>{label}</p>
      <div className="flex gap-1 rounded-xl p-1" style={{ backgroundColor: C.paper }}>
        {options.map((o) => <button key={o.v} onClick={() => onChange(o.v)} className="flex-1 rounded-lg py-1.5 text-xs font-semibold active:scale-95" style={value === o.v ? { backgroundColor: C.ink, color: C.paper } : { color: C.sub }}>{o.l}</button>)}
      </div>
    </div>
  );
}


function SliderRow({ label, icon, value, unit, min, max, step, onChange, color }) {
  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: C.ink }}>{icon} {label}</span>
        <span className="text-sm font-bold" style={{ color: C.ink, fontVariantNumeric: "tabular-nums" }}>{value} {unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} className="w-full" style={{ accentColor: color }} />
    </div>
  );
}
