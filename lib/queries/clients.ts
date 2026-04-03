import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  normalizePlatform,
  type Client,
  type ClientConnection,
  type ConnectionWithPlatform,
  type Platform,
  type Report,
} from "@/lib/supabase/types";

export async function getActiveClients(): Promise<Client[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("clients")
    .select("*")
    .eq("is_active", true)
    .order("name");
  return data ?? [];
}

export async function getClientById(id: string): Promise<Client | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();
  return data;
}

export async function getClientConnections(
  clientId: string
): Promise<ConnectionWithPlatform[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("client_connections")
    .select("*, platform:platforms(*)")
    .eq("client_id", clientId)
    .eq("is_active", true);
  return ((data as (ClientConnection & { platform: Platform })[]) ?? []).map(
    (c) => ({ ...c, platform: normalizePlatform(c.platform) })
  );
}

export async function getClientReports(clientId: string): Promise<Report[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("reports")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  return data ?? [];
}
