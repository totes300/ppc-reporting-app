import { notFound } from "next/navigation";
import { ClientForm } from "@/components/clients/client-form";
import { PlatformConnectionCard } from "@/components/clients/platform-connection-card";
import { ReportHistoryTable } from "@/components/clients/report-history-table";
import {
  getClientById,
  getClientConnections,
  getClientReports,
} from "@/lib/queries/clients";
import { getActivePlatforms } from "@/lib/queries/platforms";

export default async function ClientDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  const [client, connections, reports, platforms] = await Promise.all([
    getClientById(id),
    getClientConnections(id),
    getClientReports(id),
    getActivePlatforms(),
  ]);

  if (!client) notFound();

  return (
    <div className="flex flex-col gap-6 px-4 py-4 md:py-6 lg:px-6">
      <ClientForm client={client} />
      <PlatformConnectionCard
        clientId={id}
        connections={connections}
        platforms={platforms}
      />
      <ReportHistoryTable
        reports={reports}
        clientId={id}
        clientName={client.name}
        connections={connections}
      />
    </div>
  );
}
