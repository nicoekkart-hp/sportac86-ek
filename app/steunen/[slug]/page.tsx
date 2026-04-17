import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase-admin";
import { PackGroup, Product, Sale, TeamMember } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { ProductInfoModal } from "@/components/ProductInfoModal";

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

  const [{ data: productsData }, { data: groupsData }, { data: membersData }] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .eq("sale_id", sale.id)
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("pack_groups")
      .select("*")
      .eq("sale_id", sale.id)
      .order("sort_order"),
    supabase.from("team_members").select("id, name").order("sort_order"),
  ]);

  const products: Product[] = productsData ?? [];
  const packGroups: PackGroup[] = groupsData ?? [];
  const members: Pick<TeamMember, "id" | "name">[] = membersData ?? [];

  const groupById = new Map(packGroups.map((g) => [g.id, g]));

  const productsByGroup = new Map<string, Product[]>();
  const ungrouped: Product[] = [];
  for (const p of products) {
    if (p.pack_group_id && groupById.has(p.pack_group_id)) {
      const list = productsByGroup.get(p.pack_group_id) ?? [];
      list.push(p);
      productsByGroup.set(p.pack_group_id, list);
    } else {
      ungrouped.push(p);
    }
  }

  return (
    <div className="pt-16">
      {betaald && (
        <div className="bg-green-50 border-b border-green-200 px-6 py-3 text-center text-sm font-semibold text-green-800">
          Bestelling ontvangen! Je ontvangt een bevestiging per e-mail.
        </div>
      )}

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

      <div className="max-w-5xl mx-auto px-6 py-14">
        {sale.coming_soon ? (
          <div className="bg-white border border-[#e8e4df] rounded-sm p-8 max-w-lg text-center">
            <div className="text-5xl mb-4">⏳</div>
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-red-sportac mb-3">
              Binnenkort beschikbaar
            </p>
            <h2 className="font-condensed font-black italic text-3xl text-gray-dark mb-3">
              Nog even geduld
            </h2>
            <p className="text-gray-body text-sm leading-relaxed">
              Onze {sale.name.toLowerCase()}-actie wordt nog voorbereid. Hou deze pagina in de gaten — binnenkort kan je hier bestellen.
            </p>
            <Link
              href="/steunen"
              className="inline-block mt-6 text-sm font-bold text-red-sportac hover:underline"
            >
              ← Terug naar steunen
            </Link>
          </div>
        ) : (
        <div className="bg-white border border-[#e8e4df] rounded-sm p-8 max-w-2xl">
          <form action="/api/checkout/bestelling" method="POST" className="flex flex-col gap-6">
            <input type="hidden" name="sale_id" value={sale.id} />
            <input type="hidden" name="sale_slug" value={sale.slug} />

            {packGroups.map((g) => {
              const groupProducts = productsByGroup.get(g.id) ?? [];
              if (groupProducts.length === 0) return null;
              return (
                <section key={g.id} className="flex flex-col gap-3">
                  <header className="border-b border-[#e8e4df] pb-2">
                    <h3 className="font-condensed font-black italic text-xl text-gray-dark">{g.name}</h3>
                    <p className="text-xs text-gray-sub">
                      {formatPrice(g.unit_price_cents)} per fles · doos van {g.pack_size}: {formatPrice(g.pack_price_cents)} (mag mengen)
                    </p>
                  </header>
                  {groupProducts.map((p) => (
                    <ProductRow key={p.id} product={p} group={g} />
                  ))}
                </section>
              );
            })}

            {ungrouped.length > 0 && (
              <section className="flex flex-col gap-3">
                {packGroups.length > 0 && (
                  <header className="border-b border-[#e8e4df] pb-2">
                    <h3 className="font-condensed font-black italic text-xl text-gray-dark">Overige producten</h3>
                  </header>
                )}
                {ungrouped.map((p) => (
                  <ProductRow key={p.id} product={p} group={null} />
                ))}
              </section>
            )}

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

            <div>
              <label className="block text-sm font-semibold mb-1">
                Wie brengt jouw bestelling?{" "}
                <span className="text-gray-sub font-normal">(optioneel)</span>
              </label>
              <select
                name="contact_member_id"
                defaultValue=""
                className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac bg-white"
              >
                <option value="">— Geen voorkeur —</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="bg-red-sportac text-white font-bold py-3 rounded-sm hover:bg-red-600 transition-colors text-sm"
            >
              Bestelling plaatsen &amp; betalen
            </button>
          </form>
        </div>
        )}
      </div>
    </div>
  );
}

function ProductRow({ product, group }: { product: Product; group: PackGroup | null }) {
  const unitLabel = group ? formatPrice(group.unit_price_cents) : formatPrice(product.price_cents);
  return (
    <div className="flex items-center gap-3">
      <div className="relative w-12 h-12 rounded-sm overflow-hidden bg-[#f5f3f0] flex-shrink-0">
        {product.image_url && (
          <Image src={product.image_url} alt="" fill className="object-cover" sizes="48px" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <label htmlFor={product.id} className="text-sm font-semibold block truncate">
          {product.name}
        </label>
        <div className="flex items-center gap-2 text-xs text-gray-sub">
          <span>{unitLabel}</span>
          {product.description && <ProductInfoModal product={product} group={group} />}
        </div>
      </div>
      <input
        id={product.id}
        type="number"
        name={`items.${product.id}`}
        min={0}
        max={99}
        defaultValue={0}
        className="w-16 border border-[#e8e4df] rounded-sm px-2 py-1 text-sm text-center focus:outline-none focus:border-red-sportac"
      />
    </div>
  );
}
