import React, { useState } from "react";
import { X, Cloud, CloudOff, LogOut, Mail, Loader2 } from "lucide-react";
import { C } from "./core.js";
import { supabase } from "./supabaseClient.js";
import { Sheet } from "./Sheet.jsx";

// Bloc « Compte & synchronisation ». La connexion est OPTIONNELLE : sans compte,
// l'app marche en local comme avant. Avec compte, l'historique se synchronise.
export function AccountSheet({ session, status, onClose }) {
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const reset = () => { setMsg(""); setErr(""); };
  const run = async (fn) => { reset(); setBusy(true); try { await fn(); } catch (e) { setErr(e.message || "Erreur"); } finally { setBusy(false); } };

  const signIn = () => run(async () => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pwd });
    if (error) throw error;
  });
  const signUp = () => run(async () => {
    const { error } = await supabase.auth.signUp({ email: email.trim(), password: pwd });
    if (error) throw error;
    setMsg("Compte créé. Vérifie tes emails si une confirmation est demandée.");
  });
  const magic = () => run(async () => {
    if (!email.trim()) throw new Error("Renseigne ton email d'abord.");
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: window.location.origin } });
    if (error) throw error;
    setMsg("Lien magique envoyé. Ouvre-le sur cet appareil pour te connecter.");
  });
  const signOut = () => run(async () => { await supabase.auth.signOut(); });

  const statusUI = {
    syncing: { icon: <Loader2 size={14} className="animate-spin" />, label: "Synchronisation…", color: C.sub },
    synced: { icon: <Cloud size={14} />, label: "À jour", color: C.green },
    error: { icon: <CloudOff size={14} />, label: "Hors-ligne / erreur (relancé auto)", color: C.protein },
    idle: { icon: <Cloud size={14} />, label: "En attente", color: C.muted },
  }[status] || { icon: <Cloud size={14} />, label: "", color: C.muted };

  return (
    <Sheet open onClose={onClose} title="Compte & synchronisation">
        {session ? (
          <div className="space-y-4">
            <div className="rounded-2xl p-4" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
              <p className="text-sm" style={{ color: C.ink }}>Connecté</p>
              <p className="text-sm font-medium" style={{ color: C.ink }}>{session.user.email}</p>
              <div className="mt-2 flex items-center gap-1.5 text-xs font-medium" style={{ color: statusUI.color }}>{statusUI.icon} {statusUI.label}</div>
            </div>
            <p className="text-xs" style={{ color: C.muted }}>Ton historique (repas, poids) et tes réglages se synchronisent automatiquement. Tes données restent aussi en local : tu peux utiliser l'app hors-ligne, la sync rattrape au retour du réseau.</p>
            <button onClick={signOut} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }}><LogOut size={16} /> Se déconnecter</button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs" style={{ color: C.muted }}>Connecte-toi pour sauvegarder et synchroniser ton historique entre tes appareils. Sans compte, l'app fonctionne quand même en local.</p>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" inputMode="email" autoCapitalize="none" placeholder="Email" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }} />
            <input value={pwd} onChange={(e) => setPwd(e.target.value)} type="password" placeholder="Mot de passe" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }} />
            <div className="flex gap-2">
              <button onClick={signIn} disabled={busy} className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white active:scale-95" style={{ backgroundColor: C.accent || C.ink }}>Se connecter</button>
              <button onClick={signUp} disabled={busy} className="flex-1 rounded-xl py-2.5 text-sm font-semibold active:scale-95" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }}>Créer un compte</button>
            </div>
            <button onClick={magic} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium active:scale-95" style={{ backgroundColor: "transparent", border: `1px dashed ${C.line}`, color: C.sub }}><Mail size={15} /> Recevoir un lien magique</button>
          </div>
        )}

        {(msg || err) && (
          <p className="mt-3 text-center text-xs" style={{ color: err ? C.protein : C.green }}>{err || msg}</p>
        )}
    </Sheet>
  );
}
