import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type {
  ClientType,
  MetricFormat,
  PlatformFieldsConfig,
} from "@/lib/supabase/types";
import { getDeltaPresentation } from "@/lib/reports/get-delta-presentation";
import {
  formatNumber,
  formatCurrency,
  formatPercent,
  formatMultiplier,
} from "@/lib/utils/format";

type CampaignTableProps = {
  currentCampaigns: Record<string, unknown>[];
  comparisonCampaigns: Record<string, unknown>[];
  columns: string[];
  fieldsConfig: PlatformFieldsConfig;
  templateType: ClientType;
};

function getFormatter(format: MetricFormat) {
  switch (format) {
    case "num":
      return formatNumber;
    case "huf":
      return formatCurrency;
    case "pct":
      return formatPercent;
    case "x":
      return formatMultiplier;
  }
}

function toneClass(tone: "good" | "bad" | "muted") {
  switch (tone) {
    case "good":
      return "text-green-600 dark:text-green-400";
    case "bad":
      return "text-red-600 dark:text-red-400";
    case "muted":
      return "text-muted-foreground";
  }
}

type FieldMeta = { label: string; format: MetricFormat; inverse: boolean };

function buildFieldMetaMap(
  fieldsConfig: PlatformFieldsConfig,
  templateType: ClientType
): Map<string, FieldMeta> {
  const map = new Map<string, FieldMeta>();
  for (const f of fieldsConfig.account_table[templateType]) {
    map.set(f.field, {
      label: f.label,
      format: f.format,
      inverse: f.inverse ?? false,
    });
  }
  return map;
}

function toNum(val: unknown): number | null {
  if (val == null || val === "") return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

const COLUMN_LABELS: Record<string, string> = {
  campaign: "Kampány",
};

export function CampaignTable({
  currentCampaigns,
  comparisonCampaigns,
  columns,
  fieldsConfig,
  templateType,
}: CampaignTableProps) {
  const fieldMeta = buildFieldMetaMap(fieldsConfig, templateType);

  // Build comparison lookup by campaign name
  const comparisonMap = new Map<string, Record<string, unknown>>();
  for (const row of comparisonCampaigns) {
    if (typeof row.campaign === "string") {
      comparisonMap.set(row.campaign, row);
    }
  }

  // Limit campaigns
  const limit = fieldsConfig.campaign_display.limit;
  const campaigns = currentCampaigns.slice(0, limit);

  // Data columns (exclude "campaign")
  const dataColumns = columns.filter((c) => c !== "campaign");

  if (campaigns.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        Nincs kampányadat.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[180px]">Kampány</TableHead>
            <TableHead className="min-w-[60px]" />
            {dataColumns.map((col) => {
              const meta = fieldMeta.get(col);
              return (
                <TableHead key={col} className="text-right whitespace-nowrap">
                  {meta?.label ?? COLUMN_LABELS[col] ?? col}
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.map((current, idx) => {
            const name = String(current.campaign ?? `#${idx + 1}`);
            const comparison = comparisonMap.get(name);

            return (
              <CampaignRows
                key={name}
                name={name}
                current={current}
                comparison={comparison}
                dataColumns={dataColumns}
                fieldMeta={fieldMeta}
              />
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function CampaignRows({
  name,
  current,
  comparison,
  dataColumns,
  fieldMeta,
}: {
  name: string;
  current: Record<string, unknown>;
  comparison: Record<string, unknown> | undefined;
  dataColumns: string[];
  fieldMeta: Map<string, FieldMeta>;
}) {
  return (
    <>
      {/* Current period row */}
      <TableRow>
        <TableCell rowSpan={3} className="align-top font-medium border-b-0">
          {name}
        </TableCell>
        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
          Aktuális
        </TableCell>
        {dataColumns.map((col) => {
          const meta = fieldMeta.get(col);
          const fmt = meta ? getFormatter(meta.format) : formatNumber;
          return (
            <TableCell key={col} className="text-right tabular-nums">
              {fmt(toNum(current[col]))}
            </TableCell>
          );
        })}
      </TableRow>

      {/* Previous period row */}
      <TableRow className="bg-muted/30">
        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
          Előző
        </TableCell>
        {dataColumns.map((col) => {
          const meta = fieldMeta.get(col);
          const fmt = meta ? getFormatter(meta.format) : formatNumber;
          return (
            <TableCell
              key={col}
              className="text-right tabular-nums text-muted-foreground"
            >
              {comparison ? fmt(toNum(comparison[col])) : "–"}
            </TableCell>
          );
        })}
      </TableRow>

      {/* Delta row */}
      <TableRow className="bg-muted/30 border-b-2">
        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
          Δ
        </TableCell>
        {dataColumns.map((col) => {
          const meta = fieldMeta.get(col);
          const curVal = toNum(current[col]);
          const prevVal = comparison ? toNum(comparison[col]) : null;
          const delta = getDeltaPresentation(
            curVal,
            prevVal,
            meta?.inverse ?? false
          );
          return (
            <TableCell
              key={col}
              className={cn("text-right tabular-nums font-medium", toneClass(delta.tone))}
            >
              {delta.label}
            </TableCell>
          );
        })}
      </TableRow>
    </>
  );
}
