import { anthropic, AI_MODEL } from "./client";
import {
  SYSTEM_PROMPT,
  buildPlatformAnalysisPrompt,
  type PeriodDates,
} from "./prompts";
import type { DeltaPayload } from "@/lib/reports/build-report-payload";
import type { ClientType } from "@/lib/supabase/types";

const NO_ACTIVITY_TEXT =
  "Az adott időszakban nem volt érdemi aktivitás ezen a platformon.";

function hasActivity(payload: DeltaPayload): boolean {
  return payload.accountMetrics.some(
    (m) => m.current !== null && m.current !== 0
  );
}

export async function generatePlatformAnalysis(
  payload: DeltaPayload,
  clientType: ClientType,
  industry: string | null,
  dates: PeriodDates
): Promise<string | null> {
  if (!anthropic) return null;

  if (!hasActivity(payload)) return NO_ACTIVITY_TEXT;

  const response = await anthropic.messages.create({
    model: AI_MODEL,
    system: SYSTEM_PROMPT,
    max_tokens: 1024,
    temperature: 0.3,
    messages: [
      {
        role: "user",
        content: buildPlatformAnalysisPrompt(
          payload,
          clientType,
          industry,
          dates
        ),
      },
    ],
  });

  if (response.stop_reason === "max_tokens") {
    console.warn(
      `[AI] Platform analysis truncated for ${payload.platformName}`
    );
  }

  console.log(
    `[AI] Platform analysis for ${payload.platformName}: ${response.usage.input_tokens} in / ${response.usage.output_tokens} out`
  );

  return response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
}
