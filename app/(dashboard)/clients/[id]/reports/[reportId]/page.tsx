import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getReportById } from "@/lib/queries/reports";
import { getClientById } from "@/lib/queries/clients";
import { formatDateShort } from "@/lib/utils/format";

export default async function ReportPage(props: {
  params: Promise<{ id: string; reportId: string }>;
}) {
  const { id, reportId } = await props.params;

  const [client, report] = await Promise.all([
    getClientById(id),
    getReportById(reportId),
  ]);

  if (!client || !report) notFound();

  return (
    <div className="flex flex-col gap-6 px-4 py-4 md:py-6 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            Riport — {client.name}
            <Badge variant={report.status === "completed" ? "default" : "outline"}>
              {report.status === "completed" ? "Kész" : "Piszkozat"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-muted-foreground">Típus</div>
            <div>{report.mode === "monthly" ? "Havi" : "Egyedi"}</div>
            <div className="text-muted-foreground">Aktuális periódus</div>
            <div>
              {formatDateShort(report.current_period_start)} –{" "}
              {formatDateShort(report.current_period_end)}
            </div>
            <div className="text-muted-foreground">Összehasonlítás</div>
            <div>
              {formatDateShort(report.comparison_period_start)} –{" "}
              {formatDateShort(report.comparison_period_end)}
            </div>
          </div>
          <p className="mt-6 text-center text-muted-foreground">
            A riport szerkesztő a következő fázisban készül el.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
