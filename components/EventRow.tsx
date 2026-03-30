import Link from "next/link";
import { EventRecord } from "@/lib/types";
import { formatPrice } from "@/lib/format";

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return {
    day: d.getDate(),
    month: d.toLocaleString("nl-BE", { month: "short" }),
  };
}

export function EventRow({ event, past = false }: { event: EventRecord; past?: boolean }) {
  const { day, month } = formatDate(event.date);
  const isPast = past;

  return (
    <Link
      href={`/agenda/${event.slug}`}
      className={`group bg-white border border-[#e8e4df] rounded-sm grid gap-6 p-5 items-center relative overflow-hidden hover:border-red-sportac hover:shadow-sm transition-all ${isPast ? "opacity-55 hover:opacity-75" : ""}`}
      style={{ gridTemplateColumns: "80px 1fr auto" }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-sportac scale-y-0 group-hover:scale-y-100 transition-transform origin-bottom" />

      {/* Date */}
      <div className="text-center border-r border-gray-200 pr-6">
        <div className="font-condensed font-black italic text-[36px] text-red-sportac leading-none">
          {day}
        </div>
        <div className="text-xs font-bold uppercase tracking-wider text-gray-sub">{month}</div>
      </div>

      {/* Info */}
      <div>
        <h3 className="font-bold text-[15px] text-gray-dark mb-1">{event.title}</h3>
        <p className="text-sm text-gray-sub">
          {event.location} · {event.time.slice(0, 5)}
        </p>
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {event.price_cents === 0 ? (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-sm bg-green-100 text-green-700">
              Gratis
            </span>
          ) : (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-sm bg-blue-100 text-blue-700">
              Betalend
            </span>
          )}
          {event.max_attendees !== null && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-sm bg-red-sportac/10 text-red-sportac">
              Inschrijving vereist
            </span>
          )}
        </div>
      </div>

      {/* Action */}
      <div className="flex flex-col items-end gap-2">
        <div className="font-condensed font-black text-xl text-gray-dark">
          {formatPrice(event.price_cents)}
        </div>
        {!isPast && (
          <span className="text-xs font-bold bg-gray-dark text-white px-4 py-2 rounded-sm">
            {event.max_attendees !== null ? "Inschrijven" : "Meer info"}
          </span>
        )}
        {isPast && (
          <span className="text-xs font-bold bg-[#e8e4df] text-gray-sub px-4 py-2 rounded-sm">
            Voorbij
          </span>
        )}
      </div>
    </Link>
  );
}
