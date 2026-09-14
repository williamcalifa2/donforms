/**
 * Supabase Admin client — usa Service Role Key.
 * NUNCA expor ao browser. Usar apenas em Server Actions e Route Handlers.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados.");
  }

  return createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
