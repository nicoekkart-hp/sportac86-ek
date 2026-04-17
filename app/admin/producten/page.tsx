import Link from "next/link";
import Image from "next/image";
import { createAdminClient } from "@/lib/supabase-admin";
import { Product } from "@/lib/types";
import { deleteProduct, toggleProductActive } from "./actions";
import { formatPrice } from "@/lib/format";

type Row = Product & {
  sales: { name: string } | null;
  pack_groups: { name: string } | null;
};

export default async function ProductenPage() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("products")
    .select("*, sales(name), pack_groups(name)")
    .order("sort_order");
  const products: Row[] = data ?? [];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Producten</h1>
          <p className="text-gray-sub text-sm mt-1">{products.length} producten</p>
        </div>
        <Link href="/admin/producten/nieuw" className="bg-red-sportac text-white font-bold text-sm px-5 py-2.5 rounded-sm hover:bg-red-600 transition-colors">
          + Product toevoegen
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {products.length === 0 && <p className="text-gray-sub text-sm">Nog geen producten.</p>}
        {products.map((p) => (
          <div key={p.id} className="bg-white border border-[#e8e4df] rounded-sm p-4 flex items-center gap-4">
            <div className="relative w-12 h-12 rounded-sm overflow-hidden bg-[#f5f3f0] flex-shrink-0">
              {p.image_url && (
                <Image src={p.image_url} alt="" fill className="object-cover" sizes="48px" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">{p.name}</span>
                {p.sales && <span className="text-[10px] font-bold bg-gray-100 text-gray-sub px-1.5 py-0.5 rounded-sm">{p.sales.name}</span>}
                {p.pack_groups && <span className="text-[10px] font-bold bg-red-sportac/10 text-red-sportac px-1.5 py-0.5 rounded-sm">📦 {p.pack_groups.name}</span>}
                {!p.is_active && <span className="text-[10px] font-bold bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-sm">Inactief</span>}
              </div>
              <p className="text-xs text-gray-sub mt-0.5">{formatPrice(p.price_cents)}</p>
            </div>
            <div className="flex items-center gap-2">
              <form action={toggleProductActive.bind(null, p.id, p.is_active)}>
                <button type="submit" className="text-xs font-semibold text-gray-dark border border-[#e8e4df] px-3 py-1.5 rounded-sm hover:border-gray-400 transition-colors">
                  {p.is_active ? "Deactiveren" : "Activeren"}
                </button>
              </form>
              <Link href={`/admin/producten/${p.id}`} className="text-xs font-semibold text-gray-dark border border-[#e8e4df] px-3 py-1.5 rounded-sm hover:border-gray-400 transition-colors">
                Bewerken
              </Link>
              <form action={deleteProduct.bind(null, p.id)}>
                <button type="submit" className="text-xs text-red-sportac border border-red-sportac/30 px-3 py-1.5 rounded-sm hover:bg-red-sportac/10 transition-colors">
                  Verwijderen
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
