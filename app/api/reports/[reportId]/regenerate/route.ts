import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  fetchAndUpsertMetrics,
  generateAiTexts,
  reconcileSections,
  fetchGlossaryText,
  fetchSections,
  type GenerationResult,
} from "@/lib/reports/generate-report-service";
import type { PeriodDates } from "@/lib/ai/prompts";
import {
  normalizePlatform,
  type Report,
  type Client,
  type ClientConnection,
  type Platform,
} from "@/lib/supabase/types";

export async function POST(
  _req: NextRequest,
  ctx: RouteContext<"/api/reports/[reportId]/regenerate">
) {
  try {
    const { reportId } = await ctx.params;
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

    // Fetch report
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .select("*")
      .eq("id", reportId)
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

    // Fetch active connections
    const { data: connections } = await supabase
      .from("client_connections")
      .select("*, platform:platforms(*)")
      .eq("client_id", typedClient.id)
      .eq("is_active", true);

    const typedConnections = ((connections ?? []) as (ClientConnection & {
      platform: Platform;
    })[]).map((c) => ({ ...c, platform: normalizePlatform(c.platform) }));

    if (typedConnections.length === 0) {
      return NextResponse.json(
        { error: "Az ügyfélhez nincs aktív platform csatlakozás." },
        { status: 400 }
      );
    }

    const dates: PeriodDates = {
      currentStart: typedReport.current_period_start,
      currentEnd: typedReport.current_period_end,
      comparisonStart: typedReport.comparison_period_start,
      comparisonEnd: typedReport.comparison_period_end,
    };

    // Shared pipeline
    const deltaPayloads = await fetchAndUpsertMetrics(
      supabase,
      typedClient,
      typedConnections,
      dates
    );

    const { platformTexts, summaryText, aiErrors } = await generateAiTexts(
      deltaPayloads,
      typedClient,
      dates
    );

    const glossaryText = await fetchGlossaryText(supabase);

    await reconcileSections(
      supabase,
      reportId,
      typedConnections,
      platformTexts,
      summaryText,
      glossaryText
    );

    // Update report status
    const { error: updateError } = await supabase
      .from("reports")
      .update({
        status: "draft",
        last_generated_at: new Date().toISOString(),
      })
      .eq("id", reportId);

    if (updateError) {
      throw new Error(`Riport státusz frissítés hiba: ${updateError.message}`);
    }

    const sections = await fetchSections(supabase, reportId);

    const result: GenerationResult = { reportId, sections, aiErrors };
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ismeretlen hiba történt.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
