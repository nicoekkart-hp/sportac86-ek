import Link from "next/link";
import { Suspense } from "react";
import { ScrollToSection } from "@/components/ScrollToSection";
import { SupportTile } from "@/components/SupportTile";
import { createServerClient } from "@/lib/supabase";
import { Sale } from "@/lib/types";
import { DonatieForm } from "./_DonatieForm";

export default async function SteunenPage() {
  const supabase = createServerClient();

  const { data: salesData } = await supabase
    .from("sales")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");

  const sales: Sale[] = salesData ?? [];

  const staticTiles = [
    {
      key: "doneer",
      icon: "❤️",
      title: "Doneer",
      description: "Stort een vrij bedrag rechtstreeks ten voordele van het team.",
      actionLabel: "Doneer nu",
      href: "/steunen#doneer",
    },
    {
      key: "spaghettiavond",
      icon: "🍝",
      title: "Spaghettiavond",
      description: "Schrijf je in voor onze gezellige spaghettiavond en steun ons tegelijk.",
      actionLabel: "Inschrijven",
      href: "/agenda",
    },
  ];

  const saleTiles = sales.map((sale) => ({
    key: sale.id,
    icon: sale.icon,
    title: `${sale.name} bestellen`,
    description: sale.description,
    actionLabel: "Meer info & bestellen",
    href: `/steunen/${sale.slug}`,
  }));

  const allTiles = [...staticTiles, ...saleTiles];

  return (
    <div className="pt-16">
      <Suspense fallback={null}>
        <ScrollToSection />
      </Suspense>

      {/* Hero */}
      <div className="bg-gray-dark py-14 px-6 relative overflow-hidden">
        <div className="max-w-5xl mx-auto relative">
          <div className="text-sm text-gray-sub mb-4">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            {" / "}
            <span className="text-red-sportac">Steunen</span>
          </div>
          <h1 className="font-condensed font-black italic text-6xl leading-none text-white mb-3">
            Steun <em className="not-italic text-red-sportac">Sportac 86</em>
          </h1>
          <p className="text-gray-sub text-[15px] max-w-lg leading-relaxed">
            De reis, het verblijf en de deelname voor onze delegatie van 9 personen kosten
            ongeveer <strong className="text-white">€ 15.000</strong>. Elke euro helpt ons
            dichter bij Noorwegen. Kies hoe je wil bijdragen.
          </p>
        </div>
      </div>

      {/* Support tiles overview */}
      <div className="bg-white py-14 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-5 h-0.5 bg-red-sportac" />
            <span className="text-xs font-bold tracking-[0.2em] uppercase text-red-sportac">
              Kies hoe je steunt
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-0.5 bg-[#2a2a2a] rounded-sm overflow-hidden">
            {allTiles.map((tile) => (
              <SupportTile
                key={tile.key}
                icon={tile.icon}
                title={tile.title}
                description={tile.description}
                actionLabel={tile.actionLabel}
                href={tile.href}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Donate section */}
      <div className="max-w-5xl mx-auto px-6 py-14">
        <section id="doneer">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-0.5 bg-red-sportac" />
            <span className="text-xs font-bold tracking-[0.2em] uppercase text-red-sportac">Doneer</span>
          </div>
          <h2 className="font-condensed font-black italic text-4xl text-gray-dark mb-5">
            Rechtstreeks steunen
          </h2>
          <div className="bg-white border border-[#e8e4df] rounded-sm p-8 max-w-lg">
            <p className="text-gray-body text-sm leading-relaxed mb-6">
              Steun ons rechtstreeks via een veilige online betaling. Kies een bedrag of vul zelf in.
            </p>
            <DonatieForm />
            <div className="mt-6 bg-gray-warm rounded-sm p-4 font-mono text-sm">
              <p className="text-xs font-sans text-gray-sub mb-2 not-italic">Of via overschrijving:</p>
              <p><strong>BE89 0689 4858 8285</strong></p>
              <p className="text-gray-sub">Sportac 86 Deinze</p>
              <p className="text-gray-sub">Mededeling: EK Ropeskipping Noorwegen 2026</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
