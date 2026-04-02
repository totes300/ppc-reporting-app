import type { SupabaseClient } from "@supabase/supabase-js";
import type { NormalizedMetrics, NormalizedCampaignRow } from "@/lib/platforms/adapters/default";

export async function upsertPeriodMetrics(
  supabase: SupabaseClient,
  clientId: string,
  connectionId: string,
  periodStart: string,
  periodEnd: string,
  metrics: NormalizedMetrics,
  campaignRows: NormalizedCampaignRow[]
) {
  const extra_data = {
    ...metrics.extra_data,
    campaigns: campaignRows,
  };

  const { data, error } = await supabase
    .from("period_metrics")
    .upsert(
      {
        client_id: clientId,
        connection_id: connectionId,
        period_start: periodStart,
        period_end: periodEnd,
        impressions: metrics.impressions,
        clicks: metrics.clicks,
        ctr: metrics.ctr,
        cpc: metrics.cpc,
        spend: metrics.spend,
        conversions: metrics.conversions,
        cost_per_conversion: metrics.cost_per_conversion,
        conversion_value: metrics.conversion_value,
        roas: metrics.roas,
        extra_data,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: "connection_id,period_start,period_end" }
    )
    .select()
    .single();

  if (error) {
    throw new Error(`period_metrics upsert hiba: ${error.message}`);
  }

  // Update last_synced_at on the connection
  await supabase
    .from("client_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", connectionId);

  return data;
}
