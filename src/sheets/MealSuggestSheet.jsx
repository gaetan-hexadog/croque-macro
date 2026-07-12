import React, { useMemo, useState, useRef, useEffect } from "react";
import { Sparkles, Loader2, Refrigerator, AlertCircle, ChevronDown, Pin, X } from "lucide-react";
import { C, buildAssistantPrompt, correctMacros, dietaryWarnings, expiryMeta, wishSignals } from "../core.js";
import { askAssistant, AssistantError } from "../lib/assistant.js";
import { Sheet } from "../components/Sheet.jsx";
import MealCard from "../components/MealCard.jsx";
import { PantrySheet } from "./PantrySheet.jsx";
import { useRotatingLine, THINKING } from "../components/useRotatingLine.js";

const SLOT_LABELS = { pdj: "petit-déjeuner", dej: "déjeuner", diner: "dîner", snack: "en-cas" };
// Envies rapides (1 tap). « resto » bascule un mode dédié ; chaque chip filtre AUSSI les idées
// locales en direct (sucré = mots-clés, léger = tri kcal, protéiné = ratio, resto = masque le local).
const WISH_CHIPS = [
  { k: "resto", l: "🍽️ Au resto", phrase: null },
  { k: "rapide", l: "⚡ Rapide", phrase: "rapide à préparer, sans cuisson" },
  { k: "leger", l: "🪶 Léger", phrase: "plutôt léger" },
  { k: "proteine", l: "💪 Protéiné", phrase: "le plus protéiné possible" },
  { k: "sucre", l: "🍰 Sucré", phrase: "j'ai envie de sucré, un petit plaisir raisonnable" },
  { k: "menu", l: "🍱 Menu complet", phrase: "un repas complet : entrée + plat + dessert" },
];
const deburr = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const SWEET = /skyr|fruit|pancake|banane|chocolat|avoine|porridge|miel|compote|crepe|gaufre|vanille|cookie|datte|yaourt|granola/;
// Intention « sans cuisson » : chip Rapide OU mention explicite dans le texte → règle dure côté prompt.
const NOCOOK = /sans cuisson|sans prep|pas de cuisson|pas cuire|a froid|assemblage|\bcrue?s?\b/;
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
  favorites = [], knownFoods = [], localIdeas = [], dayContext = [], recentMeals = [], overused = [],
  directives = [], onRemoveDirective,
  pantry = [], onAddPantry, onTogglePantry, onUpdatePantry, onRemovePantry,
  onLog, onSaveRecipe, dateLabel, onClose, priority = null,
}) {
  const [wish, setWish] = useState("");
  const [chips, setChips] = useState(() => new Set());
  const [indulge, setIndulge] = useState(false); // « je me fais plaisir » → budget = restant du jour entier
  const [fridgeStrict, setFridgeStrict] = useState(false); // opt-in : ne cuisine QU'AVEC le frigo (sinon frigo = bonus, invention libre)
  const [pantryOpen, setPantryOpen] = useState(false);
  const [localCollapsed, setLocalCollapsed] = useState(true); // R3 actions-first : tes recettes en secondaire (repliées) ; l'action mène l'IA
  const [dirOpen, setDirOpen] = useState(false); // consignes repliées par défaut (elles mangeaient l'écran)
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [savedKeys, setSavedKeys] = useState(() => new Set());
  const toggleChip = (k) => setChips((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const budK = indulge ? dayRemKcal : remKcal, budP = indulge ? dayRemP : remP;
  const thinking = useRotatingLine(THINKING.meal, busy); // message d'attente qui défile pendant que ✨ réfléchit

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

  // « Cuisinable maintenant » (direction F) : tes recettes du créneau réalisables avec le frigo
  // (≥ 50 % des ingrédients dispo) → mises en tête comme point de départ, pas un bouton sur 4.
  const pantryNames = useMemo(() => pantry.filter((x) => !x.out).map((x) => deburr(x.name)).filter((s) => s.length > 2), [pantry]);
  const matchFrac = (m) => { const ings = (m.ingredients || []).map((i) => deburr(typeof i === "string" ? i : i.name)).filter(Boolean); if (!ings.length) return 0; return ings.filter((ing) => pantryNames.some((pn) => ing.includes(pn) || pn.includes(ing))).length / ings.length; };
  const cookable = useMemo(() => local.map((m) => ({ m, f: matchFrac(m) })).filter((x) => x.f >= 0.5).sort((a, b) => b.f - a.f).slice(0, 3).map((x) => x.m), [local, pantryNames]);

  const mounted = useRef(true);
  const seenTitles = useRef([]); // plats déjà proposés dans cette session → passés en excludeTitles pour que « Régénérer » VARIE
  useEffect(() => () => { mounted.current = false; }, []);
  // Dès que l'assistant travaille ou a répondu → on replie « Dans tes recettes » pour mettre ses
  // idées en avant (le toggle reste dispo pour ré-ouvrir le filet de secours).
  useEffect(() => { if (busy || results) setLocalCollapsed(true); }, [busy, results]);
  // ask(override) : le composer envoie `wish`+chips ; les cartes d'action passent une intention
  // (ov.sweet / ov.noCook / ov.useSoon / ov.wishText) sans dépendre des chips.
  const ask = async (ov = {}) => {
    setBusy(true); setError(null);
    try {
      const dining = ov.dining ?? chips.has("resto");
      const noCook = ov.noCook ?? (chips.has("rapide") || NOCOOK.test(deburr(wish)));
      const useSoon = ov.useSoon ?? (priority || []);
      const userWish = [...WISH_CHIPS.filter((c) => c.phrase && chips.has(c.k)).map((c) => c.phrase), wish.trim(), ov.wishText || ""].filter(Boolean).join(" · ");
      // Contraintes dures de la demande texte : « que mon frigo » verrouille le mode strict
      // (et allume le toggle 🔒 pour que ce soit visible), « <=450 kcal » filtre les résultats.
      const sig = wishSignals(userWish);
      // « plat + dessert » = un MENU, pas une envie de sucré : le mot « dessert » ne bascule
      // en mode 100 % dessert QUE s'il n'y a pas de menu multi-services demandé.
      const sweet = ov.sweet ?? ((chips.has("sucre") || /dessert|go[uû]ter|sucr|gourmand|p[aâ]tiss|g[aâ]teau|cr[eê]pe|glace|biscuit|cookie|gaufre|donut|beignet/.test(deburr(wish))) && !sig.menu);
      const strictAsked = dining ? false : (ov.fridgeStrict ?? (fridgeStrict || sig.fridgeOnly));
      if (strictAsked && !fridgeStrict && !dining) setFridgeStrict(true);
      const { system, prompt, mode } = buildAssistantPrompt({
        mode: "meal", slot, remKcal: budK, remP: budP, targetKcal, targetP, training, workout, trend, favorites, knownFoods, userWish, dining, weekBalance, indulge, sweet, useSoon, reserveKcal: indulge ? 0 : reserveKcal, dayContext, recentMeals, overused, directives,
        // frigo = BONUS par défaut (invention libre) ; strict si Bob l'active OU le demande en texte (jamais au resto).
        fridgeOnly: strictAsked, noCook,
        have: dining ? [] : pantry.filter((x) => !x.out).map((x) => ({ name: x.name, qty: x.qty, unit: x.unit, kcal100: x.kcal100, p100: x.p100 })),
        avoid: [...pantry.filter((x) => x.out).map((x) => x.name), ...excludeTerms],
        excludeTitles: seenTitles.current, // ne repropose pas ce qu'on a déjà vu → « Régénérer » varie
        dateLabel,
      });
      const { meals } = await askAssistant({ system, prompt, mode });
      if (!mounted.current) return;
      // Filet diététique : on RETIRE un plat non conforme s'il en passe un — mais on ne VIDE JAMAIS
      // l'écran : si le filtre retire tout, on garde les repas bruts (le prompt durci les rend rares).
      const cleaned = meals.map((m) => correctMacros(m, knownFoods, pantry));
      const safe = cleaned.filter((m) => dietaryWarnings(m).length === 0);
      let finalMeals = safe.length ? safe : cleaned;
      // Plafond kcal explicite (« <=450 kcal ») : aucune option au-dessus n'est affichée
      // (5 % de tolérance d'arrondi). Si tout dépasse → message « aucune idée conforme » + Régénérer.
      if (sig.capKcal) finalMeals = finalMeals.filter((m) => (Number(m.kcal) || 0) <= sig.capKcal * 1.05);
      // « Max de protéines » : l'option la plus protéinée d'abord.
      if (sig.maxProtein) finalMeals = [...finalMeals].sort((a, b) => (b.protein || 0) - (a.protein || 0));
      setResults(finalMeals);
      const newTitles = finalMeals.map((m) => m.title).filter(Boolean);
      if (newTitles.length) seenTitles.current = [...newTitles, ...seenTitles.current].slice(0, 24);
    } catch (e) {
      if (mounted.current) setError(e instanceof AssistantError ? e : new AssistantError("Une erreur est survenue."));
    } finally { if (mounted.current) setBusy(false); }
  };

  // « Cuisiner avec ça » : ouvert avec des aliments qui périment → lance direct l'assistant.
  const autoRan = useRef(false);
  useEffect(() => { if (!autoRan.current && priority && priority.length) { autoRan.current = true; setWish(`Avec ce qui périme : ${priority.join(", ")}`); ask(); } }, []); // eslint-disable-line

  const save = (cust, i) => { onSaveRecipe?.(cust); setSavedKeys((s) => new Set(s).add(i)); };
  const dispoN = pantry.filter((x) => !x.out).length;
  const expiring = pantry.filter((x) => !x.out && expiryMeta(x.exp)?.urgent).map((x) => x.name);
  // Carte d'action (R3) : lance l'assistant direct avec une intention.
  // Layout HORIZONTAL (emoji à gauche, texte à droite) — l'icône seule sur sa ligne
  // gaspillait de la hauteur pour rien.
  const ActionCard = ({ e, t, d, c, onClick }) => (
    <button onClick={onClick} disabled={busy} className="flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left active:scale-95 disabled:opacity-50" style={{ backgroundColor: `${c}12`, border: `1px solid ${c}33` }}>
      <span className="shrink-0 text-xl">{e}</span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold" style={{ color: C.ink }}>{t}</span>
        <span className="block truncate text-[11px]" style={{ color: C.muted }}>{d}</span>
      </span>
    </button>
  );
  const Tog = ({ on, onClick, children }) => <button onClick={onClick} className="rounded-full px-2.5 py-1.5 text-xs font-bold active:scale-95" style={on ? { backgroundColor: C.accent, color: "#fff" } : { backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }}>{children}</button>;

  // Composer épinglé en bas de la modale (hors scroll) : saisie libre + ✨.
  const composer = (
    <>
      <div className="flex items-center gap-2 rounded-full py-1 pl-4 pr-1" style={{ backgroundColor: C.bg, border: `1px solid ${C.line}` }}>
        <input value={wish} onChange={(e) => setWish(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.currentTarget.blur(); ask(); } }} placeholder="Dis tout : « que mon frigo, ≤450 kcal, max protéines »" className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none" style={{ color: C.ink }} />
        <button onClick={ask} disabled={busy} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full active:scale-95 disabled:opacity-60" style={{ background: `linear-gradient(150deg, ${C.protein}, ${C.accent})`, color: "#fff" }} aria-label="Demander à l'assistant">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
        </button>
      </div>
      <p className="mt-1.5 px-1 text-[10px]" style={{ color: C.muted }}>Les chips filtrent <b style={{ color: C.sub }}>tes recettes</b> en direct ; <b style={{ color: C.accent }}>✨</b> demande de nouvelles idées à l'assistant.</p>
    </>
  );

  return (
    <Sheet open onClose={onClose} title="Une idée de repas" subtitle={`Pour le ${SLOT_LABELS[slot] || "repas"}`} icon={<Sparkles size={18} />} iconColor={C.green} footer={composer}>
      {/* Accroche conversationnelle */}
      <div className="flex items-start gap-2 pb-3">
        <div className="rounded-2xl rounded-bl-md px-3.5 py-2.5 text-sm leading-relaxed" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }}>
          {indulge
            ? <>Mode plaisir : tu pioches dans <b style={{ color: C.protein }}>{Math.round(Math.max(0, budK))} kcal · {Math.round(Math.max(0, budP))} g</b> du jour — je rééquilibrerai tes repas à venir. Envie de quoi ?</>
            : <>Pour ton {SLOT_LABELS[slot] || "repas"}, il te reste <b style={{ color: budK <= 0 ? C.over : C.protein }}>{Math.round(Math.max(0, budK))} kcal · {Math.round(Math.max(0, budP))} g</b>. Envie de quoi ?</>}
        </div>
      </div>

      {/* Cuisinable maintenant (direction F) : le frigo mène — tes recettes réalisables en tête,
          + « autres idées » qui lance l'assistant avec ce qui périme. */}
      {cookable.length > 0 && !results && !busy && (
        <div className="mb-2 rounded-2xl p-3" style={{ backgroundColor: `${C.weight}10`, border: `1px solid ${C.weight}33` }}>
          <div className="mb-2 flex items-center gap-1.5">
            <Refrigerator size={13} style={{ color: C.weight }} />
            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: C.weight }}>Cuisinable maintenant · {cookable.length}</span>
            <button onClick={() => ask({ useSoon: expiring })} disabled={busy} className="ml-auto flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold text-white active:scale-95 disabled:opacity-50" style={{ background: `linear-gradient(150deg, ${C.green}, ${C.weight})` }}><Sparkles size={11} /> Autres idées</button>
          </div>
          <div className="space-y-1.5">
            {cookable.map((m, i) => <MealCard key={`c-${i}`} meal={m} compact onLog={(cust) => { onLog?.(cust, slot); onClose(); }} />)}
          </div>
        </div>
      )}

      {/* Consignes actives (épinglées du bilan / Réglages) — repliées par défaut : une ligne discrète qui rassure sans manger l'écran. */}
      {directives.length > 0 && (
        <div className="mb-2 rounded-2xl px-3 py-2" style={{ backgroundColor: `${C.accent}10`, border: `1px solid ${C.accent}33` }}>
          <button onClick={() => setDirOpen((o) => !o)} className="flex w-full items-center gap-1.5 active:opacity-70">
            <Pin size={12} style={{ color: C.accent }} />
            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: C.accent }}>{directives.length} consigne{directives.length > 1 ? "s" : ""} · prise{directives.length > 1 ? "s" : ""} en compte</span>
            <ChevronDown size={13} style={{ color: C.accent, marginLeft: "auto", transform: dirOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
          </button>
          {dirOpen && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {directives.map((d) => (
                <span key={d.id} className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }}>
                  {d.text}
                  {onRemoveDirective && <button onClick={() => onRemoveDirective(d.id)} className="shrink-0 active:scale-90" style={{ color: C.muted }} aria-label="Retirer la consigne"><X size={12} /></button>}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions-first (R3) : 4 cartes qui lancent l'assistant direct */}
      <div className="mb-2 grid grid-cols-2 gap-2">
        <ActionCard e="🧊" t="Avec mon frigo" d={expiring.length ? "que ce que j'ai · finis ce qui périme" : "uniquement ce que j'ai"} c={C.green} onClick={() => ask({ fridgeStrict: true, useSoon: expiring })} />
        <ActionCard e="🍰" t="Un truc sucré" d="dessert / goûter" c={C.accent} onClick={() => ask({ sweet: true })} />
        <ActionCard e="⚡" t="Rapide" d="sans cuisson" c={C.weight} onClick={() => ask({ noCook: true })} />
        <ActionCard e="🎲" t="Surprends-moi" d="varie mes habitudes" c={C.protein} onClick={() => ask({ wishText: "surprends-moi, quelque chose qui change franchement de mes habitudes" })} />
      </div>
      {/* Modificateurs discrets + accès frigo */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <Tog on={indulge} onClick={() => setIndulge((v) => !v)}>😋 Plaisir</Tog>
        <Tog on={chips.has("resto")} onClick={() => toggleChip("resto")}>🍽️ Au resto</Tog>
        {!chips.has("resto") && <Tog on={fridgeStrict} onClick={() => setFridgeStrict((v) => !v)}>🔒 Frigo strict</Tog>}
        <button onClick={() => setPantryOpen(true)} className="ml-auto flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }}><Refrigerator size={13} /> Frigo{dispoN ? ` · ${dispoN}` : ""}</button>
      </div>

      {/* Tes recettes, filtrées en direct — compactes, repliables, TOUJOURS visibles (filet de secours) */}
      {localFiltered.length > 0 ? (
        <div className="space-y-1.5">
          <button onClick={() => setLocalCollapsed((c) => !c)} className="flex w-full items-center gap-1.5 active:opacity-70">
            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: C.muted }}>Dans tes recettes{chips.size || excludeTerms.length ? " · filtrées" : ""} · {localFiltered.length}</span>
            <ChevronDown size={13} style={{ color: C.muted, marginLeft: "auto", transform: localCollapsed ? "none" : "rotate(180deg)", transition: "transform .2s" }} />
          </button>
          {/* Idées locales = déjà dans tes recettes → carte compacte, pas de bouton « Cuisine » (pas de doublon). */}
          {!localCollapsed && localFiltered.map((m, i) => <MealCard key={`l-${i}`} meal={m} compact onLog={(cust) => { onLog?.(cust, slot); onClose(); }} />)}
        </div>
      ) : (!results && !busy && (
        <p className="rounded-2xl px-3 py-5 text-center text-xs" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.muted }}>
          {chips.has("resto") ? "Au resto — appuie sur ✨ pour des idées adaptées." : excludeTerms.length || chips.size ? "Aucune de tes recettes ne colle — appuie sur ✨, l'assistant cherche." : "Coche une envie, ou demande à l'assistant avec ✨."}
        </p>
      ))}

      {/* Zone assistant — SOUS les recettes : loading / erreur / résultats (les recettes restent le filet) */}
      {busy && !results && (
        <div className="mt-3 flex items-center justify-center gap-2 rounded-2xl px-3 py-4 text-sm" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }}>
          <Loader2 size={16} className="animate-spin" style={{ color: C.accent }} /> {thinking}
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

      {results && (
        <div className="mt-3 space-y-2 pb-2">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest" style={{ color: C.accent }}><Sparkles size={12} /> Idées de l'assistant</p>
          {results.length === 0 && (
            <p className="rounded-2xl px-3 py-4 text-center text-xs" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.muted }}>Aucune idée conforme à tes règles cette fois — régénère pour d'autres options.</p>
          )}
          {results.map((m, i) => <MealCard key={`r-${m.title}-${i}`} meal={m} onLog={(cust) => { onLog?.(cust, slot); onClose(); }} onSave={(cust) => save(cust, `r${i}`)} saved={savedKeys.has(`r${i}`)} />)}
          <button onClick={ask} disabled={busy} className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-bold active:scale-95" style={{ backgroundColor: "transparent", color: C.green, border: `1.5px solid ${C.green}` }}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} {busy ? thinking : "Régénérer"}
          </button>
        </div>
      )}

      {pantryOpen && <PantrySheet pantry={pantry} onAdd={onAddPantry} onToggle={onTogglePantry} onUpdate={onUpdatePantry} onRemove={onRemovePantry} onClose={() => setPantryOpen(false)} />}
    </Sheet>
  );
}
