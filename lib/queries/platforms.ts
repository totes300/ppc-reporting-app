import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Platform } from "@/lib/supabase/types";

export async function getActivePlatforms(): Promise<Platform[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("platforms")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  return data ?? [];
}
