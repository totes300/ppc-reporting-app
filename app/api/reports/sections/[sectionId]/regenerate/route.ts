import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildDeltaPayload, type DeltaPayload } from "@/lib/reports/build-report-payload";
import { generatePlatformAnalysis } from "@/lib/ai/generate-analysis";
import { generateExecutiveSummary } from "@/lib/ai/generate-summary";
import { anthropic } from "@/lib/ai/client";
import {
  fetchGlossaryText,
  type GenerationResult,
} from "@/lib/reports/generate-report-service";
import type { PeriodDates } from "@/lib/ai/prompts";
import {
  normalizePlatform,
  type Report,
  type Client,
  type ReportSection,
  type ClientConnection,
  type Platform,
  type PeriodMetrics,
} from "@/lib/supabase/types";

export async function POST(
  _req: NextRequest,
  ctx: RouteContext<"/api/reports/sections/[sectionId]/regenerate">
) {
  try {
    const { sectionId } = await ctx.params;
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

    // Fetch section
    const { data: section, error: sectionError } = await supabase
      .from("report_sections")
      .select("*")
      .eq("id", sectionId)
      .single();

    if (sectionError || !section) {
      return NextResponse.json(
        { error: "Szekció nem található." },
        { status: 404 }
      );
    }

    const typedSection = section as ReportSection;

    // Fetch report
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .select("*")
      .eq("id", typedSection.report_id)
      .single();

    if (reportError || !report) {
      return NextResponse.json(
        { error: "Riport nem található." },
        { status: 404 }
      );
    }

    const typedReport = report as Report;

    // Fetch client
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("*")
      .eq("id", typedReport.client_id)
      .single();

    if (clientError || !client) {
      return NextResponse.json(
        { error: "Ügyfél nem található." },
        { status: 404 }
      );
    }

    const typedClient = client as Client;

    // AI availability check (glossary doesn't need AI)
    if (typedSection.section_type !== "glossary" && !anthropic) {
      return NextResponse.json(
        { error: "Az AI szöveggenerálás nem elérhető: ANTHROPIC_API_KEY nincs beállítva." },
        { status: 503 }
      );
    }

    const dates: PeriodDates = {
      currentStart: typedReport.current_period_start,
      currentEnd: typedReport.current_period_end,
      comparisonStart: typedReport.comparison_period_start,
      comparisonEnd: typedReport.comparison_period_end,
    };

    let newText: string | null = null;

    if (typedSection.section_type === "platform_analysis") {
      if (!typedSection.connection_id) {
        return NextResponse.json(
          { error: "Platform szekció connection_id hiányzik." },
          { status: 400 }
        );
      }

      const { data: connection, error: connError } = await supabase
        .from("client_connections")
        .select("*, platform:platforms(*)")
        .eq("id", typedSection.connection_id)
        .single();

      if (connError || !connection) {
        return NextResponse.json(
          { error: "Platform csatlakozás nem található." },
          { status: 404 }
        );
      }

      const rawConn = connection as ClientConnection & { platform: Platform };
      const typedConn = { ...rawConn, platform: normalizePlatform(rawConn.platform) };

      const [{ data: currentPM }, { data: comparisonPM }] = await Promise.all([
        supabase
          .from("period_metrics")
          .select("*")
          .eq("connection_id", typedConn.id)
          .eq("period_start", dates.currentStart)
          .eq("period_end", dates.currentEnd)
          .single(),
        supabase
          .from("period_metrics")
          .select("*")
          .eq("connection_id", typedConn.id)
          .eq("period_start", dates.comparisonStart)
          .eq("period_end", dates.comparisonEnd)
          .single(),
      ]);

      if (!currentPM || !comparisonPM) {
        return NextResponse.json(
          { error: "Metrikai adatok nem találhatók. Futtasd újra a generálást." },
          { status: 400 }
        );
      }

      const payload = buildDeltaPayload(
        currentPM as PeriodMetrics,
        comparisonPM as PeriodMetrics,
        typedConn.platform,
        typedClient.type,
        typedConn.id
      );

      newText = await generatePlatformAnalysis(
        payload,
        typedClient.type,
        typedClient.industry,
        dates
      );
    } else if (typedSection.section_type === "executive_summary") {
      const { data: connections } = await supabase
        .from("client_connections")
        .select("*, platform:platforms(*)")
        .eq("client_id", typedClient.id)
        .eq("is_active", true);

      const typedConnections = ((connections ?? []) as (ClientConnection & {
        platform: Platform;
      })[]).map((c) => ({ ...c, platform: normalizePlatform(c.platform) }));

      const deltaPayloads: DeltaPayload[] = [];

      for (const conn of typedConnections) {
        const [{ data: currentPM }, { data: comparisonPM }] = await Promise.all([
          supabase
            .from("period_metrics")
            .select("*")
            .eq("connection_id", conn.id)
            .eq("period_start", dates.currentStart)
            .eq("period_end", dates.currentEnd)
            .single(),
          supabase
            .from("period_metrics")
            .select("*")
            .eq("connection_id", conn.id)
            .eq("period_start", dates.comparisonStart)
            .eq("period_end", dates.comparisonEnd)
            .single(),
        ]);

        if (currentPM && comparisonPM) {
          deltaPayloads.push(
            buildDeltaPayload(
              currentPM as PeriodMetrics,
              comparisonPM as PeriodMetrics,
              conn.platform,
              typedClient.type,
              conn.id
            )
          );
        }
      }

      newText = await generateExecutiveSummary(
        deltaPayloads,
        typedClient.type,
        typedClient.industry,
        dates
      );
    } else if (typedSection.section_type === "glossary") {
      newText = await fetchGlossaryText(supabase);
    }

    // Update section with error checking
    const { error: updateSectionError } = await supabase
      .from("report_sections")
      .update({
        ai_generated_text: newText,
        edited_text: null,
      })
      .eq("id", sectionId);

    if (updateSectionError) {
      throw new Error(`Szekció frissítés hiba: ${updateSectionError.message}`);
    }

    // Set report status to draft
    const { error: updateReportError } = await supabase
      .from("reports")
      .update({ status: "draft" })
      .eq("id", typedReport.id);

    if (updateReportError) {
      throw new Error(`Riport státusz frissítés hiba: ${updateReportError.message}`);
    }

    // Fetch updated section for response
    const { data: updatedSection } = await supabase
      .from("report_sections")
      .select("*")
      .eq("id", sectionId)
      .single();

    return NextResponse.json({
      reportId: typedReport.id,
      sections: [updatedSection as ReportSection],
      aiErrors: [],
    } satisfies GenerationResult);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ismeretlen hiba történt.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
