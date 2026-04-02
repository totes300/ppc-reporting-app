"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusIcon } from "lucide-react";
import { createClient as createClientAction } from "@/lib/actions/clients";
import { toast } from "sonner";

export function NewClientDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const result = await createClientAction(formData);

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Nem sikerült létrehozni az ügyfelet.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon className="size-4" />
          Új ügyfél
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Új ügyfél hozzáadása</DialogTitle>
          <DialogDescription>
            Add meg az ügyfél alapadatait. A platformokat később tudod
            hozzáadni.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Név</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="type">Típus</Label>
            <Select name="type" required defaultValue="webshop">
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
            <Label htmlFor="industry">Iparág (opcionális)</Label>
            <Input id="industry" name="industry" />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Mentés..." : "Létrehozás"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
