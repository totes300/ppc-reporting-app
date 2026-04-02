const HU_MONTHS = [
  "január",
  "február",
  "március",
  "április",
  "május",
  "június",
  "július",
  "augusztus",
  "szeptember",
  "október",
  "november",
  "december",
];

export function formatNumber(n: number | null | undefined): string {
  if (n == null) return "–";
  return Math.round(n).toLocaleString("hu-HU");
}

export function formatCurrency(n: number | null | undefined): string {
  if (n == null) return "–";
  return `${Math.round(n).toLocaleString("hu-HU")} Ft`;
}

export function formatPercent(n: number | null | undefined): string {
  if (n == null) return "–";
  return `${n.toLocaleString("hu-HU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

export function formatMultiplier(n: number | null | undefined): string {
  if (n == null) return "–";
  return `${n.toLocaleString("hu-HU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}x`;
}

export function formatMonthYear(date: Date | string): string {
  const d =
    typeof date === "string"
      ? (() => {
          const [y, m] = date.split("-").map(Number);
          return new Date(y, m - 1, 1);
        })()
      : date;
  return `${d.getFullYear()}. ${HU_MONTHS[d.getMonth()]}`;
}

export function formatDateShort(date: string | null | undefined): string {
  if (!date) return "–";
  const [y, m, d] = date.substring(0, 10).split("-").map(Number);
  return `${y}. ${String(m).padStart(2, "0")}. ${String(d).padStart(2, "0")}.`;
}
