import { createAdminClient } from "@/lib/supabase-admin";
import { deleteSponsorRequest } from "./actions";

type SponsorRequest = {
  id: string;
  name: string;
  email: string;
  message: string | null;
  created_at: string;
};

export default async function SponsorAanvragenPage() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("sponsor_requests").select("*").order("created_at", { ascending: false });
  const requests: SponsorRequest[] = data ?? [];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Sponsor-aanvragen</h1>
        <p className="text-gray-sub text-sm mt-1">{requests.length} aanvragen</p>
      </div>

      {requests.length === 0 && <p className="text-gray-sub text-sm">Nog geen aanvragen.</p>}

      <div className="flex flex-col gap-3">
        {requests.map((r) => (
          <div key={r.id} className="bg-white border border-[#e8e4df] rounded-sm p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold text-sm text-gray-dark mb-0.5">{r.name}</div>
                <a href={`mailto:${r.email}`} className="text-sm text-red-sportac hover:underline">{r.email}</a>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-xs text-gray-sub">{new Date(r.created_at).toLocaleDateString("nl-BE", { day: "numeric", month: "long", year: "numeric" })}</span>
                <form action={deleteSponsorRequest.bind(null, r.id)}>
                  <button
                    type="submit"
                    className="text-xs font-semibold px-2.5 py-1 rounded-sm border border-red-300 text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Verwijderen
                  </button>
                </form>
              </div>
            </div>
            {r.message && (
              <p className="text-sm text-gray-body mt-3 leading-relaxed border-t border-[#e8e4df] pt-3">{r.message}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
