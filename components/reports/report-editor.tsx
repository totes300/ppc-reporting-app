"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, FileDown, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { formatDateShort } from "@/lib/utils/format";
import type {
  Report,
  ReportSection,
  PlatformFieldsConfig,
  ClientType,
} from "@/lib/supabase/types";
import type { DeltaPayload } from "@/lib/reports/build-report-payload";
import { AccountMetricsTable } from "./account-metrics-table";
import { CampaignTable } from "./campaign-table";
import { TextEditor } from "./text-editor";
import { SectionCard } from "./section-card";
import {
  GenerationProgress,
  type ProgressStep,
} from "./generation-progress";

// ── Types ────────────────────────────────────────────────────────

export type ReportSectionWithData = {
  section: ReportSection;
  deltaPayload?: DeltaPayload;
  comparisonCampaigns?: Record<string, unknown>[];
  campaignColumns?: string[];
  fieldsConfig?: PlatformFieldsConfig;
  templateType?: ClientType;
  platformIcon?: { color: string; letter: string };
};

type ReportEditorProps = {
  report: Report;
  clientName: string;
  clientId: string;
  sections: ReportSectionWithData[];
};

// ── Helpers ──────────────────────────────────────────────────────

function getDisplayText(section: ReportSection): string {
  return section.edited_text ?? section.ai_generated_text ?? "";
}

function PlatformIcon({ color, letter }: { color: string; letter: string }) {
  return (
    <span
      className="inline-flex size-6 items-center justify-center rounded text-xs font-bold text-white"
      style={{ backgroundColor: color }}
    >
      {letter}
    </span>
  );
}

function renderGlossary(text: string) {
  return text.split("\n\n").map((paragraph, i) => {
    const parts = paragraph.split(/\*\*(.*?)\*\*/g);
    return (
      <p key={i} className="text-sm leading-relaxed">
        {parts.map((part, j) =>
          j % 2 === 1 ? <strong key={j}>{part}</strong> : part
        )}
      </p>
    );
  });
}

// ── Component ────────────────────────────────────────────────────

export function ReportEditor({
  report: initialReport,
  clientName,
  clientId,
  sections: initialSections,
}: ReportEditorProps) {
  const [report, setReport] = useState(initialReport);
  const [sections, setSections] = useState(initialSections);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenSteps, setRegenSteps] = useState<ProgressStep[]>([]);
  const supabaseRef = useRef(createClient());

  const hasAnyEdited = sections.some((s) => s.section.edited_text !== null);

  // ── Handlers ─────────────────────────────────────────────────

  const handleDraftChange = useCallback(() => {
    setReport((prev) => ({ ...prev, status: "draft" }));
  }, []);

  const handleToggle = useCallback(
    async (sectionId: string, enabled: boolean) => {
      // Optimistic update
      setSections((prev) =>
        prev.map((s) =>
          s.section.id === sectionId
            ? { ...s, section: { ...s.section, is_enabled: enabled } }
            : s
        )
      );
      setReport((prev) => ({ ...prev, status: "draft" }));

      const supabase = supabaseRef.current;
      const { error: sectionError } = await supabase
        .from("report_sections")
        .update({ is_enabled: enabled })
        .eq("id", sectionId);

      if (sectionError) {
        toast.error("Szekció kapcsoló mentés hiba.");
        // Revert
        setSections((prev) =>
          prev.map((s) =>
            s.section.id === sectionId
              ? { ...s, section: { ...s.section, is_enabled: !enabled } }
              : s
          )
        );
        return;
      }

      const { error: reportError } = await supabase
        .from("reports")
        .update({ status: "draft" })
        .eq("id", report.id);

      if (reportError) {
        toast.error("Riport státusz frissítés sikertelen.");
      }
    },
    [report.id]
  );

  const handleRegenerated = useCallback(
    (updatedSection: ReportSection) => {
      setSections((prev) =>
        prev.map((s) =>
          s.section.id === updatedSection.id
            ? { ...s, section: updatedSection }
            : s
        )
      );
      setReport((prev) => ({ ...prev, status: "draft" }));
    },
    []
  );

  async function handleFullRegenerate() {
    setIsRegenerating(true);
    setRegenSteps([
      { label: "Adatok lekérése és metrikák frissítése", status: "in_progress" },
      { label: "AI szövegek generálása", status: "waiting" },
      { label: "Szekciók mentése", status: "waiting" },
    ]);

    try {
      const res = await fetch(`/api/reports/${report.id}/regenerate`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Újragenerálás sikertelen.");
      }

      setRegenSteps([
        { label: "Adatok lekérése és metrikák frissítése", status: "done" },
        { label: "AI szövegek generálása", status: "done" },
        { label: "Szekciók mentése", status: "done" },
      ]);

      const data = await res.json();
      const updatedSections = data.sections as ReportSection[];

      // Merge updated sections into existing enriched data
      setSections((prev) =>
        prev.map((s) => {
          const updated = updatedSections.find(
            (u) => u.id === s.section.id
          );
          return updated ? { ...s, section: updated } : s;
        })
      );

      setReport((prev) => ({ ...prev, status: "draft" }));

      if (data.aiErrors?.length > 0) {
        toast.warning(`Részleges siker: ${data.aiErrors.join(", ")}`);
      } else {
        toast.success("Riport újragenerálva.");
      }

      setTimeout(() => setIsRegenerating(false), 800);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Ismeretlen hiba.";
      setRegenSteps((prev) =>
        prev.map((s) =>
          s.status === "waiting" || s.status === "in_progress"
            ? { ...s, status: "error", errorMessage: message }
            : s
        )
      );
      toast.error(message);
    }
  }

  const hasRegenError = regenSteps.some((s) => s.status === "error");

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/clients/${clientId}`}>
              <ArrowLeft className="mr-1 size-4" />
              Vissza
            </Link>
          </Button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold font-[family-name:var(--font-heading)]">
              {clientName}
            </h1>
            <Badge variant="secondary">
              {report.mode === "monthly" ? "Havi" : "Egyedi"}
            </Badge>
            <Badge variant={report.status === "completed" ? "default" : "outline"}>
              {report.status === "completed" ? "Kész" : "Piszkozat"}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              <FileDown className="mr-1.5 size-4" />
              PDF letöltés
            </Button>

            {hasAnyEdited ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isRegenerating}>
                    <RefreshCw className="mr-1.5 size-4" />
                    Teljes újragenerálás
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Teljes újragenerálás</AlertDialogTitle>
                    <AlertDialogDescription>
                      A teljes újragenerálás felülírja a számadatokat és törli a
                      kézi szövegszerkesztéseket. Folytatod?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Mégse</AlertDialogCancel>
                    <AlertDialogAction onClick={handleFullRegenerate}>
                      Újragenerálás
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <Button
                variant="outline"
                size="sm"
                disabled={isRegenerating}
                onClick={handleFullRegenerate}
              >
                {isRegenerating ? (
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1.5 size-4" />
                )}
                Teljes újragenerálás
              </Button>
            )}
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          {formatDateShort(report.current_period_start)} –{" "}
          {formatDateShort(report.current_period_end)}
          <span className="mx-2">vs.</span>
          {formatDateShort(report.comparison_period_start)} –{" "}
          {formatDateShort(report.comparison_period_end)}
        </p>
      </div>

      {/* Full regeneration progress dialog */}
      <Dialog
        open={isRegenerating}
        onOpenChange={(open) => {
          if (!open && hasRegenError) setIsRegenerating(false);
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Újragenerálás folyamatban…</DialogTitle>
            <DialogDescription className="sr-only">
              Az újragenerálás lépései és állapota
            </DialogDescription>
          </DialogHeader>
          <GenerationProgress steps={regenSteps} />
          {hasRegenError && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRegenerating(false)}
              >
                Bezárás
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Sections */}
      {sections.map((s) => {
        const { section } = s;

        if (section.section_type === "platform_analysis") {
          return (
            <SectionCard
              key={section.id}
              sectionId={section.id}
              title={s.deltaPayload?.platformName ?? "Platform"}
              icon={
                s.platformIcon ? (
                  <PlatformIcon
                    color={s.platformIcon.color}
                    letter={s.platformIcon.letter}
                  />
                ) : undefined
              }
              isEnabled={section.is_enabled}
              onToggle={handleToggle}
            >
              <div className="flex flex-col gap-6">
                {s.deltaPayload && (
                  <AccountMetricsTable metrics={s.deltaPayload.accountMetrics} />
                )}

                {s.deltaPayload &&
                  s.campaignColumns &&
                  s.fieldsConfig &&
                  s.templateType && (
                    <>
                      <Separator />
                      <CampaignTable
                        currentCampaigns={s.deltaPayload.topCampaigns}
                        comparisonCampaigns={s.comparisonCampaigns ?? []}
                        columns={s.campaignColumns}
                        fieldsConfig={s.fieldsConfig}
                        templateType={s.templateType}
                      />
                    </>
                  )}

                <Separator />

                <TextEditor
                  sectionId={section.id}
                  reportId={report.id}
                  initialText={getDisplayText(section)}
                  hasEditedText={section.edited_text !== null}
                  onRegenerated={handleRegenerated}
                  onDraftChange={handleDraftChange}
                />
              </div>
            </SectionCard>
          );
        }

        if (section.section_type === "executive_summary") {
          return (
            <SectionCard
              key={section.id}
              sectionId={section.id}
              title="Vezetői összefoglaló"
              isEnabled={section.is_enabled}
              onToggle={handleToggle}
            >
              <TextEditor
                sectionId={section.id}
                reportId={report.id}
                initialText={getDisplayText(section)}
                hasEditedText={section.edited_text !== null}
                onRegenerated={handleRegenerated}
                onDraftChange={handleDraftChange}
              />
            </SectionCard>
          );
        }

        if (section.section_type === "glossary") {
          return (
            <SectionCard
              key={section.id}
              sectionId={section.id}
              title="Szószedet"
              isEnabled={section.is_enabled}
              onToggle={handleToggle}
            >
              <div className="flex flex-col gap-3">
                {renderGlossary(getDisplayText(section))}
              </div>
            </SectionCard>
          );
        }

        return null;
      })}
    </div>
  );
}
