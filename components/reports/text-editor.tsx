"use client";

import { useState } from "react";
import { RefreshCw, Check, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
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
import { useAutosave, type AutosaveStatus } from "@/hooks/use-autosave";
import type { ReportSection } from "@/lib/supabase/types";

type TextEditorProps = {
  sectionId: string;
  reportId: string;
  initialText: string;
  hasEditedText: boolean;
  onRegenerated: (section: ReportSection) => void;
  onDraftChange: () => void;
};

function SaveIndicator({ status }: { status: AutosaveStatus }) {
  switch (status) {
    case "saving":
      return (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          Mentés...
        </span>
      );
    case "saved":
      return (
        <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
          <Check className="size-3" />
          Mentve
        </span>
      );
    case "error":
      return (
        <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
          <AlertCircle className="size-3" />
          Hiba
        </span>
      );
    default:
      return null;
  }
}

export function TextEditor({
  sectionId,
  reportId,
  initialText,
  hasEditedText,
  onRegenerated,
  onDraftChange,
}: TextEditorProps) {
  const { text, setText, status } = useAutosave(reportId, sectionId, initialText);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Track whether user has edited since load (for confirmation logic)
  const needsConfirmation = hasEditedText || text !== initialText;

  async function handleRegenerate() {
    setIsRegenerating(true);
    try {
      const res = await fetch(
        `/api/reports/sections/${sectionId}/regenerate`,
        { method: "POST" }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Újragenerálás sikertelen.");
      }
      const data = await res.json();
      const updatedSection = data.sections[0] as ReportSection;
      onRegenerated(updatedSection);
      onDraftChange();
      toast.success("Szekció újragenerálva.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Ismeretlen hiba.";
      toast.error(message);
    } finally {
      setIsRegenerating(false);
    }
  }

  const regenerateButton = (
    <Button
      variant="outline"
      size="sm"
      disabled={isRegenerating}
      onClick={needsConfirmation ? undefined : handleRegenerate}
    >
      {isRegenerating ? (
        <Loader2 className="mr-1.5 size-3.5 animate-spin" />
      ) : (
        <RefreshCw className="mr-1.5 size-3.5" />
      )}
      Újragenerálás
    </Button>
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <SaveIndicator status={status} />
      </div>

      <Textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onDraftChange();
        }}
        disabled={isRegenerating}
        className="min-h-[200px] resize-y"
        placeholder="AI szöveg generálás alatt..."
      />

      <div className="flex justify-end">
        {needsConfirmation ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>{regenerateButton}</AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Szerkesztett szöveg felülírása</AlertDialogTitle>
                <AlertDialogDescription>
                  Az újragenerálás törli az adott szekció kézi szerkesztését.
                  Folytatod?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Mégse</AlertDialogCancel>
                <AlertDialogAction onClick={handleRegenerate}>
                  Újragenerálás
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          regenerateButton
        )}
      </div>
    </div>
  );
}
