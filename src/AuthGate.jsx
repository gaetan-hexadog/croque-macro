import React, { useState } from "react";
import { Mail, Loader2 } from "lucide-react";
import { C } from "./core.js";
import { supabase } from "./supabaseClient.js";

// Écran de connexion obligatoire (multi-utilisateur). Tant qu'il n'y a pas de
// session, l'app n'affiche que ça → chaque personne accède à SES données.
export function AuthGate() {
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const run = async (fn) => { setMsg(""); setErr(""); setBusy(true); try { await fn(); } catch (e) { setErr(e.message || "Erreur"); } finally { setBusy(false); } };
  const signIn = () => run(async () => { const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pwd }); if (error) throw error; });
  const signUp = () => run(async () => { const { error } = await supabase.auth.signUp({ email: email.trim(), password: pwd }); if (error) throw error; setMsg("Compte créé. Vérifie tes emails si une confirmation est demandée."); });
  const magic = () => run(async () => { if (!email.trim()) throw new Error("Renseigne ton email d'abord."); const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: window.location.origin } }); if (error) throw error; setMsg("Lien magique envoyé. Ouvre-le sur cet appareil pour te connecter."); });
  const field = { backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink };

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-5" style={{ color: C.ink, fontFamily: "'Inter', ui-sans-serif, system-ui" }}>
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="text-2xl font-extrabold tracking-tight" style={{ fontFamily: "'Space Grotesk', system-ui" }}>Croque<span style={{ color: C.green }}>·</span>Macro</span>
          <p className="mt-1 text-sm" style={{ color: C.sub }}>Connecte-toi pour accéder à ton suivi.</p>
        </div>
        <div className="space-y-3">
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" inputMode="email" autoCapitalize="none" autoComplete="email" placeholder="Email" className="w-full rounded-xl px-3.5 py-3 text-sm outline-none" style={field} />
          <input value={pwd} onChange={(e) => setPwd(e.target.value)} type="password" autoComplete="current-password" placeholder="Mot de passe" className="w-full rounded-xl px-3.5 py-3 text-sm outline-none" style={field} onKeyDown={(e) => { if (e.key === "Enter") signIn(); }} />
          <div className="flex gap-2">
            <button onClick={signIn} disabled={busy} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-bold text-white active:scale-95" style={{ backgroundColor: C.green }}>{busy ? <Loader2 size={16} className="animate-spin" /> : "Se connecter"}</button>
            <button onClick={signUp} disabled={busy} className="flex-1 rounded-xl py-3 text-sm font-semibold active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }}>Créer un compte</button>
          </div>
          <button onClick={magic} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium active:scale-95" style={{ backgroundColor: "transparent", border: `1px dashed ${C.line}`, color: C.sub }}><Mail size={15} /> Recevoir un lien magique</button>
        </div>
        {(msg || err) && <p className="mt-3 text-center text-xs" style={{ color: err ? C.protein : C.green }}>{err || msg}</p>}
        <p className="mt-6 text-center text-[11px]" style={{ color: C.muted }}>Tes données (repas, poids, recettes) sont privées et liées à ton compte.</p>
      </div>
    </div>
  );
}
