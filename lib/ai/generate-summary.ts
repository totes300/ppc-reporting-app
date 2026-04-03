import { anthropic, AI_MODEL } from "./client";
import {
  SYSTEM_PROMPT,
  buildExecutiveSummaryPrompt,
  type PeriodDates,
} from "./prompts";
import type { DeltaPayload } from "@/lib/reports/build-report-payload";
import type { ClientType } from "@/lib/supabase/types";

function hasAnyActivity(payloads: DeltaPayload[]): boolean {
  return payloads.some((p) =>
    p.accountMetrics.some((m) => m.current !== null && m.current !== 0)
  );
}

export async function generateExecutiveSummary(
  payloads: DeltaPayload[],
  clientType: ClientType,
  industry: string | null,
  dates: PeriodDates
): Promise<string | null> {
  if (!anthropic) return null;

  if (!hasAnyActivity(payloads)) return null;

  const response = await anthropic.messages.create({
    model: AI_MODEL,
    system: SYSTEM_PROMPT,
    max_tokens: 1024,
    temperature: 0.3,
    messages: [
      {
        role: "user",
        content: buildExecutiveSummaryPrompt(
          payloads,
          clientType,
          industry,
          dates
        ),
      },
    ],
  });

  if (response.stop_reason === "max_tokens") {
    console.warn("[AI] Executive summary truncated");
  }

  console.log(
    `[AI] Executive summary: ${response.usage.input_tokens} in / ${response.usage.output_tokens} out`
  );

  return response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
}
