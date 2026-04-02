import type { PlatformFieldsConfig } from "@/lib/supabase/types";
import { defaultAdapter, type PlatformAdapter } from "./default";

function toNum(val: unknown): number | null {
  if (val == null || val === "") return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

export const googleAdsAdapter: PlatformAdapter = {
  normalizeAccountRow(row) {
    const base = defaultAdapter.normalizeAccountRow(row);

    // Google Ads specifikus mezők → extra_data
    base.extra_data.average_order_value = toNum(row.average_order_value);
    base.extra_data.search_impression_share = toNum(
      row.search_impression_share
    );
    base.extra_data.top_impression_share = toNum(row.top_impression_share);

    return base;
  },

  normalizeCampaignRows(rows: Record<string, unknown>[], config: PlatformFieldsConfig) {
    return defaultAdapter.normalizeCampaignRows(rows, config);
  },
};
