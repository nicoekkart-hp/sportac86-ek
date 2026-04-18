import { EventSlot } from "@/lib/types";

const FMT_FULL = new Intl.DateTimeFormat("nl-BE", { day: "numeric", month: "long", year: "numeric" });
const FMT_DAY_MONTH = new Intl.DateTimeFormat("nl-BE", { day: "numeric", month: "long" });
const FMT_DAY = new Intl.DateTimeFormat("nl-BE", { day: "numeric" });

function parseLocalDate(yyyyMmDd: string): Date {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDateRange(slots: Pick<EventSlot, "date">[]): string {
  if (slots.length === 0) return "Datum nog te bepalen";

  const sorted = [...slots].sort((a, b) => a.date.localeCompare(b.date));
  const first = parseLocalDate(sorted[0].date);
  const last = parseLocalDate(sorted[sorted.length - 1].date);

  if (sorted.length === 1 || first.getTime() === last.getTime()) {
    return FMT_FULL.format(first);
  }

  const sameYear = first.getFullYear() === last.getFullYear();
  const sameMonth = sameYear && first.getMonth() === last.getMonth();

  if (sameMonth) {
    return `${FMT_DAY.format(first)}–${FMT_DAY_MONTH.format(last)} ${last.getFullYear()}`;
  }
  if (sameYear) {
    return `${FMT_DAY_MONTH.format(first)} – ${FMT_DAY_MONTH.format(last)} ${last.getFullYear()}`;
  }
  return `${FMT_FULL.format(first)} – ${FMT_FULL.format(last)}`;
}

export function earliestSlotDate(slots: Pick<EventSlot, "date">[]): string | null {
  if (slots.length === 0) return null;
  return [...slots].sort((a, b) => a.date.localeCompare(b.date))[0].date;
}

export function latestSlotDate(slots: Pick<EventSlot, "date">[]): string | null {
  if (slots.length === 0) return null;
  return [...slots].sort((a, b) => b.date.localeCompare(a.date))[0].date;
}
