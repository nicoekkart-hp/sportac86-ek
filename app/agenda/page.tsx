import Image from "next/image";
import Link from "next/link";
import { EventRow } from "@/components/EventRow";
import { createServerClient } from "@/lib/supabase";
import { EventRecord, EventSlot } from "@/lib/types";
import { formatDateRange, earliestSlotDate, latestSlotDate } from "@/lib/dates";

export default async function AgendaPage() {
  const supabase = createServerClient();
  const today = new Date().toISOString().split("T")[0];

  const [{ data: eventsData }, { data: slotsData }] = await Promise.all([
    supabase.from("events").select("*").eq("is_published", true),
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

  type Annotated = { event: EventRecord; slots: EventSlot[]; earliest: string | null; latest: string | null };
  const annotated: Annotated[] = events.map((e) => {
    const slots = slotsByEvent.get(e.id) ?? [];
    return { event: e, slots, earliest: earliestSlotDate(slots), latest: latestSlotDate(slots) };
  });

  const upcoming = annotated
    .filter((a) => a.latest === null || a.latest >= today)
    .sort((a, b) => (a.earliest ?? "9999").localeCompare(b.earliest ?? "9999"));
  const pastEvents = annotated
    .filter((a) => a.latest !== null && a.latest < today)
    .sort((a, b) => (b.earliest ?? "").localeCompare(a.earliest ?? ""))
    .slice(0, 5);

  const featured = upcoming[0];
  const rest = upcoming.slice(1);

  return (
    <div className="pt-16">
      <div className="bg-gray-dark py-14 px-6 relative overflow-hidden">
        <div className="absolute right-10 bottom-[-20px] font-condensed font-black italic text-[140px] text-white/[0.04] leading-none pointer-events-none select-none">Agenda</div>
        <div className="max-w-5xl mx-auto relative">
          <div className="text-sm text-gray-sub mb-4">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            {" / "}
            <span className="text-red-sportac">Agenda</span>
          </div>
          <h1 className="font-condensed font-black italic text-6xl leading-none text-white mb-3">
            Agenda &{" "}
            <em className="not-italic text-red-sportac">evenementen</em>
          </h1>
          <p className="text-gray-sub text-[15px] max-w-lg leading-relaxed">
            Kom langs, steun ons live en maak deel uit van onze reis naar Noorwegen.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-14">
        {featured && (
          <div className="bg-white border border-[#e8e4df] rounded-sm overflow-hidden grid md:grid-cols-[340px_1fr] mb-10 relative">
            <div className="absolute top-4 left-4 bg-red-sportac text-white text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-sm z-10">
              Eerstvolgende
            </div>
            <div className="relative min-h-[240px] bg-[#c8c0b8]">
              {featured.event.image_url ? (
                <Image src={featured.event.image_url} alt={featured.event.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 340px" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-20">📅</div>
              )}
            </div>
            <div className="p-9 flex flex-col justify-between">
              <div>
                <div className="flex gap-5 mb-4 flex-wrap">
                  <span className="text-sm text-gray-sub flex items-center gap-1.5">
                    📅 <strong className="text-gray-dark">{formatDateRange(featured.slots)}</strong>
                  </span>
                  {featured.event.location && (
                    <span className="text-sm text-gray-sub flex items-center gap-1.5">
                      📍 <strong className="text-gray-dark">{featured.event.location}</strong>
                    </span>
                  )}
                </div>
                <h2 className="font-condensed font-black italic text-[38px] leading-tight text-gray-dark mb-3">
                  {featured.event.title}
                </h2>
                <p className="text-sm text-gray-body leading-relaxed mb-6 line-clamp-3">
                  {featured.event.description}
                </p>
              </div>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex gap-4 items-center">
                  <Link href={`/agenda/${featured.event.slug}`} className="text-[15px] font-semibold text-gray-dark border-b-2 border-gray-dark pb-0.5">
                    Meer info
                  </Link>
                  {!featured.event.coming_soon && (
                    <Link href={`/agenda/${featured.event.slug}#inschrijven`} className="bg-red-sportac text-white font-bold text-sm px-7 py-3 rounded-sm hover:bg-red-600 transition-colors">
                      Inschrijven
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {rest.length > 0 && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-bold tracking-[0.2em] uppercase text-gray-sub">Komende evenementen</span>
              <div className="flex-1 h-px bg-[#e8e4df]" />
            </div>
            <div className="flex flex-col gap-3 mb-12">
              {rest.map((a) => (
                <EventRow key={a.event.id} event={a.event} slots={a.slots} />
              ))}
            </div>
          </>
        )}

        {upcoming.length === 0 && (
          <p className="text-gray-sub text-sm text-center py-12">
            Momenteel zijn er geen geplande evenementen. Kom later terug.
          </p>
        )}

        {pastEvents.length > 0 && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-bold tracking-[0.2em] uppercase text-gray-sub">Voorbije evenementen</span>
              <div className="flex-1 h-px bg-[#e8e4df]" />
            </div>
            <div className="flex flex-col gap-3 mb-12">
              {pastEvents.map((a) => (
                <EventRow key={a.event.id} event={a.event} slots={a.slots} past />
              ))}
            </div>
          </>
        )}

        <div className="bg-gray-dark rounded-sm p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div>
            <p className="font-bold text-white mb-1">Blijf op de hoogte</p>
            <p className="text-gray-sub text-sm leading-relaxed">
              Voeg onze evenementen toe aan je eigen agenda zodat je niets mist.
            </p>
          </div>
          <a href="/api/agenda.ics" className="text-sm font-bold text-white border border-white/20 px-5 py-2.5 rounded-sm hover:bg-white/10 transition-colors whitespace-nowrap">
            Agenda exporteren (.ics)
          </a>
        </div>
      </div>
    </div>
  );
}
