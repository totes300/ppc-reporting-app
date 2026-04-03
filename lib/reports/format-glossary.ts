import type { GlossaryTerm } from "@/lib/supabase/types";

export function formatGlossaryText(terms: GlossaryTerm[]): string {
  return terms
    .map((t) => {
      const fullName = t.full_name ? ` (${t.full_name})` : "";
      return `**${t.term}**${fullName} — ${t.definition}`;
    })
    .join("\n\n");
}
