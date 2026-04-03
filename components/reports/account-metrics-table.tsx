import { Fragment } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { AccountMetric } from "@/lib/reports/build-report-payload";
import type { MetricFormat } from "@/lib/supabase/types";
import {
  formatNumber,
  formatCurrency,
  formatPercent,
  formatMultiplier,
} from "@/lib/utils/format";

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

const GROUP_LABELS: Record<string, string> = {
  forgalom: "Forgalom",
  konverziok: "Konverziók",
  pozicio: "Pozíció",
};

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

export function AccountMetricsTable({
  metrics,
}: {
  metrics: AccountMetric[];
}) {
  // Group metrics by group field, preserving order
  const groups: { name: string; items: AccountMetric[] }[] = [];
  const groupMap = new Map<string, AccountMetric[]>();

  for (const m of metrics) {
    let items = groupMap.get(m.group);
    if (!items) {
      items = [];
      groupMap.set(m.group, items);
      groups.push({ name: m.group, items });
    }
    items.push(m);
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Mutató</TableHead>
            <TableHead className="text-right">Aktuális</TableHead>
            <TableHead className="text-right">Előző</TableHead>
            <TableHead className="text-right">Δ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((group) => (
            <Fragment key={group.name}>
              <TableRow className="bg-muted/50">
                <TableCell
                  colSpan={4}
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {GROUP_LABELS[group.name] ?? group.name}
                </TableCell>
              </TableRow>
              {group.items.map((m) => {
                const fmt = getFormatter(m.format);
                return (
                  <TableRow key={m.field}>
                    <TableCell className="font-medium">{m.label}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmt(m.current)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmt(m.previous)}
                    </TableCell>
                    <TableCell
                      className={cn("text-right tabular-nums font-medium", toneClass(m.delta.tone))}
                    >
                      {m.delta.label}
                    </TableCell>
                  </TableRow>
                );
              })}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
