import { MonthSelector } from "@/components/dashboard/month-selector";
import { ProgressBar } from "@/components/dashboard/progress-bar";
import { ClientStatusTable } from "@/components/dashboard/client-status-table";
import { NewClientDialog } from "@/components/dashboard/new-client-dialog";
import { getDashboardData } from "@/lib/queries/dashboard";
import { getDefaultMonth } from "@/lib/utils/dates";

export default async function DashboardPage(props: {
  searchParams: Promise<{ month?: string }>;
}) {
  const searchParams = await props.searchParams;
  const monthBucket = searchParams.month ?? getDefaultMonth();
  const data = await getDashboardData(monthBucket);

  const completed = data.filter(
    (d) => d.report?.status === "completed"
  ).length;
  const total = data.length;

  return (
    <div className="flex flex-col gap-6 px-4 py-4 md:py-6 lg:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <MonthSelector monthBucket={monthBucket} />
        <NewClientDialog />
      </div>
      <ProgressBar completed={completed} total={total} />
      <ClientStatusTable data={data} monthBucket={monthBucket} />
    </div>
  );
}
