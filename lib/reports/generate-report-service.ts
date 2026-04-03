import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchPlatformData } from "@/lib/windsor/fetch-platform-data";
import { getAdapter } from "@/lib/platforms/get-platform-config";
import { upsertPeriodMetrics } from "@/lib/reports/upsert-period-metrics";
import { buildDeltaPayload, type DeltaPayload } from "@/lib/reports/build-report-payload";
import { generatePlatformAnalysis } from "@/lib/ai/generate-analysis";
import { generateExecutiveSummary } from "@/lib/ai/generate-summary";
import { anthropic } from "@/lib/ai/client";
import { formatGlossaryText } from "@/lib/reports/format-glossary";
import type { PeriodDates } from "@/lib/ai/prompts";
import type {
  Client,
  ConnectionWithPlatform,
  ReportSection,
  GlossaryTerm,
} from "@/lib/supabase/types";

// ── Types ────────────────────────────────────────────────────────

// Uses ConnectionWithPlatform from types.ts (normalized platform guaranteed)

export type GenerationResult = {
  reportId: string;
  sections: ReportSection[];
  aiErrors: string[];
};

// ── Supabase helper: throw on write errors ───────────────────────

function throwOnError<T>(
  result: { data: T; error: { message: string } | null },
  context: string
): T {
  if (result.error) {
    throw new Error(`${context}: ${result.error.message}`);
  }
  return result.data;
}

// ── Core pipeline: fetch data → upsert metrics → build payloads ─

export async function fetchAndUpsertMetrics(
  supabase: SupabaseClient,
  client: Client,
  connections: ConnectionWithPlatform[],
  dates: PeriodDates
): Promise<DeltaPayload[]> {
  const deltaPayloads: DeltaPayload[] = [];

  for (const conn of connections) {
    const adapter = getAdapter(conn.platform.slug);

    const [currentData, comparisonData] = await Promise.all([
      fetchPlatformData(conn.platform, conn.account_id, dates.currentStart, dates.currentEnd),
      fetchPlatformData(conn.platform, conn.account_id, dates.comparisonStart, dates.comparisonEnd),
    ]);

    const currentMetrics = adapter.normalizeAccountRow(currentData.accountRows[0] ?? {});
    const comparisonMetrics = adapter.normalizeAccountRow(comparisonData.accountRows[0] ?? {});

    const currentCampaigns = adapter.normalizeCampaignRows(currentData.campaignRows, conn.platform.fields_config);
    const comparisonCampaigns = adapter.normalizeCampaignRows(comparisonData.campaignRows, conn.platform.fields_config);

    const [currentPM, comparisonPM] = await Promise.all([
      upsertPeriodMetrics(supabase, client.id, conn.id, dates.currentStart, dates.currentEnd, currentMetrics, currentCampaigns),
      upsertPeriodMetrics(supabase, client.id, conn.id, dates.comparisonStart, dates.comparisonEnd, comparisonMetrics, comparisonCampaigns),
    ]);

    deltaPayloads.push(buildDeltaPayload(currentPM, comparisonPM, conn.platform, client.type, conn.id));
  }

  return deltaPayloads;
}

// ── AI text generation (parallel) ────────────────────────────────

export async function generateAiTexts(
  deltaPayloads: DeltaPayload[],
  client: Client,
  dates: PeriodDates
): Promise<{
  platformTexts: (string | null)[];
  summaryText: string | null;
  aiErrors: string[];
}> {
  if (!anthropic) {
    throw new Error(
      "Az AI szöveggenerálás nem elérhető: ANTHROPIC_API_KEY nincs beállítva."
    );
  }

  const aiErrors: string[] = [];

  const [platformTexts, summaryText] = await Promise.all([
    Promise.all(
      deltaPayloads.map((p) =>
        generatePlatformAnalysis(p, client.type, client.industry, dates).catch(
          (err: unknown) => {
            const msg = err instanceof Error ? err.message : "Ismeretlen AI hiba";
            aiErrors.push(`${p.platformName}: ${msg}`);
            return null;
          }
        )
      )
    ),
    generateExecutiveSummary(deltaPayloads, client.type, client.industry, dates).catch(
      (err: unknown) => {
        const msg = err instanceof Error ? err.message : "Ismeretlen AI hiba";
        aiErrors.push(`Vezetői összefoglaló: ${msg}`);
        return null;
      }
    ),
  ]);

  return { platformTexts, summaryText, aiErrors };
}

// ── Section creation (for new reports) ───────────────────────────

export async function createSections(
  supabase: SupabaseClient,
  reportId: string,
  connections: ConnectionWithPlatform[],
  platformTexts: (string | null)[],
  summaryText: string | null,
  glossaryText: string
): Promise<void> {
  // Delete existing sections (clean slate)
  const deleteResult = await supabase
    .from("report_sections")
    .delete()
    .eq("report_id", reportId);
  throwOnError(deleteResult, "Szekciók törlése");

  const sections: {
    report_id: string;
    connection_id: string | null;
    section_type: string;
    ai_generated_text: string | null;
    is_enabled: boolean;
    sort_order: number;
  }[] = [];

  connections.forEach((conn, i) => {
    sections.push({
      report_id: reportId,
      connection_id: conn.id,
      section_type: "platform_analysis",
      ai_generated_text: platformTexts[i] ?? null,
      is_enabled: true,
      sort_order: i + 1,
    });
  });

  sections.push({
    report_id: reportId,
    connection_id: null,
    section_type: "executive_summary",
    ai_generated_text: summaryText,
    is_enabled: true,
    sort_order: connections.length + 1,
  });

  sections.push({
    report_id: reportId,
    connection_id: null,
    section_type: "glossary",
    ai_generated_text: glossaryText,
    is_enabled: true,
    sort_order: connections.length + 2,
  });

  const insertResult = await supabase.from("report_sections").insert(sections);
  throwOnError(insertResult, "Szekciók létrehozása");
}

// ── Section reconciliation (for regeneration) ────────────────────

export async function reconcileSections(
  supabase: SupabaseClient,
  reportId: string,
  connections: ConnectionWithPlatform[],
  platformTexts: (string | null)[],
  summaryText: string | null,
  glossaryText: string
): Promise<void> {
  const { data: existingSections } = await supabase
    .from("report_sections")
    .select("*")
    .eq("report_id", reportId)
    .order("sort_order");

  const sections = (existingSections ?? []) as ReportSection[];
  const activeConnectionIds = new Set(connections.map((c) => c.id));

  // Delete sections for removed connections
  const removedIds = sections
    .filter(
      (s) =>
        s.section_type === "platform_analysis" &&
        s.connection_id &&
        !activeConnectionIds.has(s.connection_id)
    )
    .map((s) => s.id);

  if (removedIds.length > 0) {
    const deleteResult = await supabase
      .from("report_sections")
      .delete()
      .in("id", removedIds);
    throwOnError(deleteResult, "Eltávolított szekciók törlése");
  }

  // Update or create platform analysis sections
  let sortOrder = 1;
  for (let i = 0; i < connections.length; i++) {
    const conn = connections[i];
    const existing = sections.find(
      (s) => s.section_type === "platform_analysis" && s.connection_id === conn.id
    );

    if (existing) {
      const result = await supabase
        .from("report_sections")
        .update({
          ai_generated_text: platformTexts[i] ?? existing.ai_generated_text,
          edited_text: null,
          sort_order: sortOrder,
        })
        .eq("id", existing.id);
      throwOnError(result, `Platform szekció frissítése (${conn.platform.display_name})`);
    } else {
      const result = await supabase.from("report_sections").insert({
        report_id: reportId,
        connection_id: conn.id,
        section_type: "platform_analysis",
        ai_generated_text: platformTexts[i],
        is_enabled: true,
        sort_order: sortOrder,
      });
      throwOnError(result, `Platform szekció létrehozása (${conn.platform.display_name})`);
    }
    sortOrder++;
  }

  // Executive summary
  const summarySection = sections.find((s) => s.section_type === "executive_summary");
  if (summarySection) {
    const result = await supabase
      .from("report_sections")
      .update({
        ai_generated_text: summaryText ?? summarySection.ai_generated_text,
        edited_text: null,
        sort_order: sortOrder,
      })
      .eq("id", summarySection.id);
    throwOnError(result, "Vezetői összefoglaló frissítése");
  } else {
    const result = await supabase.from("report_sections").insert({
      report_id: reportId,
      connection_id: null,
      section_type: "executive_summary",
      ai_generated_text: summaryText,
      is_enabled: true,
      sort_order: sortOrder,
    });
    throwOnError(result, "Vezetői összefoglaló létrehozása");
  }
  sortOrder++;

  // Glossary
  const glossarySection = sections.find((s) => s.section_type === "glossary");
  if (glossarySection) {
    const result = await supabase
      .from("report_sections")
      .update({
        ai_generated_text: glossaryText,
        edited_text: null,
        sort_order: sortOrder,
      })
      .eq("id", glossarySection.id);
    throwOnError(result, "Szószedet frissítése");
  } else {
    const result = await supabase.from("report_sections").insert({
      report_id: reportId,
      connection_id: null,
      section_type: "glossary",
      ai_generated_text: glossaryText,
      is_enabled: true,
      sort_order: sortOrder,
    });
    throwOnError(result, "Szószedet létrehozása");
  }
}

// ── Glossary text fetch ──────────────────────────────────────────

export async function fetchGlossaryText(supabase: SupabaseClient): Promise<string> {
  const { data: terms } = await supabase
    .from("glossary_terms")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");

  return formatGlossaryText((terms as GlossaryTerm[] | null) ?? []);
}

// ── Fetch final sections for response ────────────────────────────

export async function fetchSections(
  supabase: SupabaseClient,
  reportId: string
): Promise<ReportSection[]> {
  const { data } = await supabase
    .from("report_sections")
    .select("*")
    .eq("report_id", reportId)
    .order("sort_order");

  return (data ?? []) as ReportSection[];
}
