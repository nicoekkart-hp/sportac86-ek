import Link from "next/link";
import { createAdminClient } from "@/lib/supabase-admin";
import { TeamMember } from "@/lib/types";
import { deleteTeamMember } from "./actions";

export default async function TeamPage() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("team_members").select("*").order("sort_order");
  const members: TeamMember[] = data ?? [];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Team</h1>
          <p className="text-gray-sub text-sm mt-1">{members.length} leden</p>
        </div>
        <Link href="/admin/team/nieuw" className="bg-red-sportac text-white font-bold text-sm px-5 py-2.5 rounded-sm hover:bg-red-600 transition-colors">
          + Teamlid toevoegen
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {members.length === 0 && (
          <p className="text-gray-sub text-sm">Nog geen teamleden. Voeg er een toe.</p>
        )}
        {members.map((m) => (
          <div key={m.id} className="bg-white border border-[#e8e4df] rounded-sm p-4 flex items-center gap-4">
            {m.image_url && (
              <img src={m.image_url} alt={m.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
            )}
            {!m.image_url && (
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-sub text-sm flex-shrink-0">
                {m.name[0]}
              </div>
            )}
            <div className="flex-1">
              <div className="font-semibold text-sm text-gray-dark">{m.name}</div>
              <div className="text-xs text-gray-sub">{m.role}{m.discipline ? ` · ${m.discipline}` : ""}</div>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/admin/team/${m.id}`} className="text-xs font-semibold text-gray-dark border border-[#e8e4df] px-3 py-1.5 rounded-sm hover:border-gray-400 transition-colors">
                Bewerken
              </Link>
              <form action={deleteTeamMember.bind(null, m.id)}>
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
