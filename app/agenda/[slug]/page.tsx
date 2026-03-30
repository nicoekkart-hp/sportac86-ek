import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import { EventRecord } from "@/lib/types";

function formatPrice(cents: number) {
  if (cents === 0) return "Gratis";
  return `€${(cents / 100).toFixed(2).replace(".", ",")}`;
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createServerClient();
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!event) notFound();

  const ev = event as EventRecord;
  const isPast = new Date(ev.date) < new Date();

  const { data: regData } = await supabase
    .from("registrations")
    .select("num_persons")
    .eq("event_id", ev.id);

  const totalRegistered = (regData ?? []).reduce((sum, r) => sum + (r.num_persons ?? 1), 0);
  const spotsLeft = ev.max_attendees !== null
    ? Math.max(0, ev.max_attendees - totalRegistered)
    : null;

  return (
    <div className="pt-16">
      {/* Page header */}
      <div className="bg-gray-dark py-14 px-6 relative overflow-hidden">
        <div className="max-w-5xl mx-auto relative">
          <div className="text-sm text-gray-sub mb-4">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            {" / "}
            <Link href="/agenda" className="hover:text-white transition-colors">Agenda</Link>
            {" / "}
            <span className="text-red-sportac">{ev.title}</span>
          </div>
          <h1 className="font-condensed font-black italic text-5xl leading-none text-white mb-4 max-w-2xl">
            {ev.title}
          </h1>
          <div className="flex gap-6 flex-wrap">
            <span className="text-gray-sub text-sm flex items-center gap-1.5">
              📅 <strong className="text-white">
                {new Date(ev.date).toLocaleDateString("nl-BE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </strong>
            </span>
            <span className="text-gray-sub text-sm flex items-center gap-1.5">
              🕖 <strong className="text-white">{ev.time.slice(0, 5)}</strong>
            </span>
            <span className="text-gray-sub text-sm flex items-center gap-1.5">
              📍 <strong className="text-white">{ev.location}</strong>
            </span>
            <span className="text-gray-sub text-sm flex items-center gap-1.5">
              💶 <strong className="text-white">{formatPrice(ev.price_cents)}</strong> per persoon
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-14 grid md:grid-cols-[1fr_380px] gap-12 items-start">
        {/* Left: description + image */}
        <div>
          {ev.image_url && (
            <div className="relative h-64 rounded-sm overflow-hidden mb-8 bg-[#c8c0b8]">
              <Image
                src={ev.image_url}
                alt={ev.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 60vw"
              />
            </div>
          )}
          <h2 className="font-bold text-xl mb-4">Over dit evenement</h2>
          <div className="text-gray-body text-[15px] leading-relaxed whitespace-pre-line">
            {ev.description}
          </div>
        </div>

        {/* Right: registration form */}
        <div id="inschrijven" className="bg-white border border-[#e8e4df] rounded-sm p-7 sticky top-24">
          {isPast ? (
            <p className="text-gray-sub text-sm text-center py-4">
              Dit evenement is voorbij.
            </p>
          ) : (
            <>
              <h3 className="font-bold text-lg mb-1">Inschrijven</h3>
              {spotsLeft !== null && (
                <p className="text-sm text-gray-sub mb-5">
                  Nog{" "}
                  <strong className="text-red-sportac">{spotsLeft} plaatsen</strong>{" "}
                  beschikbaar
                </p>
              )}
              {spotsLeft === 0 ? (
                <p className="text-sm text-red-sportac font-semibold">
                  Volzet — geen plaatsen meer beschikbaar.
                </p>
              ) : (
                <form action="/api/registrations" method="POST" className="flex flex-col gap-4">
                  <input type="hidden" name="event_id" value={ev.id} />
                  <div>
                    <label className="block text-sm font-semibold mb-1">Naam *</label>
                    <input
                      type="text"
                      name="name"
                      required
                      className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac"
                      placeholder="Voor- en achternaam"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">E-mailadres *</label>
                    <input
                      type="email"
                      name="email"
                      required
                      className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac"
                      placeholder="jouw@email.be"
                    />
  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Aantal personen *</label>
                    <input
                      type="number"
                      name="num_persons"
                      min={1}
                      max={10}
                      defaultValue={1}
                      required
                      className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Opmerkingen</label>
                    <textarea
                      name="remarks"
                      rows={3}
                      className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac resize-none"
                      placeholder="Dieetwensen, vragen, ..."
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-red-sportac text-white font-bold py-3 rounded-sm hover:bg-red-600 transition-colors text-sm"
                  >
                    Inschrijven — {formatPrice(ev.price_cents)}/pers
                  </button>
                  <p className="text-xs text-gray-sub">
                    Je ontvangt een bevestiging per e-mail.
                  </p>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
