"use client";

import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-12">
      <h2 className="text-lg font-semibold">Hiba történt</h2>
      <p className="text-sm text-muted-foreground">
        {error.message || "Váratlan hiba lépett fel."}
      </p>
      <Button onClick={reset}>Újrapróbálás</Button>
    </div>
  );
}
