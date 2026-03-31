import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase-admin";
import { TeamMember } from "@/lib/types";
import { TeamForm } from "../_TeamForm";
import { updateTeamMember } from "../actions";

export default async function BewerkenTeamlidPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data } = await supabase.from("team_members").select("*").eq("id", id).single();

  if (!data) notFound();
  const member = data as TeamMember;
  const action = updateTeamMember.bind(null, id);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Teamlid bewerken</h1>
        <p className="text-gray-sub text-sm mt-1">{member.name}</p>
      </div>
      <TeamForm member={member} action={action} />
    </div>
  );
}
