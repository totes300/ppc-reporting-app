"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { formatMonthYear } from "@/lib/utils/format";
import { addMonths } from "@/lib/utils/dates";

export function MonthSelector({ monthBucket }: { monthBucket: string }) {
  const router = useRouter();

  function navigate(offset: number) {
    const next = addMonths(monthBucket, offset);
    router.push(`/?month=${next}`);
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={() => navigate(-1)} aria-label="Előző hónap">
        <ChevronLeftIcon className="size-4" />
      </Button>
      <span className="min-w-40 text-center text-lg font-semibold">
        {formatMonthYear(monthBucket)}
      </span>
      <Button variant="outline" size="icon" onClick={() => navigate(1)} aria-label="Következő hónap">
        <ChevronRightIcon className="size-4" />
      </Button>
    </div>
  );
}
