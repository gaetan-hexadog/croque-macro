---
name: verify
description: Lancer et vérifier Croque·Macro en local (dev server, seed localStorage, bypass AuthGate)
---

# Vérifier Croque·Macro en local

## Lancer
- `preview_start` avec `.claude/launch.json` → `pnpm dev`, port 5173.
- pnpm ≥ 10 : si `pnpm install` râle sur « Ignored build scripts: esbuild », le réglage vit dans
  `pnpm-workspace.yaml` (`allowBuilds: { esbuild: true }` + `onlyBuiltDependencies`) — PAS dans package.json.

## Bypass AuthGate (login obligatoire depuis le multi-utilisateur)
Session Supabase factice dans le localStorage puis reload — l'app est local-first, la sync échoue sans casser l'UI :
```js
localStorage.setItem("sb-zmilkvfzjwhzwstebigj-auth-token", JSON.stringify({
  access_token: "fake", token_type: "bearer", expires_in: 86400,
  expires_at: Math.floor(Date.now()/1000) + 86400, refresh_token: "fake",
  user: { id: "00000000-0000-0000-0000-000000000000", aud: "authenticated", role: "authenticated", email: "test@local.dev", app_metadata: {}, user_metadata: {} }
}));
```
⚠️ Les appels assistant (Edge Function) resteront en attente/erreur avec ce token — ne pas tester le chemin réseau assistant ainsi.

## Seed de données
Clé `croque-macro:v1` (voir CLAUDE.md pour le schéma). Exemple minimal utile :
`{ settings:{kcal:1850,protein:150}, days:{[ISO du jour]:{picks:{pdj:[{id,name,kcal,p,qty}],dej:[],diner:[],snacks:[],extras:[]},skipBreakfast:false}}, pantry:[{id,name,out:false,kcal100,p100,qty,unit,slots:["pdj","dej","diner","snack"]}], ... }`
Une poudre du frigo doit matcher `/prot(e)?ine|whey|isolate|all.?in.?one|clear|poudre/` et avoir `p100 ≥ 20` pour apparaître dans le shaker.

## Flows qui valent le coup
- Pioche → Frigo : même rendu PantryList que la page frigo ; piocher une portion logge « Nom (150 g) » et DÉCOMPTE le stock (vérifier via localStorage).
- Page frigo → tap un aliment : stepper « Stock restant » en tête de fiche (pas adaptatif ±10/25/50).
- Jour : tap une ligne de repas → sheet d'actions (qty, valeurs, « Ajuster avec l'assistant »).
- Pioche (+ d'un repas) → Shake : poudres du frigo en 🧊 premier, dose réglable, chips catalogue masquables (×).
- Cuisine : recherche → section « Dans ton frigo ».
- Idée de repas : taper « que mon frigo, ≤450 kcal » → le toggle 🔒 Frigo strict s'allume seul.

## Gotchas navigateur
- Les Sheets ne se ferment PAS à Échap — utiliser le bouton × (« Fermer »).
- Les sheets s'empilent (z 30/40/50) ; après un masquage/refresh les refs deviennent stales → re-read_page.
