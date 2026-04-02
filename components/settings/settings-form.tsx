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
import { saveAgencySettings } from "@/lib/actions/settings";
import type { AgencySettings } from "@/lib/supabase/types";
import { toast } from "sonner";

export function SettingsForm({
  settings,
}: {
  settings: AgencySettings | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [color, setColor] = useState(settings?.primary_color ?? "#1f6feb");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const result = await saveAgencySettings(formData);

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Beállítások mentve.");
      router.refresh();
    } catch {
      toast.error("Nem sikerült menteni a beállításokat.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Ügynökség beállítások</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Ügynökség neve</Label>
            <Input
              id="name"
              name="name"
              defaultValue={settings?.name ?? ""}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="logo">Logó</Label>
            <Input id="logo" name="logo" type="file" accept="image/*" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {settings?.logo_url && (
              <img
                src={settings.logo_url}
                alt="Jelenlegi logó"
                className="h-12 w-auto rounded border object-contain"
              />
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="primary_color">Elsődleges szín</Label>
            <div className="flex items-center gap-2">
              <Input
                id="primary_color"
                name="primary_color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-16 p-1"
              />
              <Input value={color} readOnly tabIndex={-1} className="flex-1" />
            </div>
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Mentés..." : "Mentés"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
