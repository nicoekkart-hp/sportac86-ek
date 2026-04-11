import Image from "next/image";
import Link from "next/link";
import { Countdown } from "@/components/Countdown";
import { TeamGrid } from "@/components/TeamGrid";
import { SupportTile } from "@/components/SupportTile";
import { PhotoGallery } from "@/components/PhotoGallery";
import { createServerClient } from "@/lib/supabase";
import { TeamMember, Sponsor, Sale, EventRecord, GalleryPhoto } from "@/lib/types";

export default async function HomePage() {
  const supabase = createServerClient();

  const [
    { data: teamMembersData },
    { data: sponsorsData },
    { data: salesData },
    { data: featuredEventsData },
    { data: galleryData },
  ] = await Promise.all([
    supabase.from("team_members").select("*").order("sort_order"),
    supabase.from("sponsors").select("*").order("sort_order"),
    supabase.from("sales").select("*").eq("is_active", true).order("sort_order"),
    supabase
      .from("events")
      .select("*")
      .eq("is_published", true)
      .eq("show_on_steunen", true)
      .order("date", { ascending: true, nullsFirst: false }),
    supabase
      .from("gallery_photos")
      .select("*")
      .eq("is_published", true)
      .order("sort_order"),
  ]);

  const teamMembers: TeamMember[] = teamMembersData ?? [];
  const sponsors: Sponsor[] = sponsorsData ?? [];
  const sales: Sale[] = salesData ?? [];
  const featuredEvents: EventRecord[] = featuredEventsData ?? [];
  const galleryPhotos: GalleryPhoto[] = galleryData ?? [];

  const ekDate = process.env.EK_DATE ?? "2026-08-10T00:00:00+02:00";

  const donateTile = {
    icon: "❤️",
    title: "Doneer",
    description: "Stort een vrij bedrag rechtstreeks ten voordele van het team.",
    actionLabel: "Doneer nu",
    href: "/steunen#doneer",
  };

  const eventTiles = featuredEvents.map((ev) => ({
    icon: ev.icon,
    title: ev.coming_soon ? `${ev.title} (binnenkort)` : ev.title,
    description: ev.description,
    actionLabel: ev.coming_soon ? "Binnenkort beschikbaar" : "Inschrijven",
    href: `/agenda/${ev.slug}`,
  }));

  const saleTiles = sales.map((sale) => ({
    icon: sale.icon,
    title: sale.coming_soon ? `${sale.name} (binnenkort)` : `${sale.name} bestellen`,
    description: sale.description,
    actionLabel: sale.coming_soon ? "Binnenkort beschikbaar" : "Bestellen",
    href: `/steunen/${sale.slug}`,
  }));

  const supportTiles = [donateTile, ...eventTiles, ...saleTiles];

  return (
    <>
      {/* HERO */}
      <div className="pt-16">
        {/* Two-column split: text left, image right */}
        <div className="flex flex-col-reverse md:grid md:grid-cols-2" style={{ minHeight: "calc(100vh - 64px - 64px)" }}>
          {/* Left: text */}
          <div className="flex flex-col justify-center px-8 md:px-16 lg:px-24 py-20 bg-gray-warm relative z-10">
            {/* Diagonal right edge on desktop */}
            <div className="hidden md:block absolute top-0 right-0 bottom-0 w-16 bg-gray-warm [clip-path:polygon(0_0,0%_100%,100%_100%)] z-20" />

            <h1 className="font-condensed font-black italic text-[clamp(3.5rem,6vw,5.5rem)] leading-[.95] tracking-tight mb-7 text-gray-dark">
              Sportac 86
              <em className="not-italic text-red-sportac block">springt naar</em>
              Noorwegen
            </h1>

            <p className="text-[17px] text-gray-body max-w-md leading-relaxed mb-9">
              De beloften ropeskippers van SPORTAC86 hebben eind maart een geweldige
              prestatie geleverd op het Vlaams Kampioenschap en plaatsten zich met maar
              liefst 7 skippers voor het Europees Kampioenschap in Melsomvik, Noorwegen!
              Dit evenement zal plaatsvinden van 10 tot en met 14 augustus 2026.<br></br>
            </p>
            <p className="text-[17px] text-gray-body max-w-md leading-relaxed mb-9">
              Om deze droom te kunnen financieren organiseren de skippers verschillende acties, waar we jou hulp voor nodig hebben!
            </p>

            <div className="flex items-center gap-5 flex-wrap">
              <Link
                href="/steunen"
                className="bg-red-sportac text-white font-bold text-[15px] px-8 py-3.5 rounded-sm hover:bg-red-600 transition-colors"
              >
                Steun ons team
              </Link>
              <Link
                href="/onze-reis"
                className="text-[15px] font-semibold text-gray-dark border-b-2 border-gray-dark pb-0.5 hover:text-red-sportac hover:border-red-sportac transition-colors"
              >
                Onze reis →
              </Link>
            </div>
          </div>

          {/* Right: hero image */}
          <div className="relative h-[60vw] md:h-auto bg-[#c8c0b8]">
            <Image
              src="/groepsfotos/IMG_6017.jpeg"
              alt="Sportac 86 Deinze — groepsfoto"
              fill
              className="object-cover object-top"
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <div className="absolute bottom-5 left-5 flex items-center gap-2.5">
              <span className="text-xl">🇧🇪</span>
              <div className="w-6 h-0.5 bg-red-sportac opacity-70" />
              <span className="text-xl">🇳🇴</span>
              <span className="text-white text-sm font-semibold tracking-wide">
                Deinze · Noorwegen 2026
              </span>
            </div>
          </div>
        </div>

        {/* Countdown bar — full width below both columns */}
        <Countdown targetDate={ekDate} />
      </div>

      {/* EK INFO */}
      <section className="bg-white py-20 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-start">
          {/* Left: text */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-0.5 bg-red-sportac" />
              <span className="text-xs font-bold tracking-[0.2em] uppercase text-red-sportac">
                Het kampioenschap
              </span>
            </div>
            <h2 className="font-condensed font-black italic text-5xl leading-none text-gray-dark mb-5">
              Wat is het EK Ropeskipping?
            </h2>
            <p className="text-gray-body text-[15px] leading-relaxed mb-4">
              Het EK Ropeskipping is de grootste ropeskippingcompetitie op Europees niveau.
              In augustus 2026 komen de beste teams uit heel Europa samen in Melsomvik,
              Noorwegen voor de disciplines Freestyle en Speed.
            </p>
            <p className="text-gray-body text-[15px] leading-relaxed mb-8">
              De beloften van SPORTAC86 plaatsten zich begin 2026 via het Vlaams
              Kampioenschap voor dit evenement — met maar liefst 7 gekwalificeerde skippers
              een uitzonderlijke prestatie voor een club uit Deinze.
            </p>

            {/* Key details */}
            <div className="border-t border-gray-200">
              {[
                { icon: "📍", label: "Locatie", sub: "Melsomvik, Noorwegen" },
                { icon: "📅", label: "Datum", sub: "10–14 augustus 2026" },
                { icon: "🏅", label: "Gekwalificeerde skippers", sub: "7 skippers van SPORTAC86" },
              ].map((fact) => (
                <div
                  key={fact.label}
                  className="flex gap-5 items-center py-4 border-b border-gray-200"
                >
                  <div className="text-[28px] min-w-[48px] text-center leading-none">
                    {fact.icon}
                  </div>
                  <div>
                    <div className="font-bold text-[15px] text-gray-dark">{fact.label}</div>
                    <div className="text-sm text-gray-sub">{fact.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Norway quote */}
            <div className="mt-8 bg-gray-dark rounded-sm p-8 border-l-4 border-red-sportac">
              <blockquote className="font-condensed font-bold italic text-2xl text-white leading-snug mb-4">
                <span className="text-red-sportac text-5xl leading-none align-[-18px] mr-1">"</span>
                Van Deinze naar de Noorse fjorden
              </blockquote>
              <p className="text-gray-sub text-sm leading-relaxed">
                Maanden van intense training hebben vruchten afgeworpen. Ons team mag namens
                België aantreden op het grootste Europese podium. De reis kost geld — en
                daarom rekenen we op jou.
              </p>
              <div className="flex items-center gap-2.5 mt-5">
                <span className="text-2xl">🇧🇪</span>
                <div className="w-6 h-0.5 bg-red-sportac opacity-50" />
                <span className="text-2xl">🇳🇴</span>
                <span className="text-xs text-gray-sub">Deinze → Noorwegen</span>
              </div>
            </div>
          </div>

          {/* Right: photo gallery */}
          <div>
            <PhotoGallery
              initialVisible={9}
              photos={galleryPhotos.map((p) => ({ src: p.image_url, alt: p.alt }))}
            />
          </div>
        </div>
      </section>

      {/* TEAM PREVIEW */}
      <section className="bg-gray-warm py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-end mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-0.5 bg-red-sportac" />
                <span className="text-xs font-bold tracking-[0.2em] uppercase text-red-sportac">
                  Onze skippers
                </span>
              </div>
              <h2 className="font-condensed font-black italic text-5xl leading-none text-gray-dark">
                Het team
              </h2>
            </div>
            <Link
              href="/team"
              className="text-[15px] font-semibold text-gray-dark border-b-2 border-gray-dark pb-0.5 hover:text-red-sportac hover:border-red-sportac transition-colors hidden sm:block"
            >
              Volledig team →
            </Link>
          </div>

          <TeamGrid members={teamMembers} />

          <Link
            href="/team"
            className="mt-6 block text-center sm:hidden text-[15px] font-semibold text-gray-dark border-b-2 border-gray-dark pb-0.5"
          >
            Volledig team →
          </Link>
        </div>
      </section>

      {/* SUPPORT */}
      <section className="bg-gray-dark py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-10 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-0.5 bg-red-sportac" />
                <span className="text-xs font-bold tracking-[0.2em] uppercase text-red-sportac">
                  Maak het mogelijk
                </span>
              </div>
              <h2 className="font-condensed font-black italic text-5xl leading-none text-white">
                Steun{" "}
                <em className="not-italic text-red-sportac">Sportac 86</em>
              </h2>
            </div>
            <p className="text-gray-sub text-sm max-w-[280px] sm:text-right leading-relaxed">
              We zamelen <strong className="text-white">€ 15.000</strong> in voor de reis van 9 personen naar Noorwegen. Kies hoe je wil bijdragen.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-0.5 bg-[#2a2a2a] rounded-sm overflow-hidden">
            {supportTiles.map((tile) => (
              <SupportTile key={tile.title} {...tile} />
            ))}
          </div>
        </div>
      </section>

      {/* SPONSORS */}
      <section className="bg-white py-14 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs font-bold tracking-[0.2em] uppercase text-gray-300">
              Onze sponsors
            </span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <div className="flex gap-3 flex-wrap items-center">
            {sponsors.map((sponsor) => (
              sponsor.website_url ? (
                <a
                  key={sponsor.id}
                  href={sponsor.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-gray-warm border border-[#e8e4df] rounded-sm px-7 py-3.5 text-sm font-semibold text-gray-sub hover:text-gray-dark transition-colors"
                >
                  {sponsor.name}
                </a>
              ) : (
                <div
                  key={sponsor.id}
                  className="bg-gray-warm border border-[#e8e4df] rounded-sm px-7 py-3.5 text-sm font-semibold text-gray-sub"
                >
                  {sponsor.name}
                </div>
            )
            ))}
            <Link
              href="/sponsors#aanvragen"
              className="bg-red-sportac/5 border border-dashed border-red-sportac/40 rounded-sm px-7 py-3.5 text-sm font-semibold text-red-sportac hover:bg-red-sportac/10 transition-colors"
            >
              + Word sponsor
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
