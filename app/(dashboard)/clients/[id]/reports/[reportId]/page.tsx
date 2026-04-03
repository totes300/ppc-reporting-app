import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getReportById, getReportSections } from "@/lib/queries/reports";
import { getClientById, getClientConnections } from "@/lib/queries/clients";
import { buildDeltaPayload } from "@/lib/reports/build-report-payload";
import type { PeriodMetrics } from "@/lib/supabase/types";
import {
  ReportEditor,
  type ReportSectionWithData,
} from "@/components/reports/report-editor";

export default async function ReportPage(props: {
  params: Promise<{ id: string; reportId: string }>;
}) {
  const { id, reportId } = await props.params;

  // Parallel fetch — no waterfall
  const [client, report, sections, connections] = await Promise.all([
    getClientById(id),
    getReportById(reportId),
    getReportSections(reportId),
    getClientConnections(id),
  ]);

  if (!client || !report) notFound();

  // Batch fetch all period_metrics for platform sections in one query
  const connectionIds = sections
    .filter((s) => s.section_type === "platform_analysis" && s.connection_id)
    .map((s) => s.connection_id!);

  let allMetrics: PeriodMetrics[] = [];
  if (connectionIds.length > 0) {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase
      .from("period_metrics")
      .select("*")
      .in("connection_id", connectionIds)
      .or(
        `and(period_start.eq.${report.current_period_start},period_end.eq.${report.current_period_end}),and(period_start.eq.${report.comparison_period_start},period_end.eq.${report.comparison_period_end})`
      );
    allMetrics = (data as PeriodMetrics[]) ?? [];
  }

  // Build lookup: connectionId+periodStart+periodEnd → PeriodMetrics
  const metricsMap = new Map<string, PeriodMetrics>();
  for (const m of allMetrics) {
    metricsMap.set(`${m.connection_id}:${m.period_start}:${m.period_end}`, m);
  }

  const connectionMap = new Map(connections.map((c) => [c.id, c]));

  // Enrich sections with delta payloads
  const enrichedSections: ReportSectionWithData[] = sections.map((section) => {
    if (
      section.section_type === "platform_analysis" &&
      section.connection_id
    ) {
      const conn = connectionMap.get(section.connection_id);
      if (!conn) return { section };

      const currentMetrics = metricsMap.get(
        `${section.connection_id}:${report.current_period_start}:${report.current_period_end}`
      );
      const comparisonMetrics = metricsMap.get(
        `${section.connection_id}:${report.comparison_period_start}:${report.comparison_period_end}`
      );

      if (currentMetrics && comparisonMetrics) {
        // CRITICAL: use report.template_type, NOT client.type
        const deltaPayload = buildDeltaPayload(
          currentMetrics,
          comparisonMetrics,
          conn.platform,
          report.template_type,
          conn.id
        );

        const comparisonCampaigns =
          (comparisonMetrics.extra_data.campaigns as Record<
            string,
            unknown
          >[]) ?? [];

        return {
          section,
          deltaPayload,
          comparisonCampaigns,
          campaignColumns:
            conn.platform.fields_config.campaign_table[report.template_type],
          fieldsConfig: conn.platform.fields_config,
          templateType: report.template_type,
          platformIcon: {
            color: conn.platform.icon_color,
            letter: conn.platform.icon_letter,
          },
        };
      }
    }

    return { section };
  });

  return (
    <div className="flex flex-col gap-6 px-4 py-4 md:py-6 lg:px-6">
      <ReportEditor
        report={report}
        clientName={client.name}
        clientId={id}
        sections={enrichedSections}
      />
    </div>
  );
}
