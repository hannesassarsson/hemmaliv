import { createClient } from "@supabase/supabase-js";

/** Service role-klient för serverfunktionerna, eller null om konfiguration saknas. */
export function adminClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Kontrollerar att anropet kommer från en inloggad hushållsmedlem.
 * Returnerar { supabase, person } eller skickar själv ett felsvar och returnerar null.
 */
export async function requireMember(request, response) {
  const supabase = adminClient();
  if (!supabase) {
    response.status(500).json({ error: "Saknar Supabase-konfiguration" });
    return null;
  }

  const match = /^Bearer (.+)$/.exec(request.headers.authorization ?? "");
  if (!match) {
    response.status(401).json({ error: "Inte inloggad" });
    return null;
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(match[1]);
  if (userError || !userData?.user) {
    response.status(401).json({ error: "Inte inloggad" });
    return null;
  }

  const { data: member } = await supabase
    .from("hemma_members")
    .select("person")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (!member) {
    response.status(403).json({ error: "Kontot hör inte till hushållet" });
    return null;
  }

  return { supabase, person: member.person };
}
