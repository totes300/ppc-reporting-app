"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const settingsSchema = z.object({
  name: z.string().min(1, "Ügynökség nevének megadása kötelező"),
  primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Érvénytelen szín"),
});

export async function saveAgencySettings(formData: FormData) {
  const parsed = settingsSchema.safeParse({
    name: formData.get("name"),
    primary_color: formData.get("primary_color"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createServerSupabaseClient();
  const logoFile = formData.get("logo") as File | null;

  let logoUrl: string | undefined;

  if (logoFile && logoFile.size > 0) {
    const path = "agency/logo";
    const { error: uploadError } = await supabase.storage
      .from("logos")
      .upload(path, logoFile, {
        upsert: true,
        contentType: logoFile.type,
      });

    if (uploadError) return { error: "Nem sikerült feltölteni a logót." };

    const {
      data: { publicUrl },
    } = supabase.storage.from("logos").getPublicUrl(path);

    logoUrl = publicUrl;
  }

  // Fetch existing row to get its ID (single-row table)
  const { data: existing } = await supabase
    .from("agency_settings")
    .select("id")
    .limit(1)
    .single();

  const payload = {
    name: parsed.data.name,
    primary_color: parsed.data.primary_color,
    ...(logoUrl ? { logo_url: logoUrl } : {}),
  };

  const { error } = existing
    ? await supabase
        .from("agency_settings")
        .update(payload)
        .eq("id", existing.id)
    : await supabase.from("agency_settings").insert(payload);

  if (error) return { error: "Nem sikerült menteni a beállításokat." };

  revalidatePath("/", "layout");
  return { success: true };
}
