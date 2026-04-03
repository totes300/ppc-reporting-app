import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getMonthRange, getPreviousMonthRange } from "@/lib/utils/dates";
import {
  fetchAndUpsertMetrics,
  generateAiTexts,
  createSections,
  fetchGlossaryText,
  fetchSections,
  type GenerationResult,
} from "@/lib/reports/generate-report-service";
import type { PeriodDates } from "@/lib/ai/prompts";
import {
  normalizePlatform,
  type Client,
  type ClientConnection,
  type Platform,
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

      if (currentStart > currentEnd) {
        return NextResponse.json(
          { error: "Az aktuális periódus kezdete nem lehet későbbi a végénél." },
          { status: 400 }
        );
      }
      if (comparisonStart > comparisonEnd) {
        return NextResponse.json(
          { error: "Az összehasonlítási periódus kezdete nem lehet későbbi a végénél." },
          { status: 400 }
        );
      }
      if (currentStart <= comparisonEnd && comparisonStart <= currentEnd) {
        return NextResponse.json(
          { error: "Az aktuális és összehasonlítási periódus nem fedhetik egymást." },
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
      return NextResponse.json({ error: "Ügyfél nem található." }, { status: 404 });
    }

    const typedClient = client as Client;

    // Fetch active connections
    const { data: connections } = await supabase
      .from("client_connections")
      .select("*, platform:platforms(*)")
      .eq("client_id", input.clientId)
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
      currentStart,
      currentEnd,
      comparisonStart,
      comparisonEnd,
    };

    // Create or update report shell
    const reportId = await upsertReportShell(
      supabase,
      input.clientId,
      input.mode,
      monthBucket,
      dates,
      typedClient.type
    );

    // Shared pipeline: fetch data → AI generation → create sections
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

    await createSections(
      supabase,
      reportId,
      typedConnections,
      platformTexts,
      summaryText,
      glossaryText
    );

    const sections = await fetchSections(supabase, reportId);

    const result: GenerationResult = { reportId, sections, aiErrors };
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ismeretlen hiba történt.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── Report shell creation (route-specific logic) ─────────────────

async function upsertReportShell(
  supabase: ReturnType<typeof createServerSupabaseClient> extends Promise<infer T> ? T : never,
  clientId: string,
  mode: "monthly" | "custom",
  monthBucket: string | null,
  dates: PeriodDates,
  templateType: string
): Promise<string> {
  if (mode === "monthly") {
    const { data: existing } = await supabase
      .from("reports")
      .select("id")
      .eq("client_id", clientId)
      .eq("mode", "monthly")
      .eq("month_bucket", monthBucket!)
      .single();

    if (existing) {
      const { error } = await supabase
        .from("reports")
        .update({
          current_period_start: dates.currentStart,
          current_period_end: dates.currentEnd,
          comparison_period_start: dates.comparisonStart,
          comparison_period_end: dates.comparisonEnd,
          template_type: templateType,
          status: "draft",
          last_generated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (error) throw new Error(`Riport frissítés hiba: ${error.message}`);
      return existing.id;
    }

    const { data: newReport, error } = await supabase
      .from("reports")
      .insert({
        client_id: clientId,
        mode: "monthly",
        month_bucket: monthBucket,
        current_period_start: dates.currentStart,
        current_period_end: dates.currentEnd,
        comparison_period_start: dates.comparisonStart,
        comparison_period_end: dates.comparisonEnd,
        template_type: templateType,
        status: "draft",
      })
      .select("id")
      .single();

    if (error || !newReport) {
      throw new Error(`Riport létrehozás hiba: ${error?.message}`);
    }
    return newReport.id;
  }

  // Custom mode
  const { data: existing } = await supabase
    .from("reports")
    .select("id")
    .eq("client_id", clientId)
    .eq("mode", "custom")
    .eq("current_period_start", dates.currentStart)
    .eq("current_period_end", dates.currentEnd)
    .eq("comparison_period_start", dates.comparisonStart)
    .eq("comparison_period_end", dates.comparisonEnd)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("reports")
      .update({
        template_type: templateType,
        status: "draft",
        last_generated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) throw new Error(`Riport frissítés hiba: ${error.message}`);
    return existing.id;
  }

  const { data: newReport, error } = await supabase
    .from("reports")
    .insert({
      client_id: clientId,
      mode: "custom",
      month_bucket: null,
      current_period_start: dates.currentStart,
      current_period_end: dates.currentEnd,
      comparison_period_start: dates.comparisonStart,
      comparison_period_end: dates.comparisonEnd,
      template_type: templateType,
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !newReport) {
    throw new Error(`Riport létrehozás hiba: ${error?.message}`);
  }
  return newReport.id;
}
