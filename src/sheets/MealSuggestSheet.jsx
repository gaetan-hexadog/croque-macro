import React, { useMemo, useState, useRef, useEffect } from "react";
import { Sparkles, Loader2, Refrigerator, AlertCircle, ChevronDown } from "lucide-react";
import { C, buildAssistantPrompt, correctMacros } from "../core.js";
import { askAssistant, AssistantError } from "../lib/assistant.js";
import { Sheet } from "../components/Sheet.jsx";
import MealCard from "../components/MealCard.jsx";
import { PantrySheet } from "./PantrySheet.jsx";

const SLOT_LABELS = { pdj: "petit-déjeuner", dej: "déjeuner", diner: "dîner", snack: "en-cas" };
// Envies rapides (1 tap). « resto » bascule un mode dédié ; chaque chip filtre AUSSI les idées
// locales en direct (sucré = mots-clés, léger = tri kcal, protéiné = ratio, resto = masque le local).
const WISH_CHIPS = [
  { k: "resto", l: "🍽️ Au resto", phrase: null },
  { k: "rapide", l: "⚡ Rapide", phrase: "rapide à préparer, sans cuisson" },
  { k: "leger", l: "🪶 Léger", phrase: "plutôt léger" },
  { k: "proteine", l: "💪 Protéiné", phrase: "le plus protéiné possible" },
  { k: "sucre", l: "🍰 Sucré", phrase: "j'ai envie de sucré, un petit plaisir raisonnable" },
];
const deburr = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const SWEET = /skyr|fruit|pancake|banane|chocolat|avoine|porridge|miel|compote|crepe|gaufre|vanille|cookie|datte|yaourt|granola/;
const textOf = (m) => deburr(m.title + " " + (m.ingredients || []).map((i) => (typeof i === "string" ? i : i.name)).join(" "));
// Extrait les exclusions en langage naturel : « sans tofu », « pas de fromage », « sauf X ».
const excludeFromText = (s) => {
  const out = []; const re = /(?:sans|pas de|pas d'|sauf|ni)\s+([a-z'-]+(?:\s+[a-z'-]+)?)/g; let m;
  while ((m = re.exec(deburr(s)))) out.push(m[1].trim());
  return out.filter((t) => t.length > 2);
};

// Idée de repas contextuelle (ouverte depuis un créneau). Flux conversationnel : accroche, puis
// chips (filtrent tes recettes EN DIRECT) ou saisie libre + ✨ (appelle l'assistant). Idées fusionnées.
export function MealSuggestSheet({
  slot = "dej", remKcal = 0, remP = 0, targetKcal = 1850, targetP = 150,
  dayRemKcal = 0, dayRemP = 0, reserveKcal = 0, weekBalance, training = false, workout, trend,
  favorites = [], knownFoods = [], localIdeas = [], dayContext = [], recentMeals = [],
  pantry = [], onAddPantry, onTogglePantry, onUpdatePantry, onRemovePantry,
  onLog, onSaveRecipe, dateLabel, onClose,
}) {
  const [wish, setWish] = useState("");
  const [chips, setChips] = useState(() => new Set());
  const [indulge, setIndulge] = useState(false); // « je me fais plaisir » → budget = restant du jour entier
  const [pantryOpen, setPantryOpen] = useState(false);
  const [localCollapsed, setLocalCollapsed] = useState(false); // replié quand l'assistant répond (sinon le retour se planque sous tes recettes)
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [savedKeys, setSavedKeys] = useState(() => new Set());
  const toggleChip = (k) => setChips((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const budK = indulge ? dayRemKcal : remKcal, budP = indulge ? dayRemP : remP;

  // Base locale : créneau + budget + pas en rupture + dédup (copie perso/originale même id).
  const local = useMemo(() => {
    const cap = budK > 0 ? budK * 1.1 : Infinity;
    const out = pantry.filter((x) => x.out).map((x) => deburr(x.name)).filter(Boolean);
    const hasRupture = (r) => { const hay = deburr(r.name + " " + (r.ingredients || []).map((i) => (typeof i === "string" ? i : i.name)).join(" ")); return out.some((o) => hay.includes(o)); };
    const seenId = new Set(), seenName = new Set();
    const uniq = (localIdeas || []).filter((r) => {
      const nm = deburr(r.name);
      if ((r.id && seenId.has(r.id)) || seenName.has(nm)) return false;
      if (r.id) seenId.add(r.id); seenName.add(nm); return true;
    });
    return uniq
      .filter((r) => (r.cat || r.slot) === slot && (r.kcal || 0) <= cap && !hasRupture(r))
      .map((r) => ({ title: r.name, emoji: r.emoji, kcal: r.kcal, protein: r.p, slot, ingredients: r.ingredients?.map((s) => (typeof s === "string" ? { name: s } : s)) || [], steps: r.steps || [] }));
  }, [slot, budK, localIdeas, pantry]);

  // Filtre LIVE par chips + exclusions du texte (le fix : ce que tu indiques pilote ce que tu vois).
  const excludeTerms = useMemo(() => excludeFromText(wish), [wish]);
  const localFiltered = useMemo(() => {
    if (chips.has("resto")) return [];
    let r = local.filter((m) => !excludeTerms.some((t) => textOf(m).includes(t)));
    if (chips.has("sucre")) r = r.filter((m) => SWEET.test(textOf(m)));
    if (chips.has("leger")) r = [...r].sort((a, b) => (a.kcal || 0) - (b.kcal || 0));
    else if (chips.has("proteine")) r = [...r].sort((a, b) => ((b.protein || 0) / (b.kcal || 1)) - ((a.protein || 0) / (a.kcal || 1)));
    else r = [...r].sort((a, b) => (b.protein || 0) - (a.protein || 0)); // défaut : le plus protéiné d'abord
    return r.slice(0, 6);
  }, [local, chips, excludeTerms]);

  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);
  const ask = async () => {
    setBusy(true); setError(null); setLocalCollapsed(true); // replie tes recettes → le retour de l'assistant est visible direct
    try {
      const dining = chips.has("resto");
      const userWish = [...WISH_CHIPS.filter((c) => c.phrase && chips.has(c.k)).map((c) => c.phrase), wish.trim()].filter(Boolean).join(" · ");
      const { system, prompt, mode } = buildAssistantPrompt({
        mode: "meal", slot, remKcal: budK, remP: budP, targetKcal, targetP, training, workout, trend, favorites, knownFoods, userWish, dining, weekBalance, indulge, reserveKcal: indulge ? 0 : reserveKcal, dayContext, recentMeals,
        have: dining ? [] : pantry.filter((x) => !x.out).map((x) => ({ name: x.name, qty: x.qty, unit: x.unit, kcal100: x.kcal100, p100: x.p100 })),
        avoid: [...pantry.filter((x) => x.out).map((x) => x.name), ...excludeTerms],
        dateLabel,
      });
      const { meals } = await askAssistant({ system, prompt, mode });
      if (!mounted.current) return;
      setResults(meals.map((m) => correctMacros(m, knownFoods, pantry)));
    } catch (e) {
      if (mounted.current) setError(e instanceof AssistantError ? e : new AssistantError("Une erreur est survenue."));
    } finally { if (mounted.current) setBusy(false); }
  };

  const save = (cust, i) => { onSaveRecipe?.(cust); setSavedKeys((s) => new Set(s).add(i)); };
  const dispoN = pantry.filter((x) => !x.out).length;

  return (
    <Sheet open onClose={onClose} title="Une idée de repas" subtitle={`Pour le ${SLOT_LABELS[slot] || "repas"}`} icon={<Sparkles size={18} />} iconColor={C.green}>
      {/* Accroche conversationnelle */}
      <div className="flex items-start gap-2 pb-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: `radial-gradient(circle at 32% 28%, ${C.warn}, ${C.accent})`, color: "#1a1208" }}><Sparkles size={15} /></span>
        <div className="rounded-2xl rounded-bl-md px-3.5 py-2.5 text-sm leading-relaxed" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }}>
          {indulge
            ? <>Mode plaisir : tu pioches dans <b style={{ color: C.protein }}>{Math.round(Math.max(0, budK))} kcal · {Math.round(Math.max(0, budP))} g</b> du jour — je rééquilibrerai tes repas à venir. Envie de quoi ?</>
            : <>Pour ton {SLOT_LABELS[slot] || "repas"}, il te reste <b style={{ color: budK <= 0 ? C.over : C.protein }}>{Math.round(Math.max(0, budK))} kcal · {Math.round(Math.max(0, budP))} g</b>. Envie de quoi ?</>}
        </div>
      </div>

      {/* Réponse rapide : chips d'envie + Plaisir (toujours visible) + accès Frigo */}
      <div className="mb-2 flex flex-wrap gap-1.5">
        <button onClick={() => setIndulge((v) => !v)} className="rounded-full px-2.5 py-1.5 text-xs font-bold active:scale-95" style={indulge ? { backgroundColor: C.accent, color: "#fff" } : { backgroundColor: `${C.accent}16`, color: C.accent, border: `1px solid ${C.accent}40` }}>😋 Plaisir</button>
        {WISH_CHIPS.map((c) => {
          const on = chips.has(c.k);
          return <button key={c.k} onClick={() => toggleChip(c.k)} className="rounded-full px-2.5 py-1.5 text-xs font-semibold active:scale-95" style={on ? { backgroundColor: C.accent, color: "#fff" } : { backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }}>{c.l}</button>;
        })}
        <button onClick={() => setPantryOpen(true)} className="ml-auto flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }}><Refrigerator size={13} /> Frigo{dispoN ? ` · ${dispoN}` : ""}</button>
      </div>

      {/* …ou saisie libre + ✨ (appelle l'assistant) */}
      <div className="flex items-end gap-2">
        <input value={wish} onChange={(e) => setWish(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") ask(); }} placeholder="Ton envie, ou ce que tu évites (des pâtes, sans tofu…)" className="min-h-11 flex-1 rounded-2xl px-3.5 py-3 text-sm outline-none" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }} />
        <button onClick={ask} disabled={busy} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl active:scale-95 disabled:opacity-60" style={{ background: `linear-gradient(150deg, ${C.protein}, ${C.accent})`, color: "#fff" }} aria-label="Demander à l'assistant">
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
        </button>
      </div>
      <p className="mb-3 mt-1 px-1 text-[10px]" style={{ color: C.muted }}>Les chips filtrent tes recettes en direct ; <b style={{ color: C.sub }}>✨</b> demande de nouvelles idées à l'assistant.</p>

      {/* Tes recettes, filtrées en direct — repliables (repliées dès qu'on interroge l'assistant) */}
      {localFiltered.length > 0 && (
        <div className="space-y-2">
          <button onClick={() => setLocalCollapsed((c) => !c)} className="flex w-full items-center gap-1.5 active:opacity-70">
            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: C.muted }}>Dans tes recettes{chips.size || excludeTerms.length ? " · filtrées" : ""} · {localFiltered.length}</span>
            <ChevronDown size={13} style={{ color: C.muted, marginLeft: "auto", transform: localCollapsed ? "none" : "rotate(180deg)", transition: "transform .2s" }} />
          </button>
          {!localCollapsed && localFiltered.map((m, i) => <MealCard key={`l-${i}`} meal={m} onLog={(cust) => { onLog?.(cust, slot); onClose(); }} onSave={(cust) => save(cust, `l${i}`)} saved={savedKeys.has(`l${i}`)} />)}
        </div>
      )}

      {/* L'assistant réfléchit — visible, pour qu'on voie qu'il se passe quelque chose */}
      {busy && !results && (
        <div className="mt-2 flex items-center justify-center gap-2 rounded-2xl px-3 py-4 text-sm" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }}>
          <Loader2 size={16} className="animate-spin" style={{ color: C.accent }} /> L'assistant prépare des idées…
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-2xl cm-card" style={{ backgroundColor: C.card, border: `1px solid ${C.over}` }}>
          <AlertCircle size={16} style={{ color: C.over, flexShrink: 0, marginTop: 1 }} />
          <div className="text-xs" style={{ color: C.sub }}>
            <p className="font-semibold" style={{ color: C.ink }}>{error.message}</p>
            {error.kind === "unconfigured" && <p className="mt-1">Ajoute <code>ANTHROPIC_API_KEY</code> dans Supabase.</p>}
            {error.kind === "offline" && <p className="mt-1">L'assistant ne marche que sur l'app déployée.</p>}
          </div>
        </div>
      )}

      {/* Idées de l'assistant (ajoutées sous les tiennes) */}
      {results && (
        <div className="mt-3 space-y-2 pb-2">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest" style={{ color: C.accent }}><Sparkles size={12} /> Idées de l'assistant</p>
          {results.map((m, i) => <MealCard key={`r-${m.title}-${i}`} meal={m} check onLog={(cust) => { onLog?.(cust, slot); onClose(); }} onSave={(cust) => save(cust, `r${i}`)} saved={savedKeys.has(`r${i}`)} />)}
          <button onClick={ask} disabled={busy} className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-bold active:scale-95" style={{ backgroundColor: "transparent", color: C.green, border: `1.5px solid ${C.green}` }}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} {busy ? "L'assistant réfléchit…" : "Régénérer"}
          </button>
        </div>
      )}

      {/* Rien à montrer encore */}
      {!localFiltered.length && !results && !busy && (
        <p className="rounded-2xl px-3 py-5 text-center text-xs" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.muted }}>
          {chips.has("resto") ? "Au resto — appuie sur ✨ pour des idées adaptées." : excludeTerms.length || chips.size ? "Aucune de tes recettes ne colle — appuie sur ✨, l'assistant cherche." : "Coche une envie, ou demande à l'assistant avec ✨."}
        </p>
      )}

      {pantryOpen && <PantrySheet pantry={pantry} onAdd={onAddPantry} onToggle={onTogglePantry} onUpdate={onUpdatePantry} onRemove={onRemovePantry} onClose={() => setPantryOpen(false)} />}
    </Sheet>
  );
}
