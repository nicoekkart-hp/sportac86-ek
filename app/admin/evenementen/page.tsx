import Link from "next/link";
import { createAdminClient } from "@/lib/supabase-admin";
import { EventRecord, EventSlot } from "@/lib/types";
import { formatDateRange } from "@/lib/dates";
import { togglePublish, deleteEvent } from "./actions";

export default async function EvenementenPage() {
  const supabase = createAdminClient();
  const [{ data: eventsData }, { data: slotsData }] = await Promise.all([
    supabase.from("events").select("*").order("created_at", { ascending: false }),
    supabase.from("event_slots").select("*").order("date"),
  ]);
  const events: EventRecord[] = eventsData ?? [];
  const allSlots: EventSlot[] = slotsData ?? [];

  const slotsByEvent = new Map<string, EventSlot[]>();
  for (const s of allSlots) {
    const list = slotsByEvent.get(s.event_id) ?? [];
    list.push(s);
    slotsByEvent.set(s.event_id, list);
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Evenementen</h1>
          <p className="text-gray-sub text-sm mt-1">{events.length} evenement{events.length !== 1 ? "en" : ""}</p>
        </div>
        <Link href="/admin/evenementen/nieuw" className="bg-red-sportac text-white font-bold text-sm px-5 py-2.5 rounded-sm hover:bg-red-600 transition-colors">
          + Nieuw evenement
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {events.length === 0 && (
          <p className="text-gray-sub text-sm">Nog geen evenementen. Maak er een aan.</p>
        )}
        {events.map((ev) => {
          const slots = slotsByEvent.get(ev.id) ?? [];
          return (
            <div key={ev.id} className="bg-white border border-[#e8e4df] rounded-sm p-4 flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-semibold text-sm text-gray-dark">{ev.title}</span>
                  {ev.is_published ? (
                    <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-sm">Gepubliceerd</span>
                  ) : (
                    <span className="text-[10px] font-bold bg-gray-100 text-gray-sub px-1.5 py-0.5 rounded-sm">Concept</span>
                  )}
                  {slots.length > 1 && (
                    <span className="text-[10px] font-bold bg-red-sportac/10 text-red-sportac px-1.5 py-0.5 rounded-sm">
                      {slots.length} datums
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-sub">
                  {[formatDateRange(slots), ev.location].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <form action={togglePublish.bind(null, ev.id, ev.is_published)}>
                  <button type="submit" className="text-xs text-gray-sub border border-[#e8e4df] px-3 py-1.5 rounded-sm hover:border-gray-400 transition-colors">
                    {ev.is_published ? "Verbergen" : "Publiceren"}
                  </button>
                </form>
                <Link href={`/admin/evenementen/${ev.id}`} className="text-xs font-semibold text-gray-dark border border-[#e8e4df] px-3 py-1.5 rounded-sm hover:border-gray-400 transition-colors">
                  Bewerken
                </Link>
                <form action={deleteEvent.bind(null, ev.id)}>
                  <button type="submit" className="text-xs text-red-sportac border border-red-sportac/30 px-3 py-1.5 rounded-sm hover:bg-red-sportac/10 transition-colors">
                    Verwijderen
                  </button>
                </form>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
