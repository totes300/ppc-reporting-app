import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getMonthRange, getPreviousMonthRange } from "@/lib/utils/dates";
import { fetchPlatformData } from "@/lib/windsor/fetch-platform-data";
import { getAdapter } from "@/lib/platforms/get-platform-config";
import { upsertPeriodMetrics } from "@/lib/reports/upsert-period-metrics";
import { buildDeltaPayload, type DeltaPayload } from "@/lib/reports/build-report-payload";
import type {
  ClientConnection,
  Platform,
  GlossaryTerm,
} from "@/lib/supabase/types";

const requestSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("monthly"),
    clientId: z.uuid(),
    monthBucket: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  z.object({
    mode: z.literal("custom"),
    clientId: z.uuid(),
    currentPeriodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    currentPeriodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    comparisonPeriodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    comparisonPeriodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
]);

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Nem vagy bejelentkezve." },
        { status: 401 }
      );
    }

    // Parse & validate body
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Érvénytelen kérés.", details: parsed.error.issues },
        { status: 400 }
      );
    }
    const input = parsed.data;

    // Compute periods
    let currentStart: string;
    let currentEnd: string;
    let comparisonStart: string;
    let comparisonEnd: string;
    let monthBucket: string | null = null;

    if (input.mode === "monthly") {
      monthBucket = input.monthBucket;
      const current = getMonthRange(input.monthBucket);
      const comparison = getPreviousMonthRange(input.monthBucket);
      currentStart = current.start;
      currentEnd = current.end;
      comparisonStart = comparison.start;
      comparisonEnd = comparison.end;
    } else {
      currentStart = input.currentPeriodStart;
      currentEnd = input.currentPeriodEnd;
      comparisonStart = input.comparisonPeriodStart;
      comparisonEnd = input.comparisonPeriodEnd;

      // Validate dates
      if (currentStart > currentEnd) {
        return NextResponse.json(
          { error: "Az aktuális periódus kezdete nem lehet későbbi a végénél." },
          { status: 400 }
        );
      }
      if (comparisonStart > comparisonEnd) {
        return NextResponse.json(
          {
            error:
              "Az összehasonlítási periódus kezdete nem lehet későbbi a végénél.",
          },
          { status: 400 }
        );
      }
      // Check overlap
      if (currentStart <= comparisonEnd && comparisonStart <= currentEnd) {
        return NextResponse.json(
          {
            error:
              "Az aktuális és összehasonlítási periódus nem fedhetik egymást.",
          },
          { status: 400 }
        );
      }
    }

    // Fetch client
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("*")
      .eq("id", input.clientId)
      .single();

    if (clientError || !client) {
      return NextResponse.json(
        { error: "Ügyfél nem található." },
        { status: 404 }
      );
    }

    // Fetch active connections with platform
    const { data: connections } = await supabase
      .from("client_connections")
      .select("*, platform:platforms(*)")
      .eq("client_id", input.clientId)
      .eq("is_active", true);

    const typedConnections = (connections ?? []) as (ClientConnection & {
      platform: Platform;
    })[];

    if (typedConnections.length === 0) {
      return NextResponse.json(
        { error: "Az ügyfélhez nincs aktív platform csatlakozás." },
        { status: 400 }
      );
    }

    // Fetch & upsert metrics for each connection
    const deltaPayloads: DeltaPayload[] = [];

    for (const conn of typedConnections) {
      const adapter = getAdapter(conn.platform.slug);

      // Fetch data from Windsor.ai
      const [currentData, comparisonData] = await Promise.all([
        fetchPlatformData(
          conn.platform,
          conn.account_id,
          currentStart,
          currentEnd
        ),
        fetchPlatformData(
          conn.platform,
          conn.account_id,
          comparisonStart,
          comparisonEnd
        ),
      ]);

      // Normalize
      const currentAccountRow = currentData.accountRows[0] ?? {};
      const comparisonAccountRow = comparisonData.accountRows[0] ?? {};

      const currentMetrics = adapter.normalizeAccountRow(currentAccountRow);
      const comparisonMetrics = adapter.normalizeAccountRow(
        comparisonAccountRow
      );

      const currentCampaigns = adapter.normalizeCampaignRows(
        currentData.campaignRows,
        conn.platform.fields_config
      );
      const comparisonCampaigns = adapter.normalizeCampaignRows(
        comparisonData.campaignRows,
        conn.platform.fields_config
      );

      // Upsert period_metrics
      const [currentPM, comparisonPM] = await Promise.all([
        upsertPeriodMetrics(
          supabase,
          input.clientId,
          conn.id,
          currentStart,
          currentEnd,
          currentMetrics,
          currentCampaigns
        ),
        upsertPeriodMetrics(
          supabase,
          input.clientId,
          conn.id,
          comparisonStart,
          comparisonEnd,
          comparisonMetrics,
          comparisonCampaigns
        ),
      ]);

      // Build delta payload
      const payload = buildDeltaPayload(
        currentPM,
        comparisonPM,
        conn.platform,
        client.type,
        conn.id
      );
      deltaPayloads.push(payload);
    }

    // Create/update report (SELECT → INSERT/UPDATE for partial unique indexes)
    let reportId: string;

    if (input.mode === "monthly") {
      const { data: existing } = await supabase
        .from("reports")
        .select("id")
        .eq("client_id", input.clientId)
        .eq("mode", "monthly")
        .eq("month_bucket", monthBucket!)
        .single();

      if (existing) {
        reportId = existing.id;
        await supabase
          .from("reports")
          .update({
            current_period_start: currentStart,
            current_period_end: currentEnd,
            comparison_period_start: comparisonStart,
            comparison_period_end: comparisonEnd,
            template_type: client.type,
            status: "draft",
            last_generated_at: new Date().toISOString(),
          })
          .eq("id", reportId);
      } else {
        const { data: newReport, error: reportError } = await supabase
          .from("reports")
          .insert({
            client_id: input.clientId,
            mode: "monthly",
            month_bucket: monthBucket,
            current_period_start: currentStart,
            current_period_end: currentEnd,
            comparison_period_start: comparisonStart,
            comparison_period_end: comparisonEnd,
            template_type: client.type,
            status: "draft",
          })
          .select("id")
          .single();

        if (reportError || !newReport) {
          throw new Error(`Report létrehozás hiba: ${reportError?.message}`);
        }
        reportId = newReport.id;
      }
    } else {
      const { data: existing } = await supabase
        .from("reports")
        .select("id")
        .eq("client_id", input.clientId)
        .eq("mode", "custom")
        .eq("current_period_start", currentStart)
        .eq("current_period_end", currentEnd)
        .eq("comparison_period_start", comparisonStart)
        .eq("comparison_period_end", comparisonEnd)
        .single();

      if (existing) {
        reportId = existing.id;
        await supabase
          .from("reports")
          .update({
            template_type: client.type,
            status: "draft",
            last_generated_at: new Date().toISOString(),
          })
          .eq("id", reportId);
      } else {
        const { data: newReport, error: reportError } = await supabase
          .from("reports")
          .insert({
            client_id: input.clientId,
            mode: "custom",
            month_bucket: null,
            current_period_start: currentStart,
            current_period_end: currentEnd,
            comparison_period_start: comparisonStart,
            comparison_period_end: comparisonEnd,
            template_type: client.type,
            status: "draft",
          })
          .select("id")
          .single();

        if (reportError || !newReport) {
          throw new Error(`Report létrehozás hiba: ${reportError?.message}`);
        }
        reportId = newReport.id;
      }
    }

    // Delete existing sections for this report (clean slate for regeneration)
    await supabase
      .from("report_sections")
      .delete()
      .eq("report_id", reportId);

    // Create report sections
    const sections: {
      report_id: string;
      connection_id: string | null;
      section_type: string;
      ai_generated_text: string | null;
      is_enabled: boolean;
      sort_order: number;
    }[] = [];

    // Platform analysis sections (one per connection)
    typedConnections.forEach((conn, i) => {
      sections.push({
        report_id: reportId,
        connection_id: conn.id,
        section_type: "platform_analysis",
        ai_generated_text: null,
        is_enabled: true,
        sort_order: i + 1,
      });
    });

    // Executive summary
    sections.push({
      report_id: reportId,
      connection_id: null,
      section_type: "executive_summary",
      ai_generated_text: null,
      is_enabled: true,
      sort_order: typedConnections.length + 1,
    });

    // Glossary — auto-populate from glossary_terms
    const { data: glossaryTerms } = await supabase
      .from("glossary_terms")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");

    const glossaryText = (glossaryTerms as GlossaryTerm[] | null)
      ?.map((t) => {
        const fullName = t.full_name ? ` (${t.full_name})` : "";
        return `**${t.term}**${fullName} — ${t.definition}`;
      })
      .join("\n\n") ?? "";

    sections.push({
      report_id: reportId,
      connection_id: null,
      section_type: "glossary",
      ai_generated_text: glossaryText,
      is_enabled: true,
      sort_order: typedConnections.length + 2,
    });

    const { error: sectionsError } = await supabase
      .from("report_sections")
      .insert(sections);

    if (sectionsError) {
      throw new Error(`Szekciók létrehozás hiba: ${sectionsError.message}`);
    }

    return NextResponse.json({ reportId, deltaPayloads });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Ismeretlen hiba történt.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
