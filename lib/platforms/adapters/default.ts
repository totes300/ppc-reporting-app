import type { PlatformFieldsConfig } from "@/lib/supabase/types";

export type NormalizedMetrics = {
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  cpc: number | null;
  spend: number | null;
  conversions: number | null;
  cost_per_conversion: number | null;
  conversion_value: number | null;
  roas: number | null;
  extra_data: Record<string, unknown>;
};

export type NormalizedCampaignRow = Record<string, unknown>;

export type PlatformAdapter = {
  normalizeAccountRow: (row: Record<string, unknown>) => NormalizedMetrics;
  normalizeCampaignRows: (
    rows: Record<string, unknown>[],
    config: PlatformFieldsConfig
  ) => NormalizedCampaignRow[];
};

const STANDARD_FIELDS = [
  "impressions",
  "clicks",
  "ctr",
  "cpc",
  "spend",
  "conversions",
  "cost_per_conversion",
  "conversion_value",
  "roas",
] as const;

function toNum(val: unknown): number | null {
  if (val == null || val === "") return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

export const defaultAdapter: PlatformAdapter = {
  normalizeAccountRow(row) {
    const extra_data: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(row)) {
      if (!(STANDARD_FIELDS as readonly string[]).includes(key)) {
        extra_data[key] = value;
      }
    }

    return {
      impressions: toNum(row.impressions),
      clicks: toNum(row.clicks),
      ctr: toNum(row.ctr),
      cpc: toNum(row.cpc),
      spend: toNum(row.spend),
      conversions: toNum(row.conversions),
      cost_per_conversion: toNum(row.cost_per_conversion),
      conversion_value: toNum(row.conversion_value),
      roas: toNum(row.roas),
      extra_data,
    };
  },

  normalizeCampaignRows(rows, config) {
    const sortBy = config.campaign_display.sort_by;
    const limit = config.campaign_display.limit;

    const sorted = [...rows].sort((a, b) => {
      const av = toNum(a[sortBy]) ?? 0;
      const bv = toNum(b[sortBy]) ?? 0;
      return bv - av;
    });

    return sorted.slice(0, limit).map((row) => {
      const out: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(row)) {
        out[key] = key === "campaign" ? value : toNum(value) ?? value;
      }
      return out;
    });
  },
};
