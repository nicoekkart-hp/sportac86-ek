import { createAdminClient } from "@/lib/supabase-admin";
import { Donation } from "@/lib/types";

export default async function DonattiesPage() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("donations").select("*").order("created_at", { ascending: false });
  const donations: Donation[] = data ?? [];

  const total = donations.reduce((sum, d) => sum + d.amount_cents, 0);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Donaties</h1>
        <p className="text-gray-sub text-sm mt-1">
          {donations.length} donaties · <strong className="text-gray-dark">€{(total / 100).toFixed(2).replace(".", ",")}</strong> totaal
        </p>
      </div>

      {donations.length === 0 && <p className="text-gray-sub text-sm">Nog geen donaties.</p>}

      <div className="bg-white border border-[#e8e4df] rounded-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e8e4df] text-xs text-gray-sub">
              <th className="text-left px-4 py-2.5 font-semibold">Naam</th>
              <th className="text-left px-4 py-2.5 font-semibold">E-mail</th>
              <th className="text-left px-4 py-2.5 font-semibold">Bedrag</th>
              <th className="text-left px-4 py-2.5 font-semibold">Boodschap</th>
              <th className="text-left px-4 py-2.5 font-semibold">Datum</th>
            </tr>
          </thead>
          <tbody>
            {donations.map((d) => (
              <tr key={d.id} className="border-b border-[#e8e4df] last:border-0 hover:bg-gray-50">
                <td className="px-4 py-2.5 font-medium">{d.name}</td>
                <td className="px-4 py-2.5 text-gray-sub">{d.email}</td>
                <td className="px-4 py-2.5 font-bold text-red-sportac">€{(d.amount_cents / 100).toFixed(2).replace(".", ",")}</td>
                <td className="px-4 py-2.5 text-gray-sub text-xs">{d.message ?? "—"}</td>
                <td className="px-4 py-2.5 text-gray-sub text-xs">{new Date(d.created_at).toLocaleDateString("nl-BE")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
