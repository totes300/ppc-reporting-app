import type { NormalizedPlatform } from "@/lib/supabase/types";

export type WindsorResponse = {
  accountRows: Record<string, unknown>[];
  campaignRows: Record<string, unknown>[];
};

export async function fetchPlatformData(
  platform: NormalizedPlatform,
  accountId: string,
  dateFrom: string,
  dateTo: string
): Promise<WindsorResponse> {
  const apiKey = process.env.WINDSOR_API_KEY;
  if (!apiKey) {
    throw new Error("WINDSOR_API_KEY nincs beállítva a környezeti változókban.");
  }

  const baseUrl = `https://connectors.windsor.ai/${platform.windsor_connector}`;

  // Windsor uses dashed format (e.g. "901-365-8143"), normalize if stored without dashes
  const normalizedAccountId =
    accountId.replace(/\D/g, "").length === 10
      ? accountId
          .replace(/\D/g, "")
          .replace(/^(\d{3})(\d{3})(\d{4})$/, "$1-$2-$3")
      : accountId;

  const accountFilter = encodeURIComponent(
    JSON.stringify([["account_id", "eq", normalizedAccountId]])
  );

  // Some fields break Windsor's account-level aggregation, causing per-campaign
  // rows instead of one aggregated row. These are configured per platform in
  // fields_config.account_query_exclude and derived from totals after the query.
  const excludeSet = new Set(
    platform.fields_config.account_query_exclude ?? []
  );

  const accountFields = platform.fields_config.api_fields
    .filter((f) => !excludeSet.has(f))
    .join(",");

  const allFields = platform.fields_config.api_fields.join(",");

  const accountUrl =
    `${baseUrl}?api_key=${apiKey}` +
    `&fields=${accountFields}` +
    `&date_from=${dateFrom}` +
    `&date_to=${dateTo}` +
    `&filter=${accountFilter}`;

  const fetches: [Promise<Response>, Promise<Response> | null] = [
    fetch(accountUrl),
    null,
  ];

  if (platform.fields_config.campaign_level) {
    const campaignUrl =
      `${baseUrl}?api_key=${apiKey}` +
      `&fields=campaign,${allFields}` +
      `&date_from=${dateFrom}` +
      `&date_to=${dateTo}` +
      `&filter=${accountFilter}`;
    fetches[1] = fetch(campaignUrl);
  }

  const [accountResponse, campaignResponse] = await Promise.all([
    fetches[0],
    fetches[1],
  ]);

  if (!accountResponse.ok) {
    const status = accountResponse.status;
    if (status === 429) {
      throw new Error(
        "A Windsor.ai átmeneti jelleggel túl sok kérést kapott. Próbáld újra később."
      );
    }
    throw new Error(
      `Windsor.ai hiba (${platform.display_name}): ${status} ${accountResponse.statusText}`
    );
  }

  const accountData = await accountResponse.json();

  let campaignRows: Record<string, unknown>[] = [];
  if (campaignResponse) {
    if (!campaignResponse.ok) {
      throw new Error(
        `Windsor.ai kampányadat hiba (${platform.display_name}): ${campaignResponse.status} ${campaignResponse.statusText}`
      );
    }
    const campaignData = await campaignResponse.json();
    campaignRows = campaignData.data ?? [];
  }

  // Windsor should return 1 aggregated row with excluded fields removed,
  // but aggregate as a safety net if it still returns multiple rows.
  const rawAccountRows: Record<string, unknown>[] = accountData.data ?? [];
  const accountRow =
    rawAccountRows.length <= 1
      ? rawAccountRows[0] ?? null
      : aggregateRows(rawAccountRows);

  // Derive excluded fields from aggregated totals / campaign data
  if (accountRow && excludeSet.size > 0) {
    deriveExcludedFields(accountRow, excludeSet, campaignRows);
  }

  return {
    accountRows: accountRow ? [accountRow] : [],
    campaignRows,
  };
}

// ── Derive excluded fields ───────────────────────────────────────

/** Derivation rules for fields excluded from the account query.
 *  Each rule computes the field from the aggregated account row or campaign data. */
const DERIVATION_RULES: Record<
  string,
  (
    row: Record<string, unknown>,
    campaigns: Record<string, unknown>[]
  ) => unknown
> = {
  average_order_value: (row) =>
    safeDivide(row.conversion_value, row.conversions),
  top_impression_share: (_row, campaigns) =>
    impressionWeightedAvg(campaigns, "top_impression_share"),
};

function deriveExcludedFields(
  row: Record<string, unknown>,
  excludeSet: Set<string>,
  campaignRows: Record<string, unknown>[]
) {
  for (const field of excludeSet) {
    if (field in row) continue; // already present
    const rule = DERIVATION_RULES[field];
    row[field] = rule ? rule(row, campaignRows) : null;
  }
}

// ── Aggregation helpers ──────────────────────────────────────────

const SUM_FIELDS = new Set([
  "impressions",
  "clicks",
  "spend",
  "conversions",
  "conversion_value",
]);

function aggregateRows(
  rows: Record<string, unknown>[]
): Record<string, unknown> {
  const agg: Record<string, unknown> = {};

  for (const field of SUM_FIELDS) {
    let sum = 0;
    let hasValue = false;
    for (const row of rows) {
      const v = row[field];
      if (v != null && Number(v) !== 0) {
        sum += Number(v);
        hasValue = true;
      }
    }
    agg[field] = hasValue ? sum : null;
  }

  agg.ctr = safeDivide(agg.clicks, agg.impressions);
  agg.cpc = safeDivide(agg.spend, agg.clicks);
  agg.cost_per_conversion = safeDivide(agg.spend, agg.conversions);
  agg.roas = safeDivide(agg.conversion_value, agg.spend);
  agg.average_order_value = safeDivide(agg.conversion_value, agg.conversions);
  agg.search_impression_share = impressionWeightedAvg(rows, "search_impression_share");
  agg.top_impression_share = impressionWeightedAvg(rows, "top_impression_share");

  return agg;
}

function impressionWeightedAvg(
  rows: Record<string, unknown>[],
  field: string
): number | null {
  let weightedSum = 0;
  let totalImpressions = 0;
  for (const row of rows) {
    const v = row[field];
    const imp = Number(row.impressions ?? 0);
    if (v != null && imp > 0) {
      weightedSum += Number(v) * imp;
      totalImpressions += imp;
    }
  }
  return totalImpressions > 0 ? weightedSum / totalImpressions : null;
}

function safeDivide(
  numerator: unknown,
  denominator: unknown
): number | null {
  const n = Number(numerator);
  const d = Number(denominator);
  if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) return null;
  return n / d;
}
