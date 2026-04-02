import type {
  Platform,
  ClientType,
  PeriodMetrics,
  MetricFormat,
} from "@/lib/supabase/types";
import {
  getDeltaPresentation,
  type DeltaPresentation,
} from "./get-delta-presentation";

export type AccountMetric = {
  field: string;
  label: string;
  format: MetricFormat;
  group: string;
  inverse: boolean;
  current: number | null;
  previous: number | null;
  delta: DeltaPresentation;
};

export type DeltaPayload = {
  platformName: string;
  platformSlug: string;
  connectionId: string;
  accountMetrics: AccountMetric[];
  topCampaigns: Record<string, unknown>[];
};

function getMetricValue(
  metrics: PeriodMetrics,
  field: string
): number | null {
  // Check standard columns first
  if (field in metrics && field !== "extra_data") {
    const val = metrics[field as keyof PeriodMetrics];
    return typeof val === "number" ? val : null;
  }
  // Fall back to extra_data
  const val = metrics.extra_data[field];
  if (val == null) return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

export function buildDeltaPayload(
  currentMetrics: PeriodMetrics,
  comparisonMetrics: PeriodMetrics,
  platform: Platform,
  clientType: ClientType,
  connectionId: string
): DeltaPayload {
  const fieldConfigs = platform.fields_config.account_table[clientType];

  const accountMetrics: AccountMetric[] = fieldConfigs.map((fc) => {
    const current = getMetricValue(currentMetrics, fc.field);
    const previous = getMetricValue(comparisonMetrics, fc.field);
    const inverse = fc.inverse ?? false;

    return {
      field: fc.field,
      label: fc.label,
      format: fc.format,
      group: fc.group,
      inverse,
      current,
      previous,
      delta: getDeltaPresentation(current, previous, inverse),
    };
  });

  const topCampaigns =
    (currentMetrics.extra_data.campaigns as Record<string, unknown>[]) ?? [];

  return {
    platformName: platform.display_name,
    platformSlug: platform.slug,
    connectionId,
    accountMetrics,
    topCampaigns,
  };
}
