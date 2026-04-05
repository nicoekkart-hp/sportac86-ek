import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase-admin";
import { Sale, Product } from "@/lib/types";

export default async function SaleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ betaald?: string }>;
}) {
  const { slug } = await params;
  const { betaald } = await searchParams;

  const supabase = createAdminClient();

  const { data: saleData } = await supabase
    .from("sales")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!saleData) notFound();

  const sale = saleData as Sale;

  const { data: productsData } = await supabase
    .from("products")
    .select("*")
    .eq("sale_id", sale.id)
    .eq("is_active", true)
    .order("sort_order");

  const products: Product[] = productsData ?? [];

  return (
    <div className="pt-16">
      {betaald && (
        <div className="bg-green-50 border-b border-green-200 px-6 py-3 text-center text-sm font-semibold text-green-800">
          Bestelling ontvangen! Je ontvangt een bevestiging per e-mail.
        </div>
      )}

      {/* Hero */}
      <div className="bg-gray-dark py-14 px-6 relative overflow-hidden">
        <div className="max-w-5xl mx-auto relative">
          <div className="text-sm text-gray-sub mb-4">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            {" / "}
            <Link href="/steunen" className="hover:text-white transition-colors">Steunen</Link>
            {" / "}
            <span className="text-red-sportac">{sale.name}</span>
          </div>
          <div className="text-5xl mb-4">{sale.icon}</div>
          <h1 className="font-condensed font-black italic text-6xl leading-none text-white mb-3">
            <em className="not-italic text-red-sportac">{sale.name}</em> bestellen
          </h1>
          {sale.description && (
            <p className="text-gray-sub text-[15px] max-w-lg leading-relaxed mt-4">
              {sale.description}
            </p>
          )}
        </div>
      </div>

      {/* Order form */}
      <div className="max-w-5xl mx-auto px-6 py-14">
        <div className="bg-white border border-[#e8e4df] rounded-sm p-8 max-w-lg">
          <form action="/api/checkout/bestelling" method="POST" className="flex flex-col gap-4">
            <input type="hidden" name="sale_id" value={sale.id} />
            <input type="hidden" name="sale_slug" value={sale.slug} />

            {products.map((p: Product) => (
              <div key={p.id} className="flex items-center justify-between">
                <label htmlFor={p.id} className="text-sm font-semibold">{p.name}</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-sub">
                    €{(p.price_cents / 100).toFixed(2)}
                  </span>
                  <input
                    id={p.id}
                    type="number"
                    name={`items.${p.id}`}
                    min={0}
                    max={99}
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
              <input
                type="text"
                name="name"
                required
                className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">E-mailadres *</label>
              <input
                type="email"
                name="email"
                required
                className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Telefoonnummer</label>
              <input
                type="tel"
                name="phone"
                className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac"
              />
            </div>

            <button
              type="submit"
              className="bg-red-sportac text-white font-bold py-3 rounded-sm hover:bg-red-600 transition-colors text-sm"
            >
              Bestelling plaatsen &amp; betalen
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
