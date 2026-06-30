import React, { useState, useMemo, useEffect, useRef } from "react";
import { Check, Flame, Beef, Package, ChevronRight, ChevronDown, Trash2, Calculator, TrendingUp, CalendarCheck, Sun, Moon, Cloud, BookOpen, Pin, Plus, Target, Palette, Database } from "lucide-react";
import { C, TODAY, computeTargets, smoothedWeight, cardStyle, DEFAULT_PROFILE } from "../core.js";
import { Sheet } from "../components/Sheet.jsx";
import { SectionTitle } from "../components/ui.jsx";

const ACTIVITIES = [{ v: 1.2, l: "Sédentaire" }, { v: 1.375, l: "Léger" }, { v: 1.45, l: "Modéré" }, { v: 1.55, l: "Actif" }, { v: 1.725, l: "Très actif" }];
const DEFICITS = [{ v: 0, l: "Maintien" }, { v: 0.12, l: "Perte douce" }, { v: 0.18, l: "Perte" }, { v: 0.25, l: "Perte rapide" }];
const GOALRATES = [{ v: 0.3, l: "Douce" }, { v: 0.5, l: "Standard" }, { v: 0.7, l: "Rapide" }, { v: 0.9, l: "Agressive" }];

// Micro-retour « enregistré » : flash discret après un changement (cibles en LIVE, plus de bouton Enregistrer).
function useSavedFlash() {
  const [on, setOn] = useState(false);
  useEffect(() => { if (!on) return; const id = setTimeout(() => setOn(false), 1400); return () => clearTimeout(id); }, [on]);
  return [on, () => setOn(true)];
}
const SavedPill = ({ show }) => (
  <span className="flex items-center gap-1 text-[11px] font-semibold transition-opacity duration-300" style={{ color: C.green, opacity: show ? 1 : 0 }}>
    <Check size={12} /> enregistré
  </span>
);

// Ligne de navigation (icône · libellé · valeur · chevron) — façon Suivi/Cuisine.
function NavRow({ icon, label, value, color = C.sub, onClick, last }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3 text-left active:opacity-70" style={{ borderBottom: last ? "none" : `1px solid ${C.line}` }}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}1a`, color }}>{icon}</span>
      <span className="min-w-0 flex-1 text-sm font-semibold" style={{ color: C.ink }}>{label}</span>
      {value != null && <span className="text-xs font-medium tabular-nums" style={{ color: C.muted }}>{value}</span>}
      <ChevronRight size={16} style={{ color: C.muted }} />
    </button>
  );
}

// ── Écran Réglages ───────────────────────────────────────────────────────────
// Cibles en LIVE (source = settings, pas d'état local committé). Le reste = sections
// nettes ouvrant des sous-modales (cohérence avec les bottom-sheets de l'app).
export function SettingsSheet({ settings, setSettings, theme, onTheme, allData, directives = [], onAddDirective, onRemoveDirective, onImport, onOpenAccount, onOpenGuide, onClose }) {
  const [sheet, setSheet] = useState(null); // 'target' | 'dir' | 'data'
  const profile = settings.profile ?? DEFAULT_PROFILE;
  const ppk = profile.weight ? (settings.protein / (+profile.weight || 1)).toFixed(1).replace(".", ",") : null;

  const Section = ({ title, children }) => (
    <div className="mb-5">
      <SectionTitle>{title}</SectionTitle>
      <div className="overflow-hidden rounded-2xl" style={cardStyle()}>{children}</div>
    </div>
  );

  return (
    <div className="px-1 pb-6">
      {/* Tes cibles — carte héros, l'édition se fait dans une modale (cohérence) */}
      <SectionTitle>Tes cibles du jour</SectionTitle>
      <button onClick={() => setSheet("target")} className="mb-5 flex w-full items-center gap-4 rounded-3xl p-5 text-left active:scale-[0.99]" style={cardStyle()}>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: `${C.protein}1f`, color: C.protein }}><Target size={22} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-end gap-3">
            <div><span className="text-3xl font-black tabular-nums" style={{ color: C.ink }}>{settings.kcal}</span><span className="ml-1 text-sm font-semibold" style={{ color: C.muted }}>kcal</span></div>
            <div className="pb-0.5"><span className="text-xl font-black tabular-nums" style={{ color: C.green }}>{settings.protein}</span><span className="ml-1 text-xs font-semibold" style={{ color: C.muted }}>g prot.</span></div>
          </div>
          <p className="mt-0.5 truncate text-xs" style={{ color: C.sub }}>{ppk ? `≈ ${ppk} g/kg · ` : ""}ajuste à la main ou estime depuis tes mesures</p>
        </div>
        <span className="flex shrink-0 items-center gap-1 text-xs font-semibold" style={{ color: C.protein }}>Ajuster <ChevronRight size={15} /></span>
      </button>

      <Section title="Assistant">
        <NavRow icon={<Pin size={15} />} label="Mes consignes" value={directives.length || null} color={C.accent} onClick={() => setSheet("dir")} last />
      </Section>

      <Section title="Compte">
        <NavRow icon={<Cloud size={15} />} label="Compte & synchronisation" color={C.weight} onClick={onOpenAccount} last />
      </Section>

      <Section title="Apparence & données">
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${C.line}` }}>
          <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: C.ink }}>
            {theme === "dark" ? <Moon size={15} style={{ color: C.weight }} /> : <Sun size={15} style={{ color: C.protein }} />} Thème
          </span>
          <div className="flex gap-1 rounded-full p-1" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}` }}>
            {[{ v: "light", l: "Clair" }, { v: "dark", l: "Sombre" }].map((o) => (
              <button key={o.v} onClick={() => onTheme(o.v)} className="rounded-full px-3 py-1 text-xs font-semibold active:scale-95" style={theme === o.v ? { backgroundColor: C.ink, color: C.paper } : { color: C.sub }}>{o.l}</button>
            ))}
          </div>
        </div>
        <NavRow icon={<BookOpen size={15} />} label="Guide & méthode" onClick={onOpenGuide} />
        <NavRow icon={<Package size={15} />} label="Sauvegarde & restauration" onClick={() => setSheet("data")} last />
      </Section>

      <TargetSheet open={sheet === "target"} onClose={() => setSheet(null)} settings={settings} setSettings={setSettings} weights={allData?.weights} />
      <ConsignesSheet open={sheet === "dir"} onClose={() => setSheet(null)} directives={directives} onAdd={onAddDirective} onRemove={onRemoveDirective} />
      <DataSheet open={sheet === "data"} onClose={() => setSheet(null)} allData={allData} onImport={onImport} />
    </div>
  );
}

// ── Modale d'édition des cibles (live + estimateur) ──────────────────────────
function TargetSheet({ open, onClose, settings, setSettings, weights }) {
  const [saved, flash] = useSavedFlash();
  const [showCalc, setShowCalc] = useState(false);
  const profile = settings.profile ?? DEFAULT_PROFILE;
  const setP = (k, v) => { setSettings((s) => ({ ...s, profile: { ...(s.profile ?? DEFAULT_PROFILE), [k]: v } })); };
  const setKcal = (v) => { setSettings((s) => ({ ...s, kcal: v })); flash(); };
  const setProtein = (v) => { setSettings((s) => ({ ...s, protein: v })); flash(); };
  const calc = useMemo(() => computeTargets(profile), [profile]);
  const realWeight = useMemo(() => smoothedWeight(weights || {}, TODAY, { min: 1 }), [weights]);
  const weightStale = realWeight && Math.abs(realWeight.kg - (+profile.weight || 0)) >= 0.5;
  const ppk = profile.weight ? (settings.protein / (+profile.weight || 1)).toFixed(1).replace(".", ",") : null;
  return (
    <Sheet open={open} onClose={onClose} title="Tes cibles du jour" subtitle="S'applique en direct" icon={<Target size={18} />} iconColor={C.protein} z={50} headerRight={<SavedPill show={saved} />}>
      <div className="space-y-5 pb-2">
        <div className="space-y-2 rounded-2xl p-4" style={cardStyle()}>
          <SliderRow label="Calories" icon={<Flame size={15} style={{ color: C.protein }} />} value={settings.kcal} unit="kcal" min={1500} max={2600} step={50} onChange={setKcal} color={C.protein} />
          <SliderRow label="Protéines" icon={<Beef size={15} style={{ color: C.green }} />} value={settings.protein} unit="g" min={100} max={220} step={5} onChange={setProtein} color={C.green} />
          {ppk && <p className="-mt-2 text-xs" style={{ color: C.muted }}>≈ {ppk} g/kg · cible muscle 1,6–2 g/kg</p>}
        </div>

        <div>
          <button onClick={() => setShowCalc((v) => !v)} className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold active:scale-95" style={cardStyle({ color: C.ink })}>
            <span className="flex items-center gap-2"><Calculator size={16} style={{ color: C.weight }} /> Estimer depuis mes mesures</span>
            <ChevronDown size={16} style={{ color: C.muted, transform: showCalc ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
          </button>
          {showCalc && (
            <div className="mt-2 space-y-3 rounded-2xl p-4" style={cardStyle()}>
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
              <Picker2 label="Rythme visé (auto)" options={GOALRATES} value={profile.goalRate ?? 0.5} onChange={(v) => setP("goalRate", v)} />
              <div className="rounded-xl p-3" style={{ backgroundColor: C.paper }}>
                <div className="flex justify-between text-xs" style={{ color: C.sub }}><span>Maintien estimé</span><span className="font-semibold">{calc.maintenance} kcal</span></div>
                <div className="mt-1 flex justify-between text-sm"><span className="font-semibold" style={{ color: C.ink }}>Cible recommandée</span><span className="font-bold" style={{ color: C.ink }}>{calc.target} kcal · {calc.proteinReco} g</span></div>
              </div>
              <button onClick={() => { setSettings((s) => ({ ...s, kcal: calc.target, protein: calc.proteinReco })); flash(); }} className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white active:scale-95" style={{ backgroundColor: C.green }}><Check size={16} /> Appliquer la reco</button>
              <p className="text-xs" style={{ color: C.muted }}>Mifflin-St Jeor · protéines ≈ 1,9 g/kg. Plancher de sécurité à 1500 kcal.</p>
            </div>
          )}
        </div>
      </div>
    </Sheet>
  );
}

// ── Modale « Mes consignes » (config assistant) ──────────────────────────────
function ConsignesSheet({ open, onClose, directives = [], onAdd, onRemove }) {
  const [val, setVal] = useState("");
  const add = () => { if (val.trim() && onAdd?.(val)) setVal(""); };
  return (
    <Sheet open={open} onClose={onClose} title="Mes consignes" subtitle="L'assistant les respecte" icon={<Pin size={18} />} iconColor={C.accent} z={50}>
      <div className="space-y-3 pb-2">
        <p className="text-xs leading-relaxed" style={{ color: C.sub }}>Des règles que l'assistant respecte quand il propose des repas ou planifie ta semaine. Épingle-les depuis le bilan hebdo, ou ajoute-les ici.</p>
        <div className="flex items-end gap-2">
          <input value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} placeholder="Ex. : pas de tofu le soir, plus de légumes verts…" className="min-h-10 flex-1 rounded-xl px-3 py-2 text-sm outline-none" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink }} />
          <button onClick={add} disabled={!val.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white active:scale-95 disabled:opacity-50" style={{ backgroundColor: C.accent }} aria-label="Ajouter la consigne"><Plus size={18} /></button>
        </div>
        {directives.length === 0 ? (
          <p className="py-4 text-center text-xs" style={{ color: C.muted }}>Aucune consigne active.</p>
        ) : (
          <div className="space-y-1.5">
            {directives.map((d) => (
              <div key={d.id} className="flex items-start gap-2 rounded-xl px-3 py-2" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}` }}>
                <Pin size={13} style={{ color: C.accent, marginTop: 2, flexShrink: 0 }} />
                <span className="min-w-0 flex-1 text-sm" style={{ color: C.ink }}>{d.text}</span>
                <button onClick={() => onRemove?.(d.id)} className="shrink-0 rounded-lg p-1 active:scale-90" style={{ color: C.muted }} aria-label="Retirer"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}

// ── Modale « Sauvegarde & restauration » (export / import JSON) ───────────────
function DataSheet({ open, onClose, allData, onImport }) {
  const [jsonOut, setJsonOut] = useState("");
  const [paste, setPaste] = useState("");
  const [msg, setMsg] = useState(null);
  const fileRef = useRef(null);
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
  return (
    <Sheet open={open} onClose={onClose} title="Sauvegarde & restauration" subtitle="Export · import JSON" icon={<Package size={18} />} iconColor={C.sub} z={50}>
      <div className="space-y-3 pb-2">
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
    </Sheet>
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
    <div className="mb-2">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: C.ink }}>{icon} {label}</span>
        <span className="text-sm font-bold" style={{ color: C.ink, fontVariantNumeric: "tabular-nums" }}>{value} {unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} className="w-full" style={{ accentColor: color }} />
    </div>
  );
}
