import Link from "next/link";
import { Suspense } from "react";
import { ScrollToSection } from "@/components/ScrollToSection";
import { createAdminClient } from "@/lib/supabase-admin";
import { Product, Sale } from "@/lib/types";
import { DonatieForm } from "./_DonatieForm";

export default async function SteunenPage({
  searchParams,
}: {
  searchParams: Promise<{ betaald?: string }>;
}) {
  const { betaald } = await searchParams;
  const supabase = createAdminClient();

  const { data: salesData } = await supabase
    .from("sales")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");

  const sales: Sale[] = salesData ?? [];

  // Fetch all active products in one query
  const { data: productsData } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");

  const productsBySale = new Map<string, Product[]>();
  for (const p of (productsData ?? []) as Product[]) {
    const list = productsBySale.get(p.sale_id) ?? [];
    list.push(p);
    productsBySale.set(p.sale_id, list);
  }

  return (
    <div className="pt-16">
      <Suspense fallback={null}>
        <ScrollToSection />
      </Suspense>

      {betaald && (
        <div className="bg-green-50 border-b border-green-200 px-6 py-3 text-center text-sm font-semibold text-green-800">
          {betaald === "donatie"
            ? "Bedankt voor je donatie! Je ontvangt een bevestiging per e-mail."
            : "Bestelling ontvangen! Je ontvangt een bevestiging per e-mail."}
        </div>
      )}

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

        {/* Dynamic sale sections */}
        {sales.map((sale) => {
          const products = productsBySale.get(sale.id) ?? [];
          return (
            <section key={sale.id} id={sale.slug}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-0.5 bg-red-sportac" />
                <span className="text-xs font-bold tracking-[0.2em] uppercase text-red-sportac">{sale.name}</span>
              </div>
              <h2 className="font-condensed font-black italic text-4xl text-gray-dark mb-5">{sale.name} bestellen</h2>
              <div className="bg-white border border-[#e8e4df] rounded-sm p-8 max-w-lg">
                {sale.description && (
                  <p className="text-gray-body text-sm leading-relaxed mb-6">{sale.description}</p>
                )}
                <form action="/api/checkout/bestelling" method="POST" className="flex flex-col gap-4">
                  <input type="hidden" name="sale_id" value={sale.id} />
                  <input type="hidden" name="sale_slug" value={sale.slug} />
                  {products.map((p: Product) => (
                    <div key={p.id} className="flex items-center justify-between">
                      <label className="text-sm font-semibold">{p.name}</label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-sub">€{(p.price_cents / 100).toFixed(2)}</span>
                        <input
                          type="number"
                          name={`items.${p.id}`}
                          min={0}
                          defaultValue={0}
                          className="w-16 border border-[#e8e4df] rounded-sm px-2 py-1 text-sm text-center focus:outline-none focus:border-red-sportac"
                        />
                      </div>
                    </div>
                  ))}
                  {products.length === 0 && (
                    <p className="text-sm text-gray-sub">Geen producten beschikbaar.</p>
                  )}
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
                    Bestelling plaatsen &amp; betalen
                  </button>
                </form>
              </div>
            </section>
          );
        })}

      </div>
    </div>
  );
}
