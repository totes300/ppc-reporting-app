"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const createClientSchema = z.object({
  name: z.string().min(1, "Név megadása kötelező"),
  type: z.enum(["webshop", "szolgaltato"]),
  industry: z.string().optional(),
});

const updateClientSchema = z.object({
  name: z.string().min(1, "Név megadása kötelező"),
  type: z.enum(["webshop", "szolgaltato"]),
  industry: z.string().optional(),
  contact_email: z.email("Érvénytelen email cím").optional().or(z.literal("")),
  notes: z.string().optional(),
});

export async function createClient(formData: FormData) {
  const parsed = createClientSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    industry: formData.get("industry") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("clients").insert({
    name: parsed.data.name,
    type: parsed.data.type,
    industry: parsed.data.industry ?? null,
  });

  if (error) return { error: "Nem sikerült létrehozni az ügyfelet." };

  revalidatePath("/");
  return { success: true };
}

export async function updateClient(id: string, formData: FormData) {
  const parsed = updateClientSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    industry: formData.get("industry") || undefined,
    contact_email: formData.get("contact_email") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("clients")
    .update({
      name: parsed.data.name,
      type: parsed.data.type,
      industry: parsed.data.industry ?? null,
      contact_email: parsed.data.contact_email || null,
      notes: parsed.data.notes ?? null,
    })
    .eq("id", id);

  if (error) return { error: "Nem sikerült menteni a módosításokat." };

  revalidatePath(`/clients/${id}`);
  revalidatePath("/");
  return { success: true };
}

export async function addClientConnection(
  clientId: string,
  platformId: string,
  accountId: string,
  accountName: string | null
) {
  if (!accountId.trim()) return { error: "Account ID megadása kötelező." };

  const supabase = await createServerSupabaseClient();
  const trimmedAccountId = accountId.trim();

  // Check if a soft-deleted connection already exists for this account
  const { data: existing } = await supabase
    .from("client_connections")
    .select("id")
    .eq("client_id", clientId)
    .eq("platform_id", platformId)
    .eq("account_id", trimmedAccountId)
    .eq("is_active", false)
    .single();

  const { error } = existing
    ? await supabase
        .from("client_connections")
        .update({
          is_active: true,
          account_name: accountName || null,
        })
        .eq("id", existing.id)
    : await supabase.from("client_connections").insert({
        client_id: clientId,
        platform_id: platformId,
        account_id: trimmedAccountId,
        account_name: accountName || null,
      });

  if (error) return { error: "Nem sikerült hozzáadni a platformot." };

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/");
  return { success: true };
}

export async function removeClientConnection(
  connectionId: string,
  clientId: string
) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("client_connections")
    .update({ is_active: false })
    .eq("id", connectionId);

  if (error) return { error: "Nem sikerült eltávolítani a platformot." };

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/");
  return { success: true };
}
