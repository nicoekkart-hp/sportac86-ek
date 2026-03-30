import Link from "next/link";
import { Suspense } from "react";
import { ScrollToSection } from "@/components/ScrollToSection";

const CANDY_PRODUCTS = [
  { id: "mars", name: "Mars (doos 24 stuks)", price_cents: 1800 },
  { id: "snickers", name: "Snickers (doos 24 stuks)", price_cents: 1800 },
  { id: "twix", name: "Twix (doos 24 stuks)", price_cents: 1800 },
];

const WINE_PRODUCTS = [
  { id: "rood", name: "Rode wijn — fles 75cl", price_cents: 900 },
  { id: "wit", name: "Witte wijn — fles 75cl", price_cents: 900 },
  { id: "rose", name: "Rosé — fles 75cl", price_cents: 900 },
];

export default function SteunenPage() {
  return (
    <div className="pt-16">
      <Suspense fallback={null}>
        <ScrollToSection />
      </Suspense>
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
            Elke euro helpt ons dichter bij Noorwegen. Kies hoe je wil bijdragen.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-14 flex flex-col gap-16">

        {/* Donate */}
        <section id="doneer">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-0.5 bg-red-sportac" />
            <span className="text-xs font-bold tracking-[0.2em] uppercase text-red-sportac">Doneer</span>
          </div>
          <h2 className="font-condensed font-black italic text-4xl text-gray-dark mb-5">Rechtstreeks steunen</h2>
          <div className="bg-white border border-[#e8e4df] rounded-sm p-8 max-w-lg">
            <p className="text-gray-body text-sm leading-relaxed mb-6">
              Stort een vrij bedrag op onze rekening of laat hier je gegevens achter zodat we je kunnen bedanken.
            </p>
            <div className="bg-gray-warm rounded-sm p-4 mb-6 font-mono text-sm">
              <p><strong>BE00 0000 0000 0000</strong></p>
              <p className="text-gray-sub">Sportac 86 Deinze</p>
              <p className="text-gray-sub">Mededeling: EK Ropeskipping 2025</p>
            </div>
            <form action="/api/donations" method="POST" className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Naam</label>
                <input type="text" name="name" className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" placeholder="Jouw naam" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">E-mailadres</label>
                <input type="email" name="email" className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" placeholder="jouw@email.be" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Bedrag (€)</label>
                <input type="number" name="amount_euros" min={1} step={1} className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" placeholder="10" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Boodschap (optioneel)</label>
                <textarea name="message" rows={2} className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac resize-none" placeholder="Succes in Noorwegen!" />
              </div>
              <button type="submit" className="bg-red-sportac text-white font-bold py-3 rounded-sm hover:bg-red-600 transition-colors text-sm">
                Bevestig donatie
              </button>
              <p className="text-xs text-gray-sub">Betaling via overschrijving. Je ontvangt een bedankmail.</p>
            </form>
          </div>
        </section>

        {/* Candy */}
        <section id="snoep">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-0.5 bg-red-sportac" />
            <span className="text-xs font-bold tracking-[0.2em] uppercase text-red-sportac">Snoep</span>
          </div>
          <h2 className="font-condensed font-black italic text-4xl text-gray-dark mb-5">Snoep bestellen</h2>
          <div className="bg-white border border-[#e8e4df] rounded-sm p-8 max-w-lg">
            <p className="text-gray-body text-sm leading-relaxed mb-6">
              Bestel een doos snoep via onze actie. Afhalen op een van de afhaaldata (zie <Link href="/agenda" className="text-red-sportac underline">agenda</Link>).
            </p>
            <form action="/api/orders" method="POST" className="flex flex-col gap-4">
              <input type="hidden" name="type" value="candy" />
              {CANDY_PRODUCTS.map((p) => (
                <div key={p.id} className="flex items-center justify-between">
                  <label className="text-sm font-semibold">{p.name}</label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-sub">€{(p.price_cents / 100).toFixed(2)}</span>
                    <input type="number" name={`items.${p.id}`} min={0} defaultValue={0} className="w-16 border border-[#e8e4df] rounded-sm px-2 py-1 text-sm text-center focus:outline-none focus:border-red-sportac" />
                  </div>
                </div>
              ))}
              <hr className="border-[#e8e4df]" />
              <div>
                <label className="block text-sm font-semibold mb-1">Naam *</label>
                <input type="text" name="name" required className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">E-mailadres *</label>
                <input type="email" name="email" required className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Telefoonnummer</label>
                <input type="tel" name="phone" className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" />
              </div>
              <button type="submit" className="bg-red-sportac text-white font-bold py-3 rounded-sm hover:bg-red-600 transition-colors text-sm">
                Bestelling plaatsen
              </button>
            </form>
          </div>
        </section>

        {/* Wine */}
        <section id="wijn">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-0.5 bg-red-sportac" />
            <span className="text-xs font-bold tracking-[0.2em] uppercase text-red-sportac">Wijn</span>
          </div>
          <h2 className="font-condensed font-black italic text-4xl text-gray-dark mb-5">Wijn bestellen</h2>
          <div className="bg-white border border-[#e8e4df] rounded-sm p-8 max-w-lg">
            <p className="text-gray-body text-sm leading-relaxed mb-6">
              Kies uit onze selectie wijnen. Afhalen op een van de afhaaldata (zie <Link href="/agenda" className="text-red-sportac underline">agenda</Link>).
            </p>
            <form action="/api/orders" method="POST" className="flex flex-col gap-4">
              <input type="hidden" name="type" value="wine" />
              {WINE_PRODUCTS.map((p) => (
                <div key={p.id} className="flex items-center justify-between">
                  <label className="text-sm font-semibold">{p.name}</label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-sub">€{(p.price_cents / 100).toFixed(2)}</span>
                    <input type="number" name={`items.${p.id}`} min={0} defaultValue={0} className="w-16 border border-[#e8e4df] rounded-sm px-2 py-1 text-sm text-center focus:outline-none focus:border-red-sportac" />
                  </div>
                </div>
              ))}
              <hr className="border-[#e8e4df]" />
              <div>
                <label className="block text-sm font-semibold mb-1">Naam *</label>
                <input type="text" name="name" required className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">E-mailadres *</label>
                <input type="email" name="email" required className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Telefoonnummer</label>
                <input type="tel" name="phone" className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" />
              </div>
              <button type="submit" className="bg-red-sportac text-white font-bold py-3 rounded-sm hover:bg-red-600 transition-colors text-sm">
                Bestelling plaatsen
              </button>
            </form>
          </div>
        </section>

      </div>
    </div>
  );
}
