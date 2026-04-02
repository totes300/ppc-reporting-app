"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  GenerationProgress,
  type ProgressStep,
} from "@/components/reports/generation-progress";
import { formatDateShort } from "@/lib/utils/format";
import { getMonthRange, getPreviousMonthRange } from "@/lib/utils/dates";
import type { Platform } from "@/lib/supabase/types";

type Props = {
  clientId: string;
  clientName: string;
  monthBucket: string;
  connections: Array<{ platform: Platform }>;
};

type Phase = "confirm" | "generating" | "done" | "error";

const initialSteps: ProgressStep[] = [
  { label: "Adatok lehúzása", status: "waiting" },
  { label: "AI szövegek generálása", status: "waiting" },
  { label: "Riport frissítése", status: "waiting" },
];

export function MonthlyGenerateDialog({
  clientId,
  clientName,
  monthBucket,
  connections,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("confirm");
  const [steps, setSteps] = useState<ProgressStep[]>(initialSteps);
  const current = getMonthRange(monthBucket);
  const comparison = getPreviousMonthRange(monthBucket);

  const reset = useCallback(() => {
    setPhase("confirm");
    setSteps(initialSteps);
  }, []);

  async function handleGenerate() {
    setPhase("generating");
    setSteps([
      { label: "Adatok lehúzása", status: "in_progress" },
      { label: "AI szövegek generálása", status: "waiting" },
      { label: "Riport frissítése", status: "waiting" },
    ]);

    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          mode: "monthly",
          monthBucket,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Ismeretlen hiba történt.");
      }

      const { reportId } = await res.json();

      // Step 1 done, step 2 skipped (Phase 4), step 3 done
      setSteps([
        { label: "Adatok lehúzása", status: "done" },
        { label: "AI szövegek generálása", status: "done" },
        { label: "Riport frissítése", status: "done" },
      ]);
      setPhase("done");

      // Redirect after brief delay
      setTimeout(() => {
        setOpen(false);
        router.push(`/clients/${clientId}/reports/${reportId}`);
        router.refresh();
      }, 500);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Ismeretlen hiba történt.";
      setSteps((prev) =>
        prev.map((s) =>
          s.status === "in_progress"
            ? { ...s, status: "error", errorMessage: msg }
            : s
        )
      );
      setPhase("error");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="default" size="sm">
          Generálás
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Havi riport generálása</DialogTitle>
          <DialogDescription>{clientName}</DialogDescription>
        </DialogHeader>

        {phase === "confirm" && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-muted-foreground">Aktuális periódus</div>
              <div>
                {formatDateShort(current.start)} –{" "}
                {formatDateShort(current.end)}
              </div>
              <div className="text-muted-foreground">Összehasonlítás</div>
              <div>
                {formatDateShort(comparison.start)} –{" "}
                {formatDateShort(comparison.end)}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {connections.map((c) => (
                <span
                  key={c.platform.id}
                  className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-sm"
                >
                  <span
                    className="flex size-5 items-center justify-center rounded text-xs font-bold text-white"
                    style={{ backgroundColor: c.platform.icon_color }}
                  >
                    {c.platform.icon_letter}
                  </span>
                  {c.platform.display_name}
                </span>
              ))}
            </div>
            <Button onClick={handleGenerate}>Generálás</Button>
          </div>
        )}

        {(phase === "generating" || phase === "done") && (
          <GenerationProgress steps={steps} />
        )}

        {phase === "error" && (
          <div className="flex flex-col gap-4">
            <GenerationProgress steps={steps} />
            <Button variant="outline" onClick={reset}>
              Újra próbálom
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
