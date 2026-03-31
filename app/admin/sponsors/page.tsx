import Link from "next/link";
import { createAdminClient } from "@/lib/supabase-admin";
import { Sponsor } from "@/lib/types";
import { deleteSponsor } from "./actions";

const LEVEL_LABELS: Record<string, string> = { gold: "Goud", silver: "Zilver", bronze: "Brons", partner: "Partner" };

export default async function SponsorsAdminPage() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("sponsors").select("*").order("sort_order");
  const sponsors: Sponsor[] = data ?? [];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Sponsors</h1>
          <p className="text-gray-sub text-sm mt-1">{sponsors.length} sponsors</p>
        </div>
        <Link href="/admin/sponsors/nieuw" className="bg-red-sportac text-white font-bold text-sm px-5 py-2.5 rounded-sm hover:bg-red-600 transition-colors">
          + Sponsor toevoegen
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {sponsors.length === 0 && <p className="text-gray-sub text-sm">Nog geen sponsors.</p>}
        {sponsors.map((s) => (
          <div key={s.id} className="bg-white border border-[#e8e4df] rounded-sm p-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{s.name}</span>
                <span className="text-[10px] font-bold bg-gray-100 text-gray-sub px-1.5 py-0.5 rounded-sm">{LEVEL_LABELS[s.level]}</span>
              </div>
              {s.website_url && <p className="text-xs text-gray-sub mt-0.5">{s.website_url}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/admin/sponsors/${s.id}`} className="text-xs font-semibold text-gray-dark border border-[#e8e4df] px-3 py-1.5 rounded-sm hover:border-gray-400 transition-colors">
                Bewerken
              </Link>
              <form action={deleteSponsor.bind(null, s.id)}>
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
