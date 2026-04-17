import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase-admin";
import { PackGroup, Sale } from "@/lib/types";
import { PackGroupForm } from "../_PackGroupForm";
import { updatePackGroup } from "../actions";

export default async function BewerkenPackGroepPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();
  const [{ data: groupData }, { data: salesData }] = await Promise.all([
    supabase.from("pack_groups").select("*").eq("id", id).single(),
    supabase.from("sales").select("*").order("sort_order"),
  ]);
  if (!groupData) notFound();
  const group = groupData as PackGroup;
  const sales: Sale[] = salesData ?? [];
  const action = updatePackGroup.bind(null, id);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Pack groep bewerken</h1>
        <p className="text-gray-sub text-sm mt-1">{group.name}</p>
      </div>
      <PackGroupForm group={group} sales={sales} action={action} />
    </div>
  );
}
