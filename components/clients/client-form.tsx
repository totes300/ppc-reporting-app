"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { updateClient } from "@/lib/actions/clients";
import type { Client } from "@/lib/supabase/types";
import { toast } from "sonner";

export function ClientForm({ client }: { client: Client }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const result = await updateClient(client.id, formData);

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Ügyfél adatai mentve.");
      router.refresh();
    } catch {
      toast.error("Nem sikerült menteni a módosításokat.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ügyfél profil</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Név</Label>
            <Input id="name" name="name" defaultValue={client.name} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="type">Típus</Label>
            <Select name="type" defaultValue={client.type}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="webshop">Webshop</SelectItem>
                <SelectItem value="szolgaltato">Szolgáltató</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="industry">Iparág</Label>
            <Input
              id="industry"
              name="industry"
              defaultValue={client.industry ?? ""}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="contact_email">Kontakt email</Label>
            <Input
              id="contact_email"
              name="contact_email"
              type="email"
              defaultValue={client.contact_email ?? ""}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Megjegyzések</Label>
            <Textarea
              id="notes"
              name="notes"
              defaultValue={client.notes ?? ""}
              rows={3}
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Mentés..." : "Mentés"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
