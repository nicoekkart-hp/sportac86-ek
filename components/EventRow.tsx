import Link from "next/link";
import { EventRecord, EventSlot } from "@/lib/types";
import { formatDateRange, earliestSlotDate } from "@/lib/dates";

function parseLocalDate(yyyyMmDd: string): Date {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function EventRow({
  event,
  slots,
  past = false,
}: {
  event: EventRecord;
  slots: EventSlot[];
  past?: boolean;
}) {
  const earliest = earliestSlotDate(slots);
  const day = earliest ? String(parseLocalDate(earliest).getDate()) : "—";
  const month = earliest
    ? parseLocalDate(earliest).toLocaleString("nl-BE", { month: "short" })
    : "TBD";
  const sortedSlots = [...slots].sort((a, b) => a.date.localeCompare(b.date));
  const firstSlot = sortedSlots[0];
  const subtitle =
    [event.location, firstSlot?.time?.slice(0, 5)].filter(Boolean).join(" · ") ||
    "Details volgen";

  return (
    <Link
      href={`/agenda/${event.slug}`}
      className={`group bg-white border border-[#e8e4df] rounded-sm grid gap-6 p-5 items-center relative overflow-hidden hover:border-red-sportac hover:shadow-sm transition-all ${past ? "opacity-55 hover:opacity-75" : ""}`}
      style={{ gridTemplateColumns: "80px 1fr auto" }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-sportac scale-y-0 group-hover:scale-y-100 transition-transform origin-bottom" />
      <div className="text-center border-r border-gray-200 pr-6">
        <div className="font-condensed font-black italic text-[36px] text-red-sportac leading-none">{day}</div>
        <div className="text-xs font-bold uppercase tracking-wider text-gray-sub">{month}</div>
      </div>
      <div>
        <h3 className="font-bold text-[15px] text-gray-dark mb-1">{event.title}</h3>
        <p className="text-sm text-gray-sub">{subtitle}</p>
        <div className="flex gap-1.5 mt-2 flex-wrap items-center">
          <span className="text-xs text-gray-sub">{formatDateRange(slots)}</span>
          {slots.length > 1 && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-sm bg-red-sportac/10 text-red-sportac">
              {slots.length} datums
            </span>
          )}
          {event.coming_soon && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-sm bg-amber-100 text-amber-700">Binnenkort</span>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        {!past && (
          <span className="text-xs font-bold bg-gray-dark text-white px-4 py-2 rounded-sm">
            {event.coming_soon ? "Meer info" : "Inschrijven"}
          </span>
        )}
        {past && (
          <span className="text-xs font-bold bg-[#e8e4df] text-gray-sub px-4 py-2 rounded-sm">Voorbij</span>
        )}
      </div>
    </Link>
  );
}
