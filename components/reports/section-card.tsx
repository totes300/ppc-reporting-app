"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type SectionCardProps = {
  sectionId: string;
  title: string;
  icon?: React.ReactNode;
  isEnabled: boolean;
  onToggle: (sectionId: string, enabled: boolean) => void;
  children: React.ReactNode;
};

export function SectionCard({
  sectionId,
  title,
  icon,
  isEnabled,
  onToggle,
  children,
}: SectionCardProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          {icon}
          {title}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Label
            htmlFor={`toggle-${sectionId}`}
            className="text-xs text-muted-foreground"
          >
            Szerepeljen a riportban
          </Label>
          <Switch
            id={`toggle-${sectionId}`}
            checked={isEnabled}
            onCheckedChange={(checked) => onToggle(sectionId, checked)}
          />
        </div>
      </CardHeader>
      <CardContent
        aria-disabled={!isEnabled}
        className={cn(!isEnabled && "pointer-events-none opacity-50")}
      >
        {children}
      </CardContent>
    </Card>
  );
}
