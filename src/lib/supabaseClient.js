// ════════════════════════════════════════════════════════════════
// supabaseClient.js — instance unique du client Supabase (auth + données perso).
// persistSession : la session reste après fermeture (PWA). detectSessionInUrl :
// nécessaire pour que le magic link connecte au retour sur l'app.
// ════════════════════════════════════════════════════════════════
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase.config.js";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
