import React, { useState } from "react";
import { Salad, UtensilsCrossed, Plus, Check, Search, Flame, Beef, Package, Dumbbell, Cookie, Scale, ExternalLink, ScanLine, Beer, Wine, IceCream2, ChevronDown } from "lucide-react";
import {
  store, C, cardStyle,
} from "../core.js";

export function GuideScreen({ onAddExtra, dateLabel, settings }) {
  const ex = [
    ["Petit-déj", "3 œufs entiers + 250 ml lait de soja", 300, 26],
    ["Déjeuner", "Tofu ou seitan + légumes + 50 g (cru) de riz/quinoa", 450, 35],
    ["Collation", "2 doses de protéine (clear / vegan)", 150, 36],
    ["Dîner", "Carré végétal + grosse portion de légumes + un peu de fromage", 500, 25],
  ];
  const exK = ex.reduce((a, r) => a + r[2], 0);
  const exP = ex.reduce((a, r) => a + r[3], 0);
  const principes = [
    ["Protéine d'abord", "Verrouille tes protéines à chaque repas ; les glucides et lipides remplissent le reste du budget."],
    ["Volume malin", "Une grosse portion de légumes rassasie pour presque rien — l'arme anti-faim en déficit."],
    ["Étale la protéine", "~25–35 g par repas s'utilisent mieux qu'un gros bloc d'un coup."],
    ["Garde une marge", "Laisse ~200–250 kcal libres le soir pour un imprévu (fruit, carré de chocolat, un verre)."],
  ];
  const training = [
    ["Avant (1–2 h)", "Glucides + un peu de protéine pour l'énergie. Ex : banane + skyr soja, flocons d'avoine + lait de soja. Optionnel si ton dernier repas date de moins de 3 h."],
    ["Après (dans l'heure)", "20–40 g de protéine + glucides pour récupérer. Ex : ton shake Bulk + un fruit, ou tofu/seitan + riz."],
    ["À retenir", "En perte de gras, le total de la journée prime sur le timing. Créatine 3–5 g/j, peu importe l'heure. Et bois."],
  ];
  const dehors = [
    ["Vise la protéine", "Prends le plat avec une vraie source (œufs, tofu, halloumi, légumineuses) ; complète si c'est juste."],
    ["Sauces à part", "Sauce et fritures à côté, privilégie grillé/vapeur — c'est là que les calories cachées explosent."],
    ["Bois de l'eau", "Plutôt que soda ou jus : les calories liquides ne rassasient pas et s'additionnent vite."],
    ["La semaine compte, pas le repas", "Un resto qui dépasse ne casse rien si la moyenne de la semaine tient. Pas de culpabilité, on lisse."],
  ];
  const prot = [
    ["Protéine de soja texturée (sèche)", "50 g"],
    ["Fromage à pâte dure (comté, emmental)", "26 g"],
    ["Seitan", "25 g"],
    ["Tempeh", "19 g"],
    ["Tofu lactofermenté (Sojami)", "19 g"],
    ["Tofu ferme", "15 g"],
    ["Steak / escalope végétale", "15–18 g"],
    ["Edamame écossés (cuits)", "11 g"],
    ["Lentilles / pois chiches (cuits)", "9 g"],
    ["Skyr végétal soja", "6 g"],
    ["Yaourt de soja nature", "4 g"],
    ["Lait de soja", "3,5 g"],
  ];
  const portions = [
    ["Paume", "1 portion de protéine (~100–120 g de tofu, seitan, végétal)"],
    ["Poing", "1 portion de féculents cuits (riz, quinoa, pâtes)"],
    ["2 poings", "légumes — à volonté, quasi gratuit en calories"],
    ["Pouce", "1 portion de matière grasse (huile, beurre végétal)"],
    ["Poignée", "oléagineux ou fromage (~30 g)"],
  ];
  const condiments = [
    ["Quasi gratuits", C.green, "Moutarde, vinaigre, sauce soja, cornichons, épices, herbes, citron"],
    ["À surveiller", C.protein, "Ketchup (~15 kcal/c. à s., sucré), sauce tomate, sauces asiatiques sucrées"],
    ["Pièges caloriques", C.over, "Huile (~90/c. à s.), mayo (~90/c. à s.), vinaigrettes prêtes, beurre, pesto"],
  ];
  const pieges = [
    ["Calories liquides", "Jus, sodas, smoothies, lait végétal sucré, alcool : ça ne rassasie pas et ça s'additionne vite."],
    ["Le « healthy » dense", "Granola, oléagineux, avocat, houmous, beurre de cacahuète : sains mais très caloriques. Une poignée d'amandes (~30 g) ≈ 180 kcal."],
    ["Végétal ≠ light", "Un burger ou des nuggets végé ne sont pas hypocaloriques pour autant — regarde les kcal/100 g."],
    ["Féculents cuits qui gonflent", "Riz et pâtes pèsent ~2,5× plus une fois cuits. 50 g cru, c'est une vraie portion, pas une petite."],
    ["Les extras invisibles", "Ce qu'on picore en cuisinant, le pain avant le plat, la sauce du resto : ça ne se voit pas mais ça compte."],
    ["Boissons chaudes", "Latte, cappuccino, chocolat chaud = lait + sucre. Un grand latte peut faire 150–200 kcal."],
  ];
  const courses = [
    ["Protéines fraîches", "Tofu (ferme, fumé, lactofermenté), tempeh, seitan, œufs, edamame surgelés, alternatives (La Vie, HappyVore, Garden Gourmet)"],
    ["Légumineuses", "Lentilles, pois chiches, haricots rouges (secs ou en boîte)"],
    ["Végé « laitages »", "Yaourt & skyr de soja, lait de soja non sucré, fromage"],
    ["Féculents", "Riz, quinoa, flocons d'avoine, pain complet, pâtes"],
    ["Légumes", "Surgelés (épinards, brocoli, haricots verts) + frais de saison"],
    ["Extras utiles", "Protéine en poudre vegan, beurre de cacahuète, oléagineux, huile d'olive, houmous, galettes de riz"],
  ];
  const equiv = [
    ["Demi (25 cl)", "~100 kcal", "22 min"],
    ["Verre de vin", "~125 kcal", "28 min"],
    ["Poignée de chips", "~150 kcal", "33 min"],
    ["Pinte blonde", "~200 kcal", "45 min"],
    ["Cornet 2 boules", "~320 kcal", "1 h 10"],
    ["Part de gâteau", "~350 kcal", "1 h 18"],
  ];
  const go = (id) => { const el = typeof document !== "undefined" ? document.getElementById(`guide-${id}`) : null; if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); };
  const SECTIONS = [["methode", "Méthode"], ["antiseches", "Antisèches"], ["outils", "Trouver les calories"]];

  return (
    <div>
      <p className="mb-4 text-sm" style={{ color: C.sub }}>Méthode, antisèches et outils pour s'y retrouver — surtout en vacances.</p>

      <div className="mb-2 flex flex-wrap gap-1.5">
        {SECTIONS.map(([id, label]) => (
          <button key={id} onClick={() => go(id)} className="rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.sub }}>{label}</button>
        ))}
      </div>

      <SectionHead id="methode" label="Méthode" />

      <GuideBlock icon={Salad} color={C.protein} title="Construire ta journée" desc={`Une trame protéinée à adapter. Ta cible : ${settings?.kcal ?? 1850} kcal / ${settings?.protein ?? 150} g.`} defaultOpen>
        <div className="space-y-2 rounded-xl p-3" style={{ backgroundColor: C.paper }}>
          {ex.map(([slot, food, k, p]) => (
            <div key={slot} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.protein }}>{slot}</p>
                <p className="text-sm" style={{ color: C.ink }}>{food}</p>
              </div>
              <p className="shrink-0 text-right text-xs font-semibold" style={{ fontVariantNumeric: "tabular-nums", color: C.sub }}>{k} kcal<br />{p} g</p>
            </div>
          ))}
          <div className="flex justify-between border-t pt-2 text-sm" style={{ borderColor: C.line }}>
            <span style={{ color: C.sub }}>Total repas</span>
            <span className="font-bold" style={{ color: C.ink, fontVariantNumeric: "tabular-nums" }}>~{exK} kcal · {exP} g</span>
          </div>
        </div>
        <p className="px-1 pt-2 text-xs" style={{ color: C.muted }}>+ ~250 kcal de marge (un fruit, un filet d'huile, une dose de plus). Pour viser {settings?.protein ?? 150} g, monte les portions de protéine au déj/dîner ou ajoute une dose — l'écart se comble surtout côté protéines, pas calories.</p>
      </GuideBlock>

      <GuideBlock icon={Flame} color={C.green} title="Réflexes perte de gras" desc="Quatre principes qui font le plus gros du résultat.">
        <div className="space-y-2.5">
          {principes.map(([t, d]) => (
            <div key={t} className="flex gap-2.5">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: C.green }} />
              <p className="text-sm" style={{ color: C.sub }}><span className="font-semibold" style={{ color: C.ink }}>{t}.</span> {d}</p>
            </div>
          ))}
        </div>
      </GuideBlock>

      <GuideBlock icon={Dumbbell} color={C.weight} title="Autour de ta séance" desc="Muscu : quoi manger avant et après pour performer et récupérer.">
        <div className="space-y-2.5">
          {training.map(([t, d]) => (
            <div key={t} className="flex gap-2.5">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: C.weight }} />
              <p className="text-sm" style={{ color: C.sub }}><span className="font-semibold" style={{ color: C.ink }}>{t} :</span> {d}</p>
            </div>
          ))}
        </div>
      </GuideBlock>

      <GuideBlock icon={UtensilsCrossed} color={C.protein} title="Manger dehors" desc="Resto, brunch, vacances — quelques réflexes pour ne pas dérailler.">
        <div className="space-y-2.5">
          {dehors.map(([t, d]) => (
            <div key={t} className="flex gap-2.5">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: C.protein }} />
              <p className="text-sm" style={{ color: C.sub }}><span className="font-semibold" style={{ color: C.ink }}>{t}.</span> {d}</p>
            </div>
          ))}
        </div>
      </GuideBlock>

      <SectionHead id="antiseches" label="Antisèches" />

      <GuideBlock icon={ScanLine} color={C.green} title="Réflexe courses : le feu 🟢🟠🔴" desc="3 ratios sur l'étiquette (/100 g) pour trier en 5 s. Le scan de l'app (icône en haut) les calcule pour toi.">
        <div className="space-y-3">
          <div>
            <p className="mb-1 text-sm font-semibold" style={{ color: C.ink }}>1. kcal ÷ prot <span style={{ color: C.muted, fontWeight: 400 }}>· la règle reine</span></p>
            <ul className="space-y-0.5 text-sm" style={{ color: C.sub }}>
              <li>🟢 ≤ 8 excellent · 8–12 ça passe</li>
              <li>🟠 12–15 moyen, à compter</li>
              <li>🔴 &gt; 15 : ce n'est plus un aliment protéiné (gras ou sucre déguisé)</li>
            </ul>
            <p className="mt-1 text-xs" style={{ color: C.muted }}>Astuce sans diviser : « les kcal font-elles moins de 10× les prot ? » Plus de 200 kcal pour 20 g de prot → tu regardes pourquoi.</p>
          </div>
          <div>
            <p className="mb-1 text-sm font-semibold" style={{ color: C.ink }}>2. gras vs prot <span style={{ color: C.muted, fontWeight: 400 }}>· compare les 2 chiffres</span></p>
            <ul className="space-y-0.5 text-sm" style={{ color: C.sub }}>
              <li>🟢 gras ≤ moitié des prot = source maigre</li>
              <li>🟠 gras ≈ prot = mixte, ok ponctuel</li>
              <li>🔴 gras &gt; prot = aliment gras (le piège fromage, ton plus gros levier)</li>
            </ul>
          </div>
          <div>
            <p className="mb-1 text-sm font-semibold" style={{ color: C.ink }}>3. sucre vs prot</p>
            <ul className="space-y-0.5 text-sm" style={{ color: C.sub }}>
              <li>🟢 sucre ≤ prot = ok</li>
              <li>🔴 sucre &gt; prot = produit sucré (yaourts « protéinés » aromatisés, barres, tofu teriyaki trompeur)</li>
            </ul>
          </div>
          <p className="border-t pt-2 text-sm" style={{ borderColor: C.line, color: C.sub }}>
            En une phrase : <span style={{ color: C.ink, fontWeight: 600 }}>la protéine doit être le plus gros nombre, le gras moins de la moitié, le sucre en dessous.</span> Si oui → dans le panier. Ces ratios trient les aliments, mais ton déficit se joue sur le <span style={{ color: C.ink }}>total du jour</span> : un aliment moyen reste ok s'il rentre dans tes {settings?.kcal ?? 1850} kcal.
          </p>
        </div>
      </GuideBlock>

      <GuideBlock icon={Beef} color={C.weight} title="Antisèche protéines végé" desc="Teneur en protéines pour 100 g (ou 100 ml). De quoi composer sans peser.">
        <div className="space-y-1.5 rounded-xl p-3" style={{ backgroundColor: C.paper }}>
          {prot.map(([name, val]) => (
            <div key={name} className="flex items-baseline justify-between gap-3">
              <span className="text-sm" style={{ color: C.ink }}>{name}</span>
              <span className="shrink-0 text-sm font-bold" style={{ color: C.protein, fontVariantNumeric: "tabular-nums" }}>{val}</span>
            </div>
          ))}
        </div>
        <p className="px-1 pt-2 text-xs" style={{ color: C.muted }}>À part : 1 œuf ≈ 6–7 g · 1 dose de protéine en poudre (~30 g) ≈ 23 g.</p>
      </GuideBlock>

      <GuideBlock icon={Scale} color={C.green} title="Portions à l'œil" desc="Pas de balance ? Ta main donne des repères fiables.">
        <div className="space-y-2.5">
          {portions.map(([hand, d]) => (
            <div key={hand} className="flex items-start gap-3">
              <span className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold" style={{ backgroundColor: `${C.green}1a`, color: C.green }}>{hand}</span>
              <p className="text-sm" style={{ color: C.sub }}>{d}</p>
            </div>
          ))}
        </div>
      </GuideBlock>

      <GuideBlock icon={Cookie} color={C.over} title="Pièges classiques" desc="Là où les calories se cachent sans prévenir. À commencer par les condiments.">
        <div className="space-y-2 rounded-xl p-3" style={{ backgroundColor: C.paper }}>
          {condiments.map(([tier, color, items]) => (
            <div key={tier}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color }}>{tier}</p>
              <p className="text-sm" style={{ color: C.sub }}>{items}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 space-y-2.5">
          {pieges.map(([t, d]) => (
            <div key={t} className="flex gap-2.5">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: C.over }} />
              <p className="text-sm" style={{ color: C.sub }}><span className="font-semibold" style={{ color: C.ink }}>{t}.</span> {d}</p>
            </div>
          ))}
        </div>
      </GuideBlock>

      <GuideBlock icon={Package} color={C.green} title="Liste de courses type" desc="Les basiques végé-protéinés à toujours avoir sous la main.">
        <div className="space-y-2.5">
          {courses.map(([cat, items]) => (
            <div key={cat}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.green }}>{cat}</p>
              <p className="text-sm" style={{ color: C.sub }}>{items}</p>
            </div>
          ))}
        </div>
      </GuideBlock>

      <GuideBlock icon={Flame} color={C.protein} title="Équivalences plaisir" desc="Pour visualiser l'énergie d'un écart — pas pour le « rembourser ». L'exercice n'est pas une punition.">
        <div className="space-y-1.5 rounded-xl p-3" style={{ backgroundColor: C.paper }}>
          {equiv.map(([name, kcal, walk]) => (
            <div key={name} className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 flex-1 truncate text-sm" style={{ color: C.ink }}>{name} <span style={{ color: C.muted }}>{kcal}</span></span>
              <span className="shrink-0 text-sm font-bold" style={{ color: C.green, fontVariantNumeric: "tabular-nums" }}>≈ {walk}</span>
            </div>
          ))}
        </div>
        <p className="px-1 pt-2 text-xs" style={{ color: C.muted }}>Base : marche soutenue (~4,5 kcal/min). Repère indicatif, ton métabolisme varie.</p>
      </GuideBlock>

      <SectionHead id="outils" label="Trouver les calories" />

      <DrinkCalc onAddExtra={onAddExtra} dateLabel={dateLabel} />

      <GuideBlock icon={ScanLine} color={C.green} title="Scanner un produit emballé" desc="Pot de glace, bière en canette, barre… le code-barres donne les valeurs exactes.">
        <AppCard name="Open Food Facts" role="Gratuit, sans pub. Scanne et lit kcal + protéines." url="https://play.google.com/store/apps/details?id=org.openfoodfacts.scanner" tint={C.green} />
        <AppCard name="Yuka" role="Scanne aussi ; pratique mais orienté « score » plus que macros." url="https://play.google.com/store/apps/details?id=io.yuka.android" tint={C.protein} />
      </GuideBlock>

      <GuideBlock icon={Beer} color={C.protein} title="Estimer à la louche" desc="Aucune donnée sous la main ? Ces repères suffisent — et dans le doute, surestime un peu.">
        <RefRow icon={Beer} label="Bière" value="° × cl × 0,8" hint="demi 5° ≈ 100 · pinte ≈ 200 · IPA +15 %" />
        <RefRow icon={Wine} label="Cocktail" value="~90 kcal / dose" hint="+ le sucre : spritz ~150, mojito ~200, piña ~380" />
        <RefRow icon={IceCream2} label="Glace" value="boule ~130" hint="sorbet ~95 · cornet 2 boules ~320" />
        <RefRow icon={Wine} label="Vin" value="~125 kcal" hint="par verre de 15 cl" />
      </GuideBlock>

      <div className="rounded-2xl p-4" style={cardStyle()}>
        <p className="text-sm font-semibold" style={{ color: C.ink }}>Le réflexe</p>
        <p className="mt-1 text-sm" style={{ color: C.sub }}>Quelle que soit la source, logge le résultat dans <span style={{ color: C.extra, fontWeight: 600 }}>Extras</span> (presets boissons inclus). L'alcool compte vraiment : 7 kcal/g et il met la combustion des graisses en pause le temps d'être éliminé.</p>
      </div>
    </div>
  );
}


function SectionHead({ id, label }) {
  return <h2 id={`guide-${id}`} className="mb-2 mt-6 text-xs font-bold uppercase tracking-widest" style={{ color: C.muted, scrollMarginTop: "12px" }}>{label}</h2>;
}


function GuideBlock({ icon: Icon, color, title, desc, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-2.5 overflow-hidden rounded-2xl" style={cardStyle()}>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:opacity-70">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}22`, color }}><Icon size={17} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold" style={{ color: C.ink }}>{title}</span>
          <span className="mt-0.5 block text-xs" style={{ color: C.muted }}>{desc}</span>
        </span>
        <ChevronDown size={18} style={{ color: C.muted, flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
      </button>
      {open && <div className="space-y-2 px-4 pb-4 pt-0.5">{children}</div>}
    </div>
  );
}


function AppCard({ name, role, url, tint }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-2xl p-3 active:scale-95" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, textDecoration: "none" }}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold" style={{ backgroundColor: `${tint}26`, color: tint }}>{name[0]}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold" style={{ color: C.ink }}>{name}</p>
        <p className="text-xs" style={{ color: C.sub }}>{role}</p>
      </div>
      <span className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: `${tint}22`, color: tint }}>Play <ExternalLink size={12} /></span>
    </a>
  );
}


function RefRow({ icon: Icon, label, value, hint }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl p-3" style={{ backgroundColor: C.paper }}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: C.track, color: C.sub }}><Icon size={15} /></span>
      <div className="min-w-0 flex-1">
        <p className="text-sm" style={{ color: C.ink }}><span className="font-semibold">{label}</span> · <span style={{ color: C.protein, fontWeight: 600 }}>{value}</span></p>
        <p className="text-xs" style={{ color: C.muted }}>{hint}</p>
      </div>
    </div>
  );
}

// ── Graphiques (SVG maison) ─────────────────────────────────────────────────


function DrinkCalc({ onAddExtra, dateLabel }) {
  const [mode, setMode] = useState("biere");
  const [deg, setDeg] = useState(5);
  const [vol, setVol] = useState(33);
  const [ipa, setIpa] = useState(false);
  const [doses, setDoses] = useState(2);
  const [sweet, setSweet] = useState("moyen");
  const [added, setAdded] = useState(false);

  const SWEET = { sec: 0, moyen: 60, sucre: 140 };
  const kcal = mode === "biere"
    ? Math.round(deg * vol * 0.8 * (ipa ? 1.15 : 1))
    : Math.round(doses * 90 + SWEET[sweet]);
  const name = mode === "biere"
    ? `Bière ${deg}° · ${vol} cl${ipa ? " (IPA)" : ""}`
    : `Cocktail · ${doses} dose${doses > 1 ? "s" : ""}`;

  const add = () => { onAddExtra({ name, kcal, p: mode === "biere" ? Math.round(vol * 0.04) : 0 }); setAdded(true); setTimeout(() => setAdded(false), 2200); };

  const Stepper = ({ value, set, step, min, max, suffix }) => (
    <div className="flex items-center gap-2">
      <button onClick={() => set(Math.max(min, +(value - step).toFixed(1)))} className="flex h-8 w-8 items-center justify-center rounded-lg text-lg font-bold active:scale-90" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink }}>−</button>
      <span className="w-16 text-center text-sm font-bold" style={{ color: C.ink, fontVariantNumeric: "tabular-nums" }}>{value}{suffix}</span>
      <button onClick={() => set(Math.min(max, +(value + step).toFixed(1)))} className="flex h-8 w-8 items-center justify-center rounded-lg text-lg font-bold active:scale-90" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}`, color: C.ink }}>+</button>
    </div>
  );

  return (
    <div className="mb-4 rounded-3xl p-4" style={cardStyle()}>
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${C.protein}22`, color: C.protein }}><Beer size={17} /></span>
        <h3 className="text-sm font-bold" style={{ color: C.ink }}>Calculateur boisson</h3>
        <div className="ml-auto flex gap-1 rounded-full p-1" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}` }}>
          {[{ v: "biere", l: "Bière" }, { v: "cocktail", l: "Cocktail" }].map((o) => (
            <button key={o.v} onClick={() => setMode(o.v)} className="rounded-full px-3 py-1 text-xs font-semibold active:scale-95" style={mode === o.v ? { backgroundColor: C.ink, color: C.paper } : { color: C.sub }}>{o.l}</button>
          ))}
        </div>
      </div>

      {mode === "biere" ? (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between"><span className="text-sm" style={{ color: C.sub }}>Degré</span><Stepper value={deg} set={setDeg} step={0.5} min={2} max={14} suffix="°" /></div>
          <div className="flex items-center justify-between"><span className="text-sm" style={{ color: C.sub }}>Volume</span><Stepper value={vol} set={setVol} step={1} min={10} max={100} suffix=" cl" /></div>
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: C.sub }}>Type IPA / maltée</span>
            <button onClick={() => setIpa((v) => !v)} className="rounded-full px-3 py-1 text-xs font-semibold active:scale-95" style={ipa ? { backgroundColor: C.protein, color: "#fff" } : { color: C.sub, border: `1px solid ${C.line}` }}>{ipa ? "Oui (+15 %)" : "Non"}</button>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between"><span className="text-sm" style={{ color: C.sub }}>Doses d'alcool (4 cl)</span><Stepper value={doses} set={setDoses} step={1} min={1} max={6} suffix="" /></div>
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: C.sub }}>Sucré</span>
            <div className="flex gap-1 rounded-full p-1" style={{ backgroundColor: C.paper, border: `1px solid ${C.line}` }}>
              {[{ v: "sec", l: "Sec" }, { v: "moyen", l: "Moyen" }, { v: "sucre", l: "Sucré" }].map((o) => (
                <button key={o.v} onClick={() => setSweet(o.v)} className="rounded-full px-2.5 py-1 text-xs font-semibold active:scale-95" style={sweet === o.v ? { backgroundColor: C.ink, color: C.paper } : { color: C.sub }}>{o.l}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between rounded-2xl p-3" style={{ backgroundColor: C.paper }}>
        <div>
          <p className="text-xs uppercase tracking-wide" style={{ color: C.muted }}>Estimation</p>
          <p className="text-2xl font-extrabold leading-none" style={{ color: C.ink, fontFamily: "'Space Grotesk', system-ui", fontVariantNumeric: "tabular-nums" }}>{kcal} <span className="text-sm font-medium" style={{ color: C.sub }}>kcal</span></p>
        </div>
        <button onClick={add} className="flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-sm font-bold active:scale-95" style={{ backgroundColor: added ? C.green : C.protein, color: "#fff" }}>
          {added ? <><Check size={16} /> Ajouté</> : <><Plus size={16} /> En Extra</>}
        </button>
      </div>
      <p className="mt-2 text-xs" style={{ color: C.muted }}>{added ? `Ajouté à ${dateLabel.toLowerCase()}.` : "Ajoute l'estimation aux Extras du jour. Dans le doute, surestime un peu."}</p>
    </div>
  );
}
