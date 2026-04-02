export type DeltaPresentation = {
  label: string;
  value: number | null;
  tone: "good" | "bad" | "muted";
};

export function getDeltaPresentation(
  current: number | null,
  previous: number | null,
  inverse = false
): DeltaPresentation {
  if (current == null || previous == null) {
    return { label: "—", value: null, tone: "muted" };
  }

  if (current === 0 && previous === 0) {
    return { label: "0%", value: 0, tone: "muted" };
  }

  if (previous === 0 && current > 0) {
    return { label: "Új", value: null, tone: "muted" };
  }

  const delta = ((current - previous) / previous) * 100;

  if (Math.abs(delta) < 1) {
    return { label: `${delta.toFixed(1)}%`, value: delta, tone: "muted" };
  }

  const positive = inverse ? delta < 0 : delta > 0;

  return {
    label: `${delta.toFixed(1)}%`,
    value: delta,
    tone: positive ? "good" : "bad",
  };
}
