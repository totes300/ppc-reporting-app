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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusIcon, TrashIcon } from "lucide-react";
import {
  addClientConnection,
  removeClientConnection,
} from "@/lib/actions/clients";
import type { ClientConnection, Platform } from "@/lib/supabase/types";
import { formatDateShort } from "@/lib/utils/format";
import { toast } from "sonner";

export function PlatformConnectionCard({
  clientId,
  connections,
  platforms,
}: {
  clientId: string;
  connections: (ClientConnection & { platform: Platform })[];
  platforms: Platform[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    try {
      const fd = new FormData(e.currentTarget);
      const result = await addClientConnection(
        clientId,
        fd.get("platform_id") as string,
        fd.get("account_id") as string,
        (fd.get("account_name") as string) || null
      );

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Nem sikerült hozzáadni a platformot.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(connectionId: string) {
    try {
      const result = await removeClientConnection(connectionId, clientId);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    } catch {
      toast.error("Nem sikerült eltávolítani a platformot.");
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Összekötött platformok</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <PlusIcon className="size-4" />
              Platform hozzáadása
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Platform hozzáadása</DialogTitle>
              <DialogDescription>
                Add meg a platform típusát és az account azonosítót.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAdd} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="platform_id">Platform</Label>
                <Select name="platform_id" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Válassz platformot" />
                  </SelectTrigger>
                  <SelectContent>
                    {platforms.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="account_id">Account ID</Label>
                <Input id="account_id" name="account_id" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="account_name">Account név (opcionális)</Label>
                <Input id="account_name" name="account_name" />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? "Hozzáadás..." : "Hozzáadás"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {connections.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Még nincs összekötött platform.
          </p>
        ) : (
          <div className="grid gap-3">
            {connections.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex size-8 items-center justify-center rounded text-sm font-bold text-white"
                    style={{ backgroundColor: c.platform.icon_color }}
                  >
                    {c.platform.icon_letter}
                  </span>
                  <div>
                    <p className="text-sm font-medium">
                      {c.platform.display_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {c.account_name ?? c.account_id} &middot; ID:{" "}
                      {c.account_id}
                    </p>
                    {c.last_synced_at && (
                      <p className="text-xs text-muted-foreground">
                        Utolsó szinkron: {formatDateShort(c.last_synced_at)}
                      </p>
                    )}
                  </div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`${c.platform.display_name} eltávolítása`}
                    >
                      <TrashIcon className="size-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Platform eltávolítása</AlertDialogTitle>
                      <AlertDialogDescription>
                        Biztosan eltávolítod a {c.platform.display_name}{" "}
                        kapcsolatot? Ez nem törli a korábbi riportokat.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Mégse</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-white hover:bg-destructive/90"
                        onClick={() => handleRemove(c.id)}
                      >
                        Eltávolítás
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
