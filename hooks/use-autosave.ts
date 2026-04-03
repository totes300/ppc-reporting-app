"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useDebouncedCallback } from "use-debounce";
import { createClient } from "@/lib/supabase/client";

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

export function useAutosave(
  reportId: string,
  sectionId: string,
  initialText: string
) {
  const [text, setTextState] = useState(initialText);
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const supabaseRef = useRef(createClient());

  // Use refs to avoid stale closures in the debounced callback
  const sectionIdRef = useRef(sectionId);
  const reportIdRef = useRef(reportId);
  useEffect(() => {
    sectionIdRef.current = sectionId;
  }, [sectionId]);
  useEffect(() => {
    reportIdRef.current = reportId;
  }, [reportId]);

  const save = useDebouncedCallback(async (value: string) => {
    try {
      setStatus("saving");
      const supabase = supabaseRef.current;

      const { error: sectionError } = await supabase
        .from("report_sections")
        .update({ edited_text: value })
        .eq("id", sectionIdRef.current);

      if (sectionError) throw sectionError;

      const { error: reportError } = await supabase
        .from("reports")
        .update({ status: "draft" as const })
        .eq("id", reportIdRef.current);

      if (reportError) throw reportError;

      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }, 2000);

  // Cancel pending save + reset when initialText changes (e.g. after regeneration)
  useEffect(() => {
    save.cancel();
    setTextState(initialText);
    setStatus("idle");
  }, [initialText, save]);

  const setText = useCallback(
    (value: string) => {
      setTextState(value);
      save(value);
    },
    [save]
  );

  // Flush on unmount
  useEffect(() => {
    return () => {
      save.flush();
    };
  }, [save]);

  return { text, setText, status };
}
