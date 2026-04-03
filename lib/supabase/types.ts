// ============================================
// Enum-szerű union típusok
// ============================================

export type ClientType = "webshop" | "szolgaltato";
export type ReportMode = "monthly" | "custom";
export type ReportStatus = "draft" | "completed";
export type SectionType = "platform_analysis" | "executive_summary" | "glossary";
export type MetricFormat = "num" | "pct" | "huf" | "x";

// ============================================
// Platform fields_config JSONB struktúra
// ============================================

export interface AccountTableField {
  field: string;
  label: string;
  format: MetricFormat;
  group: string;
  inverse?: boolean;
}

export interface CampaignDisplay {
  sort_by: string;
  limit: number;
}

export interface PlatformFieldsConfig {
  api_fields: string[];
  /** Fields that break Windsor.ai account-level aggregation when included in the query.
   *  These are excluded from the account query and derived from aggregated totals instead. */
  account_query_exclude?: string[];
  account_table: Record<ClientType, AccountTableField[]>;
  campaign_table: Record<ClientType, string[]>;
  campaign_level: boolean;
  campaign_display: CampaignDisplay;
}

// ============================================
// Tábla row típusok
// ============================================

export interface AgencySettings {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string;
  created_at: string;
  updated_at: string;
}

/**
 * Raw Platform row as returned by Supabase.
 *
 * `fields_config` is typed as `PlatformFieldsConfig | string` because the
 * DB column was historically stored as text instead of jsonb. Migration
 * 004_fix_fields_config_jsonb.sql corrected this, but the PostgREST schema
 * cache may still serve a stale text representation until a project restart.
 *
 * All code that consumes Platform data should go through `normalizePlatform()`
 * (in this module) to guarantee a parsed object. The query layer (`lib/queries/`)
 * calls this automatically — application code should never need to call it.
 */
export interface Platform {
  id: string;
  slug: string;
  display_name: string;
  windsor_connector: string;
  icon_color: string;
  icon_letter: string;
  fields_config: PlatformFieldsConfig | string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

/** Platform with guaranteed parsed `fields_config`. */
export type NormalizedPlatform = Omit<Platform, "fields_config"> & {
  fields_config: PlatformFieldsConfig;
};

/**
 * Single normalization point for Platform rows.
 * Parses `fields_config` if it arrives as a string; no-op if already an object.
 */
export function normalizePlatform<T extends Platform>(platform: T): T & { fields_config: PlatformFieldsConfig } {
  if (typeof platform.fields_config === "string") {
    return { ...platform, fields_config: JSON.parse(platform.fields_config) as PlatformFieldsConfig };
  }
  return platform as T & { fields_config: PlatformFieldsConfig };
}

/** Convenience type: ClientConnection joined with a normalized Platform. */
export type ConnectionWithPlatform = ClientConnection & { platform: NormalizedPlatform };

export interface Client {
  id: string;
  name: string;
  type: ClientType;
  industry: string | null;
  contact_email: string | null;
  logo_url: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClientConnection {
  id: string;
  client_id: string;
  platform_id: string;
  account_id: string;
  account_name: string | null;
  is_active: boolean;
  last_synced_at: string | null;
  created_at: string;
}

export interface PeriodMetrics {
  id: string;
  client_id: string;
  connection_id: string;
  period_start: string;
  period_end: string;
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
  fetched_at: string;
}

export interface Report {
  id: string;
  client_id: string;
  mode: ReportMode;
  month_bucket: string | null;
  current_period_start: string;
  current_period_end: string;
  comparison_period_start: string;
  comparison_period_end: string;
  template_type: ClientType;
  status: ReportStatus;
  last_generated_at: string;
  last_pdf_downloaded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportSection {
  id: string;
  report_id: string;
  connection_id: string | null;
  section_type: SectionType;
  ai_generated_text: string | null;
  edited_text: string | null;
  is_enabled: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface GlossaryTerm {
  id: string;
  term: string;
  full_name: string | null;
  definition: string;
  sort_order: number;
  is_active: boolean;
}
