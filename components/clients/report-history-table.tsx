import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CustomReportDialog } from "@/components/reports/custom-report-dialog";
import type { Report, Platform } from "@/lib/supabase/types";
import { formatDateShort } from "@/lib/utils/format";
import Link from "next/link";

export function ReportHistoryTable({
  reports,
  clientId,
  clientName,
  connections,
}: {
  reports: Report[];
  clientId: string;
  clientName: string;
  connections: Array<{ platform: Platform }>;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Riport előzmények</CardTitle>
        <CustomReportDialog
          clientId={clientId}
          clientName={clientName}
          connections={connections}
        />
      </CardHeader>
      <CardContent>
        {reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Még nincs riport ehhez az ügyfélhez.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Típus</TableHead>
                <TableHead>Aktuális periódus</TableHead>
                <TableHead>Összehasonlítás</TableHead>
                <TableHead>Státusz</TableHead>
                <TableHead>Létrehozás</TableHead>
                <TableHead>Utolsó PDF</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>
                    <Badge variant="secondary">
                      {report.mode === "monthly" ? "Havi" : "Egyedi"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/clients/${clientId}/reports/${report.id}`}
                      className="hover:underline"
                    >
                      {formatDateShort(report.current_period_start)} –{" "}
                      {formatDateShort(report.current_period_end)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {formatDateShort(report.comparison_period_start)} –{" "}
                    {formatDateShort(report.comparison_period_end)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        report.status === "completed" ? "default" : "outline"
                      }
                    >
                      {report.status === "completed" ? "Kész" : "Piszkozat"}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDateShort(report.created_at)}</TableCell>
                  <TableCell>
                    {formatDateShort(report.last_pdf_downloaded_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
