import { Progress } from "@/components/ui/progress";

export function ProgressBar({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline gap-1 text-sm text-muted-foreground">
        <span className="text-lg font-semibold text-foreground">
          {completed} / {total}
        </span>{" "}
        kész
      </div>
      <Progress value={pct} className="h-2" aria-label={`${completed} / ${total} kész`} />
    </div>
  );
}
