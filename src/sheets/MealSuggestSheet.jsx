import React, { useMemo, useState, useRef, useEffect } from "react";
import { Sparkles, Loader2, Refrigerator, AlertCircle, Lightbulb } from "lucide-react";
import { C, buildAssistantPrompt } from "../core.js";
import { askAssistant, AssistantError } from "../lib/assistant.js";
import { Sheet } from "../components/Sheet.jsx";
import MealCard from "../components/MealCard.jsx";
import { PantrySheet } from "./PantrySheet.jsx";

const SLOT_LABELS = { pdj: "petit-déjeuner", dej: "déjeuner", diner: "dîner", snack: "en-cas" };
// Contraintes/ envies rapides (1 tap). « resto » bascule un mode dédié (pas de
// recette, estimations conservatrices) ; les autres ajoutent une phrase au prompt.
const WISH_CHIPS = [
  { k: "resto", l: "🍽️ Au resto", phrase: null },
  { k: "rapide", l: "⚡ Rapide / sans cuisson", phrase: "rapide à préparer, sans cuisson" },
  { k: "leger", l: "🪶 Léger", phrase: "plutôt léger" },
  { k: "proteine", l: "💪 Très protéiné", phrase: "le plus protéiné possible" },
  { k: "sucre", l: "🍫 Sucré / plaisir", phrase: "j'ai envie de sucré, un petit plaisir raisonnable" },
];

// Idée de repas contextuelle : ouverte depuis un créneau de l'écran Jour.
// Matchs locaux d'abord (gratuit), puis assistant à la demande. Logge dans CE créneau.
export function MealSuggestSheet({
  slot = "dej", remKcal = 0, remP = 0,
  dayRemKcal = 0, dayRemP = 0, reserveKcal = 0, weekBalance,
  favorites = [], knownFoods = [], localIdeas = [], dayContext = [], recentMeals = [],
  pantry = [], onAddPantry, onTogglePantry, onUpdatePantry, onRemovePantry,
  onLog, onSaveRecipe, dateLabel, onClose,
}) {
  const [exclude, setExclude] = useState("");
  const [wish, setWish] = useState("");
  const [chips, setChips] = useState(() => new Set());
  const [indulge, setIndulge] = useState(false); // « je me fais plaisir » → budget = restant du jour entier
  const [localOpen, setLocalOpen] = useState(true); // bloc « dans tes idées » — replié quand l'assistant répond
  const [pantryOpen, setPantryOpen] = useState(false);
  const toggleChip = (k) => setChips((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  // Budget effectif : marge du créneau (défaut) ou restant du jour entier (mode plaisir).
  const budK = indulge ? dayRemKcal : remKcal, budP = indulge ? dayRemP : remP;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [savedKeys, setSavedKeys] = useState(() => new Set());

  const local = useMemo(() => {
    const cap = budK > 0 ? budK * 1.1 : Infinity;
    const deburr = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const out = pantry.filter((x) => x.out).map((x) => deburr(x.name)).filter(Boolean);
    const hasRupture = (r) => { const hay = deburr(r.name + " " + (r.ingredients || []).map((i) => (typeof i === "string" ? i : i.name)).join(" ")); return out.some((o) => hay.includes(o)); };
    // Dédup : une recette catalogue éditée vit en double (copie perso + original, même id) → on
    // ne la garde qu'une fois (par id ET par nom, la version perso d'abord car listée en premier).
    const seenId = new Set(), seenName = new Set();
    const uniq = (localIdeas || []).filter((r) => {
      const nm = deburr(r.name);
      if ((r.id && seenId.has(r.id)) || seenName.has(nm)) return false;
      if (r.id) seenId.add(r.id); seenName.add(nm); return true;
    });
    return uniq
      .filter((r) => (r.cat || r.slot) === slot && (r.kcal || 0) <= cap && !hasRupture(r))
      .sort((a, b) => (b.p || 0) - (a.p || 0))
      .slice(0, 4)
      .map((r) => ({ title: r.name, emoji: r.emoji, kcal: r.kcal, protein: r.p, slot, ingredients: r.ingredients?.map((s) => (typeof s === "string" ? { name: s } : s)) || [], steps: r.steps || [] }));
  }, [slot, budK, localIdeas, pantry]);
  const thin = local.length < 3;

  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);
  const ask = async () => {
    setBusy(true); setError(null);
    try {
      const dining = chips.has("resto");
      const userWish = [...WISH_CHIPS.filter((c) => c.phrase && chips.has(c.k)).map((c) => c.phrase), wish.trim()].filter(Boolean).join(" · ");
      const { system, prompt, mode } = buildAssistantPrompt({
        mode: "meal", slot, remKcal: budK, remP: budP, favorites, knownFoods, userWish, dining, weekBalance, indulge, reserveKcal: indulge ? 0 : reserveKcal, dayContext, recentMeals,
        have: dining ? [] : pantry.filter((x) => !x.out).map((x) => ({ name: x.name, qty: x.qty, unit: x.unit, kcal100: x.kcal100, p100: x.p100 })),
        avoid: [...pantry.filter((x) => x.out).map((x) => x.name), ...exclude.split(",").map((s) => s.trim()).filter(Boolean)],
        dateLabel,
      });
      const { meals } = await askAssistant({ system, prompt, mode });
      if (!mounted.current) return;
      setResults(meals);
      setLocalOpen(false); // on replie « dans tes idées » pour montrer le résultat de l'assistant
    } catch (e) {
      if (mounted.current) setError(e instanceof AssistantError ? e : new AssistantError("Une erreur est survenue."));
    } finally { if (mounted.current) setBusy(false); }
  };

  const keyOf = (m, i) => `${m.title}-${i}`;
  const save = (cust, i) => { onSaveRecipe?.(cust); setSavedKeys((s) => new Set(s).add(i)); };

  return (
    <Sheet open onClose={onClose} title="Une idée de repas" subtitle={`Pour le ${SLOT_LABELS[slot] || "repas"}`} icon={<Lightbulb size={18} />} iconColor={C.green}>
      <div className="flex items-center justify-between pb-1.5">
        <p className="text-xs" style={{ color: C.sub }}>{indulge ? "Plaisir · restant du jour" : `Marge ${SLOT_LABELS[slot] || "repas"}`} : <span className="font-bold" style={{ color: budK <= 0 ? C.over : C.ink }}>{Math.round(Math.max(0, budK))} kcal</span> · <span className="font-bold" style={{ color: C.protein }}>{Math.round(Math.max(0, budP))} g</span></p>
        <button onClick={() => setPantryOpen(true)} className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }}>
          <Refrigerator size={13} /> Frigo{pantry.filter((x) => !x.out).length ? ` · ${pantry.filter((x) => !x.out).length}` : ""}
        </button>
      </div>
      {reserveKcal > 50 && (
        <div className="mb-2 flex gap-1.5 rounded-xl p-1" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
          <button onClick={() => setIndulge(false)} className="flex-1 rounded-lg py-1.5 text-[11px] font-bold active:scale-95" style={!indulge ? { backgroundColor: C.ink, color: C.bg } : { color: C.sub }}>Dans ma marge</button>
          <button onClick={() => setIndulge(true)} className="flex-1 rounded-lg py-1.5 text-[11px] font-bold active:scale-95" style={indulge ? { backgroundColor: C.accent, color: "#fff" } : { color: C.sub }}>🍫 Je me fais plaisir</button>
        </div>
      )}
      <p className="pb-3 text-[11px]" style={{ color: C.muted }}>
        {indulge
          ? <>Tu assumes le plaisir — l'assistant rééquilibrera : tes <b style={{ color: C.sub }}>repas à venir devront être plus légers</b>.</>
          : reserveKcal > 50
          ? <>≈{Math.round(reserveKcal)} kcal réservés à tes repas à venir (sur {Math.round(Math.max(0, dayRemKcal))} restant aujourd'hui).{budK <= 0 ? " Peu de place — l'assistant proposera très léger." : ""}</>
          : <>Tout ton restant du jour est dispo pour ce repas.</>}
      </p>

      {/* Envie / contrainte (optionnel) : chips rapides + texte libre, gardés à la régénération */}
      <div className="mb-2 flex flex-wrap gap-1.5">
        {WISH_CHIPS.map((c) => {
          const on = chips.has(c.k);
          return <button key={c.k} onClick={() => toggleChip(c.k)} className="rounded-full px-2.5 py-1.5 text-xs font-semibold active:scale-95" style={on ? { backgroundColor: C.accent, color: "#fff" } : { backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }}>{c.l}</button>;
        })}
      </div>
      <input value={wish} onChange={(e) => setWish(e.target.value)} placeholder="Une envie, une contrainte ? (ex. des pâtes, 10 min)…" className="mb-2 w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }} />
      <input value={exclude} onChange={(e) => setExclude(e.target.value)} placeholder="Exclure (ex. tofu)…" className="mb-3 w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }} />

      {local.length > 0 && (localOpen ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.muted }}>Dans tes idées</p>
            {results && <button onClick={() => setLocalOpen(false)} className="text-xs font-semibold active:scale-95" style={{ color: C.muted }}>Masquer</button>}
          </div>
          {local.map((m, i) => <MealCard key={`l-${i}`} meal={m} onLog={(cust) => { onLog?.(cust, slot); onClose(); }} onSave={(cust) => save(cust, `l${i}`)} saved={savedKeys.has(`l${i}`)} />)}
        </div>
      ) : (
        <button onClick={() => setLocalOpen(true)} className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }}>
          <Lightbulb size={13} /> Voir mes idées ({local.length})
        </button>
      ))}

      {/* Avant toute génération : demander à l'assistant */}
      {!results && (
        <button onClick={ask} disabled={busy} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold active:scale-95"
          style={{ backgroundColor: thin ? C.green : "transparent", color: thin ? "#fff" : C.green, border: `1.5px solid ${C.green}` }}>
          {busy ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />}
          {busy ? "L'assistant réfléchit…" : thin ? "Peu d'idées ici — demander à l'assistant" : "Demander à l'assistant"}
        </button>
      )}

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-2xl cm-card" style={{ backgroundColor: C.card, border: `1px solid ${C.over}` }}>
          <AlertCircle size={16} style={{ color: C.over, flexShrink: 0, marginTop: 1 }} />
          <div className="text-xs" style={{ color: C.sub }}>
            <p className="font-semibold" style={{ color: C.ink }}>{error.message}</p>
            {error.kind === "unconfigured" && <p className="mt-1">Ajoute <code>ANTHROPIC_API_KEY</code> dans Netlify.</p>}
            {error.kind === "offline" && <p className="mt-1">L'assistant ne marche que sur l'app déployée.</p>}
          </div>
        </div>
      )}

      {results && (
        <div className="mt-3 space-y-2 pb-2">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.muted }}>Proposé par l'assistant</p>
          {results.map((m, i) => <MealCard key={keyOf(m, i)} meal={m} onLog={(cust) => { onLog?.(cust, slot); onClose(); }} onSave={(cust) => save(cust, `r${i}`)} saved={savedKeys.has(`r${i}`)} />)}
          <button onClick={ask} disabled={busy} className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-bold active:scale-95" style={{ backgroundColor: "transparent", color: C.green, border: `1.5px solid ${C.green}` }}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} {busy ? "L'assistant réfléchit…" : "Régénérer"}
          </button>
        </div>
      )}

      {pantryOpen && <PantrySheet pantry={pantry} onAdd={onAddPantry} onToggle={onTogglePantry} onUpdate={onUpdatePantry} onRemove={onRemovePantry} onClose={() => setPantryOpen(false)} />}
    </Sheet>
  );
}
