import { createAdminClient } from "@/lib/supabase-admin";
import { EventRecord, Registration } from "@/lib/types";

export default async function InschrijvingenPage() {
  const supabase = createAdminClient();
  const { data: events } = await supabase.from("events").select("*").order("date");
  const { data: registrations } = await supabase.from("registrations").select("*").order("created_at", { ascending: false });

  const eventsMap = new Map((events ?? []).map((e: EventRecord) => [e.id, e]));
  const allRegs: Registration[] = registrations ?? [];

  // Group registrations per event
  const grouped = new Map<string, Registration[]>();
  for (const reg of allRegs) {
    const list = grouped.get(reg.event_id) ?? [];
    list.push(reg);
    grouped.set(reg.event_id, list);
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Inschrijvingen</h1>
        <p className="text-gray-sub text-sm mt-1">{allRegs.length} totaal</p>
      </div>

      {allRegs.length === 0 && (
        <p className="text-gray-sub text-sm">Nog geen inschrijvingen.</p>
      )}

      {Array.from(grouped.entries()).map(([eventId, regs]) => {
        const ev = eventsMap.get(eventId);
        const totalPersons = regs.reduce((sum, r) => sum + r.num_persons, 0);
        return (
          <div key={eventId} className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <h2 className="font-bold text-base text-gray-dark">{ev?.title ?? "Onbekend evenement"}</h2>
              <span className="text-xs text-gray-sub">{regs.length} inschrijvingen · {totalPersons} personen</span>
            </div>
            <div className="bg-white border border-[#e8e4df] rounded-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e8e4df] text-xs text-gray-sub">
                    <th className="text-left px-4 py-2.5 font-semibold">Naam</th>
                    <th className="text-left px-4 py-2.5 font-semibold">E-mail</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Personen</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Opmerkingen</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Betaling</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Datum</th>
                  </tr>
                </thead>
                <tbody>
                  {regs.map((r) => (
                    <tr key={r.id} className="border-b border-[#e8e4df] last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium">{r.name}</td>
                      <td className="px-4 py-2.5 text-gray-sub">{r.email}</td>
                      <td className="px-4 py-2.5">{r.num_persons}</td>
                      <td className="px-4 py-2.5 text-gray-sub text-xs">{r.remarks ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        {r.payment_status === "paid" && <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-sm">Betaald</span>}
                        {r.payment_status === "pending" && <span className="text-[10px] font-bold bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-sm">In afwachting</span>}
                        {r.payment_status === "failed" && <span className="text-[10px] text-gray-sub">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-gray-sub text-xs">{new Date(r.created_at).toLocaleDateString("nl-BE")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
