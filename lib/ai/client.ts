import Anthropic from "@anthropic-ai/sdk";

export const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ timeout: 30_000, maxRetries: 2 })
  : null;

export const AI_MODEL =
  process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5-20250929";
