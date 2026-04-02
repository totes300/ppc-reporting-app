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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  GenerationProgress,
  type ProgressStep,
} from "@/components/reports/generation-progress";
import { getDefaultMonth, getMonthRange, getPreviousMonthRange } from "@/lib/utils/dates";
import type { Platform } from "@/lib/supabase/types";
import { PlusIcon } from "lucide-react";

type Props = {
  clientId: string;
  clientName: string;
  connections: Array<{ platform: Platform }>;
};

type Phase = "form" | "generating" | "done" | "error";

const initialSteps: ProgressStep[] = [
  { label: "Adatok lehúzása", status: "waiting" },
  { label: "AI szövegek generálása", status: "waiting" },
  { label: "Riport frissítése", status: "waiting" },
];

export function CustomReportDialog({
  clientId,
  clientName,
  connections,
}: Props) {
  const router = useRouter();

  // Default periods: current = previous full month, comparison = month before
  const defaultMonth = getDefaultMonth();
  const defaultCurrent = getMonthRange(defaultMonth);
  const defaultComparison = getPreviousMonthRange(defaultMonth);

  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("form");
  const [steps, setSteps] = useState<ProgressStep[]>(initialSteps);
  const [validationError, setValidationError] = useState("");

  const [currentStart, setCurrentStart] = useState(defaultCurrent.start);
  const [currentEnd, setCurrentEnd] = useState(defaultCurrent.end);
  const [comparisonStart, setComparisonStart] = useState(
    defaultComparison.start
  );
  const [comparisonEnd, setComparisonEnd] = useState(defaultComparison.end);

  const reset = useCallback(() => {
    setPhase("form");
    setSteps(initialSteps);
    setValidationError("");
  }, []);

  function validate(): boolean {
    if (currentStart > currentEnd) {
      setValidationError(
        "Az aktuális periódus kezdete nem lehet későbbi a végénél."
      );
      return false;
    }
    if (comparisonStart > comparisonEnd) {
      setValidationError(
        "Az összehasonlítási periódus kezdete nem lehet későbbi a végénél."
      );
      return false;
    }
    if (currentStart <= comparisonEnd && comparisonStart <= currentEnd) {
      setValidationError(
        "Az aktuális és összehasonlítási periódus nem fedhetik egymást."
      );
      return false;
    }
    setValidationError("");
    return true;
  }

  async function handleGenerate() {
    if (!validate()) return;

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
          mode: "custom",
          currentPeriodStart: currentStart,
          currentPeriodEnd: currentEnd,
          comparisonPeriodStart: comparisonStart,
          comparisonPeriodEnd: comparisonEnd,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Ismeretlen hiba történt.");
      }

      const { reportId } = await res.json();

      setSteps([
        { label: "Adatok lehúzása", status: "done" },
        { label: "AI szövegek generálása", status: "done" },
        { label: "Riport frissítése", status: "done" },
      ]);
      setPhase("done");

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
        <Button variant="outline" size="sm">
          <PlusIcon className="size-4" />
          Új egyedi riport
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Egyedi riport generálása</DialogTitle>
          <DialogDescription>{clientName}</DialogDescription>
        </DialogHeader>

        {phase === "form" && (
          <div className="flex flex-col gap-4">
            <fieldset className="grid gap-3">
              <legend className="text-sm font-medium">
                Aktuális periódus
              </legend>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="cur-start">Kezdet</Label>
                  <Input
                    id="cur-start"
                    type="date"
                    value={currentStart}
                    onChange={(e) => setCurrentStart(e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="cur-end">Vége</Label>
                  <Input
                    id="cur-end"
                    type="date"
                    value={currentEnd}
                    onChange={(e) => setCurrentEnd(e.target.value)}
                  />
                </div>
              </div>
            </fieldset>

            <fieldset className="grid gap-3">
              <legend className="text-sm font-medium">
                Összehasonlítási periódus
              </legend>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="comp-start">Kezdet</Label>
                  <Input
                    id="comp-start"
                    type="date"
                    value={comparisonStart}
                    onChange={(e) => setComparisonStart(e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="comp-end">Vége</Label>
                  <Input
                    id="comp-end"
                    type="date"
                    value={comparisonEnd}
                    onChange={(e) => setComparisonEnd(e.target.value)}
                  />
                </div>
              </div>
            </fieldset>

            {validationError && (
              <p className="text-sm text-destructive">{validationError}</p>
            )}

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
