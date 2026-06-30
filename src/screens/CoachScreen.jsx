import React from "react";
import { Sprout, Leaf, Beef, Flame, TrendingDown, Salad, MessageCircle, ChevronRight, CalendarRange, Bell, Target } from "lucide-react";
import {
  C, cardStyle, TODAY, fmtFull, r0, weekStats, coachSignals, coachGreeting, seasonalProduce, observedTrend, smoothedWeight,
} from "../core.js";
import { SectionTitle } from "../components/ui.jsx";

// ════════════════════════════════════════════════════════════════════════════
//  ÉCRAN COACH (onglet) — surfaces E + C du design validé
//  Une porte d'entrée qui EST un coach : accueil proactif + progression + saison
//  + protéines sans poudre + anti-routine + programme de la semaine + aperçu push.
//  Ton = compagnon bienveillant. Toute l'intelligence vient de core.js (coachSignals).
// ════════════════════════════════════════════════════════════════════════════

const fr = (n) => String(n).replace(".", ",");
const TONE = { alert: "over", nudge: "protein", reassure: "weight", win: "green", info: "warn" };
const ICON = { protein: Beef, kcal: Flame, week: TrendingDown, variety: Salad, season: Leaf };

const CoachHead = ({ size = 44 }) => (
  <span className="flex shrink-0 items-center justify-center rounded-full" style={{ width: size, height: size, background: `linear-gradient(140deg, ${C.green}, ${C.weight})`, color: "#0c0a08" }}><Sprout size={Math.round(size * 0.52)} /></span>
);

function Bar({ pct, color = C.green, h = 9 }) {
  return (
    <div className="w-full overflow-hidden rounded-full" style={{ height: h, backgroundColor: C.track }}>
      <div style={{ width: `${Math.min(100, Math.max(0, pct))}%`, height: "100%", backgroundColor: color, borderRadius: 999 }} />
    </div>
  );
}

const MiniStat = ({ icon, color, label, value, sub }) => (
  <div className="rounded-2xl p-3 text-center cm-card" style={cardStyle()}>
    <span className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}1f`, color }}>{icon}</span>
    <p className="text-base font-bold leading-none tabular-nums" style={{ color: C.ink }}>{value}</p>
    <p className="mt-1 text-[10px] font-medium" style={{ color: C.muted }}>{label} · {sub}</p>
  </div>
);

// Carte « signal » du coach (interpellation priorisée, consciente de l'heure).
function SignalCard({ s, onCoachPrompt }) {
  const color = C[TONE[s.tone] || "green"] || C.green;
  const Icon = ICON[s.kind] || Sprout;
  return (
    <div className="rounded-2xl p-3.5 cm-card" style={{ backgroundColor: `${color}14`, border: `1px solid ${color}33` }}>
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 shrink-0" style={{ color }}><Icon size={16} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold" style={{ color: C.ink }}>{s.title}</p>
          <p className="mt-0.5 text-[12.5px] leading-snug" style={{ color: C.sub }}>{s.text}</p>
          {s.chip && (
            <button onClick={() => onCoachPrompt(s.chip.prompt)} className="mt-2 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold active:scale-95" style={{ backgroundColor: color, color: "#0c0a08" }}>{s.chip.label} <ChevronRight size={13} /></button>
          )}
        </div>
      </div>
    </div>
  );
}

const DOT = { ok: C.green, over: C.warn, today: C.weight };
function DayDot({ letter, status }) {
  const c = DOT[status];
  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold"
      style={status === "today"
        ? { border: `2px solid ${C.weight}`, color: C.weight }
        : status === "todo"
          ? { border: `1px solid ${C.line}`, color: C.muted }
          : { backgroundColor: `${c}26`, border: `1px solid ${c}66`, color: c }}>
      {letter}
    </div>
  );
}

const NotifCard = ({ time, body }) => (
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

export function CoachScreen({ days = {}, weights = {}, settings = {}, onCoachPrompt, onOpenChat, onGoWeek, onReview }) {
  const cs = coachSignals({ days, weights, settings, refISO: TODAY });
  const greeting = coachGreeting(cs.hour);
  const wc = cs.week;
  const season = cs.season || seasonalProduce(TODAY);
  const trend = observedTrend(days, weights, TODAY);
  const sw = smoothedWeight(weights, TODAY, { min: 1 });
  const wstats = weekStats(days, settings, TODAY, 7);
  const { pDone, pT } = cs.today;
  const protPct = pT ? (pDone / pT) * 100 : 0;

  // Hiérarchie d'affichage des signaux : alerte → nudge → réassurance → win → info.
  const rank = { alert: 0, nudge: 1, reassure: 2, win: 3, info: 4 };
  const sorted = cs.signals.slice().sort((a, b) => (rank[a.tone] ?? 5) - (rank[b.tone] ?? 5));
  const lead = wc?.detail || "Je suis là pour t'aider à viser juste — sans te prendre la tête.";

  // Programme de la semaine (C) : focus composé + 7 pastilles d'adhésion + bilan doux.
  const overused = sorted.find((s) => s.kind === "variety");
  const protLate = sorted.find((s) => s.id === "prot-late");
  const focus = overused ? "Varier les protéines végétales & tenir le déficit en douceur"
    : protLate ? "Soigner les protéines chaque jour, sans forcer la poudre"
      : wc?.tone === "behind" ? "Revenir tranquillement dans ton plan cette semaine"
        : "Tenir le cap en douceur — la régularité, pas la perfection";
  const dayStatus = (d) => d.today ? "today" : !d.logged ? "todo" : (d.delta >= 0 ? "ok" : "over");
  const wd = (iso) => new Date(iso).toLocaleDateString("fr-FR", { weekday: "narrow" }).toUpperCase();
  const daysUnder = wstats.perDay.filter((d) => d.logged && !d.today && d.delta >= 0).length;
  const daysLogged = wstats.perDay.filter((d) => d.logged && !d.today).length;

  return (
    <div className="space-y-5">
      {/* HÉRO — accueil proactif (E) */}
      <div className="rounded-3xl p-4 cm-card" style={cardStyle({ background: `linear-gradient(160deg, ${C.green}26, ${C.weight}12)` })}>
        <div className="flex items-center gap-3">
          <CoachHead />
          <div className="min-w-0">
            <p className="text-base font-bold leading-tight" style={{ color: C.ink }}>{greeting}</p>
            <p className="mt-0.5 text-[12px] capitalize" style={{ color: C.sub }}>{fmtFull(TODAY)}</p>
          </div>
        </div>
        <p className="mt-3 text-[13px] leading-snug" style={{ color: C.ink }}>{lead}</p>
      </div>

      {/* PROGRESSION (E) */}
      <div className="grid grid-cols-3 gap-2.5">
        <MiniStat icon={<TrendingDown size={15} />} color={C.green} label="Poids" value={sw ? fr(sw.kg) : "—"} sub={trend ? `${fr(trend.ratePerWeek)} kg/sem` : "à suivre"} />
        <MiniStat icon={<Flame size={15} />} color={C.protein} label="Maint." value={trend ? r0(trend.maintenance) : "—"} sub={trend ? "kcal/j réel" : "à estimer"} />
        <MiniStat icon={<CalendarRange size={15} />} color={C.weight} label="Régul." value={`${daysLogged}/7`} sub="jours loggés" />
      </div>

      {/* SIGNAUX DU JOUR — interpellations proactives, conscientes de l'heure */}
      {sorted.length > 0 && (
        <div>
          <SectionTitle>Aujourd'hui</SectionTitle>
          <div className="space-y-2.5">
            {sorted.slice(0, 4).map((s) => <SignalCard key={s.id} s={s} onCoachPrompt={onCoachPrompt} />)}
          </div>
        </div>
      )}

      {/* PROGRAMME DE LA SEMAINE (C) */}
      <div>
        <SectionTitle right={onGoWeek && <button onClick={onGoWeek} className="flex items-center gap-1 text-xs font-semibold active:scale-95" style={{ color: C.green }}>Historique <ChevronRight size={13} /></button>}>Ta semaine</SectionTitle>
        <div className="space-y-3">
          <div className="rounded-2xl p-4 cm-card" style={cardStyle({ borderTop: `1px solid ${C.green}66` })}>
            <div className="flex items-center gap-2"><Target size={15} color={C.green} /><span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: C.green }}>Focus de la semaine</span></div>
            <p className="mt-1.5 text-sm leading-snug" style={{ color: C.ink }}>{focus}.</p>
          </div>
          <div className="rounded-2xl p-4 cm-card" style={cardStyle()}>
            <div className="flex justify-between">
              {wstats.perDay.map((d) => <DayDot key={d.iso} letter={wd(d.iso)} status={dayStatus(d)} />)}
            </div>
            <p className="mt-3 text-[12.5px] leading-snug" style={{ color: C.sub }}>
              {daysLogged ? <><b style={{ color: C.ink }}>{daysUnder}/{daysLogged} jours</b> dans ta cible cette semaine. </> : "Logue tes journées et je suis ta progression ici. "}
              {wc?.headline && <span style={{ color: C.green }}>{wc.headline}.</span>}
            </p>
            {onReview && (
              <button onClick={onReview} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-[13px] font-semibold active:scale-95" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink }}>
                <Sprout size={14} style={{ color: C.green }} /> Mon bilan de la semaine
              </button>
            )}
          </div>
        </div>
      </div>

      {/* PROTÉINES SANS POUDRE (E) */}
      <div>
        <SectionTitle>Protéines, sans forcer la poudre</SectionTitle>
        <div className="rounded-2xl p-4 cm-card" style={cardStyle()}>
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm font-bold" style={{ color: C.ink }}><Beef size={15} color={C.green} /> Aujourd'hui</span>
            <span className="text-sm font-bold tabular-nums" style={{ color: C.ink }}>{r0(pDone)} <span className="text-xs font-medium" style={{ color: C.muted }}>/ {r0(pT)} g</span></span>
          </div>
          <Bar pct={protPct} />
          <p className="mt-2 text-[12.5px] leading-snug" style={{ color: C.sub }}>{pT - pDone > 5 ? `Il te reste ${r0(pT - pDone)} g. Lentilles, œufs, tofu, fromage blanc, edamame… on y arrive sans shaker.` : "Bel équilibre — protéines au rendez-vous, et pas que via la poudre 💪"}</p>
          <button onClick={() => onCoachPrompt("Comment atteindre ma cible de protéines aujourd'hui avec de VRAIS aliments (pas de poudre), de saison si possible ?")} className="mt-2.5 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95" style={{ backgroundColor: `${C.green}1f`, color: C.green, border: `1px solid ${C.green}40` }}>Mon plan du jour <ChevronRight size={13} /></button>
        </div>
      </div>

      {/* SAISON (E) */}
      <div>
        <SectionTitle>De saison</SectionTitle>
        <button onClick={() => onCoachPrompt(`Propose-moi une idée de repas qui met en avant les produits de saison, végétarienne, protéinée et sans poudre.`)} className="block w-full rounded-2xl p-4 text-left cm-card active:scale-[0.99]" style={cardStyle({ borderTop: `1px solid ${C.warn}55` })}>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: C.warn }}><Leaf size={13} /> Pleine saison · {season.label}</span>
            <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: C.green }}>Une idée <ChevronRight size={13} /></span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {season.all.slice(0, 8).map((x) => <span key={x} className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.sub }}>{x}</span>)}
          </div>
        </button>
      </div>

      {/* APERÇU PUSH (E) — arrive en étape 2 (annoncé honnêtement) */}
      <div>
        <SectionTitle right={<span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase" style={{ backgroundColor: `${C.weight}1f`, color: C.weight }}>Bientôt</span>}>Ton coach te relancera</SectionTitle>
        <div className="space-y-2">
          <NotifCard time="8:05" body="Pressé ce matin ? 2 œufs durs + une poignée d'amandes dans la voiture = 20 g, sans shaker 🥚" />
          <NotifCard time="19:00" body="Il te reste des protéines à caler. Un dahl de lentilles + 2 œufs closent ta journée — je te sors la recette ?" />
          <p className="px-1 pt-0.5 text-[11px]" style={{ color: C.muted }}>Les rappels intelligents (matin, soir, plateau détecté) arrivent dans une prochaine mise à jour.</p>
        </div>
      </div>

      {/* CTA — parler au coach */}
      <button onClick={onOpenChat} className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold active:scale-95" style={{ background: `linear-gradient(140deg, ${C.green}, ${C.weight})`, color: "#0c0a08" }}>
        <MessageCircle size={17} /> Parler à mon coach
      </button>
    </div>
  );
}
