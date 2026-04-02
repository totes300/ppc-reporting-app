import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MonthlyGenerateDialog } from "@/components/reports/monthly-generate-dialog";
import type { DashboardClient } from "@/lib/queries/dashboard";

function statusBadge(report: DashboardClient["report"]) {
  if (!report) return <Badge variant="secondary">Nincs</Badge>;
  if (report.status === "completed")
    return <Badge variant="default">Kész</Badge>;
  return <Badge variant="outline">Piszkozat</Badge>;
}

function typeBadge(type: string) {
  return (
    <Badge variant="secondary">
      {type === "webshop" ? "Webshop" : "Szolgáltató"}
    </Badge>
  );
}

export function ClientStatusTable({
  data,
  monthBucket,
}: {
  data: DashboardClient[];
  monthBucket: string;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Ügyfél</TableHead>
          <TableHead>Típus</TableHead>
          <TableHead>Platformok</TableHead>
          <TableHead>Státusz</TableHead>
          <TableHead className="text-right">Akció</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 && (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground">
              Még nincs ügyfél. Hozz létre egyet a fenti gombbal.
            </TableCell>
          </TableRow>
        )}
        {data.map(({ client, connections, report }) => (
          <TableRow key={client.id}>
            <TableCell>
              <Link
                href={`/clients/${client.id}`}
                className="font-medium hover:underline"
              >
                {client.name}
              </Link>
            </TableCell>
            <TableCell>{typeBadge(client.type)}</TableCell>
            <TableCell>
              <div className="flex gap-1">
                {connections.map((c) => (
                  <span
                    key={c.id}
                    className="flex size-6 items-center justify-center rounded text-xs font-bold text-white"
                    style={{ backgroundColor: c.platform.icon_color }}
                    title={c.platform.display_name}
                  >
                    {c.platform.icon_letter}
                  </span>
                ))}
                {connections.length === 0 && (
                  <span className="text-sm text-muted-foreground">–</span>
                )}
              </div>
            </TableCell>
            <TableCell>{statusBadge(report)}</TableCell>
            <TableCell className="text-right">
              {report ? (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/clients/${client.id}/reports/${report.id}`}>
                    Szerkesztés
                  </Link>
                </Button>
              ) : connections.length > 0 ? (
                <MonthlyGenerateDialog
                  clientId={client.id}
                  clientName={client.name}
                  monthBucket={monthBucket}
                  connections={connections}
                />
              ) : (
                <Button variant="default" size="sm" disabled>
                  Generálás
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
