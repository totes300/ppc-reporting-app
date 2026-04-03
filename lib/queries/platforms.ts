import { createServerSupabaseClient } from "@/lib/supabase/server";
import { normalizePlatform, type NormalizedPlatform } from "@/lib/supabase/types";

export async function getActivePlatforms(): Promise<NormalizedPlatform[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("platforms")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  return (data ?? []).map(normalizePlatform);
}
