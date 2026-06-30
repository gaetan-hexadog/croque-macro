import React, { useState, useEffect } from "react";
import {
  Sprout, Leaf, Beef, Flame, TrendingDown, Salad, Sparkles, MessageCircle,
  Send, Target, Dumbbell, Sun, Moon, ChevronRight, Egg,
} from "lucide-react";
import { C, cardStyle, applyTheme } from "../../src/core.js";
import { SectionTitle } from "../../src/components/ui.jsx";

// ════════════════════════════════════════════════════════════════════════════
// COACHING LAB — Croque·Macro  (route : ?coaching_lab)
// Lab PARALLÈLE et indépendant du lab « Réglages » (?design_lab). Ne touche pas
// à DesignLab.jsx ni à sa route.
//
// Objectif : rendre l'app + l'assistant « coaching » plutôt que « log brut ».
// 5 variantes = 5 MODÈLES DE COACHING distincts (pas 5 cosmétiques d'une carte).
// Cadre validé avec Bob :
//   • Ton = COMPAGNON BIENVEILLANT (suggère/encourage, ne donne pas d'ordres)
//   • Proactivité = briefing à l'ouverture + NOTIFICATIONS PUSH
//   • Focus (tous) = repas de saison · protéines SANS shakes · progression · anti-routine
// Données fictives réalistes (profil Bob, 30 juin → pleine saison d'été France).
// Langage visuel = vrais tokens C + cardStyle() + SectionTitle.
// ════════════════════════════════════════════════════════════════════════════

const FIX = {
  name: "Bob",
  dateLabel: "lundi 30 juin",
  kcalTarget: 1950, kcalDone: 1320,           // reste 630
  protTarget: 175, protDone: 118,             // reste 57
  weightNow: 89.8, weightDelta3w: -1.2, ratePerWeek: -0.4,
  daysUnder: 5, avgProt: 162, sessions: 2, deficit: 380,
  overused: "tofu", overusedCount: 4,
  season: ["🥒 Courgette", "🍑 Abricot", "🌿 Basilic", "🫛 Haricot vert", "🍅 Tomate", "🍑 Pêche"],
};
const PROT_LEFT = FIX.protTarget - FIX.protDone; // 57
const PROT_PCT = (FIX.protDone / FIX.protTarget) * 100;

// ─── primitives partagées ────────────────────────────────────────────────────

// identité visuelle du coach : pastille « pousse » (croissance / saison / vivant)
const CoachHead = ({ size = 36 }) => (
  <div className="flex shrink-0 items-center justify-center rounded-full"
    style={{ width: size, height: size, background: `linear-gradient(140deg, ${C.green}, ${C.weight})`, color: "#0c0a08" }}>
    <Sprout size={Math.round(size * 0.52)} />
  </div>
);

const Chip = ({ children, tone = C.green }) => (
  <button className="rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95"
    style={{ backgroundColor: `${tone}1f`, color: tone, border: `1px solid ${tone}40` }}>{children}</button>
);

function Bar({ pct, color = C.green, h = 9 }) {
  return (
    <div className="w-full overflow-hidden rounded-full" style={{ height: h, backgroundColor: C.track }}>
      <div style={{ width: `${Math.min(100, pct)}%`, height: "100%", backgroundColor: color, borderRadius: 999 }} />
    </div>
  );
}

// ligne de conseil « doux » : icône colorée · texte · petite action
function SuggestRow({ icon, tone, text, cta }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl p-2.5" style={{ backgroundColor: `${tone}14`, border: `1px solid ${tone}33` }}>
      <span className="mt-0.5 shrink-0" style={{ color: tone }}>{icon}</span>
      <p className="flex-1 text-[12.5px] leading-snug" style={{ color: C.ink }}>{text}</p>
      {cta && <button className="shrink-0 self-center rounded-lg px-2.5 py-1 text-xs font-bold active:scale-95" style={{ backgroundColor: tone, color: "#0c0a08" }}>{cta}</button>}
    </div>
  );
}

// carte « pleine saison » (réutilisée par C et E)
function SeasonCard({ compact }) {
  return (
    <div className="rounded-2xl p-4" style={cardStyle({ borderTop: `1px solid ${C.warn}55` })}>
      <div className="flex items-center gap-2"><Leaf size={15} color={C.warn} /><span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: C.warn }}>Pleine saison · fin juin</span></div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {FIX.season.map((x) => <span key={x} className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.sub }}>{x}</span>)}
      </div>
      {!compact && <p className="mt-2.5 text-[12.5px] leading-snug" style={{ color: C.sub }}>Meilleurs au goût, moins chers, et ça varie. <span style={{ color: C.ink }}>Un tian courgette-tomate + œufs ce midi ?</span></p>}
    </div>
  );
}

// notification push (maquette type écran verrouillé)
function NotifCard({ time, body }) {
  return (
    <div className="flex items-start gap-2.5 rounded-2xl p-3" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}` }}>
      <CoachHead size={30} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold" style={{ color: C.ink }}>Ton coach · Croque</span>
          <span className="text-[10px]" style={{ color: C.muted }}>{time}</span>
        </div>
        <p className="mt-0.5 text-xs leading-snug" style={{ color: C.sub }}>{body}</p>
      </div>
    </div>
  );
}

const MiniStat = ({ icon, color, label, value, sub }) => (
  <div className="rounded-2xl p-3 text-center" style={cardStyle()}>
    <span className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}1f`, color }}>{icon}</span>
    <p className="text-base font-bold tabular-nums leading-none" style={{ color: C.ink }}>{value}</p>
    <p className="mt-0.5 text-[10px] font-medium" style={{ color: C.muted }}>{label} · {sub}</p>
  </div>
);

const FoodLine = ({ name, g }) => (
  <div className="flex items-center justify-between text-[12.5px]">
    <span style={{ color: C.sub }}>{name}</span>
    <span className="font-bold tabular-nums" style={{ color: C.green }}>+{g} g</span>
  </div>
);

// ─── Variante A : COACH DU JOUR (encart en haut de l'écran Jour) ──────────────
// Axe : hiérarchie. Une SEULE voix chaleureuse remplace les nudges éparpillés.
function VariantA() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-4" style={cardStyle({ borderTop: `1px solid ${C.green}66` })}>
        <div className="flex items-start gap-3">
          <CoachHead />
          <div className="flex-1">
            <p className="text-sm font-bold" style={{ color: C.ink }}>Salut Bob 👋</p>
            <p className="mt-0.5 text-[13px] leading-snug" style={{ color: C.sub }}>Belle régularité — 5 jours sur 7 sous ta cible cette semaine. On continue comme ça.</p>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          <SuggestRow icon={<Beef size={15} />} tone={C.green} cta="L'idée"
            text={<>Il te reste <b>57 g de protéines</b>. Plutôt qu'un shaker, un <b>dahl de lentilles + 2 œufs</b> ce soir t'y amène tranquille.</>} />
          <SuggestRow icon={<Leaf size={15} />} tone={C.warn} cta="Voir"
            text={<>🌿 Pleine saison : <b>courgette, abricot, basilic</b>. Envie d'un déjeuner qui les met en avant ?</>} />
        </div>
        <button className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-[13px] font-semibold active:scale-95" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink }}>
          <MessageCircle size={15} style={{ color: C.green }} /> Parler à mon coach
        </button>
      </div>

      {/* contexte écran Jour, atténué — pour montrer où l'encart se pose */}
      <div className="space-y-3" style={{ opacity: 0.45 }}>
        <SectionTitle>Aujourd'hui</SectionTitle>
        <div className="flex items-center gap-4 rounded-2xl p-4" style={cardStyle()}>
          <div className="h-16 w-16 rounded-full" style={{ border: `7px solid ${C.track}`, borderTopColor: C.protein, borderRightColor: C.protein }} />
          <div className="flex-1 space-y-2">
            <div><div className="mb-1 flex justify-between text-[11px]" style={{ color: C.muted }}><span>kcal</span><span>1320 / 1950</span></div><Bar pct={68} color={C.protein} h={7} /></div>
            <div><div className="mb-1 flex justify-between text-[11px]" style={{ color: C.muted }}><span>protéines</span><span>118 / 175</span></div><Bar pct={PROT_PCT} h={7} /></div>
          </div>
        </div>
        <div className="rounded-2xl p-3" style={cardStyle()}><span className="text-[13px]" style={{ color: C.sub }}>🍳 Petit-déj · 🥗 Déjeuner · 🌙 Dîner…</span></div>
      </div>
    </div>
  );
}

// ─── Variante B : ASSISTANT PROACTIF (la conversation s'ouvre d'elle-même) ────
// Axe : interaction. Le coach INITIE, se souvient, propose — répond à
// « il ne fait que ce que je demande ».
const CoachBubble = ({ children }) => (
  <div className="flex items-end gap-2">
    <CoachHead size={26} />
    <div className="max-w-[84%] rounded-2xl rounded-bl-md px-3.5 py-2.5 text-[13px] leading-snug" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink }}>{children}</div>
  </div>
);
function VariantB() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5 pb-2" style={{ borderBottom: `1px solid ${C.line}` }}>
        <CoachHead size={34} />
        <div><p className="text-sm font-bold leading-none" style={{ color: C.ink }}>Ton coach</p><p className="mt-1 text-[11px] font-medium" style={{ color: C.green }}>● te connaît · a lu ta semaine</p></div>
      </div>

      <p className="text-center text-[10px]" style={{ color: C.muted }}>↩ Continuité d'hier · tu voulais plus de légumes verts 🥬</p>

      <CoachBubble>Salut Bob 👋 J'ai regardé ta semaine : déficit tenu, poids qui descend doucement (<b>−1,2 kg en 3 sem</b>). Beau boulot 💪</CoachBubble>
      <CoachBubble>Deux idées si tu veux : tu tournes pas mal autour du <b>tofu</b> (4× en 10 j) — on varie&nbsp;? Et il te reste <b>57 g de protéines</b> aujourd'hui, tout à fait faisables sans shaker.</CoachBubble>

      {/* réponses proposées PAR le coach */}
      <div className="flex flex-wrap gap-2 pl-9">
        <Chip>Une idée sans tofu</Chip>
        <Chip>Finir mes protéines sans poudre</Chip>
        <Chip tone={C.weight}>Mon bilan poids</Chip>
        <Chip tone={C.muted}>Plus tard</Chip>
      </div>

      <div className="mt-1 flex items-center gap-2 pt-2" style={{ borderTop: `1px solid ${C.line}` }}>
        <div className="flex-1 rounded-full px-3.5 py-2.5 text-[13px]" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.muted }}>Réponds à ton coach…</div>
        <button className="flex h-9 w-9 items-center justify-center rounded-full active:scale-95" style={{ backgroundColor: C.green }}><Send size={16} color="#0c0a08" /></button>
      </div>
    </div>
  );
}

// ─── Variante C : PROGRAMME DE LA SEMAINE (parcours coaché) ───────────────────
// Axe : structure/layout. La semaine = un cap + une adhésion suivie en douceur.
const DOT = { ok: C.green, over: C.warn, today: C.weight, todo: C.line };
const DayDot = ({ d, s }) => (
  <div className="flex flex-col items-center gap-1.5">
    <div className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold"
      style={s === "today"
        ? { border: `2px solid ${C.weight}`, color: C.weight }
        : { backgroundColor: s === "todo" ? "transparent" : `${DOT[s]}26`, border: `1px solid ${s === "todo" ? C.line : DOT[s] + "66"}`, color: s === "todo" ? C.muted : DOT[s] }}>
      {d}
    </div>
  </div>
);
function VariantC() {
  const days = [["L", "ok"], ["M", "ok"], ["M", "over"], ["J", "ok"], ["V", "ok"], ["S", "today"], ["D", "todo"]];
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: C.muted }}>Ta semaine avec ton coach</p>
        <p className="text-lg font-bold" style={{ color: C.ink }}>23 – 29 juin</p>
      </div>

      <div className="rounded-2xl p-4" style={cardStyle({ borderTop: `1px solid ${C.green}66` })}>
        <div className="flex items-center gap-2"><Target size={15} color={C.green} /><span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: C.green }}>Focus de la semaine</span></div>
        <p className="mt-1.5 text-sm leading-snug" style={{ color: C.ink }}>Varier les protéines végétales & tenir le déficit en douceur. <span style={{ color: C.sub }}>Pas de perfection visée — juste le cap.</span></p>
      </div>

      <div className="rounded-2xl p-4" style={cardStyle()}>
        <div className="flex justify-between">{days.map(([d, s], i) => <DayDot key={i} d={d} s={s} />)}</div>
        <p className="mt-3 text-[12.5px] leading-snug" style={{ color: C.sub }}><b style={{ color: C.ink }}>5/7 jours</b> sous ta cible · <b style={{ color: C.ink }}>162 g</b> de protéines en moyenne · 2 séances. <span style={{ color: C.green }}>Tu es sur la bonne voie 🙂</span></p>
      </div>

      <SeasonCard />

      <SuggestRow icon={<Sparkles size={15} />} tone={C.weight} cta="OK"
        text={<>Prochaine étape : ce week-end, un <b>batch de pois chiches rôtis</b> te donne une protéine prête pour 3 jours, sans poudre.</>} />
    </div>
  );
}

// ─── Variante D : COACHING CONTEXTUEL (le conseil au moment où tu logges) ─────
// Axe : interaction. Le coaching s'infiltre dans l'acte de logguer.
function VariantD() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-4" style={cardStyle()}>
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm font-bold" style={{ color: C.ink }}><Beef size={15} color={C.green} /> Protéines du jour</span>
          <span className="text-sm font-bold tabular-nums" style={{ color: C.ink }}>118 <span className="text-xs font-medium" style={{ color: C.muted }}>/ 175 g</span></span>
        </div>
        <Bar pct={PROT_PCT} />
        <p className="mt-2.5 text-[12.5px] leading-snug" style={{ color: C.sub }}>Tu viens de logger le déjeuner 🥗 <b style={{ color: C.green }}>+34 g</b>. Reste <b style={{ color: C.ink }}>57 g</b> — voici comment finir <b style={{ color: C.ink }}>sans poudre</b> :</p>
        <div className="mt-2.5 space-y-1.5">
          <FoodLine name="Dahl de lentilles corail" g={18} />
          <FoodLine name="2 œufs pochés" g={13} />
          <FoodLine name="Fromage blanc (150 g)" g={15} />
          <FoodLine name="Edamame (une poignée)" g={11} />
        </div>
        <div className="mt-2.5 flex items-center justify-between rounded-xl px-3 py-2" style={{ backgroundColor: `${C.green}1f` }}>
          <span className="text-xs font-semibold" style={{ color: C.green }}>Total ce soir</span><span className="text-sm font-bold" style={{ color: C.green }}>+57 g → 175 g 🎯</span>
        </div>
      </div>

      <div>
        <SectionTitle>Ce soir</SectionTitle>
        <div className="rounded-2xl p-3.5" style={cardStyle()}>
          <p className="text-[12px]" style={{ color: C.muted }}>De saison en ce moment — à glisser au dîner :</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Chip tone={C.warn}>🥒 Courgette</Chip><Chip tone={C.over}>🍅 Tomate</Chip><Chip tone={C.green}>🫛 Haricot vert</Chip><Chip tone={C.extra}>🌿 Basilic</Chip>
          </div>
          <button className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13px] font-bold active:scale-95" style={{ backgroundColor: C.green, color: "#0c0a08" }}>
            <Sprout size={15} /> Composer mon dîner de saison
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Variante E : ONGLET COACH (une porte d'entrée qui EST un coach) ──────────
// Axe : expressif. L'app prend une voix : progression + saison + protéines + push.
function VariantE() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-4" style={cardStyle({ background: `linear-gradient(160deg, ${C.green}26, ${C.weight}12)` })}>
        <div className="flex items-center gap-3">
          <CoachHead size={44} />
          <div>
            <p className="text-base font-bold leading-none" style={{ color: C.ink }}>Salut Bob ☀️</p>
            <p className="mt-1.5 text-[12px]" style={{ color: C.sub }}>{FIX.dateLabel} · ton coach a regardé ta semaine</p>
          </div>
        </div>
        <p className="mt-3 text-[13px] leading-snug" style={{ color: C.ink }}>Tu descends doucement (−1,2 kg en 3 sem) et tu tiens bien le déficit. Aujourd'hui on soigne juste les protéines — et on profite de la saison 🌿</p>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <MiniStat icon={<TrendingDown size={15} />} color={C.green} label="Poids" value="89,8" sub="−1,2 kg" />
        <MiniStat icon={<Flame size={15} />} color={C.protein} label="Déficit" value="−380" sub="kcal/j" />
        <MiniStat icon={<Dumbbell size={15} />} color={C.weight} label="Séances" value="2" sub="/ sem" />
      </div>

      <div className="rounded-2xl p-4" style={cardStyle()}>
        <span className="flex items-center gap-1.5 text-sm font-bold" style={{ color: C.ink }}><Beef size={15} color={C.green} /> Protéines, sans forcer la poudre</span>
        <div className="mt-2.5"><Bar pct={PROT_PCT} /></div>
        <p className="mt-2 text-[12.5px] leading-snug" style={{ color: C.sub }}><b style={{ color: C.ink }}>118 / 175 g</b>. Un dahl + 2 œufs + un peu d'edamame ce soir, et c'est plié sans shaker.</p>
        <div className="mt-2.5"><Chip>Voir le plan du soir</Chip></div>
      </div>

      <SeasonCard compact />

      <SuggestRow icon={<Salad size={15} />} tone={C.extra} cta="Idées"
        text={<>Tu tournes autour du <b>tofu</b> ces temps-ci — on teste le <b>tempeh</b> ou des <b>pois chiches rôtis</b> ?</>} />

      <div>
        <SectionTitle>Ton coach te relance</SectionTitle>
        <div className="space-y-2">
          <NotifCard time="8:05" body="Pressé ce matin ? 2 œufs durs + une poignée d'amandes dans la voiture = 20 g, sans shaker 🥚" />
          <NotifCard time="19:00" body="Il te reste 57 g de protéines. Un dahl de lentilles + 2 œufs closent ta journée — je te sors la recette ?" />
        </div>
      </div>
    </div>
  );
}

// ─── Shell du lab ─────────────────────────────────────────────────────────────
const VARIANTS = [
  { id: "A", name: "Coach du jour", axis: "Encart compagnon en haut de l'écran Jour", why: "Consolide les nudges éparpillés en UNE voix chaleureuse. Le moins intrusif, se greffe sur l'existant.", Comp: VariantA },
  { id: "B", name: "Assistant proactif", axis: "La conversation s'ouvre d'elle-même", why: "Répond direct à « il ne fait que ce que je demande » : le coach initie, se souvient, propose des suites.", Comp: VariantB },
  { id: "C", name: "Programme de la semaine", axis: "La semaine comme un parcours coaché", why: "Donne un cap (focus de la semaine) et suit l'adhésion sans culpabiliser. Du sens au-delà du jour.", Comp: VariantC },
  { id: "D", name: "Coaching contextuel", axis: "Le conseil au moment où tu logges", why: "Le coaching s'infiltre dans l'action : chemin protéines sans poudre + saison à l'instant d'ajouter.", Comp: VariantD },
  { id: "E", name: "Onglet Coach", axis: "Une porte d'entrée qui EST un coach", why: "L'app entière prend une voix : progression + saison + protéines + aperçu des push. Le plus expressif.", Comp: VariantE },
];

function PhoneFrame({ children }) {
  return (
    <div className="mx-auto rounded-[2rem] p-2.5" style={{ width: 400, maxWidth: "100%", backgroundColor: C.sheet, border: `1px solid ${C.line}`, boxShadow: `0 24px 64px -32px ${C.shadow}` }}>
      <div className="rounded-[1.5rem] p-4" style={{ backgroundColor: C.bg, minHeight: 520, backgroundImage: C.bgImage }}>{children}</div>
    </div>
  );
}

export default function CoachingLab() {
  const [theme, setTheme] = useState("dark");
  const [, force] = useState(0);
  useEffect(() => { applyTheme(theme); force((n) => n + 1); }, [theme]);

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: C.bg, color: C.ink }}>
      <header className="sticky top-0 z-10 px-4 py-3" style={{ backgroundColor: `${C.bg}f2`, borderBottom: `1px solid ${C.line}`, backdropFilter: "blur(8px)" }}>
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div className="flex items-center gap-2"><CoachHead size={28} /><span className="text-sm font-bold">Coaching Lab</span></div>
          <div className="flex gap-1 rounded-full p-1" style={{ border: `1px solid ${C.line}` }}>
            {[["dark", Moon], ["light", Sun]].map(([v, Icon]) => (
              <button key={v} onClick={() => setTheme(v)} className="rounded-full px-3 py-1.5 active:scale-95" style={theme === v ? { backgroundColor: C.ink, color: C.paper } : { color: C.sub }} aria-label={v}><Icon size={14} /></button>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="rounded-2xl p-4" style={cardStyle()}>
          <p className="text-sm font-bold" style={{ color: C.ink }}>5 modèles de coaching à comparer</p>
          <p className="mt-1 text-[13px] leading-snug" style={{ color: C.sub }}>
            Ton <b style={{ color: C.ink }}>compagnon bienveillant</b> · proactif jusqu'aux <b style={{ color: C.ink }}>notifications push</b> · focus <b style={{ color: C.ink }}>repas de saison, protéines sans shakes, progression, anti-routine</b>.
          </p>
          <p className="mt-2 text-[12px]" style={{ color: C.muted }}>Parcours-les sur ton téléphone, puis dis-moi : quel modèle gagne, ce que tu en gardes, ce qui manque. On peut aussi fusionner.</p>
        </div>

        <div className="mt-7 space-y-9">
          {VARIANTS.map(({ id, name, axis, why, Comp }) => (
            <section key={id} data-variant={id}>
              <div className="mb-3 flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold" style={{ backgroundColor: `${C.green}1f`, color: C.green }}>{id}</span>
                <div>
                  <p className="text-base font-bold leading-tight" style={{ color: C.ink }}>{name}</p>
                  <p className="text-[12px] font-medium" style={{ color: C.green }}>{axis}</p>
                  <p className="mt-1 text-[12px] leading-snug" style={{ color: C.muted }}>{why}</p>
                </div>
              </div>
              <PhoneFrame><Comp /></PhoneFrame>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
