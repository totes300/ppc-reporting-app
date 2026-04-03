import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  normalizePlatform,
  type Client,
  type Report,
  type ClientConnection,
  type Platform,
  type ConnectionWithPlatform,
} from "@/lib/supabase/types";

export interface DashboardClient {
  client: Client;
  connections: ConnectionWithPlatform[];
  report: Report | null;
}

export async function getDashboardData(
  monthBucket: string
): Promise<DashboardClient[]> {
  const supabase = await createServerSupabaseClient();

  const [{ data: clients }, { data: reports }, { data: connections }] =
    await Promise.all([
      supabase
        .from("clients")
        .select("*")
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("reports")
        .select("*")
        .eq("mode", "monthly")
        .eq("month_bucket", monthBucket),
      supabase
        .from("client_connections")
        .select("*, platform:platforms(*)")
        .eq("is_active", true),
    ]);

  const reportMap = new Map<string, Report>();
  for (const r of reports ?? []) {
    reportMap.set(r.client_id, r);
  }

  const connectionMap = new Map<string, ConnectionWithPlatform[]>();
  for (const c of (connections ?? []) as (ClientConnection & { platform: Platform })[]) {
    const normalized: ConnectionWithPlatform = { ...c, platform: normalizePlatform(c.platform) };
    const arr = connectionMap.get(c.client_id) ?? [];
    arr.push(normalized);
    connectionMap.set(c.client_id, arr);
  }

  return (clients ?? []).map((client) => ({
    client,
    connections: connectionMap.get(client.id) ?? [],
    report: reportMap.get(client.id) ?? null,
  }));
}
