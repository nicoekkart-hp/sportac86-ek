import Link from "next/link";
import { createAdminClient } from "@/lib/supabase-admin";
import { Sale } from "@/lib/types";
import { deleteSale, toggleSaleActive } from "./actions";

export default async function VerkopenPage() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("sales").select("*").order("sort_order");
  const sales: Sale[] = data ?? [];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Verkopen</h1>
          <p className="text-gray-sub text-sm mt-1">{sales.length} verkopen</p>
        </div>
        <Link href="/admin/verkopen/nieuw" className="bg-red-sportac text-white font-bold text-sm px-5 py-2.5 rounded-sm hover:bg-red-600 transition-colors">
          + Verkoop toevoegen
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {sales.length === 0 && <p className="text-gray-sub text-sm">Nog geen verkopen.</p>}
        {sales.map((s) => (
          <div key={s.id} className="bg-white border border-[#e8e4df] rounded-sm p-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{s.name}</span>
                <span className="text-[10px] font-mono text-gray-sub bg-gray-100 px-1.5 py-0.5 rounded-sm">{s.slug}</span>
                {!s.is_active && <span className="text-[10px] font-bold bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-sm">Inactief</span>}
              </div>
              {s.description && <p className="text-xs text-gray-sub mt-0.5 max-w-lg truncate">{s.description}</p>}
            </div>
            <div className="flex items-center gap-2">
              <form action={toggleSaleActive.bind(null, s.id, s.is_active)}>
                <button type="submit" className="text-xs font-semibold text-gray-dark border border-[#e8e4df] px-3 py-1.5 rounded-sm hover:border-gray-400 transition-colors">
                  {s.is_active ? "Deactiveren" : "Activeren"}
                </button>
              </form>
              <Link href={`/admin/verkopen/${s.id}`} className="text-xs font-semibold text-gray-dark border border-[#e8e4df] px-3 py-1.5 rounded-sm hover:border-gray-400 transition-colors">
                Bewerken
              </Link>
              <form action={deleteSale.bind(null, s.id)}>
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
