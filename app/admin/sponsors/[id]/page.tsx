import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase-admin";
import { Sponsor } from "@/lib/types";
import { SponsorForm } from "../_SponsorForm";
import { updateSponsor } from "../actions";

export default async function BewerkenSponsorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data } = await supabase.from("sponsors").select("*").eq("id", id).single();
  if (!data) notFound();
  const sponsor = data as Sponsor;
  const action = updateSponsor.bind(null, id);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Sponsor bewerken</h1>
        <p className="text-gray-sub text-sm mt-1">{sponsor.name}</p>
      </div>
      <SponsorForm sponsor={sponsor} action={action} />
    </div>
  );
}
