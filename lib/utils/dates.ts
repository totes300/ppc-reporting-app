/** Parse a YYYY-MM-DD string as local date (avoids UTC timezone shift). */
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function getDefaultMonth(): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return toDateString(d);
}

export function getMonthRange(monthBucket: string): {
  start: string;
  end: string;
} {
  const d = parseLocalDate(monthBucket);
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { start: toDateString(start), end: toDateString(end) };
}

export function getPreviousMonthRange(monthBucket: string): {
  start: string;
  end: string;
} {
  const d = parseLocalDate(monthBucket);
  const prevStart = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  const prevEnd = new Date(d.getFullYear(), d.getMonth(), 0);
  return { start: toDateString(prevStart), end: toDateString(prevEnd) };
}

export function addMonths(monthBucket: string, n: number): string {
  const d = parseLocalDate(monthBucket);
  return toDateString(new Date(d.getFullYear(), d.getMonth() + n, 1));
}

function toDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
