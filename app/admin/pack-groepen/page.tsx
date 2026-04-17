import Link from "next/link";
import { createAdminClient } from "@/lib/supabase-admin";
import { PackGroup } from "@/lib/types";
import { deletePackGroup } from "./actions";
import { formatPrice } from "@/lib/format";

export default async function PackGroepenPage() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("pack_groups")
    .select("*, sales(name)")
    .order("sort_order");
  const groups: (PackGroup & { sales: { name: string } | null })[] = data ?? [];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Pack groepen</h1>
          <p className="text-gray-sub text-sm mt-1">{groups.length} groepen</p>
        </div>
        <Link href="/admin/pack-groepen/nieuw" className="bg-red-sportac text-white font-bold text-sm px-5 py-2.5 rounded-sm hover:bg-red-600 transition-colors">
          + Pack groep toevoegen
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {groups.length === 0 && <p className="text-gray-sub text-sm">Nog geen pack groepen.</p>}
        {groups.map((g) => (
          <div key={g.id} className="bg-white border border-[#e8e4df] rounded-sm p-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{g.name}</span>
                {g.sales && <span className="text-[10px] font-bold bg-gray-100 text-gray-sub px-1.5 py-0.5 rounded-sm">{g.sales.name}</span>}
              </div>
              <p className="text-xs text-gray-sub mt-0.5">
                {formatPrice(g.unit_price_cents)} per fles · doos van {g.pack_size}: {formatPrice(g.pack_price_cents)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/admin/pack-groepen/${g.id}`} className="text-xs font-semibold text-gray-dark border border-[#e8e4df] px-3 py-1.5 rounded-sm hover:border-gray-400 transition-colors">
                Bewerken
              </Link>
              <form action={deletePackGroup.bind(null, g.id)}>
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
