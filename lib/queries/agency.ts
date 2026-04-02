import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AgencySettings } from "@/lib/supabase/types";

export async function getAgencySettings(): Promise<AgencySettings | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("agency_settings")
    .select("*")
    .limit(1)
    .single();
  return data;
}
