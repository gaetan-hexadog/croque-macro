import React, { useState, useEffect } from "react";
import {
  Flame, Beef, Calculator, ChevronRight, ChevronDown, Bookmark, Pin, Cloud, BookOpen,
  Package, Sun, Moon, Check, Sliders, Palette, Database, User, Sparkles, Target, Pencil,
} from "lucide-react";
import { C, cardStyle, applyTheme, computeTargets } from "../../src/core.js";
import { SectionTitle } from "../../src/components/ui.jsx";
import { Sheet } from "../../src/components/Sheet.jsx";

// ════════════════════════════════════════════════════════════════════════════
// DESIGN LAB — Écran Réglages (Croque·Macro)
// 5 variantes EXPLORANT des principes d'organisation DIFFÉRENTS. Toutes :
//  • règlent les cibles EN LIVE + micro-retour « enregistré » (pas de gros bouton)
//  • sortent le thème du sommet et rétrogradent l'export/JSON en « Avancé »
//  • utilisent les vrais tokens C + cardStyle() + SectionTitle (langage non-Sport)
// Données fictives partagées pour comparer équitablement.
// ════════════════════════════════════════════════════════════════════════════

const FIX = { kcal: 1850, protein: 150, weight: 91, baseCount: 12, dirCount: 3, synced: true };

// micro-retour « enregistré » réutilisé par les variantes : flash discret après un changement
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

// curseur cible compact (live)
function LiveSlider({ label, icon, value, unit, min, max, step, color, onChange, sub }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: C.ink }}>{icon} {label}</span>
        <span className="text-sm font-bold tabular-nums" style={{ color: C.ink }}>{value} <span className="text-xs font-medium" style={{ color: C.muted }}>{unit}</span></span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} className="w-full" style={{ accentColor: color }} />
      {sub && <p className="mt-1 text-[11px]" style={{ color: C.muted }}>{sub}</p>}
    </div>
  );
}

// ligne de navigation générique (icône · libellé · valeur · chevron)
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

// ─── Variante A : HUB SECTIONNÉ ──────────────────────────────────────────────
// Axe : hiérarchie de l'information. Sections SectionTitle nettes, cibles en tête,
// thème + technique regroupés en « Apparence & données ». Tout scannable d'un coup.
function VariantA() {
  const [kcal, setKcal] = useState(FIX.kcal);
  const [protein, setProtein] = useState(FIX.protein);
  const [saved, flash] = useSavedFlash();
  const ppk = (protein / FIX.weight).toFixed(1).replace(".", ",");
  return (
    <div className="space-y-5">
      <div>
        <SectionTitle right={<SavedPill show={saved} />}>Tes cibles du jour</SectionTitle>
        <div className="space-y-4 rounded-2xl p-4" style={cardStyle()}>
          <LiveSlider label="Calories" icon={<Flame size={15} style={{ color: C.protein }} />} value={kcal} unit="kcal" min={1500} max={2600} step={50} color={C.protein} onChange={(v) => { setKcal(v); flash(); }} />
          <LiveSlider label="Protéines" icon={<Beef size={15} style={{ color: C.green }} />} value={protein} unit="g" min={100} max={220} step={5} color={C.green} onChange={(v) => { setProtein(v); flash(); }} sub={`≈ ${ppk} g/kg · cible muscle 1,6–2 g/kg`} />
          <button className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold active:scale-95" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink }}>
            <Calculator size={15} style={{ color: C.weight }} /> Estimer depuis mes mesures
          </button>
        </div>
      </div>

      <div>
        <SectionTitle>Ma cuisine</SectionTitle>
        <div className="overflow-hidden rounded-2xl" style={cardStyle()}>
          <NavRow icon={<Bookmark size={15} />} label="Ma base perso" value={`${FIX.baseCount}`} color={C.green} />
          <NavRow icon={<Pin size={15} />} label="Mes consignes" value={`${FIX.dirCount}`} color={C.accent} last />
        </div>
      </div>

      <div>
        <SectionTitle>Compte</SectionTitle>
        <div className="overflow-hidden rounded-2xl" style={cardStyle()}>
          <NavRow icon={<Cloud size={15} />} label="Synchronisation" value="connecté" color={C.weight} last />
        </div>
      </div>

      <div>
        <SectionTitle>Apparence & données</SectionTitle>
        <div className="overflow-hidden rounded-2xl" style={cardStyle()}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${C.line}` }}>
            <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: C.ink }}><Palette size={15} style={{ color: C.protein }} /> Thème</span>
            <ThemeSeg />
          </div>
          <NavRow icon={<BookOpen size={15} />} label="Guide & méthode" />
          <NavRow icon={<Package size={15} />} label="Sauvegarde & restauration" last />
        </div>
      </div>
    </div>
  );
}

// petit segment thème réutilisable (clair/sombre). Contrôlé si theme/setTheme fournis
// (→ pilote le VRAI thème via applyTheme dans la variante F), sinon illustratif.
function ThemeSeg({ theme: extTheme, setTheme: extSet }) {
  const [t, setT] = useState("dark");
  const cur = extTheme ?? t;
  const set = extSet ?? setT;
  return (
    <div className="flex gap-1 rounded-full p-1" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}` }}>
      {[{ v: "light", l: "Clair", Icon: Sun }, { v: "dark", l: "Sombre", Icon: Moon }].map(({ v, l, Icon }) => (
        <button key={v} onClick={() => set(v)} className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold active:scale-95" style={cur === v ? { backgroundColor: C.ink, color: C.paper } : { color: C.sub }}><Icon size={12} /> {l}</button>
      ))}
    </div>
  );
}

// ─── Variante B : CIBLE HÉROS + NAVIGATION ───────────────────────────────────
// Axe : modèle de layout + divulgation progressive. Le job #1 (les cibles) est un
// héros dépliable ; tout le reste = liste de navigation vers des sous-écrans.
function VariantB() {
  const [open, setOpen] = useState(false);
  const [kcal, setKcal] = useState(FIX.kcal);
  const [protein, setProtein] = useState(FIX.protein);
  const [saved, flash] = useSavedFlash();
  return (
    <div className="space-y-4">
      {/* Héros cibles */}
      <div className="rounded-3xl p-5" style={cardStyle({ borderTop: `1px solid ${C.cardTop}`, background: `linear-gradient(160deg, ${C.protein}22, ${C.cardGrad ? "transparent" : "transparent"})` })}>
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest" style={{ color: C.sub }}><Target size={13} /> Tes cibles du jour</span>
          {saved ? <SavedPill show /> : <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-1 text-xs font-semibold active:opacity-70" style={{ color: C.protein }}><Pencil size={12} /> {open ? "Fermer" : "Ajuster"}</button>}
        </div>
        <div className="flex items-end gap-5">
          <div><span className="text-4xl font-black tabular-nums" style={{ color: C.ink }}>{kcal}</span><span className="ml-1 text-sm font-semibold" style={{ color: C.muted }}>kcal</span></div>
          <div className="pb-1"><span className="text-2xl font-black tabular-nums" style={{ color: C.green }}>{protein}</span><span className="ml-1 text-sm font-semibold" style={{ color: C.muted }}>g prot.</span></div>
        </div>
        {open && (
          <div className="mt-4 space-y-4 border-t pt-4" style={{ borderColor: C.line }}>
            <LiveSlider label="Calories" icon={<Flame size={15} style={{ color: C.protein }} />} value={kcal} unit="kcal" min={1500} max={2600} step={50} color={C.protein} onChange={(v) => { setKcal(v); flash(); }} />
            <LiveSlider label="Protéines" icon={<Beef size={15} style={{ color: C.green }} />} value={protein} unit="g" min={100} max={220} step={5} color={C.green} onChange={(v) => { setProtein(v); flash(); }} />
            <button className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold active:scale-95" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink }}><Calculator size={15} style={{ color: C.weight }} /> Estimer depuis mes mesures</button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="overflow-hidden rounded-2xl" style={cardStyle()}>
        <NavRow icon={<Bookmark size={15} />} label="Ma base perso" value={`${FIX.baseCount}`} color={C.green} />
        <NavRow icon={<Pin size={15} />} label="Mes consignes" value={`${FIX.dirCount}`} color={C.accent} />
        <NavRow icon={<Cloud size={15} />} label="Compte & synchronisation" value="connecté" color={C.weight} last />
      </div>
      <div className="overflow-hidden rounded-2xl" style={cardStyle()}>
        <NavRow icon={<Palette size={15} />} label="Apparence" value="Sombre" color={C.protein} />
        <NavRow icon={<BookOpen size={15} />} label="Guide & méthode" />
        <NavRow icon={<Database size={15} />} label="Avancé · données" color={C.muted} last />
      </div>
    </div>
  );
}

// ─── Variante C : LISTE GROUPÉE DENSE (façon réglages iOS) ───────────────────
// Axe : densité. Très calme, lignes compactes à hairlines, libellés + valeurs.
// Les cibles sont une ligne qui se déplie en place.
function VariantC() {
  const [openTar, setOpenTar] = useState(false);
  const [kcal, setKcal] = useState(FIX.kcal);
  const [protein, setProtein] = useState(FIX.protein);
  const [saved, flash] = useSavedFlash();
  const Group = ({ title, children }) => (
    <div className="mb-4">
      <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-widest" style={{ color: C.muted }}>{title}</p>
      <div className="overflow-hidden rounded-2xl" style={cardStyle()}>{children}</div>
    </div>
  );
  const Row = ({ icon, label, value, right, onClick, last }) => (
    <button onClick={onClick} className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left active:opacity-70" style={{ borderBottom: last ? "none" : `1px solid ${C.line}` }}>
      <span style={{ color: C.sub }}>{icon}</span>
      <span className="min-w-0 flex-1 text-sm" style={{ color: C.ink }}>{label}</span>
      {value != null && <span className="text-xs tabular-nums" style={{ color: C.muted }}>{value}</span>}
      {right || <ChevronRight size={15} style={{ color: C.muted }} />}
    </button>
  );
  return (
    <div>
      <Group title="Cibles">
        <Row icon={<Target size={15} style={{ color: C.protein }} />} label="Cibles du jour" value={`${kcal} kcal · ${protein} g`} onClick={() => setOpenTar((v) => !v)} right={<ChevronDown size={15} style={{ color: C.muted, transform: openTar ? "rotate(180deg)" : "none", transition: "transform .2s" }} />} last={!openTar} />
        {openTar && (
          <div className="space-y-4 px-3.5 py-3" style={{ borderTop: `1px solid ${C.line}` }}>
            <div className="flex justify-end"><SavedPill show={saved} /></div>
            <LiveSlider label="Calories" icon={<Flame size={15} style={{ color: C.protein }} />} value={kcal} unit="kcal" min={1500} max={2600} step={50} color={C.protein} onChange={(v) => { setKcal(v); flash(); }} />
            <LiveSlider label="Protéines" icon={<Beef size={15} style={{ color: C.green }} />} value={protein} unit="g" min={100} max={220} step={5} color={C.green} onChange={(v) => { setProtein(v); flash(); }} />
            <button className="flex w-full items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold active:scale-95" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink }}><Calculator size={14} /> Estimer depuis mes mesures</button>
          </div>
        )}
      </Group>
      <Group title="Ma cuisine">
        <Row icon={<Bookmark size={15} />} label="Ma base perso" value={`${FIX.baseCount}`} />
        <Row icon={<Pin size={15} />} label="Mes consignes" value={`${FIX.dirCount}`} last />
      </Group>
      <Group title="Compte">
        <Row icon={<Cloud size={15} />} label="Synchronisation" value="connecté" last />
      </Group>
      <Group title="Avancé">
        <Row icon={<Palette size={15} />} label="Apparence" right={<ThemeSeg />} />
        <Row icon={<BookOpen size={15} />} label="Guide & méthode" />
        <Row icon={<Database size={15} />} label="Sauvegarde & restauration" last />
      </Group>
    </div>
  );
}

// ─── Variante D : TUILES DASHBOARD ───────────────────────────────────────────
// Axe : modèle d'interaction. Grille de tuiles tapables ; chacune ouvre un panneau
// focalisé. La tuile Cibles affiche les stats en direct.
function VariantD() {
  const [kcal] = useState(FIX.kcal);
  const [protein] = useState(FIX.protein);
  const Tile = ({ icon, color, title, children, wide }) => (
    <button className={`flex flex-col items-start gap-2 rounded-2xl p-3.5 text-left active:scale-[0.98] ${wide ? "col-span-2" : ""}`} style={cardStyle()}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}1f`, color }}>{icon}</span>
      <span className="text-sm font-bold" style={{ color: C.ink }}>{title}</span>
      {children}
    </button>
  );
  return (
    <div className="space-y-3">
      {/* Tuile cibles, pleine largeur, mise en avant */}
      <button className="flex w-full items-center gap-4 rounded-2xl p-4 text-left active:scale-[0.99]" style={cardStyle()}>
        <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: `${C.protein}1f`, color: C.protein }}><Target size={20} /></span>
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: C.muted }}>Tes cibles</p>
          <p className="text-lg font-black tabular-nums" style={{ color: C.ink }}>{kcal} kcal · <span style={{ color: C.green }}>{protein} g</span></p>
        </div>
        <ChevronRight size={18} style={{ color: C.muted }} />
      </button>
      <div className="grid grid-cols-2 gap-3">
        <Tile icon={<Calculator size={18} />} color={C.weight} title="Estimer"><span className="text-xs" style={{ color: C.muted }}>Depuis mes mesures</span></Tile>
        <Tile icon={<Palette size={18} />} color={C.protein} title="Apparence"><span className="text-xs" style={{ color: C.muted }}>Sombre</span></Tile>
        <Tile icon={<Bookmark size={18} />} color={C.green} title="Ma base"><span className="text-xs" style={{ color: C.muted }}>{FIX.baseCount} produits</span></Tile>
        <Tile icon={<Pin size={18} />} color={C.accent} title="Consignes"><span className="text-xs" style={{ color: C.muted }}>{FIX.dirCount} actives</span></Tile>
        <Tile icon={<Cloud size={18} />} color={C.weight} title="Compte"><span className="text-xs" style={{ color: C.green }}>Synchronisé</span></Tile>
        <Tile icon={<Database size={18} />} color={C.muted} title="Données"><span className="text-xs" style={{ color: C.muted }}>Export · import</span></Tile>
      </div>
      <button className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold active:scale-95" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.sub }}><BookOpen size={15} /> Guide & méthode</button>
    </div>
  );
}

// ─── Variante E : ÉDITORIAL / EXPRESSIF ──────────────────────────────────────
// Axe : direction expressive (« Vivant maîtrisé »). Héros chaleureux, gros chiffres,
// dégradé d'accent, plus d'air, hiérarchie typographique marquée. Toujours tokens.
function VariantE() {
  const [kcal, setKcal] = useState(FIX.kcal);
  const [protein, setProtein] = useState(FIX.protein);
  const [saved, flash] = useSavedFlash();
  const Divider = ({ children }) => (
    <div className="mb-3 mt-6 flex items-center gap-2">
      <span className="text-[13px] font-extrabold" style={{ color: C.ink }}>{children}</span>
      <span className="h-px flex-1" style={{ backgroundColor: C.line }} />
    </div>
  );
  const Line = ({ icon, color, label, value, last }) => (
    <button className="flex w-full items-center gap-3 py-3 text-left active:opacity-70" style={{ borderBottom: last ? "none" : `1px solid ${C.line}` }}>
      <span style={{ color }}>{icon}</span>
      <span className="flex-1 text-[15px] font-semibold" style={{ color: C.ink }}>{label}</span>
      {value && <span className="text-xs font-medium" style={{ color: C.muted }}>{value}</span>}
      <ChevronRight size={17} style={{ color: C.muted }} />
    </button>
  );
  return (
    <div>
      {/* Héros */}
      <div className="relative overflow-hidden rounded-3xl p-5" style={cardStyle()}>
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full" style={{ background: `radial-gradient(circle, ${C.protein}33, transparent 70%)` }} />
        <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.2em]" style={{ color: C.accent }}><Sparkles size={13} /> Tes réglages</p>
        <p className="mb-4 text-sm" style={{ color: C.sub }}>Ton cap nutrition, à ta main.</p>
        <div className="mb-4 flex items-end gap-2">
          <span className="text-5xl font-black leading-none tabular-nums" style={{ color: C.ink }}>{kcal}</span>
          <span className="pb-1 text-sm font-bold" style={{ color: C.muted }}>kcal /j</span>
          <span className="ml-auto rounded-full px-3 py-1.5 text-sm font-black tabular-nums" style={{ backgroundColor: `${C.green}1f`, color: C.green }}>{protein} g prot.</span>
        </div>
        <div className="space-y-3.5">
          <LiveSlider label="Calories" icon={<Flame size={15} style={{ color: C.protein }} />} value={kcal} unit="kcal" min={1500} max={2600} step={50} color={C.protein} onChange={(v) => { setKcal(v); flash(); }} />
          <LiveSlider label="Protéines" icon={<Beef size={15} style={{ color: C.green }} />} value={protein} unit="g" min={100} max={220} step={5} color={C.green} onChange={(v) => { setProtein(v); flash(); }} />
        </div>
        <div className="mt-4 flex items-center gap-2">
          <button className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold active:scale-95" style={{ backgroundColor: C.ink, color: C.paper }}><Calculator size={15} /> Estimer depuis moi</button>
          <SavedPill show={saved} />
        </div>
      </div>

      <Divider>Ma cuisine</Divider>
      <Line icon={<Bookmark size={17} />} color={C.green} label="Ma base perso" value={`${FIX.baseCount}`} />
      <Line icon={<Pin size={17} />} color={C.accent} label="Mes consignes" value={`${FIX.dirCount}`} last />

      <Divider>Mon compte</Divider>
      <Line icon={<Cloud size={17} />} color={C.weight} label="Synchronisation" value="connecté" last />

      <Divider>Apparence & données</Divider>
      <div className="flex items-center justify-between py-3" style={{ borderBottom: `1px solid ${C.line}` }}>
        <span className="flex items-center gap-3 text-[15px] font-semibold" style={{ color: C.ink }}><Palette size={17} style={{ color: C.protein }} /> Thème</span>
        <ThemeSeg />
      </div>
      <Line icon={<BookOpen size={17} />} color={C.sub} label="Guide & méthode" />
      <Line icon={<Database size={17} />} color={C.muted} label="Sauvegarde & restauration" last />
    </div>
  );
}

// ─── Variante F : SYNTHÈSE (héros B + édition en modale + sections A) ─────────
// Héros cibles (B) mais l'ÉDITION se fait dans une bottom-sheet (la vraie Sheet de
// l'app → cohérence totale), pas inline. En dessous : sections SectionTitle nettes (A).
function TargetSheet({ open, onClose, kcal, protein, setKcal, setProtein }) {
  const [saved, flash] = useSavedFlash();
  const [calc, setCalc] = useState(false);
  const [profile, setProfile] = useState({ sex: "h", age: 42, weight: 91, height: 186, activity: 1.45, deficit: 0.18, goalRate: 0.5 });
  const setP = (k, v) => setProfile((p) => ({ ...p, [k]: v }));
  let reco = { target: 1850, proteinReco: 150 };
  try { reco = computeTargets(profile); } catch (_) {}
  const ppk = (protein / (profile.weight || 1)).toFixed(1).replace(".", ",");
  const Field = ({ label, k, suffix }) => (
    <div><p className="mb-1 text-xs font-medium" style={{ color: C.sub }}>{label}</p>
      <div className="flex items-center rounded-xl px-3 py-1.5" style={{ backgroundColor: C.paper }}>
        <input value={profile[k]} onChange={(e) => setP(k, +e.target.value || 0)} inputMode="numeric" className="w-full bg-transparent text-sm font-semibold outline-none" style={{ color: C.ink }} />
        <span className="text-xs" style={{ color: C.muted }}>{suffix}</span>
      </div></div>
  );
  const Chips = ({ label, k, opts }) => (
    <div><p className="mb-1 text-xs font-medium" style={{ color: C.sub }}>{label}</p>
      <div className="flex flex-wrap gap-1.5">{opts.map((o) => <button key={o.v} onClick={() => setP(k, o.v)} className="rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95" style={profile[k] === o.v ? { backgroundColor: C.ink, color: C.paper } : { backgroundColor: C.card, color: C.sub, border: `1px solid ${C.line}` }}>{o.l}</button>)}</div></div>
  );
  return (
    <Sheet open={open} onClose={onClose} title="Tes cibles du jour" subtitle="S'applique en direct" icon={<Target size={18} />} iconColor={C.protein} z={50}
      headerRight={<SavedPill show={saved} />}>
      <div className="space-y-5 pb-2">
        <div className="space-y-4 rounded-2xl p-4" style={cardStyle()}>
          <LiveSlider label="Calories" icon={<Flame size={15} style={{ color: C.protein }} />} value={kcal} unit="kcal" min={1500} max={2600} step={50} color={C.protein} onChange={(v) => { setKcal(v); flash(); }} />
          <LiveSlider label="Protéines" icon={<Beef size={15} style={{ color: C.green }} />} value={protein} unit="g" min={100} max={220} step={5} color={C.green} onChange={(v) => { setProtein(v); flash(); }} sub={`≈ ${ppk} g/kg · cible muscle 1,6–2 g/kg`} />
        </div>
        <div>
          <button onClick={() => setCalc((v) => !v)} className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold active:scale-95" style={cardStyle({ color: C.ink })}>
            <span className="flex items-center gap-2"><Calculator size={16} style={{ color: C.weight }} /> Estimer depuis mes mesures</span>
            <ChevronDown size={16} style={{ color: C.muted, transform: calc ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
          </button>
          {calc && (
            <div className="mt-2 space-y-3 rounded-2xl p-4" style={cardStyle()}>
              <div className="grid grid-cols-2 gap-2">
                <Chips label="Sexe" k="sex" opts={[{ v: "h", l: "Homme" }, { v: "f", l: "Femme" }]} />
                <Field label="Âge" k="age" suffix="ans" />
                <Field label="Poids" k="weight" suffix="kg" />
                <Field label="Taille" k="height" suffix="cm" />
              </div>
              <Chips label="Activité" k="activity" opts={[{ v: 1.2, l: "Sédentaire" }, { v: 1.375, l: "Léger" }, { v: 1.45, l: "Modéré" }, { v: 1.55, l: "Actif" }]} />
              <Chips label="Objectif" k="deficit" opts={[{ v: 0, l: "Maintien" }, { v: 0.12, l: "Douce" }, { v: 0.18, l: "Perte" }, { v: 0.25, l: "Rapide" }]} />
              <div className="rounded-xl p-3" style={{ backgroundColor: C.paper }}>
                <div className="flex justify-between text-xs" style={{ color: C.sub }}><span>Maintien estimé</span><span className="font-semibold">{reco.maintenance} kcal</span></div>
                <div className="mt-1 flex justify-between text-sm"><span className="font-semibold" style={{ color: C.ink }}>Cible recommandée</span><span className="font-bold" style={{ color: C.ink }}>{reco.target} kcal · {reco.proteinReco} g</span></div>
              </div>
              <button onClick={() => { setKcal(reco.target); setProtein(reco.proteinReco); flash(); }} className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white active:scale-95" style={{ backgroundColor: C.green }}><Check size={16} /> Appliquer la reco</button>
            </div>
          )}
        </div>
      </div>
    </Sheet>
  );
}

// Sous-modales interactives (vraie Sheet) — pour PRÉVISUALISER chaque comportement.
function BaseSheet({ open, onClose }) {
  const [items, setItems] = useState([
    { id: 1, name: "Skyr nature 0%", kcal: 63, p: 11 },
    { id: 2, name: "Tofu ferme nature", kcal: 145, p: 16 },
    { id: 3, name: "Clear Whey Isolate", kcal: 90, p: 20 },
    { id: 4, name: "Pain protéiné", kcal: 240, p: 20 },
  ]);
  return (
    <Sheet open={open} onClose={onClose} title="Ma base perso" subtitle={`${items.length} produits`} icon={<Bookmark size={18} />} iconColor={C.green} z={50}>
      <div className="space-y-2 pb-2">
        {items.map((m) => (
          <div key={m.id} className="flex items-center justify-between gap-2 rounded-xl p-3" style={{ backgroundColor: C.paper }}>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold" style={{ color: C.ink }}>{m.name}</p>
              <p className="text-xs font-medium tabular-nums"><span style={{ color: C.sub }}>{m.kcal} kcal</span> · <span style={{ color: C.protein }}>{m.p} g prot.</span></p>
            </div>
            <span className="shrink-0 rounded-lg p-2" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }}><Pencil size={14} /></span>
            <button onClick={() => setItems((l) => l.filter((x) => x.id !== m.id))} className="shrink-0 rounded-lg p-2 active:scale-90" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.muted }}><Package size={14} /></button>
          </div>
        ))}
        {!items.length && <p className="py-6 text-center text-sm" style={{ color: C.muted }}>Base vide — ajoute via la pioche → Open Food Facts.</p>}
      </div>
    </Sheet>
  );
}

function ConsignesSheet({ open, onClose }) {
  const [dirs, setDirs] = useState([
    { id: 1, text: "Plus de légumes verts au déjeuner" },
    { id: 2, text: "Pas de tofu deux soirs de suite" },
    { id: 3, text: "Limiter le sel/sodium le soir" },
  ]);
  const [val, setVal] = useState("");
  const add = () => { if (val.trim()) { setDirs((l) => [{ id: Date.now(), text: val.trim() }, ...l]); setVal(""); } };
  return (
    <Sheet open={open} onClose={onClose} title="Mes consignes" subtitle="L'assistant les respecte" icon={<Pin size={18} />} iconColor={C.accent} z={50}>
      <div className="space-y-3 pb-2">
        <p className="text-xs leading-relaxed" style={{ color: C.sub }}>Des règles que l'assistant suit quand il propose des repas ou planifie. Épingle-les depuis le bilan hebdo, ou ajoute-les ici.</p>
        <div className="flex items-end gap-2">
          <input value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Ex. : pas de tofu le soir…" className="min-h-10 flex-1 rounded-xl px-3 py-2 text-sm outline-none" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink }} />
          <button onClick={add} disabled={!val.trim()} className="flex h-10 w-10 items-center justify-center rounded-xl text-white active:scale-95 disabled:opacity-50" style={{ backgroundColor: C.accent }}><Check size={18} /></button>
        </div>
        <div className="space-y-1.5">
          {dirs.map((d) => (
            <div key={d.id} className="flex items-start gap-2 rounded-xl px-3 py-2" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}` }}>
              <Pin size={13} style={{ color: C.accent, marginTop: 2, flexShrink: 0 }} />
              <span className="min-w-0 flex-1 text-sm" style={{ color: C.ink }}>{d.text}</span>
              <button onClick={() => setDirs((l) => l.filter((x) => x.id !== d.id))} className="shrink-0 rounded-lg p-1 active:scale-90" style={{ color: C.muted }}><Package size={14} /></button>
            </div>
          ))}
        </div>
      </div>
    </Sheet>
  );
}

function AccountSheet({ open, onClose }) {
  return (
    <Sheet open={open} onClose={onClose} title="Compte & synchronisation" subtitle="claude.ai.pdpdk@…" icon={<Cloud size={18} />} iconColor={C.weight} z={50}>
      <div className="space-y-3 pb-2">
        <div className="flex items-center gap-3 rounded-2xl p-4" style={cardStyle()}>
          <span className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: `${C.green}1f`, color: C.green }}><Check size={18} /></span>
          <div className="flex-1"><p className="text-sm font-bold" style={{ color: C.ink }}>Synchronisé</p><p className="text-xs" style={{ color: C.muted }}>Dernière sync il y a 2 min</p></div>
        </div>
        <button className="w-full rounded-xl py-2.5 text-sm font-semibold active:scale-95" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink }}>Forcer une synchronisation</button>
        <button className="w-full rounded-xl py-2.5 text-sm font-semibold active:scale-95" style={{ backgroundColor: C.paper, border: `1px solid ${C.over}55`, color: C.over }}>Se déconnecter</button>
      </div>
    </Sheet>
  );
}

function DataSheet({ open, onClose }) {
  return (
    <Sheet open={open} onClose={onClose} title="Sauvegarde & restauration" subtitle="Export · import JSON" icon={<Package size={18} />} iconColor={C.sub} z={50}>
      <div className="space-y-3 pb-2">
        <p className="text-xs" style={{ color: C.sub }}>Exporte tes repas et ton poids dans un fichier, ou réimporte-les (les jours se fusionnent, l'import ne supprime rien).</p>
        <div className="flex gap-2">
          <button className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold text-white active:scale-95" style={{ backgroundColor: C.green }}><Database size={15} /> Exporter</button>
          <button className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold active:scale-95" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink }}><Package size={15} /> Importer</button>
        </div>
        <textarea readOnly rows={3} placeholder="…ou colle ici un JSON exporté" className="w-full rounded-xl p-2 text-xs outline-none" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.sub, fontFamily: "ui-monospace, monospace" }} />
      </div>
    </Sheet>
  );
}

function VariantF({ theme, setTheme }) {
  const [kcal, setKcal] = useState(FIX.kcal);
  const [protein, setProtein] = useState(FIX.protein);
  const [edit, setEdit] = useState(false);
  const [sheet, setSheet] = useState(null); // 'base' | 'dir' | 'account' | 'data'
  return (
    <div className="space-y-5">
      <div>
        <SectionTitle>Tes cibles du jour</SectionTitle>
        {/* Héros (B) — l'édition ouvre une MODALE (cohérence), pas inline */}
        <button onClick={() => setEdit(true)} className="flex w-full items-center gap-4 rounded-3xl p-5 text-left active:scale-[0.99]" style={cardStyle()}>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: `${C.protein}1f`, color: C.protein }}><Target size={22} /></span>
          <div className="flex-1">
            <div className="flex items-end gap-3">
              <div><span className="text-3xl font-black tabular-nums" style={{ color: C.ink }}>{kcal}</span><span className="ml-1 text-sm font-semibold" style={{ color: C.muted }}>kcal</span></div>
              <div className="pb-0.5"><span className="text-xl font-black tabular-nums" style={{ color: C.green }}>{protein}</span><span className="ml-1 text-xs font-semibold" style={{ color: C.muted }}>g prot.</span></div>
            </div>
            <p className="mt-0.5 text-xs" style={{ color: C.sub }}>Perte de gras · ajuste à la main ou estime</p>
          </div>
          <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: C.protein }}><Pencil size={13} /> Ajuster</span>
        </button>
      </div>

      <div>
        <SectionTitle>Ma cuisine</SectionTitle>
        <div className="overflow-hidden rounded-2xl" style={cardStyle()}>
          <NavRow icon={<Bookmark size={15} />} label="Ma base perso" value={`${FIX.baseCount}`} color={C.green} onClick={() => setSheet("base")} />
          <NavRow icon={<Pin size={15} />} label="Mes consignes" value={`${FIX.dirCount}`} color={C.accent} onClick={() => setSheet("dir")} last />
        </div>
      </div>

      <div>
        <SectionTitle>Compte</SectionTitle>
        <div className="overflow-hidden rounded-2xl" style={cardStyle()}>
          <NavRow icon={<Cloud size={15} />} label="Synchronisation" value="connecté" color={C.weight} onClick={() => setSheet("account")} last />
        </div>
      </div>

      <div>
        <SectionTitle>Apparence & données</SectionTitle>
        <div className="overflow-hidden rounded-2xl" style={cardStyle()}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${C.line}` }}>
            <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: C.ink }}><Palette size={15} style={{ color: C.protein }} /> Thème</span>
            <ThemeSeg theme={theme} setTheme={setTheme} />
          </div>
          <NavRow icon={<BookOpen size={15} />} label="Guide & méthode" />
          <NavRow icon={<Package size={15} />} label="Sauvegarde & restauration" onClick={() => setSheet("data")} last />
        </div>
      </div>

      <TargetSheet open={edit} onClose={() => setEdit(false)} kcal={kcal} protein={protein} setKcal={setKcal} setProtein={setProtein} />
      <BaseSheet open={sheet === "base"} onClose={() => setSheet(null)} />
      <ConsignesSheet open={sheet === "dir"} onClose={() => setSheet(null)} />
      <AccountSheet open={sheet === "account"} onClose={() => setSheet(null)} />
      <DataSheet open={sheet === "data"} onClose={() => setSheet(null)} />
    </div>
  );
}

// ─── Shell du lab ────────────────────────────────────────────────────────────
// Cadre « téléphone » réutilisable rendant une variante dans le décor de l'app.
function PhoneFrame({ children, w = 410, minHeight = 560 }) {
  return (
    <div className="rounded-[2rem] p-3" style={{ width: w, maxWidth: "100%", backgroundColor: C.sheet, border: `1px solid ${C.line}`, boxShadow: `0 24px 64px -32px ${C.shadow}` }}>
      <div className="rounded-[1.5rem] p-3" style={{ backgroundColor: C.bg, minHeight, backgroundImage: C.bgImage }}>
        <div className="mb-4 flex items-center gap-2.5 px-1">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${C.accent}1f`, color: C.accent }}><Sliders size={17} /></span>
          <div><p className="text-base font-bold leading-tight" style={{ color: C.ink }}>Réglages</p><p className="text-xs" style={{ color: C.muted }}>Tes cibles & ta config</p></div>
        </div>
        {children}
      </div>
    </div>
  );
}

const OTHERS = [
  { id: "A", name: "Hub sectionné", axis: "Hiérarchie", Comp: VariantA },
  { id: "B", name: "Cible héros + nav", axis: "Layout", Comp: VariantB },
  { id: "C", name: "Liste dense (iOS)", axis: "Densité", Comp: VariantC },
  { id: "D", name: "Tuiles dashboard", axis: "Interaction", Comp: VariantD },
  { id: "E", name: "Éditorial expressif", axis: "Expression", Comp: VariantE },
];

export default function DesignLab() {
  const [theme, setTheme] = useState("dark");
  const [, force] = useState(0);
  useEffect(() => { applyTheme(theme); force((n) => n + 1); }, [theme]);

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: C.bg, color: C.ink }}>
      {/* Barre du lab */}
      <div className="sticky top-0 z-10 border-b px-4 py-3" style={{ backgroundColor: C.sheet, borderColor: C.line, backdropFilter: "blur(8px)" }}>
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <Sliders size={18} style={{ color: C.accent }} />
          <div className="flex-1">
            <p className="text-sm font-bold" style={{ color: C.ink }}>Design Lab · Écran Réglages</p>
            <p className="text-[11px]" style={{ color: C.muted }}>Variante retenue F (interactive) · cibles en live · thème & technique rétrogradés</p>
          </div>
          <div className="flex gap-1 rounded-full p-1" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}` }}>
            {[{ v: "light", Icon: Sun }, { v: "dark", Icon: Moon }].map(({ v, Icon }) => (
              <button key={v} onClick={() => setTheme(v)} className="rounded-full px-3 py-1.5 active:scale-95" style={theme === v ? { backgroundColor: C.ink, color: C.paper } : { color: C.sub }} aria-label={v}><Icon size={14} /></button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* ★ Variante retenue F — interactive : tape le héros, ouvre les sections, bascule le thème */}
        <div data-variant="F" className="mb-3 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full text-sm font-black" style={{ backgroundColor: C.green, color: "#fff" }}>F</span>
          <span className="text-base font-bold" style={{ color: C.ink }}>Variante retenue · synthèse</span>
          <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: `${C.green}1f`, color: C.green, border: `1px solid ${C.green}55` }}>héros B + sections A · édition en modale</span>
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px] font-medium" style={{ color: C.sub }}>
          <span className="rounded-full px-2.5 py-1" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>👆 Tape « Ajuster » → modale d'édition (curseurs live + estimateur)</span>
          <span className="rounded-full px-2.5 py-1" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>📂 Ouvre Base / Consignes / Compte / Données</span>
          <span className="rounded-full px-2.5 py-1" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>🌗 Bascule le thème dans la carte Apparence</span>
        </div>
        <div className="flex justify-center lg:justify-start">
          <PhoneFrame w={430} minHeight={620}>
            <VariantF theme={theme} setTheme={setTheme} />
          </PhoneFrame>
        </div>

        {/* Pistes explorées — pour comparaison/référence */}
        <div className="mt-10 mb-3 flex items-end justify-between">
          <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: C.sub }}>Pistes explorées</h2>
          <span className="text-[11px]" style={{ color: C.muted }}>défile horizontalement →</span>
        </div>
        <div className="flex snap-x gap-6 overflow-x-auto pb-4">
          {OTHERS.map(({ id, name, axis, Comp }) => (
            <div key={id} data-variant={id} className="shrink-0 snap-center" style={{ width: 360 }}>
              <div className="mb-2 flex items-baseline gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-black" style={{ backgroundColor: C.accent, color: "#fff" }}>{id}</span>
                <span className="text-sm font-bold" style={{ color: C.ink }}>{name}</span>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: C.card, color: C.muted, border: `1px solid ${C.line}` }}>{axis}</span>
              </div>
              <PhoneFrame w={360} minHeight={500}><Comp /></PhoneFrame>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-xs" style={{ color: C.muted }}>F est la synthèse interactive. A–E restent visibles pour comparer. Bascule clair/sombre en haut à droite.</p>
      </div>
    </div>
  );
}
