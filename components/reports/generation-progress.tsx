"use client";

import { Loader2, Check, X, Clock } from "lucide-react";

export type StepStatus = "waiting" | "in_progress" | "done" | "error";

export type ProgressStep = {
  label: string;
  status: StepStatus;
  errorMessage?: string;
};

const statusIcon: Record<StepStatus, React.ReactNode> = {
  waiting: <Clock className="size-4 text-muted-foreground" />,
  in_progress: <Loader2 className="size-4 animate-spin text-primary" />,
  done: <Check className="size-4 text-green-600" />,
  error: <X className="size-4 text-destructive" />,
};

const statusText: Record<StepStatus, string> = {
  waiting: "Várakozik",
  in_progress: "Folyamatban…",
  done: "Kész",
  error: "Hiba",
};

export function GenerationProgress({ steps }: { steps: ProgressStep[] }) {
  return (
    <div className="flex flex-col gap-3">
      {steps.map((step) => (
        <div key={step.label} className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            {statusIcon[step.status]}
            <span
              className={
                step.status === "waiting" ? "text-muted-foreground" : ""
              }
            >
              {step.label}
            </span>
            <span className="ml-auto text-sm text-muted-foreground">
              {statusText[step.status]}
            </span>
          </div>
          {step.status === "error" && step.errorMessage && (
            <p className="ml-7 text-sm text-destructive">
              {step.errorMessage}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
