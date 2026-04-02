import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Report, ReportSection, PeriodMetrics } from "@/lib/supabase/types";

export async function getReportById(
  reportId: string
): Promise<Report | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("reports")
    .select("*")
    .eq("id", reportId)
    .single();
  return data;
}

export async function getReportSections(
  reportId: string
): Promise<ReportSection[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("report_sections")
    .select("*")
    .eq("report_id", reportId)
    .order("sort_order");
  return data ?? [];
}

export async function getPeriodMetrics(
  connectionId: string,
  periodStart: string,
  periodEnd: string
): Promise<PeriodMetrics | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("period_metrics")
    .select("*")
    .eq("connection_id", connectionId)
    .eq("period_start", periodStart)
    .eq("period_end", periodEnd)
    .single();
  return data;
}
