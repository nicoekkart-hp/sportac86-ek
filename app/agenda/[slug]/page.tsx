import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import { EventRecord, EventSlot, EventTicket } from "@/lib/types";
import { formatDateRange, latestSlotDate } from "@/lib/dates";
import { RegistrationForm } from "./_RegistrationForm";

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ betaald?: string; ingeschreven?: string; error?: string }>;
}) {
  const { slug } = await params;
  const { betaald, ingeschreven, error } = await searchParams;
  const supabase = createServerClient();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!event) notFound();
  const ev = event as EventRecord;

  const [{ data: slotsData }, { data: ticketsData }, { data: regsData }] = await Promise.all([
    supabase.from("event_slots").select("*").eq("event_id", ev.id).order("sort_order").order("date"),
    supabase.from("event_tickets").select("*").eq("event_id", ev.id).order("sort_order"),
    supabase.from("registrations").select("slot_id, num_persons").eq("event_id", ev.id),
  ]);

  const slots: EventSlot[] = slotsData ?? [];
  const tickets: EventTicket[] = ticketsData ?? [];

  const takenBySlot = new Map<string, number>();
  for (const r of regsData ?? []) {
    if (!r.slot_id) continue;
    takenBySlot.set(r.slot_id, (takenBySlot.get(r.slot_id) ?? 0) + (r.num_persons ?? 1));
  }
  const slotsWithTaken = slots.map((s) => ({ ...s, taken: takenBySlot.get(s.id) ?? 0 }));

  const latest = latestSlotDate(slots);
  const today = new Date().toISOString().split("T")[0];
  const isPast = latest !== null && latest < today;

  return (
    <div className="pt-16">
      {betaald && (
        <div className="bg-green-50 border-b border-green-200 px-6 py-3 text-center text-sm font-semibold text-green-800">
          Inschrijving bevestigd! Je ontvangt een bevestiging per e-mail.
        </div>
      )}
      {ingeschreven && (
        <div className="bg-green-50 border-b border-green-200 px-6 py-3 text-center text-sm font-semibold text-green-800">
          Inschrijving ontvangen! Je ontvangt een bevestiging per e-mail.
        </div>
      )}
      {error === "volzet" && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3 text-center text-sm font-semibold text-red-800">
          Sorry, deze datum is intussen volzet. Kies een andere datum.
        </div>
      )}

      <div className="bg-gray-dark py-14 px-6 relative overflow-hidden">
        <div className="max-w-5xl mx-auto relative">
          <div className="text-sm text-gray-sub mb-4">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            {" / "}
            <Link href="/agenda" className="hover:text-white transition-colors">Agenda</Link>
            {" / "}
            <span className="text-red-sportac">{ev.title}</span>
          </div>
          <h1 className="font-condensed font-black italic text-5xl leading-none text-white mb-4 max-w-2xl">{ev.title}</h1>
          <div className="flex gap-6 flex-wrap">
            <span className="text-gray-sub text-sm flex items-center gap-1.5">
              📅 <strong className="text-white">{formatDateRange(slots)}</strong>
            </span>
            {ev.location && (
              <span className="text-gray-sub text-sm flex items-center gap-1.5">
                📍 <strong className="text-white">{ev.location}</strong>
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-14 grid md:grid-cols-[1fr_380px] gap-12 items-start">
        <div>
          {ev.image_url && (
            <div className="rounded-sm overflow-hidden mb-8 bg-[#c8c0b8]">
              <Image
                src={ev.image_url}
                alt={ev.title}
                width={1200}
                height={800}
                className="w-full h-auto"
                sizes="(max-width: 768px) 100vw, 60vw"
              />
            </div>
          )}
          <h2 className="font-bold text-xl mb-4">Over dit evenement</h2>
          <div className="text-gray-body text-[15px] leading-relaxed whitespace-pre-line">{ev.description}</div>
        </div>

        <div id="inschrijven" className="bg-white border border-[#e8e4df] rounded-sm p-7 sticky top-24">
          {isPast ? (
            <p className="text-gray-sub text-sm text-center py-4">Dit evenement is voorbij.</p>
          ) : ev.coming_soon ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">⏳</div>
              <p className="text-xs font-bold tracking-[0.2em] uppercase text-red-sportac mb-2">Binnenkort beschikbaar</p>
              <p className="text-sm text-gray-body leading-relaxed">
                De details voor dit evenement worden nog uitgewerkt. Kom later terug voor meer info en inschrijvingen.
              </p>
            </div>
          ) : slots.length === 0 ? (
            <p className="text-gray-sub text-sm text-center py-4">Inschrijven nog niet beschikbaar.</p>
          ) : (
            <>
              <h3 className="font-bold text-lg mb-4">Inschrijven</h3>
              <RegistrationForm
                eventId={ev.id}
                eventSlug={ev.slug}
                slots={slotsWithTaken}
                tickets={tickets}
                defaultLocation={ev.location}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
