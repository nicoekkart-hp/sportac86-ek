import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase-admin";
import { PackGroup, Product, Sale, TeamMember } from "@/lib/types";
import { OrderForm } from "./_OrderForm";

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
            <OrderForm
              saleId={sale.id}
              saleSlug={sale.slug}
              products={products}
              packGroups={packGroups}
              members={members}
            />
          </div>
        )}
      </div>
    </div>
  );
}
